/**
 * 📊 PERFORMANCE ROUTES - COINBITCLUB ENTERPRISE
 * User performance metrics and analytics
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');
const UnifiedExchangeService = require('../services/exchange/unified-exchange-service');
const RealPerformanceService = require('../services/performance/real-performance-service');

class PerformanceRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.exchangeService = new UnifiedExchangeService();
        this.realPerformanceService = new RealPerformanceService();
        this.setupRoutes();
    }

    /**
     * Set database pool manager for performance routes
     */
    setDbPoolManager(dbPoolManager) {
        this.authMiddleware.setDbPoolManager(dbPoolManager);
        this.realPerformanceService.setDbPoolManager(dbPoolManager);
    }

    setupRoutes() {
        // All routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // Performance routes
        this.router.get('/overview', this.getPerformanceOverview.bind(this));
        this.router.get('/metrics', this.getPerformanceMetrics.bind(this));
        this.router.get('/operations', this.getRecentOperations.bind(this));
        this.router.get('/chart-data', this.getChartData.bind(this));
        this.router.get('/distribution', this.getDistributionData.bind(this));
        this.router.get('/statistics', this.getStatistics.bind(this));
        
        // New routes for recording operations and updating balances
        this.router.post('/record-operation', this.recordOperation.bind(this));
        this.router.put('/update-balance', this.updateBalance.bind(this));
    }

    /**
     * GET /overview - Get performance overview
     */
    async getPerformanceOverview(req, res) {
        try {
            const userId = req.user.id;
            
            // Get real performance data from database
            const performanceData = await this.realPerformanceService.getPerformanceOverview(userId);

            res.json({
                success: true,
                data: performanceData
            });
        } catch (error) {
            console.error('❌ Performance overview error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter overview de performance',
                code: 'PERFORMANCE_OVERVIEW_ERROR'
            });
        }
    }

    /**
     * GET /metrics - Get detailed performance metrics
     */
    async getPerformanceMetrics(req, res) {
        try {
            const userId = req.user.id;
            
            // Get real performance metrics from database
            const metrics = await this.realPerformanceService.getPerformanceMetrics(userId);

            res.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Performance metrics error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter métricas de performance',
                code: 'PERFORMANCE_METRICS_ERROR'
            });
        }
    }

    /**
     * GET /operations - Get recent operations
     */
    async getRecentOperations(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 10;
            
            // Get real recent operations from database
            const operations = await this.realPerformanceService.getRecentOperations(userId, limit);

            res.json({
                success: true,
                data: operations,
                count: operations.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Recent operations error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter operações recentes',
                code: 'RECENT_OPERATIONS_ERROR'
            });
        }
    }

    /**
     * GET /chart-data - Get chart data for performance visualization
     */
    async getChartData(req, res) {
        try {
            const userId = req.user.id;
            const period = req.query.period || '30d'; // 7d, 30d, 90d, 1y
            
            // Get real chart data from database
            const chartData = await this.realPerformanceService.getChartData(userId, period);

            res.json({
                success: true,
                data: chartData,
                period: period,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Chart data error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter dados do gráfico',
                code: 'CHART_DATA_ERROR'
            });
        }
    }

    /**
     * GET /distribution - Get distribution data by trading pairs
     */
    async getDistributionData(req, res) {
        try {
            const userId = req.user.id;
            
            // Get real distribution data from database
            const distribution = await this.realPerformanceService.getDistributionData(userId);

            res.json({
                success: true,
                data: distribution,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Distribution data error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter dados de distribuição',
                code: 'DISTRIBUTION_DATA_ERROR'
            });
        }
    }

    /**
     * GET /statistics - Get performance statistics
     */
    async getStatistics(req, res) {
        try {
            const userId = req.user.id;
            
            // Get real statistics from database
            const statistics = await this.realPerformanceService.getStatistics(userId);

            res.json({
                success: true,
                data: statistics,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Statistics error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter estatísticas',
                code: 'STATISTICS_ERROR'
            });
        }
    }

    /**
     * POST /record-operation - Record a new trading operation
     */
    async recordOperation(req, res) {
        try {
            const userId = req.user.id;
            const operationData = {
                userId,
                ...req.body
            };

            const operationId = await this.realPerformanceService.recordTradingOperation(operationData);

            res.json({
                success: true,
                data: { operationId },
                message: 'Trading operation recorded successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Record operation error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao registrar operação',
                code: 'RECORD_OPERATION_ERROR'
            });
        }
    }

    /**
     * PUT /update-balance - Update user balance
     */
    async updateBalance(req, res) {
        try {
            const userId = req.user.id;
            const { newBalance } = req.body;

            await this.realPerformanceService.updateUserBalance(userId, newBalance);

            res.json({
                success: true,
                message: 'Balance updated successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Update balance error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar saldo',
                code: 'UPDATE_BALANCE_ERROR'
            });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = PerformanceRoutes;
