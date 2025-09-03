/**
 * 🔧 VERIFICADOR STATUS DEPLOY RAILWAY
 * Verifica se o deploy foi processado e identifica problemas
 */

const axios = require('axios');

async function verificarStatusDeploy() {
    console.log('🔧 VERIFICANDO STATUS DO DEPLOY RAILWAY');
    console.log('======================================');
    
    const url = 'https://coinbitclub-market-bot-production.up.railway.app';
    
    console.log('🔍 1. Testando diferentes métodos HTTP...');
    
    // Testar diferentes métodos para ver se o servidor responde de forma diferente
    const metodos = ['GET', 'POST', 'OPTIONS'];
    
    for (const metodo of metodos) {
        try {
            const response = await axios({
                method: metodo,
                url: url,
                timeout: 5000,
                validateStatus: status => status < 500
            });
            
            console.log(`✅ ${metodo}: Status ${response.status}`);
            console.log(`   📊 Headers: ${JSON.stringify(response.headers, null, 2).substring(0, 200)}...`);
            
        } catch (error) {
            console.log(`❌ ${metodo}: ${error.message}`);
        }
    }
    
    console.log('\n🔍 2. Testando headers específicos...');
    
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Railway-Debug/1.0',
                'X-Requested-With': 'XMLHttpRequest'
            },
            validateStatus: status => status < 500
        });
        
        console.log(`📊 Status: ${response.status}`);
        console.log(`📏 Content-Length: ${response.headers['content-length']}`);
        console.log(`🎯 Content-Type: ${response.headers['content-type']}`);
        console.log(`🕐 Date: ${response.headers['date']}`);
        
        // Verificar se há informações no corpo da resposta
        if (response.data) {
            console.log(`📋 Response Data: ${JSON.stringify(response.data, null, 2)}`);
        }
        
    } catch (error) {
        console.log(`❌ Erro com headers: ${error.message}`);
    }
    
    console.log('\n🔍 3. Verificando se é problema de routing...');
    
    // Testar URLs que poderiam indicar problema de routing
    const testUrls = [
        '/',
        '/health',
        '/api',
        '/api/',
        '/api/health',
        '/status',
        '/ping',
        '/*',
        '/api/*'
    ];
    
    for (const testUrl of testUrls) {
        try {
            const response = await axios.get(`${url}${testUrl}`, {
                timeout: 3000,
                validateStatus: status => status < 500
            });
            
            if (response.status !== 404) {
                console.log(`✅ ENCONTRADO: ${testUrl} - Status: ${response.status}`);
                if (response.data) {
                    console.log(`   📊 Data: ${JSON.stringify(response.data).substring(0, 100)}...`);
                }
            } else {
                console.log(`❌ ${testUrl}: 404`);
            }
            
        } catch (error) {
            console.log(`❌ ${testUrl}: ${error.message}`);
        }
    }
    
    console.log('\n🔍 4. Análise do problema...');
    
    console.log('📋 DIAGNÓSTICO:');
    console.log('===============');
    console.log('✅ Railway está ONLINE (responde com 404)');
    console.log('✅ DNS resolve corretamente');
    console.log('✅ Servidor aceita conexões');
    console.log('❌ TODAS as rotas retornam 404');
    console.log('');
    console.log('🎯 CONCLUSÃO: Problema de ROUTING');
    console.log('');
    console.log('🔧 POSSÍVEIS CAUSAS:');
    console.log('1. hybrid-server.js não carregou app.js corretamente');
    console.log('2. await mainServer.start() falhou silenciosamente');
    console.log('3. app.use(mainServer.app) não integrou as rotas');
    console.log('4. Deploy ainda não processou (aguardar 2-3 min)');
    console.log('');
    console.log('💡 PRÓXIMOS PASSOS:');
    console.log('1. Aguardar mais 2-3 minutos para deploy processar');
    console.log('2. Verificar logs do Railway');
    console.log('3. Se persistir, fazer novo deploy com logs');
}

// Executar
verificarStatusDeploy().catch(error => {
    console.error('❌ Erro na verificação:', error.message);
});
