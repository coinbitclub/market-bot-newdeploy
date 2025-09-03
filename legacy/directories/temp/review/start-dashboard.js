#!/usr/bin/env node

/**
 * 🚀 CoinBitClub Dashboard Production Starter
 * Sistema de inicialização específico para dashboard de produção
 */

require('dotenv').config();

console.log('🚀 COINBITCLUB - DASHBOARD PRODUÇÃO');
console.log('=====================================');
console.log('🔧 Iniciando sistema...');
console.log('');

// Verificar configurações essenciais
const requiredEnvs = ['DATABASE_URL"process.env.DATABASE_URL"⚠️ Variáveis de ambiente em falta:', missingEnvs.join(', '));
    console.log('🔧 Continuando com configurações padrão...');
}

// Configurar variáveis padrão se necessário
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'process.env.DATABASE_URL';
    console.log('📊 Usando DATABASE_URL padrão do Railway');
}

if (!process.env.PORT) {
    process.env.PORT = '3000';
}

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
}

console.log('');
console.log('🌐 Configurações:');
console.log(`   • Porta: ${process.env.PORT}`);
console.log(`   • Ambiente: ${process.env.NODE_ENV}`);
console.log(`   • Banco: ${process.env.DATABASE_URL ? 'Configurado' : 'Não configurado'}`);
console.log('');

try {
    // Importar e iniciar a aplicação principal
    const CoinBitClubServer = require('./app.js');
    
    // A classe já está sendo exportada e tem método start()
    // O app.js já tem a lógica de auto-start no final
    console.log('✅ Aplicação principal carregada com sucesso');
    console.log('🎯 Dashboard de produção estará disponível em:');
    console.log(`   • URL: http://localhost:${process.env.PORT}/dashboard-production`);
    console.log(`   • Produção: https://coinbitclub-market-bot.up.railway.app/dashboard-production`);
    console.log('');
    console.log('🔄 Sistema iniciando...');
    
} catch (error) {
    console.error('💥 Erro ao iniciar aplicação:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
}

// Tratamento de sinais do sistema
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM recebido. Encerrando graciosamente...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT recebido. Encerrando graciosamente...');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection em:', promise, 'razão:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});
