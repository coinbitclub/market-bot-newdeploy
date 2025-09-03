const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function testCollectionSimulation() {
    try {
        console.log('🧪 SIMULANDO COLETA DE SALDOS...\n');
        
        // Buscar usuários válidos
        const apiConfigs = await pool.query(`
            SELECT u.id, u.username, u.email,
                   uak.api_key, uak.api_secret, uak.exchange, uak.environment
            FROM users u
            INNER JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE uak.api_key IS NOT NULL 
            AND uak.api_secret IS NOT NULL
            ORDER BY u.id
        `);
        
        console.log(`✅ Encontrados ${apiConfigs.rows.length} usuários válidos\n`);
        
        // Simular salvamento para cada usuário
        for (const config of apiConfigs.rows) {
            console.log(`👤 Simulando User ${config.id} (${config.username}) - ${config.exchange.toUpperCase()}:`);
            
            // Simular saldo (valor fictício para teste)
            const simulatedBalance = Math.random() * 1000 + 100; // Entre 100 e 1100
            
            try {
                // Tentar salvar no banco
                await pool.query(`
                    INSERT INTO balances (user_id, exchange, wallet_balance, asset, created_at, last_updated)
                    VALUES ($1, $2, $3, 'USDT', NOW(), NOW())
                `, [config.id, config.exchange, simulatedBalance]);
                
                console.log(`   ✅ Saldo simulado salvo: $${simulatedBalance.toFixed(2)} USDT`);
                
            } catch (error) {
                console.log(`   ❌ Erro ao salvar: ${error.message}`);
            }
        }
        
        // Verificar registros salvos
        console.log('\n📊 VERIFICANDO REGISTROS SALVOS:');
        const savedRecords = await pool.query(`
            SELECT b.*, u.username 
            FROM balances b 
            JOIN users u ON b.user_id = u.id 
            ORDER BY b.created_at DESC 
            LIMIT 10
        `);
        
        console.log(`Registros encontrados: ${savedRecords.rows.length}`);
        savedRecords.rows.forEach(record => {
            console.log(`  ${record.username} (${record.exchange}): $${record.wallet_balance} ${record.asset}`);
        });
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

testCollectionSimulation();
