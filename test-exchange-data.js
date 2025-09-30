/**
 * 🧪 EXCHANGE DATA TEST
 * Tests real data retrieval from Binance and Bybit APIs
 */

const BinanceService = require('./src/services/exchange/binance-service');
const BybitService = require('./src/services/exchange/bybit-service');
const UnifiedExchangeService = require('./src/services/exchange/unified-exchange-service');

async function testExchangeData() {
    console.log('🧪 Testing real exchange data retrieval...\n');

    try {
        // Initialize services
        const binanceService = new BinanceService();
        const bybitService = new BybitService();
        const unifiedService = new UnifiedExchangeService();

        console.log('=== 📈 BINANCE DATA POINTS ===');

        // Test Binance symbol price
        const binancePrice = await binanceService.getSymbolPrice('BTCUSDT');
        console.log('💰 BTC Price:', binancePrice);

        // Test Binance 24hr ticker
        const binanceTicker = await binanceService.get24hrTicker('BTCUSDT');
        console.log('📊 24hr Ticker Data:', {
            symbol: binanceTicker.data?.symbol,
            lastPrice: binanceTicker.data?.lastPrice,
            priceChangePercent: binanceTicker.data?.priceChangePercent,
            volume: binanceTicker.data?.volume,
            highPrice: binanceTicker.data?.highPrice,
            lowPrice: binanceTicker.data?.lowPrice,
            bidPrice: binanceTicker.data?.bidPrice,
            askPrice: binanceTicker.data?.askPrice
        });

        console.log('\n=== 📈 BYBIT DATA POINTS ===');

        // Test Bybit symbol price
        const bybitPrice = await bybitService.getSymbolPrice('BTCUSDT');
        console.log('💰 BTC Price:', bybitPrice);

        // Test Bybit 24hr ticker
        const bybitTicker = await bybitService.get24hrTicker('BTCUSDT');
        console.log('📊 24hr Ticker Data:', {
            symbol: bybitTicker.data?.symbol,
            lastPrice: bybitTicker.data?.lastPrice,
            priceChangePercent: bybitTicker.data?.priceChangePercent,
            volume24h: bybitTicker.data?.volume24h,
            highPrice24h: bybitTicker.data?.highPrice24h,
            lowPrice24h: bybitTicker.data?.lowPrice24h,
            bid1Price: bybitTicker.data?.bid1Price,
            ask1Price: bybitTicker.data?.ask1Price,
            fundingRate: bybitTicker.data?.fundingRate
        });

        console.log('\n=== 🔄 UNIFIED SERVICE DATA ===');

        // Test unified market analysis
        const marketAnalysis = await unifiedService.getMarketAnalysis(['BTCUSDT', 'ETHUSDT']);
        console.log('📊 Market Analysis:', marketAnalysis);

        // Test trading status
        const tradingStatus = await unifiedService.getTradingStatus();
        console.log('⚡ Trading Status:', tradingStatus);

        console.log('\n✅ Exchange data test completed');

    } catch (error) {
        console.error('❌ Exchange data test failed:', error);
    }

    // Exit after test
    setTimeout(() => {
        console.log('🏁 Test completed, exiting...');
        process.exit(0);
    }, 2000);
}

// Run the test
testExchangeData();