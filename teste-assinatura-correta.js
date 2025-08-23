#!/usr/bin/env node
const crypto = require('crypto');
const fetch = require('node-fetch');

// Chaves do banco
const TEST_KEYS = [
    {
        name: 'luiza_maria',
        api_key: YOUR_API_KEY_HERE,
        api_secret: 'QJjDXNmsIQq1gakTUk7FHAHZnjlEN8AaRkQ0'
    },
    {
        name: 'erica_santos', 
        api_key: YOUR_API_KEY_HERE,
        api_secret: '1KkVFTExPQKzZwHsXaUKwzGVSCxCRW6izgDn'
    }
];

async function testCorrectBybitSignature() {
    console.log('🔍 Testando método correto de assinatura Bybit V5...\n');
    
    for (const key of TEST_KEYS) {
        console.log(`👤 ${key.name}:`);
        console.log(`   🔑 ${key.api_key}`);
        
        try {
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            
            // === MÉTODO CORRETO BYBIT V5 ===
            // Para GET requests: timestamp + api_key + recv_window + query_string
            // Para POST requests: timestamp + api_key + recv_window + request_body
            
            // Teste 1: User query sem query string
            console.log(`\n   📊 Teste 1: User query básico`);
            const signString1 = timestamp + key.api_key + recvWindow;
            const signature1 = crypto.createHmac('sha256', key.api_secret).update(signString1).digest('hex');
            
            console.log(`      Sign String: "${signString1}"`);
            console.log(`      Signature: ${signature1}`);
            
            const response1 = await fetch(`https://api.bybit.com/v5/user/query-api`, {
                method: 'GET',
                headers: {
                    'X-BAPI-API-KEY': key.api_key,
                    'X-BAPI-SIGN': signature1,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'X-BAPI-SIGN-TYPE': '2',
                    'Content-Type': 'application/json'
                }
            });
            
            const data1 = await response1.json();
            console.log(`      Resultado: ${data1.retCode === 0 ? '✅ SUCCESS' : '❌ FAIL'}`);
            if (data1.retCode !== 0) {
                console.log(`      Error: ${data1.retMsg}`);
            } else {
                console.log(`      🎉 CHAVE VÁLIDA! Dados:`, JSON.stringify(data1.result, null, 2));
            }
            
            // Teste 2: Account wallet balance
            console.log(`\n   📊 Teste 2: Wallet balance`);
            const queryString = 'accountType=UNIFIED';
            const signString2 = timestamp + key.api_key + recvWindow + queryString;
            const signature2 = crypto.createHmac('sha256', key.api_secret).update(signString2).digest('hex');
            
            console.log(`      Sign String: "${signString2}"`);
            console.log(`      Signature: ${signature2}`);
            
            const response2 = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
                method: 'GET',
                headers: {
                    'X-BAPI-API-KEY': key.api_key,
                    'X-BAPI-SIGN': signature2,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'X-BAPI-SIGN-TYPE': '2',
                    'Content-Type': 'application/json'
                }
            });
            
            const data2 = await response2.json();
            console.log(`      Resultado: ${data2.retCode === 0 ? '✅ SUCCESS' : '❌ FAIL'}`);
            if (data2.retCode !== 0) {
                console.log(`      Error: ${data2.retMsg}`);
            } else {
                console.log(`      💰 Saldo encontrado:`, JSON.stringify(data2.result, null, 2));
            }
            
        } catch (error) {
            console.log(`      ❌ Network error: ${error.message}`);
        }
        
        console.log('\n' + '='.repeat(60));
    }
}

testCorrectBybitSignature();
