/**
 * 🗄️ CRIAÇÃO DE TABELAS PARA MONITORAMENTO AVANÇADO
 * Scripts para criar as tabelas necessárias para:
 * - Monitoramento de direção de mercado
 * - Métricas de sinais recebidos
 * - Alertas de mudança de direção
 * - Recomendações de fechamento de posições
 */

const { Pool } = require('pg');

class DatabaseSetupMonitoring {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
        });
    }

    async setupMonitoringTables() {
        console.log('🗄️ Criando tabelas para monitoramento avançado...');

        try {
            // 1. Tabela para histórico de direção do mercado
            await this.pool.query(`
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
            `);
            console.log('✅ Tabela market_direction_history criada');

            // Índices para performance
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_market_direction_created_at 
                ON market_direction_history(created_at);
                
                CREATE INDEX IF NOT EXISTS idx_market_direction_allowed 
                ON market_direction_history(allowed_direction);
            `);

            // 2. Tabela para alertas de mudança de direção
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS market_direction_alerts (
                    id SERIAL PRIMARY KEY,
                    change_type VARCHAR(50) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    should_close_positions BOOLEAN DEFAULT FALSE,
                    details JSONB,
                    processed BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);
            console.log('✅ Tabela market_direction_alerts criada');

            // 3. Tabela para log de métricas de sinais
            await this.pool.query(`
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
            `);
            console.log('✅ Tabela signal_metrics_log criada');

            // Índices para performance
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_signal_metrics_ticker_time 
                ON signal_metrics_log(ticker, received_at);
                
                CREATE INDEX IF NOT EXISTS idx_signal_metrics_received_at 
                ON signal_metrics_log(received_at);
                
                CREATE INDEX IF NOT EXISTS idx_signal_metrics_ai_approved 
                ON signal_metrics_log(ai_approved);
            `);

            // 4. Tabela para recomendações de fechamento de posições
            await this.pool.query(`
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
            `);
            console.log('✅ Tabela position_close_recommendations criada');

            // Índices para performance
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_position_close_user_ticker 
                ON position_close_recommendations(user_id, ticker);
                
                CREATE INDEX IF NOT EXISTS idx_position_close_executed 
                ON position_close_recommendations(executed);
            `);

            // 5. Atualizar tabela de posições ativas (se não existir)
            await this.pool.query(`
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
            `);
            console.log('✅ Tabela active_positions verificada/criada');

            // Índices para posições
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_active_positions_user_status 
                ON active_positions(user_id, status);
                
                CREATE INDEX IF NOT EXISTS idx_active_positions_ticker_status 
                ON active_positions(ticker, status);
            `);

            // 6. Tabela para métricas agregadas por ticker
            await this.pool.query(`
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
            `);
            console.log('✅ Tabela ticker_performance_metrics criada');

            // 7. Tabela para histórico de volatilidade
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS market_volatility_log (
                    id SERIAL PRIMARY KEY,
                    ticker VARCHAR(20) NOT NULL,
                    volatility_percentage DECIMAL(10,4),
                    price_change_24h DECIMAL(10,4),
                    volume_change_24h DECIMAL(10,4),
                    market_cap_rank INTEGER,
                    timestamp TIMESTAMP DEFAULT NOW()
                );
            `);
            console.log('✅ Tabela market_volatility_log criada');

            // Índices para volatilidade
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_volatility_ticker_time 
                ON market_volatility_log(ticker, timestamp);
            `);

            // 8. View para relatórios de performance
            await this.pool.query(`
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
            `);
            console.log('✅ View signal_performance_summary criada');

            // 9. Triggers para atualização automática
            await this.pool.query(`
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
            `);

            await this.pool.query(`
                DROP TRIGGER IF EXISTS trigger_update_ticker_metrics ON signal_metrics_log;
                CREATE TRIGGER trigger_update_ticker_metrics
                    AFTER INSERT ON signal_metrics_log
                    FOR EACH ROW EXECUTE FUNCTION update_ticker_metrics();
            `);
            console.log('✅ Triggers criados para atualização automática');

            console.log('🎉 TODAS AS TABELAS DE MONITORAMENTO CRIADAS COM SUCESSO!');
            
            // Verificar estrutura criada
            const result = await this.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
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
            `);
            
            console.log('📋 Tabelas criadas:', result.rows.map(r => r.table_name));
            
            return {
                success: true,
                tablesCreated: result.rows.length,
                tables: result.rows.map(r => r.table_name)
            };

        } catch (error) {
            console.error('❌ Erro ao criar tabelas:', error.message);
            throw error;
        }
    }

    async checkDatabaseStructure() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    table_name,
                    (SELECT COUNT(*) FROM information_schema.columns 
                     WHERE table_name = t.table_name AND table_schema = 'public') as column_count,
                    (SELECT COUNT(*) FROM information_schema.table_constraints 
                     WHERE table_name = t.table_name AND table_schema = 'public') as constraint_count
                FROM information_schema.tables t
                WHERE table_schema = 'public' 
                AND table_name LIKE '%monitoring%' 
                OR table_name IN (
                    'market_direction_history',
                    'market_direction_alerts', 
                    'signal_metrics_log',
                    'position_close_recommendations',
                    'active_positions',
                    'ticker_performance_metrics',
                    'market_volatility_log'
                )
                ORDER BY table_name;
            `);

            console.log('📊 Estrutura do banco - Tabelas de monitoramento:');
            result.rows.forEach(row => {
                console.log(`  ${row.table_name}: ${row.column_count} colunas, ${row.constraint_count} constraints`);
            });

            return result.rows;

        } catch (error) {
            console.error('❌ Erro ao verificar estrutura:', error.message);
            throw error;
        }
    }

    async createSampleData() {
        try {
            console.log('📝 Criando dados de exemplo...');

            // Dados de exemplo para direção de mercado
            await this.pool.query(`
                INSERT INTO market_direction_history (
                    allowed_direction, fear_greed_value, fear_greed_classification,
                    top100_percentage_up, top100_trend, confidence
                ) VALUES 
                ('LONG_E_SHORT', 45, 'Fear', 55.5, 'SIDEWAYS', 0.6),
                ('SOMENTE_LONG', 25, 'Extreme Fear', 75.2, 'BULLISH', 0.8),
                ('PREFERENCIA_SHORT', 75, 'Greed', 35.8, 'BEARISH', 0.7)
                ON CONFLICT DO NOTHING;
            `);

            console.log('✅ Dados de exemplo criados');

        } catch (error) {
            console.error('❌ Erro ao criar dados de exemplo:', error.message);
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const setup = new DatabaseSetupMonitoring();
    
    setup.setupMonitoringTables()
        .then(() => {
            console.log('🎉 Setup de monitoramento concluído!');
            return setup.checkDatabaseStructure();
        })
        .then(() => {
            return setup.createSampleData();
        })
        .then(() => {
            console.log('✅ Processo completo!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro no setup:', error);
            process.exit(1);
        });
}

module.exports = DatabaseSetupMonitoring;
