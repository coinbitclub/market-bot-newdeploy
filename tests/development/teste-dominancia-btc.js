// Teste direto da CoinStats Markets API para dominância BTC
require('dotenv').config();

console.log('🧪 TESTE DIRETO - DOMINÂNCIA BTC DA COINSTATS');
console.log('URL:', 'https://openapiv1.coinstats.app/markets');
console.log('API Key:', process.env.COINSTATS_API_KEY ? 'Configurada (' + process.env.COINSTATS_API_KEY.length + ' chars)' : 'NÃO CONFIGURADA');

const https = require('https');

const options = {
    hostname: 'openapiv1.coinstats.app',
    port: 443,
    path: '/markets',
    method: 'GET',
    headers: {
        'X-API-KEY"YOUR_COINSTATS_API_KEYYOUR_API_KEY_HERE: 'application/json',
        'User-Agent': 'CoinBitClub-Bot/1.0'
    }
};

console.log('\n📊 Fazendo requisição para CoinStats Markets...');

const req = https.request(options, (res) => {
    console.log('✅ Status Code:', res.statusCode);
    console.log('📄 Headers:', res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            console.log('\n📋 Raw Response (primeiros 500 chars):');
            console.log(data.substring(0, 500) + '...');
            
            const jsonData = JSON.parse(data);
            
            console.log('\n🔍 ANÁLISE DA ESTRUTURA DE DADOS:');
            console.log('Chaves disponíveis:', Object.keys(jsonData));
            
            // Procurar por dominância BTC
            let btcDominance = null;
            
            // Tentar diferentes propriedades
            if (jsonData.btcDominance !== undefined) {
                btcDominance = jsonData.btcDominance;
                console.log('✅ Encontrada btcDominance:', btcDominance);
            } else if (jsonData.dominance !== undefined) {
                btcDominance = jsonData.dominance;
                console.log('✅ Encontrada dominance:', btcDominance);
            } else if (jsonData.marketCapDominance !== undefined) {
                btcDominance = jsonData.marketCapDominance;
                console.log('✅ Encontrada marketCapDominance:', btcDominance);
            } else if (jsonData.totalMarketCap && jsonData.btcMarketCap) {
                btcDominance = (jsonData.btcMarketCap / jsonData.totalMarketCap) * 100;
                console.log('✅ Calculada dominância:', btcDominance + '%');
            } else {
                console.log('⚠️ Dominância BTC NÃO encontrada nas propriedades diretas');
                
                // Mostrar estrutura completa para análise
                console.log('\n📊 ESTRUTURA COMPLETA DA RESPOSTA:');
                console.log(JSON.stringify(jsonData, null, 2));
            }
            
            console.log('\n🎯 RESULTADO:');
            console.log('Dominância BTC:', btcDominance ? (btcDominance + (typeof btcDominance === 'number' && btcDominance < 1 ? '*100 = ' + (btcDominance * 100).toFixed(2) + '%' : '%')) : 'NÃO ENCONTRADA');
            
            console.log('\n🔥 TESTE CONCLUÍDO!');
            
        } catch (parseError) {
            console.error('❌ Erro ao parsear JSON:', parseError.message);
            console.log('Raw data:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Erro na requisição:', error.message);
});

req.setTimeout(15000, () => {
    console.error('❌ Timeout na requisição');
    req.destroy();
});

req.end();
