console.log('🔍 TESTE SIMPLES');

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function testeSimples() {
    try {
        console.log('Conectando...');
        
        const result = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['public']);
        console.log('Tabelas:', result.rows.map(r => r.table_name));
        
        if (result.rows.some(r => r.table_name === 'users')) {
            const users = await pool.query('SELECT COUNT(*) as count FROM users');
            console.log('Usuários:', users.rows[0].count);
            
            if (parseInt(users.rows[0].count) > 0) {
                const userList = await pool.query('SELECT id, username, is_active FROM users LIMIT 5');
                console.log('Lista de usuários:');
                userList.rows.forEach(u => {
                    console.log(`  ${u.id}: ${u.username} (${u.is_active ? 'ATIVO' : 'INATIVO'})`);
                });
            }
        }
        
        if (result.rows.some(r => r.table_name === 'user_api_keys')) {
            const keys = await pool.query('SELECT COUNT(*) as count FROM user_api_keys');
            console.log('Chaves:', keys.rows[0].count);
            
            if (parseInt(keys.rows[0].count) > 0) {
                const keyList = await pool.query('SELECT id, user_id, exchange, environment, is_active FROM user_api_keys LIMIT 5');
                console.log('Lista de chaves:');
                keyList.rows.forEach(k => {
                    console.log(`  ${k.id}: User ${k.user_id} - ${k.exchange} ${k.environment} (${k.is_active ? 'ATIVO' : 'INATIVO'})`);
                });
            }
        }
        
        await pool.end();
        console.log('✅ Teste concluído');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

testeSimples();
