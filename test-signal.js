/**
 * 🧪 SIGNAL PROCESSING TEST
 * Tests the complete signal flow from TradingView webhook to Balance Trading Engine
 */

const BalanceTradingEngine = require('./src/trading/balance-based/balance-trading-engine');
const ConnectionPoolManager = require('./src/database/connection-pool-manager');

async function testSignalProcessing() {
    console.log('🧪 Starting signal processing test...');

    try {
        // Initialize database connection
        const dbPoolManager = new ConnectionPoolManager();

        // Initialize trading engine
        const tradingEngine = new BalanceTradingEngine(dbPoolManager);

        // Test signal from TradingView
        const testSignal = {
            time: new Date().toISOString(),
            exchange: 'BYBIT',
            ticker: 'BTCUSDT',
            symbol: 'BTCUSDT',
            action: 'BUY',
            strategy: {
                market_position: 1,
                order_action: 'buy',
                order_contracts: 0.001,
                order_price: 67500
            },
            price: 67500,
            contracts: 0.001,
            test: true
        };

        console.log('📡 Sending test signal:', testSignal);

        // Process the signal
        await tradingEngine.processSignalForAllUsers(testSignal);

        console.log('✅ Signal processing test completed');

    } catch (error) {
        console.error('❌ Signal processing test failed:', error);
    }

    // Exit after test
    setTimeout(() => {
        console.log('🏁 Test completed, exiting...');
        process.exit(0);
    }, 3000);
}

// Run the test
testSignalProcessing();