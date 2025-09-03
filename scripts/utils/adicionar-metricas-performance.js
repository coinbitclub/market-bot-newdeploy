/**
 * 🎯 ADICIONAR MÉTRICAS DE PERFORMANCE
 * Script para adicionar colunas de índice de acerto e retorno
 * 
 * @author CoinBitClub
 * @version 1.0
 * @date 2025-01-08
 */

const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function adicionarMetricasPerformance() {
    try {
        console.log('🎯 Adicionando métricas de performance...');

        // 1. ADICIONAR COLUNAS NA TABELA USERS
        const userColumns = [
            { name: 'total_trades', type: 'INTEGER', default: '0' },
            { name: 'winning_trades', type: 'INTEGER', default: '0' },
            { name: 'losing_trades', type: 'INTEGER', default: '0' },
            { name: 'win_rate_percentage', type: 'NUMERIC(5,2)', default: '0' },
            { name: 'total_pnl', type: 'NUMERIC(20,8)', default: '0' },
            { name: 'total_volume_traded', type: 'NUMERIC(20,8)', default: '0' },
            { name: 'average_return_per_trade', type: 'NUMERIC(20,8)', default: '0' },
            { name: 'accumulated_return', type: 'NUMERIC(20,8)', default: '0' },
            { name: 'best_trade_pnl', type: 'NUMERIC(20,8)', default: '0' },
            { name: 'worst_trade_pnl', type: 'NUMERIC(20,8)', default: '0' },
            { name: 'last_trade_date', type: 'TIMESTAMP', default: null },
            { name: 'performance_updated_at', type: 'TIMESTAMP', default: 'NOW()' }
        ];

        for (const column of userColumns) {
            try {
                const checkColumn = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = $1
                    );
                `, [column.name]);

                if (!checkColumn.rows[0].exists) {
                    const defaultClause = column.default ? `DEFAULT ${column.default}` : '';
                    await pool.query(`
                        ALTER TABLE users 
                        ADD COLUMN ${column.name} ${column.type} ${defaultClause};
                    `);
                    console.log(`✅ Coluna users.${column.name} adicionada`);
                } else {
                    console.log(`✅ Coluna users.${column.name} já existe`);
                }
            } catch (error) {
                console.log(`⚠️ Erro ao adicionar coluna users.${column.name}:`, error.message);
            }
        }

        // 2. VERIFICAR/CRIAR TABELA DE TRADE HISTORY
        console.log('\n📊 Verificando tabela trade_history...');
        
        const checkTradeHistory = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'trade_history'
            );
        `);

        if (!checkTradeHistory.rows[0].exists) {
            console.log('📝 Criando tabela trade_history...');
            await pool.query(`
                CREATE TABLE trade_history (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    symbol VARCHAR(20) NOT NULL,
                    side VARCHAR(10) NOT NULL, -- BUY/SELL
                    entry_price NUMERIC(20,8) NOT NULL,
                    exit_price NUMERIC(20,8),
                    quantity NUMERIC(20,8) NOT NULL,
                    pnl NUMERIC(20,8) DEFAULT 0,
                    pnl_percentage NUMERIC(10,4) DEFAULT 0,
                    commission NUMERIC(20,8) DEFAULT 0,
                    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLOSED, CANCELLED
                    trade_type VARCHAR(20) DEFAULT 'MARKET', -- MARKET, LIMIT, STOP
                    leverage INTEGER DEFAULT 1,
                    exchange VARCHAR(20) DEFAULT 'bybit',
                    order_id VARCHAR(100),
                    signal_id VARCHAR(100),
                    signal_source VARCHAR(50),
                    entry_time TIMESTAMP DEFAULT NOW(),
                    exit_time TIMESTAMP,
                    duration_minutes INTEGER,
                    is_profitable BOOLEAN,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);
            
            // Criar índices para performance
            await pool.query(`
                CREATE INDEX idx_trade_history_user_id ON trade_history(user_id);
                CREATE INDEX idx_trade_history_symbol ON trade_history(symbol);
                CREATE INDEX idx_trade_history_status ON trade_history(status);
                CREATE INDEX idx_trade_history_entry_time ON trade_history(entry_time);
                CREATE INDEX idx_trade_history_is_profitable ON trade_history(is_profitable);
            `);
            
            console.log('✅ Tabela trade_history criada com índices');
        } else {
            console.log('✅ Tabela trade_history já existe');
        }

        // 3. VERIFICAR/CRIAR TABELA AGUIA_NEWS_REPORTS
        console.log('\n🦅 Verificando tabela aguia_news_reports...');
        
        const checkAguiaNews = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'aguia_news_reports'
            );
        `);

        if (!checkAguiaNews.rows[0].exists) {
            console.log('📝 Criando tabela aguia_news_reports...');
            await pool.query(`
                CREATE TABLE aguia_news_reports (
                    id SERIAL PRIMARY KEY,
                    report_type VARCHAR(50) NOT NULL, -- RADAR, ANALYSIS, NEWSLETTER
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    summary TEXT,
                    market_sentiment VARCHAR(20), -- BULLISH, BEARISH, NEUTRAL
                    fear_greed_index INTEGER,
                    btc_dominance NUMERIC(5,2),
                    top_movers JSONB DEFAULT '[]',
                    recommendations JSONB DEFAULT '[]',
                    generated_by VARCHAR(50) DEFAULT 'AI',
                    generation_time_seconds NUMERIC(8,2),
                    status VARCHAR(20) DEFAULT 'PUBLISHED', -- DRAFT, PUBLISHED, ARCHIVED
                    visibility VARCHAR(20) DEFAULT 'PUBLIC', -- PUBLIC, PREMIUM, VIP
                    views_count INTEGER DEFAULT 0,
                    likes_count INTEGER DEFAULT 0,
                    shares_count INTEGER DEFAULT 0,
                    tags JSONB DEFAULT '[]',
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW(),
                    published_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);
            
            // Criar índices
            await pool.query(`
                CREATE INDEX idx_aguia_news_type ON aguia_news_reports(report_type);
                CREATE INDEX idx_aguia_news_status ON aguia_news_reports(status);
                CREATE INDEX idx_aguia_news_published ON aguia_news_reports(published_at);
                CREATE INDEX idx_aguia_news_visibility ON aguia_news_reports(visibility);
            `);
            
            console.log('✅ Tabela aguia_news_reports criada com índices');
        } else {
            console.log('✅ Tabela aguia_news_reports já existe');
        }

        // 4. ATUALIZAR COLUNAS EXISTENTES DE ORDER_EXECUTIONS_V2
        console.log('\n💰 Verificando tabela order_executions_v2...');
        
        const orderColumns = [
            { name: 'pnl', type: 'NUMERIC(20,8)', default: '0' },
            { name: 'pnl_percentage', type: 'NUMERIC(10,4)', default: '0' },
            { name: 'commission', type: 'NUMERIC(20,8)', default: '0' },
            { name: 'is_profitable', type: 'BOOLEAN', default: null },
            { name: 'exit_price', type: 'NUMERIC(20,8)', default: null },
            { name: 'exit_time', type: 'TIMESTAMP', default: null },
            { name: 'duration_minutes', type: 'INTEGER', default: null }
        ];

        for (const column of orderColumns) {
            try {
                const checkColumn = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'order_executions_v2' 
                        AND column_name = $1
                    );
                `, [column.name]);

                if (!checkColumn.rows[0].exists) {
                    const defaultClause = column.default ? `DEFAULT ${column.default}` : '';
                    await pool.query(`
                        ALTER TABLE order_executions_v2 
                        ADD COLUMN ${column.name} ${column.type} ${defaultClause};
                    `);
                    console.log(`✅ Coluna order_executions_v2.${column.name} adicionada`);
                } else {
                    console.log(`✅ Coluna order_executions_v2.${column.name} já existe`);
                }
            } catch (error) {
                console.log(`⚠️ Erro ao adicionar coluna order_executions_v2.${column.name}:`, error.message);
            }
        }

        // 5. CRIAR FUNÇÃO PARA CALCULAR MÉTRICAS
        console.log('\n⚙️ Criando função de cálculo de métricas...');
        
        await pool.query(`
            CREATE OR REPLACE FUNCTION calculate_user_performance(user_id_param INTEGER)
            RETURNS VOID AS $$
            DECLARE
                total_trades_count INTEGER;
                winning_trades_count INTEGER;
                losing_trades_count INTEGER;
                total_pnl_sum NUMERIC;
                total_volume_sum NUMERIC;
                avg_return NUMERIC;
                win_rate NUMERIC;
                best_pnl NUMERIC;
                worst_pnl NUMERIC;
                last_trade TIMESTAMP;
            BEGIN
                -- Calcular métricas baseadas em order_executions_v2
                SELECT 
                    COUNT(*),
                    COUNT(CASE WHEN pnl > 0 THEN 1 END),
                    COUNT(CASE WHEN pnl < 0 THEN 1 END),
                    COALESCE(SUM(pnl), 0),
                    COALESCE(SUM(quantity * price), 0),
                    COALESCE(AVG(pnl), 0),
                    CASE WHEN COUNT(*) > 0 
                         THEN (COUNT(CASE WHEN pnl > 0 THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100 
                         ELSE 0 END,
                    COALESCE(MAX(pnl), 0),
                    COALESCE(MIN(pnl), 0),
                    MAX(created_at)
                INTO 
                    total_trades_count,
                    winning_trades_count,
                    losing_trades_count,
                    total_pnl_sum,
                    total_volume_sum,
                    avg_return,
                    win_rate,
                    best_pnl,
                    worst_pnl,
                    last_trade
                FROM order_executions_v2 
                WHERE user_id = user_id_param 
                  AND status = 'FILLED';

                -- Atualizar tabela users
                UPDATE users SET
                    total_trades = total_trades_count,
                    winning_trades = winning_trades_count,
                    losing_trades = losing_trades_count,
                    win_rate_percentage = win_rate,
                    total_pnl = total_pnl_sum,
                    total_volume_traded = total_volume_sum,
                    average_return_per_trade = avg_return,
                    accumulated_return = total_pnl_sum,
                    best_trade_pnl = best_pnl,
                    worst_trade_pnl = worst_pnl,
                    last_trade_date = last_trade,
                    performance_updated_at = NOW()
                WHERE id = user_id_param;
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('✅ Função calculate_user_performance criada');

        // 6. CALCULAR MÉTRICAS PARA TODOS OS USUÁRIOS
        console.log('\n🔄 Calculando métricas para todos os usuários...');
        
        const users = await pool.query('SELECT id FROM users WHERE is_active = true');
        
        for (const user of users.rows) {
            try {
                await pool.query('SELECT calculate_user_performance($1)', [user.id]);
            } catch (error) {
                console.log(`⚠️ Erro ao calcular métricas para usuário ${user.id}:`, error.message);
            }
        }

        console.log(`✅ Métricas calculadas para ${users.rows.length} usuários`);

        // 7. INSERIR DADOS AGUIA NEWS DE EXEMPLO
        console.log('\n🦅 Inserindo dados Aguia News de exemplo...');
        
        const aguiaCount = await pool.query('SELECT COUNT(*) FROM aguia_news_reports');
        
        if (aguiaCount.rows[0].count === '0') {
            await pool.query(`
                INSERT INTO aguia_news_reports (
                    report_type, title, content, summary, market_sentiment, 
                    fear_greed_index, btc_dominance, recommendations
                ) VALUES 
                (
                    'RADAR',
                    'Radar de Mercado - ${new Date().toLocaleDateString('pt-BR')}',
                    'Análise técnica e fundamental do mercado cripto. Bitcoin mantém tendência de alta com suporte em $42,000. Altcoins mostram sinais de recuperação.',
                    'Mercado em tendência de alta com BTC liderando o movimento',
                    'BULLISH',
                    75,
                    58.2,
                    '["Manter posições em BTC", "Observar ALTS para entrada", "Stop loss em 41,500"]'
                ),
                (
                    'ANALYSIS',
                    'Análise Semanal - Perspectivas Cripto',
                    'Análise detalhada dos principais movimentos da semana. Federal Reserve mantém juros, impulsionando criptomoedas.',
                    'Semana positiva para cripto com fluxo institucional',
                    'BULLISH',
                    78,
                    58.5,
                    '["Acumular em quedas", "DCA em BTC/ETH", "Cautela com micro caps"]'
                )
            `);
            
            console.log('✅ Dados Aguia News de exemplo inseridos');
        } else {
            console.log('✅ Dados Aguia News já existem');
        }

        console.log('\n🎯 MÉTRICAS DE PERFORMANCE CONFIGURADAS COM SUCESSO!');
        return true;

    } catch (error) {
        console.error('❌ Erro ao configurar métricas:', error);
        return false;
    } finally {
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    adicionarMetricasPerformance()
        .then(sucesso => {
            process.exit(sucesso ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ ERRO FATAL:', error);
            process.exit(1);
        });
}

module.exports = { adicionarMetricasPerformance };
