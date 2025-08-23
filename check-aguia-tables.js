require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function checkAguiaNews() {
    try {
        const client = await pool.connect();
        
        // Verificar tabelas
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE '%aguia%' OR table_name LIKE '%radar%' OR table_name = 'user_notifications')
            ORDER BY table_name
        `);
        
        console.log('✅ Tabelas Aguia News:');
        tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
        
        // Verificar dados
        try {
            const radars = await client.query('SELECT COUNT(*) as count FROM aguia_news_radars');
            console.log(`📊 Total de radars: ${radars.rows[0].count}`);
        } catch (e) {
            console.log('⚠️ Tabela aguia_news_radars não existe ou vazia');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

checkAguiaNews();
