-- SCHEMA COMBINADO PARA SISTEMA DE AFILIAÇÃO
-- Gerado automaticamente em 2025-08-22T23:27:59.838Z

-- ============================================
-- SCHEMA EXISTENTE
-- ============================================
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


-- ============================================
-- EXTENSÕES PARA SISTEMA DE AFILIAÇÃO
-- ============================================
-- 🤝 SISTEMA DE AFILIAÇÃO - ESQUEMA COMPLETO
-- ===============================================
-- 
-- Extensões para o sistema de afiliação existente
-- Adiciona funcionalidades de solicitação, aprovação e conversão

-- Tabela de solicitações de afiliação
CREATE TABLE IF NOT EXISTS affiliate_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    requested_level VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'normal' ou 'vip'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reason TEXT, -- Motivo da solicitação pelo usuário
    admin_notes TEXT, -- Notas do administrador na aprovação/rejeição
    processed_by_admin_id INTEGER REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_affiliate_requests_level CHECK (requested_level IN ('normal', 'vip')),
    CONSTRAINT chk_affiliate_requests_status CHECK (status IN ('pending', 'approved', 'rejected')),
    -- Evitar solicitações duplicadas pendentes
    UNIQUE(user_id) WHERE status = 'pending'
);

-- Tabela de conversões de comissão para créditos
CREATE TABLE IF NOT EXISTS commission_conversions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    commission_amount DECIMAL(15,2) NOT NULL, -- Valor original da comissão
    bonus_amount DECIMAL(15,2) NOT NULL, -- 10% de bônus
    total_credit DECIMAL(15,2) NOT NULL, -- Valor total creditado
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    conversion_rate DECIMAL(8,4) DEFAULT 1.0, -- Taxa de conversão USD/BRL se aplicável
    source_balance_type VARCHAR(20) NOT NULL, -- 'commission_brl' ou 'commission_usd'
    target_balance_type VARCHAR(20) NOT NULL, -- 'admin_brl' ou 'admin_usd'
    converted_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_commission_amount_positive CHECK (commission_amount > 0),
    CONSTRAINT chk_bonus_calculation CHECK (bonus_amount = commission_amount * 0.10),
    CONSTRAINT chk_total_calculation CHECK (total_credit = commission_amount + bonus_amount),
    CONSTRAINT chk_currency CHECK (currency IN ('BRL', 'USD'))
);

-- Tabela de preferências de afiliado
CREATE TABLE IF NOT EXISTS affiliate_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
    auto_convert_commissions BOOLEAN DEFAULT false, -- Conversão automática de comissões
    conversion_threshold DECIMAL(15,2) DEFAULT 0.00, -- Valor mínimo para conversão automática
    preferred_currency VARCHAR(3) DEFAULT 'BRL',
    notification_email BOOLEAN DEFAULT true,
    notification_whatsapp BOOLEAN DEFAULT false,
    marketing_materials_consent BOOLEAN DEFAULT false, -- Consentimento para usar materiais de marketing
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_threshold_positive CHECK (conversion_threshold >= 0),
    CONSTRAINT chk_preferred_currency CHECK (preferred_currency IN ('BRL', 'USD'))
);

