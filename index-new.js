const express = require('express');

console.log('🚀 RAILWAY START - CoinBitClub Market Bot');
console.log('==========================================');
console.log('📍 Port:', process.env.PORT || 3000);
console.log('🌍 Environment:', process.env.NODE_ENV || 'production');

try {
    console.log('📥 Carregando servidor principal...');
    const CoinBitClubServer = require('./app.js');
    
    console.log('🔧 Criando instância do servidor...');
    const server = new CoinBitClubServer();
    
    console.log('🚀 Iniciando servidor...');
    server.start().catch(error => {
        console.error('❌ ERRO no start():', error.message);
        console.error('📋 Stack:', error.stack);
        
        // Criar servidor de fallback básico
        console.log('🔄 Criando servidor de emergência...');
        createFallbackServer();
    });
    
} catch (error) {
    console.error('❌ ERRO CRÍTICO ao carregar app.js:', error.message);
    console.error('📋 Stack:', error.stack);
    
    // Servidor de emergência
    createFallbackServer();
}

function createFallbackServer() {
    const app = express();
    const port = process.env.PORT || 3000;
    
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'emergency_mode', 
            timestamp: new Date().toISOString(),
            message: 'Server running in fallback mode' 
        });
    });
    
    app.get('/', (req, res) => {
        res.send(`
            <h1>🔧 CoinBitClub Market Bot - Emergency Mode</h1>
            <p>Server is running but main application failed to start.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
            <p>Check logs for details.</p>
        `);
    });
    
    app.listen(port, '0.0.0.0', () => {
        console.log(`🚨 Emergency server running on port ${port}`);
        console.log('🔗 Health check: /health');
    });
}
