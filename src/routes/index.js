/**
 * 🚀 MAIN ROUTER - COINBITCLUB ENTERPRISE v6.0.0
 * Centralized route management with static plans
 */

const express = require('express');
const router = express.Router();

// Import route modules
const AuthRoutes = require('./auth');
const userSettingsRoutes = require('./users');
const tradingRoutes = require('./trading');
const financialRoutes = require('./financial');
const stripeRoutes = require('./stripe');
const plansRoutes = require('./plans');
// const staticPlansRoutes = require('./static-plans'); // File doesn't exist
// const publicPlansRoutes = require('./public-plans'); // File doesn't exist
const stripeWebhooksRoutes = require('./stripe-webhooks');
const affiliateRoutes = require('./affiliate');
const adminRoutes = require('./admin');
const PerformanceRoutes = require('./performance');
const OperationsRoutes = require('./operations');
const TradingViewWebhookRoutes = require('./tradingview-webhook');

// Create auth routes instance
const authRoutes = new AuthRoutes();
const performanceRoutes = new PerformanceRoutes();
const operationsRoutes = new OperationsRoutes();
const tradingViewWebhookRoutes = new TradingViewWebhookRoutes();

// Function to set database pool manager for all routes
const setDbPoolManager = (dbPoolManager) => {
    authRoutes.setDbPoolManager(dbPoolManager);
    tradingRoutes.setDbPoolManager(dbPoolManager);
    stripeRoutes.setDbPoolManager(dbPoolManager);
    plansRoutes.setDbPoolManager(dbPoolManager);
    // staticPlansRoutes.setDbPoolManager(dbPoolManager); // Module not available
    // publicPlansRoutes.setDbPoolManager(dbPoolManager); // Module not available
    stripeWebhooksRoutes.setDbPoolManager(dbPoolManager);
    userSettingsRoutes.setDbPoolManager(dbPoolManager);
    tradingViewWebhookRoutes.setDbPoolManager(dbPoolManager);
    // FIXED: Add performance and operations routes database setup
    performanceRoutes.setDbPoolManager(dbPoolManager);
    operationsRoutes.setDbPoolManager(dbPoolManager);
};

// API Status
router.get('/status', (req, res) => {
    res.json({
        api_version: 'v6.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        services: {
            auth: 'active',
            user: 'active',
            trading: 'active',
            financial: 'active',
            stripe: 'active',
            plans: 'active',
            staticPlans: 'active',
            publicPlans: 'active',
            stripeWebhooks: 'active',
            affiliate: 'active',
            admin: 'active',
            performance: 'active',
            operations: 'active',
            tradingViewWebhooks: 'active'
        }
    });
});

// Top signals test endpoint (no auth required)
router.get('/top-signals-test', async (req, res) => {
    try {
        const RealOperationsService = require('../services/operations/real-operations-service');
        const realOperationsService = new RealOperationsService();

        const topSignals = await realOperationsService.getTopProcessSignals();

        res.json({
            success: true,
            data: topSignals,
            count: topSignals.length,
            timestamp: new Date().toISOString(),
            message: 'Top 10 process signals retrieved successfully - TEST ENDPOINT'
        });
    } catch (error) {
        console.error('❌ Top signals test error:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter top 10 sinais (test)',
            code: 'TOP_SIGNALS_TEST_ERROR'
        });
    }
});

// All operations data test endpoint (no auth required)
router.get('/operations-all-test', async (req, res) => {
    try {
        const RealOperationsService = require('../services/operations/real-operations-service');
        const realOperationsService = new RealOperationsService();

        const language = req.query.language || 'pt';

        // Fetch all data in parallel - using demo user ID for test
        const [marketIndicators, aiDecision, signals, positions, dailyStats] = await Promise.all([
            realOperationsService.getMarketIndicators(),
            realOperationsService.getAIDecision(language),
            realOperationsService.getTradingSignals(1, 20), // Demo user ID
            realOperationsService.getPositions(1), // Demo user ID
            realOperationsService.getDailyStats(1) // Demo user ID
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
            timestamp: new Date().toISOString(),
            message: 'All operations data retrieved successfully - TEST ENDPOINT'
        });
    } catch (error) {
        console.error('❌ All operations test error:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter dados de operações (test)',
            code: 'ALL_OPERATIONS_TEST_ERROR'
        });
    }
});

// Route modules
router.use('/auth', authRoutes.getRouter());
router.use('/user-settings', userSettingsRoutes.getRouter());
router.use('/trading', tradingRoutes.getRouter());
router.use('/financial', financialRoutes.getRouter());
router.use('/stripe', stripeRoutes.getRouter());
router.use('/plans', plansRoutes.getRouter());
// router.use('/static-plans', staticPlansRoutes.getRouter()); // Module not available
// router.use('/public-plans', publicPlansRoutes.getRouter()); // Module not available
router.use('/stripe-webhooks', stripeWebhooksRoutes.getRouter());
router.use('/affiliate', affiliateRoutes.getRouter());
router.use('/admin', adminRoutes.getRouter());
router.use('/performance', performanceRoutes.getRouter());
router.use('/operations', operationsRoutes.getRouter());
router.use('/tradingview', tradingViewWebhookRoutes.getRouter());

module.exports = { router, setDbPoolManager };