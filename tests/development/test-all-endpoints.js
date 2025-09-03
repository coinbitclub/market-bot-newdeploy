#!/usr/bin/env node

/**
 * 🧪 TESTADOR COMPLETO DE ENDPOINTS - COINBITCLUB ENTERPRISE
 * ==========================================================
 * 
 * Testa todos os endpoints garantindo código 200 e sem erros
 */

const axios = require('axios');
const fs = require('fs');

// Configuração do teste
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 segundos

console.log('🧪 TESTADOR COMPLETO DE ENDPOINTS ENTERPRISE');
console.log('============================================');
console.log(`🎯 Base URL: ${BASE_URL}`);
console.log(`⏱️ Timeout: ${TIMEOUT}ms`);
console.log('');

// Lista de endpoints ESSENCIAIS que devem funcionar
const ESSENTIAL_ENDPOINTS = [
    // BÁSICOS (4)
    { method: 'GET', path: '/health', category: 'Basic', name: 'Health Check', critical: true },
    { method: 'GET', path: '/status', category: 'Basic', name: 'System Status', critical: true },
    { method: 'GET', path: '/api/test-connection', category: 'Basic', name: 'Database Test', critical: true },
    { method: 'GET', path: '/api/users', category: 'Basic', name: 'Users Count', critical: true },

    // DASHBOARD (8)
    { method: 'GET', path: '/api/dashboard/summary', category: 'Dashboard', name: 'Dashboard Summary', critical: true },
    { method: 'GET', path: '/api/dashboard/realtime', category: 'Dashboard', name: 'Realtime Data', critical: true },
    { method: 'GET', path: '/api/dashboard/signals', category: 'Dashboard', name: 'Signals Data', critical: true },
    { method: 'GET', path: '/api/dashboard/orders', category: 'Dashboard', name: 'Orders Data', critical: true },
    { method: 'GET', path: '/api/dashboard/users', category: 'Dashboard', name: 'Users Data', critical: true },
    { method: 'GET', path: '/api/dashboard/balances', category: 'Dashboard', name: 'Balances Data', critical: true },
    { method: 'GET', path: '/api/dashboard/admin-logs', category: 'Dashboard', name: 'Admin Logs', critical: true },
    { method: 'GET', path: '/api/dashboard/ai-analysis', category: 'Dashboard', name: 'AI Analysis', critical: true },

    // WEBHOOKS (4)
    { method: 'GET', path: '/webhook', category: 'Webhooks', name: 'Webhook Info', critical: true },
    { method: 'POST', path: '/webhook', category: 'Webhooks', name: 'Webhook POST', critical: true, data: { signal: 'BUY', symbol: 'BTCUSDT' } },
    { method: 'GET', path: '/api/webhooks/signal', category: 'Webhooks', name: 'Signal API Info', critical: true },
    { method: 'POST', path: '/api/webhooks/signal', category: 'Webhooks', name: 'Signal API POST', critical: true, data: { signal: 'SELL', symbol: 'ETHUSDT' } },

    // EXCHANGES & TRADING (2)
    { method: 'GET', path: '/api/exchanges/status', category: 'Trading', name: 'Exchanges Status', critical: true },
    { method: 'GET', path: '/api/trade/status', category: 'Trading', name: 'Trading Status', critical: true }
];

// Resultados dos testes
let results = {
    total: ESSENTIAL_ENDPOINTS.length,
    passed: 0,
    failed: 0,
    errors: [],
    byCategory: {}
};

// Função para fazer requisição HTTP
async function makeRequest(endpoint) {
    try {
        const config = {
            method: endpoint.method.toLowerCase(),
            url: `${BASE_URL}${endpoint.path}`,
            timeout: TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CoinBitClub-EndpointTester/1.0'
            }
        };

        // Adicionar dados se for POST/PUT
        if (endpoint.data && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
            config.data = endpoint.data;
        }

        const response = await axios(config);
        
        return {
            success: true,
            status: response.status,
            data: response.data,
            responseTime: response.headers['response-time'] || 'N/A'
        };

    } catch (error) {
        return {
            success: false,
            status: error.response?.status || 0,
            error: error.message,
            code: error.code
        };
    }
}

