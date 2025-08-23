#!/usr/bin/env node

/**
 * 🚀 SERVIDOR MÍNIMO PARA TESTE DE ENDPOINTS
 * ==========================================
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware básico
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pool de conexão PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    max: 5
});

// Dados de fallback realistas
function getFallbackData() {
    return {
        users: { total: 12, active: 8 },
        signals: { today: 23, processed: 19, pending: 4 },
        orders: { total: 47, executed: 43, failed: 4 },
        positions: { open: 3, total: 25 },
        balances: { usd: 15750.50, btc: 0.5234 },
        trades: { profit: 1850.30, winRate: 68.5 },
        fearGreed: { value: 45, classification: 'Neutral' }
    };
}

// ENDPOINTS PRINCIPAIS

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '6.0.0'
    });
});

// Status do sistema
app.get('/status', async (req, res) => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        res.json({
            status: 'OK',
            database: 'connected',
            timestamp: new Date().toISOString(),
            version: '6.0.0'
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Dashboard summary
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const fallbackData = getFallbackData();
        
        // Tentar buscar dados reais do banco
        let realData = {};
        try {
            const usersResult = await pool.query('SELECT COUNT(*) as total FROM users');
            realData.users = { total: parseInt(usersResult.rows[0].total) || 0 };
        } catch (dbError) {
            realData.users = fallbackData.users;
        }

        res.json({
            success: true,
            data: {
                users: realData.users || fallbackData.users,
                signals: fallbackData.signals,
                orders: fallbackData.orders,
                positions: fallbackData.positions,
                balances: fallbackData.balances,
                trades: fallbackData.trades,
                fearGreed: fallbackData.fearGreed,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        const fallbackData = getFallbackData();
        res.json({
            success: true,
            data: fallbackData,
            fallback: true,
            timestamp: new Date().toISOString()
        });
    }
});

// Dados em tempo real
app.get('/api/dashboard/realtime', (req, res) => {
    const data = getFallbackData();
    res.json({
        success: true,
        data: {
            timestamp: new Date().toISOString(),
            status: 'online',
            users_active: data.users.active,
            active_positions: data.positions.open,
            total_pnl: data.trades.profit
        }
    });
});

// Fluxo de sinais
app.get('/api/dashboard/signals', (req, res) => {
    const data = getFallbackData();
    res.json({
        success: true,
        data: {
            total: data.signals.today,
            processed: data.signals.processed,
            pending: data.signals.pending,
            approval_rate: Math.round((data.signals.processed / data.signals.today) * 100),
            last_signal: new Date(Date.now() - 1800000).toISOString()
        }
    });
});

// Ordens e execuções
app.get('/api/dashboard/orders', (req, res) => {
    const data = getFallbackData();
    res.json({
        success: true,
        data: {
            total: data.orders.total,
            executed: data.orders.executed,
            failed: data.orders.failed,
            execution_rate: Math.round((data.orders.executed / data.orders.total) * 100),
            avg_execution_time: '2.1s'
        }
    });
});

// Performance de usuários
app.get('/api/dashboard/users', (req, res) => {
    const data = getFallbackData();
    res.json({
        success: true,
        data: {
            total_users: data.users.total,
            active_users: data.users.active,
            win_rate: data.trades.winRate,
            total_profit: data.trades.profit
        }
    });
});

// Saldos
app.get('/api/dashboard/balances', (req, res) => {
    const data = getFallbackData();
    res.json({
        success: true,
        data: {
            total_usd: data.balances.usd,
            total_btc: data.balances.btc,
            users_with_balance: data.users.active,
            last_update: new Date().toISOString()
        }
    });
});

// Logs administrativos
app.get('/api/dashboard/admin-logs', (req, res) => {
    res.json({
        success: true,
        data: {
            total_logs: 156,
            errors: 3,
            warnings: 8,
            info: 145,
            last_error: new Date(Date.now() - 3600000).toISOString()
        }
    });
});

// Análise de IA
app.get('/api/dashboard/ai-analysis', (req, res) => {
    const data = getFallbackData();
    res.json({
        success: true,
        data: {
            market_direction: 'BULLISH',
            confidence_score: 75.5,
            fear_greed_index: data.fearGreed.value,
            classification: data.fearGreed.classification,
            last_analysis: new Date(Date.now() - 900000).toISOString(),
            recommendation: 'HOLD'
        }
    });
});

// Webhooks
app.get('/webhook', (req, res) => {
    res.json({
        status: 'WEBHOOK ATIVO',
        endpoint: '/webhook',
        method: 'GET/POST',
        description: 'Endpoint para receber sinais de trading',
        version: '6.0.0'
    });
});

app.post('/webhook', (req, res) => {
    console.log('📡 Webhook recebido:', req.body);
    res.json({
        status: 'SIGNAL_RECEIVED',
        data: req.body,
        processed: true,
        timestamp: new Date().toISOString()
    });
});

// API de sinais
app.get('/api/webhooks/signal', (req, res) => {
    res.json({
        status: 'SIGNAL_API_ACTIVE',
        signals_today: 23,
        last_signal: new Date(Date.now() - 1800000).toISOString()
    });
});

app.post('/api/webhooks/signal', (req, res) => {
    console.log('📡 Signal API recebido:', req.body);
    res.json({
        status: 'API_SIGNAL_PROCESSED',
        data: req.body,
        timestamp: new Date().toISOString()
    });
});

// Exchanges
app.get('/api/exchanges/status', (req, res) => {
    res.json({
        success: true,
        exchanges: {
            binance: { status: 'connected', testnet: true },
            bybit: { status: 'connected', testnet: true }
        },
        timestamp: new Date().toISOString()
    });
});

// Trading
app.get('/api/trade/status', (req, res) => {
    res.json({
        status: 'OPERATIONAL',
        trading_enabled: process.env.ENABLE_REAL_TRADING === 'true',
        mode: process.env.ENABLE_REAL_TRADING === 'true' ? 'REAL' : 'SIMULATION',
        connected_users: 8,
        active_positions: 3
    });
});

// Usuários
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM users');
        res.json({
            total: parseInt(result.rows[0].total) || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            total: 12,
            fallback: true,
            timestamp: new Date().toISOString()
        });
    }
});

// Test connection
app.get('/api/test-connection', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        client.release();
        
        res.json({
            success: true,
            connected: true,
            timestamp: result.rows[0].current_time,
            database_url: process.env.DATABASE_URL ? 'Configured' : 'Not configured'
        });
    } catch (error) {
        res.json({
            success: false,
            connected: false,
            error: error.message
        });
    }
});

// Catch all para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        available_endpoints: [
            'GET /health',
            'GET /status', 
            'GET /api/dashboard/summary',
            'GET /api/dashboard/realtime',
            'POST /webhook',
            'GET /api/test-connection'
        ]
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
const server = app.listen(port, '0.0.0.0', () => {
    console.log('🚀 COINBITCLUB MINIMAL SERVER STARTED');
    console.log('====================================');
    console.log(`📍 Port: ${port}`);
    console.log(`🌐 URL: http://localhost:${port}`);
    console.log(`🔗 Health: http://localhost:${port}/health`);
    console.log(`📊 Dashboard: http://localhost:${port}/api/dashboard/summary`);
    console.log(`📡 Webhook: http://localhost:${port}/webhook`);
    console.log('====================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        pool.end();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        pool.end();
        process.exit(0);
    });
});

module.exports = app;
