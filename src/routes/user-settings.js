/**
 * 🔧 USER SETTINGS ROUTES
 * API endpoints for user preferences and settings
 */

const express = require('express');
const router = express.Router();

class UserSettingsRoutes {
    constructor() {
        this.router = express.Router();
        this.dbPoolManager = null;

        this.setupRoutes();
    }

    setupRoutes() {
        // Get user's preferred exchange
        this.router.get('/exchange', this.getPreferredExchange.bind(this));

        // Update user's preferred exchange
        this.router.put('/exchange', this.updatePreferredExchange.bind(this));

        // Get all user's configured exchanges
        this.router.get('/exchanges', this.getConfiguredExchanges.bind(this));

        // Get user's mainnet balance (real-time from exchange)
        this.router.get('/balance', this.getMainnetBalance.bind(this));

        // Get user's trading settings
        this.router.get('/trading', this.getTradingSettings.bind(this));

        // Update user's trading settings
        this.router.put('/trading', this.updateTradingSettings.bind(this));
    }

    /**
     * Set database pool manager
     */
    setDbPoolManager(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
        console.log('✅ UserSettingsRoutes: Database pool manager set');
    }

    /**
     * GET /api/user/settings/exchange
     * Get user's preferred exchange
     */
    async getPreferredExchange(req, res) {
        try {
            const userId = req.user?.id || req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            const result = await this.dbPoolManager.executeRead(`
                SELECT id, email, username, preferred_exchange, trading_mode
                FROM users
                WHERE id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const user = result.rows[0];

            res.json({
                success: true,
                data: {
                    user_id: user.id,
                    preferred_exchange: user.preferred_exchange || 'bybit',
                    trading_mode: user.trading_mode
                }
            });

        } catch (error) {
            console.error('❌ Error getting preferred exchange:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get preferred exchange',
                message: error.message
            });
        }
    }

    /**
     * PUT /api/user/settings/exchange
     * Update user's preferred exchange
     */
    async updatePreferredExchange(req, res) {
        try {
            const userId = req.user?.id || req.userId;
            const { preferred_exchange } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            // Validate exchange
            const validExchanges = ['bybit', 'binance'];
            if (!preferred_exchange || !validExchanges.includes(preferred_exchange.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid exchange',
                    message: 'Exchange must be one of: bybit, binance'
                });
            }

            const exchangeLower = preferred_exchange.toLowerCase();

            // Check if user has API keys for this exchange
            const apiKeyCheck = await this.dbPoolManager.executeRead(`
                SELECT id, exchange, is_active, enabled, verified
                FROM user_api_keys
                WHERE user_id = $1
                AND exchange = $2
                AND is_active = TRUE
            `, [userId, exchangeLower]);

            if (apiKeyCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No API keys configured',
                    message: `Please add ${exchangeLower} API keys before setting it as preferred exchange`
                });
            }

            const apiKey = apiKeyCheck.rows[0];
            if (!apiKey.enabled || !apiKey.verified) {
                return res.status(400).json({
                    success: false,
                    error: 'API keys not ready',
                    message: `${exchangeLower} API keys must be enabled and verified`
                });
            }

            // Update preferred exchange
            const updateResult = await this.dbPoolManager.executeWrite(`
                UPDATE users
                SET preferred_exchange = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING id, email, preferred_exchange
            `, [exchangeLower, userId]);

            if (updateResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const user = updateResult.rows[0];

            console.log(`✅ User ${userId} switched preferred exchange to: ${exchangeLower}`);

            res.json({
                success: true,
                message: `Preferred exchange updated to ${exchangeLower}`,
                data: {
                    user_id: user.id,
                    preferred_exchange: user.preferred_exchange
                }
            });

        } catch (error) {
            console.error('❌ Error updating preferred exchange:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update preferred exchange',
                message: error.message
            });
        }
    }

    /**
     * GET /api/user/settings/exchanges
     * Get all configured exchanges for user
     */
    async getConfiguredExchanges(req, res) {
        try {
            const userId = req.user?.id || req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            const result = await this.dbPoolManager.executeRead(`
                SELECT
                    uak.id,
                    uak.exchange,
                    uak.api_key,
                    uak.is_active,
                    uak.enabled,
                    uak.verified,
                    uak.created_at,
                    u.preferred_exchange
                FROM user_api_keys uak
                INNER JOIN users u ON u.id = uak.user_id
                WHERE uak.user_id = $1
                ORDER BY uak.exchange, uak.created_at DESC
            `, [userId]);

            const preferredExchange = result.rows[0]?.preferred_exchange || 'bybit';

            const exchanges = result.rows.map(row => ({
                id: row.id,
                exchange: row.exchange,
                api_key_preview: row.api_key ? row.api_key.substring(0, 10) + '...' : null,
                is_active: row.is_active,
                enabled: row.enabled,
                verified: row.verified,
                is_preferred: row.exchange === preferredExchange,
                configured_at: row.created_at
            }));

            res.json({
                success: true,
                data: {
                    preferred_exchange: preferredExchange,
                    exchanges: exchanges,
                    total: exchanges.length
                }
            });

        } catch (error) {
            console.error('❌ Error getting configured exchanges:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get configured exchanges',
                message: error.message
            });
        }
    }

    /**
     * GET /api/user/settings/balance
     * Get user's mainnet balance (real-time from exchange)
     */
    async getMainnetBalance(req, res) {
        try {
            const userId = req.user?.id || req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            // Get user's preferred exchange and API keys
            const userResult = await this.dbPoolManager.executeRead(`
                SELECT
                    u.id,
                    u.preferred_exchange,
                    uak.exchange,
                    uak.api_key,
                    uak.api_secret
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.id = $1
                AND uak.exchange = u.preferred_exchange
                AND uak.is_active = TRUE
                AND uak.enabled = TRUE
                AND uak.verified = TRUE
            `, [userId]);

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'No active API keys found',
                    message: 'Please configure API keys for your preferred exchange'
                });
            }

            const user = userResult.rows[0];
            const exchange = user.preferred_exchange;

            // Fetch balance from exchange by creating service instance with user credentials
            let balanceData;
            try {
                if (exchange === 'bybit') {
                    const BybitService = require('../services/exchange/bybit-service');
                    const service = new BybitService();
                    service.apiKey = user.api_key;
                    service.apiSecret = user.api_secret;

                    const balance = await service.getWalletBalance('UNIFIED');
                    balanceData = this.parseBybitBalance(balance);
                } else if (exchange === 'binance') {
                    const BinanceService = require('../services/exchange/binance-service');
                    const service = new BinanceService();
                    service.apiKey = user.api_key;
                    service.apiSecret = user.api_secret;

                    const balance = await service.getAccountInfo();
                    balanceData = this.parseBinanceBalance(balance);
                } else {
                    throw new Error(`Unsupported exchange: ${exchange}`);
                }
            } catch (exchangeError) {
                console.error(`❌ Error fetching balance from ${exchange}:`, exchangeError);
                return res.status(503).json({
                    success: false,
                    error: 'Exchange API error',
                    message: `Failed to fetch balance from ${exchange}: ${exchangeError.message}`
                });
            }

            res.json({
                success: true,
                data: {
                    exchange: exchange,
                    ...balanceData,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Error getting mainnet balance:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get mainnet balance',
                message: error.message
            });
        }
    }

    /**
     * Parse Bybit balance response
     */
    parseBybitBalance(balance) {
        if (!balance || !balance.success) {
            return {
                total_equity: 0,
                available_balance: 0,
                in_orders: 0,
                coins: []
            };
        }

        // Handle Bybit V5 API response
        const walletData = balance.result?.list?.[0] || {};

        return {
            total_equity: parseFloat(walletData.totalEquity || 0),
            available_balance: parseFloat(walletData.totalAvailableBalance || 0),
            wallet_balance: parseFloat(walletData.totalWalletBalance || 0),
            margin_balance: parseFloat(walletData.totalMarginBalance || 0),
            in_orders: parseFloat(walletData.totalWalletBalance || 0) - parseFloat(walletData.totalAvailableBalance || 0),
            coins: (walletData.coin || [])
                .filter(c => parseFloat(c.walletBalance || 0) > 0)
                .map(c => ({
                    coin: c.coin,
                    wallet_balance: parseFloat(c.walletBalance),
                    available: parseFloat(c.availableToWithdraw),
                    equity: parseFloat(c.equity)
                }))
        };
    }

    /**
     * Parse Binance balance response
     */
    parseBinanceBalance(balance) {
        if (!balance || !balance.success) {
            return {
                total_equity: 0,
                available_balance: 0,
                in_orders: 0,
                coins: []
            };
        }

        const accountData = balance.result || {};
        const balances = accountData.balances || [];

        const totalEquity = balances.reduce((sum, b) => {
            return sum + parseFloat(b.free || 0) + parseFloat(b.locked || 0);
        }, 0);

        const availableBalance = balances.reduce((sum, b) => {
            return sum + parseFloat(b.free || 0);
        }, 0);

        return {
            total_equity: totalEquity,
            available_balance: availableBalance,
            in_orders: totalEquity - availableBalance,
            coins: balances
                .filter(b => parseFloat(b.free || 0) > 0 || parseFloat(b.locked || 0) > 0)
                .map(b => ({
                    coin: b.asset,
                    wallet_balance: parseFloat(b.free || 0) + parseFloat(b.locked || 0),
                    available: parseFloat(b.free || 0),
                    locked: parseFloat(b.locked || 0)
                }))
        };
    }

    /**
     * GET /api/user/settings/trading
     * Get user's trading settings
     */
    async getTradingSettings(req, res) {
        try {
            const userId = req.user?.id || req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            const result = await this.dbPoolManager.executeRead(`
                SELECT
                    id, email, username,
                    trading_mode,
                    risk_level,
                    max_open_positions,
                    default_leverage,
                    balance_real_brl,
                    balance_real_usd
                FROM users
                WHERE id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const user = result.rows[0];

            res.json({
                success: true,
                data: {
                    trading_mode: user.trading_mode,
                    risk_level: user.risk_level,
                    max_open_positions: user.max_open_positions,
                    default_leverage: parseFloat(user.default_leverage || 1),
                    balance_brl: parseFloat(user.balance_real_brl || 0),
                    balance_usd: parseFloat(user.balance_real_usd || 0)
                }
            });

        } catch (error) {
            console.error('❌ Error getting trading settings:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get trading settings',
                message: error.message
            });
        }
    }

