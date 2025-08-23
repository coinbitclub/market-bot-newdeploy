/**
 * ===============================================
 * 🏦 MIGRAÇÃO: SISTEMA DE TAXA DE SAQUE
 * ===============================================
 * CoinBitClub Market Bot - Enterprise Enhancement
 * Implementação de taxa obrigatória para saques
 * 
 * 📋 REQUISITOS:
 * • Taxa BRL: R$ 10,00 por saque
 * • Taxa USD: $ 2,00 por saque
 * • Validação: Saldo deve cobrir valor + taxa
 * • Sem saque mínimo se saldo > taxa
 * • Cobrança automática na aprovação
 * • Auditoria completa das taxas
 */

-- =========================================
-- 1. TABELA: CONFIGURAÇÃO DE TAXAS
-- =========================================

CREATE TABLE IF NOT EXISTS withdrawal_fees_config (
    id SERIAL PRIMARY KEY,
    currency VARCHAR(3) NOT NULL, -- 'BRL' ou 'USD'
    fee_amount DECIMAL(15,2) NOT NULL,
    fee_type VARCHAR(20) DEFAULT 'FIXED', -- 'FIXED' ou 'PERCENTAGE'
    min_withdrawal DECIMAL(15,2) DEFAULT 0.00,
    max_withdrawal DECIMAL(15,2) DEFAULT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT unique_active_currency UNIQUE (currency, active) DEFERRABLE INITIALLY DEFERRED
);

-- Comentário para constraint: Apenas uma configuração ativa por moeda
COMMENT ON TABLE withdrawal_fees_config IS 'Configuração de taxas de saque por moeda';
COMMENT ON COLUMN withdrawal_fees_config.currency IS 'Moeda da taxa (BRL ou USD)';
COMMENT ON COLUMN withdrawal_fees_config.fee_amount IS 'Valor da taxa fixa';
COMMENT ON COLUMN withdrawal_fees_config.min_withdrawal IS 'Valor mínimo de saque (0 = sem mínimo se saldo > taxa)';

-- =========================================
-- 2. TABELA: LOG DE TAXAS COBRADAS
-- =========================================

CREATE TABLE IF NOT EXISTS withdrawal_fees_charged (
    id SERIAL PRIMARY KEY,
    withdrawal_id INTEGER NOT NULL, -- Referência ao saque
    user_id UUID NOT NULL REFERENCES users(id),
    currency VARCHAR(3) NOT NULL,
    withdrawal_amount DECIMAL(15,2) NOT NULL,
    fee_amount DECIMAL(15,2) NOT NULL,
    total_charged DECIMAL(15,2) NOT NULL, -- withdrawal_amount + fee_amount
    fee_config_id INTEGER REFERENCES withdrawal_fees_config(id),
    charged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    charged_by UUID REFERENCES users(id), -- Admin que aprovou
    transaction_id VARCHAR(100), -- ID da transação bancária
    metadata JSONB DEFAULT '{}'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_fees_user_id ON withdrawal_fees_charged(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_fees_charged_at ON withdrawal_fees_charged(charged_at);
CREATE INDEX IF NOT EXISTS idx_withdrawal_fees_currency ON withdrawal_fees_charged(currency);
CREATE INDEX IF NOT EXISTS idx_withdrawal_fees_withdrawal_id ON withdrawal_fees_charged(withdrawal_id);

COMMENT ON TABLE withdrawal_fees_charged IS 'Log de todas as taxas de saque cobradas';
COMMENT ON COLUMN withdrawal_fees_charged.total_charged IS 'Valor total debitado (saque + taxa)';

-- =========================================
-- 3. ATUALIZAR TABELA USERS (se necessário)
-- =========================================

-- Adicionar campos de controle de saque se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='total_withdrawal_fees_brl') THEN
        ALTER TABLE users ADD COLUMN total_withdrawal_fees_brl DECIMAL(15,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='total_withdrawal_fees_usd') THEN
        ALTER TABLE users ADD COLUMN total_withdrawal_fees_usd DECIMAL(15,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_withdrawal_at') THEN
        ALTER TABLE users ADD COLUMN last_withdrawal_at TIMESTAMP NULL;
    END IF;
END $$;

COMMENT ON COLUMN users.total_withdrawal_fees_brl IS 'Total de taxas de saque pagas em BRL';
COMMENT ON COLUMN users.total_withdrawal_fees_usd IS 'Total de taxas de saque pagas em USD';

-- =========================================
-- 4. INSERIR CONFIGURAÇÃO INICIAL DE TAXAS
-- =========================================

-- Taxa para BRL: R$ 10,00
INSERT INTO withdrawal_fees_config (currency, fee_amount, fee_type, min_withdrawal, active, created_by)
VALUES ('BRL', 10.00, 'FIXED', 0.00, true, 
    (SELECT id FROM users WHERE email = 'admin@marketbot.com' OR first_name = 'Admin' LIMIT 1))
ON CONFLICT (currency, active) DO UPDATE SET
    fee_amount = EXCLUDED.fee_amount,
    updated_at = CURRENT_TIMESTAMP;

-- Taxa para USD: $ 2,00
INSERT INTO withdrawal_fees_config (currency, fee_amount, fee_type, min_withdrawal, active, created_by)
VALUES ('USD', 2.00, 'FIXED', 0.00, true, 
    (SELECT id FROM users WHERE email = 'admin@marketbot.com' OR first_name = 'Admin' LIMIT 1))
ON CONFLICT (currency, active) DO UPDATE SET
    fee_amount = EXCLUDED.fee_amount,
    updated_at = CURRENT_TIMESTAMP;

-- =========================================
-- 5. FUNÇÃO: CALCULAR TAXA DE SAQUE
-- =========================================

CREATE OR REPLACE FUNCTION calculate_withdrawal_fee(
    p_currency VARCHAR(3),
    p_withdrawal_amount DECIMAL(15,2)
) RETURNS JSONB AS $$
DECLARE
    v_fee_config RECORD;
    v_result JSONB;
BEGIN
    -- Obter configuração ativa da taxa
    SELECT * INTO v_fee_config
    FROM withdrawal_fees_config 
    WHERE currency = p_currency AND active = true
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Configuração de taxa não encontrada para ' || p_currency,
            'fee_amount', 0,
            'total_amount', p_withdrawal_amount
        );
    END IF;
    
    -- Calcular taxa
    v_result := jsonb_build_object(
        'success', true,
        'currency', p_currency,
        'withdrawal_amount', p_withdrawal_amount,
        'fee_amount', v_fee_config.fee_amount,
        'fee_type', v_fee_config.fee_type,
        'total_amount', p_withdrawal_amount + v_fee_config.fee_amount,
        'min_withdrawal', v_fee_config.min_withdrawal,
        'config_id', v_fee_config.id
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_withdrawal_fee IS 'Calcula taxa de saque para uma moeda específica';

-- =========================================
-- 6. FUNÇÃO: VALIDAR SAQUE COM TAXA
-- =========================================

CREATE OR REPLACE FUNCTION validate_withdrawal_with_fee(
    p_user_id UUID,
    p_currency VARCHAR(3),
    p_withdrawal_amount DECIMAL(15,2)
) RETURNS JSONB AS $$
DECLARE
    v_user_balance DECIMAL(15,2);
    v_fee_calculation JSONB;
    v_total_needed DECIMAL(15,2);
    v_result JSONB;
    v_field_name TEXT;
BEGIN
    -- Determinar campo de saldo baseado na moeda
    IF p_currency = 'BRL' THEN
        v_field_name := 'prepaid_credits';
    ELSIF p_currency = 'USD' THEN
        v_field_name := 'account_balance_usd';
    ELSE
        RETURN jsonb_build_object(
            'can_withdraw', false,
            'error', 'Moeda não suportada: ' || p_currency
        );
    END IF;
    
    -- Obter saldo do usuário
    EXECUTE format('SELECT COALESCE(%I, 0) FROM users WHERE id = $1', v_field_name)
    INTO v_user_balance
    USING p_user_id;
    
    IF v_user_balance IS NULL THEN
        RETURN jsonb_build_object(
            'can_withdraw', false,
            'error', 'Usuário não encontrado'
        );
    END IF;
    
    -- Calcular taxa
    v_fee_calculation := calculate_withdrawal_fee(p_currency, p_withdrawal_amount);
    
    IF NOT (v_fee_calculation->>'success')::boolean THEN
        RETURN jsonb_build_object(
            'can_withdraw', false,
            'error', v_fee_calculation->>'error'
        );
    END IF;
    
    v_total_needed := (v_fee_calculation->>'total_amount')::decimal;
    
    -- Validar se há saldo suficiente
    v_result := jsonb_build_object(
        'can_withdraw', v_user_balance >= v_total_needed,
        'user_balance', v_user_balance,
        'withdrawal_amount', p_withdrawal_amount,
        'fee_amount', (v_fee_calculation->>'fee_amount')::decimal,
        'total_needed', v_total_needed,
        'remaining_balance', v_user_balance - v_total_needed,
        'currency', p_currency,
        'min_withdrawal', (v_fee_calculation->>'min_withdrawal')::decimal,
        'validation_passed', v_user_balance >= v_total_needed AND p_withdrawal_amount > 0,
        'fee_config_id', (v_fee_calculation->>'config_id')::integer
    );
    
    -- Adicionar motivos de falha se aplicável
    IF NOT (v_result->>'can_withdraw')::boolean THEN
        IF v_user_balance < v_total_needed THEN
            v_result := v_result || jsonb_build_object(
                'failure_reason', format('Saldo insuficiente. Necessário: %s %s (Saque: %s + Taxa: %s), Disponível: %s %s',
                    v_total_needed, p_currency,
                    p_withdrawal_amount, (v_fee_calculation->>'fee_amount')::decimal,
                    v_user_balance, p_currency)
            );
        END IF;
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_withdrawal_with_fee IS 'Valida se usuário pode sacar considerando taxa obrigatória';

-- =========================================
-- 7. FUNÇÃO: PROCESSAR SAQUE COM TAXA
-- =========================================

CREATE OR REPLACE FUNCTION process_withdrawal_with_fee(
    p_user_id UUID,
    p_currency VARCHAR(3),
    p_withdrawal_amount DECIMAL(15,2),
    p_approved_by UUID,
    p_withdrawal_id INTEGER DEFAULT NULL,
    p_transaction_id VARCHAR(100) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_validation JSONB;
    v_fee_amount DECIMAL(15,2);
    v_total_amount DECIMAL(15,2);
    v_field_name TEXT;
    v_fee_field TEXT;
    v_charge_id INTEGER;
    v_result JSONB;
BEGIN
    -- Validar saque
    v_validation := validate_withdrawal_with_fee(p_user_id, p_currency, p_withdrawal_amount);
    
    IF NOT (v_validation->>'can_withdraw')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Validação de saque falhou',
            'validation_details', v_validation
        );
    END IF;
    
    v_fee_amount := (v_validation->>'fee_amount')::decimal;
    v_total_amount := (v_validation->>'total_needed')::decimal;
    
    -- Determinar campos de atualização
    IF p_currency = 'BRL' THEN
        v_field_name := 'prepaid_credits';
        v_fee_field := 'total_withdrawal_fees_brl';
    ELSIF p_currency = 'USD' THEN
        v_field_name := 'account_balance_usd';
        v_fee_field := 'total_withdrawal_fees_usd';
    END IF;
    
    -- Atualizar saldo do usuário
    EXECUTE format(
        'UPDATE users SET %I = %I - $1, %I = COALESCE(%I, 0) + $2, last_withdrawal_at = CURRENT_TIMESTAMP WHERE id = $3',
        v_field_name, v_field_name, v_fee_field, v_fee_field
    ) USING v_total_amount, v_fee_amount, p_user_id;
    
    -- Registrar cobrança da taxa
    INSERT INTO withdrawal_fees_charged (
        withdrawal_id, user_id, currency, withdrawal_amount, fee_amount, 
        total_charged, fee_config_id, charged_by, transaction_id,
        metadata
    ) VALUES (
        p_withdrawal_id, p_user_id, p_currency, p_withdrawal_amount, v_fee_amount,
        v_total_amount, (v_validation->>'fee_config_id')::integer, p_approved_by, p_transaction_id,
        jsonb_build_object(
            'processed_at', CURRENT_TIMESTAMP,
            'validation_data', v_validation,
            'original_balance', (v_validation->>'user_balance')::decimal,
            'remaining_balance', (v_validation->>'remaining_balance')::decimal
        )
    ) RETURNING id INTO v_charge_id;
    
    v_result := jsonb_build_object(
        'success', true,
        'withdrawal_processed', true,
        'withdrawal_amount', p_withdrawal_amount,
        'fee_charged', v_fee_amount,
        'total_debited', v_total_amount,
        'remaining_balance', (v_validation->>'remaining_balance')::decimal,
        'charge_id', v_charge_id,
        'transaction_id', p_transaction_id,
        'processed_at', CURRENT_TIMESTAMP
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_withdrawal_with_fee IS 'Processa saque debitando valor + taxa automaticamente';

-- =========================================
-- 8. VIEW: DASHBOARD DE TAXAS DE SAQUE
-- =========================================

CREATE OR REPLACE VIEW dashboard_withdrawal_fees AS
SELECT 
    u.id as user_id,
    CONCAT(u.first_name, ' ', u.last_name) as user_name,
    u.email,
    wfc.currency,
    COUNT(wfc.id) as total_withdrawals,
    SUM(wfc.withdrawal_amount) as total_withdrawn,
    SUM(wfc.fee_amount) as total_fees_paid,
    SUM(wfc.total_charged) as total_charged,
    AVG(wfc.fee_amount) as avg_fee_paid,
    MAX(wfc.charged_at) as last_withdrawal_date,
    u.total_withdrawal_fees_brl,
    u.total_withdrawal_fees_usd
FROM users u
LEFT JOIN withdrawal_fees_charged wfc ON u.id = wfc.user_id
WHERE wfc.id IS NOT NULL
GROUP BY u.id, u.first_name, u.last_name, u.email, wfc.currency, 
         u.total_withdrawal_fees_brl, u.total_withdrawal_fees_usd
ORDER BY total_fees_paid DESC;

COMMENT ON VIEW dashboard_withdrawal_fees IS 'Dashboard administrativo de taxas de saque por usuário';

-- =========================================
-- 9. VIEW: RELATÓRIO DE RECEITA DE TAXAS
-- =========================================

CREATE OR REPLACE VIEW withdrawal_fees_revenue_report AS
SELECT 
    DATE_TRUNC('month', charged_at) as month,
    currency,
    COUNT(*) as withdrawals_count,
    SUM(withdrawal_amount) as total_withdrawn,
    SUM(fee_amount) as total_fees_collected,
    AVG(fee_amount) as avg_fee_per_withdrawal,
    MIN(fee_amount) as min_fee,
    MAX(fee_amount) as max_fee
FROM withdrawal_fees_charged
GROUP BY DATE_TRUNC('month', charged_at), currency
ORDER BY month DESC, currency;

COMMENT ON VIEW withdrawal_fees_revenue_report IS 'Relatório mensal de receita com taxas de saque';

-- =========================================
-- 10. ÍNDICES PARA PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_withdrawal_fees_config_currency_active 
ON withdrawal_fees_config(currency, active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_withdrawal_fees_charged_user_currency 
ON withdrawal_fees_charged(user_id, currency);

CREATE INDEX IF NOT EXISTS idx_withdrawal_fees_charged_date_currency 
ON withdrawal_fees_charged(charged_at, currency);

CREATE INDEX IF NOT EXISTS idx_users_withdrawal_totals 
ON users(total_withdrawal_fees_brl, total_withdrawal_fees_usd) 
WHERE total_withdrawal_fees_brl > 0 OR total_withdrawal_fees_usd > 0;

-- =========================================
-- 11. TRIGGERS PARA AUDITORIA
-- =========================================

-- Trigger para atualizar updated_at em withdrawal_fees_config
CREATE OR REPLACE FUNCTION update_withdrawal_fees_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_withdrawal_fees_config_timestamp
    BEFORE UPDATE ON withdrawal_fees_config
    FOR EACH ROW
    EXECUTE FUNCTION update_withdrawal_fees_config_timestamp();

-- =========================================
-- 12. FUNÇÃO: RELATÓRIO DE USUÁRIO
-- =========================================

CREATE OR REPLACE FUNCTION get_user_withdrawal_fees_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_summary JSONB;
    v_recent_withdrawals JSONB;
BEGIN
    -- Obter dados do usuário
    SELECT 
        first_name, last_name, email,
        prepaid_credits, account_balance_usd,
        total_withdrawal_fees_brl, total_withdrawal_fees_usd,
        last_withdrawal_at
    INTO v_user
    FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Usuário não encontrado');
    END IF;
    
    -- Obter últimos 5 saques
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', charged_at,
            'currency', currency,
            'withdrawal_amount', withdrawal_amount,
            'fee_amount', fee_amount,
            'total_charged', total_charged,
            'transaction_id', transaction_id
        ) ORDER BY charged_at DESC
    ) INTO v_recent_withdrawals
    FROM withdrawal_fees_charged 
    WHERE user_id = p_user_id
    LIMIT 5;
    
    -- Montar resumo
    v_summary := jsonb_build_object(
        'user_info', jsonb_build_object(
            'name', v_user.first_name || ' ' || v_user.last_name,
            'email', v_user.email
        ),
        'balances', jsonb_build_object(
            'brl', v_user.prepaid_credits,
            'usd', v_user.account_balance_usd
        ),
        'withdrawal_fees_totals', jsonb_build_object(
            'brl', v_user.total_withdrawal_fees_brl,
            'usd', v_user.total_withdrawal_fees_usd
        ),
        'last_withdrawal_at', v_user.last_withdrawal_at,
        'recent_withdrawals', COALESCE(v_recent_withdrawals, '[]'::jsonb),
        'current_fees', jsonb_build_object(
            'brl', (SELECT fee_amount FROM withdrawal_fees_config WHERE currency = 'BRL' AND active = true),
            'usd', (SELECT fee_amount FROM withdrawal_fees_config WHERE currency = 'USD' AND active = true)
        )
    );
    
    RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_withdrawal_fees_summary IS 'Resumo completo de taxas de saque para um usuário';

-- =========================================
-- 13. LOGS DE MIGRAÇÃO
-- =========================================

-- Comentário: Sistema de taxa de saque implementado
-- Taxas configuradas: BRL R$ 10,00 | USD $ 2,00
-- Validação automática: Saldo deve cobrir valor + taxa
-- Sem valor mínimo de saque desde que saldo > taxa

SELECT '✅ MIGRAÇÃO DE TAXA DE SAQUE CONCLUÍDA' as status,
       'Taxas: BRL R$ 10,00 | USD $ 2,00' as fees_configured,
       'Sistema: Validação automática + Cobrança obrigatória' as features;
