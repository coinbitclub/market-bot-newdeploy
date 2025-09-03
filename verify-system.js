// 🔍 ENTERPRISE SYSTEM VERIFICATION
// Verificação completa do sistema em execução

const http = require('http');

console.log('🔍 === VERIFICAÇÃO DO SISTEMA ENTERPRISE ===');
console.log('');

async function testEndpoint(path, description) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3333,
            path: path,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const status = res.statusCode === 200 ? '✅' : '❌';
                console.log(`${status} ${description}: ${res.statusCode} - ${path}`);
                if (res.statusCode === 200 && data) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`   Response: ${JSON.stringify(json, null, 2).substring(0, 200)}...`);
                    } catch {
                        console.log(`   Response: ${data.substring(0, 100)}...`);
                    }
                }
                resolve(res.statusCode === 200);
            });
        });

        req.on('error', (err) => {
            console.log(`❌ ${description}: ERROR - ${err.message}`);
            resolve(false);
        });

        req.setTimeout(5000, () => {
            console.log(`❌ ${description}: TIMEOUT`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function verifySystem() {
    console.log('🚀 Testando endpoints do sistema...');
    console.log('');

    const tests = [
        ['/health', 'Health Check'],
        ['/dashboard', 'Dashboard'],
        ['/api/status', 'API Status'],
        ['/api/enterprise', 'Enterprise API'],
        ['/login', 'Login Page'],
        ['/checkout', 'Checkout Page'],
        ['/', 'Main Page']
    ];

    let passedTests = 0;
    const totalTests = tests.length;

    for (const [path, description] of tests) {
        const success = await testEndpoint(path, description);
        if (success) passedTests++;
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait between tests
    }

    console.log('');
    console.log('📊 === RESULTADOS ===');
    console.log(`✅ Testes aprovados: ${passedTests}/${totalTests}`);
    console.log(`📈 Taxa de sucesso: ${Math.round((passedTests/totalTests)*100)}%`);
    
    if (passedTests === totalTests) {
        console.log('');
        console.log('🎉 SISTEMA 100% OPERACIONAL!');
        console.log('✅ Todos os endpoints estão respondendo');
        console.log('🚀 CoinBitClub Enterprise v6.0.0 FUNCIONANDO PERFEITAMENTE!');
    } else {
        console.log('');
        console.log('⚠️ Alguns endpoints não estão disponíveis');
        console.log('🔧 Verificar configuração de rotas');
    }

    console.log('');
    console.log('🌐 URLs principais:');
    console.log('  📊 http://localhost:3333');
    console.log('  📈 http://localhost:3333/dashboard');
    console.log('  🔍 http://localhost:3333/health');
    console.log('================================');
}

verifySystem().catch(console.error);
