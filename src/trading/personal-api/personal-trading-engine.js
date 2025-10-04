/**
 * 🔑 PERSONAL API KEY TRADING ENGINE
 * Executes trades using users' personal Bybit/Binance API keys
 *
 * IMPORTANT: This is the ONLY trading engine - no admin/pooled keys are used.
 * Users MUST connect their own Bybit/Binance accounts to trade.
 */

const UserAPIKeyManager = require('../../services/user-api-keys/user-api-key-manager');
const AIDecision = require('../enterprise/ai-decision');
const MarketAnalyzer = require('../enterprise/market-analyzer');
const tradingWebSocket = require('../../services/websocket/trading-websocket');

class PersonalTradingEngine {
    constructor(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
        this.apiKeyManager = new UserAPIKeyManager(dbPoolManager);
        this.aiDecision = new AIDecision();
        this.marketAnalyzer = new MarketAnalyzer();

        // Plan-based execution priorities
        this.PLAN_PRIORITIES = {
            'PRO_BR': { priority: 1, delay: 0, commission: 10 },
            'PRO_US': { priority: 1, delay: 0, commission: 10 },
            'FLEX_BR': { priority: 2, delay: 1000, commission: 20 },
            'FLEX_US': { priority: 2, delay: 1000, commission: 20 },
            'TRIAL': { priority: 3, delay: 3000, commission: 0 }
        };

        console.log('🔑 Personal API Key Trading Engine initialized');
    }

    /**
     * Process signal for all users using their personal API keys
     */
    async processSignalForAllUsers(signal) {
        try {
            console.log('📡 Processing signal with personal API keys:', signal);

            // Broadcast signal
            tradingWebSocket.broadcastSignalReceived(signal);

            // 1. Get market analysis
            const marketAnalysis = await this.marketAnalyzer.analyzeMarket(signal.symbol || 'BTCUSDT');

            // 2. Make AI decision
            const aiDecision = await this.aiDecision.makeDecision(signal, marketAnalysis);
            console.log(`🤖 AI Decision: ${aiDecision.action} (confidence: ${aiDecision.confidence}%)`);

            tradingWebSocket.broadcastAIDecision(aiDecision, signal);

            if (aiDecision.action === 'HOLD') {
                return {
                    success: true,
                    message: 'AI decided to HOLD - no trades executed',
                    aiDecision,
                    totalUsers: 0,
                    executedTrades: []
                };
            }

            // 3. Get users with personal API keys configured
            const activeUsers = await this.getUsersWithPersonalKeys(signal.symbol);

            if (activeUsers.length === 0) {
                return {
                    success: true,
                    message: 'No users with personal API keys found',
                    aiDecision,
                    totalUsers: 0,
                    executedTrades: []
                };
            }

            console.log(`👥 Found ${activeUsers.length} users with personal API keys`);

            // 4. Execute trades by plan priority
            const executionResults = await this.executeTradesByPriority(signal, aiDecision, activeUsers);

            // 5. Broadcast execution summary
            const finalResult = {
                success: true,
                message: `Trades executed for ${executionResults.length} users`,
                aiDecision,
                totalUsers: activeUsers.length,
                executedTrades: executionResults,
                marketAnalysis: {
                    sentiment: marketAnalysis.sentiment,
                    fearGreed: marketAnalysis.fearGreedIndex
                }
            };

            tradingWebSocket.broadcastExecutionSummary(finalResult);

            return finalResult;

        } catch (error) {
            console.error('❌ Error processing signal:', error);
            return {
                success: false,
                error: error.message,
                aiDecision: null,
                totalUsers: 0,
                executedTrades: []
            };
        }
    }

