/**
 * 🔍 TESTE RÁPIDO DO SERVIDOR LOCAL
 * Verificar se o servidor consegue inicializar e responder endpoints
 */

console.log('🔍 Testando servidor local...');

// Configurar ambiente para desenvolvimento
process.env.NODE_ENV = 'development';
process.env.PORT = '3001';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/coinbitclub';

// Tentar importar e iniciar o servidor
try {
    const CoinBitClubServer = require('./app.js');
    const server = new CoinBitClubServer();
    
    console.log('✅ Servidor importado com sucesso');
    console.log('🚀 Iniciando servidor...');
    
    server.start().then(() => {
        console.log('✅ Servidor iniciado com sucesso!');
        console.log('🌐 Testando endpoints básicos...');
        
        // Testar endpoints após 2 segundos
        setTimeout(async () => {
            const axios = require('axios');
            const baseUrl = 'http://localhost:3001';
            
            try {
                // Teste 1: Health check
                console.log('🔍 Testando /health...');
                const healthResponse = await axios.get(`${baseUrl}/health`);
                console.log('✅ /health:', healthResponse.status, healthResponse.data.status);
                
                // Teste 2: Root endpoint
                console.log('🔍 Testando /...');
                const rootResponse = await axios.get(`${baseUrl}/`);
                console.log('✅ /:', rootResponse.status, rootResponse.data.message);
                
                // Teste 3: Status do sistema
                console.log('🔍 Testando /api/system/status...');
                const statusResponse = await axios.get(`${baseUrl}/api/system/status`);
                console.log('✅ /api/system/status:', statusResponse.status, statusResponse.data.system);
                
                // Teste 4: Modo atual
                console.log('🔍 Testando /api/current-mode...');
                const modeResponse = await axios.get(`${baseUrl}/api/current-mode`);
                console.log('✅ /api/current-mode:', modeResponse.status, modeResponse.data.environment);
                
                console.log('🎉 TODOS OS ENDPOINTS BÁSICOS FUNCIONANDO!');
                console.log('📋 O problema dos 404s não está no código local');
                console.log('🔧 Verificar configurações do Railway...');
                
            } catch (testError) {
                console.log('❌ Erro nos testes de endpoint:', testError.message);
                if (testError.response) {
                    console.log('📋 Status:', testError.response.status);
                    console.log('📋 Data:', testError.response.data);
                }
            }
        }, 2000);
        
    }).catch(startError => {
        console.log('❌ Erro ao iniciar servidor:', startError.message);
        console.log('📋 Stack:', startError.stack);
    });
    
} catch (importError) {
    console.log('❌ Erro ao importar servidor:', importError.message);
    console.log('📋 Stack:', importError.stack);
}

// Tratamento de erros global
process.on('uncaughtException', (error) => {
    console.log('❌ Exceção não capturada:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('❌ Rejeição não tratada:', reason);
});
