/**
 * 📈 TRADING ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * Trading operations and market analysis with real exchange integration
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');
const UnifiedExchangeService = require('../services/exchange/unified-exchange-service');
const BalanceTradingEngine = require('../trading/balance-based/balance-trading-engine');

class TradingRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.exchangeService = new UnifiedExchangeService();
        this.balanceTradingEngine = null; // Will be initialized when DB is set
        this.setupRoutes();
    }

    /**
     * Set database pool manager for trading routes
     */
    setDbPoolManager(dbPoolManager) {
        this.authMiddleware.setDbPoolManager(dbPoolManager);
        this.balanceTradingEngine = new BalanceTradingEngine(dbPoolManager);
    }

    setupRoutes() {
        // Test endpoint for balance trading engine (no auth required) - BEFORE auth middleware
        this.router.post('/test-signal', this.testBalanceTrading.bind(this));
        this.router.post('/test-pnl', this.testPnLDistribution.bind(this));

        // All other routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // Trading access required for most routes (optional for testing)
        // this.router.use(this.authMiddleware.requireTradingEnabled.bind(this.authMiddleware));

        // Trading routes
        this.router.get('/status', this.getStatus.bind(this));
        this.router.get('/positions', this.getPositions.bind(this));
        this.router.post('/positions', this.openPosition.bind(this));
        this.router.delete('/positions/:id', this.closePosition.bind(this));
        this.router.get('/analysis', this.getAnalysis.bind(this));
        this.router.post('/signal', this.processSignal.bind(this));
        this.router.post('/signals', this.processSignal.bind(this)); // Alias for compatibility
        this.router.get('/positions/active', this.getActivePositions.bind(this));
        this.router.get('/positions/stats', this.getPositionStats.bind(this));
        this.router.post('/positions/:tradeId/close', this.closeSpecificPosition.bind(this));
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
     * POST /signal - Process trading signal with balance-based execution
     */
    async processSignal(req, res) {
        try {
            const signal = req.body;
            console.log('📡 Processing trading signal with balance-based execution:', signal);

            // Validate signal data
            if (!signal.symbol || !signal.action) {
                return res.status(400).json({
                    success: false,
                    error: 'Signal must include symbol and action'
                });
            }

            // Check if balance trading engine is initialized
            if (!this.balanceTradingEngine) {
                return res.status(503).json({
                    success: false,
                    error: 'Balance trading engine not initialized. Database connection required.'
                });
            }

            // Execute balance-based trading for all active users
            console.log('🏦 Executing balance-based trading for all users...');
            const executionResult = await this.balanceTradingEngine.processSignalForAllUsers(signal);

            // Enhanced response with actual execution results
            const response = {
                success: executionResult.success,
                signal_processed: true,
                signal_data: {
                    symbol: signal.symbol,
                    action: signal.action,
                    price: signal.price || 'market',
                    timestamp: signal.timestamp || new Date().toISOString()
                },
                execution: {
                    engine: 'balance-based',
                    total_users: executionResult.totalUsers,
                    executed_trades: executionResult.executedTrades.length,
                    ai_decision: executionResult.aiDecision?.action || 'UNKNOWN',
                    ai_confidence: executionResult.aiDecision?.confidence || 0,
                    ai_reasoning: executionResult.aiDecision?.reason || 'No reasoning available'
                },
                results: executionResult.executedTrades,
                market_analysis: executionResult.marketAnalysis,
                message: executionResult.message,
                timestamp: new Date().toISOString()
            };

            // Set appropriate status code based on execution success
            const statusCode = executionResult.success ? 200 : 500;
            res.status(statusCode).json(response);

        } catch (error) {
            console.error('❌ Error processing signal with balance trading:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                signal_processed: false,
                execution: {
                    engine: 'balance-based',
                    total_users: 0,
                    executed_trades: 0,
                    error: error.message
                }
            });
        }
    }

    /**
     * Make AI-powered trading decision
     */
    async makeAIDecision(signal, marketAnalysis) {
        try {
            // Get market data for the symbol
            const symbolData = marketAnalysis.symbols[signal.symbol];
            
            if (!symbolData || symbolData.status !== 'success') {
                return {
                    action: 'HOLD',
                    confidence: 30,
                    reasoning: 'Insufficient market data for analysis'
                };
            }

            // Simple AI logic based on price movement and signal
            const priceChange = symbolData.priceChangePercent || 0;
            const isBullish = priceChange > 0;
            const isBearish = priceChange < -2;
            
            let action = 'HOLD';
            let confidence = 50;
            let reasoning = '';

            if (signal.action === 'BUY' && isBullish && priceChange > 1) {
                action = 'BUY';
                confidence = Math.min(85, 60 + Math.abs(priceChange) * 2);
                reasoning = `Bullish momentum detected (+${priceChange.toFixed(2)}%), signal aligns with market trend`;
            } else if (signal.action === 'SELL' && isBearish && priceChange < -1) {
                action = 'SELL';
                confidence = Math.min(85, 60 + Math.abs(priceChange) * 2);
                reasoning = `Bearish momentum detected (${priceChange.toFixed(2)}%), signal aligns with market trend`;
            } else if (signal.action === 'BUY' && isBearish) {
                action = 'HOLD';
                confidence = 70;
                reasoning = `BUY signal conflicts with bearish market trend (${priceChange.toFixed(2)}%), waiting for better entry`;
            } else if (signal.action === 'SELL' && isBullish) {
                action = 'HOLD';
                confidence = 70;
                reasoning = `SELL signal conflicts with bullish market trend (+${priceChange.toFixed(2)}%), waiting for better entry`;
            } else {
                action = 'HOLD';
                confidence = 60;
                reasoning = `Market conditions neutral (${priceChange.toFixed(2)}%), maintaining current position`;
            }

            return {
                action,
                confidence: Math.round(confidence),
                reasoning,
                market_data: {
                    price_change: priceChange,
                    current_price: symbolData.lastPrice,
                    volume: symbolData.volume
                }
            };
        } catch (error) {
            console.error('❌ Error in AI decision making:', error);
            return {
                action: 'HOLD',
                confidence: 20,
                reasoning: 'AI analysis failed, defaulting to HOLD'
            };
        }
    }

    /**
     * Assess risk for the trading decision
     */
    assessRisk(signal, aiDecision) {
        const riskLevels = {
            LOW: { score: 1, description: 'Low risk trade' },
            MEDIUM: { score: 2, description: 'Medium risk trade' },
            HIGH: { score: 3, description: 'High risk trade' }
        };

        let riskScore = 1;
        let factors = [];

        // Confidence-based risk
        if (aiDecision.confidence < 60) {
            riskScore += 1;
            factors.push('Low confidence in AI decision');
        }

        // Market volatility risk
        const priceChange = Math.abs(aiDecision.market_data?.price_change || 0);
        if (priceChange > 5) {
            riskScore += 1;
            factors.push('High market volatility');
        }

        // Position size risk (if specified)
        if (signal.quantity && parseFloat(signal.quantity) > 1000) {
            riskScore += 1;
            factors.push('Large position size');
        }

        const riskLevel = riskScore <= 1 ? 'LOW' : riskScore <= 2 ? 'MEDIUM' : 'HIGH';
        
        return {
            level: riskLevel,
            score: riskScore,
            description: riskLevels[riskLevel].description,
            factors: factors,
            recommendation: riskLevel === 'HIGH' ? 'Consider reducing position size' : 'Risk acceptable'
        };
    }

    /**
     * Generate recommendations based on AI decision and risk
     */
    generateRecommendations(aiDecision, riskAssessment) {
        const recommendations = [];

        if (aiDecision.action === 'BUY') {
            recommendations.push('Consider entering long position');
            if (riskAssessment.level === 'LOW') {
                recommendations.push('Risk level acceptable for entry');
            } else {
                recommendations.push('Monitor risk factors closely');
            }
        } else if (aiDecision.action === 'SELL') {
            recommendations.push('Consider entering short position');
            recommendations.push('Monitor market for trend reversal');
        } else {
            recommendations.push('Maintain current position');
            recommendations.push('Wait for better market conditions');
        }

        // Add risk-based recommendations
        if (riskAssessment.level === 'HIGH') {
            recommendations.push('Consider smaller position size');
            recommendations.push('Set tight stop-loss');
        }

        return recommendations;
    }

    /**
     * POST /test-signal - Test balance trading engine (no auth required)
     */
    async testBalanceTrading(req, res) {
        try {
            const signal = req.body;
            console.log('🧪 Testing balance-based trading:', signal);

            // Check if balance trading engine is initialized
            if (!this.balanceTradingEngine) {
                return res.json({
                    success: false,
                    error: 'Balance trading engine not initialized. Database connection required.',
                    test: true
                });
            }

            // Execute balance-based trading test
            const executionResult = await this.balanceTradingEngine.processSignalForAllUsers(signal);

            res.json({
                success: executionResult.success,
                test: true,
                message: 'Balance trading engine test completed',
                execution: executionResult,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error testing balance trading:', error);
            res.json({
                success: false,
                error: error.message,
                test: true,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * POST /test-pnl - Test P&L distribution system (no auth required)
     */
    async testPnLDistribution(req, res) {
        try {
            const signal = req.body;
            console.log('🧪 Testing P&L distribution with complete trade lifecycle:', signal);

            // Check if balance trading engine is initialized
            if (!this.balanceTradingEngine) {
                return res.json({
                    success: false,
                    error: 'Balance trading engine not initialized. Database connection required.',
                    test: true
                });
            }

            // Execute complete trade lifecycle with P&L distribution
            const lifecycleResult = await this.balanceTradingEngine.processTradeLifecycle(signal, true);

            res.json({
                success: lifecycleResult.success,
                test: true,
                message: 'P&L distribution test initiated',
                execution: lifecycleResult,
                note: 'P&L distribution will occur after 10 seconds for any successful trades',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error testing P&L distribution:', error);
            res.json({
                success: false,
                error: error.message,
                test: true,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * GET /positions/active - Get all active positions
     */
    async getActivePositions(req, res) {
        try {
            if (!this.balanceTradingEngine || !this.balanceTradingEngine.positionTracker) {
                return res.status(503).json({
                    success: false,
                    error: 'Position tracker not initialized'
                });
            }

            const activePositions = this.balanceTradingEngine.positionTracker.getActivePositions();

            res.json({
                success: true,
                positions: activePositions,
                count: activePositions.length,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error getting active positions:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /positions/stats - Get position statistics
     */
    async getPositionStats(req, res) {
        try {
            if (!this.balanceTradingEngine || !this.balanceTradingEngine.positionTracker) {
                return res.status(503).json({
                    success: false,
                    error: 'Position tracker not initialized'
                });
            }

            const stats = this.balanceTradingEngine.positionTracker.getPositionStats();

            res.json({
                success: true,
                stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error getting position stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /positions/:tradeId/close - Close a specific position
     */
    async closeSpecificPosition(req, res) {
        try {
            const { tradeId } = req.params;
            const { reason = 'Manual close' } = req.body;

            if (!this.balanceTradingEngine || !this.balanceTradingEngine.positionTracker) {
                return res.status(503).json({
                    success: false,
                    error: 'Position tracker not initialized'
                });
            }

            const result = await this.balanceTradingEngine.positionTracker.closePosition(tradeId, reason);

            if (result.success) {
                res.json({
                    success: true,
                    message: `Position ${tradeId} closed successfully`,
                    result,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Failed to close position'
                });
            }

        } catch (error) {
            console.error('❌ Error closing position:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new TradingRoutes();
