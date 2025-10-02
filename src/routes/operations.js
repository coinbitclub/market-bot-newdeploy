/**
 * 📊 OPERATIONS ROUTES - COINBITCLUB ENTERPRISE
 * Real-time operations data and trading signals
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');
const RealOperationsService = require('../services/operations/real-operations-service');

class OperationsRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.realOperationsService = new RealOperationsService();
        this.setupRoutes();
    }

    /**
     * Set database pool manager for operations routes
     */
    setDbPoolManager(dbPoolManager) {
        this.authMiddleware.setDbPoolManager(dbPoolManager);
        // RealOperationsService handles its own database connection
        console.log('✅ OperationsRoutes: Database pool manager set');
    }

    setupRoutes() {
        // Test endpoints (no auth required)
        this.router.get('/top-signals-test', this.getTopSignalsTest.bind(this));

        // All other routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // Operations routes
        this.router.get('/market-indicators', this.getMarketIndicators.bind(this));
        this.router.get('/ai-decision', this.getAIDecision.bind(this));
        this.router.get('/signals', this.getTradingSignals.bind(this));
        this.router.get('/positions', this.getPositions.bind(this));
        this.router.get('/daily-stats', this.getDailyStats.bind(this));
        this.router.get('/all', this.getAllOperationsData.bind(this));

        // Top signals
        this.router.get('/top-signals', this.getTopSignals.bind(this));


        // Signal generation
        this.router.post('/generate-signal', this.generateNewSignal.bind(this));

        // Real-time updates
        this.router.get('/realtime-update', this.updateRealTimeData.bind(this));
    }

    /**
     * GET /market-indicators - Get real market indicators
     */
    async getMarketIndicators(req, res) {
        try {
            const marketIndicators = await this.realOperationsService.getMarketIndicators();

            res.json({
                success: true,
                data: marketIndicators,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Market indicators error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter indicadores de mercado',
                code: 'MARKET_INDICATORS_ERROR'
            });
        }
    }

    /**
     * GET /ai-decision - Get AI trading decision
     */
    async getAIDecision(req, res) {
        try {
            const language = req.query.language || 'pt';
            const aiDecision = await this.realOperationsService.getAIDecision(language);

            res.json({
                success: true,
                data: aiDecision,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ AI decision error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter decisão da IA',
                code: 'AI_DECISION_ERROR'
            });
        }
    }

    /**
     * GET /signals - Get trading signals
     */
    async getTradingSignals(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 20;

            const signals = await this.realOperationsService.getTradingSignals(userId, limit);

            res.json({
                success: true,
                data: signals,
                count: signals.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Trading signals error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter sinais de trading',
                code: 'TRADING_SIGNALS_ERROR'
            });
        }
    }

    /**
     * GET /top-signals - Get top 10 process signals
     */
    async getTopSignals(req, res) {
        try {
            const topSignals = await this.realOperationsService.getTopProcessSignals();

            res.json({
                success: true,
                data: topSignals,
                count: topSignals.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Top signals error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter top 10 sinais',
                code: 'TOP_SIGNALS_ERROR'
            });
        }
    }

    /**
     * GET /top-signals-test - Test endpoint for top 10 process signals (no auth)
     */
    async getTopSignalsTest(req, res) {
        try {
            const topSignals = await this.realOperationsService.getTopProcessSignals();

            res.json({
                success: true,
                data: topSignals,
                count: topSignals.length,
                timestamp: new Date().toISOString(),
                message: 'Top 10 process signals retrieved successfully'
            });
        } catch (error) {
            console.error('❌ Top signals test error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter top 10 sinais (test)',
                code: 'TOP_SIGNALS_TEST_ERROR'
            });
        }
    }

    /**
     * GET /positions - Get user positions
     */
    async getPositions(req, res) {
        try {
            const userId = req.user.id;
            const positions = await this.realOperationsService.getPositions(userId);

            res.json({
                success: true,
                data: positions,
                count: positions.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Positions error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter posições',
                code: 'POSITIONS_ERROR'
            });
        }
    }

    /**
     * GET /daily-stats - Get daily statistics
     */
    async getDailyStats(req, res) {
        try {
            const userId = req.user.id;
            const dailyStats = await this.realOperationsService.getDailyStats(userId);

            res.json({
                success: true,
                data: dailyStats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Daily stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter estatísticas diárias',
                code: 'DAILY_STATS_ERROR'
            });
        }
    }

    /**
     * GET /all - Get all operations data in one request
     */
    async getAllOperationsData(req, res) {
        try {
            const userId = req.user.id;
            const language = req.query.language || 'pt';
            
            // Fetch all data in parallel
            const [marketIndicators, aiDecision, signals, positions, dailyStats] = await Promise.all([
                this.realOperationsService.getMarketIndicators(),
                this.realOperationsService.getAIDecision(language),
                this.realOperationsService.getTradingSignals(userId, 20),
                this.realOperationsService.getPositions(userId),
                this.realOperationsService.getDailyStats(userId)
            ]);

            res.json({
                success: true,
                data: {
                    marketIndicators,
                    aiDecision,
                    signals,
                    positions,
                    dailyStats
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ All operations data error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter dados de operações',
                code: 'ALL_OPERATIONS_ERROR'
            });
        }
    }

    /**
     * POST /generate-signal - Generate a new trading signal
     */
    async generateNewSignal(req, res) {
        try {
            const userId = req.user.id;
            const newSignal = await this.realOperationsService.generateNewSignal(userId);

            res.json({
                success: true,
                data: newSignal,
                message: 'Novo sinal gerado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Generate signal error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao gerar novo sinal',
                code: 'GENERATE_SIGNAL_ERROR'
            });
        }
    }

    /**
     * GET /realtime-update - Update real-time data
     */
    async updateRealTimeData(req, res) {
        try {
            const updatedData = await this.realOperationsService.updateRealTimeData();

            res.json({
                success: true,
                data: updatedData,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Real-time update error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar dados em tempo real',
                code: 'REALTIME_UPDATE_ERROR'
            });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = OperationsRoutes;
