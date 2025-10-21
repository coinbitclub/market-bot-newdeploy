/**
 * ✅ UPDATED PLAN VALIDATOR - COINBITCLUB ENTERPRISE v6.0.0
 * =========================================================
 * 
 * Updated plan validation logic based on exact business requirements:
 * 1. TRIAL - Testnet only trading
 * 2. PRO - $100/month flat fee, unlimited trading
 * 3. FLEX - Percentage fee per transaction, requires user assets
 */

const { createLogger } = require('../shared/utils/logger');

class UpdatedPlanValidator {
    constructor(pool, config = {}) {
        this.logger = createLogger('UpdatedPlanValidator');
        this.pool = pool;
        
        this.config = {
            // Plan-specific configurations
            planConfigs: {
                'TRIAL': {
                    allowsRealtimeTrading: false,
                    requiresUserAssets: false,
                    transactionFeeType: 'none',
                    monthlyFee: 0.00,
                    commissionRate: 0.00,
                    minimumBalance: 0.00,
                    maxLeverage: 2,
                    maxPositions: 1,
                    maxDailyLoss: 0.00,
                    tradingMode: 'TESTNET_ONLY'
                },
                'PRO': {
                    allowsRealtimeTrading: true,
                    requiresUserAssets: false,
                    transactionFeeType: 'none',
                    monthlyFee: 100.00,
                    commissionRate: 0.00,
                    minimumBalance: 0.00,
                    maxLeverage: 10,
                    maxPositions: 10,
                    maxDailyLoss: 10000.00,
                    tradingMode: 'UNLIMITED_TRADING'
                },
                'FLEX': {
                    allowsRealtimeTrading: true,
                    requiresUserAssets: true,
                    transactionFeeType: 'percentage',
                    monthlyFee: 0.00,
                    commissionRate: 20.00,
                    minimumBalance: 100.00,
                    maxLeverage: 5,
                    maxPositions: 5,
                    maxDailyLoss: 2000.00,
                    tradingMode: 'ASSET_REQUIRED'
                }
            },
            
            // Operation limits
            maxConcurrentOperations: 2,
            operationCooldown: 120, // 2 minutes in seconds
            
            ...config
        };

        this.logger.info('UpdatedPlanValidator initialized', { config: this.config });
    }

    /**
     * Validate user limits for trading operations based on plan
     */
    async validateUserLimits(userId, operationData) {
        try {
            const { amount, currency, type = 'TRADE' } = operationData;
            
            this.logger.info('Validating user limits', { 
                userId, 
                amount, 
                currency, 
                type 
            });

            // 1. Get user data and plan information
            const userData = await this.getUserData(userId);
            const planConfig = this.getPlanConfig(userData.plan_type);
            
            // 2. Calculate user balances
            const balanceInfo = this.calculateBalances(userData);
            
            // 3. Determine trading mode based on plan
            const tradingMode = this.determineTradingMode(userData, planConfig, balanceInfo);
            
            // 4. Validate based on plan requirements
            const validation = await this.validatePlanRequirements(
                userData, 
                planConfig, 
                balanceInfo, 
                tradingMode, 
                operationData
            );

            const result = {
                allowed: validation.allowed,
                tradingMode,
                userId,
                planType: userData.plan_type,
                planConfig,
                balanceInfo,
                validation,
                timestamp: new Date().toISOString()
            };

            this.logger.info('Plan validation completed', result);
            return result;

        } catch (error) {
            this.logger.error('Error in plan validation', { error: error.message, userId, operationData });
            throw error;
        }
    }

    /**
     * Get plan configuration
     */
    getPlanConfig(planType) {
        const config = this.config.planConfigs[planType];
        if (!config) {
            this.logger.warn('Unknown plan type, defaulting to TRIAL', { planType });
            return this.config.planConfigs['TRIAL'];
        }
        return config;
    }

    /**
     * Determine trading mode based on plan and user status
     */
    determineTradingMode(userData, planConfig, balanceInfo) {
        // TRIAL plan - always testnet only
        if (userData.plan_type === 'TRIAL') {
            return 'TESTNET_ONLY';
        }

        // PRO plan - check if subscription is active
        if (userData.plan_type === 'PRO') {
            if (userData.subscription_status === 'active') {
                return 'UNLIMITED_TRADING';
            } else {
                return 'SUBSCRIPTION_REQUIRED';
            }
        }

        // FLEX plan - check if user has required assets
        if (userData.plan_type === 'FLEX') {
            const hasRequiredAssets = balanceInfo.operational.total >= planConfig.minimumBalance;
            if (hasRequiredAssets) {
                return 'ASSET_REQUIRED';
            } else {
                return 'INSUFFICIENT_ASSETS';
            }
        }

        return 'UNKNOWN_PLAN';
    }

