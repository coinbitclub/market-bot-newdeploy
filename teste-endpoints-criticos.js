#!/usr/bin/env node
/**
 * 🔥 TESTE RÁPIDO DE ENDPOINTS CRÍTICOS
 * =====================================
 * 
 * Testa os endpoints mais importantes do sistema
 */

console.log('🔥 TESTE RÁPIDO DE ENDPOINTS CRÍTICOS');
console.log('====================================');

const https = require('https');

class CriticalEndpointTester {
    constructor() {
        this.baseUrl = 'coinbitclub-market-bot-backend-production.up.railway.app';
        this.criticalEndpoints = [
            // Básicos e Saúde
            { path: '/health', method: 'GET', priority: 'ALTA', description: 'Health check do sistema' },
            { path: '/', method: 'GET', priority: 'ALTA', description: 'Página inicial' },
            { path: '/api/system/status', method: 'GET', priority: 'ALTA', description: 'Status do sistema' },
            { path: '/api/current-mode', method: 'GET', priority: 'ALTA', description: 'Modo atual (testnet/híbrido)' },
            
            // Webhooks (críticos para trading)
            { path: '/webhook', method: 'GET', priority: 'ALTA', description: 'Info webhook (GET para teste)' },
            { path: '/api/webhooks/signal', method: 'GET', priority: 'ALTA', description: 'Webhook sinais (GET para teste)' },
            
            // Dashboard
            { path: '/dashboard', method: 'GET', priority: 'MÉDIA', description: 'Dashboard principal' },
            { path: '/api/dashboard/summary', method: 'GET', priority: 'MÉDIA', description: 'Resumo dashboard' },
            
            // Trading
            { path: '/api/trading/status', method: 'GET', priority: 'MÉDIA', description: 'Status trading' },
            { path: '/api/trade/status', method: 'GET', priority: 'MÉDIA', description: 'Status trades' },
            
            // Exchanges
            { path: '/api/exchanges/status', method: 'GET', priority: 'MÉDIA', description: 'Status exchanges' },
            { path: '/api/exchanges/health', method: 'GET', priority: 'MÉDIA', description: 'Saúde exchanges' },
            
            // Validação
            { path: '/api/validation/status', method: 'GET', priority: 'MÉDIA', description: 'Status validação' },
            
            // Usuários
            { path: '/api/users', method: 'GET', priority: 'BAIXA', description: 'Lista usuários' },
            
            // Ativação (específico do projeto)
            { path: '/ativar-chaves-reais', method: 'GET', priority: 'BAIXA', description: 'Ativar chaves reais' },
        ];
    }

