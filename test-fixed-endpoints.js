/**
 * 🔧 TESTE RÁPIDO DOS ENDPOINTS CORRIGIDOS
 * 
 * Valida se as correções do PostgreSQL resolveram os problemas ECONNRESET
 */

const axios = require('axios');

const CRITICAL_ENDPOINTS = [
    '/health',
    '/api/system/status', 
    '/api/dashboard/summary',
    '/api/dashboard/realtime',
    '/api/dashboard/users',
    '/api/dashboard/ai-analysis',
    '/api/dashboard/admin-logs',
    '/api/dashboard/signals',
    '/api/dashboard/orders'
];

async function testEndpoint(endpoint) {
    try {
        const response = await axios.get(`http://localhost:3000${endpoint}`, {
            timeout: 10000
        });
        
        return {
            endpoint,
            status: 'OK',
            statusCode: response.status,
            hasData: !!response.data,
            hasSuccess: response.data?.success,
            category: response.data?.category || 'unknown',
            error: response.data?.error || null
        };
    } catch (error) {
        return {
            endpoint,
            status: 'ERROR',
            statusCode: error.response?.status || 0,
            error: error.message,
            hasData: false
        };
    }
}

async function runTests() {
    console.log('🔧 TESTE RÁPIDO - ENDPOINTS CORRIGIDOS');
    console.log('=====================================');
    console.log(`📡 Base URL: http://localhost:3000`);
    console.log(`📊 Endpoints críticos: ${CRITICAL_ENDPOINTS.length}`);
    console.log('');

    const results = [];
    
    for (const endpoint of CRITICAL_ENDPOINTS) {
        process.stdout.write(`Testing ${endpoint}... `);
        
        const result = await testEndpoint(endpoint);
        results.push(result);
        
        if (result.status === 'OK') {
            console.log(`✅ OK (${result.statusCode})`);
            if (result.error) {
                console.log(`   ⚠️ Contains error: ${result.error}`);
            }
        } else {
            console.log(`❌ FAIL (${result.statusCode})`);
            console.log(`   Error: ${result.error}`);
        }
        
        // Pausa pequena
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Resumo
    console.log('\n🎯 RESUMO');
    console.log('=========');
    
    const passed = results.filter(r => r.status === 'OK').length;
    const failed = results.filter(r => r.status === 'ERROR').length;
    const withErrors = results.filter(r => r.status === 'OK' && r.error).length;
    
    console.log(`✅ Passou: ${passed}/${CRITICAL_ENDPOINTS.length}`);
    console.log(`❌ Falhou: ${failed}/${CRITICAL_ENDPOINTS.length}`);
    console.log(`⚠️ Com erros de DB: ${withErrors}/${CRITICAL_ENDPOINTS.length}`);
    console.log(`📈 Taxa de sucesso: ${((passed / CRITICAL_ENDPOINTS.length) * 100).toFixed(1)}%`);

    // Análise detalhada
    if (withErrors > 0) {
        console.log('\n⚠️ ENDPOINTS COM ERROS DE DATABASE:');
        results.filter(r => r.error).forEach(r => {
            console.log(`   ${r.endpoint} - ${r.error}`);
        });
    }

    if (failed > 0) {
        console.log('\n❌ ENDPOINTS QUE FALHARAM COMPLETAMENTE:');
        results.filter(r => r.status === 'ERROR').forEach(r => {
            console.log(`   ${r.endpoint} - ${r.error}`);
        });
    }

    // Status final
    if (failed === 0 && withErrors === 0) {
        console.log('\n🎉 TODAS AS CORREÇÕES FUNCIONARAM! SISTEMA 100% OPERACIONAL!');
    } else if (failed === 0) {
        console.log('\n✅ TODOS OS ENDPOINTS RESPONDEM (alguns com fallback de DB)');
    } else {
        console.log('\n🚨 AINDA HÁ PROBLEMAS QUE PRECISAM SER CORRIGIDOS');
    }
}

// Executar teste
if (require.main === module) {
    console.log('⏳ Aguardando 2 segundos para servidor estar pronto...');
    setTimeout(() => {
        runTests().catch(error => {
            console.error('❌ Erro durante teste:', error.message);
        });
    }, 2000);
}

module.exports = { runTests };
