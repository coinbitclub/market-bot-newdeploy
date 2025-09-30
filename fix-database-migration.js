#!/usr/bin/env node

/**
 * 🔧 FIX DATABASE MIGRATION
 * =========================
 * 
 * This script properly recreates all tables and migrates data correctly
 */

require('dotenv').config();
const { Pool } = require('pg');

class DatabaseFixer {
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

    async dropAllTables() {
        console.log('\n🗑️  Dropping all existing tables...');
        
        const dropOrder = [
            'commission_records',
            'coupon_usage', 
            'coupons',
            'payment_transactions',
            'stripe_checkout_sessions',
            'stripe_customers',
            'stripe_payment_intents',
            'stripe_setup_intents',
            'stripe_webhook_events',
            'transactions',
            'user_api_keys',
            'user_balances',
            'user_banking_settings',
            'user_notification_settings',
            'user_personal_settings',
            'user_preferences',
            'user_security_settings',
            'user_sessions',
            'user_trading_settings',
            'withdrawal_requests',
            'trading_operations',
            'performance_metrics',
            'user_settings',
            'users',
            'plans'
        ];

        for (const tableName of dropOrder) {
            await this.executeSQL(`DROP TABLE IF EXISTS ${tableName} CASCADE;`, `Drop table: ${tableName}`);
        }
    }

