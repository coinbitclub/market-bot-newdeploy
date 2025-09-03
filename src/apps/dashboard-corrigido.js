/**
 * 📊 DASHBOARD SIMPLIFICADO - CORRIGIDO PARA ESTRUTURA REAL
 * =========================================================
 * 
 * Dashboard em tempo real usando as tabelas que realmente existem:
 * ✅ trading_signals (sinais do TradingView)
 * ✅ trading_orders (ordens dos usuários)
 * ✅ positions (posições abertas)
 * ✅ users (usuários do sistema)
 */

const express = require('express');
const { Pool } = require('pg');

class DashboardCorrigido {
    constructor() {
        console.log('📊 INICIALIZANDO DASHBOARD CORRIGIDO');
        console.log('===================================');
        
        this.app = express();
        this.pool = new Pool({
            connectionString: 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        this.app.use(express.static(__dirname));
        this.app.use(express.json());
        
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });

        this.configurarRotas();
    }

    configurarRotas() {
        // Página principal
        this.app.get('/', (req, res) => {
            res.send(this.gerarHTMLDashboard());
        });

        // API para dados em tempo real
        this.app.get('/api/dashboard/realtime', this.getDadosTempoReal.bind(this));
        this.app.get('/api/dashboard/signals', this.getFluxoSinais.bind(this));
        this.app.get('/api/dashboard/orders', this.getOrdensExecucoes.bind(this));
        this.app.get('/api/dashboard/users', this.getPerformanceUsuarios.bind(this));
        this.app.get('/api/dashboard/system', this.getStatusSistema.bind(this));
        
        // 🦅 Águia News APIs
        this.app.get('/api/aguia/latest', this.getAguiaLatest.bind(this));
        this.app.get('/api/aguia/stats', this.getAguiaStats.bind(this));
        this.app.post('/api/aguia/generate', this.generateAguiaRadar.bind(this));
        
        // 🤖 IA Supervisão APIs
        this.app.get('/api/ia/analyses', this.getIAAnalyses.bind(this));
        this.app.get('/api/ia/alerts', this.getIAAlerts.bind(this));
        this.app.get('/api/ia/supervisor', this.getIASupervisor.bind(this));
    }

