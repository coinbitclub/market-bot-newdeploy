const express = require('express');
const { Pool } = require('pg');
const path = require('path');

class DashboardFinalCorrigido {
    constructor() {
        this.app = express();
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async iniciar(porta = 5004) {
        // Middleware
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));

        // Rotas API
        this.configurarRotas();
        
        // Rota principal
        this.app.get('/', (req, res) => {
            res.send(this.getHTML());
        });

        try {
            this.app.listen(porta, () => {
                console.log(`🚀 Dashboard Final Corrigido iniciado na porta ${porta}`);
                console.log(`📊 Acesse: http://localhost:${porta}`);
            });
        } catch (error) {
            console.error('❌ Erro ao iniciar servidor:', error);
        }
    }

    configurarRotas() {
        // Dashboard APIs
        this.app.get('/api/dashboard/realtime', this.getDashboardRealtime.bind(this));
        this.app.get('/api/dashboard/signals', this.getDashboardSignals.bind(this));
        this.app.get('/api/dashboard/orders', this.getDashboardOrders.bind(this));
        this.app.get('/api/dashboard/users', this.getDashboardUsers.bind(this));
        this.app.get('/api/dashboard/system', this.getDashboardSystem.bind(this));
        
        // Águia News APIs
        this.app.get('/api/aguia/stats', this.getAguiaStats.bind(this));
        this.app.get('/api/aguia/latest', this.getAguiaLatest.bind(this));
        this.app.post('/api/aguia/generate', this.generateAguiaRadar.bind(this));
        
        // IA Supervision APIs
        this.app.get('/api/ia/analyses', this.getIAAnalyses.bind(this));
        this.app.get('/api/ia/alerts', this.getIAAlerts.bind(this));
        this.app.get('/api/ia/supervisor', this.getIASupervisor.bind(this));
    }

    // APIs Dashboard
    async getDashboardRealtime(req, res) {
        try {
            // Sistema
            const systemStatus = {
                status: 'online',
                uptime: process.uptime(),
                memory: process.memoryUsage().heapUsed / 1024 / 1024,
                timestamp: new Date()
            };

            // Estatísticas de sinais
            const signalsStats = await this.pool.query(`
                SELECT 
                    COUNT(*) as processados,
                    COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as executados,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelados
                FROM signals 
                WHERE created_at >= CURRENT_DATE
            `);

            // Estatísticas de ordens
            const ordersStats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as executadas,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as canceladas
                FROM real_orders 
                WHERE created_at >= CURRENT_DATE
            `);

            // Estatísticas de usuários
            const usersStats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_usuarios,
                    COUNT(CASE WHEN last_activity >= CURRENT_DATE THEN 1 END) as usuarios_ativos_hoje
                FROM users
            `);

            res.json({
                success: true,
                data: {
                    systemStatus,
                    signals: {
                        stats: signalsStats.rows[0]
                    },
                    orders: ordersStats.rows[0],
                    users: usersStats.rows[0]
                },
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar dados realtime:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getDashboardSignals(req, res) {
        try {
            const { limit = 20 } = req.query;

            const signals = await this.pool.query(`
                SELECT 
                    s.id,
                    s.symbol,
                    s.side,
                    s.status,
                    s.source,
                    s.entry_price as confidence,
                    s.created_at,
                    0 as orders_count
                FROM signals s
                ORDER BY s.created_at DESC
                LIMIT $1
            `, [limit]);

            const stats = await this.pool.query(`
                SELECT 
                    COUNT(*) as processados,
                    COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as executados,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelados
                FROM signals 
                WHERE created_at >= CURRENT_DATE
            `);

            res.json({
                success: true,
                data: {
                    signals: signals.rows,
                    statistics: stats.rows[0]
                },
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar sinais:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getDashboardOrders(req, res) {
        try {
            const { limit = 20 } = req.query;

            const orders = await this.pool.query(`
                SELECT 
                    ro.*,
                    u.username
                FROM real_orders ro
                LEFT JOIN users u ON ro.user_id = u.id
                ORDER BY ro.created_at DESC
                LIMIT $1
            `, [limit]);

            const stats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as executadas,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as canceladas
                FROM real_orders 
                WHERE created_at >= CURRENT_DATE
            `);

            res.json({
                success: true,
                data: {
                    orders: orders.rows,
                    statistics: stats.rows[0]
                },
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar ordens:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getDashboardUsers(req, res) {
        try {
            const { limit = 20 } = req.query;

            const users = await this.pool.query(`
                SELECT 
                    id,
                    username,
                    subscription_status,
                    last_activity,
                    created_at
                FROM users
                ORDER BY last_activity DESC NULLS LAST
                LIMIT $1
            `, [limit]);

            const stats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_usuarios,
                    COUNT(CASE WHEN last_activity >= CURRENT_DATE THEN 1 END) as usuarios_ativos_hoje,
                    COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as usuarios_ativos
                FROM users
            `);

            res.json({
                success: true,
                data: {
                    users: users.rows,
                    statistics: stats.rows[0]
                },
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar usuários:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getDashboardSystem(req, res) {
        try {
            const systemInfo = {
                status: 'online',
                uptime: process.uptime(),
                memory: {
                    used: process.memoryUsage().heapUsed / 1024 / 1024,
                    total: process.memoryUsage().heapTotal / 1024 / 1024
                },
                cpu: process.cpuUsage(),
                timestamp: new Date()
            };

            res.json({
                success: true,
                data: systemInfo,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar sistema:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // APIs Águia News
    async getAguiaStats(req, res) {
        try {
            const stats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_radars,
                    COUNT(CASE WHEN DATE(generated_at) = CURRENT_DATE THEN 1 END) as today_radars,
                    COUNT(CASE WHEN is_premium = true THEN 1 END) as premium_radars,
                    COUNT(CASE WHEN is_premium = false THEN 1 END) as free_radars
                FROM aguia_news_radars
            `);

            res.json({
                success: true,
                stats: stats.rows[0],
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar stats Águia:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getAguiaLatest(req, res) {
        try {
            const radar = await this.pool.query(`
                SELECT * FROM aguia_news_radars
                ORDER BY generated_at DESC
                LIMIT 1
            `);

            res.json({
                success: true,
                radar: radar.rows[0] || null,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar último radar:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async generateAguiaRadar(req, res) {
        try {
            const content = `Radar Águia News gerado em ${new Date().toLocaleString('pt-BR')}`;
            
            const result = await this.pool.query(`
                INSERT INTO aguia_news_radars (content, generated_at, is_premium)
                VALUES ($1, NOW(), false)
                RETURNING *
            `, [content]);

            res.json({
                success: true,
                radar: result.rows[0],
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao gerar radar:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // APIs IA Supervision
    async getIAAnalyses(req, res) {
        try {
            const { limit = 10 } = req.query;

            const analyses = await this.pool.query(`
                SELECT * FROM ia_analyses
                ORDER BY created_at DESC
                LIMIT $1
            `, [limit]);

            const stats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_analyses,
                    COUNT(CASE WHEN approved_at IS NOT NULL THEN 1 END) as approved_count,
                    COUNT(CASE WHEN approved_at IS NULL THEN 1 END) as pending_approval,
                    AVG(confidence_score) as avg_confidence
                FROM ia_analyses
                WHERE created_at >= CURRENT_DATE
            `);

            res.json({
                success: true,
                data: {
                    analyses: analyses.rows,
                    statistics: stats.rows[0]
                },
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar análises IA:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getIAAlerts(req, res) {
        try {
            const { limit = 10, severity } = req.query;

            let whereClause = '';
            let params = [limit];

            if (severity) {
                whereClause = 'WHERE severity = $2';
                params.push(severity);
            }

            const alerts = await this.pool.query(`
                SELECT * FROM ia_supervisor_alerts
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $1
            `, params);

            const alertStats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_alerts,
                    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_alerts,
                    COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_alerts,
                    COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_alerts
                FROM ia_supervisor_alerts
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            `);

            res.json({
                success: true,
                data: {
                    alerts: alerts.rows,
                    statistics: alertStats.rows[0]
                },
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar alertas IA:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getIASupervisor(req, res) {
        try {
            const recentAnalyses = await this.pool.query(`
                SELECT * FROM ia_analyses
                ORDER BY created_at DESC
                LIMIT 5
            `);

            const criticalAlerts = await this.pool.query(`
                SELECT COUNT(*) as count
                FROM ia_supervisor_alerts
                WHERE status = 'ACTIVE' AND severity IN ('CRITICAL', 'HIGH')
            `);

            const performance = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_decisions,
                    COUNT(CASE WHEN approved_at IS NOT NULL THEN 1 END) as approved_decisions,
                    AVG(confidence_score) as avg_confidence
                FROM ia_analyses
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            `);

            res.json({
                success: true,
                data: {
                    recent_analyses: recentAnalyses.rows,
                    critical_alerts: parseInt(criticalAlerts.rows[0].count),
                    performance: performance.rows[0],
                    supervisor_status: {
                        active: true,
                        last_check: new Date(),
                        health: criticalAlerts.rows[0].count > 0 ? 'WARNING' : 'OK'
                    }
                },
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Erro ao buscar supervisor IA:', error);
            res.status(500).json({ error: error.message });
        }
    }

    getHTML() {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 CoinBitClub Dashboard Final</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #ffffff; 
            min-height: 100vh;
        }
        
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #00d4ff, #ff6b6b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .controls {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        
        .control-item {
            background: rgba(255,255,255,0.1);
            padding: 10px 20px;
            border-radius: 25px;
            display: flex;
            align-items: center;
            gap: 10px;
            backdrop-filter: blur(10px);
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
            padding: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .card h3 {
            margin-bottom: 15px;
            color: #00d4ff;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .metric {
            text-align: center;
            padding: 10px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
        }
        
        .metric span:first-child {
            display: block;
            font-size: 0.8em;
            color: #ccc;
            margin-bottom: 5px;
        }
        
        .metric-value {
            font-size: 1.2em;
            font-weight: bold;
            color: #fff;
        }
        
        .signal-executed { color: #4CAF50; }
        .signal-cancelled { color: #f44336; }
        .signal-pending { color: #ff9800; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            overflow: hidden;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        th {
            background: rgba(0,212,255,0.2);
            font-weight: bold;
        }
        
        .btn {
            background: linear-gradient(45deg, #00d4ff, #0099cc);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,212,255,0.3); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        
        .status { text-align: center; margin: 20px 0; font-size: 0.9em; color: #ccc; }
        
        .aguia-content, .ia-content {
            background: rgba(0,0,0,0.5);
            padding: 15px;
            border-radius: 8px;
            margin-top: 10px;
            min-height: 100px;
            border-left: 4px solid #00d4ff;
        }
        
        input[type="checkbox"] {
            transform: scale(1.2);
            margin-right: 8px;
        }
        
        @media (max-width: 768px) {
            .dashboard-grid { grid-template-columns: 1fr; }
            .controls { flex-direction: column; align-items: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 CoinBitClub Trading Dashboard</h1>
            <p>🤖 Sistema de Monitoramento Completo com Águia News e IA Supervisão</p>
        </div>

        <div class="controls">
            <div class="control-item">
                <input type="checkbox" id="autoRefresh" checked>
                <label for="autoRefresh">🔄 Auto-refresh (30s)</label>
            </div>
            <div class="control-item">
                <button class="btn" onclick="atualizarDados()">🔄 Atualizar Agora</button>
            </div>
        </div>

        <div class="dashboard-grid">
            <!-- Card Dados em Tempo Real -->
            <div class="card">
                <h3>📊 Dados em Tempo Real</h3>
                <div class="metrics" id="realtimeStats">
                    <div class="metric">
                        <span>💰 Balance Total</span>
                        <span class="metric-value">Carregando...</span>
                    </div>
                </div>
            </div>

            <!-- Card Sinais -->
            <div class="card">
                <h3>📡 Estatísticas de Sinais</h3>
                <div class="metrics" id="signalStats">
                    <div class="metric">
                        <span>📡 Processados</span>
                        <span class="metric-value">Carregando...</span>
                    </div>
                </div>
            </div>

            <!-- Card Ordens -->
            <div class="card">
                <h3>🔄 Estatísticas de Ordens</h3>
                <div class="metrics" id="orderStats">
                    <div class="metric">
                        <span>🔄 Total</span>
                        <span class="metric-value">Carregando...</span>
                    </div>
                </div>
            </div>

            <!-- Card Usuários -->
            <div class="card">
                <h3>👥 Estatísticas de Usuários</h3>
                <div class="metrics" id="userStats">
                    <div class="metric">
                        <span>👥 Total</span>
                        <span class="metric-value">Carregando...</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Águia News Section -->
        <div class="card" style="margin-bottom: 20px;">
            <h3>🦅 Águia News - Sistema de Radar</h3>
            <div class="metrics" id="aguiaStats">
                <div class="metric">
                    <span>📰 Total Radares</span>
                    <span class="metric-value">Carregando...</span>
                </div>
            </div>
            <div style="margin-top: 15px;">
                <button class="btn" id="btnGerarRadar" onclick="gerarRadarManual()">
                    🚀 Gerar Radar Manual
                </button>
            </div>
            <div class="aguia-content" id="aguiaRadarContent">
                Carregando último radar...
            </div>
        </div>

        <!-- IA Supervision Section -->
        <div class="card" style="margin-bottom: 20px;">
            <h3>🤖 IA - Sistema de Supervisão</h3>
            <div class="metrics" id="iaStats">
                <div class="metric">
                    <span>🧠 Análises</span>
                    <span class="metric-value">Carregando...</span>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                <div>
                    <h4 style="color: #00d4ff; margin-bottom: 10px;">📊 Análises Recentes</h4>
                    <div class="ia-content" id="iaAnalisesList">
                        Carregando análises...
                    </div>
                </div>
                <div>
                    <h4 style="color: #ff6b6b; margin-bottom: 10px;">🚨 Alertas do Sistema</h4>
                    <div class="ia-content" id="iaAlertsList">
                        Carregando alertas...
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabelas de Dados -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Tabela de Sinais -->
            <div class="card">
                <h3>📡 Fluxo de Sinais</h3>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th>ID</th>
                                <th>Symbol</th>
                                <th>Lado</th>
                                <th>Status</th>
                                <th>Confiança</th>
                                <th>Ordens</th>
                                <th>Fonte</th>
                            </tr>
                        </thead>
                        <tbody id="signalsTable">
                            <tr><td colspan="8">Carregando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Tabela de Ordens -->
            <div class="card">
                <h3>🔄 Ordens de Usuários</h3>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th>Order ID</th>
                                <th>Symbol</th>
                                <th>Lado</th>
                                <th>Status</th>
                                <th>Quantidade</th>
                                <th>Preço</th>
                            </tr>
                        </thead>
                        <tbody id="ordersTable">
                            <tr><td colspan="7">Carregando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="status" id="lastUpdate">Carregando dados...</div>
    </div>

    <script>
        let autoRefreshInterval;
        
        // ===============================
        // 🔄 FUNÇÕES AUXILIARES - DEFINIDAS PRIMEIRO!
        // ===============================
        
        function formatDateTime(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        
        function formatCurrency(value) {
            if (!value) return 'R$ 0,00';
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        }
        
        function atualizarEstatisticasRealtime(stats) {
            const html = \`
                <div class="metric">
                    <span>💰 Balance Total</span>
                    <span class="metric-value">\${formatCurrency(stats.total_balance)}</span>
                </div>
                <div class="metric">
                    <span>📊 Posições</span>
                    <span class="metric-value">\${stats.open_positions || 0}</span>
                </div>
                <div class="metric">
                    <span>📈 PnL Hoje</span>
                    <span class="metric-value \${(stats.daily_pnl || 0) >= 0 ? 'signal-executed' : 'signal-cancelled'}">
                        \${formatCurrency(stats.daily_pnl)}
                    </span>
                </div>
                <div class="metric">
                    <span>🎯 Win Rate</span>
                    <span class="metric-value">\${stats.win_rate ? (stats.win_rate * 100).toFixed(1) + '%' : '0%'}</span>
                </div>
            \`;
            document.getElementById('realtimeStats').innerHTML = html;
        }
        
        function atualizarEstatisticasSinais(stats) {
            const processados = parseInt(stats.processados) || 0;
            const executados = parseInt(stats.executados) || 0;
            const cancelados = parseInt(stats.cancelados) || 0;
            
            const html = \`
                <div class="metric">
                    <span>📡 Processados</span>
                    <span class="metric-value">\${processados}</span>
                </div>
                <div class="metric">
                    <span>✅ Executados</span>
                    <span class="metric-value signal-executed">\${executados}</span>
                </div>
                <div class="metric">
                    <span>❌ Cancelados</span>
                    <span class="metric-value signal-cancelled">\${cancelados}</span>
                </div>
                <div class="metric">
                    <span>📊 Taxa Sucesso</span>
                    <span class="metric-value">\${processados > 0 ? ((executados/processados)*100).toFixed(1) : 0}%</span>
                </div>
            \`;
            document.getElementById('signalStats').innerHTML = html;
        }
        
        function atualizarEstatisticasOrdens(stats) {
            const total = parseInt(stats.total) || 0;
            const executadas = parseInt(stats.executadas) || 0;
            const canceladas = parseInt(stats.canceladas) || 0;
            
            const html = \`
                <div class="metric">
                    <span>🔄 Total</span>
                    <span class="metric-value">\${total}</span>
                </div>
                <div class="metric">
                    <span>✅ Executadas</span>
                    <span class="metric-value signal-executed">\${executadas}</span>
                </div>
                <div class="metric">
                    <span>❌ Canceladas</span>
                    <span class="metric-value signal-cancelled">\${canceladas}</span>
                </div>
                <div class="metric">
                    <span>📊 Taxa Execução</span>
                    <span class="metric-value">\${total > 0 ? ((executadas/total)*100).toFixed(1) : 0}%</span>
                </div>
            \`;
            document.getElementById('orderStats').innerHTML = html;
        }
        
        function atualizarEstatisticasUsuarios(stats) {
            const total = parseInt(stats.total_usuarios) || 0;
            const ativos = parseInt(stats.usuarios_ativos_hoje) || 0;
            
            const html = \`
                <div class="metric">
                    <span>👥 Total</span>
                    <span class="metric-value">\${total}</span>
                </div>
                <div class="metric">
                    <span>🟢 Ativos Hoje</span>
                    <span class="metric-value signal-executed">\${ativos}</span>
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
                tbody.innerHTML = '<tr><td colspan="8">Nenhum sinal encontrado</td></tr>';
                return;
            }
            
            const html = signals.map(signal => {
                const status = signal.status || 'UNKNOWN';
                const statusClass = status === 'EXECUTED' ? 'signal-executed' : 
                                  status === 'CANCELLED' ? 'signal-cancelled' : 'signal-pending';
                
                return \`
                    <tr>
                        <td>\${formatDateTime(signal.created_at)}</td>
                        <td>\${signal.signal_id || 'N/A'}</td>
                        <td><strong>\${signal.symbol}</strong></td>
                        <td>\${signal.side}</td>
                        <td class="\${statusClass}">\${status}</td>
                        <td>\${signal.confidence ? signal.confidence.toFixed(1) + '%' : 'N/A'}</td>
                        <td>\${signal.orders_count} ordem(ns)</td>
                        <td>\${signal.source}</td>
                    </tr>
                \`;
            }).join('');
            
            tbody.innerHTML = html;
        }
        
        function atualizarTabelaOrdens(orders) {
            const tbody = document.getElementById('ordersTable');
            
            if (!orders || orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7">Nenhuma ordem encontrada</td></tr>';
                return;
            }
            
            const html = orders.map(order => {
                const statusClass = order.status === 'FILLED' ? 'signal-executed' : 
                                   order.status === 'CANCELLED' ? 'signal-cancelled' : 'signal-pending';
                
                return \`
                    <tr>
                        <td>\${formatDateTime(order.created_at)}</td>
                        <td>\${order.order_id || 'N/A'}</td>
                        <td><strong>\${order.symbol}</strong></td>
                        <td>\${order.side}</td>
                        <td class="\${statusClass}">\${order.status}</td>
                        <td>\${order.qty}</td>
                        <td>\${formatCurrency(order.price)}</td>
                    </tr>
                \`;
            }).join('');
            
            tbody.innerHTML = html;
        }
        
        // ===============================
        // 🦅 FUNÇÕES ÁGUIA NEWS
        // ===============================
        
        function atualizarEstatisticasAguia(stats) {
            const html = \`
                <div class="metric">
                    <span>📰 Total Radares</span>
                    <span class="metric-value">\${stats.total_radars || 0}</span>
                </div>
                <div class="metric">
                    <span>⚡ Hoje</span>
                    <span class="metric-value signal-executed">\${stats.today_radars || 0}</span>
                </div>
                <div class="metric">
                    <span>💎 Premium</span>
                    <span class="metric-value">\${stats.premium_radars || 0}</span>
                </div>
                <div class="metric">
                    <span>📊 Gratuitos</span>
                    <span class="metric-value">\${stats.free_radars || 0}</span>
                </div>
            \`;
            document.getElementById('aguiaStats').innerHTML = html;
        }
        
        async function atualizarAguiaNews() {
            try {
                // Buscar estatísticas
                const statsResponse = await fetch('/api/aguia/stats');
                const statsData = await statsResponse.json();
                
                if (statsData.success) {
                    atualizarEstatisticasAguia(statsData.stats);
                }
                
                // Buscar último radar
                const radarResponse = await fetch('/api/aguia/latest');
                const radarData = await radarResponse.json();
                
                if (radarData.success && radarData.radar) {
                    document.getElementById('aguiaRadarContent').textContent = radarData.radar.content;
                } else {
                    document.getElementById('aguiaRadarContent').innerHTML = '<div style="text-align: center; color: #888; font-style: italic;">Nenhum radar disponível</div>';
                }
                
            } catch (error) {
                console.error('Erro ao atualizar Aguia News:', error);
                document.getElementById('aguiaRadarContent').innerHTML = '<div style="color: #ff6b6b;">Erro ao carregar dados do Aguia News</div>';
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
                    // Atualizar conteúdo
                    document.getElementById('aguiaRadarContent').textContent = result.radar.content;
                    
                    // Atualizar estatísticas
                    await atualizarAguiaNews();
                    
                    // Mostrar mensagem de sucesso temporária
                    btn.textContent = '✅ Gerado!';
                    setTimeout(() => {
                        btn.textContent = originalText;
                    }, 2000);
                    
                } else {
                    throw new Error(result.error || 'Erro desconhecido');
                }
                
            } catch (error) {
                console.error('Erro ao gerar radar:', error);
                btn.textContent = '❌ Erro';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
                
            } finally {
                btn.disabled = false;
            }
        }
        
        // ===============================
        // 🤖 FUNÇÕES IA SUPERVISÃO
        // ===============================
        
        function atualizarEstatisticasIA(stats, supervisor) {
            const html = \`
                <div class="metric">
                    <span>🧠 Análises</span>
                    <span class="metric-value">\${stats.total_analyses || 0}</span>
                </div>
                <div class="metric">
                    <span>✅ Aprovadas</span>
                    <span class="metric-value signal-executed">\${stats.approved_count || 0}</span>
                </div>
                <div class="metric">
                    <span>⏳ Pendentes</span>
                    <span class="metric-value signal-pending">\${stats.pending_approval || 0}</span>
                </div>
                <div class="metric">
                    <span>🎯 Confiança</span>
                    <span class="metric-value">\${stats.avg_confidence ? (stats.avg_confidence * 100).toFixed(1) + '%' : 'N/A'}</span>
                </div>
                <div class="metric">
                    <span>🚨 Alertas Críticos</span>
                    <span class="metric-value \${supervisor.critical_alerts > 0 ? 'signal-cancelled' : 'signal-executed'}">\${supervisor.critical_alerts || 0}</span>
                </div>
            \`;
            document.getElementById('iaStats').innerHTML = html;
        }
        
        function atualizarListaAnalises(analyses) {
            const container = document.getElementById('iaAnalisesList');
            
            if (!analyses || analyses.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: #888; font-style: italic;">Nenhuma análise recente</div>';
                return;
            }
            
            const html = analyses.map(analysis => {
                const statusClass = analysis.approved_at ? 'signal-executed' : 'signal-pending';
                const confidence = analysis.confidence_score ? (analysis.confidence_score * 100).toFixed(1) + '%' : 'N/A';
                
                return \`
                    <div style="border: 1px solid #333; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span><strong>\${analysis.analysis_type}</strong></span>
                            <span class="\${statusClass}">\${analysis.approved_at ? 'Aprovada' : 'Pendente'}</span>
                        </div>
                        <div style="font-size: 12px; color: #ccc;">
                            Confiança: \${confidence} | \${formatDateTime(analysis.created_at)}
                        </div>
                    </div>
                \`;
            }).join('');
            
            container.innerHTML = html;
        }
        
        function atualizarListaAlertas(alerts) {
            const container = document.getElementById('iaAlertsList');
            
            if (!alerts || alerts.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: #888; font-style: italic;">Nenhum alerta recente</div>';
                return;
            }
            
            const html = alerts.map(alert => {
                const severityClass = alert.severity === 'CRITICAL' ? 'signal-cancelled' : 
                                    alert.severity === 'HIGH' ? 'signal-pending' : 'signal-executed';
                
                return \`
                    <div style="border: 1px solid #333; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span><strong>\${alert.title}</strong></span>
                            <span class="\${severityClass}">\${alert.severity}</span>
                        </div>
                        <div style="font-size: 11px; color: #aaa; margin-bottom: 2px;">
                            \${alert.description}
                        </div>
                        <div style="font-size: 10px; color: #888;">
                            \${formatDateTime(alert.created_at)}
                        </div>
                    </div>
                \`;
            }).join('');
            
            container.innerHTML = html;
        }
        
        async function atualizarIASupervisao() {
            try {
                // Buscar análises recentes
                const analysesResponse = await fetch('/api/ia/analyses?limit=5');
                const analysesData = await analysesResponse.json();
                
                // Buscar alertas recentes
                const alertsResponse = await fetch('/api/ia/alerts?limit=5');
                const alertsData = await alertsResponse.json();
                
                // Buscar status do supervisor
                const supervisorResponse = await fetch('/api/ia/supervisor');
                const supervisorData = await supervisorResponse.json();
                
                if (analysesData.success && supervisorData.success) {
                    atualizarEstatisticasIA(analysesData.data.statistics, supervisorData.data);
                    atualizarListaAnalises(analysesData.data.analyses);
                }
                
                if (alertsData.success) {
                    atualizarListaAlertas(alertsData.data.alerts);
                }
                
            } catch (error) {
                console.error('Erro ao atualizar IA Supervisão:', error);
                document.getElementById('iaAnalisesList').innerHTML = '<div style="color: #ff6b6b;">Erro ao carregar análises da IA</div>';
                document.getElementById('iaAlertsList').innerHTML = '<div style="color: #ff6b6b;">Erro ao carregar alertas da IA</div>';
            }
        }
        
        // ===============================
        // 🔄 FUNÇÃO PRINCIPAL DE ATUALIZAÇÃO
        // ===============================
        
        async function atualizarDados() {
            document.getElementById('lastUpdate').textContent = 'Atualizando...';
            
            try {
                // Buscar dados gerais
                const realtimeResponse = await fetch('/api/dashboard/realtime');
                const realtimeData = await realtimeResponse.json();
                
                if (realtimeData.success) {
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
                
                // Buscar dados do Águia News
                await atualizarAguiaNews();
                
                // Buscar dados da IA Supervisão
                await atualizarIASupervisao();
                
                document.getElementById('lastUpdate').textContent = 
                    'Última atualização: ' + formatDateTime(new Date());
                    
            } catch (error) {
                console.error('Erro ao atualizar dados:', error);
                document.getElementById('lastUpdate').textContent = 
                    'Erro na atualização: ' + formatDateTime(new Date());
            }
        }
        
        // ===============================
        // 🚀 INICIALIZAÇÃO AUTOMÁTICA
        // ===============================
        
        // Auto-refresh
        document.getElementById('autoRefresh').addEventListener('change', function() {
            if (this.checked) {
                autoRefreshInterval = setInterval(atualizarDados, 30000);
            } else {
                clearInterval(autoRefreshInterval);
            }
        });
        
        // Carregar dados ao iniciar a página
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ Dashboard Final carregado - todas as funções definidas antes do uso');
            atualizarDados();
            autoRefreshInterval = setInterval(atualizarDados, 30000);
        });
        
    </script>
</body>
</html>
        `;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const dashboard = new DashboardFinalCorrigido();
    dashboard.iniciar(5004).catch(console.error);
}

module.exports = DashboardFinalCorrigido;
