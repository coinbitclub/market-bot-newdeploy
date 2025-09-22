/**
 * 💳 PAYMENT DATABASE SETUP - COINBITCLUB ENTERPRISE
 * Setup payment integration database tables
 */

require('dotenv').config();
const { Pool } = require('pg');

async function setupPaymentDatabase() {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'coinbitclub_enterprise',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
    });

    try {
        console.log('💳 Setting up payment database tables...');

        // Read and execute the SQL file
        const fs = require('fs');
        const path = require('path');
        const sqlFile = path.join(__dirname, 'scripts', 'database', 'create-payment-tables.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Execute the SQL
        await pool.query(sql);

        console.log('✅ Payment database tables created successfully!');
        console.log('📋 Tables created:');
        console.log('   - stripe_customers');
        console.log('   - stripe_payment_intents');
        console.log('   - stripe_checkout_sessions');
        console.log('   - stripe_setup_intents');
        console.log('   - stripe_webhook_events');
        console.log('   - payment_transactions');
        console.log('   - user_balances');

    } catch (error) {
        console.error('❌ Error setting up payment database:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the setup
if (require.main === module) {
    setupPaymentDatabase()
        .then(() => {
            console.log('🎉 Payment database setup complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Payment database setup failed:', error);
            process.exit(1);
        });
}

module.exports = setupPaymentDatabase;
