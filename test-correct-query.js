const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function testCorrectQuery() {
    try {
        console.log('🔍 TESTANDO QUERY CORRETA COM api_secret...\n');
        
        // Query correta usando api_secret
        const correctQuery = await pool.query(`
            SELECT u.id, u.username, u.email,
                   uak.api_key, uak.api_secret, uak.exchange, uak.environment
            FROM users u
            INNER JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE uak.api_key IS NOT NULL 
            AND uak.api_secret IS NOT NULL
            ORDER BY u.id
        `);
        
        console.log(`✅ USUÁRIOS ENCONTRADOS COM QUERY CORRETA: ${correctQuery.rows.length}`);
        
        if (correctQuery.rows.length > 0) {
            console.log('\n📋 Dados encontrados:');
            correctQuery.rows.forEach(row => {
                console.log(`  🔑 User ${row.id} (${row.username}): ${row.exchange} - API: ${row.api_key ? 'PRESENTE' : 'NULL'}, Secret: ${row.api_secret ? 'PRESENTE' : 'NULL'}`);
            });
        }
        
        // Comparar com query incorreta
        console.log('\n❌ TESTANDO QUERY INCORRETA COM secret_key:');
        const incorrectQuery = await pool.query(`
            SELECT COUNT(*) as total
            FROM users u
            INNER JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE uak.api_key IS NOT NULL 
            AND uak.secret_key IS NOT NULL
        `);
        
        console.log(`Query incorreta (secret_key): ${incorrectQuery.rows[0].total} usuários`);
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

testCorrectQuery();