    /**
     * Get users who have personal API keys configured and verified
     * ADAPTED: Uses existing user_api_keys table structure
     */
    async getUsersWithPersonalKeys(symbol) {
        try {
            // Determine preferred exchange based on symbol
            const preferredExchange = this.getPreferredExchange(symbol);

            // Get users with verified personal API keys (PERSONAL mode only - no admin keys)
            // Uses existing user_api_keys table
            const result = await this.dbPoolManager.executeRead(`
                SELECT
                    u.id, u.username, u.plan_type, u.subscription_status,
                    u.balance_real_brl, u.balance_real_usd,
                    u.balance_admin_brl, u.balance_admin_usd,
                    u.max_open_positions, u.default_leverage, u.risk_level,
                    u.trading_mode,
                    uak.exchange as preferred_exchange,
                    uak.api_key,
                    uak.verified,
                    uak.enabled,
                    uak.is_active,
                    CASE
                        WHEN u.plan_type LIKE 'PRO%' THEN 1
                        WHEN u.plan_type LIKE 'FLEX%' THEN 2
                        WHEN u.plan_type = 'TRIAL' THEN 3
                        ELSE 4
                    END as plan_priority
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.subscription_status = 'active'
                AND (u.trading_mode = 'PERSONAL' OR u.trading_mode IS NULL)
                AND uak.exchange = $1
                AND uak.is_active = TRUE
                AND uak.enabled = TRUE
                AND uak.verified = TRUE
                AND uak.api_key IS NOT NULL
                AND uak.api_secret IS NOT NULL
                ORDER BY plan_priority
            `, [preferredExchange.toLowerCase()]);

            return result.rows.map(user => ({
                ...user,
                operationalBalance: {
                    brl: parseFloat(user.balance_real_brl || 0) + parseFloat(user.balance_admin_brl || 0),
                    usd: parseFloat(user.balance_real_usd || 0) + parseFloat(user.balance_admin_usd || 0)
                },
                planConfig: this.PLAN_PRIORITIES[user.plan_type] || this.PLAN_PRIORITIES['TRIAL'],
                preferredExchange: user.preferred_exchange || preferredExchange
            }));

        } catch (error) {
            console.error('❌ Error getting users with personal keys:', error);
            return [];
        }
    }

    /**
     * Determine preferred exchange based on symbol
     */
    getPreferredExchange(symbol) {
        // You can implement logic here to choose exchange based on:
        // - Symbol availability
        // - Better liquidity
        // - Lower fees
        // For now, use environment preference or default to Bybit
        return process.env.PREFERRED_EXCHANGE || 'bybit';
    }

    /**
     * Execute trades by plan priority with delays
     */
    async executeTradesByPriority(signal, aiDecision, users) {
        const results = [];
        const usersByPlan = this.groupUsersByPlan(users);

        // Execute by priority with delays
        for (const [planType, planUsers] of Object.entries(usersByPlan)) {
            const planConfig = this.PLAN_PRIORITIES[planType] || this.PLAN_PRIORITIES['TRIAL'];

            console.log(`⏳ Executing for ${planType} users (${planUsers.length}) with ${planConfig.delay}ms delay`);

            // Apply plan-based delay
            if (planConfig.delay > 0) {
                await this.sleep(planConfig.delay);
            }

            // Execute trades for this plan group (in parallel for better performance)
            const planResults = await Promise.all(
                planUsers.map(user => this.executePersonalTrade(signal, aiDecision, user, planConfig))
            );

            results.push(...planResults);
        }

        return results;
    }

    /**
     * Group users by plan type for priority execution
     */
    groupUsersByPlan(users) {
        const grouped = {};

        users.forEach(user => {
            const planType = user.plan_type || 'TRIAL';
            if (!grouped[planType]) {
                grouped[planType] = [];
            }
            grouped[planType].push(user);
        });

        // Sort by priority
        const sortedGroups = {};
        Object.keys(grouped)
            .sort((a, b) => this.PLAN_PRIORITIES[a].priority - this.PLAN_PRIORITIES[b].priority)
            .forEach(planType => {
                sortedGroups[planType] = grouped[planType];
            });

        return sortedGroups;
    }

