/**
 * 🔥 BINANCE API SERVICE - REAL EXCHANGE INTEGRATION
 * Handles real market data fetching and trading operations
 */

const axios = require('axios');
const crypto = require('crypto');

class BinanceService {
    /**
     * @param {Object} credentials - Optional user credentials
     * @param {string} credentials.apiKey - User's API key
     * @param {string} credentials.apiSecret - User's API secret
     * @param {boolean} credentials.isTestnet - Whether to use testnet (optional)
     */
    constructor(credentials = null) {
        this.baseURL = 'https://api.binance.com';
        this.testnetURL = 'https://testnet.binance.vision';
        
        // Determine if using testnet
        if (credentials && credentials.isTestnet !== undefined) {
            this.isTestnet = credentials.isTestnet;
        } else {
            this.isTestnet = process.env.BINANCE_TESTNET === 'true';
        }

        // Use provided credentials or fallback to environment variables
        if (credentials && credentials.apiKey && credentials.apiSecret) {
            // Use user-provided credentials
            this.apiKey = credentials.apiKey;
            this.apiSecret = credentials.apiSecret;
            this.isUserCredentials = true;
        } else {
            // Fallback to environment variables (for system-level operations)
            this.apiKey = process.env.BINANCE_API_KEY;
            this.apiSecret = process.env.BINANCE_API_SECRET;
            this.isUserCredentials = false;
        }
        
        // For public endpoints, always use mainnet URL
        this.publicURL = this.baseURL;
        // For authenticated endpoints, use testnet if configured
        this.authenticatedURL = this.isTestnet ? this.testnetURL : this.baseURL;
        
        console.log(`🔥 Binance Service initialized - ${this.isTestnet ? 'TESTNET' : 'MAINNET'} - ${this.isUserCredentials ? 'USER CREDENTIALS' : 'ENV CREDENTIALS'}`);
    }

    /**
     * Generate signature for authenticated requests
     */
    generateSignature(queryString) {
        return crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
    }

