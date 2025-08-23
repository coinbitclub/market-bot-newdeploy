const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function testAPI() {
    try {
        console.log('🔗 Testando conexão com banco...');
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Conexão OK:', testResult.rows[0].now);
        
        console.log('\n📋 Verificando tabelas...');
        const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        console.log('📊 Tabelas disponíveis:', tables.rows.map(r => r.table_name));
        
        console.log('\n👥 Testando query de usuários...');
        try {
            const usersResult = await pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN trading_active = true THEN 1 END) as active FROM users');
            console.log('✅ Usuários:', usersResult.rows[0]);
        } catch (error) {
            console.log('❌ Erro na tabela users:', error.message);
        }
        
        console.log('\n🔑 Testando query de API keys...');
        try {
            const apiKeysResult = await pool.query('SELECT COUNT(CASE WHEN is_valid = true THEN 1 END) as valid, COUNT(CASE WHEN is_valid = false THEN 1 END) as invalid FROM user_api_keys');
            console.log('✅ API Keys:', apiKeysResult.rows[0]);
        } catch (error) {
            console.log('❌ Erro na tabela user_api_keys:', error.message);
        }
        
        console.log('\n📈 Testando query de posições...');
        try {
            const positionsResult = await pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'open' THEN 1 END) as open FROM positions`);
            console.log('✅ Posições:', positionsResult.rows[0]);
        } catch (error) {
            console.log('❌ Erro na tabela positions:', error.message);
        }
        
        console.log('\n📡 Testando query de sinais...');
        try {
            const signalsResult = await pool.query('SELECT COUNT(*) as today FROM signals WHERE DATE(created_at) = CURRENT_DATE');
            console.log('✅ Sinais:', signalsResult.rows[0]);
        } catch (error) {
            console.log('❌ Erro na tabela signals:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    } finally {
        await pool.end();
    }
}

testAPI();
