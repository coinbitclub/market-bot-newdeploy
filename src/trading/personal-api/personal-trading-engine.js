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
     * UPDATED: Now supports dynamic exchange selection based on user preferences
     */
    async getUsersWithPersonalKeys(symbol) {
        try {
            console.log('🔍 DEBUG [getUsersWithPersonalKeys]: ENTERED method');
            console.log('🔍 DEBUG: Symbol parameter =', symbol);

            // Get users with verified personal API keys and their trading preferences
            console.log('🔍 DEBUG: Querying users with active trading exchanges...');
            const result = await this.dbPoolManager.executeRead(`
                SELECT
                    u.id, u.username, u.plan_type, u.subscription_status,
                    u.balance_real_brl, u.balance_real_usd,
                    u.balance_admin_brl, u.balance_admin_usd,
                    u.max_open_positions, u.default_leverage, u.risk_level,
                    u.trading_mode, u.preferred_exchange,
                    uak.exchange as configured_exchange,
                    uak.api_key,
                    uak.verified,
                    uak.is_active,
                    uak.trading_enabled,
                    uak.trading_priority,
                    CASE
                        WHEN u.plan_type LIKE 'PRO%' THEN 1
                        WHEN u.plan_type LIKE 'FLEX%' THEN 2
                        WHEN u.plan_type = 'TRIAL' THEN 3
                        ELSE 4
                    END as plan_priority
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.subscription_status = 'active'
                AND u.trading_enabled = TRUE
                AND (u.trading_mode = 'PERSONAL' OR u.trading_mode IS NULL)
                AND uak.is_active = TRUE
                AND uak.verified = TRUE
                AND uak.trading_enabled = TRUE
                AND uak.api_key IS NOT NULL
                AND uak.api_secret IS NOT NULL
                ORDER BY plan_priority, uak.trading_priority
            `);

            console.log('🔍 DEBUG: Query executed successfully');
            console.log('🔍 DEBUG: Raw result.rows.length =', result.rows.length);
            if (result.rows.length > 0) {
                console.log('🔍 DEBUG: First user found:', { id: result.rows[0].id, email: result.rows[0].email || result.rows[0].username });
            } else {
                console.log('🔍 DEBUG: NO ROWS RETURNED FROM QUERY');
            }

            // Group users by user_id to handle multiple exchanges per user
            const userMap = new Map();
            
            result.rows.forEach(row => {
                const userId = row.id;
                
                if (!userMap.has(userId)) {
                    userMap.set(userId, {
                        ...row,
                        operationalBalance: {
                            brl: parseFloat(row.balance_real_brl || 0) + parseFloat(row.balance_admin_brl || 0),
                            usd: parseFloat(row.balance_real_usd || 0) + parseFloat(row.balance_admin_usd || 0)
                        },
                        planConfig: this.PLAN_PRIORITIES[row.plan_type] || this.PLAN_PRIORITIES['TRIAL'],
                        activeExchanges: []
                    });
                }
                
                // Add this exchange to user's active exchanges
                const user = userMap.get(userId);
                user.activeExchanges.push({
                    exchange: row.configured_exchange,
                    trading_enabled: row.trading_enabled,
                    trading_priority: row.trading_priority,
                    api_key: row.api_key
                });
            });

            const mappedUsers = Array.from(userMap.values()).map(user => ({
                ...user,
                // Use sensible defaults since user_trading_preferences table was removed
                preferredExchanges: user.preferred_exchange ? [user.preferred_exchange] : ['bybit', 'binance'],
                autoSelectExchange: true, // Always auto-select from active exchanges
                maxSimultaneousExchanges: user.max_open_positions || 2
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
     * Execute trade using user's personal API key with dynamic exchange selection
     */
    async executePersonalTrade(signal, aiDecision, user, planConfig) {
        try {
            console.log(`📈 Executing personal trade for user ${user.username} (${user.plan_type})`);
            
            // Determine target exchanges based on signal and user preferences
            let targetExchanges = [];
            
            if (signal.exchange) {
                // Signal specifies exchange - use it if user has it enabled
                const signalExchange = signal.exchange.toLowerCase();
                console.log(`📍 Signal specifies exchange: ${signalExchange}`);
                
                const hasExchange = user.activeExchanges.find(ex => 
                    ex.exchange === signalExchange && ex.trading_enabled
                );
                
                if (hasExchange) {
                    targetExchanges = [signalExchange];
                    console.log(`✅ User has ${signalExchange} enabled, will trade on ${signalExchange}`);
                } else {
                    console.log(`⚠️ User doesn't have ${signalExchange} enabled - skipping trade`);
                    return {
                        userId: user.id,
                        username: user.username,
                        success: false,
                        message: `Exchange ${signalExchange} is not enabled for trading`
                    };
                }
            } else {
                // No exchange specified in signal - use user's active exchanges
                console.log(`📍 No exchange specified in signal - using user's active exchanges`);
                
                // Get user's active exchanges sorted by priority
                const activeExchanges = user.activeExchanges
                    .filter(ex => ex.trading_enabled)
                    .sort((a, b) => a.trading_priority - b.trading_priority)
                    .map(ex => ex.exchange);
                
                if (activeExchanges.length === 0) {
                    console.log(`⚠️ No active exchanges for user ${user.username}`);
                    return {
                        userId: user.id,
                        username: user.username,
                        success: false,
                        message: 'No active exchanges configured for trading'
                    };
                }
                
                // Limit to max simultaneous exchanges
                const maxExchanges = Math.min(user.maxSimultaneousExchanges, activeExchanges.length);
                targetExchanges = activeExchanges.slice(0, maxExchanges);
                
                console.log(`✅ User has ${activeExchanges.length} active exchanges, will trade on: ${targetExchanges.join(', ')}`);
            }

            // Check operation type
            const operation = signal.operation || 'OPEN_POSITION';
            console.log(`📋 Operation type: ${operation}`);

            // Handle CLOSE_POSITION operation
            if (operation === 'CLOSE_POSITION' || operation === 'CLOSE_POSITION_EMA21') {
                console.log(`🔒 Processing CLOSE operation for ${signal.symbol} on ${targetExchanges.join(', ')}`);
                return await this.handleClosePositionMultiple(signal, user, targetExchanges, operation);
            }

            // Handle OPEN_POSITION operation
            // Check for existing open positions
            const openPositions = await this.getOpenPositions(user.id);
            console.log(`📊 User has ${openPositions.length} open positions`);

            // Rule 1: Max 3 simultaneous positions
            if (openPositions.length >= 3) {
                console.log(`⚠️ User already has 3 open positions (max limit)`);
                return {
                    userId: user.id,
                    username: user.username,
                    success: false,
                    message: 'Maximum 3 simultaneous positions allowed'
                };
            }

            // Rule 2: No duplicate currency
            const existingSymbols = openPositions.map(p => p.symbol);
            if (existingSymbols.includes(signal.symbol)) {
                console.log(`⚠️ User already has an open position for ${signal.symbol}`);
                return {
                    userId: user.id,
                    username: user.username,
                    success: false,
                    message: `Already have an open position for ${signal.symbol}`
                };
            }

            // Execute trades on all target exchanges
            const results = [];
            let totalFees = 0;
            
            for (const targetExchange of targetExchanges) {
                try {
                    console.log(`🔄 Processing trade on ${targetExchange}...`);
                    
                    // Get user's API credentials for this exchange
                    const credentials = await this.apiKeyManager.getAPICredentials(user.id, targetExchange);
                    if (!credentials.success || !credentials.isActive) {
                        console.log(`⚠️ Missing or inactive API key for ${targetExchange} - skipping`);
                        results.push({
                            exchange: targetExchange,
                            success: false,
                            message: `API key for ${targetExchange} is not available or inactive`
                        });
                        continue;
                    }

                    // Get balance for this exchange
                    console.log(`💰 Fetching balance for ${signal.symbol} from ${targetExchange}...`);
                    const balanceInfo = await this.getRealExchangeBalance(targetExchange, credentials, signal.symbol);

                    if (!balanceInfo || balanceInfo.balance <= 0) {
                        console.log(`⚠️ No ${balanceInfo.token} balance on ${targetExchange}: ${balanceInfo.balance}`);
                        results.push({
                            exchange: targetExchange,
                            success: false,
                            message: `Insufficient ${balanceInfo.token} balance on ${targetExchange} (${balanceInfo.balance.toFixed(2)})`
                        });
                        continue;
                    }

                    // Use user's configured position size percentage (default 10%)
                    const positionSizePercent = await this.getUserPositionSizePercentage(user.id);
                    const positionSize = balanceInfo.balance * (positionSizePercent / 100);
                    
                    console.log(`💰 Balance calculation for ${targetExchange}:`, {
                        exchange: targetExchange,
                        symbol: signal.symbol,
                        token: balanceInfo.token,
                        tokenBalance: balanceInfo.balance.toFixed(2),
                        positionSize: positionSize.toFixed(2),
                        percentage: `${positionSizePercent}%`
                    });

                    if (positionSize < 10) {
                        results.push({
                            exchange: targetExchange,
                            success: false,
                            message: `Minimum position size $10 required (current ${balanceInfo.token}: ${positionSize.toFixed(2)})`
                        });
                        continue;
                    }

                    // Calculate quantity - use signal quantity if provided, otherwise calculate
                    const calculatedQty = signal.qty || signal.quantity || this.calculateQuantity(signal.symbol, positionSize, signal.price);

                    console.log(`📊 Trade calculation for ${user.username} on ${targetExchange}:`, {
                        positionSize,
                        signalQuantity: signal.quantity,
                        calculatedQty,
                        symbol: signal.symbol,
                        price: signal.price,
                        exchange: targetExchange
                    });

                    // Validate quantity
                    if (!calculatedQty || calculatedQty <= 0 || isNaN(calculatedQty)) {
                        results.push({
                            exchange: targetExchange,
                            success: false,
                            message: `Invalid quantity calculated: ${calculatedQty} (positionSize: $${positionSize})`
                        });
                        continue;
                    }

                    // Execute trade on this exchange
                    const result = await this.executeTradeOnExchange(
                        signal, 
                        aiDecision, 
                        user, 
                        planConfig, 
                        targetExchange, 
                        calculatedQty, 
                        positionSize
                    );
                    
                    results.push(result);
                    
                    // Add to total fees if successful
                    if (result.success && result.fee) {
                        totalFees += result.fee;
                    }
                    
                } catch (error) {
                    console.error(`❌ Error executing trade on ${targetExchange} for ${user.username}:`, error);
                    results.push({
                        exchange: targetExchange,
                        success: false,
                        message: `Failed on ${targetExchange}: ${error.message}`
                    });
                }
            }

            // Return consolidated result
            const successfulTrades = results.filter(r => r.success);
            const failedTrades = results.filter(r => !r.success);
            
            return {
                userId: user.id,
                username: user.username,
                success: successfulTrades.length > 0,
                message: `Executed ${successfulTrades.length}/${targetExchanges.length} trades successfully`,
                exchanges: targetExchanges,
                results: results,
                totalFees: totalFees,
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

    async getUserPositionSizePercentage(userId) {
        try {
            const result = await this.dbPoolManager.executeRead(
                `SELECT position_size_percentage FROM users WHERE id = $1`,
                [userId]
            );
            const pct = parseFloat(result.rows[0]?.position_size_percentage);
            if (!isNaN(pct) && pct > 0) {
                return pct;
            }
            return 10; // default 10%
        } catch (e) {
            return 10; // default on error
        }
    }

    /**
     * Get open positions for a user
     */
    async getOpenPositions(userId) {
        try {
            const result = await this.dbPoolManager.executeRead(`
                SELECT 
                    id,
                    position_id,
                    symbol,
                    operation_type,
                    side,
                    entry_price,
                    quantity,
                    exchange,
                    entry_time,
                    amount as position_size
                FROM trading_operations
                WHERE user_id = $1
                AND status = 'OPEN'
                ORDER BY entry_time DESC
            `, [userId]);

            return result.rows || [];
        } catch (error) {
            console.error('❌ Error getting open positions:', error);
            return [];
        }
    }

    async getUserMarginMode(userId) {
        try {
            const result = await this.dbPoolManager.executeRead(
                `SELECT 'ISOLATED' as margin_mode` // Default to ISOLATED since margin_mode column doesn't exist
                [userId]
            );
            const mode = (result.rows[0]?.margin_mode || 'ISOLATED').toUpperCase();
            return mode === 'CROSS' ? 'CROSS' : 'ISOLATED';
        } catch (e) {
            return 'ISOLATED';
        }
    }

    /**
     * Handle CLOSE_POSITION operation for multiple exchanges
     */
    async handleClosePositionMultiple(signal, user, targetExchanges, operation) {
        try {
            const results = [];
            let totalPnl = 0;
            let totalCommission = 0;
            
            for (const targetExchange of targetExchanges) {
                try {
                    console.log(`🔒 Processing CLOSE operation for ${signal.symbol} on ${targetExchange}...`);
                    
                    // Find open position for this symbol on this exchange
                    const openPosition = await this.dbPoolManager.executeRead(`
                        SELECT 
                            id,
                            position_id,
                            symbol,
                            operation_type,
                            side,
                            entry_price,
                            quantity,
                            exchange,
                            entry_time,
                            amount as position_size,
                            exchange_order_id as order_id
                        FROM trading_operations
                        WHERE user_id = $1
                        AND symbol = $2
                        AND exchange = $3
                        AND status = 'OPEN'
                        LIMIT 1
                    `, [user.id, signal.symbol, targetExchange]);

                    if (openPosition.rows.length === 0) {
                        console.log(`ℹ️ No open position found for ${signal.symbol} on ${targetExchange}`);
                        results.push({
                            exchange: targetExchange,
                            success: false,
                            message: `No open position found for ${signal.symbol} on ${targetExchange}`
                        });
                        continue;
                    }

                    const position = openPosition.rows[0];
                    console.log(`📍 Found open position: ${position.operation_id} on ${targetExchange}`);

                    // Get exchange service to close position
                    const credentials = await this.apiKeyManager.getAPICredentials(user.id, targetExchange);
                    const exchangeService = await this.createUserExchangeService(targetExchange, credentials);

                    // Close the position
                    const exitPrice = parseFloat(signal.price) || 0;
                    const entryPrice = parseFloat(position.entry_price) || 0;
                    const quantity = parseFloat(position.quantity) || 0;

                    // Calculate P&L
                    const isLong = position.operation_type === 'LONG';
                    const pnlUsd = (exitPrice - entryPrice) * quantity * (isLong ? 1 : -1);
                    const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100 * (isLong ? 1 : -1);
                    const isProfitable = pnlUsd > 0;

                    console.log(`💰 P&L Calculation for ${targetExchange}:`, {
                        entryPrice,
                        exitPrice,
                        quantity,
                        pnlUsd: pnlUsd.toFixed(2),
                        pnlPercent: pnlPercent.toFixed(2) + '%',
                        isProfitable
                    });

                    // Calculate commission ONLY if profitable
                    let commission = 0;
                    let commissionPercent = 0;
                    if (isProfitable) {
                        const planConfig = this.PLAN_PRIORITIES[user.plan_type] || this.PLAN_PRIORITIES['TRIAL'];
                        commissionPercent = planConfig.commission || 0;
                        commission = (pnlUsd * commissionPercent) / 100;
                        console.log(`💵 Commission for ${targetExchange}: ${commissionPercent}% of $${pnlUsd.toFixed(2)} = $${commission.toFixed(2)}`);
                    } else {
                        console.log(`ℹ️ No commission charged on losing trade for ${targetExchange}`);
                    }

                    const netPnl = pnlUsd - commission;
                    totalPnl += pnlUsd;
                    totalCommission += commission;

                    // Close position in database
                    const duration = Math.floor((Date.now() - new Date(position.entry_time).getTime()) / 60000);
                    
                    await this.dbPoolManager.executeWrite(`
                        UPDATE trading_operations
                        SET
                            exit_price = $1,
                            exit_time = NOW(),
                            status = 'CLOSED',
                            duration_minutes = $2,
                            profit_loss_usd = $3,
                            profit_loss_percentage = $4,
                            net_pnl = $5,
                            commission_charged = $6,
                            close_reason = $7,
                            updated_at = NOW()
                        WHERE operation_id = $8
                    `, [
                        exitPrice,
                        duration,
                        pnlUsd,
                        pnlPercent,
                        netPnl,
                        commission,
                        operation, // 'CLOSE_POSITION' or 'CLOSE_POSITION_EMA21'
                        position.operation_id
                    ]);

                    console.log(`✅ Position closed on ${targetExchange}: ${position.operation_id} - Net P&L: $${netPnl.toFixed(2)}`);

                    // Update affiliate commission if profitable
                    if (isProfitable && commission > 0) {
                        try {
                            console.log(`🤝 Calculating affiliate commission for user ${user.id} on ${targetExchange}...`);
                            const affiliateCommission = await this.affiliateService.calculateTradingCommission(
                                user.id, 
                                commission // Commission amount goes to affiliate
                            );
                            
                            if (affiliateCommission) {
                                console.log(`💰 Affiliate commission: $${affiliateCommission.commission.toFixed(2)} for affiliate ${affiliateCommission.affiliateId}`);
                                
                                tradingWebSocket.broadcastAffiliateCommission(affiliateCommission.affiliateId, {
                                    affiliateId: affiliateCommission.affiliateId,
                                    amount: affiliateCommission.commission,
                                    source: 'trading_profit',
                                    description: `Profit commission from ${user.username} - ${signal.symbol} closed on ${targetExchange}`
                                });
                            }
                        } catch (error) {
                            console.error(`❌ Error calculating affiliate commission for ${targetExchange}:`, error);
                        }
                    }

                    // Broadcast position closed
                    tradingWebSocket.broadcastOperationClosed(user.id, {
                        position_id: position.position_id || position.id,
                        symbol: signal.symbol,
                        entry_price: entryPrice,
                        exit_price: exitPrice,
                        profit_loss_usd: pnlUsd,
                        profit_loss_percentage: pnlPercent,
                        net_pnl: netPnl,
                        commission: commission,
                        duration_minutes: duration,
                        close_reason: operation,
                        exchange: targetExchange
                    });

                    results.push({
                        exchange: targetExchange,
                        success: true,
                        operation: 'CLOSE_POSITION',
                        positionClosed: true,
                        symbol: signal.symbol,
                        entryPrice,
                        exitPrice,
                        pnlUsd,
                        pnlPercent,
                        commission,
                        netPnl,
                        isProfitable,
                        duration,
                        message: `Position closed on ${targetExchange} - ${isProfitable ? 'Profit' : 'Loss'}: $${pnlUsd.toFixed(2)} (${pnlPercent.toFixed(2)}%)`
                    });
                    
                } catch (error) {
                    console.error(`❌ Error handling close position on ${targetExchange}:`, error);
                    results.push({
                        exchange: targetExchange,
                        success: false,
                        message: `Failed to close position on ${targetExchange}: ${error.message}`
                    });
                }
            }

            // Update user performance if any positions were closed
            const successfulCloses = results.filter(r => r.success);
            if (successfulCloses.length > 0) {
                await this.updateUserPerformance(user.id);
            }

            return {
                userId: user.id,
                username: user.username,
                success: successfulCloses.length > 0,
                message: `Closed ${successfulCloses.length}/${targetExchanges.length} positions successfully`,
                exchanges: targetExchanges,
                results: results,
                totalPnl: totalPnl,
                totalCommission: totalCommission,
                operation: 'CLOSE_POSITION',
                timestamp: new Date().toISOString(),
                personalKey: true
            };

        } catch (error) {
            console.error(`❌ Error handling close position multiple:`, error);
            return {
                userId: user.id,
                username: user.username,
                success: false,
                message: error.message,
                operation: 'CLOSE_POSITION'
            };
        }
    }

    /**
     * Handle CLOSE_POSITION operation (legacy method for single exchange)
     */
    async handleClosePosition(signal, user, targetExchange, operation) {
        try {
            // Find open position for this symbol
            const openPosition = await this.dbPoolManager.executeRead(`
                SELECT 
                    id,
                    position_id,
                    symbol,
                    operation_type,
                    side,
                    entry_price,
                    quantity,
                    exchange,
                    entry_time,
                    amount as position_size,
                    exchange_order_id as order_id
                FROM trading_operations
                WHERE user_id = $1
                AND symbol = $2
                AND exchange = $3
                AND status = 'OPEN'
                LIMIT 1
            `, [user.id, signal.symbol, targetExchange]);

            if (openPosition.rows.length === 0) {
                console.log(`ℹ️ No open position found for ${signal.symbol} on ${targetExchange}`);
                return {
                    userId: user.id,
                    username: user.username,
                    success: false,
                    message: `No open position found for ${signal.symbol} on ${targetExchange}`,
                    operation: 'CLOSE_POSITION'
                };
            }

            const position = openPosition.rows[0];
            console.log(`📍 Found open position: ${position.operation_id}`);

            // Get exchange service to close position
            const credentials = await this.apiKeyManager.getAPICredentials(user.id, targetExchange);
            const exchangeService = await this.createUserExchangeService(targetExchange, credentials);

            // Close the position
            const exitPrice = parseFloat(signal.price) || 0;
            const entryPrice = parseFloat(position.entry_price) || 0;
            const quantity = parseFloat(position.quantity) || 0;

            // Calculate P&L
            const isLong = position.operation_type === 'LONG';
            const pnlUsd = (exitPrice - entryPrice) * quantity * (isLong ? 1 : -1);
            const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100 * (isLong ? 1 : -1);
            const isProfitable = pnlUsd > 0;

            console.log(`💰 P&L Calculation:`, {
                entryPrice,
                exitPrice,
                quantity,
                pnlUsd: pnlUsd.toFixed(2),
                pnlPercent: pnlPercent.toFixed(2) + '%',
                isProfitable
            });

            // Calculate commission ONLY if profitable
            let commission = 0;
            let commissionPercent = 0;
            if (isProfitable) {
                const planConfig = this.PLAN_PRIORITIES[user.plan_type] || this.PLAN_PRIORITIES['TRIAL'];
                commissionPercent = planConfig.commission || 0;
                commission = (pnlUsd * commissionPercent) / 100;
                console.log(`💵 Commission: ${commissionPercent}% of $${pnlUsd.toFixed(2)} = $${commission.toFixed(2)}`);
            } else {
                console.log(`ℹ️ No commission charged on losing trade`);
            }

            const netPnl = pnlUsd - commission;

            // Close position in database
            const duration = Math.floor((Date.now() - new Date(position.entry_time).getTime()) / 60000);
            
            await this.dbPoolManager.executeWrite(`
                UPDATE trading_operations
                SET
                    exit_price = $1,
                    exit_time = NOW(),
                    status = 'CLOSED',
                    duration_minutes = $2,
                    profit_loss_usd = $3,
                    profit_loss_percentage = $4,
                    net_pnl = $5,
                    commission_charged = $6,
                    close_reason = $7,
                    updated_at = NOW()
                WHERE operation_id = $8
            `, [
                exitPrice,
                duration,
                pnlUsd,
                pnlPercent,
                netPnl,
                commission,
                operation, // 'CLOSE_POSITION' or 'CLOSE_POSITION_EMA21'
                position.operation_id
            ]);

            console.log(`✅ Position closed: ${position.operation_id} - Net P&L: $${netPnl.toFixed(2)}`);

            // Update affiliate commission if profitable
            if (isProfitable && commission > 0) {
                try {
                    console.log(`🤝 Calculating affiliate commission for user ${user.id}...`);
                    const affiliateCommission = await this.affiliateService.calculateTradingCommission(
                        user.id, 
                        commission // Commission amount goes to affiliate
                    );
                    
                    if (affiliateCommission) {
                        console.log(`💰 Affiliate commission: $${affiliateCommission.commission.toFixed(2)} for affiliate ${affiliateCommission.affiliateId}`);
                        
                        tradingWebSocket.broadcastAffiliateCommission(affiliateCommission.affiliateId, {
                            affiliateId: affiliateCommission.affiliateId,
                            amount: affiliateCommission.commission,
                            source: 'trading_profit',
                            description: `Profit commission from ${user.username} - ${signal.symbol} closed`
                        });
                    }
                } catch (error) {
                    console.error(`❌ Error calculating affiliate commission:`, error);
                }
            }

            // Broadcast position closed
            tradingWebSocket.broadcastOperationClosed(user.id, {
                position_id: position.position_id || position.id,
                symbol: signal.symbol,
                entry_price: entryPrice,
                exit_price: exitPrice,
                profit_loss_usd: pnlUsd,
                profit_loss_percentage: pnlPercent,
                net_pnl: netPnl,
                commission: commission,
                duration_minutes: duration,
                close_reason: operation
            });

            // Update user performance
            await this.updateUserPerformance(user.id);

            return {
                userId: user.id,
                username: user.username,
                exchange: targetExchange,
                success: true,
                operation: 'CLOSE_POSITION',
                positionClosed: true,
                symbol: signal.symbol,
                entryPrice,
                exitPrice,
                pnlUsd,
                pnlPercent,
                commission,
                netPnl,
                isProfitable,
                duration,
                message: `Position closed - ${isProfitable ? 'Profit' : 'Loss'}: $${pnlUsd.toFixed(2)} (${pnlPercent.toFixed(2)}%)`,
                timestamp: new Date().toISOString(),
                personalKey: true
            };

        } catch (error) {
            console.error(`❌ Error handling close position:`, error);
            return {
                userId: user.id,
                username: user.username,
                success: false,
                message: error.message,
                operation: 'CLOSE_POSITION'
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

            // Prepare trade parameters for futures/perpetual isolated by default
            const marginMode = await this.getUserMarginMode(user.id);
            const tradeParams = {
                category: 'linear', // futures/perpetual
                symbol: signal.symbol,
                side: aiDecision.action === 'BUY' ? 'Buy' : 'Sell',
                orderType: 'Market',
                qty: calculatedQty,
                timeInForce: 'IOC',
                reduceOnly: false,
                positionIdx: marginMode === 'ISOLATED' ? 1 : 0, // 1 isolated, 0 cross in Bybit
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
            return new BybitService({
                apiKey: credentials.apiKey,
                apiSecret: credentials.apiSecret
            });
        } else {
            const BinanceService = require('../../services/exchange/binance-service');
            return new BinanceService({
                apiKey: credentials.apiKey,
                apiSecret: credentials.apiSecret
            });
        }
    }

    /**
     * Get balance of specific token from exchange
     * @param {string} exchange - Exchange name (bybit/binance)
     * @param {object} credentials - User's API credentials
     * @param {string} symbol - Trading pair (e.g., BTCUSDT)
     * @returns {object} { token: 'USDT', balance: 1000.50 }
     */
    async getRealExchangeBalance(exchange, credentials, symbol) {
        try {
            // Extract quote currency from trading pair
            // BTCUSDT → USDT, ETHUSDT → USDT, BTCBUSD → BUSD
            const quoteCurrency = this.getQuoteCurrency(symbol);
            console.log(`🔍 Fetching ${quoteCurrency} balance from ${exchange} API...`);
            
            const exchangeService = await this.createUserExchangeService(exchange, credentials);
            
            if (exchange === 'bybit') {
                const walletBalance = await exchangeService.getWalletBalance('UNIFIED');
                
                if (walletBalance && walletBalance.success && walletBalance.result) {
                    const walletData = walletBalance.result.list?.[0] || {};
                    const coins = walletData.coin || [];
                    
                    // Find the specific token
                    const tokenData = coins.find(c => c.coin === quoteCurrency);
                    const tokenBalance = tokenData 
                        ? parseFloat(tokenData.walletBalance || 0)
                        : 0;
                    
                    console.log(`✅ Bybit ${quoteCurrency} balance: ${tokenBalance.toFixed(2)}`);
                    return {
                        token: quoteCurrency,
                        balance: tokenBalance
                    };
                }
                
                console.log(`⚠️ Bybit: No wallet data found`);
                return { token: quoteCurrency, balance: 0 };
                
            } else if (exchange === 'binance') {
                const accountInfo = await exchangeService.getAccountBalance();
                
                if (accountInfo && accountInfo.success && accountInfo.result) {
                    const balances = accountInfo.result.balances || [];
                    
                    // Find the specific token
                    const tokenData = balances.find(b => b.asset === quoteCurrency);
                    const tokenBalance = tokenData 
                        ? parseFloat(tokenData.free || 0) + parseFloat(tokenData.locked || 0)
                        : 0;
                    
                    console.log(`✅ Binance ${quoteCurrency} balance: ${tokenBalance.toFixed(2)}`);
                    return {
                        token: quoteCurrency,
                        balance: tokenBalance
                    };
                }
                
                console.log(`⚠️ Binance: No account data found`);
                return { token: quoteCurrency, balance: 0 };
            }
            
            return { token: quoteCurrency, balance: 0 };
            
        } catch (error) {
            console.error(`❌ Error fetching balance from ${exchange}:`, error.message);
            return { token: 'USDT', balance: 0 };
        }
    }

    /**
     * Extract quote currency from trading pair
     * BTCUSDT → USDT, ETHBUSD → BUSD, LINKUSDT.P → USDT
     */
    getQuoteCurrency(symbol) {
        // Remove .P suffix for perpetual futures
        const cleanSymbol = symbol.replace('.P', '');
        
        // Common quote currencies
        if (cleanSymbol.endsWith('USDT')) return 'USDT';
        if (cleanSymbol.endsWith('BUSD')) return 'BUSD';
        if (cleanSymbol.endsWith('USDC')) return 'USDC';
        if (cleanSymbol.endsWith('USD')) return 'USD';
        if (cleanSymbol.endsWith('BTC')) return 'BTC';
        if (cleanSymbol.endsWith('ETH')) return 'ETH';
        
        // Default to USDT
        return 'USDT';
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
                    user_id, position_id, signal_id, symbol, operation_type,
                    side, entry_price, quantity, exchange, exchange_order_id,
                    amount, commission, leverage,
                    status, entry_time
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING id, position_id
            `, [
                tradeData.userId,                                    // $1: user_id
                operationId,                                         // $2: position_id
                tradeId,                                             // $3: signal_id
                tradeData.symbol,                                    // $4: symbol
                tradeData.side === 'BUY' ? 'LONG' : 'SHORT',        // $5: operation_type
                tradeData.side,                                      // $6: side
                tradeData.executedPrice,                             // $7: entry_price
                tradeData.executedQty,                               // $8: quantity
                tradeData.exchange,                                  // $9: exchange
                tradeData.orderId,                                   // $10: exchange_order_id
                tradeData.positionSize,                              // $11: amount
                tradeData.commission || 0,                           // $12: commission
                tradeData.leverage || 1,                             // $13: leverage
                'OPEN',                                              // $14: status
                new Date().toISOString()                             // $15: entry_time
            ]);

            console.log(`💾 Trade saved to trading_operations: ${operationId} for user ${tradeData.username}`);

            // Broadcast new operation to user via WebSocket
            const tradingWebSocket = require('../../services/websocket/trading-websocket');
            tradingWebSocket.broadcastNewOperation(tradeData.userId, {
                position_id: operationId,
                symbol: tradeData.symbol,
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
                position_id: operationId,
                symbol: exitData.symbol,
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
