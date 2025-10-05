/**
 * 🏦 BALANCE-BASED TRADING ENGINE
 * Executes trades using admin API keys based on user balance pools
 */

const PlanValidator = require('../../services/user-config-manager/plan-validator');
const UnifiedExchangeService = require('../../services/exchange/unified-exchange-service');
const AIDecision = require('../enterprise/ai-decision');
const MarketAnalyzer = require('../enterprise/market-analyzer');
const tradingWebSocket = require('../../services/websocket/trading-websocket');
const PnLDistributionService = require('../../services/pnl/pnl-distribution-service');
const PositionTracker = require('../../services/position/position-tracker');

class BalanceTradingEngine {
    constructor(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
        this.planValidator = new PlanValidator(dbPoolManager);
        this.exchangeService = new UnifiedExchangeService();
        this.aiDecision = new AIDecision();
        this.marketAnalyzer = new MarketAnalyzer();
        this.pnlDistributionService = new PnLDistributionService(dbPoolManager);
        this.positionTracker = new PositionTracker(dbPoolManager, this.pnlDistributionService, tradingWebSocket);

        // Plan-based execution priorities
        this.PLAN_PRIORITIES = {
            'PRO_BR': { priority: 1, delay: 0, commission: 10 },
            'PRO_US': { priority: 1, delay: 0, commission: 10 },
            'FLEX_BR': { priority: 2, delay: 1000, commission: 20 },
            'FLEX_US': { priority: 2, delay: 1000, commission: 20 },
            'TRIAL': { priority: 3, delay: 3000, commission: 0 }
        };

        console.log('🏦 Balance Trading Engine initialized');
    }

