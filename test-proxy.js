#!/usr/bin/env node

/**
 * TESTE AUTOMÁTICO DE CONECTIVIDADE DO PROXY
 */

const axios = require('axios');

async function testProxy() {
    const proxyIp = process.argv[2];
    
    if (!proxyIp) {
        console.log('❌ Uso: node test-proxy.js IP_DO_VPS');
        process.exit(1);
    }
    
    console.log('🧪 TESTE DE CONECTIVIDADE COMPLETO');
    console.log('==================================');
    console.log(`🌐 Testando IP: ${proxyIp}`);
    console.log('');
    
    const tests = [
        {
            name: 'Health Check do Proxy',
            url: `http://${proxyIp}/proxy-health`,
            expected: 'OK'
        },
        {
            name: 'Status do Proxy',
            url: `http://${proxyIp}/proxy-status`,
            expected: 'operational'
        },
        {
            name: 'Railway via Proxy',
            url: `http://${proxyIp}/health`,
            expected: 'healthy'
        },
        {
            name: 'API Status via Proxy',
            url: `http://${proxyIp}/status`,
            expected: 'OK'
        }
    ];
    
    let passed = 0;
    
    for (const test of tests) {
        try {
            console.log(`📡 ${test.name}...`);
            const response = await axios.get(test.url, { timeout: 10000 });
            
            if (response.status === 200 && JSON.stringify(response.data).includes(test.expected)) {
                console.log(`   ✅ PASSOU (${response.status})`);
                passed++;
            } else {
                console.log(`   ⚠️ RESPOSTA INESPERADA (${response.status})`);
            }
        } catch (error) {
            console.log(`   ❌ FALHOU: ${error.message}`);
        }
    }
    
    console.log('');
    console.log('📊 RESULTADO FINAL:');
    console.log(`✅ Testes passou: ${passed}/${tests.length}`);
    
    if (passed === tests.length) {
        console.log('🎉 PROXY FUNCIONANDO PERFEITAMENTE!');
        console.log('');
        console.log('🔑 CONFIGURE NAS EXCHANGES:');
        console.log(`   IP: ${proxyIp}`);
        console.log('   Bybit: API Management > Edit > IP Restriction');
        console.log('   Binance: API Management > Edit > IP Access Restriction');
        console.log('');
        console.log('🚀 Sistema pronto para trading 24/7!');
    } else {
        console.log('⚠️ Alguns testes falharam. Verifique configuração.');
    }
}

testProxy();