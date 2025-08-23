-- ===============================================
-- 📋 SISTEMA DE ACEITE DE TERMOS E POLÍTICAS
-- ===============================================
-- Arquivo: migrate-terms-system.sql
-- Versão: 1.0.0
-- Data: 2025-08-22

-- 🎯 **OBJETIVO:**
-- Implementar sistema completo para:
-- ✅ Gerenciar versões de termos
-- ✅ Registrar aceites por usuário
-- ✅ Auditoria completa de compliance
-- ✅ Versionamento e histórico

BEGIN;

-- ===============================================
-- 📊 TABELA: terms_versions
-- ===============================================
-- Armazena diferentes versões dos termos e políticas

CREATE TABLE IF NOT EXISTS terms_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    terms_content TEXT NOT NULL,
    privacy_policy TEXT NOT NULL,
    effective_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    is_active BOOLEAN DEFAULT false,
    
    -- Metadados para auditoria
    metadata JSONB DEFAULT '{}',
    
    -- Controle de versão
    previous_version_id INTEGER REFERENCES terms_versions(id),
    
    -- Índices para performance
    INDEX idx_terms_version (version),
    INDEX idx_terms_active (is_active),
    INDEX idx_terms_effective_date (effective_date)
);

-- ===============================================
-- 📊 TABELA: user_terms_acceptance
-- ===============================================
-- Registra todos os aceites de termos por usuário

CREATE TABLE IF NOT EXISTS user_terms_acceptance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    terms_version_id INTEGER NOT NULL REFERENCES terms_versions(id),
    
    -- Dados do aceite
    accepted_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    -- Metadados do aceite
    metadata JSONB DEFAULT '{}',
    
    -- Controle de versão
    is_current BOOLEAN DEFAULT true,
    superseded_at TIMESTAMP NULL,
    superseded_by INTEGER REFERENCES user_terms_acceptance(id),
    
    -- Dados de auditoria
    browser_fingerprint VARCHAR(255),
    session_id VARCHAR(255),
    
    -- Chaves estrangeiras
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices para performance
    INDEX idx_user_terms_user_id (user_id),
    INDEX idx_user_terms_version (terms_version_id),
    INDEX idx_user_terms_current (is_current),
    INDEX idx_user_terms_accepted_at (accepted_at),
    
    -- Constraint única para aceite atual
    UNIQUE (user_id, terms_version_id, is_current) WHERE is_current = true
);

-- ===============================================
-- 📊 TABELA: terms_acceptance_log
-- ===============================================
-- Log completo de todas as ações relacionadas a termos

CREATE TABLE IF NOT EXISTS terms_acceptance_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    terms_version_id INTEGER,
    action VARCHAR(50) NOT NULL, -- 'ACCEPTED', 'REJECTED', 'VIEWED', 'SUPERSEDED'
    
    -- Dados do evento
    occurred_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    -- Contexto da ação
    context JSONB DEFAULT '{}',
    
    -- Referência ao aceite (se aplicável)
    acceptance_id INTEGER REFERENCES user_terms_acceptance(id),
    
    -- Índices
    INDEX idx_terms_log_user_id (user_id),
    INDEX idx_terms_log_occurred_at (occurred_at),
    INDEX idx_terms_log_action (action)
);

-- ===============================================
-- 🛡️ FUNÇÕES DE TRIGGER
-- ===============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para terms_versions
CREATE TRIGGER update_terms_versions_updated_at 
    BEFORE UPDATE ON terms_versions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 🔧 FUNÇÃO: Registrar Aceite de Termos
-- ===============================================

