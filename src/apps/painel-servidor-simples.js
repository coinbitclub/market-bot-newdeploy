/**
 * 🚀 SERVIDOR SIMPLES PARA TESTE DO PAINEL
 * ========================================
 * 
 * Servidor minimalista apenas para testar o painel de controle
 */

const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 3001; // Usar porta diferente para evitar conflitos

// Configurar pool do banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 🎯 PAINEL DE CONTROLE - ROTA PRINCIPAL
app.get('/painel', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎯 Painel de Controle Trading Real - CoinBitClub</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
        }

        .header h1 {
            color: #3b82f6;
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        .header p {
            color: #94a3b8;
            font-size: 1.1rem;
        }

        .status-badge {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 0.5rem;
            margin-top: 1rem;
        }

        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }

        .card {
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 1rem;
            padding: 2rem;
            transition: all 0.3s ease;
        }

        .card:hover {
            transform: translateY(-2px);
            border-color: rgba(59, 130, 246, 0.5);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .card h3 {
            color: #f1f5f9;
            font-size: 1.25rem;
            margin-bottom: 1rem;
        }

        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
            padding: 0.5rem 0;
        }

        .metric-label {
            color: #94a3b8;
        }

        .metric-value {
            color: #f1f5f9;
            font-weight: 600;
        }

        .metric-large {
            text-align: center;
            margin-bottom: 1.5rem;
        }

        .metric-number {
            display: block;
            font-size: 3rem;
            font-weight: 700;
            color: #3b82f6;
            line-height: 1;
        }

        .metric-unit {
            color: #94a3b8;
            font-size: 0.875rem;
            font-weight: 500;
        }

        .loading {
            text-align: center;
            color: #94a3b8;
            padding: 2rem;
            font-style: italic;
        }

        .error {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 0.5rem;
            padding: 1rem;
            margin: 1rem 0;
        }

        .success {
            color: #10b981;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 0.5rem;
            padding: 1rem;
            margin: 1rem 0;
        }

        .timestamp {
            text-align: center;
            color: #64748b;
            font-size: 0.875rem;
            margin-top: 2rem;
        }

        .nav-links {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin-top: 2rem;
            flex-wrap: wrap;
        }

        .nav-link {
            padding: 0.75rem 1.5rem;
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
            text-decoration: none;
            border-radius: 0.5rem;
            border: 1px solid rgba(59, 130, 246, 0.3);
            transition: all 0.2s;
        }

        .nav-link:hover {
            background: rgba(59, 130, 246, 0.2);
            transform: translateY(-1px);
        }

        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .cards-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            
            .card {
                padding: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Painel de Controle Trading Real</h1>
            <p>Sistema CoinBitClub - Dados 100% Reais em Tempo Real</p>
            <div class="status-badge" id="status-badge">🔄 Carregando...</div>
        </div>

        <div class="cards-grid">
            <div class="card">
                <h3>🔋 Status do Sistema</h3>
                <div class="metric">
                    <span class="metric-label">Banco de Dados:</span>
                    <span class="metric-value" id="db-status">--</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Servidor:</span>
                    <span class="metric-value" style="color: #10b981;">🟢 Online</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Modo:</span>
                    <span class="metric-value">TESTE LOCAL</span>
                </div>
            </div>

            <div class="card">
                <h3>👥 Usuários Ativos</h3>
                <div class="metric-large">
                    <span class="metric-number" id="usuarios-total">--</span>
                    <span class="metric-unit">usuários</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Com Chaves API:</span>
                    <span class="metric-value" id="usuarios-com-chaves">--</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Novos (24h):</span>
                    <span class="metric-value" id="usuarios-novos">--</span>
                </div>
            </div>

            <div class="card">
                <h3>📈 Posições de Trading</h3>
                <div class="metric-large">
                    <span class="metric-number" id="posicoes-total">--</span>
                    <span class="metric-unit">posições</span>
                </div>
                <div class="metric">
                    <span class="metric-label">LONG:</span>
                    <span class="metric-value" id="posicoes-long" style="color: #10b981;">--</span>
                </div>
                <div class="metric">
                    <span class="metric-label">SHORT:</span>
                    <span class="metric-value" id="posicoes-short" style="color: #ef4444;">--</span>
                </div>
            </div>

            <div class="card">
                <h3>💰 Ordens Hoje</h3>
                <div class="metric-large">
                    <span class="metric-number" id="ordens-total">--</span>
                    <span class="metric-unit">ordens</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Executadas:</span>
                    <span class="metric-value" id="ordens-executadas" style="color: #10b981;">--</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Pendentes:</span>
                    <span class="metric-value" id="ordens-pendentes" style="color: #f59e0b;">--</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Falharam:</span>
                    <span class="metric-value" id="ordens-falharam" style="color: #ef4444;">--</span>
                </div>
            </div>

            <div class="card">
                <h3>📡 Último Sinal</h3>
                <div id="ultimo-sinal" class="loading">Carregando...</div>
            </div>

            <div class="card">
                <h3>📊 Métricas do Sistema</h3>
                <div class="metric">
                    <span class="metric-label">Uptime:</span>
                    <span class="metric-value" id="uptime">--</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Versão:</span>
                    <span class="metric-value">v5.1.2</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Dados:</span>
                    <span class="metric-value" style="color: #10b981;">100% REAIS</span>
                </div>
            </div>
        </div>

        <div class="nav-links">
            <a href="/painel" class="nav-link">🏠 Principal</a>
            <a href="/painel/executivo" class="nav-link">📊 Executivo</a>
            <a href="/painel/fluxo" class="nav-link">🔄 Fluxo</a>
            <a href="/painel/usuarios" class="nav-link">👥 Usuários</a>
            <a href="/api/painel/dados" class="nav-link">📡 API Teste</a>
        </div>

        <div class="timestamp" id="timestamp">
            Última atualização: --
        </div>
    </div>

    <script>
        // Função para atualizar timestamp
        function updateTimestamp() {
            const now = new Date();
            document.getElementById('timestamp').textContent = 
                'Última atualização: ' + now.toLocaleString('pt-BR');
        }

        // Função para buscar dados reais
        async function fetchDados() {
            try {
                const response = await fetch('/api/painel/dados');
                const data = await response.json();
                
                if (data.success) {
                    // Atualizar status
                    document.getElementById('status-badge').textContent = '🟢 Sistema Online';
                    document.getElementById('status-badge').style.background = 'rgba(16, 185, 129, 0.1)';
                    document.getElementById('status-badge').style.color = '#10b981';
                    
                    // Atualizar dados do banco
                    if (data.database && data.database.conectado) {
                        document.getElementById('db-status').textContent = '🟢 Conectado';
                        document.getElementById('db-status').style.color = '#10b981';
                    } else {
                        document.getElementById('db-status').textContent = '🔴 Desconectado';
                        document.getElementById('db-status').style.color = '#ef4444';
                    }
                    
                    // Atualizar usuários
                    if (data.usuarios) {
                        document.getElementById('usuarios-total').textContent = data.usuarios.total || 0;
                        document.getElementById('usuarios-com-chaves').textContent = data.usuarios.com_chaves || 0;
                        document.getElementById('usuarios-novos').textContent = data.usuarios.novos_24h || 0;
                    }
                    
                    // Atualizar posições
                    if (data.posicoes) {
                        document.getElementById('posicoes-total').textContent = data.posicoes.total || 0;
                        document.getElementById('posicoes-long').textContent = data.posicoes.long_positions || 0;
                        document.getElementById('posicoes-short').textContent = data.posicoes.short_positions || 0;
                    }
                    
                    // Atualizar ordens
                    if (data.ordens) {
                        document.getElementById('ordens-total').textContent = data.ordens.total || 0;
                        document.getElementById('ordens-executadas').textContent = data.ordens.executadas || 0;
                        document.getElementById('ordens-pendentes').textContent = data.ordens.pendentes || 0;
                        document.getElementById('ordens-falharam').textContent = data.ordens.falharam || 0;
                    }
                    
                    // Atualizar último sinal
                    if (data.ultimo_sinal && !data.ultimo_sinal.sem_sinais) {
                        const sinalHTML = '<div style="text-align: center;">' +
                            '<div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6; margin-bottom: 0.5rem;">' +
                            (data.ultimo_sinal.symbol || '--') + '</div>' +
                            '<div style="font-size: 1.1rem; margin-bottom: 0.25rem;">' +
                            (data.ultimo_sinal.action || '--') + '</div>' +
                            '<div style="font-size: 0.875rem; color: #94a3b8;">' +
                            (data.ultimo_sinal.created_at ? 
                                new Date(data.ultimo_sinal.created_at).toLocaleString('pt-BR') : '--') +
                            '</div></div>';
                        document.getElementById('ultimo-sinal').innerHTML = sinalHTML;
                    } else {
                        document.getElementById('ultimo-sinal').innerHTML = 
                            '<div style="text-align: center; color: #94a3b8;">Nenhum sinal recente</div>';
                    }
                    
                } else {
                    throw new Error(data.error || 'Erro desconhecido');
                }
                
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
                document.getElementById('status-badge').textContent = '🔴 Erro na Conexão';
                document.getElementById('status-badge').style.background = 'rgba(239, 68, 68, 0.1)';
                document.getElementById('status-badge').style.color = '#ef4444';
            }
        }

        // Inicializar
        updateTimestamp();
        fetchDados();
        
        // Atualizar a cada 30 segundos
        setInterval(() => {
            updateTimestamp();
            fetchDados();
        }, 30000);
    </script>
</body>
</html>`);
});

// 📡 API para dados reais do painel
app.get('/api/painel/dados', async (req, res) => {
    try {
        console.log('📡 API chamada: /api/painel/dados');
        
        // Testar conexão com banco
        let database = { conectado: false };
        try {
            const dbTest = await pool.query('SELECT NOW() as agora, version() as versao');
            database = {
                conectado: true,
                timestamp: dbTest.rows[0].agora,
                versao: dbTest.rows[0].versao.split(' ')[0]
            };
            console.log('✅ Banco conectado:', database.timestamp);
        } catch (dbError) {
            console.error('❌ Erro no banco:', dbError.message);
            database = { conectado: false, erro: dbError.message };
        }

        // Buscar usuários
        let usuarios = { total: 0, com_chaves: 0, novos_24h: 0 };
        try {
            const usuariosQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN binance_api_key IS NOT NULL AND binance_api_secret IS NOT NULL THEN 1 END) as com_chaves,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as novos_24h
                FROM users
            `);
            usuarios = usuariosQuery.rows[0] || usuarios;
            console.log('👥 Usuários encontrados:', usuarios);
        } catch (error) {
            console.error('⚠️ Erro ao buscar usuários:', error.message);
        }

        // Buscar posições
        let posicoes = { total: 0, long_positions: 0, short_positions: 0 };
        try {
            const posicoesQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN side = 'BUY' OR action = 'LONG' THEN 1 END) as long_positions,
                    COUNT(CASE WHEN side = 'SELL' OR action = 'SHORT' THEN 1 END) as short_positions
                FROM active_positions 
                WHERE status = 'OPEN'
            `);
            posicoes = posicoesQuery.rows[0] || posicoes;
            console.log('📈 Posições encontradas:', posicoes);
        } catch (error) {
            console.error('⚠️ Erro ao buscar posições:', error.message);
        }

        // Buscar ordens do dia
        let ordens = { total: 0, executadas: 0, pendentes: 0, falharam: 0 };
        try {
            const ordensQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as executadas,
                    COUNT(CASE WHEN status = 'PENDING' OR status = 'OPEN' OR status = 'NEW' THEN 1 END) as pendentes,
                    COUNT(CASE WHEN status = 'FAILED' OR status = 'CANCELLED' THEN 1 END) as falharam
                FROM trade_executions 
                WHERE created_at >= CURRENT_DATE
            `);
            ordens = ordensQuery.rows[0] || ordens;
            console.log('💰 Ordens encontradas:', ordens);
        } catch (error) {
            console.error('⚠️ Erro ao buscar ordens:', error.message);
        }

        // Buscar último sinal
        let ultimo_sinal = { sem_sinais: true };
        try {
            const sinalQuery = await pool.query(`
                SELECT symbol, action, price, source, created_at
                FROM trading_signals 
                ORDER BY created_at DESC 
                LIMIT 1
            `);
            ultimo_sinal = sinalQuery.rows[0] || ultimo_sinal;
            console.log('📡 Último sinal:', ultimo_sinal);
        } catch (error) {
            console.error('⚠️ Erro ao buscar sinal:', error.message);
        }

        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            database,
            usuarios,
            posicoes,
            ordens,
            ultimo_sinal
        };

        console.log('✅ Resposta da API preparada');
        res.json(response);

    } catch (error) {
        console.error('❌ Erro geral na API:', error);
        res.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Outras rotas do painel (placeholders)
app.get('/painel/executivo', (req, res) => {
    res.send('<h1>📊 Dashboard Executivo - Em desenvolvimento</h1><a href="/painel">← Voltar</a>');
});

app.get('/painel/fluxo', (req, res) => {
    res.send('<h1>🔄 Fluxo Operacional - Em desenvolvimento</h1><a href="/painel">← Voltar</a>');
});

app.get('/painel/usuarios', (req, res) => {
    res.send('<h1>👥 Monitoramento de Usuários - Em desenvolvimento</h1><a href="/painel">← Voltar</a>');
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Painel de Controle Trading Real',
        timestamp: new Date().toISOString(),
        port: port
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.redirect('/painel');
});

// Iniciar servidor
app.listen(port, () => {
    console.log('');
    console.log('🎯 PAINEL DE CONTROLE TRADING REAL - SERVIDOR TESTE');
    console.log('==================================================');
    console.log(`🚀 Servidor rodando na porta: ${port}`);
    console.log(`🌐 Acesse: http://localhost:${port}/painel`);
    console.log(`📡 API: http://localhost:${port}/api/painel/dados`);
    console.log(`🔧 Health: http://localhost:${port}/health`);
    console.log('');
    console.log('📊 DADOS 100% REAIS - ZERO MOCK');
    console.log('⚡ ATUALIZAÇÃO AUTOMÁTICA A CADA 30s');
    console.log('');

    // Testar conexão com banco na inicialização
    pool.query('SELECT NOW()')
        .then(result => {
            console.log('✅ Banco de dados conectado:', result.rows[0].now);
        })
        .catch(error => {
            console.error('❌ Erro na conexão com banco:', error.message);
        });
});

module.exports = app;
