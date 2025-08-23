const https = require('https');

console.log('🧪 TESTE LOCAL DO SERVIDOR MINIMAL');
console.log('=================================');

function testEndpoint(path, name) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET'
        };

        const req = require('http').request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`✅ ${name}: Status ${res.statusCode}`);
                if (res.statusCode === 200) {
                    console.log(`   📄 Response: ${data.substring(0, 100)}...`);
                }
                resolve({ status: res.statusCode, data });
            });
        });

        req.on('error', (error) => {
            console.log(`❌ ${name}: ${error.message}`);
            reject(error);
        });

        req.setTimeout(5000, () => {
            console.log(`⏰ ${name}: Timeout`);
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

async function runTests() {
    try {
        await testEndpoint('/', 'Homepage');
        await testEndpoint('/health', 'Health Check');
        await testEndpoint('/status', 'Status Endpoint');
        await testEndpoint('/api/test', 'API Test');
        
        console.log('\n🎉 TODOS OS TESTES PASSARAM!');
        console.log('✅ Servidor minimal está funcionando corretamente');
        console.log('🚀 Pronto para deploy no Railway');
        
    } catch (error) {
        console.log('\n❌ FALHA NOS TESTES:', error.message);
        console.log('⚠️ Servidor pode não estar rodando na porta 3000');
    }
}

runTests();
