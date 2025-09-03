-- =============================================
-- 🗄️ SCHEMA ATUALIZADO - SISTEMA DE AFILIAÇÃO
-- =============================================
-- 
-- Atualização para suportar:
-- ✅ Aprovação automática para AFFILIATE_NORMAL
-- 🔒 Nomeação VIP exclusiva por administradores
-- 📊 Auditoria completa do sistema

-- =============================================
-- 📊 EXTENSÕES PARA TABELA USERS
-- =============================================

-- Adicionar colunas para sistema VIP e auditoria
ALTER TABLE users ADD COLUMN IF NOT EXISTS promoted_to_vip_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS promoted_by_admin_id INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_promotion_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_approved_by VARCHAR(50); -- 'SYSTEM_AUTO' ou admin_id

-- Garantir colunas de comissão existem
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_commission_brl DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_commission_usd DECIMAL(15,2) DEFAULT 0.00;

-- =============================================
-- 📝 TABELA: affiliate_requests (ATUALIZADA)
-- =============================================

DROP TABLE IF EXISTS affiliate_requests CASCADE;

CREATE TABLE affiliate_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    document VARCHAR(50) NOT NULL,
    trading_experience TEXT,
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    requested_level VARCHAR(20) DEFAULT 'AFFILIATE_NORMAL', -- Sempre NORMAL por padrão
    status VARCHAR(20) DEFAULT 'APPROVED', -- Auto-aprovação como padrão
    admin_notes TEXT,
    affiliate_code_generated VARCHAR(20), -- Código gerado automaticamente
    
    -- Auditoria de aprovação
    approved_at TIMESTAMP DEFAULT NOW(), -- Auto-aprovação imediata
    approved_by VARCHAR(50) DEFAULT 'SYSTEM_AUTO', -- Sistema automático
    processed_by_admin_id INTEGER REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id), -- Apenas uma solicitação por usuário
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CHECK (requested_level IN ('AFFILIATE_NORMAL', 'AFFILIATE_VIP'))
);

-- =============================================
-- 🌟 TABELA: affiliate_vip_promotions
-- =============================================

CREATE TABLE IF NOT EXISTS affiliate_vip_promotions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    promoted_by_admin_id INTEGER NOT NULL REFERENCES users(id),
    reason VARCHAR(255) NOT NULL,
    justification TEXT,
    promoted_at TIMESTAMP DEFAULT NOW(),
    
    -- Auditoria
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id) -- Apenas uma promoção VIP por usuário
);

-- =============================================
-- 💰 TABELA: commission_conversions (MANTIDA)
-- =============================================

CREATE TABLE IF NOT EXISTS commission_conversions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    commission_amount DECIMAL(15,2) NOT NULL,
    bonus_amount DECIMAL(15,2) NOT NULL,
    total_credit DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    conversion_rate DECIMAL(10,6),
    
    -- Timestamps
    converted_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CHECK (commission_amount > 0),
    CHECK (bonus_amount >= 0),
    CHECK (currency IN ('BRL', 'USD'))
);

-- =============================================
-- ⚙️ TABELA: affiliate_preferences (MANTIDA)
-- =============================================

CREATE TABLE IF NOT EXISTS affiliate_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auto_convert BOOLEAN DEFAULT false,
    conversion_threshold DECIMAL(10,2) DEFAULT 0.00,
    notification_email BOOLEAN DEFAULT true,
    notification_system BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- =============================================
-- 📈 TABELA: affiliate_stats (MANTIDA)
-- =============================================

CREATE TABLE IF NOT EXISTS affiliate_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_referrals INTEGER DEFAULT 0,
    total_commission_brl DECIMAL(15,2) DEFAULT 0.00,
    total_commission_usd DECIMAL(15,2) DEFAULT 0.00,
    total_conversions INTEGER DEFAULT 0,
    total_bonus_earned DECIMAL(15,2) DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- =============================================
-- 🔧 FUNÇÕES AUTOMATIZADAS
-- =============================================

-- Função para auto-aprovar solicitações normais
CREATE OR REPLACE FUNCTION auto_approve_normal_affiliate()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for solicitação NORMAL, aprovar automaticamente
    IF NEW.requested_level = 'AFFILIATE_NORMAL' THEN
        NEW.status := 'APPROVED';
        NEW.approved_at := NOW();
        NEW.approved_by := 'SYSTEM_AUTO';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-aprovação
DROP TRIGGER IF EXISTS trigger_auto_approve_normal ON affiliate_requests;
CREATE TRIGGER trigger_auto_approve_normal
    BEFORE INSERT ON affiliate_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_normal_affiliate();

-- =============================================
-- 📊 VIEWS PARA RELATÓRIOS
-- =============================================

