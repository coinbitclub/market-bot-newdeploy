#!/usr/bin/env node

/**
 * 🚀 DASHBOARD SIMPLES PARA TESTE LOCAL
 * =====================================
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rota principal do dashboard
app.get('/', (req, res) => {
    res.send(generateDashboardHTML());
});

app.get('/dashboard-production', (req, res) => {
    res.send(generateDashboardHTML());
});

// APIs simuladas
app.get('/api/test-connection', (req, res) => {
    res.json({
        success: true,
        connected: true,
        timestamp: new Date(),
        message: 'Dashboard standalone funcionando!'
    });
});

app.get('/api/dashboard/realtime', (req, res) => {
    res.json({
        success: true,
        data: {
            timestamp: new Date().toISOString(),
            status: 'online',
            users_active: 127,
            active_positions: 23,
            total_pnl: 2847.50
        }
    });
});

app.get('/api/dashboard/signals', (req, res) => {
    res.json({
        success: true,
        data: {
            total: 47,
            approved: 38,
            rejected: 9,
            ai_decisions: 156,
            approval_rate: '80.9'
        }
    });
});

app.get('/api/dashboard/orders', (req, res) => {
    res.json({
        success: true,
        data: {
            total: 142,
            executed: 138,
            failed: 4,
            active_positions: 23,
            total_pnl: '2847.50',
            execution_rate: '97.2'
        }
    });
});

app.get('/api/dashboard/users', (req, res) => {
    res.json({
        success: true,
        data: {
            total: 132,
            active: 127,
            active_7d: 89,
            vip: 23,
            premium: 31,
            free: 78
        }
    });
});

app.get('/api/dashboard/balances', (req, res) => {
    res.json({
        success: true,
        data: {
            total: 132,
            binance_keys: 87,
            bybit_keys: 45,
            active_users: 127,
            total_balance_brl: '2847392.45',
            total_balance_usd: '517708.63',
            total_prepaid_usd: '124890.30',
            key_validation_rate: '97.8'
        }
    });
});

app.get('/api/dashboard/admin-logs', (req, res) => {
    res.json({
        success: true,
        data: {
            logs_today: 847,
            signal_logs: 156,
            order_logs: 289,
            api_logs: 324,
            error_logs: 3
        }
    });
});

function generateDashboardHTML() {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 CoinBitClub - Dashboard Teste Local</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: white; min-height: 100vh; padding: 20px;
        }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; color: #4fc3f7; }
        .subtitle { font-size: 1.2rem; margin-bottom: 20px; color: #b0bec5; }
        .connection-status { 
            padding: 15px; border-radius: 8px; margin-bottom: 20px;
            text-align: center; font-weight: bold; font-size: 1.1rem;
        }
        .connection-online { background: rgba(0, 230, 118, 0.2); border: 2px solid #00e676; }
        .card { 
            background: rgba(255,255,255,0.1); border-radius: 15px; padding: 25px; margin-bottom: 25px;
            backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);
        }
        .card h3 { color: #4fc3f7; margin-bottom: 20px; font-size: 1.4rem; }
        .step { 
            background: rgba(79, 195, 247, 0.15); border-left: 4px solid #4fc3f7; 
            padding: 20px; margin: 15px 0; border-radius: 8px;
        }
        .step-title { font-weight: bold; color: #4fc3f7; margin-bottom: 15px; font-size: 1.1rem; }
        .metric { display: inline-block; margin: 8px 15px 8px 0; }
        .metric-label { color: #b0bec5; font-size: 0.9rem; display: block; }
        .metric-value { font-weight: bold; font-size: 1.2rem; color: #00e676; display: block; margin-top: 5px; }
        .btn { 
            background: linear-gradient(45deg, #4fc3f7, #29b6f6); border: none; color: white;
            padding: 12px 24px; border-radius: 25px; cursor: pointer; margin: 10px;
            font-size: 1rem; font-weight: bold;
        }
        .status-success { color: #00e676; }
        .status-error { color: #ff5722; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 CoinBitClub - Dashboard Teste</h1>
        <div class="subtitle">Sistema de Monitoramento Local (Dados Simulados)</div>
        <div id="connection-status" class="connection-status connection-online">
            ✅ Dashboard Local Funcionando
        </div>
        <button class="btn" onclick="atualizarDados()">🔄 Atualizar Dados</button>
        <button class="btn" onclick="testConnection()">🔧 Testar Conexão</button>
    </div>

    <div class="card">
        <h3>🔄 FLUXO OPERACIONAL - SIMULAÇÃO</h3>
        
        <div class="step">
            <div class="step-title">PASSO 1: 📡 Processamento de Sinais</div>
            <div id="step1-content">
                <div class="metric">
                    <span class="metric-label">📊 Sinais Processados</span>
                    <span class="metric-value">47</span>
                </div>
                <div class="metric">
                    <span class="metric-label">✅ Aprovados</span>
                    <span class="metric-value status-success">38</span>
                </div>
                <div class="metric">
                    <span class="metric-label">❌ Rejeitados</span>
                    <span class="metric-value status-error">9</span>
                </div>
                <div class="metric">
                    <span class="metric-label">📈 Taxa Aprovação</span>
                    <span class="metric-value">80.9%</span>
                </div>
            </div>
        </div>
        
        <div class="step">
            <div class="step-title">PASSO 2: 💰 Execução de Ordens</div>
            <div id="step2-content">
                <div class="metric">
                    <span class="metric-label">📊 Total Ordens</span>
                    <span class="metric-value">142</span>
                </div>
                <div class="metric">
                    <span class="metric-label">✅ Executadas</span>
                    <span class="metric-value status-success">138</span>
                </div>
                <div class="metric">
                    <span class="metric-label">💰 P&L Total</span>
                    <span class="metric-value status-success">$2,847.50</span>
                </div>
                <div class="metric">
                    <span class="metric-label">📈 Taxa Execução</span>
                    <span class="metric-value">97.2%</span>
                </div>
            </div>
        </div>
        
        <div class="step">
            <div class="step-title">PASSO 3: 👥 Análise de Usuários</div>
            <div id="step3-content">
                <div class="metric">
                    <span class="metric-label">👥 Total Usuários</span>
                    <span class="metric-value">132</span>
                </div>
                <div class="metric">
                    <span class="metric-label">✅ Ativos</span>
                    <span class="metric-value status-success">127</span>
                </div>
                <div class="metric">
                    <span class="metric-label">💎 VIP</span>
                    <span class="metric-value">23</span>
                </div>
                <div class="metric">
                    <span class="metric-label">🎯 Premium</span>
                    <span class="metric-value">31</span>
                </div>
            </div>
        </div>
        
        <div class="step">
            <div class="step-title">PASSO 4: 💼 Saldos e Chaves</div>
            <div id="step4-content">
                <div class="metric">
                    <span class="metric-label">🔑 Chaves Binance</span>
                    <span class="metric-value status-success">87</span>
                </div>
                <div class="metric">
                    <span class="metric-label">🔑 Chaves ByBit</span>
                    <span class="metric-value status-success">45</span>
                </div>
                <div class="metric">
                    <span class="metric-label">💰 Saldo BRL</span>
                    <span class="metric-value">R$ 2,847,392.45</span>
                </div>
                <div class="metric">
                    <span class="metric-label">💵 Saldo USD</span>
                    <span class="metric-value">$ 517,708.63</span>
                </div>
            </div>
        </div>
        
        <div class="step">
            <div class="step-title">PASSO 5: 📜 Logs Operacionais</div>
            <div id="step5-content">
                <div class="metric">
                    <span class="metric-label">📜 Logs Hoje</span>
                    <span class="metric-value">847</span>
                </div>
                <div class="metric">
                    <span class="metric-label">📊 Sinais</span>
                    <span class="metric-value">156</span>
                </div>
                <div class="metric">
                    <span class="metric-label">💰 Ordens</span>
                    <span class="metric-value">289</span>
                </div>
                <div class="metric">
                    <span class="metric-label">❌ Erros</span>
                    <span class="metric-value status-error">3</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function testConnection() {
            try {
                const response = await fetch('/api/test-connection');
                const data = await response.json();
                console.log('✅ Conexão OK:', data);
                alert('✅ Dashboard funcionando perfeitamente!');
            } catch (error) {
                console.error('❌ Erro:', error);
                alert('❌ Erro na conexão');
            }
        }

        async function atualizarDados() {
            console.log('🔄 Atualizando dados...');
            // Simular atualização
            setTimeout(() => {
                console.log('✅ Dados atualizados');
                alert('✅ Dados atualizados com sucesso!');
            }, 1000);
        }

        console.log('🚀 Dashboard Local CoinBitClub carregado');
    </script>
</body>
</html>`;
}

// Iniciar servidor
app.listen(port, () => {
    console.log('🚀 DASHBOARD LOCAL INICIADO!');
    console.log('============================');
    console.log('');
    console.log(`📊 Dashboard: http://localhost:${port}`);
    console.log(`🌐 Produção: http://localhost:${port}/dashboard-production`);
    console.log('');
    console.log('✅ Pronto para demonstrar funcionalidades!');
});
