-- =================================================
-- 💰 MIGRAÇÃO: SISTEMA DE SALDO DEVEDOR E COMPENSAÇÃO
-- =================================================
-- Implementa funcionalidade para:
-- 1. Saldo devedor quando comissão > saldo disponível
-- 2. Compensação automática na próxima recarga
-- 3. Validação de saldo mínimo para novas operações

-- =========================================
-- 1. ADICIONAR CAMPOS DE SALDO DEVEDOR
-- =========================================

-- Verificar se as colunas já existem antes de adicionar
DO $$
BEGIN
    -- Adicionar campo de saldo devedor na tabela users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='saldo_devedor_brl') THEN
        ALTER TABLE users ADD COLUMN saldo_devedor_brl DECIMAL(15,2) DEFAULT 0.00 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='saldo_devedor_usd') THEN
        ALTER TABLE users ADD COLUMN saldo_devedor_usd DECIMAL(15,2) DEFAULT 0.00 NOT NULL;
    END IF;

    -- Adicionar campo para controle de bloqueio de operações por saldo insuficiente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='operacoes_bloqueadas') THEN
        ALTER TABLE users ADD COLUMN operacoes_bloqueadas BOOLEAN DEFAULT FALSE;
    END IF;

    -- Adicionar campos de auditoria
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='ultima_compensacao') THEN
        ALTER TABLE users ADD COLUMN ultima_compensacao TIMESTAMP NULL;
    END IF;

    -- Adicionar campos de saldo para compatibilidade (mapear para campos existentes)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='balance_brl') THEN
        -- Criar alias/view para compatibilidade com campos existentes
        CREATE OR REPLACE VIEW user_balances AS 
        SELECT 
            id,
            email,
            first_name || ' ' || last_name as full_name,
            COALESCE(prepaid_credits, 0) as balance_brl,
            COALESCE(account_balance_usd, 0) as balance_usd,
            COALESCE(commission_balance_brl, 0) as commission_balance,
            user_type,
            plan_type,
            enable_trading,
            saldo_devedor_brl,
            saldo_devedor_usd,
            operacoes_bloqueadas,
            ultima_compensacao
        FROM users;
    END IF;
END
$$;

-- =========================================
-- 2. TABELA DE HISTÓRICO DE DÍVIDAS
-- =========================================

CREATE TABLE IF NOT EXISTS user_debt_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    operation_id INTEGER, -- Referência à operação que gerou a dívida
    debt_type VARCHAR(50) NOT NULL, -- 'COMMISSION', 'PENALTY', 'OTHER'
    amount_brl DECIMAL(15,2) DEFAULT 0.00,
    amount_usd DECIMAL(15,2) DEFAULT 0.00,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'COMPENSATED', 'FORGIVEN'
    created_at TIMESTAMP DEFAULT NOW(),
    compensated_at TIMESTAMP NULL,
    compensation_recharge_id INTEGER NULL, -- ID da recarga que compensou
    metadata JSONB DEFAULT '{}'
);

-- =========================================
-- 3. TABELA DE COMPENSAÇÕES AUTOMÁTICAS
-- =========================================

CREATE TABLE IF NOT EXISTS debt_compensations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recharge_id INTEGER, -- ID da recarga
    debt_history_id INTEGER REFERENCES user_debt_history(id),
    amount_compensated_brl DECIMAL(15,2) DEFAULT 0.00,
    amount_compensated_usd DECIMAL(15,2) DEFAULT 0.00,
    compensation_rate DECIMAL(5,2) DEFAULT 100.00, -- % da recarga usada para compensação
    remaining_debt_brl DECIMAL(15,2) DEFAULT 0.00,
    remaining_debt_usd DECIMAL(15,2) DEFAULT 0.00,
    processed_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- =========================================
-- 4. TABELA DE CONFIGURAÇÕES SALDO MÍNIMO
-- =========================================

