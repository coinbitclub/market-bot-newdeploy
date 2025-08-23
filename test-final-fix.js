#!/usr/bin/env node

/**
 * 🧪 TESTE FINAL APÓS CORREÇÃO DO PACKAGE.JSON
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
                if (res.statusCode === 200) {
                    console.log(`✅ ${path}: ${res.statusCode} - SUCCESS!`);
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.status) console.log(`   📊 Status: ${parsed.status}`);
                        if (parsed.mode) console.log(`   🔧 Mode: ${parsed.mode}`);
                        if (parsed.summary) console.log(`   📈 Summary: ${parsed.summary.totalUsers} users, ${parsed.summary.mode} mode`);
                    } catch (e) {
                        console.log(`   📄 Response: ${data.slice(0, 100)}`);
                    }
                } else {
                    console.log(`❌ ${path}: ${res.statusCode} - STILL FAILING`);
                }
                resolve();
            });
        });

        req.on('error', (error) => {
            console.log(`❌ ${path}: ${error.message}`);
            resolve();
        });

        req.setTimeout(15000, () => {
            console.log(`⏰ ${path}: Timeout`);
            req.destroy();
            resolve();
        });

        req.end();
    });
}

async function runFinalTest() {
    console.log('🎯 TESTE FINAL - APÓS CORREÇÃO DO PACKAGE.JSON');
    console.log('==============================================');
    console.log('🕐 Aguardando redeploy do Railway...\n');
    
    // Aguardar 30 segundos para redeploy
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log('🧪 Testando endpoints críticos:\n');
    
    await testEndpoint('/health');
    await testEndpoint('/status');
    await testEndpoint('/api/dashboard/summary');
    await testEndpoint('/api/system/status');
    
    console.log('\n🏁 RESULTADO FINAL:');
    console.log('Se todos os endpoints retornaram 200, o problema foi resolvido!');
    console.log('Se ainda há 404s, pode haver outro problema de configuração.');
}

runFinalTest().catch(console.error);
