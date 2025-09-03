const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function testCollectorWithFix() {
    try {
        console.log('🧪 TESTANDO COLETOR COM CORREÇÃO...\n');
        
        // Query corrigida usando api_secret
        const apiConfigs = await pool.query(`
            SELECT u.id, u.username, u.email,
                   uak.api_key, uak.api_secret, uak.exchange, uak.environment
            FROM users u
            INNER JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE uak.api_key IS NOT NULL 
            AND uak.api_secret IS NOT NULL
            ORDER BY u.id
        `);
        
        console.log(`✅ CONFIGURAÇÕES ENCONTRADAS: ${apiConfigs.rows.length}`);
        
        if (apiConfigs.rows.length > 0) {
            console.log('\n📋 Usuários que serão processados:');
            apiConfigs.rows.forEach((config, index) => {
                console.log(`  ${index + 1}. User ${config.id} (${config.username})`);
                console.log(`     Exchange: ${config.exchange}`);
                console.log(`     Environment: ${config.environment || 'mainnet'}`);
                console.log(`     API Key: ${config.api_key ? '✅ PRESENTE' : '❌ AUSENTE'}`);
                console.log(`     API Secret: ${config.api_secret ? '✅ PRESENTE' : '❌ AUSENTE'}`);
                console.log('');
            });
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

testCollectorWithFix();
