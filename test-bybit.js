#!/usr/bin/env node
/**
 * 🔍 TEST BYBIT INDIVIDUAL - Diagnosticar problema de assinatura
 */

const crypto = require('crypto');
const axios = require('axios');

async function testarBybit() {
    try {
        console.log('🟢 TESTE INDIVIDUAL BYBIT:');
        console.log('==========================\n');
        
        // Chave da Luiza (ID 14)
        const apiKey = '9HZy9BiUW95iXprVRl';
        const secretKey = 'QJjDXNmsIQq1gakTUk7F97U3lsJZ6Vgwlj8o';
        
        console.log(`🔑 API Key: ${apiKey}`);
        console.log(`🔐 Secret: ${secretKey.substring(0, 10)}...`);
        
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        // MÉTODO 1: Original string
        const signaturePayload1 = timestamp + apiKey + recvWindow + queryString;
        console.log(`\n📝 MÉTODO 1 - String completa:`);
        console.log(`Payload: ${signaturePayload1}`);
        
        const signature1 = crypto.createHmac('sha256', secretKey).update(signaturePayload1).digest('hex');
        console.log(`Signature: ${signature1}`);
        
        try {
            const response1 = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature1,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            console.log(`✅ MÉTODO 1 SUCESSO:`, response1.data);
        } catch (error) {
            console.log(`❌ MÉTODO 1 FALHOU:`, error.response?.data || error.message);
        }
        
        // MÉTODO 2: Sem parâmetros no payload (só timestamp+key+recvWindow)
        const signaturePayload2 = timestamp + apiKey + recvWindow;
        console.log(`\n📝 MÉTODO 2 - Sem query:`);
        console.log(`Payload: ${signaturePayload2}`);
        
        const signature2 = crypto.createHmac('sha256', secretKey).update(signaturePayload2).digest('hex');
        console.log(`Signature: ${signature2}`);
        
        try {
            const response2 = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature2,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            console.log(`✅ MÉTODO 2 SUCESSO:`, response2.data);
        } catch (error) {
            console.log(`❌ MÉTODO 2 FALHOU:`, error.response?.data || error.message);
        }
        
        // MÉTODO 3: GET sem query, com parâmetros nos headers
        console.log(`\n📝 MÉTODO 3 - GET params:`);
        const signaturePayload3 = timestamp + apiKey + recvWindow + 'GET/v5/account/wallet-balanceaccountType=UNIFIED';
        console.log(`Payload: ${signaturePayload3}`);
        
        const signature3 = crypto.createHmac('sha256', secretKey).update(signaturePayload3).digest('hex');
        console.log(`Signature: ${signature3}`);
        
        try {
            const response3 = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature3,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            console.log(`✅ MÉTODO 3 SUCESSO:`, response3.data);
        } catch (error) {
            console.log(`❌ MÉTODO 3 FALHOU:`, error.response?.data || error.message);
        }
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    }
}

testarBybit();
