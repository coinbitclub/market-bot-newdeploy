/**
 * 🚀 PERFORMANCE DATABASE SETUP - COINBITCLUB ENTERPRISE
 * Setup script for performance tracking database tables
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class PerformanceDatabaseSetup {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'coinbitclub',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
        });
    }

    async setupPerformanceTables() {
        console.log('🚀 Setting up performance tracking tables...');
        
        try {
            // Read and execute the SQL file
            const sqlPath = path.join(__dirname, 'database', 'create-performance-tables.sql');
            const sqlContent = fs.readFileSync(sqlPath, 'utf8');
            
            await this.pool.query(sqlContent);
            console.log('✅ Performance tables created successfully');
            
            // Create some sample data for testing
            await this.createSampleData();
            
            console.log('🎉 Performance database setup completed successfully!');
            
        } catch (error) {
            console.error('❌ Error setting up performance tables:', error);
            throw error;
        }
    }

    async createSampleData() {
        console.log('📊 Creating sample performance data...');
        
        try {
            // Get first user for sample data
            const userResult = await this.pool.query('SELECT id FROM users LIMIT 1');
            if (userResult.rows.length === 0) {
                console.log('⚠️ No users found, skipping sample data creation');
                return;
            }
            
            const userId = userResult.rows[0].id;
            console.log(`📝 Creating sample data for user ID: ${userId}`);
            
            // Create sample trading operations
            const sampleOperations = [
                {
                    user_id: userId,
                    operation_id: `OP_${Date.now()}_1`,
                    trading_pair: 'BTCUSDT',
                    operation_type: 'LONG',
                    entry_price: 67432.50,
                    exit_price: 67589.20,
                    quantity: 0.0148,
                    profit_loss: 156.70,
                    profit_loss_percentage: 2.48,
                    profit_loss_usd: 156.70,
                    stop_loss: 66800.00,
                    take_profit: 68500.00,
                    leverage: 5,
                    position_size: 0.30,
                    status: 'CLOSED',
                    entry_time: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    exit_time: new Date(Date.now() - 1 * 60 * 60 * 1000),
                    duration_minutes: 60,
                    exchange: 'BINANCE',
                    exchange_order_id: `BIN_${Date.now()}_1`,
                    signal_source: 'AI',
                    confidence_score: 85.5,
                    reasoning: 'Strong bullish momentum detected with volume confirmation'
                },
                {
                    user_id: userId,
                    operation_id: `OP_${Date.now()}_2`,
                    trading_pair: 'ETHUSDT',
                    operation_type: 'LONG',
                    entry_price: 3247.80,
                    exit_price: 3289.45,
                    quantity: 1.52,
                    profit_loss: 63.31,
                    profit_loss_percentage: 1.28,
                    profit_loss_usd: 63.31,
                    stop_loss: 3180.00,
                    take_profit: 3380.00,
                    leverage: 5,
                    position_size: 0.25,
                    status: 'CLOSED',
                    entry_time: new Date(Date.now() - 3 * 60 * 60 * 1000),
                    exit_time: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    duration_minutes: 60,
                    exchange: 'BINANCE',
                    exchange_order_id: `BIN_${Date.now()}_2`,
                    signal_source: 'AI',
                    confidence_score: 78.2,
                    reasoning: 'Support level held with increasing buying pressure'
                },
                {
                    user_id: userId,
                    operation_id: `OP_${Date.now()}_3`,
                    trading_pair: 'ADAUSDT',
                    operation_type: 'SHORT',
                    entry_price: 0.4850,
                    exit_price: 0.4780,
                    quantity: 1000,
                    profit_loss: 70.00,
                    profit_loss_percentage: 1.44,
                    profit_loss_usd: 70.00,
                    stop_loss: 0.4950,
                    take_profit: 0.4700,
                    leverage: 3,
                    position_size: 0.20,
                    status: 'CLOSED',
                    entry_time: new Date(Date.now() - 4 * 60 * 60 * 1000),
                    exit_time: new Date(Date.now() - 3 * 60 * 60 * 1000),
                    duration_minutes: 60,
                    exchange: 'BINANCE',
                    exchange_order_id: `BIN_${Date.now()}_3`,
                    signal_source: 'AI',
                    confidence_score: 72.8,
                    reasoning: 'Resistance level confirmed with bearish divergence'
                }
            ];

            // Insert sample operations
            for (const operation of sampleOperations) {
                await this.pool.query(`
                    INSERT INTO trading_operations (
                        user_id, operation_id, trading_pair, operation_type, entry_price, exit_price,
                        quantity, profit_loss, profit_loss_percentage, profit_loss_usd, stop_loss,
                        take_profit, leverage, position_size, status, entry_time, exit_time,
                        duration_minutes, exchange, exchange_order_id, signal_source,
                        confidence_score, reasoning
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
                `, [
                    operation.user_id, operation.operation_id, operation.trading_pair,
                    operation.operation_type, operation.entry_price, operation.exit_price,
                    operation.quantity, operation.profit_loss, operation.profit_loss_percentage,
                    operation.profit_loss_usd, operation.stop_loss, operation.take_profit,
                    operation.leverage, operation.position_size, operation.status,
                    operation.entry_time, operation.exit_time, operation.duration_minutes,
                    operation.exchange, operation.exchange_order_id, operation.signal_source,
                    operation.confidence_score, operation.reasoning
                ]);
            }

            console.log(`✅ Created ${sampleOperations.length} sample trading operations`);

            // Calculate performance metrics
            await this.pool.query('SELECT calculate_user_performance($1)', [userId]);
            console.log('✅ Performance metrics calculated');

            // Create sample cache data
            await this.pool.query(`
                INSERT INTO user_performance_cache (
                    user_id, current_balance, today_profit_loss, today_profit_loss_percentage,
                    today_operations, today_win_rate, total_operations, total_winning_operations,
                    total_losing_operations, overall_win_rate, total_profit_loss, total_profit_loss_percentage,
                    best_month, best_month_profit, biggest_profit_operation, biggest_profit_pair,
                    max_drawdown, sharpe_ratio, volatility, average_operation_time_minutes
                ) VALUES (
                    $1, 10000.00, 290.01, 2.90, 3, 100.00, 3, 3, 0, 100.00, 290.01, 2.90,
                    'Dezembro 2024', 2890.45, 156.70, 'BTCUSDT', 0.00, 1.85, 12.5, 60
                )
                ON CONFLICT (user_id) DO UPDATE SET
                    current_balance = EXCLUDED.current_balance,
                    today_profit_loss = EXCLUDED.today_profit_loss,
                    today_profit_loss_percentage = EXCLUDED.today_profit_loss_percentage,
                    today_operations = EXCLUDED.today_operations,
                    today_win_rate = EXCLUDED.today_win_rate,
                    total_operations = EXCLUDED.total_operations,
                    total_winning_operations = EXCLUDED.total_winning_operations,
                    total_losing_operations = EXCLUDED.total_losing_operations,
                    overall_win_rate = EXCLUDED.overall_win_rate,
                    total_profit_loss = EXCLUDED.total_profit_loss,
                    total_profit_loss_percentage = EXCLUDED.total_profit_loss_percentage,
                    best_month = EXCLUDED.best_month,
                    best_month_profit = EXCLUDED.best_month_profit,
                    biggest_profit_operation = EXCLUDED.biggest_profit_operation,
                    biggest_profit_pair = EXCLUDED.biggest_profit_pair,
                    max_drawdown = EXCLUDED.max_drawdown,
                    sharpe_ratio = EXCLUDED.sharpe_ratio,
                    volatility = EXCLUDED.volatility,
                    average_operation_time_minutes = EXCLUDED.average_operation_time_minutes,
                    last_calculated_at = NOW(),
                    updated_at = NOW()
            `, [userId]);

            console.log('✅ Sample performance cache created');

        } catch (error) {
            console.error('❌ Error creating sample data:', error);
            throw error;
        }
    }

    async verifySetup() {
        console.log('🔍 Verifying performance database setup...');
        
        try {
            const tables = [
                'trading_operations',
                'user_performance_daily',
                'user_performance_monthly',
                'trading_pair_performance',
                'user_performance_cache'
            ];

            for (const table of tables) {
                const result = await this.pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`✅ Table ${table}: ${result.rows[0].count} records`);
            }

            // Test the calculation function
            const userResult = await this.pool.query('SELECT id FROM users LIMIT 1');
            if (userResult.rows.length > 0) {
                const userId = userResult.rows[0].id;
                await this.pool.query('SELECT calculate_user_performance($1)', [userId]);
                console.log('✅ Performance calculation function working');
            }

            console.log('🎉 Database setup verification completed successfully!');

        } catch (error) {
            console.error('❌ Error verifying setup:', error);
            throw error;
        }
    }

    async close() {
        await this.pool.end();
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new PerformanceDatabaseSetup();
    
    setup.setupPerformanceTables()
        .then(() => setup.verifySetup())
        .then(() => {
            console.log('🚀 Performance database setup completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Setup failed:', error);
            process.exit(1);
        })
        .finally(() => setup.close());
}

module.exports = PerformanceDatabaseSetup;
