/**
 * 🚀 MAIN ROUTER - COINBITCLUB ENTERPRISE v6.0.0
 * Centralized route management
 */

const express = require('express');
const router = express.Router();

// Import route modules
const AuthRoutes = require('./auth');
const userRoutes = require('./user');
const userSettingsEnhancedRoutes = require('./user-settings-enhanced');
const tradingRoutes = require('./trading');
const financialRoutes = require('./financial');
const stripeRoutes = require('./stripe');
const affiliateRoutes = require('./affiliate');
const adminRoutes = require('./admin');

// Create auth routes instance
const authRoutes = new AuthRoutes();

// Function to set database pool manager for all routes
const setDbPoolManager = (dbPoolManager) => {
    authRoutes.setDbPoolManager(dbPoolManager);
    stripeRoutes.setDbPoolManager(dbPoolManager);
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
            affiliate: 'active',
            admin: 'active'
        }
    });
});

// Route modules
router.use('/auth', authRoutes.getRouter());
router.use('/user', userRoutes.getRouter());
router.use('/user-settings', userSettingsEnhancedRoutes.getRouter());
router.use('/trading', tradingRoutes.getRouter());
router.use('/financial', financialRoutes.getRouter());
router.use('/stripe', stripeRoutes.getRouter());
router.use('/affiliate', affiliateRoutes.getRouter());
router.use('/admin', adminRoutes.getRouter());

module.exports = { router, setDbPoolManager };

