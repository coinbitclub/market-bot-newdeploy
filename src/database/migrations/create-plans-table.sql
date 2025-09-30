-- ========================================
-- 📋 PLANS TABLE MIGRATION
-- CoinBitClub Enterprise v6.0.0
-- ========================================

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'MONTHLY', 'PREPAID', 'TRIAL'
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL', -- 'BRL', 'USD'
    billing_period VARCHAR(20) NOT NULL DEFAULT 'none', -- 'month', 'year', 'none'
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00, -- percentage
    minimum_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    limits JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_popular BOOLEAN DEFAULT FALSE,
    is_recommended BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    stripe_product_id VARCHAR(255),
    region VARCHAR(50) NOT NULL DEFAULT 'brazil', -- 'brazil', 'international'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(code);
CREATE INDEX IF NOT EXISTS idx_plans_region ON plans(region);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_plans_updated_at();

-- Insert the 3 main plans based on frontend mock data
INSERT INTO plans (
    code, name, description, type, price, currency, billing_period,
    commission_rate, minimum_balance, features, is_popular, region, stripe_product_id
) VALUES
(
    'TRIAL',
    'Trial Gratuito',
    'Teste grátis por 7 dias com todas as funcionalidades',
    'TRIAL',
    0.00,
    'BRL',
    'none',
    0.00,
    0.00,
    '["✅ Teste grátis por 7 dias", "🔧 Trading TESTNET apenas", "⚡ Todas funcionalidades disponíveis", "💬 Suporte básico por chat", "👥 Acesso à comunidade", "📚 Material educativo gratuito"]'::jsonb,
    false,
    'brazil',
    null
),
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
    '["🤖 Trading automatizado 24/7", "💰 20% comissão apenas sobre lucros", "💳 Sistema pré-pago (sem mensalidade)", "💵 Recarga mínima: R$150", "💬 Suporte padrão por chat", "📈 Estratégias comprovadas de IA ÁGUIA", "👥 Comunidade geral", "📊 Relatórios de performance"]'::jsonb,
    true,
    'brazil',
    'prod_SbHgHezeyKfTVg'
),
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
    '["🤖 Trading automatizado 24/7", "💰 10% comissão apenas sobre lucros", "🎯 Suporte prioritário VIP", "🧠 Estratégias avançadas com IA ÁGUIA", "👑 Comunidade exclusiva Premium", "⭐ Mais vantajoso para investimentos > $5k USD", "🎁 Bônus de 10% no primeiro depósito", "📱 App mobile exclusivo"]'::jsonb,
    false,
    'brazil',
    'prod_SbHejGiPSr1asV'
);

-- Insert international plans
INSERT INTO plans (
    code, name, description, type, price, currency, billing_period,
    commission_rate, minimum_balance, features, is_popular, region, stripe_product_id
) VALUES
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
    '["🤖 24/7 Automated Trading", "💰 20% commission only on profits", "💳 Prepaid system (no monthly fees)", "💵 Minimum deposit: $30 USD", "💬 Standard chat support", "📈 Proven ÁGUIA AI strategies", "👥 General community", "📊 Performance reports"]'::jsonb,
    true,
    'international',
    'prod_SbHiDqfrH2T8dI'
),
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
    '["🤖 24/7 Automated Trading", "💰 10% commission only on profits", "🎯 Priority VIP support", "🧠 Advanced ÁGUIA AI strategies", "👑 Exclusive Premium community", "🌍 24/7 international support", "🎁 10% bonus on first deposit"]'::jsonb,
    false,
    'international',
    'prod_SbHhz5Ht3q1lul'
);

-- Confirm insertion
SELECT
    code,
    name,
    type,
    price,
    currency,
    region,
    is_popular
FROM plans
ORDER BY region, type, price;