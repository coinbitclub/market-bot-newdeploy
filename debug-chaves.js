#!/usr/bin/env node
/**
 * 🔍 DEBUG CHAVES REAIS - Verificar estado atual das APIs
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debugChaves() {
    try {
        console.log('🔍 VERIFICANDO CHAVES REAIS NO BANCO:');
        console.log('====================================\n');
        
        const result = await pool.query(`
            SELECT 
                u.id, u.username, 
                k.exchange, k.api_key, k.api_secret, k.environment,
                LENGTH(k.api_key) as key_length,
                LENGTH(k.api_secret) as secret_length,
                k.validation_status, k.last_validated
            FROM users u
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE u.id IN (14, 15, 16) AND k.is_active = true
            ORDER BY u.id, k.exchange
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ NENHUMA CHAVE ENCONTRADA para IDs 14, 15, 16');
            return;
        }
        
        result.rows.forEach(row => {
            console.log(`ID ${row.id} (${row.username}) - ${row.exchange.toUpperCase()}:`);
            console.log(`  🔑 API Key: ${row.api_key} (${row.key_length} chars)`);
            console.log(`  🔐 Secret: ${row.api_secret ? row.api_secret.substring(0, 20) + '...' : 'NULL'} (${row.secret_length} chars)`);
            console.log(`  🌐 Environment: ${row.environment || 'null'}`);
            console.log(`  ✅ Status: ${row.validation_status || 'pending'}`);
            console.log(`  📅 Last Validated: ${row.last_validated || 'never'}`);
            console.log('');
        });
        
        // Agora vamos testar uma chave REAL para ver se o problema é nas chaves ou na validação
        console.log('🧪 TESTANDO VALIDAÇÃO REAL DE UMA CHAVE:');
        console.log('=========================================\n');
        
        const crypto = require('crypto');
        const axios = require('axios');
        
        // Pegar primeira chave Bybit
        const bybitRow = result.rows.find(r => r.exchange === 'bybit');
        if (bybitRow) {
            console.log(`Testando chave Bybit de ${bybitRow.username}...`);
            
            try {
                const timestamp = Date.now().toString();
                const recvWindow = '5000';
                const queryString = 'accountType=UNIFIED';
                const signaturePayload = timestamp + bybitRow.api_key + recvWindow + queryString;
                const signature = crypto.createHmac('sha256', bybitRow.api_secret).update(signaturePayload).digest('hex');
                
                console.log(`🔗 URL: https://api.bybit.com/v5/account/wallet-balance`);
                console.log(`📊 Timestamp: ${timestamp}`);
                console.log(`🔑 API Key: ${bybitRow.api_key}`);
                console.log(`🔐 Signature: ${signature.substring(0, 20)}...`);
                
                const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
                    headers: {
                        'X-BAPI-API-KEY': bybitRow.api_key,
                        'X-BAPI-SIGN': signature,
                        'X-BAPI-TIMESTAMP': timestamp,
                        'X-BAPI-RECV-WINDOW': recvWindow,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log(`✅ Resposta Bybit:`, JSON.stringify(response.data, null, 2));
                
            } catch (error) {
                console.log(`❌ Erro Bybit:`, error.response?.data || error.message);
            }
        }
        
        // Testar chave Binance
        const binanceRow = result.rows.find(r => r.exchange === 'binance');
        if (binanceRow) {
            console.log(`\nTestando chave Binance de ${binanceRow.username}...`);
            
            try {
                const timestamp = Date.now();
                const recvWindow = 5000;
                const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
                const signature = crypto.createHmac('sha256', binanceRow.api_secret).update(queryString).digest('hex');
                
                console.log(`🔗 URL: https://api.binance.com/api/v3/account`);
                console.log(`📊 Timestamp: ${timestamp}`);
                console.log(`🔑 API Key: ${binanceRow.api_key}`);
                console.log(`🔐 Signature: ${signature.substring(0, 20)}...`);
                
                const response = await axios.get(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
                    headers: {
                        'X-MBX-APIKEY': binanceRow.api_key,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                console.log(`✅ Resposta Binance:`, JSON.stringify(response.data, null, 2));
                
            } catch (error) {
                console.log(`❌ Erro Binance:`, error.response?.data || error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    } finally {
        await pool.end();
    }
}

debugChaves();
