/**
 * 🚀 TESTE DIRETO DO WEBHOOK - Bypass do Aviso Ngrok
 * 
 * Este script testa diretamente o webhook mesmo com o aviso do Ngrok
 * usando os headers corretos para bypass.
 */

const axios = require('axios');

async function testarWebhookSemAviso() {
    console.log('🔧 TESTANDO WEBHOOK COM BYPASS DO AVISO NGROK...\n');
    
    const ngrokUrl = 'https://aa03e238ea55.ngrok-free.app';
    const endpoints = [
        '/webhook/tradingview',
        '/webhook/test',
        '/api/health'
    ];
    
    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'TradingView-Webhook',
        'Accept': 'application/json'
    };
    
    console.log('📡 Headers de Bypass:');
    console.log(JSON.stringify(headers, null, 2));
    console.log('\n' + '='.repeat(50) + '\n');
    
    for (const endpoint of endpoints) {
        try {
            console.log(`🎯 Testando: ${ngrokUrl}${endpoint}`);
            
            const response = await axios.post(`${ngrokUrl}${endpoint}`, {
                symbol: 'BTCUSDT',
                side: 'buy',
                action: 'test',
                timestamp: Date.now()
            }, { 
                headers,
                timeout: 10000,
                validateStatus: () => true // Aceita qualquer status
            });
            
            console.log(`✅ Status: ${response.status}`);
            console.log(`📝 Response: ${JSON.stringify(response.data, null, 2)}`);
            
        } catch (error) {
            if (error.response) {
                console.log(`⚠️  HTTP Error: ${error.response.status}`);
                console.log(`📝 Response: ${JSON.stringify(error.response.data, null, 2)}`);
            } else {
                console.log(`❌ Erro: ${error.message}`);
            }
        }
        
        console.log('\n' + '-'.repeat(30) + '\n');
    }
    
    console.log('🎯 INSTRUÇÕES PARA O TRADINGVIEW:');
    console.log('1. URL do Webhook: ' + ngrokUrl + '/webhook/tradingview');
    console.log('2. Adicione estes headers no TradingView:');
    console.log('   ngrok-skip-browser-warning: true');
    console.log('   User-Agent: TradingView-Webhook');
    console.log('3. Formato do JSON:');
    console.log(JSON.stringify({
        symbol: '{{ticker}}',
        side: '{{strategy.order.action}}',
        action: 'signal',
        price: '{{close}}',
        time: '{{time}}'
    }, null, 2));
}

// Executar teste
if (require.main === module) {
    testarWebhookSemAviso()
        .then(() => {
            console.log('\n🏁 Teste concluído!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erro no teste:', error.message);
            process.exit(1);
        });
}

module.exports = { testarWebhookSemAviso };
