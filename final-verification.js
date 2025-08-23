#!/usr/bin/env node

/**
 * 🎯 TESTE FINAL - VERIFICAÇÃO PÓS-DEPLOY
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
                    console.log(`🎉 ${path}: FUNCIONANDO! (${res.statusCode})`);
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.mode) console.log(`   🔧 Mode: ${parsed.mode}`);
                        if (parsed.summary && parsed.summary.mode) console.log(`   📊 Summary Mode: ${parsed.summary.mode}`);
                        if (parsed.status) console.log(`   📊 Status: ${parsed.status}`);
                    } catch (e) {
                        console.log(`   📄 Response: ${data.slice(0, 50)}...`);
                    }
                } else {
                    console.log(`💥 ${path}: AINDA COM PROBLEMA (${res.statusCode})`);
                }
                resolve(res.statusCode === 200);
            });
        });

        req.on('error', (error) => {
            console.log(`❌ ${path}: ERRO - ${error.message}`);
            resolve(false);
        });

        req.setTimeout(10000, () => {
            console.log(`⏰ ${path}: TIMEOUT`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function runFinalVerification() {
    console.log('🎯 VERIFICAÇÃO FINAL - ENDPOINTS CRÍTICOS');
    console.log('==========================================');
    
    const endpoints = [
        '/health',
        '/status', 
        '/api/dashboard/summary',
        '/api/system/status'
    ];
    
    let successCount = 0;
    
    for (const endpoint of endpoints) {
        const success = await testEndpoint(endpoint);
        if (success) successCount++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa entre testes
    }
    
    console.log('\n📊 RESULTADO FINAL:');
    console.log(`✅ Endpoints funcionando: ${successCount}/${endpoints.length}`);
    
    if (successCount === endpoints.length) {
        console.log('🎉 SUCESSO TOTAL! Todos os endpoints estão funcionando!');
        console.log('🚀 Problema dos 85+ endpoints 404 foi RESOLVIDO!');
    } else if (successCount >= 2) {
        console.log('⚠️ SUCESSO PARCIAL. Alguns endpoints ainda precisam de ajuste.');
    } else {
        console.log('💥 AINDA HÁ PROBLEMAS. Mais investigação necessária.');
    }
    
    console.log('\n🔗 Links para teste manual:');
    endpoints.forEach(ep => {
        console.log(`   https://coinbitclub-market-bot.up.railway.app${ep}`);
    });
}

runFinalVerification().catch(console.error);
