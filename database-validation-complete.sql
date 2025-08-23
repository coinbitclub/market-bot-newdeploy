-- ====================================
-- SISTEMA DE VALIDAÇÃO E ISOLAMENTO COMPLETO
-- Tabelas para chaves, saldos, limites e auditoria
-- ====================================

-- Tabela para bloqueios de ticker por usuário
CREATE TABLE IF NOT EXISTS ticker_blocks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    ticker VARCHAR(20) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    created_by INTEGER REFERENCES users(id)
);

-- Tabela para auditoria de validações de chaves
CREATE TABLE IF NOT EXISTS key_validation_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    exchange VARCHAR(20) NOT NULL,
    validation_result BOOLEAN NOT NULL,
    error_message TEXT,
    validation_time TIMESTAMP DEFAULT NOW(),
    cached BOOLEAN DEFAULT FALSE,
    response_time_ms INTEGER
);

-- Tabela para histórico de saldos
CREATE TABLE IF NOT EXISTS balance_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    balance_type VARCHAR(50) NOT NULL, -- 'balance_brl', 'balance_usd', 'prepaid_balance_usd', etc.
    previous_amount DECIMAL(15,2),
    new_amount DECIMAL(15,2),
    change_amount DECIMAL(15,2),
    change_reason VARCHAR(255),
    related_order_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para configurações de trading por usuário
CREATE TABLE IF NOT EXISTS user_trading_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
    max_positions INTEGER DEFAULT 2,
    daily_loss_limit_usd DECIMAL(10,2) DEFAULT 100.00,
    max_position_size_percent DECIMAL(5,2) DEFAULT 10.00, -- % do saldo
    leverage_multiplier DECIMAL(3,1) DEFAULT 1.0,
    default_stop_loss_percent DECIMAL(5,2) DEFAULT 2.00,
    default_take_profit_percent DECIMAL(5,2) DEFAULT 4.00,
    risk_level VARCHAR(20) DEFAULT 'MODERATE',
    auto_compound BOOLEAN DEFAULT FALSE,
    strong_signal_priority BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para análise de dominância BTC
CREATE TABLE IF NOT EXISTS btc_dominance_analysis (
    id SERIAL PRIMARY KEY,
    btc_dominance JSONB NOT NULL,
    altcoin_performance JSONB NOT NULL,
    correlation_value DECIMAL(5,4),
    market_conditions JSONB,
    alerts JSONB,
    recommendation JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para logs RSI overheated
CREATE TABLE IF NOT EXISTS rsi_overheated_log (
    id SERIAL PRIMARY KEY,
    market_rsi DECIMAL(5,2),
    individual_analysis JSONB NOT NULL,
    conditions JSONB,
    alerts JSONB,
    recommendation JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para controle de posições ativas (se não existir)
CREATE TABLE IF NOT EXISTS active_positions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    order_id VARCHAR(100) NOT NULL,
    exchange VARCHAR(20) NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    position_type VARCHAR(10) NOT NULL, -- 'LONG' ou 'SHORT'
    entry_price DECIMAL(15,8),
    quantity DECIMAL(15,8),
    stop_loss DECIMAL(15,8),
    take_profit DECIMAL(15,8),
    current_price DECIMAL(15,8),
    pnl DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_ticker_blocks_user_ticker ON ticker_blocks(user_id, ticker);
CREATE INDEX IF NOT EXISTS idx_ticker_blocks_expires ON ticker_blocks(expires_at);
CREATE INDEX IF NOT EXISTS idx_key_validation_user ON key_validation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_key_validation_time ON key_validation_log(validation_time);
CREATE INDEX IF NOT EXISTS idx_balance_history_user ON balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_time ON balance_history(created_at);
CREATE INDEX IF NOT EXISTS idx_active_positions_user ON active_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_positions_status ON active_positions(status);
CREATE INDEX IF NOT EXISTS idx_btc_dominance_created_at ON btc_dominance_analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_rsi_overheated_created_at ON rsi_overheated_log(created_at);
CREATE INDEX IF NOT EXISTS idx_btc_dominance_correlation ON btc_dominance_analysis(correlation_value);
CREATE INDEX IF NOT EXISTS idx_rsi_overheated_market_rsi ON rsi_overheated_log(market_rsi);

-- Atualizar tabela users se necessário
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_trades_today INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_trade_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'MODERATE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_positions INTEGER DEFAULT 2;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_loss_limit_usd DECIMAL(10,2) DEFAULT 100.00;

-- Trigger para atualizar updated_at em user_trading_configs
CREATE OR REPLACE FUNCTION update_trading_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trading_config_timestamp
    BEFORE UPDATE ON user_trading_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_trading_config_timestamp();

-- Função para inserir configuração padrão quando usuário é criado
CREATE OR REPLACE FUNCTION create_default_trading_config()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_trading_configs (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_trading_config
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_trading_config();

-- Views para facilitar consultas
CREATE OR REPLACE VIEW user_complete_info AS
SELECT 
    u.id, u.email, u.plan_type, u.is_active,
    u.balance_brl, u.balance_usd, u.prepaid_balance_usd,
    u.admin_credits_brl, u.admin_credits_usd,
    u.binance_api_key_encrypted IS NOT NULL as has_binance,
    u.bybit_api_key_encrypted IS NOT NULL as has_bybit,
    tc.max_positions, tc.daily_loss_limit_usd, tc.risk_level,
    tc.strong_signal_priority,
    u.total_trades_today, u.last_trade_at,
    (SELECT COUNT(*) FROM active_positions ap WHERE ap.user_id = u.id AND ap.status = 'ACTIVE') as current_positions
FROM users u
LEFT JOIN user_trading_configs tc ON u.id = tc.user_id;

-- View para estatísticas de usuários
CREATE OR REPLACE VIEW user_trading_stats AS
SELECT 
    u.id, u.email, u.plan_type,
    (u.balance_brl + u.balance_usd * 5.5 + u.prepaid_balance_usd * 5.5 + 
     u.admin_credits_brl + u.admin_credits_usd * 5.5) as total_balance_brl_equivalent,
    COALESCE(ap.active_positions, 0) as active_positions,
    COALESCE(ap.total_pnl, 0) as total_pnl,
    u.total_trades_today,
    u.last_trade_at
FROM users u
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as active_positions,
        SUM(pnl) as total_pnl
    FROM active_positions 
    WHERE status = 'ACTIVE'
    GROUP BY user_id
) ap ON u.id = ap.user_id
WHERE u.is_active = true;
