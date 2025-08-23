#!/usr/bin/env node

/**
 * 🧪 TESTE DOS ENDPOINTS APÓS CORREÇÃO
 */

const https = require('https');

function testEndpoint(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'coinbitclub-market-bot.up.railway.app',
            port: 443,
            path: path,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`✅ ${path}: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.status) console.log(`   📊 Status: ${parsed.status}`);
                        if (parsed.summary) console.log(`   📈 Summary: ${parsed.summary.totalUsers} users`);
                        if (parsed.mode) console.log(`   🔧 Mode: ${parsed.mode}`);
                    } catch (e) {
                        console.log(`   📄 Response: ${data.slice(0, 100)}`);
                    }
                } else {
                    console.log(`   ❌ Error: ${data.slice(0, 100)}`);
                }
                resolve();
            });
        });

        req.on('error', (error) => {
            console.log(`❌ ${path}: ${error.message}`);
            resolve();
        });

        req.setTimeout(10000, () => {
            console.log(`⏰ ${path}: Timeout`);
            req.destroy();
            resolve();
        });

        req.end();
    });
}

async function runTests() {
    console.log('🧪 TESTANDO ENDPOINTS APÓS CORREÇÃO\n');
    
    await testEndpoint('/health');
    await testEndpoint('/status');
    await testEndpoint('/api/dashboard/summary');
    await testEndpoint('/api/system/status');
    
    console.log('\n🏁 Teste concluído!');
}

runTests().catch(console.error);
