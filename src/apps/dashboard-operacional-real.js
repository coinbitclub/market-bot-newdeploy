/**
 * 🎯 DASHBOARD OPERACIONAL COMPLETO - DADOS REAIS
 * ==============================================
 * 
 * Dashboard para monitoramento completo do fluxo operacional:
 * ✅ Recepção de sinais em tempo real
 * ✅ Processamento pela IA e análise de mercado
 * ✅ Decisões de execução ou rejeição
 * ✅ Ordens executadas e resultados
 * ✅ Performance de usuários
 * ✅ Métricas operacionais
 * ✅ Análise de gaps e problemas
 * 
 * DADOS 100% REAIS - SEM MOCKS
 */

const express = require('express');
const { Pool } = require('pg');
const path = require('path');

class DashboardOperacionalReal {
    constructor() {
        this.app = express();
        this.pool = new Pool({
            connectionString: 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        this.signalQueue = [];
        this.processingHistory = [];
        this.realtimeData = {
            lastSignal: null,
            processing: false,
            currentStep: '',
            marketData: {},
            aiDecision: null,
            executionResults: []
        };

        this.setupMiddleware();
        this.setupRoutes();
        this.startRealtimeMonitoring();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'dashboard-public')));
        
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        });
    }

    setupRoutes() {
        // 📊 DASHBOARD PRINCIPAL
        this.app.get('/', (req, res) => {
            res.send(this.generateDashboardHTML());
        });

        // 📡 DADOS EM TEMPO REAL
        this.app.get('/api/realtime', (req, res) => {
            res.json({
                success: true,
                data: this.realtimeData,
                timestamp: new Date().toISOString()
            });
        });

        // 📈 MÉTRICAS OPERACIONAIS
        this.app.get('/api/metrics', async (req, res) => {
            try {
                const metrics = await this.getOperationalMetrics();
                res.json({ success: true, metrics });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 📋 HISTÓRICO DE SINAIS
        this.app.get('/api/signals/history', async (req, res) => {
            try {
                const { limit = 50, offset = 0 } = req.query;
                const signals = await this.getSignalsHistory(limit, offset);
                res.json({ success: true, signals });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 💼 ORDENS EXECUTADAS
        this.app.get('/api/orders/recent', async (req, res) => {
            try {
                const { limit = 20 } = req.query;
                const orders = await this.getRecentOrders(limit);
                res.json({ success: true, orders });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 👥 PERFORMANCE DE USUÁRIOS
        this.app.get('/api/users/performance', async (req, res) => {
            try {
                const performance = await this.getUsersPerformance();
                res.json({ success: true, performance });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 🔍 ANÁLISE DE GAPS
        this.app.get('/api/analysis/gaps', async (req, res) => {
            try {
                const gaps = await this.analyzeSystemGaps();
                res.json({ success: true, gaps });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 📊 ANÁLISE DE MERCADO ATUAL
        this.app.get('/api/market/current', async (req, res) => {
            try {
                const marketData = await this.getCurrentMarketAnalysis();
                res.json({ success: true, market: marketData });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 🤖 STATUS DA IA
        this.app.get('/api/ai/status', async (req, res) => {
            try {
                const aiStatus = await this.getAIStatus();
                res.json({ success: true, ai: aiStatus });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // 🔄 FLUXO DE PROCESSAMENTO ATUAL
        this.app.get('/api/processing/flow', (req, res) => {
            res.json({
                success: true,
                flow: {
                    current: this.realtimeData,
                    queue: this.signalQueue,
                    history: this.processingHistory.slice(-10)
                }
            });
        });
    }

    /**
     * 📊 OBTER MÉTRICAS OPERACIONAIS REAIS
     */
    async getOperationalMetrics() {
        const [
            signalsToday,
            ordersToday,
            usersActive,
            successRate,
            avgProcessingTime,
            exchangeDistribution
        ] = await Promise.all([
            this.getSignalsToday(),
            this.getOrdersToday(),
            this.getActiveUsers(),
            this.getSuccessRate(),
            this.getAvgProcessingTime(),
            this.getExchangeDistribution()
        ]);

        return {
            signalsToday,
            ordersToday,
            usersActive,
            successRate,
            avgProcessingTime,
            exchangeDistribution,
            timestamp: new Date().toISOString()
        };
    }

    async getSignalsToday() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN decision = 'APPROVED' THEN 1 END) as approved,
                    COUNT(CASE WHEN decision = 'REJECTED' THEN 1 END) as rejected,
                    COUNT(CASE WHEN signal_type LIKE '%FORTE%' THEN 1 END) as strong_signals
                FROM signal_metrics 
                WHERE created_at >= CURRENT_DATE
            `);
            
            return result.rows[0] || { total: 0, approved: 0, rejected: 0, strong_signals: 0 };
        } catch (error) {
            console.error('Erro ao buscar sinais de hoje:', error);
            return { total: 0, approved: 0, rejected: 0, strong_signals: 0 };
        }
    }

    async getOrdersToday() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as filled,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled,
                    SUM(CASE WHEN status = 'FILLED' THEN amount ELSE 0 END) as volume
                FROM trading_orders 
                WHERE created_at >= CURRENT_DATE
            `);
            
            return result.rows[0] || { total: 0, filled: 0, cancelled: 0, volume: 0 };
        } catch (error) {
            console.error('Erro ao buscar ordens de hoje:', error);
            return { total: 0, filled: 0, cancelled: 0, volume: 0 };
        }
    }

    async getActiveUsers() {
        try {
            const result = await this.pool.query(`
                SELECT COUNT(*) as total
                FROM users 
                WHERE is_active = true 
                AND (binance_api_key_encrypted IS NOT NULL OR bybit_api_key_encrypted IS NOT NULL)
                AND (balance_brl > 0 OR balance_usd > 0 OR admin_credits_brl > 0 OR admin_credits_usd > 0)
            `);
            
            return parseInt(result.rows[0].total) || 0;
        } catch (error) {
            console.error('Erro ao buscar usuários ativos:', error);
            return 0;
        }
    }

    async getSuccessRate() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN pnl > 0 THEN 1 END) as profitable
                FROM trading_orders 
                WHERE status = 'CLOSED' 
                AND created_at >= CURRENT_DATE - INTERVAL '7 days'
            `);
            
            const { total, profitable } = result.rows[0];
            return total > 0 ? ((profitable / total) * 100).toFixed(2) : 0;
        } catch (error) {
            console.error('Erro ao calcular taxa de sucesso:', error);
            return 0;
        }
    }

    async getAvgProcessingTime() {
        try {
            const result = await this.pool.query(`
                SELECT AVG(processing_time_ms) as avg_time
                FROM signal_metrics 
                WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'
                AND processing_time_ms IS NOT NULL
            `);
            
            return Math.round(result.rows[0].avg_time) || 0;
        } catch (error) {
            console.error('Erro ao calcular tempo médio:', error);
            return 0;
        }
    }

    async getExchangeDistribution() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    exchange,
                    COUNT(*) as count
                FROM trading_orders 
                WHERE created_at >= CURRENT_DATE
                GROUP BY exchange
            `);
            
            return result.rows || [];
        } catch (error) {
            console.error('Erro ao buscar distribuição de exchanges:', error);
            return [];
        }
    }

    /**
     * 📋 HISTÓRICO DE SINAIS REAIS
     */
    async getSignalsHistory(limit, offset) {
        try {
            const result = await this.pool.query(`
                SELECT 
                    sm.id,
                    sm.signal_type,
                    sm.ticker,
                    sm.source,
                    sm.decision,
                    sm.reason,
                    sm.fear_greed_value,
                    sm.market_direction,
                    sm.ai_analysis,
                    sm.processing_time_ms,
                    sm.created_at,
                    COUNT(to.id) as orders_created
                FROM signal_metrics sm
                LEFT JOIN trading_orders to ON sm.signal_id = to.signal_id
                GROUP BY sm.id
                ORDER BY sm.created_at DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]);
            
            return result.rows || [];
        } catch (error) {
            console.error('Erro ao buscar histórico de sinais:', error);
            return [];
        }
    }

    /**
     * 💼 ORDENS RECENTES REAIS
     */
    async getRecentOrders(limit) {
        try {
            const result = await this.pool.query(`
                SELECT 
                    to.id,
                    to.user_id,
                    u.email,
                    u.plan_type,
                    to.ticker,
                    to.signal_type,
                    to.exchange,
                    to.side,
                    to.amount,
                    to.price,
                    to.take_profit,
                    to.stop_loss,
                    to.status,
                    to.pnl,
                    to.created_at,
                    to.filled_at
                FROM trading_orders to
                JOIN users u ON to.user_id = u.id
                ORDER BY to.created_at DESC
                LIMIT $1
            `, [limit]);
            
            return result.rows || [];
        } catch (error) {
            console.error('Erro ao buscar ordens recentes:', error);
            return [];
        }
    }

    /**
     * 👥 PERFORMANCE REAL DOS USUÁRIOS
     */
    async getUsersPerformance() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    u.id,
                    u.email,
                    u.plan_type,
                    COUNT(to.id) as total_orders,
                    COUNT(CASE WHEN to.status = 'FILLED' THEN 1 END) as filled_orders,
                    COUNT(CASE WHEN to.pnl > 0 THEN 1 END) as profitable_orders,
                    SUM(to.pnl) as total_pnl,
                    AVG(to.pnl) as avg_pnl,
                    u.balance_brl + u.balance_usd + u.admin_credits_brl + u.admin_credits_usd as total_balance
                FROM users u
                LEFT JOIN trading_orders to ON u.id = to.user_id
                WHERE u.is_active = true
                GROUP BY u.id, u.email, u.plan_type, u.balance_brl, u.balance_usd, u.admin_credits_brl, u.admin_credits_usd
                ORDER BY total_pnl DESC NULLS LAST
                LIMIT 20
            `);
            
            return result.rows || [];
        } catch (error) {
            console.error('Erro ao buscar performance dos usuários:', error);
            return [];
        }
    }

    /**
     * 🔍 ANÁLISE DE GAPS DO SISTEMA
     */
    async analyzeSystemGaps() {
        try {
            const [
                signalLoss,
                processingErrors,
                orderFailures,
                userValidationIssues,
                marketDataIssues
            ] = await Promise.all([
                this.checkSignalLoss(),
                this.checkProcessingErrors(),
                this.checkOrderFailures(),
                this.checkUserValidationIssues(),
                this.checkMarketDataIssues()
            ]);

            return {
                signalLoss,
                processingErrors,
                orderFailures,
                userValidationIssues,
                marketDataIssues,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erro na análise de gaps:', error);
            return {};
        }
    }

    async checkSignalLoss() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    COUNT(*) as expired_signals,
                    COUNT(CASE WHEN reason LIKE '%expirado%' THEN 1 END) as timeout_signals
                FROM signal_metrics 
                WHERE decision = 'REJECTED' 
                AND created_at >= CURRENT_DATE - INTERVAL '24 hours'
            `);
            
            return result.rows[0] || { expired_signals: 0, timeout_signals: 0 };
        } catch (error) {
            return { expired_signals: 0, timeout_signals: 0 };
        }
    }

    async checkProcessingErrors() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_errors,
                    COUNT(CASE WHEN error_message LIKE '%timeout%' THEN 1 END) as timeout_errors,
                    COUNT(CASE WHEN error_message LIKE '%connection%' THEN 1 END) as connection_errors
                FROM system_logs 
                WHERE log_level = 'ERROR' 
                AND created_at >= CURRENT_DATE - INTERVAL '24 hours'
            `);
            
            return result.rows[0] || { total_errors: 0, timeout_errors: 0, connection_errors: 0 };
        } catch (error) {
            return { total_errors: 0, timeout_errors: 0, connection_errors: 0 };
        }
    }

    async checkOrderFailures() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    COUNT(*) as failed_orders,
                    COUNT(CASE WHEN error_message LIKE '%insufficient%' THEN 1 END) as insufficient_balance,
                    COUNT(CASE WHEN error_message LIKE '%api%' THEN 1 END) as api_errors
                FROM trading_orders 
                WHERE status = 'FAILED' 
                AND created_at >= CURRENT_DATE - INTERVAL '24 hours'
            `);
            
            return result.rows[0] || { failed_orders: 0, insufficient_balance: 0, api_errors: 0 };
        } catch (error) {
            return { failed_orders: 0, insufficient_balance: 0, api_errors: 0 };
        }
    }

    async checkUserValidationIssues() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    COUNT(CASE WHEN binance_api_key_encrypted IS NULL AND bybit_api_key_encrypted IS NULL THEN 1 END) as no_api_keys,
                    COUNT(CASE WHEN balance_brl = 0 AND balance_usd = 0 AND admin_credits_brl = 0 AND admin_credits_usd = 0 THEN 1 END) as no_balance,
                    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users
                FROM users
            `);
            
            return result.rows[0] || { no_api_keys: 0, no_balance: 0, inactive_users: 0 };
        } catch (error) {
            return { no_api_keys: 0, no_balance: 0, inactive_users: 0 };
        }
    }

    async checkMarketDataIssues() {
        try {
            // Verificar última atualização dos dados de mercado
            const result = await this.pool.query(`
                SELECT 
                    MAX(created_at) as last_market_update,
                    COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as market_errors
                FROM market_data_cache 
                WHERE created_at >= CURRENT_DATE - INTERVAL '1 hour'
            `);
            
            const lastUpdate = result.rows[0]?.last_market_update;
            const marketErrors = result.rows[0]?.market_errors || 0;
            const minutesSinceUpdate = lastUpdate ? Math.floor((Date.now() - new Date(lastUpdate)) / 60000) : 999;
            
            return {
                last_update: lastUpdate,
                minutes_since_update: minutesSinceUpdate,
                market_errors: marketErrors,
                is_stale: minutesSinceUpdate > 15
            };
        } catch (error) {
            return { is_stale: true, market_errors: 999, minutes_since_update: 999 };
        }
    }

    /**
     * 📊 ANÁLISE DE MERCADO ATUAL
     */
    async getCurrentMarketAnalysis() {
        try {
            const result = await this.pool.query(`
                SELECT *
                FROM market_analysis_cache 
                ORDER BY created_at DESC 
                LIMIT 1
            `);
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao buscar análise de mercado:', error);
            return null;
        }
    }

    /**
     * 🤖 STATUS DA IA
     */
    async getAIStatus() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_decisions,
                    COUNT(CASE WHEN ai_used = true THEN 1 END) as ai_decisions,
                    COUNT(CASE WHEN ai_used = false THEN 1 END) as fallback_decisions,
                    AVG(ai_confidence) as avg_confidence
                FROM signal_metrics 
                WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'
            `);
            
            const data = result.rows[0] || {};
            return {
                total_decisions: parseInt(data.total_decisions) || 0,
                ai_decisions: parseInt(data.ai_decisions) || 0,
                fallback_decisions: parseInt(data.fallback_decisions) || 0,
                avg_confidence: parseFloat(data.avg_confidence) || 0,
                ai_usage_rate: data.total_decisions > 0 ? ((data.ai_decisions / data.total_decisions) * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error('Erro ao buscar status da IA:', error);
            return { total_decisions: 0, ai_decisions: 0, fallback_decisions: 0, avg_confidence: 0, ai_usage_rate: 0 };
        }
    }

    /**
     * 🔄 MONITORAMENTO EM TEMPO REAL
     */
    startRealtimeMonitoring() {
        console.log('🔄 Iniciando monitoramento em tempo real...');
        
        // Atualizar dados a cada 5 segundos
        setInterval(async () => {
            try {
                await this.updateRealtimeData();
            } catch (error) {
                console.error('Erro no monitoramento em tempo real:', error);
            }
        }, 5000);
    }

    async updateRealtimeData() {
        try {
            // Buscar último sinal processado
            const lastSignal = await this.pool.query(`
                SELECT * FROM signal_metrics 
                ORDER BY created_at DESC 
                LIMIT 1
            `);

            // Buscar ordens em execução
            const executingOrders = await this.pool.query(`
                SELECT * FROM trading_orders 
                WHERE status IN ('PENDING', 'PARTIALLY_FILLED')
                ORDER BY created_at DESC
            `);

            this.realtimeData = {
                lastSignal: lastSignal.rows[0] || null,
                processing: executingOrders.rows.length > 0,
                executingOrders: executingOrders.rows || [],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erro ao atualizar dados em tempo real:', error);
        }
    }

    /**
     * 🎨 GERAR HTML DO DASHBOARD
     */
    generateDashboardHTML() {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CoinBitClub - Dashboard Operacional</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1419; color: #e6e6e6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #1e3a8a, #3b82f6); border-radius: 10px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .status-bar { display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .status-item { background: #1f2937; padding: 15px; border-radius: 8px; text-align: center; flex: 1; min-width: 150px; }
        .status-value { font-size: 1.8em; font-weight: bold; color: #10b981; }
        .status-label { font-size: 0.9em; opacity: 0.7; margin-top: 5px; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .card { background: #1f2937; border-radius: 10px; padding: 20px; border: 1px solid #374151; }
        .card h3 { color: #3b82f6; margin-bottom: 15px; font-size: 1.3em; }
        .signal-flow { background: #111827; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .flow-step { display: flex; align-items: center; margin-bottom: 15px; padding: 10px; background: #1f2937; border-radius: 8px; }
        .flow-icon { width: 40px; height: 40px; margin-right: 15px; display: flex; align-items: center; justify-content: center; font-size: 1.5em; }
        .flow-content { flex: 1; }
        .flow-title { font-weight: bold; margin-bottom: 5px; }
        .flow-details { font-size: 0.9em; opacity: 0.8; }
        .success { color: #10b981; background: rgba(16, 185, 129, 0.1); }
        .warning { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
        .error { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        .processing { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #374151; }
        .table th { background: #374151; font-weight: bold; }
        .table tr:hover { background: #374151; }
        .refresh-btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 10px 0; }
        .refresh-btn:hover { background: #2563eb; }
        .timestamp { text-align: center; margin-top: 20px; opacity: 0.6; font-size: 0.9em; }
        .realtime-indicator { display: inline-block; width: 10px; height: 10px; background: #10b981; border-radius: 50%; margin-right: 8px; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 CoinBitClub - Dashboard Operacional</h1>
            <p><span class="realtime-indicator"></span>Monitoramento em Tempo Real - Dados 100% Reais</p>
        </div>

        <div class="status-bar" id="statusBar">
            <div class="status-item">
                <div class="status-value" id="signalsToday">0</div>
                <div class="status-label">Sinais Hoje</div>
            </div>
            <div class="status-item">
                <div class="status-value" id="ordersToday">0</div>
                <div class="status-label">Ordens Hoje</div>
            </div>
            <div class="status-item">
                <div class="status-value" id="usersActive">0</div>
                <div class="status-label">Usuários Ativos</div>
            </div>
            <div class="status-item">
                <div class="status-value" id="successRate">0%</div>
                <div class="status-label">Taxa de Sucesso</div>
            </div>
        </div>

        <div class="signal-flow">
            <h3>🔄 Fluxo de Processamento Atual</h3>
            <div id="currentFlow">
                <div class="flow-step processing">
                    <div class="flow-icon">📡</div>
                    <div class="flow-content">
                        <div class="flow-title">Aguardando Sinais</div>
                        <div class="flow-details">Sistema ativo e monitorando TradingView</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div class="card">
                <h3>📋 Últimos Sinais Processados</h3>
                <button class="refresh-btn" onclick="loadSignalsHistory()">🔄 Atualizar</button>
                <div id="signalsHistory">Carregando...</div>
            </div>

            <div class="card">
                <h3>💼 Ordens Recentes</h3>
                <button class="refresh-btn" onclick="loadRecentOrders()">🔄 Atualizar</button>
                <div id="recentOrders">Carregando...</div>
            </div>

            <div class="card">
                <h3>👥 Performance dos Usuários</h3>
                <button class="refresh-btn" onclick="loadUsersPerformance()">🔄 Atualizar</button>
                <div id="usersPerformance">Carregando...</div>
            </div>

            <div class="card">
                <h3>🔍 Análise de Gaps</h3>
                <button class="refresh-btn" onclick="loadGapsAnalysis()">🔄 Atualizar</button>
                <div id="gapsAnalysis">Carregando...</div>
            </div>

            <div class="card">
                <h3>📊 Mercado Atual</h3>
                <button class="refresh-btn" onclick="loadMarketData()">🔄 Atualizar</button>
                <div id="marketData">Carregando...</div>
            </div>

            <div class="card">
                <h3>🤖 Status da IA</h3>
                <button class="refresh-btn" onclick="loadAIStatus()">🔄 Atualizar</button>
                <div id="aiStatus">Carregando...</div>
            </div>
        </div>

        <div class="timestamp" id="lastUpdate">
            Última atualização: Carregando...
        </div>
    </div>

    <script>
        // Auto-refresh a cada 10 segundos
        let autoRefreshInterval;

        async function fetchData(endpoint) {
            try {
                const response = await fetch(endpoint);
                return await response.json();
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
                return { error: error.message };
            }
        }

        async function loadMetrics() {
            const data = await fetchData('/api/metrics');
            if (data.success) {
                const { metrics } = data;
                document.getElementById('signalsToday').textContent = metrics.signalsToday.total || 0;
                document.getElementById('ordersToday').textContent = metrics.ordersToday.total || 0;
                document.getElementById('usersActive').textContent = metrics.usersActive || 0;
                document.getElementById('successRate').textContent = metrics.successRate + '%' || '0%';
            }
        }

        async function loadSignalsHistory() {
            const data = await fetchData('/api/signals/history?limit=10');
            const container = document.getElementById('signalsHistory');
            
            if (data.success && data.signals.length > 0) {
                container.innerHTML = '<table class="table"><tr><th>Sinal</th><th>Decisão</th><th>Motivo</th><th>Horário</th></tr>' + 
                    data.signals.map(signal => 
                        '<tr><td>' + signal.signal_type + '</td><td class="' + 
                        (signal.decision === 'APPROVED' ? 'success' : 'error') + '">' + 
                        signal.decision + '</td><td>' + (signal.reason || 'N/A') + '</td><td>' + 
                        new Date(signal.created_at).toLocaleString() + '</td></tr>'
                    ).join('') + '</table>';
            } else {
                container.innerHTML = '<p>Nenhum sinal encontrado</p>';
            }
        }

        async function loadRecentOrders() {
            const data = await fetchData('/api/orders/recent?limit=10');
            const container = document.getElementById('recentOrders');
            
            if (data.success && data.orders.length > 0) {
                container.innerHTML = '<table class="table"><tr><th>Usuário</th><th>Ticker</th><th>Status</th><th>PnL</th></tr>' + 
                    data.orders.map(order => 
                        '<tr><td>' + order.email + '</td><td>' + order.ticker + '</td><td class="' + 
                        (order.status === 'FILLED' ? 'success' : order.status === 'FAILED' ? 'error' : 'warning') + '">' + 
                        order.status + '</td><td class="' + (order.pnl > 0 ? 'success' : 'error') + '">' + 
                        (order.pnl || 0).toFixed(2) + '</td></tr>'
                    ).join('') + '</table>';
            } else {
                container.innerHTML = '<p>Nenhuma ordem encontrada</p>';
            }
        }

        async function loadUsersPerformance() {
            const data = await fetchData('/api/users/performance');
            const container = document.getElementById('usersPerformance');
            
            if (data.success && data.performance.length > 0) {
                container.innerHTML = '<table class="table"><tr><th>Usuário</th><th>Plano</th><th>Ordens</th><th>PnL Total</th></tr>' + 
                    data.performance.slice(0, 8).map(user => 
                        '<tr><td>' + user.email + '</td><td>' + user.plan_type + '</td><td>' + 
                        user.total_orders + '</td><td class="' + (user.total_pnl > 0 ? 'success' : 'error') + '">' + 
                        (user.total_pnl || 0).toFixed(2) + '</td></tr>'
                    ).join('') + '</table>';
            } else {
                container.innerHTML = '<p>Nenhum dado de performance encontrado</p>';
            }
        }

        async function loadGapsAnalysis() {
            const data = await fetchData('/api/analysis/gaps');
            const container = document.getElementById('gapsAnalysis');
            
            if (data.success) {
                const { gaps } = data;
                container.innerHTML = 
                    '<div><strong>Sinais Perdidos:</strong> ' + (gaps.signalLoss?.expired_signals || 0) + '</div>' +
                    '<div><strong>Erros de Processamento:</strong> ' + (gaps.processingErrors?.total_errors || 0) + '</div>' +
                    '<div><strong>Ordens Falhadas:</strong> ' + (gaps.orderFailures?.failed_orders || 0) + '</div>' +
                    '<div><strong>Usuários sem API:</strong> ' + (gaps.userValidationIssues?.no_api_keys || 0) + '</div>';
            } else {
                container.innerHTML = '<p>Erro ao carregar análise</p>';
            }
        }

        async function loadMarketData() {
            const data = await fetchData('/api/market/current');
            const container = document.getElementById('marketData');
            
            if (data.success && data.market) {
                const market = data.market;
                container.innerHTML = 
                    '<div><strong>Fear & Greed:</strong> ' + (market.fear_greed || 'N/A') + '</div>' +
                    '<div><strong>Direção:</strong> ' + (market.direction || 'N/A') + '</div>' +
                    '<div><strong>BTC Dominância:</strong> ' + (market.btc_dominance || 'N/A') + '%</div>' +
                    '<div><strong>Última Atualização:</strong> ' + new Date(market.created_at).toLocaleString() + '</div>';
            } else {
                container.innerHTML = '<p>Dados de mercado indisponíveis</p>';
            }
        }

        async function loadAIStatus() {
            const data = await fetchData('/api/ai/status');
            const container = document.getElementById('aiStatus');
            
            if (data.success) {
                const ai = data.ai;
                container.innerHTML = 
                    '<div><strong>Decisões IA:</strong> ' + ai.ai_decisions + ' (' + ai.ai_usage_rate + '%)</div>' +
                    '<div><strong>Fallback:</strong> ' + ai.fallback_decisions + '</div>' +
                    '<div><strong>Confiança Média:</strong> ' + (ai.avg_confidence * 100).toFixed(1) + '%</div>' +
                    '<div><strong>Total Hoje:</strong> ' + ai.total_decisions + '</div>';
            } else {
                container.innerHTML = '<p>Status da IA indisponível</p>';
            }
        }

        async function loadRealtimeData() {
            const data = await fetchData('/api/realtime');
            if (data.success) {
                document.getElementById('lastUpdate').textContent = 
                    'Última atualização: ' + new Date(data.timestamp).toLocaleString();
            }
        }

        function startAutoRefresh() {
            loadMetrics();
            loadSignalsHistory();
            loadRecentOrders();
            loadUsersPerformance();
            loadGapsAnalysis();
            loadMarketData();
            loadAIStatus();
            loadRealtimeData();
            
            // Auto-refresh a cada 30 segundos
            autoRefreshInterval = setInterval(() => {
                loadMetrics();
                loadRealtimeData();
            }, 30000);
        }

        // Iniciar quando a página carregar
        document.addEventListener('DOMContentLoaded', startAutoRefresh);
    </script>
</body>
</html>
        `;
    }

    /**
     * 🚀 INICIAR DASHBOARD
     */
    async iniciar(porta = 4000) {
        try {
            // Verificar conexão com banco
            await this.pool.query('SELECT NOW()');
            console.log('✅ Conectado ao banco de dados');

            this.app.listen(porta, () => {
                console.log(`\n🎯 DASHBOARD OPERACIONAL INICIADO`);
                console.log(`==============================`);
                console.log(`🌐 URL: http://localhost:${porta}`);
                console.log(`📊 Monitoramento: DADOS REAIS`);
                console.log(`🔄 Auto-refresh: 30 segundos`);
                console.log(`✅ Status: OPERACIONAL`);
                console.log(`\n📋 Funcionalidades Ativas:`);
                console.log(`  • Fluxo completo de sinais`);
                console.log(`  • Análise de mercado em tempo real`);
                console.log(`  • Ordens e execuções`);
                console.log(`  • Performance de usuários`);
                console.log(`  • Análise de gaps do sistema`);
                console.log(`  • Status da IA e fallbacks`);
                console.log(`  • Métricas operacionais completas`);
            });

        } catch (error) {
            console.error('❌ Erro ao iniciar dashboard:', error);
            throw error;
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const dashboard = new DashboardOperacionalReal();
    dashboard.iniciar(4000).catch(console.error);
}

module.exports = DashboardOperacionalReal;
