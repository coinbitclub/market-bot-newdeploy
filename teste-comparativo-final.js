#!/usr/bin/env node

/**
 * 🔍 TESTE FINAL COMPARATIVO - LUIZA vs PALOMA
 * Testando ambas com o mesmo método para confirmar o problema
 */

require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');

async function testeComparativo() {
    console.log('🔍 TESTE FINAL COMPARATIVO - LUIZA vs PALOMA');
    console.log('=============================================');

    const USUARIOS = {
        LUIZA: {
            name: 'Luiza Maria',
            apiKey: '9HZy9BiUW95iXprVRl',
            secret: 'QUjDXNmsl0qiqakTUk7FHAHZnjlEN8AaRkQ0'
        },
        PALOMA: {
            name: 'Paloma Amaral',
            apiKey: '21k7qWUkZKOBDXBuoT',
            secret: 'JxoniuBKRaBbQY5KanFSMM2najL3KLjbmEpz'
        }
    };

    for (const [nome, dados] of Object.entries(USUARIOS)) {
        console.log(`\n👤 TESTANDO ${nome}:`);
        console.log(`   🔑 API Key: ${dados.apiKey}`);
        console.log(`   🔐 Secret: ${dados.secret.substring(0, 10)}...${dados.secret.substring(dados.secret.length-4)}`);
        
        await testarUsuario(nome, dados);
    }

    console.log('\n📊 CONCLUSÃO:');
    console.log('=============');
    console.log('Se PALOMA funciona e LUIZA não, com o mesmo método,');
    console.log('então a chave da LUIZA foi revogada/desabilitada na Bybit.');
    console.log('');
    console.log('💡 SOLUÇÃO: Gerar novas chaves API para a Luiza no painel da Bybit.');
}

async function testarUsuario(nome, dados) {
    try {
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        const signString = timestamp + dados.apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', dados.secret).update(signString).digest('hex');
        
        console.log(`   🕐 Timestamp: ${timestamp}`);
        console.log(`   📝 Sign String: ${signString.substring(0, 40)}...`);
        console.log(`   🔐 Signature: ${signature.substring(0, 20)}...`);
        
        const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
            headers: {
                'X-BAPI-API-KEY': dados.apiKey,
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
            console.log(`   ✅ ${nome} FUNCIONA: $${parseFloat(balance).toFixed(2)} USDT`);
            console.log(`   🎉 Chave ativa e funcionando!`);
        } else {
            console.log(`   ❌ ${nome} FALHOU: ${data.retMsg} (Código: ${data.retCode})`);
            
            if (data.retCode === 10004) {
                console.log(`   💡 Diagnóstico: Chave provavelmente revogada/desabilitada`);
            } else if (data.retCode === 10003) {
                console.log(`   💡 Diagnóstico: API key inválida`);
            } else {
                console.log(`   💡 Diagnóstico: Erro desconhecido - verificar Bybit`);
            }
        }
        
    } catch (error) {
        console.log(`   💥 ${nome} EXCEÇÃO: ${error.message}`);
        console.log(`   💡 Diagnóstico: Problema de conectividade ou chave inválida`);
    }
}

testeComparativo().catch(console.error);
