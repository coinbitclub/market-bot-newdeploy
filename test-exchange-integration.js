/**
 * 🔥 EXCHANGE INTEGRATION TEST
 * Tests real Binance and Bybit API integration
 */

require('dotenv').config();
const UnifiedExchangeService = require('./src/services/exchange/unified-exchange-service');

async function runExchangeIntegrationTests() {
    console.log('🔥 EXCHANGE INTEGRATION TEST');
    console.log('============================================================\n');

    const unifiedExchangeService = new UnifiedExchangeService();
    const results = {};
    let successCount = 0;
    let totalTests = 0;

    const recordResult = (category, name, status, data = null, error = null) => {
        if (!results[category]) {
            results[category] = {};
        }
        results[category][name] = { status, data, error };
        if (status === 'SUCCESS') {
            successCount++;
        }
        totalTests++;
    };

    // 1. Test Exchange Connectivity
    console.log('🔍 Testing Exchange Connectivity...');
    try {
        const connectivity = await unifiedExchangeService.testAllConnectivity();
        
        for (const [exchange, result] of Object.entries(connectivity)) {
            const status = result.success ? 'SUCCESS' : 'FAILED';
            recordResult('Connectivity', exchange, status, result.message);
            console.log(`${result.success ? '✅' : '❌'} ${exchange.toUpperCase()}: ${result.message}`);
        }
    } catch (error) {
        console.error('❌ Connectivity test failed:', error.message);
        recordResult('Connectivity', 'overall', 'FAILED', null, error.message);
    }
    console.log('\n');

    // 2. Test Market Data Fetching
    console.log('📊 Testing Market Data Fetching...');
    const symbolsToTest = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];

    for (const symbol of symbolsToTest) {
        try {
            // Test price fetching
            const priceResult = await unifiedExchangeService.getSymbolPrice(symbol);
            if (priceResult.success) {
                console.log(`✅ ${symbol} Price: $${priceResult.price.toFixed(2)} (${priceResult.exchange})`);
                recordResult('Market Data', `${symbol}_price`, 'SUCCESS', priceResult.price);
            } else {
                console.error(`❌ Error fetching price for ${symbol}:`, priceResult.error);
                recordResult('Market Data', `${symbol}_price`, 'FAILED', null, priceResult.error);
            }

            // Test 24hr ticker
            const tickerResult = await unifiedExchangeService.get24hrTicker(symbol);
            if (tickerResult.success) {
                console.log(`✅ ${symbol} 24h Change: ${tickerResult.data.priceChangePercent.toFixed(2)}% (${tickerResult.exchange})`);
                recordResult('Market Data', `${symbol}_ticker`, 'SUCCESS', tickerResult.data);
            } else {
                console.error(`❌ Error fetching 24hr ticker for ${symbol}:`, tickerResult.error);
                recordResult('Market Data', `${symbol}_ticker`, 'FAILED', null, tickerResult.error);
            }
        } catch (error) {
            console.error(`❌ Error testing ${symbol}:`, error.message);
            recordResult('Market Data', symbol, 'FAILED', null, error.message);
        }
    }
    console.log('\n');

    // 3. Test Account Information
    console.log('💰 Testing Account Information...');
    try {
        const accountInfo = await unifiedExchangeService.getAllAccountInfo();
        
        for (const [exchange, info] of Object.entries(accountInfo)) {
            if (info.status === 'success') {
                console.log(`✅ ${exchange.toUpperCase()} Account: Successfully fetched account info`);
                recordResult('Account Info', exchange, 'SUCCESS', info.data);
            } else {
                console.warn(`⚠️ ${exchange.toUpperCase()} Account: ${info.error}`);
                recordResult('Account Info', exchange, 'error', null, info.error);
            }
        }
    } catch (error) {
        console.error('❌ Account info test failed:', error.message);
        recordResult('Account Info', 'overall', 'FAILED', null, error.message);
    }
    console.log('\n');

    // 4. Test Trading Operations
    console.log('📈 Testing Trading Operations...');
    try {
        // Test getting open orders
        const openOrders = await unifiedExchangeService.getAllOpenOrders();
        
        for (const [exchange, orders] of Object.entries(openOrders)) {
            if (orders.status === 'success') {
                console.log(`✅ ${exchange.toUpperCase()} Orders: Successfully fetched open orders`);
                recordResult('Trading Operations', `${exchange}_orders`, 'SUCCESS', orders.orders);
            } else {
                console.warn(`⚠️ ${exchange.toUpperCase()} Orders: ${orders.error}`);
                recordResult('Trading Operations', `${exchange}_orders`, 'error', null, orders.error);
            }
        }

        // Test market analysis
        console.log(`📊 Generating comprehensive market analysis for ${symbolsToTest.length} symbols`);
        const marketAnalysis = await unifiedExchangeService.getMarketAnalysis(symbolsToTest);
        if (marketAnalysis.overall.marketSentiment) {
            console.log(`✅ Market Analysis: ${marketAnalysis.overall.marketSentiment} sentiment, ${Object.keys(marketAnalysis.symbols).length} symbols`);
            recordResult('Trading Operations', 'market_analysis', 'SUCCESS', marketAnalysis);
        } else {
            console.error('❌ Market Analysis: Failed to generate');
            recordResult('Trading Operations', 'market_analysis', 'FAILED', null, 'Failed to generate market analysis');
        }
    } catch (error) {
        console.error('❌ Trading operations test failed:', error.message);
        recordResult('Trading Operations', 'overall', 'FAILED', null, error.message);
    }
    console.log('\n');

    // 5. Generate Final Report
    console.log('📋 EXCHANGE INTEGRATION TEST REPORT');
    console.log('============================================================');
    console.log(`🎯 Overall Status: ${successCount === totalTests ? 'SUCCESS' : successCount > 0 ? 'PARTIAL' : 'FAILED'}`);
    console.log(`📊 Success Rate: ${((successCount / totalTests) * 100).toFixed(1)}% (${successCount}/${totalTests})`);
    console.log('\n📝 Detailed Results:\n');

    for (const category in results) {
        console.log(`  ${category}:`);
        for (const test in results[category]) {
            const { status, error } = results[category][test];
            console.log(`    ${status === 'SUCCESS' ? '✅' : status === 'error' ? '⚠️' : '❌'} ${test}: ${status}${error ? ` - ${error}` : ''}`);
        }
    }

    console.log('\n🎉 Exchange Integration Test Complete!');
    console.log(`⚠️ Exchange integration is ${successCount === totalTests ? 'FULLY WORKING' : 'PARTIALLY WORKING'}.`);
    console.log('🔧 Some features may need configuration or API credentials.\n');

    console.log('📋 NEXT STEPS:');
    console.log('1. 🔧 Configure API credentials in .env file');
    console.log('2. 🔧 Check network connectivity to exchanges');
    console.log('3. 🔧 Verify exchange account permissions');
    console.log('4. 🔧 Re-run this test after configuration');
}

// Run the test
runExchangeIntegrationTests().catch(console.error);