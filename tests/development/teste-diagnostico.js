// TESTE SIMPLES - DIAGNÓSTICO
console.log("🚀 TESTE SISTEMA PROFISSIONAL");

const { Pool } = require('pg');

async function testeRapido() {
    try {
        console.log("📊 Iniciando teste diagnóstico...");
        
        // Teste de conexão PostgreSQL
        const pool = new Pool({
            connectionString: 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        console.log("🔗 Testando conexão PostgreSQL...");
        const result = await pool.query(`
            SELECT 
                u.id as user_id,
                u.username,
                uak.id as key_id,
                uak.exchange,
                uak.environment,
                uak.api_key,
                uak.secret_key
            FROM users u
            INNER JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.is_active = true 
                AND uak.is_active = true
            LIMIT 5
        `);

        console.log(`✅ Conexão OK! Encontradas ${result.rows.length} chaves:`);
        result.rows.forEach(row => {
            console.log(`   📋 ${row.username} - ${row.exchange} ${row.environment}`);
        });

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error("❌ ERRO:", error.message);
        process.exit(1);
    }
}

testeRapido();
