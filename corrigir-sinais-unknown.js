const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:xSgQNe6A3lHQhBNb@monorail.proxy.rlwy.net:28334/railway',
    ssl: { rejectUnauthorized: false }
});

async function corrigirSinaisUnknown() {
    console.log('\n🔧 CORREÇÃO DE SINAIS COM SYMBOL "UNKNOWN"');
    console.log('==========================================');
    
    try {
        // Verificar quantos sinais estão com UNKNOWN
        const countResult = await pool.query(`
            SELECT COUNT(*) as total 
            FROM signals 
            WHERE symbol = 'UNKNOWN' 
            AND raw_data->>'ticker' IS NOT NULL
        `);

        const totalUnknown = parseInt(countResult.rows[0].total);
        console.log(`📊 Encontrados ${totalUnknown} sinais com symbol UNKNOWN que têm ticker nos dados RAW`);

        if (totalUnknown === 0) {
            console.log('✅ Nenhum sinal para corrigir!');
            return;
        }

        // Buscar sinais para corrigir (em lotes)
        const batchSize = 100;
        let processados = 0;
        let corrigidos = 0;

        console.log(`\n🔄 Processando em lotes de ${batchSize} sinais...`);

        while (processados < totalUnknown) {
            const sinaisResult = await pool.query(`
                SELECT id, raw_data
                FROM signals 
                WHERE symbol = 'UNKNOWN' 
                AND raw_data->>'ticker' IS NOT NULL
                LIMIT $1 OFFSET $2
            `, [batchSize, processados]);

            console.log(`\n📦 Lote ${Math.floor(processados / batchSize) + 1}: ${sinaisResult.rows.length} sinais`);

            for (const sinal of sinaisResult.rows) {
                try {
                    const rawData = sinal.raw_data;
                    
                    // Aplicar lógica corrigida de parsing
                    const symbol = rawData.ticker || rawData.symbol || 'UNKNOWN';
                    const action = rawData.signal || rawData.action || null;
                    const price = rawData.close || rawData.price || null;

                    // Só atualizar se conseguimos extrair o symbol
                    if (symbol !== 'UNKNOWN') {
                        const updateQuery = `
                            UPDATE signals 
                            SET symbol = $1,
                                action = COALESCE($2, action),
                                price = COALESCE($3, price),
                                trading_symbol = $1
                            WHERE id = $4
                        `;

                        await pool.query(updateQuery, [symbol, action, price, sinal.id]);
                        corrigidos++;
                        
                        if (corrigidos % 50 === 0) {
                            console.log(`   ✅ ${corrigidos} sinais corrigidos...`);
                        }
                    }
                } catch (error) {
                    console.error(`   ❌ Erro ao corrigir sinal ${sinal.id}:`, error.message);
                }
            }

            processados += sinaisResult.rows.length;
        }

        console.log(`\n🎯 CORREÇÃO CONCLUÍDA:`);
        console.log(`   📊 Total processado: ${processados}`);
        console.log(`   ✅ Sinais corrigidos: ${corrigidos}`);
        console.log(`   ❌ Sinais não corrigidos: ${processados - corrigidos}`);

        // Verificar resultado final
        const finalResult = await pool.query(`
            SELECT 
                symbol,
                COUNT(*) as quantidade
            FROM signals 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY symbol
            ORDER BY quantidade DESC
        `);

        console.log(`\n📊 Estatísticas finais (últimas 24h):`);
        finalResult.rows.forEach(row => {
            const porcentagem = ((row.quantidade / finalResult.rows.reduce((sum, r) => sum + parseInt(r.quantidade), 0)) * 100).toFixed(1);
            console.log(`   • ${row.symbol}: ${row.quantidade} sinais (${porcentagem}%)`);
        });

    } catch (error) {
        console.error('❌ Erro na correção:', error.message);
    } finally {
        await pool.end();
    }
}

// Executar correção
corrigirSinaisUnknown();
