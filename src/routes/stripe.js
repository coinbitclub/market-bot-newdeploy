/**
 * 💳 STRIPE ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * Stripe payment integration routes
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');
const StripeUnifiedService = require('../services/financial/stripe-unified.service');

class StripeRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.stripeService = new StripeUnifiedService();
        this.setupRoutes();
    }

    /**
     * Set database pool manager for Stripe service
     */
    setDbPoolManager(dbPoolManager) {
        this.authMiddleware.setDbPoolManager(dbPoolManager);
        this.stripeService.setDbPoolManager(dbPoolManager);
    }

    setupRoutes() {
        // Stripe webhook (no authentication required) - Raw body handled at server level
        this.router.post('/webhook', this.handleWebhook.bind(this));

        // Success callback endpoint for frontend (no authentication required)
        this.router.get('/success/:sessionId', this.handleSuccessCallback.bind(this));

        // Test webhook endpoint (no authentication required)
        this.router.get('/test', this.testWebhook.bind(this));
        this.router.get('/webhook-config', this.getWebhookConfig.bind(this));
        this.router.post('/ensure-schema', this.ensureDatabaseSchema.bind(this));

        // All other routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // Test webhook processing (requires authentication)
        this.router.post('/test-webhook', this.testWebhookProcessing.bind(this));
        this.router.post('/test-invoice-payment', this.testInvoicePaymentWebhook.bind(this));

        // Stripe payment routes
        this.router.get('/status', this.getStripeStatus.bind(this));
        this.router.get('/pricing', this.getUserPricing.bind(this));
        this.router.get('/payment-methods', this.getAvailablePaymentMethods.bind(this));
        this.router.get('/transactions', this.getStripeTransactions.bind(this));
        this.router.post('/update-exchange-rates', this.updateExchangeRates.bind(this));
        this.router.post('/checkout', this.createCheckoutSession.bind(this));
        this.router.post('/payment-intent', this.createPaymentIntent.bind(this));
        this.router.post('/setup-intent', this.createSetupIntent.bind(this));
    }

    /**
     * GET /status - Get Stripe integration status
     */
    async getStripeStatus(req, res) {
        try {
            const status = {
                success: true,
                status: 'active',
                stripe: {
                    configured: !!process.env.STRIPE_SECRET_KEY,
                    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
                    testMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || false
                },
                timestamp: new Date().toISOString()
            };

            res.json(status);
        } catch (error) {
            console.error('❌ Stripe status error:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao obter status do Stripe',
                code: 'STRIPE_STATUS_ERROR'
            });
        }
    }

    /**
     * GET /pricing - Get user's pricing information based on location
     */
    async getUserPricing(req, res) {
        try {
            const userId = req.user.id;
            const pricingInfo = await this.stripeService.getUserPricingInfo(userId);

            res.json({
                success: true,
                pricing: pricingInfo,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error getting user pricing:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get pricing information'
            });
        }
    }

    /**
     * POST /update-exchange-rates - Update exchange rates and recalculate pricing
     */
    async updateExchangeRates(req, res) {
        try {
            const updated = await this.stripeService.updateExchangeRates();
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Exchange rates updated successfully',
                    exchangeRates: this.stripeService.exchangeRates,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to update exchange rates'
                });
            }
        } catch (error) {
            console.error('❌ Error updating exchange rates:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update exchange rates'
            });
        }
    }

    /**
     * GET /payment-methods - Get available payment methods for user's currency
     */
    async getAvailablePaymentMethods(req, res) {
        try {
            const userId = req.user.id;
            const userPlan = await this.stripeService.getUserCurrencyAndPricing(userId);
            const paymentMethods = this.stripeService.getAvailablePaymentMethods(userPlan.currency);

            res.json({
                success: true,
                currency: userPlan.currency,
                paymentMethods: paymentMethods,
                note: userPlan.currency === 'brl' ? 
                    'Boleto will be available once enabled in Stripe dashboard' : 
                    'Card payments available',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error getting payment methods:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get payment methods'
            });
        }
    }

    /**
     * POST /checkout - Create Stripe checkout session
     */
    async createCheckoutSession(req, res) {
        try {
            const userId = req.user.id;
            const { planType, country, amount, currency } = req.body;

            // Validate required fields
            if (!planType || !country) {
                return res.status(400).json({
                    success: false,
                    error: 'planType and country are required'
                });
            }

            // Create checkout session
            const session = await this.stripeService.createCheckoutSession(
                userId,
                planType,
                country,
                amount,
                planType // Use planType as planCode for now
            );

            res.json({
                success: true,
                sessionId: session.id,
                url: session.url,
                message: 'Checkout session created successfully'
            });

        } catch (error) {
            console.error('❌ Error creating checkout session:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /payment-intent - Create Stripe payment intent
     */
    async createPaymentIntent(req, res) {
        try {
            const userId = req.user.id;
            const { amount, currency, description } = req.body;

            // Validate required fields
            if (!amount || !currency) {
                return res.status(400).json({
                    success: false,
                    error: 'amount and currency are required'
                });
            }

            const paymentIntent = await this.stripeService.createPaymentIntent(
                userId,
                amount,
                currency,
                description
            );

            res.json({
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                message: 'Payment intent created successfully'
            });

        } catch (error) {
            console.error('❌ Error creating payment intent:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /payment-methods - Get user's saved payment methods
     */
    async getPaymentMethods(req, res) {
        try {
            const userId = req.user.id;

            const paymentMethods = await this.stripeService.getPaymentMethods(userId);

            res.json({
                success: true,
                paymentMethods,
                message: 'Payment methods retrieved successfully'
            });

        } catch (error) {
            console.error('❌ Error getting payment methods:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /setup-intent - Create setup intent for saving payment methods
     */
    async createSetupIntent(req, res) {
        try {
            const userId = req.user.id;

            const setupIntent = await this.stripeService.createSetupIntent(userId);

            res.json({
                success: true,
                clientSecret: setupIntent.client_secret,
                setupIntentId: setupIntent.id,
                message: 'Setup intent created successfully'
            });

        } catch (error) {
            console.error('❌ Error creating setup intent:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /webhook - Handle Stripe webhooks
     */
    async handleWebhook(req, res) {
            const sig = req.headers['stripe-signature'];
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        console.log('📥 Stripe webhook received:', {
            hasSignature: !!sig,
            hasSecret: !!endpointSecret,
            bodyType: typeof req.body,
            bodyLength: req.body ? req.body.length : 0,
            contentType: req.headers['content-type'],
            isBuffer: Buffer.isBuffer(req.body),
            isString: typeof req.body === 'string'
        });

        let event;

        try {
            // Verify webhook signature
            if (endpointSecret) {
                // Ensure we have the raw body for signature verification
                if (!req.body) {
                    throw new Error('No request body received');
                }
                
                // Handle different body types
                let rawBody;
                if (Buffer.isBuffer(req.body)) {
                    // Raw body as buffer - perfect for signature verification
                    rawBody = req.body;
                } else if (typeof req.body === 'string') {
                    // Raw body as string - convert to buffer
                    rawBody = Buffer.from(req.body, 'utf8');
                } else if (typeof req.body === 'object') {
                    // Body was parsed as JSON - reconstruct raw body
                    rawBody = Buffer.from(JSON.stringify(req.body), 'utf8');
                    console.warn('⚠️ Body was parsed as JSON, reconstructing for signature verification');
                } else {
                    throw new Error(`Unsupported body type: ${typeof req.body}`);
                }
                
                try {
                    event = this.stripeService.stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
                    console.log('✅ Webhook signature verified successfully');
                } catch (signatureError) {
                    console.error('❌ Signature verification failed, trying to parse as JSON for development:', {
                        signatureError: signatureError.message,
                        webhookSecret: endpointSecret ? endpointSecret.substring(0, 10) + '...' : 'none',
                        signature: sig ? sig.substring(0, 20) + '...' : 'none',
                        bodyLength: rawBody.length
                    });
                    
                    // Fallback: Try to parse as JSON for development/testing
                    try {
                        const bodyString = rawBody.toString('utf8');
                        event = JSON.parse(bodyString);
                        console.warn('⚠️ Using fallback JSON parsing - webhook secret may be incorrect');
                    } catch (parseError) {
                        throw signatureError; // Re-throw original signature error
                    }
                }
            } else {
                // For development without webhook secret
                if (typeof req.body === 'string') {
                    event = JSON.parse(req.body);
                } else if (typeof req.body === 'object') {
                    event = req.body;
                } else {
                    throw new Error(`Cannot parse body type: ${typeof req.body}`);
                }
                console.warn('⚠️ Webhook signature verification skipped (no STRIPE_WEBHOOK_SECRET)');
            }
        } catch (err) {
            console.error('❌ Webhook signature verification failed:', {
                error: err.message,
                hasBody: !!req.body,
                bodyType: typeof req.body,
                isBuffer: Buffer.isBuffer(req.body),
                signature: sig ? sig.substring(0, 20) + '...' : 'none',
                webhookSecret: endpointSecret ? 'configured' : 'missing'
            });
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        console.log('📥 Processing Stripe webhook event:', event.type, event.id);

        try {
            // Store webhook event information for tracking
            this.currentWebhookEvent = {
                id: event.id,
                type: event.type,
                created: event.created
            };

            // Handle the event
            switch (event.type) {
                case 'checkout.session.completed':
                    console.log('🛒 Processing checkout.session.completed');
                    await this.handleCheckoutCompleted(event.data.object);
                    break;

                case 'invoice.payment_succeeded':
                    console.log('💰 Processing invoice.payment_succeeded');
                    await this.handleInvoicePaymentSucceeded(event.data.object);
                    break;

                case 'customer.subscription.created':
                    console.log('📅 Processing customer.subscription.created');
                    await this.handleSubscriptionCreated(event.data.object);
                    break;

                case 'customer.subscription.updated':
                    console.log('🔄 Processing customer.subscription.updated');
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;

                case 'customer.subscription.deleted':
                    console.log('❌ Processing customer.subscription.deleted');
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;

                default:
                    console.log(`📋 Unhandled event type: ${event.type}`);
            }

            console.log(`✅ Webhook event ${event.type} processed successfully`);
            res.json({ received: true, eventType: event.type });
        } catch (error) {
            console.error('❌ Error processing webhook:', {
                eventType: event.type,
                eventId: event.id,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({ 
                error: 'Webhook processing failed',
                eventType: event.type,
                eventId: event.id
            });
        }
    }

    /**
     * Handle checkout session completed
     */
    async handleCheckoutCompleted(session) {
        console.log('✅ Checkout completed:', {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            amount: session.amount_total,
            currency: session.currency,
            metadata: session.metadata
        });

        if (!this.authMiddleware.dbPoolManager) {
            console.error('❌ Database not available for webhook processing');
            return;
        }

        try {
            const userId = session.metadata?.userId;
            const planCode = session.metadata?.planCode;
            const planType = session.metadata?.planType;

            if (!userId) {
                console.error('❌ Missing userId in checkout session metadata:', session.metadata);
                return;
            }

            // If no planCode, try to determine from planType or use a default
            const finalPlanCode = planCode || planType || 'PRO';

            console.log(`🔄 Processing payment for user ${userId}, plan: ${finalPlanCode}, amount: ${session.amount_total / 100} ${session.currency}`);
            console.log(`🔧 [handleCheckoutCompleted] Session details:`, {
                sessionId: session.id,
                userId: userId,
                planCode: finalPlanCode,
                amount: session.amount_total,
                currency: session.currency,
                paymentStatus: session.payment_status,
                metadata: session.metadata
            });

            // Ensure database schema is ready BEFORE starting transaction
            console.log(`🔧 [handleCheckoutCompleted] Ensuring database schema...`);
            await this.ensureStripeColumnsExist();
            await this.ensureStripeTransactionsTableExists();
            await this.ensureUserTradingConfigTableExists();
            console.log(`✅ [handleCheckoutCompleted] Database schema ensured`);

            // Start database transaction
            console.log('🔄 Starting database transaction...');
            await this.authMiddleware.dbPoolManager.executeWrite('BEGIN');

            try {
                // Update user plan status - fix parameter types
                const userPlanUpdateValues = [
                    finalPlanCode,
                    session.customer,
                    session.subscription || null,
                    parseInt(userId)
                ];
                
                console.log(`🔧 [handleCheckoutCompleted] Updating user plan with values:`, userPlanUpdateValues);
                console.log(`🔧 [handleCheckoutCompleted] Session customer: ${session.customer}, subscription: ${session.subscription}`);
                
                const updateResult = await this.authMiddleware.dbPoolManager.executeWrite(
                    `UPDATE users SET
                     plan_type = $1::varchar,
                     subscription_status = 'active',
                     subscription_start_date = NOW(),
                     subscription_end_date = CASE 
                         WHEN $1::varchar = 'PRO' THEN NOW() + INTERVAL '1 month'
                         WHEN $1::varchar = 'FLEX' THEN NOW() + INTERVAL '1 month'
                         ELSE NOW() + INTERVAL '30 days'
                     END,
                     trading_enabled = true,
                     stripe_customer_id = $2::varchar,
                     stripe_subscription_id = $3::varchar,
                     updated_at = NOW()
                     WHERE id = $4::integer`,
                    userPlanUpdateValues
                );

                console.log(`✅ [handleCheckoutCompleted] User plan update result:`, updateResult);
                console.log(`✅ User ${userId} plan updated to ${finalPlanCode}`);

                // Create Stripe transaction record using helper method
                console.log('📊 Creating Stripe transaction record...');
                const transactionResult = await this.createStripeTransaction({
                    userId,
                    stripeCustomerId: session.customer,
                    transactionType: 'checkout_session',
                    amount: session.amount_total, // Keep in cents (Stripe format)
                    currency: session.currency,
                    status: 'completed',
                    stripePaymentIntentId: session.payment_intent,
                    stripeSessionId: session.id,
                    stripeSubscriptionId: session.subscription || null,
                    planCode: finalPlanCode,
                    planType: planType || 'monthly',
                    description: `Plan subscription: ${finalPlanCode}`,
                    metadata: {
                        planCode: finalPlanCode,
                        planType,
                        sessionId: session.id,
                        customerId: session.customer,
                        subscriptionId: session.subscription,
                        amount: session.amount_total / 100,
                        paymentStatus: session.payment_status,
                        webhookEventType: 'checkout.session.completed'
                    },
                    stripeCreatedAt: new Date(session.created * 1000) // Convert Stripe timestamp
                });

                console.log(`✅ Transaction record created for user ${userId}`);

                // Create/update plan-specific trading configurations
                console.log('⚙️ Creating trading configurations...');
                await this.createPlanTradingConfig(userId, finalPlanCode);

                // Commit transaction
                console.log('✅ Committing database transaction...');
                await this.authMiddleware.dbPoolManager.executeWrite('COMMIT');

                console.log(`✅ User ${userId} plan updated to ${finalPlanCode} with trading configurations - TRANSACTION COMMITTED`);
            } catch (dbError) {
                // Rollback transaction on error
                console.error('❌ Database transaction failed, rolling back...', dbError);
                await this.authMiddleware.dbPoolManager.executeWrite('ROLLBACK');
                console.error('❌ Database transaction rolled back');
                throw dbError;
            }
        } catch (error) {
            console.error('❌ Error updating user plan:', {
                error: error.message,
                stack: error.stack,
                sessionId: session.id,
                userId: session.metadata?.userId
            });
            throw error; // Re-throw to be handled by webhook handler
        }
    }

    /**
     * Handle invoice payment succeeded
     */
    async handleInvoicePaymentSucceeded(invoicePayment) {
        console.log('💰 Invoice payment succeeded:', {
            id: invoicePayment.id,
            amount: invoicePayment.amount_paid,
            currency: invoicePayment.currency,
            status: invoicePayment.status,
            invoice: invoicePayment.invoice
        });

        if (!this.authMiddleware.dbPoolManager) {
            console.error('❌ Database not available for webhook processing');
            return;
        }

        try {
            // For invoice payments, we need to get the invoice details to find the customer
            const stripe = this.stripeService.stripe;
            
            if (!invoicePayment.invoice) {
                console.error('❌ No invoice ID found in invoice payment:', invoicePayment);
                return;
            }
            
            const invoice = await stripe.invoices.retrieve(invoicePayment.invoice);
            
            console.log('📄 Invoice details:', {
                id: invoice.id,
                customer: invoice.customer,
                subscription: invoice.subscription,
                amount_paid: invoice.amount_paid,
                status: invoice.status
            });

            const customerId = invoice.customer;
            const subscriptionId = invoice.subscription;

            if (!customerId) {
                console.error('❌ No customer ID found in invoice');
                return;
            }

            // Find user by customer ID
            const userResult = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT id, plan_type FROM users WHERE stripe_customer_id = $1',
                [customerId]
            );

            if (userResult.rows.length === 0) {
                console.error('❌ User not found for customer:', customerId);
                return;
            }

            const user = userResult.rows[0];

            // Update subscription status
            await this.authMiddleware.dbPoolManager.executeWrite(
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

            // Create Stripe transaction record for invoice payment using helper method
            await this.createStripeTransaction({
                userId: user.id,
                stripeCustomerId: customerId,
                transactionType: 'invoice_payment',
                amount: invoicePayment.amount_paid, // Keep in cents (Stripe format)
                currency: invoicePayment.currency,
                status: 'completed',
                stripePaymentIntentId: invoicePayment.payment?.payment_intent || null,
                stripeInvoiceId: invoice.id,
                stripeSubscriptionId: subscriptionId,
                planCode: user.plan_type || 'PRO', // Use current plan or default
                planType: 'monthly', // Default plan type
                description: `Invoice payment: ${invoicePayment.id}`,
                metadata: {
                    invoicePaymentId: invoicePayment.id,
                    invoiceId: invoice.id,
                    customerId: customerId,
                    subscriptionId: subscriptionId,
                    amount: invoicePayment.amount_paid / 100,
                    status: invoicePayment.status,
                    webhookEventType: 'invoice.payment_succeeded',
                    paymentMethod: invoicePayment.payment?.type || 'unknown'
                },
                stripeCreatedAt: new Date(invoicePayment.created * 1000) // Convert Stripe timestamp
            });

            console.log(`✅ Invoice payment processed for user ${user.id}`);
        } catch (error) {
            console.error('❌ Error processing invoice payment:', error);
        }
    }

    /**
     * Handle payment succeeded (legacy method)
     */
    async handlePaymentSucceeded(invoice) {
        console.log('💰 Payment succeeded:', invoice.id);

        if (!this.authMiddleware.dbPoolManager) return;

        try {
            const customerId = invoice.customer;
            const subscriptionId = invoice.subscription;

            // Find user by customer ID
            const userResult = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT id, plan_type FROM users WHERE stripe_customer_id = $1',
                [customerId]
            );

            if (userResult.rows.length === 0) {
                console.error('❌ User not found for customer:', customerId);
                return;
            }

            const user = userResult.rows[0];

            // Update subscription status
            await this.authMiddleware.dbPoolManager.executeWrite(
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

        if (!this.authMiddleware.dbPoolManager) return;

        try {
            const customerId = subscription.customer;

            // Check if stripe_customer_id column exists, if not, skip this update
            try {
                await this.authMiddleware.dbPoolManager.executeWrite(
                    `UPDATE users SET
                     stripe_subscription_id = $1::varchar,
                     subscription_status = 'active',
                     subscription_start_date = $2,
                     subscription_end_date = $3,
                     updated_at = NOW()
                     WHERE stripe_customer_id = $4::varchar`,
                    [
                        subscription.id,
                        new Date(subscription.current_period_start * 1000),
                        new Date(subscription.current_period_end * 1000),
                        customerId
                    ]
                );
            } catch (columnError) {
                if (columnError.message.includes('stripe_customer_id')) {
                    console.warn('⚠️ stripe_customer_id column not found, skipping subscription update');
                    return;
                }
                throw columnError;
            }

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

        if (!this.authMiddleware.dbPoolManager) return;

        try {
            const status = this.mapStripeStatus(subscription.status);

            await this.authMiddleware.dbPoolManager.executeWrite(
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

        if (!this.authMiddleware.dbPoolManager) return;

        try {
            await this.authMiddleware.dbPoolManager.executeWrite(
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
            console.log(`🔧 [createPlanTradingConfig] Starting for userId: ${userId}, planCode: ${planCode}`);
            
            // Define plan-specific trading configurations
            const planConfigs = {
                'PRO': {
                    position_size_percentage: 2.0,
                    stop_loss_multiplier: 3.0,
                    take_profit_multiplier: 5.0,
                    daily_loss_limit_percentage: 5.0,
                    auto_trade_enabled: true,
                    auto_stop_loss: true,
                    auto_take_profit: true
                },
                'FLEX': {
                    position_size_percentage: 1.5,
                    stop_loss_multiplier: 2.5,
                    take_profit_multiplier: 4.0,
                    daily_loss_limit_percentage: 3.0,
                    auto_trade_enabled: true,
                    auto_stop_loss: true,
                    auto_take_profit: false
                },
                'TRIAL': {
                    position_size_percentage: 1.0,
                    stop_loss_multiplier: 2.0,
                    take_profit_multiplier: 3.0,
                    daily_loss_limit_percentage: 2.0,
                    auto_trade_enabled: false,
                    auto_stop_loss: false,
                    auto_take_profit: false
                }
            };

            const config = planConfigs[planCode] || planConfigs['TRIAL'];
            console.log(`🔧 [createPlanTradingConfig] Selected config for ${planCode}:`, JSON.stringify(config, null, 2));

            // Create/update user_trading_config
            const userTradingConfigValues = [
                userId,
                config.position_size_percentage || 1.0,
                config.stop_loss_multiplier || 2.0,
                config.take_profit_multiplier || 3.0,
                config.daily_loss_limit_percentage || 5.0,
                config.auto_trade_enabled || false,
                config.auto_stop_loss || false,
                config.auto_take_profit || false
            ];
            
            console.log(`🔧 [createPlanTradingConfig] user_trading_config values:`, userTradingConfigValues);
            console.log(`🔧 [createPlanTradingConfig] Inserting into user_trading_config table...`);
            
            await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO user_trading_config (
                    user_id, position_size_percentage, stop_loss_multiplier, 
                    take_profit_multiplier, daily_loss_limit_percentage,
                    auto_trade_enabled, auto_stop_loss, auto_take_profit
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (user_id) DO UPDATE SET
                    position_size_percentage = $2,
                    stop_loss_multiplier = $3,
                    take_profit_multiplier = $4,
                    daily_loss_limit_percentage = $5,
                    auto_trade_enabled = $6,
                    auto_stop_loss = $7,
                    auto_take_profit = $8,
                    updated_at = NOW()`,
                userTradingConfigValues
            );
            
            console.log(`✅ [createPlanTradingConfig] user_trading_config insert successful`);

            // Update user trading settings in consolidated users table
            const usersTableValues = [
                userId,
                'MEDIUM' // risk_level
            ];
            
            console.log(`🔧 [createPlanTradingConfig] users table values:`, usersTableValues);
            console.log(`🔧 [createPlanTradingConfig] Updating users table...`);
            
            await this.authMiddleware.dbPoolManager.executeWrite(
                `UPDATE users SET
                    risk_level = $2,
                    updated_at = NOW()
                WHERE id = $1`,
                usersTableValues
            );
            
            console.log(`✅ [createPlanTradingConfig] users table update successful`);

            console.log(`✅ Trading config created for user ${userId} with plan ${planCode}`);
        } catch (error) {
            console.error(`❌ Error creating trading config for user ${userId}:`, error);
        }
    }

    /**
     * Handle success callback from frontend
     */
    async handleSuccessCallback(req, res) {
        try {
            const { sessionId } = req.params;
            
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Session ID is required'
                });
            }

            // Retrieve the session from Stripe to verify payment status
            const session = await this.stripeService.stripe.checkout.sessions.retrieve(sessionId);

            if (session.payment_status === 'paid') {
                // Payment was successful, trigger the same logic as webhook
                await this.handleCheckoutCompleted(session);
                
                res.json({
                    success: true,
                    message: 'Payment processed successfully',
                    sessionId: sessionId,
                    planCode: session.metadata?.planCode || session.metadata?.planType
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Payment not completed',
                    paymentStatus: session.payment_status
                });
            }
        } catch (error) {
            console.error('❌ Error handling success callback:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process payment confirmation'
            });
        }
    }

    /**
     * Helper method to create Stripe transaction record
     */
    async createStripeTransaction(transactionData) {
        if (!this.authMiddleware.dbPoolManager) {
            throw new Error('Database not available');
        }

        const {
            userId,
            stripeCustomerId,
            transactionType,
            amount,
            currency = 'USD',
            status = 'completed',
            stripePaymentIntentId = null,
            stripeSessionId = null,
            stripeInvoiceId = null,
            stripeSubscriptionId = null,
            planCode = null,
            planType = 'monthly',
            description = null,
            metadata = {},
            stripeCreatedAt = new Date()
        } = transactionData;

        try {
            const result = await this.authMiddleware.dbPoolManager.executeWrite(
                `INSERT INTO stripe_transactions (
                    user_id, stripe_customer_id, transaction_type, amount, currency, status,
                    stripe_payment_intent_id, stripe_session_id, stripe_invoice_id, stripe_subscription_id,
                    plan_code, plan_type, description, metadata, stripe_created_at,
                    webhook_event_id, webhook_event_type
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
                [
                    userId,
                    stripeCustomerId,
                    transactionType,
                    amount,
                    currency.toUpperCase(),
                    status,
                    stripePaymentIntentId,
                    stripeSessionId,
                    stripeInvoiceId,
                    stripeSubscriptionId,
                    planCode,
                    planType,
                    description,
                    JSON.stringify(metadata),
                    stripeCreatedAt,
                    this.currentWebhookEvent?.id || null,
                    this.currentWebhookEvent?.type || transactionType
                ]
            );

            return result;
        } catch (error) {
            // Log the error but don't try to create table inside transaction
            console.error('❌ Error inserting into stripe_transactions:', error);
            throw error;
        }
    }

    /**
     * Ensure users table has required Stripe columns
     */
    async ensureStripeColumnsExist() {
        try {
            // Check and add missing Stripe-related columns to users table
            const alterTableSQL = `
                -- Add stripe_customer_id column if it doesn't exist
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name = 'users' AND column_name = 'stripe_customer_id') THEN
                        ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);
                        CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
                    END IF;
                END $$;

                -- Add stripe_subscription_id column if it doesn't exist
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name = 'users' AND column_name = 'stripe_subscription_id') THEN
                        ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255);
                        CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);
                    END IF;
                END $$;

                -- Add subscription_status column if it doesn't exist
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name = 'users' AND column_name = 'subscription_status') THEN
                        ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'inactive';
                        CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
                    END IF;
                END $$;

                -- Add subscription_start_date column if it doesn't exist
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name = 'users' AND column_name = 'subscription_start_date') THEN
                        ALTER TABLE users ADD COLUMN subscription_start_date TIMESTAMP;
                    END IF;
                END $$;

                -- Add subscription_end_date column if it doesn't exist
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name = 'users' AND column_name = 'subscription_end_date') THEN
                        ALTER TABLE users ADD COLUMN subscription_end_date TIMESTAMP;
                    END IF;
                END $$;

                -- Add trading_enabled column if it doesn't exist
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name = 'users' AND column_name = 'trading_enabled') THEN
                        ALTER TABLE users ADD COLUMN trading_enabled BOOLEAN DEFAULT false;
                    END IF;
                END $$;
            `;

            await this.authMiddleware.dbPoolManager.executeWrite(alterTableSQL);
            console.log('✅ Stripe columns ensured in users table');
        } catch (error) {
            console.error('❌ Error ensuring Stripe columns:', error);
        }
    }

    /**
     * Ensure stripe_transactions table exists (outside transaction)
     */
    async ensureStripeTransactionsTableExists() {
        try {
            // Check if table exists first
            const checkTableSQL = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'stripe_transactions'
                );
            `;
            
            const result = await this.authMiddleware.dbPoolManager.executeRead(checkTableSQL);
            const tableExists = result.rows[0].exists;
            
            if (!tableExists) {
                console.log('📊 stripe_transactions table does not exist, creating...');
                await this.createStripeTransactionsTable();
            } else {
                console.log('✅ stripe_transactions table already exists');
            }
        } catch (error) {
            console.error('❌ Error checking/creating stripe_transactions table:', error);
            // Don't throw - let the transaction continue
        }
    }

    /**
     * Ensure user_trading_config table exists (outside transaction)
     */
    async ensureUserTradingConfigTableExists() {
        try {
            // Check if table exists first
            const checkTableSQL = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_trading_config'
                );
            `;
            
            const result = await this.authMiddleware.dbPoolManager.executeRead(checkTableSQL);
            const tableExists = result.rows[0].exists;
            
            if (!tableExists) {
                console.log('⚙️ user_trading_config table does not exist, creating...');
                await this.createUserTradingConfigTable();
            } else {
                console.log('✅ user_trading_config table already exists');
            }
        } catch (error) {
            console.error('❌ Error checking/creating user_trading_config table:', error);
            // Don't throw - let the transaction continue
        }
    }

    /**
     * Create user_trading_config table if it doesn't exist
     */
    async createUserTradingConfigTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS user_trading_config (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                position_size_percentage DECIMAL(5,2) DEFAULT 1.0,
                stop_loss_multiplier DECIMAL(5,2) DEFAULT 2.0,
                take_profit_multiplier DECIMAL(5,2) DEFAULT 3.0,
                daily_loss_limit_percentage DECIMAL(5,2) DEFAULT 5.0,
                auto_trade_enabled BOOLEAN DEFAULT false,
                auto_stop_loss BOOLEAN DEFAULT false,
                auto_take_profit BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            -- Create indexes for performance
            CREATE INDEX IF NOT EXISTS idx_user_trading_config_user_id ON user_trading_config(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_trading_config_auto_trade ON user_trading_config(auto_trade_enabled);
        `;

        await this.authMiddleware.dbPoolManager.executeWrite(createTableSQL);
        console.log('✅ user_trading_config table created successfully');
    }

    /**
     * Create stripe_transactions table if it doesn't exist
     */
    async createStripeTransactionsTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS stripe_transactions (
                id SERIAL PRIMARY KEY,
                
                -- User and Customer Information
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_customer_id VARCHAR(255),
                
                -- Transaction Details
                transaction_type VARCHAR(50) NOT NULL,
                amount INTEGER NOT NULL,
                currency VARCHAR(3) NOT NULL DEFAULT 'USD',
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                
                -- Stripe Identifiers
                stripe_payment_intent_id VARCHAR(255),
                stripe_session_id VARCHAR(255),
                stripe_invoice_id VARCHAR(255),
                stripe_subscription_id VARCHAR(255),
                stripe_charge_id VARCHAR(255),
                
                -- Webhook Information
                webhook_event_id VARCHAR(255),
                webhook_event_type VARCHAR(100),
                
                -- Plan and Subscription Details
                plan_code VARCHAR(50),
                plan_type VARCHAR(50),
                subscription_period_start TIMESTAMP,
                subscription_period_end TIMESTAMP,
                
                -- Payment Method Information
                payment_method_type VARCHAR(50),
                payment_method_id VARCHAR(255),
                
                -- Description and Metadata
                description TEXT,
                metadata JSONB,
                
                -- Timestamps
                stripe_created_at TIMESTAMP,
                processed_at TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            -- Create indexes for performance
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_user_id ON stripe_transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_customer_id ON stripe_transactions(stripe_customer_id);
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_type ON stripe_transactions(transaction_type);
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_status ON stripe_transactions(status);
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_payment_intent ON stripe_transactions(stripe_payment_intent_id);
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_session_id ON stripe_transactions(stripe_session_id);
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_invoice_id ON stripe_transactions(stripe_invoice_id);
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_subscription_id ON stripe_transactions(stripe_subscription_id);
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_webhook_event ON stripe_transactions(webhook_event_id);
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_plan_code ON stripe_transactions(plan_code);
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_created_at ON stripe_transactions(created_at);
            CREATE INDEX IF NOT EXISTS idx_stripe_transactions_stripe_created_at ON stripe_transactions(stripe_created_at);
        `;

        await this.authMiddleware.dbPoolManager.executeWrite(createTableSQL);
        console.log('✅ stripe_transactions table created successfully');
    }

    /**
     * GET /transactions - Get user's Stripe transactions
     */
    async getStripeTransactions(req, res) {
        try {
            const userId = req.user.id;
            const { limit = 50, offset = 0, type = null, status = null } = req.query;

            let query = `
                SELECT 
                    id, transaction_type, amount, currency, status,
                    stripe_payment_intent_id, stripe_session_id, stripe_invoice_id, stripe_subscription_id,
                    plan_code, plan_type, description, metadata,
                    stripe_created_at, processed_at, created_at
                FROM stripe_transactions 
                WHERE user_id = $1
            `;
            
            const params = [userId];
            let paramCount = 1;

            if (type) {
                paramCount++;
                query += ` AND transaction_type = $${paramCount}`;
                params.push(type);
            }

            if (status) {
                paramCount++;
                query += ` AND status = $${paramCount}`;
                params.push(status);
            }

            query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
            params.push(parseInt(limit), parseInt(offset));

            const result = await this.authMiddleware.dbPoolManager.executeRead(query, params);

            // Convert amounts from cents to dollars for display
            const transactions = result.rows.map(row => ({
                ...row,
                amount_dollars: row.amount / 100,
                metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
            }));

            res.json({
                success: true,
                transactions,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: result.rows.length
                }
            });

        } catch (error) {
            console.error('❌ Error fetching Stripe transactions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch transactions'
            });
        }
    }

    /**
     * Test webhook endpoint
     */
    async testWebhook(req, res) {
        res.json({
            message: 'Stripe webhooks endpoint is working',
            timestamp: new Date().toISOString(),
            dbConnected: !!this.authMiddleware.dbPoolManager,
            webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
            stripeKey: !!process.env.STRIPE_SECRET_KEY,
            webhookSecretPreview: process.env.STRIPE_WEBHOOK_SECRET ? 
                process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...' : 'Not configured',
            stripeKeyPreview: process.env.STRIPE_SECRET_KEY ? 
                process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...' : 'Not configured'
        });
    }

    /**
     * POST /ensure-schema - Ensure database schema is ready for Stripe
     */
    async ensureDatabaseSchema(req, res) {
        try {
            if (!this.authMiddleware.dbPoolManager) {
                return res.status(500).json({
                    success: false,
                    error: 'Database not available'
                });
            }

            // Ensure Stripe columns exist in users table
            await this.ensureStripeColumnsExist();
            
            // Ensure stripe_transactions table exists
            await this.ensureStripeTransactionsTableExists();
            
            // Ensure user_trading_config table exists
            await this.ensureUserTradingConfigTableExists();

            res.json({
                success: true,
                message: 'Database schema ensured for Stripe integration',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error ensuring database schema:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to ensure database schema'
            });
        }
    }

    /**
     * GET /webhook-config - Get webhook configuration for debugging
     */
    async getWebhookConfig(req, res) {
        try {
            const config = {
                webhookSecret: {
                    configured: !!process.env.STRIPE_WEBHOOK_SECRET,
                    preview: process.env.STRIPE_WEBHOOK_SECRET ? 
                        process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...' : 'Not configured',
                    startsWith: process.env.STRIPE_WEBHOOK_SECRET ? 
                        process.env.STRIPE_WEBHOOK_SECRET.substring(0, 7) : 'N/A'
                },
                stripeKey: {
                    configured: !!process.env.STRIPE_SECRET_KEY,
                    preview: process.env.STRIPE_SECRET_KEY ? 
                        process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...' : 'Not configured',
                    startsWith: process.env.STRIPE_SECRET_KEY ? 
                        process.env.STRIPE_SECRET_KEY.substring(0, 7) : 'N/A'
                },
                environment: {
                    nodeEnv: process.env.NODE_ENV,
                    isTestMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || false
                },
                webhookEndpoint: {
                    url: `${req.protocol}://${req.get('host')}/api/stripe/webhook`,
                    method: 'POST'
                },
                troubleshooting: {
                    commonIssues: [
                        'Webhook secret mismatch - check Stripe dashboard',
                        'Webhook endpoint URL incorrect',
                        'Raw body not preserved - check middleware',
                        'Environment variables not loaded'
                    ],
                    nextSteps: [
                        '1. Verify webhook secret in Stripe dashboard matches environment',
                        '2. Check webhook endpoint URL in Stripe dashboard',
                        '3. Ensure raw body middleware is configured',
                        '4. Test with Stripe CLI: stripe listen --forward-to localhost:3001/api/stripe/webhook'
                    ]
                }
            };

            res.json({
                success: true,
                config,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error getting webhook config:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get webhook configuration'
            });
        }
    }

    /**
     * POST /test-webhook - Test webhook processing with mock data
     */
    async testWebhookProcessing(req, res) {
        try {
            const { userId, planCode = 'PRO', amount = 10000, currency = 'usd' } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    error: 'userId is required for testing'
                });
            }

            // Create mock session data
            const mockSession = {
                id: `cs_test_${Date.now()}`,
                payment_status: 'paid',
                amount_total: amount,
                currency: currency,
                customer: `cus_test_${Date.now()}`,
                subscription: null,
                payment_intent: `pi_test_${Date.now()}`,
                metadata: {
                    userId: userId.toString(),
                    planCode: planCode,
                    planType: 'monthly'
                }
            };

            console.log('🧪 Testing webhook processing with mock data:', mockSession);

            // Process the mock session
            await this.handleCheckoutCompleted(mockSession);

            res.json({
                success: true,
                message: 'Test webhook processing completed',
                mockSession: mockSession,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Test webhook processing failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /test-invoice-payment - Test invoice payment webhook with real data
     */
    async testInvoicePaymentWebhook(req, res) {
        try {
            // Use the exact data provided by the user
            const invoicePaymentData = {
                "id": "inpay_1SK8JGIsztOn5ceWSTWEMQKx",
                "object": "invoice_payment",
                "amount_paid": 100,
                "amount_requested": 100,
                "created": 1760925294,
                "currency": "usd",
                "invoice": "in_1SK8JGIsztOn5ceWl3uamV9q",
                "is_default": true,
                "livemode": false,
                "payment": {
                    "payment_intent": "pi_3SK8JGIsztOn5ceW0mb7XX7S",
                    "type": "payment_intent"
                },
                "status": "paid",
                "status_transitions": {
                    "canceled_at": null,
                    "paid_at": 1760925295
                }
            };

            console.log('🧪 Testing invoice payment webhook with real data:', invoicePaymentData);

            // Process the invoice payment
            await this.handleInvoicePaymentSucceeded(invoicePaymentData);

            res.json({
                success: true,
                message: 'Invoice payment webhook test completed',
                invoicePayment: invoicePaymentData,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Invoice payment webhook test failed:', error);
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

module.exports = new StripeRoutes();
