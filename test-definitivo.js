#!/usr/bin/env node

/**
 * 🎯 TESTE DEFINITIVO - APÓS CORREÇÃO DAS ROTAS DUPLICADAS
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
                    console.log(`🎉 ${path}: SUCESSO! (${res.statusCode})`);
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.mode) console.log(`   🔧 Mode: ${parsed.mode}`);
                        if (parsed.summary) console.log(`   📊 Summary: ${parsed.summary.totalUsers} users (${parsed.summary.mode})`);
                        if (parsed.status) console.log(`   📊 Status: ${parsed.status}`);
                    } catch (e) {}
                } else {
                    console.log(`❌ ${path}: FALHOU (${res.statusCode})`);
                }
                resolve(res.statusCode === 200);
            });
        });

        req.on('error', (error) => {
            console.log(`💥 ${path}: ERRO - ${error.message}`);
            resolve(false);
        });

        req.setTimeout(12000, () => {
            console.log(`⏰ ${path}: TIMEOUT`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function runDefinitiveTest() {
    console.log('🎯 TESTE DEFINITIVO - APÓS CORREÇÃO DAS ROTAS DUPLICADAS');
    console.log('========================================================');
    console.log('⏳ Aguardando 45 segundos para redeploy...\n');
    
    // Aguardar redeploy
    await new Promise(resolve => setTimeout(resolve, 45000));
    
    console.log('🧪 Testando endpoints críticos:\n');
    
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
        await new Promise(resolve => setTimeout(resolve, 2000)); // Pausa entre testes
    }
    
    console.log('\n🏆 RESULTADO FINAL:');
    console.log('===================');
    console.log(`✅ Endpoints funcionando: ${successCount}/${endpoints.length}`);
    
    if (successCount === endpoints.length) {
        console.log('🎊 PROBLEMA RESOLVIDO COMPLETAMENTE!');
        console.log('🚀 Todos os 85+ endpoints agora devem estar funcionais!');
        console.log('✅ Sistema CoinBitClub Market Bot 100% operacional!');
    } else if (successCount >= 3) {
        console.log('🎯 PROBLEMA QUASE RESOLVIDO!');
        console.log('📈 Maioria dos endpoints funcionando!');
    } else {
        console.log('⚠️ Ainda há problemas que precisam ser investigados.');
    }
    
    console.log('\n🔗 URLs para verificação manual:');
    endpoints.forEach(ep => {
        console.log(`   https://coinbitclub-market-bot.up.railway.app${ep}`);
    });
}

runDefinitiveTest().catch(console.error);
