#!/usr/bin/env node
const crypto = require('crypto');
const fetch = require('node-fetch');

// Chaves exatas do banco
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

async function testBybitEnvironments() {
    console.log('🔍 Testando chaves em diferentes ambientes Bybit...\n');
    
    const environments = [
        { name: 'MAINNET', url: 'https://api.bybit.com' },
        { name: 'TESTNET', url: 'https://api-testnet.bybit.com' }
    ];

    for (const key of TEST_KEYS) {
        console.log(`👤 Testando ${key.name}:`);
        console.log(`   🔑 Key: ${key.api_key}`);
        console.log(`   🔒 Secret: ${key.api_secret}`);
        
        for (const env of environments) {
            console.log(`\n   🌐 Ambiente: ${env.name}`);
            
            try {
                const timestamp = Date.now().toString();
                const recvWindow = '5000';
                
                // Método 1: Server time test (sem autenticação)
                const timeResponse = await fetch(`${env.url}/v5/market/time`, { timeout: 5000 });
                const timeData = await timeResponse.json();
                console.log(`      ⏰ Server time: ${timeData.retCode === 0 ? 'OK' : 'FAIL'}`);
                
                if (timeData.retCode === 0) {
                    // Método 2: User query (com autenticação)
                    const signPayload = timestamp + key.api_key + recvWindow;
                    const signature = crypto.createHmac('sha256', key.api_secret).update(signPayload).digest('hex');
                    
                    const userResponse = await fetch(`${env.url}/v5/user/query-api?recv_window=${recvWindow}&timestamp=${timestamp}`, {
                        method: 'GET',
                        headers: {
                            'X-BAPI-API-KEY': key.api_key,
                            'X-BAPI-SIGN': signature,
                            'X-BAPI-TIMESTAMP': timestamp,
                            'X-BAPI-RECV-WINDOW': recvWindow,
                            'X-BAPI-SIGN-TYPE': '2',
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                    
                    const userData = await userResponse.json();
                    console.log(`      🔐 Auth test: ${userData.retCode === 0 ? '✅ SUCCESS' : '❌ FAIL'}`);
                    if (userData.retCode !== 0) {
                        console.log(`         Error: ${userData.retMsg}`);
                    } else {
                        console.log(`         ✨ VALID KEY FOUND! User data:`, JSON.stringify(userData.result, null, 2));
                    }
                } else {
                    console.log(`      ❌ Server não acessível`);
                }
                
            } catch (error) {
                console.log(`      ❌ Network error: ${error.message}`);
            }
        }
        console.log('\n' + '='.repeat(60));
    }
}

testBybitEnvironments();
