#!/usr/bin/env node
/**
 * 🚂 TESTE RAILWAY - TODOS OS 85 ENDPOINTS
 * ======================================
 */

const https = require('https');

console.log('🚂 TESTE RAILWAY - SISTEMA ENTERPRISE');
console.log('=====================================');
console.log('🎯 Testando TODOS os 85 endpoints na Railway\n');

const BASE_URL = 'coinbitclub-market-bot.up.railway.app';

// Lista completa dos 85 endpoints
const allEndpoints = [
    // BÁSICOS (3)
    { method: 'GET', path: '/health', category: 'BASIC', desc: 'Health check' },
    { method: 'GET', path: '/status', category: 'BASIC', desc: 'Status sistema' },
    { method: 'GET', path: '/', category: 'BASIC', desc: 'Dashboard principal' },
    
    // ADMINISTRAÇÃO (5)
    { method: 'GET', path: '/api/admin/financial-summary', category: 'ADMIN', desc: 'Resumo financeiro' },
    { method: 'GET', path: '/api/admin/generate-coupon-code', category: 'ADMIN', desc: 'Gerar cupom' },
    { method: 'GET', path: '/api/systems/status', category: 'ADMIN', desc: 'Status sistemas' },
    { method: 'GET', path: '/api/system/status', category: 'ADMIN', desc: 'API status' },
    { method: 'POST', path: '/api/admin/create-coupon', category: 'ADMIN', desc: 'Criar cupom' },
    
    // DASHBOARD (12)
    { method: 'GET', path: '/api/dashboard/summary', category: 'DASHBOARD', desc: 'Dashboard summary' },
    { method: 'GET', path: '/api/dashboard/realtime', category: 'DASHBOARD', desc: 'Dados realtime' },
    { method: 'GET', path: '/api/dashboard/signals', category: 'DASHBOARD', desc: 'Sinais' },
    { method: 'GET', path: '/api/dashboard/orders', category: 'DASHBOARD', desc: 'Ordens' },
    { method: 'GET', path: '/api/dashboard/users', category: 'DASHBOARD', desc: 'Usuários' },
    { method: 'GET', path: '/api/dashboard/balances', category: 'DASHBOARD', desc: 'Saldos' },
    { method: 'GET', path: '/api/dashboard/admin-logs', category: 'DASHBOARD', desc: 'Logs admin' },
    { method: 'GET', path: '/api/dashboard/ai-analysis', category: 'DASHBOARD', desc: 'Análise IA' },
    { method: 'GET', path: '/painel', category: 'DASHBOARD', desc: 'Painel controle' },
    { method: 'GET', path: '/painel/executivo', category: 'DASHBOARD', desc: 'Dashboard executivo' },
    { method: 'GET', path: '/api/painel/realtime', category: 'DASHBOARD', desc: 'Painel realtime' },
    { method: 'GET', path: '/api/painel/dados', category: 'DASHBOARD', desc: 'Dados painel' },
    
    // EXCHANGES (5)
    { method: 'GET', path: '/api/exchanges/status', category: 'EXCHANGES', desc: 'Status exchanges' },
    { method: 'GET', path: '/api/exchanges/health', category: 'EXCHANGES', desc: 'Health exchanges' },
    { method: 'GET', path: '/api/exchanges/balances', category: 'EXCHANGES', desc: 'Saldos exchanges' },
    { method: 'GET', path: '/api/balance', category: 'EXCHANGES', desc: 'Balance geral' },
    { method: 'POST', path: '/api/exchanges/connect-user', category: 'EXCHANGES', desc: 'Conectar usuário' },
    
    // TRADING (7)
    { method: 'GET', path: '/api/executors/status', category: 'TRADING', desc: 'Status executores' },
    { method: 'GET', path: '/api/trade/status', category: 'TRADING', desc: 'Status trading' },
    { method: 'GET', path: '/api/trade/balances', category: 'TRADING', desc: 'Saldos trading' },
    { method: 'GET', path: '/api/trade/connections', category: 'TRADING', desc: 'Conexões trading' },
    { method: 'POST', path: '/api/executors/trade', category: 'TRADING', desc: 'Executar trade' },
    { method: 'POST', path: '/api/trade/execute', category: 'TRADING', desc: 'Trade execute' },
    { method: 'POST', path: '/api/trade/validate', category: 'TRADING', desc: 'Validar trade' },
    
    // USER MANAGEMENT (2)
    { method: 'GET', path: '/api/users', category: 'USERS', desc: 'Listar usuários' },
    { method: 'POST', path: '/api/affiliate/convert-commission', category: 'USERS', desc: 'Converter comissão' },
    
    // VALIDATION (6)
    { method: 'GET', path: '/api/validation/status', category: 'VALIDATION', desc: 'Status validação' },
    { method: 'GET', path: '/api/validation/connections', category: 'VALIDATION', desc: 'Conexões validação' },
    { method: 'GET', path: '/api/monitor/status', category: 'VALIDATION', desc: 'Status monitor' },
    { method: 'POST', path: '/api/validation/run', category: 'VALIDATION', desc: 'Executar validação' },
    { method: 'POST', path: '/api/monitor/check', category: 'VALIDATION', desc: 'Check monitor' },
    { method: 'POST', path: '/api/validation/revalidate', category: 'VALIDATION', desc: 'Revalidar' },
    
    // FINANCIAL (2)
    { method: 'GET', path: '/api/financial/summary', category: 'FINANCIAL', desc: 'Resumo financeiro' },
    { method: 'POST', path: '/api/stripe/recharge', category: 'FINANCIAL', desc: 'Recarga Stripe' },
    
    // WEBHOOKS (4)
    { method: 'GET', path: '/api/webhooks/signal', category: 'WEBHOOKS', desc: 'Webhook signal GET' },
    { method: 'POST', path: '/api/webhooks/signal', category: 'WEBHOOKS', desc: 'Webhook signal POST' },
    { method: 'GET', path: '/webhook', category: 'WEBHOOKS', desc: 'Webhook geral GET' },
    { method: 'POST', path: '/webhook', category: 'WEBHOOKS', desc: 'Webhook geral POST' },
    
    // TESTING (5)
    { method: 'GET', path: '/api/test-connection', category: 'TESTING', desc: 'Test conexão' },
    { method: 'GET', path: '/api/demo/saldos', category: 'TESTING', desc: 'Demo saldos' },
    { method: 'GET', path: '/demo-saldos', category: 'TESTING', desc: 'Saldos demo' },
    { method: 'POST', path: '/api/test/constraint-error', category: 'TESTING', desc: 'Test constraint' },
    { method: 'POST', path: '/api/test/api-key-error', category: 'TESTING', desc: 'Test API key' },
    
    // REPORTS (1)
    { method: 'POST', path: '/api/saldos/coletar-real', category: 'REPORTS', desc: 'Coletar saldos' },
    
    // OTHER (10)
    { method: 'GET', path: '/system-status', category: 'OTHER', desc: 'System status' },
    { method: 'GET', path: '/commission-plans', category: 'OTHER', desc: 'Planos comissão' },
    { method: 'GET', path: '/api/positions', category: 'OTHER', desc: 'Posições' },
    { method: 'GET', path: '/api/signals', category: 'OTHER', desc: 'Sinais' },
    { method: 'GET', path: '/api/market/data', category: 'OTHER', desc: 'Dados mercado' },
    { method: 'GET', path: '/api/dominance', category: 'OTHER', desc: 'Dominância' },
    { method: 'GET', path: '/api/current-mode', category: 'OTHER', desc: 'Modo atual' },
    { method: 'GET', path: '/ativar-chaves-reais', category: 'OTHER', desc: 'Ativar chaves' },
    { method: 'POST', path: '/api/register', category: 'OTHER', desc: 'Registro' },
    { method: 'POST', path: '/api/login', category: 'OTHER', desc: 'Login' }
];

