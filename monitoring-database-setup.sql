-- ===============================================================
-- COINBITCLUB MONITORING SYSTEM - DATABASE SETUP
-- Script SQL para criação das tabelas de monitoramento avançado
-- ===============================================================

-- 1. TABELA PARA HISTÓRICO DE DIREÇÃO DO MERCADO
-- Armazena o histórico de análises da direção do mercado
CREATE TABLE IF NOT EXISTS market_direction_history (
    id SERIAL PRIMARY KEY,
    allowed_direction VARCHAR(50) NOT NULL,
    fear_greed_value INTEGER NOT NULL,
    fear_greed_classification VARCHAR(50),
    top100_percentage_up DECIMAL(5,2) NOT NULL,
    top100_trend VARCHAR(20) NOT NULL,
    confidence DECIMAL(3,2),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_market_direction_created_at 
ON market_direction_history(created_at);

CREATE INDEX IF NOT EXISTS idx_market_direction_allowed 
ON market_direction_history(allowed_direction);

-- ===============================================================

-- 2. TABELA PARA ALERTAS DE MUDANÇA DE DIREÇÃO
-- Armazena alertas quando há mudanças significativas na direção
CREATE TABLE IF NOT EXISTS market_direction_alerts (
    id SERIAL PRIMARY KEY,
    change_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    should_close_positions BOOLEAN DEFAULT FALSE,
    details JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_market_alerts_processed 
ON market_direction_alerts(processed);

CREATE INDEX IF NOT EXISTS idx_market_alerts_created_at 
ON market_direction_alerts(created_at);

-- ===============================================================

-- 3. TABELA PARA LOG DE MÉTRICAS DE SINAIS
-- Armazena todos os sinais recebidos e suas métricas
CREATE TABLE IF NOT EXISTS signal_metrics_log (
    id SERIAL PRIMARY KEY,
    signal_type VARCHAR(50) NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    source VARCHAR(50),
    received_at TIMESTAMP NOT NULL,
    market_direction VARCHAR(50),
    fear_greed_value INTEGER,
    top100_percentage_up DECIMAL(5,2),
    ai_approved BOOLEAN NOT NULL,
    ai_reason TEXT,
    processed_at TIMESTAMP DEFAULT NOW(),
    execution_result JSONB
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_signal_metrics_ticker_time 
ON signal_metrics_log(ticker, received_at);

CREATE INDEX IF NOT EXISTS idx_signal_metrics_received_at 
ON signal_metrics_log(received_at);

CREATE INDEX IF NOT EXISTS idx_signal_metrics_ai_approved 
ON signal_metrics_log(ai_approved);

CREATE INDEX IF NOT EXISTS idx_signal_metrics_signal_type 
ON signal_metrics_log(signal_type);

-- ===============================================================

-- 4. TABELA PARA RECOMENDAÇÕES DE FECHAMENTO DE POSIÇÕES
-- Armazena recomendações quando posições devem ser fechadas antecipadamente
CREATE TABLE IF NOT EXISTS position_close_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    reason TEXT NOT NULL,
    market_change_data JSONB,
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_position_close_user_ticker 
ON position_close_recommendations(user_id, ticker);

CREATE INDEX IF NOT EXISTS idx_position_close_executed 
ON position_close_recommendations(executed);

-- ===============================================================

-- 5. TABELA PARA POSIÇÕES ATIVAS (verificar/criar)
-- Armazena as posições atualmente ativas
CREATE TABLE IF NOT EXISTS active_positions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    entry_price DECIMAL(20,8),
    current_price DECIMAL(20,8),
    quantity DECIMAL(20,8),
    leverage INTEGER,
    stop_loss DECIMAL(20,8),
    take_profit DECIMAL(20,8),
    pnl_usd DECIMAL(20,8),
    pnl_percentage DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para posições
CREATE INDEX IF NOT EXISTS idx_active_positions_user_status 
ON active_positions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_active_positions_ticker_status 
ON active_positions(ticker, status);

-- ===============================================================

-- 6. TABELA PARA MÉTRICAS AGREGADAS POR TICKER
-- Performance consolidada por ticker por período
CREATE TABLE IF NOT EXISTS ticker_performance_metrics (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    date_period DATE NOT NULL,
    total_signals INTEGER DEFAULT 0,
    approved_signals INTEGER DEFAULT 0,
    long_signals INTEGER DEFAULT 0,
    short_signals INTEGER DEFAULT 0,
    avg_fear_greed DECIMAL(5,2),
    avg_top100_percentage DECIMAL(5,2),
    success_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ticker, date_period)
);

-- Índices para métricas
CREATE INDEX IF NOT EXISTS idx_ticker_metrics_ticker_date 
ON ticker_performance_metrics(ticker, date_period);

-- ===============================================================

-- 7. TABELA PARA HISTÓRICO DE VOLATILIDADE
-- Armazena dados de volatilidade para análise
CREATE TABLE IF NOT EXISTS market_volatility_log (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    volatility_percentage DECIMAL(10,4),
    price_change_24h DECIMAL(10,4),
    volume_change_24h DECIMAL(10,4),
    market_cap_rank INTEGER,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Índices para volatilidade
CREATE INDEX IF NOT EXISTS idx_volatility_ticker_time 
ON market_volatility_log(ticker, timestamp);

-- ===============================================================

-- 8. VIEW PARA RELATÓRIOS DE PERFORMANCE
-- View consolidada para análise de performance de sinais
CREATE OR REPLACE VIEW signal_performance_summary AS
SELECT 
    s.ticker,
    COUNT(*) as total_signals,
    COUNT(*) FILTER (WHERE s.ai_approved = true) as approved_signals,
    ROUND((COUNT(*) FILTER (WHERE s.ai_approved = true)::DECIMAL / COUNT(*)) * 100, 2) as approval_rate,
    COUNT(*) FILTER (WHERE s.signal_type LIKE '%LONG%') as long_signals,
    COUNT(*) FILTER (WHERE s.signal_type LIKE '%SHORT%') as short_signals,
    AVG(s.fear_greed_value) as avg_fear_greed,
    AVG(s.top100_percentage_up) as avg_top100,
    MIN(s.received_at) as first_signal,
    MAX(s.received_at) as last_signal,
    COUNT(DISTINCT DATE(s.received_at)) as active_days
FROM signal_metrics_log s
WHERE s.received_at >= NOW() - INTERVAL '30 days'
GROUP BY s.ticker
ORDER BY total_signals DESC;

-- ===============================================================

-- 9. VIEW PARA DIREÇÃO ATUAL DO MERCADO
-- View para consulta rápida da direção atual
CREATE OR REPLACE VIEW current_market_direction AS
SELECT 
    allowed_direction,
    fear_greed_value,
    fear_greed_classification,
    top100_percentage_up,
    top100_trend,
    confidence,
    created_at
FROM market_direction_history
WHERE created_at = (SELECT MAX(created_at) FROM market_direction_history);

-- ===============================================================

-- 10. FUNÇÃO E TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA
-- Função para atualizar métricas automaticamente
CREATE OR REPLACE FUNCTION update_ticker_metrics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ticker_performance_metrics (
        ticker, date_period, total_signals, approved_signals,
        long_signals, short_signals, avg_fear_greed, avg_top100_percentage
    )
    SELECT 
        NEW.ticker,
        DATE(NEW.received_at),
        COUNT(*),
        COUNT(*) FILTER (WHERE ai_approved = true),
        COUNT(*) FILTER (WHERE signal_type LIKE '%LONG%'),
        COUNT(*) FILTER (WHERE signal_type LIKE '%SHORT%'),
        AVG(fear_greed_value),
        AVG(top100_percentage_up)
    FROM signal_metrics_log 
    WHERE ticker = NEW.ticker AND DATE(received_at) = DATE(NEW.received_at)
    GROUP BY ticker, DATE(received_at)
    ON CONFLICT (ticker, date_period) 
    DO UPDATE SET
        total_signals = EXCLUDED.total_signals,
        approved_signals = EXCLUDED.approved_signals,
        long_signals = EXCLUDED.long_signals,
        short_signals = EXCLUDED.short_signals,
        avg_fear_greed = EXCLUDED.avg_fear_greed,
        avg_top100_percentage = EXCLUDED.avg_top100_percentage;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para execução automática
DROP TRIGGER IF EXISTS trigger_update_ticker_metrics ON signal_metrics_log;
CREATE TRIGGER trigger_update_ticker_metrics
    AFTER INSERT ON signal_metrics_log
    FOR EACH ROW EXECUTE FUNCTION update_ticker_metrics();

-- ===============================================================

-- 11. DADOS DE EXEMPLO PARA TESTE
-- Inserir alguns dados para validar o funcionamento
INSERT INTO market_direction_history (
    allowed_direction, fear_greed_value, fear_greed_classification,
    top100_percentage_up, top100_trend, confidence
) VALUES 
('LONG_E_SHORT', 45, 'Fear', 55.5, 'SIDEWAYS', 0.6),
('SOMENTE_LONG', 25, 'Extreme Fear', 75.2, 'BULLISH', 0.8),
('PREFERENCIA_SHORT', 75, 'Greed', 35.8, 'BEARISH', 0.7)
ON CONFLICT DO NOTHING;

-- ===============================================================

-- 12. LIMPEZA E MANUTENÇÃO
-- Função para limpeza automática de dados antigos
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS $$
BEGIN
    -- Limpar logs de sinais com mais de 30 dias
    DELETE FROM signal_metrics_log 
    WHERE received_at < NOW() - INTERVAL '30 days';
    
    -- Limpar direções com mais de 7 dias
    DELETE FROM market_direction_history 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- Limpar alertas processados com mais de 3 dias
    DELETE FROM market_direction_alerts 
    WHERE processed = true AND created_at < NOW() - INTERVAL '3 days';
    
    -- Limpar recomendações executadas com mais de 7 dias
    DELETE FROM position_close_recommendations 
    WHERE executed = true AND executed_at < NOW() - INTERVAL '7 days';
    
    -- Limpar volatilidade com mais de 15 dias
    DELETE FROM market_volatility_log 
    WHERE timestamp < NOW() - INTERVAL '15 days';
    
    -- Manter apenas métricas dos últimos 60 dias
    DELETE FROM ticker_performance_metrics 
    WHERE date_period < CURRENT_DATE - INTERVAL '60 days';
    
END;
$$ LANGUAGE plpgsql;

-- ===============================================================

-- VERIFICAÇÃO FINAL
-- Consulta para verificar se todas as tabelas foram criadas
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN (
    'market_direction_history',
    'market_direction_alerts', 
    'signal_metrics_log',
    'position_close_recommendations',
    'active_positions',
    'ticker_performance_metrics',
    'market_volatility_log'
)
ORDER BY table_name;

-- ===============================================================
-- SETUP COMPLETO - SISTEMA DE MONITORAMENTO PRONTO!
-- ===============================================================
