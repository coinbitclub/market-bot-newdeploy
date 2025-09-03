// 🧪 ENTERPRISE SYSTEM TESTER
// Teste completo do sistema CoinbitClub MarketBot Enterprise

const http = require('http');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class EnterpriseSystemTester {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.testResults = {
            timestamp: new Date().toISOString(),
            system_status: 'TESTING',
            tests: []
        };
        this.serverProcess = null;
    }

    async runCompleteTest() {
        console.log('🧪 ENTERPRISE SYSTEM TESTER - MARKETBOT');
        console.log('Testando sistema completo conforme especificação');
        console.log('=' .repeat(60));

        try {
            // 1. Verificar estrutura de arquivos
            await this.testFileStructure();
            
            // 2. Inicializar servidor enterprise
            await this.startEnterpriseServer();
            
            // 3. Aguardar inicialização
            await this.waitForServerReady();
            
            // 4. Testar endpoints principais
            await this.testCoreEndpoints();
            
            // 5. Testar sistema financeiro
            await this.testFinancialSystem();
            
            // 6. Testar trading engine
            await this.testTradingEngine();
            
            // 7. Testar sistema de afiliação
            await this.testAffiliateSystem();
            
            // 8. Testar webhooks TradingView
            await this.testTradingViewWebhooks();
            
            // 9. Gerar relatório final
            await this.generateTestReport();
            
            console.log('\n🎉 TESTE COMPLETO FINALIZADO!');
            
        } catch (error) {
            console.error('💥 ERRO NO TESTE:', error.message);
            await this.logError(error);
        } finally {
            await this.cleanup();
        }
    }

    async testFileStructure() {
        console.log('\n📁 TESTANDO ESTRUTURA DE ARQUIVOS...');
        
        const requiredFiles = [
            'src/api/enterprise/app.js',
            'src/services/financial/stripe-unified.service.js',
            'src/services/financial/balance.manager.js',
            'src/trading/enterprise/trading-engine.js',
            'package.json'
        ];

        let passed = 0;
        
        for (const file of requiredFiles) {
            try {
                await fs.access(file);
                console.log(`  ✅ ${file}`);
                passed++;
            } catch (error) {
                console.log(`  ❌ ${file} - AUSENTE`);
            }
        }

        this.addTestResult('file_structure', passed === requiredFiles.length, {
            total_files: requiredFiles.length,
            found_files: passed,
            missing_files: requiredFiles.length - passed
        });

        if (passed < requiredFiles.length) {
            throw new Error(`Estrutura incompleta: ${passed}/${requiredFiles.length} arquivos`);
        }
    }

    async startEnterpriseServer() {
        console.log('\n🚀 INICIANDO SERVIDOR ENTERPRISE...');
        
        const { spawn } = require('child_process');
        
        return new Promise((resolve, reject) => {
            this.serverProcess = spawn('node', ['src/api/enterprise/app.js'], {
                stdio: ['ignore', 'pipe', 'pipe'],
                cwd: process.cwd()
            });

            let output = '';
            
            this.serverProcess.stdout.on('data', (data) => {
                output += data.toString();
                console.log(`  📡 ${data.toString().trim()}`);
                
                if (output.includes('Servidor Enterprise rodando') || 
                    output.includes('listening on port') ||
                    output.includes('Enterprise API running on port')) {
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.log(`  ⚠️  ${data.toString().trim()}`);
            });

            this.serverProcess.on('error', reject);
            
            // Timeout de 15 segundos (reduzido)
            setTimeout(() => {
                reject(new Error('Timeout na inicialização do servidor'));
            }, 15000);
        });
    }

    async waitForServerReady() {
        console.log('\n⏳ AGUARDANDO SERVIDOR FICAR PRONTO...');
        
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            try {
                await this.makeRequest('GET', '/health');
                console.log('  ✅ Servidor pronto!');
                return;
            } catch (error) {
                attempts++;
                console.log(`  ⏳ Tentativa ${attempts}/${maxAttempts}...`);
                await this.sleep(2000);
            }
        }
        
        throw new Error('Servidor não ficou pronto no tempo esperado');
    }

    async testCoreEndpoints() {
        console.log('\n🌐 TESTANDO ENDPOINTS PRINCIPAIS...');
        
        const endpoints = [
            { method: 'GET', path: '/health', description: 'Health Check' },
            { method: 'GET', path: '/api/enterprise/status', description: 'Status Enterprise' },
            { method: 'GET', path: '/api/enterprise/system/info', description: 'System Info' }
        ];

        let passed = 0;
        
        for (const endpoint of endpoints) {
            try {
                const response = await this.makeRequest(endpoint.method, endpoint.path);
                console.log(`  ✅ ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
                passed++;
            } catch (error) {
                console.log(`  ❌ ${endpoint.method} ${endpoint.path} - FALHOU: ${error.message}`);
            }
        }

        this.addTestResult('core_endpoints', passed === endpoints.length, {
            total_endpoints: endpoints.length,
            passed_endpoints: passed
        });
    }

    async testFinancialSystem() {
        console.log('\n💰 TESTANDO SISTEMA FINANCEIRO...');
        
        const tests = [
            {
                name: 'Stripe Health Check',
                test: () => this.makeRequest('GET', '/api/enterprise/financial/stripe/health')
            },
            {
                name: 'Balance Types',
                test: () => this.makeRequest('GET', '/api/enterprise/financial/balance/types')
            },
            {
                name: 'Commission Rates',
                test: () => this.makeRequest('GET', '/api/enterprise/financial/commission/rates')
            }
        ];

        let passed = 0;
        
        for (const test of tests) {
            try {
                await test.test();
                console.log(`  ✅ ${test.name}`);
                passed++;
            } catch (error) {
                console.log(`  ❌ ${test.name} - FALHOU: ${error.message}`);
            }
        }

        this.addTestResult('financial_system', passed === tests.length, {
            total_tests: tests.length,
            passed_tests: passed
        });
    }

    async testTradingEngine() {
        console.log('\n📈 TESTANDO TRADING ENGINE...');
        
        const tests = [
            {
                name: 'Trading Engine Status',
                test: () => this.makeRequest('GET', '/api/enterprise/trading/status')
            },
            {
                name: 'AI Analysis Health',
                test: () => this.makeRequest('GET', '/api/enterprise/trading/ai/health')
            },
            {
                name: 'Risk Management Config',
                test: () => this.makeRequest('GET', '/api/enterprise/trading/risk/config')
            }
        ];

        let passed = 0;
        
        for (const test of tests) {
            try {
                await test.test();
                console.log(`  ✅ ${test.name}`);
                passed++;
            } catch (error) {
                console.log(`  ❌ ${test.name} - FALHOU: ${error.message}`);
            }
        }

        this.addTestResult('trading_engine', passed === tests.length, {
            total_tests: tests.length,
            passed_tests: passed
        });
    }

    async testAffiliateSystem() {
        console.log('\n🤝 TESTANDO SISTEMA DE AFILIAÇÃO...');
        
        const tests = [
            {
                name: 'Affiliate Rates',
                test: () => this.makeRequest('GET', '/api/enterprise/affiliate/rates')
            },
            {
                name: 'Commission Structure',
                test: () => this.makeRequest('GET', '/api/enterprise/affiliate/commission/structure')
            }
        ];

        let passed = 0;
        
        for (const test of tests) {
            try {
                await test.test();
                console.log(`  ✅ ${test.name}`);
                passed++;
            } catch (error) {
                console.log(`  ❌ ${test.name} - FALHOU: ${error.message}`);
            }
        }

        this.addTestResult('affiliate_system', passed === tests.length, {
            total_tests: tests.length,
            passed_tests: passed
        });
    }

    async testTradingViewWebhooks() {
        console.log('\n📡 TESTANDO WEBHOOKS TRADINGVIEW...');
        
        const webhookData = {
            symbol: "BTCUSDT",
            action: "SINAL LONG FORTE - TESTE",
            price: "67500",
            timestamp: new Date().toISOString()
        };

        try {
            const response = await this.makeRequest(
                'POST', 
                '/api/enterprise/trading/webhooks/signal',
                webhookData
            );
            
            console.log('  ✅ Webhook TradingView recebido');
            console.log(`  📊 Resposta: ${JSON.stringify(response).substring(0, 100)}...`);
            
            this.addTestResult('tradingview_webhooks', true, {
                webhook_received: true,
                response_received: true
            });
            
        } catch (error) {
            console.log(`  ❌ Webhook TradingView - FALHOU: ${error.message}`);
            this.addTestResult('tradingview_webhooks', false, {
                error: error.message
            });
        }
    }

    async makeRequest(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseURL);
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Enterprise-System-Tester/1.0'
                }
            };

            const req = http.request(url, options, (res) => {
                let body = '';
                
                res.on('data', chunk => {
                    body += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = body ? JSON.parse(body) : {};
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                        }
                    } catch (error) {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(body);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                        }
                    }
                });
            });

            req.on('error', reject);
            
            if (data) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }

    addTestResult(testName, passed, details = {}) {
        this.testResults.tests.push({
            test: testName,
            passed,
            timestamp: new Date().toISOString(),
            details
        });
    }

    async generateTestReport() {
        console.log('\n📊 GERANDO RELATÓRIO DE TESTE...');
        
        const totalTests = this.testResults.tests.length;
        const passedTests = this.testResults.tests.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

        this.testResults.system_status = passedTests === totalTests ? 'FULLY_OPERATIONAL' : 'PARTIALLY_OPERATIONAL';
        this.testResults.summary = {
            total_tests: totalTests,
            passed_tests: passedTests,
            failed_tests: failedTests,
            success_rate: `${successRate}%`,
            status: this.testResults.system_status
        };

        // Salvar relatório
        const reportPath = `docs/enterprise/system-test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        await fs.writeFile(reportPath, JSON.stringify(this.testResults, null, 2));

        console.log('\n📊 RELATÓRIO DE TESTE:');
        console.log(`✅ Testes passaram: ${passedTests}/${totalTests} (${successRate}%)`);
        console.log(`❌ Testes falharam: ${failedTests}`);
        console.log(`🎯 Status do sistema: ${this.testResults.system_status}`);
        console.log(`📄 Relatório salvo: ${reportPath}`);

        // Mostrar falhas se houver
        if (failedTests > 0) {
            console.log('\n❌ TESTES QUE FALHARAM:');
            this.testResults.tests
                .filter(t => !t.passed)
                .forEach(test => {
                    console.log(`  ❌ ${test.test}: ${test.details.error || 'Falhou'}`);
                });
        }
    }

    async logError(error) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack
        };
        
        await fs.writeFile(
            `logs/enterprise-test-error-${Date.now()}.json`,
            JSON.stringify(errorLog, null, 2)
        );
    }

    async cleanup() {
        console.log('\n🧹 LIMPANDO RECURSOS...');
        
        if (this.serverProcess) {
            this.serverProcess.kill();
            console.log('  ✅ Servidor finalizado');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Executar teste
if (require.main === module) {
    const tester = new EnterpriseSystemTester();
    tester.runCompleteTest()
        .then(() => {
            console.log('\n🎉 TESTE ENTERPRISE FINALIZADO!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 TESTE FALHOU:', error.message);
            process.exit(1);
        });
}

module.exports = EnterpriseSystemTester;