    /**
     * Execute trade using user's personal API key
     */
    async executePersonalTrade(signal, aiDecision, user, planConfig) {
        try {
            console.log(`📈 Executing personal trade for user ${user.username} (${user.plan_type})`);

            // Calculate position size based on user balance
            const positionSize = this.calculatePositionSize(user, signal);

            if (positionSize <= 0) {
                return {
                    userId: user.id,
                    username: user.username,
                    success: false,
                    message: 'Insufficient balance for minimum position'
                };
            }

            // Get user's API credentials
            const credentials = await this.apiKeyManager.getAPICredentials(user.id, user.preferredExchange);

            if (!credentials.success || !credentials.enabled) {
                return {
                    userId: user.id,
                    username: user.username,
                    success: false,
                    message: 'API key not available or not enabled'
                };
            }

            // Create exchange service with user's credentials
            const exchangeService = await this.createUserExchangeService(user.preferredExchange, credentials);

            // Calculate quantity - use signal quantity if provided, otherwise calculate
            const calculatedQty = signal.quantity || this.calculateQuantity(signal.symbol, positionSize, signal.price);

            console.log(`📊 Trade calculation for ${user.username}:`, {
                positionSize,
                signalQuantity: signal.quantity,
                calculatedQty,
                symbol: signal.symbol,
                price: signal.price
            });

            // Validate quantity
            if (!calculatedQty || calculatedQty <= 0 || isNaN(calculatedQty)) {
                return {
                    userId: user.id,
                    username: user.username,
                    success: false,
                    message: `Invalid quantity calculated: ${calculatedQty} (positionSize: $${positionSize})`
                };
            }

            // Prepare trade parameters
            const tradeParams = {
                symbol: signal.symbol,
                side: aiDecision.action === 'BUY' ? 'Buy' : 'Sell',
                orderType: 'Market',
                qty: calculatedQty,
                stopLoss: aiDecision.stopLoss,
                takeProfit: aiDecision.takeProfit
            };

            // Execute trade
            console.log(`🔥 Executing personal API call for ${user.username} on ${user.preferredExchange}`);
            const result = await exchangeService.placeOrder(tradeParams);

            const tradeData = {
                userId: user.id,
                username: user.username,
                planType: user.plan_type,
                positionSize,
                commission: planConfig.commission,
                symbol: signal.symbol,
                side: aiDecision.action,
                success: result.success || false,
                message: result.message || result.error || 'Trade executed',
                orderId: result.orderId,
                exchange: user.preferredExchange,
                executedPrice: result.price || signal.price,
                executedQty: tradeParams.qty,
                timestamp: new Date().toISOString(),
                personalKey: true
            };

            // Save trade execution
            await this.saveTradeExecution(`TRADE_${Date.now()}_${user.id}`, tradeData);

            // Broadcast to user
            tradingWebSocket.broadcastTradeExecution(user.id, tradeData);

            return tradeData;

        } catch (error) {
            console.error(`❌ Error executing trade for user ${user.username}:`, error);
            return {
                userId: user.id,
                username: user.username,
                success: false,
                message: error.message,
                personalKey: true
            };
        }
    }

    /**
     * Create exchange service with user's personal credentials
     */
    async createUserExchangeService(exchange, credentials) {
        if (exchange.toLowerCase() === 'bybit') {
            const BybitService = require('../../services/exchange/bybit-service');
            const service = new BybitService();
            // Override with user's credentials
            service.apiKey = credentials.apiKey;
            service.apiSecret = credentials.apiSecret;
            return service;
        } else {
            const BinanceService = require('../../services/exchange/binance-service');
            const service = new BinanceService();
            service.apiKey = credentials.apiKey;
            service.apiSecret = credentials.apiSecret;
            return service;
        }
    }

    /**
     * Calculate position size based on user balance and risk
     */
    calculatePositionSize(user, signal) {
        const availableBalance = Math.max(user.operationalBalance.brl / 5.5, user.operationalBalance.usd);
        const riskPercent = (user.risk_level || 2) / 100;
        const maxPositionSize = availableBalance * riskPercent;
        const minPositionSize = 10;

        return Math.max(minPositionSize, Math.min(maxPositionSize, availableBalance * 0.1));
    }

    /**
     * Calculate quantity based on symbol and position size
     * @param {string} symbol - Trading pair (e.g., BTCUSDT)
     * @param {number} positionSizeUSD - Position size in USD
     * @param {number} actualPrice - Actual price from signal (optional)
     * @returns {number} Calculated quantity
     */
    calculateQuantity(symbol, positionSizeUSD, actualPrice) {
        // Use actual price from signal if provided, otherwise use approximation
        const approximatePrices = {
            'BTCUSDT': 65000,
            'ETHUSDT': 3200,
            'ADAUSDT': 0.5,
            'SOLUSDT': 150,
            'BNBUSDT': 600,
            'XRPUSDT': 0.6,
            'DOGEUSDT': 0.1,
            'MATICUSDT': 0.8,
            'DOTUSDT': 7
        };

        const price = actualPrice || approximatePrices[symbol] || approximatePrices['BTCUSDT'];

        // Ensure valid inputs
        if (!price || price <= 0 || !positionSizeUSD || positionSizeUSD <= 0) {
            console.error('❌ Invalid inputs for quantity calculation:', { symbol, positionSizeUSD, price });
            return 0;
        }

        const quantity = positionSizeUSD / price;

        // Round according to symbol precision requirements
        let rounded;
        if (symbol.includes('BTC')) {
            rounded = Math.round(quantity * 100000) / 100000; // 5 decimals
        } else if (symbol.includes('ETH')) {
            rounded = Math.round(quantity * 10000) / 10000; // 4 decimals
        } else if (symbol.includes('DOGE') || symbol.includes('XRP') || symbol.includes('ADA')) {
            rounded = Math.round(quantity * 10) / 10; // 1 decimal
        } else {
            rounded = Math.round(quantity * 100) / 100; // 2 decimals
        }

        console.log(`📊 Quantity calculation: ${positionSizeUSD} USD / ${price} = ${rounded} ${symbol}`);

        return rounded;
    }

