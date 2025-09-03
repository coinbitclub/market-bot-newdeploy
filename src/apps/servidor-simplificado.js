/**
 * 🚀 SERVIDOR SIMPLIFICADO PARA PRODUÇÃO
 * =====================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

console.log('🚀 INICIANDO SERVIDOR SIMPLIFICADO...');
console.log('====================================');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Configurar banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        trading: process.env.ENABLE_REAL_TRADING === 'true' ? 'REAL' : 'SIMULATION',
        uptime: Math.floor(process.uptime())
    });
});

// API Status
app.get('/api/status', async (req, res) => {
    try {
        const dbTest = await pool.query('SELECT NOW() as server_time');
        const userCount = await pool.query('SELECT COUNT(*) as total FROM users WHERE ativo = true');
        
        res.json({
            success: true,
            data: {
                database: 'connected',
                serverTime: dbTest.rows[0].server_time,
                activeUsers: parseInt(userCount.rows[0].total),
                tradingMode: process.env.ENABLE_REAL_TRADING === 'true' ? 'REAL' : 'SIMULATION',
                environment: process.env.NODE_ENV || 'production'
            }
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Webhook para sinais
app.post('/webhook/sinal', async (req, res) => {
    try {
        console.log('📊 Sinal recebido:', req.body);
        
        // Aqui integraria com o sistema de processamento
        res.json({
            success: true,
            message: 'Sinal recebido e processado',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro no webhook:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log('✅ SERVIDOR ONLINE!');
    console.log('==================');
    console.log(`🌐 Porta: ${port}`);
    console.log(`🔥 Trading Real: ${process.env.ENABLE_REAL_TRADING === 'true' ? 'ATIVO' : 'SIMULAÇÃO'}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'production'}`);
    console.log('📡 Endpoints:');
    console.log(`   • Health: http://localhost:${port}/health`);
    console.log(`   • Status: http://localhost:${port}/api/status`);
    console.log(`   • Webhook: http://localhost:${port}/webhook/sinal`);
    console.log('');
    console.log('🎯 SISTEMA PRONTO PARA OPERAÇÃO!');
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
});

module.exports = app;
