const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function updateBinanceToTestnet() {
    try {
        console.log('🔧 ATUALIZANDO BINANCE PARA TESTNET...\n');
        
        // 1. Verificar configuração atual
        console.log('1️⃣ Configuração atual:');
        const currentConfig = await pool.query(`
            SELECT u.id, u.username, uak.exchange, uak.environment, uak.api_key
            FROM users u
            INNER JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE uak.exchange = 'binance'
        `);
        
        currentConfig.rows.forEach(row => {
            console.log(`  User ${row.id} (${row.username}): ${row.exchange} - Environment: ${row.environment} - API Key: ${row.api_key ? 'PRESENTE' : 'AUSENTE'}`);
        });
        
        // 2. Atualizar para testnet
        console.log('\n2️⃣ Atualizando para testnet:');
        const updateResult = await pool.query(`
            UPDATE user_api_keys 
            SET environment = 'testnet'
            WHERE exchange = 'binance'
        `);
        
        console.log(`  ✅ ${updateResult.rowCount} registros atualizados`);
        
        // 3. Verificar atualização
        console.log('\n3️⃣ Configuração após atualização:');
        const updatedConfig = await pool.query(`
            SELECT u.id, u.username, uak.exchange, uak.environment, uak.api_key
            FROM users u
            INNER JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE uak.exchange = 'binance'
        `);
        
        updatedConfig.rows.forEach(row => {
            console.log(`  User ${row.id} (${row.username}): ${row.exchange} - Environment: ${row.environment} - API Key: ${row.api_key ? 'PRESENTE' : 'AUSENTE'}`);
        });
        
        await pool.end();
        console.log('\n✅ Atualização concluída!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

updateBinanceToTestnet();
