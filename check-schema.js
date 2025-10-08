const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    try {
        // Check performance_metrics
        const perfSchema = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'performance_metrics'
            ORDER BY ordinal_position
        `);

        console.log('📊 Performance Metrics Table Schema:');
        console.log('─'.repeat(50));
        perfSchema.rows.forEach(c => {
            console.log(`  ${c.column_name.padEnd(30)} ${c.data_type}`);
        });

        // Check trading_operations
        const opsSchema = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'trading_operations'
            ORDER BY ordinal_position
        `);

        console.log('\n💹 Trading Operations Table Schema:');
        console.log('─'.repeat(50));
        opsSchema.rows.forEach(c => {
            console.log(`  ${c.column_name.padEnd(30)} ${c.data_type}`);
        });

        // Check fear_greed_index
        const fgSchema = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'fear_greed_index'
            ORDER BY ordinal_position
        `);

        console.log('\n😱 Fear & Greed Index Table Schema:');
        console.log('─'.repeat(50));
        fgSchema.rows.forEach(c => {
            console.log(`  ${c.column_name.padEnd(30)} ${c.data_type}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
