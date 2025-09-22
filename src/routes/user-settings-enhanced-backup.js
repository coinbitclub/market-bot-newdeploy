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
                // Create default settings if none exist
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
     * GET /notifications - Get user notification settings
     */
    async getNotificationSettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_notification_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultNotificationSettings(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_notification_settings WHERE user_id = $1',
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
            console.error('❌ Get notification settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get notification settings' 
            });
        }
    }

    /**
     * PUT /notifications - Update user notification settings
     */
    async updateNotificationSettings(req, res) {
        try {
            const {
                email_notifications,
                sms_notifications,
                push_notifications,
                trade_alerts,
                report_frequency,
                profit_threshold_percentage,
                loss_threshold_percentage
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_notification_settings (
                    user_id, email_notifications, sms_notifications, push_notifications,
                    trade_alerts, report_frequency, profit_threshold_percentage,
                    loss_threshold_percentage, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    email_notifications = EXCLUDED.email_notifications,
                    sms_notifications = EXCLUDED.sms_notifications,
                    push_notifications = EXCLUDED.push_notifications,
                    trade_alerts = EXCLUDED.trade_alerts,
                    report_frequency = EXCLUDED.report_frequency,
                    profit_threshold_percentage = EXCLUDED.profit_threshold_percentage,
                    loss_threshold_percentage = EXCLUDED.loss_threshold_percentage,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, email_notifications, sms_notifications, push_notifications,
                    trade_alerts, report_frequency, profit_threshold_percentage,
                    loss_threshold_percentage
                ]
            );

            res.json({
                success: true,
                message: 'Notification settings updated successfully',
                settings: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Update notification settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update notification settings' 
            });
        }
    }

    /**
     * GET /personal - Get user personal settings
     */
    async getPersonalSettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_personal_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultPersonalSettings(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_personal_settings WHERE user_id = $1',
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
            console.error('❌ Get personal settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get personal settings' 
            });
        }
    }

    /**
     * PUT /personal - Update user personal settings
     */
    async updatePersonalSettings(req, res) {
        try {
            const {
                language,
                timezone,
                currency_preference,
                theme,
                date_format
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_personal_settings (
                    user_id, language, timezone, currency_preference, theme, date_format, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    language = EXCLUDED.language,
                    timezone = EXCLUDED.timezone,
                    currency_preference = EXCLUDED.currency_preference,
                    theme = EXCLUDED.theme,
                    date_format = EXCLUDED.date_format,
                    updated_at = NOW()
                RETURNING *`,
                [req.user.id, language, timezone, currency_preference, theme, date_format]
            );

            res.json({
                success: true,
                message: 'Personal settings updated successfully',
                settings: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Update personal settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update personal settings' 
            });
        }
    }

    /**
     * GET /banking - Get user banking settings
     */
    async getBankingSettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_banking_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                return res.json({
                    success: true,
                    settings: null
                });
            }

            // Hide sensitive data
            const settings = result.rows[0];
            if (settings.api_key) {
                settings.api_key = settings.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                settings
            });
        } catch (error) {
            console.error('❌ Get banking settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get banking settings' 
            });
        }
    }

    /**
     * PUT /banking - Update user banking settings
     */
    async updateBankingSettings(req, res) {
        try {
            const {
                pix_key,
                pix_type,
                bank_name,
                bank_code,
                agency,
                account,
                account_type,
                account_holder_name,
                cpf,
                phone
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_banking_settings (
                    user_id, pix_key, pix_type, bank_name, bank_code, agency,
                    account, account_type, account_holder_name, cpf, phone, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    pix_key = EXCLUDED.pix_key,
                    pix_type = EXCLUDED.pix_type,
                    bank_name = EXCLUDED.bank_name,
                    bank_code = EXCLUDED.bank_code,
                    agency = EXCLUDED.agency,
                    account = EXCLUDED.account,
                    account_type = EXCLUDED.account_type,
                    account_holder_name = EXCLUDED.account_holder_name,
                    cpf = EXCLUDED.cpf,
                    phone = EXCLUDED.phone,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, pix_key, pix_type, bank_name, bank_code, agency,
                    account, account_type, account_holder_name, cpf, phone
                ]
            );

            // Hide sensitive data in response
            const settings = result.rows[0];
            if (settings.api_key) {
                settings.api_key = settings.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                message: 'Banking settings updated successfully',
                settings
            });
        } catch (error) {
            console.error('❌ Update banking settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update banking settings' 
            });
        }
    }

    /**
     * GET /security - Get user security settings
     */
    async getSecuritySettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_security_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultSecuritySettings(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_security_settings WHERE user_id = $1',
                    [req.user.id]
                );
                return res.json({
                    success: true,
                    settings: defaultResult.rows[0]
                });
            }

            // Hide sensitive data
            const settings = result.rows[0];
            if (settings.two_factor_secret) {
                settings.two_factor_secret = settings.two_factor_secret.replace(/(.{4}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                settings
            });
        } catch (error) {
            console.error('❌ Get security settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get security settings' 
            });
        }
    }

    /**
     * PUT /security - Update user security settings
     */
    async updateSecuritySettings(req, res) {
        try {
            const {
                two_factor_enabled,
                login_notifications,
                device_management,
                session_timeout_minutes,
                password_change_required
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_security_settings (
                    user_id, two_factor_enabled, login_notifications, device_management,
                    session_timeout_minutes, password_change_required, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    two_factor_enabled = EXCLUDED.two_factor_enabled,
                    login_notifications = EXCLUDED.login_notifications,
                    device_management = EXCLUDED.device_management,
                    session_timeout_minutes = EXCLUDED.session_timeout_minutes,
                    password_change_required = EXCLUDED.password_change_required,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, two_factor_enabled, login_notifications, device_management,
                    session_timeout_minutes, password_change_required
                ]
            );

            // Hide sensitive data in response
            const settings = result.rows[0];
            if (settings.two_factor_secret) {
                settings.two_factor_secret = settings.two_factor_secret.replace(/(.{4}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                message: 'Security settings updated successfully',
                settings
            });
        } catch (error) {
            console.error('❌ Update security settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update security settings' 
            });
        }
    }

    /**
     * GET /api-keys - Get user API keys
     */
    async getApiKeys(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_api_keys_enhanced WHERE user_id = $1 ORDER BY created_at DESC',
                [req.user.id]
            );

            // Hide sensitive data
            const apiKeys = result.rows.map(key => ({
                ...key,
                api_key: key.api_key.replace(/(.{8}).*(.{4})/, '$1****$2'),
                api_secret: '****' + key.api_secret.slice(-4)
            }));

            res.json({
                success: true,
                apiKeys
            });
        } catch (error) {
            console.error('❌ Get API keys error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get API keys' 
            });
        }
    }

    /**
     * POST /api-keys - Add new API key
     */
    async addApiKey(req, res) {
        try {
            const {
                exchange,
                api_key,
                api_secret,
                passphrase,
                environment,
                permissions
            } = req.body;

            // Validate API key data
            if (!exchange || !api_key || !api_secret) {
                return res.status(400).json({
                    success: false,
                    error: 'Exchange, API key, and API secret are required'
                });
            }

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_api_keys_enhanced (
                    user_id, exchange, api_key, api_secret, passphrase, environment, permissions, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (user_id, exchange, environment) DO UPDATE SET
                    api_key = EXCLUDED.api_key,
                    api_secret = EXCLUDED.api_secret,
                    passphrase = EXCLUDED.passphrase,
                    permissions = EXCLUDED.permissions,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, exchange, api_key, api_secret, passphrase, 
                    environment || 'testnet', permissions || '{}'
                ]
            );

            // Hide sensitive data in response
            const apiKey = result.rows[0];
            apiKey.api_key = apiKey.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            apiKey.api_secret = '****' + apiKey.api_secret.slice(-4);

            res.json({
                success: true,
                message: 'API key added successfully',
                apiKey
            });
        } catch (error) {
            console.error('❌ Add API key error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to add API key' 
            });
        }
    }

    /**
     * PUT /api-keys/:id - Update API key
     */
    async updateApiKey(req, res) {
        try {
            const { id } = req.params;
            const { is_active, permissions } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                'UPDATE user_api_keys_enhanced SET is_active = $1, permissions = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
                [is_active, permissions, id, req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'API key not found'
                });
            }

            // Hide sensitive data in response
            const apiKey = result.rows[0];
            apiKey.api_key = apiKey.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            apiKey.api_secret = '****' + apiKey.api_secret.slice(-4);

            res.json({
                success: true,
                message: 'API key updated successfully',
                apiKey
            });
        } catch (error) {
            console.error('❌ Update API key error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update API key' 
            });
        }
    }

    /**
     * DELETE /api-keys/:id - Delete API key
     */
    async deleteApiKey(req, res) {
        try {
            const { id } = req.params;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                'DELETE FROM user_api_keys_enhanced WHERE id = $1 AND user_id = $2 RETURNING *',
                [id, req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'API key not found'
                });
            }

            res.json({
                success: true,
                message: 'API key deleted successfully'
            });
        } catch (error) {
            console.error('❌ Delete API key error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to delete API key' 
            });
        }
    }

    /**
     * GET /preferences - Get user preferences
     */
    async getPreferences(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_preferences WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultPreferences(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_preferences WHERE user_id = $1',
                    [req.user.id]
                );
                return res.json({
                    success: true,
                    preferences: defaultResult.rows[0]
                });
            }

            res.json({
                success: true,
                preferences: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Get preferences error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get preferences' 
            });
        }
    }

    /**
     * PUT /preferences - Update user preferences
     */
    async updatePreferences(req, res) {
        try {
            const {
                dashboard_layout,
                widget_preferences,
                chart_preferences,
                alert_sounds,
                auto_refresh,
                refresh_interval_seconds
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_preferences (
                    user_id, dashboard_layout, widget_preferences, chart_preferences,
                    alert_sounds, auto_refresh, refresh_interval_seconds, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    dashboard_layout = EXCLUDED.dashboard_layout,
                    widget_preferences = EXCLUDED.widget_preferences,
                    chart_preferences = EXCLUDED.chart_preferences,
                    alert_sounds = EXCLUDED.alert_sounds,
                    auto_refresh = EXCLUDED.auto_refresh,
                    refresh_interval_seconds = EXCLUDED.refresh_interval_seconds,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, dashboard_layout, widget_preferences, chart_preferences,
                    alert_sounds, auto_refresh, refresh_interval_seconds
                ]
            );

            res.json({
                success: true,
                message: 'Preferences updated successfully',
                preferences: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Update preferences error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update preferences' 
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
                api_key: key.api_key.replace(/(.{8}).*(.{4})/, '$1****$2'),
                api_secret: '****' + key.api_secret.slice(-4)
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

    /**
     * PUT /all - Update all user settings
     */
    async updateAllSettings(req, res) {
        try {
            const {
                trading,
                notifications,
                personal,
                banking,
                security,
                preferences
            } = req.body;

            const updates = [];

            if (trading) {
                updates.push(this.updateTradingSettings({ ...req, body: trading }, { json: () => {} }));
            }

            if (notifications) {
                updates.push(this.updateNotificationSettings({ ...req, body: notifications }, { json: () => {} }));
            }

            if (personal) {
                updates.push(this.updatePersonalSettings({ ...req, body: personal }, { json: () => {} }));
            }

            if (banking) {
                updates.push(this.updateBankingSettings({ ...req, body: banking }, { json: () => {} }));
            }

            if (security) {
                updates.push(this.updateSecuritySettings({ ...req, body: security }, { json: () => {} }));
            }

            if (preferences) {
                updates.push(this.updatePreferences({ ...req, body: preferences }, { json: () => {} }));
            }

            await Promise.all(updates);

            res.json({
                success: true,
                message: 'All settings updated successfully'
            });
        } catch (error) {
            console.error('❌ Update all settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update all settings' 
            });
        }
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
                // Create default settings if none exist
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
     * GET /notifications - Get user notification settings
     */
    async getNotificationSettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_notification_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultNotificationSettings(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_notification_settings WHERE user_id = $1',
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
            console.error('❌ Get notification settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get notification settings' 
            });
        }
    }

    /**
     * PUT /notifications - Update user notification settings
     */
    async updateNotificationSettings(req, res) {
        try {
            const {
                email_notifications,
                sms_notifications,
                push_notifications,
                trade_alerts,
                report_frequency,
                profit_threshold_percentage,
                loss_threshold_percentage
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_notification_settings (
                    user_id, email_notifications, sms_notifications, push_notifications,
                    trade_alerts, report_frequency, profit_threshold_percentage,
                    loss_threshold_percentage, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    email_notifications = EXCLUDED.email_notifications,
                    sms_notifications = EXCLUDED.sms_notifications,
                    push_notifications = EXCLUDED.push_notifications,
                    trade_alerts = EXCLUDED.trade_alerts,
                    report_frequency = EXCLUDED.report_frequency,
                    profit_threshold_percentage = EXCLUDED.profit_threshold_percentage,
                    loss_threshold_percentage = EXCLUDED.loss_threshold_percentage,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, email_notifications, sms_notifications, push_notifications,
                    trade_alerts, report_frequency, profit_threshold_percentage,
                    loss_threshold_percentage
                ]
            );

            res.json({
                success: true,
                message: 'Notification settings updated successfully',
                settings: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Update notification settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update notification settings' 
            });
        }
    }

    /**
     * GET /personal - Get user personal settings
     */
    async getPersonalSettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_personal_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultPersonalSettings(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_personal_settings WHERE user_id = $1',
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
            console.error('❌ Get personal settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get personal settings' 
            });
        }
    }

    /**
     * PUT /personal - Update user personal settings
     */
    async updatePersonalSettings(req, res) {
        try {
            const {
                language,
                timezone,
                currency_preference,
                theme,
                date_format
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_personal_settings (
                    user_id, language, timezone, currency_preference, theme, date_format, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    language = EXCLUDED.language,
                    timezone = EXCLUDED.timezone,
                    currency_preference = EXCLUDED.currency_preference,
                    theme = EXCLUDED.theme,
                    date_format = EXCLUDED.date_format,
                    updated_at = NOW()
                RETURNING *`,
                [req.user.id, language, timezone, currency_preference, theme, date_format]
            );

            res.json({
                success: true,
                message: 'Personal settings updated successfully',
                settings: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Update personal settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update personal settings' 
            });
        }
    }

    /**
     * GET /banking - Get user banking settings
     */
    async getBankingSettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_banking_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                return res.json({
                    success: true,
                    settings: null
                });
            }

            // Hide sensitive data
            const settings = result.rows[0];
            if (settings.api_key) {
                settings.api_key = settings.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                settings
            });
        } catch (error) {
            console.error('❌ Get banking settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get banking settings' 
            });
        }
    }

    /**
     * PUT /banking - Update user banking settings
     */
    async updateBankingSettings(req, res) {
        try {
            const {
                pix_key,
                pix_type,
                bank_name,
                bank_code,
                agency,
                account,
                account_type,
                account_holder_name,
                cpf,
                phone
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_banking_settings (
                    user_id, pix_key, pix_type, bank_name, bank_code, agency,
                    account, account_type, account_holder_name, cpf, phone, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    pix_key = EXCLUDED.pix_key,
                    pix_type = EXCLUDED.pix_type,
                    bank_name = EXCLUDED.bank_name,
                    bank_code = EXCLUDED.bank_code,
                    agency = EXCLUDED.agency,
                    account = EXCLUDED.account,
                    account_type = EXCLUDED.account_type,
                    account_holder_name = EXCLUDED.account_holder_name,
                    cpf = EXCLUDED.cpf,
                    phone = EXCLUDED.phone,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, pix_key, pix_type, bank_name, bank_code, agency,
                    account, account_type, account_holder_name, cpf, phone
                ]
            );

            // Hide sensitive data in response
            const settings = result.rows[0];
            if (settings.api_key) {
                settings.api_key = settings.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                message: 'Banking settings updated successfully',
                settings
            });
        } catch (error) {
            console.error('❌ Update banking settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update banking settings' 
            });
        }
    }

    /**
     * GET /security - Get user security settings
     */
    async getSecuritySettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_security_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultSecuritySettings(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_security_settings WHERE user_id = $1',
                    [req.user.id]
                );
                return res.json({
                    success: true,
                    settings: defaultResult.rows[0]
                });
            }

            // Hide sensitive data
            const settings = result.rows[0];
            if (settings.two_factor_secret) {
                settings.two_factor_secret = settings.two_factor_secret.replace(/(.{4}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                settings
            });
        } catch (error) {
            console.error('❌ Get security settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get security settings' 
            });
        }
    }

    /**
     * PUT /security - Update user security settings
     */
    async updateSecuritySettings(req, res) {
        try {
            const {
                two_factor_enabled,
                login_notifications,
                device_management,
                session_timeout_minutes,
                password_change_required
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_security_settings (
                    user_id, two_factor_enabled, login_notifications, device_management,
                    session_timeout_minutes, password_change_required, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    two_factor_enabled = EXCLUDED.two_factor_enabled,
                    login_notifications = EXCLUDED.login_notifications,
                    device_management = EXCLUDED.device_management,
                    session_timeout_minutes = EXCLUDED.session_timeout_minutes,
                    password_change_required = EXCLUDED.password_change_required,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, two_factor_enabled, login_notifications, device_management,
                    session_timeout_minutes, password_change_required
                ]
            );

            // Hide sensitive data in response
            const settings = result.rows[0];
            if (settings.two_factor_secret) {
                settings.two_factor_secret = settings.two_factor_secret.replace(/(.{4}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                message: 'Security settings updated successfully',
                settings
            });
        } catch (error) {
            console.error('❌ Update security settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update security settings' 
            });
        }
    }

    /**
     * GET /api-keys - Get user API keys
     */
    async getApiKeys(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_api_keys_enhanced WHERE user_id = $1 ORDER BY created_at DESC',
                [req.user.id]
            );

            // Hide sensitive data
            const apiKeys = result.rows.map(key => ({
                ...key,
                api_key: key.api_key.replace(/(.{8}).*(.{4})/, '$1****$2'),
                api_secret: '****' + key.api_secret.slice(-4)
            }));

            res.json({
                success: true,
                apiKeys
            });
        } catch (error) {
            console.error('❌ Get API keys error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get API keys' 
            });
        }
    }

    /**
     * POST /api-keys - Add new API key
     */
    async addApiKey(req, res) {
        try {
            const {
                exchange,
                api_key,
                api_secret,
                passphrase,
                environment,
                permissions
            } = req.body;

            // Validate API key data
            if (!exchange || !api_key || !api_secret) {
                return res.status(400).json({
                    success: false,
                    error: 'Exchange, API key, and API secret are required'
                });
            }

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_api_keys_enhanced (
                    user_id, exchange, api_key, api_secret, passphrase, environment, permissions, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (user_id, exchange, environment) DO UPDATE SET
                    api_key = EXCLUDED.api_key,
                    api_secret = EXCLUDED.api_secret,
                    passphrase = EXCLUDED.passphrase,
                    permissions = EXCLUDED.permissions,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, exchange, api_key, api_secret, passphrase, 
                    environment || 'testnet', permissions || '{}'
                ]
            );

            // Hide sensitive data in response
            const apiKey = result.rows[0];
            apiKey.api_key = apiKey.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            apiKey.api_secret = '****' + apiKey.api_secret.slice(-4);

            res.json({
                success: true,
                message: 'API key added successfully',
                apiKey
            });
        } catch (error) {
            console.error('❌ Add API key error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to add API key' 
            });
        }
    }

    /**
     * PUT /api-keys/:id - Update API key
     */
    async updateApiKey(req, res) {
        try {
            const { id } = req.params;
            const { is_active, permissions } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                'UPDATE user_api_keys_enhanced SET is_active = $1, permissions = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
                [is_active, permissions, id, req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'API key not found'
                });
            }

            // Hide sensitive data in response
            const apiKey = result.rows[0];
            apiKey.api_key = apiKey.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            apiKey.api_secret = '****' + apiKey.api_secret.slice(-4);

            res.json({
                success: true,
                message: 'API key updated successfully',
                apiKey
            });
        } catch (error) {
            console.error('❌ Update API key error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update API key' 
            });
        }
    }

    /**
     * DELETE /api-keys/:id - Delete API key
     */
    async deleteApiKey(req, res) {
        try {
            const { id } = req.params;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                'DELETE FROM user_api_keys_enhanced WHERE id = $1 AND user_id = $2 RETURNING *',
                [id, req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'API key not found'
                });
            }

            res.json({
                success: true,
                message: 'API key deleted successfully'
            });
        } catch (error) {
            console.error('❌ Delete API key error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to delete API key' 
            });
        }
    }

    /**
     * GET /preferences - Get user preferences
     */
    async getPreferences(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_preferences WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultPreferences(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_preferences WHERE user_id = $1',
                    [req.user.id]
                );
                return res.json({
                    success: true,
                    preferences: defaultResult.rows[0]
                });
            }

            res.json({
                success: true,
                preferences: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Get preferences error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get preferences' 
            });
        }
    }

    /**
     * PUT /preferences - Update user preferences
     */
    async updatePreferences(req, res) {
        try {
            const {
                dashboard_layout,
                widget_preferences,
                chart_preferences,
                alert_sounds,
                auto_refresh,
                refresh_interval_seconds
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_preferences (
                    user_id, dashboard_layout, widget_preferences, chart_preferences,
                    alert_sounds, auto_refresh, refresh_interval_seconds, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    dashboard_layout = EXCLUDED.dashboard_layout,
                    widget_preferences = EXCLUDED.widget_preferences,
                    chart_preferences = EXCLUDED.chart_preferences,
                    alert_sounds = EXCLUDED.alert_sounds,
                    auto_refresh = EXCLUDED.auto_refresh,
                    refresh_interval_seconds = EXCLUDED.refresh_interval_seconds,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, dashboard_layout, widget_preferences, chart_preferences,
                    alert_sounds, auto_refresh, refresh_interval_seconds
                ]
            );

            res.json({
                success: true,
                message: 'Preferences updated successfully',
                preferences: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Update preferences error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update preferences' 
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
                api_key: key.api_key.replace(/(.{8}).*(.{4})/, '$1****$2'),
                api_secret: '****' + key.api_secret.slice(-4)
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

    /**
     * PUT /all - Update all user settings
     */
    async updateAllSettings(req, res) {
        try {
            const {
                trading,
                notifications,
                personal,
                banking,
                security,
                preferences
            } = req.body;

            const updates = [];

            if (trading) {
                updates.push(this.updateTradingSettings({ ...req, body: trading }, { json: () => {} }));
            }

            if (notifications) {
                updates.push(this.updateNotificationSettings({ ...req, body: notifications }, { json: () => {} }));
            }

            if (personal) {
                updates.push(this.updatePersonalSettings({ ...req, body: personal }, { json: () => {} }));
            }

            if (banking) {
                updates.push(this.updateBankingSettings({ ...req, body: banking }, { json: () => {} }));
            }

            if (security) {
                updates.push(this.updateSecuritySettings({ ...req, body: security }, { json: () => {} }));
            }

            if (preferences) {
                updates.push(this.updatePreferences({ ...req, body: preferences }, { json: () => {} }));
            }

            await Promise.all(updates);

            res.json({
                success: true,
                message: 'All settings updated successfully'
            });
        } catch (error) {
            console.error('❌ Update all settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update all settings' 
            });
        }
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
                // Create default settings if none exist
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
     * GET /notifications - Get user notification settings
     */
    async getNotificationSettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_notification_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultNotificationSettings(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_notification_settings WHERE user_id = $1',
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
            console.error('❌ Get notification settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get notification settings' 
            });
        }
    }

    /**
     * PUT /notifications - Update user notification settings
     */
    async updateNotificationSettings(req, res) {
        try {
            const {
                email_notifications,
                sms_notifications,
                push_notifications,
                trade_alerts,
                report_frequency,
                profit_threshold_percentage,
                loss_threshold_percentage
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_notification_settings (
                    user_id, email_notifications, sms_notifications, push_notifications,
                    trade_alerts, report_frequency, profit_threshold_percentage,
                    loss_threshold_percentage, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    email_notifications = EXCLUDED.email_notifications,
                    sms_notifications = EXCLUDED.sms_notifications,
                    push_notifications = EXCLUDED.push_notifications,
                    trade_alerts = EXCLUDED.trade_alerts,
                    report_frequency = EXCLUDED.report_frequency,
                    profit_threshold_percentage = EXCLUDED.profit_threshold_percentage,
                    loss_threshold_percentage = EXCLUDED.loss_threshold_percentage,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, email_notifications, sms_notifications, push_notifications,
                    trade_alerts, report_frequency, profit_threshold_percentage,
                    loss_threshold_percentage
                ]
            );

            res.json({
                success: true,
                message: 'Notification settings updated successfully',
                settings: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Update notification settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update notification settings' 
            });
        }
    }

    /**
     * GET /personal - Get user personal settings
     */
    async getPersonalSettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_personal_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultPersonalSettings(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_personal_settings WHERE user_id = $1',
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
            console.error('❌ Get personal settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get personal settings' 
            });
        }
    }

    /**
     * PUT /personal - Update user personal settings
     */
    async updatePersonalSettings(req, res) {
        try {
            const {
                language,
                timezone,
                currency_preference,
                theme,
                date_format
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_personal_settings (
                    user_id, language, timezone, currency_preference, theme, date_format, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    language = EXCLUDED.language,
                    timezone = EXCLUDED.timezone,
                    currency_preference = EXCLUDED.currency_preference,
                    theme = EXCLUDED.theme,
                    date_format = EXCLUDED.date_format,
                    updated_at = NOW()
                RETURNING *`,
                [req.user.id, language, timezone, currency_preference, theme, date_format]
            );

            res.json({
                success: true,
                message: 'Personal settings updated successfully',
                settings: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Update personal settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update personal settings' 
            });
        }
    }

    /**
     * GET /banking - Get user banking settings
     */
    async getBankingSettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_banking_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                return res.json({
                    success: true,
                    settings: null
                });
            }

            // Hide sensitive data
            const settings = result.rows[0];
            if (settings.api_key) {
                settings.api_key = settings.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                settings
            });
        } catch (error) {
            console.error('❌ Get banking settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get banking settings' 
            });
        }
    }

    /**
     * PUT /banking - Update user banking settings
     */
    async updateBankingSettings(req, res) {
        try {
            const {
                pix_key,
                pix_type,
                bank_name,
                bank_code,
                agency,
                account,
                account_type,
                account_holder_name,
                cpf,
                phone
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_banking_settings (
                    user_id, pix_key, pix_type, bank_name, bank_code, agency,
                    account, account_type, account_holder_name, cpf, phone, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    pix_key = EXCLUDED.pix_key,
                    pix_type = EXCLUDED.pix_type,
                    bank_name = EXCLUDED.bank_name,
                    bank_code = EXCLUDED.bank_code,
                    agency = EXCLUDED.agency,
                    account = EXCLUDED.account,
                    account_type = EXCLUDED.account_type,
                    account_holder_name = EXCLUDED.account_holder_name,
                    cpf = EXCLUDED.cpf,
                    phone = EXCLUDED.phone,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, pix_key, pix_type, bank_name, bank_code, agency,
                    account, account_type, account_holder_name, cpf, phone
                ]
            );

            // Hide sensitive data in response
            const settings = result.rows[0];
            if (settings.api_key) {
                settings.api_key = settings.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                message: 'Banking settings updated successfully',
                settings
            });
        } catch (error) {
            console.error('❌ Update banking settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update banking settings' 
            });
        }
    }

    /**
     * GET /security - Get user security settings
     */
    async getSecuritySettings(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_security_settings WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultSecuritySettings(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_security_settings WHERE user_id = $1',
                    [req.user.id]
                );
                return res.json({
                    success: true,
                    settings: defaultResult.rows[0]
                });
            }

            // Hide sensitive data
            const settings = result.rows[0];
            if (settings.two_factor_secret) {
                settings.two_factor_secret = settings.two_factor_secret.replace(/(.{4}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                settings
            });
        } catch (error) {
            console.error('❌ Get security settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get security settings' 
            });
        }
    }

    /**
     * PUT /security - Update user security settings
     */
    async updateSecuritySettings(req, res) {
        try {
            const {
                two_factor_enabled,
                login_notifications,
                device_management,
                session_timeout_minutes,
                password_change_required
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_security_settings (
                    user_id, two_factor_enabled, login_notifications, device_management,
                    session_timeout_minutes, password_change_required, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    two_factor_enabled = EXCLUDED.two_factor_enabled,
                    login_notifications = EXCLUDED.login_notifications,
                    device_management = EXCLUDED.device_management,
                    session_timeout_minutes = EXCLUDED.session_timeout_minutes,
                    password_change_required = EXCLUDED.password_change_required,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, two_factor_enabled, login_notifications, device_management,
                    session_timeout_minutes, password_change_required
                ]
            );

            // Hide sensitive data in response
            const settings = result.rows[0];
            if (settings.two_factor_secret) {
                settings.two_factor_secret = settings.two_factor_secret.replace(/(.{4}).*(.{4})/, '$1****$2');
            }

            res.json({
                success: true,
                message: 'Security settings updated successfully',
                settings
            });
        } catch (error) {
            console.error('❌ Update security settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update security settings' 
            });
        }
    }

    /**
     * GET /api-keys - Get user API keys
     */
    async getApiKeys(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_api_keys_enhanced WHERE user_id = $1 ORDER BY created_at DESC',
                [req.user.id]
            );

            // Hide sensitive data
            const apiKeys = result.rows.map(key => ({
                ...key,
                api_key: key.api_key.replace(/(.{8}).*(.{4})/, '$1****$2'),
                api_secret: '****' + key.api_secret.slice(-4)
            }));

            res.json({
                success: true,
                apiKeys
            });
        } catch (error) {
            console.error('❌ Get API keys error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get API keys' 
            });
        }
    }

    /**
     * POST /api-keys - Add new API key
     */
    async addApiKey(req, res) {
        try {
            const {
                exchange,
                api_key,
                api_secret,
                passphrase,
                environment,
                permissions
            } = req.body;

            // Validate API key data
            if (!exchange || !api_key || !api_secret) {
                return res.status(400).json({
                    success: false,
                    error: 'Exchange, API key, and API secret are required'
                });
            }

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_api_keys_enhanced (
                    user_id, exchange, api_key, api_secret, passphrase, environment, permissions, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (user_id, exchange, environment) DO UPDATE SET
                    api_key = EXCLUDED.api_key,
                    api_secret = EXCLUDED.api_secret,
                    passphrase = EXCLUDED.passphrase,
                    permissions = EXCLUDED.permissions,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, exchange, api_key, api_secret, passphrase, 
                    environment || 'testnet', permissions || '{}'
                ]
            );

            // Hide sensitive data in response
            const apiKey = result.rows[0];
            apiKey.api_key = apiKey.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            apiKey.api_secret = '****' + apiKey.api_secret.slice(-4);

            res.json({
                success: true,
                message: 'API key added successfully',
                apiKey
            });
        } catch (error) {
            console.error('❌ Add API key error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to add API key' 
            });
        }
    }

    /**
     * PUT /api-keys/:id - Update API key
     */
    async updateApiKey(req, res) {
        try {
            const { id } = req.params;
            const { is_active, permissions } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                'UPDATE user_api_keys_enhanced SET is_active = $1, permissions = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
                [is_active, permissions, id, req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'API key not found'
                });
            }

            // Hide sensitive data in response
            const apiKey = result.rows[0];
            apiKey.api_key = apiKey.api_key.replace(/(.{8}).*(.{4})/, '$1****$2');
            apiKey.api_secret = '****' + apiKey.api_secret.slice(-4);

            res.json({
                success: true,
                message: 'API key updated successfully',
                apiKey
            });
        } catch (error) {
            console.error('❌ Update API key error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update API key' 
            });
        }
    }

    /**
     * DELETE /api-keys/:id - Delete API key
     */
    async deleteApiKey(req, res) {
        try {
            const { id } = req.params;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                'DELETE FROM user_api_keys_enhanced WHERE id = $1 AND user_id = $2 RETURNING *',
                [id, req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'API key not found'
                });
            }

            res.json({
                success: true,
                message: 'API key deleted successfully'
            });
        } catch (error) {
            console.error('❌ Delete API key error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to delete API key' 
            });
        }
    }

    /**
     * GET /preferences - Get user preferences
     */
    async getPreferences(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT * FROM user_preferences WHERE user_id = $1',
                [req.user.id]
            );

            if (result.rows.length === 0) {
                await this.createDefaultPreferences(req.user.id);
                const defaultResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_preferences WHERE user_id = $1',
                    [req.user.id]
                );
                return res.json({
                    success: true,
                    preferences: defaultResult.rows[0]
                });
            }

            res.json({
                success: true,
                preferences: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Get preferences error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to get preferences' 
            });
        }
    }

    /**
     * PUT /preferences - Update user preferences
     */
    async updatePreferences(req, res) {
        try {
            const {
                dashboard_layout,
                widget_preferences,
                chart_preferences,
                alert_sounds,
                auto_refresh,
                refresh_interval_seconds
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_preferences (
                    user_id, dashboard_layout, widget_preferences, chart_preferences,
                    alert_sounds, auto_refresh, refresh_interval_seconds, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    dashboard_layout = EXCLUDED.dashboard_layout,
                    widget_preferences = EXCLUDED.widget_preferences,
                    chart_preferences = EXCLUDED.chart_preferences,
                    alert_sounds = EXCLUDED.alert_sounds,
                    auto_refresh = EXCLUDED.auto_refresh,
                    refresh_interval_seconds = EXCLUDED.refresh_interval_seconds,
                    updated_at = NOW()
                RETURNING *`,
                [
                    req.user.id, dashboard_layout, widget_preferences, chart_preferences,
                    alert_sounds, auto_refresh, refresh_interval_seconds
                ]
            );

            res.json({
                success: true,
                message: 'Preferences updated successfully',
                preferences: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Update preferences error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update preferences' 
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
                api_key: key.api_key.replace(/(.{8}).*(.{4})/, '$1****$2'),
                api_secret: '****' + key.api_secret.slice(-4)
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

    /**
     * PUT /all - Update all user settings
     */
    async updateAllSettings(req, res) {
        try {
            const {
                trading,
                notifications,
                personal,
                banking,
                security,
                preferences
            } = req.body;

            const updates = [];

            if (trading) {
                updates.push(this.updateTradingSettings({ ...req, body: trading }, { json: () => {} }));
            }

            if (notifications) {
                updates.push(this.updateNotificationSettings({ ...req, body: notifications }, { json: () => {} }));
            }

            if (personal) {
                updates.push(this.updatePersonalSettings({ ...req, body: personal }, { json: () => {} }));
            }

            if (banking) {
                updates.push(this.updateBankingSettings({ ...req, body: banking }, { json: () => {} }));
            }

            if (security) {
                updates.push(this.updateSecuritySettings({ ...req, body: security }, { json: () => {} }));
            }

            if (preferences) {
                updates.push(this.updatePreferences({ ...req, body: preferences }, { json: () => {} }));
            }

            await Promise.all(updates);

            res.json({
                success: true,
                message: 'All settings updated successfully'
            });
        } catch (error) {
            console.error('❌ Update all settings error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Failed to update all settings' 
            });
        }
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
