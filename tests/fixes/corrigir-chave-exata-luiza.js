#!/usr/bin/env node

/**
 * 🔄 CORREÇÃO FINAL - CHAVE EXATA DA IMAGEM QUE FUNCIONOU
 * Usando exatamente o secret que está na imagem do teste que funcionou
 */

require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function corrigirComChaveExata() {
    console.log('🔄 CORREÇÃO FINAL - CHAVE EXATA DA IMAGEM');
    console.log('=========================================');

    try {
        // CHAVES EXATAS da imagem do teste que funcionou
        const LUIZA_CHAVES_EXATAS = {
            apiKey: '9HZy9BiUW95iXprVRl',
            secret: 'process.env.API_KEY_HERE'  // Exato da imagem
        };

        console.log('📋 CHAVES EXATAS DA IMAGEM QUE FUNCIONOU:');
        console.log(`   🔑 API Key: ${LUIZA_CHAVES_EXATAS.apiKey}`);
        console.log(`   🔐 Secret: ${LUIZA_CHAVES_EXATAS.secret}`);
        console.log(`   📏 Secret length: ${LUIZA_CHAVES_EXATAS.secret.length} chars`);

        // 1. Atualizar no banco com a chave EXATA
        console.log('\n1️⃣ Atualizando banco com chave EXATA...');
        
        const updateResult = await pool.query(`
            UPDATE user_api_keys 
            SET 
                api_key = $1::VARCHAR,
                api_secret = $2::VARCHAR,
                api_key_encrypted = $3::VARCHAR,
                secret_key_encrypted = $4::VARCHAR,
                validation_status = 'pending',
                last_validated = NULL,
                validation_error = NULL,
                is_active = true
            WHERE user_id = 14 AND exchange = 'bybit'
            RETURNING id, user_id, exchange, api_key, LENGTH(api_secret) as secret_len
        `, [
            LUIZA_CHAVES_EXATAS.apiKey, 
            LUIZA_CHAVES_EXATAS.secret, 
            LUIZA_CHAVES_EXATAS.apiKey, 
            LUIZA_CHAVES_EXATAS.secret
        ]);

        console.log('   ✅ Banco atualizado:', updateResult.rows[0]);

        // 2. Teste imediato com as chaves exatas
        console.log('\n2️⃣ TESTE IMEDIATO COM CHAVES EXATAS...');
        await testarChaveExata(LUIZA_CHAVES_EXATAS);

        // 3. Comparar byte por byte
        console.log('\n3️⃣ ANÁLISE BYTE POR BYTE...');
        console.log(`   🔐 Secret chars: ${[...LUIZA_CHAVES_EXATAS.secret]}`);
        console.log(`   🔢 Secret bytes: ${[...LUIZA_CHAVES_EXATAS.secret].map(c => c.charCodeAt(0))}`);

        console.log('\n🎉 CORREÇÃO FINAL CONCLUÍDA!');

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

async function testarChaveExata(chaves) {
    try {
        console.log('   🧪 Testando com chaves EXATAS da imagem...');
        
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        const signString = timestamp + chaves.apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', chaves.secret).update(signString).digest('hex');
        
        console.log(`      🕐 Timestamp: ${timestamp}`);
        console.log(`      📝 Sign String: ${signString}`);
        console.log(`      🔐 Signature: ${signature.substring(0, 20)}...`);
        
        const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
            headers: {
                'X-BAPI-API-KEY': chaves.apiKey,
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
            console.log(`      ✅ SUCESSO COM CHAVES EXATAS: $${parseFloat(balance).toFixed(2)} USDT`);
            console.log(`      🎉 A CHAVE DA LUIZA ESTÁ FUNCIONANDO!`);
        } else {
            console.log(`      ❌ AINDA ERRO: ${data.retMsg} (${data.retCode})`);
            console.log(`      📋 Response: ${JSON.stringify(data, null, 2)}`);
        }
        
    } catch (error) {
        console.log(`      💥 EXCEÇÃO: ${error.message}`);
        if (error.response?.data) {
            console.log(`      📋 Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

corrigirComChaveExata().catch(console.error);
