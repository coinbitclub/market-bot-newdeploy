/**
 * 🚀 MAIN ROUTER - COINBITCLUB ENTERPRISE v6.0.0
 * Centralized route management with static plans
 */

const express = require('express');
const router = express.Router();

// Import route modules
const AuthRoutes = require('./auth');
const userSettingsRoutes = require('./users');
// const UserExchangeSettingsRoutes = require('./user-settings'); // DEPRECATED: Merged into users.js
const tradingRoutes = require('./trading');
const financialRoutes = require('./financial');
const stripeRoutes = require('./stripe');
const plansRoutes = require('./plans');
// const staticPlansRoutes = require('./static-plans'); // File doesn't exist
// const publicPlansRoutes = require('./public-plans'); // File doesn't exist
// const stripeWebhooksRoutes = require('./stripe-webhooks'); // MIGRATED: Merged into stripe.js
const affiliateRoutes = require('./affiliate');
const adminRoutes = require('./admin');
const PerformanceRoutes = require('./performance');
const OperationsRoutes = require('./operations');
const TradingViewWebhookRoutes = require('./tradingview-webhook');
const UserAPIKeysRoutes = require('./user-api-keys');
const EmergencyMigrationRoute = require('./run-emergency-migration');
const PositionsRoutes = require('./positions');

// Create auth routes instance
const authRoutes = new AuthRoutes();
// const userExchangeSettingsRoutes = new UserExchangeSettingsRoutes(); // DEPRECATED: Merged into users.js
const performanceRoutes = new PerformanceRoutes();
const operationsRoutes = new OperationsRoutes();
const tradingViewWebhookRoutes = new TradingViewWebhookRoutes();
const userAPIKeysRoutes = new UserAPIKeysRoutes();
const emergencyMigrationRoute = new EmergencyMigrationRoute();
const positionsRoutes = new PositionsRoutes();

// Function to set database pool manager for all routes
const setDbPoolManager = (dbPoolManager) => {
    authRoutes.setDbPoolManager(dbPoolManager);
    tradingRoutes.setDbPoolManager(dbPoolManager);
    stripeRoutes.setDbPoolManager(dbPoolManager);
    plansRoutes.setDbPoolManager(dbPoolManager);
    // staticPlansRoutes.setDbPoolManager(dbPoolManager); // Module not available
    // publicPlansRoutes.setDbPoolManager(dbPoolManager); // Module not available
    // stripeWebhooksRoutes.setDbPoolManager(dbPoolManager); // MIGRATED: Merged into stripe.js
    userSettingsRoutes.setDbPoolManager(dbPoolManager);
    // userExchangeSettingsRoutes.setDbPoolManager(dbPoolManager); // DEPRECATED: Merged into users.js
    tradingViewWebhookRoutes.setDbPoolManager(dbPoolManager);
    // FIXED: Add performance and operations routes database setup
    performanceRoutes.setDbPoolManager(dbPoolManager);
    operationsRoutes.setDbPoolManager(dbPoolManager);
    userAPIKeysRoutes.setDbPoolManager(dbPoolManager);
    emergencyMigrationRoute.setDbPoolManager(dbPoolManager);
    affiliateRoutes.setDbPoolManager(dbPoolManager);
    adminRoutes.setDbPoolManager(dbPoolManager);
    positionsRoutes.setDbPoolManager(dbPoolManager);

    // Connect affiliate service to auth routes for referral tracking
    if (affiliateRoutes.affiliateService) {
        authRoutes.setAffiliateService(affiliateRoutes.affiliateService);
    }
};

// Function to set hybrid services for position management
const setHybridServices = (positionManagementService, reconciliationService) => {
    if (positionsRoutes && positionsRoutes.setPositionManagementService) {
        positionsRoutes.setPositionManagementService(positionManagementService);
        positionsRoutes.setReconciliationService(reconciliationService);
        console.log('✅ Hybrid services connected to positions routes');
    }

    // Inject position management service to operations routes
    if (operationsRoutes && operationsRoutes.realOperationsService) {
        operationsRoutes.realOperationsService.setPositionManagementService(positionManagementService);
        console.log('✅ Hybrid services connected to operations routes');
    }
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
            userExchangeSettings: 'active',
            trading: 'active',
            financial: 'active',
            stripe: 'active',
            plans: 'active',
            staticPlans: 'active',
            publicPlans: 'active',
            // stripeWebhooks: 'active', // MIGRATED: Merged into stripe.js
            affiliate: 'active',
            admin: 'active',
            performance: 'active',
            operations: 'active',
            tradingViewWebhooks: 'active',
            userAPIKeys: 'active',
            positions: 'active'
        },
        tradingMode: 'PERSONAL',
        hybridPositionManagement: 'enabled',
        note: 'Users must connect their own Bybit/Binance API keys to trade. Real-time positions from exchange via /api/positions/*'
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
// router.use('/user/settings', userExchangeSettingsRoutes.getRouter()); // DEPRECATED: Merged into users.js
router.use('/trading', tradingRoutes.getRouter());
router.use('/financial', financialRoutes.getRouter());
router.use('/stripe', stripeRoutes.getRouter());
router.use('/plans', plansRoutes.getRouter());
// router.use('/static-plans', staticPlansRoutes.getRouter()); // Module not available
// router.use('/public-plans', publicPlansRoutes.getRouter()); // Module not available
// router.use('/stripe-webhooks', stripeWebhooksRoutes.getRouter()); // MIGRATED: Merged into stripe.js
router.use('/affiliate', affiliateRoutes.getRouter());
router.use('/admin', adminRoutes.getRouter());
router.use('/performance', performanceRoutes.getRouter());
router.use('/operations', operationsRoutes.getRouter());
router.use('/tradingview', tradingViewWebhookRoutes.getRouter());
router.use('/user-api-keys', userAPIKeysRoutes.getRouter());
router.use('/emergency-migration', emergencyMigrationRoute.getRouter());
router.use('/positions', positionsRoutes.getRouter());

module.exports = { router, setDbPoolManager, setHybridServices };