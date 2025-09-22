/**
 * 👤 ENHANCED USER SETTINGS ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * Comprehensive user settings management with database integration
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');

class UserSettingsEnhancedRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.setupRoutes();
    }

    setupRoutes() {
        // All routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // User settings routes
        this.router.get('/trading', this.getTradingSettings.bind(this));
        this.router.put('/trading', this.updateTradingSettings.bind(this));
        this.router.get('/notifications', this.getNotificationSettings.bind(this));
        this.router.put('/notifications', this.updateNotificationSettings.bind(this));
        this.router.get('/personal', this.getPersonalSettings.bind(this));
        this.router.put('/personal', this.updatePersonalSettings.bind(this));
        this.router.get('/banking', this.getBankingSettings.bind(this));
        this.router.put('/banking', this.updateBankingSettings.bind(this));
        this.router.get('/security', this.getSecuritySettings.bind(this));
        this.router.put('/security', this.updateSecuritySettings.bind(this));
        this.router.get('/api-keys', this.getApiKeys.bind(this));
        this.router.post('/api-keys', this.addApiKey.bind(this));
        this.router.put('/api-keys/:id', this.updateApiKey.bind(this));
        this.router.delete('/api-keys/:id', this.deleteApiKey.bind(this));
        this.router.get('/preferences', this.getPreferences.bind(this));
        this.router.put('/preferences', this.updatePreferences.bind(this));
        
        // Combined settings endpoints
        this.router.get('/all', this.getAllSettings.bind(this));
        this.router.put('/all', this.updateAllSettings.bind(this));
    }

    /**
     * GET /trading - Get user trading settings
     */
    async getTradingSettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_trading_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultTradingSettings(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_trading_settings WHERE user_id = $1',
                    [req.user.id]
                );
                return res.json({
                    success: true,
                    settings: defaultResult.rows[0]
                });
            }

            res.json({
                success: true,
                settings: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Get trading settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get trading settings' 
            });
        }
    }

    /**
     * PUT /trading - Update user trading settings
     */
    async updateTradingSettings(req, res) {
        try {
            const {
                max_leverage,
                take_profit_percentage,
                stop_loss_percentage,
                position_size_percentage,
                risk_level,
                auto_trade_enabled,
                daily_loss_limit_percentage,
                max_open_positions,
                default_leverage,
                stop_loss_multiplier,
                take_profit_multiplier
            } = req.body;

            // Validate trading settings
            const validation = this.validateTradingSettings(req.body);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_trading_settings (
                    user_id, max_leverage, take_profit_percentage, stop_loss_percentage,
                    position_size_percentage, risk_level, auto_trade_enabled,
                    daily_loss_limit_percentage, max_open_positions, default_leverage,
                    stop_loss_multiplier, take_profit_multiplier, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    max_leverage = EXCLUDED.max_leverage,
                    take_profit_percentage = EXCLUDED.take_profit_percentage,
                    stop_loss_percentage = EXCLUDED.stop_loss_percentage,
                    position_size_percentage = EXCLUDED.position_size_percentage,
                    risk_level = EXCLUDED.risk_level,
                    auto_trade_enabled = EXCLUDED.auto_trade_enabled,
                    daily_loss_limit_percentage = EXCLUDED.daily_loss_limit_percentage,
                    max_open_positions = EXCLUDED.max_open_positions,
                    default_leverage = EXCLUDED.default_leverage,
                    stop_loss_multiplier = EXCLUDED.stop_loss_multiplier,
                    take_profit_multiplier = EXCLUDED.take_profit_multiplier,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, max_leverage, take_profit_percentage, stop_loss_percentage,
                    position_size_percentage, risk_level, auto_trade_enabled,
                    daily_loss_limit_percentage, max_open_positions, default_leverage,
                    stop_loss_multiplier, take_profit_multiplier
                ]
            );

            res.json({
                success: true,
                message: 'Trading settings updated successfully',
                settings: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Update trading settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update trading settings' 
            });
        }
    }

    /**
     * GET /all - Get all user settings
     */
    async getAllSettings(req, res) {
        try {
            const [
                tradingResult,
                notificationResult,
                personalResult,
                bankingResult,
                securityResult,
                apiKeysResult,
                preferencesResult
            ] = await Promise.all([
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_trading_settings WHERE user_id = $1',
                    [req.user.id]
                ),
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_notification_settings WHERE user_id = $1',
                    [req.user.id]
                ),
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_personal_settings WHERE user_id = $1',
                    [req.user.id]
                ),
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_banking_settings WHERE user_id = $1',
                    [req.user.id]
                ),
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_security_settings WHERE user_id = $1',
                    [req.user.id]
                ),
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_api_keys_enhanced WHERE user_id = $1 ORDER BY created_at DESC',
                    [req.user.id]
                ),
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_preferences WHERE user_id = $1',
                    [req.user.id]
                )
            ]);

            // Create default settings if they don't exist
            if (tradingResult.rows.length === 0) {
                await this.createDefaultTradingSettings(req.user.id);
                const defaultTrading = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_trading_settings WHERE user_id = $1',
                    [req.user.id]
                );
                tradingResult.rows = defaultTrading.rows;
            }

            if (notificationResult.rows.length === 0) {
                await this.createDefaultNotificationSettings(req.user.id);
                const defaultNotification = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_notification_settings WHERE user_id = $1',
                    [req.user.id]
                );
                notificationResult.rows = defaultNotification.rows;
            }

            if (personalResult.rows.length === 0) {
                await this.createDefaultPersonalSettings(req.user.id);
                const defaultPersonal = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_personal_settings WHERE user_id = $1',
                    [req.user.id]
                );
                personalResult.rows = defaultPersonal.rows;
            }

            if (securityResult.rows.length === 0) {
                await this.createDefaultSecuritySettings(req.user.id);
                const defaultSecurity = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_security_settings WHERE user_id = $1',
                    [req.user.id]
                );
                securityResult.rows = defaultSecurity.rows;
            }

            if (preferencesResult.rows.length === 0) {
                await this.createDefaultPreferences(req.user.id);
                const defaultPreferences = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_preferences WHERE user_id = $1',
                    [req.user.id]
                );
                preferencesResult.rows = defaultPreferences.rows;
            }

            // Hide sensitive data
            const apiKeys = apiKeysResult.rows.map(key => ({
                ...key,
                api_key: key.api_key ? key.api_key.replace(/(.{8}).*(.{4})/, '$1****$2') : null,
                api_secret: key.api_secret ? '****' + key.api_secret.slice(-4) : null
            }));

            const banking = bankingResult.rows[0];
            if (banking && banking.api_key) {
                banking.api_key = banking.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            }

            const security = securityResult.rows[0];
            if (security && security.two_factor_secret) {
                security.two_factor_secret = security.two_factor_secret.replace(/(.{4}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                settings: {
                    trading: tradingResult.rows[0],
                    notifications: notificationResult.rows[0],
                    personal: personalResult.rows[0],
                    banking: banking || null,
                    security: security,
                    apiKeys,
                    preferences: preferencesResult.rows[0]
                }
            });
        } catch (error) {
            console.error('❌ Get all settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get all settings' 
            });
        }
    }

    // Placeholder methods for other endpoints
    async getNotificationSettings(req, res) {
        res.json({ success: true, settings: {} });
    }

    async updateNotificationSettings(req, res) {
        res.json({ success: true, message: 'Updated' });
    }

    async getPersonalSettings(req, res) {
        res.json({ success: true, settings: {} });
    }

    async updatePersonalSettings(req, res) {
        res.json({ success: true, message: 'Updated' });
    }

    async getBankingSettings(req, res) {
        res.json({ success: true, settings: null });
    }

    async updateBankingSettings(req, res) {
        res.json({ success: true, message: 'Updated' });
    }

    async getSecuritySettings(req, res) {
        res.json({ success: true, settings: {} });
    }

    async updateSecuritySettings(req, res) {
        res.json({ success: true, message: 'Updated' });
    }

    async getApiKeys(req, res) {
        res.json({ success: true, apiKeys: [] });
    }

    async addApiKey(req, res) {
        res.json({ success: true, message: 'Added' });
    }

    async updateApiKey(req, res) {
        res.json({ success: true, message: 'Updated' });
    }

    async deleteApiKey(req, res) {
        res.json({ success: true, message: 'Deleted' });
    }

    async getPreferences(req, res) {
        res.json({ success: true, preferences: {} });
    }

    async updatePreferences(req, res) {
        res.json({ success: true, message: 'Updated' });
    }

    async updateAllSettings(req, res) {
        res.json({ success: true, message: 'All settings updated' });
    }

    // Helper methods for creating default settings
    async createDefaultTradingSettings(userId) {
        await this.authMiddleware.dbPoolManager.executeWrite(
            `INSERT INTO user_trading_settings (
                user_id, max_leverage, take_profit_percentage, stop_loss_percentage,
                position_size_percentage, risk_level, auto_trade_enabled,
                daily_loss_limit_percentage, max_open_positions, default_leverage,
                stop_loss_multiplier, take_profit_multiplier
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [userId, 5, 15.00, 10.00, 30, 'medium', true, 10, 2, 5, 2.00, 3.00]
        );
    }

    async createDefaultNotificationSettings(userId) {
        await this.authMiddleware.dbPoolManager.executeWrite(
            `INSERT INTO user_notification_settings (
                user_id, email_notifications, sms_notifications, push_notifications,
                trade_alerts, report_frequency, profit_threshold_percentage,
                loss_threshold_percentage
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [userId, true, false, true, true, 'daily', 5.00, 10.00]
        );
    }

    async createDefaultPersonalSettings(userId) {
        await this.authMiddleware.dbPoolManager.executeWrite(
            `INSERT INTO user_personal_settings (
                user_id, language, timezone, currency_preference, theme, date_format
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, 'pt-BR', 'America/Sao_Paulo', 'BRL', 'dark', 'DD/MM/YYYY']
        );
    }

    async createDefaultSecuritySettings(userId) {
        await this.authMiddleware.dbPoolManager.executeWrite(
            `INSERT INTO user_security_settings (
                user_id, two_factor_enabled, login_notifications, device_management,
                session_timeout_minutes, password_change_required
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, false, true, false, 1440, false]
        );
    }

    async createDefaultPreferences(userId) {
        await this.authMiddleware.dbPoolManager.executeWrite(
            `INSERT INTO user_preferences (
                user_id, dashboard_layout, widget_preferences, chart_preferences,
                alert_sounds, auto_refresh, refresh_interval_seconds
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                userId,
                '{"layout": "default", "widgets": ["balance", "positions", "performance"]}',
                '{"balance": true, "positions": true, "performance": true, "news": false}',
                '{"theme": "dark", "timeframe": "1h", "indicators": ["sma", "ema"]}',
                true, true, 30
            ]
        );
    }

    // Validation methods
    validateTradingSettings(settings) {
        if (settings.max_leverage && (settings.max_leverage < 1 || settings.max_leverage > 10)) {
            return { valid: false, error: 'Max leverage must be between 1 and 10' };
        }

        if (settings.position_size_percentage && (settings.position_size_percentage < 10 || settings.position_size_percentage > 50)) {
            return { valid: false, error: 'Position size must be between 10% and 50%' };
        }

        if (settings.risk_level && !['low', 'medium', 'high'].includes(settings.risk_level)) {
            return { valid: false, error: 'Risk level must be low, medium, or high' };
        }

        return { valid: true };
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new UserSettingsEnhancedRoutes();
