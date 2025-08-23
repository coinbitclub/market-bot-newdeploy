const http = require('http');

// Função para testar endpoint
function testEndpoint(path, method = 'GET', body = null) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data: data
                });
            });
        });

        req.on('error', (err) => {
            resolve({
                status: 'ERROR',
                error: err.message
            });
        });

        if (body && method === 'POST') {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

async function runCompleteTest() {
    console.log('🧪 TESTE COMPLETO DE ENDPOINTS');
    console.log('================================');
    
    const endpoints = [
        { path: '/health', method: 'GET' },
        { path: '/status', method: 'GET' },
        { path: '/api/system/status', method: 'GET' },
        { path: '/api/dashboard/summary', method: 'GET' },
        { path: '/api/webhooks/signal', method: 'GET' },
        { path: '/api/webhooks/signal', method: 'POST', body: { test: 'data' } },
        { path: '/webhook', method: 'GET' },
        { path: '/webhook', method: 'POST', body: { test: 'data' } },
        { path: '/api/webhooks/trading', method: 'GET' },
        { path: '/api/webhooks/trading', method: 'POST', body: { test: 'data' } }
    ];
    
    for (const endpoint of endpoints) {
        console.log(`🔍 Testando ${endpoint.method} ${endpoint.path}...`);
        const result = await testEndpoint(endpoint.path, endpoint.method, endpoint.body);
        
        if (result.status === 'ERROR') {
            console.log(`   ❌ ERRO: ${result.error}`);
        } else if (result.status === 200) {
            console.log(`   ✅ OK (200)`);
        } else {
            console.log(`   ⚠️  Status: ${result.status}`);
        }
    }
    
    console.log('🎯 Teste completo concluído!');
}

runCompleteTest().catch(console.error);
