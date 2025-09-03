#!/usr/bin/env node
const crypto = require('crypto');
const fetch = require('node-fetch');

// Chaves ATUALIZADAS do banco (da imagem)
const ACCOUNTS = {
    luiza_maria: {
        bybit: {
            api_key: YOUR_API_KEY_HERE,
            api_secret: 'process.env.API_KEY_HERE'
        }
    },
    erica_santos: {
        bybit: {
            api_key: YOUR_API_KEY_HERE,
            api_secret: 'process.env.API_KEY_HERE'
        }
    }
};

class DirectAPITester {
    async testBybitConnection(accountName, apiKey, apiSecret) {
        console.log(`🧪 Testando ${accountName}...`);
        console.log(`   API Key: ${apiKey}`);

        try {
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            
            // Método 1: Teste simples com query-api
            const params = {
                api_key: apiKey,
                timestamp: timestamp,
                recv_window: recvWindow
            };

            const signature = crypto.createHmac('sha256', apiSecret)
                .update(Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&'))
                .digest('hex');
            
            params.sign = signature;
            const queryString = Object.keys(params).map(key => `${key}=${params[key]}`).join('&');

            const response1 = await fetch(`https://api.bybit.com/v5/user/query-api?${queryString}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const data1 = await response1.json();
            console.log(`   Método 1 (query-api):`, data1);

            // Método 2: Com headers X-BAPI (V5 correto)
            const signPayload = timestamp + apiKey + recvWindow;
            const signature2 = crypto.createHmac('sha256', apiSecret).update(signPayload).digest('hex');

            const response2 = await fetch(`https://api.bybit.com/v5/user/query-api?recv_window=${recvWindow}&timestamp=${timestamp}`, {
                method: 'GET',
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature2,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'X-BAPI-SIGN-TYPE': '2',
                    'Content-Type': 'application/json'
                }
            });

            const data2 = await response2.json();
            console.log(`   Método 2 (X-BAPI):`, data2);

            // Método 3: Wallet balance
            const query = 'accountType=UNIFIED';
            const signPayload3 = timestamp + apiKey + recvWindow + query;
            const signature3 = crypto.createHmac('sha256', apiSecret).update(signPayload3).digest('hex');

            const response3 = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${query}`, {
                method: 'GET',
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature3,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'X-BAPI-SIGN-TYPE': '2',
                    'Content-Type': 'application/json'
                }
            });

            const data3 = await response3.json();
            console.log(`   Método 3 (wallet):`, data3);

            return data1.retCode === 0 || data2.retCode === 0 || data3.retCode === 0;

        } catch (error) {
            console.log(`   ❌ Erro:`, error.message);
            return false;
        }
    }

    async runTests() {
        console.log('🚀 Testando chaves atualizadas do banco...\n');
        
        for (const [accountName, exchanges] of Object.entries(ACCOUNTS)) {
            if (exchanges.bybit) {
                await this.testBybitConnection(
                    accountName,
                    exchanges.bybit.api_key,
                    exchanges.bybit.api_secret
                );
                console.log('');
            }
        }
    }
}

const tester = new DirectAPITester();
tester.runTests();