    // Fazer requisição HTTP
    makeRequest(path, method = 'GET') {
        return new Promise((resolve) => {
            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: path,
                method: method,
                timeout: 8000,
                headers: {
                    'User-Agent': 'CriticalTester/1.0',
                    'Accept': 'application/json, text/html, */*'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: data.substring(0, 200),
                        headers: res.headers,
                        contentType: res.headers['content-type'] || 'unknown',
                        size: data.length
                    });
                });
            });

            req.on('error', (err) => {
                resolve({
                    statusCode: 0,
                    error: err.message,
                    data: null
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    statusCode: 0,
                    error: 'Timeout',
                    data: null
                });
            });

            req.end();
        });
    }

    // Testar endpoint crítico
    async testCriticalEndpoint(endpoint) {
        console.log(`\n🔍 Testando: ${endpoint.method} ${endpoint.path}`);
        console.log(`   📝 ${endpoint.description}`);
        console.log(`   🎯 Prioridade: ${endpoint.priority}`);
        
        const startTime = Date.now();
        const result = await this.makeRequest(endpoint.path, endpoint.method);
        const duration = Date.now() - startTime;
        
        const success = result.statusCode >= 200 && result.statusCode < 500;
        const status = success ? '✅' : '❌';
        
        console.log(`   ${status} Status: ${result.statusCode || 'ERROR'} | Tempo: ${duration}ms`);
        
        if (result.contentType) {
            console.log(`   📄 Tipo: ${result.contentType}`);
        }
        
        if (result.size) {
            console.log(`   📊 Tamanho: ${result.size} bytes`);
        }
        
        if (result.error) {
            console.log(`   🚫 Erro: ${result.error}`);
        } else if (result.data) {
            // Tentar detectar tipo de resposta
            let responseType = 'texto';
            if (result.data.includes('<!DOCTYPE') || result.data.includes('<html')) {
                responseType = 'HTML';
            } else if (result.data.includes('{') || result.data.includes('[')) {
                responseType = 'JSON';
            }
            console.log(`   📋 Resposta: ${responseType}`);
            
            // Preview da resposta
            const preview = result.data.replace(/\s+/g, ' ').substring(0, 80);
            console.log(`   👀 Preview: ${preview}...`);
        }
        
        return {
            ...endpoint,
            statusCode: result.statusCode,
            success: success,
            duration: duration,
            error: result.error,
            contentType: result.contentType,
            size: result.size,
            responseType: result.data ? (result.data.includes('{') ? 'JSON' : 'HTML') : 'NONE'
        };
    }

    // Testar todos os endpoints críticos
    async testAllCritical() {
        console.log('\n🚀 INICIANDO TESTES CRÍTICOS...');
        console.log('===============================');
        
        const results = [];
        const priorities = { 'ALTA': [], 'MÉDIA': [], 'BAIXA': [] };
        
        for (let i = 0; i < this.criticalEndpoints.length; i++) {
            const endpoint = this.criticalEndpoints[i];
            const result = await this.testCriticalEndpoint(endpoint);
            results.push(result);
            priorities[result.priority].push(result);
            
            // Delay entre requests
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        return { results, priorities };
    }

    // Gerar relatório dos testes críticos
    generateCriticalReport(testData) {
        console.log('\n📊 RELATÓRIO DE ENDPOINTS CRÍTICOS');
        console.log('==================================');
        
        const { results, priorities } = testData;
        
        let totalSuccess = 0;
        let totalError = 0;
        
        // Relatório por prioridade
        Object.keys(priorities).forEach(priority => {
            const endpoints = priorities[priority];
            if (endpoints.length === 0) return;
            
            const success = endpoints.filter(e => e.success).length;
            const error = endpoints.filter(e => !e.success).length;
            
            console.log(`\n🎯 PRIORIDADE ${priority}:`);
            console.log(`   📊 Total: ${endpoints.length} | ✅ OK: ${success} | ❌ Erro: ${error}`);
            
            endpoints.forEach(endpoint => {
                const status = endpoint.success ? '✅' : '❌';
                const statusCode = endpoint.statusCode || 'ERR';
                const duration = endpoint.duration || 0;
                console.log(`   ${status} ${endpoint.path.padEnd(30)} [${statusCode}] ${duration}ms`);
            });
            
            totalSuccess += success;
            totalError += error;
        });
        
        // Resumo geral
        const total = totalSuccess + totalError;
        const successRate = total > 0 ? Math.round(totalSuccess / total * 100) : 0;
        
        console.log('\n🎯 RESUMO CRÍTICO:');
        console.log('==================');
        console.log(`📊 Total testado: ${total}`);
        console.log(`✅ Funcionando: ${totalSuccess} (${successRate}%)`);
        console.log(`❌ Com problema: ${totalError}`);
        
        // Status do sistema
        if (successRate >= 90) {
            console.log('\n🎉 SISTEMA CRÍTICO EM EXCELENTE ESTADO!');
        } else if (successRate >= 70) {
            console.log('\n✅ SISTEMA CRÍTICO EM BOM ESTADO');
        } else if (successRate >= 50) {
            console.log('\n⚠️ SISTEMA CRÍTICO COM PROBLEMAS');
        } else {
            console.log('\n🚨 SISTEMA CRÍTICO COM FALHAS GRAVES');
        }
        
        // Endpoints problemáticos
        const problematicos = results.filter(r => !r.success);
        if (problematicos.length > 0) {
            console.log('\n🚨 ENDPOINTS PROBLEMÁTICOS:');
            problematicos.forEach(endpoint => {
                console.log(`❌ ${endpoint.path} - ${endpoint.error || 'Status ' + endpoint.statusCode}`);
            });
        }
        
        return {
            total,
            successful: totalSuccess,
            errors: totalError,
            successRate,
            problematicos
        };
    }

    // Executar teste crítico completo
    async runCriticalTest() {
        console.log('🔥 INICIANDO TESTE CRÍTICO DE ENDPOINTS...');
        console.log('=========================================');
        console.log(`🌐 URL Base: https://${this.baseUrl}`);
        
        const testData = await this.testAllCritical();
        const summary = this.generateCriticalReport(testData);
        
        console.log('\n🎯 TESTE CRÍTICO CONCLUÍDO!');
        console.log('===========================');
        
        return summary;
    }
}

// Executar teste crítico
if (require.main === module) {
    const tester = new CriticalEndpointTester();
    tester.runCriticalTest().then((summary) => {
        if (summary.successRate >= 70) {
            console.log('\n🎉 ENDPOINTS CRÍTICOS OK!');
            process.exit(0);
        } else {
            console.log('\n⚠️ PROBLEMAS NOS ENDPOINTS CRÍTICOS');
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Erro no teste crítico:', error.message);
        process.exit(1);
    });
}

module.exports = CriticalEndpointTester;