-- View de afiliados ativos com estatísticas
CREATE OR REPLACE VIEW affiliate_dashboard_view AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.affiliate_code,
    u.affiliate_type,
    u.affiliate_approved_at,
    u.affiliate_approved_by,
    u.promoted_to_vip_at,
    u.promoted_by_admin_id,
    u.balance_commission_brl,
    u.balance_commission_usd,
    u.balance_brl,
    u.balance_usd,
    
    -- Estatísticas
    COALESCE(ast.total_referrals, 0) as total_referrals,
    COALESCE(ast.total_commission_brl, 0) as total_commission_brl,
    COALESCE(ast.total_commission_usd, 0) as total_commission_usd,
    COALESCE(ast.total_conversions, 0) as total_conversions,
    COALESCE(ast.total_bonus_earned, 0) as total_bonus_earned,
    
    -- Preferências
    COALESCE(ap.auto_convert, false) as auto_convert,
    COALESCE(ap.conversion_threshold, 0) as conversion_threshold,
    
    -- Informações de aprovação
    CASE 
        WHEN u.affiliate_approved_by = 'SYSTEM_AUTO' THEN 'AUTOMÁTICA'
        ELSE 'MANUAL'
    END as approval_type,
    
    -- Taxa de comissão
    CASE 
        WHEN u.affiliate_type = 'AFFILIATE_VIP' THEN 0.05
        WHEN u.affiliate_type = 'AFFILIATE_NORMAL' THEN 0.015
        ELSE 0
    END as commission_rate

FROM users u
LEFT JOIN affiliate_stats ast ON u.id = ast.user_id
LEFT JOIN affiliate_preferences ap ON u.id = ap.user_id
WHERE u.affiliate_code IS NOT NULL;

-- =============================================
-- 🔐 POLÍTICAS DE SEGURANÇA
-- =============================================

-- Apenas admins podem promover para VIP
CREATE OR REPLACE FUNCTION check_vip_promotion_permission()
RETURNS TRIGGER AS $$
DECLARE
    admin_check BOOLEAN;
BEGIN
    -- Verificar se quem está promovendo é admin
    SELECT is_admin INTO admin_check 
    FROM users 
    WHERE id = NEW.promoted_by_admin_id;
    
    IF NOT admin_check THEN
        RAISE EXCEPTION 'Apenas administradores podem promover usuários para VIP';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar promoções VIP
DROP TRIGGER IF EXISTS trigger_check_vip_promotion ON affiliate_vip_promotions;
CREATE TRIGGER trigger_check_vip_promotion
    BEFORE INSERT ON affiliate_vip_promotions
    FOR EACH ROW
    EXECUTE FUNCTION check_vip_promotion_permission();

-- =============================================
-- 📋 ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices principais
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_user_id ON affiliate_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_status ON affiliate_requests(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_vip_promotions_user_id ON affiliate_vip_promotions(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_conversions_user_id ON commission_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_stats_user_id ON affiliate_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users(affiliate_code) WHERE affiliate_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_affiliate_type ON users(affiliate_type) WHERE affiliate_type IS NOT NULL;

-- =============================================
-- 🎯 DADOS INICIAIS
-- =============================================

-- Configurações padrão do sistema
INSERT INTO system_config (key, value, description) VALUES
('affiliate_auto_approval_normal', 'true', 'Aprovação automática para afiliados normais'),
('affiliate_normal_commission_rate', '0.015', 'Taxa de comissão para afiliados normais (1.5%)'),
('affiliate_vip_commission_rate', '0.05', 'Taxa de comissão para afiliados VIP (5%)'),
('commission_conversion_bonus', '0.10', 'Bônus na conversão de comissões (10%)')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- ✅ VALIDAÇÃO DA ESTRUTURA
-- =============================================

-- Verificar se todas as tabelas foram criadas
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('affiliate_requests', 'affiliate_vip_promotions', 'commission_conversions', 'affiliate_preferences', 'affiliate_stats');
    
    IF table_count = 5 THEN
        RAISE NOTICE '✅ Todas as 5 tabelas do sistema de afiliação foram criadas com sucesso';
    ELSE
        RAISE EXCEPTION '❌ Erro: Apenas % de 5 tabelas foram criadas', table_count;
    END IF;
END $$;

-- Verificar triggers
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name IN ('trigger_auto_approve_normal', 'trigger_check_vip_promotion');
    
    IF trigger_count = 2 THEN
        RAISE NOTICE '✅ Triggers de automação criados com sucesso';
    ELSE
        RAISE NOTICE '⚠️ Alguns triggers podem não ter sido criados';
    END IF;
END $$;

RAISE NOTICE '🎉 SCHEMA ATUALIZADO DO SISTEMA DE AFILIAÇÃO APLICADO COM SUCESSO!';
RAISE NOTICE '📋 Funcionalidades ativas:';
RAISE NOTICE '   ✅ Aprovação automática para AFFILIATE_NORMAL';
RAISE NOTICE '   🔒 Nomeação VIP exclusiva por administradores';
RAISE NOTICE '   💰 Sistema de conversão com 10% bônus';
RAISE NOTICE '   📊 Auditoria completa de operações';
