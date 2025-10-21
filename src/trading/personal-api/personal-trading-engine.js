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
const PositionManagementService = require('../../services/position/position-management-service');

class PersonalTradingEngine {
    constructor(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
        this.apiKeyManager = new UserAPIKeyManager(dbPoolManager);
        this.aiDecision = new AIDecision();
        this.marketAnalyzer = new MarketAnalyzer();
        this.affiliateService = new RealAffiliateService();
        this.affiliateService.setDbPoolManager(dbPoolManager);

        // Initialize hybrid position management service for real-time position checking
        this.positionManagementService = new PositionManagementService(dbPoolManager, this.apiKeyManager);
        console.log('✅ Trading Engine: Hybrid position management enabled (real-time from exchange)');

        // Plan-based execution priorities
        this.PLAN_PRIORITIES = {
            'PRO_BR': { priority: 1, delay: 0, commission: 10 },
            'PRO_US': { priority: 1, delay: 0, commission: 10 },
            'FLEX_BR': { priority: 2, delay: 1000, commission: 20 },
            'FLEX_US': { priority: 2, delay: 1000, commission: 20 },
            'TRIAL': { priority: 3, delay: 3000, commission: 0 }
        };

        // Symbol info cache (exchange:symbol -> info)
        this.symbolInfoCache = new Map();

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

            console.log('🔍 DEBUG: executionResults =', executionResults);

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
                    u.trading_mode,
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
            `, []);

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
                // Get available exchanges from user's API keys
                preferredExchanges: user.activeExchanges.map(ex => ex.exchange),
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

            console.log('🔍 DEBUG: planResults =', planResults);

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
            
            // if (signal.exchange) {
            //     // Signal specifies exchange - use it if user has it enabled
            //     const signalExchange = signal.exchange.toLowerCase();
            //     console.log(`📍 Signal specifies exchange: ${signalExchange}`);
                
            //     const hasExchange = user.activeExchanges.find(ex => 
            //         ex.exchange === signalExchange && ex.trading_enabled
            //     );
                
            //     if (hasExchange) {
            //         targetExchanges = [signalExchange];
            //         console.log(`✅ User has ${signalExchange} enabled, will trade on ${signalExchange}`);
            //     } else {
            //         console.log(`⚠️ User doesn't have ${signalExchange} enabled - skipping trade`);
            //         return {
            //             userId: user.id,
            //             username: user.username,
            //             success: false,
            //             message: `Exchange ${signalExchange} is not enabled for trading`
            //         };
            //     }
            // } else {
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
                
                // If user has both Bybit and Binance enabled, trade on both
                // Otherwise, use the available exchanges up to the limit
                const maxExchanges = Math.min(user.maxSimultaneousExchanges, activeExchanges.length);
                targetExchanges = activeExchanges.slice(0, maxExchanges);
                
                console.log(`✅ User has ${activeExchanges.length} active exchanges: [${activeExchanges.join(', ')}]`);
                console.log(`🎯 Will trade on: [${targetExchanges.join(', ')}] (max: ${maxExchanges})`);
            // }

            // Check operation type
            const operation = signal.operation || 'OPEN_POSITION';
            console.log(`📋 Operation type: ${operation}`);

            // Determine action (BUY/SELL) based on operation type
            let determinedAction = null;
            if (operation === 'OPEN_LONG') {
                determinedAction = 'BUY';  // Open LONG = BUY
            } else if (operation === 'OPEN_SHORT') {
                determinedAction = 'SELL'; // Open SHORT = SELL
            } else if (operation === 'CLOSE_LONG') {
                determinedAction = 'SELL'; // Close LONG = SELL (exit)
            } else if (operation === 'CLOSE_SHORT') {
                determinedAction = 'BUY';  // Close SHORT = BUY (exit)
            }

            // Override AI decision if operation type explicitly specifies action
            if (determinedAction) {
                aiDecision.action = determinedAction;
                console.log(`📊 Action determined from operation type: ${operation} → ${determinedAction}`);
            }

            // Handle CLOSE operations (CLOSE_LONG, CLOSE_SHORT, legacy CLOSE_POSITION)
            if (operation === 'CLOSE_LONG' || operation === 'CLOSE_SHORT' ||
                operation === 'CLOSE_POSITION' || operation === 'CLOSE_POSITION_EMA21') {
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

            // Rule 2: Check for existing position on same symbol
            const existingPosition = openPositions.find(p => p.symbol === signal.symbol);
            if (existingPosition) {
                console.log(`📍 Found existing position for ${signal.symbol}: ${existingPosition.operation_type}`);

                // Determine the new position type from operation
                const newPositionType = (operation === 'OPEN_LONG') ? 'LONG' :
                                       (operation === 'OPEN_SHORT') ? 'SHORT' : null;

                if (newPositionType && existingPosition.operation_type === newPositionType) {
                    // Same direction - skip (already have this position)
                    console.log(`⚠️ Already have ${newPositionType} position for ${signal.symbol} - skipping`);
                    return {
                        userId: user.id,
                        username: user.username,
                        success: false,
                        message: `Already have ${newPositionType} position for ${signal.symbol}`
                    };
                } else if (newPositionType && existingPosition.operation_type !== newPositionType) {
                    // Opposite direction - REVERSAL STRATEGY
                    console.log(`🔄 Reversal detected: Closing ${existingPosition.operation_type} to open ${newPositionType} for ${signal.symbol}`);

                    // First, close the existing position
                    const closeOperation = existingPosition.operation_type === 'LONG' ? 'CLOSE_LONG' : 'CLOSE_SHORT';
                    console.log(`🔒 Step 1: Closing existing ${existingPosition.operation_type} position...`);

                    await this.handleClosePositionMultiple(signal, user, targetExchanges, closeOperation);

                    console.log(`✅ Step 1 complete. Now proceeding with ${newPositionType} position...`);
                    // Continue to open new position below
                }
            }

            // Execute trades on all target exchanges
            const results = [];
            let totalFees = 0;
            
            for (const targetExchange of targetExchanges) {
                try {
                    console.log(`🔄 Processing trade on ${targetExchange}...`);
                    
                    // Get user's API credentials for this exchange
                    const credentials = await this.apiKeyManager.getAPICredentials(user.id, targetExchange);
                    if (!credentials.success || !credentials.enabled) {
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
                    
                    // Fix symbol format for balance fetching
                    let balanceSymbol = signal.symbol;
                    if (targetExchange.toLowerCase() === 'bybit') {
                        balanceSymbol = signal.symbol.replace(/\.P/g, '');
                    }
                    
                    const balanceInfo = await this.getRealExchangeBalance(targetExchange, credentials, balanceSymbol);

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

                    // if (positionSize < 10) {
                    //     results.push({
                    //         exchange: targetExchange,
                    //         success: false,
                    //         message: `Minimum position size $10 required (current ${balanceInfo.token}: ${positionSize.toFixed(2)})`
                    //     });
                    //     continue;
                    // }

                    // Calculate quantity based on position size and price
                    // IMPORTANT: Always calculate from user's position size, NOT from signal quantity
                    // Signal quantity is for reference only (from TradingView's position)
                    const calculatedQty = await this.calculateQuantity(
                        targetExchange,      // Add exchange parameter
                        balanceSymbol,       // Use cleaned symbol (no .P)
                        positionSize,
                        signal.price
                    );

                    // Validate result
                    if (!calculatedQty || calculatedQty <= 0) {
                        console.error(`❌ Failed to calculate valid quantity for ${signal.symbol} on ${targetExchange}`);
                        results.push({
                            exchange: targetExchange,
                            success: false,
                            message: `Failed to calculate valid quantity. Position size ($${positionSize.toFixed(2)}) may be too small for ${balanceSymbol} (min: ${(await this.getSymbolInfo(targetExchange, balanceSymbol)).minQty * signal.price} USD)`
                        });
                        continue;
                    }

                    console.log(`✅ Trade calculation for ${user.username} on ${targetExchange}:`, {
                        positionSize: `$${positionSize.toFixed(2)}`,
                        price: signal.price,
                        calculatedQty: calculatedQty,
                        signalQuantityIgnored: signal.quantity || signal.qty,
                        symbol: balanceSymbol,
                        exchange: targetExchange,
                        note: 'Using exchange-validated quantity calculation'
                    });

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
            // Try to get position_size_percentage from users table
            const result = await this.dbPoolManager.executeRead(
                `SELECT position_size_percentage FROM users WHERE id = $1`,
                [userId]
            );
            
            if (result.rows.length > 0) {
                const pct = parseFloat(result.rows[0]?.position_size_percentage);
                if (!isNaN(pct) && pct > 0 && pct <= 100) {
                    console.log(`📊 User ${userId} position size: ${pct}%`);
                    return pct;
                }
            }
            
            console.log(`⚠️ No valid position_size_percentage found for user ${userId}, using default 10%`);
            return 10; // default 10%
            
        } catch (error) {
            // Handle different types of errors
            if (error.message && error.message.includes('position_size_percentage')) {
                console.log(`⚠️ Column 'position_size_percentage' not found in users table, using default 10%`);
                console.log(`💡 Run migration: node scripts/database/add-position-size-percentage-column.js`);
                return 10; // default 10%
            }
            
            if (error.message && error.message.includes('relation "users" does not exist')) {
                console.log(`⚠️ Users table not found, using default 10%`);
                return 10; // default 10%
            }
            
            console.error(`❌ Error getting position size percentage for user ${userId}:`, error.message);
            return 10; // default on error
        }
    }

    /**
     * Get open positions for a user (UPDATED: Uses real-time data from exchange)
     */
    async getOpenPositions(userId) {
        try {
            // 🔄 HYBRID MODE: Get real-time positions from exchange
            console.log(`📡 Fetching REAL-TIME positions for user ${userId} from exchange...`);

            const realTimePositions = await this.positionManagementService.getCurrentPositions(userId);

            if (realTimePositions && realTimePositions.length > 0) {
                console.log(`✅ Got ${realTimePositions.length} REAL-TIME positions from exchange`);

                // Transform to match expected format
                const transformedPositions = realTimePositions.map(pos => ({
                    id: pos.operation_id || `temp_${Date.now()}`,
                    position_id: pos.position_id || pos.id,
                    symbol: pos.symbol,
                    operation_type: pos.side === 'Buy' ? 'LONG' : 'SHORT',
                    side: pos.side === 'Buy' ? 'LONG' : 'SHORT',
                    entry_price: pos.entryPrice,
                    quantity: pos.size,
                    exchange: pos.exchange,
                    entry_time: pos.entry_time || new Date().toISOString(),
                    position_size: pos.positionValue
                }));

                return transformedPositions;
            }

            // FALLBACK: If hybrid service fails, use database
            console.warn(`⚠️ No real-time positions, falling back to database for user ${userId}`);
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

            const dbPositions = result.rows || [];
            console.log(`📊 Got ${dbPositions.length} positions from database (fallback mode)`);
            return dbPositions;
        } catch (error) {
            console.error('❌ Error getting open positions:', error);

            // Final fallback: Try database
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

                console.log(`📊 Final fallback: ${result.rows?.length || 0} positions from database`);
                return result.rows || [];
            } catch (dbError) {
                console.error('❌ Database fallback also failed:', dbError);
                return [];
            }
        }
    }

    async getUserMarginMode(userId) {
        try {
            const result = await this.dbPoolManager.executeRead(
                `SELECT 'ISOLATED' as margin_mode`, // Default to ISOLATED since margin_mode column doesn't exist
                []
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

                    // Prepare close position parameters
                    const quantity = parseFloat(position.quantity) || 0;
                    const isLong = position.operation_type === 'LONG';
                    const closeSide = isLong ? 'SELL' : 'BUY'; // Opposite of entry side

                    console.log(`🔒 Closing ${position.operation_type} position: ${quantity} ${signal.symbol} via ${closeSide} order`);

                    // Place close order on exchange
                    const closeParams = {
                        symbol: signal.symbol.replace(/\.P/g, ''), // Remove .P suffix for Bybit
                        side: closeSide,
                        type: 'MARKET',
                        quantity: quantity.toString(),
                        reduceOnly: true, // Important: this closes the position without opening new one
                        timeInForce: 'IOC'
                    };

                    console.log(`🔥 Placing close order on ${targetExchange}:`, closeParams);

                    let closeResult;
                    try {
                        closeResult = await exchangeService.placeOrder(closeParams);
                        if (!closeResult.success) {
                            throw new Error(closeResult.error || closeResult.message || 'Order placement failed');
                        }
                        console.log(`✅ Close order placed successfully on ${targetExchange}:`, closeResult.orderId);
                    } catch (orderError) {
                        console.error(`❌ Failed to place close order on ${targetExchange}:`, orderError.message);
                        results.push({
                            exchange: targetExchange,
                            success: false,
                            message: `Failed to close position on ${targetExchange}: ${orderError.message}`
                        });
                        continue;
                    }

                    // Get actual exit price from order result
                    const exitPrice = parseFloat(closeResult.price || signal.price) || 0;
                    const entryPrice = parseFloat(position.entry_price) || 0;

                    // Calculate P&L
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
            
            // Fix symbol format for Bybit API
            let bybitSymbol = signal.symbol;
            if (exchange.toLowerCase() === 'bybit') {
                // Convert TradingView format to Bybit format
                // LIGHTUSDT.P -> LIGHTUSDT (remove .P suffix)
                // BTCUSDT.P -> BTCUSDT
                // Use global replace to remove all .P occurrences
                bybitSymbol = signal.symbol.replace(/\.P/g, '');
                console.log(`🔄 Converted symbol for Bybit: ${signal.symbol} -> ${bybitSymbol}`);
            }
            
            const tradeParams = {
                category: 'linear', // futures/perpetual
                symbol: bybitSymbol,
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

            // Check if order was placed successfully
            if (!result.success || !result.orderId) {
                console.error(`❌ Order placement failed for ${user.username} on ${exchange}:`, result.error);
                return {
                    userId: user.id,
                    username: user.username,
                    exchange,
                    success: false,
                    message: result.error || 'Order placement failed'
                };
            }

            console.log(`📋 Order placed: ${result.orderId}, verifying fill...`);

            // Verify order fill and get actual execution details
            const fillVerification = await exchangeService.verifyOrderFill(
                bybitSymbol,
                result.orderId,
                'linear',
                10000 // 10 second timeout
            );

            if (!fillVerification.success || !fillVerification.filled) {
                console.error(`❌ Order ${result.orderId} not filled:`, fillVerification.error);
                return {
                    userId: user.id,
                    username: user.username,
                    exchange,
                    success: false,
                    message: fillVerification.error || 'Order not filled',
                    orderId: result.orderId,
                    fillStatus: fillVerification.status
                };
            }

            // Calculate slippage
            const slippage = exchangeService.calculateSlippage(
                signal.price,
                fillVerification.avgFillPrice,
                tradeParams.side
            );

            console.log(`📊 Fill verification for ${user.username}:`, {
                orderId: fillVerification.orderId,
                status: fillVerification.status,
                requestedQty: fillVerification.requestedQty,
                filledQty: fillVerification.filledQty,
                fillPercent: `${fillVerification.fillPercent.toFixed(2)}%`,
                expectedPrice: signal.price,
                actualPrice: fillVerification.avgFillPrice,
                slippage: `${slippage.slippagePercent.toFixed(4)}%`,
                slippageBps: `${slippage.slippageBps.toFixed(2)} bps`,
                unfavorable: slippage.isUnfavorable ? '⚠️  Yes' : '✅ No'
            });

            // Warn about unfavorable slippage
            if (slippage.isUnfavorable && Math.abs(slippage.slippagePercent) > 0.1) {
                console.warn(`⚠️  Unfavorable slippage detected: ${slippage.slippagePercent.toFixed(4)}% for ${user.username}`);
            }

            // Warn about partial fills
            if (fillVerification.partialFill) {
                console.warn(`⚠️  Partial fill: ${fillVerification.fillPercent.toFixed(2)}% for ${user.username}`);
            }

            const tradeData = {
                userId: user.id,
                username: user.username,
                planType: user.plan_type,
                positionSize,
                commission: planConfig.commission,
                symbol: signal.symbol,
                side: aiDecision.action,
                success: true,
                message: `Order filled: ${fillVerification.fillPercent.toFixed(2)}%`,
                orderId: result.orderId,
                exchange,
                executedPrice: fillVerification.avgFillPrice,
                executedQty: fillVerification.filledQty,
                requestedQty: fillVerification.requestedQty,
                fillPercent: fillVerification.fillPercent,
                partialFill: fillVerification.partialFill,
                expectedPrice: signal.price,
                slippage: slippage.slippagePercent,
                slippageBps: slippage.slippageBps,
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
     * Get symbol info from exchange (with caching)
     * @param {string} exchange - Exchange name (bybit/binance)
     * @param {string} symbol - Trading pair (e.g., BTCUSDT)
     * @returns {Promise<Object>} Symbol info with minQty, maxQty, qtyStep, precision
     */
    async getSymbolInfo(exchange, symbol) {
        const cacheKey = `${exchange}:${symbol}`;

        // Check cache first (1 hour TTL)
        if (this.symbolInfoCache.has(cacheKey)) {
            const cached = this.symbolInfoCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 3600000) { // 1 hour
                return cached.info;
            }
        }

        try {
            let symbolInfo;

            if (exchange === 'bybit') {
                const bybitService = await this.getExchangeService(exchange);
                const data = await bybitService.getInstrumentInfo('linear', symbol);
                const list = data.list || [];

                if (list.length > 0) {
                    const info = list[0];
                    symbolInfo = {
                        symbol: info.symbol,
                        minQty: parseFloat(info.lotSizeFilter?.minOrderQty || '0.001'),
                        maxQty: parseFloat(info.lotSizeFilter?.maxOrderQty || '100'),
                        qtyStep: parseFloat(info.lotSizeFilter?.qtyStep || '0.001'),
                        precision: this.calculatePrecision(info.lotSizeFilter?.qtyStep || '0.001')
                    };
                }
            } else if (exchange === 'binance') {
                const binanceService = await this.getExchangeService(exchange);
                const exchangeInfo = await binanceService.getExchangeInfo();
                const symbolData = exchangeInfo.symbols.find(s => s.symbol === symbol);

                if (symbolData) {
                    const lotSizeFilter = symbolData.filters.find(f => f.filterType === 'LOT_SIZE');
                    symbolInfo = {
                        symbol: symbolData.symbol,
                        minQty: parseFloat(lotSizeFilter?.minQty || '0.001'),
                        maxQty: parseFloat(lotSizeFilter?.maxQty || '100'),
                        qtyStep: parseFloat(lotSizeFilter?.stepSize || '0.001'),
                        precision: this.calculatePrecision(lotSizeFilter?.stepSize || '0.001')
                    };
                }
            }

            // Cache the result
            if (symbolInfo) {
                this.symbolInfoCache.set(cacheKey, {
                    info: symbolInfo,
                    timestamp: Date.now()
                });
                return symbolInfo;
            }

            // Fallback to safe defaults
            console.warn(`⚠️  Could not fetch symbol info for ${symbol} on ${exchange}, using defaults`);
            return {
                symbol,
                minQty: 0.001,
                maxQty: 100,
                qtyStep: 0.001,
                precision: 3
            };

        } catch (error) {
            console.error(`❌ Failed to get symbol info for ${symbol} on ${exchange}:`, error.message);

            // Fallback to safe defaults
            return {
                symbol,
                minQty: 0.001,
                maxQty: 100,
                qtyStep: 0.001,
                precision: 3
            };
        }
    }

    /**
     * Calculate precision from step size
     * @param {string|number} stepSize - Step size (e.g., "0.001" or 0.001)
     * @returns {number} Number of decimal places
     */
    calculatePrecision(stepSize) {
        const stepStr = stepSize.toString();
        if (stepStr.includes('.')) {
            return stepStr.split('.')[1].length;
        }
        return 0;
    }

    /**
     * Round quantity to exchange's step size
     * @param {number} quantity - Raw quantity
     * @param {number} stepSize - Exchange step size
     * @returns {number} Rounded quantity
     */
    roundToStepSize(quantity, stepSize) {
        const precision = this.calculatePrecision(stepSize);
        const multiplier = 1 / stepSize;
        const rounded = Math.floor(quantity * multiplier) / multiplier;
        return parseFloat(rounded.toFixed(precision));
    }

    /**
     * Calculate and validate quantity (FIXED VERSION)
     * @param {string} exchange - Exchange name (bybit/binance)
     * @param {string} symbol - Trading pair (e.g., BTCUSDT)
     * @param {number} positionSizeUSD - Position size in USD
     * @param {number} actualPrice - Actual price from signal
     * @returns {Promise<number|null>} Calculated quantity or null if invalid
     */
    async calculateQuantity(exchange, symbol, positionSizeUSD, actualPrice) {
        try {
            // 1. Validate inputs
            if (!actualPrice || actualPrice <= 0) {
                console.error('❌ Invalid price for quantity calculation');
                return null;
            }

            if (!positionSizeUSD || positionSizeUSD <= 0) {
                console.error('❌ Invalid position size for quantity calculation');
                return null;
            }

            // 2. Get symbol info from exchange
            const symbolInfo = await this.getSymbolInfo(exchange, symbol);

            if (!symbolInfo) {
                console.error(`❌ Could not get symbol info for ${symbol} on ${exchange}`);
                return null;
            }

            console.log(`📊 Symbol info for ${symbol} on ${exchange}:`, {
                minQty: symbolInfo.minQty,
                maxQty: symbolInfo.maxQty,
                qtyStep: symbolInfo.qtyStep,
                precision: symbolInfo.precision
            });

            // 3. Calculate raw quantity
            const rawQuantity = positionSizeUSD / actualPrice;

            // 4. Round to exchange's step size
            const roundedQuantity = this.roundToStepSize(rawQuantity, symbolInfo.qtyStep);

            console.log(`📊 Quantity calculation:`, {
                positionSizeUSD: `$${positionSizeUSD.toFixed(2)}`,
                price: actualPrice,
                rawQuantity: rawQuantity.toFixed(8),
                qtyStep: symbolInfo.qtyStep,
                roundedQuantity: roundedQuantity,
                symbol: symbol,
                exchange: exchange
            });

            // 5. Validate against min/max
            if (roundedQuantity < symbolInfo.minQty) {
                console.error(`❌ Quantity ${roundedQuantity} below minimum ${symbolInfo.minQty} for ${symbol}`);
                console.error(`💡 Increase position size or use a cheaper asset`);
                console.error(`💡 Minimum required: $${(symbolInfo.minQty * actualPrice).toFixed(2)} USD`);
                return null;
            }

            if (roundedQuantity > symbolInfo.maxQty) {
                console.warn(`⚠️  Quantity ${roundedQuantity} exceeds maximum ${symbolInfo.maxQty} for ${symbol}`);
                console.warn(`⚠️  Using maximum allowed quantity: ${symbolInfo.maxQty}`);
                return symbolInfo.maxQty;
            }

            // 6. Validate quantity is multiple of step size
            const remainder = roundedQuantity % symbolInfo.qtyStep;
            if (remainder > 0.00000001) {  // Small tolerance for floating point
                console.warn(`⚠️  Quantity ${roundedQuantity} is not a multiple of step size ${symbolInfo.qtyStep}`);
                const adjusted = this.roundToStepSize(roundedQuantity, symbolInfo.qtyStep);
                console.warn(`⚠️  Adjusted to: ${adjusted}`);
                return adjusted;
            }

            return roundedQuantity;

        } catch (error) {
            console.error('❌ Error calculating quantity:', error.message);
            return null;
        }
    }

    /**
     * Save trade execution to database
     * FIXED: Updated to match actual database schema
     */
    async saveTradeExecution(tradeId, tradeData) {
        try {
            const operationId = `OP_${Date.now()}_${tradeData.userId}`;

            await this.dbPoolManager.executeWrite(`
                INSERT INTO trading_operations (
                    user_id, operation_id, trading_pair, operation_type,
                    price, entry_price, quantity, exchange, exchange_order_id,
                    position_size, leverage, status, entry_time,
                    symbol, side, amount,
                    personal_key, success, plan_type
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING id, operation_id
            `, [
                tradeData.userId,                                    // $1: user_id
                operationId,                                         // $2: operation_id
                tradeData.symbol,                                    // $3: trading_pair
                tradeData.side === 'BUY' ? 'LONG' : 'SHORT',        // $4: operation_type
                tradeData.executedPrice,                             // $5: price (REQUIRED - NOT NULL)
                tradeData.executedPrice,                             // $6: entry_price
                tradeData.executedQty,                               // $7: quantity
                tradeData.exchange,                                  // $8: exchange
                tradeData.orderId,                                   // $9: exchange_order_id
                tradeData.positionSize,                              // $10: position_size (percentage)
                tradeData.leverage || 1,                             // $11: leverage
                'OPEN',                                              // $12: status
                new Date().toISOString(),                            // $13: entry_time
                tradeData.symbol,                                    // $14: symbol (duplicate for queries)
                tradeData.side,                                      // $15: side (BUY/SELL)
                tradeData.positionSize,                              // $16: amount (position size in USD)
                true,                                                // $17: personal_key
                tradeData.success || false,                          // $18: success
                tradeData.planType || 'TRIAL'                        // $19: plan_type
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
