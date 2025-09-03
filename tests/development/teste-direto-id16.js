#!/usr/bin/env node
require('dotenv').config();
const crypto = require('crypto');
const fetch = require('node-fetch');

async function testarConexaoDigreta() {
    console.log('🧪 TESTE DIRETO DE CONECTIVIDADE COM AS CHAVES DO ID 16');
    console.log('====================================================');

    // Dados do usuário ID 16
    const binanceKey = 'erica_test_api_key_binance_2025';
    const binanceSecret = 'erica_test_secret_binance_2025';
    const bybitKey = 'erica_test_api_key_bybit_2025';
    const bybitSecret = 'erica_test_secret_bybit_2025';

    // 1. TESTE BINANCE TESTNET
    console.log('\n🟡 TESTANDO BINANCE TESTNET...');
    console.log('================================');
    try {
        const binanceTestnetUrl = 'https://testnet.binance.vision';
        
        // Testar server time primeiro
        console.log('1. Testando server time...');
        const timeResponse = await fetch(`${binanceTestnetUrl}/api/v3/time`);
        if (timeResponse.ok) {
            const timeData = await timeResponse.json();
            console.log(`   ✅ Server time: ${new Date(timeData.serverTime)}`);
        } else {
            console.log(`   ❌ Erro no server time: ${timeResponse.status}`);
        }

        // Testar autenticação
        console.log('2. Testando autenticação...');
        const timestamp = Date.now();
        const recvWindow = 5000;
        const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
        const signature = crypto.createHmac('sha256', binanceSecret).update(queryString).digest('hex');

        const authUrl = `${binanceTestnetUrl}/api/v3/account?${queryString}&signature=${signature}`;
        const authResponse = await fetch(authUrl, {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': binanceKey,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${authResponse.status} ${authResponse.statusText}`);
        
        if (authResponse.ok) {
            const accountData = await authResponse.json();
            console.log(`   ✅ Conta autenticada com sucesso!`);
            console.log(`   Account Type: ${accountData.accountType}`);
            console.log(`   Can Trade: ${accountData.canTrade}`);
            console.log(`   Balances: ${accountData.balances ? accountData.balances.length : 0} assets`);
        } else {
            const errorData = await authResponse.json();
            console.log(`   ❌ Erro na autenticação: ${errorData.msg}`);
            console.log(`   Code: ${errorData.code}`);
        }

    } catch (error) {
        console.log(`   ❌ Erro na conexão Binance: ${error.message}`);
    }

    // 2. TESTE BYBIT MAINNET
    console.log('\n🟣 TESTANDO BYBIT MAINNET...');
    console.log('=============================');
    try {
        const bybitMainnetUrl = 'https://api.bybit.com';
        
        // Testar server time primeiro
        console.log('1. Testando server time...');
        const timeResponse = await fetch(`${bybitMainnetUrl}/v5/market/time`);
        if (timeResponse.ok) {
            const timeData = await timeResponse.json();
            console.log(`   ✅ Server time: ${new Date(parseInt(timeData.result.timeSecond) * 1000)}`);
            console.log(`   Return Code: ${timeData.retCode}`);
        } else {
            console.log(`   ❌ Erro no server time: ${timeResponse.status}`);
        }

        // Testar autenticação
        console.log('2. Testando autenticação...');
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const query = 'accountType=UNIFIED';
        
        const signPayload = timestamp + bybitKey + recvWindow + query;
        const signature = crypto.createHmac('sha256', bybitSecret).update(signPayload).digest('hex');

        const authUrl = `${bybitMainnetUrl}/v5/account/wallet-balance?${query}`;
        const authResponse = await fetch(authUrl, {
            method: 'GET',
            headers: {
                'X-BAPI-API-KEY': bybitKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'X-BAPI-SIGN-TYPE': '2',
                'Content-Type': 'application/json'
            }
        });

        console.log(`   Status: ${authResponse.status} ${authResponse.statusText}`);
        
        if (authResponse.ok) {
            const accountData = await authResponse.json();
            console.log(`   Return Code: ${accountData.retCode}`);
            console.log(`   Return Message: ${accountData.retMsg}`);
            
            if (accountData.retCode === 0) {
                console.log(`   ✅ Conta autenticada com sucesso!`);
                console.log(`   Account Type: UNIFIED`);
                const wallets = accountData.result?.list || [];
                console.log(`   Wallets: ${wallets.length} encontradas`);
                if (wallets.length > 0) {
                    console.log(`   Total Balance: ${wallets[0].totalWalletBalance || '0'}`);
                }
            } else {
                console.log(`   ❌ Erro na autenticação Bybit: ${accountData.retMsg}`);
            }
        } else {
            const errorText = await authResponse.text();
            console.log(`   ❌ Erro na resposta: ${errorText}`);
        }

    } catch (error) {
        console.log(`   ❌ Erro na conexão Bybit: ${error.message}`);
    }

    console.log('\n📊 RESUMO DOS TESTES:');
    console.log('=====================');
    console.log('- As chaves são de teste, então falhas de autenticação são esperadas');
    console.log('- O importante é verificar se as APIs estão respondendo');
    console.log('- Server time OK = API acessível');
    console.log('- Erro de autenticação = chave inválida (normal para chaves de teste)');
}

testarConexaoDigreta();
