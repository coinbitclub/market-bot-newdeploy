/**
 * 🧪 TESTE RÁPIDO DO HYBRID-SERVER CORRIGIDO
 * Verificar se todas as rotas funcionam corretamente
 */

console.log('🧪 Testando hybrid-server corrigido...');

// Configurar ambiente
process.env.NODE_ENV = 'development';
process.env.PORT = '3002';

// Iniciar teste em 3 segundos para dar tempo do servidor subir
setTimeout(async () => {
    try {
        const axios = require('axios');
        const baseUrl = 'http://localhost:3002';
        
        console.log('🔍 Iniciando testes...');
        
        // Teste 1: Health check
        try {
            console.log('🔍 Testando /health...');
            const healthResponse = await axios.get(`${baseUrl}/health`);
            console.log('✅ /health:', healthResponse.status, healthResponse.data.status);
        } catch (e) {
            console.log('❌ /health falhou:', e.message);
        }
        
        // Teste 2: Root endpoint
        try {
            console.log('🔍 Testando /...');
            const rootResponse = await axios.get(`${baseUrl}/`);
            console.log('✅ /:', rootResponse.status);
        } catch (e) {
            console.log('❌ / falhou:', e.message);
        }
        
        // Teste 3: API Status
        try {
            console.log('🔍 Testando /api/system/status...');
            const statusResponse = await axios.get(`${baseUrl}/api/system/status`);
            console.log('✅ /api/system/status:', statusResponse.status, statusResponse.data.success);
        } catch (e) {
            console.log('❌ /api/system/status falhou:', e.message);
        }
        
        // Teste 4: Modo atual
        try {
            console.log('🔍 Testando /api/current-mode...');
            const modeResponse = await axios.get(`${baseUrl}/api/current-mode`);
            console.log('✅ /api/current-mode:', modeResponse.status, modeResponse.data.environment);
        } catch (e) {
            console.log('❌ /api/current-mode falhou:', e.message);
        }
        
        // Aguardar 5 segundos para sistema principal carregar
        console.log('⏳ Aguardando sistema principal carregar...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Teste 5: Teste após carregamento completo
        try {
            console.log('🔍 Testando novamente /api/system/status...');
            const statusResponse2 = await axios.get(`${baseUrl}/api/system/status`);
            console.log('✅ Status após carregamento:', statusResponse2.data.mainSystemAvailable);
        } catch (e) {
            console.log('❌ Status pós-carregamento falhou:', e.message);
        }
        
        console.log('🎉 TESTES CONCLUÍDOS!');
        
    } catch (error) {
        console.log('❌ Erro geral nos testes:', error.message);
    }
}, 3000);

// Executar hybrid-server
console.log('🚀 Iniciando hybrid-server...');
require('./hybrid-server.js');
