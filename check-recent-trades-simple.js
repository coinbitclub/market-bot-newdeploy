require('dotenv').config();
const { Pool } = require('pg');

async function checkRecentTrades() {
    // Create direct connection using DATABASE_URL from .env
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Checking recent trade executions...\n');

        const result = await pool.query(`
            SELECT
                trade_id,
                username,
                plan_type,
                symbol,
                side,
                exchange,
                position_size,
                executed_price,
                success,
                error_message,
                created_at
            FROM trade_executions
            ORDER BY created_at DESC
            LIMIT 15
        `);

        if (result.rows.length === 0) {
            console.log('❌ No trades found in database');
            await pool.end();
            return;
        }

        console.log(`✅ Found ${result.rows.length} recent trades:\n`);

        result.rows.forEach((trade, index) => {
            const status = trade.success ? '✅ SUCCESS' : '❌ FAILED';
            console.log(`${index + 1}. ${status} - ${trade.username} (${trade.plan_type})`);
            console.log(`   Symbol: ${trade.symbol} | Side: ${trade.side} | Exchange: ${trade.exchange}`);
            console.log(`   Position: $${trade.position_size} | Price: $${trade.executed_price}`);
            if (!trade.success && trade.error_message) {
                const errorMsg = trade.error_message.length > 80
                    ? trade.error_message.substring(0, 80) + '...'
                    : trade.error_message;
                console.log(`   Error: ${errorMsg}`);
            }
            console.log(`   Time: ${trade.created_at}`);
            console.log('');
        });

        // Stats
        const successful = result.rows.filter(t => t.success).length;
        const failed = result.rows.filter(t => !t.success).length;

        console.log('📊 Trade Statistics:');
        console.log(`   Total: ${result.rows.length}`);
        console.log(`   Successful: ${successful}`);
        console.log(`   Failed: ${failed}`);
        console.log(`   Success Rate: ${((successful/result.rows.length) * 100).toFixed(1)}%`);

    } catch (error) {
        console.error('❌ Error checking trades:', error.message);
    } finally {
        await pool.end();
    }
}

checkRecentTrades();
