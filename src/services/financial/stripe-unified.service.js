/**
 * 💳 STRIPE UNIFIED SERVICE - ENTERPRISE MARKETBOT
 * Complete Stripe integration for payments, subscriptions, and webhooks
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeUnifiedService {
    constructor(dbPoolManager = null) {
        this.stripe = stripe;
        this.dbPoolManager = dbPoolManager;
        this.plans = {
            BR: { 
                monthly: 29700, 
                recharge_min: 15000, 
                currency: 'brl',
                price: 29700 // R$ 297.00 in cents
            },
            US: { 
                monthly: 5000, 
                recharge_min: 3000, 
                currency: 'usd',
                price: 5000 // $50.00 in cents
            }
        };
        this.commissionRates = {
            MONTHLY: 0.10,   // 10% sobre lucro
            PREPAID: 0.20    // 20% sobre lucro
        };
        
        console.log('🔥 Stripe Unified Service initialized with database integration');
    }

    /**
     * Set database pool manager
     */
    setDbPoolManager(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
        if (this.dbPoolManager) {
            const PaymentDatabaseService = require('../database/payment-database-service');
            this.paymentDb = new PaymentDatabaseService(dbPoolManager);
            console.log('💳 Payment database service connected');
        }
    }

    /**
     * Create Stripe checkout session for payments or subscriptions
     */
    async createCheckoutSession(userId, planType, country, amount = null) {
        try {
            const plan = this.plans[country];
            const finalAmount = amount || plan.monthly;
            
            const sessionData = {
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: plan.currency,
                        product_data: { 
                            name: planType === 'monthly' ? 'MarketBot Monthly Plan' : 'MarketBot Recharge',
                            description: planType === 'monthly' ? 'Monthly subscription' : 'Account recharge'
                        },
                        unit_amount: finalAmount,
                        // FIXED: Add recurring configuration for subscription mode
                        ...(planType === 'monthly' && {
                            recurring: {
                                interval: 'month'
                            }
                        })
                    },
                    quantity: 1,
                }],
                mode: planType === 'monthly' ? 'subscription' : 'payment',
                success_url: `${process.env.FRONTEND_URL || 'http://localhost:3003'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3003'}/payment/cancel`,
                metadata: { 
                    userId: userId.toString(), 
                    planType, 
                    country,
                    amount: finalAmount.toString()
                },
                customer_email: await this.getUserEmail(userId.toString())
            };

            const session = await this.stripe.checkout.sessions.create(sessionData);
            console.log(`✅ Checkout session created: ${session.id}`);
            
            return session;
        } catch (error) {
            console.error('❌ Error creating checkout session:', error);
            throw error;
        }
    }

    /**
     * Create Stripe payment intent for direct payments
     */
    async createPaymentIntent(userId, amount, currency, description) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency: currency.toLowerCase(),
                description: description || 'MarketBot Payment',
                metadata: {
                    userId: userId.toString()
                }
            });

            console.log(`✅ Payment intent created: ${paymentIntent.id}`);
            return paymentIntent;
        } catch (error) {
            console.error('❌ Error creating payment intent:', error);
            throw error;
        }
    }

    /**
     * Get user's saved payment methods
     */
    async getPaymentMethods(userId) {
        try {
            const customer = await this.getOrCreateCustomer(userId);
            const paymentMethods = await this.stripe.paymentMethods.list({
                customer: customer.id,
                type: 'card',
            });

            return paymentMethods.data;
        } catch (error) {
            console.error('❌ Error getting payment methods:', error);
            throw error;
        }
    }

    /**
     * Create setup intent for saving payment methods
     */
    async createSetupIntent(userId) {
        try {
            const customer = await this.getOrCreateCustomer(userId);
            
            const setupIntent = await this.stripe.setupIntents.create({
                customer: customer.id,
                payment_method_types: ['card'],
                usage: 'off_session',
            });

            console.log(`✅ Setup intent created: ${setupIntent.id}`);
            return setupIntent;
        } catch (error) {
            console.error('❌ Error creating setup intent:', error);
            throw error;
        }
    }

    /**
     * Process Stripe webhook events
     */
    async processWebhook(event) {
        console.log(`🔔 Processing webhook event: ${event.type}`);
        
        switch (event.type) {
            case 'checkout.session.completed':
                return await this.handlePaymentSuccess(event.data.object);
            case 'payment_intent.succeeded':
                return await this.handlePaymentIntentSuccess(event.data.object);
            case 'invoice.payment_succeeded':
                return await this.handleSubscriptionRenewal(event.data.object);
            case 'customer.subscription.created':
                return await this.handleSubscriptionCreated(event.data.object);
            case 'customer.subscription.updated':
                return await this.handleSubscriptionUpdated(event.data.object);
            case 'customer.subscription.deleted':
                return await this.handleSubscriptionDeleted(event.data.object);
            case 'payment_method.attached':
                return await this.handlePaymentMethodAttached(event.data.object);
            default:
                console.log(`⚠️ Unhandled webhook event: ${event.type}`);
                return { success: true, message: 'Event not handled' };
        }
    }

    /**
     * Handle successful payment from checkout session
     */
    async handlePaymentSuccess(session) {
        try {
            const { userId, planType, country, amount } = session.metadata;
            
            console.log(`💳 Payment successful for user ${userId}: ${amount} ${country}`);
            
            // Record webhook event
            if (this.paymentDb) {
                await this.paymentDb.recordWebhookEvent(
                    `evt_${Date.now()}`,
                    'checkout.session.completed',
                    session
                );
            }

            // Record checkout session
            if (this.paymentDb) {
                await this.paymentDb.recordStripeCheckoutSession(
                    parseInt(userId),
                    session.id,
                    parseInt(amount),
                    country === 'BR' ? 'BRL' : 'USD',
                    'completed',
                    planType,
                    country,
                    session.success_url,
                    session.cancel_url,
                    session.metadata
                );
            }

            // Process successful payment
            if (this.paymentDb) {
                const transaction = await this.paymentDb.processSuccessfulPayment(
                    parseInt(userId),
                    parseInt(amount) / 100, // Convert from cents
                    country === 'BR' ? 'BRL' : 'USD',
                    null, // No payment intent for checkout sessions
                    session.id,
                    `Stripe checkout payment - ${planType}`
                );
                console.log(`✅ Payment processed in database: Transaction ${transaction.id}`);
            }

            return { success: true, message: 'Payment processed successfully' };
        } catch (error) {
            console.error('❌ Error handling payment success:', error);
            throw error;
        }
    }

    /**
     * Handle successful payment intent
     */
    async handlePaymentIntentSuccess(paymentIntent) {
        try {
            const { userId } = paymentIntent.metadata;
            
            console.log(`💳 Payment intent succeeded for user ${userId}: ${paymentIntent.id}`);
            
            // Record webhook event
            if (this.paymentDb) {
                await this.paymentDb.recordWebhookEvent(
                    `evt_${Date.now()}`,
                    'payment_intent.succeeded',
                    paymentIntent
                );
            }

            // Record payment intent
            if (this.paymentDb) {
                await this.paymentDb.recordStripePaymentIntent(
                    parseInt(userId),
                    paymentIntent.id,
                    paymentIntent.amount,
                    paymentIntent.currency.toUpperCase(),
                    'succeeded',
                    paymentIntent.description,
                    paymentIntent.metadata
                );
            }

            // Process successful payment
            if (this.paymentDb) {
                const transaction = await this.paymentDb.processSuccessfulPayment(
                    parseInt(userId),
                    paymentIntent.amount / 100, // Convert from cents
                    paymentIntent.currency.toUpperCase(),
                    paymentIntent.id,
                    null, // No session for payment intents
                    `Stripe payment intent - ${paymentIntent.description || 'Payment'}`
                );
                console.log(`✅ Payment intent processed in database: Transaction ${transaction.id}`);
            }

            return { success: true, message: 'Payment intent processed successfully' };
        } catch (error) {
            console.error('❌ Error handling payment intent success:', error);
            throw error;
        }
    }

    /**
     * Handle subscription renewal
     */
    async handleSubscriptionRenewal(invoice) {
        try {
            console.log(`🔄 Subscription renewed: ${invoice.subscription}`);
            
            // Handle subscription renewal logic
            return { success: true, message: 'Subscription renewed successfully' };
        } catch (error) {
            console.error('❌ Error handling subscription renewal:', error);
            throw error;
        }
    }

    /**
     * Handle subscription created
     */
    async handleSubscriptionCreated(subscription) {
        try {
            console.log(`📅 Subscription created: ${subscription.id}`);
            
            // Handle subscription creation logic
            return { success: true, message: 'Subscription created successfully' };
        } catch (error) {
            console.error('❌ Error handling subscription created:', error);
            throw error;
        }
    }

    /**
     * Handle subscription updated
     */
    async handleSubscriptionUpdated(subscription) {
        try {
            console.log(`📝 Subscription updated: ${subscription.id}`);
            
            // Handle subscription update logic
            return { success: true, message: 'Subscription updated successfully' };
        } catch (error) {
            console.error('❌ Error handling subscription updated:', error);
            throw error;
        }
    }

    /**
     * Handle subscription deleted
     */
    async handleSubscriptionDeleted(subscription) {
        try {
            console.log(`🗑️ Subscription deleted: ${subscription.id}`);
            
            // Handle subscription deletion logic
            return { success: true, message: 'Subscription deleted successfully' };
        } catch (error) {
            console.error('❌ Error handling subscription deleted:', error);
            throw error;
        }
    }

    /**
     * Handle payment method attached
     */
    async handlePaymentMethodAttached(paymentMethod) {
        try {
            console.log(`💳 Payment method attached: ${paymentMethod.id}`);
            
            // Handle payment method attachment logic
            return { success: true, message: 'Payment method attached successfully' };
        } catch (error) {
            console.error('❌ Error handling payment method attached:', error);
            throw error;
        }
    }

    /**
     * Helper method to get or create Stripe customer
     */
    async getOrCreateCustomer(userId) {
        try {
            // Check if customer exists in database
            if (this.paymentDb) {
                const existingCustomer = await this.paymentDb.getStripeCustomerByUserId(userId);
                if (existingCustomer) {
                    console.log(`👤 Existing customer found: ${existingCustomer.stripe_customer_id}`);
                    
                    // Verify customer still exists in Stripe
                    try {
                        const stripeCustomer = await this.stripe.customers.retrieve(existingCustomer.stripe_customer_id);
                        if (stripeCustomer && !stripeCustomer.deleted) {
                            console.log(`✅ Customer verified in Stripe: ${stripeCustomer.id}`);
                            return stripeCustomer;
                        } else {
                            console.log(`⚠️ Customer deleted in Stripe, will create new one`);
                        }
                    } catch (stripeError) {
                        console.log(`⚠️ Customer not found in Stripe: ${stripeError.message}, will create new one`);
                        // Remove invalid customer reference from database
                        if (this.paymentDb) {
                            await this.paymentDb.removeInvalidCustomer(userId);
                        }
                    }
                }
            }

            // Create new customer
            const customer = await this.stripe.customers.create({
                metadata: {
                    userId: userId.toString()
                }
            });

            // Record customer in database
            if (this.paymentDb) {
                await this.paymentDb.recordStripeCustomer(
                    userId,
                    customer.id,
                    customer.email,
                    customer.name
                );
            }

            console.log(`👤 Customer created: ${customer.id}`);
            return customer;
        } catch (error) {
            console.error('❌ Error creating customer:', error);
            throw error;
        }
    }

    /**
     * Helper method to get user email
     */
    async getUserEmail(userId) {
        try {
            // In a real implementation, you would fetch from your database
            // For now, return a default email
            return `user${userId}@coinbitclub.com`;
        } catch (error) {
            console.error('❌ Error getting user email:', error);
            return `user${userId}@coinbitclub.com`;
        }
    }

    /**
     * Helper method to record payment (placeholder for database integration)
     */
    async recordPayment(userId, paymentData) {
        try {
            // In a real implementation, you would save to your database
            console.log(`📝 Recording payment for user ${userId}:`, paymentData);
            
            // Placeholder for database integration
            return { success: true };
        } catch (error) {
            console.error('❌ Error recording payment:', error);
            throw error;
        }
    }
}

module.exports = StripeUnifiedService;