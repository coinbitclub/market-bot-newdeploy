/**
 * 🔑 USER API KEYS ROUTES
 * API endpoints for users to manage their Bybit/Binance API keys
 *
 * IMPORTANT: Users MUST connect their own exchange API keys to trade.
 * System uses ONLY personal API keys - no admin/pooled trading.
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');
const UserAPIKeyManager = require('../services/user-api-keys/user-api-key-manager');

class UserAPIKeysRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.apiKeyManager = null;
        this.setupRoutes();
    }

    setDbPoolManager(dbPoolManager) {
        this.authMiddleware.setDbPoolManager(dbPoolManager);
        this.apiKeyManager = new UserAPIKeyManager(dbPoolManager);
    }

    setupRoutes() {
        // All routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // Get all API keys status (MUST be before /:exchange/status to avoid matching "all" as exchange)
        this.router.get('/all/status', this.getAllAPIKeysStatus.bind(this));

        // Set trading mode
        this.router.post('/trading-mode', this.setTradingMode.bind(this));

        // Get API key status for an exchange
        this.router.get('/:exchange/status', this.getAPIKeyStatus.bind(this));

        // Save/Update API key
        this.router.post('/:exchange', this.saveAPIKey.bind(this));

        // Verify API key
        this.router.post('/:exchange/verify', this.verifyAPIKey.bind(this));

        // Delete API key
        this.router.delete('/:exchange', this.deleteAPIKey.bind(this));
    }

    /**
     * GET /:exchange/status
     * Get API key status for a specific exchange
     */
    async getAPIKeyStatus(req, res) {
        try {
            const { exchange } = req.params;
            const userId = req.user?.id; // Assumes JWT middleware sets req.user

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            if (!['bybit', 'binance'].includes(exchange.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid exchange. Must be bybit or binance'
                });
            }

            const result = await this.apiKeyManager.getAPIKeyStatus(userId, exchange);

            res.json(result);

        } catch (error) {
            console.error('❌ Error getting API key status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get API key status'
            });
        }
    }

    /**
     * POST /:exchange
     * Save/Update API key for an exchange
     */
    async saveAPIKey(req, res) {
        try {
            const { exchange } = req.params;
            const { apiKey, apiSecret } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            if (!['bybit', 'binance'].includes(exchange.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid exchange. Must be bybit or binance'
                });
            }

            if (!apiKey || !apiSecret) {
                return res.status(400).json({
                    success: false,
                    error: 'Both apiKey and apiSecret are required'
                });
            }

            const result = await this.apiKeyManager.saveAPIKey(userId, exchange, apiKey, apiSecret);

            res.json(result);

        } catch (error) {
            console.error('❌ Error saving API key:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to save API key'
            });
        }
    }

    /**
     * POST /:exchange/verify
     * Verify API key with exchange
     */
    async verifyAPIKey(req, res) {
        try {
            const { exchange } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            if (!['bybit', 'binance'].includes(exchange.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid exchange. Must be bybit or binance'
                });
            }

            const result = await this.apiKeyManager.verifyAPIKey(userId, exchange);

            res.json(result);

        } catch (error) {
            console.error('❌ Error verifying API key:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to verify API key'
            });
        }
    }

    /**
     * DELETE /:exchange
     * Delete API key for an exchange
     */
    async deleteAPIKey(req, res) {
        try {
            const { exchange } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            if (!['bybit', 'binance'].includes(exchange.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid exchange. Must be bybit or binance'
                });
            }

            const result = await this.apiKeyManager.deleteAPIKey(userId, exchange);

            res.json(result);

        } catch (error) {
            console.error('❌ Error deleting API key:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete API key'
            });
        }
    }

    /**
     * GET /all/status
     * Get status for all exchanges
     */
    async getAllAPIKeysStatus(req, res) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check if API key manager is initialized
            if (!this.apiKeyManager) {
                console.error('❌ API Key Manager not initialized');
                return res.status(500).json({
                    success: false,
                    error: 'Service not initialized'
                });
            }

            const [bybitStatus, binanceStatus] = await Promise.all([
                this.apiKeyManager.getAPIKeyStatus(userId, 'bybit'),
                this.apiKeyManager.getAPIKeyStatus(userId, 'binance')
            ]);

            // Get trading mode
            const result = await this.apiKeyManager.dbPoolManager.executeRead(`
                SELECT trading_mode FROM users WHERE id = $1
            `, [userId]);

            const tradingMode = result.rows[0]?.trading_mode || 'POOLED';

            res.json({
                success: true,
                tradingMode,
                exchanges: {
                    bybit: bybitStatus.success ? bybitStatus : { has_key: false },
                    binance: binanceStatus.success ? binanceStatus : { has_key: false }
                }
            });

        } catch (error) {
            console.error('❌ Error getting all API keys status:', error);
            console.error('❌ Error stack:', error.stack);
            res.status(500).json({
                success: false,
                error: 'Failed to get API keys status',
                details: error.message
            });
        }
    }

    /**
     * POST /trading-mode
     * Set user's trading mode (POOLED, PERSONAL, HYBRID)
     */
    async setTradingMode(req, res) {
        try {
            const { mode } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            if (!mode) {
                return res.status(400).json({
                    success: false,
                    error: 'Trading mode is required'
                });
            }

            const result = await this.apiKeyManager.setTradingMode(userId, mode);

            res.json(result);

        } catch (error) {
            console.error('❌ Error setting trading mode:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to set trading mode'
            });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = UserAPIKeysRoutes;
