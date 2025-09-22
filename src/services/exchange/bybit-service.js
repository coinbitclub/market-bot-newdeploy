/**
 * 🔥 BYBIT API SERVICE - REAL EXCHANGE INTEGRATION
 * Handles real market data fetching and trading operations
 */

const axios = require('axios');
const crypto = require('crypto');

class BybitService {
    constructor() {
        this.baseURL = 'https://api.bybit.com';
        this.testnetURL = 'https://api-testnet.bybit.com';
        this.isTestnet = process.env.BYBIT_TESTNET === 'true';
        this.apiKey = process.env.BYBIT_API_KEY;
        this.apiSecret = process.env.BYBIT_API_SECRET;
        
        this.currentURL = this.isTestnet ? this.testnetURL : this.baseURL;
        
        console.log(`🔥 Bybit Service initialized - ${this.isTestnet ? 'TESTNET' : 'MAINNET'}`);
    }

    /**
     * Generate signature for authenticated requests
     */
    generateSignature(timestamp, recvWindow, params) {
        const queryString = new URLSearchParams(params).toString();
        const signString = timestamp + this.apiKey + recvWindow + queryString;
        return crypto.createHmac('sha256', this.apiSecret).update(signString).digest('hex');
    }

    /**
     * Make authenticated request to Bybit API
     */
    async makeAuthenticatedRequest(endpoint, params = {}, method = 'GET') {
        try {
            if (!this.apiKey || !this.apiSecret) {
                throw new Error('Bybit API credentials not configured');
            }

            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            const signature = this.generateSignature(timestamp, recvWindow, params);

            const config = {
                method,
                url: `${this.currentURL}${endpoint}`,
                headers: {
                    'X-BAPI-API-KEY': this.apiKey,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-SIGN-TYPE': '2',
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            };

            if (method === 'GET') {
                config.params = params;
            } else {
                config.data = params;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error('❌ Bybit API Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Make public request to Bybit API
     */
    async makePublicRequest(endpoint, params = {}) {
        try {
            const response = await axios({
                method: 'GET',
                url: `${this.currentURL}${endpoint}`,
                params,
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('❌ Bybit Public API Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get real-time price for a symbol
     */
    async getSymbolPrice(symbol) {
        try {
            const data = await this.makePublicRequest('/v5/market/tickers', {
                category: 'spot',
                symbol: symbol.toUpperCase()
            });

            if (data.result && data.result.list && data.result.list.length > 0) {
                const ticker = data.result.list[0];
                return {
                    success: true,
                    symbol: ticker.symbol,
                    price: parseFloat(ticker.lastPrice),
                    bidPrice: parseFloat(ticker.bid1Price),
                    askPrice: parseFloat(ticker.ask1Price),
                    volume24h: parseFloat(ticker.volume24h),
                    priceChange24h: parseFloat(ticker.price24hPcnt),
                    timestamp: Date.now()
                };
            }
            return {
                success: false,
                error: 'Symbol not found'
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
            const data = await this.makePublicRequest('/v5/market/tickers', {
                category: 'spot',
                symbol: symbol.toUpperCase()
            });

            if (data.result && data.result.list && data.result.list.length > 0) {
                const ticker = data.result.list[0];
                return {
                    success: true,
                    data: {
                        symbol: ticker.symbol,
                        lastPrice: parseFloat(ticker.lastPrice),
                        bid1Price: parseFloat(ticker.bid1Price),
                        bid1Size: parseFloat(ticker.bid1Size),
                        ask1Price: parseFloat(ticker.ask1Price),
                        ask1Size: parseFloat(ticker.ask1Size),
                        volume24h: parseFloat(ticker.volume24h),
                        turnover24h: parseFloat(ticker.turnover24h),
                        price24hPcnt: parseFloat(ticker.price24hPcnt),
                        priceChangePercent: parseFloat(ticker.price24hPcnt) * 100,
                        highPrice24h: parseFloat(ticker.highPrice24h),
                        lowPrice24h: parseFloat(ticker.lowPrice24h),
                        prevPrice24h: parseFloat(ticker.prevPrice24h),
                        openInterest: parseFloat(ticker.openInterest),
                        nextFundingTime: ticker.nextFundingTime,
                        fundingRate: parseFloat(ticker.fundingRate),
                        timestamp: Date.now()
                    }
                };
            }
            return {
                success: false,
                error: 'Symbol not found'
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
            const data = await this.makeAuthenticatedRequest('/v5/account/wallet-balance', {
                accountType: 'UNIFIED'
            });

            if (data.result && data.result.list && data.result.list.length > 0) {
                const account = data.result.list[0];
                return {
                    accountType: account.accountType,
                    marginMode: account.marginMode,
                    updatedTime: account.updatedTime,
                    totalWalletBalance: parseFloat(account.totalWalletBalance),
                    totalUnrealisedPnl: parseFloat(account.totalUnrealisedPnl),
                    totalMarginBalance: parseFloat(account.totalMarginBalance),
                    totalMaintMargin: parseFloat(account.totalMaintMargin),
                    totalInitialMargin: parseFloat(account.totalInitialMargin),
                    totalAvailableBalance: parseFloat(account.totalAvailableBalance),
                    totalPerpUPL: parseFloat(account.totalPerpUPL),
                    totalPositionIM: parseFloat(account.totalPositionIM),
                    totalPositionMM: parseFloat(account.totalPositionMM),
                    totalTakeProfitLiqValue: parseFloat(account.totalTakeProfitLiqValue),
                    totalStopLossLiqValue: parseFloat(account.totalStopLossLiqValue),
                    coins: account.coins.map(coin => ({
                        coin: coin.coin,
                        walletBalance: parseFloat(coin.walletBalance),
                        transferBalance: parseFloat(coin.transferBalance),
                        bonus: parseFloat(coin.bonus),
                        availableToWithdraw: parseFloat(coin.availableToWithdraw),
                        availableToBorrow: parseFloat(coin.availableToBorrow),
                        accruedInterest: parseFloat(coin.accruedInterest),
                        totalOrderIM: parseFloat(coin.totalOrderIM),
                        totalPositionIM: parseFloat(coin.totalPositionIM),
                        totalPositionMM: parseFloat(coin.totalPositionMM),
                        unrealisedPnl: parseFloat(coin.unrealisedPnl),
                        cumRealisedPnl: parseFloat(coin.cumRealisedPnl),
                        used: parseFloat(coin.used)
                    })),
                    timestamp: Date.now()
                };
            }
            throw new Error('Account information not available');
        } catch (error) {
            console.error('❌ Error fetching account info:', error.message);
            throw error;
        }
    }

    /**
     * Get open orders
     */
    async getOpenOrders(symbol = null, category = 'spot') {
        try {
            const params = { category };
            if (symbol) params.symbol = symbol.toUpperCase();

            const data = await this.makeAuthenticatedRequest('/v5/order/realtime', params);

            if (data.result && data.result.list) {
                return data.result.list.map(order => ({
                    orderId: order.orderId,
                    orderLinkId: order.orderLinkId,
                    blockTradeId: order.blockTradeId,
                    symbol: order.symbol,
                    price: parseFloat(order.price),
                    qty: parseFloat(order.qty),
                    side: order.side,
                    isLeverage: order.isLeverage,
                    positionIdx: order.positionIdx,
                    orderStatus: order.orderStatus,
                    cancelType: order.cancelType,
                    rejectReason: order.rejectReason,
                    avgPrice: parseFloat(order.avgPrice),
                    leavesQty: parseFloat(order.leavesQty),
                    leavesValue: parseFloat(order.leavesValue),
                    cumExecQty: parseFloat(order.cumExecQty),
                    cumExecValue: parseFloat(order.cumExecValue),
                    cumExecFee: parseFloat(order.cumExecFee),
                    timeInForce: order.timeInForce,
                    orderType: order.orderType,
                    stopOrderType: order.stopOrderType,
                    orderIv: order.orderIv,
                    triggerPrice: parseFloat(order.triggerPrice),
                    takeProfit: parseFloat(order.takeProfit),
                    stopLoss: parseFloat(order.stopLoss),
                    tpLimitPrice: parseFloat(order.tpLimitPrice),
                    slLimitPrice: parseFloat(order.slLimitPrice),
                    tpTriggerBy: order.tpTriggerBy,
                    slTriggerBy: order.slTriggerBy,
                    triggerDirection: order.triggerDirection,
                    triggerBy: order.triggerBy,
                    lastPriceOnCreated: parseFloat(order.lastPriceOnCreated),
                    reduceOnly: order.reduceOnly,
                    closeOnTrigger: order.closeOnTrigger,
                    smpType: order.smpType,
                    smpGroup: order.smpGroup,
                    smpOrderId: order.smpOrderId,
                    createdTime: order.createdTime,
                    updatedTime: order.updatedTime,
                    timestamp: Date.now()
                }));
            }
            return [];
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
                category = 'spot',
                symbol,
                side,
                orderType = 'Market',
                qty,
                price = null,
                timeInForce = 'GTC',
                orderLinkId = null,
                isLeverage = false,
                orderFilter = 'Order',
                triggerPrice = null,
                triggerDirection = null,
                triggerBy = null,
                orderIv = null,
                positionIdx = null,
                takeProfit = null,
                stopLoss = null,
                tpTriggerBy = null,
                slTriggerBy = null,
                tpLimitPrice = null,
                slLimitPrice = null,
                tpOrderType = null,
                slOrderType = null,
                reduceOnly = false
            } = orderParams;

            const params = {
                category,
                symbol: symbol.toUpperCase(),
                side: side.charAt(0).toUpperCase() + side.slice(1).toLowerCase(),
                orderType,
                qty: qty.toString(),
                timeInForce,
                orderFilter
            };

            if (price) params.price = price.toString();
            if (orderLinkId) params.orderLinkId = orderLinkId;
            if (isLeverage) params.isLeverage = isLeverage.toString();
            if (triggerPrice) params.triggerPrice = triggerPrice.toString();
            if (triggerDirection) params.triggerDirection = triggerDirection.toString();
            if (triggerBy) params.triggerBy = triggerBy;
            if (orderIv) params.orderIv = orderIv.toString();
            if (positionIdx) params.positionIdx = positionIdx.toString();
            if (takeProfit) params.takeProfit = takeProfit.toString();
            if (stopLoss) params.stopLoss = stopLoss.toString();
            if (tpTriggerBy) params.tpTriggerBy = tpTriggerBy;
            if (slTriggerBy) params.slTriggerBy = slTriggerBy;
            if (tpLimitPrice) params.tpLimitPrice = tpLimitPrice.toString();
            if (slLimitPrice) params.slLimitPrice = slLimitPrice.toString();
            if (tpOrderType) params.tpOrderType = tpOrderType;
            if (slOrderType) params.slOrderType = slOrderType;
            if (reduceOnly) params.reduceOnly = reduceOnly.toString();

            const data = await this.makeAuthenticatedRequest('/v5/order/create', params, 'POST');
            
            if (data.result) {
                return {
                    orderId: data.result.orderId,
                    orderLinkId: data.result.orderLinkId,
                    timestamp: Date.now()
                };
            }
            throw new Error('Order placement failed');
        } catch (error) {
            console.error('❌ Error placing order:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Cancel an order
     */
    async cancelOrder(symbol, orderId, category = 'spot') {
        try {
            const data = await this.makeAuthenticatedRequest('/v5/order/cancel', {
                category,
                symbol: symbol.toUpperCase(),
                orderId: orderId.toString()
            }, 'POST');

            if (data.result) {
                return {
                    orderId: data.result.orderId,
                    orderLinkId: data.result.orderLinkId,
                    timestamp: Date.now()
                };
            }
            throw new Error('Order cancellation failed');
        } catch (error) {
            console.error('❌ Error canceling order:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get instrument info (symbols, filters, etc.)
     */
    async getInstrumentInfo(category = 'spot', symbol = null) {
        try {
            const params = { category };
            if (symbol) params.symbol = symbol.toUpperCase();

            const data = await this.makePublicRequest('/v5/market/instruments-info', params);

            if (data.result && data.result.list) {
                return {
                    category: data.result.category,
                    list: data.result.list.map(instrument => ({
                        symbol: instrument.symbol,
                        baseCoin: instrument.baseCoin,
                        quoteCoin: instrument.quoteCoin,
                        innovation: instrument.innovation,
                        status: instrument.status,
                        marginTrading: instrument.marginTrading,
                        lotSizeFilter: instrument.lotSizeFilter,
                        priceFilter: instrument.priceFilter,
                        contractType: instrument.contractType,
                        launchTime: instrument.launchTime,
                        deliveryTime: instrument.deliveryTime,
                        deliveryFeeRate: instrument.deliveryFeeRate,
                        priceScale: instrument.priceScale,
                        leverageFilter: instrument.leverageFilter,
                        presetType: instrument.presetType
                    })),
                    timestamp: Date.now()
                };
            }
            throw new Error('Instrument info not available');
        } catch (error) {
            console.error('❌ Error fetching instrument info:', error.message);
            throw error;
        }
    }

    /**
     * Get kline/candlestick data
     */
    async getKlines(symbol, interval = '1', limit = 100, category = 'spot') {
        try {
            const data = await this.makePublicRequest('/v5/market/kline', {
                category,
                symbol: symbol.toUpperCase(),
                interval,
                limit
            });

            if (data.result && data.result.list) {
                return data.result.list.map(kline => ({
                    startTime: kline[0],
                    openPrice: parseFloat(kline[1]),
                    highPrice: parseFloat(kline[2]),
                    lowPrice: parseFloat(kline[3]),
                    closePrice: parseFloat(kline[4]),
                    volume: parseFloat(kline[5]),
                    turnover: parseFloat(kline[6])
                }));
            }
            throw new Error('Kline data not available');
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
            const data = await this.makePublicRequest('/v5/market/time');
            return {
                success: true,
                message: 'Bybit API connectivity test successful',
                serverTime: data.result?.timeSecond,
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                success: false,
                message: `Bybit API connectivity test failed: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Get server time
     */
    async getServerTime() {
        try {
            const data = await this.makePublicRequest('/v5/market/time');
            return {
                timeSecond: data.result?.timeSecond,
                timeNano: data.result?.timeNano,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Error fetching server time:', error.message);
            throw error;
        }
    }
}

module.exports = BybitService;

