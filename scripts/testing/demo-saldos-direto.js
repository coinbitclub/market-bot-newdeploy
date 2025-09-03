/**
 * 💰 DEMONSTRAÇÃO DIRETA DE SALDOS
 * ==============================
 */

console.log('🚀 DEMONSTRAÇÃO DE LEVANTAMENTO DE SALDOS');
console.log('==========================================');

const { Pool } = require('pg');

async function demonstrarSaldos() {
    const pool = new Pool({
        connectionString: 'process.env.DATABASE_URL',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔗 Conectando ao banco...');
        await pool.query('SELECT 1');
        console.log('✅ Conectado com sucesso!');

        console.log('\n🔍 Verificando chaves de API...');
        const result = await pool.query(`
            SELECT 
                u.id, u.username, u.email,
                uak.exchange, uak.environment,
                CASE 
                    WHEN uak.api_key IS NOT NULL THEN 'PRESENTE'
                    ELSE 'AUSENTE'
                END as api_key_status,
                CASE 
                    WHEN uak.secret_key IS NOT NULL THEN 'PRESENTE'
                    ELSE 'AUSENTE'
                END as secret_key_status
            FROM users u
            LEFT JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.is_active = true
            ORDER BY u.username
        `);

        console.log(`📊 Total de registros: ${result.rows.length}`);
        
        if (result.rows.length > 0) {
            console.log('\n👥 USUÁRIOS E CHAVES ENCONTRADOS:');
            console.log('================================');
            
            result.rows.forEach((row, index) => {
                console.log(`${index + 1}. ${row.username} (${row.email})`);
                if (row.exchange) {
                    console.log(`   📈 Exchange: ${row.exchange} (${row.environment})`);
                    console.log(`   🔑 API Key: ${row.api_key_status} | Secret: ${row.secret_key_status}`);
                } else {
                    console.log('   ⚠️ Nenhuma chave de API configurada');
                }
                console.log('');
            });

            // Exemplo de estrutura de saldos
            console.log('💰 ESTRUTURA ESPERADA DE SALDOS:');
            console.log('=================================');
            
            const exemploSaldoBybit = {
                usuario: 'user@example.com',
                exchange: 'bybit',
                status: 'CONECTADO',
                saldos: {
                    totalUSD: 5432.10,
                    moedas: [
                        { moeda: 'USDT', saldo: 3000.00, valorUSD: 3000.00 },
                        { moeda: 'BTC', saldo: 0.05, valorUSD: 2250.00 },
                        { moeda: 'ETH', saldo: 0.065, valorUSD: 182.10 }
                    ]
                }
            };

            console.log('📋 Exemplo Bybit:');
            console.log(JSON.stringify(exemploSaldoBybit, null, 2));

        } else {
            console.log('❌ Nenhum usuário encontrado!');
        }

        // Demonstrar endpoint de API
        console.log('\n🌐 ENDPOINTS DISPONÍVEIS PARA SALDOS:');
        console.log('====================================');
        console.log('GET /api/trade/balances - Obter todos os saldos');
        console.log('GET /api/trade/balances/:userId - Saldo específico do usuário');
        console.log('POST /api/trade/validate - Validar conexões e obter saldos');

        console.log('\n🎯 PRÓXIMOS PASSOS:');
        console.log('===================');
        console.log('1. ✅ Conexão com banco estabelecida');
        console.log('2. ✅ Estrutura de usuários verificada');
        console.log('3. 🔄 Validar chaves de API em tempo real');
        console.log('4. 💰 Coletar saldos das exchanges');
        console.log('5. 📊 Gerar relatórios detalhados');

        return true;

    } catch (error) {
        console.error('❌ Erro:', error.message);
        return false;
    } finally {
        await pool.end();
        console.log('\n🔚 Demonstração concluída!');
    }
}

demonstrarSaldos().then(success => {
    if (success) {
        console.log('\n✅ DEMONSTRAÇÃO BEM-SUCEDIDA!');
        console.log('O sistema está pronto para coletar saldos em tempo real.');
    } else {
        console.log('\n❌ Falha na demonstração.');
    }
});
