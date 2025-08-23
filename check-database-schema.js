const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTables() {
    try {
        console.log('🔍 Verificando estrutura das tabelas...\n');
        
        // Verificar estrutura da tabela trading_signals
        const signalsSchema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'trading_signals'
            ORDER BY ordinal_position
        `);
        console.log('=== TRADING_SIGNALS ===');
        signalsSchema.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
        
        // Verificar estrutura da tabela trade_executions
        const executionsSchema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'trade_executions'
            ORDER BY ordinal_position
        `);
        console.log('\n=== TRADE_EXECUTIONS ===');
        executionsSchema.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
        
        // Verificar estrutura da tabela users
        const usersSchema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);
        console.log('\n=== USERS ===');
        usersSchema.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
        
        // Verificar estrutura da tabela active_positions
        const positionsSchema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'active_positions'
            ORDER BY ordinal_position
        `);
        console.log('\n=== ACTIVE_POSITIONS ===');
        positionsSchema.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
        
        // Verificar todas as tabelas disponíveis
        const allTables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.log('\n=== TODAS AS TABELAS ===');
        allTables.rows.forEach(row => console.log(row.table_name));
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

checkTables();
