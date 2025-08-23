// 📊 DASHBOARD SISTEMA COMPLETO - TEMPO REAL
const { Pool } = require('pg');
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

class DashboardCompleto {
    constructor() {
        this.dados = {
            sistema: {},
            mercado: {},
            usuarios: {},
            ia: {},
            ordens: {},
            monitoramento: {}
        };
    }

    async coletarDadosSistema() {
        try {
            // Status geral do sistema
            const sistemaStatus = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE is_active = true) as usuarios_ativos,
                    (SELECT COUNT(*) FROM users WHERE auto_trading_enabled = true) as usuarios_trading,
                    (SELECT COUNT(*) FROM trading_signals WHERE created_at > NOW() - INTERVAL '24 hours') as sinais_24h,
                    (SELECT COUNT(*) FROM order_executions WHERE created_at > NOW() - INTERVAL '24 hours') as ordens_24h,
                    (SELECT COUNT(*) FROM signal_metrics_log WHERE created_at > NOW() - INTERVAL '24 hours') as decisoes_ia_24h
            `);

            this.dados.sistema = sistemaStatus.rows[0] || {};

        } catch (error) {
            console.error('Erro ao coletar dados do sistema:', error.message);
            this.dados.sistema = { error: error.message };
        }
    }

    async coletarDadosMercado() {
        try {
            // Dados de mercado atuais
            const mercadoQuery = await pool.query(`
                SELECT 
                    fg.value as fear_greed_value,
                    fg.value_classification as fear_greed_class,
                    fg.source as fear_greed_source,
                    fg.collected_at as fear_greed_update,
                    btc.btc_dominance,
                    btc.market_cap_change_24h,
                    btc.total_market_cap,
                    btc.collected_at as btc_update,
                    (SELECT COUNT(*) FROM top100_cryptocurrencies WHERE collected_at > NOW() - INTERVAL '2 hours') as crypto_count,
                    (SELECT COUNT(CASE WHEN price_change_24h > 0 THEN 1 END) FROM top100_cryptocurrencies WHERE collected_at > NOW() - INTERVAL '2 hours') as crypto_up
                FROM fear_greed_index fg
                CROSS JOIN LATERAL (
                    SELECT * FROM btc_dominance ORDER BY collected_at DESC LIMIT 1
                ) btc
                ORDER BY fg.collected_at DESC 
                LIMIT 1
            `);

            const mercado = mercadoQuery.rows[0] || {};
            if (mercado.crypto_count && mercado.crypto_up) {
                mercado.crypto_percentage_up = (mercado.crypto_up / mercado.crypto_count * 100).toFixed(1);
            }

            this.dados.mercado = mercado;

        } catch (error) {
            console.error('Erro ao coletar dados do mercado:', error.message);
            this.dados.mercado = { error: error.message };
        }
    }

    async coletarDadosUsuarios() {
        try {
            // Dados dos usuários
            const usuariosQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN auto_trading_enabled = true THEN 1 END) as com_auto_trading,
                    COUNT(CASE WHEN bybit_api_key IS NOT NULL THEN 1 END) as com_bybit,
                    COUNT(CASE WHEN binance_api_key_encrypted IS NOT NULL THEN 1 END) as com_binance,
                    COUNT(CASE WHEN api_validation_status = 'valid' THEN 1 END) as apis_validas,
                    AVG(risk_percentage) as risco_medio,
                    AVG(leverage_preference) as leverage_medio
                FROM users 
                WHERE is_active = true
            `);

