-- ========================================
-- 📋 SEED 3 UNIVERSAL PLANS
-- CoinBitClub Enterprise v6.0.0
-- Simplified seeding for 3 original mock plans
-- ========================================

-- Clear existing plans first
DELETE FROM plans;

-- Reset the sequence to start from 1
ALTER SEQUENCE plans_id_seq RESTART WITH 1;

-- Insert the 3 universal plans (original mock data structure)
INSERT INTO plans (
    code, name, description, type, price, currency, billing_period,
    commission_rate, minimum_balance, features, is_popular, is_recommended,
    region, stripe_product_id, is_active
) VALUES
-- Plan 1: Free Trial
(
    'TRIAL',
    'Free Trial',
    '7-day free trial with all features',
    'TRIAL',
    0.00,
    'USD',
    'none',
    0.00,
    0.00,
    '["✅ 7-day free trial", "🔧 TESTNET trading only", "⚡ All features available", "💬 Basic chat support", "👥 Community access", "📚 Free educational material"]'::jsonb,
    false,
    false,
    'global',
    null,
    true
),
-- Plan 2: FLEX Plan (Most Popular)
(
    'FLEX',
    'FLEX Plan',
    'Prepaid system with no monthly fee, only 20% commission on profits',
    'PREPAID',
    0.00,
    'USD',
    'none',
    20.00,
    30.00,
    '["🤖 24/7 Automated Trading", "💰 20% commission only on profits", "💳 Prepaid system (no monthly fees)", "💵 Minimum deposit: $30 USD", "💬 Standard chat support", "📈 Proven ÁGUIA AI strategies", "👥 General community", "📊 Performance reports"]'::jsonb,
    true,
    true,
    'global',
    'prod_flex_universal',
    true
),
-- Plan 3: PRO Plan
(
    'PRO',
    'PRO Plan',
    'Monthly plan with reduced 10% commission on profits',
    'MONTHLY',
    50.00,
    'USD',
    'month',
    10.00,
    20.00,
    '["🤖 24/7 Automated Trading", "💰 10% commission only on profits", "🎯 Priority VIP support", "🧠 Advanced ÁGUIA AI strategies", "👑 Exclusive Premium community", "🌍 24/7 international support", "🎁 10% bonus on first deposit", "📱 Mobile app access"]'::jsonb,
    false,
    false,
    'global',
    'prod_pro_universal',
    true
);

-- Verify the seeded plans
SELECT
    id,
    code,
    name,
    type,
    price,
    currency,
    billing_period,
    commission_rate,
    minimum_balance,
    is_popular,
    is_active,
    region,
    created_at
FROM plans
ORDER BY id;

-- Show summary
SELECT
    'Total Plans Seeded' as metric,
    COUNT(*) as value
FROM plans
UNION ALL
SELECT
    'Active Plans' as metric,
    COUNT(*) as value
FROM plans
WHERE is_active = true
UNION ALL
SELECT
    'Popular Plans' as metric,
    COUNT(*) as value
FROM plans
WHERE is_popular = true;

-- Show plans by type
SELECT
    type,
    COUNT(*) as count,
    STRING_AGG(code, ', ') as plan_codes
FROM plans
GROUP BY type
ORDER BY type;