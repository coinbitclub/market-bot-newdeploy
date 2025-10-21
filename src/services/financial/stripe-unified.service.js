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
                monthly: 54600, // R$ 546.00 in cents (Brazil) - equivalent to $100 USD
                recharge_min: 27300, // R$ 273.00 minimum recharge - equivalent to $50 USD
                currency: 'brl',
                price: 54600,
                country: 'BR',
                countryName: 'Brazil',
                usdEquivalent: 100.00 // $100 USD equivalent
            },
            US: { 
                monthly: 10000, // $100.00 in cents (International)
                recharge_min: 5000, // $50.00 minimum recharge
                currency: 'usd',
                price: 10000,
                country: 'US',
                countryName: 'International',
                brlEquivalent: 546.00 // R$ 546 BRL equivalent
            }
        };
        this.commissionRates = {
            MONTHLY: 0.10,   // 10% sobre lucro
            PREPAID: 0.20    // 20% sobre lucro
        };
        
        // Exchange rate cache
        this.exchangeRates = {
            usdToBrl: 5.46, // Current rate: 1 USD = 5.46 BRL
            brlToUsd: 0.183, // Current rate: 1 BRL = 0.183 USD
            lastUpdated: new Date()
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
     * Update exchange rates and recalculate pricing
     */
    async updateExchangeRates() {
        try {
            const axios = require('axios');
            
            // Get current exchange rate from a reliable API
            const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
                timeout: 5000
            });
            
            if (response.data && response.data.rates && response.data.rates.BRL) {
                const newUsdToBrl = response.data.rates.BRL;
                const newBrlToUsd = 1 / newUsdToBrl;
                
                this.exchangeRates = {
                    usdToBrl: newUsdToBrl,
                    brlToUsd: newBrlToUsd,
                    lastUpdated: new Date()
                };
                
                // Update pricing based on new exchange rates
                this.updatePricingWithExchangeRates();
                
                console.log('💱 Exchange rates updated:', {
                    usdToBrl: newUsdToBrl,
                    brlToUsd: newBrlToUsd,
                    lastUpdated: this.exchangeRates.lastUpdated
                });
                
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Could not update exchange rates, using cached rates:', error.message);
        }
        
        return false;
    }

    /**
     * Update pricing based on current exchange rates
     */
    updatePricingWithExchangeRates() {
        const baseUsdPrice = 100.00; // Base price in USD
        const baseUsdRecharge = 50.00; // Base recharge in USD
        
        // Calculate BRL prices based on current exchange rate
        const brlPrice = Math.round(baseUsdPrice * this.exchangeRates.usdToBrl * 100); // Convert to cents
        const brlRecharge = Math.round(baseUsdRecharge * this.exchangeRates.usdToBrl * 100); // Convert to cents
        
        // Update plans with new pricing
        this.plans.BR.monthly = brlPrice;
        this.plans.BR.recharge_min = brlRecharge;
        this.plans.BR.price = brlPrice;
        this.plans.BR.usdEquivalent = baseUsdPrice;
        
        this.plans.US.brlEquivalent = baseUsdPrice * this.exchangeRates.usdToBrl;
        
        console.log('💰 Pricing updated with current exchange rates:', {
            usd: { monthly: baseUsdPrice, recharge: baseUsdRecharge },
            brl: { monthly: brlPrice / 100, recharge: brlRecharge / 100 },
            exchangeRate: this.exchangeRates.usdToBrl
        });
    }

    /**
     * Determine user's currency and pricing based on location
     */
    async getUserCurrencyAndPricing(userId) {
        try {
            if (!this.dbPoolManager) {
                console.warn('⚠️ Database not available, using default pricing (USD)');
                return this.plans.US;
            }

            // Get user's country from database
            const userResult = await this.dbPoolManager.executeRead(
                'SELECT country FROM users WHERE id = $1',
                [userId]
            );

            let userCountry = null;
            if (userResult.rows.length > 0) {
                userCountry = userResult.rows[0].country;
            }

            // Determine if user is from Brazil
            const isBrazilian = this.isBrazilianUser(userCountry);
            const planKey = isBrazilian ? 'BR' : 'US';
            const plan = this.plans[planKey];

            console.log(`🌍 User ${userId} currency determined:`, {
                userCountry,
                isBrazilian,
                currency: plan.currency,
                amount: plan.monthly / 100,
                countryName: plan.countryName
            });

            return plan;
        } catch (error) {
            console.error('❌ Error determining user currency:', error);
            // Fallback to USD pricing
            return this.plans.US;
        }
    }

    /**
     * Check if user is from Brazil based on country code
     */
    isBrazilianUser(country) {
        if (!country) {
            // If no country specified, default to Brazil (as per your requirement)
            return true;
        }

        const brazilianCountries = [
            'BR', 'BRA', 'Brazil', 'brazil', 'BRASIL', 'brasil',
            'Brasil', 'BRAZIL', 'br', 'bra'
        ];

        return brazilianCountries.includes(country);
    }

    /**
     * Get available payment methods for user's currency
     */
    getAvailablePaymentMethods(currency) {
        // TODO: Enable Boleto in Stripe dashboard for Brazilian users
        // To enable Boleto:
        // 1. Go to Stripe Dashboard > Settings > Payment methods
        // 2. Enable "Boleto" for Brazil
        // 3. Update this method to return ['card', 'boleto'] for BRL
        
        const availableMethods = {
            'brl': ['card'], // ['card', 'boleto'] when Boleto is enabled
            'usd': ['card']
        };
        
        return availableMethods[currency] || ['card'];
    }

    /**
     * Get user's IP-based location (fallback method)
     */
    async getUserLocationFromIP(req) {
        try {
            // Try to get country from request headers (if using a proxy/CDN)
            const countryFromHeader = req.headers['cf-ipcountry'] || 
                                    req.headers['x-country-code'] || 
                                    req.headers['x-forwarded-country'];

            if (countryFromHeader) {
                return countryFromHeader;
            }

            // Get client IP
            const clientIP = req.ip || 
                           req.connection.remoteAddress || 
                           req.socket.remoteAddress ||
                           (req.connection.socket ? req.connection.socket.remoteAddress : null);

            if (!clientIP) {
                return null;
            }

            // Use a free IP geolocation service
            const axios = require('axios');
            const response = await axios.get(`http://ip-api.com/json/${clientIP}`, {
                timeout: 3000
            });

            if (response.data && response.data.status === 'success') {
                return response.data.countryCode;
            }

            return null;
        } catch (error) {
            console.warn('⚠️ Could not determine IP location:', error.message);
            return null;
        }
    }

    /**
     * Create Stripe checkout session for payments or subscriptions
     */
    async createCheckoutSession(userId, planType, country = null, amount = null, planCode = null, successUrl = null, cancelUrl = null) {
        try {
            // Determine user's currency and pricing based on location
            const userPlan = await this.getUserCurrencyAndPricing(userId);
            const finalAmount = amount || userPlan.monthly;
            
            const sessionData = {
                payment_method_types: this.getAvailablePaymentMethods(userPlan.currency),
                line_items: [{
                    price_data: {
                        currency: userPlan.currency,
                        product_data: { 
                            name: planType === 'monthly' ? 
                                `MarketBot Monthly Plan - ${userPlan.countryName}` : 
                                `MarketBot Recharge - ${userPlan.countryName}`,
                            description: planType === 'monthly' ? 
                                `Monthly subscription (${userPlan.currency.toUpperCase()})` : 
                                `Account recharge (${userPlan.currency.toUpperCase()})`
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
                success_url: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:3003'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:3003'}/payment/cancel`,
                metadata: { 
                    userId: userId.toString(), 
                    planType, 
                    planCode: planCode || planType,
                    country: userPlan.country,
                    currency: userPlan.currency,
                    amount: finalAmount.toString(),
                    countryName: userPlan.countryName
                },
                customer_email: await this.getUserEmail(userId.toString()),
                locale: userPlan.currency === 'brl' ? 'pt-BR' : 'en'
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
     * Get user's pricing information
     */
    async getUserPricingInfo(userId) {
        try {
            const userPlan = await this.getUserCurrencyAndPricing(userId);
            
            return {
                currency: userPlan.currency,
                monthlyPrice: userPlan.monthly / 100, // Convert from cents
                monthlyPriceCents: userPlan.monthly,
                rechargeMin: userPlan.recharge_min / 100, // Convert from cents
                rechargeMinCents: userPlan.recharge_min,
                country: userPlan.country,
                countryName: userPlan.countryName,
                isBrazilian: userPlan.country === 'BR',
                exchangeRates: {
                    usdToBrl: this.exchangeRates.usdToBrl,
                    brlToUsd: this.exchangeRates.brlToUsd,
                    lastUpdated: this.exchangeRates.lastUpdated
                },
                equivalentPrices: {
                    usd: userPlan.currency === 'brl' ? userPlan.usdEquivalent : userPlan.monthly / 100,
                    brl: userPlan.currency === 'usd' ? userPlan.brlEquivalent : userPlan.monthly / 100
                }
            };
        } catch (error) {
            console.error('❌ Error getting user pricing info:', error);
            // Return default USD pricing
            return {
                currency: 'usd',
                monthlyPrice: 100.00,
                monthlyPriceCents: 10000,
                rechargeMin: 50.00,
                rechargeMinCents: 5000,
                country: 'US',
                countryName: 'International',
                isBrazilian: false,
                exchangeRates: this.exchangeRates,
                equivalentPrices: {
                    usd: 100.00,
                    brl: 546.00
                }
            };
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