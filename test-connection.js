const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'junction.proxy.rlwy.net',
    database: 'railway',
    password: 'kZWzZnCPrXVGJrpRKKlKnePUPFlgBNdz',
    port: 26822,
    ssl: { rejectUnauthorized: false }
});

async function testarConexao() {
    console.log('🔄 Testando conexão com o banco...');
    
    try {
        const result = await pool.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM users');
        console.log('✅ Conexão bem-sucedida!');
        console.log(`📅 Hora atual do banco: ${result.rows[0].current_time}`);
        console.log(`👥 Total de usuários: ${result.rows[0].user_count}`);
    } catch (error) {
        console.error('❌ Erro de conexão:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

testarConexao();
