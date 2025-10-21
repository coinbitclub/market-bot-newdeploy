/**
 * 🔥 BINANCE API SERVICE - binance-api-node wrapper (Futures)
 * Uses user credentials from DB; testnet/mainnet controlled by env BINANCE_TESTNET
 */

const Binance = require('binance-api-node').default;

class BinanceService {
    /**
     * @param {Object} credentials - User credentials from DB
     * @param {string} credentials.apiKey
     * @param {string} credentials.apiSecret
     */
    constructor(credentials = null) {
        this.isTestnet = process.env.BINANCE_TESTNET === 'true';
        this.serverTimeOffset = 0;
        this.lastTimeSync = 0;
        this.timeSyncInterval = 30000; // Re-sync every 30 seconds

        if (credentials && credentials.apiKey && credentials.apiSecret) {
            // First create temp client to get server time
            const tempClient = Binance({ apiKey: credentials.apiKey, apiSecret: credentials.apiSecret });
            
            const clientOptions = {
                apiKey: credentials.apiKey,
                apiSecret: credentials.apiSecret,
                // CRITICAL: Increase recvWindow to 60 seconds to handle timestamp sync issues
                recvWindow: 60000,
                // Enable automatic timestamp synchronization with Binance servers
                useServerTime: true,
                // IMPORTANT: Provide getTime function that syncs with server
                getTime: () => {
                    // Return local time + offset (sync happens in checkServerTimeSync)
                    return Date.now() + this.serverTimeOffset;
                }
            };
            
            // Route futures requests to testnet when enabled per binance-api-node docs
            if (this.isTestnet) {
                clientOptions.httpFutures = 'https://testnet.binancefuture.com';
            }
            
            // Create client instance
            this.binance = Binance(clientOptions);
            this.hasCredentials = true;
            
            console.log(`🔥 Binance Service initialized - ${this.isTestnet ? 'TESTNET' : 'MAINNET'} - USER CREDENTIALS`);
            console.log(`   ⚙️  recvWindow: 60000ms, serverTime: manual sync with offset`);
        } else {
            // Public-only client (no credentials) for public endpoints
            this.binance = Binance({});
            this.hasCredentials = false;
            console.log(`🔥 Binance Service initialized - ${this.isTestnet ? 'TESTNET' : 'MAINNET'} - PUBLIC ONLY`);
        }
    }
    
    /**
     * Get and display server time synchronization info (called manually when needed)
     */
    async checkServerTimeSync() {
        try {
            const serverTime = await this.binance.time();
            const localTime = Date.now();
            const timeDiff = serverTime - localTime;
            
            console.log(`   📡 Time sync: Local=${new Date(localTime).toISOString()}, Server=${new Date(serverTime).toISOString()}`);
            console.log(`   ⏱️  Time difference: ${Math.abs(timeDiff)}ms ${timeDiff > 0 ? '(local behind)' : '(local ahead)'}`);
            
            if (Math.abs(timeDiff) > 5000) {
                console.log(`   ⚠️  WARNING: Time difference > 5 seconds. This may cause issues.`);
                console.log(`   💡 Recommendation: Sync your system clock`);
            } else {
                console.log(`   ✅ Time sync OK`);
            }
            
            this.serverTimeOffset = timeDiff;
            return { success: true, offset: timeDiff };
        } catch (error) {
            console.log(`   ⚠️  Could not sync server time: ${error.message}`);
            this.serverTimeOffset = 0;
            return { success: false, error: error.message };
        }
    }

