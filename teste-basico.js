// Teste básico de conectividade
console.log('🧪 TESTE BÁSICO INICIADO');

require('dotenv').config();
console.log('✅ dotenv carregado');

const axios = require('axios');
console.log('✅ axios carregado');

async function testeBasico() {
    try {
        console.log('\n📊 Testando CoinStats Fear & Greed...');
        const response = await axios.get(process.env.FEAR_GREED_URL, {
            headers: {
                'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE: 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ Response Status:', response.status);
        console.log('✅ Fear & Greed:', response.data.now.value);
        console.log('✅ Classification:', response.data.now.value_classification);
        
        console.log('\n🏆 Testando CoinStats Markets...');
        const marketsResp = await axios.get('https://openapiv1.coinstats.app/markets', {
            headers: {
                'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE: 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ Markets Status:', marketsResp.status);
        console.log('📄 Markets Data Keys:', Object.keys(marketsResp.data));
        
        // Procurar dominância BTC
        let dominance = null;
        if (marketsResp.data.btcDominance) {
            dominance = marketsResp.data.btcDominance;
            console.log('✅ BTC Dominance found:', dominance);
        } else {
            console.log('⚠️ BTC Dominance not found in direct property');
            console.log('📋 Available data structure:', JSON.stringify(marketsResp.data, null, 2));
        }
        
        console.log('\n🎉 TESTE BÁSICO CONCLUÍDO COM SUCESSO!');
        console.log('🔥 APIS FUNCIONANDO PERFEITAMENTE!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
        }
    }
}

testeBasico();
