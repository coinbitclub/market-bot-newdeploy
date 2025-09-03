#!/usr/bin/env node
/**
 * 🚂 TESTE IMEDIATO RAILWAY
 * =========================
 */

const https = require('https');

console.log('🚂 TESTE IMEDIATO RAILWAY');
console.log('=========================');

const BASE_URL = 'coinbitclub-market-bot.up.railway.app';

function testEndpoint(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: BASE_URL,
            port: 443,
            path: path,
            method: 'GET',
            timeout: 8000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'RailwayTester/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    success: res.statusCode >= 200 && res.statusCode < 400,
                    data: data.substring(0, 200)
                });
            });
        });

        req.on('error', (err) => {
            resolve({ statusCode: 0, error: err.message, success: false });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ statusCode: 0, error: 'timeout', success: false });
        });

        req.end();
    });
}

async function testNow() {
    console.log('🧪 TESTANDO AGORA...');
    console.log('==================');
    
    const endpoints = [
        '/health',
        '/api/system/status', 
        '/api/dashboard/summary',
        '/status',
        '/api/admin/financial-summary',
        '/api/exchanges/status'
    ];
    
    let working = 0;
    
    for (const path of endpoints) {
        const result = await testEndpoint(path);
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${path} [${result.statusCode}] ${result.error || ''}`);
        
        if (result.success) {
            working++;
            console.log(`   📄 Response: ${result.data.substring(0, 100)}...`);
        }
    }
    
    console.log('');
    console.log(`📊 RESULTADO: ${working}/${endpoints.length} endpoints funcionando`);
    console.log(`🌐 URL: https://${BASE_URL}`);
    
    if (working >= 5) {
        console.log('🎉 EXCELENTE! Sistema operacional!');
    } else if (working >= 2) {
        console.log('⚠️ PARCIAL: Sistema carregando...');
    } else {
        console.log('❌ PROBLEMA: Verificar configuração');
    }
}

testNow().catch(console.error);
