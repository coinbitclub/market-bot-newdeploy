/**
 * 🔄 UNIFIED EXCHANGE SERVICE - COINBITCLUB ENTERPRISE
 * Unified interface for multiple exchange integrations
 */

const BybitService = require('./bybit-service');
const BinanceService = require('./binance-service');

class UnifiedExchangeService {
    constructor() {
        this.bybitService = new BybitService();
        this.binanceService = new BinanceService();
        this.primaryExchange = 'bybit'; // Default to Bybit
        
        console.log('🔄 Unified Exchange Service initialized');
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
     * Get account information
     */
    async getAccountInfo() {
        try {
            // Try primary exchange first
            if (this.primaryExchange === 'bybit') {
                const result = await this.bybitService.getAccountInfo();
                if (result.success) {
                    return result;
                }
            }

            // Fallback to Binance
            const result = await this.binanceService.getAccountInfo();
            return result;
        } catch (error) {
            console.error('❌ Account info error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get trading status
     */
    async getTradingStatus() {
        try {
            const accountInfo = await this.getAccountInfo();
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