    /**
     * Validate plan requirements for trading
     */
    async validatePlanRequirements(userData, planConfig, balanceInfo, tradingMode, operationData) {
        const validations = [];

        // 1. Trading mode validation
        const modeValidation = this.validateTradingMode(tradingMode, planConfig);
        validations.push(modeValidation);

        // 2. Asset requirement validation (for FLEX plan)
        if (planConfig.requiresUserAssets) {
            const assetValidation = this.validateAssetRequirements(balanceInfo, planConfig);
            validations.push(assetValidation);
        }

        // 3. Subscription validation (for PRO plan)
        if (userData.plan_type === 'PRO') {
            const subscriptionValidation = this.validateSubscription(userData);
            validations.push(subscriptionValidation);
        }

        // 4. Operation limits validation
        const limitsValidation = await this.validateOperationLimits(userData, operationData, planConfig);
        validations.push(limitsValidation);

        // 5. Balance validation for specific operation
        const balanceValidation = this.validateOperationBalance(balanceInfo, operationData, planConfig);
        validations.push(balanceValidation);

        // Consolidate results
        const failedValidations = validations.filter(v => !v.allowed);
        const allowed = failedValidations.length === 0;

        return {
            allowed,
            validations,
            failedValidations: failedValidations.map(v => v.reason),
            requirements: this.getPlanRequirements(planConfig, tradingMode)
        };
    }

    /**
     * Validate trading mode
     */
    validateTradingMode(tradingMode, planConfig) {
        switch (tradingMode) {
            case 'TESTNET_ONLY':
                return {
                    allowed: false,
                    reason: 'TRIAL plan only allows testnet trading',
                    action: 'Upgrade to PRO or FLEX plan for real trading'
                };

            case 'SUBSCRIPTION_REQUIRED':
                return {
                    allowed: false,
                    reason: 'PRO plan requires active subscription',
                    action: 'Subscribe to PRO plan for unlimited trading'
                };

            case 'INSUFFICIENT_ASSETS':
                return {
                    allowed: false,
                    reason: `FLEX plan requires minimum $${planConfig.minimumBalance} in user assets`,
                    action: 'Add funds to your account or upgrade to PRO plan'
                };

            case 'UNLIMITED_TRADING':
            case 'ASSET_REQUIRED':
                return {
                    allowed: true,
                    reason: 'Plan requirements met'
                };

            default:
                return {
                    allowed: false,
                    reason: 'Unknown trading mode',
                    action: 'Contact support'
                };
        }
    }

    /**
     * Validate asset requirements for FLEX plan
     */
    validateAssetRequirements(balanceInfo, planConfig) {
        const hasRequiredAssets = balanceInfo.operational.total >= planConfig.minimumBalance;
        
        return {
            allowed: hasRequiredAssets,
            reason: hasRequiredAssets 
                ? 'User has sufficient assets' 
                : `FLEX plan requires minimum $${planConfig.minimumBalance} in user assets`,
            currentBalance: balanceInfo.operational.total,
            requiredBalance: planConfig.minimumBalance
        };
    }

    /**
     * Validate subscription for PRO plan
     */
    validateSubscription(userData) {
        const isActive = userData.subscription_status === 'active';
        const isNotExpired = !userData.subscription_end_date || 
                           new Date(userData.subscription_end_date) > new Date();

        return {
            allowed: isActive && isNotExpired,
            reason: isActive && isNotExpired 
                ? 'PRO subscription is active' 
                : 'PRO subscription is inactive or expired',
            subscriptionStatus: userData.subscription_status,
            subscriptionEndDate: userData.subscription_end_date
        };
    }

    /**
     * Validate operation limits
     */
    async validateOperationLimits(userData, operationData, planConfig) {
        // Check concurrent operations
        const concurrentOps = await this.getConcurrentOperations(userData.id);
        const withinConcurrencyLimit = concurrentOps < this.config.maxConcurrentOperations;

        // Check cooldown
        const lastOperation = await this.getLastOperation(userData.id);
        const cooldownPassed = !lastOperation || 
                              (Date.now() - new Date(lastOperation.created_at).getTime()) > 
                              (this.config.operationCooldown * 1000);

        return {
            allowed: withinConcurrencyLimit && cooldownPassed,
            reason: !withinConcurrencyLimit 
                ? `Too many concurrent operations (max: ${this.config.maxConcurrentOperations})`
                : !cooldownPassed 
                ? `Operation cooldown active (${this.config.operationCooldown}s)`
                : 'Operation limits satisfied',
            concurrentOperations: concurrentOps,
            maxConcurrentOperations: this.config.maxConcurrentOperations,
            lastOperationTime: lastOperation?.created_at
        };
    }

    /**
     * Validate operation balance
     */
    validateOperationBalance(balanceInfo, operationData, planConfig) {
        const { amount } = operationData;
        const hasSufficientBalance = balanceInfo.operational.total >= amount;

        return {
            allowed: hasSufficientBalance,
            reason: hasSufficientBalance 
                ? 'Sufficient balance for operation' 
                : 'Insufficient balance for operation',
            currentBalance: balanceInfo.operational.total,
            requiredAmount: amount
        };
    }

