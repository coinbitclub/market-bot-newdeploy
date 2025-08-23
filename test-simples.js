#!/usr/bin/env node

/**
 * 🧪 TESTADOR SIMPLES DE ENDPOINTS
 * =================================
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3000';

// Lista de endpoints para testar
const ENDPOINTS = [
    '/health',
    '/status', 
    '/api/test-connection',
    '/api/users',
    '/api/dashboard/summary',
    '/api/dashboard/realtime',
    '/webhook'
];

console.log('🧪 TESTADOR SIMPLES DE ENDPOINTS');
console.log('=================================');
console.log(`🎯 Base URL: ${BASE_URL}`);
console.log('');

// Função para fazer requisição HTTP
function makeRequest(path) {
    return new Promise((resolve) => {
        const url = new URL(path, BASE_URL);
        
        const req = http.get(url, { timeout: 5000 }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    success: true,
                    status: res.statusCode,
                    data: data.substring(0, 100) // Primeiros 100 chars
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message,
                code: error.code
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Timeout',
                code: 'TIMEOUT'
            });
        });
    });
}

// Função principal
async function testEndpoints() {
    console.log(`🚀 Testando ${ENDPOINTS.length} endpoints...`);
    console.log('');
    
    let passed = 0;
    let failed = 0;
    
    for (let i = 0; i < ENDPOINTS.length; i++) {
        const endpoint = ENDPOINTS[i];
        const result = await makeRequest(endpoint);
        
        console.log(`${(i + 1).toString().padStart(2, '0')}. ${endpoint}`);
        
        if (result.success && result.status === 200) {
            console.log(`    ✅ PASS - Status: ${result.status}`);
            passed++;
        } else {
            const error = result.error || `HTTP ${result.status || 'Unknown'}`;
            console.log(`    ❌ FAIL - ${error}`);
            failed++;
        }
        
        console.log('');
        
        // Pausa pequena entre requisições
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Relatório final
    console.log('🏁 RELATÓRIO FINAL');
    console.log('=================');
    console.log(`📊 Total: ${ENDPOINTS.length}`);
    console.log(`✅ Passou: ${passed}`);
    console.log(`❌ Falhou: ${failed}`);
    console.log(`📈 Taxa de sucesso: ${((passed / ENDPOINTS.length) * 100).toFixed(1)}%`);
    console.log('');
    
    if (failed === 0) {
        console.log('🎉 TODOS OS ENDPOINTS ESSENCIAIS FUNCIONANDO!');
        console.log('✅ SISTEMA PRONTO PARA PRODUCTION!');
    } else {
        console.log(`⚠️ ${failed} endpoints falharam - verificar problemas`);
    }
    
    process.exit(failed === 0 ? 0 : 1);
}

// Iniciar teste
testEndpoints().catch(error => {
    console.error('💥 Erro fatal:', error.message);
    process.exit(1);
});
