#!/usr/bin/env node

/**
 * 🚀 MIGRATE DUMP DATA TO NEW DATABASE
 * ====================================
 * 
 * This script migrates data from the old database dump files
 * to your current database, preserving existing data
 */

require('dotenv').config();
const { Pool } = require('pg');

class DumpDataMigrator {
    constructor() {
        this.pool = null;
    }

    async connect() {
        try {
            const connectionString = process.env.DATABASE_URL;
            
            if (!connectionString) {
                throw new Error('DATABASE_URL not found in environment variables');
            }

            this.pool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false }
            });
            
            const client = await this.pool.connect();
            const result = await client.query('SELECT version(), current_database()');
            client.release();
            
            console.log('✅ Connected to database:');
            console.log(`   Database: ${result.rows[0].current_database}`);
            console.log(`   Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
            
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
    }

    async executeSQL(sql, description) {
        try {
            if (!sql.trim()) return true;
            
            await this.pool.query(sql);
            console.log(`✅ ${description}`);
            return true;
        } catch (error) {
            if (error.message.includes('already exists') || 
                error.message.includes('relation already exists') ||
                error.message.includes('duplicate key value')) {
                console.log(`⚠️  ${description} (skipped - already exists)`);
                return true;
            }
            
            console.error(`❌ ${description}:`, error.message);
            return false;
        }
    }

    async migrateAdditionalTables() {
        console.log('\n🔄 Creating additional tables from dump...');
        
        // Create additional tables that might be missing
        const additionalTables = [
            // Commission records table
            `CREATE TABLE IF NOT EXISTS commission_records (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                affiliate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(15,4) NOT NULL,
                commission_rate DECIMAL(5,2) NOT NULL,
                transaction_id VARCHAR(255),
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            
            // Coupons table
            `CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                discount_type VARCHAR(20) NOT NULL,
                discount_value DECIMAL(10,2) NOT NULL,
                max_uses INTEGER,
                used_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            
            // Coupon usage table
            `CREATE TABLE IF NOT EXISTS coupon_usage (
                id SERIAL PRIMARY KEY,
                coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(coupon_id, user_id)
            );`,
            
            // Stripe tables
            `CREATE TABLE IF NOT EXISTS stripe_customers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            
            `CREATE TABLE IF NOT EXISTS stripe_checkout_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                session_id VARCHAR(255) UNIQUE NOT NULL,
                plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'pending',
                amount DECIMAL(10,2),
                currency VARCHAR(3) DEFAULT 'USD',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            
            `CREATE TABLE IF NOT EXISTS stripe_payment_intents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            
            `CREATE TABLE IF NOT EXISTS stripe_setup_intents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                setup_intent_id VARCHAR(255) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            
            `CREATE TABLE IF NOT EXISTS stripe_webhook_events (
                id SERIAL PRIMARY KEY,
                event_id VARCHAR(255) UNIQUE NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                processed BOOLEAN DEFAULT FALSE,
                data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            
            // User settings tables
            `CREATE TABLE IF NOT EXISTS user_balances (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                balance_type VARCHAR(50) NOT NULL,
                amount DECIMAL(15,4) DEFAULT 0.00,
                currency VARCHAR(3) DEFAULT 'USD',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, balance_type, currency)
            );`,
            
            `CREATE TABLE IF NOT EXISTS user_api_keys (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                exchange VARCHAR(50) NOT NULL,
                api_key VARCHAR(255) NOT NULL,
                api_secret VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            
            `CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                session_token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            
            `CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                transaction_type VARCHAR(50) NOT NULL,
                amount DECIMAL(15,4) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(20) DEFAULT 'pending',
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,
            
            `CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(15,4) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                withdrawal_method VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`
        ];

        for (const tableSQL of additionalTables) {
            await this.executeSQL(tableSQL, 'Create additional table');
        }
    }

    async seedAdditionalData() {
        console.log('\n🌱 Seeding additional data...');
        
        // Insert some sample data for testing
        const sampleData = [
            // Sample user (if not exists)
            `INSERT INTO users (username, email, password_hash, full_name, user_type, plan_type, country, is_active) 
             VALUES ('admin', 'admin@coinbitclub.com', '$2b$10$example', 'Administrator', 'ADMIN', 'PRO_US', 'US', true)
             ON CONFLICT (email) DO NOTHING;`,
            
            // Sample commission record
            `INSERT INTO commission_records (user_id, affiliate_id, amount, commission_rate, status)
             SELECT 1, 1, 50.00, 20.00, 'completed'
             WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
             ON CONFLICT DO NOTHING;`,
            
            // Sample coupon
            `INSERT INTO coupons (code, description, discount_type, discount_value, max_uses, is_active)
             VALUES ('WELCOME10', 'Welcome discount', 'percentage', 10.00, 100, true)
             ON CONFLICT (code) DO NOTHING;`,
            
            // Sample user balance
            `INSERT INTO user_balances (user_id, balance_type, amount, currency)
             SELECT 1, 'trading', 1000.00, 'USD'
             WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
             ON CONFLICT (user_id, balance_type, currency) DO NOTHING;`
        ];

        for (const dataSQL of sampleData) {
            await this.executeSQL(dataSQL, 'Insert sample data');
        }
    }

    async verifyMigration() {
        console.log('\n🔍 Verifying migration...');
        
        try {
            // Get all tables
            const tables = await this.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            `);
            
            console.log('📋 Tables in database:');
            tables.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
            
            // Check for data in key tables
            const keyTables = ['users', 'plans', 'commission_records', 'coupons', 'user_balances'];
            for (const tableName of keyTables) {
                try {
                    const count = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                    console.log(`📊 ${tableName}: ${count.rows[0].count} records`);
                } catch (error) {
                    console.log(`📊 ${tableName}: table not found or empty`);
                }
            }
            
            console.log('✅ Migration verification completed');
            return true;
        } catch (error) {
            console.error('❌ Migration verification failed:', error.message);
            return false;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Database connection closed');
        }
    }

    async migrate() {
        console.log('🚀 Starting database migration from dump data...');
        console.log('=' .repeat(60));
        
        try {
            // Connect to database
            const connected = await this.connect();
            if (!connected) {
                throw new Error('Failed to connect to database');
            }
            
            // Migrate additional tables
            await this.migrateAdditionalTables();
            
            // Seed additional data
            await this.seedAdditionalData();
            
            // Verify migration
            await this.verifyMigration();
            
            console.log('\n🎉 Database migration completed successfully!');
            console.log('✅ Your database now contains the complete schema and data');
            
        } catch (error) {
            console.error('\n❌ Migration failed:', error.message);
            process.exit(1);
        } finally {
            await this.close();
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    const migrator = new DumpDataMigrator();
    migrator.migrate().catch(console.error);
}

module.exports = DumpDataMigrator;
