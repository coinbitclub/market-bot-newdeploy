#!/usr/bin/env node

/**
 * 🔍 COMPARAÇÃO COM TESTE FUNCIONANDO
 * Replicando exatamente o método que funcionou no teste da Luiza
 */

require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');

async function testeExatoLuiza() {
    console.log('🔍 TESTE EXATO - REPLICANDO MÉTODO QUE FUNCIONOU');
    console.log('================================================');

    // Chaves EXATAS do teste que funcionou (da imagem)
    const LUIZA = {
        name: 'Luiza Maria de Almeida Pinto',
        email: 'lmariadeapinto@gmail.com',
        apiKey: '9HZy9BiUW95iXprVRl',
        apiSecret: 'process.env.API_KEY_HERE',
        baseUrl: 'https://api.bybit.com',
        creditoAdmin: 'R$1.000',
        afiliado: 'VIP',
        telefone: '+5521972344633'
    };

    console.log('📋 DADOS DA LUIZA (do teste que funcionou):');
    console.log(`   👤 Nome: ${LUIZA.name}`);
    console.log(`   📧 Email: ${LUIZA.email}`);
    console.log(`   🔑 API Key: ${LUIZA.apiKey}`);
    console.log(`   🔐 Secret: ${LUIZA.apiSecret.substring(0, 10)}...${LUIZA.apiSecret.substring(LUIZA.apiSecret.length-4)}`);
    console.log(`   🌐 URL: ${LUIZA.baseUrl}`);

    // MÉTODO 1: Exatamente como no bybit-100-percent-final.js
    console.log('\n🧪 MÉTODO 1 - Replicando teste 100% final:');
    await testarMetodoFinal(LUIZA);

    // MÉTODO 2: Comparar com nosso método atual
    console.log('\n🧪 MÉTODO 2 - Método atual do sistema:');
    await testarMetodoAtual(LUIZA);

    // MÉTODO 3: Teste de diferentes formatos de timestamp
    console.log('\n🧪 MÉTODO 3 - Teste com timestamp Number vs String:');
    await testarTimestampFormats(LUIZA);

    // MÉTODO 4: Teste com headers diferentes
    console.log('\n🧪 MÉTODO 4 - Teste com headers específicos:');
    await testarHeadersEspecificos(LUIZA);
}

async function testarMetodoFinal(account) {
    try {
        console.log('   🔄 Testando método do bybit-100-percent-final.js...');
        
        // Método exato do arquivo que funcionou
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        // Assinatura exata
        const signString = timestamp + account.apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', account.apiSecret).update(signString).digest('hex');
        
        console.log(`      🕐 Timestamp: ${timestamp} (${typeof timestamp})`);
        console.log(`      📝 Sign String: ${signString}`);
        console.log(`      🔐 Signature: ${signature.substring(0, 20)}...`);
        
        const response = await axios.get(`${account.baseUrl}/v5/account/wallet-balance?${queryString}`, {
            headers: {
                'X-BAPI-API-KEY': account.apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        const data = response.data;
        if (data.retCode === 0) {
            const balance = data.result?.list?.[0]?.totalWalletBalance || 0;
            console.log(`      ✅ SUCESSO: $${parseFloat(balance).toFixed(2)} USDT`);
            return true;
        } else {
            console.log(`      ❌ ERRO: ${data.retMsg} (${data.retCode})`);
            return false;
        }
        
    } catch (error) {
        console.log(`      💥 EXCEÇÃO: ${error.message}`);
        if (error.response?.data) {
            console.log(`      📋 Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        return false;
    }
}

async function testarMetodoAtual(account) {
    try {
        console.log('   🔄 Testando método atual do sistema...');
        
        // Método atual do nosso sistema
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        // Nossa assinatura atual
        const signaturePayload = timestamp + account.apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', account.apiSecret).update(signaturePayload).digest('hex');
        
        console.log(`      🕐 Timestamp: ${timestamp} (${typeof timestamp})`);
        console.log(`      📝 Payload: ${signaturePayload}`);
        console.log(`      🔐 Signature: ${signature.substring(0, 20)}...`);
        
        const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
            headers: {
                'X-BAPI-API-KEY': account.apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        const data = response.data;
        if (data.retCode === 0) {
            const balance = data.result?.list?.[0]?.totalWalletBalance || 0;
            console.log(`      ✅ SUCESSO: $${parseFloat(balance).toFixed(2)} USDT`);
            return true;
        } else {
            console.log(`      ❌ ERRO: ${data.retMsg} (${data.retCode})`);
            return false;
        }
        
    } catch (error) {
        console.log(`      💥 EXCEÇÃO: ${error.message}`);
        return false;
    }
}

async function testarTimestampFormats(account) {
    try {
        console.log('   🔄 Testando formatos de timestamp...');
        
        // Teste 1: Timestamp como Number
        const timestampNum = Date.now();
        const timestampStr = timestampNum.toString();
        
        console.log(`      📊 Number: ${timestampNum} (${typeof timestampNum})`);
        console.log(`      📊 String: ${timestampStr} (${typeof timestampStr})`);
        
        // Testar com timestamp Number
        await testarComTimestamp(account, timestampNum, 'Number');
        
        // Testar com timestamp String
        await testarComTimestamp(account, timestampStr, 'String');
        
    } catch (error) {
        console.log(`      💥 ERRO nos testes de timestamp: ${error.message}`);
    }
}

async function testarComTimestamp(account, timestamp, tipo) {
    try {
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        const signString = timestamp + account.apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', account.apiSecret).update(signString).digest('hex');
        
        console.log(`      🧪 Teste ${tipo}: ${signString.substring(0, 30)}...`);
        
        const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
            headers: {
                'X-BAPI-API-KEY': account.apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp.toString(), // Sempre string no header
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            },
            timeout: 8000
        });
        
        const data = response.data;
        if (data.retCode === 0) {
            console.log(`      ✅ ${tipo} FUNCIONOU!`);
        } else {
            console.log(`      ❌ ${tipo} falhou: ${data.retMsg}`);
        }
        
    } catch (error) {
        console.log(`      ❌ ${tipo} exceção: ${error.message}`);
    }
}

async function testarHeadersEspecificos(account) {
    try {
        console.log('   🔄 Testando headers específicos...');
        
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        const signString = timestamp + account.apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', account.apiSecret).update(signString).digest('hex');
        
        // Headers exatos do teste que funcionou
        const headers = {
            'X-BAPI-API-KEY': account.apiKey,
            'X-BAPI-SIGN': signature,
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
        };
        
        console.log(`      📋 Headers: ${JSON.stringify(headers, null, 2)}`);
        
        const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
            headers,
            timeout: 10000
        });
        
        const data = response.data;
        if (data.retCode === 0) {
            const balance = data.result?.list?.[0]?.totalWalletBalance || 0;
            console.log(`      ✅ HEADERS ESPECÍFICOS FUNCIONARAM: $${parseFloat(balance).toFixed(2)}`);
        } else {
            console.log(`      ❌ Headers específicos falharam: ${data.retMsg}`);
        }
        
    } catch (error) {
        console.log(`      💥 Erro headers específicos: ${error.message}`);
    }
}

testeExatoLuiza().catch(console.error);
