/**
 * APIS ENTERPRISE - ENDPOINTS PRINCIPAIS
 * CoinBitClub Market Bot v6.0.0 Enterprise
 * 
 * Endpoints principais para o sistema enterprise
 */

const express = require('express');
const EnterpriseUserManager = require('./enterprise-user-manager');
const EnterpriseSubscriptionManager = require('./enterprise-subscription-manager');
const jwt = require('jsonwebtoken');

class EnterpriseAPIs {
    constructor() {
        this.userManager = new EnterpriseUserManager();
        this.subscriptionManager = new EnterpriseSubscriptionManager();
        this.router = express.Router();
        this.setupRoutes();
    }

    /**
     * Middleware de autenticação
     */
    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token de acesso requerido' });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token inválido' });
            }
            req.user = user;
            next();
        });
    }

    /**
     * Middleware para verificar se é admin
     */
    async requireAdmin(req, res, next) {
        try {
            const userProfile = await this.userManager.getUserProfile(req.user.id);
            
            if (userProfile.profile_type !== 'admin') {
                return res.status(403).json({ error: 'Acesso restrito a administradores' });
            }
            
            next();
        } catch (error) {
            res.status(500).json({ error: 'Erro ao verificar permissões' });
        }
    }

    setupRoutes() {
        // =====================================================
        // AUTENTICAÇÃO E REGISTRO ENTERPRISE
        // =====================================================

        /**
         * POST /api/enterprise/register
         * Registro de usuário enterprise
         */
        this.router.post('/register', async (req, res) => {
            try {
                console.log('📝 Registro enterprise iniciado...');
                
                const userData = req.body;
                
                // Validações básicas
                if (!userData.email || !userData.password || !userData.profile_type) {
                    return res.status(400).json({
                        error: 'Email, senha e tipo de perfil são obrigatórios'
                    });
                }

                const result = await this.userManager.registerEnterpriseUser(userData);
                
                res.status(201).json(result);
                
            } catch (error) {
                console.error('❌ Erro no registro:', error.message);
                res.status(400).json({ error: error.message });
            }
        });

        /**
         * POST /api/enterprise/verify-sms
         * Verificação de código SMS
         */
        this.router.post('/verify-sms', async (req, res) => {
            try {
                const { userId, code } = req.body;
                
                if (!userId || !code) {
                    return res.status(400).json({
                        error: 'ID do usuário e código são obrigatórios'
                    });
                }

                const result = await this.userManager.verifySMSCode(userId, code);
                
                res.json(result);
                
            } catch (error) {
                console.error('❌ Erro na verificação:', error.message);
                res.status(400).json({ error: error.message });
            }
        });

        // =====================================================
        // GESTÃO DE PERFIS ENTERPRISE
        // =====================================================

        /**
         * GET /api/enterprise/profile
         * Obter perfil do usuário autenticado
         */
        this.router.get('/profile', this.authenticateToken, async (req, res) => {
            try {
                const profile = await this.userManager.getUserProfile(req.user.id);
                res.json(profile);
            } catch (error) {
                console.error('❌ Erro ao buscar perfil:', error.message);
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * PUT /api/enterprise/profile
         * Atualizar perfil do usuário
         */
        this.router.put('/profile', this.authenticateToken, async (req, res) => {
            try {
                const result = await this.userManager.updateUserProfile(req.user.id, req.body);
                res.json(result);
            } catch (error) {
                console.error('❌ Erro ao atualizar perfil:', error.message);
                res.status(400).json({ error: error.message });
            }
        });

        /**
         * POST /api/enterprise/profile/migrate
         * Migrar perfil do usuário (admin only)
         */
        this.router.post('/profile/migrate', 
            this.authenticateToken, 
            this.requireAdmin.bind(this), 
            async (req, res) => {
                try {
                    const { userId, newProfileType } = req.body;
                    
                    if (!userId || !newProfileType) {
                        return res.status(400).json({
                            error: 'ID do usuário e novo tipo de perfil são obrigatórios'
                        });
                    }

                    const result = await this.userManager.migrateUserProfile(
                        userId, 
                        newProfileType, 
                        req.user.id
                    );
                    
                    res.json(result);
                } catch (error) {
                    console.error('❌ Erro na migração:', error.message);
                    res.status(400).json({ error: error.message });
                }
            });

        /**
         * GET /api/enterprise/profile/statistics
         * Estatísticas de perfis (admin only)
         */
        this.router.get('/profile/statistics', 
            this.authenticateToken, 
            this.requireAdmin.bind(this), 
            async (req, res) => {
                try {
                    const stats = await this.userManager.getProfileStatistics();
                    res.json(stats);
                } catch (error) {
                    console.error('❌ Erro ao obter estatísticas:', error.message);
                    res.status(500).json({ error: error.message });
                }
            });

        // =====================================================
        // SISTEMA DE PLANOS ENTERPRISE
        // =====================================================

        /**
         * GET /api/enterprise/plans
         * Listar planos disponíveis
         */
        this.router.get('/plans', async (req, res) => {
            try {
                const { region = 'brazil' } = req.query;
                const plans = await this.subscriptionManager.getAvailablePlans(region);
                res.json(plans);
            } catch (error) {
                console.error('❌ Erro ao buscar planos:', error.message);
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * GET /api/enterprise/plans/:planCode
         * Detalhes de um plano específico
         */
        this.router.get('/plans/:planCode', async (req, res) => {
            try {
                const { planCode } = req.params;
                const plan = await this.subscriptionManager.getPlanDetails(planCode);
                res.json(plan);
            } catch (error) {
                console.error('❌ Erro ao buscar plano:', error.message);
                res.status(404).json({ error: error.message });
            }
        });

        /**
         * POST /api/enterprise/subscribe
         * Criar checkout para assinatura
         */
        this.router.post('/subscribe', this.authenticateToken, async (req, res) => {
            try {
                const { planCode, successUrl, cancelUrl } = req.body;
                
                if (!planCode || !successUrl || !cancelUrl) {
                    return res.status(400).json({
                        error: 'Código do plano, URL de sucesso e cancelamento são obrigatórios'
                    });
                }

                const result = await this.subscriptionManager.createCheckoutSession(
                    req.user.id,
                    planCode,
                    successUrl,
                    cancelUrl
                );
                
                res.json(result);
                
            } catch (error) {
                console.error('❌ Erro ao criar checkout:', error.message);
                res.status(400).json({ error: error.message });
            }
        });

        /**
         * GET /api/enterprise/subscription
         * Obter assinatura atual do usuário
         */
        this.router.get('/subscription', this.authenticateToken, async (req, res) => {
            try {
                const subscription = await this.subscriptionManager.getCurrentSubscription(req.user.id);
                res.json(subscription);
            } catch (error) {
                console.error('❌ Erro ao buscar assinatura:', error.message);
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * DELETE /api/enterprise/subscription
         * Cancelar assinatura atual
         */
        this.router.delete('/subscription', this.authenticateToken, async (req, res) => {
            try {
                const result = await this.subscriptionManager.cancelSubscription(req.user.id);
                res.json(result);
            } catch (error) {
                console.error('❌ Erro ao cancelar assinatura:', error.message);
                res.status(400).json({ error: error.message });
            }
        });

        /**
         * POST /api/enterprise/subscription/migrate
         * Migrar para outro plano
         */
        this.router.post('/subscription/migrate', this.authenticateToken, async (req, res) => {
            try {
                const { newPlanCode } = req.body;
                
                if (!newPlanCode) {
                    return res.status(400).json({
                        error: 'Código do novo plano é obrigatório'
                    });
                }

                const result = await this.subscriptionManager.migratePlan(req.user.id, newPlanCode);
                res.json(result);
                
            } catch (error) {
                console.error('❌ Erro na migração de plano:', error.message);
                res.status(400).json({ error: error.message });
            }
        });

        // =====================================================
        // WEBHOOKS STRIPE
        // =====================================================

        /**
         * POST /api/enterprise/webhooks/stripe
         * Webhook do Stripe
         */
        this.router.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
            let event;

            try {
                // Verificar signature do Stripe
                const sig = req.headers['stripe-signature'];
                event = require('stripe')(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(
                    req.body, 
                    sig, 
                    process.env.STRIPE_WEBHOOK_SECRET
                );
            } catch (err) {
                console.error('❌ Erro na verificação do webhook:', err.message);
                return res.status(400).send(`Webhook Error: ${err.message}`);
            }

            try {
                await this.subscriptionManager.processStripeWebhook(event);
                res.json({ received: true });
            } catch (error) {
                console.error('❌ Erro ao processar webhook:', error.message);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });

        // =====================================================
        // DASHBOARD ENTERPRISE (ADMIN)
        // =====================================================

        /**
         * GET /api/enterprise/admin/dashboard
         * Dashboard administrativo
         */
        this.router.get('/admin/dashboard', 
            this.authenticateToken, 
            this.requireAdmin.bind(this), 
            async (req, res) => {
                try {
                    const [profileStats, subscriptionStats] = await Promise.all([
                        this.userManager.getProfileStatistics(),
                        this.subscriptionManager.getSubscriptionStatistics()
                    ]);

                    const dashboard = {
                        profileStatistics: profileStats,
                        subscriptionStatistics: subscriptionStats,
                        generatedAt: new Date()
                    };

                    res.json(dashboard);
                } catch (error) {
                    console.error('❌ Erro no dashboard:', error.message);
                    res.status(500).json({ error: error.message });
                }
            });

        /**
         * GET /api/enterprise/admin/users
         * Listar todos os usuários enterprise
         */
        this.router.get('/admin/users', 
            this.authenticateToken, 
            this.requireAdmin.bind(this), 
            async (req, res) => {
                try {
                    const { page = 1, limit = 20, profile_type, search } = req.query;
                    
                    let whereClause = '';
                    let queryParams = [];
                    let paramIndex = 1;

                    if (profile_type) {
                        whereClause += ` WHERE upe.profile_type = $${paramIndex}`;
                        queryParams.push(profile_type);
                        paramIndex++;
                    }

                    if (search) {
                        const searchClause = whereClause ? ' AND' : ' WHERE';
                        whereClause += `${searchClause} (u.email ILIKE $${paramIndex} OR upe.nome_completo ILIKE $${paramIndex})`;
                        queryParams.push(`%${search}%`);
                        paramIndex++;
                    }

                    const offset = (parseInt(page) - 1) * parseInt(limit);
                    queryParams.push(limit, offset);

                    const users = await this.userManager.pool.query(`
                        SELECT 
                            u.id, u.email, u.is_active, u.created_at,
                            upe.profile_type, upe.nome_completo, upe.whatsapp, 
                            upe.dados_validados, upe.limite_saque_diario,
                            se.status as subscription_status,
                            pe.name as plan_name
                        FROM users u
                        JOIN user_profiles_enterprise upe ON u.id = upe.user_id
                        LEFT JOIN subscriptions_enterprise se ON u.id = se.user_id AND se.status = 'active'
                        LEFT JOIN plans_enterprise pe ON se.plan_id = pe.id
                        ${whereClause}
                        ORDER BY u.created_at DESC
                        LIMIT $${paramIndex - 1} OFFSET $${paramIndex}
                    `, queryParams);

                    // Contar total
                    const countResult = await this.userManager.pool.query(`
                        SELECT COUNT(*) as total
                        FROM users u
                        JOIN user_profiles_enterprise upe ON u.id = upe.user_id
                        ${whereClause}
                    `, queryParams.slice(0, -2));

                    res.json({
                        users: users.rows,
                        pagination: {
                            page: parseInt(page),
                            limit: parseInt(limit),
                            total: parseInt(countResult.rows[0].total),
                            totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
                        }
                    });

                } catch (error) {
                    console.error('❌ Erro ao listar usuários:', error.message);
                    res.status(500).json({ error: error.message });
                }
            });

        // =====================================================
        // HEALTH CHECK ENTERPRISE
        // =====================================================

        /**
         * GET /api/enterprise/health
         * Health check do sistema enterprise
         */
        this.router.get('/health', async (req, res) => {
            try {
                // Testar conexão com banco
                const dbResult = await this.userManager.pool.query('SELECT NOW()');
                
                // Testar conexão com Stripe
                const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
                await stripe.accounts.retrieve();

                res.json({
                    status: 'healthy',
                    timestamp: new Date(),
                    database: 'connected',
                    stripe: 'connected',
                    version: '6.0.0 Enterprise'
                });

            } catch (error) {
                console.error('❌ Health check falhou:', error.message);
                res.status(503).json({
                    status: 'unhealthy',
                    timestamp: new Date(),
                    error: error.message
                });
            }
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = EnterpriseAPIs;
