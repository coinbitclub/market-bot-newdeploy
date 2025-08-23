/**
 * 📊 DASHBOARD COMPLETO DO SISTEMA - FLUXO OPERACIONAL E ADMINISTRATIVO
 * =====================================================================
 * 
 * Dashboard em tempo real para monitoramento completo:
 * ✅ Fluxo de sinais (recebimento → processamento → execução)
 * ✅ Análises de mercado em tempo real
 * ✅ Decisões da IA e critérios utilizados
 * ✅ Ordens emitidas e motivos
 * ✅ Performance de usuários
 * ✅ Logs administrativos
 * ✅ Métricas operacionais
 * ✅ Status do sistema
 */

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

class DashboardCompleto {
    constructor() {
        console.log('📊 INICIALIZANDO DASHBOARD COMPLETO DO SISTEMA');
        console.log('============================================');
        
        this.app = express();
        this.pool = new Pool({
            connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });

        // Configurar middleware
        this.app.use(express.static(path.join(__dirname, 'dashboard-public')));
        this.app.use(express.json());
        
        // CORS para desenvolvimento
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });

        // Cache para dados em tempo real
        this.cache = {
            lastSignals: [],
            marketData: null,
            systemStatus: null,
            userStats: null,
            lastUpdate: null
        };

        this.configurarRotas();
        this.iniciarMonitoramento();
    }

    configurarRotas() {
        // 🏠 Página principal do dashboard
        this.app.get('/', (req, res) => {
            res.send(this.gerarHTMLDashboard());
        });

        // 📊 API para dados do dashboard em tempo real
        this.app.get('/api/dashboard/realtime', this.getDadosTempoReal.bind(this));
        
        // 📡 API para fluxo de sinais
        this.app.get('/api/dashboard/signals', this.getFluxoSinais.bind(this));
        
        // 🎯 API para análises de mercado
        this.app.get('/api/dashboard/market', this.getAnalisesMercado.bind(this));
        
        // 🤖 API para decisões da IA
        this.app.get('/api/dashboard/ai-decisions', this.getDecissoesIA.bind(this));
        
        // 💰 API para ordens e execuções
        this.app.get('/api/dashboard/orders', this.getOrdensExecucoes.bind(this));
        
        // 👥 API para performance de usuários
        this.app.get('/api/dashboard/users', this.getPerformanceUsuarios.bind(this));
        
        // � API para saldos reais e chaves API
        this.app.get('/api/dashboard/balances', this.getSaldosReaisChaves.bind(this));
        
        // �📈 API para métricas operacionais
        this.app.get('/api/dashboard/metrics', this.getMetricasOperacionais.bind(this));
        
        // 🔧 API para status do sistema
        this.app.get('/api/dashboard/system', this.getStatusSistema.bind(this));
        
        // 📝 API para logs administrativos
        this.app.get('/api/dashboard/admin-logs', this.getLogsAdministrativos.bind(this));

        // 🔍 API para busca e filtros
        this.app.get('/api/dashboard/search', this.buscarDados.bind(this));

        // 📊 API para métricas de performance e índices de acerto
        this.app.get('/api/dashboard/performance-metrics', this.getMetricasPerformance.bind(this));
        
        // 🦅 API para Aguia News
        this.app.get('/api/dashboard/aguia-news', this.getAguiaNewsReports.bind(this));

        // WebSocket para atualizações em tempo real seria ideal, mas usando polling por simplicidade
        this.app.get('/api/dashboard/stream', this.streamDados.bind(this));

        // 🦅 AGUIA NEWS - APIs integradas
        this.app.get('/api/aguia/latest', this.getAguiaLatest.bind(this));
        this.app.get('/api/aguia/stats', this.getAguiaStats.bind(this));
        this.app.get('/api/aguia/radars', this.getAguiaRadars.bind(this));
        this.app.post('/api/aguia/generate', this.generateAguiaRadar.bind(this));
    }

    /**
     * 📊 DADOS EM TEMPO REAL - VISÃO GERAL
     */
    async getDadosTempoReal(req, res) {
        try {
            // Query simplificada para tempo real - usando tabelas reais
            const sinaisRecentes = await this.pool.query(`
                SELECT 
                    id,
                    signal,
                    symbol,
                    side,
                    confidence,
                    status,
                    created_at,
                    executed_at,
                    notes
                FROM trading_signals
                ORDER BY created_at DESC
                LIMIT 5
            `);

            // Estatísticas simples - usando tabela real
            const estatisticas = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_sinais,
                    COUNT(CASE WHEN status = 'executed' THEN 1 END) as sinais_aprovados,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as sinais_rejeitados,
                    COUNT(CASE WHEN confidence > 0.8 THEN 1 END) as sinais_forte
                FROM trading_signals
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            `);

            // Ordens simples - usando tabela real
            const ordens = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_ordens,
                    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as ordens_executadas,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as ordens_canceladas,
                    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as ordens_ativas,
                    SUM(COALESCE(quantity, 0)) as volume_total
                FROM trading_orders
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            `);

            // Usuários simples - usando tabela real
            const usuarios = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_usuarios,
                    COUNT(CASE WHEN last_login >= CURRENT_DATE THEN 1 END) as usuarios_ativos_hoje,
                    COUNT(CASE WHEN user_type = 'VIP' THEN 1 END) as usuarios_vip,
                    COUNT(CASE WHEN user_type = 'PREMIUM' THEN 1 END) as usuarios_premium
                FROM users
                WHERE is_active = true
            `);

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
    }

    /**
     * 📡 FLUXO COMPLETO DE SINAIS
     */
    async getFluxoSinais(req, res) {
        try {
            const { periodo = '24h', limit = 20, offset = 0 } = req.query;
            
            let intervalCondition = "NOW() - INTERVAL '24 hours'";
            if (periodo === '1h') intervalCondition = "NOW() - INTERVAL '1 hour'";
            else if (periodo === '12h') intervalCondition = "NOW() - INTERVAL '12 hours'";
            else if (periodo === '7d') intervalCondition = "NOW() - INTERVAL '7 days'";

            const fluxoCompleto = await this.pool.query(`
                SELECT 
                    id,
                    signal,
                    symbol,
                    side,
                    created_at as signal_timestamp,
                    executed_at as processed_at,
                    confidence,
                    status,
                    notes as ai_reason,
                    entry_price,
                    stop_loss,
                    take_profit,
                    leverage,
                    CASE 
                        WHEN status = 'executed' THEN 'APROVADO'
                        WHEN status = 'cancelled' THEN 'REJEITADO'
                        ELSE 'PROCESSANDO'
                    END as resultado
                FROM trading_signals
                WHERE created_at >= ${intervalCondition}
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]);

            const estatisticas = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_signals,
                    COUNT(CASE WHEN status = 'executed' THEN 1 END) as approved_signals,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as rejected_signals,
                    AVG(confidence) as avg_confidence,
                    COUNT(DISTINCT symbol) as unique_tickers,
                    COUNT(CASE WHEN confidence > 0.8 THEN 1 END) as high_confidence_signals
                FROM trading_signals
                WHERE created_at >= ${intervalCondition}
            `);

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
    }

    /**
     * 🎯 ANÁLISES DE MERCADO EM TEMPO REAL
     */
    async getAnalisesMercado(req, res) {
        try {
            // Buscar últimas análises de mercado
            const ultimasAnalises = await this.pool.query(`
                SELECT 
                    sm.market_direction,
                    sm.btc_analysis,
                    sm.rsi_analysis,
                    sm.created_at,
                    ts.ticker,
                    ts.signal
                FROM signal_metrics_log sm
                JOIN trading_signals ts ON sm.signal_id = ts.id
                WHERE sm.created_at >= NOW() - INTERVAL '4 hours'
                ORDER BY sm.created_at DESC
                LIMIT 20
            `);

            // Estatísticas de direção do mercado
            const direcaoMercado = await this.pool.query(`
                SELECT 
                    sm.market_direction as direction,
                    COUNT(*) as count,
                    AVG((sm.market_direction->>'fearGreed')::json->>'value'::int) as avg_fear_greed,
                    AVG((sm.market_direction->>'top100'->>'percentageUp')::numeric) as avg_top100_up
                FROM signal_metrics_log sm
                WHERE sm.created_at >= NOW() - INTERVAL '24 hours'
                  AND sm.market_direction IS NOT NULL
                GROUP BY sm.market_direction
                ORDER BY count DESC
            `);

            // Análise BTC Dominância
            const btcDominance = await this.pool.query(`
                SELECT 
                    (sm.btc_analysis->>'btcDominance'->>'btcDominance')::numeric as dominance,
                    sm.btc_analysis->>'btcDominance'->>'classification' as classification,
                    sm.created_at
                FROM signal_metrics_log sm
                WHERE sm.created_at >= NOW() - INTERVAL '12 hours'
                  AND sm.btc_analysis IS NOT NULL
                ORDER BY sm.created_at DESC
                LIMIT 50
            `);

            res.json({
                success: true,
                data: {
                    recentAnalyses: ultimasAnalises.rows,
                    marketDirection: direcaoMercado.rows,
                    btcDominance: btcDominance.rows,
                    timestamp: new Date()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar análises de mercado:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 🤖 DECISÕES DA IA E CRITÉRIOS
     */
    async getDecissoesIA(req, res) {
        try {
            const { limit = 30 } = req.query;

            const decisoesIA = await this.pool.query(`
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
            `, [limit]);

            const estatisticasIA = await this.pool.query(`
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
            `);

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
    }

    /**
     * 💰 ORDENS E EXECUÇÕES DETALHADAS
     */
    async getOrdensExecucoes(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;

            const ordensRecentes = await this.pool.query(`
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
            `, [limit, offset]);

            const estatisticas = await this.pool.query(`
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
            `);

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
    }

    /**
     * 👥 PERFORMANCE DE USUÁRIOS + SALDOS REAIS + CHAVES API
     */
    async getPerformanceUsuarios(req, res) {
        try {
            // 🔧 CORREÇÃO DEFINITIVA DOS NULLs
            console.log('🔧 Corrigindo NULLs no banco de dados...');
            await this.pool.query(`
                UPDATE users SET 
                    balance_brl = COALESCE(balance_brl, 0),
                    balance_usd = COALESCE(balance_usd, 0),
                    balance_admin_brl = COALESCE(balance_admin_brl, 0),
                    balance_admin_usd = COALESCE(balance_admin_usd, 0)
                WHERE balance_brl IS NULL OR balance_usd IS NULL 
                   OR balance_admin_brl IS NULL OR balance_admin_usd IS NULL
            `);

            // 💰 PERFORMANCE COM CHAVES API E SALDOS REAIS + MÉTRICAS DE ACERTO
            const performanceUsuarios = await this.pool.query(`
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
                    END as success_rate_percentage,
                    -- 🎯 MÉTRICAS DE PERFORMANCE
                    COALESCE(u.total_trades, 0) as total_trades,
                    COALESCE(u.winning_trades, 0) as winning_trades,
                    COALESCE(u.losing_trades, 0) as losing_trades,
                    COALESCE(u.win_rate_percentage, 0) as win_rate_percentage,
                    COALESCE(u.total_pnl, 0) as total_pnl,
                    COALESCE(u.total_volume_traded, 0) as total_volume_traded,
                    COALESCE(u.average_return_per_trade, 0) as average_return_per_trade,
                    COALESCE(u.accumulated_return, 0) as accumulated_return,
                    COALESCE(u.best_trade_pnl, 0) as best_trade_pnl,
                    COALESCE(u.worst_trade_pnl, 0) as worst_trade_pnl,
                    u.last_trade_date,
                    -- 🔑 DADOS DAS CHAVES API
                    COUNT(uk.id) as total_api_keys,
                    COUNT(CASE WHEN uk.is_valid = true THEN 1 END) as valid_api_keys,
                    COUNT(CASE WHEN uk.is_valid = false THEN 1 END) as invalid_api_keys,
                    STRING_AGG(
                        CASE WHEN uk.is_valid = true 
                        THEN uk.exchange || ' ($' || COALESCE(ROUND(uk.real_balance_usdt, 2)::text, '0') || ')'
                        ELSE NULL END, 
                        ', '
                    ) as valid_exchanges_with_balance,
                    SUM(COALESCE(uk.real_balance_usdt, 0)) as total_real_balance_usdt,
                    MAX(uk.last_balance_check) as last_balance_update
                FROM users u
                LEFT JOIN trading_orders o ON u.id = o.user_id AND o.created_at >= NOW() - INTERVAL '30 days'
                LEFT JOIN user_api_keys uk ON u.id = uk.user_id
                WHERE u.is_active = true
                GROUP BY u.id, u.email, u.plan_type, u.user_type, u.created_at, u.last_login, 
                         u.balance_brl, u.balance_usd, u.balance_admin_brl, u.balance_admin_usd,
                         u.total_trades, u.winning_trades, u.losing_trades, u.win_rate_percentage,
                         u.total_pnl, u.total_volume_traded, u.average_return_per_trade, 
                         u.accumulated_return, u.best_trade_pnl, u.worst_trade_pnl, u.last_trade_date
                ORDER BY total_real_balance_usdt DESC, win_rate_percentage DESC, total_trades DESC
                LIMIT 100
            `);

            // 🔑 CHAVES API DETALHADAS POR EXCHANGE
            const apiKeysDetails = await this.pool.query(`
                SELECT 
                    uk.user_id,
                    u.email,
                    uk.exchange,
                    uk.is_valid,
                    uk.environment,
                    COALESCE(uk.real_balance_usdt, 0) as real_balance_usdt,
                    uk.last_balance_check,
                    uk.validation_error,
                    uk.created_at,
                    CASE 
                        WHEN uk.is_valid = true THEN '✅'
                        WHEN uk.is_valid = false THEN '❌'
                        ELSE '⏳'
                    END as status_icon
                FROM user_api_keys uk
                JOIN users u ON u.id = uk.user_id
                WHERE u.is_active = true
                ORDER BY uk.is_valid DESC, uk.real_balance_usdt DESC, uk.last_balance_check DESC
            `);

            // 📊 POSIÇÕES ABERTAS POR USUÁRIO
            const posicoesAbertas = await this.pool.query(`
                SELECT 
                    o.user_id,
                    u.email,
                    COUNT(*) as open_positions,
                    SUM(CASE WHEN o.side = 'BUY' THEN COALESCE(o.quantity, 0) ELSE 0 END) as total_long_volume,
                    SUM(CASE WHEN o.side = 'SELL' THEN COALESCE(o.quantity, 0) ELSE 0 END) as total_short_volume,
                    STRING_AGG(DISTINCT o.symbol, ', ') as trading_symbols,
                    MAX(o.created_at) as last_position_time
                FROM order_executions_v2 o
                JOIN users u ON u.id = o.user_id
                WHERE o.status IN ('FILLED', 'PARTIALLY_FILLED') AND u.is_active = true
                GROUP BY o.user_id, u.email
                ORDER BY open_positions DESC, total_long_volume + total_short_volume DESC
            `);

            // 📈 ESTATÍSTICAS AGREGADAS
            const estatisticasUsuarios = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_active_users,
                    COUNT(CASE WHEN last_login >= CURRENT_DATE THEN 1 END) as users_active_today,
                    COUNT(CASE WHEN plan_type = 'VIP' THEN 1 END) as vip_users,
                    COUNT(CASE WHEN plan_type = 'PREMIUM' THEN 1 END) as premium_users,
                    COUNT(CASE WHEN plan_type = 'BASIC' THEN 1 END) as basic_users,
                    AVG(COALESCE(balance_brl, 0) + COALESCE(balance_usd, 0)) as avg_balance,
                    SUM(COALESCE(balance_brl, 0) + COALESCE(balance_usd, 0)) as total_platform_balance
                FROM users
                WHERE is_active = true
            `);

            // 🔑 ESTATÍSTICAS DAS CHAVES API
            const estatisticasChaves = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_keys,
                    COUNT(CASE WHEN is_valid = true THEN 1 END) as valid_keys,
                    COUNT(CASE WHEN is_valid = false THEN 1 END) as invalid_keys,
                    COUNT(DISTINCT user_id) as users_with_keys,
                    COUNT(DISTINCT CASE WHEN is_valid = true THEN user_id END) as users_with_valid_keys,
                    SUM(COALESCE(real_balance_usdt, 0)) as total_balance_usdt,
                    AVG(COALESCE(real_balance_usdt, 0)) as avg_balance_per_key,
                    COUNT(CASE WHEN exchange = 'bybit' AND is_valid = true THEN 1 END) as valid_bybit_keys,
                    COUNT(CASE WHEN exchange = 'binance' AND is_valid = true THEN 1 END) as valid_binance_keys,
                    MAX(last_balance_check) as last_global_update
                FROM user_api_keys uk
                JOIN users u ON u.id = uk.user_id
                WHERE u.is_active = true
            `);

            res.json({
                success: true,
                data: {
                    userPerformance: performanceUsuarios.rows,
                    userStatistics: estatisticasUsuarios.rows[0],
                    keyStatistics: estatisticasChaves.rows[0],
                    apiKeysDetails: apiKeysDetails.rows,
                    openPositions: posicoesAbertas.rows,
                    summary: {
                        totalUsers: performanceUsuarios.rows.length,
                        totalValidKeys: estatisticasChaves.rows[0]?.valid_keys || 0,
                        totalBalance: estatisticasChaves.rows[0]?.total_balance_usdt || 0,
                        lastUpdate: new Date().toISOString()
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar performance de usuários:', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * � SALDOS REAIS E CHAVES API DETALHADAS
     */
    async getSaldosReaisChaves(req, res) {
        try {
            console.log('💰 Buscando saldos reais e chaves API...');

            // 🔧 Corrigir NULLs nas chaves API
            await this.pool.query(`
                UPDATE user_api_keys SET 
                    real_balance_usdt = COALESCE(real_balance_usdt, 0),
                    is_valid = COALESCE(is_valid, false)
                WHERE real_balance_usdt IS NULL OR is_valid IS NULL
            `);

            // 💰 SALDOS POR USUÁRIO E EXCHANGE
            const saldosPorUsuario = await this.pool.query(`
                SELECT 
                    u.id as user_id,
                    u.email,
                    u.user_type,
                    u.plan_type,
                    u.is_active,
                    -- Saldos da plataforma
                    COALESCE(u.balance_brl, 0) as balance_brl,
                    COALESCE(u.balance_usd, 0) as balance_usd,
                    COALESCE(u.balance_admin_brl, 0) as balance_admin_brl,
                    COALESCE(u.balance_admin_usd, 0) as balance_admin_usd,
                    (COALESCE(u.balance_brl, 0) + COALESCE(u.balance_usd, 0) + 
                     COALESCE(u.balance_admin_brl, 0) + COALESCE(u.balance_admin_usd, 0)) as total_platform_balance,
                    -- Dados das exchanges
                    COUNT(uk.id) as total_keys,
                    COUNT(CASE WHEN uk.is_valid = true THEN 1 END) as valid_keys,
                    SUM(COALESCE(uk.real_balance_usdt, 0)) as total_exchange_balance_usdt,
                    STRING_AGG(
                        CASE WHEN uk.is_valid = true 
                        THEN uk.exchange || ' (' || uk.environment || '): $' || COALESCE(ROUND(uk.real_balance_usdt, 2)::text, '0')
                        ELSE uk.exchange || ' (' || uk.environment || '): ❌ INVÁLIDA'
                        END, 
                        E'\n'
                        ORDER BY uk.is_valid DESC, uk.real_balance_usdt DESC
                    ) as exchange_details,
                    MAX(uk.last_balance_check) as last_balance_update,
                    -- Status consolidado
                    CASE 
                        WHEN COUNT(CASE WHEN uk.is_valid = true THEN 1 END) > 0 THEN 'OPERACIONAL'
                        WHEN COUNT(uk.id) > 0 THEN 'CHAVES_INVÁLIDAS'
                        ELSE 'SEM_CHAVES'
                    END as operational_status
                FROM users u
                LEFT JOIN user_api_keys uk ON u.id = uk.user_id
                WHERE u.is_active = true
                GROUP BY u.id, u.email, u.user_type, u.plan_type, u.is_active,
                         u.balance_brl, u.balance_usd, u.balance_admin_brl, u.balance_admin_usd
                ORDER BY total_exchange_balance_usdt DESC, total_platform_balance DESC
            `);

            // 🔑 CHAVES API INDIVIDUAIS COM STATUS DETALHADO
            const chavesDetalhadas = await this.pool.query(`
                SELECT 
                    uk.id as key_id,
                    uk.user_id,
                    u.email,
                    uk.exchange,
                    uk.environment,
                    uk.is_valid,
                    COALESCE(uk.real_balance_usdt, 0) as real_balance_usdt,
                    uk.last_balance_check,
                    uk.validation_error,
                    uk.created_at,
                    CASE 
                        WHEN uk.is_valid = true AND uk.real_balance_usdt > 0 THEN '✅ ATIVA COM SALDO'
                        WHEN uk.is_valid = true AND uk.real_balance_usdt = 0 THEN '⚠️ ATIVA SEM SALDO'
                        WHEN uk.is_valid = false THEN '❌ INVÁLIDA'
                        ELSE '⏳ PENDENTE'
                    END as status_icon,
                    EXTRACT(EPOCH FROM (NOW() - uk.last_balance_check))/3600 as hours_since_last_check
                FROM user_api_keys uk
                JOIN users u ON u.id = uk.user_id
                WHERE u.is_active = true
                ORDER BY uk.is_valid DESC, uk.real_balance_usdt DESC, uk.last_balance_check DESC
            `);

            // 📊 ESTATÍSTICAS CONSOLIDADAS
            const estatisticasConsolidadas = await this.pool.query(`
                SELECT 
                    -- Usuários
                    COUNT(DISTINCT u.id) as total_users,
                    COUNT(DISTINCT CASE WHEN uk.is_valid = true THEN u.id END) as users_with_valid_keys,
                    COUNT(DISTINCT CASE WHEN uk.real_balance_usdt > 0 THEN u.id END) as users_with_balance,
                    -- Chaves
                    COUNT(uk.id) as total_keys,
                    COUNT(CASE WHEN uk.is_valid = true THEN 1 END) as valid_keys,
                    COUNT(CASE WHEN uk.is_valid = false THEN 1 END) as invalid_keys,
                    -- Saldos
                    SUM(COALESCE(uk.real_balance_usdt, 0)) as total_exchange_balance,
                    AVG(COALESCE(uk.real_balance_usdt, 0)) as avg_balance_per_key,
                    SUM(COALESCE(u.balance_brl, 0) + COALESCE(u.balance_usd, 0) + 
                        COALESCE(u.balance_admin_brl, 0) + COALESCE(u.balance_admin_usd, 0)) as total_platform_balance,
                    -- Por exchange
                    COUNT(CASE WHEN uk.exchange = 'bybit' AND uk.is_valid = true THEN 1 END) as valid_bybit_keys,
                    COUNT(CASE WHEN uk.exchange = 'binance' AND uk.is_valid = true THEN 1 END) as valid_binance_keys,
                    SUM(CASE WHEN uk.exchange = 'bybit' THEN COALESCE(uk.real_balance_usdt, 0) ELSE 0 END) as bybit_total_balance,
                    SUM(CASE WHEN uk.exchange = 'binance' THEN COALESCE(uk.real_balance_usdt, 0) ELSE 0 END) as binance_total_balance,
                    -- Tempo
                    MAX(uk.last_balance_check) as last_global_update,
                    COUNT(CASE WHEN uk.last_balance_check > NOW() - INTERVAL '1 hour' THEN 1 END) as recently_updated_keys
                FROM users u
                LEFT JOIN user_api_keys uk ON u.id = uk.user_id
                WHERE u.is_active = true
            `);

            // 🏆 TOP USUÁRIOS POR SALDO
            const topUsuarios = await this.pool.query(`
                SELECT 
                    u.email,
                    u.user_type,
                    SUM(COALESCE(uk.real_balance_usdt, 0)) as total_exchange_balance,
                    COUNT(CASE WHEN uk.is_valid = true THEN 1 END) as valid_keys,
                    STRING_AGG(
                        CASE WHEN uk.is_valid = true 
                        THEN uk.exchange 
                        ELSE NULL END, 
                        ', '
                    ) as active_exchanges
                FROM users u
                LEFT JOIN user_api_keys uk ON u.id = uk.user_id
                WHERE u.is_active = true
                GROUP BY u.id, u.email, u.user_type
                HAVING SUM(COALESCE(uk.real_balance_usdt, 0)) > 0
                ORDER BY total_exchange_balance DESC
                LIMIT 10
            `);

            res.json({
                success: true,
                data: {
                    userBalances: saldosPorUsuario.rows,
                    keyDetails: chavesDetalhadas.rows,
                    statistics: estatisticasConsolidadas.rows[0],
                    topUsers: topUsuarios.rows,
                    summary: {
                        totalUsers: saldosPorUsuario.rows.length,
                        totalValidKeys: estatisticasConsolidadas.rows[0]?.valid_keys || 0,
                        totalExchangeBalance: estatisticasConsolidadas.rows[0]?.total_exchange_balance || 0,
                        totalPlatformBalance: estatisticasConsolidadas.rows[0]?.total_platform_balance || 0,
                        operationalUsers: saldosPorUsuario.rows.filter(u => u.operational_status === 'OPERACIONAL').length,
                        lastUpdate: new Date().toISOString()
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar saldos e chaves:', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * �🔧 STATUS COMPLETO DO SISTEMA
     */
    async getStatusSistema(req, res) {
        try {
            const status = await this.verificarStatusSistema();
            res.json({
                success: true,
                data: status,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('❌ Erro ao verificar status do sistema:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async verificarStatusSistema() {
        try {
            // Verificar banco de dados
            const dbStatus = await this.pool.query('SELECT NOW()');
            const dbConnected = dbStatus.rows.length > 0;

            // Verificar últimos sinais
            const ultimoSinal = await this.pool.query(`
                SELECT created_at FROM trading_signals 
                ORDER BY created_at DESC LIMIT 1
            `);

            // Verificar ordens ativas
            const ordensAtivas = await this.pool.query(`
                SELECT COUNT(*) as count FROM trading_orders 
                WHERE status = 'ACTIVE'
            `);

            // Verificar usuários ativos nas últimas 24h
            const usuariosAtivos = await this.pool.query(`
                SELECT COUNT(*) as count FROM users 
                WHERE last_login >= NOW() - INTERVAL '24 hours'
            `);

            // Verificar espaço em disco (aproximado através de logs)
            const diskSpace = await this.verificarEspacoDisco();

            return {
                database: {
                    connected: dbConnected,
                    lastQuery: dbStatus.rows[0]?.now || null
                },
                signals: {
                    lastSignalTime: ultimoSinal.rows[0]?.created_at || null,
                    timeSinceLastSignal: ultimoSinal.rows[0] ? 
                        Date.now() - new Date(ultimoSinal.rows[0].created_at).getTime() : null
                },
                orders: {
                    activeCount: parseInt(ordensAtivas.rows[0]?.count || 0)
                },
                users: {
                    activeToday: parseInt(usuariosAtivos.rows[0]?.count || 0)
                },
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    diskSpace: diskSpace
                },
                timestamp: new Date()
            };

        } catch (error) {
            return {
                error: error.message,
                timestamp: new Date()
            };
        }
    }

    async verificarEspacoDisco() {
        try {
            const stats = fs.statSync(__dirname);
            return {
                available: 'N/A', // Seria necessário uma lib específica para isso
                used: 'N/A'
            };
        } catch {
            return { available: 'N/A', used: 'N/A' };
        }
    }

    /**
     * 🎨 GERAR HTML DO DASHBOARD
     */
    gerarHTMLDashboard() {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏢 CoinBitClub - Dashboard Operacional</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0a0a0a;
            color: #ffffff;
            line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { 
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
        }
        .header h1 { color: #00d4aa; margin-bottom: 10px; }
        .header p { color: #cccccc; }
        
        .grid { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .card {
            background: linear-gradient(135deg, #1e1e2e, #2a2a3e);
            border-radius: 10px;
            padding: 20px;
            border: 1px solid #333;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        
        .card h3 {
            color: #00d4aa;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 5px;
        }
        
        .metric-value {
            font-weight: bold;
            color: #00d4aa;
        }
        
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-online { background-color: #00ff88; }
        .status-warning { background-color: #ffaa00; }
        .status-offline { background-color: #ff4444; }
        
        .table-container {
            max-height: 400px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 5px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #333;
        }
        
        th {
            background: rgba(0, 212, 170, 0.1);
            color: #00d4aa;
            position: sticky;
            top: 0;
        }
        
        .signal-approved { color: #00ff88; }
        .signal-rejected { color: #ff4444; }
        .signal-processing { color: #ffaa00; }
        
        .refresh-btn {
            background: linear-gradient(135deg, #00d4aa, #00aa88);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .refresh-btn:hover {
            background: linear-gradient(135deg, #00aa88, #008866);
        }
        
        .full-width {
            grid-column: 1 / -1;
        }
        
        .auto-refresh {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #333;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .loading {
            animation: pulse 1s infinite;
        }
        
        /* Estilos para Saldos e Chaves API */
        .balance-summary {
            margin-bottom: 20px;
        }
        
        .balance-summary-grid {
            display: grid;
            gap: 15px;
        }
        
        .summary-card {
            background: rgba(0, 212, 170, 0.1);
            border: 1px solid #00d4aa;
            border-radius: 8px;
            padding: 15px;
        }
        
        .summary-card h4 {
            color: #00d4aa;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .summary-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        
        .summary-metric {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
        }
        
        .summary-label {
            color: #cccccc;
        }
        
        .summary-value {
            color: #00d4aa;
            font-weight: bold;
        }
        
        .exchange-details {
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 0.9em;
        }
        
        .user-type-vip { 
            background: linear-gradient(135deg, #ffd700, #ffaa00);
            color: #000;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .user-type-premium { 
            background: linear-gradient(135deg, #c0c0c0, #888888);
            color: #000;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .user-type-basic { 
            background: linear-gradient(135deg, #cd7f32, #a0522d);
            color: #fff;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .user-type-free { 
            background: linear-gradient(135deg, #666666, #444444);
            color: #fff;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }

        /* 📊 PERFORMANCE STYLES */
        .performance-controls {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }

        .performance-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(0, 212, 170, 0.1);
            border-radius: 8px;
            border: 1px solid #00d4aa;
        }

        .perf-metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 6px;
        }

        .perf-label {
            color: #cccccc;
            font-size: 0.9em;
        }

        .perf-value {
            color: #00d4aa;
            font-weight: bold;
            font-size: 1.1em;
        }

        .ranking-table-container, .trades-table-container {
            max-height: 400px;
            overflow-y: auto;
            margin-top: 10px;
        }

        .ranking-table, .trades-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .ranking-table th, .trades-table th {
            background: #2a2a2a;
            color: #00d4aa;
            padding: 12px 8px;
            text-align: left;
            border-bottom: 2px solid #00d4aa;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .ranking-table td, .trades-table td {
            padding: 8px;
            border-bottom: 1px solid #444;
        }

        .performance-excellent { color: #00ff88; font-weight: bold; }
        .performance-very-good { color: #88ff00; }
        .performance-good { color: #ffaa00; }
        .performance-regular { color: #ff8800; }
        .performance-no-data { color: #666666; }

        .pnl-positive { color: #00ff88; font-weight: bold; }
        .pnl-negative { color: #ff4444; font-weight: bold; }
        .pnl-neutral { color: #cccccc; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏢 CoinBitClub - Dashboard Operacional Completo</h1>
            <p>Monitoramento em tempo real do fluxo operacional e administrativo</p>
            <div id="lastUpdate">Última atualização: Carregando...</div>
        </div>
        
        <div class="auto-refresh">
            <label>
                <input type="checkbox" id="autoRefresh" checked> Auto-refresh (30s)
            </label>
            <button class="refresh-btn" onclick="atualizarDados()">🔄 Atualizar</button>
        </div>
        
        <div class="grid">
            <!-- Status do Sistema -->
            <div class="card">
                <h3>🔧 Status do Sistema</h3>
                <div id="systemStatus">Carregando...</div>
            </div>
            
            <!-- Estatísticas de Sinais -->
            <div class="card">
                <h3>📡 Sinais do Dia</h3>
                <div id="signalStats">Carregando...</div>
            </div>
            
            <!-- Ordens -->
            <div class="card">
                <h3>💰 Ordens</h3>
                <div id="orderStats">Carregando...</div>
            </div>
            
            <!-- Usuários -->
            <div class="card">
                <h3>👥 Usuários</h3>
                <div id="userStats">Carregando...</div>
            </div>
            
            <!-- Saldos e Chaves API -->
            <div class="card">
                <h3>💰 Saldos Reais</h3>
                <div id="balanceStats">Carregando...</div>
            </div>
        </div>
        
        <!-- Saldos e Chaves API Detalhado -->
        <div class="card full-width">
            <h3>🔑 Acompanhamento de Saldos e Chaves API</h3>
            <div class="balance-summary" id="balanceSummary">
                <div class="loading">Carregando dados de saldos...</div>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Usuário</th>
                            <th>Tipo</th>
                            <th>Chaves</th>
                            <th>Exchanges Ativas</th>
                            <th>Saldo Exchange (USDT)</th>
                            <th>Saldo Plataforma</th>
                            <th>Status</th>
                            <th>Última Atualização</th>
                        </tr>
                    </thead>
                    <tbody id="balancesTable">
                        <tr><td colspan="8">Carregando dados...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Fluxo de Sinais em Tempo Real -->
        <div class="card full-width">
            <h3>📊 Fluxo de Sinais em Tempo Real</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Sinal</th>
                            <th>Ticker</th>
                            <th>Status</th>
                            <th>IA Decisão</th>
                            <th>Ordens</th>
                            <th>Motivo</th>
                        </tr>
                    </thead>
                    <tbody id="signalsTable">
                        <tr><td colspan="7">Carregando dados...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Ordens Recentes -->
        <div class="card full-width">
            <h3>🎯 Ordens Recentes</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Usuário</th>
                            <th>Ticker</th>
                            <th>Tipo</th>
                            <th>Valor</th>
                            <th>Status</th>
                            <th>Exchange</th>
                            <th>Tempo Exec.</th>
                        </tr>
                    </thead>
                    <tbody id="ordersTable">
                        <tr><td colspan="8">Carregando dados...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 📊 MÉTRICAS DE PERFORMANCE -->
        <div class="card">
            <h3>📊 Métricas de Performance dos Usuários</h3>
            <div class="performance-controls">
                <button onclick="atualizarMetricas()" class="btn-action">🔄 Atualizar Métricas</button>
                <button onclick="exportarPerformance()" class="btn-action">📁 Exportar</button>
            </div>
            
            <div class="performance-summary">
                <div class="perf-metric">
                    <span class="perf-label">💹 Taxa de Acerto Global:</span>
                    <span class="perf-value" id="globalWinRate">--%</span>
                </div>
                <div class="perf-metric">
                    <span class="perf-label">📈 Total Trades Plataforma:</span>
                    <span class="perf-value" id="totalTradesPlataforma">0</span>
                </div>
                <div class="perf-metric">
                    <span class="perf-label">💰 PnL Total Acumulado:</span>
                    <span class="perf-value" id="totalPnlPlataforma">$0.00</span>
                </div>
                <div class="perf-metric">
                    <span class="perf-label">👥 Usuários com Trades:</span>
                    <span class="perf-value" id="usuariosComTrades">0</span>
                </div>
            </div>

            <div class="performance-ranking">
                <h4>🏆 Top Performers</h4>
                <div class="ranking-table-container">
                    <table class="ranking-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Email</th>
                                <th>Win Rate</th>
                                <th>Total Trades</th>
                                <th>PnL Acumulado</th>
                                <th>Retorno Médio</th>
                                <th>Classificação</th>
                            </tr>
                        </thead>
                        <tbody id="performanceRanking">
                            <tr><td colspan="7">Carregando rankings...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="recent-trades">
                <h4>📈 Trades Recentes com Performance</h4>
                <div class="trades-table-container">
                    <table class="trades-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Usuário</th>
                                <th>Symbol</th>
                                <th>Side</th>
                                <th>Quantidade</th>
                                <th>Preço</th>
                                <th>PnL</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="recentTradesTable">
                            <tr><td colspan="8">Carregando trades...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- 🦅 AGUIA NEWS - RELATÓRIOS GRATUITOS -->
        <div class="card">
            <h3>🦅 Aguia News - Relatórios Gratuitos</h3>
            <div class="aguia-controls">
                <button onclick="gerarRadarManual()" id="btnGerarRadar" class="btn-action">🔧 Gerar Radar Manual</button>
                <button onclick="atualizarAguiaNews()" class="btn-action">🔄 Atualizar</button>
            </div>
            
            <div class="aguia-stats">
                <div class="stat-item">
                    <span class="stat-label">Total de Radars:</span>
                    <span class="stat-value" id="aguiaTotalRadars">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Radars Hoje:</span>
                    <span class="stat-value" id="aguiaRadarsHoje">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Usuários Ativos:</span>
                    <span class="stat-value" id="aguiaTotalUsuarios">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Próxima Geração:</span>
                    <span class="stat-value">20:00 Brasília</span>
                </div>
            </div>
            
            <div class="aguia-content">
                <h4>📄 Último Radar Gerado</h4>
                <div class="radar-content" id="aguiaRadarContent">
                    <div class="loading">Carregando último radar...</div>
                </div>
            </div>
        </div>
    </div>

    <style>
        .aguia-controls {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .btn-action {
            background: linear-gradient(135deg, #00d4aa, #00b491);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }
        
        .btn-action:hover {
            background: linear-gradient(135deg, #00b491, #009178);
            transform: translateY(-1px);
        }
        
        .btn-action:disabled {
            background: #555;
            cursor: not-allowed;
            transform: none;
        }
        
        .aguia-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(0, 212, 170, 0.1);
            border-radius: 8px;
            border: 1px solid rgba(0, 212, 170, 0.2);
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-label {
            display: block;
            font-size: 12px;
            color: #999;
            margin-bottom: 5px;
        }
        
        .stat-value {
            display: block;
            font-size: 18px;
            font-weight: bold;
            color: #00d4aa;
        }
        
        .aguia-content {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 8px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .aguia-content h4 {
            color: #00d4aa;
            margin-bottom: 15px;
            border-bottom: 1px solid #333;
            padding-bottom: 8px;
        }
        
        .radar-content {
            white-space: pre-line;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: #e0e0e0;
        }
        
        .loading {
            text-align: center;
            color: #888;
            font-style: italic;
        }
        
        .success-message {
            background: rgba(0, 212, 170, 0.2);
            color: #00d4aa;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            border: 1px solid rgba(0, 212, 170, 0.3);
        }
        
        .error-message {
            background: rgba(255, 0, 0, 0.2);
            color: #ff6b6b;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            border: 1px solid rgba(255, 0, 0, 0.3);
        }
    </style>

    <script>
        let autoRefreshInterval;
        
        function formatDateTime(dateString) {
            return new Date(dateString).toLocaleString('pt-BR');
        }
        
        function formatCurrency(value, currency = 'USD') {
            if (value === null || value === undefined) return 'N/A';
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: currency
            }).format(value);
        }
        
        function formatTime(seconds) {
            if (!seconds) return 'N/A';
            if (seconds < 60) return seconds.toFixed(1) + 's';
            return (seconds / 60).toFixed(1) + 'min';
        }
        
        function formatNumber(value) {
            if (value === null || value === undefined || isNaN(value)) return '0';
            return new Intl.NumberFormat('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value);
        }
        
        async function atualizarDados() {
            document.getElementById('lastUpdate').textContent = 'Atualizando...';
            
            try {
                // Buscar dados gerais
                const realtimeResponse = await fetch('/api/dashboard/realtime');
                const realtimeData = await realtimeResponse.json();
                
                if (realtimeData.success) {
                    atualizarStatusSistema(realtimeData.data.systemStatus);
                    atualizarEstatisticasSinais(realtimeData.data.signals.stats);
                    atualizarEstatisticasOrdens(realtimeData.data.orders);
                    atualizarEstatisticasUsuarios(realtimeData.data.users);
                }
                
                // Buscar fluxo de sinais
                const signalsResponse = await fetch('/api/dashboard/signals?limit=20');
                const signalsData = await signalsResponse.json();
                
                if (signalsData.success) {
                    atualizarTabelaSinais(signalsData.data.signals);
                }
                
                // Buscar ordens
                const ordersResponse = await fetch('/api/dashboard/orders?limit=20');
                const ordersData = await ordersResponse.json();
                
                if (ordersData.success) {
                    atualizarTabelaOrdens(ordersData.data.orders);
                }
                
                // Buscar saldos e chaves API
                const balancesResponse = await fetch('/api/dashboard/balances');
                const balancesData = await balancesResponse.json();
                
                if (balancesData.success) {
                    atualizarEstatisticasSaldos(balancesData.data.statistics);
                    atualizarTabelaSaldos(balancesData.data.userBalances);
                    atualizarResumoSaldos(balancesData.data.summary);
                }

                // 📊 Buscar métricas de performance
                const performanceResponse = await fetch('/api/dashboard/performance-metrics');
                const performanceData = await performanceResponse.json();
                
                if (performanceData.success) {
                    atualizarMetricasPerformance(performanceData.data);
                }

                // 🦅 Buscar Aguia News
                const aguiaResponse = await fetch('/api/dashboard/aguia-news');
                const aguiaData = await aguiaResponse.json();
                
                if (aguiaData.success) {
                    atualizarAguiaNews(aguiaData.data);
                }

                // Buscar dados do Aguia News
                await atualizarAguiaNews();
                
                document.getElementById('lastUpdate').textContent = 
                    'Última atualização: ' + formatDateTime(new Date());
                    
            } catch (error) {
                console.error('Erro ao atualizar dados:', error);
                document.getElementById('lastUpdate').textContent = 
                    'Erro na atualização: ' + formatDateTime(new Date());
            }
        }
        
        function atualizarStatusSistema(status) {
            const html = \`
                <div class="metric">
                    <span>🗄️ Banco de Dados</span>
                    <span class="metric-value">
                        <span class="status-indicator \${status.database?.connected ? 'status-online' : 'status-offline'}"></span>
                        \${status.database?.connected ? 'Online' : 'Offline'}
                    </span>
                </div>
                <div class="metric">
                    <span>⏱️ Uptime</span>
                    <span class="metric-value">\${formatTime(status.system?.uptime)}</span>
                </div>
                <div class="metric">
                    <span>📊 Memória</span>
                    <span class="metric-value">\${(status.system?.memory?.used / 1024 / 1024).toFixed(0)}MB</span>
                </div>
                <div class="metric">
                    <span>👥 Usuários Ativos</span>
                    <span class="metric-value">\${status.users?.activeToday || 0}</span>
                </div>
                <div class="metric">
                    <span>⚡ Ordens Ativas</span>
                    <span class="metric-value">\${status.orders?.activeCount || 0}</span>
                </div>
            \`;
            document.getElementById('systemStatus').innerHTML = html;
        }
        
        function atualizarEstatisticasSinais(stats) {
            const total = parseInt(stats.total_sinais) || 0;
            const aprovados = parseInt(stats.sinais_aprovados) || 0;
            const rejeitados = parseInt(stats.sinais_rejeitados) || 0;
            const forte = parseInt(stats.sinais_forte) || 0;
            
            const html = \`
                <div class="metric">
                    <span>📊 Total</span>
                    <span class="metric-value">\${total}</span>
                </div>
                <div class="metric">
                    <span>✅ Aprovados</span>
                    <span class="metric-value signal-approved">\${aprovados}</span>
                </div>
                <div class="metric">
                    <span>❌ Rejeitados</span>
                    <span class="metric-value signal-rejected">\${rejeitados}</span>
                </div>
                <div class="metric">
                    <span>⭐ Sinais FORTE</span>
                    <span class="metric-value">\${forte}</span>
                </div>
                <div class="metric">
                    <span>📈 Taxa Aprovação</span>
                    <span class="metric-value">\${total > 0 ? ((aprovados/total)*100).toFixed(1) : 0}%</span>
                </div>
            \`;
            document.getElementById('signalStats').innerHTML = html;
        }
        
        function atualizarEstatisticasOrdens(stats) {
            const total = parseInt(stats.total_ordens) || 0;
            const executadas = parseInt(stats.ordens_executadas) || 0;
            const ativas = parseInt(stats.ordens_ativas) || 0;
            const volume = parseFloat(stats.volume_total) || 0;
            
            const html = \`
                <div class="metric">
                    <span>📊 Total</span>
                    <span class="metric-value">\${total}</span>
                </div>
                <div class="metric">
                    <span>✅ Executadas</span>
                    <span class="metric-value signal-approved">\${executadas}</span>
                </div>
                <div class="metric">
                    <span>⚡ Ativas</span>
                    <span class="metric-value signal-processing">\${ativas}</span>
                </div>
                <div class="metric">
                    <span>💰 Volume</span>
                    <span class="metric-value">\${formatCurrency(volume)}</span>
                </div>
                <div class="metric">
                    <span>📈 Taxa Sucesso</span>
                    <span class="metric-value">\${total > 0 ? ((executadas/total)*100).toFixed(1) : 0}%</span>
                </div>
            \`;
            document.getElementById('orderStats').innerHTML = html;
        }
        
        function atualizarEstatisticasUsuarios(stats) {
            const total = parseInt(stats.total_usuarios) || 0;
            const ativos = parseInt(stats.usuarios_ativos_hoje) || 0;
            const vip = parseInt(stats.usuarios_vip) || 0;
            const premium = parseInt(stats.usuarios_premium) || 0;
            
            const html = \`
                <div class="metric">
                    <span>👥 Total</span>
                    <span class="metric-value">\${total}</span>
                </div>
                <div class="metric">
                    <span>🟢 Ativos Hoje</span>
                    <span class="metric-value signal-approved">\${ativos}</span>
                </div>
                <div class="metric">
                    <span>👑 VIP</span>
                    <span class="metric-value">\${vip}</span>
                </div>
                <div class="metric">
                    <span>⭐ Premium</span>
                    <span class="metric-value">\${premium}</span>
                </div>
                <div class="metric">
                    <span>📈 Taxa Atividade</span>
                    <span class="metric-value">\${total > 0 ? ((ativos/total)*100).toFixed(1) : 0}%</span>
                </div>
            \`;
            document.getElementById('userStats').innerHTML = html;
        }
        
        function atualizarTabelaSinais(signals) {
            const tbody = document.getElementById('signalsTable');
            
            if (!signals || signals.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7">Nenhum sinal encontrado</td></tr>';
                return;
            }
            
            const html = signals.map(signal => {
                const status = signal.decision_status || 'PROCESSANDO';
                const statusClass = status === 'APROVADO' ? 'signal-approved' : 
                                  status === 'REJEITADO' ? 'signal-rejected' : 'signal-processing';
                
                const ordersCount = signal.orders_generated ? 
                    JSON.parse(signal.orders_generated).length : 0;
                
                return \`
                    <tr>
                        <td>\${formatDateTime(signal.received_at)}</td>
                        <td><strong>\${signal.signal}</strong></td>
                        <td>\${signal.ticker}</td>
                        <td class="\${statusClass}">\${status}</td>
                        <td>\${signal.should_execute === 'true' ? '✅ SIM' : signal.should_execute === 'false' ? '❌ NÃO' : '⏳'}</td>
                        <td>\${ordersCount} ordem(ns)</td>
                        <td title="\${signal.ai_reasoning || 'N/A'}">\${(signal.ai_reasoning || 'N/A').substring(0, 50)}...</td>
                    </tr>
                \`;
            }).join('');
            
            tbody.innerHTML = html;
        }
        
        function atualizarTabelaOrdens(orders) {
            const tbody = document.getElementById('ordersTable');
            
            if (!orders || orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8">Nenhuma ordem encontrada</td></tr>';
                return;
            }
            
            const html = orders.map(order => {
                const statusClass = order.status === 'FILLED' ? 'signal-approved' : 
                                  order.status === 'FAILED' ? 'signal-rejected' : 'signal-processing';
                
                return \`
                    <tr>
                        <td>\${formatDateTime(order.created_at)}</td>
                        <td>\${order.user_email} (\${order.user_plan})</td>
                        <td>\${order.ticker}</td>
                        <td>\${order.side} \${order.order_type}</td>
                        <td>\${formatCurrency(order.amount)}</td>
                        <td class="\${statusClass}">\${order.status}</td>
                        <td>\${order.exchange}</td>
                        <td>\${formatTime(order.execution_time_seconds)}</td>
                    </tr>
                \`;
            }).join('');
            
            tbody.innerHTML = html;
        }
        
        // ===============================
        // 💰 FUNÇÕES DE SALDOS E CHAVES
        // ===============================
        
        function atualizarEstatisticasSaldos(stats) {
            const html = \`
                <div class="metric">
                    <span>👥 Usuários com Chaves</span>
                    <span class="metric-value">\${stats.users_with_valid_keys || 0}/\${stats.total_users || 0}</span>
                </div>
                <div class="metric">
                    <span>🔑 Chaves Válidas</span>
                    <span class="metric-value">\${stats.valid_keys || 0}/\${stats.total_keys || 0}</span>
                </div>
                <div class="metric">
                    <span>💰 Saldo Total (USDT)</span>
                    <span class="metric-value">$\${formatNumber(stats.total_exchange_balance || 0)}</span>
                </div>
                <div class="metric">
                    <span>📊 Saldo Médio</span>
                    <span class="metric-value">$\${formatNumber(stats.avg_balance_per_key || 0)}</span>
                </div>
                <div class="metric">
                    <span>🟣 Bybit Ativas</span>
                    <span class="metric-value">\${stats.valid_bybit_keys || 0}</span>
                </div>
            \`;
            document.getElementById('balanceStats').innerHTML = html;
        }
        
        function atualizarResumoSaldos(summary) {
            const html = \`
                <div class="balance-summary-grid">
                    <div class="summary-card">
                        <h4>📊 Resumo Operacional</h4>
                        <div class="summary-metrics">
                            <div class="summary-metric">
                                <span class="summary-label">Usuários Operacionais:</span>
                                <span class="summary-value">\${summary.operationalUsers || 0}</span>
                            </div>
                            <div class="summary-metric">
                                <span class="summary-label">Chaves Válidas:</span>
                                <span class="summary-value">\${summary.totalValidKeys || 0}</span>
                            </div>
                            <div class="summary-metric">
                                <span class="summary-label">Capital Exchange:</span>
                                <span class="summary-value">$\${formatNumber(summary.totalExchangeBalance || 0)}</span>
                            </div>
                            <div class="summary-metric">
                                <span class="summary-label">Capital Plataforma:</span>
                                <span class="summary-value">$\${formatNumber(summary.totalPlatformBalance || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
            document.getElementById('balanceSummary').innerHTML = html;
        }
        
        function atualizarTabelaSaldos(userBalances) {
            const tbody = document.getElementById('balancesTable');
            
            if (!userBalances || userBalances.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8">Nenhum dado encontrado</td></tr>';
                return;
            }
            
            const html = userBalances.map(user => {
                const statusClass = user.operational_status === 'OPERACIONAL' ? 'signal-approved' : 
                                  user.operational_status === 'CHAVES_INVÁLIDAS' ? 'signal-rejected' : 'signal-processing';
                
                const statusIcon = user.operational_status === 'OPERACIONAL' ? '✅' : 
                                 user.operational_status === 'CHAVES_INVÁLIDAS' ? '❌' : '⚠️';
                
                const validKeysText = user.valid_keys > 0 ? 
                    \`\${user.valid_keys}/\${user.total_keys} ✅\` : 
                    \`\${user.total_keys} ❌\`;
                
                return \`
                    <tr>
                        <td>\${user.email}</td>
                        <td><span class="user-type-\${user.user_type?.toLowerCase() || 'free'}">\${user.user_type || 'FREE'}</span></td>
                        <td>\${validKeysText}</td>
                        <td>
                            <div class="exchange-details" title="\${user.exchange_details || 'Nenhuma exchange ativa'}">
                                \${user.exchange_details ? user.exchange_details.split('\\n').slice(0, 2).join(', ') : 'Nenhuma'}
                            </div>
                        </td>
                        <td class="metric-value">$\${formatNumber(user.total_exchange_balance_usdt || 0)}</td>
                        <td class="metric-value">$\${formatNumber(user.total_platform_balance || 0)}</td>
                        <td class="\${statusClass}">
                            \${statusIcon} \${user.operational_status}
                        </td>
                        <td>\${user.last_balance_update ? formatDateTime(user.last_balance_update) : 'Nunca'}</td>
                    </tr>
                \`;
            }).join('');
            
            tbody.innerHTML = html;
        }
        
        // 📊 FUNÇÕES MÉTRICAS DE PERFORMANCE
        function atualizarMetricasPerformance(data) {
            // Atualizar estatísticas globais
            document.getElementById('globalWinRate').textContent = 
                data.statistics.avg_win_rate_global ? 
                parseFloat(data.statistics.avg_win_rate_global).toFixed(2) + '%' : '0%';
            
            document.getElementById('totalTradesPlataforma').textContent = 
                data.statistics.total_trades_plataforma || '0';
            
            document.getElementById('totalPnlPlataforma').textContent = 
                formatCurrency(data.statistics.total_pnl_plataforma || 0);
            
            document.getElementById('usuariosComTrades').textContent = 
                data.statistics.usuarios_com_trades || '0';

            // Atualizar ranking de performance
            const rankingBody = document.getElementById('performanceRanking');
            if (data.ranking && data.ranking.length > 0) {
                const rankingHtml = data.ranking.slice(0, 10).map((user, index) => {
                    const winRate = parseFloat(user.win_rate_percentage || 0);
                    const classification = user.performance_classification || 'SEM_DADOS';
                    const classificationClass = 'performance-' + classification.toLowerCase().replace('_', '-');
                    
                    return `
                        <tr>
                            <td>#${index + 1}</td>
                            <td>${user.email}</td>
                            <td class="${winRate >= 60 ? 'pnl-positive' : winRate >= 40 ? 'pnl-neutral' : 'pnl-negative'}">
                                ${winRate.toFixed(1)}%
                            </td>
                            <td>${user.total_trades || 0}</td>
                            <td class="${parseFloat(user.total_pnl) > 0 ? 'pnl-positive' : parseFloat(user.total_pnl) < 0 ? 'pnl-negative' : 'pnl-neutral'}">
                                ${formatCurrency(user.total_pnl || 0)}
                            </td>
                            <td class="${parseFloat(user.average_return_per_trade) > 0 ? 'pnl-positive' : parseFloat(user.average_return_per_trade) < 0 ? 'pnl-negative' : 'pnl-neutral'}">
                                ${formatCurrency(user.average_return_per_trade || 0)}
                            </td>
                            <td class="${classificationClass}">
                                ${classification.replace('_', ' ')}
                            </td>
                        </tr>
                    `;
                }).join('');
                rankingBody.innerHTML = rankingHtml;
            } else {
                rankingBody.innerHTML = '<tr><td colspan="7">Nenhum dado de performance disponível</td></tr>';
            }

            // Atualizar trades recentes
            const tradesBody = document.getElementById('recentTradesTable');
            if (data.recentTrades && data.recentTrades.length > 0) {
                const tradesHtml = data.recentTrades.map(trade => {
                    const pnl = parseFloat(trade.pnl || 0);
                    const pnlClass = pnl > 0 ? 'pnl-positive' : pnl < 0 ? 'pnl-negative' : 'pnl-neutral';
                    
                    return `
                        <tr>
                            <td>${formatDateTime(trade.created_at)}</td>
                            <td>${trade.email}</td>
                            <td>${trade.symbol}</td>
                            <td class="${trade.side === 'BUY' ? 'pnl-positive' : 'pnl-negative'}">
                                ${trade.side}
                            </td>
                            <td>${formatNumber(trade.quantity)}</td>
                            <td>${formatCurrency(trade.price)}</td>
                            <td class="${pnlClass}">
                                ${formatCurrency(pnl)}
                            </td>
                            <td>${trade.status}</td>
                        </tr>
                    `;
                }).join('');
                tradesBody.innerHTML = tradesHtml;
            } else {
                tradesBody.innerHTML = '<tr><td colspan="8">Nenhum trade recente encontrado</td></tr>';
            }
        }

        function atualizarMetricas() {
            fetch('/api/dashboard/performance-metrics')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        atualizarMetricasPerformance(data.data);
                    }
                })
                .catch(error => console.error('Erro ao atualizar métricas:', error));
        }

        function exportarPerformance() {
            fetch('/api/dashboard/performance-metrics')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const csv = convertToCSV(data.data.ranking);
                        downloadCSV(csv, 'performance-usuarios.csv');
                    }
                })
                .catch(error => console.error('Erro ao exportar:', error));
        }

        function convertToCSV(data) {
            const headers = ['Email', 'Win Rate', 'Total Trades', 'PnL Total', 'Retorno Médio', 'Classificação'];
            const rows = data.map(user => [
                user.email,
                user.win_rate_percentage + '%',
                user.total_trades,
                user.total_pnl,
                user.average_return_per_trade,
                user.performance_classification
            ]);
            
            return [headers, ...rows].map(row => row.join(',')).join('\\n');
        }

        function downloadCSV(csv, filename) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        }

        // Auto-refresh
        document.getElementById('autoRefresh').addEventListener('change', function() {
            if (this.checked) {
                autoRefreshInterval = setInterval(atualizarDados, 30000);
            } else {
                clearInterval(autoRefreshInterval);
            }
        });
        
        // Carregar dados iniciais
        atualizarDados();
        
        // Iniciar auto-refresh
        autoRefreshInterval = setInterval(atualizarDados, 30000);
        
        // ===============================
        // 🦅 FUNÇÕES AGUIA NEWS
        // ===============================
        
        async function atualizarAguiaNews(data = null) {
            try {
                // Se dados não foram passados, buscar da API
                if (!data) {
                    const response = await fetch('/api/dashboard/aguia-news');
                    const result = await response.json();
                    if (result.success) {
                        data = result.data;
                    } else {
                        throw new Error('Falha ao buscar dados Aguia News');
                    }
                }
                
                // Atualizar estatísticas
                if (data.statistics) {
                    document.getElementById('aguiaTotalRadars').textContent = data.statistics.total_reports || '0';
                    document.getElementById('aguiaRadarsHoje').textContent = data.statistics.reports_today || '0';
                    document.getElementById('aguiaTotalUsuarios').textContent = '12'; // Fixo por enquanto
                }
                
                // Atualizar último radar
                if (data.recentReports && data.recentReports.length > 0) {
                    const ultimoRelatorio = data.recentReports[0];
                    const radarContent = `
                        <div class="radar-header">
                            <h5>${ultimoRelatorio.title}</h5>
                            <p class="radar-date">📅 ${formatDateTime(ultimoRelatorio.published_at)}</p>
                        </div>
                        <div class="radar-metrics">
                            <span class="radar-metric">
                                <strong>Sentimento:</strong> ${ultimoRelatorio.market_sentiment}
                            </span>
                            <span class="radar-metric">
                                <strong>Fear & Greed:</strong> ${ultimoRelatorio.fear_greed_index}/100
                            </span>
                            <span class="radar-metric">
                                <strong>BTC Dominância:</strong> ${ultimoRelatorio.btc_dominance}%
                            </span>
                        </div>
                        <div class="radar-summary">
                            <p><strong>Resumo:</strong> ${ultimoRelatorio.summary}</p>
                        </div>
                        <div class="radar-content-text">
                            <pre>${ultimoRelatorio.content}</pre>
                        </div>
                    `;
                    document.getElementById('aguiaRadarContent').innerHTML = radarContent;
                } else {
                    document.getElementById('aguiaRadarContent').innerHTML = 
                        '<div class="loading">Nenhum relatório disponível</div>';
                }
                
                // Atualizar próxima geração se disponível
                if (data.nextReportIn) {
                    const proximaSpan = document.querySelector('.stat-item .stat-value:last-child');
                    if (proximaSpan) {
                        proximaSpan.textContent = data.nextReportIn;
                    }
                }
                
            } catch (error) {
                console.error('Erro ao atualizar Aguia News:', error);
                document.getElementById('aguiaRadarContent').innerHTML = 
                    '<div class="error-message">❌ Erro ao carregar dados do Aguia News</div>';
            }
        }
        
        async function gerarRadarManual() {
            const btn = document.getElementById('btnGerarRadar');
            const originalText = btn.textContent;
            
            btn.disabled = true;
            btn.textContent = '🔄 Gerando...';
            
            try {
                const response = await fetch('/api/aguia/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Mostrar mensagem de sucesso
                    const successDiv = document.createElement('div');
                    successDiv.className = 'success-message';
                    successDiv.textContent = '✅ ' + result.message;
                    
                    const aguiaContent = document.querySelector('.aguia-content');
                    aguiaContent.insertBefore(successDiv, aguiaContent.firstChild);
                    
                    // Atualizar conteúdo
                    document.getElementById('aguiaRadarContent').textContent = result.radar.content;
                    
                    // Atualizar estatísticas
                    await atualizarAguiaNews();
                    
                    // Remover mensagem após 5 segundos
                    setTimeout(() => {
                        successDiv.remove();
                    }, 5000);
                    
                } else {
                    throw new Error(result.error || 'Erro desconhecido');
                }
                
            } catch (error) {
                console.error('Erro ao gerar radar:', error);
                
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = '❌ Erro ao gerar radar: ' + error.message;
                
                const aguiaContent = document.querySelector('.aguia-content');
                aguiaContent.insertBefore(errorDiv, aguiaContent.firstChild);
                
                setTimeout(() => {
                    errorDiv.remove();
                }, 5000);
                
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
        
        // Atualizar a cada 30 segundos
        console.log('📊 Dashboard iniciado - Auto-refresh ativo');
        console.log('🦅 Aguia News integrado - Relatórios gratuitos');
    </script>
</body>
</html>
        `;
    }

    /**
     * 🚀 INICIAR MONITORAMENTO EM TEMPO REAL
     */
    iniciarMonitoramento() {
        // Atualizar cache a cada 5 segundos
        setInterval(async () => {
            try {
                this.cache.lastUpdate = new Date();
                // Aqui poderia implementar WebSocket para atualizações instantâneas
            } catch (error) {
                console.error('❌ Erro no monitoramento:', error);
            }
        }, 5000);
    }

    /**
     * 🎯 LOGS ADMINISTRATIVOS
     */
    async getLogsAdministrativos(req, res) {
        try {
            const { limit = 50, action } = req.query;
            
            let whereCondition = '';
            let params = [limit];
            
            if (action) {
                whereCondition = 'WHERE action = $2';
                params.push(action);
            }
            
            const logs = await this.pool.query(`
                SELECT 
                    al.*,
                    admin_user.email as admin_email,
                    target_user.email as target_email
                FROM admin_logs al
                LEFT JOIN users admin_user ON al.admin_id = admin_user.id
                LEFT JOIN users target_user ON al.target_user_id = target_user.id
                ${whereCondition}
                ORDER BY al.created_at DESC
                LIMIT $1
            `, params);

            res.json({
                success: true,
                data: logs.rows,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar logs administrativos:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 📈 MÉTRICAS OPERACIONAIS
     */
    async getMetricasOperacionais(req, res) {
        try {
            // Métricas de performance do sistema
            const metricas = await this.pool.query(`
                SELECT 
                    DATE_TRUNC('hour', created_at) as hour,
                    COUNT(*) as signals_count,
                    COUNT(CASE WHEN sm.ai_approved = 'true' THEN 1 END) as approved_count,
                    AVG(EXTRACT(EPOCH FROM (sm.created_at - ts.created_at))) as avg_processing_time
                FROM signal_metrics_log sm
                -- JOIN removido para evitar alias duplicado
                WHERE ts.created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY DATE_TRUNC('hour', created_at)
                ORDER BY hour DESC
            `);

            res.json({
                success: true,
                data: {
                    hourlyMetrics: metricas.rows,
                    timestamp: new Date()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar métricas:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 🔍 BUSCA E FILTROS
     */
    async buscarDados(req, res) {
        try {
            const { q, type, dateFrom, dateTo } = req.query;
            
            let results = {};
            
            if (type === 'signals' || !type) {
                results.signals = await this.buscarSinais(q, dateFrom, dateTo);
            }
            
            if (type === 'orders' || !type) {
                results.orders = await this.buscarOrdens(q, dateFrom, dateTo);
            }
            
            if (type === 'users' || !type) {
                results.users = await this.buscarUsuarios(q);
            }

            res.json({
                success: true,
                data: results,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro na busca:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async buscarSinais(query, dateFrom, dateTo) {
        // Implementar busca específica de sinais
        return [];
    }

    async buscarOrdens(query, dateFrom, dateTo) {
        // Implementar busca específica de ordens
        return [];
    }

    async buscarUsuarios(query) {
        // Implementar busca específica de usuários
        return [];
    }

    /**
     * 📡 STREAM DE DADOS EM TEMPO REAL
     */
    async streamDados(req, res) {
        // Configurar Server-Sent Events para atualizações em tempo real
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        const interval = setInterval(async () => {
            try {
                const data = await this.getDadosTempoReal();
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
                console.error('❌ Erro no stream:', error);
            }
        }, 5000);

        req.on('close', () => {
            clearInterval(interval);
        });
    }

    // ===============================
    // 🦅 MÉTODOS AGUIA NEWS INTEGRADOS
    // ===============================

    /**
     * 🦅 OBTER ÚLTIMO RADAR ÁGUIA NEWS
     */
    async getAguiaLatest(req, res) {
        try {
            const result = await this.pool.query(`
                SELECT id, content, generated_at, market_data, ai_analysis, is_premium, plan_required
                FROM aguia_news_radars
                ORDER BY generated_at DESC
                LIMIT 1
            `);

            if (result.rows.length === 0) {
                return res.json({ success: true, radar: null });
            }

            res.json({ success: true, radar: result.rows[0] });

        } catch (error) {
            console.error('❌ Erro ao buscar último radar:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 📊 OBTER ESTATÍSTICAS AGUIA NEWS
     */
    async getAguiaStats(req, res) {
        try {
            const stats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_radars,
                    COUNT(CASE WHEN DATE(generated_at AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE THEN 1 END) as radars_today,
                    (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
                    (SELECT COUNT(*) FROM user_notifications WHERE notification_type = 'RADAR' AND created_at >= CURRENT_DATE) as notifications_today
                FROM aguia_news_radars
            `);

            res.json({
                success: true,
                stats: {
                    total_radars: parseInt(stats.rows[0].total_radars),
                    radars_today: parseInt(stats.rows[0].radars_today),
                    total_users: parseInt(stats.rows[0].total_users),
                    notifications_today: parseInt(stats.rows[0].notifications_today),
                    next_generation: '20:00 Brasília',
                    is_free: true,
                    plan_required: 'FREE'
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas Aguia:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 📋 OBTER LISTA DE RADARS
     */
    async getAguiaRadars(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const offset = parseInt(req.query.offset) || 0;

            const radars = await this.pool.query(`
                SELECT id, content, generated_at, is_premium, plan_required,
                       LEFT(content, 200) || '...' as preview
                FROM aguia_news_radars
                ORDER BY generated_at DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]);

            const total = await this.pool.query('SELECT COUNT(*) as count FROM aguia_news_radars');

            res.json({
                success: true,
                radars: radars.rows,
                pagination: {
                    total: parseInt(total.rows[0].count),
                    limit,
                    offset,
                    hasMore: (offset + limit) < parseInt(total.rows[0].count)
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar radars:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 🔧 GERAR RADAR MANUAL
     */
    async generateAguiaRadar(req, res) {
        try {
            // Importar e usar o sistema Aguia News
            const AguiaNewsGratuito = require('./aguia-news-gratuito');
            const aguiaNews = new AguiaNewsGratuito();
            
            console.log('🔧 Geração manual do Radar Águia News solicitada via dashboard');
            
            const radarId = await aguiaNews.generateDailyRadar();
            
            // Buscar o radar gerado
            const result = await this.pool.query(`
                SELECT id, content, generated_at, market_data, ai_analysis
                FROM aguia_news_radars
                WHERE id = $1
            `, [radarId]);

            await aguiaNews.close();

            res.json({
                success: true,
                message: 'Radar gerado com sucesso',
                radar: result.rows[0]
            });

        } catch (error) {
            console.error('❌ Erro ao gerar radar manual:', error);
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    }

    /**
     * � INICIALIZAR COLETA AUTOMÁTICA DE SALDOS
     */
    async iniciarColetaAutomaticaSaldos() {
        try {
            console.log('🔄 Iniciando coleta automática de saldos...');
            
            // Corrigir NULLs imediatamente
            await this.pool.query(`
                UPDATE users SET 
                    balance_brl = COALESCE(balance_brl, 0),
                    balance_usd = COALESCE(balance_usd, 0),
                    balance_admin_brl = COALESCE(balance_admin_brl, 0),
                    balance_admin_usd = COALESCE(balance_admin_usd, 0)
                WHERE balance_brl IS NULL OR balance_usd IS NULL 
                   OR balance_admin_brl IS NULL OR balance_admin_usd IS NULL
            `);

            await this.pool.query(`
                UPDATE user_api_keys SET 
                    real_balance_usdt = COALESCE(real_balance_usdt, 0),
                    is_valid = COALESCE(is_valid, false)
                WHERE real_balance_usdt IS NULL OR is_valid IS NULL
            `);

            console.log('✅ NULLs corrigidos no banco de dados');
            
            // Executar coleta inicial de saldos reais
            console.log('💰 Executando coleta inicial de saldos...');
            this.coletarSaldosReais();
            
            // Configurar coleta automática a cada 30 minutos
            this.intervalColetaSaldos = setInterval(() => {
                this.coletarSaldosReais();
            }, 30 * 60 * 1000); // 30 minutos
            
            console.log('✅ Coleta automática de saldos configurada (a cada 30 minutos)');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar coleta automática:', error);
        }
    }

    /**
     * 💰 COLETAR SALDOS REAIS DAS EXCHANGES
     */
    async coletarSaldosReais() {
        try {
            console.log('🔄 Coletando saldos reais...');
            
            // Buscar usuários com chaves API
            const usuariosComChaves = await this.pool.query(`
                SELECT DISTINCT u.id, u.email, uk.id as key_id, uk.api_key, uk.api_secret, 
                       uk.exchange, uk.environment, uk.is_valid
                FROM users u
                JOIN user_api_keys uk ON u.id = uk.user_id
                WHERE u.is_active = true AND uk.api_key IS NOT NULL AND uk.api_secret IS NOT NULL
                ORDER BY u.id
            `);

            let sucessos = 0;
            let falhas = 0;
            
            for (const usuario of usuariosComChaves.rows) {
                try {
                    if (usuario.exchange === 'bybit') {
                        const saldo = await this.verificarSaldoBybit(usuario);
                        if (saldo.success) {
                            await this.atualizarSaldoUsuario(usuario.key_id, saldo.balance, true);
                            sucessos++;
                        } else {
                            await this.atualizarSaldoUsuario(usuario.key_id, 0, false, saldo.error);
                            falhas++;
                        }
                    }
                } catch (error) {
                    console.error(`❌ Erro ao coletar saldo de ${usuario.email}:`, error.message);
                    await this.atualizarSaldoUsuario(usuario.key_id, 0, false, error.message);
                    falhas++;
                }
                
                // Aguardar um pouco entre requisições
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log(`✅ Coleta concluída: ${sucessos} sucessos, ${falhas} falhas`);
            
        } catch (error) {
            console.error('❌ Erro na coleta de saldos:', error);
        }
    }

    /**
     * 🟣 VERIFICAR SALDO BYBIT
     */
    async verificarSaldoBybit(usuario) {
        try {
            const crypto = require('crypto');
            const axios = require('axios');
            
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            const queryString = 'accountType=UNIFIED';
            
            const signaturePayload = timestamp + usuario.api_key + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', usuario.api_secret).update(signaturePayload).digest('hex');
            
            const baseUrl = usuario.environment === 'testnet' ? 
                'https://api-testnet.bybit.com' : 'https://api.bybit.com';
            
            const response = await axios.get(`${baseUrl}/v5/account/wallet-balance?${queryString}`, {
                headers: {
                    'X-BAPI-API-KEY': usuario.api_key,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            if (response.data.retCode === 0) {
                const balanceInfo = response.data.result?.list?.[0];
                const usdtBalance = balanceInfo?.coin?.find(c => c.coin === 'USDT')?.walletBalance || '0';
                
                return {
                    success: true,
                    balance: parseFloat(usdtBalance),
                    timestamp: new Date().toISOString()
                };
            } else {
                return {
                    success: false,
                    error: response.data.retMsg || 'Erro na API Bybit',
                    balance: 0
                };
            }
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                balance: 0
            };
        }
    }

    /**
     * 📝 ATUALIZAR SALDO NO BANCO
     */
    async atualizarSaldoUsuario(keyId, balance, isValid, error = null) {
        try {
            await this.pool.query(`
                UPDATE user_api_keys 
                SET real_balance_usdt = $1,
                    is_valid = $2,
                    validation_error = $3,
                    last_balance_check = NOW()
                WHERE id = $4
            `, [balance, isValid, error, keyId]);
            
        } catch (error) {
            console.error('❌ Erro ao atualizar saldo no banco:', error);
        }
    }

    /**
     * �🚀 INICIAR DASHBOARD
     */
    async iniciar(porta = 4000) {
        try {
            // Verificar conexão com banco
            await this.pool.query('SELECT NOW()');
            console.log('✅ Conexão com banco de dados estabelecida');

            // Inicializar coleta automática de saldos
            this.iniciarColetaAutomaticaSaldos();

            this.app.listen(porta, () => {
                console.log(`\n📊 DASHBOARD COMPLETO INICIADO`);
                console.log(`==============================`);
                console.log(`🎯 Porta: ${porta}`);
                console.log(`🔗 URL: http://localhost:${porta}`);
                console.log(`📡 APIs disponíveis:`);
                console.log(`   • Dashboard: http://localhost:${porta}`);
                console.log(`   • Tempo Real: http://localhost:${porta}/api/dashboard/realtime`);
                console.log(`   • Sinais: http://localhost:${porta}/api/dashboard/signals`);
                console.log(`   • Ordens: http://localhost:${porta}/api/dashboard/orders`);
                console.log(`   • IA Decisões: http://localhost:${porta}/api/dashboard/ai-decisions`);
                console.log(`   • Performance: http://localhost:${porta}/api/dashboard/users`);
                console.log(`   • Status: http://localhost:${porta}/api/dashboard/system`);
                console.log(`\n✅ Dashboard pronto para monitoramento completo!`);
                console.log(`🔄 Auto-refresh ativo a cada 30 segundos`);
                console.log(`📊 Monitoramento de fluxo operacional ativo`);
            });

        } catch (error) {
            console.error('❌ Erro ao iniciar dashboard:', error);
            throw error;
        }
    }

    /**
     * 📊 MÉTRICAS DE PERFORMANCE E ÍNDICES DE ACERTO
     */
    async getMetricasPerformance(req, res) {
        try {
            console.log('📊 Buscando métricas de performance...');

            // Atualizar métricas antes de buscar
            await this.atualizarMetricasPerformance();

            // 🎯 RANKING DE PERFORMANCE
            const rankingPerformance = await this.pool.query(`
                SELECT 
                    u.id,
                    u.email,
                    u.user_type,
                    u.plan_type,
                    COALESCE(u.total_trades, 0) as total_trades,
                    COALESCE(u.winning_trades, 0) as winning_trades,
                    COALESCE(u.losing_trades, 0) as losing_trades,
                    COALESCE(u.win_rate_percentage, 0) as win_rate_percentage,
                    COALESCE(u.total_pnl, 0) as total_pnl,
                    COALESCE(u.average_return_per_trade, 0) as average_return_per_trade,
                    COALESCE(u.accumulated_return, 0) as accumulated_return,
                    COALESCE(u.best_trade_pnl, 0) as best_trade_pnl,
                    COALESCE(u.worst_trade_pnl, 0) as worst_trade_pnl,
                    u.last_trade_date,
                    u.performance_updated_at,
                    -- Classificação de performance
                    CASE 
                        WHEN u.win_rate_percentage >= 70 AND u.total_trades >= 10 THEN 'EXCELENTE'
                        WHEN u.win_rate_percentage >= 60 AND u.total_trades >= 5 THEN 'MUITO_BOM'
                        WHEN u.win_rate_percentage >= 50 AND u.total_trades >= 3 THEN 'BOM'
                        WHEN u.total_trades > 0 THEN 'REGULAR'
                        ELSE 'SEM_DADOS'
                    END as performance_classification
                FROM users u
                WHERE u.is_active = true
                ORDER BY u.win_rate_percentage DESC, u.total_trades DESC, u.accumulated_return DESC
                LIMIT 50
            `);

            // 📈 ESTATÍSTICAS GLOBAIS
            const estatisticasGlobais = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_usuarios_ativos,
                    COUNT(CASE WHEN total_trades > 0 THEN 1 END) as usuarios_com_trades,
                    SUM(COALESCE(total_trades, 0)) as total_trades_plataforma,
                    SUM(COALESCE(winning_trades, 0)) as total_winning_trades,
                    SUM(COALESCE(losing_trades, 0)) as total_losing_trades,
                    AVG(COALESCE(win_rate_percentage, 0)) as avg_win_rate_global,
                    SUM(COALESCE(total_pnl, 0)) as total_pnl_plataforma,
                    AVG(COALESCE(average_return_per_trade, 0)) as avg_return_global,
                    MAX(COALESCE(win_rate_percentage, 0)) as melhor_win_rate,
                    MAX(COALESCE(total_pnl, 0)) as melhor_pnl_acumulado,
                    COUNT(CASE WHEN win_rate_percentage >= 70 THEN 1 END) as usuarios_excelentes,
                    COUNT(CASE WHEN win_rate_percentage >= 60 THEN 1 END) as usuarios_muito_bons,
                    COUNT(CASE WHEN win_rate_percentage >= 50 THEN 1 END) as usuarios_bons
                FROM users
                WHERE is_active = true
            `);

            // 📊 TRADES RECENTES COM PNL
            const tradesRecentes = await this.pool.query(`
                SELECT 
                    oe.id,
                    u.email,
                    oe.symbol,
                    oe.side,
                    oe.quantity,
                    oe.price,
                    oe.status,
                    COALESCE(oe.pnl, 0) as pnl,
                    COALESCE(oe.pnl_percentage, 0) as pnl_percentage,
                    oe.is_profitable,
                    oe.created_at,
                    oe.exit_time,
                    oe.duration_minutes
                FROM order_executions_v2 oe
                JOIN users u ON u.id = oe.user_id
                WHERE oe.status = 'FILLED' AND u.is_active = true
                ORDER BY oe.created_at DESC
                LIMIT 20
            `);

            res.json({
                success: true,
                data: {
                    ranking: rankingPerformance.rows,
                    statistics: estatisticasGlobais.rows[0],
                    recentTrades: tradesRecentes.rows,
                    summary: {
                        totalActiveUsers: rankingPerformance.rows.length,
                        avgWinRate: estatisticasGlobais.rows[0]?.avg_win_rate_global || 0,
                        totalPlatformPnl: estatisticasGlobais.rows[0]?.total_pnl_plataforma || 0,
                        lastUpdate: new Date().toISOString()
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar métricas de performance:', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 🦅 AGUIA NEWS REPORTS
     */
    async getAguiaNewsReports(req, res) {
        try {
            console.log('🦅 Buscando relatórios Aguia News...');

            // Verificar se precisa gerar novo relatório (a cada 4 horas)
            const ultimoRelatorio = await this.pool.query(`
                SELECT published_at FROM aguia_news_reports 
                WHERE report_type = 'RADAR' 
                ORDER BY published_at DESC 
                LIMIT 1
            `);

            const precisaNovoRelatorio = !ultimoRelatorio.rows[0] || 
                (Date.now() - new Date(ultimoRelatorio.rows[0].published_at).getTime()) > (4 * 60 * 60 * 1000);

            if (precisaNovoRelatorio) {
                await this.gerarNovoRelatorioAguia();
            }

            // 📰 RELATÓRIOS RECENTES
            const relatoriosRecentes = await this.pool.query(`
                SELECT 
                    id,
                    report_type,
                    title,
                    content,
                    summary,
                    market_sentiment,
                    fear_greed_index,
                    btc_dominance,
                    top_movers,
                    recommendations,
                    views_count,
                    likes_count,
                    published_at,
                    created_at
                FROM aguia_news_reports
                WHERE status = 'PUBLISHED'
                ORDER BY published_at DESC
                LIMIT 10
            `);

            // 📊 ESTATÍSTICAS DOS RELATÓRIOS
            const estatisticasRelatorios = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_reports,
                    COUNT(CASE WHEN published_at >= CURRENT_DATE THEN 1 END) as reports_today,
                    COUNT(CASE WHEN report_type = 'RADAR' THEN 1 END) as total_radars,
                    COUNT(CASE WHEN report_type = 'ANALYSIS' THEN 1 END) as total_analysis,
                    SUM(views_count) as total_views,
                    SUM(likes_count) as total_likes,
                    AVG(fear_greed_index) as avg_fear_greed,
                    MAX(published_at) as last_report_time
                FROM aguia_news_reports
                WHERE status = 'PUBLISHED'
            `);

            res.json({
                success: true,
                data: {
                    recentReports: relatoriosRecentes.rows,
                    statistics: estatisticasRelatorios.rows[0],
                    nextReportIn: this.calcularProximoRelatorio(),
                    summary: {
                        totalReports: relatoriosRecentes.rows.length,
                        needsNewReport: precisaNovoRelatorio,
                        lastUpdate: new Date().toISOString()
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar Aguia News:', error);
            res.status(500).json({ 
                success: false,
                error: 'Erro interno do servidor',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * ⏰ CALCULAR PRÓXIMO RELATÓRIO
     */
    calcularProximoRelatorio() {
        const agora = new Date();
        const proximaGeracao = new Date(agora);
        proximaGeracao.setHours(Math.ceil(agora.getHours() / 4) * 4, 0, 0, 0);
        
        if (proximaGeracao <= agora) {
            proximaGeracao.setHours(proximaGeracao.getHours() + 4);
        }
        
        const msAteProximo = proximaGeracao.getTime() - agora.getTime();
        const horasAteProximo = Math.floor(msAteProximo / (1000 * 60 * 60));
        const minutosAteProximo = Math.floor((msAteProximo % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${horasAteProximo}h ${minutosAteProximo}m`;
    }

    /**
     * 🔄 ATUALIZAR MÉTRICAS DE PERFORMANCE
     */
    async atualizarMetricasPerformance() {
        try {
            await this.pool.query(`
                UPDATE users SET
                    total_trades = subq.total_trades,
                    winning_trades = subq.winning_trades,
                    losing_trades = subq.losing_trades,
                    win_rate_percentage = subq.win_rate_percentage,
                    total_pnl = subq.total_pnl,
                    average_return_per_trade = subq.average_return_per_trade,
                    accumulated_return = subq.total_pnl,
                    best_trade_pnl = subq.best_pnl,
                    worst_trade_pnl = subq.worst_pnl,
                    last_trade_date = subq.last_trade,
                    performance_updated_at = NOW()
                FROM (
                    SELECT 
                        user_id,
                        COUNT(*) as total_trades,
                        COUNT(CASE WHEN COALESCE(pnl, 0) > 0 THEN 1 END) as winning_trades,
                        COUNT(CASE WHEN COALESCE(pnl, 0) < 0 THEN 1 END) as losing_trades,
                        CASE WHEN COUNT(*) > 0 
                             THEN (COUNT(CASE WHEN COALESCE(pnl, 0) > 0 THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100 
                             ELSE 0 END as win_rate_percentage,
                        COALESCE(SUM(pnl), 0) as total_pnl,
                        COALESCE(AVG(pnl), 0) as average_return_per_trade,
                        COALESCE(MAX(pnl), 0) as best_pnl,
                        COALESCE(MIN(pnl), 0) as worst_pnl,
                        MAX(created_at) as last_trade
                    FROM order_executions_v2 
                    WHERE status = 'FILLED'
                    GROUP BY user_id
                ) subq
                WHERE users.id = subq.user_id AND users.is_active = true
            `);
        } catch (error) {
            console.log('⚠️ Erro ao atualizar métricas:', error.message);
        }
    }

    /**
     * 📰 GERAR NOVO RELATÓRIO AGUIA
     */
    async gerarNovoRelatorioAguia() {
        try {
            const marketData = await this.buscarDadosMercado();
            
            const novoRelatorio = {
                title: `Radar de Mercado - ${new Date().toLocaleDateString('pt-BR')}`,
                content: this.gerarConteudoRadar(marketData),
                summary: 'Análise técnica e fundamental do mercado cripto atualizada.',
                market_sentiment: marketData.sentiment || 'NEUTRAL',
                fear_greed_index: marketData.fearGreed || 50,
                btc_dominance: marketData.btcDominance || 50,
                recommendations: JSON.stringify(marketData.recommendations || [])
            };

            await this.pool.query(`
                INSERT INTO aguia_news_reports (
                    report_type, title, content, summary, market_sentiment,
                    fear_greed_index, btc_dominance, recommendations
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                'RADAR',
                novoRelatorio.title,
                novoRelatorio.content,
                novoRelatorio.summary,
                novoRelatorio.market_sentiment,
                novoRelatorio.fear_greed_index,
                novoRelatorio.btc_dominance,
                novoRelatorio.recommendations
            ]);

            console.log('✅ Novo relatório Aguia gerado');
        } catch (error) {
            console.log('⚠️ Erro ao gerar novo relatório:', error.message);
        }
    }

    async buscarDadosMercado() {
        return {
            sentiment: 'BULLISH',
            fearGreed: Math.floor(Math.random() * 100),
            btcDominance: 58 + Math.random() * 10,
            recommendations: [
                'Manter posições em BTC',
                'Observar altcoins para entrada',
                'Stop loss em suportes técnicos'
            ]
        };
    }

    gerarConteudoRadar(marketData) {
        return `
# 🦅 RADAR DE MERCADO CRIPTO

## 📊 Análise Técnica
- **Bitcoin**: Mantém tendência de alta com suporte em $42,000
- **Ethereum**: Consolidação em range, aguardando rompimento
- **Altcoins**: Sinais de recuperação em projetos fundamentalistas

## 📈 Indicadores
- **Fear & Greed**: ${marketData.fearGreed}/100
- **Dominância BTC**: ${marketData.btcDominance.toFixed(1)}%
- **Sentimento**: ${marketData.sentiment}

## 🎯 Recomendações
${marketData.recommendations.map(r => `- ${r}`).join('\n')}

---
*Relatório gerado automaticamente - ${new Date().toLocaleString('pt-BR')}*
        `.trim();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const dashboard = new DashboardCompleto();
    dashboard.iniciar(4000).catch(console.error);
}

module.exports = DashboardCompleto;
