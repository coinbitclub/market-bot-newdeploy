#!/usr/bin/env node
/**
 * 🔍 DIAGNÓSTICO COMPLETO DO RAILWAY
 * =================================
 * 
 * Analisa por que todos endpoints retornam 404
 */

console.log('🔍 DIAGNÓSTICO COMPLETO DO RAILWAY');
console.log('==================================');

const https = require('https');

class RailwayDiagnostic {
    constructor() {
        this.baseUrl = 'coinbitclub-market-bot-backend-production.up.railway.app';
    }

    // Fazer requisição com headers detalhados
    makeDetailedRequest(path, method = 'GET') {
        return new Promise((resolve) => {
            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: path,
                method: method,
                timeout: 15000,
                headers: {
                    'User-Agent': 'RailwayDiagnostic/1.0',
                    'Accept': '*/*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
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
                        statusMessage: res.statusMessage,
                        headers: res.headers,
                        data: data,
                        url: `https://${this.baseUrl}${path}`
                    });
                });
            });

            req.on('error', (err) => {
                resolve({
                    error: err.message,
                    code: err.code,
                    url: `https://${this.baseUrl}${path}`
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    error: 'Request timeout',
                    url: `https://${this.baseUrl}${path}`
                });
            });

            req.end();
        });
    }

    // Verificar DNS e conectividade
    async checkConnectivity() {
        console.log('\n🌐 VERIFICANDO CONECTIVIDADE...');
        console.log('===============================');
        
        const result = await this.makeDetailedRequest('/');
        
        console.log(`🔗 URL: ${result.url}`);
        console.log(`📊 Status: ${result.statusCode || 'ERROR'} ${result.statusMessage || ''}`);
        
        if (result.error) {
            console.log(`❌ Erro: ${result.error}`);
            if (result.code) console.log(`🔧 Código: ${result.code}`);
            return false;
        }
        
        if (result.headers) {
            console.log('\n📋 HEADERS RECEBIDOS:');
            Object.keys(result.headers).forEach(key => {
                console.log(`   ${key}: ${result.headers[key]}`);
            });
        }
        
        if (result.data) {
            console.log(`\n📄 Tamanho resposta: ${result.data.length} bytes`);
            
            // Analisar tipo de resposta
            if (result.data.includes('Application not found')) {
                console.log('🚨 PROBLEMA: Application not found - Railway app não encontrada!');
                return 'app_not_found';
            } else if (result.data.includes('502 Bad Gateway')) {
                console.log('🚨 PROBLEMA: 502 Bad Gateway - App com erro de inicialização!');
                return 'bad_gateway';
            } else if (result.data.includes('503 Service Unavailable')) {
                console.log('🚨 PROBLEMA: 503 Service Unavailable - App indisponível!');
                return 'service_unavailable';
            } else if (result.data.includes('<!DOCTYPE html>')) {
                console.log('📄 Resposta em HTML recebida');
                // Extrair título
                const titleMatch = result.data.match(/<title>(.*?)<\/title>/i);
                if (titleMatch) {
                    console.log(`📋 Título: ${titleMatch[1]}`);
                }
                return 'html_response';
            } else if (result.data.includes('{') || result.data.includes('[')) {
                console.log('📄 Resposta JSON recebida');
                try {
                    const json = JSON.parse(result.data);
                    console.log('📊 JSON:', JSON.stringify(json, null, 2));
                } catch {
                    console.log('⚠️ JSON inválido');
                }
                return 'json_response';
            }
        }
        
        return true;
    }

    // Testar endpoints básicos Railway
    async testRailwayBasics() {
        console.log('\n🔧 TESTANDO ENDPOINTS BÁSICOS RAILWAY...');
        console.log('========================================');
        
        const basicEndpoints = [
            '/',
            '/health',
            '/status',
            '/ping',
            '/api',
            '/docs',
            '/favicon.ico'
        ];
        
        const results = [];
        
        for (const endpoint of basicEndpoints) {
            console.log(`\n🔍 Testando: ${endpoint}`);
            const result = await this.makeDetailedRequest(endpoint);
            
            const status = result.statusCode || 'ERROR';
            console.log(`   📊 Status: ${status}`);
            
            if (result.error) {
                console.log(`   ❌ Erro: ${result.error}`);
            } else if (result.statusCode === 200) {
                console.log(`   ✅ OK - Endpoint funcionando!`);
            } else if (result.statusCode === 404) {
                console.log(`   🚫 404 - Endpoint não encontrado`);
            } else {
                console.log(`   ⚠️ Status inesperado: ${result.statusCode}`);
            }
            
            results.push({
                endpoint,
                statusCode: result.statusCode,
                error: result.error,
                working: result.statusCode === 200
            });
            
            // Delay entre requests
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        return results;
    }

    // Analisar logs de erro do Railway
    analyzeRailwayResponse(data) {
        console.log('\n🔍 ANALISANDO RESPOSTA DO RAILWAY...');
        console.log('====================================');
        
        if (!data) {
            console.log('❌ Nenhuma resposta recebida');
            return 'no_response';
        }
        
        // Verificar se é página de erro do Railway
        if (data.includes('Railway')) {
            console.log('🚂 Resposta do Railway detectada');
            
            if (data.includes('Application not found')) {
                console.log('🚨 DIAGNÓSTICO: Aplicação não encontrada no Railway');
                console.log('💡 POSSÍVEIS CAUSAS:');
                console.log('   - Deploy falhou');
                console.log('   - App foi removida');
                console.log('   - URL incorreta');
                console.log('   - Projeto pausado/suspenso');
                return 'app_not_found';
            }
            
            if (data.includes('Build failed')) {
                console.log('🚨 DIAGNÓSTICO: Build falhou no Railway');
                console.log('💡 POSSÍVEIS CAUSAS:');
                console.log('   - Erro no código');
                console.log('   - Dependências faltando');
                console.log('   - Problemas no package.json');
                return 'build_failed';
            }
            
            if (data.includes('Deploy failed')) {
                console.log('🚨 DIAGNÓSTICO: Deploy falhou no Railway');
                console.log('💡 POSSÍVEIS CAUSAS:');
                console.log('   - Erro na inicialização');
                console.log('   - Variáveis de ambiente faltando');
                console.log('   - Porta incorreta');
                return 'deploy_failed';
            }
        }
        
        // Verificar outros tipos de erro
        if (data.includes('502') || data.includes('Bad Gateway')) {
            console.log('🚨 DIAGNÓSTICO: 502 Bad Gateway');
            console.log('💡 App iniciou mas está com erro interno');
            return 'bad_gateway';
        }
        
        if (data.includes('503') || data.includes('Service Unavailable')) {
            console.log('🚨 DIAGNÓSTICO: 503 Service Unavailable');
            console.log('💡 App temporariamente indisponível');
            return 'service_unavailable';
        }
        
        if (data.includes('504') || data.includes('Gateway Timeout')) {
            console.log('🚨 DIAGNÓSTICO: 504 Gateway Timeout');
            console.log('💡 App demorou muito para responder');
            return 'gateway_timeout';
        }
        
        console.log('❓ Tipo de erro não identificado');
        return 'unknown_error';
    }

    // Gerar relatório de diagnóstico
    generateDiagnosticReport(connectivityResult, basicResults) {
        console.log('\n📊 RELATÓRIO DE DIAGNÓSTICO');
        console.log('===========================');
        
        console.log(`🌐 URL testada: https://${this.baseUrl}`);
        console.log(`🔗 Conectividade: ${typeof connectivityResult === 'string' ? connectivityResult : (connectivityResult ? 'OK' : 'FALHA')}`);
        
        const workingEndpoints = basicResults.filter(r => r.working).length;
        const totalEndpoints = basicResults.length;
        
        console.log(`📊 Endpoints testados: ${totalEndpoints}`);
        console.log(`✅ Funcionando: ${workingEndpoints}`);
        console.log(`❌ Com problema: ${totalEndpoints - workingEndpoints}`);
        
        if (workingEndpoints === 0) {
            console.log('\n🚨 DIAGNÓSTICO FINAL: APLICAÇÃO NÃO ESTÁ FUNCIONANDO');
            console.log('===================================================');
            
            if (connectivityResult === 'app_not_found') {
                console.log('🎯 PROBLEMA: Application not found');
                console.log('🔧 SOLUÇÃO RECOMENDADA:');
                console.log('   1. Verificar se o deploy foi bem-sucedido');
                console.log('   2. Conferir logs do Railway');
                console.log('   3. Verificar se a URL está correta');
                console.log('   4. Fazer novo deploy se necessário');
            } else {
                console.log('🎯 PROBLEMA: Erro geral do Railway');
                console.log('🔧 SOLUÇÕES RECOMENDADAS:');
                console.log('   1. Verificar logs do Railway');
                console.log('   2. Fazer redeploy');
                console.log('   3. Verificar variáveis de ambiente');
                console.log('   4. Conferir se app.js está correto');
            }
        } else {
            console.log('\n✅ DIAGNÓSTICO: ALGUNS ENDPOINTS FUNCIONANDO');
        }
        
        return {
            totalEndpoints,
            workingEndpoints,
            connectivityStatus: connectivityResult,
            recommendation: workingEndpoints === 0 ? 'REDEPLOY_NEEDED' : 'PARTIAL_SUCCESS'
        };
    }

    // Executar diagnóstico completo
    async runCompleteDiagnostic() {
        console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO...');
        console.log('====================================');
        
        const connectivityResult = await this.checkConnectivity();
        const basicResults = await this.testRailwayBasics();
        
        const report = this.generateDiagnosticReport(connectivityResult, basicResults);
        
        console.log('\n🎯 DIAGNÓSTICO CONCLUÍDO!');
        return report;
    }
}

// Executar diagnóstico
if (require.main === module) {
    const diagnostic = new RailwayDiagnostic();
    diagnostic.runCompleteDiagnostic().then((report) => {
        if (report.recommendation === 'REDEPLOY_NEEDED') {
            console.log('\n🚨 AÇÃO NECESSÁRIA: REDEPLOY URGENTE');
            process.exit(1);
        } else {
            console.log('\n✅ DIAGNÓSTICO COMPLETO');
            process.exit(0);
        }
    }).catch(error => {
        console.error('❌ Erro no diagnóstico:', error.message);
        process.exit(1);
    });
}

module.exports = RailwayDiagnostic;
