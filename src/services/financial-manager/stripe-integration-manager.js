/**
 * 💳 STRIPE INTEGRATION MANAGER
 * ============================
 * 
 * Microserviço para integração completa com Stripe
 * Parte da Etapa 2: Sistema Financeiro Completo
 */

const Stripe = require('stripe');
const { createLogger } = require('../../shared/utils/logger');

class StripeIntegrationManager {
    constructor(config = {}) {
        this.logger = createLogger('process.env.API_KEY_HERE');
        this.stripe = Stripe(config.stripeSecretKey || process.env.STRIPE_SECRET_KEY);
        
        this.config = {
            webhookSecret: config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET,
            successUrl: config.successUrl || 'https://coinbitclub.com/success',
            cancelUrl: config.cancelUrl || 'https://coinbitclub.com/cancel',
            ...config
        };

        this.logger.info('StripeIntegrationManager inicializado');
    }

    /**
     * Processar assinatura mensal
     */
    async processSubscription(userId, planId, customerData = {}) {
        try {
            this.logger.info(`Processando assinatura para usuário ${userId}`, { planId });

            // Criar ou recuperar customer
            let customer;
            if (customerData.stripeCustomerId) {
                customer = await this.stripe.customers.retrieve(customerData.stripeCustomerId);
            } else {
                customer = await this.stripe.customers.create({
                    email: customerData.email,
                    name: customerData.name,
                    metadata: {
                        userId: userId.toString(),
                        country: customerData.country || 'BR',
                        planType: 'MONTHLY'
                    }
                });
            }

            // Criar assinatura
            const subscription = await this.stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: planId }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    userId: userId.toString(),
                    planType: 'MONTHLY'
                }
            });

            this.logger.info(`Assinatura criada: ${subscription.id}`, { userId, customerId: customer.id });

            return {
                subscription,
                customer,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
                subscriptionId: subscription.id,
                customerId: customer.id
            };

        } catch (error) {
            this.logger.error('Erro ao processar assinatura', { error: error.message, userId, planId });
            throw error;
        }
    }

    /**
     * Processar recarga pré-paga
     */
    async processRecharge(userId, amount, currency, options = {}) {
        try {
            this.logger.info(`Processando recarga para usuário ${userId}`, { amount, currency });

            // Calcular bônus se elegível
            const bonusInfo = this.calculateRechargeBonus(amount, currency);
            
            // Criar PaymentIntent
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: amount,
                currency: currency.toLowerCase(),
                metadata: {
                    userId: userId.toString(),
                    type: 'recharge',
                    originalAmount: amount.toString(),
                    bonusAmount: bonusInfo.bonusAmount.toString(),
                    finalAmount: bonusInfo.finalAmount.toString(),
                    bonusApplied: bonusInfo.bonusApplied.toString(),
                    country: options.country || 'BR',
                    planType: 'PREPAID'
                },
                description: `CoinBitClub Recharge - ${bonusInfo.bonusApplied ? 'with bonus' : 'standard'}`,
                receipt_email: options.email
            });

            this.logger.info(`Recarga criada: ${paymentIntent.id}`, { 
                userId, 
                amount, 
                bonus: bonusInfo.bonusAmount 
            });

            return {
                paymentIntent,
                clientSecret: paymentIntent.client_secret,
                bonusInfo,
                paymentIntentId: paymentIntent.id
            };

        } catch (error) {
            this.logger.error('Erro ao processar recarga', { error: error.message, userId, amount, currency });
            throw error;
        }
    }

    /**
     * Calcular bônus de recarga
     */
    calculateRechargeBonus(amount, currency) {
        // Thresholds para bônus
        const bonusThresholds = {
            BRL: 50000, // R$ 500
            USD: 10000  // $100
        };

        const threshold = bonusThresholds[currency.toUpperCase()] || 50000;
        const bonusApplied = amount >= threshold;
        const bonusAmount = bonusApplied ? Math.floor(amount * 0.1) : 0; // 10% de bônus
        const finalAmount = amount + bonusAmount;

        return {
            originalAmount: amount,
            bonusAmount,
            finalAmount,
            bonusApplied,
            bonusPercentage: bonusApplied ? 10 : 0,
            threshold
        };
    }

    /**
     * Processar webhook do Stripe
     */
    async processWebhook(rawBody, signature) {
        try {
            // Verificar assinatura do webhook
            const event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                this.config.webhookSecret
            );

            this.logger.info(`Webhook recebido: ${event.type}`, { eventId: event.id });

            switch (event.type) {
                case 'payment_intent.succeeded':
                    return await this.handlePaymentSuccess(event.data.object);
                
                case 'invoice.payment_succeeded':
                    return await this.handleSubscriptionPayment(event.data.object);
                
                case 'customer.subscription.created':
                    return await this.handleSubscriptionCreated(event.data.object);
                
                case 'customer.subscription.updated':
                    return await this.handleSubscriptionUpdated(event.data.object);
                
                case 'customer.subscription.deleted':
                    return await this.handleSubscriptionCancelled(event.data.object);
                
                case 'invoice.payment_failed':
                    return await this.handlePaymentFailed(event.data.object);
                
                default:
                    this.logger.warn(`Evento não tratado: ${event.type}`, { eventId: event.id });
                    return { received: true, processed: false };
            }

        } catch (error) {
            this.logger.error('Erro no processamento do webhook', { error: error.message });
            throw error;
        }
    }

    /**
     * Tratar pagamento bem-sucedido
     */
    async handlePaymentSuccess(paymentIntent) {
        try {
            const { metadata } = paymentIntent;
            const userId = parseInt(metadata.userId);

            if (metadata.type === 'recharge') {
                const originalAmount = parseInt(metadata.originalAmount);
                const bonusAmount = parseInt(metadata.bonusAmount);
                const finalAmount = parseInt(metadata.finalAmount);

                this.logger.info(`Recarga bem-sucedida`, {
                    userId,
                    paymentIntentId: paymentIntent.id,
                    originalAmount,
                    bonusAmount,
                    finalAmount
                });

                return {
                    type: 'recharge_success',
                    userId,
                    amount: originalAmount,
                    bonus: bonusAmount,
                    total: finalAmount,
                    currency: paymentIntent.currency.toUpperCase(),
                    paymentIntentId: paymentIntent.id
                };
            }

            return { type: 'payment_success', userId, paymentIntentId: paymentIntent.id };

        } catch (error) {
            this.logger.error('Erro ao tratar pagamento bem-sucedido', { error: error.message });
            throw error;
        }
    }

    /**
     * Tratar pagamento de assinatura
     */
    async handleSubscriptionPayment(invoice) {
        try {
            const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
            const userId = parseInt(subscription.metadata.userId);

            this.logger.info(`Pagamento de assinatura bem-sucedido`, {
                userId,
                subscriptionId: subscription.id,
                invoiceId: invoice.id,
                amount: invoice.amount_paid
            });

            return {
                type: 'subscription_payment_success',
                userId,
                subscriptionId: subscription.id,
                invoiceId: invoice.id,
                amount: invoice.amount_paid,
                currency: invoice.currency.toUpperCase(),
                period: {
                    start: new Date(invoice.period_start * 1000),
                    end: new Date(invoice.period_end * 1000)
                }
            };

        } catch (error) {
            this.logger.error('Erro ao tratar pagamento de assinatura', { error: error.message });
            throw error;
        }
    }

    /**
     * Tratar assinatura criada
     */
    async handleSubscriptionCreated(subscription) {
        try {
            const userId = parseInt(subscription.metadata.userId);

            this.logger.info(`Assinatura criada`, {
                userId,
                subscriptionId: subscription.id,
                status: subscription.status
            });

            return {
                type: 'subscription_created',
                userId,
                subscriptionId: subscription.id,
                status: subscription.status
            };

        } catch (error) {
            this.logger.error('Erro ao tratar assinatura criada', { error: error.message });
            throw error;
        }
    }

    /**
     * Tratar assinatura atualizada
     */
    async handleSubscriptionUpdated(subscription) {
        try {
            const userId = parseInt(subscription.metadata.userId);

            this.logger.info(`Assinatura atualizada`, {
                userId,
                subscriptionId: subscription.id,
                status: subscription.status
            });

            return {
                type: 'subscription_updated',
                userId,
                subscriptionId: subscription.id,
                status: subscription.status
            };

        } catch (error) {
            this.logger.error('Erro ao tratar assinatura atualizada', { error: error.message });
            throw error;
        }
    }

    /**
     * Tratar assinatura cancelada
     */
    async handleSubscriptionCancelled(subscription) {
        try {
            const userId = parseInt(subscription.metadata.userId);

            this.logger.info(`Assinatura cancelada`, {
                userId,
                subscriptionId: subscription.id
            });

            return {
                type: 'subscription_cancelled',
                userId,
                subscriptionId: subscription.id,
                cancelledAt: new Date(subscription.canceled_at * 1000)
            };

        } catch (error) {
            this.logger.error('Erro ao tratar assinatura cancelada', { error: error.message });
            throw error;
        }
    }

    /**
     * Tratar falha no pagamento
     */
    async handlePaymentFailed(invoice) {
        try {
            const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
            const userId = parseInt(subscription.metadata.userId);

            this.logger.warn(`Falha no pagamento`, {
                userId,
                subscriptionId: subscription.id,
                invoiceId: invoice.id,
                amount: invoice.amount_due
            });

            return {
                type: 'payment_failed',
                userId,
                subscriptionId: subscription.id,
                invoiceId: invoice.id,
                amount: invoice.amount_due,
                currency: invoice.currency.toUpperCase()
            };

        } catch (error) {
            this.logger.error('Erro ao tratar falha no pagamento', { error: error.message });
            throw error;
        }
    }

    /**
     * Criar checkout session
     */
    async createCheckoutSession(userId, items, options = {}) {
        try {
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: items,
                mode: options.mode || 'payment',
                success_url: `${this.config.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: this.config.cancelUrl,
                customer_email: options.email,
                metadata: {
                    userId: userId.toString(),
                    ...options.metadata
                }
            });

            this.logger.info(`Checkout session criada`, { userId, sessionId: session.id });

            return {
                sessionId: session.id,
                url: session.url,
                checkoutSession: session
            };

        } catch (error) {
            this.logger.error('Erro ao criar checkout session', { error: error.message, userId });
            throw error;
        }
    }

    /**
     * Recuperar informações de pagamento
     */
    async getPaymentInfo(paymentIntentId) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            this.logger.error('Erro ao recuperar informações de pagamento', { error: error.message, paymentIntentId });
            throw error;
        }
    }

    /**
     * Recuperar informações de assinatura
     */
    async getSubscriptionInfo(subscriptionId) {
        try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            return subscription;
        } catch (error) {
            this.logger.error('Erro ao recuperar informações de assinatura', { error: error.message, subscriptionId });
            throw error;
        }
    }

    /**
     * Cancelar assinatura
     */
    async cancelSubscription(subscriptionId, options = {}) {
        try {
            const subscription = await this.stripe.subscriptions.cancel(subscriptionId, {
                prorate: options.prorate || false
            });

            this.logger.info(`Assinatura cancelada`, { subscriptionId });

            return subscription;

        } catch (error) {
            this.logger.error('Erro ao cancelar assinatura', { error: error.message, subscriptionId });
            throw error;
        }
    }
}

module.exports = StripeIntegrationManager;
