#!/usr/bin/env node
/**
 * 🚀 TESTE COMPLETO RAILWAY - SISTEMA ENTERPRISE
 * ===============================================
 */

const https = require('https');

console.log('🚀 TESTE RAILWAY - SISTEMA ENTERPRISE');
console.log('=====================================');
console.log('🎯 Testando endpoints na Railway\n');

const BASE_URL = 'coinbitclub-market-bot.up.railway.app';

// Endpoints críticos para testar primeiro
const criticalEndpoints = [
    { method: 'GET', path: '/health', desc: 'Health check' },
    { method: 'GET', path: '/api/system/status', desc: 'System status' },
    { method: 'GET', path: '/', desc: 'Dashboard principal' },
    { method: 'GET', path: '/api/dashboard/summary', desc: 'Dashboard summary' },
    { method: 'GET', path: '/api/webhooks/signal', desc: 'Webhook signal' },
    { method: 'GET', path: '/api/exchanges/status', desc: 'Exchanges status' },
    { method: 'GET', path: '/api/trade/status', desc: 'Trading status' },
    { method: 'GET', path: '/api/validation/status', desc: 'Validation status' },
    { method: 'GET', path: '/api/admin/financial-summary', desc: 'Admin financial' },
    { method: 'GET', path: '/api/users', desc: 'Users endpoint' }
];

// Função para fazer requisição HTTPS
function makeRequest(method, path) {
    return new Promise((resolve) => {
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

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: responseData,
                    contentType: res.headers['content-type'] || 'unknown',
                    contentLength: responseData.length
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
        
        req.end();
    });
}

// Função principal de teste
async function runRailwayTest() {
    console.log(`🧪 Testando ${criticalEndpoints.length} endpoints críticos...\n`);
    
    const results = {
        success: 0,
        errors: 0,
        details: []
    };
    
    for (let i = 0; i < criticalEndpoints.length; i++) {
        const endpoint = criticalEndpoints[i];
        console.log(`[${i+1}/${criticalEndpoints.length}] ${endpoint.method} ${endpoint.path}`);
        console.log(`   📝 ${endpoint.desc}`);
        
        const result = await makeRequest(endpoint.method, endpoint.path);
        
        const isSuccess = result.statusCode >= 200 && result.statusCode < 400;
        
        if (isSuccess) {
            console.log(`   ✅ Status: ${result.statusCode} | Size: ${result.contentLength} bytes`);
            results.success++;
            
            // Mostrar amostra da resposta para endpoints importantes
            if (endpoint.path === '/health' || endpoint.path === '/api/system/status') {
                try {
                    const parsed = JSON.parse(result.data);
                    console.log(`   📊 Data: ${JSON.stringify(parsed).substring(0, 100)}...`);
                } catch (e) {
                    console.log(`   📊 Data: ${result.data.substring(0, 100)}...`);
                }
            }
        } else {
            console.log(`   ❌ Status: ${result.statusCode || 'ERROR'} | Error: ${result.error || 'Unknown'}`);
            results.errors++;
        }
        
        results.details.push({
            endpoint: endpoint.path,
            method: endpoint.method,
            status: result.statusCode,
            success: isSuccess,
            error: result.error
        });
        
        console.log('');
        
        // Delay entre requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Relatório final
    console.log('🎯 RELATÓRIO RAILWAY');
    console.log('===================');
    console.log(`📊 Endpoints testados: ${criticalEndpoints.length}`);
    console.log(`✅ Sucessos: ${results.success}`);
    console.log(`❌ Erros: ${results.errors}`);
    console.log(`📈 Taxa de sucesso: ${Math.round(results.success / criticalEndpoints.length * 100)}%`);
    console.log('');
    
    // Status detalhado
    console.log('📋 STATUS DETALHADO:');
    console.log('====================');
    results.details.forEach(detail => {
        const status = detail.success ? '✅' : '❌';
        console.log(`${status} ${detail.method} ${detail.endpoint} [${detail.status}]`);
    });
    
    console.log('');
    
    // Conclusão específica para Railway
    if (results.success === criticalEndpoints.length) {
        console.log('🎉 EXCELENTE! Railway está 100% funcional!');
        console.log('✅ Todos os endpoints críticos funcionando');
    } else if (results.success >= criticalEndpoints.length * 0.8) {
        console.log('👍 BOM! Railway está funcionando bem');
        console.log('⚠️ Alguns endpoints precisam de atenção');
    } else {
        console.log('⚠️ Railway precisa de verificação');
        console.log('🔧 Possível problema de deploy ou configuração');
    }
    
    console.log('');
    console.log('🚀 Teste Railway completo!');
}

runRailwayTest().catch(console.error);
