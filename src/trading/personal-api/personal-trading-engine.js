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
const RealAffiliateService = require('../../services/affiliate/real-affiliate-service');

class PersonalTradingEngine {
    constructor(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
        this.apiKeyManager = new UserAPIKeyManager(dbPoolManager);
        this.aiDecision = new AIDecision();
        this.marketAnalyzer = new MarketAnalyzer();
        this.affiliateService = new RealAffiliateService();
        this.affiliateService.setDbPoolManager(dbPoolManager);

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
            console.log('🔍 DEBUG [1/7]: Starting processSignalForAllUsers');
            console.log('🔍 DEBUG: Signal =', JSON.stringify({ symbol: signal.symbol, action: signal.action, price: signal.price }));

            // Broadcast signal
            console.log('🔍 DEBUG [2/7]: Broadcasting signal received');
            tradingWebSocket.broadcastSignalReceived(signal);

            // 1. Get market analysis
            console.log('🔍 DEBUG [3/7]: Calling marketAnalyzer.analyzeMarket');
            const marketAnalysis = await this.marketAnalyzer.analyzeMarket(signal.symbol || 'BTCUSDT');
            console.log('🔍 DEBUG: Market analysis =', marketAnalysis.sentiment);

            // 2. Make AI decision
            console.log('🔍 DEBUG [4/7]: Calling aiDecision.makeDecision');
            const aiDecision = await this.aiDecision.makeDecision(signal, marketAnalysis);
            console.log(`🤖 AI Decision: ${aiDecision.action} (confidence: ${aiDecision.confidence}%)`);
            console.log('🔍 DEBUG: AI action =', aiDecision.action, 'confidence =', aiDecision.confidence);

            tradingWebSocket.broadcastAIDecision(aiDecision, signal);

            if (aiDecision.action === 'HOLD') {
                console.log('🔍 DEBUG: AI said HOLD, returning early (NO TRADES)');
                return {
                    success: true,
                    message: 'AI decided to HOLD - no trades executed',
                    aiDecision,
                    totalUsers: 0,
                    executedTrades: []
                };
            }

            // 3. Get users with personal API keys configured
            console.log('🔍 DEBUG [5/7]: AI approved trade, calling getUsersWithPersonalKeys');
            console.log('🔍 DEBUG: Looking for users with symbol =', signal.symbol);
            const activeUsers = await this.getUsersWithPersonalKeys(signal.symbol);
            console.log('🔍 DEBUG: getUsersWithPersonalKeys returned', activeUsers.length, 'users');

            if (activeUsers.length === 0) {
                console.log('🔍 DEBUG: NO USERS FOUND - returning early');
                return {
                    success: true,
                    message: 'No users with personal API keys found',
                    aiDecision,
                    totalUsers: 0,
                    executedTrades: []
                };
            }

            console.log(`👥 Found ${activeUsers.length} users with personal API keys`);
            console.log('🔍 DEBUG [6/7]: Users found:', activeUsers.map(u => `User ${u.id}`).join(', '));

            // 4. Execute trades by plan priority
            console.log('🔍 DEBUG [7/7]: Calling executeTradesByPriority');
            const executionResults = await this.executeTradesByPriority(signal, aiDecision, activeUsers);
            console.log('🔍 DEBUG: executeTradesByPriority returned', executionResults.length, 'results');

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
            console.error('🔍 DEBUG: CAUGHT ERROR in processSignalForAllUsers');
            console.error('🔍 DEBUG: Error message:', error.message);
            console.error('🔍 DEBUG: Error stack:', error.stack);
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
            console.log('🔍 DEBUG [getUsersWithPersonalKeys]: ENTERED method');
            console.log('🔍 DEBUG: Symbol parameter =', symbol);

            // Get users with verified personal API keys (PERSONAL mode only - no admin keys)
            // Uses per-user preferred_exchange setting
            console.log('🔍 DEBUG: Querying users with their preferred exchange...');
            const result = await this.dbPoolManager.executeRead(`
                SELECT
                    u.id, u.username, u.plan_type, u.subscription_status,
                    u.balance_real_brl, u.balance_real_usd,
                    u.balance_admin_brl, u.balance_admin_usd,
                    u.max_open_positions, u.default_leverage, u.risk_level,
                    u.trading_mode,
                    u.preferred_exchange,
                    uak.exchange as configured_exchange,
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
                AND uak.exchange = u.preferred_exchange
                AND uak.is_active = TRUE
                AND uak.enabled = TRUE
                AND uak.verified = TRUE
                AND uak.api_key IS NOT NULL
                AND uak.api_secret IS NOT NULL
                ORDER BY plan_priority
            `);

            console.log('🔍 DEBUG: Query executed successfully');
            console.log('🔍 DEBUG: Raw result.rows.length =', result.rows.length);
            if (result.rows.length > 0) {
                console.log('🔍 DEBUG: First user found:', { id: result.rows[0].id, email: result.rows[0].email || result.rows[0].username });
            } else {
                console.log('🔍 DEBUG: NO ROWS RETURNED FROM QUERY');
            }

            const mappedUsers = result.rows.map(user => ({
                ...user,
                operationalBalance: {
                    brl: parseFloat(user.balance_real_brl || 0) + parseFloat(user.balance_admin_brl || 0),
                    usd: parseFloat(user.balance_real_usd || 0) + parseFloat(user.balance_admin_usd || 0)
                },
                planConfig: this.PLAN_PRIORITIES[user.plan_type] || this.PLAN_PRIORITIES['TRIAL'],
                preferredExchange: user.preferred_exchange || user.configured_exchange || 'bybit'
            }));

            console.log('🔍 DEBUG: Mapped users count =', mappedUsers.length);
            console.log('🔍 DEBUG: Returning from getUsersWithPersonalKeys with', mappedUsers.length, 'users');
            return mappedUsers;

        } catch (error) {
            console.error('❌ Error getting users with personal keys:', error);
            console.error('🔍 DEBUG: ERROR CAUGHT - Stack:', error.stack);
            console.error('🔍 DEBUG: ERROR CAUGHT - Message:', error.message);
            console.error('🔍 DEBUG: Returning empty array due to error');
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
     * Execute trade using user's personal API key on both exchanges if connected
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

            // Check which exchanges are connected
            const connectedExchanges = await this.getConnectedExchanges(user.id);
            
            if (connectedExchanges.length === 0) {
                return {
                    userId: user.id,
                    username: user.username,
                    success: false,
                    message: 'No connected exchanges found'
                };
            }

            console.log(`🔄 Trading on ${connectedExchanges.length} exchanges: ${connectedExchanges.join(', ')}`);

            // Calculate quantity - use signal quantity if provided, otherwise calculate
            const calculatedQty = signal.quantity || this.calculateQuantity(signal.symbol, positionSize, signal.price);

            console.log(`📊 Trade calculation for ${user.username}:`, {
                positionSize,
                signalQuantity: signal.quantity,
                calculatedQty,
                symbol: signal.symbol,
                price: signal.price,
                exchanges: connectedExchanges
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

            // Execute trades on all connected exchanges
            const tradeResults = [];
            
            for (const exchange of connectedExchanges) {
                try {
                    const result = await this.executeTradeOnExchange(signal, aiDecision, user, planConfig, exchange, calculatedQty, positionSize);
                    tradeResults.push(result);
                } catch (error) {
                    console.error(`❌ Error executing trade on ${exchange} for ${user.username}:`, error);
                    tradeResults.push({
                        userId: user.id,
                        username: user.username,
                        exchange,
                        success: false,
                        message: `Failed on ${exchange}: ${error.message}`
                    });
                }
            }

            // Return combined result
            const successfulTrades = tradeResults.filter(r => r.success);
            const failedTrades = tradeResults.filter(r => !r.success);

            return {
                userId: user.id,
                username: user.username,
                planType: user.plan_type,
                positionSize,
                commission: planConfig.commission,
                symbol: signal.symbol,
                side: aiDecision.action,
                success: successfulTrades.length > 0,
                message: `${successfulTrades.length}/${tradeResults.length} trades successful`,
                exchanges: tradeResults,
                successfulExchanges: successfulTrades.map(r => r.exchange),
                failedExchanges: failedTrades.map(r => r.exchange),
                timestamp: new Date().toISOString(),
                personalKey: true
            };

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
     * Get connected exchanges for a user
     */
    async getConnectedExchanges(userId) {
        try {
            const exchanges = [];
            
            // Check Bybit connection
            const bybitCredentials = await this.apiKeyManager.getAPICredentials(userId, 'bybit');
            if (bybitCredentials.success && bybitCredentials.enabled) {
                exchanges.push('bybit');
            }
            
            // Check Binance connection
            const binanceCredentials = await this.apiKeyManager.getAPICredentials(userId, 'binance');
            if (binanceCredentials.success && binanceCredentials.enabled) {
                exchanges.push('binance');
            }
            
            console.log(`🔗 Connected exchanges for user ${userId}: ${exchanges.join(', ')}`);
            return exchanges;
        } catch (error) {
            console.error('❌ Error checking connected exchanges:', error);
            return [];
        }
    }

    /**
     * Execute trade on specific exchange
     */
    async executeTradeOnExchange(signal, aiDecision, user, planConfig, exchange, calculatedQty, positionSize) {
        try {
            // Get user's API credentials for this exchange
            const credentials = await this.apiKeyManager.getAPICredentials(user.id, exchange);

            if (!credentials.success || !credentials.enabled) {
                return {
                    userId: user.id,
                    username: user.username,
                    exchange,
                    success: false,
                    message: `${exchange} API key not available or not enabled`
                };
            }

            // Create exchange service with user's credentials
            const exchangeService = await this.createUserExchangeService(exchange, credentials);

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
            console.log(`🔥 Executing personal API call for ${user.username} on ${exchange}`);
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
                exchange,
                executedPrice: result.price || signal.price,
                executedQty: tradeParams.qty,
                timestamp: new Date().toISOString(),
                personalKey: true
            };

            // Calculate affiliate commission if trade was successful
            if (result.success) {
                try {
                    console.log(`🤝 Calculating affiliate commission for user ${user.id}...`);
                    const affiliateCommission = await this.affiliateService.calculateTradingCommission(user.id, positionSize);
                    if (affiliateCommission) {
                        console.log(`💰 Affiliate commission calculated: $${affiliateCommission.commission.toFixed(2)} for affiliate ${affiliateCommission.affiliateId}`);
                        
                        // Broadcast affiliate commission update via WebSocket
                        tradingWebSocket.broadcastAffiliateCommission(affiliateCommission.affiliateId, {
                            affiliateId: affiliateCommission.affiliateId,
                            amount: affiliateCommission.commission,
                            source: 'trading',
                            description: `Trading commission from ${user.username} - ${signal.symbol} ${aiDecision.action}`
                        });
                    } else {
                        console.log(`ℹ️ No affiliate commission - user ${user.id} was not referred by an affiliate`);
                    }
                } catch (error) {
                    console.error(`❌ Error calculating affiliate commission for user ${user.id}:`, error);
                }
            }

            // Save trade execution
            await this.saveTradeExecution(`TRADE_${Date.now()}_${user.id}_${exchange}`, tradeData);

            // Broadcast to user
            tradingWebSocket.broadcastTradeExecution(user.id, tradeData);

            return tradeData;

        } catch (error) {
            console.error(`❌ Error executing trade on ${exchange} for user ${user.username}:`, error);
            return {
                userId: user.id,
                username: user.username,
                exchange,
                success: false,
                message: error.message
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

        // Convert risk_level (can be string 'low'/'medium'/'high' or number)
        let riskLevel = 2; // default medium
        if (typeof user.risk_level === 'string') {
            const riskMap = {
                'low': 1,
                'medium': 2,
                'high': 5,
                'very_high': 10
            };
            riskLevel = riskMap[user.risk_level.toLowerCase()] || 2;
        } else if (typeof user.risk_level === 'number') {
            riskLevel = user.risk_level;
        }

        const riskPercent = riskLevel / 100;
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