            this.dados.usuarios = usuariosQuery.rows[0] || {};

        } catch (error) {
            console.error('Erro ao coletar dados dos usuários:', error.message);
            this.dados.usuarios = { error: error.message };
        }
    }

    async coletarDadosIA() {
        try {
            // Dados da IA
            const iaQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total_decisoes,
                    COUNT(CASE WHEN ai_approved = true THEN 1 END) as aprovadas,
                    COUNT(CASE WHEN should_execute = true THEN 1 END) as executadas,
                    AVG(confidence) as confianca_media,
                    AVG(fear_greed_value) as fear_greed_medio,
                    AVG(btc_dominance) as btc_dominance_medio,
                    MAX(created_at) as ultima_decisao
                FROM signal_metrics_log 
                WHERE created_at > NOW() - INTERVAL '24 hours'
                AND ai_decision IS NOT NULL
            `);

            this.dados.ia = iaQuery.rows[0] || {};

        } catch (error) {
            console.error('Erro ao coletar dados da IA:', error.message);
            this.dados.ia = { error: error.message };
        }
    }

    async coletarDadosOrdens() {
        try {
            // Dados das ordens
            const ordensQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total_ordens,
                    COUNT(CASE WHEN status = 'executed' THEN 1 END) as executadas,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as canceladas,
                    COUNT(DISTINCT user_id) as usuarios_com_ordens,
                    AVG(CASE WHEN price IS NOT NULL THEN price END) as preco_medio,
                    MAX(created_at) as ultima_ordem
                FROM order_executions 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);

            this.dados.ordens = ordensQuery.rows[0] || {};

        } catch (error) {
            console.error('Erro ao coletar dados das ordens:', error.message);
            this.dados.ordens = { error: error.message };
        }
    }

    async coletarDadosMonitoramento() {
        try {
            // Dados de monitoramento
            const monitorQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total_logs,
                    COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as erros,
                    COUNT(CASE WHEN level = 'WARN' THEN 1 END) as warnings,
                    COUNT(CASE WHEN level = 'INFO' THEN 1 END) as infos,
                    MAX(timestamp) as ultimo_log
                FROM system_logs 
                WHERE timestamp > NOW() - INTERVAL '24 hours'
            `);

            this.dados.monitoramento = monitorQuery.rows[0] || {};

        } catch (error) {
            console.error('Erro ao coletar dados de monitoramento:', error.message);
            this.dados.monitoramento = { error: error.message };
        }
    }

    async atualizarDados() {
        await this.coletarDadosSistema();
        await this.coletarDadosMercado();
        await this.coletarDadosUsuarios();
        await this.coletarDadosIA();
        await this.coletarDadosOrdens();
        await this.coletarDadosMonitoramento();
    }

    gerarHTML() {
        const agora = new Date().toLocaleString('pt-BR');
        
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CoinBitClub - Dashboard Sistema Completo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff; min-height: 100vh; padding: 20px;
        }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .status-bar { 
            background: rgba(255,255,255,0.1); 
            padding: 15px; border-radius: 10px; margin-bottom: 30px;
            display: flex; justify-content: space-between; align-items: center;
        }
        .container { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
        .card { 
            background: rgba(255,255,255,0.1); 
            backdrop-filter: blur(10px);
            border-radius: 15px; padding: 25px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .card h3 { 
            font-size: 1.4em; margin-bottom: 20px; 
            display: flex; align-items: center; gap: 10px;
        }
        .metric { 
            display: flex; justify-content: space-between; 
            margin-bottom: 15px; padding: 10px; 
            background: rgba(255,255,255,0.05); border-radius: 8px;
        }
        .metric-label { font-weight: 500; }
        .metric-value { 
            font-weight: bold; 
            padding: 2px 8px; border-radius: 4px;
        }
        .green { background-color: #10b981; }
        .red { background-color: #ef4444; }
        .yellow { background-color: #f59e0b; }
        .blue { background-color: #3b82f6; }
        .purple { background-color: #8b5cf6; }
        .refresh-btn {
            background: #10b981; color: white; border: none;
            padding: 10px 20px; border-radius: 8px; cursor: pointer;
            font-weight: bold; transition: all 0.3s;
        }
        .refresh-btn:hover { background: #059669; transform: translateY(-2px); }
        .error { background-color: #ef4444; padding: 10px; border-radius: 8px; margin: 10px 0; }
        .icon { font-size: 1.2em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 CoinBitClub Trading System</h1>
        <p>Dashboard Sistema Completo - Monitoramento em Tempo Real</p>
    </div>

    <div class="status-bar">
        <div>📊 Última atualização: ${agora}</div>
        <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar</button>
        <div>Status: ${this.determinarStatusGeral()}</div>
    </div>

    <div class="container">
        ${this.gerarCardSistema()}
        ${this.gerarCardMercado()}
        ${this.gerarCardUsuarios()}
        ${this.gerarCardIA()}
        ${this.gerarCardOrdens()}
        ${this.gerarCardMonitoramento()}
    </div>

    <script>
        // Auto-refresh a cada 30 segundos
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
    }

    gerarCardSistema() {
        const sistema = this.dados.sistema;
        return `
        <div class="card">
            <h3><span class="icon">⚙️</span> Sistema Geral</h3>
            ${sistema.error ? `<div class="error">Erro: ${sistema.error}</div>` : `
            <div class="metric">
                <span class="metric-label">Usuários Ativos</span>
                <span class="metric-value blue">${sistema.usuarios_ativos || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Auto-Trading Ativo</span>
                <span class="metric-value ${parseInt(sistema.usuarios_trading) > 0 ? 'green' : 'red'}">${sistema.usuarios_trading || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Sinais 24h</span>
                <span class="metric-value purple">${sistema.sinais_24h || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Ordens 24h</span>
                <span class="metric-value yellow">${sistema.ordens_24h || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Decisões IA 24h</span>
                <span class="metric-value blue">${sistema.decisoes_ia_24h || 0}</span>
            </div>
            `}
        </div>`;
    }

    gerarCardMercado() {
        const mercado = this.dados.mercado;
        return `
        <div class="card">
            <h3><span class="icon">📈</span> Dados de Mercado</h3>
            ${mercado.error ? `<div class="error">Erro: ${mercado.error}</div>` : `
            <div class="metric">
                <span class="metric-label">Fear & Greed</span>
                <span class="metric-value ${this.getColorFearGreed(mercado.fear_greed_value)}">${mercado.fear_greed_value || 'N/A'} (${mercado.fear_greed_class || 'N/A'})</span>
            </div>
            <div class="metric">
                <span class="metric-label">Fonte F&G</span>
                <span class="metric-value blue">${mercado.fear_greed_source || 'N/A'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">BTC Dominance</span>
                <span class="metric-value yellow">${mercado.btc_dominance ? parseFloat(mercado.btc_dominance).toFixed(2) + '%' : 'N/A'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Market Cap 24h</span>
                <span class="metric-value ${this.getColorMarketCap(mercado.market_cap_change_24h)}">${mercado.market_cap_change_24h ? (mercado.market_cap_change_24h > 0 ? '+' : '') + parseFloat(mercado.market_cap_change_24h).toFixed(2) + '%' : 'N/A'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">TOP 100 Subindo</span>
                <span class="metric-value purple">${mercado.crypto_percentage_up || 'N/A'}%</span>
            </div>
            `}
        </div>`;
    }

    gerarCardUsuarios() {
        const usuarios = this.dados.usuarios;
        return `
        <div class="card">
            <h3><span class="icon">👥</span> Usuários</h3>
            ${usuarios.error ? `<div class="error">Erro: ${usuarios.error}</div>` : `
            <div class="metric">
                <span class="metric-label">Total Ativos</span>
                <span class="metric-value blue">${usuarios.total || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Auto-Trading</span>
                <span class="metric-value ${parseInt(usuarios.com_auto_trading) > 0 ? 'green' : 'red'}">${usuarios.com_auto_trading || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">APIs Bybit</span>
                <span class="metric-value yellow">${usuarios.com_bybit || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">APIs Binance</span>
                <span class="metric-value yellow">${usuarios.com_binance || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">APIs Válidas</span>
                <span class="metric-value ${parseInt(usuarios.apis_validas) > 0 ? 'green' : 'red'}">${usuarios.apis_validas || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Risco Médio</span>
                <span class="metric-value purple">${usuarios.risco_medio ? parseFloat(usuarios.risco_medio).toFixed(1) + '%' : 'N/A'}</span>
            </div>
            `}
        </div>`;
    }

    gerarCardIA() {
        const ia = this.dados.ia;
        return `
        <div class="card">
            <h3><span class="icon">🤖</span> Inteligência Artificial</h3>
            ${ia.error ? `<div class="error">Erro: ${ia.error}</div>` : `
            <div class="metric">
                <span class="metric-label">Decisões 24h</span>
                <span class="metric-value blue">${ia.total_decisoes || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Aprovadas</span>
                <span class="metric-value green">${ia.aprovadas || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Taxa Aprovação</span>
                <span class="metric-value purple">${ia.total_decisoes > 0 ? ((ia.aprovadas / ia.total_decisoes) * 100).toFixed(1) + '%' : '0%'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Confiança Média</span>
                <span class="metric-value yellow">${ia.confianca_media ? (parseFloat(ia.confianca_media) * 100).toFixed(1) + '%' : 'N/A'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Fear & Greed Médio</span>
                <span class="metric-value blue">${ia.fear_greed_medio ? parseFloat(ia.fear_greed_medio).toFixed(0) : 'N/A'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Última Decisão</span>
                <span class="metric-value green">${ia.ultima_decisao ? new Date(ia.ultima_decisao).toLocaleString('pt-BR') : 'N/A'}</span>
            </div>
            `}
        </div>`;
    }

    gerarCardOrdens() {
        const ordens = this.dados.ordens;
        return `
        <div class="card">
            <h3><span class="icon">📋</span> Ordens de Trading</h3>
            ${ordens.error ? `<div class="error">Erro: ${ordens.error}</div>` : `
            <div class="metric">
                <span class="metric-label">Total 24h</span>
                <span class="metric-value blue">${ordens.total_ordens || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Executadas</span>
                <span class="metric-value green">${ordens.executadas || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Pendentes</span>
                <span class="metric-value yellow">${ordens.pendentes || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Canceladas</span>
                <span class="metric-value red">${ordens.canceladas || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Usuários c/ Ordens</span>
                <span class="metric-value purple">${ordens.usuarios_com_ordens || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Última Ordem</span>
                <span class="metric-value green">${ordens.ultima_ordem ? new Date(ordens.ultima_ordem).toLocaleString('pt-BR') : 'N/A'}</span>
            </div>
            `}
        </div>`;
    }

    gerarCardMonitoramento() {
        const monitor = this.dados.monitoramento;
        return `
        <div class="card">
            <h3><span class="icon">📊</span> Monitoramento</h3>
            ${monitor.error ? `<div class="error">Erro: ${monitor.error}</div>` : `
            <div class="metric">
                <span class="metric-label">Logs 24h</span>
                <span class="metric-value blue">${monitor.total_logs || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Erros</span>
                <span class="metric-value ${parseInt(monitor.erros) > 10 ? 'red' : 'green'}">${monitor.erros || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Warnings</span>
                <span class="metric-value yellow">${monitor.warnings || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Infos</span>
                <span class="metric-value green">${monitor.infos || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Último Log</span>
                <span class="metric-value purple">${monitor.ultimo_log ? new Date(monitor.ultimo_log).toLocaleString('pt-BR') : 'N/A'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Sistema</span>
                <span class="metric-value ${this.determinarStatusSistema()}">${this.determinarStatusTexto()}</span>
            </div>
            `}
        </div>`;
    }

    getColorFearGreed(value) {
        if (!value) return 'blue';
        if (value >= 75) return 'green';
        if (value >= 54) return 'yellow';
        if (value >= 46) return 'blue';
        if (value >= 25) return 'yellow';
        return 'red';
    }

    getColorMarketCap(value) {
        if (!value) return 'blue';
        return parseFloat(value) > 0 ? 'green' : 'red';
    }

    determinarStatusGeral() {
        const problemas = [
            parseInt(this.dados.sistema.usuarios_trading) === 0,
            !this.dados.mercado.fear_greed_value,
            parseInt(this.dados.usuarios.apis_validas) === 0,
            parseInt(this.dados.ia.total_decisoes) === 0
        ].filter(Boolean).length;

        if (problemas === 0) return '🚀 OPERACIONAL';
        if (problemas <= 2) return '⚠️ PARCIAL';
        return '❌ CRÍTICO';
    }

    determinarStatusSistema() {
        const status = this.determinarStatusGeral();
        if (status.includes('OPERACIONAL')) return 'green';
        if (status.includes('PARCIAL')) return 'yellow';
        return 'red';
    }

    determinarStatusTexto() {
        const status = this.determinarStatusGeral();
        if (status.includes('OPERACIONAL')) return 'ATIVO';
        if (status.includes('PARCIAL')) return 'PARCIAL';
        return 'PARADO';
    }
}

// Configurar rotas Express
app.get('/', async (req, res) => {
    const dashboard = new DashboardCompleto();
    await dashboard.atualizarDados();
    res.send(dashboard.gerarHTML());
});

app.get('/api/dados', async (req, res) => {
    const dashboard = new DashboardCompleto();
    await dashboard.atualizarDados();
    res.json(dashboard.dados);
});

// Iniciar servidor
if (require.main === module) {
    app.listen(port, () => {
        console.log(`📊 Dashboard rodando em http://localhost:${port}`);
        console.log('🔄 Atualização automática a cada 30 segundos');
    });
}

module.exports = DashboardCompleto;
