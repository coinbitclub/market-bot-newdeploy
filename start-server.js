#!/usr/bin/env node

// Script de inicialização robusta
console.log('🚀 Iniciando CoinBitClub Market Bot...');

process.env.NODE_ENV = 'development';
process.env.DATABASE_URL = 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway';

try {
    const CoinBitClubServer = require('./app.js');
    const server = new CoinBitClubServer();
    
    console.log('✅ Classe carregada com sucesso');
    
    server.start().then(() => {
        console.log('✅ Servidor iniciado com sucesso!');
    }).catch(error => {
        console.error('❌ Erro ao iniciar servidor:', error.message);
        console.error('📋 Stack trace:', error.stack);
        process.exit(1);
    });
    
} catch (error) {
    console.error('❌ Erro crítico ao carregar aplicação:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
}