    /**
     * Get plan requirements summary
     */
    getPlanRequirements(planConfig, tradingMode) {
        return {
            planType: planConfig.tradingMode,
            allowsRealtimeTrading: planConfig.allowsRealtimeTrading,
            requiresUserAssets: planConfig.requiresUserAssets,
            transactionFeeType: planConfig.transactionFeeType,
            monthlyFee: planConfig.monthlyFee,
            commissionRate: planConfig.commissionRate,
            minimumBalance: planConfig.minimumBalance,
            maxLeverage: planConfig.maxLeverage,
            maxPositions: planConfig.maxPositions,
            maxDailyLoss: planConfig.maxDailyLoss
        };
    }

    /**
     * Get user data from database
     */
    async getUserData(userId) {
        try {
            const result = await this.pool.executeRead(`
                SELECT 
                    id, username, email, plan_type, 
                    subscription_status, subscription_start_date, subscription_end_date,
                    balance_real_brl, balance_real_usd,
                    balance_admin_brl, balance_admin_usd,
                    balance_commission_brl, balance_commission_usd,
                    created_at, updated_at, last_login_at
                FROM users 
                WHERE id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            return result.rows[0];
        } catch (error) {
            this.logger.error('Error getting user data', { error: error.message, userId });
            throw error;
        }
    }

    /**
     * Calculate user balances
     */
    calculateBalances(userData) {
        const realBRL = parseFloat(userData.balance_real_brl) || 0;
        const realUSD = parseFloat(userData.balance_real_usd) || 0;
        const adminBRL = parseFloat(userData.balance_admin_brl) || 0;
        const adminUSD = parseFloat(userData.balance_admin_usd) || 0;
        const commissionBRL = parseFloat(userData.balance_commission_brl) || 0;
        const commissionUSD = parseFloat(userData.balance_commission_usd) || 0;

        return {
            real: { brl: realBRL, usd: realUSD, total: realBRL + realUSD },
            admin: { brl: adminBRL, usd: adminUSD, total: adminBRL + adminUSD },
            commission: { brl: commissionBRL, usd: commissionUSD, total: commissionBRL + commissionUSD },
            operational: { 
                brl: realBRL + adminBRL, 
                usd: realUSD + adminUSD, 
                total: realBRL + realUSD + adminBRL + adminUSD 
            },
            grandTotal: realBRL + realUSD + adminBRL + adminUSD + commissionBRL + commissionUSD
        };
    }

    /**
     * Get concurrent operations count
     */
    async getConcurrentOperations(userId) {
        try {
            const result = await this.pool.executeRead(`
                SELECT COUNT(*) as count
                FROM trading_operations 
                WHERE user_id = $1 
                AND status IN ('pending', 'processing')
                AND created_at > NOW() - INTERVAL '1 hour'
            `, [userId]);
            
            return parseInt(result.rows[0].count) || 0;
        } catch (error) {
            this.logger.warn('Could not get concurrent operations', { error: error.message, userId });
            return 0;
        }
    }

    /**
     * Get last operation timestamp
     */
    async getLastOperation(userId) {
        try {
            const result = await this.pool.executeRead(`
                SELECT created_at
                FROM trading_operations 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [userId]);
            
            return result.rows[0] || null;
        } catch (error) {
            this.logger.warn('Could not get last operation', { error: error.message, userId });
            return null;
        }
    }

    /**
     * Get plan limits for user
     */
    async getPlanLimits(userId) {
        try {
            const userData = await this.getUserData(userId);
            const planConfig = this.getPlanConfig(userData.plan_type);
            const balanceInfo = this.calculateBalances(userData);
            const tradingMode = this.determineTradingMode(userData, planConfig, balanceInfo);

            return {
                planType: userData.plan_type,
                tradingMode,
                limits: {
                    maxLeverage: planConfig.maxLeverage,
                    maxPositions: planConfig.maxPositions,
                    maxDailyLoss: planConfig.maxDailyLoss,
                    minimumBalance: planConfig.minimumBalance,
                    maxConcurrentOperations: this.config.maxConcurrentOperations,
                    operationCooldown: this.config.operationCooldown
                },
                fees: {
                    monthlyFee: planConfig.monthlyFee,
                    commissionRate: planConfig.commissionRate,
                    transactionFeeType: planConfig.transactionFeeType
                },
                requirements: {
                    allowsRealtimeTrading: planConfig.allowsRealtimeTrading,
                    requiresUserAssets: planConfig.requiresUserAssets
                },
                currentBalance: balanceInfo.operational.total
            };
        } catch (error) {
            this.logger.error('Error getting plan limits', { error: error.message, userId });
            throw error;
        }
    }
}

module.exports = UpdatedPlanValidator;