    /**
     * PUT /api/user/settings/trading
     * Update user's trading settings
     */
    async updateTradingSettings(req, res) {
        try {
            const userId = req.user?.id || req.userId;
            const { risk_level, max_open_positions, default_leverage } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            // Validate inputs
            const updates = [];
            const values = [];
            let paramCount = 1;

            if (risk_level !== undefined) {
                const validRiskLevels = ['low', 'medium', 'high', 'very_high'];
                if (!validRiskLevels.includes(risk_level)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid risk_level',
                        message: 'Must be one of: low, medium, high, very_high'
                    });
                }
                updates.push(`risk_level = $${paramCount++}`);
                values.push(risk_level);
            }

            if (max_open_positions !== undefined) {
                const maxPos = parseInt(max_open_positions);
                if (isNaN(maxPos) || maxPos < 1 || maxPos > 10) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid max_open_positions',
                        message: 'Must be between 1 and 10'
                    });
                }
                updates.push(`max_open_positions = $${paramCount++}`);
                values.push(maxPos);
            }

            if (default_leverage !== undefined) {
                const leverage = parseFloat(default_leverage);
                if (isNaN(leverage) || leverage < 1 || leverage > 125) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid default_leverage',
                        message: 'Must be between 1 and 125'
                    });
                }
                updates.push(`default_leverage = $${paramCount++}`);
                values.push(leverage);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No valid updates provided'
                });
            }

            updates.push(`updated_at = NOW()`);
            values.push(userId);

            const updateQuery = `
                UPDATE users
                SET ${updates.join(', ')}
                WHERE id = $${paramCount}
                RETURNING id, risk_level, max_open_positions, default_leverage
            `;

            const result = await this.dbPoolManager.executeWrite(updateQuery, values);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const user = result.rows[0];

            console.log(`✅ User ${userId} updated trading settings`);

            res.json({
                success: true,
                message: 'Trading settings updated successfully',
                data: {
                    risk_level: user.risk_level,
                    max_open_positions: user.max_open_positions,
                    default_leverage: parseFloat(user.default_leverage)
                }
            });

        } catch (error) {
            console.error('❌ Error updating trading settings:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update trading settings',
                message: error.message
            });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = UserSettingsRoutes;
