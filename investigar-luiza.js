#!/usr/bin/env node

/**
 * 🔍 INVESTIGAÇÃO ESPECÍFICA DAS CHAVES DA LUIZA
 * Verificando se há caracteres especiais ou problemas de encoding
 */

require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');

async function investigarLuiza() {
    console.log('🔍 INVESTIGAÇÃO ESPECÍFICA - CHAVES DA LUIZA');
    console.log('============================================');

    // Chaves exatas da imagem fornecida
    const apiKey = '9HZy9BiUW95iXprVRl';
    const secret = 'QUjDXNmsl0qiqakTUk7FHAHZnjlEN8AaRkQ0';

    console.log('\n📋 ANÁLISE DAS CHAVES:');
    console.log(`🔑 API Key: "${apiKey}"`);
    console.log(`🔐 Secret: "${secret}"`);
    console.log(`📏 Tamanho API Key: ${apiKey.length} caracteres`);
    console.log(`📏 Tamanho Secret: ${secret.length} caracteres`);
    
    // Verificar caracteres especiais
    console.log('\n🔬 ANÁLISE DE CARACTERES:');
    console.log(`🔑 API Key bytes: ${JSON.stringify([...apiKey].map(c => c.charCodeAt(0)))}`);
    console.log(`🔐 Secret bytes: ${JSON.stringify([...secret].map(c => c.charCodeAt(0)))}`);
    
    // Verificar se há espaços ou caracteres invisíveis
    console.log('\n🔍 VERIFICAÇÃO DE ESPAÇOS/INVISÍVEIS:');
    console.log(`🔑 API Key trimmed: "${apiKey.trim()}" (${apiKey.trim().length})`);
    console.log(`🔐 Secret trimmed: "${secret.trim()}" (${secret.trim().length})`);
    
    // Teste com diferentes encodings
    console.log('\n🧪 TESTE COM DIFERENTES MÉTODOS:');
    
    // Método 1: Como está
    await testarMetodo('MÉTODO 1 - Original', apiKey, secret);
    
    // Método 2: Trimmed
    await testarMetodo('MÉTODO 2 - Trimmed', apiKey.trim(), secret.trim());
    
    // Método 3: Verificar se não há caracteres de substituição
    const cleanApiKey = apiKey.replace(/[^\w]/g, '');
    const cleanSecret = secret.replace(/[^\w]/g, '');
    await testarMetodo('MÉTODO 3 - Só alfanuméricos', cleanApiKey, cleanSecret);
    
    // Método 4: Testar com chaves da Paloma (que funcionam)
    console.log('\n🔄 COMPARAÇÃO COM PALOMA (que funciona):');
    await testarMetodo('PALOMA - Controle', '21k7qWUkZKOBDXBuoT', 'JxoniuBKRaBbQY5KanFSMM2najL3KLjbmEpz');
    
    // Método 5: Verificar se as chaves da Luiza foram revogadas/desabilitadas
    console.log('\n⚠️ POSSÍVEL CAUSA: Chaves da Luiza podem ter sido revogadas/desabilitadas');
    console.log('   💡 Solução: Verificar no painel da Bybit se as chaves estão ativas');
    console.log('   💡 Alternativa: Gerar novas chaves API para a Luiza');
}

async function testarMetodo(nome, apiKey, secret) {
    try {
        console.log(`\n   🧪 ${nome}:`);
        console.log(`      🔑 API: "${apiKey}" (${apiKey.length})`);
        console.log(`      🔐 Secret: "${secret.substring(0, 10)}..." (${secret.length})`);
        
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        const signaturePayload = timestamp + apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
        
        console.log(`      📝 Payload: ${signaturePayload.substring(0, 50)}...`);
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
            console.log(`      ✅ SUCESSO: Saldo $${parseFloat(balance).toFixed(2)}`);
        } else {
            console.log(`      ❌ ERRO: ${data.retMsg} (Código: ${data.retCode})`);
            
            // Analisar códigos de erro específicos
            switch (data.retCode) {
                case 10004:
                    console.log(`      💡 Código 10004: Erro de assinatura - chave pode estar incorreta ou revogada`);
                    break;
                case 10003:
                    console.log(`      💡 Código 10003: API key inválida ou desabilitada`);
                    break;
                case 10005:
                    console.log(`      💡 Código 10005: Permissões insuficientes`);
                    break;
                default:
                    console.log(`      💡 Código ${data.retCode}: Verificar documentação Bybit`);
            }
        }
        
    } catch (error) {
        console.log(`      💥 EXCEÇÃO: ${error.message}`);
        if (error.response?.data) {
            console.log(`      📋 Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

investigarLuiza().catch(console.error);
