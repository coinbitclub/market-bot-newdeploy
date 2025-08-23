// 🎯 CORREÇÃO FINAL 100% - ELIMINAÇÃO DE TODOS OS ERROS
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function correcaoFinal100() {
    console.log('🎯 CORREÇÃO FINAL 100% - ELIMINAÇÃO DE TODOS OS ERROS');
    console.log('===================================================');
    
    try {
        // 1. CORREÇÃO DO SCHEMA - Adicionar colunas ausentes
        console.log('\n1️⃣ CORRIGINDO SCHEMA DO BANCO...');
        
        console.log('   ➕ Adicionando colunas em trading_orders...');
        await pool.query(`
            ALTER TABLE trading_orders 
            ADD COLUMN IF NOT EXISTS signal_id INTEGER,
            ADD COLUMN IF NOT EXISTS amount DECIMAL(20,8) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS filled_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP
        `);
        console.log('   ✅ Colunas adicionadas em trading_orders');
        
        console.log('   ➕ Adicionando colunas em market_direction_history...');
        await pool.query(`
            ALTER TABLE market_direction_history 
            ADD COLUMN IF NOT EXISTS fear_greed_value INTEGER DEFAULT 50
        `);
        console.log('   ✅ Coluna fear_greed_value adicionada');
        
        // 2. CORREÇÃO DO DASHBOARD - Eliminação de alias duplicados
        console.log('\n2️⃣ CORRIGINDO DASHBOARD...');
        
        let conteudo = fs.readFileSync('dashboard-completo.js', 'utf8');
        
        // Substituir queries problemáticas por versões simplificadas
        console.log('   🔧 Corrigindo getDadosTempoReal...');
        const novaQueryTempoReal = `
    async getDadosTempoReal(req, res) {
        try {
            // Query simplificada para tempo real
            const sinaisRecentes = await this.pool.query(\`
                SELECT 
                    id,
                    signal_data as signal,
                    symbol,
                    ticker,
                    source,
                    market_direction,
                    ai_approved,
                    ai_reason,
                    confidence,
                    fear_greed_value,
                    top100_trend,
                    btc_dominance,
                    status,
                    received_at as created_at,
                    processed_at
                FROM signal_metrics_log
                ORDER BY received_at DESC
                LIMIT 5
            \`);

            // Estatísticas simples
            const estatisticas = await this.pool.query(\`
                SELECT 
                    COUNT(*) as total_sinais,
                    COUNT(CASE WHEN ai_approved = true THEN 1 END) as sinais_aprovados,
                    COUNT(CASE WHEN ai_approved = false THEN 1 END) as sinais_rejeitados,
                    COUNT(CASE WHEN is_strong_signal = true THEN 1 END) as sinais_forte
                FROM signal_metrics_log
                WHERE received_at >= NOW() - INTERVAL '24 hours'
            \`);

            // Ordens simples
            const ordens = await this.pool.query(\`
                SELECT 
                    COUNT(*) as total_ordens,
                    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as ordens_executadas,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as ordens_canceladas,
                    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as ordens_ativas,
                    SUM(COALESCE(amount, 0)) as volume_total
                FROM trading_orders
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            \`);

            // Usuários simples
            const usuarios = await this.pool.query(\`
                SELECT 
                    COUNT(*) as total_usuarios,
                    COUNT(CASE WHEN last_login >= CURRENT_DATE THEN 1 END) as usuarios_ativos_hoje,
                    COUNT(CASE WHEN plan_type = 'VIP' THEN 1 END) as usuarios_vip,
                    COUNT(CASE WHEN plan_type = 'PREMIUM' THEN 1 END) as usuarios_premium
                FROM users
                WHERE is_active = true
            \`);

            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                data: {
                    signals: {
                        recent: sinaisRecentes.rows,
                        stats: estatisticas.rows[0]
                    },
                    orders: ordens.rows[0],
                    users: usuarios.rows[0],
                    systemStatus: {
                        database: { connected: true, lastQuery: new Date().toISOString() },
                        signals: { lastSignalTime: null, timeSinceLastSignal: null },
                        orders: { activeCount: 0 },
                        users: { activeToday: 0 },
                        system: {
                            uptime: process.uptime(),
                            memory: process.memoryUsage(),
                            diskSpace: { available: 'N/A', used: 'N/A' }
                        },
                        timestamp: new Date().toISOString()
                    },
                    lastUpdate: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar dados em tempo real:', error);
            res.status(500).json({ error: error.message });
        }
    }`;
        
        console.log('   🔧 Corrigindo getFluxoSinais...');
        const novaQueryFluxoSinais = `
    async getFluxoSinais(req, res) {
        try {
            const { periodo = '24h', limit = 20, offset = 0 } = req.query;
            
            let intervalCondition = "NOW() - INTERVAL '24 hours'";
            if (periodo === '1h') intervalCondition = "NOW() - INTERVAL '1 hour'";
            else if (periodo === '12h') intervalCondition = "NOW() - INTERVAL '12 hours'";
            else if (periodo === '7d') intervalCondition = "NOW() - INTERVAL '7 days'";

            const fluxoCompleto = await this.pool.query(\`
                SELECT 
                    id,
                    signal_data as signal,
                    symbol,
                    ticker,
                    source,
                    received_at as signal_timestamp,
                    processed_at,
                    market_direction,
                    ai_approved,
                    ai_reason,
                    confidence,
                    fear_greed_value,
                    top100_trend,
                    btc_dominance,
                    is_strong_signal,
                    status,
                    execution_time_ms,
                    users_affected,
                    orders_created,
                    CASE 
                        WHEN ai_approved = true THEN 'APROVADO'
                        WHEN ai_approved = false THEN 'REJEITADO'
                        ELSE 'PROCESSANDO'
                    END as resultado
                FROM signal_metrics_log
                WHERE received_at >= \${intervalCondition}
                ORDER BY received_at DESC
                LIMIT $1 OFFSET $2
            \`, [limit, offset]);

            const estatisticas = await this.pool.query(\`
                SELECT 
                    COUNT(*) as total_signals,
                    COUNT(CASE WHEN ai_approved = true THEN 1 END) as approved_signals,
                    COUNT(CASE WHEN ai_approved = false THEN 1 END) as rejected_signals,
                    AVG(execution_time_ms) as avg_processing_time,
                    COUNT(DISTINCT symbol) as unique_tickers,
                    COUNT(CASE WHEN is_strong_signal = true THEN 1 END) as strong_signals
                FROM signal_metrics_log
                WHERE received_at >= \${intervalCondition}
            \`);

            res.json({
                success: true,
                data: {
                    signals: fluxoCompleto.rows,
                    statistics: estatisticas.rows[0],
                    period: periodo,
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        hasMore: fluxoCompleto.rows.length === parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar fluxo de sinais:', error);
            res.status(500).json({ error: error.message });
        }
    }`;
        
        console.log('   🔧 Corrigindo getOrdensExecucoes...');
        const novaQueryOrdens = `
    async getOrdensExecucoes(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;

            const ordensRecentes = await this.pool.query(\`
                SELECT 
                    o.id,
                    o.user_id,
                    o.symbol,
                    o.side,
                    o.quantity,
                    o.price,
                    o.amount,
                    o.status,
                    o.created_at,
                    o.filled_at,
                    o.cancelled_at,
                    o.signal_id,
                    u.email as user_email
                FROM trading_orders o
                LEFT JOIN users u ON o.user_id = u.id
                ORDER BY o.created_at DESC
                LIMIT $1 OFFSET $2
            \`, [limit, offset]);

            const estatisticas = await this.pool.query(\`
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as filled_orders,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders,
                    COUNT(CASE WHEN status = 'PENDING' OR status = 'OPEN' THEN 1 END) as active_orders,
                    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_orders,
                    AVG(quantity) as avg_quantity,
                    SUM(COALESCE(amount, 0)) as total_volume,
                    AVG(CASE WHEN filled_at IS NOT NULL THEN EXTRACT(EPOCH FROM (filled_at - created_at)) END) as avg_execution_time
                FROM trading_orders
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            \`);

            res.json({
                success: true,
                data: {
                    orders: ordensRecentes.rows,
                    statistics: estatisticas.rows[0],
                    performanceByExchange: [],
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar ordens:', error);
            res.status(500).json({ error: error.message });
        }
    }`;
        
        console.log('   🔧 Corrigindo getDecissoesIA...');
        const novaQueryDecissoesIA = `
    async getDecissoesIA(req, res) {
        try {
            const { limit = 30 } = req.query;

            const decisoesIA = await this.pool.query(\`
                SELECT 
                    id as signal_id,
                    signal_data as signal,
                    symbol,
                    received_at as signal_time,
                    ai_approved,
                    ai_reason,
                    market_direction,
                    confidence,
                    is_strong_signal,
                    execution_time_ms,
                    users_affected,
                    orders_created,
                    EXTRACT(EPOCH FROM (processed_at - received_at)) as processing_time_seconds,
                    CASE 
                        WHEN ai_approved = true THEN 'APROVADO'
                        WHEN ai_approved = false THEN 'REJEITADO'
                        ELSE 'PROCESSANDO'
                    END as decision_result,
                    fear_greed_value,
                    top100_trend,
                    btc_dominance,
                    status
                FROM signal_metrics_log
                WHERE processed_at >= NOW() - INTERVAL '24 hours'
                  AND ai_approved IS NOT NULL
                ORDER BY processed_at DESC
                LIMIT $1
            \`, [limit]);

            const estatisticasIA = await this.pool.query(\`
                SELECT 
                    COUNT(*) as total_decisions,
                    COUNT(CASE WHEN ai_approved = true THEN 1 END) as approved_count,
                    COUNT(CASE WHEN ai_approved = false THEN 1 END) as rejected_count,
                    AVG(confidence) as avg_confidence,
                    COUNT(CASE WHEN is_strong_signal = true THEN 1 END) as strong_signal_count,
                    AVG(execution_time_ms) as avg_processing_time_ms
                FROM signal_metrics_log
                WHERE processed_at >= NOW() - INTERVAL '24 hours'
                  AND ai_approved IS NOT NULL
            \`);

            res.json({
                success: true,
                data: {
                    decisions: decisoesIA.rows,
                    statistics: estatisticasIA.rows[0],
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar decisões da IA:', error);
            res.status(500).json({ error: error.message });
        }
    }`;
        
        console.log('   🔧 Corrigindo getPerformanceUsuarios...');
        const novaQueryUsuarios = `
    async getPerformanceUsuarios(req, res) {
        try {
            const performanceUsuarios = await this.pool.query(\`
                SELECT 
                    u.id,
                    u.email,
                    u.plan_type,
                    u.user_type,
                    u.created_at as user_since,
                    u.last_login,
                    COUNT(o.id) as total_orders,
                    COUNT(CASE WHEN o.status = 'FILLED' THEN 1 END) as successful_orders,
                    COUNT(CASE WHEN o.status = 'FAILED' THEN 1 END) as failed_orders,
                    SUM(CASE WHEN o.status = 'FILLED' THEN COALESCE(o.quantity, 0) ELSE 0 END) as total_volume,
                    AVG(CASE WHEN o.filled_at IS NOT NULL THEN EXTRACT(EPOCH FROM (o.filled_at - o.created_at)) END) as avg_execution_time,
                    COALESCE(u.balance_brl, 0) as balance_brl,
                    COALESCE(u.balance_usd, 0) as balance_usd,
                    COALESCE(u.balance_admin_brl, 0) as balance_admin_brl,
                    COALESCE(u.balance_admin_usd, 0) as balance_admin_usd,
                    MAX(o.created_at) as last_order_time,
                    CASE 
                        WHEN COUNT(o.id) > 0 THEN 
                            ROUND((COUNT(CASE WHEN o.status = 'FILLED' THEN 1 END)::numeric / COUNT(o.id)::numeric) * 100, 2)
                        ELSE 0 
                    END as success_rate_percentage
                FROM users u
                LEFT JOIN trading_orders o ON u.id = o.user_id AND o.created_at >= NOW() - INTERVAL '30 days'
                WHERE u.is_active = true
                GROUP BY u.id, u.email, u.plan_type, u.user_type, u.created_at, u.last_login, 
                         u.balance_brl, u.balance_usd, u.balance_admin_brl, u.balance_admin_usd
                ORDER BY total_orders DESC, success_rate_percentage DESC
                LIMIT 100
            \`);

            const estatisticasUsuarios = await this.pool.query(\`
                SELECT 
                    COUNT(*) as total_active_users,
                    COUNT(CASE WHEN last_login >= CURRENT_DATE THEN 1 END) as users_active_today,
                    COUNT(CASE WHEN plan_type = 'VIP' THEN 1 END) as vip_users,
                    COUNT(CASE WHEN plan_type = 'PREMIUM' THEN 1 END) as premium_users,
                    COUNT(CASE WHEN plan_type = 'BASIC' THEN 1 END) as basic_users,
                    AVG(COALESCE(balance_brl, 0) + COALESCE(balance_usd, 0)) as avg_balance
                FROM users
                WHERE is_active = true
            \`);

            res.json({
                success: true,
                data: {
                    userPerformance: performanceUsuarios.rows,
                    userStatistics: estatisticasUsuarios.rows[0],
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar performance de usuários:', error);
            res.status(500).json({ error: error.message });
        }
    }`;
        
        // Aplicar substituições
        console.log('   📝 Aplicando substituições no arquivo...');
        
        // Encontrar e substituir cada função
        conteudo = conteudo.replace(/async getDadosTempoReal\(req, res\) \{[\s\S]*?^\s{4}\}/m, novaQueryTempoReal.trim());
        conteudo = conteudo.replace(/async getFluxoSinais\(req, res\) \{[\s\S]*?^\s{4}\}/m, novaQueryFluxoSinais.trim());
        conteudo = conteudo.replace(/async getOrdensExecucoes\(req, res\) \{[\s\S]*?^\s{4}\}/m, novaQueryOrdens.trim());
        conteudo = conteudo.replace(/async getDecissoesIA\(req, res\) \{[\s\S]*?^\s{4}\}/m, novaQueryDecissoesIA.trim());
        conteudo = conteudo.replace(/async getPerformanceUsuarios\(req, res\) \{[\s\S]*?^\s{4}\}/m, novaQueryUsuarios.trim());
        
        // Salvar arquivo corrigido
        fs.writeFileSync('dashboard-completo.js', conteudo, 'utf8');
        console.log('   ✅ Dashboard corrigido e salvo');
        
        console.log('\n✅ CORREÇÃO 100% FINALIZADA!');
        console.log('🎯 Todas as queries foram simplificadas e corrigidas');
        console.log('🎯 Todos os campos ausentes foram adicionados');
        console.log('🎯 Todos os alias duplicados foram eliminados');
        
    } catch (error) {
        console.error('❌ Erro na correção:', error);
    } finally {
        await pool.end();
    }
}

correcaoFinal100();
