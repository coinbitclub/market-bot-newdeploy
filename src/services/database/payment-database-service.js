/**
 * 💳 PAYMENT DATABASE SERVICE - COINBITCLUB ENTERPRISE
 * Database service for payment recording and management
 */

class PaymentDatabaseService {
    constructor(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
        console.log('💳 Payment Database Service initialized');
    }

    /**
     * Record Stripe customer
     */
    async recordStripeCustomer(userId, stripeCustomerId, email, name) {
        try {
            const result = await this.dbPoolManager.executeWrite(
                `INSERT INTO stripe_customers (user_id, stripe_customer_id, email, name)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (stripe_customer_id) DO UPDATE SET
                     email = EXCLUDED.email,
                     name = EXCLUDED.name,
                     updated_at = NOW()
                 RETURNING *`,
                [userId, stripeCustomerId, email, name]
            );

            console.log(`✅ Stripe customer recorded: ${stripeCustomerId}`);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error recording Stripe customer:', error);
            throw error;
        }
    }

    /**
     * Record Stripe payment intent
     */
    async recordStripePaymentIntent(userId, stripePaymentIntentId, amount, currency, status, description, metadata) {
        try {
            const result = await this.dbPoolManager.executeWrite(
                `INSERT INTO stripe_payment_intents (user_id, stripe_payment_intent_id, amount, currency, status, description, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET
                     status = EXCLUDED.status,
                     updated_at = NOW()
                 RETURNING *`,
                [userId, stripePaymentIntentId, amount, currency, status, description, metadata]
            );

            console.log(`✅ Stripe payment intent recorded: ${stripePaymentIntentId}`);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error recording Stripe payment intent:', error);
            throw error;
        }
    }

    /**
     * Record Stripe checkout session
     */
    async recordStripeCheckoutSession(userId, stripeSessionId, amount, currency, status, planType, country, successUrl, cancelUrl, metadata) {
        try {
            const result = await this.dbPoolManager.executeWrite(
                `INSERT INTO stripe_checkout_sessions (user_id, stripe_session_id, amount, currency, status, plan_type, country, success_url, cancel_url, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (stripe_session_id) DO UPDATE SET
                     status = EXCLUDED.status,
                     updated_at = NOW()
                 RETURNING *`,
                [userId, stripeSessionId, amount, currency, status, planType, country, successUrl, cancelUrl, metadata]
            );

            console.log(`✅ Stripe checkout session recorded: ${stripeSessionId}`);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error recording Stripe checkout session:', error);
            throw error;
        }
    }

    /**
     * Record Stripe setup intent
     */
    async recordStripeSetupIntent(userId, stripeSetupIntentId, status, paymentMethodId, metadata) {
        try {
            const result = await this.dbPoolManager.executeWrite(
                `INSERT INTO stripe_setup_intents (user_id, stripe_setup_intent_id, status, payment_method_id, metadata)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (stripe_setup_intent_id) DO UPDATE SET
                     status = EXCLUDED.status,
                     payment_method_id = EXCLUDED.payment_method_id,
                     updated_at = NOW()
                 RETURNING *`,
                [userId, stripeSetupIntentId, status, paymentMethodId, metadata]
            );

            console.log(`✅ Stripe setup intent recorded: ${stripeSetupIntentId}`);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error recording Stripe setup intent:', error);
            throw error;
        }
    }

    /**
     * Record payment transaction
     */
    async recordPaymentTransaction(userId, transactionType, amount, currency, status, paymentMethod, stripePaymentIntentId, stripeSessionId, description, metadata) {
        try {
            const result = await this.dbPoolManager.executeWrite(
                `INSERT INTO payment_transactions (user_id, transaction_type, amount, currency, status, payment_method, stripe_payment_intent_id, stripe_session_id, description, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *`,
                [userId, transactionType, amount, currency, status, paymentMethod, stripePaymentIntentId, stripeSessionId, description, metadata]
            );

            console.log(`✅ Payment transaction recorded: ${result.rows[0].id}`);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error recording payment transaction:', error);
            throw error;
        }
    }

    /**
     * Update user balance
     */
    async updateUserBalance(userId, balanceType, currency, amountChange, transactionId) {
        try {
            const result = await this.dbPoolManager.executeWrite(
                `INSERT INTO user_balances (user_id, balance_type, currency, amount, last_transaction_id)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id, balance_type, currency) DO UPDATE SET
                     amount = user_balances.amount + $4,
                     last_transaction_id = $5,
                     updated_at = NOW()
                 RETURNING *`,
                [userId, balanceType, currency, amountChange, transactionId]
            );

            console.log(`✅ User balance updated: User ${userId}, ${balanceType} ${currency}, Change: ${amountChange}`);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error updating user balance:', error);
            throw error;
        }
    }

