#!/usr/bin/env node

/**
 * 🚀 STARTUP ROBUSTO - COINBITCLUB ENTERPRISE
 */

console.log('🚀 Iniciando CoinBitClub Enterprise...');

// Verificar Node.js version
const nodeVersion = process.version;
console.log(`📍 Node.js version: ${nodeVersion}`);

// Verificar PORT
const PORT = process.env.PORT || 3000;
console.log(`📍 Port: ${PORT}`);

// Verificar DATABASE_URL
const hasDatabase = !!process.env.DATABASE_URL;
console.log(`📍 Database: ${hasDatabase ? 'Configurado' : 'Não configurado'}`);

// Carregar servidor principal
try {
    console.log('⚡ Carregando servidor principal...');
    require('./main.js');
} catch (error) {
    console.error('❌ Erro ao carregar servidor principal:', error.message);
    
    // Servidor de emergência
    console.log('🛠️ Iniciando servidor de emergência...');
    
    const express = require('express');
    const app = express();
    
    app.use(express.json());
    
    app.get('/', (req, res) => {
        res.json({
            status: 'emergency_mode',
            message: 'Servidor em modo de emergência',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    });
    
    app.get('/health', (req, res) => {
        res.json({
            status: 'emergency_healthy',
            timestamp: new Date().toISOString(),
            mode: 'emergency'
        });
    });
    
    app.listen(PORT, () => {
        console.log(`🛠️ Servidor de emergência rodando na porta ${PORT}`);
        console.log(`🌐 Acesse: http://localhost:${PORT}`);
    });
}
