const { Pool } = require('pg');
require('dotenv').config();

// Usar configuração do .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testarConexaoEnv() {
    console.log('🔄 Testando conexão com .env...');
    console.log(`📡 Host: ${process.env.DB_HOST}`);
    console.log(`🚪 Port: ${process.env.DB_PORT}`);
    
    try {
        const result = await pool.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM users');
        console.log('✅ Conexão bem-sucedida!');
        console.log(`📅 Hora atual do banco: ${result.rows[0].current_time}`);
        console.log(`👥 Total de usuários: ${result.rows[0].user_count}`);
        
        // Verificar status das tabelas principais
        const signalsCount = await pool.query('SELECT COUNT(*) as count FROM trading_signals');
        console.log(`📊 Sinais na base: ${signalsCount.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Erro de conexão:', error.message);
        console.log('🔍 Tentando com timeout maior...');
        
        // Tentar com configuração alternativa
        const poolAlt = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000
        });
        
        try {
            const altResult = await poolAlt.query('SELECT NOW() as current_time');
            console.log('✅ Conexão alternativa bem-sucedida!');
            console.log(`📅 Hora: ${altResult.rows[0].current_time}`);
            await poolAlt.end();
        } catch (altError) {
            console.error('❌ Conexão alternativa também falhou:', altError.message);
        }
    } finally {
        try {
            await pool.end();
        } catch (e) {
            // Ignore
        }
        process.exit(0);
    }
}

testarConexaoEnv();
