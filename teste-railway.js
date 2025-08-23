/**
 * 🚀 TESTE DIRETO DO RAILWAY - SEM NGROK
 * 
 * Este script testa diretamente o Railway que já está funcionando
 * e não precisa do Ngrok nem de authtokens.
 */

const axios = require('axios');

async function testarRailway() {
    console.log('🚀 TESTANDO RAILWAY (SEM NGROK)...\n');
    
    const railwayUrl = 'https://coinbitclub-market-bot-backend-production.up.railway.app';
    
    const endpoints = [
        '/api/health',
        '/webhook/tradingview',
        '/webhook/test',
        '/api/status'
    ];
    
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'TradingView-Webhook',
        'Accept': 'application/json'
    };
    
    console.log('🌐 URL do Railway:', railwayUrl);
    console.log('📡 Headers:', JSON.stringify(headers, null, 2));
    console.log('\n' + '='.repeat(60) + '\n');
    
    for (const endpoint of endpoints) {
        try {
            console.log(`🎯 Testando: ${railwayUrl}${endpoint}`);
            
            const response = await axios.post(`${railwayUrl}${endpoint}`, {
                symbol: 'BTCUSDT',
                side: 'buy',
                action: 'test',
                timestamp: Date.now(),
                source: 'railway_test'
            }, { 
                headers,
                timeout: 15000,
                validateStatus: () => true
            });
            
            console.log(`✅ Status: ${response.status}`);
            
            if (response.data) {
                console.log(`📝 Response:`, JSON.stringify(response.data, null, 2));
            }
            
            if (response.status === 200) {
                console.log(`🎉 SUCESSO: ${endpoint} está funcionando!`);
            }
            
        } catch (error) {
            if (error.response) {
                console.log(`⚠️  HTTP Error: ${error.response.status}`);
                console.log(`📝 Response:`, JSON.stringify(error.response.data, null, 2));
            } else if (error.code === 'ECONNREFUSED') {
                console.log(`❌ Conexão recusada - Railway pode estar offline`);
            } else {
                console.log(`❌ Erro: ${error.message}`);
            }
        }
        
        console.log('\n' + '-'.repeat(40) + '\n');
    }
    
    console.log('🎯 CONFIGURAÇÃO TRADINGVIEW (RAILWAY):');
    console.log('='.repeat(40));
    console.log('🔗 URL do Webhook:');
    console.log(`   ${railwayUrl}/webhook/tradingview`);
    console.log('\n📡 Headers:');
    console.log('   Content-Type: application/json');
    console.log('   User-Agent: TradingView-Webhook');
    console.log('\n📝 Payload JSON:');
    console.log(JSON.stringify({
        symbol: '{{ticker}}',
        side: '{{strategy.order.action}}',
        action: 'signal',
        price: '{{close}}',
        time: '{{time}}',
        strategy: '{{strategy.order.comment}}'
    }, null, 2));
    
    console.log('\n🔧 CURL de Teste:');
    console.log(`curl -X POST "${railwayUrl}/webhook/tradingview" \\`);
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "User-Agent: TradingView-Webhook" \\');
    console.log('  -d \'{"symbol":"BTCUSDT","side":"buy","action":"test"}\'');
    
    console.log('\n✅ VANTAGENS DO RAILWAY:');
    console.log('  • Sem avisos de navegador');
    console.log('  • IP fixo e confiável');
    console.log('  • Sem limitações de tempo');
    console.log('  • Não precisa de authtoken');
    console.log('  • Deploy automático do GitHub');
}

// Executar teste
if (require.main === module) {
    testarRailway()
        .then(() => {
            console.log('\n🏁 Teste Railway concluído!');
            console.log('💡 Use o Railway em vez do Ngrok para produção!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erro no teste:', error.message);
            process.exit(1);
        });
}

module.exports = { testarRailway };
