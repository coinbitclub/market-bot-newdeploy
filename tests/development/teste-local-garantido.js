#!/usr/bin/env node
/**
 * 🧪 TESTE LOCAL DO SERVIDOR GARANTIDO
 * ===================================
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('🧪 TESTE LOCAL DO SERVIDOR GARANTIDO');
console.log('===================================');

// Iniciar servidor
console.log('🚀 Iniciando servidor...');
const server = spawn('node', ['enterprise-server-garantido.js'], {
    stdio: 'pipe',
    cwd: __dirname
});

server.stdout.on('data', (data) => {
    console.log('SERVER:', data.toString().trim());
});

server.stderr.on('data', (data) => {
    console.log('ERROR:', data.toString().trim());
});

// Aguardar 3 segundos e testar
setTimeout(async () => {
    console.log('\n🔍 TESTANDO ENDPOINTS LOCALMENTE...');
    console.log('===================================');
    
    const endpoints = [
        '/health',
        '/api/dashboard/summary',
        '/api/exchanges/status',
        '/api/trade/status',
        '/api/webhooks/signal'
    ];
    
    for (const path of endpoints) {
        await testEndpoint(path);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n🏁 Teste local concluído!');
    server.kill();
    process.exit(0);
    
}, 3000);

function testEndpoint(path) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const status = res.statusCode >= 200 && res.statusCode < 400 ? '✅' : '❌';
                console.log(`${status} ${path} [${res.statusCode}]`);
                
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`   📄 Category: ${json.category}, Endpoint: ${json.endpoint}`);
                    } catch (e) {
                        console.log(`   📄 ${data.substring(0, 100)}...`);
                    }
                }
                resolve();
            });
        });
        
        req.on('error', (err) => {
            console.log(`❌ ${path} [ERROR] ${err.message}`);
            resolve();
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            console.log(`❌ ${path} [TIMEOUT]`);
            resolve();
        });
    });
}
