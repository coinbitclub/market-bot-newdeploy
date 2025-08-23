
/**
 * 🆘 COINBITCLUB - APP MINIMALISTA RAILWAY
 * ========================================
 */

console.log('🆘 COINBITCLUB MINIMALISTA INICIANDO...');

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Health check GARANTIDO
app.get('/health', (req, res) => {
    console.log('Health check solicitado');
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: 'minimal'
    });
});

// Root
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'CoinBitClub Minimal',
        status: 'operational',
        timestamp: new Date().toISOString()
    });
});

// Ativar chaves
app.get('/ativar-chaves-reais', async (req, res) => {
    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        const result = await pool.query(`
            UPDATE user_api_keys 
            SET is_active = true, environment = 'mainnet'
            WHERE LENGTH(api_key) > 20 AND LENGTH(api_secret) > 20
            RETURNING user_id, exchange
        `);
        
        await pool.end();
        
        res.status(200).json({
            success: true,
            activated: result.rows.length,
            keys: result.rows
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`🆘 Minimal server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled rejection:', reason);
});

module.exports = app;
