#!/usr/bin/env node

/**
 * 🚀 COINBITCLUB ENTERPRISE SERVER - MAIN ENTRY POINT
 * ===================================================
 * 
 * Ponto de entrada principal - executa servidor enterprise
 */

require('dotenv').config({ path: '.env.production' });

console.log('🚀 COINBITCLUB ENTERPRISE - INICIANDO...');
console.log('========================================');

// Handlers de erro global
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, finalizando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT, finalizando servidor...');
    process.exit(0);
});

// Carregar servidor enterprise garantido (auto-start)
console.log('⚡ Carregando enterprise server...');

// Inicializar servidor principal
try {
    const { Pool } = require('pg');
    
    // Testar se os módulos necessários existem
    console.log('🔍 Verificando dependências...');
    
    // Verificar se fixed-database-config existe
    try {
        require('./fixed-database-config');
        console.log('✅ fixed-database-config encontrado');
    } catch (err) {
        console.log('❌ fixed-database-config não encontrado:', err.message);
        process.exit(1);
    }
    
    // Carregar o servidor
    require('./app.js');
    
} catch (error) {
    console.error('❌ Erro ao carregar servidor:', error.message);
    console.log('🔄 Tentando modo de recuperação...');
    
    // Modo de recuperação básico
    const express = require('express');
    const app = express();
    const port = process.env.PORT || 3000;
    
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'recovery_mode', 
            timestamp: new Date().toISOString(),
            error: error.message 
        });
    });
    
    app.listen(port, () => {
        console.log(`🛠️ Servidor de recuperação rodando na porta ${port}`);
    });
}
