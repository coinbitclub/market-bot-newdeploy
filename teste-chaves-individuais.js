#!/usr/bin/env node

// ===================================================================
// TESTE INDIVIDUAL DAS CHAVES API PARA DIAGNÓSTICO
// ===================================================================

require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testarChavesIndividualmente() {
    console.log('🔍 TESTE INDIVIDUAL DE CHAVES API');
    console.log('=================================\n');
    
    try {
        // Buscar chaves do banco
        const result = await pool.query(`
            SELECT 
                u.id, u.username, k.exchange, k.api_key, k.api_secret, k.environment
            FROM users u
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE u.id IN (14, 15, 16) AND k.is_active = true
            ORDER BY u.id, k.exchange
        `);

        for (const row of result.rows) {
            console.log(`\n🧪 TESTANDO: ID ${row.id} (${row.username}) - ${row.exchange.toUpperCase()}`);
            console.log(''.padEnd(60, '='));
            console.log(`🔑 API Key: ${row.api_key}`);
            console.log(`🔐 Secret: ${row.api_secret.substring(0, 10)}...${row.api_secret.substring(row.api_secret.length-4)}`);
            console.log(`🌐 Environment: ${row.environment}`);
            
            if (row.exchange === 'bybit') {
                await testarBybit(row);
            } else if (row.exchange === 'binance') {
                await testarBinance(row);
            }
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

async function testarBybit(config) {
    console.log('\n📊 Teste Bybit API V5:');
    
    try {
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        // Criar assinatura exatamente como na documentação oficial
        const signaturePayload = timestamp + config.api_key + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', config.api_secret).update(signaturePayload).digest('hex');
        
        console.log(`   🕐 Timestamp: ${timestamp}`);
        console.log(`   📝 Payload: ${signaturePayload.substring(0, 50)}...`);
        console.log(`   🔐 Signature: ${signature.substring(0, 20)}...`);
        
        const baseUrl = config.environment === 'testnet' ? 
            'https://api-testnet.bybit.com' : 
            'https://api.bybit.com';
            
        const url = `${baseUrl}/v5/account/wallet-balance?${queryString}`;
        console.log(`   🔗 URL: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'X-BAPI-API-KEY': config.api_key,
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
            console.log(`   ✅ SUCESSO: Saldo $${parseFloat(balance).toFixed(2)}`);
            console.log(`   📋 Response: ${JSON.stringify(data.result?.list?.[0], null, 2)}`);
        } else {
            console.log(`   ❌ ERRO: ${data.retMsg} (Código: ${data.retCode})`);
            console.log(`   📋 Response completa: ${JSON.stringify(data, null, 2)}`);
        }
        
    } catch (error) {
        console.log(`   💥 EXCEÇÃO: ${error.message}`);
        if (error.response?.data) {
            console.log(`   📋 Error data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

async function testarBinance(config) {
    console.log('\n📊 Teste Binance API V3:');
    
    try {
        const timestamp = Date.now();
        const recvWindow = 5000;
        const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
        const signature = crypto.createHmac('sha256', config.api_secret).update(queryString).digest('hex');
        
        console.log(`   🕐 Timestamp: ${timestamp}`);
        console.log(`   📝 Query: ${queryString}`);
        console.log(`   🔐 Signature: ${signature.substring(0, 20)}...`);
        
        const baseUrl = config.environment === 'testnet' ? 
            'https://testnet.binance.vision' : 
            'https://api.binance.com';
            
        const url = `${baseUrl}/api/v3/account?${queryString}&signature=${signature}`;
        console.log(`   🔗 URL: ${baseUrl}/api/v3/account`);
        
        const response = await axios.get(url, {
            headers: {
                'X-MBX-APIKEY': config.api_key,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        const data = response.data;
        
        if (response.status === 200) {
            const usdtBalance = data.balances?.find(b => b.asset === 'USDT');
            const balance = usdtBalance ? parseFloat(usdtBalance.free) : 0;
            console.log(`   ✅ SUCESSO: Saldo USDT $${balance.toFixed(2)}`);
            console.log(`   📋 Account Type: ${data.accountType}`);
        } else {
            console.log(`   ❌ ERRO: Status ${response.status}`);
        }
        
    } catch (error) {
        console.log(`   💥 EXCEÇÃO: ${error.message}`);
        if (error.response?.data) {
            console.log(`   📋 Error data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

testarChavesIndividualmente();