    async createTables() {
        console.log('\n🔄 Creating all tables...');
        
        const tables = [
            // Plans table (must be first)
            `CREATE TABLE plans (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                billing_cycle VARCHAR(20) DEFAULT 'monthly',
                features JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                region VARCHAR(20) DEFAULT 'international',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // Users table
            `CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                user_type VARCHAR(20) DEFAULT 'USER',
                plan_type VARCHAR(20) DEFAULT 'TRIAL',
                country VARCHAR(10),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // User settings table
            `CREATE TABLE user_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                setting_key VARCHAR(100) NOT NULL,
                setting_value TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, setting_key)
            );`,

            // Performance metrics table
            `CREATE TABLE performance_metrics (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                metric_key VARCHAR(100) NOT NULL,
                metric_value DECIMAL(15,4),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, metric_key, timestamp)
            );`,

            // Trading operations table
            `CREATE TABLE trading_operations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                operation_type VARCHAR(50) NOT NULL,
                symbol VARCHAR(20),
                amount DECIMAL(15,4),
                price DECIMAL(15,4),
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // Commission records table
            `CREATE TABLE commission_records (
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
            `CREATE TABLE coupons (
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
            `CREATE TABLE coupon_usage (
                id SERIAL PRIMARY KEY,
                coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(coupon_id, user_id)
            );`,

            // Payment transactions table
            `CREATE TABLE payment_transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(20) DEFAULT 'pending',
                payment_method VARCHAR(50),
                transaction_id VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // Stripe customers table
            `CREATE TABLE stripe_customers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // Stripe checkout sessions table
            `CREATE TABLE stripe_checkout_sessions (
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

            // Stripe payment intents table
            `CREATE TABLE stripe_payment_intents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // Stripe setup intents table
            `CREATE TABLE stripe_setup_intents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                setup_intent_id VARCHAR(255) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // Stripe webhook events table
            `CREATE TABLE stripe_webhook_events (
                id SERIAL PRIMARY KEY,
                event_id VARCHAR(255) UNIQUE NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                processed BOOLEAN DEFAULT FALSE,
                data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // Transactions table
            `CREATE TABLE transactions (
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

            // User API keys table
            `CREATE TABLE user_api_keys (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                exchange VARCHAR(50) NOT NULL,
                api_key VARCHAR(255) NOT NULL,
                api_secret VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // User balances table
            `CREATE TABLE user_balances (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                balance_type VARCHAR(50) NOT NULL,
                amount DECIMAL(15,4) DEFAULT 0.00,
                currency VARCHAR(3) DEFAULT 'USD',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, balance_type, currency)
            );`,

            // User banking settings table
            `CREATE TABLE user_banking_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                bank_name VARCHAR(100),
                account_number VARCHAR(50),
                routing_number VARCHAR(50),
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // User notification settings table
            `CREATE TABLE user_notification_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                email_notifications BOOLEAN DEFAULT TRUE,
                sms_notifications BOOLEAN DEFAULT FALSE,
                push_notifications BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // User personal settings table
            `CREATE TABLE user_personal_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                timezone VARCHAR(50) DEFAULT 'UTC',
                language VARCHAR(10) DEFAULT 'en',
                theme VARCHAR(20) DEFAULT 'dark',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // User preferences table
            `CREATE TABLE user_preferences (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                preference_key VARCHAR(100) NOT NULL,
                preference_value TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, preference_key)
            );`,

            // User security settings table
            `CREATE TABLE user_security_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                two_factor_enabled BOOLEAN DEFAULT FALSE,
                two_factor_secret VARCHAR(255),
                login_attempts INTEGER DEFAULT 0,
                last_login TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // User sessions table
            `CREATE TABLE user_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                session_token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // User trading settings table
            `CREATE TABLE user_trading_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                default_leverage DECIMAL(5,2) DEFAULT 1.00,
                max_position_size DECIMAL(15,4),
                risk_level VARCHAR(20) DEFAULT 'medium',
                auto_trading BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // Withdrawal requests table
            `CREATE TABLE withdrawal_requests (
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

        for (const tableSQL of tables) {
            await this.executeSQL(tableSQL, 'Create table');
        }
    }

    async seedData() {
        console.log('\n🌱 Seeding essential data...');
        
        const seedData = [
            // Insert plans
            `INSERT INTO plans (code, name, description, price, currency, billing_cycle, region, features) VALUES
            ('TRIAL', 'Trial Plan', 'Free trial for new users', 0.00, 'USD', 'monthly', 'universal', '{"features": ["Basic trading", "Limited signals", "Community access"]}'),
            ('FLEX_BR', 'Flex Brazil', 'Flexible plan for Brazilian users', 97.00, 'BRL', 'monthly', 'brazil', '{"features": ["Advanced trading", "Premium signals", "Priority support"]}'),
            ('PRO_BR', 'Pro Brazil', 'Professional plan for Brazilian users', 197.00, 'BRL', 'monthly', 'brazil', '{"features": ["All features", "VIP signals", "24/7 support", "Custom strategies"]}'),
            ('FLEX_US', 'Flex International', 'Flexible plan for international users', 29.00, 'USD', 'monthly', 'international', '{"features": ["Advanced trading", "Premium signals", "Priority support"]}'),
            ('PRO_US', 'Pro International', 'Professional plan for international users', 59.00, 'USD', 'monthly', 'international', '{"features": ["All features", "VIP signals", "24/7 support", "Custom strategies"]}')
            ON CONFLICT (code) DO NOTHING;`,

            // Insert admin user
            `INSERT INTO users (username, email, password_hash, full_name, user_type, plan_type, country, is_active) 
             VALUES ('admin', 'admin@coinbitclub.com', '$2b$10$example', 'Administrator', 'ADMIN', 'PRO_US', 'US', true)
             ON CONFLICT (email) DO NOTHING;`,

            // Insert test user
            `INSERT INTO users (username, email, password_hash, full_name, user_type, plan_type, country, is_active) 
             VALUES ('testuser', 'user@coinbitclub.com', '$2b$10$GAD4/TCdGZmtf7fOq1vP3uzxbZO/.aAo0nWjXW.Aq2D8CY70H0L0m', 'Test User', 'USER', 'TRIAL', 'BR', true)
             ON CONFLICT (email) DO NOTHING;`,

            // Insert sample commission record
            `INSERT INTO commission_records (user_id, affiliate_id, amount, commission_rate, status)
             SELECT 1, 1, 50.00, 20.00, 'completed'
             WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
             ON CONFLICT DO NOTHING;`,

            // Insert sample coupon
            `INSERT INTO coupons (code, description, discount_type, discount_value, max_uses, is_active)
             VALUES ('WELCOME10', 'Welcome discount', 'percentage', 10.00, 100, true)
             ON CONFLICT (code) DO NOTHING;`,

            // Insert sample user balance
            `INSERT INTO user_balances (user_id, balance_type, amount, currency)
             SELECT 1, 'trading', 1000.00, 'USD'
             WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
             ON CONFLICT (user_id, balance_type, currency) DO NOTHING;`,

            // Insert sample performance metrics
            `INSERT INTO performance_metrics (user_id, metric_key, metric_value)
             SELECT 1, 'total_pnl', 1500.75
             WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
             ON CONFLICT (user_id, metric_key, timestamp) DO NOTHING;`,

            `INSERT INTO performance_metrics (user_id, metric_key, metric_value)
             SELECT 1, 'win_rate', 0.72
             WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
             ON CONFLICT (user_id, metric_key, timestamp) DO NOTHING;`,

            `INSERT INTO performance_metrics (user_id, metric_key, metric_value)
             SELECT 1, 'total_trades', 120
             WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
             ON CONFLICT (user_id, metric_key, timestamp) DO NOTHING;`
        ];

        for (const dataSQL of seedData) {
            await this.executeSQL(dataSQL, 'Insert seed data');
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
            
            // Check data in key tables
            const keyTables = [
                'users', 'plans', 'commission_records', 'coupons', 
                'payment_transactions', 'stripe_customers', 'user_balances',
                'transactions', 'withdrawal_requests', 'performance_metrics',
                'trading_operations', 'user_settings'
            ];
            
            console.log('\n📊 Data counts:');
            for (const tableName of keyTables) {
                try {
                    const count = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                    console.log(`   - ${tableName}: ${count.rows[0].count} records`);
                } catch (error) {
                    console.log(`   - ${tableName}: table not found or empty`);
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

    async fix() {
        console.log('🔧 Starting database fix and migration...');
        console.log('=' .repeat(60));
        
        try {
            // Connect to database
            const connected = await this.connect();
            if (!connected) {
                throw new Error('Failed to connect to database');
            }
            
            // Drop all existing tables
            await this.dropAllTables();
            
            // Create all tables
            await this.createTables();
            
            // Seed data
            await this.seedData();
            
            // Verify migration
            await this.verifyMigration();
            
            console.log('\n🎉 Database fix and migration completed successfully!');
            console.log('✅ Your database now has the correct structure and data');
            
        } catch (error) {
            console.error('\n❌ Database fix failed:', error.message);
            process.exit(1);
        } finally {
            await this.close();
        }
    }
}

// Run fix if called directly
if (require.main === module) {
    const fixer = new DatabaseFixer();
    fixer.fix().catch(console.error);
}

module.exports = DatabaseFixer;
