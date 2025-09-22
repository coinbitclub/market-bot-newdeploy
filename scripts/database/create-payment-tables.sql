-- 💳 PAYMENT INTEGRATION TABLES - COINBITCLUB ENTERPRISE
-- Database tables for payment recording and management

-- Stripe Customers Table
CREATE TABLE IF NOT EXISTS stripe_customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stripe Payment Intents Table
CREATE TABLE IF NOT EXISTS stripe_payment_intents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stripe Checkout Sessions Table
CREATE TABLE IF NOT EXISTS stripe_checkout_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_session_id VARCHAR(255) UNIQUE NOT NULL,
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    plan_type VARCHAR(50),
    country VARCHAR(10),
    success_url TEXT,
    cancel_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stripe Setup Intents Table
CREATE TABLE IF NOT EXISTS stripe_setup_intents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_setup_intent_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    payment_method_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stripe Webhook Events Table
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id SERIAL PRIMARY KEY,
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Payment Transactions Table (Enhanced)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'refund', 'commission'
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'pending', 'completed', 'failed', 'cancelled'
    payment_method VARCHAR(50), -- 'stripe', 'pix', 'bank_transfer'
    stripe_payment_intent_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Balances Table (Enhanced for payment integration)
CREATE TABLE IF NOT EXISTS user_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance_type VARCHAR(20) NOT NULL, -- 'real', 'admin', 'commission'
    currency VARCHAR(3) NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0.00,
    last_transaction_id INTEGER REFERENCES payment_transactions(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, balance_type, currency)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_user_id ON stripe_payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_stripe_id ON stripe_payment_intents(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_stripe_checkout_sessions_user_id ON stripe_checkout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_checkout_sessions_stripe_id ON stripe_checkout_sessions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_setup_intents_user_id ON stripe_setup_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_setup_intents_stripe_id ON stripe_setup_intents(stripe_setup_intent_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_stripe_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_pi ON payment_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_session ON payment_transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_type_currency ON user_balances(balance_type, currency);

-- Insert default balances for existing users
INSERT INTO user_balances (user_id, balance_type, currency, amount)
SELECT id, 'real', 'BRL', 1000.00 FROM users WHERE id NOT IN (
    SELECT user_id FROM user_balances WHERE balance_type = 'real' AND currency = 'BRL'
);

INSERT INTO user_balances (user_id, balance_type, currency, amount)
SELECT id, 'real', 'USD', 180.00 FROM users WHERE id NOT IN (
    SELECT user_id FROM user_balances WHERE balance_type = 'real' AND currency = 'USD'
);

INSERT INTO user_balances (user_id, balance_type, currency, amount)
SELECT id, 'admin', 'BRL', 0.00 FROM users WHERE id NOT IN (
    SELECT user_id FROM user_balances WHERE balance_type = 'admin' AND currency = 'BRL'
);

INSERT INTO user_balances (user_id, balance_type, currency, amount)
SELECT id, 'admin', 'USD', 0.00 FROM users WHERE id NOT IN (
    SELECT user_id FROM user_balances WHERE balance_type = 'admin' AND currency = 'USD'
);

INSERT INTO user_balances (user_id, balance_type, currency, amount)
SELECT id, 'commission', 'BRL', 0.00 FROM users WHERE id NOT IN (
    SELECT user_id FROM user_balances WHERE balance_type = 'commission' AND currency = 'BRL'
);

INSERT INTO user_balances (user_id, balance_type, currency, amount)
SELECT id, 'commission', 'USD', 0.00 FROM users WHERE id NOT IN (
    SELECT user_id FROM user_balances WHERE balance_type = 'commission' AND currency = 'USD'
);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_payment_intents_updated_at BEFORE UPDATE ON stripe_payment_intents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_checkout_sessions_updated_at BEFORE UPDATE ON stripe_checkout_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stripe_setup_intents_updated_at BEFORE UPDATE ON stripe_setup_intents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_balances_updated_at BEFORE UPDATE ON user_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