    /**
     * 📊 DADOS EM TEMPO REAL - VERSÃO CORRIGIDA
     */
    async getDadosTempoReal(req, res) {
        try {
            const agora = new Date();
            
            // Buscar últimos sinais (últimas 24h)
            const ultimosSinais = await this.pool.query(`
                SELECT 
                    id,
                    signal_id,
                    symbol,
                    side,
                    status,
                    source,
                    created_at,
                    executed_at,
                    confidence,
                    analysis
                FROM trading_signals 
                WHERE created_at >= NOW() - INTERVAL '24 hours'
                ORDER BY created_at DESC
                LIMIT 50
            `);

            // Estatísticas do dia
            const estatisticasDia = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_sinais,
                    COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as sinais_executados,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as sinais_cancelados,
                    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as sinais_pendentes,
                    AVG(confidence) as confianca_media
                FROM trading_signals 
                WHERE created_at >= CURRENT_DATE
            `);

            // Ordens do dia
            const ordensDia = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_ordens,
                    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as ordens_executadas,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as ordens_canceladas,
                    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as ordens_ativas,
                    SUM(CASE WHEN status = 'FILLED' THEN quantity * price ELSE 0 END) as volume_total
                FROM trading_orders
                WHERE created_at >= CURRENT_DATE
            `);

            // Usuários ativos
            const usuariosAtivos = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_usuarios,
                    COUNT(CASE WHEN last_login >= CURRENT_DATE THEN 1 END) as usuarios_ativos_hoje
                FROM users
                WHERE is_active = true
            `);

            // Status do sistema
            const statusSistema = await this.verificarStatusSistema();

            res.json({
                success: true,
                timestamp: agora,
                data: {
                    signals: {
                        recent: ultimosSinais.rows,
                        stats: estatisticasDia.rows[0]
                    },
                    orders: ordensDia.rows[0],
                    users: usuariosAtivos.rows[0],
                    systemStatus: statusSistema,
                    lastUpdate: agora
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar dados em tempo real:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 📡 FLUXO DE SINAIS - VERSÃO CORRIGIDA
     */
    async getFluxoSinais(req, res) {
        try {
            const { limit = 20, offset = 0 } = req.query;

            const fluxoCompleto = await this.pool.query(`
                SELECT 
                    ts.id,
                    ts.signal_id,
                    ts.symbol,
                    ts.side,
                    ts.status,
                    ts.source,
                    ts.created_at,
                    ts.executed_at,
                    ts.confidence,
                    ts.analysis,
                    ts.entry_price,
                    ts.stop_loss,
                    ts.take_profit,
                    
                    -- Contar ordens relacionadas
                    (
                        SELECT COUNT(*)
                        FROM trading_orders to_
                        WHERE to_.symbol = ts.symbol
                        AND to_.created_at >= ts.created_at
                        AND to_.created_at <= ts.created_at + INTERVAL '1 hour'
                    ) as orders_count
                    
                FROM trading_signals ts
                WHERE ts.created_at >= NOW() - INTERVAL '24 hours'
                ORDER BY ts.created_at DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]);

            res.json({
                success: true,
                data: {
                    signals: fluxoCompleto.rows,
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
     * 💰 ORDENS - VERSÃO CORRIGIDA
     */
    async getOrdensExecucoes(req, res) {
        try {
            const { limit = 50 } = req.query;

            const ordens = await this.pool.query(`
                SELECT 
                    to_.id,
                    to_.user_id,
                    to_.symbol,
                    to_.status,
                    to_.order_type,
                    to_.side,
                    to_.quantity,
                    to_.price,
                    to_.exchange,
                    to_.created_at,
                    to_.filled_at,
                    to_.error_message,
                    
                    -- Dados do usuário
                    u.email as user_email,
                    u.user_type as user_plan,
                    
                    -- Tempo de execução
                    CASE 
                        WHEN to_.status = 'FILLED' AND to_.filled_at IS NOT NULL THEN
                            EXTRACT(EPOCH FROM (to_.filled_at - to_.created_at))
                        ELSE NULL
                    END as execution_time_seconds
                    
                FROM trading_orders to_
                LEFT JOIN users u ON to_.user_id = u.id
                WHERE to_.created_at >= NOW() - INTERVAL '24 hours'
                ORDER BY to_.created_at DESC
                LIMIT $1
            `, [limit]);

            // Estatísticas das ordens
            const estatisticasOrdens = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as filled_orders,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders,
                    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as active_orders,
                    AVG(quantity * price) as avg_amount,
                    SUM(CASE WHEN status = 'FILLED' THEN quantity * price ELSE 0 END) as total_volume
                FROM trading_orders
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            `);

            res.json({
                success: true,
                data: {
                    orders: ordens.rows,
                    statistics: estatisticasOrdens.rows[0],
                    timestamp: new Date()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar ordens:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 👥 PERFORMANCE DE USUÁRIOS - VERSÃO CORRIGIDA
     */
    async getPerformanceUsuarios(req, res) {
        try {
            const performanceUsuarios = await this.pool.query(`
                SELECT 
                    u.id,
                    u.email,
                    u.plan_type,
                    u.created_at as user_since,
                    u.last_login,
                    
                    -- Estatísticas de trading
                    COUNT(to_.id) as total_orders,
                    COUNT(CASE WHEN to_.status = 'FILLED' THEN 1 END) as successful_orders,
                    COUNT(CASE WHEN to_.status = 'CANCELLED' THEN 1 END) as failed_orders,
                    SUM(CASE WHEN to_.status = 'FILLED' THEN to_.quantity * to_.price ELSE 0 END) as total_volume,
                    
                    -- Última atividade
                    MAX(to_.created_at) as last_order_time,
                    
                    -- Performance ratio
                    CASE 
                        WHEN COUNT(to_.id) > 0 THEN 
                            ROUND((COUNT(CASE WHEN to_.status = 'FILLED' THEN 1 END)::numeric / COUNT(to_.id)::numeric) * 100, 2)
                        ELSE 0 
                    END as success_rate_percentage
                    
                FROM users u
                LEFT JOIN trading_orders to_ ON u.id = to_.user_id AND to_.created_at >= NOW() - INTERVAL '30 days'
                WHERE u.is_active = true
                GROUP BY u.id, u.email, u.plan_type, u.created_at, u.last_login
                ORDER BY total_orders DESC, success_rate_percentage DESC
                LIMIT 50
            `);

            res.json({
                success: true,
                data: {
                    userPerformance: performanceUsuarios.rows,
                    timestamp: new Date()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar performance de usuários:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 🔧 STATUS DO SISTEMA
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
                WHERE status = 'PENDING'
            `);

            // Verificar usuários ativos nas últimas 24h
            const usuariosAtivos = await this.pool.query(`
                SELECT COUNT(*) as count FROM users 
                WHERE last_login >= NOW() - INTERVAL '24 hours'
            `);

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
                    memory: process.memoryUsage()
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
    <title>🏢 CoinBitClub - Dashboard Operacional (Corrigido)</title>
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
        
        .signal-executed { color: #00ff88; }
        .signal-cancelled { color: #ff4444; }
        .signal-pending { color: #ffaa00; }
        
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏢 CoinBitClub - Dashboard Operacional (Corrigido)</h1>
            <p>Monitoramento em tempo real usando estrutura real do banco</p>
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
            
            <!-- 🦅 Águia News -->
            <div class="card">
                <h3>🦅 Águia News</h3>
                <div id="aguiaStats">Carregando...</div>
                <div class="aguia-controls" style="margin-top: 15px;">
                    <button onclick="gerarRadarManual()" id="btnGerarRadar" class="refresh-btn" style="font-size: 12px; padding: 5px 10px;">🔧 Gerar Radar</button>
                </div>
            </div>
            
            <!-- 🤖 IA Supervisão -->
            <div class="card">
                <h3>🤖 IA Supervisão</h3>
                <div id="iaStats">Carregando...</div>
            </div>
        </div>
        
        <!-- Águia News - Último Radar -->
        <div class="card full-width">
            <h3>🦅 Último Radar Águia News</h3>
            <div class="radar-content" id="aguiaRadarContent" style="max-height: 300px; overflow-y: auto; background: rgba(0, 0, 0, 0.2); padding: 15px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 13px; white-space: pre-line;">
                Carregando último radar...
            </div>
        </div>
        
        <!-- IA Supervisão - Análises e Alertas -->
        <div class="grid">
            <div class="card">
                <h3>🧠 Análises da IA</h3>
                <div class="table-container" style="max-height: 300px;">
                    <table>
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Confiança</th>
                                <th>Status</th>
                                <th>Hora</th>
                            </tr>
                        </thead>
                        <tbody id="iaAnalysesTable">
                            <tr><td colspan="4">Carregando análises...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card">
                <h3>🚨 Alertas do Supervisor</h3>
                <div class="table-container" style="max-height: 300px;">
                    <table>
                        <thead>
                            <tr>
                                <th>Severidade</th>
                                <th>Título</th>
                                <th>Status</th>
                                <th>Hora</th>
                            </tr>
                        </thead>
                        <tbody id="iaAlertsTable">
                            <tr><td colspan="4">Carregando alertas...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Fluxo de Sinais em Tempo Real -->
        <div class="card full-width">
            <h3>📊 Sinais em Tempo Real</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>ID Sinal</th>
                            <th>Symbol</th>
                            <th>Side</th>
                            <th>Status</th>
                            <th>Confiança</th>
                            <th>Ordens</th>
                            <th>Source</th>
                        </tr>
                    </thead>
                    <tbody id="signalsTable">
                        <tr><td colspan="8">Carregando dados...</td></tr>
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
                            <th>Symbol</th>
                            <th>Tipo</th>
                            <th>Quantidade</th>
                            <th>Preço</th>
                            <th>Status</th>
                            <th>Exchange</th>
                        </tr>
                    </thead>
                    <tbody id="ordersTable">
                        <tr><td colspan="8">Carregando dados...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

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
            const executados = parseInt(stats.sinais_executados) || 0;
            const cancelados = parseInt(stats.sinais_cancelados) || 0;
            const pendentes = parseInt(stats.sinais_pendentes) || 0;
            const confianca = parseFloat(stats.confianca_media) || 0;
            
            const html = \`
                <div class="metric">
                    <span>📊 Total</span>
                    <span class="metric-value">\${total}</span>
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
                    <span>⏳ Pendentes</span>
                    <span class="metric-value signal-pending">\${pendentes}</span>
                </div>
                <div class="metric">
                    <span>🎯 Confiança Média</span>
                    <span class="metric-value">\${confianca.toFixed(1)}%</span>
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
                    <span class="metric-value signal-executed">\${executadas}</span>
                </div>
                <div class="metric">
                    <span>⚡ Ativas</span>
                    <span class="metric-value signal-pending">\${ativas}</span>
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
                tbody.innerHTML = '<tr><td colspan="8">Nenhuma ordem encontrada</td></tr>';
                return;
            }
            
            const html = orders.map(order => {
                const statusClass = order.status === 'FILLED' ? 'signal-executed' : 
                                  order.status === 'CANCELLED' ? 'signal-cancelled' : 'signal-pending';
                
                return \`
                    <tr>
                        <td>\${formatDateTime(order.created_at)}</td>
                        <td>\${order.user_email} (\${order.user_plan || 'N/A'})</td>
                        <td>\${order.symbol}</td>
                        <td>\${order.side} \${order.order_type}</td>
                        <td>\${order.quantity}</td>
                        <td>\${order.price ? formatCurrency(order.price) : 'N/A'}</td>
                        <td class="\${statusClass}">\${order.status}</td>
                        <td>\${order.exchange}</td>
                    </tr>
                \`;
            }).join('');
            
            tbody.innerHTML = html;
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
        
        console.log('📊 Dashboard corrigido iniciado - usando estrutura real do banco');
        
        // ===============================
        // 🦅 FUNÇÕES ÁGUIA NEWS
        // ===============================
        
        function atualizarEstatisticasAguia(stats) {
            const html = \`
                <div class="metric">
                    <span>📊 Total Radars</span>
                    <span class="metric-value">\${stats.total_radars}</span>
                </div>
                <div class="metric">
                    <span>📅 Hoje</span>
                    <span class="metric-value signal-executed">\${stats.radars_today}</span>
                </div>
                <div class="metric">
                    <span>👑 Premium</span>
                    <span class="metric-value">\${stats.premium_radars}</span>
                </div>
                <div class="metric">
                    <span>🆓 Gratuitos</span>
                    <span class="metric-value">\${stats.free_radars}</span>
                </div>
                <div class="metric">
                    <span>👥 Usuários</span>
                    <span class="metric-value">\${stats.total_users}</span>
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
        
        function atualizarTabelaIAAnalyses(analyses) {
            const tbody = document.getElementById('iaAnalysesTable');
            
            if (!analyses || analyses.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">Nenhuma análise encontrada</td></tr>';
                return;
            }
            
            const html = analyses.slice(0, 5).map(analysis => {
                const confidence = analysis.confidence_score ? (analysis.confidence_score * 100).toFixed(1) + '%' : 'N/A';
                const approved = analysis.approved_at ? 'Aprovada' : analysis.requires_human_approval ? 'Pendente' : 'Automática';
                const statusClass = analysis.approved_at ? 'signal-executed' : 
                                   analysis.requires_human_approval ? 'signal-pending' : 'signal-processing';
                
                return \`
                    <tr>
                        <td>\${analysis.analysis_type}</td>
                        <td>\${confidence}</td>
                        <td class="\${statusClass}">\${approved}</td>
                        <td>\${formatDateTime(analysis.created_at)}</td>
                    </tr>
                \`;
            }).join('');
            
            tbody.innerHTML = html;
        }
        
        function atualizarTabelaIAAlertas(alerts) {
            const tbody = document.getElementById('iaAlertsTable');
            
            if (!alerts || alerts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">Nenhum alerta encontrado</td></tr>';
                return;
            }
            
            const html = alerts.slice(0, 5).map(alert => {
                const severityClass = alert.severity === 'CRITICAL' ? 'signal-cancelled' :
                                     alert.severity === 'HIGH' ? 'signal-pending' : 'signal-executed';
                const statusClass = alert.status === 'ACTIVE' ? 'signal-pending' : 'signal-executed';
                
                return \`
                    <tr>
                        <td class="\${severityClass}">\${alert.severity}</td>
                        <td title="\${alert.description}">\${alert.title}</td>
                        <td class="\${statusClass}">\${alert.status}</td>
                        <td>\${formatDateTime(alert.created_at)}</td>
                    </tr>
                \`;
            }).join('');
            
            tbody.innerHTML = html;
        }
        
        async function atualizarIASupervisao() {
            try {
                // Buscar análises
                const analysesResponse = await fetch('/api/ia/analyses?limit=10');
                const analysesData = await analysesResponse.json();
                
                // Buscar alertas
                const alertsResponse = await fetch('/api/ia/alerts?limit=10');
                const alertsData = await alertsResponse.json();
                
                // Buscar status do supervisor
                const supervisorResponse = await fetch('/api/ia/supervisor');
                const supervisorData = await supervisorResponse.json();
                
                if (analysesData.success && alertsData.success && supervisorData.success) {
                    atualizarEstatisticasIA(analysesData.data.statistics, supervisorData.data);
                    atualizarTabelaIAAnalyses(analysesData.data.analyses);
                    atualizarTabelaIAAlertas(alertsData.data.alerts);
                }
                
            } catch (error) {
                console.error('Erro ao atualizar IA Supervisão:', error);
            }
        }
    </script>
</body>
</html>
        `;
    }

    /**
     * 🚀 INICIAR DASHBOARD
     */
    async iniciar(porta = 5003) {
        try {
            // Verificar conexão com banco
            await this.pool.query('SELECT NOW()');
            console.log('✅ Conexão com banco de dados estabelecida');

            this.app.listen(porta, () => {
                console.log(`\n📊 DASHBOARD CORRIGIDO INICIADO`);
                console.log(`===============================`);
                console.log(`🎯 Porta: ${porta}`);
                console.log(`🔗 URL: http://localhost:${porta}`);
                console.log(`📡 APIs disponíveis:`);
                console.log(`   • Dashboard: http://localhost:${porta}`);
                console.log(`   • Tempo Real: http://localhost:${porta}/api/dashboard/realtime`);
                console.log(`   • Sinais: http://localhost:${porta}/api/dashboard/signals`);
                console.log(`   • Ordens: http://localhost:${porta}/api/dashboard/orders`);
                console.log(`   • Usuários: http://localhost:${porta}/api/dashboard/users`);
                console.log(`   • Status: http://localhost:${porta}/api/dashboard/system`);
                console.log(`\n✅ Dashboard usando estrutura real do banco!`);
                console.log(`🔄 Auto-refresh ativo a cada 30 segundos`);
            });

        } catch (error) {
            console.error('❌ Erro ao iniciar dashboard:', error);
            throw error;
        }
    }

    // ===============================
    // 🦅 MÉTODOS ÁGUIA NEWS
    // ===============================

    /**
     * 🦅 OBTER ÚLTIMO RADAR ÁGUIA NEWS
     */
    async getAguiaLatest(req, res) {
        try {
            const result = await this.pool.query(`
                SELECT 
                    id, 
                    content, 
                    generated_at, 
                    market_data, 
                    ai_analysis, 
                    is_premium, 
                    plan_required
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
     * 📊 OBTER ESTATÍSTICAS ÁGUIA NEWS
     */
    async getAguiaStats(req, res) {
        try {
            const stats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_radars,
                    COUNT(CASE WHEN DATE(generated_at AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE THEN 1 END) as radars_today,
                    COUNT(CASE WHEN is_premium = true THEN 1 END) as premium_radars,
                    COUNT(CASE WHEN is_premium = false THEN 1 END) as free_radars,
                    MAX(generated_at) as last_generated
                FROM aguia_news_radars
            `);

            const totalUsers = await this.pool.query(`
                SELECT COUNT(*) as count FROM users WHERE is_active = true
            `);

            res.json({
                success: true,
                stats: {
                    total_radars: parseInt(stats.rows[0].total_radars),
                    radars_today: parseInt(stats.rows[0].radars_today),
                    premium_radars: parseInt(stats.rows[0].premium_radars),
                    free_radars: parseInt(stats.rows[0].free_radars),
                    total_users: parseInt(totalUsers.rows[0].count),
                    last_generated: stats.rows[0].last_generated,
                    next_generation: '20:00 Brasília'
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas Aguia:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 🔧 GERAR RADAR MANUAL
     */
    async generateAguiaRadar(req, res) {
        try {
            // Simular geração de radar (implementar integração real depois)
            const radarContent = `
🦅 RADAR ÁGUIA NEWS - ${new Date().toLocaleString('pt-BR')}
===============================================

📊 ANÁLISE DE MERCADO:
• BTC: Tendência lateral com suporte em $65,000
• Altcoins: Movimento de consolidação
• Volume: Baixo nas últimas 24h

🎯 OPORTUNIDADES:
• ETH/USDT: Setup de alta formado
• BNB/USDT: Rompimento de resistência
• ADA/USDT: Divergência bullish no RSI

⚠️ ALERTAS:
• Atenção para notícias do Fed
• Monitorar volume do BTC
• Cuidado com correções súbitas

📈 RECOMENDAÇÕES:
• Manter posições defensivas
• Aguardar confirmação de tendência
• Stop loss ajustado em 3%

🔔 Este é um radar GRATUITO do Águia News
            `;

            // Inserir no banco
            const insertResult = await this.pool.query(`
                INSERT INTO aguia_news_radars (
                    content, 
                    market_data, 
                    ai_analysis, 
                    is_premium, 
                    plan_required,
                    generated_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING id, content, generated_at
            `, [
                radarContent,
                JSON.stringify({ btc_price: 65000, market_trend: 'lateral' }),
                JSON.stringify({ confidence: 0.8, signals: 3 }),
                false,
                'FREE'
            ]);

            res.json({
                success: true,
                message: 'Radar gerado com sucesso',
                radar: insertResult.rows[0]
            });

        } catch (error) {
            console.error('❌ Erro ao gerar radar manual:', error);
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    }

    // ===============================
    // 🤖 MÉTODOS IA SUPERVISÃO
    // ===============================

    /**
     * 🧠 OBTER ANÁLISES DA IA
     */
    async getIAAnalyses(req, res) {
        try {
            const { limit = 20 } = req.query;

            const analyses = await this.pool.query(`
                SELECT 
                    ia.id,
                    ia.analysis_type,
                    ia.analysis_result,
                    ia.confidence_score,
                    ia.market_data,
                    ia.suggestions,
                    ia.requires_human_approval,
                    ia.approved_at,
                    ia.approved_by,
                    ia.created_at,
                    u.email as user_email
                FROM ia_analyses ia
                LEFT JOIN users u ON ia.user_id = u.id
                ORDER BY ia.created_at DESC
                LIMIT $1
            `, [limit]);

            // Estatísticas das análises
            const stats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_analyses,
                    COUNT(CASE WHEN approved_at IS NOT NULL THEN 1 END) as approved_count,
                    COUNT(CASE WHEN requires_human_approval = true THEN 1 END) as pending_approval,
                    AVG(confidence_score) as avg_confidence,
                    COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_count
                FROM ia_analyses
                WHERE created_at >= NOW() - INTERVAL '7 days'
            `);

            res.json({
                success: true,
                data: {
                    analyses: analyses.rows,
                    statistics: stats.rows[0],
                    timestamp: new Date()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar análises da IA:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 🚨 OBTER ALERTAS DO SUPERVISOR IA
     */
    async getIAAlerts(req, res) {
        try {
            const { limit = 20, severity } = req.query;

            let whereClause = '';
            let params = [limit];

            if (severity) {
                whereClause = 'WHERE severity = $2';
                params.push(severity);
            }

            const alerts = await this.pool.query(`
                SELECT 
                    id,
                    alert_type,
                    title,
                    description,
                    severity,
                    status,
                    entity_type,
                    entity_id,
                    metadata,
                    created_at,
                    acknowledged_at,
                    acknowledged_by,
                    resolved_at
                FROM ia_supervisor_alerts
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $1
            `, params);

            // Estatísticas dos alertas
            const alertStats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_alerts,
                    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_alerts,
                    COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_alerts,
                    COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_alerts,
                    COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_alerts,
                    COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) as medium_alerts,
                    COUNT(CASE WHEN severity = 'LOW' THEN 1 END) as low_alerts
                FROM ia_supervisor_alerts
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            `);

            res.json({
                success: true,
                data: {
                    alerts: alerts.rows,
                    statistics: alertStats.rows[0],
                    timestamp: new Date()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar alertas da IA:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * 🎯 OBTER STATUS SUPERVISOR IA
     */
    async getIASupervisor(req, res) {
        try {
            // Análises recentes
            const recentAnalyses = await this.pool.query(`
                SELECT 
                    analysis_type,
                    COUNT(*) as count,
                    AVG(confidence_score) as avg_confidence,
                    MAX(created_at) as last_analysis
                FROM ia_analyses
                WHERE created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY analysis_type
                ORDER BY count DESC
            `);

            // Alertas críticos ativos
            const criticalAlerts = await this.pool.query(`
                SELECT COUNT(*) as count
                FROM ia_supervisor_alerts
                WHERE status = 'ACTIVE' AND severity IN ('CRITICAL', 'HIGH')
            `);

            // Performance da IA nas últimas 24h
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
                    },
                    timestamp: new Date()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar status do supervisor IA:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const dashboard = new DashboardCorrigido();
    dashboard.iniciar(5003).catch(console.error);
}

module.exports = DashboardCorrigido;
