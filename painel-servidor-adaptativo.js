const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do banco PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

// Cache para estrutura das tabelas
let tableStructures = {};

// Função para verificar colunas de uma tabela
async function getTableColumns(tableName) {
    if (tableStructures[tableName]) {
        return tableStructures[tableName];
    }
    
    try {
        const result = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1 AND table_schema = 'public'
        `, [tableName]);
        
        const columns = result.rows.map(row => row.column_name);
        tableStructures[tableName] = columns;
        return columns;
    } catch (error) {
        console.error(`⚠️ Erro ao verificar colunas da tabela ${tableName}:`, error.message);
        return [];
    }
}

// Função para verificar se tabela existe
async function tableExists(tableName) {
    try {
        const result = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = $1
            )
        `, [tableName]);
        return result.rows[0].exists;
    } catch (error) {
        return false;
    }
}

// Função adaptativa para buscar usuários
async function buscarUsuarios() {
    const tabelasUsuarios = ['users', 'user', 'usuarios'];
    
    for (const tabela of tabelasUsuarios) {
        if (await tableExists(tabela)) {
            const colunas = await getTableColumns(tabela);
            
            // Adaptar query baseada nas colunas disponíveis
            let chaveAPI = 'NULL';
            if (colunas.includes('api_keyYOUR_API_KEY_HEREapi_key IS NOT NULL';
            else if (colunas.includes('binance_api_keyYOUR_API_KEY_HEREbinance_api_key IS NOT NULL';
            else if (colunas.includes('exchange_api_keyYOUR_API_KEY_HEREexchange_api_key IS NOT NULL';
            
            let dataCol = 'created_at';
            if (!colunas.includes('created_at') && colunas.includes('data_criacao')) {
                dataCol = 'data_criacao';
            }
            
            try {
                const query = `
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN ${chaveAPI} THEN 1 END) as com_chaves,
                        COUNT(CASE WHEN ${dataCol} >= NOW() - INTERVAL '24 hours' THEN 1 END) as novos_24h
                    FROM ${tabela}
                `;
                
                const result = await pool.query(query);
                console.log(`👥 Usuários encontrados na tabela ${tabela}:`, result.rows[0]);
                return result.rows[0] || { total: 0, com_chaves: 0, novos_24h: 0 };
            } catch (error) {
                console.error(`⚠️ Erro ao buscar usuários na tabela ${tabela}:`, error.message);
            }
        }
    }
    
    return { total: 0, com_chaves: 0, novos_24h: 0 };
}

// Função adaptativa para buscar posições
async function buscarPosicoes() {
    const tabelasPosicoes = ['active_positions', 'positions', 'posicoes', 'trading_positions'];
    
    for (const tabela of tabelasPosicoes) {
        if (await tableExists(tabela)) {
            const colunas = await getTableColumns(tabela);
            
            // Adaptar query baseada nas colunas disponíveis
            let tipoCol = 'side';
            if (colunas.includes('position_type')) tipoCol = 'position_type';
            else if (colunas.includes('type')) tipoCol = 'type';
            else if (colunas.includes('direction')) tipoCol = 'direction';
            
            let statusCol = 'status';
            let whereClause = '';
            if (colunas.includes('status')) {
                whereClause = `WHERE ${statusCol} IN ('OPEN', 'open', 'ACTIVE', 'active')`;
            } else if (colunas.includes('state')) {
                statusCol = 'state';
                whereClause = `WHERE ${statusCol} IN ('OPEN', 'open', 'ACTIVE', 'active')`;
            } else if (colunas.includes('is_active')) {
                whereClause = 'WHERE is_active = true';
            } else {
                // Se não há coluna de status, buscar todas
                whereClause = '';
            }
            
            try {
                const query = `
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN ${tipoCol} IN ('BUY', 'LONG', 'long') THEN 1 END) as long_positions,
                        COUNT(CASE WHEN ${tipoCol} IN ('SELL', 'SHORT', 'short') THEN 1 END) as short_positions
                    FROM ${tabela} 
                    ${whereClause}
                `;
                
                const result = await pool.query(query);
                console.log(`📈 Posições encontradas na tabela ${tabela}:`, result.rows[0]);
                return result.rows[0] || { total: 0, long_positions: 0, short_positions: 0 };
            } catch (error) {
                console.error(`⚠️ Erro ao buscar posições na tabela ${tabela}:`, error.message);
            }
        }
    }
    
    return { total: 0, long_positions: 0, short_positions: 0 };
}

// Função adaptativa para buscar ordens
async function buscarOrdens() {
    const tabelasOrdens = ['trade_executions', 'trading_orders', 'orders', 'ordens'];
    
    for (const tabela of tabelasOrdens) {
        if (await tableExists(tabela)) {
            const colunas = await getTableColumns(tabela);
            
            let dataCol = 'created_at';
            if (!colunas.includes('created_at') && colunas.includes('timestamp')) {
                dataCol = 'timestamp';
            } else if (!colunas.includes('created_at') && colunas.includes('data_execucao')) {
                dataCol = 'data_execucao';
            }
            
            try {
                const query = `
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN status IN ('FILLED', 'filled', 'EXECUTED') THEN 1 END) as executadas,
                        COUNT(CASE WHEN status IN ('PENDING', 'pending', 'OPEN', 'NEW') THEN 1 END) as pendentes,
                        COUNT(CASE WHEN status IN ('FAILED', 'failed', 'CANCELLED', 'REJECTED') THEN 1 END) as falharam
                    FROM ${tabela} 
                    WHERE ${dataCol} >= CURRENT_DATE
                `;
                
                const result = await pool.query(query);
                console.log(`💰 Ordens encontradas na tabela ${tabela}:`, result.rows[0]);
                return result.rows[0] || { total: 0, executadas: 0, pendentes: 0, falharam: 0 };
            } catch (error) {
                console.error(`⚠️ Erro ao buscar ordens na tabela ${tabela}:`, error.message);
            }
        }
    }
    
    return { total: 0, executadas: 0, pendentes: 0, falharam: 0 };
}

// Função adaptativa para buscar sinais
async function buscarUltimoSinal() {
    const tabelasSinais = ['trading_signals', 'signals', 'sinais', 'market_signals'];
    
    for (const tabela of tabelasSinais) {
        if (await tableExists(tabela)) {
            const colunas = await getTableColumns(tabela);
            
            // Selecionar colunas disponíveis
            const colunasDisponiveis = [];
            if (colunas.includes('symbol')) colunasDisponiveis.push('symbol');
            else if (colunas.includes('pair')) colunasDisponiveis.push('pair as symbol');
            else if (colunas.includes('coin')) colunasDisponiveis.push('coin as symbol');
            
            if (colunas.includes('action')) colunasDisponiveis.push('action');
            else if (colunas.includes('side')) colunasDisponiveis.push('side as action');
            else if (colunas.includes('type')) colunasDisponiveis.push('type as action');
            else if (colunas.includes('direction')) colunasDisponiveis.push('direction as action');
            
            if (colunas.includes('price')) colunasDisponiveis.push('price');
            else if (colunas.includes('entry_price')) colunasDisponiveis.push('entry_price as price');
            else if (colunas.includes('target_price')) colunasDisponiveis.push('target_price as price');
            
            if (colunas.includes('source')) colunasDisponiveis.push('source');
            else if (colunas.includes('provider')) colunasDisponiveis.push('provider as source');
            else colunasDisponiveis.push("'Sistema' as source");
            
            if (colunas.includes('created_at')) colunasDisponiveis.push('created_at');
            else if (colunas.includes('timestamp')) colunasDisponiveis.push('timestamp as created_at');
            else if (colunas.includes('data_sinal')) colunasDisponiveis.push('data_sinal as created_at');
            
            let orderByCol = 'created_at';
            if (!colunas.includes('created_at') && colunas.includes('timestamp')) {
                orderByCol = 'timestamp';
            } else if (!colunas.includes('created_at') && !colunas.includes('timestamp') && colunas.includes('id')) {
                orderByCol = 'id';
            }
            
            if (colunasDisponiveis.length > 0) {
                try {
                    const query = `
                        SELECT ${colunasDisponiveis.join(', ')}
                        FROM ${tabela} 
                        ORDER BY ${orderByCol} DESC 
                        LIMIT 1
                    `;
                    
                    const result = await pool.query(query);
                    const sinal = result.rows[0];
                    
                    if (sinal) {
                        console.log(`📡 Último sinal encontrado na tabela ${tabela}:`, sinal);
                        return sinal;
                    } else {
                        console.log(`📡 Nenhum sinal encontrado na tabela ${tabela}`);
                    }
                } catch (error) {
                    console.error(`⚠️ Erro ao buscar sinal na tabela ${tabela}:`, error.message);
                }
            }
        }
    }
    
    return { sem_sinais: true };
}

// Endpoint da API
app.get('/api/painel/dados', async (req, res) => {
    try {
        console.log('📡 API chamada: /api/painel/dados');
        
        // Testar conexão
        await pool.query('SELECT NOW()');
        console.log('✅ Banco conectado:', new Date().toISOString());
        
        // Buscar dados de forma adaptativa
        const [usuarios, posicoes, ordens, ultimo_sinal] = await Promise.all([
            buscarUsuarios(),
            buscarPosicoes(),
            buscarOrdens(),
            buscarUltimoSinal()
        ]);
        
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            status: {
                database: 'Conectado',
                server: 'Online',
                mode: 'TESTE LOCAL'
            },
            usuarios,
            posicoes,
            ordens,
            ultimo_sinal,
            metrics: {
                uptime: '--',
                version: 'v5.1.2'
            }
        };
        
        console.log('✅ Resposta da API preparada');
        res.json(response);
        
    } catch (error) {
        console.error('❌ Erro na API:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint do painel
app.get('/painel', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎯 Painel de Controle Trading Real</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #0c1426 0%, #1e293b 100%);
            color: #e2e8f0; 
            min-height: 100vh;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; color: #60a5fa; }
        .header p { font-size: 1.1rem; color: #94a3b8; margin-bottom: 20px; }
        .status-badge { 
            display: inline-block; 
            background: #10b981; 
            color: white; 
            padding: 8px 16px; 
            border-radius: 20px; 
            font-weight: bold;
            animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .card { 
            background: rgba(30, 41, 59, 0.8); 
            border-radius: 12px; 
            padding: 24px; 
            border: 1px solid #334155;
            backdrop-filter: blur(10px);
        }
        .card h3 { 
            font-size: 1.2rem; 
            margin-bottom: 20px; 
            display: flex; 
            align-items: center; 
            gap: 8px;
        }
        .metric { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 12px; 
        }
        .metric:last-child { margin-bottom: 0; }
        .metric-value { 
            font-weight: bold; 
            font-size: 1.1rem; 
        }
        .big-number { 
            font-size: 3rem; 
            font-weight: bold; 
            text-align: center; 
            margin: 20px 0;
            color: #60a5fa;
        }
        .small-metrics { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-top: 15px; 
        }
        .small-metric { 
            text-align: center; 
            padding: 10px; 
            background: rgba(51, 65, 85, 0.5); 
            border-radius: 8px; 
        }
        .green { color: #10b981; }
        .red { color: #ef4444; }
        .yellow { color: #f59e0b; }
        .blue { color: #3b82f6; }
        .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding: 20px; 
            border-top: 1px solid #334155; 
            color: #94a3b8; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Painel de Controle Trading Real</h1>
            <p>Sistema CoinBitClub - Dados 100% Reais em Tempo Real</p>
            <div class="status-badge">Sistema Online</div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>🔧 Status do Sistema</h3>
                <div class="metric">
                    <span>Banco de Dados:</span>
                    <span class="metric-value green" id="db-status">Conectado</span>
                </div>
                <div class="metric">
                    <span>Servidor:</span>
                    <span class="metric-value green" id="server-status">Online</span>
                </div>
                <div class="metric">
                    <span>Modo:</span>
                    <span class="metric-value yellow" id="mode">TESTE LOCAL</span>
                </div>
            </div>

            <div class="card">
                <h3>👥 Usuários Ativos</h3>
                <div class="big-number" id="total-usuarios">0</div>
                <div class="small-metrics">
                    <div class="small-metric">
                        <div class="metric-value green" id="usuarios-chaves">0</div>
                        <div style="font-size: 0.8rem;">Com Chaves API</div>
                    </div>
                    <div class="small-metric">
                        <div class="metric-value blue" id="usuarios-novos">0</div>
                        <div style="font-size: 0.8rem;">Novos (24h)</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>📊 Posições de Trading</h3>
                <div class="big-number" id="total-posicoes">0</div>
                <div class="small-metrics">
                    <div class="small-metric">
                        <div class="metric-value green" id="posicoes-long">0</div>
                        <div style="font-size: 0.8rem;">LONG</div>
                    </div>
                    <div class="small-metric">
                        <div class="metric-value red" id="posicoes-short">0</div>
                        <div style="font-size: 0.8rem;">SHORT</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>💰 Ordens Hoje</h3>
                <div class="big-number" id="total-ordens">0</div>
                <div class="small-metrics">
                    <div class="small-metric">
                        <div class="metric-value green" id="ordens-executadas">0</div>
                        <div style="font-size: 0.8rem;">Executadas</div>
                    </div>
                    <div class="small-metric">
                        <div class="metric-value yellow" id="ordens-pendentes">0</div>
                        <div style="font-size: 0.8rem;">Pendentes</div>
                    </div>
                </div>
                <div class="small-metrics" style="margin-top: 10px;">
                    <div class="small-metric">
                        <div class="metric-value red" id="ordens-falharam">0</div>
                        <div style="font-size: 0.8rem;">Falharam</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>📡 Último Sinal</h3>
                <div id="ultimo-sinal">
                    <div style="text-align: center; color: #94a3b8;">
                        Nenhum sinal recente
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>📈 Métricas do Sistema</h3>
                <div class="metric">
                    <span>Uptime:</span>
                    <span class="metric-value" id="uptime">--</span>
                </div>
                <div class="metric">
                    <span>Versão:</span>
                    <span class="metric-value" id="version">v5.1.2</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>🚀 Sistema de Trading Automatizado | Dados Reais | Atualização Automática</p>
        </div>
    </div>

    <script>
        async function atualizarDados() {
            try {
                const response = await fetch('/api/painel/dados');
                const data = await response.json();
                
                if (data.success) {
                    // Atualizar status
                    document.getElementById('db-status').textContent = data.status.database;
                    document.getElementById('server-status').textContent = data.status.server;
                    document.getElementById('mode').textContent = data.status.mode;
                    
                    // Atualizar usuários
                    if (data.usuarios) {
                        document.getElementById('total-usuarios').textContent = data.usuarios.total || 0;
                        document.getElementById('usuarios-chaves').textContent = data.usuarios.com_chaves || 0;
                        document.getElementById('usuarios-novos').textContent = data.usuarios.novos_24h || 0;
                    }
                    
                    // Atualizar posições
                    if (data.posicoes) {
                        document.getElementById('total-posicoes').textContent = data.posicoes.total || 0;
                        document.getElementById('posicoes-long').textContent = data.posicoes.long_positions || 0;
                        document.getElementById('posicoes-short').textContent = data.posicoes.short_positions || 0;
                    }
                    
                    // Atualizar ordens
                    if (data.ordens) {
                        document.getElementById('total-ordens').textContent = data.ordens.total || 0;
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
                    
                    // Atualizar métricas
                    if (data.metrics) {
                        document.getElementById('uptime').textContent = data.metrics.uptime || '--';
                        document.getElementById('version').textContent = data.metrics.version || 'v5.1.2';
                    }
                    
                    console.log('✅ Dados atualizados:', new Date().toLocaleString());
                } else {
                    console.error('❌ Erro na resposta:', data.error);
                }
            } catch (error) {
                console.error('❌ Erro ao buscar dados:', error);
            }
        }
        
        // Atualizar dados imediatamente
        atualizarDados();
        
        // Atualizar a cada 30 segundos
        setInterval(atualizarDados, 30000);
        
        console.log('🎯 Painel de Controle Trading Real iniciado!');
        console.log('📊 Dados 100% reais - Atualização automática a cada 30s');
    </script>
</body>
</html>`;
    
    res.send(html);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'Painel Trading Real - Teste',
        version: '5.1.2'
    });
});

// Inicializar servidor
async function iniciarServidor() {
    try {
        // Testar conexão com banco
        await pool.query('SELECT NOW()');
        console.log('✅ Banco de dados conectado:', new Date().toISOString());
        
        app.listen(port, () => {
            console.log('');
            console.log('🎯 PAINEL DE CONTROLE TRADING REAL - SERVIDOR ADAPTATIVO');
            console.log('====================================================');
            console.log(`🚀 Servidor rodando na porta: ${port}`);
            console.log(`🌐 Acesse: http://localhost:${port}/painel`);
            console.log(`📡 API: http://localhost:${port}/api/painel/dados`);
            console.log(`🔧 Health: http://localhost:${port}/health`);
            console.log('');
            console.log('📊 DADOS 100% REAIS - ZERO MOCK');
            console.log('⚡ CONSULTAS ADAPTATIVAS - AUTO-DETECÇÃO DE ESQUEMA');
            console.log('🔄 ATUALIZAÇÃO AUTOMÁTICA A CADA 30s');
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erro ao conectar com banco:', error.message);
        process.exit(1);
    }
}

iniciarServidor();
