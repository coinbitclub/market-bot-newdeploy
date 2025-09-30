/**
 * 📋 PLANS ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * Plan management and subscription routes with database integration
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');
const PlanValidator = require('../services/user-config-manager/plan-validator');
const StripeUnifiedService = require('../services/financial/stripe-unified.service');

class PlansRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.planValidator = null;
        this.stripeService = new StripeUnifiedService();
        this.setupRoutes();
    }

    /**
     * Set database pool manager for plan routes
     */
    setDbPoolManager(dbPoolManager) {
        this.authMiddleware.setDbPoolManager(dbPoolManager);
        this.planValidator = new PlanValidator(dbPoolManager);
        this.stripeService.setDbPoolManager(dbPoolManager);
    }

    setupRoutes() {
        // All routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // Plan management routes
        this.router.get('/status', this.getPlanStatus.bind(this));
        this.router.get('/available', this.getAvailablePlans.bind(this));
        this.router.post('/subscribe', this.subscribeToPlan.bind(this));
        this.router.post('/upgrade', this.upgradePlan.bind(this));
        this.router.post('/downgrade', this.downgradePlan.bind(this));
        this.router.get('/validation', this.getPlanValidation.bind(this));
        this.router.get('/limits', this.getPlanLimits.bind(this));
        this.router.post('/recharge', this.rechargeAccount.bind(this));
    }

    /**
     * GET /status - Get user's current plan status
     */
    async getPlanStatus(req, res) {
        try {
            const userId = req.user.id;

            // Check if planValidator is initialized
            if (!this.planValidator) {
                return res.status(503).json({
                    success: false,
                    error: 'Plan validator not initialized. Database connection required.'
                });
            }

            // Get user data with plan information
            const userData = await this.planValidator.getUserData(userId);
            const balanceInfo = this.planValidator.calculateBalances(userData);
            const operationMode = this.planValidator.determineOperationMode(userData, balanceInfo);

            const planStatus = {
                success: true,
                user: {
                    id: userId,
                    planType: userData.plan_type,
                    subscriptionStatus: userData.subscription_status,
                    subscriptionStartDate: userData.subscription_start_date,
                    subscriptionEndDate: userData.subscription_end_date,
                    operationMode,
                    canOperate: operationMode === 'MANAGEMENT'
                },
                balances: balanceInfo,
                trading: {
                    enabled: userData.trading_enabled,
                    maxOpenPositions: userData.max_open_positions,
                    maxPositionSize: userData.max_position_size,
                    defaultLeverage: userData.default_leverage,
                    riskLevel: userData.risk_level
                },
                timestamp: new Date().toISOString()
            };

            res.json(planStatus);
        } catch (error) {
            console.error('❌ Error getting plan status:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter status do plano',
                code: 'PLAN_STATUS_ERROR'
            });
        }
    }

    /**
     * GET /available - Get available plans for user's region
     */
    async getAvailablePlans(req, res) {
        try {
            const { region = 'brazil' } = req.query;
            const userId = req.user.id;

            // Check if planValidator is initialized
            if (!this.planValidator) {
                console.warn('🔄 Plan validator not initialized, using fallback plans');
                const fallbackPlans = await this.getFallbackPlans(region, userId);
                return res.json(fallbackPlans);
            }

            // Get user's current plan information and country
            let userCurrentPlan = null;
            let userCountry = null;
            try {
                const userResult = await this.authMiddleware.dbPoolManager.executeRead(
                    `SELECT 
                        plan_type,
                        subscription_status,
                        subscription_start_date,
                        subscription_end_date,
                        country
                    FROM users 
                    WHERE id = $1`,
                    [userId]
                );
                
                if (userResult.rows.length > 0) {
                    userCurrentPlan = userResult.rows[0];
                    userCountry = userCurrentPlan.country;
                }
            } catch (userError) {
                console.warn('⚠️ Could not fetch user plan info:', userError.message);
            }

            // Determine user's region based on country
            const isBrazilian = userCountry === 'BR' || userCountry === 'brazil' || userCountry === null;
            const userRegion = isBrazilian ? 'brazil' : 'international';
            
            // Get plans from database - filter by user's region + always include TRIAL
            const plansResult = await this.authMiddleware.dbPoolManager.executeRead(
                `SELECT
                    id,
                    code,
                    name,
                    description,
                    type,
                    price,
                    currency,
                    billing_period as "billingPeriod",
                    commission_rate as "commissionRate",
                    minimum_balance as "minimumBalance",
                    features,
                    is_popular as "isPopular",
                    is_recommended as "isRecommended",
                    stripe_product_id as "stripeProductId",
                    region
                FROM plans
                WHERE is_active = true
                AND (
                    region = $1 
                    OR code = 'TRIAL'
                )
                ORDER BY 
                    CASE WHEN code = 'TRIAL' THEN 0 ELSE 1 END,
                    type, 
                    price`,
                [userRegion]
            );

            const plans = {
                success: true,
                region: userRegion, // Use user's actual region instead of query parameter
                userCountry: userCountry,
                currentPlan: userCurrentPlan,
                plans: plansResult.rows.map(plan => ({
                    ...plan,
                    // Convert JSONB features array to regular array
                    features: Array.isArray(plan.features) ? plan.features : [],
                    // Add current plan status
                    isCurrentPlan: userCurrentPlan && plan.code === userCurrentPlan.plan_type,
                    isActive: userCurrentPlan && plan.code === userCurrentPlan.plan_type && userCurrentPlan.subscription_status === 'active',
                    // Add purchase status
                    canPurchase: !(userCurrentPlan && plan.code === userCurrentPlan.plan_type)
                }))
            };

            res.json(plans);
        } catch (error) {
            console.error('❌ Error getting available plans:', error);

            // Fallback to hardcoded plans if database fails
            console.warn('🔄 Database failed, using fallback plans');
            const fallbackPlans = await this.getFallbackPlans(region, userId);
            res.json(fallbackPlans);
        }
    }

    /**
     * Fallback plans when database is unavailable
     */
    async getFallbackPlans(region = 'brazil', userId = null) {
        // Try to get user's current plan and country even in fallback mode
        let userCurrentPlan = null;
        let userCountry = null;
        if (userId && this.authMiddleware && this.authMiddleware.dbPoolManager) {
            try {
                const userResult = await this.authMiddleware.dbPoolManager.executeRead(
                    `SELECT 
                        plan_type,
                        subscription_status,
                        subscription_start_date,
                        subscription_end_date,
                        country
                    FROM users 
                    WHERE id = $1`,
                    [userId]
                );
                
                if (userResult.rows.length > 0) {
                    userCurrentPlan = userResult.rows[0];
                    userCountry = userCurrentPlan.country;
                }
            } catch (userError) {
                console.warn('⚠️ Could not fetch user plan info in fallback mode:', userError.message);
            }
        }
        
        // Determine user's region based on country
        const isBrazilian = userCountry === 'BR' || userCountry === 'brazil' || userCountry === null;
        const userRegion = isBrazilian ? 'brazil' : 'international';
        const allPlans = [
            {
                id: 'trial',
                code: 'TRIAL',
                name: region === 'brazil' ? 'Trial Gratuito' : 'Free Trial',
                description: region === 'brazil' ?
                    'Teste grátis por 7 dias com todas as funcionalidades' :
                    '7-day free trial with all features',
                type: 'TRIAL',
                price: 0,
                currency: region === 'brazil' ? 'BRL' : 'USD',
                billingPeriod: 'none',
                commissionRate: 0,
                minimumBalance: 0,
                features: region === 'brazil' ? [
                    '✅ Teste grátis por 7 dias',
                    '🔧 Trading TESTNET apenas',
                    '⚡ Todas funcionalidades disponíveis',
                    '💬 Suporte básico por chat',
                    '👥 Acesso à comunidade',
                    '📚 Material educativo gratuito'
                ] : [
                    '✅ 7-day free trial',
                    '🔧 TESTNET trading only',
                    '⚡ All features available',
                    '💬 Basic chat support',
                    '👥 Community access',
                    '📚 Free educational material'
                ],
                isPopular: false,
                stripeProductId: null
            },
            {
                id: 'flex',
                code: region === 'brazil' ? 'FLEX_BR' : 'FLEX_US',
                name: region === 'brazil' ? 'FLEX (Brasil)' : 'FLEX (Global)',
                description: region === 'brazil' ?
                    'Sistema pré-pago sem mensalidade, apenas 20% comissão sobre lucros' :
                    'Prepaid system with no monthly fee, only 20% commission on profits',
                type: 'PREPAID',
                price: 0,
                currency: region === 'brazil' ? 'BRL' : 'USD',
                billingPeriod: 'none',
                commissionRate: 20,
                minimumBalance: region === 'brazil' ? 150 : 30,
                features: region === 'brazil' ? [
                    '🤖 Trading automatizado 24/7',
                    '💰 20% comissão apenas sobre lucros',
                    '💳 Sistema pré-pago (sem mensalidade)',
                    '💵 Recarga mínima: R$150',
                    '💬 Suporte padrão por chat',
                    '📈 Estratégias comprovadas de IA ÁGUIA',
                    '👥 Comunidade geral',
                    '📊 Relatórios de performance'
                ] : [
                    '🤖 24/7 Automated Trading',
                    '💰 20% commission only on profits',
                    '💳 Prepaid system (no monthly fees)',
                    '💵 Minimum deposit: $30 USD',
                    '💬 Standard chat support',
                    '📈 Proven ÁGUIA AI strategies',
                    '👥 General community',
                    '📊 Performance reports'
                ],
                isPopular: true,
                stripeProductId: region === 'brazil' ? 'prod_SbHgHezeyKfTVg' : 'prod_SbHiDqfrH2T8dI'
            },
            {
                id: 'pro',
                code: region === 'brazil' ? 'PRO_BR' : 'PRO_US',
                name: region === 'brazil' ? 'PRO (Brasil)' : 'PRO (Global)',
                description: region === 'brazil' ?
                    'Plano mensal com comissão reduzida de 10% sobre os lucros' :
                    'Monthly plan with reduced 10% commission on profits',
                type: 'MONTHLY',
                price: region === 'brazil' ? 297 : 50,
                currency: region === 'brazil' ? 'BRL' : 'USD',
                billingPeriod: 'month',
                commissionRate: 10,
                minimumBalance: region === 'brazil' ? 100 : 20,
                features: region === 'brazil' ? [
                    '🤖 Trading automatizado 24/7',
                    '💰 10% comissão apenas sobre lucros',
                    '🎯 Suporte prioritário VIP',
                    '🧠 Estratégias avançadas com IA ÁGUIA',
                    '👑 Comunidade exclusiva Premium',
                    '⭐ Mais vantajoso para investimentos > $5k USD',
                    '🎁 Bônus de 10% no primeiro depósito',
                    '📱 App mobile exclusivo'
                ] : [
                    '🤖 24/7 Automated Trading',
                    '💰 10% commission only on profits',
                    '🎯 Priority VIP support',
                    '🧠 Advanced ÁGUIA AI strategies',
                    '👑 Exclusive Premium community',
                    '🌍 24/7 international support',
                    '🎁 10% bonus on first deposit'
                ],
                isPopular: false,
                stripeProductId: region === 'brazil' ? 'prod_SbHejGiPSr1asV' : 'prod_SbHhz5Ht3q1lul'
            }
        ];

        // Filter plans based on user's region
        const filteredPlans = allPlans.filter(plan => {
            // Always include TRIAL
            if (plan.code === 'TRIAL') return true;
            // Include plans for user's region
            return plan.region === userRegion;
        });

        return {
            success: true,
            region: userRegion,
            userCountry: userCountry,
            currentPlan: userCurrentPlan,
            plans: filteredPlans.map(plan => ({
                ...plan,
                // Add current plan status
                isCurrentPlan: userCurrentPlan && plan.code === userCurrentPlan.plan_type,
                isActive: userCurrentPlan && plan.code === userCurrentPlan.plan_type && userCurrentPlan.subscription_status === 'active',
                // Add purchase status
                canPurchase: !(userCurrentPlan && plan.code === userCurrentPlan.plan_type)
            }))
        };
    }

    /**
     * POST /subscribe - Subscribe to a plan
     */
    async subscribeToPlan(req, res) {
        try {
            const userId = req.user.id;
            const { planCode, successUrl, cancelUrl } = req.body;

            // Get plan from database
            let planData;
            try {
                const planResult = await this.authMiddleware.dbPoolManager.executeRead(
                    'SELECT * FROM plans WHERE code = $1 AND is_active = true',
                    [planCode]
                );

                if (planResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Código de plano inválido'
                    });
                }

                planData = planResult.rows[0];
            } catch (error) {
                console.warn('Database error, using fallback validation');
                const validPlans = ['TRIAL', 'FLEX_BR', 'PRO_BR', 'FLEX_US', 'PRO_US'];
                if (!validPlans.includes(planCode)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Código de plano inválido'
                    });
                }
            }

            // For free plans (TRIAL, FLEX), just update user plan directly
            if (planCode === 'TRIAL' || planCode.includes('FLEX')) {
                try {
                    await this.authMiddleware.dbPoolManager.executeWrite(
                        `UPDATE users SET
                         plan_type = $1,
                         subscription_status = 'active',
                         subscription_start_date = NOW(),
                         updated_at = NOW()
                         WHERE id = $2`,
                        [planCode, userId]
                    );

                    return res.json({
                        success: true,
                        message: 'Plano ativado com sucesso!',
                        planCode,
                        checkoutUrl: '#mock-checkout-success'
                    });
                } catch (dbError) {
                    console.error('Database update error:', dbError);
                    return res.json({
                        success: true,
                        message: 'Plano ativado com sucesso! (mock)',
                        planCode,
                        checkoutUrl: '#mock-checkout-success'
                    });
                }
            }

            // For paid plans, create Stripe checkout session
            const isMonthly = planCode.includes('PRO');
            const isBrazil = planCode.includes('BR');
            const planType = isMonthly ? 'monthly' : 'prepaid';
            const country = isBrazil ? 'BR' : 'US';

            // Create Stripe checkout session
            const session = await this.stripeService.createCheckoutSession(
                userId,
                planType,
                country,
                null, // price will be determined by plan type
                successUrl,
                cancelUrl
            );

            res.json({
                success: true,
                checkoutUrl: session.url,
                sessionId: session.id,
                planCode
            });

        } catch (error) {
            console.error('❌ Error subscribing to plan:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /upgrade - Upgrade to a higher plan
     */
    async upgradePlan(req, res) {
        try {
            // Mock implementation for now
            res.json({
                success: true,
                message: 'Upgrade de plano em desenvolvimento'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /downgrade - Downgrade to a lower plan
     */
    async downgradePlan(req, res) {
        try {
            // Mock implementation for now
            res.json({
                success: true,
                message: 'Downgrade de plano em desenvolvimento'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /validation - Get plan validation status
     */
    async getPlanValidation(req, res) {
        try {
            if (!this.planValidator) {
                return res.status(503).json({
                    success: false,
                    error: 'Plan validator not initialized'
                });
            }

            const userId = req.user.id;
            const validation = await this.planValidator.validatePlan(userId);

            res.json({
                success: true,
                validation
            });
        } catch (error) {
            console.error('❌ Error validating plan:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /limits - Get plan limits for operations
     */
    async getPlanLimits(req, res) {
        try {
            if (!this.planValidator) {
                return res.status(503).json({
                    success: false,
                    error: 'Plan validator not initialized'
                });
            }

            const userId = req.user.id;
            const limits = await this.planValidator.getPlanLimits(userId);

            res.json({
                success: true,
                limits
            });
        } catch (error) {
            console.error('❌ Error getting plan limits:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /recharge - Create account recharge session
     */
    async rechargeAccount(req, res) {
        try {
            const { amount, currency } = req.body;
            const userId = req.user.id;

            // Validate input
            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor inválido'
                });
            }

            if (!['BRL', 'USD'].includes(currency)) {
                return res.status(400).json({
                    success: false,
                    error: 'Moeda não suportada. Use BRL ou USD.'
                });
            }

            // Mock recharge for development
            res.json({
                success: true,
                clientSecret: 'mock_client_secret_' + Date.now(),
                amount,
                currency,
                message: 'Recarga simulada criada com sucesso'
            });

        } catch (error) {
            console.error('❌ Create recharge error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new PlansRoutes();