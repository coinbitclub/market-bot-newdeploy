/**
 * 🔍 DIAGNÓSTICO SUPER SIMPLES
 */

const { Pool } = require('pg');

async function diagnosticoSimples() {
    console.log('🔍 INICIANDO DIAGNÓSTICO SIMPLES...');
    
    const pool = new Pool({
        connectionString: 'process.env.DATABASE_URL',
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Teste de conexão básico
        const test = await pool.query('SELECT NOW() as time');
        console.log('✅ Conexão OK:', test.rows[0].time);

        // Verificar user_api_keys
        const count = await pool.query('SELECT COUNT(*) FROM user_api_keys');
        console.log('📊 Total de chaves:', count.rows[0].count);

        // Chaves dos usuários específicos
        const users = await pool.query(`
            SELECT u.id, u.username, COUNT(uak.id) as num_keys
            FROM users u
            LEFT JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.id IN (14, 15, 16)
            GROUP BY u.id, u.username
            ORDER BY u.id
        `);

        console.log('\n👥 USUÁRIOS E CHAVES:');
        users.rows.forEach(u => {
            console.log(`   ID ${u.id}: ${u.username} - ${u.num_keys} chave(s)`);
        });

    } catch (error) {
        console.log('❌ ERRO:', error.message);
    }
    
    process.exit(0);
}

diagnosticoSimples();
