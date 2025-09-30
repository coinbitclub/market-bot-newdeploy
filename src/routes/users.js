/**
 * 👤 COMPLETE USER SETTINGS ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * Comprehensive user settings management with full frontend integration
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');

class UserSettingsRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.setupRoutes();
    }

    /**
     * Set database pool manager
     */
    setDbPoolManager(dbPoolManager) {
        this.authMiddleware.setDbPoolManager(dbPoolManager);
    }

    setupRoutes() {
        // All routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // Individual settings routes
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
            // Return default settings if table doesn't exist
            res.json({
                success: true,
                settings: {
                    email_notifications: true,
                    sms_notifications: false,
                    push_notifications: true,
                    trade_alerts: true,
                    report_frequency: 'daily',
                    profit_threshold_percentage: 5.0,
                    loss_threshold_percentage: 10.0
                }
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
                `SELECT
                    id, uuid, username, email, full_name, phone, country, language,
                    email_verified, phone_verified, two_factor_enabled,
                    user_type, is_admin, is_active,
                    bank_name, bank_account, bank_agency, bank_document, pix_key,
                    last_login_at, created_at, updated_at
                FROM users WHERE id = $1`,
                [req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
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
                full_name, email, phone, country, language, bank_document,
                username, bank_name, bank_account, bank_agency, pix_key
            } = req.body;

            // Update user table directly since personal settings are stored there
            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `UPDATE users SET
                    full_name = COALESCE($1, full_name),
                    email = COALESCE($2, email),
                    phone = COALESCE($3, phone),
                    country = COALESCE($4, country),
                    language = COALESCE($5, language),
                    bank_document = COALESCE($6, bank_document),
                    username = COALESCE($7, username),
                    bank_name = COALESCE($8, bank_name),
                    bank_account = COALESCE($9, bank_account),
                    bank_agency = COALESCE($10, bank_agency),
                    pix_key = COALESCE($11, pix_key),
                    updated_at = NOW()
                WHERE id = $12
                RETURNING
                    id, uuid, username, email, full_name, phone, country, language,
                    email_verified, phone_verified, two_factor_enabled,
                    user_type, is_admin, is_active,
                    bank_name, bank_account, bank_agency, bank_document, pix_key,
                    last_login_at, created_at, updated_at`,
                [full_name, email, phone, country, language, bank_document,
                 username, bank_name, bank_account, bank_agency, pix_key, req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

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
                    settings: {
                        pix_key: '',
                        pix_type: 'email',
                        bank_name: '',
                        bank_code: '',
                        agency: '',
                        account: '',
                        account_type: 'corrente',
                        account_holder_name: '',
                        cpf: '',
                        phone: ''
                    }
                });
            }

            res.json({
                success: true,
                settings: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Get banking settings error:', error);
            res.json({
                success: true,
                settings: {
                    pix_key: '',
                    pix_type: 'email',
                    bank_name: '',
                    bank_code: '',
                    agency: '',
                    account: '',
                    account_type: 'corrente',
                    account_holder_name: '',
                    cpf: '',
                    phone: ''
                }
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

            res.json({
                success: true,
                message: 'Banking settings updated successfully',
                settings: result.rows[0]
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

            res.json({
                success: true,
                settings: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Get security settings error:', error);
            res.json({
                success: true,
                settings: {
                    two_factor_enabled: false,
                    login_notifications: true,
                    device_management: false,
                    session_timeout_minutes: 1440,
                    password_change_required: false
                }
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

            res.json({
                success: true,
                message: 'Security settings updated successfully',
                settings: result.rows[0]
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
     * Helper method to sync API keys to users table for backward compatibility
     */
    async syncApiKeyToUsersTable(userId, exchange, api_key, api_secret, passphrase, environment) {
        try {
            const exchangeLower = exchange.toLowerCase();
            const isTestnet = environment === 'testnet';

            let updateQuery = '';
            let updateParams = [];

            switch (exchangeLower) {
                case 'binance':
                    updateQuery = `UPDATE users SET
                        binance_api_key = $1,
                        binance_secret_key = $2,
                        binance_testnet = $3,
                        updated_at = NOW()
                        WHERE id = $4`;
                    updateParams = [api_key, api_secret, isTestnet, userId];
                    break;

                case 'bybit':
                    updateQuery = `UPDATE users SET
                        bybit_api_key = $1,
                        bybit_secret_key = $2,
                        bybit_testnet = $3,
                        updated_at = NOW()
                        WHERE id = $4`;
                    updateParams = [api_key, api_secret, isTestnet, userId];
                    break;

                case 'okx':
                    updateQuery = `UPDATE users SET
                        okx_api_key = $1,
                        okx_secret_key = $2,
                        okx_passphrase = $3,
                        updated_at = NOW()
                        WHERE id = $4`;
                    updateParams = [api_key, api_secret, passphrase || null, userId];
                    break;

                case 'bitget':
                    updateQuery = `UPDATE users SET
                        bitget_api_key = $1,
                        bitget_secret_key = $2,
                        bitget_passphrase = $3,
                        updated_at = NOW()
                        WHERE id = $4`;
                    updateParams = [api_key, api_secret, passphrase || null, userId];
                    break;

                default:
                    console.log(`⚠️ No users table sync for exchange: ${exchange}`);
                    return;
            }

            await this.authMiddleware.dbPoolManager.executeWrite(updateQuery, updateParams);
            console.log(`✅ Synced ${exchange} API key to users table for user ${userId}`);
        } catch (error) {
            console.error(`❌ Failed to sync ${exchange} API key to users table:`, error.message);
            // Don't throw error - this is just for backward compatibility
        }
    }

    /**
     * GET /api-keys - Get user API keys
     */
    async getApiKeys(req, res) {
        try {
            const result = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT id, exchange, api_key, environment, is_active, last_validated_at, is_valid, created_at FROM user_api_keys WHERE user_id = $1',
                [req.user.id]
            );

            // Hide sensitive data (api_secret)
            const apiKeys = result.rows.map(key => ({
                ...key,
                api_key: key.api_key ? key.api_key.substring(0, 8) + '...' : '',
                api_secret: '***hidden***'
            }));

            res.json({
                success: true,
                apiKeys: apiKeys
            });
        } catch (error) {
            console.error('❌ Get API keys error:', error);
            res.json({
                success: true,
                apiKeys: []
            });
        }
    }

    /**
     * POST /api-keys - Add new API key
     */
    async addApiKey(req, res) {
        try {
            const {
                exchange: rawExchange,
                api_key,
                api_secret,
                passphrase,
                environment
            } = req.body;

            // Convert exchange to uppercase to match database constraint
            const exchange = rawExchange ? rawExchange.toUpperCase() : null;

            // Validate required fields
            if (!exchange || !api_key || !api_secret) {
                return res.status(400).json({
                    success: false,
                    error: 'Exchange, API key, and secret are required'
                });
            }

            // Check if API key already exists for this exchange
            const existing = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT id FROM user_api_keys WHERE user_id = $1 AND exchange = $2',
                [req.user.id, exchange]
            );

            if (existing.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `API key for ${exchange} already exists. Please update or delete the existing one.`
                });
            }

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_api_keys (
                    user_id, exchange, api_key, api_secret, api_passphrase, environment, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, exchange, environment, is_active, created_at`,
                [req.user.id, exchange, api_key, api_secret, passphrase || null, environment, true]
            );

            // Also sync to users table for backward compatibility
            await this.syncApiKeyToUsersTable(req.user.id, exchange, api_key, api_secret, passphrase, environment);

            res.json({
                success: true,
                message: 'API key added successfully',
                apiKey: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Add API key error:', error);

            // Handle check constraint violations
            if (error.code === "23514") {
                if (error.constraint === "chk_exchange") {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid exchange "${rawExchange}". Supported exchanges: BINANCE, BYBIT, OKX, BITGET`
                    });
                }
                if (error.constraint === "chk_environment") {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid environment "${environment}". Supported environments: testnet, mainnet`
                    });
                }
            }

            // Handle missing table error
            if (error.code === "42P01" && error.message.includes("user_api_keys")) {
                try {
                    console.log('🔧 Creating missing user_api_keys table...');
                    await this.authMiddleware.dbPoolManager.executeWrite(`
                        CREATE TABLE user_api_keys (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                            exchange VARCHAR(20) NOT NULL,
                            api_key TEXT NOT NULL,
                            api_secret TEXT NOT NULL,
                            api_passphrase TEXT,
                            environment VARCHAR(10) DEFAULT 'testnet',
                            is_active BOOLEAN DEFAULT true,
                            is_valid BOOLEAN DEFAULT false,
                            can_read BOOLEAN DEFAULT false,
                            can_trade BOOLEAN DEFAULT false,
                            can_withdraw BOOLEAN DEFAULT false,
                            last_validated_at TIMESTAMP,
                            validation_error TEXT,
                            balance_last_check JSONB,
                            created_at TIMESTAMP DEFAULT NOW(),
                            updated_at TIMESTAMP DEFAULT NOW()
                        )
                    `);
                    console.log('✅ Successfully created user_api_keys table');

                    // Retry the insert operation
                    const result = await this.authMiddleware.dbPoolManager.executeWrite(
                        'INSERT INTO user_api_keys (user_id, exchange, api_key, api_secret, api_passphrase, environment, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                        [req.user.id, exchange, api_key, api_secret, passphrase || null, environment, true]
                    );

                    // Also sync to users table for backward compatibility
                    await this.syncApiKeyToUsersTable(req.user.id, exchange, api_key, api_secret, passphrase, environment);

                    res.json({
                        success: true,
                        message: 'API key added successfully (after creating table)',
                        apiKey: result.rows[0]
                    });
                    return;

                } catch (retryError) {
                    console.error('❌ Failed to create table or retry insert:', retryError);
                    res.status(500).json({
                        success: false,
                        error: 'Database schema issue - could not create table automatically'
                    });
                    return;
                }
            }

            // Handle missing column error - specifically for passphrase column
            if (error.code === "42703" && (error.message.includes("passphrase") || error.message.includes("api_passphrase"))) {
                try {
                    console.log('🔧 Adding missing api_passphrase column to user_api_keys table...');
                    await this.authMiddleware.dbPoolManager.executeWrite(
                        `ALTER TABLE user_api_keys ADD COLUMN api_passphrase TEXT`
                    );
                    console.log('✅ Successfully added api_passphrase column');

                    // Retry the insert operation
                    const result = await this.authMiddleware.dbPoolManager.executeWrite(
                        'INSERT INTO user_api_keys (user_id, exchange, api_key, api_secret, api_passphrase, environment, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                        [req.user.id, exchange, api_key, api_secret, passphrase || null, environment, true]
                    );

                    // Also sync to users table for backward compatibility
                    await this.syncApiKeyToUsersTable(req.user.id, exchange, api_key, api_secret, passphrase, environment);

                    res.json({
                        success: true,
                        message: 'API key added successfully (after schema fix)',
                        apiKey: result.rows[0]
                    });
                    return;

                } catch (retryError) {
                    console.error('❌ Failed to add column or retry insert:', retryError);
                    res.status(500).json({
                        success: false,
                        error: 'Database schema issue - could not fix automatically'
                    });
                    return;
                }
            }

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
            const {
                api_key,
                api_secret,
                passphrase,
                environment,
                is_active
            } = req.body;

            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `UPDATE user_api_keys SET
                    api_key = COALESCE($1, api_key),
                    api_secret = COALESCE($2, api_secret),
                    api_passphrase = COALESCE($3, api_passphrase),
                    environment = COALESCE($4, environment),
                    is_active = COALESCE($5, is_active),
                    updated_at = NOW()
                WHERE id = $6 AND user_id = $7
                RETURNING id, exchange, environment, is_active`,
                [api_key, api_secret, passphrase, environment, is_active, id, req.user.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'API key not found'
                });
            }

            res.json({
                success: true,
                message: 'API key updated successfully',
                apiKey: result.rows[0]
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
                'DELETE FROM user_api_keys WHERE id = $1 AND user_id = $2 RETURNING exchange',
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
                message: `${result.rows[0].exchange} API key deleted successfully`
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
            res.json({
                success: true,
                preferences: {
                    dashboard_layout: { layout: 'default', widgets: ['balance', 'positions', 'performance'] },
                    widget_preferences: { balance: true, positions: true, performance: true, news: false },
                    chart_preferences: { theme: 'dark', timeframe: '1h', indicators: ['sma', 'ema'] },
                    alert_sounds: true,
                    auto_refresh: true,
                    refresh_interval_seconds: 30
                }
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
                    req.user.id,
                    JSON.stringify(dashboard_layout),
                    JSON.stringify(widget_preferences),
                    JSON.stringify(chart_preferences),
                    alert_sounds,
                    auto_refresh,
                    refresh_interval_seconds
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
     * GET /all - Get all user settings (Enhanced version for frontend)
     */
    async getAllSettings(req, res) {
        try {
            const [
                tradingResult,
                personalResult,
                notificationResult,
                bankingResult,
                securityResult,
                apiKeysResult,
                preferencesResult
            ] = await Promise.all([
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_trading_settings WHERE user_id = $1',
                    [req.user.id]
                ).catch(() => ({ rows: [] })),
                this.authMiddleware.dbPoolManager.executeRead(
                    `SELECT id, full_name, email, phone, country, language, bank_document,
                     binance_api_key, binance_secret_key, binance_testnet,
                     bybit_api_key, bybit_secret_key, bybit_testnet,
                     okx_api_key, okx_secret_key, okx_passphrase,
                     bitget_api_key, bitget_secret_key, bitget_passphrase
                     FROM users WHERE id = $1`,
                    [req.user.id]
                ),
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_notification_settings WHERE user_id = $1',
                    [req.user.id]
                ).catch(() => ({ rows: [] })),
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_banking_settings WHERE user_id = $1',
                    [req.user.id]
                ).catch(() => ({ rows: [] })),
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_security_settings WHERE user_id = $1',
                    [req.user.id]
                ).catch(() => ({ rows: [] })),
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT id, exchange, api_key, environment, is_active, last_connection, connection_status FROM user_api_keys WHERE user_id = $1',
                    [req.user.id]
                ).catch(() => ({ rows: [] })),
                this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM user_preferences WHERE user_id = $1',
                    [req.user.id]
                ).catch(() => ({ rows: [] }))
            ]);

            // Create default settings if they don't exist
            if (tradingResult.rows.length === 0) {
                try {
                    await this.createDefaultTradingSettings(req.user.id);
                    const defaultTrading = await this.authMiddleware.dbPoolManager.executeRead(
                        'SELECT * FROM user_trading_settings WHERE user_id = $1',
                        [req.user.id]
                    );
                    tradingResult.rows = defaultTrading.rows;
                } catch (error) {
                    console.warn('Could not create trading settings table:', error.message);
                }
            }

            if (notificationResult.rows.length === 0) {
                try {
                    await this.createDefaultNotificationSettings(req.user.id);
                    const defaultNotification = await this.authMiddleware.dbPoolManager.executeRead(
                        'SELECT * FROM user_notification_settings WHERE user_id = $1',
                        [req.user.id]
                    );
                    notificationResult.rows = defaultNotification.rows;
                } catch (error) {
                    console.warn('Could not create notification settings table:', error.message);
                }
            }

            if (securityResult.rows.length === 0) {
                try {
                    await this.createDefaultSecuritySettings(req.user.id);
                    const defaultSecurity = await this.authMiddleware.dbPoolManager.executeRead(
                        'SELECT * FROM user_security_settings WHERE user_id = $1',
                        [req.user.id]
                    );
                    securityResult.rows = defaultSecurity.rows;
                } catch (error) {
                    console.warn('Could not create security settings table:', error.message);
                }
            }

            if (preferencesResult.rows.length === 0) {
                try {
                    await this.createDefaultPreferences(req.user.id);
                    const defaultPreferences = await this.authMiddleware.dbPoolManager.executeRead(
                        'SELECT * FROM user_preferences WHERE user_id = $1',
                        [req.user.id]
                    );
                    preferencesResult.rows = defaultPreferences.rows;
                } catch (error) {
                    console.warn('Could not create preferences table:', error.message);
                }
            }

            // Hide sensitive data in API keys
            const safeApiKeys = apiKeysResult.rows.map(key => ({
                ...key,
                api_key: key.api_key ? key.api_key.substring(0, 8) + '...' : '',
                api_secret: '***hidden***'
            }));

            // Format API keys from users table for frontend compatibility
            const userData = personalResult.rows[0] || {};
            const apiKeysFromUsers = {
                binance_api_key: userData.binance_api_key ? userData.binance_api_key.substring(0, 8) + '...' : '',
                binance_secret_key: userData.binance_secret_key ? '***hidden***' : '',
                binance_testnet: userData.binance_testnet || false,
                binance_connected: !!(userData.binance_api_key && userData.binance_secret_key),

                bybit_api_key: userData.bybit_api_key ? userData.bybit_api_key.substring(0, 8) + '...' : '',
                bybit_secret_key: userData.bybit_secret_key ? '***hidden***' : '',
                bybit_testnet: userData.bybit_testnet || false,
                bybit_connected: !!(userData.bybit_api_key && userData.bybit_secret_key),

                okx_api_key: userData.okx_api_key ? userData.okx_api_key.substring(0, 8) + '...' : '',
                okx_secret_key: userData.okx_secret_key ? '***hidden***' : '',
                okx_passphrase: userData.okx_passphrase ? '***hidden***' : '',
                okx_connected: !!(userData.okx_api_key && userData.okx_secret_key),

                bitget_api_key: userData.bitget_api_key ? userData.bitget_api_key.substring(0, 8) + '...' : '',
                bitget_secret_key: userData.bitget_secret_key ? '***hidden***' : '',
                bitget_passphrase: userData.bitget_passphrase ? '***hidden***' : '',
                bitget_connected: !!(userData.bitget_api_key && userData.bitget_secret_key)
            };

            res.json({
                success: true,
                settings: {
                    trading: tradingResult.rows[0] || {
                        max_leverage: 5,
                        take_profit_percentage: 15,
                        stop_loss_percentage: 10,
                        position_size_percentage: 30,
                        risk_level: 'medium',
                        auto_trade_enabled: true,
                        daily_loss_limit_percentage: 10,
                        max_open_positions: 2,
                        default_leverage: 5,
                        stop_loss_multiplier: 2.0,
                        take_profit_multiplier: 3.0
                    },
                    notifications: notificationResult.rows[0] || {
                        email_notifications: true,
                        sms_notifications: false,
                        push_notifications: true,
                        trade_alerts: true,
                        report_frequency: 'daily',
                        profit_threshold_percentage: 5.0,
                        loss_threshold_percentage: 10.0
                    },
                    personal: personalResult.rows[0] || {
                        full_name: 'User',
                        phone: '',
                        country: 'BR',
                        language: 'pt-BR'
                    },
                    banking: bankingResult.rows[0] || {
                        pix_key: '',
                        pix_type: 'email',
                        bank_name: '',
                        bank_code: '',
                        agency: '',
                        account: '',
                        account_type: 'corrente',
                        account_holder_name: '',
                        cpf: '',
                        phone: ''
                    },
                    security: securityResult.rows[0] || {
                        two_factor_enabled: false,
                        login_notifications: true,
                        device_management: false,
                        session_timeout_minutes: 1440,
                        password_change_required: false
                    },
                    api_keys: apiKeysFromUsers,
                    apiKeys: safeApiKeys,
                    preferences: preferencesResult.rows[0] || {
                        dashboard_layout: { layout: 'default', widgets: ['balance', 'positions', 'performance'] },
                        widget_preferences: { balance: true, positions: true, performance: true, news: false },
                        chart_preferences: { theme: 'dark', timeframe: '1h', indicators: ['sma', 'ema'] },
                        alert_sounds: true,
                        auto_refresh: true,
                        refresh_interval_seconds: 30
                    }
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
     * PUT /all - Update all settings
     */
    async updateAllSettings(req, res) {
        try {
            const { trading, notifications, personal, banking, security, preferences } = req.body;

            // Update each setting type if provided
            const results = [];

            if (trading) {
                const mockReq = { ...req, body: trading };
                const mockRes = {
                    json: (data) => results.push({ type: 'trading', data }),
                    status: () => ({ json: (data) => results.push({ type: 'trading', error: data }) })
                };
                await this.updateTradingSettings(mockReq, mockRes);
            }

            if (personal) {
                const mockReq = { ...req, body: personal };
                const mockRes = {
                    json: (data) => results.push({ type: 'personal', data }),
                    status: () => ({ json: (data) => results.push({ type: 'personal', error: data }) })
                };
                await this.updatePersonalSettings(mockReq, mockRes);
            }

            if (notifications) {
                const mockReq = { ...req, body: notifications };
                const mockRes = {
                    json: (data) => results.push({ type: 'notifications', data }),
                    status: () => ({ json: (data) => results.push({ type: 'notifications', error: data }) })
                };
                await this.updateNotificationSettings(mockReq, mockRes);
            }

            if (banking) {
                const mockReq = { ...req, body: banking };
                const mockRes = {
                    json: (data) => results.push({ type: 'banking', data }),
                    status: () => ({ json: (data) => results.push({ type: 'banking', error: data }) })
                };
                await this.updateBankingSettings(mockReq, mockRes);
            }

            if (security) {
                const mockReq = { ...req, body: security };
                const mockRes = {
                    json: (data) => results.push({ type: 'security', data }),
                    status: () => ({ json: (data) => results.push({ type: 'security', error: data }) })
                };
                await this.updateSecuritySettings(mockReq, mockRes);
            }

            if (preferences) {
                const mockReq = { ...req, body: preferences };
                const mockRes = {
                    json: (data) => results.push({ type: 'preferences', data }),
                    status: () => ({ json: (data) => results.push({ type: 'preferences', error: data }) })
                };
                await this.updatePreferences(mockReq, mockRes);
            }

            res.json({
                success: true,
                message: 'All settings updated successfully',
                results: results
            });
        } catch (error) {
            console.error('❌ Update all settings error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update all settings'
            });
        }
    }

    // Helper methods for creating default settings and tables
    async createDefaultTradingSettings(userId) {
        // First, create the table if it doesn't exist
        await this.authMiddleware.dbPoolManager.executeWrite(`
            CREATE TABLE IF NOT EXISTS user_trading_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                max_leverage INTEGER DEFAULT 5,
                take_profit_percentage DECIMAL(5,2) DEFAULT 15.00,
                stop_loss_percentage DECIMAL(5,2) DEFAULT 10.00,
                position_size_percentage INTEGER DEFAULT 30,
                risk_level VARCHAR(20) DEFAULT 'medium',
                auto_trade_enabled BOOLEAN DEFAULT true,
                daily_loss_limit_percentage DECIMAL(5,2) DEFAULT 10.00,
                max_open_positions INTEGER DEFAULT 2,
                default_leverage INTEGER DEFAULT 5,
                stop_loss_multiplier DECIMAL(3,2) DEFAULT 2.00,
                take_profit_multiplier DECIMAL(3,2) DEFAULT 3.00,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Then insert default settings
        await this.authMiddleware.dbPoolManager.executeWrite(
            `INSERT INTO user_trading_settings (
                user_id, max_leverage, take_profit_percentage, stop_loss_percentage,
                position_size_percentage, risk_level, auto_trade_enabled,
                daily_loss_limit_percentage, max_open_positions, default_leverage,
                stop_loss_multiplier, take_profit_multiplier
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (user_id) DO NOTHING`,
            [userId, 5, 15.00, 10.00, 30, 'medium', true, 10, 2, 5, 2.00, 3.00]
        );
    }

    async createDefaultNotificationSettings(userId) {
        await this.authMiddleware.dbPoolManager.executeWrite(`
            CREATE TABLE IF NOT EXISTS user_notification_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                email_notifications BOOLEAN DEFAULT true,
                sms_notifications BOOLEAN DEFAULT false,
                push_notifications BOOLEAN DEFAULT true,
                trade_alerts BOOLEAN DEFAULT true,
                report_frequency VARCHAR(20) DEFAULT 'daily',
                profit_threshold_percentage DECIMAL(5,2) DEFAULT 5.00,
                loss_threshold_percentage DECIMAL(5,2) DEFAULT 10.00,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await this.authMiddleware.dbPoolManager.executeWrite(
            `INSERT INTO user_notification_settings (
                user_id, email_notifications, sms_notifications, push_notifications,
                trade_alerts, report_frequency, profit_threshold_percentage,
                loss_threshold_percentage
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_id) DO NOTHING`,
            [userId, true, false, true, true, 'daily', 5.00, 10.00]
        );
    }

    async createDefaultSecuritySettings(userId) {
        await this.authMiddleware.dbPoolManager.executeWrite(`
            CREATE TABLE IF NOT EXISTS user_security_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                two_factor_enabled BOOLEAN DEFAULT false,
                login_notifications BOOLEAN DEFAULT true,
                device_management BOOLEAN DEFAULT false,
                session_timeout_minutes INTEGER DEFAULT 1440,
                password_change_required BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await this.authMiddleware.dbPoolManager.executeWrite(
            `INSERT INTO user_security_settings (
                user_id, two_factor_enabled, login_notifications, device_management,
                session_timeout_minutes, password_change_required
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id) DO NOTHING`,
            [userId, false, true, false, 1440, false]
        );
    }

    async createDefaultPreferences(userId) {
        await this.authMiddleware.dbPoolManager.executeWrite(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE,
                dashboard_layout TEXT DEFAULT '{"layout": "default", "widgets": ["balance", "positions", "performance"]}',
                widget_preferences TEXT DEFAULT '{"balance": true, "positions": true, "performance": true, "news": false}',
                chart_preferences TEXT DEFAULT '{"theme": "dark", "timeframe": "1h", "indicators": ["sma", "ema"]}',
                alert_sounds BOOLEAN DEFAULT true,
                auto_refresh BOOLEAN DEFAULT true,
                refresh_interval_seconds INTEGER DEFAULT 30,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await this.authMiddleware.dbPoolManager.executeWrite(
            `INSERT INTO user_preferences (
                user_id, dashboard_layout, widget_preferences, chart_preferences,
                alert_sounds, auto_refresh, refresh_interval_seconds
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id) DO NOTHING`,
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

module.exports = new UserSettingsRoutes();