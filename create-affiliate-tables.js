/**
 * Create Affiliate System Tables
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') ? {
        rejectUnauthorized: false
    } : false
});

async function createTables() {
    console.log('📊 Creating affiliate system tables...\n');

    try {
        // 1. Affiliates table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS affiliates (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL,
                affiliate_code VARCHAR(20) UNIQUE NOT NULL,
                tier VARCHAR(20) DEFAULT 'tier1',
                status VARCHAR(20) DEFAULT 'active',
                total_referrals INTEGER DEFAULT 0,
                active_referrals INTEGER DEFAULT 0,
                total_earnings DECIMAL(10,2) DEFAULT 0,
                current_balance DECIMAL(10,2) DEFAULT 0,
                withdrawn_amount DECIMAL(10,2) DEFAULT 0,
                commission_rate DECIMAL(5,4) DEFAULT 0.015,
                joined_at TIMESTAMP DEFAULT NOW(),
                last_activity_at TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Table: affiliates created');

        // 2. Referrals table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
                referred_user_id INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                referred_at TIMESTAMP DEFAULT NOW(),
                converted_at TIMESTAMP,
                conversion_value DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(affiliate_id, referred_user_id)
            );
        `);
        console.log('✅ Table: referrals created');

        // 3. Commissions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS commissions (
                id SERIAL PRIMARY KEY,
                affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
                referral_id INTEGER REFERENCES referrals(id) ON DELETE SET NULL,
                amount DECIMAL(10,2) NOT NULL,
                type VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                paid_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Table: commissions created');

        // 4. Affiliate links table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS affiliate_links (
                id SERIAL PRIMARY KEY,
                affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
                link_code VARCHAR(50) UNIQUE NOT NULL,
                campaign_id VARCHAR(50) DEFAULT 'default',
                url TEXT NOT NULL,
                clicks INTEGER DEFAULT 0,
                conversions INTEGER DEFAULT 0,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Table: affiliate_links created');

        // 5. Click tracking table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS affiliate_clicks (
                id SERIAL PRIMARY KEY,
                link_id INTEGER REFERENCES affiliate_links(id) ON DELETE CASCADE,
                affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
                ip_address VARCHAR(50),
                user_agent TEXT,
                referrer TEXT,
                clicked_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Table: affiliate_clicks created');

        // 6. Conversion tracking table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS affiliate_conversions (
                id SERIAL PRIMARY KEY,
                link_id INTEGER REFERENCES affiliate_links(id) ON DELETE CASCADE,
                affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL,
                conversion_type VARCHAR(50) NOT NULL,
                amount DECIMAL(10,2) DEFAULT 0,
                commission_amount DECIMAL(10,2) DEFAULT 0,
                converted_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ Table: affiliate_conversions created');

        // Create indexes
        console.log('\n📑 Creating indexes...');

        await pool.query('CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON referrals(affiliate_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_referrals_user ON referrals(referred_user_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON commissions(affiliate_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_links_affiliate ON affiliate_links(affiliate_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_clicks_link ON affiliate_clicks(link_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_conversions_affiliate ON affiliate_conversions(affiliate_id);');

        console.log('✅ Indexes created');

        // Verify tables
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE '%affiliate%' OR table_name LIKE '%referral%' OR table_name LIKE '%commission%'
            ORDER BY table_name;
        `);

        console.log('\n✅ Affiliate system tables verified:');
        result.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        console.log('\n🎉 Affiliate system database setup complete!');

    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

createTables().catch(console.error);
