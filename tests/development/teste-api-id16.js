#!/usr/bin/env node
const crypto = require('crypto');
const fetch = require('node-fetch');

// Chaves do usuário ID 16 encontradas no banco
const TEST_KEYS = {
    bybit_mainnet: {
        api_key: YOUR_API_KEY_HERE,
        api_secret: 'erica_test_secret_bybit_2025',
        is_testnet: false
    },
    binance_testnet: {
        api_key: YOUR_API_KEY_HERE,
        api_secret: 'erica_test_secret_binance_2025',
        is_testnet: true
    }
};

class DirectAPITester {
    generateBybitSignature(params, secret) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        return crypto.createHmac('sha256', secret).update(sortedParams).digest('hex');
    }

    generateBinanceSignature(queryString, secret) {
        return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
    }

    async testBybitAPI(keyName, apiKey, apiSecret, isTestnet = false) {
        const baseUrl = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        
        const params = {
            timestamp: timestamp,
            recv_window: recvWindow
        };

        const queryString = Object.keys(params)
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const signature = crypto.createHmac('sha256', apiSecret)
            .update(timestamp + apiKey + recvWindow)
            .digest('hex');

        try {
            console.log(`🧪 Testando Bybit ${keyName}...`);
            console.log(`   URL: ${baseUrl}/v5/user/query-api`);
            console.log(`   API Key: ${apiKey}`);
            
            const response = await fetch(`${baseUrl}/v5/user/query-api?${queryString}`, {
                method: 'GET',
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-SIGN-TYPE': '2',
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            console.log(`   Status: ${response.status}`);
            console.log(`   Response:`, JSON.stringify(data, null, 2));
            
            return data.retCode === 0;

        } catch (error) {
            console.log(`❌ Erro Bybit ${keyName}:`, error.message);
            return false;
        }
    }

    async testBinanceAPI(keyName, apiKey, apiSecret, isTestnet = true) {
        const baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
        const timestamp = Date.now();
        
        const queryString = `timestamp=${timestamp}`;
        const signature = this.generateBinanceSignature(queryString, apiSecret);
        
        try {
            console.log(`🧪 Testando Binance ${keyName}...`);
            console.log(`   URL: ${baseUrl}/api/v3/account`);
            console.log(`   API Key: ${apiKey}`);
            
            const response = await fetch(`${baseUrl}/api/v3/account?${queryString}&signature=${signature}`, {
                method: 'GET',
                headers: {
                    'X-MBX-APIKEY': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            console.log(`   Status: ${response.status}`);
            console.log(`   Response:`, JSON.stringify(data, null, 2));
            
            return !data.code; // Se não tem código de erro, é sucesso

        } catch (error) {
            console.log(`❌ Erro Binance ${keyName}:`, error.message);
            return false;
        }
    }

    async runTests() {
        console.log('🚀 Testando APIs diretamente com chaves do usuário ID 16...\n');
        
        // Teste Bybit
        console.log('=== BYBIT MAINNET ===');
        await this.testBybitAPI(
            'ID 16 Bybit',
            TEST_KEYS.bybit_mainnet.api_key,
            TEST_KEYS.bybit_mainnet.api_secret,
            false
        );
        
        console.log('\n=== BINANCE TESTNET ===');
        await this.testBinanceAPI(
            'ID 16 Binance',
            TEST_KEYS.binance_testnet.api_key,
            TEST_KEYS.binance_testnet.api_secret,
            true
        );
        
        console.log('\n✅ Testes concluídos!');
    }
}

const tester = new DirectAPITester();
tester.runTests();
