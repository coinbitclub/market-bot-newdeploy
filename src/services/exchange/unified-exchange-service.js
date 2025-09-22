/**
 * 🔥 UNIFIED EXCHANGE SERVICE - BINANCE & BYBIT INTEGRATION
 * Manages real market data fetching and trading operations across exchanges
 */

const BinanceService = require('./binance-service');
const BybitService = require('./bybit-service');

class UnifiedExchangeService {
    constructor() {
        this.binance = new BinanceService();
        this.bybit = new BybitService();
        
        this.exchanges = {
            binance: this.binance,
            bybit: this.bybit
        };

        this.preferredExchange = process.env.PREFERRED_EXCHANGE || 'binance';
        this.fallbackExchange = this.preferredExchange === 'binance' ? 'bybit' : 'binance';
        
        console.log(`🔥 Unified Exchange Service initialized`);
        console.log(`   Primary: ${this.preferredExchange.toUpperCase()}`);
        console.log(`   Fallback: ${this.fallbackExchange.toUpperCase()}`);
    }

    /**
     * Get real-time price from preferred exchange with fallback
     */
    async getSymbolPrice(symbol, exchange = null) {
        const targetExchange = exchange || this.preferredExchange;
        const fallbackExchange = exchange || this.fallbackExchange;

        try {
            console.log(`📊 Fetching price for ${symbol} from ${targetExchange.toUpperCase()}`);
            const result = await this.exchanges[targetExchange].getSymbolPrice(symbol);
            result.exchange = targetExchange;
            return result;
        } catch (error) {
            console.log(`⚠️ ${targetExchange.toUpperCase()} failed, trying ${fallbackExchange.toUpperCase()}`);
            try {
                const result = await this.exchanges[fallbackExchange].getSymbolPrice(symbol);
                result.exchange = fallbackExchange;
                result.fallback = true;
                return result;
            } catch (fallbackError) {
                throw new Error(`Both exchanges failed: ${targetExchange} (${error.message}), ${fallbackExchange} (${fallbackError.message})`);
            }
        }
    }

    /**
     * Get 24hr ticker from preferred exchange with fallback
     */
    async get24hrTicker(symbol, exchange = null) {
        const targetExchange = exchange || this.preferredExchange;
        const fallbackExchange = exchange || this.fallbackExchange;

        try {
            console.log(`📊 Fetching 24hr ticker for ${symbol} from ${targetExchange.toUpperCase()}`);
            const result = await this.exchanges[targetExchange].get24hrTicker(symbol);
            result.exchange = targetExchange;
            return result;
        } catch (error) {
            console.log(`⚠️ ${targetExchange.toUpperCase()} failed, trying ${fallbackExchange.toUpperCase()}`);
            try {
                const result = await this.exchanges[fallbackExchange].get24hrTicker(symbol);
                result.exchange = fallbackExchange;
                result.fallback = true;
                return result;
            } catch (fallbackError) {
                throw new Error(`Both exchanges failed: ${targetExchange} (${error.message}), ${fallbackExchange} (${fallbackError.message})`);
            }
        }
    }

    /**
     * Get account info from all configured exchanges
     */
    async getAllAccountInfo() {
        const results = {};

        for (const [exchangeName, exchange] of Object.entries(this.exchanges)) {
            try {
                console.log(`💰 Fetching account info from ${exchangeName.toUpperCase()}`);
                results[exchangeName] = await exchange.getAccountInfo();
                results[exchangeName].exchange = exchangeName;
                results[exchangeName].status = 'success';
            } catch (error) {
                console.error(`❌ Error fetching account info from ${exchangeName}:`, error.message);
                results[exchangeName] = {
                    exchange: exchangeName,
                    status: 'error',
                    error: error.message
                };
            }
        }

        return results;
    }

    /**
     * Get open orders from all configured exchanges
     */
    async getAllOpenOrders(symbol = null) {
        const results = {};

        for (const [exchangeName, exchange] of Object.entries(this.exchanges)) {
            try {
                console.log(`📋 Fetching open orders from ${exchangeName.toUpperCase()}`);
                results[exchangeName] = await exchange.getOpenOrders(symbol);
                results[exchangeName].exchange = exchangeName;
                results[exchangeName].status = 'success';
            } catch (error) {
                console.error(`❌ Error fetching open orders from ${exchangeName}:`, error.message);
                results[exchangeName] = {
                    exchange: exchangeName,
                    status: 'error',
                    error: error.message,
                    orders: []
                };
            }
        }

        return results;
    }

    /**
     * Place order on preferred exchange with fallback
     */
    async placeOrder(orderParams, exchange = null) {
        const targetExchange = exchange || this.preferredExchange;
        const fallbackExchange = exchange || this.fallbackExchange;

        try {
            console.log(`📈 Placing order on ${targetExchange.toUpperCase()}:`, orderParams.symbol, orderParams.side);
            const result = await this.exchanges[targetExchange].placeOrder(orderParams);
            result.exchange = targetExchange;
            return result;
        } catch (error) {
            console.log(`⚠️ ${targetExchange.toUpperCase()} order failed, trying ${fallbackExchange.toUpperCase()}`);
            try {
                const result = await this.exchanges[fallbackExchange].placeOrder(orderParams);
                result.exchange = fallbackExchange;
                result.fallback = true;
                return result;
            } catch (fallbackError) {
                throw new Error(`Both exchanges failed: ${targetExchange} (${error.message}), ${fallbackExchange} (${fallbackError.message})`);
            }
        }
    }

