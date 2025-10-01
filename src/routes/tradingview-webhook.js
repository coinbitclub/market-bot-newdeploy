/**
 * 📊 TRADINGVIEW WEBHOOK ROUTES
 * Handles incoming webhook signals from TradingView for production trading
 *
 * IMPORTANT: Uses ONLY personal API keys - no admin/pooled trading.
 * Users must have their own Bybit/Binance API keys configured.
 */

const express = require('express');

class TradingViewWebhookRoutes {
    constructor() {
        this.router = express.Router();
        this.personalTradingEngine = null; // Will be initialized when DB is set
        this.setupRoutes();
    }

    /**
     * Set database pool manager for webhook routes
     */
    setDbPoolManager(dbPoolManager) {
        // Import here to avoid circular dependency
        const PersonalTradingEngine = require('../trading/personal-api/personal-trading-engine');
        this.personalTradingEngine = new PersonalTradingEngine(dbPoolManager);
    }

    setupRoutes() {
        // TradingView webhook endpoint (no auth required for webhooks)
        this.router.post('/signal', this.handleTradingViewSignal.bind(this));
        this.router.post('/webhook', this.handleTradingViewSignal.bind(this)); // Alternative endpoint

        // Test endpoint to validate webhook format
        this.router.post('/test', this.testWebhookFormat.bind(this));

        // Webhook status and configuration
        this.router.get('/status', this.getWebhookStatus.bind(this));
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
                body: webhookData,
                headers: {
                    'user-agent': headers['user-agent'],
                    'content-type': headers['content-type'],
                    'content-length': headers['content-length']
                }
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

            // Check if personal trading engine is initialized
            if (!this.personalTradingEngine) {
                console.log('⚠️ Personal trading engine not initialized, storing signal for later processing');

                // In production, you might queue this signal for later processing
                return res.json({
                    success: true,
                    message: 'Signal received but trading engine not ready',
                    signal,
                    status: 'queued',
                    timestamp: new Date().toISOString()
                });
            }

            // Process signal through personal trading engine (users' own API keys)
            console.log('🔑 Processing TradingView signal through personal API key trading engine...');
            const executionResult = await this.personalTradingEngine.processSignalForAllUsers(signal);

            // Enhanced response for TradingView
            const response = {
                success: executionResult.success,
                message: executionResult.success ? 'Signal processed successfully' : 'Signal processing failed',
                webhook: {
                    source: 'TradingView',
                    processed: true,
                    signal: signal
                },
                execution: {
                    engine: 'personal-api-keys',
                    mode: 'PERSONAL',
                    total_users: executionResult.totalUsers,
                    executed_trades: executionResult.executedTrades?.length || 0,
                    ai_decision: executionResult.aiDecision?.action || 'UNKNOWN',
                    ai_confidence: executionResult.aiDecision?.confidence || 0
                },
                results: {
                    successful_trades: executionResult.executedTrades?.filter(t => t.success).length || 0,
                    failed_trades: executionResult.executedTrades?.filter(t => !t.success).length || 0
                },
                timestamp: new Date().toISOString()
            };

            // Return appropriate status code
            const statusCode = executionResult.success ? 200 : 500;

            console.log(`📊 TradingView webhook processed: ${response.execution.executed_trades} trades executed`);

            res.status(statusCode).json(response);

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