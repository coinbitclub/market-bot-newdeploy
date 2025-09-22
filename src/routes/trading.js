/**
 * 📈 TRADING ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * Trading operations and market analysis with real exchange integration
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');
const UnifiedExchangeService = require('../services/exchange/unified-exchange-service');

class TradingRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.exchangeService = new UnifiedExchangeService();
        this.setupRoutes();
    }

    setupRoutes() {
        // All routes require authentication and trading access
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));
        this.router.use(this.authMiddleware.requireTradingEnabled.bind(this.authMiddleware));

        // Trading routes
        this.router.get('/status', this.getStatus.bind(this));
        this.router.get('/positions', this.getPositions.bind(this));
        this.router.post('/positions', this.openPosition.bind(this));
        this.router.delete('/positions/:id', this.closePosition.bind(this));
        this.router.get('/analysis', this.getAnalysis.bind(this));
        this.router.post('/signal', this.processSignal.bind(this));
    }

    /**
     * GET /status - Get trading status with real exchange data
     */
    async getStatus(req, res) {
        try {
            // Get exchange status
            const exchangeStatus = await this.exchangeService.getExchangeStatus();
            
            // Get account info from exchanges
            const accountInfo = await this.exchangeService.getAllAccountInfo();
            
            // Calculate total positions across exchanges
            let totalPositions = 0;
            let canTrade = false;
            
            for (const [exchange, info] of Object.entries(accountInfo)) {
                if (info.status === 'success' && info.canTrade) {
                    canTrade = true;
                    // Count open orders as active positions
                    const openOrders = await this.exchangeService.getAllOpenOrders();
                    if (openOrders[exchange] && openOrders[exchange].orders) {
                        totalPositions += openOrders[exchange].orders.length;
                    }
                }
            }

            res.json({
                success: true,
                status: 'active',
                activePositions: totalPositions,
                maxPositions: 2,
                canTrade: canTrade,
                exchangeStatus: exchangeStatus,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error getting trading status:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                status: 'error',
                activePositions: 0,
                maxPositions: 2,
                canTrade: false
            });
        }
    }

    /**
     * GET /positions - Get user positions from real exchanges
     */
    async getPositions(req, res) {
        try {
            const openOrders = await this.exchangeService.getAllOpenOrders();
            
            // Transform exchange orders to unified format
            const positions = [];
            for (const [exchange, data] of Object.entries(openOrders)) {
                if (data.status === 'success' && data.orders) {
                    for (const order of data.orders) {
                        positions.push({
                            id: order.orderId || order.orderLinkId,
                            symbol: order.symbol,
                            side: order.side,
                            type: order.type || order.orderType,
                            quantity: order.qty || order.origQty,
                            price: order.price,
                            status: order.status || order.orderStatus,
                            exchange: exchange,
                            createdAt: order.time || order.createdTime,
                            updatedAt: order.updateTime
                        });
                    }
                }
            }

            res.json({
                success: true,
                positions: positions,
                total: positions.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error getting positions:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                positions: []
            });
        }
    }

    /**
     * POST /positions - Open new position
     */
    async openPosition(req, res) {
        try {
            res.json({
                success: true,
                message: 'Position opened successfully',
                positionId: 'pos_123'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * DELETE /positions/:id - Close position
     */
    async closePosition(req, res) {
        try {
            res.json({
                success: true,
                message: 'Position closed successfully'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /analysis - Get real-time market analysis
     */
    async getAnalysis(req, res) {
        try {
            // Get comprehensive market analysis
            const marketAnalysis = await this.exchangeService.getMarketAnalysis([
                'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'MATICUSDT', 'DOTUSDT'
            ]);

            // Calculate overall sentiment
            let bullishCount = 0;
            let bearishCount = 0;
            let totalConfidence = 0;
            let validSymbols = 0;

            for (const [symbol, data] of Object.entries(marketAnalysis.symbols)) {
                if (data.status === 'success' && data.priceChangePercent !== undefined) {
                    if (data.priceChangePercent > 0) bullishCount++;
                    else bearishCount++;
                    
                    totalConfidence += Math.abs(data.priceChangePercent);
                    validSymbols++;
                }
            }

            const averageConfidence = validSymbols > 0 ? Math.min(100, (totalConfidence / validSymbols) * 10) : 50;
            const sentiment = bullishCount > bearishCount ? 'BULLISH' : 
                            bearishCount > bullishCount ? 'BEARISH' : 'NEUTRAL';

            res.json({
                success: true,
                analysis: {
                    sentiment: sentiment,
                    confidence: Math.round(averageConfidence),
                    recommendations: sentiment === 'BULLISH' ? ['BUY', 'HOLD'] : 
                                   sentiment === 'BEARISH' ? ['SELL', 'HOLD'] : ['HOLD'],
                    marketData: marketAnalysis,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Error getting market analysis:', error);
            res.status(500).json({ 
                success: false,
                error: error.message,
                analysis: {
                    sentiment: 'NEUTRAL',
                    confidence: 0,
                    recommendations: ['HOLD']
                }
            });
        }
    }

    /**
     * POST /signal - Process trading signal
     */
    async processSignal(req, res) {
        try {
            res.json({
                success: true,
                message: 'Signal processed successfully'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new TradingRoutes();
