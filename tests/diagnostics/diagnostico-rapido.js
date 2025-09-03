// 🔍 DIAGNÓSTICO RÁPIDO BYBIT
console.log('🔍 SISTEMA DIAGNÓSTICO BYBIT - VERSÃO RÁPIDA');
console.log('=============================================');

const axios = require('axios');
const crypto = require('crypto');

// Configurações das chaves
const ERICA = {
    name: "Erica dos Santos Andrade",
    apiKey: "2iNeNZQepHJS0lWBkf",
    apiSecret: 'process.env.API_KEY_HERE'
};

// Função de assinatura
function generateSignature(params, apiSecret) {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    
    let queryString = '';
    if (params && Object.keys(params).length > 0) {
        queryString = new URLSearchParams(params).toString();
    }
    
    const signPayload = timestamp + params.apiKey + recvWindow + queryString;
    const signature = crypto.createHmac('sha256', apiSecret).update(signPayload).digest('hex');
    
    return { timestamp, signature, recvWindow, queryString };
}

// Teste da API
async function testeBybit() {
    console.log('\n🔐 TESTANDO AUTENTICAÇÃO ERICA');
    console.log('==============================');
    
    try {
        const params = { accountType: 'UNIFIED', apiKey: ERICA.apiKey };
        const { timestamp, signature, recvWindow, queryString } = generateSignature(params, ERICA.apiSecret);
        
        const headers = {
            'X-BAPI-API-KEY': ERICA.apiKey,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
        };
        
        const url = `https://api.bybit.com/v5/account/wallet-balance?${queryString}`;
        console.log('📡 URL:', url.substring(0, 80) + '...');
        console.log('🔑 API Key:', ERICA.apiKey);
        console.log('🕐 Timestamp:', timestamp);
        console.log('✍️ Signature:', signature.substring(0, 20) + '...');
        
        const response = await axios.get(url, { headers, timeout: 10000 });
        
        console.log('\n✅ RESPOSTA RECEBIDA:');
        console.log('Status:', response.status);
        console.log('RetCode:', response.data.retCode);
        console.log('RetMsg:', response.data.retMsg);
        
        if (response.data.retCode === 0) {
            console.log('🎉 SUCESSO! API Key funcionando!');
            const result = response.data.result;
            if (result?.list?.[0]?.coin) {
                const coins = result.list[0].coin;
                console.log(`💰 Encontradas ${coins.length} moedas na carteira`);
                
                coins.forEach(coin => {
                    if (parseFloat(coin.walletBalance) > 0) {
                        console.log(`   ${coin.coin}: ${coin.walletBalance} (USD: ${coin.usdValue})`);
                    }
                });
            }
        } else {
            console.log('❌ ERRO NA API:');
            console.log('RetCode:', response.data.retCode);
            console.log('RetMsg:', response.data.retMsg);
        }
        
    } catch (error) {
        console.log('\n❌ ERRO DE REQUISIÇÃO:');
        console.log('Message:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Executar teste
testeBybit().then(() => {
    console.log('\n✅ DIAGNÓSTICO CONCLUÍDO');
}).catch(error => {
    console.error('❌ Erro crítico:', error.message);
});