    /**
     * Get user balance
     */
    async getUserBalance(userId, balanceType, currency) {
        try {
            const result = await this.dbPoolManager.executeRead(
                `SELECT * FROM user_balances WHERE user_id = $1 AND balance_type = $2 AND currency = $3`,
                [userId, balanceType, currency]
            );

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error getting user balance:', error);
            throw error;
        }
    }

    /**
     * Get all user balances
     */
    async getAllUserBalances(userId) {
        try {
            const result = await this.dbPoolManager.executeRead(
                `SELECT * FROM user_balances WHERE user_id = $1 ORDER BY balance_type, currency`,
                [userId]
            );

            return result.rows;
        } catch (error) {
            console.error('❌ Error getting all user balances:', error);
            throw error;
        }
    }

    /**
     * Get payment transactions
     */
    async getPaymentTransactions(userId, limit = 50, offset = 0) {
        try {
            const result = await this.dbPoolManager.executeRead(
                `SELECT * FROM payment_transactions 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC 
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            );

            return result.rows;
        } catch (error) {
            console.error('❌ Error getting payment transactions:', error);
            throw error;
        }
    }

    /**
     * Record webhook event
     */
    async recordWebhookEvent(stripeEventId, eventType, eventData) {
        try {
            const result = await this.dbPoolManager.executeWrite(
                `INSERT INTO stripe_webhook_events (stripe_event_id, event_type, event_data)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (stripe_event_id) DO NOTHING
                 RETURNING *`,
                [stripeEventId, eventType, eventData]
            );

            if (result.rows.length > 0) {
                console.log(`✅ Webhook event recorded: ${eventType} - ${stripeEventId}`);
                return result.rows[0];
            } else {
                console.log(`⚠️ Webhook event already exists: ${eventType} - ${stripeEventId}`);
                return null;
            }
        } catch (error) {
            console.error('❌ Error recording webhook event:', error);
            throw error;
        }
    }

    /**
     * Mark webhook event as processed
     */
    async markWebhookEventProcessed(stripeEventId, processingStatus = 'completed', errorMessage = null) {
        try {
            const result = await this.dbPoolManager.executeWrite(
                `UPDATE stripe_webhook_events 
                 SET processed = true, processing_status = $2, error_message = $3, processed_at = NOW()
                 WHERE stripe_event_id = $1
                 RETURNING *`,
                [stripeEventId, processingStatus, errorMessage]
            );

            if (result.rows.length > 0) {
                console.log(`✅ Webhook event marked as processed: ${stripeEventId}`);
                return result.rows[0];
            } else {
                console.log(`⚠️ Webhook event not found: ${stripeEventId}`);
                return null;
            }
        } catch (error) {
            console.error('❌ Error marking webhook event as processed:', error);
            throw error;
        }
    }

    /**
     * Get Stripe customer by user ID
     */
    async getStripeCustomerByUserId(userId) {
        try {
            const result = await this.dbPoolManager.executeRead(
                `SELECT * FROM stripe_customers WHERE user_id = $1`,
                [userId]
            );

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error getting Stripe customer:', error);
            throw error;
        }
    }

    /**
     * Get Stripe customer by Stripe customer ID
     */
    async getStripeCustomerByStripeId(stripeCustomerId) {
        try {
            const result = await this.dbPoolManager.executeRead(
                `SELECT * FROM stripe_customers WHERE stripe_customer_id = $1`,
                [stripeCustomerId]
            );

            return result.rows[0];
        } catch (error) {
            console.error('❌ Error getting Stripe customer by Stripe ID:', error);
            throw error;
        }
    }

    /**
     * Process successful payment
     */
    async processSuccessfulPayment(userId, amount, currency, stripePaymentIntentId, stripeSessionId, description) {
        try {
            await this.dbPoolManager.executeWrite('BEGIN');

            // Record payment transaction
            const transaction = await this.recordPaymentTransaction(
                userId,
                'deposit',
                amount,
                currency,
                'completed',
                'stripe',
                stripePaymentIntentId,
                stripeSessionId,
                description,
                { processed_at: new Date().toISOString() }
            );

            // Update user balance
            await this.updateUserBalance(userId, 'real', currency, amount, transaction.id);

            await this.dbPoolManager.executeWrite('COMMIT');

            console.log(`✅ Successful payment processed: User ${userId}, ${amount} ${currency}`);
            return transaction;
        } catch (error) {
            await this.dbPoolManager.executeWrite('ROLLBACK');
            console.error('❌ Error processing successful payment:', error);
            throw error;
        }
    }
}

module.exports = PaymentDatabaseService;
