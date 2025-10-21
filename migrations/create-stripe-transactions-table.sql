-- =============================================
-- CREATE STRIPE TRANSACTIONS TABLE
-- =============================================
-- Table to store all Stripe-related transactions and webhook events
-- Created: 2025-01-20
-- Purpose: Dedicated table for Stripe payment tracking and webhook processing

CREATE TABLE IF NOT EXISTS stripe_transactions (
    id SERIAL PRIMARY KEY,
    
    -- User and Customer Information
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    
    -- Transaction Details
    transaction_type VARCHAR(50) NOT NULL, -- 'checkout_session', 'invoice_payment', 'subscription', 'payment_intent'
    amount INTEGER NOT NULL, -- Amount in cents (Stripe format)
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'canceled'
    
    -- Stripe Identifiers
    stripe_payment_intent_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    
    -- Webhook Information
    webhook_event_id VARCHAR(255), -- Stripe event ID
    webhook_event_type VARCHAR(100), -- e.g., 'checkout.session.completed', 'invoice.payment_succeeded'
    
    -- Plan and Subscription Details
    plan_code VARCHAR(50), -- 'PRO', 'FLEX', 'TRIAL'
    plan_type VARCHAR(50), -- 'monthly', 'yearly', 'one_time'
    subscription_period_start TIMESTAMP,
    subscription_period_end TIMESTAMP,
    
    -- Payment Method Information
    payment_method_type VARCHAR(50), -- 'card', 'bank_transfer', etc.
    payment_method_id VARCHAR(255),
    
    -- Description and Metadata
    description TEXT,
    metadata JSONB, -- Store additional Stripe metadata
    
    -- Timestamps
    stripe_created_at TIMESTAMP, -- When Stripe created the transaction
    processed_at TIMESTAMP DEFAULT NOW(), -- When we processed the webhook
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_user_id ON stripe_transactions(user_id);

-- Index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_customer_id ON stripe_transactions(stripe_customer_id);

-- Index for transaction type filtering
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_type ON stripe_transactions(transaction_type);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_status ON stripe_transactions(status);

-- Index for Stripe identifiers (for webhook deduplication)
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_payment_intent ON stripe_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_session_id ON stripe_transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_invoice_id ON stripe_transactions(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_subscription_id ON stripe_transactions(stripe_subscription_id);

-- Index for webhook event tracking
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_webhook_event ON stripe_transactions(webhook_event_id);

-- Index for plan filtering
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_plan_code ON stripe_transactions(plan_code);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_created_at ON stripe_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_stripe_created_at ON stripe_transactions(stripe_created_at);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE stripe_transactions IS 'Stores all Stripe-related transactions and webhook events for payment tracking and reconciliation';
COMMENT ON COLUMN stripe_transactions.transaction_type IS 'Type of Stripe transaction: checkout_session, invoice_payment, subscription, payment_intent';
COMMENT ON COLUMN stripe_transactions.amount IS 'Transaction amount in cents (Stripe format)';
COMMENT ON COLUMN stripe_transactions.status IS 'Transaction status: pending, completed, failed, canceled';
COMMENT ON COLUMN stripe_transactions.webhook_event_type IS 'Stripe webhook event type that triggered this record';
COMMENT ON COLUMN stripe_transactions.metadata IS 'Additional Stripe metadata stored as JSON';
COMMENT ON COLUMN stripe_transactions.stripe_created_at IS 'Timestamp when Stripe created the transaction';
COMMENT ON COLUMN stripe_transactions.processed_at IS 'Timestamp when we processed the webhook';

-- =============================================
-- SAMPLE DATA STRUCTURE
-- =============================================

/*
Example records:

1. Checkout Session Completed:
   - transaction_type: 'checkout_session'
   - webhook_event_type: 'checkout.session.completed'
   - stripe_session_id: 'cs_test_...'
   - plan_code: 'PRO'
   - amount: 10000 (for $100.00)

2. Invoice Payment Succeeded:
   - transaction_type: 'invoice_payment'
   - webhook_event_type: 'invoice.payment_succeeded'
   - stripe_invoice_id: 'in_...'
   - stripe_payment_intent_id: 'pi_...'
   - amount: 10000

3. Subscription Created:
   - transaction_type: 'subscription'
   - webhook_event_type: 'customer.subscription.created'
   - stripe_subscription_id: 'sub_...'
   - plan_code: 'PRO'
   - subscription_period_start/end: timestamps
*/