// Função para testar um endpoint
async function testEndpoint(endpoint, index) {
    const paddedIndex = String(index + 1).padStart(2, '0');
    const paddedCategory = endpoint.category.padEnd(12, ' ');
    const criticalIcon = endpoint.critical ? '🔥' : '📌';
    
    console.log(`${paddedIndex}. ${criticalIcon} [${paddedCategory}] ${endpoint.method.padEnd(4)} ${endpoint.path}`);
    
    const result = await makeRequest(endpoint);
    
    // Inicializar categoria se não existir
    if (!results.byCategory[endpoint.category]) {
        results.byCategory[endpoint.category] = { passed: 0, failed: 0, total: 0 };
    }
    results.byCategory[endpoint.category].total++;
    
    if (result.success && result.status === 200) {
        console.log(`    ✅ PASS - Status: ${result.status} - Response: ${result.responseTime}`);
        
        // Validar conteúdo da resposta para endpoints críticos
        if (endpoint.critical && result.data) {
            if (typeof result.data === 'object') {
                const hasValidData = result.data.status || result.data.success || result.data.data || result.data.timestamp;
                if (hasValidData) {
                    console.log(`    📊 Dados válidos retornados`);
                } else {
                    console.log(`    ⚠️ Resposta sem dados esperados`);
                }
            }
        }
        
        results.passed++;
        results.byCategory[endpoint.category].passed++;
    } else {
        const errorMsg = result.error || `HTTP ${result.status}`;
        console.log(`    ❌ FAIL - ${errorMsg}`);
        results.failed++;
        results.byCategory[endpoint.category].failed++;
        
        results.errors.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            category: endpoint.category,
            name: endpoint.name,
            error: errorMsg,
            status: result.status,
            critical: endpoint.critical || false
        });
    }
    
    console.log('');
}

