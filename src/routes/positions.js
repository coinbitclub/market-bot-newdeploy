/**
 * Positions API Routes (Hybrid Approach)
 *
 * Routes for accessing positions using hybrid management:
 * - /api/positions/current - Real-time from exchange
 * - /api/positions/history - Historical from database
 * - /api/positions/analytics - Analytics from database
 *
 * @author CoinBitClub
 * @date October 20, 2025
 */

const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middleware/auth');

class PositionsRoutes {
    constructor() {
        this.router = express.Router();
        this.positionManagementService = null;
        this.reconciliationService = null;
        this.dbPoolManager = null;
        this.authMiddleware = new AuthMiddleware();
        this.routesSetup = false;

        // Setup routes immediately in constructor (like OperationsRoutes does)
        this.setupRoutes();
    }

    /**
     * Set database pool manager (required by route system)
     */
    setDbPoolManager(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
        this.authMiddleware.setDbPoolManager(dbPoolManager);
        console.log('✅ PositionsRoutes: Database pool manager set');
    }

    /**
     * Set position management service (dependency injection)
     */
    setPositionManagementService(positionManagementService) {
        this.positionManagementService = positionManagementService;
        console.log('✅ PositionsRoutes: Position management service set');
    }

    /**
     * Set reconciliation service (dependency injection)
     */
    setReconciliationService(reconciliationService) {
        this.reconciliationService = reconciliationService;
        console.log('✅ PositionsRoutes: Reconciliation service set');
    }

    /**
     * Set services (legacy method for compatibility)
     */
    setServices(positionManagementService, reconciliationService) {
        this.positionManagementService = positionManagementService;
        this.reconciliationService = reconciliationService;
        this.setupRoutes();
    }

    /**
     * Setup all routes
     */
    setupRoutes() {
        console.log('🔧 PositionsRoutes: Setting up routes with authentication...');

        // Apply authentication middleware to all routes
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        /**
         * GET /api/positions/current
         * Get current open positions (REAL-TIME from exchange)
         *
         * Use this for: Operations page display
         *
         * Query params:
         * - exchange: optional (bybit/binance)
         */
        this.router.get('/current', async (req, res) => {
            try {
                const userId = req.user?.id;
                const { exchange } = req.query;

                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                // Check if service is available
                if (!this.positionManagementService) {
                    return res.status(503).json({
                        success: false,
                        error: 'Position management service not initialized'
                    });
                }

                const positions = await this.positionManagementService.getPositionsForDisplay(
                    userId,
                    exchange || null
                );

                res.json({
                    success: true,
                    positions,
                    count: positions.length,
                    dataSource: 'exchange',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error getting current positions:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch current positions'
                });
            }
        });

        /**
         * GET /api/positions/history
         * Get historical trades (ANALYTICS from database)
         *
         * Use this for: Performance page historical data
         *
         * Query params:
         * - startDate: ISO date string (default: 30 days ago)
         * - endDate: ISO date string (default: now)
         * - status: OPEN/CLOSED/ALL (default: CLOSED)
         * - exchange: optional (bybit/binance)
         * - symbol: optional
         * - limit: number (default: 100)
         * - offset: number (default: 0)
         */
        this.router.get('/history', async (req, res) => {
            try {
                const userId = req.user?.id;

                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const {
                    startDate,
                    endDate,
                    status = 'CLOSED',
                    exchange,
                    symbol,
                    limit = 100,
                    offset = 0
                } = req.query;

                const options = {
                    startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: endDate ? new Date(endDate) : new Date(),
                    status,
                    exchange: exchange || null,
                    symbol: symbol || null,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                };

                const trades = await this.positionManagementService.getHistoricalTrades(userId, options);

                res.json({
                    success: true,
                    trades,
                    count: trades.length,
                    options,
                    dataSource: 'database',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error getting historical trades:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch historical trades'
                });
            }
        });

        /**
         * GET /api/positions/analytics
         * Get analytics summary (from database)
         *
         * Use this for: Performance page summary stats
         *
         * Query params:
         * - startDate: ISO date string (default: 30 days ago)
         * - endDate: ISO date string (default: now)
         * - exchange: optional (bybit/binance)
         */
        this.router.get('/analytics', async (req, res) => {
            try {
                const userId = req.user?.id;

                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const { startDate, endDate, exchange } = req.query;

                const options = {
                    startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: endDate ? new Date(endDate) : new Date(),
                    exchange: exchange || null
                };

                const summary = await this.positionManagementService.getAnalyticsSummary(userId, options);

                res.json({
                    success: true,
                    analytics: summary,
                    dataSource: 'database',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error getting analytics summary:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch analytics summary'
                });
            }
        });

        /**
         * GET /api/positions/performance-by-symbol
         * Get performance metrics grouped by symbol
         *
         * Use this for: Performance breakdown by asset
         */
        this.router.get('/performance-by-symbol', async (req, res) => {
            try {
                const userId = req.user?.id;

                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const { startDate, endDate } = req.query;

                const options = {
                    startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: endDate ? new Date(endDate) : new Date()
                };

                const performance = await this.positionManagementService.getPerformanceBySymbol(userId, options);

                res.json({
                    success: true,
                    performance,
                    dataSource: 'database',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error getting performance by symbol:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch performance by symbol'
                });
            }
        });

        /**
         * GET /api/positions/daily-pnl
         * Get daily P&L chart data
         *
         * Use this for: Performance charts
         */
        this.router.get('/daily-pnl', async (req, res) => {
            try {
                const userId = req.user?.id;

                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const { startDate, endDate } = req.query;

                const options = {
                    startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    endDate: endDate ? new Date(endDate) : new Date()
                };

                const chartData = await this.positionManagementService.getDailyPnlChart(userId, options);

                res.json({
                    success: true,
                    chartData,
                    dataSource: 'database',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error getting daily P&L chart:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch daily P&L chart'
                });
            }
        });

        /**
         * GET /api/positions/:operationId
         * Get specific position details
         */
        this.router.get('/:operationId', async (req, res) => {
            try {
                const userId = req.user?.id;
                const { operationId } = req.params;

                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const position = await this.positionManagementService.getPositionByOperationId(operationId);

                if (!position) {
                    return res.status(404).json({
                        success: false,
                        error: 'Position not found'
                    });
                }

                // Check if position belongs to user
                if (position.user_id !== userId) {
                    return res.status(403).json({
                        success: false,
                        error: 'Forbidden'
                    });
                }

                res.json({
                    success: true,
                    position,
                    dataSource: 'database',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error getting position:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch position'
                });
            }
        });

        /**
         * POST /api/positions/reconcile
         * Manually trigger reconciliation for current user
         *
         * Admin/Debug endpoint
         */
        this.router.post('/reconcile', async (req, res) => {
            try {
                const userId = req.user?.id;

                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const discrepancies = await this.reconciliationService.reconcileUser(userId);

                res.json({
                    success: true,
                    message: 'Reconciliation completed',
                    discrepanciesFound: discrepancies,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error reconciling positions:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to reconcile positions'
                });
            }
        });

        /**
         * GET /api/positions/reconciliation/stats
         * Get reconciliation service stats
         *
         * Admin/Debug endpoint
         */
        this.router.get('/reconciliation/stats', async (req, res) => {
            try {
                const stats = this.reconciliationService.getStats();

                res.json({
                    success: true,
                    stats,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error getting reconciliation stats:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch reconciliation stats'
                });
            }
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = PositionsRoutes;
