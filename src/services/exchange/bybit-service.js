/**
 * 🔥 BYBIT API SERVICE - bybit-api RestClientV5 wrapper
 * Uses user credentials from DB; testnet/mainnet controlled by env BYBIT_TESTNET
 */

const { RestClientV5 } = require('bybit-api');

class BybitService {
    /**
     * @param {Object} credentials - User credentials from DB
     * @param {string} credentials.apiKey
     * @param {string} credentials.apiSecret
     */
    constructor(credentials = null) {
        this.isTestnet = process.env.BYBIT_TESTNET === 'true';

        if (credentials && credentials.apiKey && credentials.apiSecret) {
            this.client = new RestClientV5({                
                key: credentials.apiKey,                
                secret: credentials.apiSecret,
                testnet: this.isTestnet,
                demoTrading: false,
                parseAPIRateLimits: true,
                // CRITICAL: Increase recv_window to handle clock skew (60 seconds)
                recv_window: 60000,
                // Enable automatic server time synchronization
                enable_time_sync: true,
                // Sync server time every 30 seconds
                sync_interval_ms: 30000,
                // Strict validation off for better error messages
                strict_validation: false
            });
            
            this.hasCredentials = true;
            console.log(`🔥 Bybit Service initialized - ${this.isTestnet ? 'TESTNET' : 'MAINNET'} - USER CREDENTIALS`);
            console.log(`   ⚙️  recv_window: 60000ms, time_sync: enabled`);
        } else {
            // Public-only client (no credentials) for public endpoints
            this.client = new RestClientV5({ 
                testnet: this.isTestnet,
                enable_time_sync: true
            });
            this.hasCredentials = false;
            console.log(`🔥 Bybit Service initialized - ${this.isTestnet ? 'TESTNET' : 'MAINNET'} - PUBLIC ONLY`);
        }
    }