    async getSymbolPrice(symbol) {
        try {
            const prices = await this.binance.futuresPrices();
            const price = parseFloat(prices[symbol.toUpperCase()]);
            return { success: true, symbol: symbol.toUpperCase(), price, timestamp: Date.now() };
        } catch (error) {
            console.error(`❌ Error fetching price for ${symbol}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async get24hrTicker(symbol) {
        try {
            const data = await this.binance.futuresDailyStats({ symbol: symbol.toUpperCase() });
            const stat = Array.isArray(data) ? (data.find(d => d.symbol === symbol.toUpperCase()) || data[0]) : data;
            return {
                success: true,
                data: {
                    symbol: stat.symbol,
                    priceChange: parseFloat(stat.priceChange),
                    priceChangePercent: parseFloat(stat.priceChangePercent),
                    weightedAvgPrice: parseFloat(stat.weightedAvgPrice),
                    prevClosePrice: parseFloat(stat.prevClosePrice),
                    lastPrice: parseFloat(stat.lastPrice),
                    volume: parseFloat(stat.volume),
                    quoteVolume: parseFloat(stat.quoteVolume),
                    openTime: stat.openTime,
                    closeTime: stat.closeTime,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            console.error(`❌ Error fetching 24hr ticker for ${symbol}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async getAccountBalance() {
        try {
            if (!this.hasCredentials) {
                throw new Error('Binance API credentials not configured');
            }
            
            console.log('🔍 Accessing Binance Futures account...');
            console.log('   🎯 FUTURES TRADING ONLY - No Spot fallback');
            
            // FUTURES ONLY - No fallback to Spot
            try {
                console.log('   📈 Fetching Futures account info...');
                const account = await this.binance.futuresAccountInfo();
                console.log('✅ FUTURES account accessed successfully');
                console.log('   💰 Futures trading is ready!');
                
                // Normalize to include balances array for compatibility with engine
                const balances = (account.assets || []).map(a => {
                    const availableBalance = parseFloat(a.availableBalance || 0);
                    const walletBalance = parseFloat(a.walletBalance || 0);
                    const locked = Math.max(0, walletBalance - availableBalance);
                    
                    console.log(`   💰 ${a.asset}: wallet=${walletBalance}, available=${availableBalance}, locked=${locked}`);
                    
                    return {
                        asset: a.asset,
                        free: availableBalance,
                        locked: locked,
                        total: walletBalance
                    };
                });
                return { success: true, result: { ...account, balances, accountType: 'FUTURES' }, timestamp: Date.now() };
            } catch (futuresError) {
                console.log(`❌ Futures account NOT accessible: ${futuresError.message}`);
                
                // Check if it's a permission error
                if (futuresError.message && futuresError.message.includes('Invalid API-key')) {
                    console.log('\n   ⚠️  FUTURES TRADING NOT ENABLED!');
                    console.log('   📋 To enable Futures trading:');
                    console.log('      1. Go to: https://www.binance.com/en/my/settings/api-management');
                    console.log('      2. Edit your API key');
                    console.log('      3. Check ✅ "Enable Futures" permission');
                    console.log('      4. Ensure IP restriction allows your IP (or set Unrestricted)');
                    console.log('      5. Save and wait 2 minutes');
                    console.log('   🚫 NO SPOT FALLBACK - Futures trading is required!\n');
                } else if (futuresError.message && futuresError.message.includes('recvWindow')) {
                    console.log('   ℹ️  Timestamp issue detected. Please check:');
                    console.log('      1. Your system clock is synchronized');
                    console.log('      2. Run: w32tm /resync (Windows) or ntpdate (Linux)');
                }
                
                // NO SPOT FALLBACK - Throw error directly
                throw new Error(`Futures trading required: ${futuresError.message}`);
            }
        } catch (error) {
            console.error('❌ Error fetching Futures account info:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getOpenOrders(symbol = null) {
        try {
            if (!this.hasCredentials) {
                return { success: false, error: 'Binance API credentials not configured' };
            }
            const data = await this.binance.futuresOpenOrders({ symbol: symbol ? symbol.toUpperCase() : undefined });
            const arr = Array.isArray(data) ? data : (data && data.length !== undefined ? data : []);
            return arr.map(order => ({
                symbol: order.symbol,
                orderId: order.orderId,
                clientOrderId: order.clientOrderId,
                price: parseFloat(order.price || 0),
                origQty: parseFloat(order.origQty || 0),
                executedQty: parseFloat(order.executedQty || 0),
                status: order.status,
                timeInForce: order.timeInForce,
                type: order.type,
                side: order.side,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('❌ Error fetching open orders:', error.message);
            return [];
        }
    }

    async placeOrder(orderParams) {
        try {
            if (!this.hasCredentials) {
                return { success: false, error: 'Binance API credentials not configured' };
            }
            const { symbol, side, orderType = 'Market', qty, quantity, price } = orderParams;
            const actualQty = quantity || qty;
            if (!actualQty) {
                return { success: false, error: 'Quantity (qty) is required for order placement' };
            }

            console.log(`🔥 Placing Binance order with params:`, { symbol, side, orderType, qty: actualQty, price });

            let data;
            if (orderType.toUpperCase() === 'MARKET') {
                data = await this.binance.futuresOrder({
                    symbol: symbol.toUpperCase(),
                    side: side.toUpperCase(),
                    type: 'MARKET',
                    quantity: actualQty
                });
            } else if (orderType.toUpperCase() === 'LIMIT') {
                data = await this.binance.futuresOrder({
                    symbol: symbol.toUpperCase(),
                    side: side.toUpperCase(),
                    type: 'LIMIT',
                    quantity: actualQty,
                    price: String(price),
                    timeInForce: 'GTC'
                });
            } else {
                return { success: false, error: `Unsupported order type: ${orderType}` };
            }

            console.log(`✅ Binance order placed successfully: ${data.orderId}`);

            return {
                success: true,
                symbol: data.symbol,
                orderId: data.orderId,
                clientOrderId: data.clientOrderId,
                transactTime: data.updateTime || data.transactTime,
                status: data.status,
                price: parseFloat(data.price || 0),
                executedQty: parseFloat(data.executedQty || 0),
                origQty: parseFloat(data.origQty || actualQty),
                type: data.type,
                side: data.side,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Error placing Binance order:', error.message);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async cancelOrder(symbol, orderId) {
        try {
            if (!this.hasCredentials) {
                return { success: false, error: 'Binance API credentials not configured' };
            }
            const data = await this.binance.futuresCancelOrder({ symbol: symbol.toUpperCase(), orderId: String(orderId) });
            return {
                success: true,
                symbol: data.symbol,
                orderId: data.orderId,
                clientOrderId: data.clientOrderId,
                status: data.status,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Error canceling Binance order:', error.message);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async getExchangeInfo() {
        try {
            const data = await this.binance.exchangeInfo();
            return { timezone: data.timezone, serverTime: data.serverTime, symbols: data.symbols, timestamp: Date.now() };
        } catch (error) {
            console.error('❌ Error fetching exchange info:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getKlines(symbol, interval = '1h', limit = 100) {
        try {
            const data = await this.binance.futuresCandles({ symbol: symbol.toUpperCase(), interval, limit });
            return data.map(k => ({
                openTime: k.openTime, open: parseFloat(k.open), high: parseFloat(k.high), low: parseFloat(k.low), close: parseFloat(k.close), volume: parseFloat(k.volume), closeTime: k.closeTime
            }));
        } catch (error) {
            console.error(`❌ Error fetching klines for ${symbol}:`, error.message);
            return [];
        }
    }

    async testConnectivity() {
        try {
            await this.binance.futuresPing();
            return { success: true, message: 'Binance API connectivity test successful', timestamp: Date.now() };
        } catch (error) {
            return { success: false, message: `Binance API connectivity test failed: ${error.message}`, timestamp: Date.now() };
        }
    }

    async getServerTime() {
        try {
            const data = await this.binance.time();
            return { serverTime: data.serverTime || data, timestamp: Date.now() };
        } catch (error) {
            console.error('❌ Error fetching server time:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getPositions(symbol = null) {
        try {
            if (!this.hasCredentials) {
                return { success: false, error: 'Binance API credentials not configured' };
            }
            const data = await this.binance.futuresPositionRisk({ symbol: symbol ? symbol.toUpperCase() : undefined });
            const positions = Array.isArray(data) ? data : [];
            return { success: true, data: positions, timestamp: Date.now() };
        } catch (error) {
            console.error('❌ Error fetching positions:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = BinanceService;
