/**
 * 🌱 SEED ADDITIONAL DATABASE DATA
 * Seeds user settings and performance data for testing
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedData() {
    console.log('🌱 Seeding additional database data...\n');

    try {
        // Read and execute user settings seed
        console.log('📋 Seeding user settings...');
        const userSettingsSql = fs.readFileSync(
            path.join(__dirname, 'scripts', 'database', 'seed-user-settings.sql'),
            'utf8'
        );
        await pool.query(userSettingsSql);
        console.log('✅ User settings seeded\n');

        // Read and execute performance data seed
        console.log('📊 Seeding performance data...');
        const performanceSql = fs.readFileSync(
            path.join(__dirname, 'scripts', 'database', 'seed-performance-data.sql'),
            'utf8'
        );
        await pool.query(performanceSql);
        console.log('✅ Performance data seeded\n');

        // Verify seeded data
        console.log('🔍 Verifying seeded data...\n');

        // Check user settings
        const settings = await pool.query('SELECT * FROM user_settings WHERE user_id = 1');
        console.log(`   User Settings: ${settings.rows.length} records`);

        // Check performance metrics
        const metrics = await pool.query('SELECT * FROM performance_metrics WHERE user_id = 1');
        console.log(`   Performance Metrics: ${metrics.rows.length} records`);

        // Check trading operations
        const operations = await pool.query('SELECT * FROM trading_operations WHERE user_id = 1');
        console.log(`   Trading Operations: ${operations.rows.length} records`);

        // Check fear & greed index
        const fearGreed = await pool.query('SELECT * FROM fear_greed_index');
        console.log(`   Fear & Greed Index: ${fearGreed.rows.length} records`);

        console.log('\n🎉 All additional data seeded successfully!');

    } catch (error) {
        console.error('❌ Error seeding data:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the script
seedData()
    .then(() => {
        console.log('\n✅ Seeding script completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Seeding script failed:', error);
        process.exit(1);
    });