// Função principal de teste
async function runAllTests() {
    console.log(`🚀 Iniciando teste de ${ESSENTIAL_ENDPOINTS.length} endpoints essenciais...`);
    console.log('');
    
    const startTime = Date.now();
    
    // Verificar se servidor está rodando
    console.log('� Verificando se servidor está acessível...');
    try {
        const healthCheck = await makeRequest({ method: 'GET', path: '/health' });
        if (healthCheck.success) {
            console.log('✅ Servidor está respondendo!');
        } else {
            console.log('❌ Servidor não está respondendo - continuando testes...');
        }
    } catch (error) {
        console.log('⚠️ Não foi possível verificar status do servidor - continuando...');
    }
    console.log('');
    
    // Testar cada endpoint sequencialmente
    for (let i = 0; i < ESSENTIAL_ENDPOINTS.length; i++) {
        await testEndpoint(ESSENTIAL_ENDPOINTS[i], i);
        
        // Pequena pausa entre requisições
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    // Relatório final
    console.log('🏁 RELATÓRIO FINAL');
    console.log('=================');
    console.log(`⏱️ Tempo total: ${totalTime}s`);
    console.log(`📊 Total: ${results.total}`);
    console.log(`✅ Passou: ${results.passed}`);
    console.log(`❌ Falhou: ${results.failed}`);
    console.log(`📈 Taxa de sucesso: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('');
    
    // Análise de endpoints críticos
    const criticalErrors = results.errors.filter(error => error.critical);
    console.log('🔥 ANÁLISE DE ENDPOINTS CRÍTICOS:');
    console.log(`� Críticos total: ${ESSENTIAL_ENDPOINTS.filter(e => e.critical).length}`);
    console.log(`❌ Críticos com falha: ${criticalErrors.length}`);
    console.log(`📈 Taxa crítica: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('');
    
    // Relatório por categoria
    console.log('📋 RELATÓRIO POR CATEGORIA:');
    for (const [category, stats] of Object.entries(results.byCategory)) {
        const percentage = ((stats.passed / stats.total) * 100).toFixed(0);
        const status = stats.failed === 0 ? '✅' : stats.passed > stats.failed ? '⚠️' : '❌';
        console.log(`${status} ${category.padEnd(15)} ${stats.passed}/${stats.total} (${percentage}%)`);
    }
    console.log('');
    
    // Listar erros críticos se houver
    if (criticalErrors.length > 0) {
        console.log('🚨 ENDPOINTS CRÍTICOS COM PROBLEMAS:');
        console.log('====================================');
        
        criticalErrors.forEach((error, index) => {
            console.log(`${index + 1}. ${error.endpoint}`);
            console.log(`   Nome: ${error.name}`);
            console.log(`   Erro: ${error.error}`);
            console.log('');
        });
    }
    
    // Status final
    const allCriticalPassed = criticalErrors.length === 0;
    const successRate = (results.passed / results.total) * 100;
    
    if (allCriticalPassed && successRate >= 95) {
        console.log('🎉 TODOS OS ENDPOINTS CRÍTICOS FUNCIONANDO!');
        console.log('✅ SISTEMA PRONTO PARA DEPLOY NO RAILWAY!');
        console.log('');
        console.log('📋 PRÓXIMOS PASSOS:');
        console.log('1. git add .');
        console.log('2. git commit -m "🎯 FIX: All critical endpoints working"');
        console.log('3. git push origin main');
        process.exit(0);
    } else if (allCriticalPassed) {
        console.log('⚠️ ENDPOINTS CRÍTICOS OK, mas alguns não-críticos falharam.');
        console.log('💚 SISTEMA PODE SER DEPLOYADO NO RAILWAY!');
        process.exit(0);
    } else {
        console.log(`❌ ${criticalErrors.length} endpoints críticos falharam.`);
        console.log('🔧 CORRIJA OS PROBLEMAS ANTES DO DEPLOY!');
        process.exit(1);
    }
}

// Função para verificar se servidor está rodando
async function checkServerStatus() {
    try {
        const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

// Iniciar testes
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('💥 Erro fatal no testador:', error.message);
        process.exit(1);
    });
}

module.exports = { runAllTests, ESSENTIAL_ENDPOINTS, checkServerStatus };

// Função para fazer uma requisição HTTP
function makeRequest(endpoint) {
    return new Promise((resolve) => {
        const options = {
            hostname: BASE_URL,
            port: PORT,
            path: endpoint.path,
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CoinBitClub-Complete-Test-Suite/1.0',
                'Accept': endpoint.isHTML ? 'text/html,application/xhtml+xml' : 'application/json'
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
                let parseError = null;
                
                try {
                    if (!endpoint.isHTML && data.trim()) {
                        parsedData = JSON.parse(data);
                    } else {
                        parsedData = data;
                    }
                } catch (e) {
                    parseError = e.message;
                    parsedData = data.substring(0, 200) + (data.length > 200 ? '...' : '');
                }
                
                resolve({
                    success: true,
                    status: res.statusCode,
                    data: parsedData,
                    headers: res.headers,
                    parseError,
                    dataSize: data.length
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
        if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
            req.write(JSON.stringify(endpoint.body));
        }

        req.end();
    });
}

// Função para verificar se servidor está rodando
async function checkServer() {
    console.log('🔍 Verificando se servidor está rodando...');
    
    try {
        const result = await makeRequest({ method: 'GET', path: '/health' });
        if (result.success && result.status === 200) {
            console.log('✅ Servidor está rodando e respondendo!');
            return true;
        } else {
            console.log('❌ Servidor não está respondendo adequadamente');
            return false;
        }
    } catch (error) {
        console.log('❌ Erro ao conectar com servidor:', error.message);
        return false;
    }
}

// Função para validar resposta
function validateResponse(endpoint, result) {
    const validations = {
        statusOk: false,
        hasExpectedFields: false,
        parseOk: false,
        details: []
    };

    // Verificar status HTTP
    if (endpoint.shouldFail) {
        validations.statusOk = result.status === endpoint.expectedStatus;
        if (!validations.statusOk) {
            validations.details.push(`Expected ${endpoint.expectedStatus}, got ${result.status}`);
        }
    } else {
        validations.statusOk = result.status === endpoint.expectedStatus;
        if (!validations.statusOk) {
            validations.details.push(`Expected ${endpoint.expectedStatus}, got ${result.status}`);
        }
    }

    // Verificar parsing (se não for HTML)
    if (!endpoint.isHTML && !result.parseError) {
        validations.parseOk = true;
    } else if (endpoint.isHTML) {
        validations.parseOk = true; // HTML não precisa parsing JSON
    } else {
        validations.details.push(`Parse error: ${result.parseError}`);
    }

    // Verificar campos esperados (só para JSON)
    if (endpoint.expectedFields && !endpoint.isHTML && typeof result.data === 'object') {
        const missingFields = endpoint.expectedFields.filter(field => !(field in result.data));
        validations.hasExpectedFields = missingFields.length === 0;
        if (!validations.hasExpectedFields) {
            validations.details.push(`Missing fields: ${missingFields.join(', ')}`);
        }
    } else if (!endpoint.expectedFields) {
        validations.hasExpectedFields = true; // Não há campos obrigatórios
    } else {
        validations.hasExpectedFields = true; // HTML ou outras situações
    }

    return validations;
}

// Função principal de teste
async function runAllTests() {
    console.log('🧪 TESTE COMPLETO DE TODOS OS ENDPOINTS');
    console.log('========================================');
    console.log(`📍 Servidor: ${BASE_URL}:${PORT}`);
    console.log(`🕐 Timeout: ${TIMEOUT}ms`);
    console.log(`📊 Total de endpoints: ${ALL_ENDPOINTS.length}`);
    console.log('');

    // Verificar se servidor está rodando
    const serverRunning = await checkServer();
    if (!serverRunning) {
        console.log('❌ TESTE ABORTADO: Servidor não está rodando');
        console.log('💡 Execute: node hybrid-server.js em outro terminal');
        return;
    }

    console.log('🚀 Iniciando testes...');
    console.log('');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let criticalPassed = 0;
    let criticalFailed = 0;
    const results = [];

    for (const endpoint of ALL_ENDPOINTS) {
        totalTests++;
        const criticalIcon = endpoint.critical ? '🔥' : '📌';
        const shouldFailIcon = endpoint.shouldFail ? '🔍' : '';
        
        console.log(`${criticalIcon}${shouldFailIcon} Testando: ${endpoint.method} ${endpoint.path}`);
        console.log(`   📋 ${endpoint.description}`);

        const startTime = Date.now();
        const result = await makeRequest(endpoint);
        const duration = Date.now() - startTime;

        if (result.success) {
            const validation = validateResponse(endpoint, result);
            const allValid = validation.statusOk && validation.hasExpectedFields && validation.parseOk;
            
            if (allValid) {
                console.log(`   ✅ SUCESSO (${result.status}) - ${duration}ms`);
                passedTests++;
                if (endpoint.critical) criticalPassed++;
                
                // Mostrar dados importantes para endpoints críticos
                if (endpoint.critical && !endpoint.isHTML && typeof result.data === 'object') {
                    if (result.data.status) console.log(`      Status: ${result.data.status}`);
                    if (result.data.mode) console.log(`      Mode: ${result.data.mode}`);
                    if (result.data.summary) console.log(`      Summary: ✓`);
                }
                
                results.push({ 
                    endpoint, 
                    status: 'PASS', 
                    httpStatus: result.status, 
                    duration,
                    dataSize: result.dataSize 
                });
            } else {
                console.log(`   ⚠️  PARCIAL (${result.status}) - ${duration}ms`);
                validation.details.forEach(detail => console.log(`      ⚠️ ${detail}`));
                failedTests++;
                if (endpoint.critical) criticalFailed++;
                
                results.push({ 
                    endpoint, 
                    status: 'PARTIAL', 
                    httpStatus: result.status, 
                    duration,
                    validation,
                    dataSize: result.dataSize
                });
            }
        } else {
            console.log(`   ❌ FALHA: ${result.error}`);
            failedTests++;
            if (endpoint.critical) criticalFailed++;
            
            results.push({ 
                endpoint, 
                status: 'FAIL', 
                error: result.error, 
                duration 
            });
        }
        
        console.log('');
        
        // Pequena pausa entre requests para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Relatório final detalhado
    console.log('📊 RELATÓRIO FINAL COMPLETO');
    console.log('===========================');
    console.log(`📈 Total de testes: ${totalTests}`);
    console.log(`✅ Sucessos: ${passedTests}`);
    console.log(`❌ Falhas: ${failedTests}`);
    console.log(`📊 Taxa de sucesso geral: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log('');
    console.log(`🔥 Endpoints críticos: ${criticalPassed + criticalFailed}`);
    console.log(`🔥✅ Críticos ok: ${criticalPassed}`);
    console.log(`🔥❌ Críticos falha: ${criticalFailed}`);
    console.log(`🔥📊 Taxa crítica: ${Math.round((criticalPassed / (criticalPassed + criticalFailed)) * 100)}%`);
    console.log('');

    // Análise específica dos problemas que foram corrigidos
    console.log('🎯 ANÁLISE DOS PROBLEMAS ORIGINAIS:');
    console.log('===================================');
    
    const originalProblems = [
        '/status',
        '/api/dashboard/summary', 
        '/api/webhooks/signal'
    ];
    
    let originalProblemsFixed = 0;
    originalProblems.forEach(problemPath => {
        const relatedResults = results.filter(r => r.endpoint.path === problemPath);
        const allFixed = relatedResults.every(r => r.status === 'PASS');
        const icon = allFixed ? '✅' : '❌';
        console.log(`${icon} ${problemPath} - ${allFixed ? 'CORRIGIDO' : 'AINDA COM PROBLEMAS'}`);
        if (allFixed) originalProblemsFixed++;
    });
    
    console.log('');
    
    // Análise de webhooks
    console.log('📡 ANÁLISE DOS WEBHOOKS TRADINGVIEW:');
    console.log('====================================');
    
    const webhookResults = results.filter(r => r.endpoint.path.includes('webhook'));
    const webhooksOk = webhookResults.filter(r => r.status === 'PASS').length;
    console.log(`✅ Webhooks funcionando: ${webhooksOk}/${webhookResults.length}`);
    
    webhookResults.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${result.endpoint.method} ${result.endpoint.path}`);
    });
    
    console.log('');
    
    // Conclusão final
    const allCriticalFixed = criticalFailed === 0;
    const originalFixed = originalProblemsFixed === originalProblems.length;
    const webhooksWorking = webhooksOk === webhookResults.length;
    
    if (allCriticalFixed && originalFixed && webhooksWorking) {
        console.log('🎉 TESTE COMPLETO: TODOS OS PROBLEMAS RESOLVIDOS!');
        console.log('================================================');
        console.log('✅ Todos os endpoints críticos funcionando');
        console.log('✅ Problemas originais 404 corrigidos');
        console.log('✅ Webhooks TradingView operacionais');
        console.log('✅ Dashboard e APIs acessíveis');
        console.log('');
        console.log('🚀 SISTEMA PRONTO PARA DEPLOY NA RAILWAY!');
        console.log('');
        console.log('💻 Comandos para deploy:');
        console.log('  git add .');
        console.log('  git commit -m "🎯 FIX: All 404 endpoints resolved + webhooks functional"');
        console.log('  git push origin main');
    } else {
        console.log('⚠️ PROBLEMAS AINDA EXISTEM:');
        console.log('===========================');
        if (!allCriticalFixed) console.log(`❌ ${criticalFailed} endpoints críticos com problemas`);
        if (!originalFixed) console.log(`❌ ${originalProblems.length - originalProblemsFixed} problemas originais não resolvidos`);
        if (!webhooksWorking) console.log(`❌ ${webhookResults.length - webhooksOk} webhooks com problemas`);
        console.log('');
        console.log('🔧 Revise os endpoints com falha antes do deploy');
    }
    
    // Salvar relatório detalhado
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalTests,
            passedTests,
            failedTests,
            successRate: Math.round((passedTests / totalTests) * 100),
            criticalPassed,
            criticalFailed,
            criticalRate: Math.round((criticalPassed / (criticalPassed + criticalFailed)) * 100)
        },
        originalProblems: {
            total: originalProblems.length,
            fixed: originalProblemsFixed,
            allFixed: originalFixed
        },
        webhooks: {
            total: webhookResults.length,
            working: webhooksOk,
            allWorking: webhooksWorking
        },
        readyForDeploy: allCriticalFixed && originalFixed && webhooksWorking,
        results
    };
    
    fs.writeFileSync('complete-test-report.json', JSON.stringify(report, null, 2));
    console.log('📝 Relatório completo salvo em: complete-test-report.json');
    
    return report;
}

// Executar se chamado diretamente
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests, makeRequest, checkServer };
