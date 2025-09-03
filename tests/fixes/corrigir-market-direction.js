// 🔧 CORREÇÃO DO MARKET DIRECTION HISTORY
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function corrigirMarketDirection() {
    console.log('🔧 CORRIGINDO MARKET DIRECTION HISTORY');
    console.log('=====================================');
    
    try {
        // Verificar estrutura atual
        console.log('📋 Verificando estrutura atual...');
        const colunas = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'market_direction_history' 
            ORDER BY ordinal_position
        `);
        
        console.log('Colunas existentes:');
        colunas.rows.forEach(col => {
            console.log(`   ✅ ${col.column_name} (${col.data_type})`);
        });
        
        // Adicionar colunas necessárias
        const colunasNecessarias = [
            { nome: 'allowed_direction', tipo: 'TEXT', default: "'LONG_E_SHORT'" },
            { nome: 'timestamp', tipo: 'TIMESTAMP', default: 'NOW()' },
            { nome: 'processed_at', tipo: 'TIMESTAMP', default: 'NULL' }
        ];
        
        console.log('\n🔧 Adicionando colunas necessárias...');
        for (const coluna of colunasNecessarias) {
            const existe = colunas.rows.find(col => col.column_name === coluna.nome);
            if (!existe) {
                console.log(`   ➕ Adicionando ${coluna.nome}...`);
                await pool.query(`
                    ALTER TABLE market_direction_history 
                    ADD COLUMN ${coluna.nome} ${coluna.tipo} DEFAULT ${coluna.default}
                `);
                console.log(`   ✅ ${coluna.nome} adicionada`);
            } else {
                console.log(`   ✅ ${coluna.nome} já existe`);
            }
        }
        
        // Testar insert/update
        console.log('\n🧪 TESTANDO OPERAÇÕES:');
        try {
            // Teste de insert
            await pool.query(`
                INSERT INTO market_direction_history 
                (direction, fear_greed, top100_percentage, confidence, reason, allowed_direction) 
                VALUES ('PREFERENCIA_LONG', 74, 88.0, 0.7, 'Teste correção', 'PREFERENCIA_LONG')
                ON CONFLICT DO NOTHING
            `);
            console.log('   ✅ Insert funcionou');
            
            // Teste de select
            const resultado = await pool.query(`
                SELECT direction, allowed_direction, fear_greed, created_at 
                FROM market_direction_history 
                ORDER BY created_at DESC 
                LIMIT 3
            `);
            console.log(`   ✅ Select funcionou - ${resultado.rows.length} registros`);
            
        } catch (error) {
            console.log(`   ❌ Erro nos testes: ${error.message}`);
        }
        
        console.log('\n✅ CORREÇÃO CONCLUÍDA!');
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        await pool.end();
    }
}

corrigirMarketDirection();
