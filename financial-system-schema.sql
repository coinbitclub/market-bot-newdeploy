-- 💰 COINBITCLUB FINANCIAL SYSTEM - DATABASE SCHEMA
-- =================================================
-- 
-- Sistema completo de gestão financeira com:
-- - Saldos separados (real, administrativo, comissão)
-- - Sistema de cupons e créditos
-- - Controle de saques e transações
-- - Comissionamento e afiliados

-- Atualizar tabela de usuários com novos campos de saldo
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_real_brl DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_real_usd DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_admin_brl DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_admin_usd DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_commission_brl DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_commission_usd DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'MONTHLY';
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_type VARCHAR(20) DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_id INTEGER REFERENCES users(id);

-- Tabela de transações financeiras
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- STRIPE_RECHARGE, ADMIN_CREDIT, COMMISSION_TO_CREDIT, WITHDRAWAL
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    commission_amount DECIMAL(15,2) DEFAULT 0.00,
    net_amount DECIMAL(15,2),
    plan_type VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de registros de comissão
CREATE TABLE IF NOT EXISTS commission_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    type VARCHAR(50) NOT NULL, -- COMPANY_COMMISSION, AFFILIATE_COMMISSION
    plan_type VARCHAR(20),
    commission_rate DECIMAL(5,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de cupons administrativos
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    credit_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    created_by_admin_id INTEGER NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de uso de cupons
CREATE TABLE IF NOT EXISTS coupon_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    coupon_id INTEGER NOT NULL REFERENCES coupons(id),
    credit_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    used_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, coupon_id) -- Cada usuário pode usar cada cupom apenas uma vez
);

-- Tabela de solicitações de saque
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, COMPLETED
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by_admin_id INTEGER REFERENCES users(id),
    admin_notes TEXT,
    bank_details JSONB, -- Dados bancários para transferência
    transaction_id VARCHAR(100) -- ID da transação no banco
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_commission_records_user_id ON commission_records(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_type ON commission_records(type);
CREATE INDEX IF NOT EXISTS idx_commission_records_created_at ON commission_records(created_at);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela de transações
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE transactions IS 'Registro de todas as transações financeiras do sistema';
COMMENT ON TABLE commission_records IS 'Histórico de comissões calculadas e pagas';
COMMENT ON TABLE coupons IS 'Cupons administrativos para créditos promocionais';
COMMENT ON TABLE coupon_usage IS 'Registro de uso de cupons pelos usuários';
COMMENT ON TABLE withdrawal_requests IS 'Solicitações de saque de saldo real';

COMMENT ON COLUMN users.balance_real_brl IS 'Saldo real em BRL (pode sacar) - origem: Stripe';
COMMENT ON COLUMN users.balance_real_usd IS 'Saldo real em USD (pode sacar) - origem: Stripe';
COMMENT ON COLUMN users.balance_admin_brl IS 'Crédito administrativo BRL (não pode sacar, 30 dias)';
COMMENT ON COLUMN users.balance_admin_usd IS 'Crédito administrativo USD (não pode sacar, 30 dias)';
COMMENT ON COLUMN users.balance_commission_brl IS 'Comissões BRL (não pode sacar, pode converter)';
COMMENT ON COLUMN users.balance_commission_usd IS 'Comissões USD (não pode sacar, pode converter)';

-- Views úteis para relatórios
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.plan_type,
    u.affiliate_type,
    u.balance_real_brl + u.balance_real_usd as total_withdrawable,
    u.balance_admin_brl + u.balance_admin_usd as total_admin_credits,
    u.balance_commission_brl + u.balance_commission_usd as total_commissions,
    (u.balance_real_brl + u.balance_real_usd + u.balance_admin_brl + u.balance_admin_usd) as total_operational,
    u.created_at,
    u.updated_at
FROM users u
WHERE u.is_active = true;

CREATE OR REPLACE VIEW commission_summary AS
SELECT 
    cr.user_id,
    u.username,
    cr.type,
    cr.plan_type,
    SUM(cr.amount) as total_commission,
    cr.currency,
    COUNT(*) as commission_count,
    MIN(cr.created_at) as first_commission,
    MAX(cr.created_at) as last_commission
FROM commission_records cr
JOIN users u ON cr.user_id = u.id
GROUP BY cr.user_id, u.username, cr.type, cr.plan_type, cr.currency;

-- Inserir dados de exemplo (comentado para produção)
/*
-- Exemplo de usuário admin
INSERT INTO users (username, email, is_admin, plan_type, affiliate_type) 
VALUES ('admin', 'admin@coinbitclub.com', true, 'PREPAID', 'none')
ON CONFLICT (email) DO NOTHING;

-- Exemplo de cupom
INSERT INTO coupons (code, credit_amount, currency, created_by_admin_id, expires_at)
SELECT 'WELCOME100', 100.00, 'BRL', id, NOW() + INTERVAL '30 days'
FROM users WHERE username = 'admin' 
ON CONFLICT (code) DO NOTHING;
*/

-- Verificar estrutura criada
SELECT 
    'Tabelas financeiras criadas com sucesso!' as status,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'transactions', 
    'commission_records', 
    'coupons', 
    'coupon_usage', 
    'withdrawal_requests'
);
