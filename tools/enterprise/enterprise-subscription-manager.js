/**
 * SISTEMA ENTERPRISE - SUBSCRIPTION MANAGER
 * CoinBitClub Market Bot v6.0.0 Enterprise
 * 
 * Gerenciador completo de assinaturas enterprise
 * Integração com Stripe e sistema de planos
 */

const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class EnterpriseSubscriptionManager {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        // Planos Enterprise conforme especificação
        this.enterprisePlans = {
            'brasil_pro': {
                id: 'brasil_pro',
                name: 'Brasil PRO',
                region: 'brazil',
                type: 'monthly',
                monthlyPrice: 297.00, // R$297 conforme especificação
                currency: 'BRL',
                commissionRate: 10.00,
                minimumBalance: 100.00,
                stripeProductId: 'prod_SbHejGiPSr1asV',
                features: [
                    'Trading automatizado 24/7',
                    'Máximo 2 operações simultâneas',
                    'Relatórios IA a cada 4 horas',
                    'Notificações WhatsApp',
                    'Suporte prioritário',
                    'Dashboard completo',
                    'Análise de risco avançada'
                ]
            },
            'brasil_flex': {
                id: 'brasil_flex',
                name: 'Brasil FLEX',
                region: 'brazil',
                type: 'prepaid',
                monthlyPrice: 0.00,
                currency: 'BRL',
                commissionRate: 20.00,
                minimumBalance: 100.00,
                stripeProductId: 'prod_SbHgHezeyKfTVg',
                features: [
                    'Trading automatizado 24/7',
                    'Máximo 2 operações simultâneas',
                    'Relatórios IA a cada 4 horas',
                    'Notificações WhatsApp',
                    'Suporte padrão',
                    'Dashboard completo',
                    'Sem mensalidade - apenas comissão'
                ]
            },
            'global_pro': {
                id: 'global_pro',
                name: 'Global PRO',
                region: 'international',
                type: 'monthly',
                monthlyPrice: 50.00,
                currency: 'USD',
                commissionRate: 10.00,
                minimumBalance: 20.00,
                stripeProductId: 'prod_SbHhz5Ht3q1lul',
                features: [
                    '24/7 Automated Trading',
                    'Maximum 2 simultaneous operations',
                    'AI Reports every 4 hours',
                    'WhatsApp Notifications',
                    'Priority Support',
                    'Complete Dashboard',
                    'Advanced Risk Analysis'
                ]
            },
            'global_flex': {
                id: 'global_flex',
                name: 'Global FLEX',
                region: 'international',
                type: 'prepaid',
                monthlyPrice: 0.00,
                currency: 'USD',
                commissionRate: 20.00,
                minimumBalance: 20.00,
                stripeProductId: 'prod_SbHiDqfrH2T8dI',
                features: [
                    '24/7 Automated Trading',
                    'Maximum 2 simultaneous operations',
                    'AI Reports every 4 hours',
                    'WhatsApp Notifications',
                    'Standard Support',
                    'Complete Dashboard',
                    'No monthly fee - commission only'
                ]
            }
        };
    }

    /**
     * Listar planos disponíveis por região
     */
    async getAvailablePlans(region = 'brazil') {
        try {
            const result = await this.pool.query(`
                SELECT 
                    id, plan_code, name, description, region, type,
                    monthly_price, currency, commission_rate, minimum_balance,
                    stripe_product_id, features, is_popular, is_active
                FROM plans_enterprise 
                WHERE region = $1 AND is_active = true
                ORDER BY monthly_price ASC
            `, [region]);

            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao buscar planos:', error.message);
            throw error;
        }
    }

    /**
     * Obter detalhes de um plano específico
     */
    async getPlanDetails(planCode) {
        try {
            const result = await this.pool.query(`
                SELECT * FROM plans_enterprise 
                WHERE plan_code = $1 AND is_active = true
            `, [planCode]);

            if (result.rows.length === 0) {
                throw new Error('Plano não encontrado');
            }

            return result.rows[0];
        } catch (error) {
            console.error('❌ Erro ao buscar plano:', error.message);
            throw error;
        }
    }

    /**
     * Criar checkout Stripe para assinatura
     */
    async createCheckoutSession(userId, planCode, successUrl, cancelUrl) {
        const client = await this.pool.connect();
        
        try {
            console.log('🚀 Criando checkout session...', { userId, planCode });

            // Buscar dados do usuário
            const userResult = await client.query(`
                SELECT u.id, u.email, u.name, upe.profile_type, upe.pais
                FROM users u
                JOIN user_profiles_enterprise upe ON u.id = upe.user_id
                WHERE u.id = $1
            `, [userId]);

            if (userResult.rows.length === 0) {
                throw new Error('Usuário não encontrado');
            }

            const user = userResult.rows[0];

            // Buscar plano
            const plan = await this.getPlanDetails(planCode);

            if (plan.type === 'prepaid') {
                throw new Error('Planos pré-pagos não usam checkout (são baseados em recargas)');
            }

            // Criar ou buscar cliente Stripe
            let stripeCustomerId;
            const existingCustomer = await client.query(`
                SELECT stripe_customer_id 
                FROM subscriptions_enterprise 
                WHERE user_id = $1 AND stripe_customer_id IS NOT NULL
                LIMIT 1
            `, [userId]);

            if (existingCustomer.rows.length > 0) {
                stripeCustomerId = existingCustomer.rows[0].stripe_customer_id;
            } else {
                const customer = await stripe.customers.create({
                    email: user.email,
                    name: user.name,
                    metadata: {
                        user_id: userId.toString(),
                        profile_type: user.profile_type,
                        plan_code: planCode
                    }
                });
                stripeCustomerId = customer.id;
            }

            // Buscar ou criar preço no Stripe
            const stripePriceId = await this.getOrCreateStripePrice(plan);

            // Criar checkout session
            const session = await stripe.checkout.sessions.create({
                customer: stripeCustomerId,
                payment_method_types: ['card'],
                mode: 'subscription',
                line_items: [{
                    price: stripePriceId,
                    quantity: 1
                }],
                success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancelUrl,
                metadata: {
                    user_id: userId.toString(),
                    plan_code: planCode,
                    plan_id: plan.id.toString()
                },
                subscription_data: {
                    metadata: {
                        user_id: userId.toString(),
                        plan_code: planCode,
                        plan_id: plan.id.toString()
                    }
                }
            });

            console.log('✅ Checkout session criada:', session.id);

            return {
                success: true,
                checkoutUrl: session.url,
                sessionId: session.id
            };

        } catch (error) {
            console.error('❌ Erro ao criar checkout:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Processar webhook do Stripe
     */
    async processStripeWebhook(event) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            console.log('🔔 Processando webhook Stripe:', event.type);

            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(client, event.data.object);
                    break;

                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(client, event.data.object);
                    break;

                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(client, event.data.object);
                    break;

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionCanceled(client, event.data.object);
                    break;

                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(client, event.data.object);
                    break;

                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(client, event.data.object);
                    break;

                default:
                    console.log('ℹ️ Webhook ignorado:', event.type);
            }

            await client.query('COMMIT');
            console.log('✅ Webhook processado com sucesso');

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro no webhook:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Handle checkout completed
     */
    async handleCheckoutCompleted(client, session) {
        const userId = parseInt(session.metadata.user_id);
        const planCode = session.metadata.plan_code;
        
        console.log('💳 Checkout concluído:', { userId, planCode });

        // Buscar plano
        const planResult = await client.query(`
            SELECT * FROM plans_enterprise WHERE plan_code = $1
        `, [planCode]);

        const plan = planResult.rows[0];

        // Criar assinatura
        await client.query(`
            INSERT INTO subscriptions_enterprise (
                user_id, plan_id, stripe_subscription_id, stripe_customer_id,
                stripe_status, status, amount, currency, current_period_start,
                metadata
            ) VALUES ($1, $2, $3, $4, 'active', 'active', $5, $6, NOW(), $7)
            ON CONFLICT (stripe_subscription_id) DO UPDATE SET
                status = 'active',
                updated_at = NOW()
        `, [
            userId,
            plan.id,
            session.subscription,
            session.customer,
            plan.monthly_price,
            plan.currency,
            JSON.stringify(session.metadata)
        ]);

        console.log('✅ Assinatura criada no banco');
    }

    /**
     * Handle subscription created
     */
    async handleSubscriptionCreated(client, subscription) {
        const userId = parseInt(subscription.metadata.user_id);
        
        await client.query(`
            UPDATE subscriptions_enterprise 
            SET 
                current_period_start = to_timestamp($1),
                current_period_end = to_timestamp($2),
                stripe_status = $3,
                updated_at = NOW()
            WHERE user_id = $4 AND stripe_subscription_id = $5
        `, [
            subscription.current_period_start,
            subscription.current_period_end,
            subscription.status,
            userId,
            subscription.id
        ]);

        console.log('✅ Subscription atualizada:', subscription.id);
    }

    /**
     * Handle subscription updated
     */
    async handleSubscriptionUpdated(client, subscription) {
        await client.query(`
            UPDATE subscriptions_enterprise 
            SET 
                stripe_status = $1,
                current_period_start = to_timestamp($2),
                current_period_end = to_timestamp($3),
                updated_at = NOW()
            WHERE stripe_subscription_id = $4
        `, [
            subscription.status,
            subscription.current_period_start,
            subscription.current_period_end,
            subscription.id
        ]);

        console.log('✅ Subscription status atualizado:', subscription.status);
    }

    /**
     * Handle subscription canceled
     */
    async handleSubscriptionCanceled(client, subscription) {
        await client.query(`
            UPDATE subscriptions_enterprise 
            SET 
                status = 'cancelled',
                stripe_status = 'canceled',
                canceled_at = NOW(),
                updated_at = NOW()
            WHERE stripe_subscription_id = $1
        `, [subscription.id]);

        console.log('✅ Subscription cancelada:', subscription.id);
    }

    /**
     * Handle payment succeeded
     */
    async handlePaymentSucceeded(client, invoice) {
        const subscriptionId = invoice.subscription;
        
        await client.query(`
            UPDATE subscriptions_enterprise 
            SET 
                status = 'active',
                stripe_status = 'active',
                current_period_end = to_timestamp($1),
                updated_at = NOW()
            WHERE stripe_subscription_id = $2
        `, [
            invoice.period_end,
            subscriptionId
        ]);

        console.log('✅ Pagamento processado:', invoice.id);
    }

    /**
     * Handle payment failed
     */
    async handlePaymentFailed(client, invoice) {
        const subscriptionId = invoice.subscription;
        
        await client.query(`
            UPDATE subscriptions_enterprise 
            SET 
                status = 'past_due',
                stripe_status = 'past_due',
                updated_at = NOW()
            WHERE stripe_subscription_id = $1
        `, [subscriptionId]);

        console.log('⚠️ Pagamento falhou:', invoice.id);
    }

    /**
     * Obter ou criar preço no Stripe
     */
    async getOrCreateStripePrice(plan) {
        try {
            // Buscar preços existentes
            const prices = await stripe.prices.list({
                product: plan.stripe_product_id,
                active: true
            });

            // Procurar preço com o valor correto
            const targetAmount = Math.round(plan.monthly_price * 100); // Converter para centavos
            
            const existingPrice = prices.data.find(price => 
                price.unit_amount === targetAmount &&
                price.currency.toLowerCase() === plan.currency.toLowerCase() &&
                price.recurring?.interval === 'month'
            );

            if (existingPrice) {
                console.log('✅ Preço existente encontrado:', existingPrice.id);
                return existingPrice.id;
            }

            // Criar novo preço
            const newPrice = await stripe.prices.create({
                product: plan.stripe_product_id,
                unit_amount: targetAmount,
                currency: plan.currency.toLowerCase(),
                recurring: {
                    interval: 'month'
                },
                metadata: {
                    plan_code: plan.plan_code,
                    plan_name: plan.name
                }
            });

            console.log('✅ Novo preço criado:', newPrice.id);
            return newPrice.id;

        } catch (error) {
            console.error('❌ Erro ao criar preço Stripe:', error.message);
            throw error;
        }
    }

    /**
     * Cancelar assinatura
     */
    async cancelSubscription(userId, reason = 'user_requested') {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Buscar assinatura ativa
            const subscriptionResult = await client.query(`
                SELECT stripe_subscription_id 
                FROM subscriptions_enterprise 
                WHERE user_id = $1 AND status = 'active'
            `, [userId]);

            if (subscriptionResult.rows.length === 0) {
                throw new Error('Nenhuma assinatura ativa encontrada');
            }

            const stripeSubscriptionId = subscriptionResult.rows[0].stripe_subscription_id;

            // Cancelar no Stripe
            await stripe.subscriptions.cancel(stripeSubscriptionId, {
                prorate: true
            });

            // Atualizar no banco
            await client.query(`
                UPDATE subscriptions_enterprise 
                SET 
                    status = 'cancelled',
                    canceled_at = NOW(),
                    updated_at = NOW()
                WHERE user_id = $1 AND stripe_subscription_id = $2
            `, [userId, stripeSubscriptionId]);

            await client.query('COMMIT');

            console.log('✅ Assinatura cancelada:', stripeSubscriptionId);

            return { success: true, message: 'Assinatura cancelada com sucesso' };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro ao cancelar assinatura:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obter assinatura atual do usuário
     */
    async getCurrentSubscription(userId) {
        try {
            const result = await this.pool.query(`
                SELECT 
                    se.*, pe.name as plan_name, pe.plan_code, pe.features
                FROM subscriptions_enterprise se
                JOIN plans_enterprise pe ON se.plan_id = pe.id
                WHERE se.user_id = $1 AND se.status = 'active'
                ORDER BY se.created_at DESC
                LIMIT 1
            `, [userId]);

            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('❌ Erro ao buscar assinatura:', error.message);
            throw error;
        }
    }

    /**
     * Obter estatísticas de assinaturas
     */
    async getSubscriptionStatistics() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    pe.plan_code,
                    pe.name,
                    pe.monthly_price,
                    pe.currency,
                    COUNT(se.id) as total_subscriptions,
                    COUNT(CASE WHEN se.status = 'active' THEN 1 END) as active_subscriptions,
                    SUM(CASE WHEN se.status = 'active' THEN se.monthly_amount ELSE 0 END) as monthly_revenue
                FROM plans_enterprise pe
                LEFT JOIN subscriptions_enterprise se ON pe.id = se.plan_id
                WHERE pe.is_active = true
                GROUP BY pe.id, pe.plan_code, pe.name, pe.monthly_price, pe.currency
                ORDER BY monthly_revenue DESC
            `);

            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error.message);
            // Retornar dados demo dos planos
            return [
                { plan_code: 'brasil_pro', name: 'Brasil PRO', monthly_price: 297.00, currency: 'BRL', total_subscriptions: 0, active_subscriptions: 0, monthly_revenue: 0 },
                { plan_code: 'global_pro', name: 'Global PRO', monthly_price: 50.00, currency: 'USD', total_subscriptions: 0, active_subscriptions: 0, monthly_revenue: 0 }
            ];
        }
    }

    /**
     * Migrar plano do usuário
     */
    async migratePlan(userId, newPlanCode) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Buscar assinatura atual
            const currentSub = await this.getCurrentSubscription(userId);
            if (!currentSub) {
                throw new Error('Nenhuma assinatura ativa encontrada');
            }

            // Buscar novo plano
            const newPlan = await this.getPlanDetails(newPlanCode);

            // Se for mesmo tipo (monthly -> monthly), atualizar no Stripe
            if (currentSub.plan_code !== newPlanCode) {
                if (newPlan.type === 'monthly' && currentSub.stripe_subscription_id) {
                    // Atualizar subscription no Stripe
                    const newPriceId = await this.getOrCreateStripePrice(newPlan);
                    
                    await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
                        items: [{
                            id: currentSub.stripe_subscription_id,
                            price: newPriceId
                        }],
                        proration_behavior: 'create_prorations'
                    });
                }

                // Atualizar no banco
                await client.query(`
                    UPDATE subscriptions_enterprise 
                    SET 
                        plan_id = $1,
                        amount = $2,
                        currency = $3,
                        updated_at = NOW()
                    WHERE user_id = $4 AND status = 'active'
                `, [newPlan.id, newPlan.monthly_price, newPlan.currency, userId]);
            }

            await client.query('COMMIT');

            console.log('✅ Plano migrado:', { from: currentSub.plan_code, to: newPlanCode });

            return { success: true, message: 'Plano migrado com sucesso' };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro na migração de plano:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = EnterpriseSubscriptionManager;
