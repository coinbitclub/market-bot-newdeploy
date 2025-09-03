-- =================================================================
-- 🏦 MIGRAÇÃO SISTEMA DE TAXA DE SAQUE - VERSÃO SIMPLIFICADA
-- =================================================================
-- CoinBitClub Market Bot - Withdrawal Fees Migration
-- Implementa cobrança automática de R$10 (BRL) e $2 (USD)

-- Tabela de configuração de taxas
CREATE TABLE IF NOT EXISTS withdrawal_fees_config (
    id SERIAL PRIMARY KEY,
    currency VARCHAR(3) NOT NULL,
    fee_amount DECIMAL(10,2) NOT NULL,
    fee_type VARCHAR(20) DEFAULT 'FIXED',
    min_withdrawal DECIMAL(10,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Tabela de log de taxas cobradas
CREATE TABLE IF NOT EXISTS withdrawal_fees_charged (
    id SERIAL PRIMARY KEY,
    withdrawal_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    currency VARCHAR(3) NOT NULL,
    withdrawal_amount DECIMAL(15,2) NOT NULL,
    fee_amount DECIMAL(10,2) NOT NULL,
    total_charged DECIMAL(15,2) NOT NULL,
    charged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    charged_by UUID,
    transaction_id VARCHAR(100),
    metadata JSONB DEFAULT '{}'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_fees_user_id ON withdrawal_fees_charged(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_fees_charged_at ON withdrawal_fees_charged(charged_at);
CREATE INDEX IF NOT EXISTS idx_withdrawal_fees_currency ON withdrawal_fees_charged(currency);

-- Colunas adicionais na tabela users (se necessário)
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_withdrawal_fees_brl DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_withdrawal_fees_usd DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_withdrawal_at TIMESTAMP NULL;

-- Configuração inicial das taxas
INSERT INTO withdrawal_fees_config (currency, fee_amount, fee_type, min_withdrawal, active) 
VALUES ('BRL', 10.00, 'FIXED', 0.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO withdrawal_fees_config (currency, fee_amount, fee_type, min_withdrawal, active)
VALUES ('USD', 2.00, 'FIXED', 0.00, true)
ON CONFLICT DO NOTHING;

-- Função para calcular taxa de saque
CREATE OR REPLACE FUNCTION calculate_withdrawal_fee(
    p_currency VARCHAR(3),
    p_amount DECIMAL(15,2)
) RETURNS JSONB AS $$
DECLARE
    v_config withdrawal_fees_config%ROWTYPE;
    v_result JSONB;
BEGIN
    -- Buscar configuração da taxa
    SELECT * INTO v_config 
    FROM withdrawal_fees_config 
    WHERE currency = p_currency AND active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Taxa não configurada para a moeda ' || p_currency
        );
    END IF;
    
    -- Calcular valores
    v_result := jsonb_build_object(
        'success', true,
        'currency', p_currency,
        'withdrawal_amount', p_amount,
        'fee_amount', v_config.fee_amount,
        'total_amount', p_amount + v_config.fee_amount,
        'fee_type', v_config.fee_type,
        'config_id', v_config.id
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Função para validar saque com taxa
CREATE OR REPLACE FUNCTION validate_withdrawal_with_fee(
    p_user_id UUID,
    p_currency VARCHAR(3),
    p_amount DECIMAL(15,2)
) RETURNS JSONB AS $$
DECLARE
    v_user users%ROWTYPE;
    v_calculation JSONB;
    v_balance DECIMAL(15,2);
    v_result JSONB;
BEGIN
    -- Buscar usuário
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'can_withdraw', false,
            'failure_reason', 'Usuário não encontrado'
        );
    END IF;
    
    -- Calcular taxa
    v_calculation := calculate_withdrawal_fee(p_currency, p_amount);
    
    IF (v_calculation->>'success')::boolean = false THEN
        RETURN v_calculation;
    END IF;
    
    -- Verificar saldo
    IF p_currency = 'BRL' THEN
        v_balance := COALESCE(v_user.prepaid_credits, 0);
    ELSE
        v_balance := COALESCE(v_user.account_balance_usd, 0);
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'can_withdraw', v_balance >= (v_calculation->>'total_amount')::decimal,
        'user_balance', v_balance,
        'required_amount', (v_calculation->>'total_amount')::decimal,
        'calculation', v_calculation
    );
    
    IF v_balance < (v_calculation->>'total_amount')::decimal THEN
        v_result := v_result || jsonb_build_object(
            'failure_reason', 'Saldo insuficiente'
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Função para processar saque com taxa
CREATE OR REPLACE FUNCTION process_withdrawal_with_fee(
    p_user_id UUID,
    p_currency VARCHAR(3),
    p_amount DECIMAL(15,2),
    p_approved_by UUID,
    p_withdrawal_id INTEGER DEFAULT NULL,
    p_transaction_id VARCHAR(100) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_validation JSONB;
    v_calculation JSONB;
    v_withdrawal_id INTEGER;
    v_result JSONB;
BEGIN
    -- Validar saque
    v_validation := validate_withdrawal_with_fee(p_user_id, p_currency, p_amount);
    
    IF (v_validation->>'can_withdraw')::boolean = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Saque não pode ser processado',
            'validation', v_validation
        );
    END IF;
    
    v_calculation := v_validation->'calculation';
    
    -- Gerar ID do saque se não fornecido
    v_withdrawal_id := COALESCE(p_withdrawal_id, nextval('withdrawal_fees_charged_id_seq'));
    
    -- Debitar do saldo do usuário
    IF p_currency = 'BRL' THEN
        UPDATE users 
        SET prepaid_credits = prepaid_credits - (v_calculation->>'total_amount')::decimal,
            total_withdrawal_fees_brl = COALESCE(total_withdrawal_fees_brl, 0) + (v_calculation->>'fee_amount')::decimal,
            last_withdrawal_at = CURRENT_TIMESTAMP
        WHERE id = p_user_id;
    ELSE
        UPDATE users 
        SET account_balance_usd = account_balance_usd - (v_calculation->>'total_amount')::decimal,
            total_withdrawal_fees_usd = COALESCE(total_withdrawal_fees_usd, 0) + (v_calculation->>'fee_amount')::decimal,
            last_withdrawal_at = CURRENT_TIMESTAMP
        WHERE id = p_user_id;
    END IF;
    
    -- Registrar taxa cobrada
    INSERT INTO withdrawal_fees_charged (
        withdrawal_id, user_id, currency, withdrawal_amount, fee_amount,
        total_charged, charged_by, transaction_id, metadata
    ) VALUES (
        v_withdrawal_id, p_user_id, p_currency, p_amount,
        (v_calculation->>'fee_amount')::decimal,
        (v_calculation->>'total_amount')::decimal,
        p_approved_by, p_transaction_id,
        jsonb_build_object(
            'processed_at', CURRENT_TIMESTAMP,
            'calculation', v_calculation
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'withdrawal_id', v_withdrawal_id,
        'amount_debited', (v_calculation->>'total_amount')::decimal,
        'fee_charged', (v_calculation->>'fee_amount')::decimal,
        'transaction_id', p_transaction_id
    );
END;
$$ LANGUAGE plpgsql;

-- View para dashboard administrativo
CREATE OR REPLACE VIEW dashboard_withdrawal_fees AS
SELECT 
    u.id as user_id,
    COUNT(wfc.id) as total_withdrawals,
    SUM(wfc.withdrawal_amount) as total_withdrawn,
    SUM(wfc.fee_amount) as total_fees_paid,
    MAX(wfc.charged_at) as last_withdrawal,
    wfc.currency
FROM users u
LEFT JOIN withdrawal_fees_charged wfc ON u.id = wfc.user_id
GROUP BY u.id, wfc.currency
HAVING COUNT(wfc.id) > 0
ORDER BY total_fees_paid DESC;

-- View para relatório de receita
CREATE OR REPLACE VIEW withdrawal_fees_revenue_report AS
SELECT 
    DATE_TRUNC('month', charged_at) as month,
    currency,
    COUNT(*) as withdrawals_count,
    SUM(withdrawal_amount) as total_withdrawn,
    SUM(fee_amount) as total_fees_collected,
    AVG(fee_amount) as average_fee
FROM withdrawal_fees_charged
GROUP BY DATE_TRUNC('month', charged_at), currency
ORDER BY month DESC, currency;

-- Comentários das tabelas
COMMENT ON TABLE withdrawal_fees_config IS 'Configuração de taxas de saque por moeda';
COMMENT ON TABLE withdrawal_fees_charged IS 'Log de todas as taxas de saque cobradas';
COMMENT ON COLUMN users.total_withdrawal_fees_brl IS 'Total de taxas pagas em BRL';
COMMENT ON COLUMN users.total_withdrawal_fees_usd IS 'Total de taxas pagas em USD';
