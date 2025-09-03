-- 🦅 AGUIA NEWS - ESTRUTURA DO BANCO DE DADOS
-- ============================================

-- Tabela para armazenar os radars gerados (24h - Pagos)
CREATE TABLE IF NOT EXISTS aguia_news_radars (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    radar_type VARCHAR(50) DEFAULT 'RADAR_DIARIO',
    data_source JSONB, -- Dados brutos usados na geração
    is_premium BOOLEAN DEFAULT true, -- Relatórios são pagos
    plan_required VARCHAR(20) DEFAULT 'PREMIUM', -- PREMIUM, VIP, AFFILIATE_VIP
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')
);

-- Tabela para vincular radars aos usuários (sem email)
CREATE TABLE IF NOT EXISTS user_radar_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    radar_id INTEGER NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    FOREIGN KEY (radar_id) REFERENCES aguia_news_radars(id) ON DELETE CASCADE
);

-- Tabela para dados de mercado coletados
CREATE TABLE IF NOT EXISTS market_data_cache (
    id SERIAL PRIMARY KEY,
    data_type VARCHAR(50) NOT NULL, -- 'MACRO', 'CRYPTO', 'FEAR_GREED', etc.
    data_content JSONB NOT NULL,
    source VARCHAR(100),
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')
);

-- Tabela para análises da IA
CREATE TABLE IF NOT EXISTS ai_market_analysis (
    id SERIAL PRIMARY KEY,
    analysis_type VARCHAR(50) NOT NULL,
    input_data JSONB NOT NULL,
    ai_response TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    model_used VARCHAR(50) DEFAULT 'gpt-4',
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')
);

-- Tabela para configurações do Aguia News
CREATE TABLE IF NOT EXISTS aguia_news_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')
);

-- Tabela para notificações no perfil do usuário (sem email)
CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'RADAR', -- 'RADAR', 'ALERT', 'SYSTEM'
    is_read BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH'
    radar_id INTEGER NULL, -- Referência ao radar se aplicável
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    read_at TIMESTAMP WITH TIME ZONE NULL,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    FOREIGN KEY (radar_id) REFERENCES aguia_news_radars(id) ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_aguia_radars_generated_at ON aguia_news_radars(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_aguia_radars_plan_required ON aguia_news_radars(plan_required, is_premium);
CREATE INDEX IF NOT EXISTS idx_user_radar_access_user_id ON user_radar_access(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_type_collected ON market_data_cache(data_type, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_type_created ON ai_market_analysis(analysis_type, created_at DESC);

-- Inserir configurações padrão
INSERT INTO aguia_news_config (config_key, config_value, description) VALUES
('radar_settings', '{"enabled": true, "frequency_hours": 24, "is_premium": true, "plan_required": "PREMIUM"}', 'Configurações dos radars pagos'),
('api_settings', '{"coingecko_enabled": true, "fear_greed_enabled": true, "rate_limit_ms": 1000}', 'Configurações de APIs'),
('radar_schedule', '{"hour": 20, "timezone": "America/Sao_Paulo", "auto_generate": true}', 'Horário único diário às 20h Brasília'),
('ai_settings', '{"model": "gpt-4", "max_tokens": 1200, "temperature": 0.3}', 'Configurações da IA'),
('notification_settings', '{"enabled": true, "expire_days": 7, "max_per_user": 50}', 'Configurações de notificações no perfil')
ON CONFLICT (config_key) DO NOTHING;

-- Inserir dados de teste para desenvolvimento
-- Remover em produção
-- INSERT INTO user_notifications (user_id, title, message, notification_type) VALUES
-- (1, 'Radar Águia News Disponível', 'Novo relatório de análise de mercado gerado às 20:00', 'RADAR'),
-- (2, 'Radar Águia News Disponível', 'Novo relatório de análise de mercado gerado às 20:00', 'RADAR')
-- ON CONFLICT DO NOTHING;

-- Comentários nas tabelas
COMMENT ON TABLE aguia_news_radars IS 'Armazena radars pagos gerados a cada 24h (20h Brasília)';
COMMENT ON TABLE user_radar_access IS 'Controla acesso dos usuários aos radars pagos';
COMMENT ON TABLE user_notifications IS 'Notificações no perfil do usuário (sem email)';
COMMENT ON TABLE market_data_cache IS 'Cache de dados de mercado coletados de APIs externas';
COMMENT ON TABLE ai_market_analysis IS 'Histórico de análises realizadas pela IA';
COMMENT ON TABLE aguia_news_config IS 'Configurações do sistema Aguia News';

-- Função para limpeza automática de dados antigos (horário Brasília)
CREATE OR REPLACE FUNCTION cleanup_old_aguia_data()
RETURNS void AS $$
BEGIN
    -- Manter apenas 90 dias de radars
    DELETE FROM aguia_news_radars 
    WHERE generated_at < (NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '90 days';
    
    -- Manter apenas 7 dias de cache de mercado
    DELETE FROM market_data_cache 
    WHERE collected_at < (NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '7 days';
    
    -- Manter apenas 30 dias de análises da IA
    DELETE FROM ai_market_analysis 
    WHERE created_at < (NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '30 days';
    
    -- Limpar notificações antigas (7 dias)
    DELETE FROM user_notifications 
    WHERE created_at < (NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '7 days';
    
    -- Limpar acessos antigos (30 dias)
    DELETE FROM user_radar_access 
    WHERE created_at < (NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '30 days';
    
    RAISE NOTICE 'Limpeza automática concluída - Horário Brasília';
END;
$$ LANGUAGE plpgsql;

-- Função para criar notificação para usuários premium
CREATE OR REPLACE FUNCTION notify_premium_users_new_radar(radar_id INTEGER)
RETURNS void AS $$
BEGIN
    -- Inserir notificação para todos os usuários PREMIUM, VIP e AFFILIATE_VIP
    INSERT INTO user_notifications (user_id, title, message, notification_type, radar_id)
    SELECT 
        u.id,
        'Novo Radar Águia News Disponível',
        'Relatório de análise de mercado gerado às ' || 
        TO_CHAR((NOW() AT TIME ZONE 'America/Sao_Paulo'), 'DD/MM/YYYY HH24:MI') || ' (Horário de Brasília)',
        'RADAR',
        radar_id
    FROM users u
    WHERE u.plan_type IN ('PREMIUM', 'VIP', 'AFFILIATE_VIP')
    AND u.is_active = true;
    
    RAISE NOTICE 'Notificações criadas para usuários premium - Radar ID: %', radar_id;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para limpeza automática (executar diariamente)
-- CREATE OR REPLACE FUNCTION schedule_cleanup() RETURNS trigger AS $$
-- BEGIN
--     PERFORM pg_background_launch('SELECT cleanup_old_aguia_data()');
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

COMMIT;
