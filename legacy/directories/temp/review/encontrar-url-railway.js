/**
 * 🔍 LOCALIZADOR DE URL RAILWAY
 * Tenta encontrar a URL correta do Railway testando várias possibilidades
 */

const axios = require('axios');

async function encontrarURLRailway() {
    console.log('🔍 LOCALIZANDO URL CORRETA DO RAILWAY');
    console.log('===================================');
    
    // URLs possíveis baseadas nos arquivos encontrados
    const urlsCandidatas = [
        'https://coinbitclub-market-bot-production.up.railway.app',
        'https://coinbitclub-market-bot-backend-production.up.railway.app',
        'https://coinbitclub-market-bot.up.railway.app',
        'https://coinbitclub-backend.railway.app',
        'https://coinbitclub-market-bot.railway.app',
        'https://web-production-a1b2c3.up.railway.app',
        'https://backend-production.up.railway.app'
    ];
    
    let urlCorreta = null;
    
    for (const url of urlsCandidatas) {
        try {
            console.log(`🔍 Testando: ${url}`);
            
            const response = await axios.get(url, { 
                timeout: 8000,
                validateStatus: status => status < 500 // Aceitar até 4xx
            });
            
            console.log(`✅ ENCONTRADA! ${url} - Status: ${response.status}`);
            console.log(`📊 Content-Type: ${response.headers['content-type']}`);
            
            // Testar health check se disponível
            try {
                const healthResponse = await axios.get(`${url}/health`, { timeout: 5000 });
                console.log(`❤️ Health check: ${healthResponse.status} - ${JSON.stringify(healthResponse.data)}`);
            } catch (healthError) {
                console.log(`⚠️ Health check falhou: ${healthError.message}`);
            }
            
            urlCorreta = url;
            break;
            
        } catch (error) {
            console.log(`❌ ${url}: ${error.message}`);
        }
    }
    
    if (urlCorreta) {
        console.log(`\n🎉 URL RAILWAY ENCONTRADA: ${urlCorreta}`);
        
        // Agora testar endpoints críticos na URL correta
        console.log('\n🎯 Testando endpoints críticos...');
        
        const endpoints = ['/health', '/', '/api/system/status', '/api/current-mode', '/ativar-chaves-reais'];
        
        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${urlCorreta}${endpoint}`, {
                    timeout: 5000,
                    validateStatus: status => status < 500
                });
                
                const sucesso = response.status < 400;
                console.log(`${sucesso ? '✅' : '❌'} ${endpoint}: ${response.status}`);
                
                if (sucesso && response.data) {
                    const preview = JSON.stringify(response.data).substring(0, 100);
                    console.log(`   📊 Data: ${preview}${JSON.stringify(response.data).length > 100 ? '...' : ''}`);
                }
                
            } catch (error) {
                console.log(`❌ ${endpoint}: ${error.message}`);
            }
        }
        
        return urlCorreta;
        
    } else {
        console.log('\n❌ NENHUMA URL RAILWAY ENCONTRADA!');
        console.log('🔧 Possíveis soluções:');
        console.log('1. Verificar se o deploy foi feito');
        console.log('2. Verificar logs do Railway');
        console.log('3. Verificar se o projeto está ativo');
        
        return null;
    }
}

// Executar
encontrarURLRailway().then(url => {
    if (url) {
        console.log(`\n📋 Use esta URL nos testes: ${url}`);
    }
}).catch(error => {
    console.error('❌ Erro ao localizar URL:', error.message);
});
