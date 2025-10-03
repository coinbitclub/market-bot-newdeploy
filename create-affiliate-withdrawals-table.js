/**
 * 💰 CREATE AFFILIATE WITHDRAWALS TABLE
 * Creates the missing affiliate_withdrawals table for withdrawal management
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createWithdrawalsTable() {
    console.log('🚀 Creating affiliate_withdrawals table...\n');

    try {
        // Create affiliate_withdrawals table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS affiliate_withdrawals (
                id SERIAL PRIMARY KEY,
                affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
                amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
                method VARCHAR(20) NOT NULL CHECK (method IN ('PIX', 'BANK_TRANSFER')),
                fees DECIMAL(10,2) NOT NULL DEFAULT 0,
                net_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),

                -- Payment details
                payment_method_details JSONB,

                -- Timestamps
                created_at TIMESTAMP DEFAULT NOW(),
                approved_at TIMESTAMP,
                processing_at TIMESTAMP,
                completed_at TIMESTAMP,
                rejected_at TIMESTAMP,

                -- Rejection details
                rejection_reason TEXT,

                -- Admin tracking
                approved_by INTEGER REFERENCES users(id),
                processed_by INTEGER REFERENCES users(id),

                -- Metadata
                notes TEXT,
                transaction_id VARCHAR(100)
            )
        `);
        console.log('✅ Table "affiliate_withdrawals" created successfully');

        // Create indexes for performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_affiliate
            ON affiliate_withdrawals(affiliate_id)
        `);
        console.log('✅ Index on affiliate_id created');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_status
            ON affiliate_withdrawals(status)
        `);
        console.log('✅ Index on status created');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_created
            ON affiliate_withdrawals(created_at DESC)
        `);
        console.log('✅ Index on created_at created');

        // Verify table structure
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'affiliate_withdrawals'
            ORDER BY ordinal_position
        `);

        console.log('\n📊 Table Structure:');
        console.log('─'.repeat(60));
        result.rows.forEach(col => {
            console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        console.log('─'.repeat(60));

        // Count existing withdrawals
        const count = await pool.query('SELECT COUNT(*) FROM affiliate_withdrawals');
        console.log(`\n✅ Table ready with ${count.rows[0].count} existing records`);

        console.log('\n🎉 Affiliate withdrawals table setup complete!');

    } catch (error) {
        console.error('❌ Error creating table:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the script
createWithdrawalsTable()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
