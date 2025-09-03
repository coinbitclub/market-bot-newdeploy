-- ===============================================
-- 📊 MARKET PULSE TOP 100 - MIGRAÇÃO DO BANCO
-- ===============================================
-- Arquivo: migrate-market-pulse-complete.sql
-- Versão: 1.0.0
-- Data: 2025-08-22
-- 
-- 🎯 OBJETIVO:
-- Criar todas as estruturas necessárias para o sistema Market Pulse TOP 100
-- com as métricas exatas PM+, PM-, VWΔ e regras de decisão específicas

-- ===============================================
-- 🗂️ TABELA PRINCIPAL - MARKET PULSE
-- ===============================================

CREATE TABLE IF NOT EXISTS market_pulse (
    id SERIAL PRIMARY KEY,
    
    -- Métricas principais
    pm_plus DECIMAL(5,2) NOT NULL,          -- PM+ (% moedas positivas)
    pm_minus DECIMAL(5,2) NOT NULL,         -- PM- (% moedas negativas)  
    vwd DECIMAL(6,3) NOT NULL,              -- VWΔ (Variação Ponderada por Volume)
    
    -- Contadores
    moedas_positivas INTEGER NOT NULL,      -- Quantidade de moedas com Δ24h > 0
    moedas_negativas INTEGER NOT NULL,      -- Quantidade de moedas com Δ24h < 0
    moedas_neutras INTEGER NOT NULL,        -- Quantidade de moedas com Δ24h = 0
    
    -- Estatísticas complementares
    variacao_media DECIMAL(6,3),           -- Variação média simples das 100 moedas
    total_volume BIGINT,                   -- Volume total negociado (USDT)
    
    -- Decisão do sistema
    direcao_final VARCHAR(20) NOT NULL,    -- SOMENTE_LONG, SOMENTE_SHORT, AGUARDAR, NEUTRO
    fonte_decisao VARCHAR(30) NOT NULL,    -- FEAR_GREED_EXTREMO, MARKET_PULSE, IA_ZONA_NEUTRA, etc
    confianca DECIMAL(3,2) NOT NULL,       -- Nível de confiança (0.0 - 1.0)
    justificativa TEXT,                    -- Explicação da decisão
    
    -- Controle de execução
    executa_operacoes BOOLEAN NOT NULL DEFAULT false, -- ⚠️ CRÍTICO: só true se direção clara
    
    -- Contexto
    fear_greed_value INTEGER,             -- Valor do Fear & Greed usado na decisão
    
    -- Dados brutos para auditoria
    raw_data JSONB,                       -- Dados completos em JSON
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- 🗂️ TABELA DE CONFIGURAÇÕES
-- ===============================================

CREATE TABLE IF NOT EXISTS market_pulse_config (
    id SERIAL PRIMARY KEY,
    
    -- Thresholds para PM+/PM-
    pm_long_min DECIMAL(5,2) DEFAULT 60.00,    -- PM+ mínimo para SOMENTE_LONG (60%)
    pm_short_min DECIMAL(5,2) DEFAULT 60.00,   -- PM- mínimo para SOMENTE_SHORT (60%)
    pm_neutral_min DECIMAL(5,2) DEFAULT 40.00, -- PM+ mínimo zona neutra (40%)
    pm_neutral_max DECIMAL(5,2) DEFAULT 60.00, -- PM+ máximo zona neutra (60%)
    
    -- Thresholds para VWΔ
    vwd_long_min DECIMAL(4,2) DEFAULT 0.50,    -- VWΔ mínimo para SOMENTE_LONG (0.5%)
    vwd_short_max DECIMAL(4,2) DEFAULT -0.50,  -- VWΔ máximo para SOMENTE_SHORT (-0.5%)
    vwd_neutral_min DECIMAL(4,2) DEFAULT -0.50, -- VWΔ mínimo zona neutra (-0.5%)
    vwd_neutral_max DECIMAL(4,2) DEFAULT 0.50,  -- VWΔ máximo zona neutra (0.5%)
    
    -- Configurações IA
    ia_enabled BOOLEAN DEFAULT true,            -- Usar IA em zona neutra
    ia_max_confidence DECIMAL(3,2) DEFAULT 0.70, -- Confiança máxima da IA (70%)
    
    -- Configurações gerais
    update_interval INTEGER DEFAULT 300,       -- Intervalo de atualização (segundos)
    active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- 🗂️ TABELA DE HISTÓRICO DE DECISÕES
-- ===============================================

CREATE TABLE IF NOT EXISTS market_pulse_decisions_log (
    id SERIAL PRIMARY KEY,
    market_pulse_id INTEGER REFERENCES market_pulse(id),
    
    -- Estado anterior
    previous_direction VARCHAR(20),
    previous_executes BOOLEAN,
    
    -- Estado atual  
    current_direction VARCHAR(20) NOT NULL,
    current_executes BOOLEAN NOT NULL,
    
    -- Análise da mudança
    direction_changed BOOLEAN DEFAULT false,
    execution_changed BOOLEAN DEFAULT false,
    change_significance VARCHAR(20), -- LOW, MEDIUM, HIGH, CRITICAL
    
    -- Impacto nas operações
    should_close_positions BOOLEAN DEFAULT false,
    affected_positions TEXT[], -- Lista de posições que devem ser fechadas
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- 📊 ÍNDICES PARA PERFORMANCE
-- ===============================================

-- Índices principais para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_market_pulse_created_at ON market_pulse(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_pulse_direcao ON market_pulse(direcao_final);
CREATE INDEX IF NOT EXISTS idx_market_pulse_executa ON market_pulse(executa_operacoes);
CREATE INDEX IF NOT EXISTS idx_market_pulse_fonte ON market_pulse(fonte_decisao);

-- Índices para métricas
CREATE INDEX IF NOT EXISTS idx_market_pulse_pm_plus ON market_pulse(pm_plus);
CREATE INDEX IF NOT EXISTS idx_market_pulse_vwd ON market_pulse(vwd);

-- Índices para log de decisões
CREATE INDEX IF NOT EXISTS idx_decisions_log_created_at ON market_pulse_decisions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_log_changes ON market_pulse_decisions_log(direction_changed, execution_changed);

-- ===============================================
-- 🔧 FUNÇÕES UTILITÁRIAS
-- ===============================================

-- Função para aplicar regras de decisão Market Pulse
CREATE OR REPLACE FUNCTION apply_market_pulse_rules(
    p_pm_plus DECIMAL,
    p_pm_minus DECIMAL, 
    p_vwd DECIMAL,
    p_fear_greed INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_config RECORD;
    v_result JSONB;
    v_direction VARCHAR(20);
    v_executes BOOLEAN DEFAULT false;
    v_source VARCHAR(30);
    v_confidence DECIMAL(3,2);
    v_justification TEXT;
BEGIN
    -- Buscar configurações atuais
    SELECT * INTO v_config FROM market_pulse_config WHERE active = true ORDER BY created_at DESC LIMIT 1;
    
    -- Se não há config, usar padrões
    IF v_config IS NULL THEN
        v_config.pm_long_min := 60.00;
        v_config.pm_short_min := 60.00;
        v_config.vwd_long_min := 0.50;
        v_config.vwd_short_max := -0.50;
        v_config.pm_neutral_min := 40.00;
        v_config.pm_neutral_max := 60.00;
        v_config.vwd_neutral_min := -0.50;
        v_config.vwd_neutral_max := 0.50;
    END IF;
    
    -- 1️⃣ PRIORIDADE: Fear & Greed extremo
    IF p_fear_greed < 30 THEN
        v_direction := 'SOMENTE_LONG';
        v_source := 'FEAR_GREED_EXTREMO';
        v_executes := true;
        v_confidence := 0.90;
        v_justification := format('Fear extremo (%s) - SOMENTE LONG independente do Market Pulse', p_fear_greed);
        
    ELSIF p_fear_greed > 80 THEN
        v_direction := 'SOMENTE_SHORT';
        v_source := 'FEAR_GREED_EXTREMO';
        v_executes := true;
        v_confidence := 0.90;
        v_justification := format('Greed extremo (%s) - SOMENTE SHORT independente do Market Pulse', p_fear_greed);
        
    -- 2️⃣ ZONA NEUTRA: Market Pulse decide
    ELSE
        v_source := 'MARKET_PULSE';
        
        -- Regra SOMENTE_LONG: PM+ ≥ 60% e VWΔ > 0,5%
        IF p_pm_plus >= v_config.pm_long_min AND p_vwd > v_config.vwd_long_min THEN
            v_direction := 'SOMENTE_LONG';
            v_executes := true;
            v_confidence := 0.85;
            v_justification := format('Market Pulse BULLISH: %s%% positivas + VWΔ %s%%', p_pm_plus, p_vwd);
            
        -- Regra SOMENTE_SHORT: PM- ≥ 60% e VWΔ < -0,5%
        ELSIF p_pm_minus >= v_config.pm_short_min AND p_vwd < v_config.vwd_short_max THEN
            v_direction := 'SOMENTE_SHORT';
            v_executes := true;
            v_confidence := 0.85;
            v_justification := format('Market Pulse BEARISH: %s%% negativas + VWΔ %s%%', p_pm_minus, p_vwd);
            
        -- Regra ZONA NEUTRA: PM+ entre 40-60% ou VWΔ entre -0,5% e +0,5%
        ELSIF (p_pm_plus >= v_config.pm_neutral_min AND p_pm_plus <= v_config.pm_neutral_max) OR
              (p_vwd >= v_config.vwd_neutral_min AND p_vwd <= v_config.vwd_neutral_max) THEN
            v_direction := 'AGUARDAR_IA';
            v_executes := false;
            v_confidence := 0.40;
            v_justification := format('Market Pulse neutro: %s%% positivas, VWΔ %s%% - IA decidirá', p_pm_plus, p_vwd);
            
        -- Condições não claras
        ELSE
            v_direction := 'NEUTRO';
            v_executes := false;
            v_confidence := 0.30;
            v_justification := format('Condições mistas: PM+ %s%%, VWΔ %s%% - aguardando clareza', p_pm_plus, p_vwd);
        END IF;
    END IF;
    
    -- Montar resultado
    v_result := jsonb_build_object(
        'direction', v_direction,
        'source', v_source,
        'executes', v_executes,
        'confidence', v_confidence,
        'justification', v_justification,
        'rules_applied', jsonb_build_object(
            'fear_greed_extreme', (p_fear_greed < 30 OR p_fear_greed > 80),
            'market_pulse_long', (p_pm_plus >= v_config.pm_long_min AND p_vwd > v_config.vwd_long_min),
            'market_pulse_short', (p_pm_minus >= v_config.pm_short_min AND p_vwd < v_config.vwd_short_max),
            'neutral_zone', (v_source = 'MARKET_PULSE' AND NOT v_executes)
        )
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 📊 VIEWS PARA ANÁLISE
-- ===============================================

-- View com últimas leituras Market Pulse
CREATE OR REPLACE VIEW v_market_pulse_latest AS
SELECT 
    mp.*,
    CASE 
        WHEN mp.executa_operacoes THEN '✅ EXECUTA'
        ELSE '❌ AGUARDA'
    END as status_execucao,
    CASE
        WHEN mp.direcao_final = 'SOMENTE_LONG' THEN '🟢 LONG'
        WHEN mp.direcao_final = 'SOMENTE_SHORT' THEN '🔴 SHORT'
        WHEN mp.direcao_final = 'AGUARDAR_IA' THEN '🟡 IA'
        ELSE '⚪ NEUTRO'
    END as status_visual,
    (mp.confianca * 100)::INTEGER as confianca_pct,
    EXTRACT(EPOCH FROM (NOW() - mp.created_at))::INTEGER as segundos_atras
FROM market_pulse mp
ORDER BY mp.created_at DESC;

-- View de estatísticas Market Pulse
CREATE OR REPLACE VIEW v_market_pulse_stats AS
SELECT 
    COUNT(*) as total_leituras,
    COUNT(*) FILTER (WHERE executa_operacoes = true) as leituras_executadas,
    COUNT(*) FILTER (WHERE direcao_final = 'SOMENTE_LONG') as decisoes_long,
    COUNT(*) FILTER (WHERE direcao_final = 'SOMENTE_SHORT') as decisoes_short,
    COUNT(*) FILTER (WHERE direcao_final LIKE '%AGUARDAR%') as decisoes_aguardar,
    ROUND(AVG(pm_plus), 2) as pm_plus_medio,
    ROUND(AVG(vwd), 3) as vwd_medio,
    ROUND(AVG(confianca), 3) as confianca_media,
    MAX(created_at) as ultima_leitura
FROM market_pulse
WHERE created_at > NOW() - INTERVAL '24 hours';

-- ===============================================
-- 📝 INSERIR CONFIGURAÇÃO PADRÃO
-- ===============================================

INSERT INTO market_pulse_config (
    pm_long_min, pm_short_min, pm_neutral_min, pm_neutral_max,
    vwd_long_min, vwd_short_max, vwd_neutral_min, vwd_neutral_max,
    ia_enabled, ia_max_confidence, update_interval, active
) VALUES (
    60.00, 60.00, 40.00, 60.00,  -- PM+ thresholds
    0.50, -0.50, -0.50, 0.50,    -- VWΔ thresholds  
    true, 0.70, 300, true         -- IA config
) ON CONFLICT DO NOTHING;

-- ===============================================
-- 🧹 LIMPEZA AUTOMÁTICA (OPCIONAL)
-- ===============================================

-- Função para limpeza automática de dados antigos
CREATE OR REPLACE FUNCTION cleanup_market_pulse_data(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM market_pulse_decisions_log 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM market_pulse 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND id NOT IN (
        SELECT DISTINCT market_pulse_id 
        FROM market_pulse_decisions_log 
        WHERE market_pulse_id IS NOT NULL
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT + deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- ✅ VALIDAÇÃO DA MIGRAÇÃO
-- ===============================================

DO $$
BEGIN
    -- Verificar se todas as tabelas foram criadas
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'market_pulse') THEN
        RAISE EXCEPTION 'Falha: tabela market_pulse não foi criada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'market_pulse_config') THEN
        RAISE EXCEPTION 'Falha: tabela market_pulse_config não foi criada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'market_pulse_decisions_log') THEN
        RAISE EXCEPTION 'Falha: tabela market_pulse_decisions_log não foi criada';
    END IF;
    
    -- Verificar se a função foi criada
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'apply_market_pulse_rules') THEN
        RAISE EXCEPTION 'Falha: função apply_market_pulse_rules não foi criada';
    END IF;
    
    RAISE NOTICE '✅ Migração Market Pulse TOP 100 concluída com sucesso!';
    RAISE NOTICE '📊 Estruturas criadas: 3 tabelas, 1 função, 2 views';
    RAISE NOTICE '🎯 Sistema pronto para executar com métricas PM+, PM-, VWΔ';
    RAISE NOTICE '⚠️  REGRA CRÍTICA: Sistema só executa operações em direções claras (LONG/SHORT)';
END $$;
