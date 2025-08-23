// TESTE DIRETO DA API BYBIT - SEM BANCO
const axios = require('axios');
const crypto = require('crypto');

async function testeDirectoBybit() {
    console.log('🔥 TESTE DIRETO API BYBIT - SALDOS REAIS');
    console.log('========================================');
    
    const apiKey = '2iNeNZQepHJS0lWBkf';
    const secretKey = 'ZtmCtREm6CU8CKW68Z6jKOPKcvxTfBIhKJqU';
    
    try {
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const params = { accountType: 'UNIFIED' };
        const queryString = new URLSearchParams(params).toString();
        
        const signPayload = timestamp + apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', secretKey).update(signPayload).digest('hex');
        
        const headers = {
            'X-BAPI-API-KEY': apiKey,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
        };

        console.log('📡 Chamando API Bybit...');
        const response = await axios.get('https://api.bybit.com/v5/account/wallet-balance?' + queryString, {
            headers,
            timeout: 30000
        });

        console.log(`Status: ${response.status}`);
        console.log(`retCode: ${response.data.retCode}`);
        
        if (response.data.retCode === 0) {
            console.log('\n💰 SALDOS REAIS:');
            console.log('================');
            
            const wallets = response.data.result?.list || [];
            wallets.forEach(wallet => {
                console.log(`Carteira: ${wallet.accountType}`);
                wallet.coin?.forEach(coin => {
                    const balance = parseFloat(coin.walletBalance);
                    if (balance > 0) {
                        console.log(`  ${coin.coin}: ${balance} (USD: $${coin.usdValue})`);
                    }
                });
            });
        } else {
            console.log(`Erro: ${response.data.retMsg}`);
        }
        
    } catch (error) {
        console.log(`Erro: ${error.message}`);
    }
}

testeDirectoBybit();