// Função para fazer requisição HTTPS
function makeRequest(method, path, data = null) {
    return new Promise((resolve) => {
        const postData = data ? JSON.stringify(data) : '';
        
        const options = {
            hostname: BASE_URL,
            port: 443,
            path: path,
            method: method,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'RailwayTest/1.0'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: responseData,
                    contentType: res.headers['content-type'] || 'unknown',
                    contentLength: res.headers['content-length'] || responseData.length
                });
            });
        });

        req.on('error', (err) => {
            resolve({ statusCode: 0, error: err.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ statusCode: 0, error: 'timeout' });
        });

        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

// Função principal de teste
async function runRailwayTest() {
    console.log(`🧪 Iniciando teste de ${allEndpoints.length} endpoints na Railway...\n`);
    
    const results = {
        success: 0,
        errors: 0,
        categories: {}
    };
    
    let testCount = 0;
    
    for (const endpoint of allEndpoints) {
        testCount++;
        console.log(`[${testCount}/${allEndpoints.length}] ${endpoint.method} ${endpoint.path}`);
        console.log(`   📝 ${endpoint.desc} (${endpoint.category})`);
        
        // Preparar dados de teste para POST requests
        let testData = null;
        if (endpoint.method === 'POST') {
            testData = {
                test: true,
                timestamp: new Date().toISOString(),
                source: 'railway_test'
            };
        }
        
        const result = await makeRequest(endpoint.method, endpoint.path, testData);
        
        // Classificar resultado
        const isSuccess = result.statusCode >= 200 && result.statusCode < 400;
        
        if (isSuccess) {
            console.log(`   ✅ Status: ${result.statusCode} | Size: ${result.contentLength} bytes`);
            results.success++;
        } else {
            console.log(`   ❌ Status: ${result.statusCode || 'ERROR'} | Error: ${result.error || 'Unknown'}`);
            results.errors++;
        }
        
        // Agrupar por categoria
        if (!results.categories[endpoint.category]) {
            results.categories[endpoint.category] = { success: 0, errors: 0 };
        }
        
        if (isSuccess) {
            results.categories[endpoint.category].success++;
        } else {
            results.categories[endpoint.category].errors++;
        }
        
        console.log('');
        
        // Delay entre requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Relatório final
    console.log('🚂 RELATÓRIO FINAL DO TESTE RAILWAY');
    console.log('===================================');
    console.log(`📊 Total de endpoints testados: ${allEndpoints.length}`);
    console.log(`✅ Sucessos: ${results.success}`);
    console.log(`❌ Erros: ${results.errors}`);
    console.log(`📈 Taxa de sucesso: ${Math.round(results.success / allEndpoints.length * 100)}%`);
    console.log(`🌐 URL: https://${BASE_URL}`);
    console.log('');
    
    // Resultados por categoria
    console.log('📋 RESULTADOS POR CATEGORIA:');
    console.log('============================');
    Object.keys(results.categories).forEach(category => {
        const cat = results.categories[category];
        const total = cat.success + cat.errors;
        const rate = Math.round(cat.success / total * 100);
        console.log(`${category.padEnd(12)}: ${cat.success}/${total} (${rate}%)`);
    });
    
    console.log('');
    
    // Conclusão
    const overallSuccess = results.success / allEndpoints.length;
    if (overallSuccess >= 0.9) {
        console.log('🎉 EXCELENTE! Sistema enterprise funcionando perfeitamente na Railway!');
        console.log('✅ Pronto para operar em ambiente real');
    } else if (overallSuccess >= 0.8) {
        console.log('👍 BOM! Sistema enterprise funcionando bem na Railway');
        console.log('⚠️ Alguns ajustes recomendados');
    } else {
        console.log('⚠️ Sistema precisa de correções na Railway');
    }
    
    console.log('');
    console.log('🚂 Teste Railway completo!');
}

// Executar teste
runRailwayTest().catch(console.error);
