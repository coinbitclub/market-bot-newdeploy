#!/usr/bin/env node

/**
 * 🔄 CORREÇÃO COMPLETA - PALOMA + INVESTIGAÇÃO LUIZA
 * Atualizando Paloma e investigando problema de assinatura da Luiza
 */

require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function correcaoCompleta() {
    console.log('🔄 CORREÇÃO COMPLETA - PALOMA + LUIZA');
    console.log('===================================');

    try {
        // 1. ATUALIZAR CHAVE DA PALOMA
        console.log('\n1️⃣ ATUALIZANDO CHAVE DA PALOMA (ID 15)...');
        
        const palomaApiKey = '21k7qWUkZKOBDXBuoT';
        const palomaSecret = 'JxoniuBKRaBbQY5KanFSMM2najL3KLjbmEpz';

        console.log(`   👤 Usuário: Paloma Amaral (ID 15)`);
        console.log(`   🔑 Nova API Key: ${palomaApiKey}`);
        console.log(`   🔐 Novo Secret: ${palomaSecret.substring(0, 10)}...${palomaSecret.substring(palomaSecret.length-4)}`);

        const updatePaloma = await pool.query(`
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
            WHERE user_id = 15 AND exchange = 'bybit'
            RETURNING id, user_id, exchange, api_key
        `, [palomaApiKey, palomaSecret, palomaApiKey, palomaSecret]);

        console.log(`   ✅ Paloma atualizada: ID ${updatePaloma.rows[0]?.id}`);

        // 2. VERIFICAR DADOS ATUAIS NO BANCO
        console.log('\n2️⃣ VERIFICANDO DADOS ATUAIS NO BANCO...');
        
        const verification = await pool.query(`
            SELECT 
                u.id, u.username,
                k.exchange, k.api_key, k.api_secret, k.validation_status,
                k.is_active, k.environment,
                LENGTH(k.api_key) as key_length,
                LENGTH(k.api_secret) as secret_length
            FROM users u
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE u.id IN (14, 15) AND k.exchange = 'bybit'
            ORDER BY u.id
        `);

        for (const row of verification.rows) {
            console.log(`\n   📋 ID ${row.id} (${row.username}):`);
            console.log(`      🔑 API Key: ${row.api_key}`);
            console.log(`      🔐 Secret: ${row.api_secret.substring(0, 10)}...${row.api_secret.substring(row.api_secret.length-4)}`);
            console.log(`      📏 Tamanhos: Key=${row.key_length}, Secret=${row.secret_length}`);
        }

        // 3. TESTE MANUAL DE ASSINATURA BYBIT - MÉTODO CORRETO
        console.log('\n3️⃣ TESTE MANUAL DE ASSINATURA BYBIT - INVESTIGAÇÃO...');
        
        // Dados da Luiza
        const luizaApiKey = '9HZy9BiUW95iXprVRl';
        const luizaSecret = 'QUjDXNmsl0qiqakTUk7FHAHZnjlEN8AaRkQ0';
        
        console.log('\n   🧪 TESTANDO LUIZA - MÉTODO MANUAL:');
        console.log(`      🔑 API Key: ${luizaApiKey}`);
        console.log(`      🔐 Secret: ${luizaSecret.substring(0, 10)}...${luizaSecret.substring(luizaSecret.length-4)}`);
        
        await testarBybitManual('LUIZA', luizaApiKey, luizaSecret);

        console.log('\n   🧪 TESTANDO PALOMA - MÉTODO MANUAL:');
        console.log(`      🔑 API Key: ${palomaApiKey}`);
        console.log(`      🔐 Secret: ${palomaSecret.substring(0, 10)}...${palomaSecret.substring(palomaSecret.length-4)}`);
        
        await testarBybitManual('PALOMA', palomaApiKey, palomaSecret);

        // 4. TESTE COM DIFERENTES MÉTODOS DE ASSINATURA
        console.log('\n4️⃣ TESTE COM DIFERENTES MÉTODOS DE ASSINATURA...');
        
        console.log('\n   🔬 MÉTODO 1 - Assinatura Padrão (atual):');
        await testarAssinaturaMetodo1(luizaApiKey, luizaSecret);
        
        console.log('\n   🔬 MÉTODO 2 - Assinatura Alternativa:');
        await testarAssinaturaMetodo2(luizaApiKey, luizaSecret);
        
        console.log('\n   🔬 MÉTODO 3 - Assinatura com queryString completo:');
        await testarAssinaturaMetodo3(luizaApiKey, luizaSecret);

        console.log('\n🎉 CORREÇÃO E INVESTIGAÇÃO CONCLUÍDA!');

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

async function testarBybitManual(nome, apiKey, secret) {
    try {
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        // Método 1: Como está sendo usado no sistema
        const signaturePayload = timestamp + apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
        
        console.log(`      🕐 Timestamp: ${timestamp}`);
        console.log(`      📝 Payload: ${signaturePayload}`);
        console.log(`      🔐 Signature: ${signature.substring(0, 20)}...`);
        
        const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
            headers: {
                'X-BAPI-API-KEY': apiKey,
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
            console.log(`      ✅ ${nome} SUCESSO: Saldo $${parseFloat(balance).toFixed(2)}`);
        } else {
            console.log(`      ❌ ${nome} ERRO: ${data.retMsg} (Código: ${data.retCode})`);
            console.log(`      📋 Payload completo: ${signaturePayload}`);
        }
        
    } catch (error) {
        console.log(`      💥 ${nome} EXCEÇÃO: ${error.message}`);
        if (error.response?.data) {
            console.log(`      📋 Error data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

async function testarAssinaturaMetodo1(apiKey, secret) {
    try {
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        // Método atual do sistema
        const signaturePayload = timestamp + apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
        
        console.log(`      📝 Payload: ${signaturePayload}`);
        console.log(`      🔐 Signature: ${signature.substring(0, 20)}...`);
        
        const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
            headers: {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            },
            timeout: 8000
        });
        
        console.log(`      ✅ MÉTODO 1 funcionou! Código: ${response.data.retCode}`);
        
    } catch (error) {
        console.log(`      ❌ MÉTODO 1 falhou: ${error.response?.data?.retMsg || error.message}`);
    }
}

async function testarAssinaturaMetodo2(apiKey, secret) {
    try {
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        
        // Método 2: Sem queryString na assinatura (só timestamp + apiKey + recvWindow)
        const signaturePayload = timestamp + apiKey + recvWindow;
        const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
        
        console.log(`      📝 Payload: ${signaturePayload}`);
        console.log(`      🔐 Signature: ${signature.substring(0, 20)}...`);
        
        const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?accountType=UNIFIED`, {
            headers: {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            },
            timeout: 8000
        });
        
        console.log(`      ✅ MÉTODO 2 funcionou! Código: ${response.data.retCode}`);
        
    } catch (error) {
        console.log(`      ❌ MÉTODO 2 falhou: ${error.response?.data?.retMsg || error.message}`);
    }
}

async function testarAssinaturaMetodo3(apiKey, secret) {
    try {
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        
        // Método 3: Com queryString completo na assinatura
        const queryString = 'accountType=UNIFIED';
        const signaturePayload = timestamp + apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
        
        console.log(`      📝 Payload: ${signaturePayload}`);
        console.log(`      🔐 Signature: ${signature.substring(0, 20)}...`);
        
        // Fazer request com parâmetros no URL
        const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance`, {
            params: {
                accountType: 'UNIFIED'
            },
            headers: {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            },
            timeout: 8000
        });
        
        console.log(`      ✅ MÉTODO 3 funcionou! Código: ${response.data.retCode}`);
        
    } catch (error) {
        console.log(`      ❌ MÉTODO 3 falhou: ${error.response?.data?.retMsg || error.message}`);
    }
}

// Executar a correção
correcaoCompleta().catch(console.error);
