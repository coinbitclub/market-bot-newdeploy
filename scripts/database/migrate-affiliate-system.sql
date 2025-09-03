-- SCRIPT DE MIGRAÇÃO - SISTEMA DE AFILIAÇÃO
-- Gerado automaticamente em 2025-08-22T23:27:59.840Z
-- 
-- INSTRUÇÕES:
-- 1. Faça backup do banco de dados antes de executar
-- 2. Execute este script em ambiente de desenvolvimento primeiro
-- 3. Teste todas as funcionalidades antes de aplicar em produção

BEGIN;

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


COMMIT;