    /**
     * Process signal for all active users with balances
     */
    async processSignalForAllUsers(signal) {
        try {
            console.log('📡 Processing signal for balance-based trading:', signal);

            // Broadcast signal received to all users
            tradingWebSocket.broadcastSignalReceived(signal);

            // 1. Get market analysis
            const marketAnalysis = await this.marketAnalyzer.analyzeMarket(signal.symbol || 'BTCUSDT');

            // 2. Make AI decision
            const aiDecision = await this.aiDecision.makeDecision(signal, marketAnalysis);
            console.log(`🤖 AI Decision: ${aiDecision.action} (confidence: ${aiDecision.confidence}%)`);

            // Broadcast AI decision to all users
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

            // 3. Get active users with sufficient balances
            const activeUsers = await this.getActiveUsersWithBalance();
            if (activeUsers.length === 0) {
                return {
                    success: true,
                    message: 'No users with sufficient balance found',
                    aiDecision,
                    totalUsers: 0,
                    executedTrades: []
                };
            }

            console.log(`👥 Found ${activeUsers.length} active users with balance`);

            // 4. Execute trades by plan priority
            const executionResults = await this.executeTradesByPriority(signal, aiDecision, activeUsers);

            // 5. Create position tracking for successful trades
            const successfulTrades = executionResults.filter(t => t.success);
            const tradeId = `TRADE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Store tradeId for later use
            signal.tradeId = tradeId;

            if (successfulTrades.length > 0) {
                await this.positionTracker.createPosition(tradeId, {
                    symbol: signal.symbol,
                    side: aiDecision.action,
                    executedPrice: successfulTrades[0].executedPrice || signal.price,
                    executedQty: successfulTrades.reduce((sum, t) => sum + t.positionSize, 0),
                    exchange: successfulTrades[0].exchange || 'bybit',
                    stopLoss: aiDecision.stopLoss,
                    takeProfit: aiDecision.takeProfit
                }, successfulTrades);

                console.log(`📊 Position tracking started for ${tradeId} with ${successfulTrades.length} participants`);
            }

            // Broadcast execution summary to all users and admin
            const finalResult = {
                success: true,
                message: `Trades executed for ${executionResults.length} users`,
                aiDecision,
                totalUsers: activeUsers.length,
                executedTrades: executionResults,
                marketAnalysis: {
                    sentiment: marketAnalysis.sentiment,
                    fearGreed: marketAnalysis.fearGreedIndex
                },
                positionTracking: successfulTrades.length > 0 ? 'enabled' : 'no_successful_trades'
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
     * Get active users with sufficient balance for trading
     */
    async getActiveUsersWithBalance() {
        try {
            const result = await this.dbPoolManager.executeRead(`
                SELECT
                    u.id, u.username, u.plan_type, u.subscription_status,
                    u.balance_real_brl, u.balance_real_usd,
                    u.balance_admin_brl, u.balance_admin_usd,
                    u.max_open_positions, u.default_leverage, u.risk_level
                FROM users u
                WHERE u.subscription_status = 'active'
                AND (
                    (u.balance_real_brl + u.balance_admin_brl) >= 100 OR
                    (u.balance_real_usd + u.balance_admin_usd) >= 20
                )
                ORDER BY
                    CASE
                        WHEN u.plan_type LIKE 'PRO%' THEN 1
                        WHEN u.plan_type LIKE 'FLEX%' THEN 2
                        WHEN u.plan_type = 'TRIAL' THEN 3
                        ELSE 4
                    END
            `);

            return result.rows.map(user => ({
                ...user,
                operationalBalance: {
                    brl: parseFloat(user.balance_real_brl || 0) + parseFloat(user.balance_admin_brl || 0),
                    usd: parseFloat(user.balance_real_usd || 0) + parseFloat(user.balance_admin_usd || 0)
                },
                planConfig: this.PLAN_PRIORITIES[user.plan_type] || this.PLAN_PRIORITIES['TRIAL']
            }));

        } catch (error) {
            console.error('❌ Error getting active users:', error);
            return [];
        }
    }

    /**
     * Execute trades by plan priority with delays
     */
    async executeTradesByPriority(signal, aiDecision, users) {
        const results = [];
        const usersByPlan = this.groupUsersByPlan(users);

        // Execute by priority with delays
        for (const [planType, planUsers] of Object.entries(usersByPlan)) {
            const planConfig = this.PLAN_PRIORITIES[planType];

            console.log(`⏳ Executing for ${planType} users (${planUsers.length}) with ${planConfig.delay}ms delay`);

            // Apply plan-based delay
            if (planConfig.delay > 0) {
                await this.sleep(planConfig.delay);
            }

            // Execute trades for this plan group
            const planResults = await this.executeTradesForPlan(signal, aiDecision, planUsers, planConfig);
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
     * Execute trades for a specific plan group
     */
    async executeTradesForPlan(signal, aiDecision, users, planConfig) {
        const results = [];

        for (const user of users) {
            try {
                console.log(`📈 Executing trade for user ${user.username} (${user.plan_type})`);

                // Calculate position size based on user balance and risk
                const positionSize = this.calculatePositionSize(user, signal);

                if (positionSize <= 0) {
                    results.push({
                        userId: user.id,
                        username: user.username,
                        success: false,
                        message: 'Insufficient balance for minimum position'
                    });
                    continue;
                }

                // Execute actual trade using admin API keys
                const tradeResult = await this.executeActualTrade(signal, aiDecision, user, positionSize);

                const tradeData = {
                    userId: user.id,
                    username: user.username,
                    planType: user.plan_type,
                    positionSize,
                    commission: planConfig.commission,
                    symbol: signal.symbol,
                    side: aiDecision.action,
                    ...tradeResult
                };

                // Save trade execution to database
                await this.saveTradeExecution(signal.tradeId || `TRADE_${Date.now()}`, tradeData);

                if (tradeResult.success) {
                    // Update user balance with trade result
                    await this.updateUserBalanceAfterTrade(user.id, tradeResult, planConfig.commission);
                }

                // Broadcast individual trade execution to user and admin
                tradingWebSocket.broadcastTradeExecution(user.id, tradeData);

                results.push(tradeData);

            } catch (error) {
                console.error(`❌ Error executing trade for user ${user.username}:`, error);
                results.push({
                    userId: user.id,
                    username: user.username,
                    success: false,
                    message: error.message
                });
            }
        }

        return results;
    }

    /**
     * Calculate position size based on user balance and risk settings
     */
    calculatePositionSize(user, signal) {
        const availableBalance = Math.max(user.operationalBalance.brl / 5.5, user.operationalBalance.usd); // Rough BRL to USD
        const riskPercent = (user.risk_level || 2) / 100; // Default 2% risk
        const maxPositionSize = availableBalance * riskPercent;

        // Minimum position size: $10 USD equivalent
        const minPositionSize = 10;

        return Math.max(minPositionSize, Math.min(maxPositionSize, availableBalance * 0.1)); // Max 10% of balance
    }

    /**
     * Execute actual trade on exchange using admin API keys
     */
    async executeActualTrade(signal, aiDecision, user, positionSize) {
        try {
            // Allow real API calls if ENABLE_REAL_TRADING is true OR if using testnet exchanges
            const isProductionMode = process.env.NODE_ENV === 'production';
            const enableRealTrading = process.env.ENABLE_REAL_TRADING === 'true';
            const usingTestnet = process.env.BYBIT_TESTNET === 'true' || process.env.BINANCE_TESTNET === 'true';

            const shouldSimulate = !isProductionMode && !enableRealTrading && !usingTestnet;

            if (shouldSimulate) {
                // Simulate trade execution only when not in production, real trading disabled, and not using testnet
                const simulatedResult = this.simulateTradeExecution(signal, aiDecision, positionSize);
                console.log(`🧪 SIMULATED: Simulated trade for ${user.username}: ${simulatedResult.message}`);
                return simulatedResult;
            }

            // Real trade execution using admin API keys (production OR testnet)
            console.log(`🔥 REAL API CALL: Executing trade for ${user.username} on ${usingTestnet ? 'TESTNET' : 'PRODUCTION'}`);

            // Real trade execution using admin API keys
            const tradeParams = {
                symbol: signal.symbol,
                side: aiDecision.action === 'BUY' ? 'Buy' : 'Sell',
                orderType: 'Market',
                qty: this.calculateQuantity(signal.symbol, positionSize),
                stopLoss: aiDecision.stopLoss,
                takeProfit: aiDecision.takeProfit
            };

            // Execute on both exchanges if available
            const results = [];
            
            // Try Bybit first
            try {
                const bybitResult = await this.exchangeService.bybitService.placeOrder(tradeParams);
                results.push({
                    exchange: 'bybit',
                    success: bybitResult.success,
                    result: bybitResult
                });
            } catch (error) {
                console.log(`⚠️ Bybit failed for ${user.username}:`, error.message);
                results.push({
                    exchange: 'bybit',
                    success: false,
                    error: error.message
                });
            }
            
            // Try Binance
            try {
                const binanceResult = await this.exchangeService.binanceService.placeOrder(tradeParams);
                results.push({
                    exchange: 'binance',
                    success: binanceResult.success,
                    result: binanceResult
                });
            } catch (error) {
                console.log(`⚠️ Binance failed for ${user.username}:`, error.message);
                results.push({
                    exchange: 'binance',
                    success: false,
                    error: error.message
                });
            }
            
            // Use the first successful result, or the first result if none succeeded
            const successfulResult = results.find(r => r.success);
            const result = successfulResult ? successfulResult.result : results[0].result;

            return {
                success: result.success,
                message: result.message || 'Trade executed successfully',
                orderId: result.orderId,
                exchange: result.exchange || 'bybit',
                executedPrice: result.price || signal.price,
                executedQty: tradeParams.qty,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Trade execution error:', error);
            return {
                success: false,
                message: `Trade execution failed: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Simulate trade execution for testing
     */
    simulateTradeExecution(signal, aiDecision, positionSize) {
        const mockPrice = parseFloat(signal.price) || 50000;
        const priceVariation = (Math.random() - 0.5) * 0.02; // ±1% price variation
        const executedPrice = mockPrice * (1 + priceVariation);

        return {
            success: true,
            message: 'Simulated trade executed successfully',
            orderId: `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            exchange: 'testnet',
            executedPrice: Math.round(executedPrice * 100) / 100,
            executedQty: positionSize,
            timestamp: new Date().toISOString(),
            simulated: true
        };
    }

    /**
     * Calculate quantity based on symbol and position size
     */
    calculateQuantity(symbol, positionSizeUSD) {
        // This would normally fetch current price, but for now use approximation
        const approximatePrices = {
            'BTCUSDT': 50000,
            'ETHUSDT': 3000,
            'ADAUSDT': 0.5,
            'SOLUSDT': 100
        };

        const price = approximatePrices[symbol] || approximatePrices['BTCUSDT'];
        const quantity = positionSizeUSD / price;

        // Round to appropriate decimal places based on symbol
        if (symbol.includes('BTC')) return Math.round(quantity * 100000) / 100000; // 5 decimals
        if (symbol.includes('ETH')) return Math.round(quantity * 1000) / 1000; // 3 decimals
        return Math.round(quantity * 100) / 100; // 2 decimals
    }

    /**
     * Save trade execution to database (unified trading_operations table)
     */
    async saveTradeExecution(tradeId, tradeData) {
        try {
            // Generate unique operation ID
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
                tradeData.symbol, // trading_pair
                tradeData.side === 'BUY' ? 'LONG' : 'SHORT', // operation_type
                tradeData.side,
                tradeData.executedPrice, // entry_price
                tradeData.executedQty, // quantity
                tradeData.exchange || 'testnet',
                tradeData.orderId,
                tradeData.positionSize,
                tradeData.commission || 0,
                tradeData.planType,
                'OPEN', // status (starts as OPEN for pooled trading)
                new Date(), // entry_time
                false, // personal_key (pooled trading uses admin keys)
                tradeData.simulated || false,
                tradeData.success,
                tradeData.message || null,
                'BALANCE_POOL', // signal_source
                JSON.stringify({
                    timestamp: tradeData.timestamp,
                    stopLoss: tradeData.stopLoss,
                    takeProfit: tradeData.takeProfit,
                    username: tradeData.username
                })
            ]);

            console.log(`💾 Trade execution saved to trading_operations: ${operationId} for user ${tradeData.username}`);
        } catch (error) {
            console.error('❌ Error saving trade execution:', error.message);
        }
    }

    /**
     * Update user balance after trade execution
     */
    async updateUserBalanceAfterTrade(userId, tradeResult, commissionPercent) {
        try {
            console.log(`💰 Trade recorded for user ${userId}:`, {
                orderId: tradeResult.orderId,
                exchange: tradeResult.exchange,
                executedPrice: tradeResult.executedPrice,
                executedQty: tradeResult.executedQty,
                commission: commissionPercent
            });

            // TODO: Implement actual balance updates based on real P&L
            // This would track the position and update balance when closed

        } catch (error) {
            console.error('❌ Error updating user balance:', error);
        }
    }

    /**
     * Simulate trade completion and P&L distribution
     * This method would normally be called when trades are actually closed
     */
    async simulateTradeCompletion(tradeId, participants, mockPnLPercent = 2.5) {
        try {
            console.log(`💰 Simulating trade completion for ${tradeId}`);

            // Calculate total invested amount
            const totalInvested = participants.reduce((sum, p) => sum + p.positionSize, 0);

            // Simulate P&L (in production this comes from exchange)
            const totalPnL = totalInvested * (mockPnLPercent / 100);

            console.log(`💰 Simulated P&L: $${totalPnL} (${mockPnLPercent}%) on $${totalInvested} invested`);

            // Prepare participants for P&L distribution
            const pnlParticipants = participants.map(p => ({
                userId: p.userId,
                username: p.username,
                contributedBalance: p.positionSize // Amount they contributed to this trade
            }));

            // Calculate average commission rate
            const avgCommission = participants.reduce((sum, p) => sum + p.commission, 0) / participants.length;

            // Distribute P&L proportionally
            const distributionResult = await this.pnlDistributionService.distributeTradeResults(
                tradeId,
                pnlParticipants,
                totalPnL,
                avgCommission
            );

            // Broadcast P&L updates to users
            if (distributionResult.success && distributionResult.distributions) {
                for (const distribution of distributionResult.distributions) {
                    const balanceUpdate = {
                        oldBalance: distribution.contributedBalance, // Simplified
                        newBalance: distribution.contributedBalance + distribution.finalPnL,
                        change: distribution.finalPnL,
                        changeType: distribution.finalPnL >= 0 ? 'profit' : 'loss'
                    };

                    tradingWebSocket.broadcastBalanceUpdate(distribution.userId, balanceUpdate);
                }
            }

            return distributionResult;

        } catch (error) {
            console.error(`❌ Error simulating trade completion for ${tradeId}:`, error);
            return {
                success: false,
                error: error.message,
                tradeId
            };
        }
    }

    /**
     * Process trade lifecycle from signal to P&L distribution
     */
    async processTradeLifecycle(signal, simulateCompletion = false) {
        try {
            // 1. Process signal as normal
            const signalResult = await this.processSignalForAllUsers(signal);

            if (!signalResult.success || signalResult.executedTrades.length === 0) {
                return signalResult;
            }

            // 2. If simulation requested, complete the trade cycle
            if (simulateCompletion) {
                console.log('🔄 Simulating complete trade lifecycle...');

                // Generate mock trade ID
                const tradeId = `TRADE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Simulate trade completion after delay
                setTimeout(async () => {
                    try {
                        const participants = signalResult.executedTrades.filter(t => t.success);

                        if (participants.length > 0) {
                            const distributionResult = await this.simulateTradeCompletion(tradeId, participants);

                            console.log(`💰 Trade lifecycle completed for ${tradeId}:`, {
                                participants: participants.length,
                                distributed: distributionResult.success,
                                totalPnL: distributionResult.totalPnL
                            });
                        }
                    } catch (error) {
                        console.error('❌ Error in simulated trade completion:', error);
                    }
                }, 10000); // Complete trade after 10 seconds
            }

            return {
                ...signalResult,
                tradeLifecycle: simulateCompletion ? 'simulated' : 'signal_only'
            };

        } catch (error) {
            console.error('❌ Error processing trade lifecycle:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Helper function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BalanceTradingEngine;