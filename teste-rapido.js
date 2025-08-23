#!/usr/bin/env node
/**
 * 🚀 TESTE RÁPIDO ENTERPRISE - VERIFICAÇÃO PRINCIPAL
 * ==================================================
 */

const http = require('http');

console.log('🚀 TESTE RÁPIDO ENTERPRISE');
console.log('==========================');

// Primeiro vamos verificar se o servidor está rodando
function testConnection() {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/health',
            method: 'GET',
            timeout: 3000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, data });
            });
        });
        
        req.on('error', (err) => {
            resolve({ error: err.message });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({ error: 'timeout' });
        });
        
        req.end();
    });
}

// Testar endpoints principais
const mainEndpoints = [
    { path: '/health', desc: 'Health Check' },
    { path: '/', desc: 'Dashboard Principal' },
    { path: '/api/system/status', desc: 'Status do Sistema' },
    { path: '/api/dashboard/summary', desc: 'Dashboard Summary' },
    { path: '/api/exchanges/status', desc: 'Status Exchanges' },
    { path: '/api/users', desc: 'Gestão de Usuários' },
    { path: '/api/webhooks/signal', desc: 'Webhook Sinais' },
    { path: '/painel', desc: 'Painel Enterprise' }
];

async function runQuickTest() {
    console.log('🔍 Verificando conexão...');
    
    const connection = await testConnection();
    
    if (connection.error) {
        console.log('❌ SERVIDOR NÃO ESTÁ RODANDO!');
        console.log(`   Erro: ${connection.error}`);
        console.log('');
        console.log('📋 PARA INICIAR O SERVIDOR:');
        console.log('   node hybrid-server.js');
        return;
    }
    
    console.log(`✅ Servidor conectado! Status: ${connection.status}`);
    console.log('');
    
    // Testar endpoints principais
    console.log('🧪 TESTANDO ENDPOINTS PRINCIPAIS:');
    console.log('==================================');
    
    let successCount = 0;
    
    for (const endpoint of mainEndpoints) {
        const result = await testConnection();
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: endpoint.path,
            method: 'GET',
            timeout: 2000
        }, (res) => {
            const status = res.statusCode;
            const icon = status >= 200 && status < 400 ? '✅' : '❌';
            console.log(`${icon} ${endpoint.path} [${status}] - ${endpoint.desc}`);
            if (status >= 200 && status < 400) successCount++;
        });
        
        req.on('error', () => {
            console.log(`❌ ${endpoint.path} [ERROR] - ${endpoint.desc}`);
        });
        
        req.end();
        
        // Delay pequeno
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('');
    console.log(`📊 RESULTADO: ${successCount}/${mainEndpoints.length} endpoints funcionando`);
    
    if (successCount >= mainEndpoints.length * 0.8) {
        console.log('🎉 SISTEMA ENTERPRISE FUNCIONANDO!');
        console.log('✅ Pronto para testes completos');
    } else {
        console.log('⚠️ Sistema precisa de ajustes');
    }
}

// Aguardar e executar
setTimeout(runQuickTest, 1000);
