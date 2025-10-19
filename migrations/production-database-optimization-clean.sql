-- ================================================================
-- PRODUCTION DATABASE OPTIMIZATION
-- ================================================================
-- Standard optimized structure for users, affiliates, and admin
-- Safe migration with data preservation
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: ADD MISSING COLUMNS TO EXISTING TABLES
-- ================================================================

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'pt';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_commission_brl DECIMAL(18,8) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_commission_usd DECIMAL(18,8) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_code VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_type VARCHAR(20) DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trading_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;

-- Add missing columns to trading_operations table
ALTER TABLE trading_operations ADD COLUMN IF NOT EXISTS profit_loss_usd DECIMAL(18,8) DEFAULT 0;
ALTER TABLE trading_operations ADD COLUMN IF NOT EXISTS profit_loss_brl DECIMAL(18,8) DEFAULT 0;
ALTER TABLE trading_operations ADD COLUMN IF NOT EXISTS entry_time TIMESTAMP;
ALTER TABLE trading_operations ADD COLUMN IF NOT EXISTS exit_time TIMESTAMP;
ALTER TABLE trading_operations ADD COLUMN IF NOT EXISTS entry_price DECIMAL(18,8);
ALTER TABLE trading_operations ADD COLUMN IF NOT EXISTS exit_price DECIMAL(18,8);

-- ================================================================
-- STEP 2: CREATE NEW TABLES
-- ================================================================

-- 2.1 AFFILIATES TABLE
CREATE TABLE IF NOT EXISTS affiliates (
    -- Identity
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Affiliate Identity
    affiliate_code VARCHAR(50) UNIQUE NOT NULL,
    affiliate_type VARCHAR(20) NOT NULL DEFAULT 'normal',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Referral Chain
    referred_by_user_id INTEGER REFERENCES users(id),
    referred_by_affiliate_id INTEGER REFERENCES affiliates(id),
    
    -- Commission Balances (MOVED FROM USERS)
    balance_commission_brl DECIMAL(18,8) DEFAULT 0,
    balance_commission_usd DECIMAL(18,8) DEFAULT 0,
    
    -- Lifetime Tracking
    total_earned_brl DECIMAL(18,8) DEFAULT 0,
    total_earned_usd DECIMAL(18,8) DEFAULT 0,
    total_withdrawn_brl DECIMAL(18,8) DEFAULT 0,
    total_withdrawn_usd DECIMAL(18,8) DEFAULT 0,
    
    -- Commission Rates
    commission_rate_trading DECIMAL(5,4) DEFAULT 0.015,
    commission_rate_referral DECIMAL(5,4) DEFAULT 0.10,
    
    -- Performance Metrics
    total_referrals INTEGER DEFAULT 0,
    active_referrals INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Settings
    auto_convert_commissions BOOLEAN DEFAULT FALSE,
    conversion_threshold DECIMAL(15,2) DEFAULT 100.00,
    preferred_currency VARCHAR(3) DEFAULT 'BRL',
    payment_method VARCHAR(50),
    pix_key VARCHAR(255),
    bank_account_info JSONB,
    
    -- Approval
    approved_at TIMESTAMP,
    approved_by_admin_id INTEGER REFERENCES users(id),
    verification_status VARCHAR(20) DEFAULT 'pending',
    verification_documents JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_commission_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_affiliate_type CHECK (affiliate_type IN ('normal', 'vip')),
    CONSTRAINT chk_affiliate_status CHECK (status IN ('active', 'inactive', 'suspended')),
    CONSTRAINT chk_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected'))
);

-- 2.2 USER_REFERRALS TABLE
CREATE TABLE IF NOT EXISTS user_referrals (
    id SERIAL PRIMARY KEY,
    
    -- Who was referred
    referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Who referred them
    referrer_affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE SET NULL,
    referrer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Tracking
    referral_code_used VARCHAR(50),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Status & Conversion
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    conversion_date TIMESTAMP,
    first_payment_date TIMESTAMP,
    referred_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_referral_status CHECK (status IN ('pending', 'active', 'converted')),
    CONSTRAINT uq_referred_user UNIQUE(referred_user_id)
);

