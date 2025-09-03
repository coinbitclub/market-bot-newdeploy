console.log('🧪 INICIANDO TESTE RÁPIDO DE SERVIDOR');

const express = require('express');
const app = express();

// Middleware básico
app.use(express.json());

// Testar rotas básicas
app.get('/test-health', (req, res) => {
    res.json({ status: 'OK', test: true });
});

app.get('/test-status', (req, res) => {
    res.json({ status: 'active', test: true });
});

const server = app.listen(3001, () => {
    console.log('✅ Servidor de teste rodando na porta 3001');
    
    // Teste simples
    const http = require('http');
    
    const testReq = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/test-health',
        method: 'GET'
    }, (res) => {
        console.log(`📊 Resposta: ${res.statusCode}`);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`📋 Dados: ${data}`);
            server.close();
            process.exit(0);
        });
    });
    
    testReq.on('error', (err) => {
        console.error(`❌ Erro: ${err.message}`);
        server.close();
        process.exit(1);
    });
    
    testReq.end();
});