CREATE TABLE IF NOT EXISTS minimum_balance_config (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(50) NOT NULL, -- 'BASIC', 'PREMIUM', 'VIP', 'ENTERPRISE'
    country_code VARCHAR(3) NOT NULL, -- 'BRL', 'USD'
    minimum_amount DECIMAL(15,2) NOT NULL,
    applies_to VARCHAR(20) NOT NULL DEFAULT 'NEW_OPERATIONS', -- 'NEW_OPERATIONS', 'ALL_OPERATIONS'
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir configurações padrão de saldo mínimo
INSERT INTO minimum_balance_config (user_type, country_code, minimum_amount, applies_to) VALUES
('BASIC', 'BRL', 100.00, 'NEW_OPERATIONS'),
('BASIC', 'USD', 20.00, 'NEW_OPERATIONS'),
('PREMIUM', 'BRL', 50.00, 'NEW_OPERATIONS'),
('PREMIUM', 'USD', 10.00, 'NEW_OPERATIONS'),
('VIP', 'BRL', 25.00, 'NEW_OPERATIONS'),
('VIP', 'USD', 5.00, 'NEW_OPERATIONS'),
('ENTERPRISE', 'BRL', 500.00, 'NEW_OPERATIONS'),
('ENTERPRISE', 'USD', 100.00, 'NEW_OPERATIONS')
ON CONFLICT DO NOTHING;

-- =========================================
-- 5. FUNÇÃO: REGISTRAR SALDO DEVEDOR
-- =========================================

CREATE OR REPLACE FUNCTION registrar_saldo_devedor(
    p_user_id UUID,
    p_operation_id INTEGER,
    p_commission_amount_brl DECIMAL(15,2) DEFAULT 0,
    p_commission_amount_usd DECIMAL(15,2) DEFAULT 0,
    p_reason TEXT DEFAULT 'Comissão sem saldo suficiente'
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_debt_id INTEGER;
    v_current_balance_brl DECIMAL(15,2);
    v_current_balance_usd DECIMAL(15,2);
    v_debt_brl DECIMAL(15,2) := 0;
    v_debt_usd DECIMAL(15,2) := 0;
BEGIN
    -- Obter saldo atual do usuário (usando campos reais)
    SELECT COALESCE(prepaid_credits, 0), COALESCE(account_balance_usd, 0) 
    INTO v_current_balance_brl, v_current_balance_usd
    FROM users WHERE id = p_user_id;

    -- Calcular dívida em BRL
    IF p_commission_amount_brl > 0 AND v_current_balance_brl < p_commission_amount_brl THEN
        v_debt_brl := p_commission_amount_brl - v_current_balance_brl;
        -- Zerar saldo BRL
        UPDATE users SET prepaid_credits = 0 WHERE id = p_user_id;
    ELSIF p_commission_amount_brl > 0 THEN
        -- Tem saldo suficiente em BRL
        UPDATE users SET prepaid_credits = prepaid_credits - p_commission_amount_brl WHERE id = p_user_id;
    END IF;

    -- Calcular dívida em USD
    IF p_commission_amount_usd > 0 AND v_current_balance_usd < p_commission_amount_usd THEN
        v_debt_usd := p_commission_amount_usd - v_current_balance_usd;
        -- Zerar saldo USD
        UPDATE users SET account_balance_usd = 0 WHERE id = p_user_id;
    ELSIF p_commission_amount_usd > 0 THEN
        -- Tem saldo suficiente em USD
        UPDATE users SET account_balance_usd = account_balance_usd - p_commission_amount_usd WHERE id = p_user_id;
    END IF;

    -- Se há dívida, registrar no histórico
    IF v_debt_brl > 0 OR v_debt_usd > 0 THEN
        -- Registrar dívida
        INSERT INTO user_debt_history (
            user_id, operation_id, debt_type, amount_brl, amount_usd, reason
        ) VALUES (
            p_user_id, p_operation_id, 'COMMISSION', v_debt_brl, v_debt_usd, p_reason
        ) RETURNING id INTO v_debt_id;

        -- Atualizar saldo devedor do usuário
        UPDATE users SET 
            saldo_devedor_brl = saldo_devedor_brl + v_debt_brl,
            saldo_devedor_usd = saldo_devedor_usd + v_debt_usd,
            operacoes_bloqueadas = (saldo_devedor_brl + v_debt_brl > 0 OR saldo_devedor_usd + v_debt_usd > 0)
        WHERE id = p_user_id;

        v_result := jsonb_build_object(
            'success', true,
            'debt_created', true,
            'debt_id', v_debt_id,
            'debt_brl', v_debt_brl,
            'debt_usd', v_debt_usd,
            'message', 'Saldo devedor registrado com sucesso'
        );
    ELSE
        v_result := jsonb_build_object(
            'success', true,
            'debt_created', false,
            'message', 'Comissão debitada sem criar dívida'
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 6. FUNÇÃO: COMPENSAR DÍVIDA NA RECARGA
-- =========================================

CREATE OR REPLACE FUNCTION compensar_divida_recarga(
    p_user_id UUID,
    p_recharge_amount_brl DECIMAL(15,2) DEFAULT 0,
    p_recharge_amount_usd DECIMAL(15,2) DEFAULT 0,
    p_recharge_id INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_debt_brl DECIMAL(15,2);
    v_debt_usd DECIMAL(15,2);
    v_compensation_brl DECIMAL(15,2) := 0;
    v_compensation_usd DECIMAL(15,2) := 0;
    v_remaining_brl DECIMAL(15,2) := 0;
    v_remaining_usd DECIMAL(15,2) := 0;
    v_debt_record RECORD;
BEGIN
    -- Obter saldo devedor atual
    SELECT saldo_devedor_brl, saldo_devedor_usd 
    INTO v_debt_brl, v_debt_usd
    FROM users WHERE id = p_user_id;

    -- Compensar dívida em BRL
    IF v_debt_brl > 0 AND p_recharge_amount_brl > 0 THEN
        IF p_recharge_amount_brl >= v_debt_brl THEN
            -- Recarga cobre toda a dívida BRL
            v_compensation_brl := v_debt_brl;
            v_remaining_brl := p_recharge_amount_brl - v_debt_brl;
        ELSE
            -- Recarga cobre parcialmente a dívida BRL
            v_compensation_brl := p_recharge_amount_brl;
            v_remaining_brl := 0;
        END IF;
    ELSE
        v_remaining_brl := p_recharge_amount_brl;
    END IF;

    -- Compensar dívida em USD
    IF v_debt_usd > 0 AND p_recharge_amount_usd > 0 THEN
        IF p_recharge_amount_usd >= v_debt_usd THEN
            -- Recarga cobre toda a dívida USD
            v_compensation_usd := v_debt_usd;
            v_remaining_usd := p_recharge_amount_usd - v_debt_usd;
        ELSE
            -- Recarga cobre parcialmente a dívida USD
            v_compensation_usd := p_recharge_amount_usd;
            v_remaining_usd := 0;
        END IF;
    ELSE
        v_remaining_usd := p_recharge_amount_usd;
    END IF;

    -- Atualizar saldo do usuário (usando campos reais)
    UPDATE users SET 
        prepaid_credits = COALESCE(prepaid_credits, 0) + v_remaining_brl,
        account_balance_usd = COALESCE(account_balance_usd, 0) + v_remaining_usd,
        saldo_devedor_brl = GREATEST(0, saldo_devedor_brl - v_compensation_brl),
        saldo_devedor_usd = GREATEST(0, saldo_devedor_usd - v_compensation_usd),
        operacoes_bloqueadas = (GREATEST(0, saldo_devedor_brl - v_compensation_brl) > 0 OR 
                               GREATEST(0, saldo_devedor_usd - v_compensation_usd) > 0),
        ultima_compensacao = CASE WHEN v_compensation_brl > 0 OR v_compensation_usd > 0 THEN NOW() ELSE ultima_compensacao END
    WHERE id = p_user_id;

    -- Registrar compensação se houve
    IF v_compensation_brl > 0 OR v_compensation_usd > 0 THEN
        -- Marcar dívidas como compensadas
        UPDATE user_debt_history SET 
            status = CASE 
                WHEN (debt_type = 'COMMISSION' AND 
                     ((amount_brl > 0 AND v_compensation_brl >= amount_brl) OR
                      (amount_usd > 0 AND v_compensation_usd >= amount_usd) OR
                      (amount_brl = 0 AND amount_usd = 0))) THEN 'COMPENSATED'
                ELSE status 
            END,
            compensated_at = CASE 
                WHEN status != 'COMPENSATED' THEN NOW() 
                ELSE compensated_at 
            END,
            compensation_recharge_id = p_recharge_id
        WHERE user_id = p_user_id AND status = 'PENDING';

        -- Inserir registro de compensação
        INSERT INTO debt_compensations (
            user_id, recharge_id, amount_compensated_brl, amount_compensated_usd,
            remaining_debt_brl, remaining_debt_usd
        ) VALUES (
            p_user_id, p_recharge_id, v_compensation_brl, v_compensation_usd,
            GREATEST(0, v_debt_brl - v_compensation_brl),
            GREATEST(0, v_debt_usd - v_compensation_usd)
        );
    END IF;

    v_result := jsonb_build_object(
        'success', true,
        'compensation_applied', (v_compensation_brl > 0 OR v_compensation_usd > 0),
        'compensation_brl', v_compensation_brl,
        'compensation_usd', v_compensation_usd,
        'remaining_balance_brl', v_remaining_brl,
        'remaining_balance_usd', v_remaining_usd,
        'remaining_debt_brl', GREATEST(0, v_debt_brl - v_compensation_brl),
        'remaining_debt_usd', GREATEST(0, v_debt_usd - v_compensation_usd)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 7. FUNÇÃO: VERIFICAR SALDO MÍNIMO
-- =========================================

CREATE OR REPLACE FUNCTION verificar_saldo_minimo_operacao(
    p_user_id UUID,
    p_user_type VARCHAR(50) DEFAULT 'BASIC',
    p_country_code VARCHAR(3) DEFAULT 'BRL'
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_user_balance_brl DECIMAL(15,2);
    v_user_balance_usd DECIMAL(15,2);
    v_user_debt_brl DECIMAL(15,2);
    v_user_debt_usd DECIMAL(15,2);
    v_minimum_required DECIMAL(15,2);
    v_available_balance DECIMAL(15,2);
    v_can_operate BOOLEAN := FALSE;
    v_block_reason TEXT := '';
BEGIN
    -- Obter dados do usuário (usando campos reais)
    SELECT prepaid_credits, account_balance_usd, saldo_devedor_brl, saldo_devedor_usd, operacoes_bloqueadas
    INTO v_user_balance_brl, v_user_balance_usd, v_user_debt_brl, v_user_debt_usd
    FROM users WHERE id = p_user_id;

    -- Obter saldo mínimo necessário
    SELECT minimum_amount INTO v_minimum_required
    FROM minimum_balance_config 
    WHERE user_type = p_user_type AND country_code = p_country_code AND active = TRUE
    LIMIT 1;

    IF v_minimum_required IS NULL THEN
        v_minimum_required := CASE WHEN p_country_code = 'BRL' THEN 100.00 ELSE 20.00 END;
    END IF;

    -- Calcular saldo disponível baseado na moeda
    IF p_country_code = 'BRL' THEN
        v_available_balance := GREATEST(0, v_user_balance_brl);
    ELSE
        v_available_balance := GREATEST(0, v_user_balance_usd);
    END IF;

    -- Verificar se pode operar
    IF v_user_debt_brl > 0 OR v_user_debt_usd > 0 THEN
        v_can_operate := FALSE;
        v_block_reason := 'Usuário possui saldo devedor pendente';
    ELSIF v_available_balance < v_minimum_required THEN
        v_can_operate := FALSE;
        v_block_reason := FORMAT('Saldo insuficiente. Mínimo: %s %s, Atual: %s %s', 
                                v_minimum_required, p_country_code, 
                                v_available_balance, p_country_code);
    ELSE
        v_can_operate := TRUE;
        v_block_reason := '';
    END IF;

    v_result := jsonb_build_object(
        'can_operate', v_can_operate,
        'block_reason', v_block_reason,
        'minimum_required', v_minimum_required,
        'available_balance', v_available_balance,
        'debt_brl', v_user_debt_brl,
        'debt_usd', v_user_debt_usd,
        'currency', p_country_code
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 8. VIEW: DASHBOARD DE SALDOS DEVEDORES
-- =========================================

CREATE OR REPLACE VIEW dashboard_saldos_devedores AS
SELECT 
    u.id as user_id,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    u.email,
    u.prepaid_credits as balance_brl,
    u.account_balance_usd as balance_usd,
    u.saldo_devedor_brl,
    u.saldo_devedor_usd,
    u.operacoes_bloqueadas,
    u.ultima_compensacao,
    COUNT(udh.id) as total_dividas_pendentes,
    SUM(CASE WHEN udh.status = 'PENDING' THEN udh.amount_brl ELSE 0 END) as dividas_pendentes_brl,
    SUM(CASE WHEN udh.status = 'PENDING' THEN udh.amount_usd ELSE 0 END) as dividas_pendentes_usd,
    COUNT(dc.id) as total_compensacoes,
    SUM(dc.amount_compensated_brl) as total_compensado_brl,
    SUM(dc.amount_compensated_usd) as total_compensado_usd
FROM users u
LEFT JOIN user_debt_history udh ON u.id = udh.user_id
LEFT JOIN debt_compensations dc ON u.id = dc.user_id
WHERE u.saldo_devedor_brl > 0 OR u.saldo_devedor_usd > 0 OR udh.id IS NOT NULL
GROUP BY u.id, u.first_name, u.last_name, u.email, u.prepaid_credits, u.account_balance_usd, 
         u.saldo_devedor_brl, u.saldo_devedor_usd, u.operacoes_bloqueadas, u.ultima_compensacao
ORDER BY (u.saldo_devedor_brl + u.saldo_devedor_usd) DESC;

-- =========================================
-- 9. ÍNDICES PARA PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_users_saldo_devedor ON users(saldo_devedor_brl, saldo_devedor_usd);
CREATE INDEX IF NOT EXISTS idx_users_operacoes_bloqueadas ON users(operacoes_bloqueadas);
CREATE INDEX IF NOT EXISTS idx_debt_history_user_status ON user_debt_history(user_id, status);
CREATE INDEX IF NOT EXISTS idx_debt_history_operation ON user_debt_history(operation_id);
CREATE INDEX IF NOT EXISTS idx_debt_compensations_user ON debt_compensations(user_id);
CREATE INDEX IF NOT EXISTS idx_minimum_balance_type_country ON minimum_balance_config(user_type, country_code, active);

-- =========================================
-- 10. TRIGGERS PARA AUDITORIA
-- =========================================

-- Trigger para log de mudanças de saldo devedor
CREATE OR REPLACE FUNCTION log_debt_changes() RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.saldo_devedor_brl != NEW.saldo_devedor_brl OR OLD.saldo_devedor_usd != NEW.saldo_devedor_usd) THEN
        INSERT INTO user_debt_history (user_id, debt_type, amount_brl, amount_usd, reason) 
        VALUES (NEW.id, 'BALANCE_UPDATE', 
                NEW.saldo_devedor_brl - OLD.saldo_devedor_brl,
                NEW.saldo_devedor_usd - OLD.saldo_devedor_usd,
                'Atualização automática de saldo devedor');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger apenas se não existir
DROP TRIGGER IF EXISTS trigger_debt_changes ON users;
CREATE TRIGGER trigger_debt_changes 
    AFTER UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION log_debt_changes();

-- =========================================
-- ✅ MIGRAÇÃO CONCLUÍDA
-- =========================================

-- =========================================
-- 12. FINALIZAÇÃO DA MIGRAÇÃO
-- =========================================

-- Comentário: Log de migração removido (tabela system_migrations não existe)
-- INSERT INTO system_migrations seria feito aqui se a tabela existisse

SELECT '✅ MIGRAÇÃO SALDO DEVEDOR CONCLUÍDA' as status;