-- 2.3 ADMIN_ACTIONS TABLE
CREATE TABLE IF NOT EXISTS admin_actions (
    id SERIAL PRIMARY KEY,
    
    -- Admin who performed action
    admin_user_id INTEGER NOT NULL REFERENCES users(id),
    
    -- Action details
    action_type VARCHAR(50) NOT NULL,
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id INTEGER NOT NULL,
    
    -- Details
    action_data JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamp
    performed_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_action_type CHECK (action_type IN (
        'approve_withdrawal', 'reject_withdrawal',
        'promote_affiliate_to_vip', 'demote_affiliate',
        'ban_user', 'unban_user',
        'add_admin_credit', 'adjust_balance',
        'approve_affiliate_request', 'reject_affiliate_request',
        'suspend_account', 'reactivate_account',
        'manual_commission', 'cancel_commission'
    ))
);

-- 2.4 USER_TRADING_CONFIG TABLE
CREATE TABLE IF NOT EXISTS user_trading_config (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Risk Management
    risk_level VARCHAR(20) DEFAULT 'MEDIUM',
    max_open_positions INTEGER DEFAULT 3,
    default_leverage INTEGER DEFAULT 10,
    position_size_percentage DECIMAL(5,2) DEFAULT 30.00,
    
    -- Stop Loss & Take Profit
    stop_loss_multiplier DECIMAL(5,2) DEFAULT 2.00,
    take_profit_multiplier DECIMAL(5,2) DEFAULT 3.00,
    daily_loss_limit_percentage DECIMAL(5,2) DEFAULT 5.00,
    
    -- Auto Trading
    auto_trade_enabled BOOLEAN DEFAULT FALSE,
    auto_stop_loss BOOLEAN DEFAULT TRUE,
    auto_take_profit BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_risk_level CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH'))
);

-- ================================================================
-- STEP 3: CREATE INDEXES
-- ================================================================

-- Affiliates indexes
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_type ON affiliates(affiliate_type);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_referred_by ON affiliates(referred_by_affiliate_id);

-- User referrals indexes
CREATE INDEX IF NOT EXISTS idx_user_referrals_referred ON user_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer_affiliate ON user_referrals(referrer_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_status ON user_referrals(status);

-- Admin actions indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_performed_at ON admin_actions(performed_at);

-- User trading config index
CREATE INDEX IF NOT EXISTS idx_user_trading_config_user_id ON user_trading_config(user_id);

-- ================================================================
-- STEP 4: MIGRATE EXISTING DATA
-- ================================================================

-- 4.1 Migrate affiliate data from users table
INSERT INTO affiliates (
    user_id, 
    affiliate_code, 
    affiliate_type,
    balance_commission_brl,
    balance_commission_usd,
    referred_by_user_id,
    status,
    created_at
)
SELECT 
    id,
    affiliate_code,
    COALESCE(affiliate_type, 'normal'),
    COALESCE(balance_commission_brl, 0),
    COALESCE(balance_commission_usd, 0),
    affiliate_id,
    'active',
    created_at
FROM users
WHERE affiliate_code IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 4.2 Migrate referral relationships
INSERT INTO user_referrals (
    referred_user_id,
    referrer_user_id,
    referrer_affiliate_id,
    referral_code_used,
    status,
    referred_at
)
SELECT 
    u.id,
    u.affiliate_id,
    a.id,
    a.affiliate_code,
    CASE 
        WHEN u.subscription_status = 'active' THEN 'converted'
        ELSE 'active'
    END,
    u.created_at
FROM users u
INNER JOIN affiliates a ON a.user_id = u.affiliate_id
WHERE u.affiliate_id IS NOT NULL
ON CONFLICT (referred_user_id) DO NOTHING;

-- 4.3 Migrate trading config (only if trading_enabled exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'trading_enabled') THEN
        INSERT INTO user_trading_config (
            user_id,
            created_at
        )
        SELECT 
            id,
            created_at
        FROM users
        WHERE trading_enabled = TRUE
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- 4.4 Update user roles for affiliates (if role column exists and user isn't admin)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        UPDATE users SET role = 'affiliate'
        WHERE id IN (SELECT user_id FROM affiliates)
        AND (role IS NULL OR role NOT IN ('admin'));
    END IF;
END $$;

-- ================================================================
-- COMMIT OR ROLLBACK
-- ================================================================

-- COMMIT;  -- Uncomment to apply changes
ROLLBACK;  -- Comment this out when ready to commit

