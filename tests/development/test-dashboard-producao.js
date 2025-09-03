const https = require('https');

/**
 * Teste rápido do dashboard em produção
 */

const testURL = 'https://coinbitclub-market-bot-production.up.railway.app';

console.log('🧪 TESTANDO DASHBOARD EM PRODUÇÃO');
console.log('================================');
console.log('🌐 URL:', testURL);
console.log('');

// Teste da rota principal
function testMainRoute() {
    return new Promise((resolve, reject) => {
        console.log('📍 Testando rota principal (/)...');
        
        const req = https.get(testURL + '/', (res) => {
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('   ✅ Dashboard carregado com sucesso!');
                    console.log(`   📄 Tamanho do HTML: ${data.length} bytes`);
                    resolve(data);
                } else {
                    console.log('   ❌ Erro no dashboard');
                    console.log(`   📄 Resposta: ${data.substring(0, 200)}...`);
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('   ❌ Erro de conexão:', error.message);
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            console.log('   ⏰ Timeout após 10s');
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// Teste da API de sinais
function testSignalsAPI() {
    return new Promise((resolve, reject) => {
        console.log('📍 Testando API de sinais (/api/dashboard/signals)...');
        
        const req = https.get(testURL + '/api/dashboard/signals', (res) => {
            console.log(`   Status: ${res.statusCode}`);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log('   ✅ API de sinais funcionando!');
                    console.log(`   📊 Dados: recebidos=${json.data?.recebidos}, processados=${json.data?.processados}`);
                    resolve(json);
                } catch (error) {
                    console.log('   ❌ Erro no JSON da API');
                    console.log(`   📄 Resposta: ${data.substring(0, 200)}...`);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('   ❌ Erro de conexão:', error.message);
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            console.log('   ⏰ Timeout após 10s');
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// Executar testes
async function runTests() {
    try {
        await testMainRoute();
        console.log('');
        await testSignalsAPI();
        console.log('');
        console.log('🎉 TODOS OS TESTES PASSARAM!');
        console.log('🔗 Dashboard disponível em:', testURL);
        
    } catch (error) {
        console.log('');
        console.log('❌ FALHA NOS TESTES:', error.message);
        console.log('🔧 Verificar logs do Railway para mais detalhes');
    }
}

runTests();
