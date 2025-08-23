#!/usr/bin/env node

/**
 * 🧪 TESTE COM URL ALTERNATIVA
 */

const https = require('https');

function testEndpoint(hostname, path) {
    return new Promise((resolve) => {
        const options = {
            hostname: hostname,
            port: 443,
            path: path,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`✅ ${hostname}${path}: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.status) console.log(`   📊 Status: ${parsed.status}`);
                        if (parsed.mode) console.log(`   🔧 Mode: ${parsed.mode}`);
                        if (parsed.summary) console.log(`   📈 Summary: ${parsed.summary.totalUsers} users`);
                    } catch (e) {
                        console.log(`   📄 Response: ${data.slice(0, 100)}`);
                    }
                } else {
                    console.log(`   ❌ Error: ${res.statusCode} - ${data.slice(0, 50)}`);
                }
                resolve();
            });
        });

        req.on('error', (error) => {
            console.log(`❌ ${hostname}${path}: ${error.message}`);
            resolve();
        });

        req.setTimeout(10000, () => {
            console.log(`⏰ ${hostname}${path}: Timeout`);
            req.destroy();
            resolve();
        });

        req.end();
    });
}

async function runTests() {
    console.log('🧪 TESTANDO MÚLTIPLAS URLs\n');
    
    const urls = [
        'coinbitclub-market-bot.up.railway.app',
        'coinbitclub-backend.railway.app'
    ];
    
    for (const url of urls) {
        console.log(`\n🌐 Testando: ${url}`);
        await testEndpoint(url, '/health');
        await testEndpoint(url, '/status');
        await testEndpoint(url, '/api/dashboard/summary');
        await testEndpoint(url, '/api/system/status');
    }
    
    console.log('\n🏁 Teste concluído!');
}

runTests().catch(console.error);
