/**
 * TESTE COMPLETO DOS ENDPOINTS CORRIGIDOS
 * =======================================
 * Este script testa todos os endpoints para garantir que os 404s foram resolvidos
 */

const http = require('http');

// Configuração do teste
const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 5000;

// Lista de endpoints para testar
const ENDPOINTS_TO_TEST = [
    // Endpoints críticos que estavam com 404
    { method: 'GET', path: '/health', description: 'Health Check' },
    { method: 'GET', path: '/status', description: 'Status Principal' },
    { method: 'GET', path: '/api/system/status', description: 'API System Status' },
    { method: 'GET', path: '/api/dashboard/summary', description: 'Dashboard Summary' },
    
    // Webhooks que estavam falhando
    { method: 'GET', path: '/api/webhooks/signal', description: 'Webhook Signal (GET)' },
    { method: 'POST', path: '/api/webhooks/signal', description: 'Webhook Signal (POST)', body: { test: 'signal', symbol: 'BTCUSDT', action: 'BUY' } },
    { method: 'GET', path: '/webhook', description: 'Webhook Geral (GET)' },
    { method: 'POST', path: '/webhook', description: 'Webhook Geral (POST)', body: { test: 'webhook' } },
    { method: 'GET', path: '/api/webhooks/trading', description: 'Trading Webhook (GET)' },
    { method: 'POST', path: '/api/webhooks/trading', description: 'Trading Webhook (POST)', body: { test: 'trading' } },
    
    // Endpoints adicionais
    { method: 'GET', path: '/', description: 'Dashboard Principal' },
    { method: 'GET', path: '/api/test', description: 'API Test' }
];

// Função para fazer uma requisição HTTP
function makeRequest(endpoint) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: endpoint.path,
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CoinBitClub-Test-Suite'
            },
            timeout: TIMEOUT
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', chunk => {
                data += chunk;
            });
            
            res.on('end', () => {
                let parsedData = null;
                try {
                    parsedData = JSON.parse(data);
                } catch (e) {
                    parsedData = data.substring(0, 100) + (data.length > 100 ? '...' : '');
                }
                
                resolve({
                    success: true,
                    status: res.statusCode,
                    data: parsedData,
                    headers: res.headers
                });
            });
        });

        req.on('error', (err) => {
            resolve({
                success: false,
                error: err.message,
                status: 'ERROR'
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout',
                status: 'TIMEOUT'
            });
        });

        // Enviar body se for POST
        if (endpoint.body && endpoint.method === 'POST') {
            req.write(JSON.stringify(endpoint.body));
        }

        req.end();
    });
}

// Função para aguardar o servidor estar pronto
async function waitForServer(maxAttempts = 10) {
    console.log('🔍 Aguardando servidor estar disponível...');
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const result = await makeRequest({ method: 'GET', path: '/health' });
            if (result.success && result.status === 200) {
                console.log('✅ Servidor está pronto!');
                return true;
            }
        } catch (error) {
            // Ignorar erro e tentar novamente
        }
        
        console.log(`⏳ Tentativa ${i + 1}/${maxAttempts} - aguardando...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('❌ Servidor não ficou disponível após tentativas');
    return false;
}

// Função principal de teste
async function runTests() {
    console.log('🧪 TESTE COMPLETO DE ENDPOINTS CORRIGIDOS');
    console.log('==========================================');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`🕐 Timeout: ${TIMEOUT}ms`);
    console.log('');

    // Aguardar servidor estar pronto
    const serverReady = await waitForServer();
    if (!serverReady) {
        console.log('❌ Não foi possível conectar ao servidor');
        console.log('💡 Certifique-se de que o servidor está rodando na porta 3000');
        return;
    }

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const results = [];

    console.log('🚀 Iniciando testes dos endpoints...');
    console.log('');

    for (const endpoint of ENDPOINTS_TO_TEST) {
        totalTests++;
        console.log(`🔍 Testando: ${endpoint.method} ${endpoint.path}`);
        console.log(`   📋 ${endpoint.description}`);

        const startTime = Date.now();
        const result = await makeRequest(endpoint);
        const duration = Date.now() - startTime;

        if (result.success) {
            if (result.status === 200) {
                console.log(`   ✅ SUCESSO (${result.status}) - ${duration}ms`);
                passedTests++;
                results.push({ endpoint, status: 'PASS', httpStatus: result.status, duration });
            } else {
                console.log(`   ⚠️  STATUS ${result.status} - ${duration}ms`);
                failedTests++;
                results.push({ endpoint, status: 'WARN', httpStatus: result.status, duration });
            }
            
            // Mostrar dados da resposta para endpoints críticos
            if (endpoint.path.includes('/health') || endpoint.path.includes('/status')) {
                if (typeof result.data === 'object' && result.data.status) {
                    console.log(`   📊 Status: ${result.data.status}, Mode: ${result.data.mode || 'N/A'}`);
                }
            }
        } else {
            console.log(`   ❌ FALHA: ${result.error}`);
            failedTests++;
            results.push({ endpoint, status: 'FAIL', error: result.error, duration });
        }
        
        console.log('');
        
        // Pequena pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Relatório final
    console.log('📊 RELATÓRIO FINAL');
    console.log('==================');
    console.log(`📈 Total de testes: ${totalTests}`);
    console.log(`✅ Sucessos: ${passedTests}`);
    console.log(`❌ Falhas: ${failedTests}`);
    console.log(`📊 Taxa de sucesso: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log('');

    // Análise específica dos problemas anteriores
    console.log('🎯 ANÁLISE DOS PROBLEMAS ANTERIORES:');
    console.log('====================================');
    
    const criticalEndpoints = ['/status', '/api/dashboard/summary', '/api/webhooks/signal'];
    const criticalResults = results.filter(r => 
        criticalEndpoints.some(critical => r.endpoint.path === critical)
    );
    
    let allCriticalFixed = true;
    criticalResults.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${result.endpoint.path} - ${result.status}`);
        if (result.status !== 'PASS') allCriticalFixed = false;
    });
    
    console.log('');
    if (allCriticalFixed) {
        console.log('🎉 TODOS OS PROBLEMAS CRÍTICOS FORAM RESOLVIDOS!');
        console.log('✅ Endpoints 404 corrigidos');
        console.log('✅ Webhook signals funcionais');
        console.log('✅ Dashboard acessível');
        console.log('');
        console.log('🚀 PRONTO PARA DEPLOY NA RAILWAY!');
    } else {
        console.log('⚠️ Ainda há problemas que precisam ser resolvidos antes do deploy');
    }
    
    // Salvar relatório
    const report = {
        timestamp: new Date().toISOString(),
        totalTests,
        passedTests,
        failedTests,
        successRate: Math.round((passedTests / totalTests) * 100),
        results,
        criticalEndpointsFixed: allCriticalFixed
    };
    
    require('fs').writeFileSync('test-report.json', JSON.stringify(report, null, 2));
    console.log('📝 Relatório detalhado salvo em: test-report.json');
}

// Executar testes
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, makeRequest, waitForServer };
