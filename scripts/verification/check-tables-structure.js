const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function checkTables() {
    try {
        console.log('=== VERIFICANDO ESTRUTURA DAS TABELAS ===');
        
        // Verificar system_logs
        const systemLogsColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'system_logs' 
            ORDER BY ordinal_position
        `);
        console.log('\nColunas da tabela system_logs:');
        systemLogsColumns.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
        
        // Verificar top100_cryptocurrencies
        const top100Columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'top100_cryptocurrencies' 
            ORDER BY ordinal_position
        `);
        console.log('\nColunas da tabela top100_cryptocurrencies:');
        top100Columns.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
        
    } catch (error) {
        console.error('Erro:', error.message);
    } finally {
        await pool.end();
    }
}

checkTables();
