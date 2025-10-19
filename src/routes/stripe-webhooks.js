/**
 * 🔔 STRIPE WEBHOOKS - COINBITCLUB ENTERPRISE v6.0.0
 * Handle Stripe webhook events for static plans
 */

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeWebhooksRoutes {
    constructor() {
        this.router = express.Router();
        this.setupRoutes();
    }

    /**
     * Set database pool manager for webhook routes
     */
    setDbPoolManager(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
    }

    setupRoutes() {
        // Webhook endpoint - NO authentication middleware
        this.router.post('/webhook', express.raw({ type: 'application/json' }), this.handleWebhook.bind(this));

        // Test endpoint
        this.router.get('/test', this.testWebhook.bind(this));
    }

    /**
     * Handle Stripe webhook events
     */
    async handleWebhook(req, res) {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;

        try {
            // Verify webhook signature
            if (endpointSecret) {
                event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
            } else {
                // For development without webhook secret
                event = JSON.parse(req.body);
                console.warn('⚠️ Webhook signature verification skipped (no STRIPE_WEBHOOK_SECRET)');
            }
        } catch (err) {
            console.error('❌ Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        console.log('📥 Stripe webhook received:', event.type);

        try {
            // Handle the event
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object);
                    break;

                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;

                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event.data.object);
                    break;

                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;

                default:
                    console.log(`📋 Unhandled event type: ${event.type}`);
            }

            res.json({ received: true });
        } catch (error) {
            console.error('❌ Error processing webhook:', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    }

    /**
     * Handle checkout session completed
     */
    async handleCheckoutCompleted(session) {
        console.log('✅ Checkout completed:', session.id);

        if (!this.dbPoolManager) {
            console.error('❌ Database not available for webhook processing');
            return;
        }

        try {
            const userId = session.metadata?.userId;
            const planCode = session.metadata?.planCode;
            const planType = session.metadata?.planType;

            if (!userId || !planCode) {
                console.error('❌ Missing metadata in checkout session:', session.metadata);
                return;
            }

            // Update user plan status
            await this.dbPoolManager.executeWrite(
                `UPDATE users SET
                 plan_type = $1,
                 subscription_status = 'active',
                 subscription_start_date = NOW(),
                 trading_enabled = true,
                 stripe_customer_id = $2,
                 stripe_subscription_id = $3,
                 updated_at = NOW()
                 WHERE id = $4`,
                [
                    planCode,
                    session.customer,
                    session.subscription || null,
                    userId
                ]
            );

            // Create transaction record
            await this.dbPoolManager.executeWrite(
                `INSERT INTO transactions (
                    user_id, type, amount, currency, status,
                    stripe_payment_intent_id, stripe_session_id,
                    description, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    userId,
                    'STRIPE_PLAN_PURCHASE',
                    session.amount_total / 100, // Convert from cents
                    session.currency.toUpperCase(),
                    'COMPLETED',
                    session.payment_intent,
                    session.id,
                    `Plan subscription: ${planCode}`,
                    JSON.stringify({
                        planCode,
                        planType,
                        sessionId: session.id,
                        customerId: session.customer,
                        subscriptionId: session.subscription
                    })
                ]
            );

            // Create/update plan-specific trading configurations
            await this.createPlanTradingConfig(userId, planCode);

            console.log(`✅ User ${userId} plan updated to ${planCode} with trading configurations`);
        } catch (error) {
            console.error('❌ Error updating user plan:', error);
        }
    }

    /**
     * Handle payment succeeded
     */
    async handlePaymentSucceeded(invoice) {
        console.log('💰 Payment succeeded:', invoice.id);

        if (!this.dbPoolManager) return;

        try {
            const customerId = invoice.customer;
            const subscriptionId = invoice.subscription;

            // Find user by customer ID
            const userResult = await this.dbPoolManager.executeRead(
                'SELECT id, plan_type FROM users WHERE stripe_customer_id = $1',
                [customerId]
            );

            if (userResult.rows.length === 0) {
                console.error('❌ User not found for customer:', customerId);
                return;
            }

            const user = userResult.rows[0];

            // Update subscription status
            await this.dbPoolManager.executeWrite(
                `UPDATE users SET
                 subscription_status = 'active',
                 subscription_end_date = $1,
                 updated_at = NOW()
                 WHERE id = $2`,
                [
                    new Date(invoice.period_end * 1000), // Convert timestamp
                    user.id
                ]
            );

            console.log(`✅ Payment processed for user ${user.id}`);
        } catch (error) {
            console.error('❌ Error processing payment:', error);
        }
    }

    /**
     * Handle subscription created
     */
    async handleSubscriptionCreated(subscription) {
        console.log('📅 Subscription created:', subscription.id);

        if (!this.dbPoolManager) return;

        try {
            const customerId = subscription.customer;

            await this.dbPoolManager.executeWrite(
                `UPDATE users SET
                 stripe_subscription_id = $1,
                 subscription_status = 'active',
                 subscription_start_date = $2,
                 subscription_end_date = $3,
                 updated_at = NOW()
                 WHERE stripe_customer_id = $4`,
                [
                    subscription.id,
                    new Date(subscription.current_period_start * 1000),
                    new Date(subscription.current_period_end * 1000),
                    customerId
                ]
            );

            console.log(`✅ Subscription ${subscription.id} activated for customer ${customerId}`);
        } catch (error) {
            console.error('❌ Error creating subscription:', error);
        }
    }

    /**
     * Handle subscription updated
     */
    async handleSubscriptionUpdated(subscription) {
        console.log('🔄 Subscription updated:', subscription.id);

        if (!this.dbPoolManager) return;

        try {
            const status = this.mapStripeStatus(subscription.status);

            await this.dbPoolManager.executeWrite(
                `UPDATE users SET
                 subscription_status = $1,
                 subscription_end_date = $2,
                 updated_at = NOW()
                 WHERE stripe_subscription_id = $3`,
                [
                    status,
                    new Date(subscription.current_period_end * 1000),
                    subscription.id
                ]
            );

            console.log(`✅ Subscription ${subscription.id} updated to ${status}`);
        } catch (error) {
            console.error('❌ Error updating subscription:', error);
        }
    }

    /**
     * Handle subscription deleted/cancelled
     */
    async handleSubscriptionDeleted(subscription) {
        console.log('❌ Subscription deleted:', subscription.id);

        if (!this.dbPoolManager) return;

        try {
            await this.dbPoolManager.executeWrite(
                `UPDATE users SET
                 subscription_status = 'cancelled',
                 plan_type = 'TRIAL',
                 stripe_subscription_id = NULL,
                 updated_at = NOW()
                 WHERE stripe_subscription_id = $1`,
                [subscription.id]
            );

            console.log(`✅ Subscription ${subscription.id} cancelled`);
        } catch (error) {
            console.error('❌ Error cancelling subscription:', error);
        }
    }

    /**
     * Map Stripe subscription status to our system
     */
    mapStripeStatus(stripeStatus) {
        switch (stripeStatus) {
            case 'active':
                return 'active';
            case 'past_due':
                return 'past_due';
            case 'canceled':
            case 'cancelled':
                return 'cancelled';
            case 'unpaid':
                return 'unpaid';
            default:
                return 'inactive';
        }
    }

    /**
     * Create plan-specific trading configurations
     */
    async createPlanTradingConfig(userId, planCode) {
        try {
            // Define plan-specific trading configurations
            const planConfigs = {
                'PRO': {
                    max_leverage: 10,
                    max_positions: 5,
                    max_daily_loss: 500.00,
                    min_balance_required: 50.00,
                    stop_loss_percentage: 3.0,
                    take_profit_percentage: 5.0,
                    cooldown_minutes: 2
                },
                'FLEX': {
                    max_leverage: 5,
                    max_positions: 3,
                    max_daily_loss: 200.00,
                    min_balance_required: 30.00,
                    stop_loss_percentage: 2.5,
                    take_profit_percentage: 4.0,
                    cooldown_minutes: 3
                },
                'TRIAL': {
                    max_leverage: 2,
                    max_positions: 1,
                    max_daily_loss: 50.00,
                    min_balance_required: 0.00,
                    stop_loss_percentage: 2.0,
                    take_profit_percentage: 3.0,
                    cooldown_minutes: 5
                }
            };

            const config = planConfigs[planCode] || planConfigs['TRIAL'];

            // Create/update user_trading_configs
            await this.dbPoolManager.executeWrite(
                `INSERT INTO user_trading_configs (
                    user_id, plan_type, max_leverage, max_positions,
                    max_daily_loss, min_balance_required,
                    stop_loss_percentage, take_profit_percentage,
                    cooldown_minutes, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (user_id) DO UPDATE SET
                    plan_type = $2,
                    max_leverage = $3,
                    max_positions = $4,
                    max_daily_loss = $5,
                    min_balance_required = $6,
                    stop_loss_percentage = $7,
                    take_profit_percentage = $8,
                    cooldown_minutes = $9,
                    is_active = $10,
                    updated_at = NOW()`,
                [
                    userId,
                    planCode,
                    config.max_leverage,
                    config.max_positions,
                    config.max_daily_loss,
                    config.min_balance_required,
                    config.stop_loss_percentage,
                    config.take_profit_percentage,
                    config.cooldown_minutes,
                    true
                ]
            );

            // Update user trading settings in consolidated users table
            await this.dbPoolManager.executeWrite(
                `UPDATE users SET
                    max_leverage = $2,
                    take_profit_percentage = $3,
                    stop_loss_percentage = $4,
                    position_size_percentage = $5,
                    risk_level = $6,
                    auto_trade_enabled = $7,
                    daily_loss_limit_percentage = $8,
                    max_open_positions = $9,
                    default_leverage = $10,
                    stop_loss_multiplier = $11,
                    take_profit_multiplier = $12,
                    updated_at = NOW()
                WHERE id = $1`,
                [
                    userId,
                    config.max_leverage,
                    config.take_profit_percentage,
                    config.stop_loss_percentage,
                    30, // position_size_percentage
                    'MEDIUM', // risk_level
                    true, // auto_trade_enabled
                    config.max_daily_loss / 10, // daily_loss_limit_percentage (convert to %)
                    config.max_positions,
                    config.max_leverage,
                    2.00, // stop_loss_multiplier
                    3.00  // take_profit_multiplier
                ]
            );

            console.log(`✅ Trading config created for user ${userId} with plan ${planCode}`);
        } catch (error) {
            console.error(`❌ Error creating trading config for user ${userId}:`, error);
        }
    }

    /**
     * Test webhook endpoint
     */
    async testWebhook(req, res) {
        res.json({
            message: 'Stripe webhooks endpoint is working',
            timestamp: new Date().toISOString(),
            dbConnected: !!this.dbPoolManager
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new StripeWebhooksRoutes();