CREATE OR REPLACE FUNCTION register_terms_acceptance(
    p_user_id INTEGER,
    p_terms_version_id INTEGER,
    p_ip_address INET,
    p_user_agent TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    v_acceptance_id INTEGER;
    v_current_version_id INTEGER;
BEGIN
    -- Verificar se já existe aceite atual para essa versão
    SELECT id INTO v_acceptance_id 
    FROM user_terms_acceptance 
    WHERE user_id = p_user_id 
    AND terms_version_id = p_terms_version_id 
    AND is_current = true;
    
    -- Se já existe, retornar o ID existente
    IF v_acceptance_id IS NOT NULL THEN
        RETURN v_acceptance_id;
    END IF;
    
    -- Marcar aceites anteriores como superseded
    UPDATE user_terms_acceptance 
    SET is_current = false, 
        superseded_at = NOW()
    WHERE user_id = p_user_id 
    AND is_current = true;
    
    -- Inserir novo aceite
    INSERT INTO user_terms_acceptance (
        user_id, 
        terms_version_id, 
        ip_address, 
        user_agent, 
        metadata,
        browser_fingerprint,
        session_id
    ) VALUES (
        p_user_id,
        p_terms_version_id,
        p_ip_address,
        p_user_agent,
        p_metadata,
        md5(p_user_agent || p_ip_address::text),
        gen_random_uuid()::text
    ) RETURNING id INTO v_acceptance_id;
    
    -- Log da ação
    INSERT INTO terms_acceptance_log (
        user_id,
        terms_version_id,
        action,
        ip_address,
        user_agent,
        context,
        acceptance_id
    ) VALUES (
        p_user_id,
        p_terms_version_id,
        'ACCEPTED',
        p_ip_address,
        p_user_agent,
        p_metadata,
        v_acceptance_id
    );
    
    RETURN v_acceptance_id;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 🔧 FUNÇÃO: Verificar Status de Aceite
-- ===============================================

CREATE OR REPLACE FUNCTION check_user_terms_status(p_user_id INTEGER)
RETURNS TABLE (
    needs_acceptance BOOLEAN,
    current_version VARCHAR,
    accepted_version VARCHAR,
    accepted_at TIMESTAMP
) AS $$
DECLARE
    v_current_version_id INTEGER;
    v_user_accepted_version_id INTEGER;
    v_result RECORD;
BEGIN
    -- Obter versão atual ativa
    SELECT id, version INTO v_current_version_id, v_result.current_version
    FROM terms_versions 
    WHERE is_active = true 
    ORDER BY effective_date DESC 
    LIMIT 1;
    
    -- Verificar se usuário tem aceite atual
    SELECT tv.version, uta.accepted_at 
    INTO v_result.accepted_version, v_result.accepted_at
    FROM user_terms_acceptance uta
    JOIN terms_versions tv ON uta.terms_version_id = tv.id
    WHERE uta.user_id = p_user_id 
    AND uta.is_current = true;
    
    -- Determinar se precisa aceitar
    v_result.needs_acceptance := (
        v_result.accepted_version IS NULL OR 
        v_result.accepted_version != v_result.current_version
    );
    
    RETURN QUERY SELECT 
        v_result.needs_acceptance,
        v_result.current_version,
        v_result.accepted_version,
        v_result.accepted_at;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 📊 INSERIR VERSÃO INICIAL DOS TERMOS
-- ===============================================

INSERT INTO terms_versions (
    version,
    title,
    terms_content,
    privacy_policy,
    effective_date,
    is_active,
    metadata
) VALUES (
    '1.0.0',
    'Termos de Uso e Política de Privacidade - CoinBitClub',
    'TERMOS DE USO COINBITCLUB MARKET BOT

1. ACEITE DOS TERMOS
Ao utilizar nossa plataforma de trading automatizado, você concorda integralmente com estes termos.

2. DESCRIÇÃO DO SERVIÇO
Nossa plataforma oferece serviços de trading automatizado em criptomoedas através de algoritmos avançados.

3. RISCOS E RESPONSABILIDADES
- Trading de criptomoedas envolve riscos significativos
- Você é responsável por suas decisões de investimento
- Não garantimos lucros ou resultados específicos

4. DADOS E PRIVACIDADE
Coletamos e processamos seus dados conforme nossa política de privacidade.

5. LIMITAÇÃO DE RESPONSABILIDADE
Nossa responsabilidade é limitada conforme permitido por lei.

6. MODIFICAÇÕES
Podemos alterar estes termos a qualquer momento, notificando usuários ativos.',
    
    'POLÍTICA DE PRIVACIDADE COINBITCLUB

1. COLETA DE DADOS
Coletamos informações necessárias para fornecer nossos serviços de trading.

2. USO DOS DADOS
- Executar ordens de trading
- Melhorar nossos algoritmos
- Cumprir obrigações legais
- Comunicações de serviço

3. COMPARTILHAMENTO
Não compartilhamos dados pessoais com terceiros, exceto quando exigido por lei.

4. SEGURANÇA
Implementamos medidas robustas de segurança para proteger seus dados.

5. SEUS DIREITOS
Você tem direito de acessar, corrigir ou excluir seus dados pessoais.

6. CONTATO
Para questões sobre privacidade, entre em contato conosco.',
    
    NOW(),
    true,
    '{"created_by": "system", "initial_version": true}'
) ON CONFLICT (version) DO NOTHING;

-- ===============================================
-- 📊 VIEWS PARA CONSULTAS COMUNS
-- ===============================================

-- View: Status de aceite por usuário
CREATE OR REPLACE VIEW v_user_terms_status AS
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as user_created_at,
    tv_current.version as current_terms_version,
    tv_accepted.version as accepted_terms_version,
    uta.accepted_at,
    uta.ip_address as acceptance_ip,
    CASE 
        WHEN tv_accepted.version IS NULL THEN true
        WHEN tv_accepted.version != tv_current.version THEN true
        ELSE false
    END as needs_acceptance
FROM users u
CROSS JOIN (
    SELECT * FROM terms_versions 
    WHERE is_active = true 
    ORDER BY effective_date DESC 
    LIMIT 1
) tv_current
LEFT JOIN user_terms_acceptance uta ON (
    uta.user_id = u.id AND uta.is_current = true
)
LEFT JOIN terms_versions tv_accepted ON tv_accepted.id = uta.terms_version_id;

-- View: Relatório de compliance
CREATE OR REPLACE VIEW v_terms_compliance_report AS
SELECT 
    tv.version,
    tv.title,
    tv.effective_date,
    tv.is_active,
    COUNT(uta.id) as total_acceptances,
    COUNT(DISTINCT uta.user_id) as unique_users_accepted,
    MIN(uta.accepted_at) as first_acceptance,
    MAX(uta.accepted_at) as last_acceptance
FROM terms_versions tv
LEFT JOIN user_terms_acceptance uta ON tv.id = uta.terms_version_id
GROUP BY tv.id, tv.version, tv.title, tv.effective_date, tv.is_active
ORDER BY tv.effective_date DESC;

-- ===============================================
-- ✅ FINALIZAÇÃO
-- ===============================================

COMMIT;

-- Comentário de sucesso
COMMENT ON TABLE terms_versions IS 'Armazena versões dos termos de uso e políticas de privacidade';
COMMENT ON TABLE user_terms_acceptance IS 'Registra aceites de termos por usuário com auditoria completa';
COMMENT ON TABLE terms_acceptance_log IS 'Log de todas as ações relacionadas a termos e políticas';

-- ===============================================
-- 📋 RELATÓRIO DE INSTALAÇÃO
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE '✅ SISTEMA DE TERMOS E POLÍTICAS INSTALADO COM SUCESSO!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tabelas criadas:';
    RAISE NOTICE '   - terms_versions (versões de termos)';
    RAISE NOTICE '   - user_terms_acceptance (aceites por usuário)';
    RAISE NOTICE '   - terms_acceptance_log (log de auditoria)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Funções criadas:';
    RAISE NOTICE '   - register_terms_acceptance() (registrar aceite)';
    RAISE NOTICE '   - check_user_terms_status() (verificar status)';
    RAISE NOTICE '';
    RAISE NOTICE '📈 Views criadas:';
    RAISE NOTICE '   - v_user_terms_status (status por usuário)';
    RAISE NOTICE '   - v_terms_compliance_report (relatório compliance)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Próximo passo: Implementar APIs de backend';
END $$;
