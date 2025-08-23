
/**
 * 🆘 COINBITCLUB - VERSÃO EMERGENCIAL
 * ==================================
 */

console.log('🆘 Iniciando versão emergencial...');

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

class EmergencyCoinBitClub {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.setupEmergencyApp();
    }

    setupEmergencyApp() {
        this.app.use(cors());
        this.app.use(express.json());
        
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'emergency_mode', timestamp: new Date().toISOString() });
        });
        
        // Root
        this.app.get('/', (req, res) => {
            res.json({ 
                message: 'CoinBitClub Emergency Mode', 
                status: 'operational',
                mode: 'emergency'
            });
        });
        
        // Ativar chaves reais
        this.app.get('/ativar-chaves-reais', async (req, res) => {
            try {
                const pool = new Pool({
                    connectionString: process.env.DATABASE_URL,
                    ssl: { rejectUnauthorized: false }
                });
                
                console.log('🔑 Ativando chaves reais...');
                
                const result = await pool.query(`
                    UPDATE user_api_keys 
                    SET is_active = true, environment = 'mainnet'
                    WHERE LENGTH(api_key) > 20 AND LENGTH(api_secret) > 20
                    RETURNING user_id, exchange
                `);
                
                await pool.end();
                
                res.json({
                    success: true,
                    activated: result.rows.length,
                    keys: result.rows
                });
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🆘 Emergency server running on port ${this.port}`);
        });
    }
}

if (require.main === module) {
    const server = new EmergencyCoinBitClub();
    server.start();
}

module.exports = EmergencyCoinBitClub;
