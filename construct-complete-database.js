#!/usr/bin/env node

/**
 * 🏗️ COMPLETE DATABASE CONSTRUCTION
 * ==================================
 * 
 * This script constructs the entire database from scratch with all tables,
 * columns, constraints, indexes, and initial seed data.
 * 
 * Usage:
 *   node construct-complete-database.js [--drop-existing]
 * 
 * Options:
 *   --drop-existing: Drop all existing tables before creating new ones
 */

require('dotenv').config();
const { Pool } = require('pg');

class DatabaseConstructor {
    constructor() {
        this.pool = null;
        this.stats = {
            tablesCreated: 0,
            columnsAdded: 0,
            indexesCreated: 0,
            dataSeeded: 0,
            errors: 0
        };
    }

    async connect() {
        try {
            const connectionString = process.env.DATABASE_URL;

            if (!connectionString) {
                throw new Error('DATABASE_URL not found in environment variables');
            }

            this.pool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false },
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 10000
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
            await this.pool.query(sql);
            console.log(`✅ ${description}`);
            return true;
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log(`⚠️  ${description} (already exists)`);
                return true;
            }
            console.error(`❌ ${description}: ${error.message}`);
            this.stats.errors++;
            return false;
        }
    }

    async dropAllTables() {
        console.log('\n🗑️  Dropping all existing tables...');
        console.log('='.repeat(60));

        const tables = [
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

        for (const table of tables) {
            await this.executeSQL(`DROP TABLE IF EXISTS ${table} CASCADE;`, `Dropped table: ${table}`);
        }
    }

    async createCoreTables() {
        console.log('\n🏗️  Creating core tables...');
        console.log('='.repeat(60));

        // 1. Plans table (independent)
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                type VARCHAR(50) NOT NULL,
                price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
                billing_period VARCHAR(20) NOT NULL DEFAULT 'none',
                billing_cycle VARCHAR(20) DEFAULT 'monthly',
                commission_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
                minimum_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                features JSONB NOT NULL DEFAULT '[]',
                limits JSONB NOT NULL DEFAULT '{}',
                is_popular BOOLEAN DEFAULT FALSE,
                is_recommended BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                stripe_product_id VARCHAR(255),
                region VARCHAR(50) NOT NULL DEFAULT 'brazil',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create plans table');
        this.stats.tablesCreated++;

        // 2. Users table (depends on plans for future FK if needed)
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(255) UNIQUE,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                phone VARCHAR(50),
                country VARCHAR(10) DEFAULT 'LT',
                language VARCHAR(10) DEFAULT 'en',
                email_verified BOOLEAN DEFAULT FALSE,
                phone_verified BOOLEAN DEFAULT FALSE,
                two_factor_enabled BOOLEAN DEFAULT FALSE,
                two_factor_secret VARCHAR(255),
                user_type VARCHAR(20) DEFAULT 'USER',
                is_admin BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                
                -- Balances
                balance_real_brl DECIMAL(15,4) DEFAULT 0.00,
                balance_real_usd DECIMAL(15,4) DEFAULT 0.00,
                balance_admin_brl DECIMAL(15,4) DEFAULT 0.00,
                balance_admin_usd DECIMAL(15,4) DEFAULT 0.00,
                balance_commission_brl DECIMAL(15,4) DEFAULT 0.00,
                balance_commission_usd DECIMAL(15,4) DEFAULT 0.00,
                
                -- Plan and subscription
                plan_type VARCHAR(20) DEFAULT 'TRIAL',
                subscription_status VARCHAR(20) DEFAULT 'inactive',
                subscription_start_date TIMESTAMP WITH TIME ZONE,
                subscription_end_date TIMESTAMP WITH TIME ZONE,
                
                -- Affiliate info
                affiliate_type VARCHAR(20),
                affiliate_code VARCHAR(50) UNIQUE,
                affiliate_id INTEGER,
                
                -- Stripe integration
                stripe_customer_id VARCHAR(255),
                stripe_subscription_id VARCHAR(255),
                
                -- Trading settings
                trading_enabled BOOLEAN DEFAULT TRUE,
                max_open_positions INTEGER DEFAULT 1,
                max_position_size DECIMAL(15,4) DEFAULT 1000.00,
                default_leverage DECIMAL(5,2) DEFAULT 1.00,
                default_stop_loss_multiplier DECIMAL(3,1) DEFAULT 2.0,
                default_take_profit_multiplier DECIMAL(3,1) DEFAULT 3.0,
                risk_level VARCHAR(20) DEFAULT 'medium',
                
                -- Exchange API keys
                binance_api_key TEXT,
                binance_secret_key TEXT,
                binance_testnet BOOLEAN DEFAULT TRUE,
                bybit_api_key TEXT,
                bybit_secret_key TEXT,
                bybit_testnet BOOLEAN DEFAULT TRUE,
                okx_api_key TEXT,
                okx_secret_key TEXT,
                okx_passphrase TEXT,
                bitget_api_key TEXT,
                bitget_secret_key TEXT,
                bitget_passphrase TEXT,
                
                -- Banking info
                bank_name VARCHAR(100),
                bank_account VARCHAR(50),
                bank_agency VARCHAR(20),
                bank_document VARCHAR(20),
                pix_key VARCHAR(100),
                
                -- Security and tracking
                last_login_at TIMESTAMP WITH TIME ZONE,
                last_activity_at TIMESTAMP WITH TIME ZONE,
                login_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP WITH TIME ZONE,
                password_reset_token VARCHAR(100),
                password_reset_expires TIMESTAMP WITH TIME ZONE,
                ip_address VARCHAR(50),
                user_agent TEXT,
                registration_source VARCHAR(50) DEFAULT 'website',
                
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create users table');
        this.stats.tablesCreated++;

        // Add foreign key for affiliate_id
        await this.executeSQL(`
            ALTER TABLE users 
            ADD CONSTRAINT fk_users_affiliate_id 
            FOREIGN KEY (affiliate_id) REFERENCES users(id) ON DELETE SET NULL;
        `, 'Add users affiliate FK');
    }

    async createUserRelatedTables() {
        console.log('\n👥 Creating user-related tables...');
        console.log('='.repeat(60));

        // User sessions
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id VARCHAR(255) PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                device_info TEXT,
                ip_address VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create user_sessions table');
        this.stats.tablesCreated++;

        // User settings
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                setting_key VARCHAR(100) NOT NULL,
                setting_value TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, setting_key)
            );
        `, 'Create user_settings table');
        this.stats.tablesCreated++;

        // User API keys
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_api_keys (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                exchange VARCHAR(50) NOT NULL,
                api_key VARCHAR(255) NOT NULL,
                api_secret VARCHAR(255) NOT NULL,
                api_passphrase VARCHAR(255),
                environment VARCHAR(20) DEFAULT 'testnet',
                is_active BOOLEAN DEFAULT TRUE,
                is_valid BOOLEAN DEFAULT FALSE,
                can_read BOOLEAN DEFAULT FALSE,
                can_trade BOOLEAN DEFAULT FALSE,
                can_withdraw BOOLEAN DEFAULT FALSE,
                last_validated_at TIMESTAMP WITH TIME ZONE,
                validation_error TEXT,
                balance_last_check JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, exchange, environment)
            );
        `, 'Create user_api_keys table');
        this.stats.tablesCreated++;

        // User balances
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_balances (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                balance_type VARCHAR(50) NOT NULL,
                amount DECIMAL(15,4) DEFAULT 0.00,
                currency VARCHAR(3) DEFAULT 'USD',
                last_transaction_id INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, balance_type, currency)
            );
        `, 'Create user_balances table');
        this.stats.tablesCreated++;

        // User banking settings
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_banking_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                pix_key VARCHAR(255),
                pix_type VARCHAR(20) DEFAULT 'email',
                bank_name VARCHAR(100),
                bank_code VARCHAR(10),
                agency VARCHAR(20),
                account VARCHAR(20),
                account_type VARCHAR(20) DEFAULT 'corrente',
                account_holder_name VARCHAR(255),
                cpf VARCHAR(14),
                phone VARCHAR(20),
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id)
            );
        `, 'Create user_banking_settings table');
        this.stats.tablesCreated++;

        // User notification settings
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_notification_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                email_notifications BOOLEAN DEFAULT TRUE,
                sms_notifications BOOLEAN DEFAULT FALSE,
                push_notifications BOOLEAN DEFAULT TRUE,
                trade_alerts BOOLEAN DEFAULT TRUE,
                report_frequency VARCHAR(10) DEFAULT 'daily',
                profit_threshold_percentage DECIMAL(5,2) DEFAULT 5.00,
                loss_threshold_percentage DECIMAL(5,2) DEFAULT 10.00,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id)
            );
        `, 'Create user_notification_settings table');
        this.stats.tablesCreated++;

        // User personal settings
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_personal_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                language VARCHAR(5) DEFAULT 'pt-BR',
                timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
                currency_preference VARCHAR(3) DEFAULT 'BRL',
                theme VARCHAR(10) DEFAULT 'dark',
                date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id)
            );
        `, 'Create user_personal_settings table');
        this.stats.tablesCreated++;

        // User preferences
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                dashboard_layout JSONB DEFAULT '{}',
                widget_preferences JSONB DEFAULT '{}',
                chart_preferences JSONB DEFAULT '{}',
                alert_sounds BOOLEAN DEFAULT TRUE,
                auto_refresh BOOLEAN DEFAULT TRUE,
                refresh_interval_seconds INTEGER DEFAULT 30,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id)
            );
        `, 'Create user_preferences table');
        this.stats.tablesCreated++;

        // User security settings
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_security_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                two_factor_enabled BOOLEAN DEFAULT FALSE,
                two_factor_secret VARCHAR(255),
                login_notifications BOOLEAN DEFAULT TRUE,
                device_management BOOLEAN DEFAULT TRUE,
                session_timeout_minutes INTEGER DEFAULT 1440,
                password_change_required BOOLEAN DEFAULT FALSE,
                last_password_change TIMESTAMP WITH TIME ZONE,
                failed_login_attempts INTEGER DEFAULT 0,
                account_locked_until TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id)
            );
        `, 'Create user_security_settings table');
        this.stats.tablesCreated++;

        // User trading settings
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_trading_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                max_leverage INTEGER DEFAULT 5,
                take_profit_percentage DECIMAL(5,2) DEFAULT 15.00,
                stop_loss_percentage DECIMAL(5,2) DEFAULT 10.00,
                position_size_percentage INTEGER DEFAULT 30,
                risk_level VARCHAR(10) DEFAULT 'medium',
                auto_trade_enabled BOOLEAN DEFAULT TRUE,
                daily_loss_limit_percentage INTEGER DEFAULT 10,
                max_open_positions INTEGER DEFAULT 2,
                default_leverage INTEGER DEFAULT 5,
                stop_loss_multiplier DECIMAL(3,2) DEFAULT 2.00,
                take_profit_multiplier DECIMAL(3,2) DEFAULT 3.00,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id)
            );
        `, 'Create user_trading_settings table');
        this.stats.tablesCreated++;
    }

    async createTradingTables() {
        console.log('\n📊 Creating trading-related tables...');
        console.log('='.repeat(60));

        // Trading operations
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS trading_operations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                
                -- Operation identification
                operation_id VARCHAR(100),
                trading_pair VARCHAR(20),
                symbol VARCHAR(20),
                operation_type VARCHAR(10),
                side VARCHAR(10),
                
                -- Prices and quantities
                entry_price DECIMAL(15,8),
                exit_price DECIMAL(15,8),
                quantity DECIMAL(15,8),
                leverage DECIMAL(5,2) DEFAULT 1.00,
                
                -- P&L tracking
                amount DECIMAL(15,4),
                price DECIMAL(15,4),
                profit_loss_usd DECIMAL(15,4),
                profit_loss_percentage DECIMAL(10,4),
                commission DECIMAL(15,4),
                net_pnl DECIMAL(15,4),
                
                -- Timestamps
                entry_time TIMESTAMP WITH TIME ZONE,
                exit_time TIMESTAMP WITH TIME ZONE,
                duration_minutes INTEGER,
                
                -- Signal information
                confidence_score DECIMAL(5,2),
                signal_source VARCHAR(50) DEFAULT 'AI',
                reasoning TEXT,
                strategy VARCHAR(100),
                
                -- Risk management
                stop_loss DECIMAL(15,8),
                take_profit DECIMAL(15,8),
                risk_reward_ratio DECIMAL(5,2),
                
                -- Exchange info
                exchange VARCHAR(50),
                order_id VARCHAR(100),
                position_id VARCHAR(100),
                
                -- Status and metadata
                status VARCHAR(20) DEFAULT 'pending',
                notes TEXT,
                metadata JSONB,
                tags VARCHAR(200),
                
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create trading_operations table');
        this.stats.tablesCreated++;

        // Performance metrics
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                metric_key VARCHAR(100) NOT NULL,
                metric_value DECIMAL(15,4),
                metric_text VARCHAR(255),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create performance_metrics table');
        this.stats.tablesCreated++;

        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS trading_signals (
                signal_id VARCHAR(100) PRIMARY KEY,
                symbol VARCHAR(20) NOT NULL,
                action VARCHAR(10) NOT NULL,
                price DECIMAL(20, 8),
                quantity DECIMAL(20, 8),
                strategy VARCHAR(255),
                source VARCHAR(50),
                received_at TIMESTAMP DEFAULT NOW(),
                metadata JSONB
        );
        `, 'Create trading_signals table');
        this.stats.tablesCreated++;

        // User performance cache
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_performance_cache (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                current_balance DECIMAL(15,4) DEFAULT 0.00,
                today_profit_loss DECIMAL(15,4) DEFAULT 0.00,
                today_profit_loss_percentage DECIMAL(10,4) DEFAULT 0.00,
                today_operations INTEGER DEFAULT 0,
                today_win_rate DECIMAL(5,2) DEFAULT 0.00,
                total_profit_loss_usd DECIMAL(15,4) DEFAULT 0.00,
                total_profit_loss_percentage DECIMAL(10,4) DEFAULT 0.00,
                total_operations INTEGER DEFAULT 0,
                total_winning_operations INTEGER DEFAULT 0,
                total_losing_operations INTEGER DEFAULT 0,
                win_rate_percentage DECIMAL(5,2) DEFAULT 0.00,
                overall_win_rate DECIMAL(5,2) DEFAULT 0.00,
                best_month VARCHAR(7),
                best_month_profit DECIMAL(15,4) DEFAULT 0.00,
                biggest_profit_operation DECIMAL(15,4) DEFAULT 0.00,
                biggest_profit_pair VARCHAR(20),
                max_drawdown DECIMAL(15,4) DEFAULT 0.00,
                sharpe_ratio DECIMAL(10,4) DEFAULT 0.00,
                volatility DECIMAL(10,4) DEFAULT 0.00,
                average_operation_time_minutes INTEGER DEFAULT 0,
                last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id)
            );
        `, 'Create user_performance_cache table');
        this.stats.tablesCreated++;

        // Trading pair performance
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS trading_pair_performance (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                trading_pair VARCHAR(20) NOT NULL,
                total_profit_loss_usd DECIMAL(15,4) DEFAULT 0.00,
                total_profit_loss_percentage DECIMAL(10,4) DEFAULT 0.00,
                total_operations INTEGER DEFAULT 0,
                win_rate_percentage DECIMAL(5,2) DEFAULT 0.00,
                avg_profit_per_operation DECIMAL(15,4) DEFAULT 0.00,
                best_operation_profit DECIMAL(15,4) DEFAULT 0.00,
                worst_operation_loss DECIMAL(15,4) DEFAULT 0.00,
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, trading_pair)
            );
        `, 'Create trading_pair_performance table');
        this.stats.tablesCreated++;

        // User performance monthly
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_performance_monthly (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                performance_month VARCHAR(7) NOT NULL,
                total_profit_loss_usd DECIMAL(15,4) DEFAULT 0.00,
                total_profit_loss_percentage DECIMAL(10,4) DEFAULT 0.00,
                total_operations INTEGER DEFAULT 0,
                win_rate_percentage DECIMAL(5,2) DEFAULT 0.00,
                best_day DATE,
                best_day_profit DECIMAL(15,4) DEFAULT 0.00,
                worst_day DATE,
                worst_day_loss DECIMAL(15,4) DEFAULT 0.00,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, performance_month)
            );
        `, 'Create user_performance_monthly table');
        this.stats.tablesCreated++;

        // User performance daily
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS user_performance_daily (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                performance_date DATE NOT NULL,
                starting_balance DECIMAL(15,4) DEFAULT 0.00,
                ending_balance DECIMAL(15,4) DEFAULT 0.00,
                balance_change DECIMAL(15,4) DEFAULT 0.00,
                total_profit_loss_usd DECIMAL(15,4) DEFAULT 0.00,
                total_profit_loss_percentage DECIMAL(10,4) DEFAULT 0.00,
                total_operations INTEGER DEFAULT 0,
                win_rate_percentage DECIMAL(5,2) DEFAULT 0.00,
                winning_operations INTEGER DEFAULT 0,
                losing_operations INTEGER DEFAULT 0,
                avg_profit_per_operation DECIMAL(15,4) DEFAULT 0.00,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, performance_date)
            );
        `, 'Create user_performance_daily table');
        this.stats.tablesCreated++;
    }

    async createPaymentTables() {
        console.log('\n💳 Creating payment-related tables...');
        console.log('='.repeat(60));

        // Payment transactions
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                transaction_type VARCHAR(50) NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(3) NOT NULL,
                status VARCHAR(50) NOT NULL,
                payment_method VARCHAR(50),
                stripe_payment_intent_id VARCHAR(255),
                stripe_session_id VARCHAR(255),
                description TEXT,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create payment_transactions table');
        this.stats.tablesCreated++;

        // Transactions
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(255) UNIQUE DEFAULT gen_random_uuid()::text,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'BRL',
                status VARCHAR(20) DEFAULT 'PENDING',
                commission_amount DECIMAL(15,2) DEFAULT 0.00,
                commission_rate DECIMAL(5,2) DEFAULT 0.00,
                net_amount DECIMAL(15,2),
                plan_type VARCHAR(20),
                source_balance_type VARCHAR(20),
                target_balance_type VARCHAR(20),
                stripe_payment_intent_id VARCHAR(100),
                stripe_session_id VARCHAR(100),
                external_transaction_id VARCHAR(100),
                description TEXT,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                processed_at TIMESTAMP WITH TIME ZONE
            );
        `, 'Create transactions table');
        this.stats.tablesCreated++;

        // Withdrawal requests
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(255) UNIQUE DEFAULT gen_random_uuid()::text,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'BRL',
                status VARCHAR(20) DEFAULT 'PENDING',
                bank_details JSONB NOT NULL,
                processed_by_admin_id INTEGER,
                admin_notes TEXT,
                transaction_id VARCHAR(100),
                requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                processed_at TIMESTAMP WITH TIME ZONE,
                completed_at TIMESTAMP WITH TIME ZONE
            );
        `, 'Create withdrawal_requests table');
        this.stats.tablesCreated++;
    }

    async createStripeTables() {
        console.log('\n💰 Creating Stripe-related tables...');
        console.log('='.repeat(60));

        // Stripe customers
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS stripe_customers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255),
                name VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create stripe_customers table');
        this.stats.tablesCreated++;

        // Stripe checkout sessions
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS stripe_checkout_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
                amount INTEGER NOT NULL,
                currency VARCHAR(3) NOT NULL,
                status VARCHAR(50) NOT NULL,
                plan_type VARCHAR(50),
                country VARCHAR(10),
                success_url TEXT,
                cancel_url TEXT,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create stripe_checkout_sessions table');
        this.stats.tablesCreated++;

        // Stripe payment intents
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS stripe_payment_intents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
                amount INTEGER NOT NULL,
                currency VARCHAR(3) NOT NULL,
                status VARCHAR(50) NOT NULL,
                description TEXT,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create stripe_payment_intents table');
        this.stats.tablesCreated++;

        // Stripe setup intents
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS stripe_setup_intents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_setup_intent_id VARCHAR(255) UNIQUE NOT NULL,
                status VARCHAR(50) NOT NULL,
                payment_method_id VARCHAR(255),
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create stripe_setup_intents table');
        this.stats.tablesCreated++;

        // Stripe webhook events
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS stripe_webhook_events (
                id SERIAL PRIMARY KEY,
                stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                processed BOOLEAN DEFAULT FALSE,
                processing_status VARCHAR(50) DEFAULT 'pending',
                error_message TEXT,
                event_data JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                processed_at TIMESTAMP WITH TIME ZONE
            );
        `, 'Create stripe_webhook_events table');
        this.stats.tablesCreated++;
    }

    async createAffiliateTables() {
        console.log('\n🤝 Creating affiliate-related tables...');
        console.log('='.repeat(60));

        // Commission records
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS commission_records (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(255) UNIQUE DEFAULT gen_random_uuid()::text,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'BRL',
                type VARCHAR(50) NOT NULL,
                commission_rate DECIMAL(5,2) NOT NULL,
                related_user_id INTEGER REFERENCES users(id),
                related_trade_id INTEGER,
                plan_type VARCHAR(20),
                original_profit DECIMAL(15,2),
                description TEXT,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create commission_records table');
        this.stats.tablesCreated++;

        // Coupons
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                type VARCHAR(20) DEFAULT 'CREDIT',
                credit_amount DECIMAL(15,2),
                discount_percentage DECIMAL(5,2),
                discount_type VARCHAR(20),
                discount_value DECIMAL(10,2),
                currency VARCHAR(3) DEFAULT 'BRL',
                max_uses INTEGER DEFAULT 1,
                current_uses INTEGER DEFAULT 0,
                used_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_by_admin_id INTEGER,
                description TEXT,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `, 'Create coupons table');
        this.stats.tablesCreated++;

        // Coupon usage
        await this.executeSQL(`
            CREATE TABLE IF NOT EXISTS coupon_usage (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
                credit_amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(3) NOT NULL,
                ip_address VARCHAR(50),
                user_agent TEXT,
                used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, coupon_id)
            );
        `, 'Create coupon_usage table');
        this.stats.tablesCreated++;
    }

    async createIndexes() {
        console.log('\n🔍 Creating indexes for performance...');
        console.log('='.repeat(60));

        const indexes = [
            // Users indexes
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
            'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);',
            'CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type);',
            'CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);',
            'CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users(affiliate_code);',

            // Plans indexes
            'CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(code);',
            'CREATE INDEX IF NOT EXISTS idx_plans_region ON plans(region);',
            'CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);',

            // Trading operations indexes
            'CREATE INDEX IF NOT EXISTS idx_trading_ops_user_id ON trading_operations(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_trading_ops_trading_pair ON trading_operations(trading_pair);',
            'CREATE INDEX IF NOT EXISTS idx_trading_ops_status ON trading_operations(status);',
            'CREATE INDEX IF NOT EXISTS idx_trading_ops_entry_time ON trading_operations(entry_time DESC);',

            // Performance metrics indexes
            'CREATE INDEX IF NOT EXISTS idx_perf_user_id ON performance_metrics(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_perf_metric_key ON performance_metrics(metric_key);',
            'CREATE INDEX IF NOT EXISTS idx_perf_timestamp ON performance_metrics(timestamp DESC);',

            // Performance cache and analytics indexes
            'CREATE INDEX IF NOT EXISTS idx_perf_cache_user_id ON user_performance_cache(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_pair_perf_user_id ON trading_pair_performance(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_pair_perf_pair ON trading_pair_performance(trading_pair);',
            'CREATE INDEX IF NOT EXISTS idx_monthly_perf_user_id ON user_performance_monthly(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_monthly_perf_month ON user_performance_monthly(performance_month DESC);',
            'CREATE INDEX IF NOT EXISTS idx_daily_perf_user_id ON user_performance_daily(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_daily_perf_date ON user_performance_daily(performance_date DESC);',

            // Payment transactions indexes
            'CREATE INDEX IF NOT EXISTS idx_payment_user_id ON payment_transactions(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(status);',
            'CREATE INDEX IF NOT EXISTS idx_payment_created ON payment_transactions(created_at DESC);',

            // User sessions indexes
            'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);'
        ];

        for (const indexSQL of indexes) {
            await this.executeSQL(indexSQL, `Create index: ${indexSQL.match(/idx_\w+/)?.[0]}`);
            this.stats.indexesCreated++;
        }
    }

    async seedInitialData() {
        console.log('\n🌱 Seeding initial data...');
        console.log('='.repeat(60));

        // Seed plans
        await this.executeSQL(`
            INSERT INTO plans (code, name, description, type, price, currency, billing_period, commission_rate, minimum_balance, features, region, is_popular, is_recommended) VALUES
            ('TRIAL', 'Trial Gratuito', 'Teste grátis por 7 dias com todas as funcionalidades', 'TRIAL', 0.00, 'BRL', 'none', 0.00, 0.00, 
             '["✅ Teste grátis por 7 dias", "🔧 Trading TESTNET apenas", "⚡ Todas funcionalidades disponíveis", "💬 Suporte básico por chat", "👥 Acesso à comunidade", "📚 Material educativo gratuito"]'::jsonb, 
             'brazil', false, false),
            ('FLEX_BR', 'FLEX (Brasil)', 'Sistema pré-pago sem mensalidade, apenas 20% comissão sobre lucros', 'PREPAID', 0.00, 'BRL', 'none', 20.00, 150.00, 
             '["🤖 Trading automatizado 24/7", "💰 20% comissão apenas sobre lucros", "💳 Sistema pré-pago (sem mensalidade)", "💵 Recarga mínima: R$150", "💬 Suporte padrão por chat", "📈 Estratégias comprovadas de IA ÁGUIA", "👥 Comunidade geral", "📊 Relatórios de performance"]'::jsonb, 
             'brazil', true, false),
            ('PRO_BR', 'PRO (Brasil)', 'Plano mensal com comissão reduzida de 10% sobre os lucros', 'MONTHLY', 297.00, 'BRL', 'month', 10.00, 100.00, 
             '["🤖 Trading automatizado 24/7", "💰 10% comissão apenas sobre lucros", "🎯 Suporte prioritário VIP", "🧠 Estratégias avançadas com IA ÁGUIA", "👑 Comunidade exclusiva Premium", "⭐ Mais vantajoso para investimentos > $5k USD", "🎁 Bônus de 10% no primeiro depósito", "📱 App mobile exclusivo"]'::jsonb, 
             'brazil', false, true),
            ('FLEX_US', 'FLEX (Global)', 'Prepaid system with no monthly fee, only 20% commission on profits', 'PREPAID', 0.00, 'USD', 'none', 20.00, 30.00, 
             '["🤖 24/7 Automated Trading", "💰 20% commission only on profits", "💳 Prepaid system (no monthly fees)", "💵 Minimum deposit: $30 USD", "💬 Standard chat support", "📈 Proven ÁGUIA AI strategies", "👥 General community", "📊 Performance reports"]'::jsonb, 
             'international', true, false),
            ('PRO_US', 'PRO (Global)', 'Monthly plan with reduced 10% commission on profits', 'MONTHLY', 50.00, 'USD', 'month', 10.00, 20.00, 
             '["🤖 24/7 Automated Trading", "💰 10% commission only on profits", "🎯 Priority VIP support", "🧠 Advanced ÁGUIA AI strategies", "👑 Exclusive Premium community", "🌍 24/7 international support", "🎁 10% bonus on first deposit"]'::jsonb, 
             'international', false, true)
            ON CONFLICT (code) DO NOTHING;
        `, 'Seed plans data');
        this.stats.dataSeeded += 5;

        // Seed default admin user
        const bcrypt = require('bcrypt');
        const adminPassword = await bcrypt.hash('admin123', 10);

        await this.executeSQL(`
            INSERT INTO users (username, email, password_hash, full_name, user_type, plan_type, country, is_active, is_admin, trading_enabled) 
            VALUES ('admin', 'admin@coinbitclub.com', '${adminPassword}', 'Administrator', 'ADMIN', 'PRO_US', 'US', true, true, true)
            ON CONFLICT (email) DO NOTHING;
        `, 'Seed admin user');
        this.stats.dataSeeded++;
    }

    async verifyDatabase() {
        console.log('\n🔍 Verifying database structure...');
        console.log('='.repeat(60));

        try {
            // Get all tables
            const tables = await this.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            `);

            console.log(`\n📋 Total tables created: ${tables.rows.length}`);
            tables.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });

            // Check data in key tables
            const keyTables = ['users', 'plans', 'trading_operations', 'performance_metrics'];

            console.log('\n📊 Data counts:');
            for (const tableName of keyTables) {
                try {
                    const count = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                    console.log(`   - ${tableName}: ${count.rows[0].count} records`);
                } catch (error) {
                    console.log(`   - ${tableName}: table not found`);
                }
            }

            console.log('\n✅ Database verification completed');
            return true;
        } catch (error) {
            console.error('❌ Database verification failed:', error.message);
            return false;
        }
    }

    async construct(dropExisting = false) {
        console.log('🏗️  COMPLETE DATABASE CONSTRUCTION');
        console.log('='.repeat(60));
        console.log('Starting comprehensive database setup...\n');

        try {
            // Connect to database
            const connected = await this.connect();
            if (!connected) {
                throw new Error('Failed to connect to database');
            }

            // Drop existing tables if requested
            if (dropExisting) {
                await this.dropAllTables();
            }

            // Create all tables in proper order
            await this.createCoreTables();
            await this.createUserRelatedTables();
            await this.createTradingTables();
            await this.createPaymentTables();
            await this.createStripeTables();
            await this.createAffiliateTables();

            // Create indexes
            await this.createIndexes();

            // Seed initial data
            await this.seedInitialData();

            // Verify everything
            await this.verifyDatabase();

            // Print statistics
            console.log('\n' + '='.repeat(60));
            console.log('📊 Construction Statistics:');
            console.log(`   ✅ Tables created: ${this.stats.tablesCreated}`);
            console.log(`   ✅ Indexes created: ${this.stats.indexesCreated}`);
            console.log(`   ✅ Data records seeded: ${this.stats.dataSeeded}`);
            console.log(`   ❌ Errors: ${this.stats.errors}`);
            console.log('='.repeat(60));

            console.log('\n🎉 Database construction completed successfully!');
            console.log('✅ Your database is ready for production use');

        } catch (error) {
            console.error('\n❌ Database construction failed:', error.message);
            console.error(error.stack);
            process.exit(1);
        } finally {
            if (this.pool) {
                await this.pool.end();
                console.log('\n🔌 Database connection closed');
            }
        }
    }
}

// Main execution
if (require.main === module) {
    const dropExisting = process.argv.includes('--drop-existing');

    if (dropExisting) {
        console.log('⚠️  WARNING: --drop-existing flag detected');
        console.log('⚠️  This will DELETE ALL existing data!');
        console.log('⚠️  Continuing in 3 seconds...\n');
        setTimeout(() => {
            const constructor = new DatabaseConstructor();
            constructor.construct(true);
        }, 3000);
    } else {
        const constructor = new DatabaseConstructor();
        constructor.construct(false);
    }
}

module.exports = DatabaseConstructor;
