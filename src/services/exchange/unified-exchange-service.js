/**
 * 🔄 UNIFIED EXCHANGE SERVICE - COINBITCLUB ENTERPRISE
 * Unified interface for multiple exchange integrations
 */

const BybitService = require('./bybit-service');
const BinanceService = require('./binance-service');

class UnifiedExchangeService {
    /**
     * @param {Object} credentials - Optional user credentials
     * @param {Object} credentials.bybit - Bybit credentials {apiKey, apiSecret, isTestnet}
     * @param {Object} credentials.binance - Binance credentials {apiKey, apiSecret, isTestnet}
     */
    constructor(credentials = null) {
        // Initialize services with user credentials if provided
        this.bybitService = credentials?.bybit && credentials.bybit.apiKey && credentials.bybit.apiSecret ? new BybitService(credentials?.bybit) : new BybitService();
        this.binanceService = credentials?.binance && credentials.binance.apiKey && credentials.binance.apiSecret ? new BinanceService(credentials?.binance) : new BinanceService();
        
        const credType = credentials ? 'USER CREDENTIALS' : 'ENV CREDENTIALS';
        console.log(`🔄 Unified Exchange Service initialized - ${credType}`);
    }

    /**
     * Get market analysis for symbols
     */
    async getMarketAnalysis(symbols = ['BTCUSDT']) {
        try {
            const results = {};
            
            for (const symbol of symbols) {
                try {
                    // Try Bybit first
                    const bybitPrice = await this.bybitService.getSymbolPrice(symbol);
                    if (bybitPrice.success) {
                        results[symbol] = {
                            exchange: 'bybit',
                            price: bybitPrice.price,
                            timestamp: new Date().toISOString()
                        };
                        continue;
                    }
                } catch (error) {
                    console.warn(`⚠️ Bybit failed for ${symbol}:`, error.message);
                }

                try {
                    // Fallback to Binance
                    const binancePrice = await this.binanceService.getSymbolPrice(symbol);
                    if (binancePrice.success) {
                        results[symbol] = {
                            exchange: 'binance',
                            price: binancePrice.price,
                            timestamp: new Date().toISOString()
                        };
                    }
                } catch (error) {
                    console.warn(`⚠️ Binance failed for ${symbol}:`, error.message);
                }
            }

            return {
                success: true,
                data: results,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Market analysis error:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get account information from both exchanges
     */
    async getAccountBalancence() {
        try {
            const result = {
                success: true,
                bybit: null,
                binance: null,
                timestamp: new Date().toISOString()
            };

            // Get Bybit account info
            try {
                const bybitInfo = await this.bybitService.getAccountBalance();
                result.bybit = {
                    success: bybitInfo.success,
                    data: bybitInfo.success ? bybitInfo.data : null,
                    error: bybitInfo.success ? null : bybitInfo.error,
                    hasCredentials: this.bybitService.hasCredentials
                };
            } catch (error) {
                console.warn('⚠️ Bybit account info failed:', error.message);
                result.bybit = {
                    success: false,
                    data: null,
                    error: error.message,
                    hasCredentials: this.bybitService.hasCredentials
                };
            }

            // Get Binance account info
            try {
                const binanceInfo = await this.binanceService.getAccountBalance();
                result.binance = {
                    success: binanceInfo.success,
                    data: binanceInfo.success ? binanceInfo.result : null,
                    error: binanceInfo.success ? null : binanceInfo.error,
                    hasCredentials: this.binanceService.hasCredentials
                };
            } catch (error) {
                console.warn('⚠️ Binance account info failed:', error.message);
                result.binance = {
                    success: false,
                    data: null,
                    error: error.message,
                    hasCredentials: this.binanceService.hasCredentials
                };
            }

            // Overall success if at least one exchange succeeded
            result.success = result.bybit?.success || result.binance?.success;

            return result;
        } catch (error) {
            console.error('❌ Account info error:', error);
            return {
                success: false,
                bybit: null,
                binance: null,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get trading status
     */
    async getTradingStatus() {
        try {
            const accountInfo = await this.getAccountBalance();
            const marketAnalysis = await this.getMarketAnalysis(['BTCUSDT']);

            return {
                success: true,
                trading_enabled: accountInfo.success,
                account_status: accountInfo.success ? 'active' : 'inactive',
                market_data_available: marketAnalysis.success,
                exchanges: {
                    bybit: {
                        available: true,
                        status: 'connected'
                    },
                    binance: {
                        available: true,
                        status: 'connected'
                    }
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Trading status error:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = UnifiedExchangeService;
