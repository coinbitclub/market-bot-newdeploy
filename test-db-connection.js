const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway';

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testConnection() {
    try {
        console.log('🔗 Testando conexão com o banco...');
        const client = await pool.connect();
        console.log('✅ Conectado com sucesso!');
        
        const result = await client.query('SELECT NOW() as current_time, version() as version');
        console.log('🕒 Horário do banco:', result.rows[0].current_time);
        console.log('📋 Versão PostgreSQL:', result.rows[0].version.split(' ')[0]);
        
        // Verificar se as tabelas existem
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('📊 Tabelas existentes:');
        if (tables.rows.length === 0) {
            console.log('  ⚠️ Nenhuma tabela encontrada - banco vazio');
        } else {
            tables.rows.forEach(row => {
                console.log(`  - ${row.table_name}`);
            });
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro na conexão:', error.message);
        process.exit(1);
    }
}

testConnection();
