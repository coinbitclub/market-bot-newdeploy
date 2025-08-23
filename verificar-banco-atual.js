/**
 * 🔍 VERIFICADOR DE BANCO - CHAVES API
 * ===================================
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
    try {
        console.log('🔍 VERIFICANDO BANCO DE DADOS...');
        console.log('===============================');

        // Verificar se as tabelas existem
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'user_api_keys')
            ORDER BY table_name
        `);
        
        console.log('📋 Tabelas encontradas:', tables.rows.map(r => r.table_name));
        
        if (tables.rows.length === 0) {
            console.log('❌ Tabelas não encontradas! Necessário criar estrutura.');
            return;
        }

        // Verificar usuários
        const users = await pool.query('SELECT id, username, email, is_active, created_at FROM users ORDER BY id');
        console.log(`\n👥 USUÁRIOS (${users.rows.length}):`);
        users.rows.forEach(u => {
            console.log(`  ID: ${u.id} | ${u.username} | ${u.email} | Ativo: ${u.is_active} | Criado: ${u.created_at}`);
        });
        
        // Verificar chaves API
        const keys = await pool.query(`
            SELECT user_id, exchange, environment, 
                   LEFT(api_key, 12) as api_key_preview, 
                   is_active, validation_status, created_at
            FROM user_api_keys 
            ORDER BY user_id, exchange, environment
        `);
        console.log(`\n🔑 CHAVES API (${keys.rows.length}):`);
        keys.rows.forEach(k => {
            console.log(`  User: ${k.user_id} | ${k.exchange} ${k.environment} | ${k.api_key_preview}... | Ativo: ${k.is_active} | Status: ${k.validation_status || 'PENDING'}`);
        });

        // Estatísticas
        console.log('\n📊 ESTATÍSTICAS:');
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
            FROM users
        `);
        
        const keyStats = await pool.query(`
            SELECT 
                exchange,
                environment,
                COUNT(*) as total_keys,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_keys
            FROM user_api_keys
            GROUP BY exchange, environment
            ORDER BY exchange, environment
        `);

        console.log(`  Total de usuários: ${stats.rows[0].total_users}`);
        console.log(`  Usuários ativos: ${stats.rows[0].active_users}`);
        console.log('\n  Chaves por exchange:');
        keyStats.rows.forEach(s => {
            console.log(`    ${s.exchange} ${s.environment}: ${s.active_keys}/${s.total_keys} ativas`);
        });

    } catch (error) {
        console.error('❌ Erro ao verificar banco:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabase();