    /**
     * Save trade execution to database
     * UPDATED: Now saves to trading_operations for unified performance tracking
     */
    async saveTradeExecution(tradeId, tradeData) {
        try {
            const operationId = `OP_${Date.now()}_${tradeData.userId}`;

            await this.dbPoolManager.executeWrite(`
                INSERT INTO trading_operations (
                    user_id, operation_id, trade_id, trading_pair, operation_type,
                    side, entry_price, quantity, exchange, order_id,
                    position_size, commission_percent, plan_type,
                    status, entry_time, personal_key, simulated, success,
                    error_message, signal_source, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                RETURNING id, operation_id
            `, [
                tradeData.userId,
                operationId,
                tradeId,
                tradeData.symbol,
                tradeData.side === 'BUY' ? 'LONG' : 'SHORT',
                tradeData.side,
                tradeData.executedPrice,
                tradeData.executedQty,
                tradeData.exchange,
                tradeData.orderId,
                tradeData.positionSize,
                tradeData.commission,
                tradeData.planType,
                'OPEN', // Initially OPEN
                new Date().toISOString(),
                tradeData.personalKey || true,
                false, // Not simulated
                tradeData.success,
                tradeData.success ? null : tradeData.message,
                'AI',
                JSON.stringify({
                    timestamp: tradeData.timestamp,
                    personalKey: tradeData.personalKey,
                    username: tradeData.username
                })
            ]);

            console.log(`💾 Trade saved to trading_operations: ${operationId} for user ${tradeData.username}`);

            // Broadcast new operation to user via WebSocket
            const tradingWebSocket = require('../../services/websocket/trading-websocket');
            tradingWebSocket.broadcastNewOperation(tradeData.userId, {
                operation_id: operationId,
                trading_pair: tradeData.symbol,
                operation_type: tradeData.side === 'BUY' ? 'LONG' : 'SHORT',
                entry_price: tradeData.executedPrice,
                quantity: tradeData.executedQty,
                status: 'OPEN',
                entry_time: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error saving trade execution:', error.message);
            console.error('   Full error:', error);
        }
    }

    /**
     * Close trade operation and calculate P&L
     */
    async closeTradeOperation(operationId, exitData) {
        try {
            const duration = Math.floor((new Date(exitData.exitTime) - new Date(exitData.entryTime)) / 60000);
            const profitLossUsd = (exitData.exitPrice - exitData.entryPrice) * exitData.quantity * (exitData.operationType === 'LONG' ? 1 : -1);
            const profitLossPercent = ((exitData.exitPrice - exitData.entryPrice) / exitData.entryPrice) * 100 * (exitData.operationType === 'LONG' ? 1 : -1);
            const netPnl = profitLossUsd - (exitData.commission || 0);

            await this.dbPoolManager.executeWrite(`
                UPDATE trading_operations
                SET
                    exit_price = $1,
                    exit_time = $2,
                    status = 'CLOSED',
                    duration_minutes = $3,
                    profit_loss_usd = $4,
                    profit_loss_percentage = $5,
                    net_pnl = $6,
                    updated_at = NOW()
                WHERE operation_id = $7
                RETURNING id, user_id
            `, [
                exitData.exitPrice,
                exitData.exitTime,
                duration,
                profitLossUsd,
                profitLossPercent,
                netPnl,
                operationId
            ]);

            console.log(`✅ Trade closed: ${operationId} - P&L: $${profitLossUsd.toFixed(2)} (${profitLossPercent.toFixed(2)}%)`);

            // Broadcast operation closed to user via WebSocket
            const tradingWebSocket = require('../../services/websocket/trading-websocket');
            tradingWebSocket.broadcastOperationClosed(exitData.userId, {
                operation_id: operationId,
                trading_pair: exitData.symbol,
                entry_price: exitData.entryPrice,
                exit_price: exitData.exitPrice,
                profit_loss_usd: profitLossUsd,
                profit_loss_percentage: profitLossPercent,
                duration_minutes: duration
            });

            // Update user performance
            await this.updateUserPerformance(exitData.userId);

            return {
                success: true,
                profitLossUsd,
                profitLossPercent,
                netPnl
            };
        } catch (error) {
            console.error('❌ Error closing trade:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update user performance cache after trade closes
     */
    async updateUserPerformance(userId) {
        try {
            // Call the calculate_user_performance function
            await this.dbPoolManager.executeWrite('SELECT calculate_user_performance($1)', [userId]);

            console.log(`📊 Performance updated for user ${userId}`);

            // Broadcast performance update via WebSocket
            tradingWebSocket.broadcastPerformanceUpdate(userId);

            return { success: true };
        } catch (error) {
            console.error('❌ Error updating performance:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Helper function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = PersonalTradingEngine;
