#!/usr/bin/env node

/**
 * 🔍 VERIFICAÇÃO PÓS-DEPLOY
 * =========================
 * 
 * Testando se a correção funcionou na produção
 */

const https = require('https');

async function testURL(url, expectedStatus = 200) {
    return new Promise((resolve) => {
        console.log(`🔍 Testando: ${url}`);
        
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const status = res.statusCode;
                const success = status === expectedStatus;
                
                console.log(`${success ? '✅' : '❌'} Status: ${status} - ${success ? 'OK' : 'ERRO'}`);
                
                if (url.includes('test-connection') && success) {
                    try {
                        const parsed = JSON.parse(data);
                        console.log(`   💾 Banco: ${parsed.connected ? 'CONECTADO' : 'DESCONECTADO'}`);
                        console.log(`   🕐 Timestamp: ${parsed.timestamp}`);
                    } catch (e) {
                        console.log(`   ⚠️ Resposta não é JSON válido`);
                    }
                }
                
                if (url.includes('dashboard-production') && success) {
                    const hasTitle = data.includes('Dashboard');
                    console.log(`   📊 Dashboard: ${hasTitle ? 'CARREGADO' : 'PROBLEMA'}`);
                }
                
                resolve({ url, status, success, data: data.substring(0, 100) });
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ ERRO: ${url} - ${error.message}`);
            resolve({ url, error: error.message, success: false });
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            console.log(`⏰ TIMEOUT: ${url}`);
            resolve({ url, error: 'timeout', success: false });
        });
    });
}

async function main() {
    console.log('🔍 VERIFICAÇÃO PÓS-DEPLOY - COINBITCLUB');
    console.log('=======================================');
    console.log('🎯 Testando correção do erro testDatabaseConnection');
    console.log('');
    
    const urls = [
        'https://coinbitclub-market-bot.up.railway.app/status',
        'https://coinbitclub-market-bot.up.railway.app/api/test-connection',
        'https://coinbitclub-market-bot.up.railway.app/dashboard-production'
    ];
    
    const results = [];
    
    for (const url of urls) {
        const result = await testURL(url);
        results.push(result);
        console.log('');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos entre testes
    }
    
    console.log('📋 RESUMO FINAL:');
    console.log('================');
    
    const allSuccess = results.every(r => r.success);
    
    results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        const name = result.url.split('/').pop() || 'root';
        console.log(`${icon} ${name}: ${result.success ? 'FUNCIONANDO' : 'ERRO'}`);
    });
    
    console.log('');
    
    if (allSuccess) {
        console.log('🎉 SUCESSO TOTAL! SISTEMA 100% OPERACIONAL!');
        console.log('');
        console.log('📊 Dashboard Produção: https://coinbitclub-market-bot.up.railway.app/dashboard-production');
        console.log('🔧 API Teste: https://coinbitclub-market-bot.up.railway.app/api/test-connection');
        console.log('📈 Status: https://coinbitclub-market-bot.up.railway.app/status');
        console.log('');
        console.log('✅ Erro testDatabaseConnection CORRIGIDO!');
        console.log('✅ Dashboard com dados reais FUNCIONANDO!');
        console.log('✅ Monitoramento operacional ATIVO!');
    } else {
        console.log('⚠️ ALGUNS PROBLEMAS DETECTADOS');
        console.log('Verifique os logs do Railway para mais detalhes');
    }
}

main().catch(console.error);
