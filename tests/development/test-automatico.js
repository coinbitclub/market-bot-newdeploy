#!/usr/bin/env node

/**
 * 🎯 TESTADOR COMPLETO AUTOMATIZADO
 * ==================================
 * Inicia servidor e testa todos os endpoints
 */

const { spawn } = require('child_process');
const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3000';
const SERVER_START_DELAY = 3000; // 3 segundos para o servidor iniciar

// Endpoints essenciais para testar
const ESSENTIAL_ENDPOINTS = [
    { path: '/health', name: 'Health Check', critical: true },
    { path: '/status', name: 'System Status', critical: true },
    { path: '/api/test-connection', name: 'Database Connection', critical: true },
    { path: '/api/users', name: 'Users Count', critical: true },
    { path: '/api/dashboard/summary', name: 'Dashboard Summary', critical: true },
    { path: '/api/dashboard/realtime', name: 'Realtime Data', critical: false },
    { path: '/webhook', name: 'Webhook Info', critical: true },
    { path: '/api/exchanges/status', name: 'Exchanges Status', critical: false },
    { path: '/api/trade/status', name: 'Trading Status', critical: false }
];

console.log('🎯 TESTADOR COMPLETO AUTOMATIZADO');
console.log('==================================');
console.log('');

let serverProcess = null;

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
                    data: data.substring(0, 200),
                    hasData: data.length > 0
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
                error: 'Timeout (5s)',
                code: 'TIMEOUT'
            });
        });
    });
}

// Função para verificar se servidor está rodando
async function checkServer() {
    try {
        const result = await makeRequest('/health');
        return result.success && result.status === 200;
    } catch (error) {
        return false;
    }
}

// Função para iniciar servidor
function startServer() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Iniciando servidor mínimo...');
        
        serverProcess = spawn('node', ['minimal-server-test.js'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: process.cwd()
        });
        
        let output = '';
        
        serverProcess.stdout.on('data', (data) => {
            output += data.toString();
            if (output.includes('COINBITCLUB MINIMAL SERVER STARTED') || output.includes('port 3000')) {
                console.log('✅ Servidor iniciado com sucesso!');
                resolve(true);
            }
        });
        
        serverProcess.stderr.on('data', (data) => {
            console.error('❌ Erro no servidor:', data.toString());
        });
        
        serverProcess.on('error', (error) => {
            console.error('❌ Falha ao iniciar servidor:', error.message);
            reject(error);
        });
        
        // Timeout de segurança
        setTimeout(() => {
            console.log('⏰ Timeout - assumindo que servidor iniciou');
            resolve(true);
        }, SERVER_START_DELAY);
    });
}

// Função para testar endpoints
async function testEndpoints() {
    console.log('🧪 Testando endpoints essenciais...');
    console.log('');
    
    let passed = 0;
    let failed = 0;
    let criticalErrors = 0;
    
    for (let i = 0; i < ESSENTIAL_ENDPOINTS.length; i++) {
        const endpoint = ESSENTIAL_ENDPOINTS[i];
        const result = await makeRequest(endpoint.path);
        
        const criticalIcon = endpoint.critical ? '🔥' : '📌';
        console.log(`${(i + 1).toString().padStart(2, '0')}. ${criticalIcon} ${endpoint.name}`);
        console.log(`    ${endpoint.path}`);
        
        if (result.success && result.status === 200) {
            console.log(`    ✅ PASS - Status: ${result.status}${result.hasData ? ' (com dados)' : ''}`);
            passed++;
        } else {
            const error = result.error || `HTTP ${result.status || 'Unknown'}`;
            console.log(`    ❌ FAIL - ${error}`);
            failed++;
            
            if (endpoint.critical) {
                criticalErrors++;
            }
        }
        
        console.log('');
        
        // Pausa entre requisições
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Relatório final
    console.log('🏁 RELATÓRIO FINAL');
    console.log('=================');
    console.log(`📊 Total: ${ESSENTIAL_ENDPOINTS.length}`);
    console.log(`✅ Passou: ${passed}`);
    console.log(`❌ Falhou: ${failed}`);
    console.log(`🔥 Críticos com erro: ${criticalErrors}`);
    console.log(`📈 Taxa de sucesso: ${((passed / ESSENTIAL_ENDPOINTS.length) * 100).toFixed(1)}%`);
    console.log('');
    
    // Análise dos resultados
    if (criticalErrors === 0 && passed >= ESSENTIAL_ENDPOINTS.length * 0.8) {
        console.log('🎉 SISTEMA OPERACIONAL!');
        console.log('✅ Todos os endpoints críticos funcionando');
        console.log('✅ Sistema pronto para deploy no Railway');
        console.log('');
        console.log('📋 PRÓXIMOS PASSOS:');
        console.log('1. git add .');
        console.log('2. git commit -m "✅ Sistema 100% funcional"');
        console.log('3. git push origin main');
        return 0;
    } else if (criticalErrors === 0) {
        console.log('⚠️ SISTEMA FUNCIONAL (com algumas falhas não-críticas)');
        console.log('✅ Endpoints críticos OK');
        console.log('⚠️ Alguns endpoints secundários falharam');
        console.log('💚 Sistema pode ser deployado');
        return 0;
    } else {
        console.log('❌ PROBLEMAS CRÍTICOS ENCONTRADOS');
        console.log(`🔥 ${criticalErrors} endpoints críticos falharam`);
        console.log('🔧 Corrigir problemas antes do deploy');
        return 1;
    }
}

// Função principal
async function main() {
    try {
        // Verificar se servidor já está rodando
        const serverRunning = await checkServer();
        
        if (!serverRunning) {
            console.log('🔍 Servidor não encontrado - iniciando...');
            await startServer();
            
            // Aguardar servidor estabilizar
            console.log('⏳ Aguardando servidor estabilizar...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log('✅ Servidor já está rodando!');
        }
        
        // Testar endpoints
        const exitCode = await testEndpoints();
        
        // Finalizar servidor se foi iniciado por nós
        if (serverProcess) {
            console.log('🛑 Finalizando servidor...');
            serverProcess.kill();
        }
        
        process.exit(exitCode);
        
    } catch (error) {
        console.error('💥 Erro fatal:', error.message);
        
        if (serverProcess) {
            serverProcess.kill();
        }
        
        process.exit(1);
    }
}

// Iniciar processo
main();
