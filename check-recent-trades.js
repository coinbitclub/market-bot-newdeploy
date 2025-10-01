const ConnectionPoolManager = require('./src/database/connection-pool-manager');

async function checkRecentTrades() {
    const dbPoolManager = new ConnectionPoolManager();

    try {
        console.log('🔍 Checking recent trade executions...\n');

        const result = await dbPoolManager.executeRead(`
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
            return;
        }

        console.log(`✅ Found ${result.rows.length} recent trades:\n`);

        result.rows.forEach((trade, index) => {
            const status = trade.success ? '✅ SUCCESS' : '❌ FAILED';
            console.log(`${index + 1}. ${status} - ${trade.username} (${trade.plan_type})`);
            console.log(`   Symbol: ${trade.symbol} | Side: ${trade.side} | Exchange: ${trade.exchange}`);
            console.log(`   Position: $${trade.position_size} | Price: $${trade.executed_price}`);
            if (!trade.success && trade.error_message) {
                console.log(`   Error: ${trade.error_message.substring(0, 80)}...`);
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
        await dbPoolManager.closeAll();
    }
}

checkRecentTrades();