-- Tabela de estatísticas de afiliados (cache de performance)
CREATE TABLE IF NOT EXISTS affiliate_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
    total_referrals INTEGER DEFAULT 0,
    active_referrals INTEGER DEFAULT 0, -- Referenciados ativos
    total_commissions_brl DECIMAL(15,2) DEFAULT 0.00,
    total_commissions_usd DECIMAL(15,2) DEFAULT 0.00,
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00, -- % de cliques que viraram cadastros
    last_referral_at TIMESTAMP,
    last_commission_at TIMESTAMP,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    -- Métricas mensais
    monthly_referrals INTEGER DEFAULT 0,
    monthly_commissions_brl DECIMAL(15,2) DEFAULT 0.00,
    monthly_commissions_usd DECIMAL(15,2) DEFAULT 0.00,
    monthly_period DATE DEFAULT DATE_TRUNC('month', NOW())
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_user_id ON affiliate_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_status ON affiliate_requests(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_requested_at ON affiliate_requests(requested_at);

CREATE INDEX IF NOT EXISTS idx_commission_conversions_user_id ON commission_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_conversions_converted_at ON commission_conversions(converted_at);
CREATE INDEX IF NOT EXISTS idx_commission_conversions_currency ON commission_conversions(currency);

CREATE INDEX IF NOT EXISTS idx_affiliate_preferences_user_id ON affiliate_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_preferences_auto_convert ON affiliate_preferences(auto_convert_commissions);

CREATE INDEX IF NOT EXISTS idx_affiliate_stats_user_id ON affiliate_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_stats_monthly_period ON affiliate_stats(monthly_period);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_affiliate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
DROP TRIGGER IF EXISTS update_affiliate_requests_updated_at ON affiliate_requests;
CREATE TRIGGER update_affiliate_requests_updated_at 
    BEFORE UPDATE ON affiliate_requests 
    FOR EACH ROW EXECUTE PROCEDURE update_affiliate_updated_at();

DROP TRIGGER IF EXISTS update_affiliate_preferences_updated_at ON affiliate_preferences;
CREATE TRIGGER update_affiliate_preferences_updated_at 
    BEFORE UPDATE ON affiliate_preferences 
    FOR EACH ROW EXECUTE PROCEDURE update_affiliate_updated_at();

-- Função para atualizar estatísticas de afiliado
CREATE OR REPLACE FUNCTION update_affiliate_stats(affiliate_user_id INTEGER)
RETURNS VOID AS $$
DECLARE
    referral_count INTEGER;
    active_count INTEGER;
    total_comm_brl DECIMAL(15,2);
    total_comm_usd DECIMAL(15,2);
    monthly_refs INTEGER;
    monthly_comm_brl DECIMAL(15,2);
    monthly_comm_usd DECIMAL(15,2);
BEGIN
    -- Contar referenciados
    SELECT COUNT(*) INTO referral_count
    FROM users 
    WHERE affiliate_id = affiliate_user_id;
    
    -- Contar referenciados ativos (com alguma atividade nos últimos 30 dias)
    SELECT COUNT(*) INTO active_count
    FROM users 
    WHERE affiliate_id = affiliate_user_id 
    AND last_login_at > NOW() - INTERVAL '30 days';
    
    -- Calcular comissões totais
    SELECT 
        COALESCE(SUM(CASE WHEN currency = 'BRL' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0)
    INTO total_comm_brl, total_comm_usd
    FROM commission_records
    WHERE user_id = affiliate_user_id AND type = 'AFFILIATE_COMMISSION';
    
    -- Calcular métricas mensais
    SELECT COUNT(*) INTO monthly_refs
    FROM users 
    WHERE affiliate_id = affiliate_user_id 
    AND created_at >= DATE_TRUNC('month', NOW());
    
    SELECT 
        COALESCE(SUM(CASE WHEN currency = 'BRL' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0)
    INTO monthly_comm_brl, monthly_comm_usd
    FROM commission_records
    WHERE user_id = affiliate_user_id 
    AND type = 'AFFILIATE_COMMISSION'
    AND created_at >= DATE_TRUNC('month', NOW());
    
    -- Inserir ou atualizar estatísticas
    INSERT INTO affiliate_stats (
        user_id, total_referrals, active_referrals,
        total_commissions_brl, total_commissions_usd,
        monthly_referrals, monthly_commissions_brl, monthly_commissions_usd,
        last_updated, monthly_period
    )
    VALUES (
        affiliate_user_id, referral_count, active_count,
        total_comm_brl, total_comm_usd,
        monthly_refs, monthly_comm_brl, monthly_comm_usd,
        NOW(), DATE_TRUNC('month', NOW())
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_referrals = EXCLUDED.total_referrals,
        active_referrals = EXCLUDED.active_referrals,
        total_commissions_brl = EXCLUDED.total_commissions_brl,
        total_commissions_usd = EXCLUDED.total_commissions_usd,
        monthly_referrals = EXCLUDED.monthly_referrals,
        monthly_commissions_brl = EXCLUDED.monthly_commissions_brl,
        monthly_commissions_usd = EXCLUDED.monthly_commissions_usd,
        last_updated = NOW(),
        monthly_period = DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- Views para relatórios
CREATE OR REPLACE VIEW affiliate_requests_pending AS
SELECT 
    ar.id,
    ar.user_id,
    u.username,
    u.email,
    ar.requested_level,
    ar.reason,
    ar.requested_at,
    EXTRACT(day FROM NOW() - ar.requested_at) as days_pending
FROM affiliate_requests ar
JOIN users u ON ar.user_id = u.id
WHERE ar.status = 'pending'
ORDER BY ar.requested_at ASC;

CREATE OR REPLACE VIEW affiliate_performance AS
SELECT 
    u.id,
    u.username,
    u.affiliate_code,
    u.affiliate_type,
    stats.total_referrals,
    stats.active_referrals,
    stats.total_commissions_brl + stats.total_commissions_usd as total_commissions,
    stats.monthly_referrals,
    stats.conversion_rate,
    u.balance_commission_brl + u.balance_commission_usd as pending_commissions,
    CASE 
        WHEN stats.total_referrals >= 10 AND stats.monthly_commissions_brl + stats.monthly_commissions_usd >= 500 
        THEN true 
        ELSE false 
    END as eligible_for_vip
FROM users u
LEFT JOIN affiliate_stats stats ON u.id = stats.user_id
WHERE u.affiliate_type IN ('normal', 'vip')
ORDER BY total_commissions DESC;

-- Comentários para documentação
COMMENT ON TABLE affiliate_requests IS 'Solicitações de usuários para se tornarem afiliados';
COMMENT ON TABLE commission_conversions IS 'Histórico de conversões de comissão em créditos com bônus';
COMMENT ON TABLE affiliate_preferences IS 'Preferências e configurações dos afiliados';
COMMENT ON TABLE affiliate_stats IS 'Estatísticas calculadas dos afiliados para performance';

COMMENT ON COLUMN affiliate_requests.requested_level IS 'Nível solicitado: normal (aprovação automática) ou vip (requer aprovação admin)';
COMMENT ON COLUMN commission_conversions.bonus_amount IS 'Bônus de 10% aplicado na conversão de comissão para crédito';
COMMENT ON COLUMN affiliate_preferences.auto_convert_commissions IS 'Se true, converte automaticamente comissões em créditos';
COMMENT ON COLUMN affiliate_stats.conversion_rate IS 'Taxa de conversão de cliques em cadastros (atualizada periodicamente)';

-- Inserir preferências padrão para afiliados existentes
INSERT INTO affiliate_preferences (user_id)
SELECT id 
FROM users 
WHERE affiliate_type IN ('normal', 'vip')
AND id NOT IN (SELECT user_id FROM affiliate_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Verificar estrutura criada
SELECT 
    'Sistema de afiliação estendido criado com sucesso!' as status,
    COUNT(*) as novas_tabelas
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'affiliate_requests', 
    'commission_conversions', 
    'affiliate_preferences',
    'affiliate_stats'
);
