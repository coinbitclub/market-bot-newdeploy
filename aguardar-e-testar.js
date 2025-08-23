#!/usr/bin/env node
/**
 * 🚀 AGUARDAR DEPLOY E TESTAR AUTOMATICAMENTE
 * ==========================================
 */

const https = require('https');

console.log('🚀 AGUARDANDO DEPLOY RAILWAY...');
console.log('===============================');
console.log('⏰ Aguardando 30 segundos para deploy se completar...');

async function testRailwayHealth() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'coinbitclub-market-bot.up.railway.app',
            port: 443,
            path: '/health',
            method: 'GET',
            timeout: 10000,
            headers: {
                'User-Agent': 'RailwayTester/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    success: res.statusCode >= 200 && res.statusCode < 400,
                    status: res.statusCode,
                    data: data
                });
            });
        });

        req.on('error', (err) => {
            resolve({ success: false, error: err.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ success: false, error: 'timeout' });
        });

        req.end();
    });
}

async function waitAndTest() {
    // Aguardar deploy
    console.log('⏳ Aguardando deploy...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log('🧪 Testando sistema após deploy...');
    
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
        attempts++;
        console.log(`\n🔄 Tentativa ${attempts}/${maxAttempts}:`);
        
        const result = await testRailwayHealth();
        
        if (result.success) {
            console.log('✅ SUCESSO! Sistema funcionando na Railway!');
            console.log(`📊 Status: ${result.status}`);
            console.log(`📄 Response: ${result.data.substring(0, 200)}...`);
            console.log('');
            console.log('🎉 DEPLOY REALIZADO COM SUCESSO!');
            console.log('🌐 URL: https://coinbitclub-market-bot.up.railway.app');
            console.log('');
            console.log('🔗 ENDPOINTS PARA TESTAR:');
            console.log('https://coinbitclub-market-bot.up.railway.app/health');
            console.log('https://coinbitclub-market-bot.up.railway.app/');
            console.log('https://coinbitclub-market-bot.up.railway.app/api/system/status');
            console.log('https://coinbitclub-market-bot.up.railway.app/painel');
            return;
        } else {
            console.log(`❌ Falha: ${result.error || result.status}`);
            if (attempts < maxAttempts) {
                console.log('⏳ Aguardando 10 segundos antes da próxima tentativa...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }
    
    console.log('⚠️ Sistema ainda não está respondendo');
    console.log('🔧 Possíveis soluções:');
    console.log('1. Aguardar mais alguns minutos');
    console.log('2. Verificar logs na Railway (aba Deployments)');
    console.log('3. Fazer redeploy manual na Railway');
}

// Executar teste
waitAndTest().catch(console.error);
