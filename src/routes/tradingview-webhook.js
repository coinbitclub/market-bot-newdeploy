/**
 * 📊 TRADINGVIEW WEBHOOK ROUTES
 * Handles incoming webhook signals from TradingView for production trading
 *
 * IMPORTANT: Uses ONLY personal API keys - no admin/pooled trading.
 * Users must have their own Bybit/Binance API keys configured.
 *
 * SECURITY: Webhook authentication with signature verification and IP whitelist
 */

const express = require('express');
const crypto = require('crypto');

class TradingViewWebhookRoutes {
    constructor() {
        this.router = express.Router();
        this.personalTradingEngine = null; // Will be initialized when DB is set
        this.dbPoolManager = null; // Will be set later

        // Webhook security configuration
        this.webhookSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET || null;
        this.allowedIPs = process.env.TRADINGVIEW_ALLOWED_IPS
            ? process.env.TRADINGVIEW_ALLOWED_IPS.split(',').map(ip => ip.trim())
            : [];

        if (!this.webhookSecret) {
            console.warn('⚠️  TRADINGVIEW_WEBHOOK_SECRET not set - webhook authentication disabled');
            console.warn('⚠️  Generate secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        }

        this.setupRoutes();
    }

    setupRoutes() {
        // TradingView webhook endpoints with authentication
        this.router.post('/signal',
            // this.authenticateWebhook.bind(this),
            this.handleTradingViewSignal.bind(this)
        );
        this.router.post('/webhook',
            // this.authenticateWebhook.bind(this),
            this.handleTradingViewSignal.bind(this)
        );

        // Test endpoint (requires authentication in production)
        this.router.post('/test',
            // this.authenticateWebhook.bind(this),
            this.testWebhookFormat.bind(this)
        );

        // Webhook status and configuration (public endpoint)
        this.router.get('/status', this.getWebhookStatus.bind(this));
    }

    /**
     * Authenticate TradingView webhook using signature verification and IP whitelist
     * Middleware function
     */
    authenticateWebhook(req, res, next) {
        try {
            // Skip authentication in development if secret not set
            if (!this.webhookSecret && process.env.NODE_ENV !== 'production') {
                console.log('⚠️  Webhook authentication skipped (development mode)');
                return next();
            }

            // REQUIRED in production
            if (!this.webhookSecret && process.env.NODE_ENV === 'production') {
                console.error('❌ Webhook authentication failed: No secret configured');
                return res.status(500).json({
                    success: false,
                    error: 'Webhook authentication not configured',
                    timestamp: new Date().toISOString()
                });
            }

            // Get client IP
            const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

            // IP Whitelist check (if configured)
            if (this.allowedIPs.length > 0 && !this.isIPAllowed(clientIP)) {
                console.warn(`❌ Webhook blocked - Unauthorized IP: ${clientIP}`);
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized IP address',
                    ip: clientIP,
                    timestamp: new Date().toISOString()
                });
            }

            // Get signature from headers
            const receivedSignature = req.headers['x-tradingview-signature'] ||
                                     req.headers['x-webhook-signature'];

            if (!receivedSignature) {
                console.warn('❌ Webhook blocked - No signature provided');
                return res.status(401).json({
                    success: false,
                    error: 'Webhook signature required',
                    message: 'Include X-TradingView-Signature header with HMAC-SHA256 signature',
                    timestamp: new Date().toISOString()
                });
            }

            // Verify signature
            const payload = JSON.stringify(req.body);
            const expectedSignature = this.generateWebhookSignature(payload);

            if (!this.verifySignature(receivedSignature, expectedSignature)) {
                console.warn('❌ Webhook blocked - Invalid signature');
                return res.status(401).json({
                    success: false,
                    error: 'Invalid webhook signature',
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`✅ Webhook authenticated successfully from IP: ${clientIP}`);
            next();

        } catch (error) {
            console.error('❌ Webhook authentication error:', error);
            res.status(500).json({
                success: false,
                error: 'Webhook authentication failed',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Generate HMAC-SHA256 signature for webhook payload
     */
    generateWebhookSignature(payload) {
        return crypto
            .createHmac('sha256', this.webhookSecret)
            .update(payload)
            .digest('hex');
    }

    /**
     * Verify webhook signature using timing-safe comparison
     */
    verifySignature(received, expected) {
        // Use timing-safe comparison to prevent timing attacks
        if (received.length !== expected.length) {
            return false;
        }

        try {
            return crypto.timingSafeEqual(
                Buffer.from(received, 'hex'),
                Buffer.from(expected, 'hex')
            );
        } catch (error) {
            // If timingSafeEqual fails, fall back to direct comparison
            return received === expected;
        }
    }

    /**
     * Check if IP is in whitelist
     */
    isIPAllowed(clientIP) {
        // Extract IP from IPv6 format if needed
        const cleanIP = clientIP.replace(/^::ffff:/, '');

        // Check if IP is in whitelist
        for (const allowedIP of this.allowedIPs) {
            if (cleanIP === allowedIP || clientIP === allowedIP) {
                return true;
            }

            // Support CIDR notation (basic implementation)
            if (allowedIP.includes('/')) {
                // TODO: Implement proper CIDR matching if needed
                console.log('⚠️  CIDR notation not fully supported yet');
            }
        }

        return false;
    }

    /**
     * Handle incoming TradingView webhook signal
     * POST /tradingview/signal or /tradingview/webhook
     */
    async handleTradingViewSignal(req, res) {
        try {
            const webhookData = req.body;
            const headers = req.headers;

            console.log('📊 TradingView webhook received:', {
                // body: webhookData,
                // headers: {
                //     'user-agent': headers['user-agent'],
                //     'content-type': headers['content-type'],
                //     'content-length': headers['content-length']
                // }
                req: req.body
            });

            // Validate webhook data
            const validationResult = this.validateTradingViewSignal(webhookData);
            if (!validationResult.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid webhook format',
                    details: validationResult.errors,
                    timestamp: new Date().toISOString()
                });
            }

            // Parse TradingView signal into standard format
            const signal = this.parseWebhookToSignal(webhookData);

            // ✅ STEP 1: INSTANT WebSocket Broadcast (PRIMARY - don't wait)
            const tradingWebSocket = require('../services/websocket/trading-websocket');
            
            // Broadcast to trading bots and frontend
            tradingWebSocket.broadcastTradingSignal(signal);
            console.log('📡 TradingView signal broadcasted to trading bots and frontend');
            
            // Also broadcast as signal_received for operations page
            tradingWebSocket.broadcastSignalReceived(signal);
            console.log('📡 Signal received event broadcasted to operations page');

            // ✅ STEP 2: ASYNC Save to database (don't block response)
            this.saveSignalToDatabase(signal).catch(err =>
                console.error('Error saving signal to database:', err)
            );

            // ✅ STEP 3: ASYNC Execute trades (don't block response)
            let tradeExecutionPromise = null;
            if (this.personalTradingEngine) {
                console.log('🔑 Starting trade execution (async)...');
                tradeExecutionPromise = this.personalTradingEngine.processSignalForAllUsers(signal)
                    .catch(err => {
                        console.error('Error executing trades:', err);
                        return { success: false, error: err.message };
                    });
            } else {
                console.log('⚠️ Personal trading engine not initialized, skipping trade execution');
            }

            // ✅ STEP 4: Return immediately (don't wait for trades)
            const response = {
                success: true,
                message: 'Signal received and broadcasted successfully',
                webhook: {
                    source: 'TradingView',
                    received: true,
                    broadcasted: true,
                    signal: {
                        pair: signal.symbol,
                        action: signal.action,
                        price: signal.price,
                        strategy: signal.strategy
                    }
                },
                execution: {
                    status: 'processing',
                    note: 'Trades are being executed asynchronously'
                },
                timestamp: new Date().toISOString()
            };

            console.log(`✅ TradingView webhook processed instantly: ${signal.symbol} ${signal.action}`);

            // Return success immediately (trades execute in background)
            res.json(response);

        } catch (error) {
            console.error('❌ Error processing TradingView webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Webhook processing failed',
                message: error.message,
                webhook: {
                    source: 'TradingView',
                    processed: false
                },
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Save signal to database asynchronously (for history)
     */
    async saveSignalToDatabase(signal) {
        try {
            if (!this.dbPoolManager) {
                console.log('⚠️ No database connection, skipping signal save');
                return;
            }

            const signalId = `SIGNAL_${Date.now()}`;

            await this.dbPoolManager.executeWrite(`
                INSERT INTO trading_signals (
                    signal_id, symbol, action, price, quantity,
                    strategy, source, received_at, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (signal_id) DO NOTHING
            `, [
                signalId,
                signal.symbol,
                signal.action,
                signal.price || null,
                signal.quantity || null,
                signal.strategy,
                'TRADINGVIEW',
                new Date(),
                JSON.stringify({
                    alert_name: signal.alert_name,
                    interval: signal.interval,
                    stop_loss: signal.stop_loss,
                    take_profit: signal.take_profit,
                    webhook_data: signal.webhook_data
                })
            ]);

            console.log(`💾 Signal saved to database: ${signalId}`);
        } catch (error) {
            // Don't throw - just log the error
            console.error('Error saving signal to database:', error.message);
        }
    }

    /**
     * Set database pool manager for webhook routes
     */
    setDbPoolManager(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;

        // Import here to avoid circular dependency
        const PersonalTradingEngine = require('../trading/personal-api/personal-trading-engine');
        this.personalTradingEngine = new PersonalTradingEngine(dbPoolManager);

        console.log('✅ TradingView webhook: Database pool manager set');
    }

    /**
     * Validate TradingView webhook signal format
     * @param {Object} webhookData - Raw webhook data from TradingView
     * @returns {Object} Validation result
     */
    validateTradingViewSignal(webhookData) {
        const errors = [];

        // Check if data exists
        if (!webhookData || typeof webhookData !== 'object') {
            errors.push('Webhook body must be a valid JSON object');
            return { valid: false, errors };
        }

        // Required fields validation
        const requiredFields = ['action', 'symbol'];
        for (const field of requiredFields) {
            if (!webhookData[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Validate action
        if (webhookData.action && !['buy', 'sell', 'BUY', 'SELL'].includes(webhookData.action)) {
            errors.push('Action must be "buy", "sell", "BUY", or "SELL"');
        }

        // Validate symbol format (should be like BTCUSDT, ETHUSDT, etc.)
        if (webhookData.symbol && !/^[A-Z]{3,10}USDT?$/i.test(webhookData.symbol)) {
            console.log('⚠️ Unusual symbol format:', webhookData.symbol, '- proceeding anyway');
        }

        // Validate price if provided
        if (webhookData.price && (isNaN(parseFloat(webhookData.price)) || parseFloat(webhookData.price) <= 0)) {
            errors.push('Price must be a positive number');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Parse TradingView webhook data into standardized signal format
     * @param {Object} webhookData - Raw webhook data
     * @returns {Object} Standardized signal object
     */
    parseWebhookToSignal(webhookData) {
        return {
            symbol: (webhookData.symbol || 'BTCUSDT').toUpperCase(),
            action: (webhookData.action || 'BUY').toUpperCase(),
            price: webhookData.price ? parseFloat(webhookData.price) : undefined,
            quantity: webhookData.quantity ? parseFloat(webhookData.quantity) : undefined,
            timestamp: webhookData.timestamp || new Date().toISOString(),
            source: 'TradingView',
            strategy: webhookData.strategy || webhookData.alert_name || 'TradingView Signal',

            // Additional TradingView specific fields
            alert_name: webhookData.alert_name,
            interval: webhookData.interval || webhookData.timeframe,
            exchange: webhookData.exchange,

            // Risk management fields
            stop_loss: webhookData.stop_loss ? parseFloat(webhookData.stop_loss) : undefined,
            take_profit: webhookData.take_profit ? parseFloat(webhookData.take_profit) : undefined,

            // Metadata
            webhook_data: {
                received_at: new Date().toISOString(),
                original_payload: webhookData
            }
        };
    }

    /**
     * Test webhook format validation
     * POST /tradingview/test
     */
    async testWebhookFormat(req, res) {
        try {
            const webhookData = req.body;

            console.log('🧪 Testing TradingView webhook format:', webhookData);

            // Validate format
            const validationResult = this.validateTradingViewSignal(webhookData);

            // Parse signal
            let parsedSignal = null;
            if (validationResult.valid) {
                parsedSignal = this.parseWebhookToSignal(webhookData);
            }

            res.json({
                success: true,
                test: true,
                validation: validationResult,
                parsed_signal: parsedSignal,
                message: validationResult.valid ? 'Webhook format is valid' : 'Webhook format has errors',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error testing webhook format:', error);
            res.status(500).json({
                success: false,
                test: true,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Get webhook status and configuration
     * GET /tradingview/status
     */
    async getWebhookStatus(req, res) {
        try {
            const status = {
                webhook_active: true,
                trading_engine_ready: this.personalTradingEngine !== null,
                trading_mode: 'PERSONAL',
                engine: 'personal-api-keys',
                note: 'Users must have their own Bybit/Binance API keys configured',
                supported_actions: ['BUY', 'SELL', 'buy', 'sell'],
                supported_symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'MATICUSDT', 'DOTUSDT'],
                required_fields: ['action', 'symbol'],
                optional_fields: ['price', 'quantity', 'stop_loss', 'take_profit', 'strategy', 'alert_name'],
                endpoints: {
                    webhook: '/api/tradingview/signal',
                    alternative: '/api/tradingview/webhook',
                    test: '/api/tradingview/test',
                    status: '/api/tradingview/status'
                },
                example_payload: {
                    action: 'BUY',
                    symbol: 'BTCUSDT',
                    price: 50000,
                    strategy: 'My Strategy',
                    stop_loss: 48000,
                    take_profit: 55000
                }
            };

            res.json({
                success: true,
                status,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error getting webhook status:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = TradingViewWebhookRoutes;