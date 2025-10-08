/**
 * 🌱 SEED DATABASE WITH CORRECTED SCHEMA
 * Seeds user settings and performance data matching actual database schema
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedData() {
    console.log('🌱 Seeding database with corrected schema...\n');

    try {
        // 1. Seed user settings (already successful - skip if exists)
        console.log('📋 Seeding user settings...');

        const settingsData = [
            { key: 'theme', value: 'dark' },
            { key: 'language', value: 'pt' },
            { key: 'notifications', value: 'true' },
            { key: 'auto_trading', value: 'false' }
        ];

        for (const setting of settingsData) {
            await pool.query(`
                INSERT INTO user_settings (user_id, setting_key, setting_value, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
                ON CONFLICT (user_id, setting_key) DO NOTHING
            `, [1, setting.key, setting.value]);
        }

        const settingsCount = await pool.query('SELECT COUNT(*) FROM user_settings WHERE user_id = 1');
        console.log(`✅ User settings: ${settingsCount.rows[0].count} records\n`);

        // 2. Seed performance metrics (corrected schema)
        console.log('📊 Seeding performance metrics...');

        const metricsData = [
            { key: 'total_return', value: 15.5 },
            { key: 'success_rate', value: 73.2 },
            { key: 'total_trades', value: 45 },
            { key: 'winning_trades', value: 33 },
            { key: 'losing_trades', value: 12 }
        ];

        for (const metric of metricsData) {
            await pool.query(`
                INSERT INTO performance_metrics (user_id, metric_key, metric_value, timestamp, created_at)
                VALUES ($1, $2, $3, NOW() - INTERVAL '1 day', NOW())
            `, [1, metric.key, metric.value]);
        }

        const metricsCount = await pool.query('SELECT COUNT(*) FROM performance_metrics WHERE user_id = 1');
        console.log(`✅ Performance metrics: ${metricsCount.rows[0].count} records\n`);

        // 3. Seed trading operations (corrected schema)
        console.log('💹 Seeding trading operations...');

        const operationsData = [
            {
                trading_pair: 'BTC/USDT',
                symbol: 'BTCUSDT',
                side: 'BUY',
                entry_price: 45000.00,
                exit_price: 46500.00,
                quantity: 0.01,
                profit_loss_usd: 15.00,
                profit_loss_percentage: 3.33,
                status: 'CLOSED'
            },
            {
                trading_pair: 'ETH/USDT',
                symbol: 'ETHUSDT',
                side: 'SELL',
                entry_price: 3200.00,
                exit_price: 3100.00,
                quantity: 0.1,
                profit_loss_usd: 10.00,
                profit_loss_percentage: 3.12,
                status: 'CLOSED'
            },
            {
                trading_pair: 'ADA/USDT',
                symbol: 'ADAUSDT',
                side: 'BUY',
                entry_price: 0.45,
                exit_price: 0.48,
                quantity: 100,
                profit_loss_usd: 3.00,
                profit_loss_percentage: 6.67,
                status: 'CLOSED'
            }
        ];

        for (const op of operationsData) {
            await pool.query(`
                INSERT INTO trading_operations (
                    user_id, trading_pair, symbol, side,
                    entry_price, exit_price, quantity,
                    profit_loss_usd, profit_loss_percentage,
                    status, exchange, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() - INTERVAL '2 hours')
            `, [
                1, op.trading_pair, op.symbol, op.side,
                op.entry_price, op.exit_price, op.quantity,
                op.profit_loss_usd, op.profit_loss_percentage,
                op.status, 'BYBIT'
            ]);
        }

        const opsCount = await pool.query('SELECT COUNT(*) FROM trading_operations WHERE user_id = 1');
        console.log(`✅ Trading operations: ${opsCount.rows[0].count} records\n`);

        // Summary
        console.log('📊 Seeding Summary:');
        console.log('─'.repeat(50));
        console.log(`   User Settings:        ${settingsCount.rows[0].count} records`);
        console.log(`   Performance Metrics:  ${metricsCount.rows[0].count} records`);
        console.log(`   Trading Operations:   ${opsCount.rows[0].count} records`);
        console.log('─'.repeat(50));
        console.log('\n🎉 Database seeding completed successfully!');

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
        console.log('\n✅ Seeding script completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Seeding script failed:', error);
        process.exit(1);
    });