    /**
     * Cancel order on the exchange where it was placed
     */
    async cancelOrder(symbol, orderId, exchange = null) {
        const targetExchange = exchange || this.preferredExchange;
        const fallbackExchange = exchange || this.fallbackExchange;

        try {
            console.log(`❌ Canceling order ${orderId} on ${targetExchange.toUpperCase()}`);
            const result = await this.exchanges[targetExchange].cancelOrder(symbol, orderId);
            result.exchange = targetExchange;
            return result;
        } catch (error) {
            console.log(`⚠️ ${targetExchange.toUpperCase()} cancel failed, trying ${fallbackExchange.toUpperCase()}`);
            try {
                const result = await this.exchanges[fallbackExchange].cancelOrder(symbol, orderId);
                result.exchange = fallbackExchange;
                result.fallback = true;
                return result;
            } catch (fallbackError) {
                throw new Error(`Both exchanges failed: ${targetExchange} (${error.message}), ${fallbackExchange} (${fallbackError.message})`);
            }
        }
    }

    /**
     * Get kline data from preferred exchange
     */
    async getKlines(symbol, interval = '1h', limit = 100, exchange = null) {
        const targetExchange = exchange || this.preferredExchange;

        try {
            console.log(`📊 Fetching klines for ${symbol} from ${targetExchange.toUpperCase()}`);
            const result = await this.exchanges[targetExchange].getKlines(symbol, interval, limit);
            return {
                exchange: targetExchange,
                symbol,
                interval,
                limit,
                data: result,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error(`❌ Error fetching klines from ${targetExchange}:`, error.message);
            throw error;
        }
    }

    /**
     * Test connectivity to all exchanges
     */
    async testAllConnectivity() {
        const results = {};

        for (const [exchangeName, exchange] of Object.entries(this.exchanges)) {
            try {
                console.log(`🔍 Testing connectivity to ${exchangeName.toUpperCase()}`);
                results[exchangeName] = await exchange.testConnectivity();
            } catch (error) {
                results[exchangeName] = {
                    success: false,
                    message: `Connectivity test failed: ${error.message}`,
                    timestamp: Date.now()
                };
            }
        }

        return results;
    }

    /**
     * Get market data for multiple symbols
     */
    async getMarketData(symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT'], exchange = null) {
        const results = {};
        const targetExchange = exchange || this.preferredExchange;

        console.log(`📊 Fetching market data for ${symbols.length} symbols from ${targetExchange.toUpperCase()}`);

        for (const symbol of symbols) {
            try {
                results[symbol] = await this.getSymbolPrice(symbol, targetExchange);
            } catch (error) {
                results[symbol] = {
                    symbol,
                    exchange: targetExchange,
                    status: 'error',
                    error: error.message,
                    timestamp: Date.now()
                };
            }
        }

        return results;
    }

    /**
     * Get comprehensive market analysis
     */
    async getMarketAnalysis(symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT']) {
        console.log(`📊 Generating comprehensive market analysis for ${symbols.length} symbols`);

        const analysis = {
            timestamp: Date.now(),
            symbols: {},
            overall: {
                totalSymbols: symbols.length,
                successfulFetches: 0,
                failedFetches: 0,
                averageChange24h: 0,
                marketSentiment: 'NEUTRAL'
            }
        };

        let totalChange = 0;
        let successfulCount = 0;

        for (const symbol of symbols) {
            try {
                const ticker = await this.get24hrTicker(symbol);
                analysis.symbols[symbol] = {
                    ...ticker,
                    status: 'success'
                };
                
                if (ticker.priceChangePercent !== undefined) {
                    totalChange += ticker.priceChangePercent;
                    successfulCount++;
                }
            } catch (error) {
                analysis.symbols[symbol] = {
                    symbol,
                    status: 'error',
                    error: error.message
                };
            }
        }

        analysis.overall.successfulFetches = successfulCount;
        analysis.overall.failedFetches = symbols.length - successfulCount;
        analysis.overall.averageChange24h = successfulCount > 0 ? totalChange / successfulCount : 0;

        // Determine market sentiment
        if (analysis.overall.averageChange24h > 2) {
            analysis.overall.marketSentiment = 'BULLISH';
        } else if (analysis.overall.averageChange24h < -2) {
            analysis.overall.marketSentiment = 'BEARISH';
        } else {
            analysis.overall.marketSentiment = 'NEUTRAL';
        }

        return analysis;
    }

    /**
     * Get exchange status and health
     */
    async getExchangeStatus() {
        const status = {
            timestamp: Date.now(),
            exchanges: {},
            overall: {
                healthy: 0,
                unhealthy: 0,
                total: Object.keys(this.exchanges).length
            }
        };

        for (const [exchangeName, exchange] of Object.entries(this.exchanges)) {
            try {
                const connectivity = await exchange.testConnectivity();
                status.exchanges[exchangeName] = {
                    name: exchangeName,
                    status: connectivity.success ? 'healthy' : 'unhealthy',
                    connectivity,
                    preferred: exchangeName === this.preferredExchange,
                    fallback: exchangeName === this.fallbackExchange
                };

                if (connectivity.success) {
                    status.overall.healthy++;
                } else {
                    status.overall.unhealthy++;
                }
            } catch (error) {
                status.exchanges[exchangeName] = {
                    name: exchangeName,
                    status: 'unhealthy',
                    error: error.message,
                    preferred: exchangeName === this.preferredExchange,
                    fallback: exchangeName === this.fallbackExchange
                };
                status.overall.unhealthy++;
            }
        }

        return status;
    }
}

module.exports = UnifiedExchangeService;