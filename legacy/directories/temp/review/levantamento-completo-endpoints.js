#!/usr/bin/env node
/**
 * 🔍 LEVANTAMENTO COMPLETO DE ENDPOINTS - COINBITCLUB
 * ===================================================
 * 
 * Mapeia todos os endpoints do projeto e testa cada um
 */

console.log('🔍 LEVANTAMENTO COMPLETO DE ENDPOINTS');
console.log('====================================');

const fs = require('fs');
const path = require('path');
const https = require('https');

class EndpointMapper {
    constructor() {
        this.baseUrl = 'coinbitclub-market-bot-backend-production.up.railway.app';
        this.endpoints = new Map();
        this.testResults = [];
    }

    // Analisar código e extrair endpoints
    analyzeCodeForEndpoints() {
        console.log('\n📋 ANALISANDO CÓDIGO PARA EXTRAIR ENDPOINTS...');
        
        try {
            const appPath = path.join(__dirname, 'app.js');
            const appContent = fs.readFileSync(appPath, 'utf8');
            
            // Padrões de regex para encontrar endpoints
            const patterns = [
                /app\.get\(['"`]([^'"`]+)['"`]/g,
                /app\.post\(['"`]([^'"`]+)['"`]/g,
                /app\.put\(['"`]([^'"`]+)['"`]/g,
                /app\.delete\(['"`]([^'"`]+)['"`]/g,
                /this\.app\.get\(['"`]([^'"`]+)['"`]/g,
                /this\.app\.post\(['"`]([^'"`]+)['"`]/g,
                /this\.app\.put\(['"`]([^'"`]+)['"`]/g,
                /this\.app\.delete\(['"`]([^'"`]+)['"`]/g
            ];
            
            patterns.forEach((pattern, index) => {
                const method = ['GET', 'POST', 'PUT', 'DELETE'][index % 4];
                let match;
                
                while ((match = pattern.exec(appContent)) !== null) {
                    const endpoint = match[1];
                    if (!this.endpoints.has(endpoint)) {
                        this.endpoints.set(endpoint, {
                            path: endpoint,
                            method: method,
                            category: this.categorizeEndpoint(endpoint)
                        });
                    }
                }
            });
            
            console.log(`✅ Encontrados ${this.endpoints.size} endpoints únicos`);
            
        } catch (error) {
            console.error('❌ Erro ao analisar código:', error.message);
        }
    }

    // Categorizar endpoints
    categorizeEndpoint(path) {
        if (path === '/' || path === '/health' || path === '/status') return 'BASIC';
        if (path.includes('/api/auth')) return 'AUTHENTICATION';
        if (path.includes('/api/dashboard') || path.includes('/painel')) return 'DASHBOARD';
        if (path.includes('/api/trade') || path.includes('/api/executors')) return 'TRADING';
        if (path.includes('/api/validation') || path.includes('/api/monitor')) return 'VALIDATION';
        if (path.includes('/api/exchanges') || path.includes('/api/balance')) return 'EXCHANGES';
        if (path.includes('/webhook') || path.includes('/api/webhook')) return 'WEBHOOKS';
        if (path.includes('/api/users') || path.includes('/api/affiliate')) return 'USER_MANAGEMENT';
        if (path.includes('/api/admin') || path.includes('/api/system')) return 'ADMINISTRATION';
        if (path.includes('/api/financial') || path.includes('/api/stripe')) return 'FINANCIAL';
        if (path.includes('/api/test') || path.includes('/demo')) return 'TESTING';
        if (path.includes('/api/reports') || path.includes('/api/saldos')) return 'REPORTS';
        return 'OTHER';
    }

    // Fazer requisição HTTP
    makeRequest(path, method = 'GET') {
        return new Promise((resolve) => {
            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: path,
                method: method,
                timeout: 10000,
                headers: {
                    'User-Agent': 'EndpointTester/1.0',
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
                        data: data.substring(0, 500), // Limitar dados
                        headers: res.headers,
                        contentType: res.headers['content-type'] || 'unknown'
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
                    error: 'Request timeout',
                    data: null
                });
            });

            req.end();
        });
    }

    // Testar endpoint individual
    async testEndpoint(endpoint) {
        const result = await this.makeRequest(endpoint.path, endpoint.method);
        
        return {
            path: endpoint.path,
            method: endpoint.method,
            category: endpoint.category,
            statusCode: result.statusCode,
            success: result.statusCode >= 200 && result.statusCode < 500,
            error: result.error,
            contentType: result.contentType,
            responsePreview: result.data ? result.data.substring(0, 100) : null
        };
    }

    // Testar todos os endpoints
    async testAllEndpoints() {
        console.log('\n🧪 TESTANDO TODOS OS ENDPOINTS...');
        console.log('================================');
        
        const endpointArray = Array.from(this.endpoints.values());
        const categories = {};
        
        for (let i = 0; i < endpointArray.length; i++) {
            const endpoint = endpointArray[i];
            
            console.log(`\n[${i + 1}/${endpointArray.length}] Testando: ${endpoint.method} ${endpoint.path}`);
            
            const result = await this.testEndpoint(endpoint);
            this.testResults.push(result);
            
            // Organizar por categoria
            if (!categories[result.category]) {
                categories[result.category] = [];
            }
            categories[result.category].push(result);
            
            // Status do teste
            const status = result.success ? '✅' : '❌';
            const statusText = result.statusCode || 'ERRO';
            console.log(`   ${status} Status: ${statusText} | Tipo: ${result.contentType}`);
            
            if (result.error) {
                console.log(`   🚫 Erro: ${result.error}`);
            }
            
            // Delay entre requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return categories;
    }

    // Gerar relatório completo
    generateReport(categories) {
        console.log('\n📊 RELATÓRIO COMPLETO DE ENDPOINTS');
        console.log('==================================');
        
        let totalEndpoints = 0;
        let successfulEndpoints = 0;
        let errorEndpoints = 0;
        
        Object.keys(categories).sort().forEach(category => {
            const endpoints = categories[category];
            const categorySuccess = endpoints.filter(e => e.success).length;
            const categoryError = endpoints.filter(e => !e.success).length;
            
            console.log(`\n🏷️  CATEGORIA: ${category}`);
            console.log(`   📊 Total: ${endpoints.length} | ✅ Sucesso: ${categorySuccess} | ❌ Erro: ${categoryError}`);
            
            endpoints.forEach(endpoint => {
                const status = endpoint.success ? '✅' : '❌';
                const statusCode = endpoint.statusCode || 'ERR';
                console.log(`   ${status} ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(40)} [${statusCode}]`);
                
                if (endpoint.error) {
                    console.log(`      🚫 ${endpoint.error}`);
                }
            });
            
            totalEndpoints += endpoints.length;
            successfulEndpoints += categorySuccess;
            errorEndpoints += categoryError;
        });
        
        console.log('\n🎯 RESUMO GERAL');
        console.log('===============');
        console.log(`📊 Total de endpoints: ${totalEndpoints}`);
        console.log(`✅ Funcionando: ${successfulEndpoints} (${Math.round(successfulEndpoints/totalEndpoints*100)}%)`);
        console.log(`❌ Com erro: ${errorEndpoints} (${Math.round(errorEndpoints/totalEndpoints*100)}%)`);
        
        // Endpoints críticos
        const criticalEndpoints = ['/health', '/api/system/status', '/api/current-mode'];
        console.log('\n🔥 ENDPOINTS CRÍTICOS:');
        criticalEndpoints.forEach(path => {
            const result = this.testResults.find(r => r.path === path);
            if (result) {
                const status = result.success ? '✅' : '❌';
                console.log(`${status} ${path} [${result.statusCode}]`);
            } else {
                console.log(`❓ ${path} [NÃO ENCONTRADO]`);
            }
        });
        
        return {
            total: totalEndpoints,
            successful: successfulEndpoints,
            errors: errorEndpoints,
            successRate: Math.round(successfulEndpoints/totalEndpoints*100)
        };
    }

    // Salvar relatório em arquivo
    saveReport(categories, summary) {
        console.log('\n💾 SALVANDO RELATÓRIO...');
        
        try {
            const report = {
                timestamp: new Date().toISOString(),
                summary: summary,
                categories: categories,
                allResults: this.testResults,
                baseUrl: `https://${this.baseUrl}`
            };
            
            const reportPath = path.join(__dirname, 'endpoint-test-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            
            console.log(`✅ Relatório salvo em: ${reportPath}`);
            
            // Criar versão markdown também
            this.saveMarkdownReport(categories, summary);
            
        } catch (error) {
            console.error('❌ Erro ao salvar relatório:', error.message);
        }
    }

    // Salvar relatório em markdown
    saveMarkdownReport(categories, summary) {
        try {
            let markdown = `# 🔍 Relatório de Endpoints - CoinBitClub\n\n`;
            markdown += `**Data**: ${new Date().toLocaleString()}\n`;
            markdown += `**URL Base**: https://${this.baseUrl}\n\n`;
            
            markdown += `## 📊 Resumo Executivo\n\n`;
            markdown += `- **Total de Endpoints**: ${summary.total}\n`;
            markdown += `- **Funcionando**: ${summary.successful} (${summary.successRate}%)\n`;
            markdown += `- **Com Erro**: ${summary.errors}\n\n`;
            
            Object.keys(categories).sort().forEach(category => {
                const endpoints = categories[category];
                markdown += `## 🏷️ ${category}\n\n`;
                markdown += `| Método | Endpoint | Status | Tipo |\n`;
                markdown += `|--------|----------|--------|------|\n`;
                
                endpoints.forEach(endpoint => {
                    const status = endpoint.success ? '✅' : '❌';
                    const statusCode = endpoint.statusCode || 'ERR';
                    markdown += `| ${endpoint.method} | ${endpoint.path} | ${status} ${statusCode} | ${endpoint.contentType} |\n`;
                });
                
                markdown += `\n`;
            });
            
            const markdownPath = path.join(__dirname, 'ENDPOINT-TEST-REPORT.md');
            fs.writeFileSync(markdownPath, markdown);
            
            console.log(`✅ Relatório markdown salvo em: ${markdownPath}`);
            
        } catch (error) {
            console.error('❌ Erro ao salvar markdown:', error.message);
        }
    }

    // Executar análise completa
    async runCompleteAnalysis() {
        console.log('🚀 INICIANDO ANÁLISE COMPLETA DE ENDPOINTS...');
        console.log('=============================================');
        
        // Analisar código
        this.analyzeCodeForEndpoints();
        
        // Aguardar um pouco para o sistema estar pronto
        console.log('\n⏳ Aguardando 3 segundos antes dos testes...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Testar endpoints
        const categories = await this.testAllEndpoints();
        
        // Gerar relatório
        const summary = this.generateReport(categories);
        
        // Salvar relatório
        this.saveReport(categories, summary);
        
        console.log('\n🎉 ANÁLISE COMPLETA CONCLUÍDA!');
        console.log('==============================');
        console.log(`📊 Taxa de sucesso: ${summary.successRate}%`);
        console.log(`🌐 URL: https://${this.baseUrl}`);
        
        return summary;
    }
}

// Executar análise
if (require.main === module) {
    const mapper = new EndpointMapper();
    mapper.runCompleteAnalysis().then((summary) => {
        if (summary.successRate >= 70) {
            console.log('\n🎉 SISTEMA COM BOA SAÚDE!');
            process.exit(0);
        } else {
            console.log('\n⚠️ SISTEMA COM PROBLEMAS');
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Erro na análise:', error.message);
        process.exit(1);
    });
}

module.exports = EndpointMapper;