    async getSymbolPrice(symbol) {
        try {
            const data = await this.client.getTickers({ category: 'linear', symbol: symbol.toUpperCase() });
            const list = data.result?.list || [];
            if (list.length > 0) {
                const t = list[0];
                return { success: true, symbol: t.symbol, price: parseFloat(t.lastPrice), bidPrice: parseFloat(t.bid1Price), askPrice: parseFloat(t.ask1Price), timestamp: Date.now() };
            }
            return { success: false, error: 'Symbol not found' };
        } catch (error) {
            console.error(`❌ Error fetching price for ${symbol}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async get24hrTicker(symbol) {
        try {
            const data = await this.client.getTickers({ category: 'linear', symbol: symbol.toUpperCase() });
            const list = data.result?.list || [];
            if (list.length > 0) {
                const t = list[0];
                return {
                    success: true,
                    data: {
                        symbol: t.symbol,
                        lastPrice: parseFloat(t.lastPrice),
                        bid1Price: parseFloat(t.bid1Price),
                        ask1Price: parseFloat(t.ask1Price),
                        volume24h: parseFloat(t.volume24h),
                        turnover24h: parseFloat(t.turnover24h),
                        price24hPcnt: parseFloat(t.price24hPcnt),
                        priceChangePercent: parseFloat(t.price24hPcnt) * 100,
                        highPrice24h: parseFloat(t.highPrice24h),
                        lowPrice24h: parseFloat(t.lowPrice24h),
                        timestamp: Date.now()
                    }
                };
            }
            return { success: false, error: 'Symbol not found' };
        } catch (error) {
            console.error(`❌ Error fetching 24hr ticker for ${symbol}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async getAccountInfo() {
        try {
            if (!this.hasCredentials) {
                throw new Error('Bybit API credentials not configured');
            }
            
            const result = await this.client.getAccountInfo();
            
            if (result.retCode === 0 && result.result) {
                console.log('✅ Successfully retrieved Bybit account info');
                return { 
                    success: true, 
                    data: result.result,
                    timestamp: Date.now() 
                };
            } else if (result.retCode === 10002) {
                console.log(`❌ Error 10002: ${result.retMsg}`);
                return { 
                    success: false, 
                    error: `Timestamp sync error: ${result.retMsg}` 
                };
            } else {
                return { 
                    success: false, 
                    error: result.retMsg || 'Account info not available' 
                };
            }
        } catch (error) {
            console.error('❌ Error fetching account info:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getAccountBalance() {
        try {
            if (!this.hasCredentials) {
                throw new Error('Bybit API credentials not configured');
            }
            
            console.log('🔍 Accessing Bybit Futures account...');
            console.log('   🎯 FUTURES TRADING ONLY - UNIFIED Trading Account (UTA)');
            
            // FUTURES ONLY - UNIFIED Trading Account (UTA) for Futures/Linear trading
            try {
                console.log('   📈 Fetching UNIFIED account info...');
                const data = await this.client.getWalletBalance({ accountType: 'UNIFIED' });
                const list = data.result?.list || [];
                const retCode = data.retCode || data.ret_code;
                
                // Check for success - retCode 0 or undefined (some responses don't include retCode on success)
                if (retCode === 0 || (retCode === undefined && list.length >= 0)) {
                    console.log(`✅ Successfully accessed Bybit UNIFIED account (Futures/Linear trading)`);
                    
                    if (list.length > 0) {
                        const account = list[0];
                        return { 
                            success: true, 
                            result: { 
                                ...account, 
                                accountType: 'UNIFIED',
                                balances: (account.coin || []).map(c => ({
                                    asset: c.coin,
                                    free: parseFloat(c.availableToWithdraw || c.walletBalance || 0),
                                    locked: parseFloat(c.locked || 0),
                                    walletBalance: parseFloat(c.walletBalance || 0)
                                }))
                            }, 
                            timestamp: Date.now() 
                        };
                    } else {
                        // Empty account but API works
                        console.log(`   ℹ️  UNIFIED account is empty (no balances yet)`);
                        return { 
                            success: true, 
                            result: { 
                                accountType: 'UNIFIED',
                                totalEquity: '0',
                                totalWalletBalance: '0',
                                totalAvailableBalance: '0',
                                balances: [],
                                isEmpty: true
                            }, 
                            timestamp: Date.now() 
                        };
                    }
                } else if (retCode === 10001) {
                    // Error 10001 usually means trying wrong account type for UTA
                    console.log(`   ℹ️  This is a UTA account (Unified Trading Account)`);
                } else if (retCode === 10002) {
                    console.log(`   ❌ Error 10002: ${data.retMsg || 'Timestamp or permission issue'}`);
                    return { 
                        success: false, 
                        error: `Timestamp sync error: ${data.retMsg}` 
                    };
                }
            } catch (unifiedError) {
                console.log(`❌ UNIFIED account NOT accessible: ${unifiedError.message}`);
                
                // Check if it's a permission error
                if (unifiedError.message && unifiedError.message.includes('Invalid API key')) {
                    console.log('\n   ⚠️  FUTURES TRADING NOT ENABLED!');
                    console.log('   📋 To enable Futures trading:');
                    console.log('      1. Go to: https://www.bybit.com/app/user/api-management');
                    console.log('      2. Edit your API key');
                    console.log('      3. Check ✅ "Derivatives" permission');
                    console.log('      4. Ensure IP restriction allows your IP (or set Unrestricted)');
                    console.log('      5. Save and wait 2 minutes');
                    console.log('   🚫 NO SPOT FALLBACK - Futures trading is required!\n');
                }
                
                // NO SPOT FALLBACK - Throw error directly
                return { 
                    success: false, 
                    error: `Futures trading required: ${unifiedError.message}` 
                };
            }
        } catch (error) {
            console.error('❌ Error fetching account balance:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getOpenOrders(symbol = null, category = 'linear') {
        try {
            if (!this.hasCredentials) {
                throw new Error('Bybit API credentials not configured');
            }
            const data = await this.client.getActiveOrders({ 
                category, 
                symbol: symbol ? symbol.toUpperCase() : undefined 
            });
            const list = data.result?.list || [];
            return list.map(order => ({
                orderId: order.orderId,
                orderLinkId: order.orderLinkId,
                symbol: order.symbol,
                price: parseFloat(order.price),
                qty: parseFloat(order.qty),
                side: order.side,
                orderStatus: order.orderStatus,
                avgPrice: parseFloat(order.avgPrice),
                timeInForce: order.timeInForce,
                orderType: order.orderType,
                createdTime: order.createdTime,
                updatedTime: order.updatedTime,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('❌ Error fetching open orders:', error.message);
            throw error;
        }
    }

    async placeOrder(orderParams) {
        try {
            if (!this.hasCredentials) {
                throw new Error('Bybit API credentials not configured');
            }
            const { category = 'linear', symbol, side, orderType = 'Market', qty, price, timeInForce = 'GTC', orderLinkId } = orderParams;
            const params = { category, symbol: symbol.toUpperCase(), side, orderType, qty: qty.toString(), timeInForce };
            if (price) params.price = price.toString();
            if (orderLinkId) params.orderLinkId = orderLinkId;

            const data = await this.client.placeOrder(params);
            const result = data.result;
            return { success: true, orderId: result.orderId, orderLinkId: result.orderLinkId, timestamp: Date.now() };
        } catch (error) {
            console.error('❌ Error placing order:', error.message);
            throw error;
        }
    }

    async cancelOrder(symbol, orderId, category = 'spot') {
        try {
            if (!this.hasCredentials) {
                throw new Error('Bybit API credentials not configured');
            }
            const data = await this.client.cancelOrder({ category, symbol: symbol.toUpperCase(), orderId: orderId.toString() });
            return { success: true, orderId: data.result?.orderId, orderLinkId: data.result?.orderLinkId, timestamp: Date.now() };
        } catch (error) {
            console.error('❌ Error canceling order:', error.message);
            throw error;
        }
    }

    async getInstrumentInfo(category = 'spot', symbol = null) {
        try {
            const data = await this.client.getInstrumentsInfo({ category, symbol: symbol ? symbol.toUpperCase() : undefined });
            return { category: data.result?.category, list: data.result?.list || [], timestamp: Date.now() };
        } catch (error) {
            console.error('❌ Error fetching instrument info:', error.message);
            throw error;
        }
    }

    async getKlines(symbol, interval = '1', limit = 100, category = 'spot') {
        try {
            const data = await this.client.getKline({ category, symbol: symbol.toUpperCase(), interval, limit });
            const list = data.result?.list || [];
            return list.map(k => ({ startTime: k[0], openPrice: parseFloat(k[1]), highPrice: parseFloat(k[2]), lowPrice: parseFloat(k[3]), closePrice: parseFloat(k[4]), volume: parseFloat(k[5]) }));
        } catch (error) {
            console.error(`❌ Error fetching klines for ${symbol}:`, error.message);
            throw error;
        }
    }

    async testConnectivity() {
        try {
            const data = await this.client.getServerTime();
            return { success: true, message: 'Bybit API connectivity test successful', serverTime: data.timeSecond || data.time, timestamp: Date.now() };
        } catch (error) {
            return { success: false, message: `Bybit API connectivity test failed: ${error.message}`, timestamp: Date.now() };
        }
    }

    async getServerTimeDetails() {
        try {
            const data = await this.client.getServerTime();
            const result = data.result || data;
            return { 
                timeSecond: result.timeSecond || result.time, 
                timeNano: result.timeNano, 
                timestamp: Date.now() 
            };
        } catch (error) {
            console.error('❌ Error fetching server time:', error.message);
            throw error;
        }
    }

    async getWalletBalance(accountType = 'UNIFIED') {
        try {
            if (!this.hasCredentials) {
                throw new Error('Bybit API credentials not configured');
            }
            const data = await this.client.getWalletBalance({ accountType });
            const list = data.result?.list || [];
            return { success: true, result: { list }, timestamp: Date.now() };
        } catch (error) {
            console.error('❌ Error fetching wallet balance:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getPositions(category = 'linear', symbol = null) {
        try {
            if (!this.hasCredentials) {
                throw new Error('Bybit API credentials not configured');
            }
            const data = await this.client.getPositionInfo({ category, symbol: symbol ? symbol.toUpperCase() : undefined });
            return { success: true, data: data.result?.list || [], timestamp: Date.now() };
        } catch (error) {
            console.error('❌ Error fetching positions:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getOrderHistory(category = 'spot', symbol = null, limit = 50) {
        try {
            if (!this.hasCredentials) {
                throw new Error('Bybit API credentials not configured');
            }
            const data = await this.client.getOrderHistory({ category, symbol: symbol ? symbol.toUpperCase() : undefined, limit });
            return { success: true, data: data.result?.list || [], timestamp: Date.now() };
        } catch (error) {
            console.error('❌ Error fetching order history:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = BybitService;



