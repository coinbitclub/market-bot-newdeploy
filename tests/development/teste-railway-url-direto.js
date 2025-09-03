#!/usr/bin/env node
/**
 * 🚀 TESTE DIRETO DA RAILWAY - SISTEMA ENTERPRISE
 * ==============================================
 */

const https = require('https');

console.log('🚀 TESTE DIRETO DA RAILWAY');
console.log('==========================');
console.log('🎯 URL: coinbitclub-market-bot.up.railway.app');
console.log('');

// Função para testar URL da Railway
function testRailwayURL(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'coinbitclub-market-bot.up.railway.app',
            port: 443,
            path: path,
            method: 'GET',
            timeout: 10000,
            headers: {
                'User-Agent': 'EnterpriseTest/Railway',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    path: path,
                    status: res.statusCode,
                    success: res.statusCode >= 200 && res.statusCode < 400,
                    data: data.substring(0, 200) + (data.length > 200 ? '...' : ''),
                    size: data.length
                });
            });
        });

        req.on('error', (err) => {
            resolve({
                path: path,
                status: 0,
                success: false,
                error: err.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                path: path,
                status: 0,
                success: false,
                error: 'timeout'
            });
        });

        req.end();
    });
}

// Endpoints principais para testar
const testEndpoints = [
    '/health',
    '/',
    '/api/system/status',
    '/api/dashboard/summary',
    '/painel',
    '/api/exchanges/status',
    '/api/users',
    '/api/webhooks/signal'
];

async function runRailwayTest() {
    console.log('🧪 TESTANDO ENDPOINTS NA RAILWAY...\n');
    
    let successCount = 0;
    let totalTests = testEndpoints.length;
    
    for (const endpoint of testEndpoints) {
        console.log(`🔍 Testando: ${endpoint}`);
        
        const result = await testRailwayURL(endpoint);
        
        if (result.success) {
            console.log(`   ✅ Status: ${result.status} | Size: ${result.size} bytes`);
            console.log(`   📄 Preview: ${result.data}`);
            successCount++;
        } else {
            console.log(`   ❌ Status: ${result.status || 'ERROR'} | Error: ${result.error || 'Unknown'}`);
        }
        
        console.log('');
        
        // Delay entre requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Relatório final
    console.log('🎯 RESULTADO FINAL DO TESTE RAILWAY');
    console.log('===================================');
    console.log(`📊 Taxa de sucesso: ${Math.round((successCount / totalTests) * 100)}%`);
    console.log(`✅ Sucessos: ${successCount}/${totalTests}`);
    console.log('');
    
    if (successCount >= totalTests * 0.8) {
        console.log('🎉 EXCELENTE! Sistema enterprise funcionando na Railway!');
        console.log('✅ Deploy realizado com sucesso');
        console.log('🌐 URL pública: https://coinbitclub-market-bot.up.railway.app');
    } else if (successCount > 0) {
        console.log('⚠️ Sistema parcialmente funcionando');
        console.log('🔧 Pode precisar de alguns ajustes');
    } else {
        console.log('❌ Sistema não está respondendo');
        console.log('🔧 Verificar configurações na Railway');
    }
    
    console.log('');
    console.log('🔗 LINKS PARA TESTAR NO NAVEGADOR:');
    console.log('===================================');
    testEndpoints.forEach(endpoint => {
        console.log(`🌐 https://coinbitclub-market-bot.up.railway.app${endpoint}`);
    });
}

// Executar teste
runRailwayTest().catch(console.error);
