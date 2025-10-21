-- ============================================================================
-- UPDATE PLANS BUSINESS LOGIC - COINBITCLUB ENTERPRISE v6.0.0
-- ============================================================================
-- 
-- This migration updates the plans table to match the exact business requirements:
-- 1. TRIAL - Testnet only trading
-- 2. PRO - $100/month flat fee, unlimited trading
-- 3. FLEX - Percentage fee per transaction, requires user assets
--
-- Date: 2025-01-09
-- Environment: Production
-- ============================================================================

-- First, let's clear existing plans and recreate with correct business logic
DELETE FROM plans;

-- Insert the 3 plans according to business requirements
INSERT INTO plans (
    code, name, description, type, price, currency, billing_period,
    commission_rate, minimum_balance, features, is_popular, is_recommended,
    region, stripe_product_id, max_leverage, max_positions, max_daily_loss,
    min_balance_required, stop_loss_percentage, take_profit_percentage, cooldown_minutes
) VALUES 

-- 1. TRIAL Plan - Testnet only
(
    'TRIAL',
    'Trial Plan',
    'Free trial with testnet trading only - perfect for learning and testing strategies',
    'TRIAL',
    0.00,
    'USD',
    'none',
    0.00,
    0.00,
    '[
        "✅ Free trial - no cost",
        "🔧 Testnet trading only",
        "📚 Learn trading strategies",
        "💬 Basic support",
        "👥 Community access",
        "📊 Basic performance reports",
        "⚠️ No real money trading"
    ]'::jsonb,
    false,
    false,
    'international',
    null,
    2, 1, 0.00, 0.00, 2.0, 3.0, 5
),

-- 2. PRO Plan - $100/month flat fee, unlimited trading
(
    'PRO',
    'PRO Plan',
    'Professional plan with unlimited trading for $100/month flat fee - no transaction fees',
    'MONTHLY',
    100.00,
    'USD',
    'month',
    0.00,
    0.00,
    '[
        "💰 $100/month flat fee",
        "🚀 Unlimited trading",
        "💎 No transaction fees",
        "🎯 Priority support",
        "🧠 Advanced AI strategies",
        "👑 Premium community",
        "📱 Mobile app access",
        "📊 Advanced analytics",
        "🔔 Real-time notifications"
    ]'::jsonb,
    true,
    true,
    'international',
    'prod_PRO_plan',
    10, 10, 10000.00, 0.00, 3.0, 5.0, 1
),

-- 3. FLEX Plan - Percentage fee per transaction, requires user assets
(
    'FLEX',
    'FLEX Plan',
    'Flexible plan with percentage fee per transaction - requires user to own assets',
    'PREPAID',
    0.00,
    'USD',
    'none',
    20.00,
    100.00,
    '[
        "💳 No monthly fee",
        "📈 20% fee per profitable transaction",
        "💰 Requires user assets ($100 minimum)",
        "🤖 Automated trading",
        "💬 Standard support",
        "👥 General community",
        "📊 Performance reports",
        "⚡ Pay only when you profit"
    ]'::jsonb,
    false,
    false,
    'international',
    'prod_FLEX_plan',
    5, 5, 2000.00, 100.00, 2.5, 4.0, 3
);

-- Update the table structure to better reflect the business logic
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS allows_realtime_trading BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_user_assets BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transaction_fee_type VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2) DEFAULT 0.00;

-- Update the plans with the new business logic fields
UPDATE plans SET 
    allows_realtime_trading = CASE 
        WHEN code = 'TRIAL' THEN false
        WHEN code = 'PRO' THEN true
        WHEN code = 'FLEX' THEN true
        ELSE false
    END,
    requires_user_assets = CASE 
        WHEN code = 'TRIAL' THEN false
        WHEN code = 'PRO' THEN false
        WHEN code = 'FLEX' THEN true
        ELSE false
    END,
    transaction_fee_type = CASE 
        WHEN code = 'TRIAL' THEN 'none'
        WHEN code = 'PRO' THEN 'none'
        WHEN code = 'FLEX' THEN 'percentage'
        ELSE 'none'
    END,
    monthly_fee = CASE 
        WHEN code = 'TRIAL' THEN 0.00
        WHEN code = 'PRO' THEN 100.00
        WHEN code = 'FLEX' THEN 0.00
        ELSE 0.00
    END;

-- Add comments for the new business logic
COMMENT ON COLUMN plans.allows_realtime_trading IS 'Whether this plan allows real money trading (true) or only testnet (false)';
COMMENT ON COLUMN plans.requires_user_assets IS 'Whether this plan requires user to have their own assets';
COMMENT ON COLUMN plans.transaction_fee_type IS 'Type of transaction fee: none, percentage, or fixed';
COMMENT ON COLUMN plans.monthly_fee IS 'Monthly subscription fee for the plan';

-- Create a view for easy plan validation
CREATE OR REPLACE VIEW plan_validation_rules AS
SELECT 
    code,
    name,
    type,
    allows_realtime_trading,
    requires_user_assets,
    transaction_fee_type,
    monthly_fee,
    commission_rate,
    minimum_balance,
    CASE 
        WHEN code = 'TRIAL' THEN 'TESTNET_ONLY'
        WHEN code = 'PRO' THEN 'UNLIMITED_TRADING'
        WHEN code = 'FLEX' THEN 'ASSET_REQUIRED'
        ELSE 'UNKNOWN'
    END as trading_mode
FROM plans
WHERE is_active = true;

-- Verify the updated plans
SELECT 
    'Plans updated successfully' as status,
    COUNT(*) as total_plans,
    COUNT(CASE WHEN allows_realtime_trading = true THEN 1 END) as realtime_plans,
    COUNT(CASE WHEN requires_user_assets = true THEN 1 END) as asset_required_plans,
    COUNT(CASE WHEN monthly_fee > 0 THEN 1 END) as paid_plans
FROM plans;

-- Show the updated plans with business logic
SELECT 
    code,
    name,
    type,
    monthly_fee,
    commission_rate,
    allows_realtime_trading,
    requires_user_assets,
    transaction_fee_type,
    minimum_balance
FROM plans
ORDER BY 
    CASE code 
        WHEN 'TRIAL' THEN 1
        WHEN 'FLEX' THEN 2
        WHEN 'PRO' THEN 3
        ELSE 4
    END;

