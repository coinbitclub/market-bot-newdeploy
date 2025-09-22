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
        // All routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // Stripe payment routes
        this.router.post('/checkout', this.createCheckoutSession.bind(this));
        this.router.post('/payment-intent', this.createPaymentIntent.bind(this));
        this.router.get('/payment-methods', this.getPaymentMethods.bind(this));
        this.router.post('/setup-intent', this.createSetupIntent.bind(this));
        
        // Stripe webhook (no authentication required)
        this.router.post('/webhook', 
            express.raw({ type: 'application/json' }), 
            this.handleWebhook.bind(this)
        );
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
                amount
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
        try {
            const sig = req.headers['stripe-signature'];
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

            if (!endpointSecret) {
                console.error('❌ Stripe webhook secret not configured');
                return res.status(500).json({
                    success: false,
                    error: 'Webhook secret not configured'
                });
            }

            let event;
            try {
                event = this.stripeService.stripe.webhooks.constructEvent(
                    req.body,
                    sig,
                    endpointSecret
                );
            } catch (err) {
                console.error('❌ Webhook signature verification failed:', err.message);
                return res.status(400).json({
                    success: false,
                    error: `Webhook Error: ${err.message}`
                });
            }

            // Process the event
            await this.stripeService.processWebhook(event);

            console.log(`✅ Webhook processed successfully: ${event.type}`);
            res.json({
                success: true,
                message: 'Webhook processed successfully'
            });

        } catch (error) {
            console.error('❌ Error processing webhook:', error);
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
