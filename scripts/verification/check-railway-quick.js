#!/usr/bin/env node
/**
 * ⚡ VERIFICAÇÃO RÁPIDA RAILWAY
 * ============================
 */

const https = require('https');

console.log('⚡ VERIFICAÇÃO RAILWAY ENTERPRISE');
console.log('================================\n');

async function quickCheck() {
    const makeRequest = (path) => new Promise((resolve) => {
        const req = https.request({
            hostname: 'coinbitclub-market-bot.up.railway.app',
            port: 443,
            path: path,
            method: 'GET',
            timeout: 5000,
            headers: { 'Accept': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', () => resolve({ status: 0 }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 0 }); });
        req.end();
    });

    // Verificar versão
    const health = await makeRequest('/health');
    if (health.status === 200) {
        try {
            const info = JSON.parse(health.data);
            console.log(`🔍 Versão Railway: ${info.version}`);
            console.log(`⏱️  Uptime: ${info.uptime}s`);
        } catch (e) {
            console.log('🔍 Railway está online (versão unknown)');
        }
    }

    // Testar endpoints enterprise
    const tests = [
        '/api/dashboard/summary',
        '/api/webhooks/signal',
        '/api/exchanges/status'
    ];

    console.log('\n🧪 Testando endpoints enterprise:');
    
    for (const path of tests) {
        const result = await makeRequest(path);
        const icon = result.status === 200 ? '✅' : result.status === 404 ? '❌' : '⚠️';
        console.log(`${icon} ${path} [${result.status}]`);
    }

    const enterpriseActive = await makeRequest('/api/dashboard/summary');
    
    if (enterpriseActive.status === 200) {
        console.log('\n🎉 ENTERPRISE ATIVO NA RAILWAY!');
    } else {
        console.log('\n⏳ Aguardando deploy enterprise...');
    }
}

quickCheck();
