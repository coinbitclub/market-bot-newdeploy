-- ============================================================================
-- CREATE PLANS TABLE - COINBITCLUB ENTERPRISE v6.0.0
-- ============================================================================
-- 
-- This migration creates the plans table to support the subscription system
-- Based on the analysis of the plans system architecture
--
-- Date: 2025-01-09
-- Environment: Production
-- ============================================================================

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
    -- Primary identification
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Plan configuration
    type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    -- Values: MONTHLY, PREPAID, TRIAL
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    billing_period VARCHAR(20) DEFAULT 'month',
    -- Values: month, year, none
    
    -- Commission and limits
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    minimum_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Features and metadata
    features JSONB DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT false,
    is_recommended BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Regional support
    region VARCHAR(20) DEFAULT 'international',
    -- Values: brazil, international
    
    -- Stripe integration
    stripe_product_id VARCHAR(100),
    stripe_price_id VARCHAR(100),
    
    -- Trading configuration limits
    max_leverage INTEGER DEFAULT 5,
    max_positions INTEGER DEFAULT 3,
    max_daily_loss DECIMAL(10,2) DEFAULT 200.00,
    min_balance_required DECIMAL(10,2) DEFAULT 30.00,
    stop_loss_percentage DECIMAL(5,2) DEFAULT 2.5,
    take_profit_percentage DECIMAL(5,2) DEFAULT 4.0,
    cooldown_minutes INTEGER DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(code);
CREATE INDEX IF NOT EXISTS idx_plans_type ON plans(type);
CREATE INDEX IF NOT EXISTS idx_plans_region ON plans(region);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_stripe_product ON plans(stripe_product_id);

-- Insert default plans
INSERT INTO plans (
    code, name, description, type, price, currency, billing_period,
    commission_rate, minimum_balance, features, is_popular, is_recommended,
    region, stripe_product_id, max_leverage, max_positions, max_daily_loss,
    min_balance_required, stop_loss_percentage, take_profit_percentage, cooldown_minutes
) VALUES 
-- TRIAL Plan (Global)
(
    'TRIAL',
    'Trial Gratuito',
    'Teste grátis por 7 dias com todas as funcionalidades',
    'TRIAL',
    0.00,
    'USD',
    'none',
    0.00,
    0.00,
    '[
        "✅ Teste grátis por 7 dias",
        "🔧 Trading TESTNET apenas",
        "⚡ Todas funcionalidades disponíveis",
        "💬 Suporte básico por chat",
        "👥 Acesso à comunidade",
        "📚 Material educativo gratuito"
    ]'::jsonb,
    false,
    false,
    'international',
    null,
    2, 1, 50.00, 0.00, 2.0, 3.0, 5
),

-- FLEX Plan (Brazil)
(
    'FLEX_BR',
    'FLEX (Brasil)',
    'Sistema pré-pago sem mensalidade, apenas 20% comissão sobre lucros',
    'PREPAID',
    0.00,
    'BRL',
    'none',
    20.00,
    150.00,
    '[
        "🤖 Trading automatizado 24/7",
        "💰 20% comissão apenas sobre lucros",
        "💳 Sistema pré-pago (sem mensalidade)",
        "💵 Recarga mínima: R$150",
        "💬 Suporte padrão por chat",
        "📈 Estratégias comprovadas de IA ÁGUIA",
        "👥 Comunidade geral",
        "📊 Relatórios de performance"
    ]'::jsonb,
    true,
    false,
    'brazil',
    'prod_SbHgHezeyKfTVg',
    5, 3, 200.00, 150.00, 2.5, 4.0, 3
),

-- FLEX Plan (International)
(
    'FLEX_US',
    'FLEX (Global)',
    'Prepaid system with no monthly fee, only 20% commission on profits',
    'PREPAID',
    0.00,
    'USD',
    'none',
    20.00,
    30.00,
    '[
        "🤖 24/7 Automated Trading",
        "💰 20% commission only on profits",
        "💳 Prepaid system (no monthly fees)",
        "💵 Minimum deposit: $30 USD",
        "💬 Standard chat support",
        "📈 Proven ÁGUIA AI strategies",
        "👥 General community",
        "📊 Performance reports"
    ]'::jsonb,
    true,
    false,
    'international',
    'prod_SbHiDqfrH2T8dI',
    5, 3, 200.00, 30.00, 2.5, 4.0, 3
),

