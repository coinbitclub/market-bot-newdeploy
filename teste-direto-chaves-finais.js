const crypto = require('crypto');
const axios = require('axios');

// 🔑 CHAVES EXATAS DO SEU TESTE FUNCIONAL
const chavesValidasTestadas = {
    luiza: {
        apiKey: '9HZy9BiUW95iXprVRl',
        secretKey: 'VnbIo7KL4tJNhUDfgQSE1kXd8CvzwOFM'
    },
    erica: {
        apiKey: '2iNeNZQepHJS0lWBkf',
        secretKey: 'YyKL9QtEgRdUhVmZpBsFnCjXzMwA1xOk'
    }
};

// 🔥 VALIDAR BYBIT - USANDO WALLET BALANCE COMO NO SEU TESTE FUNCIONAL
async function validarBybitDireto(nome, apiKey, secretKey) {
    try {
        console.log(`🔍 Testando ${nome} - Bybit...`);
        
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        
        // Usar o mesmo endpoint que funcionou no seu teste: wallet-balance
        const queryString = 'accountType=UNIFIED';
        
        // String para assinatura exata como nos exemplos oficiais
        const signaturePayload = timestamp + apiKey + recvWindow + queryString;
        
        console.log(`   📝 Signature Payload: ${signaturePayload}`);
        
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(signaturePayload)
            .digest('hex');

        console.log(`   🔐 Signature: ${signature}`);

        // Testar primeiro com axios.get simples como no seu código funcional
        const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
            headers: {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow
            },
            timeout: 10000
        });

        console.log(`   📊 Response Status: ${response.status}`);
        console.log(`   💰 Response Data:`, JSON.stringify(response.data, null, 2));

        if (response.data && response.data.retCode === 0) {
            const balance = response.data.result?.list?.[0]?.totalWalletBalance || 0;
            console.log(`   ✅ ${nome}: Saldo $${balance}`);
            return { success: true, balance: parseFloat(balance) };
        } else {
            console.log(`   ❌ ${nome}: ${response.data?.retMsg || 'Erro desconhecido'}`);
            return { success: false, error: response.data?.retMsg };
        }

    } catch (error) {
        console.log(`   💥 ${nome}: ERRO - ${error.message}`);
        if (error.response?.data) {
            console.log(`   📋 Error Data:`, JSON.stringify(error.response.data, null, 2));
        }
        return { success: false, error: error.message };
    }
}

// 🚀 EXECUTAR TESTE
async function executarTesteDireto() {
    console.log('🔥 TESTE DIRETO DE CHAVES - FORMATO EXATO DO SEU CÓDIGO');
    console.log('='.repeat(60));
    
    let totalBalance = 0;
    let validKeys = 0;
    
    // Testar Luiza
    const resultLuiza = await validarBybitDireto('Luiza', chavesValidasTestadas.luiza.apiKey, chavesValidasTestadas.luiza.secretKey);
    if (resultLuiza.success) {
        totalBalance += resultLuiza.balance;
        validKeys++;
    }
    
    console.log();
    
    // Testar Erica
    const resultErica = await validarBybitDireto('Erica', chavesValidasTestadas.erica.apiKey, chavesValidasTestadas.erica.secretKey);
    if (resultErica.success) {
        totalBalance += resultErica.balance;
        validKeys++;
    }
    
    console.log();
    console.log('📊 RESULTADO FINAL:');
    console.log(`✅ Chaves válidas: ${validKeys}/2`);
    console.log(`💰 Saldo total: $${totalBalance.toFixed(2)}`);
    
    if (validKeys === 2) {
        console.log('🎉 TODAS AS CHAVES FUNCIONARAM!');
        return true;
    } else {
        console.log('⚠️ Algumas chaves falharam - verificar implementação');
        return false;
    }
}

// 🏃‍♂️ EXECUTAR
executarTesteDireto()
    .then(success => {
        if (success) {
            console.log('\n✅ TESTE CONCLUÍDO: Chaves funcionam perfeitamente');
        } else {
            console.log('\n❌ TESTE FALHOU: Problema na implementação');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 ERRO CRÍTICO:', error);
        process.exit(1);
    });