    /**
     * Make authenticated request to Binance API
     */
    async makeAuthenticatedRequest(endpoint, params = {}, method = 'GET') {
        try {
            if (!this.apiKey || !this.apiSecret) {
                throw new Error('Binance API credentials not configured');
            }

            const timestamp = Date.now();
            const queryString = new URLSearchParams({
                ...params,
                timestamp,
                recvWindow: 60000  // Allow 60 second time difference for clock sync issues
            }).toString();

            const signature = this.generateSignature(queryString);
            const url = `${this.authenticatedURL}${endpoint}?${queryString}&signature=${signature}`;

            const response = await axios({
                method,
                url,
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('❌ Binance API Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Make public request to Binance API
     */
    async makePublicRequest(endpoint, params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `${this.publicURL}${endpoint}${queryString ? '?' + queryString : ''}`;

            const response = await axios({
                method: 'GET',
                url,
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('❌ Binance Public API Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get real-time price for a symbol
     */
    async getSymbolPrice(symbol) {
        try {
            const data = await this.makePublicRequest('/api/v3/ticker/price', { symbol });
            return {
                success: true,
                symbol: data.symbol,
                price: parseFloat(data.price),
                timestamp: Date.now()
            };
        } catch (error) {
            console.error(`❌ Error fetching price for ${symbol}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get 24hr ticker statistics
     */
    async get24hrTicker(symbol) {
        try {
            const data = await this.makePublicRequest('/api/v3/ticker/24hr', { symbol });
            return {
                success: true,
                data: {
                    symbol: data.symbol,
                    priceChange: parseFloat(data.priceChange),
                    priceChangePercent: parseFloat(data.priceChangePercent),
                    weightedAvgPrice: parseFloat(data.weightedAvgPrice),
                    prevClosePrice: parseFloat(data.prevClosePrice),
                    lastPrice: parseFloat(data.lastPrice),
                    lastQty: parseFloat(data.lastQty),
                    bidPrice: parseFloat(data.bidPrice),
                    bidQty: parseFloat(data.bidQty),
                    askPrice: parseFloat(data.askPrice),
                    askQty: parseFloat(data.askQty),
                    openPrice: parseFloat(data.openPrice),
                    highPrice: parseFloat(data.highPrice),
                    lowPrice: parseFloat(data.lowPrice),
                    volume: parseFloat(data.volume),
                    quoteVolume: parseFloat(data.quoteVolume),
                    openTime: data.openTime,
                    closeTime: data.closeTime,
                    count: data.count,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            console.error(`❌ Error fetching 24hr ticker for ${symbol}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get account information
     */
    async getAccountInfo() {
        try {
            const data = await this.makeAuthenticatedRequest('/api/v3/account');
            return {
                makerCommission: data.makerCommission,
                takerCommission: data.takerCommission,
                buyerCommission: data.buyerCommission,
                sellerCommission: data.sellerCommission,
                canTrade: data.canTrade,
                canWithdraw: data.canWithdraw,
                canDeposit: data.canDeposit,
                updateTime: data.updateTime,
                accountType: data.accountType,
                balances: data.balances.map(balance => ({
                    asset: balance.asset,
                    free: parseFloat(balance.free),
                    locked: parseFloat(balance.locked),
                    total: parseFloat(balance.free) + parseFloat(balance.locked)
                })).filter(balance => balance.total > 0),
                permissions: data.permissions,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Error fetching account info:', error.message);
            throw error;
        }
    }

    /**
     * Get open orders
     */
    async getOpenOrders(symbol = null) {
        try {
            const params = symbol ? { symbol } : {};
            const data = await this.makeAuthenticatedRequest('/api/v3/openOrders', params);
            return data.map(order => ({
                symbol: order.symbol,
                orderId: order.orderId,
                orderListId: order.orderListId,
                clientOrderId: order.clientOrderId,
                price: parseFloat(order.price),
                origQty: parseFloat(order.origQty),
                executedQty: parseFloat(order.executedQty),
                cummulativeQuoteQty: parseFloat(order.cummulativeQuoteQty),
                status: order.status,
                timeInForce: order.timeInForce,
                type: order.type,
                side: order.side,
                stopPrice: parseFloat(order.stopPrice),
                icebergQty: parseFloat(order.icebergQty),
                time: order.time,
                updateTime: order.updateTime,
                isWorking: order.isWorking,
                origQuoteOrderQty: parseFloat(order.origQuoteOrderQty),
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('❌ Error fetching open orders:', error.message);
            throw error;
        }
    }

    /**
     * Place a new order
     */
    async placeOrder(orderParams) {
        try {
            const {
                symbol,
                side,
                type = 'MARKET',
                quantity,
                qty,  // Accept both 'quantity' and 'qty' parameter names
                price = null,
                timeInForce = 'GTC',
                newClientOrderId = null,
                stopPrice = null,
                icebergQty = null
            } = orderParams;

            // Use quantity if provided, otherwise use qty (trading engine sends 'qty')
            const actualQuantity = quantity || qty;

            if (!actualQuantity) {
                throw new Error('Quantity (qty) is required for order placement');
            }

            const params = {
                symbol: symbol.toUpperCase(),
                side: side.toUpperCase(),
                type: type.toUpperCase(),
                quantity: actualQuantity.toString(),
                timeInForce
            };

            if (price) params.price = price.toString();
            if (newClientOrderId) params.newClientOrderId = newClientOrderId;
            if (stopPrice) params.stopPrice = stopPrice.toString();
            if (icebergQty) params.icebergQty = icebergQty.toString();

            const data = await this.makeAuthenticatedRequest('/api/v3/order', params, 'POST');
            
            return {
                symbol: data.symbol,
                orderId: data.orderId,
                orderListId: data.orderListId,
                clientOrderId: data.clientOrderId,
                transactTime: data.transactTime,
                price: parseFloat(data.price),
                origQty: parseFloat(data.origQty),
                executedQty: parseFloat(data.executedQty),
                cummulativeQuoteQty: parseFloat(data.cummulativeQuoteQty),
                status: data.status,
                timeInForce: data.timeInForce,
                type: data.type,
                side: data.side,
                fills: data.fills ? data.fills.map(fill => ({
                    price: parseFloat(fill.price),
                    qty: parseFloat(fill.qty),
                    commission: parseFloat(fill.commission),
                    commissionAsset: fill.commissionAsset,
                    tradeId: fill.tradeId
                })) : [],
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Error placing order:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Cancel an order
     */
    async cancelOrder(symbol, orderId) {
        try {
            const data = await this.makeAuthenticatedRequest('/api/v3/order', {
                symbol: symbol.toUpperCase(),
                orderId: orderId.toString()
            }, 'DELETE');

            return {
                symbol: data.symbol,
                origClientOrderId: data.origClientOrderId,
                orderId: data.orderId,
                orderListId: data.orderListId,
                clientOrderId: data.clientOrderId,
                price: parseFloat(data.price),
                origQty: parseFloat(data.origQty),
                executedQty: parseFloat(data.executedQty),
                cummulativeQuoteQty: parseFloat(data.cummulativeQuoteQty),
                status: data.status,
                timeInForce: data.timeInForce,
                type: data.type,
                side: data.side,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Error canceling order:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get exchange info (symbols, filters, etc.)
     */
    async getExchangeInfo() {
        try {
            const data = await this.makePublicRequest('/api/v3/exchangeInfo');
            return {
                timezone: data.timezone,
                serverTime: data.serverTime,
                rateLimits: data.rateLimits,
                exchangeFilters: data.exchangeFilters,
                symbols: data.symbols.map(symbol => ({
                    symbol: symbol.symbol,
                    status: symbol.status,
                    baseAsset: symbol.baseAsset,
                    baseAssetPrecision: symbol.baseAssetPrecision,
                    quoteAsset: symbol.quoteAsset,
                    quotePrecision: symbol.quotePrecision,
                    quoteAssetPrecision: symbol.quoteAssetPrecision,
                    orderTypes: symbol.orderTypes,
                    icebergAllowed: symbol.icebergAllowed,
                    ocoAllowed: symbol.ocoAllowed,
                    isSpotTradingAllowed: symbol.isSpotTradingAllowed,
                    isMarginTradingAllowed: symbol.isMarginTradingAllowed,
                    filters: symbol.filters
                })),
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Error fetching exchange info:', error.message);
            throw error;
        }
    }

    /**
     * Get kline/candlestick data
     */
    async getKlines(symbol, interval = '1h', limit = 100) {
        try {
            const data = await this.makePublicRequest('/api/v3/klines', {
                symbol: symbol.toUpperCase(),
                interval,
                limit
            });

            return data.map(kline => ({
                openTime: kline[0],
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
                closeTime: kline[6],
                quoteAssetVolume: parseFloat(kline[7]),
                numberOfTrades: kline[8],
                takerBuyBaseAssetVolume: parseFloat(kline[9]),
                takerBuyQuoteAssetVolume: parseFloat(kline[10])
            }));
        } catch (error) {
            console.error(`❌ Error fetching klines for ${symbol}:`, error.message);
            throw error;
        }
    }

    /**
     * Test API connectivity
     */
    async testConnectivity() {
        try {
            await this.makePublicRequest('/api/v3/ping');
            return {
                success: true,
                message: 'Binance API connectivity test successful',
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                success: false,
                message: `Binance API connectivity test failed: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Get server time
     */
    async getServerTime() {
        try {
            const data = await this.makePublicRequest('/api/v3/time');
            return {
                serverTime: data.serverTime,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Error fetching server time:', error.message);
            throw error;
        }
    }
}

module.exports = BinanceService;