-- PRO Plan (Brazil)
(
    'PRO_BR',
    'PRO (Brasil)',
    'Plano mensal com comissão reduzida de 10% sobre os lucros',
    'MONTHLY',
    297.00,
    'BRL',
    'month',
    10.00,
    100.00,
    '[
        "🤖 Trading automatizado 24/7",
        "💰 10% comissão apenas sobre lucros",
        "🎯 Suporte prioritário VIP",
        "🧠 Estratégias avançadas com IA ÁGUIA",
        "👑 Comunidade exclusiva Premium",
        "⭐ Mais vantajoso para investimentos > $5k USD",
        "🎁 Bônus de 10% no primeiro depósito",
        "📱 App mobile exclusivo"
    ]'::jsonb,
    false,
    true,
    'brazil',
    'prod_SbHejGiPSr1asV',
    10, 5, 500.00, 100.00, 3.0, 5.0, 2
),

-- PRO Plan (International)
(
    'PRO_US',
    'PRO (Global)',
    'Monthly plan with reduced 10% commission on profits',
    'MONTHLY',
    50.00,
    'USD',
    'month',
    10.00,
    20.00,
    '[
        "🤖 24/7 Automated Trading",
        "💰 10% commission only on profits",
        "🎯 Priority VIP support",
        "🧠 Advanced ÁGUIA AI strategies",
        "👑 Exclusive Premium community",
        "🌍 24/7 international support",
        "🎁 10% bonus on first deposit"
    ]'::jsonb,
    false,
    true,
    'international',
    'prod_SbHhz5Ht3q1lul',
    10, 5, 500.00, 20.00, 3.0, 5.0, 2
)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    type = EXCLUDED.type,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    billing_period = EXCLUDED.billing_period,
    commission_rate = EXCLUDED.commission_rate,
    minimum_balance = EXCLUDED.minimum_balance,
    features = EXCLUDED.features,
    is_popular = EXCLUDED.is_popular,
    is_recommended = EXCLUDED.is_recommended,
    region = EXCLUDED.region,
    stripe_product_id = EXCLUDED.stripe_product_id,
    max_leverage = EXCLUDED.max_leverage,
    max_positions = EXCLUDED.max_positions,
    max_daily_loss = EXCLUDED.max_daily_loss,
    min_balance_required = EXCLUDED.min_balance_required,
    stop_loss_percentage = EXCLUDED.stop_loss_percentage,
    take_profit_percentage = EXCLUDED.take_profit_percentage,
    cooldown_minutes = EXCLUDED.cooldown_minutes,
    updated_at = NOW();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_plans_updated_at();

-- Add comments for documentation
COMMENT ON TABLE plans IS 'Subscription plans for CoinBitClub Enterprise trading platform';
COMMENT ON COLUMN plans.code IS 'Unique plan identifier (e.g., TRIAL, FLEX_BR, PRO_US)';
COMMENT ON COLUMN plans.type IS 'Plan type: MONTHLY, PREPAID, or TRIAL';
COMMENT ON COLUMN plans.region IS 'Target region: brazil or international';
COMMENT ON COLUMN plans.commission_rate IS 'Commission percentage on profits';
COMMENT ON COLUMN plans.minimum_balance IS 'Minimum balance required for plan';
COMMENT ON COLUMN plans.features IS 'JSON array of plan features';
COMMENT ON COLUMN plans.stripe_product_id IS 'Stripe product ID for payment processing';

-- Verify the table was created successfully
SELECT 
    'Plans table created successfully' as status,
    COUNT(*) as total_plans,
    COUNT(CASE WHEN region = 'brazil' THEN 1 END) as brazil_plans,
    COUNT(CASE WHEN region = 'international' THEN 1 END) as international_plans
FROM plans;

