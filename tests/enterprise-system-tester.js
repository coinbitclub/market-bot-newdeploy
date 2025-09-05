/**
 * 🧪 ENTERPRISE SYSTEM TESTER - VALIDAÇÃO COMPLETA
 * =================================================
 * 
 * Suite de testes integrados para CoinBitClub Enterprise v6.0.0
 * Valida todos os componentes após Fases 1 e 2
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0 Testing Suite
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class EnterpriseSystemTester {
    constructor() {
        this.baseURL = process.env.TEST_BASE_URL || 'http://localhost:3333';
        this.results = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            startTime: Date.now(),
            tests: []
        };
        
        console.log('🧪 Enterprise System Tester iniciado');
        console.log(`🎯 Target URL: ${this.baseURL}`);
    }

    /**
     * 🔍 TESTE 1: Componentes Core
     */
    async testCoreComponents() {
        console.log('\n🔍 TESTE 1: VALIDAÇÃO DE COMPONENTES CORE');
        console.log('=========================================');
        
        const testResults = [];

        // Test 1.1: Sistema principal
        try {
            console.log('1.1 Testando sistema principal...');
            const response = await axios.get(`${this.baseURL}/`, { timeout: 10000 });
            
            if (response.status === 200 && response.data.system) {
                testResults.push({ test: 'Sistema Principal', status: 'PASS', details: response.data });
                console.log('  ✅ Sistema principal respondendo');
            } else {
                throw new Error('Sistema principal não respondeu adequadamente');
            }
        } catch (error) {
            testResults.push({ test: 'Sistema Principal', status: 'FAIL', error: error.message });
            console.log('  ❌ Sistema principal falhou:', error.message);
        }

        // Test 1.2: Health check
        try {
            console.log('1.2 Testando health check...');
            const response = await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
            
            if (response.status === 200) {
                testResults.push({ test: 'Health Check', status: 'PASS', details: response.data });
                console.log('  ✅ Health check OK');
            } else {
                throw new Error('Health check retornou status não-200');
            }
        } catch (error) {
            testResults.push({ test: 'Health Check', status: 'FAIL', error: error.message });
            console.log('  ❌ Health check falhou:', error.message);
        }

        // Test 1.3: Enterprise API status
        try {
            console.log('1.3 Testando Enterprise API...');
            const response = await axios.get(`${this.baseURL}/api/enterprise/status`, { timeout: 5000 });
            
            if (response.status === 200) {
                testResults.push({ test: 'Enterprise API', status: 'PASS', details: response.data });
                console.log('  ✅ Enterprise API respondendo');
            } else {
                throw new Error('Enterprise API não disponível');
            }
        } catch (error) {
            testResults.push({ test: 'Enterprise API', status: 'FAIL', error: error.message });
            console.log('  ❌ Enterprise API falhou:', error.message);
        }

        // Test 1.4: Database connection
        try {
            console.log('1.4 Testando conexão database...');
            const response = await axios.get(`${this.baseURL}/api/enterprise/database/stats`, { timeout: 5000 });
            
            if (response.status === 200 && response.data.master) {
                testResults.push({ test: 'Database Connection', status: 'PASS', details: response.data });
                console.log('  ✅ Database conectado');
            } else {
                throw new Error('Database não conectado');
            }
        } catch (error) {
            testResults.push({ test: 'Database Connection', status: 'FAIL', error: error.message });
            console.log('  ❌ Database falhou:', error.message);
        }

        // Test 1.5: Cache Redis
        try {
            console.log('1.5 Testando Cache Redis...');
            const response = await axios.get(`${this.baseURL}/api/enterprise/cache/stats`, { timeout: 5000 });
            
            if (response.status === 200) {
                testResults.push({ test: 'Cache Redis', status: 'PASS', details: response.data });
                console.log('  ✅ Cache Redis funcionando');
            } else {
                throw new Error('Cache Redis não disponível');
            }
        } catch (error) {
            testResults.push({ test: 'Cache Redis', status: 'FAIL', error: error.message });
            console.log('  ❌ Cache Redis falhou:', error.message);
        }

        return this.processTestResults('TESTE 1: Componentes Core', testResults);
    }

    /**
     * 🔐 TESTE 2: Sistema de Autenticação 2FA
     */
    async testAuthentication2FA() {
        console.log('\n🔐 TESTE 2: SISTEMA DE AUTENTICAÇÃO 2FA');
        console.log('=======================================');
        
        const testResults = [];

        // Test 2.1: Setup 2FA endpoint
        try {
            console.log('2.1 Testando endpoint de setup 2FA...');
            const response = await axios.post(`${this.baseURL}/api/enterprise/auth/2fa/setup`, {
                userId: 'test_user'
            }, { timeout: 5000 });
            
            if (response.status === 200 && response.data.qrCode) {
                testResults.push({ test: '2FA Setup', status: 'PASS', details: 'QR Code gerado' });
                console.log('  ✅ 2FA Setup funcionando');
            } else {
                throw new Error('2FA Setup não retornou QR code');
            }
        } catch (error) {
            testResults.push({ test: '2FA Setup', status: 'FAIL', error: error.message });
            console.log('  ❌ 2FA Setup falhou:', error.message);
        }

        // Test 2.2: Backup codes generation
        try {
            console.log('2.2 Testando geração de backup codes...');
            const response = await axios.post(`${this.baseURL}/api/enterprise/auth/2fa/backup-codes`, {
                userId: 'test_user'
            }, { timeout: 5000 });
            
            if (response.status === 200 && response.data.backupCodes) {
                testResults.push({ test: 'Backup Codes', status: 'PASS', details: `${response.data.backupCodes.length} códigos gerados` });
                console.log('  ✅ Backup codes gerados');
            } else {
                throw new Error('Backup codes não gerados');
            }
        } catch (error) {
            testResults.push({ test: 'Backup Codes', status: 'FAIL', error: error.message });
            console.log('  ❌ Backup codes falharam:', error.message);
        }

        // Test 2.3: SMS code (simulação)
        try {
            console.log('2.3 Testando SMS code (simulação)...');
            const response = await axios.post(`${this.baseURL}/api/enterprise/auth/2fa/sms`, {
                phoneNumber: '+5511999999999'
            }, { timeout: 5000 });
            
            if (response.status === 200) {
                testResults.push({ test: 'SMS Code', status: 'PASS', details: 'SMS simulado enviado' });
                console.log('  ✅ SMS code funcionando');
            } else {
                throw new Error('SMS code falhou');
            }
        } catch (error) {
            testResults.push({ test: 'SMS Code', status: 'FAIL', error: error.message });
            console.log('  ❌ SMS code falhou:', error.message);
        }

        return this.processTestResults('TESTE 2: Autenticação 2FA', testResults);
    }

    /**
     * 💰 TESTE 3: Sistema Financeiro
     */
    async testFinancialSystem() {
        console.log('\n💰 TESTE 3: SISTEMA FINANCEIRO E CONVERSÕES');
        console.log('===========================================');
        
        const testResults = [];

        // Test 3.1: Conversão USD/BRL
        try {
            console.log('3.1 Testando conversão USD para BRL...');
            const response = await axios.get(`${this.baseURL}/api/enterprise/financial/usd-to-brl/100`, { timeout: 5000 });
            
            if (response.status === 200 && response.data.converted_amount) {
                testResults.push({ test: 'Conversão USD/BRL', status: 'PASS', details: response.data });
                console.log(`  ✅ Conversão: $100 = R$ ${response.data.converted_amount}`);
            } else {
                throw new Error('Conversão USD/BRL falhou');
            }
        } catch (error) {
            testResults.push({ test: 'Conversão USD/BRL', status: 'FAIL', error: error.message });
            console.log('  ❌ Conversão falhou:', error.message);
        }

        // Test 3.2: Sistema de créditos administrativos
        try {
            console.log('3.2 Testando sistema de créditos administrativos...');
            
            // Importar e testar sistema de créditos
            const { SistemaCreditosAdministrativos } = require('../scripts/system/sistema-creditos-administrativos-correto');
            const sistemaCreditos = new SistemaCreditosAdministrativos();
            
            // Criar tabelas se necessário
            await sistemaCreditos.criarTabelaCupons();
            
            // Gerar cupom de teste
            const cupom = await sistemaCreditos.gerarCupomAdministrativo(1, 'BASIC', 'Cupom de teste');
            
            if (cupom && cupom.coupon_code) {
                testResults.push({ test: 'Créditos Administrativos', status: 'PASS', details: `Cupom gerado: ${cupom.coupon_code}` });
                console.log(`  ✅ Cupom gerado: ${cupom.coupon_code}`);
            } else {
                throw new Error('Falha na geração de cupom');
            }
        } catch (error) {
            testResults.push({ test: 'Créditos Administrativos', status: 'FAIL', error: error.message });
            console.log('  ❌ Créditos administrativos falharam:', error.message);
        }

        // Test 3.3: Tipos de crédito disponíveis
        try {
            console.log('3.3 Testando tipos de crédito...');
            const response = await axios.get(`${this.baseURL}/api/admin/credit-types`, { timeout: 5000 });
            
            if (response.status === 200 && response.data.credit_types) {
                testResults.push({ test: 'Tipos de Crédito', status: 'PASS', details: `${response.data.credit_types.length} tipos disponíveis` });
                console.log(`  ✅ ${response.data.credit_types.length} tipos de crédito disponíveis`);
            } else {
                throw new Error('Tipos de crédito não disponíveis');
            }
        } catch (error) {
            testResults.push({ test: 'Tipos de Crédito', status: 'FAIL', error: error.message });
            console.log('  ❌ Tipos de crédito falharam:', error.message);
        }

        return this.processTestResults('TESTE 3: Sistema Financeiro', testResults);
    }

    /**
     * 📊 TESTE 4: Trading System
     */
    async testTradingSystem() {
        console.log('\n📊 TESTE 4: TRADING SYSTEM COM VALIDAÇÕES');
        console.log('=========================================');
        
        const testResults = [];

        // Test 4.1: Trading status
        try {
            console.log('4.1 Testando status do trading...');
            const response = await axios.get(`${this.baseURL}/api/enterprise/trading/status`, { timeout: 5000 });
            
            if (response.status === 200) {
                testResults.push({ test: 'Trading Status', status: 'PASS', details: response.data });
                console.log('  ✅ Trading system online');
            } else {
                throw new Error('Trading system não disponível');
            }
        } catch (error) {
            testResults.push({ test: 'Trading Status', status: 'FAIL', error: error.message });
            console.log('  ❌ Trading status falhou:', error.message);
        }

        // Test 4.2: Validação de cooldown
        try {
            console.log('4.2 Testando validação de cooldown...');
            const response = await axios.post(`${this.baseURL}/api/enterprise/trading/validate-cooldown`, {
                userId: 'test_user',
                symbol: 'BTCUSDT'
            }, { timeout: 5000 });
            
            if (response.status === 200) {
                testResults.push({ test: 'Cooldown Validation', status: 'PASS', details: response.data });
                console.log('  ✅ Validação de cooldown funcionando');
            } else {
                throw new Error('Validação de cooldown falhou');
            }
        } catch (error) {
            testResults.push({ test: 'Cooldown Validation', status: 'FAIL', error: error.message });
            console.log('  ❌ Cooldown validation falhou:', error.message);
        }

        // Test 4.3: Validação de posições máximas
        try {
            console.log('4.3 Testando validação de posições máximas...');
            const response = await axios.post(`${this.baseURL}/api/enterprise/trading/validate-positions`, {
                userId: 'test_user'
            }, { timeout: 5000 });
            
            if (response.status === 200) {
                testResults.push({ test: 'Max Positions Validation', status: 'PASS', details: response.data });
                console.log('  ✅ Validação de posições funcionando');
            } else {
                throw new Error('Validação de posições falhou');
            }
        } catch (error) {
            testResults.push({ test: 'Max Positions Validation', status: 'FAIL', error: error.message });
            console.log('  ❌ Positions validation falhou:', error.message);
        }

        return this.processTestResults('TESTE 4: Trading System', testResults);
    }

    /**
     * 🤖 TESTE 5: OpenAI Rate Limiting
     */
    async testOpenAIRateLimiting() {
        console.log('\n🤖 TESTE 5: RATE LIMITING OPENAI E FALLBACK');
        console.log('==========================================');
        
        const testResults = [];

        // Test 5.1: Rate limiter stats
        try {
            console.log('5.1 Testando stats do rate limiter...');
            const response = await axios.get(`${this.baseURL}/api/enterprise/ai/rate-limiter/stats`, { timeout: 5000 });
            
            if (response.status === 200) {
                testResults.push({ test: 'Rate Limiter Stats', status: 'PASS', details: response.data });
                console.log('  ✅ Rate limiter funcionando');
            } else {
                throw new Error('Rate limiter não disponível');
            }
        } catch (error) {
            testResults.push({ test: 'Rate Limiter Stats', status: 'FAIL', error: error.message });
            console.log('  ❌ Rate limiter falhou:', error.message);
        }

        // Test 5.2: Fallback system
        try {
            console.log('5.2 Testando sistema de fallback...');
            const response = await axios.post(`${this.baseURL}/api/enterprise/ai/analyze`, {
                prompt: 'Test analysis for BTCUSDT',
                forceFailure: true // Força o fallback
            }, { timeout: 10000 });
            
            if (response.status === 200 && response.data.fallback_mode) {
                testResults.push({ test: 'Fallback System', status: 'PASS', details: 'Fallback ativado corretamente' });
                console.log('  ✅ Sistema de fallback funcionando');
            } else {
                throw new Error('Sistema de fallback não ativou');
            }
        } catch (error) {
            testResults.push({ test: 'Fallback System', status: 'FAIL', error: error.message });
            console.log('  ❌ Fallback system falhou:', error.message);
        }

        return this.processTestResults('TESTE 5: OpenAI Rate Limiting', testResults);
    }

    /**
     * 📊 TESTE 6: Monitoramento e Métricas
     */
    async testMonitoringMetrics() {
        console.log('\n📊 TESTE 6: MONITORAMENTO E MÉTRICAS');
        console.log('===================================');
        
        const testResults = [];

        // Test 6.1: Métricas Prometheus
        try {
            console.log('6.1 Testando métricas Prometheus...');
            const response = await axios.get(`${this.baseURL}/metrics`, { timeout: 5000 });
            
            if (response.status === 200 && response.data.includes('coinbitclub_')) {
                testResults.push({ test: 'Prometheus Metrics', status: 'PASS', details: 'Métricas disponíveis' });
                console.log('  ✅ Métricas Prometheus funcionando');
            } else {
                throw new Error('Métricas Prometheus não disponíveis');
            }
        } catch (error) {
            testResults.push({ test: 'Prometheus Metrics', status: 'FAIL', error: error.message });
            console.log('  ❌ Prometheus metrics falhou:', error.message);
        }

        // Test 6.2: Logs estruturados
        try {
            console.log('6.2 Testando logs estruturados...');
            const response = await axios.get(`${this.baseURL}/api/enterprise/logs/stats`, { timeout: 5000 });
            
            if (response.status === 200) {
                testResults.push({ test: 'Structured Logs', status: 'PASS', details: response.data });
                console.log('  ✅ Logs estruturados funcionando');
            } else {
                throw new Error('Logs estruturados não disponíveis');
            }
        } catch (error) {
            testResults.push({ test: 'Structured Logs', status: 'FAIL', error: error.message });
            console.log('  ❌ Structured logs falhou:', error.message);
        }

        return this.processTestResults('TESTE 6: Monitoramento e Métricas', testResults);
    }

    /**
     * 📊 Processar resultados dos testes
     */
    processTestResults(testName, testResults) {
        const passed = testResults.filter(t => t.status === 'PASS').length;
        const failed = testResults.filter(t => t.status === 'FAIL').length;
        const total = testResults.length;
        
        this.results.totalTests += total;
        this.results.passedTests += passed;
        this.results.failedTests += failed;
        
        const testResult = {
            name: testName,
            total,
            passed,
            failed,
            successRate: total > 0 ? ((passed / total) * 100).toFixed(2) + '%' : '0%',
            details: testResults
        };
        
        this.results.tests.push(testResult);
        
        console.log(`\n📊 Resultado: ${passed}/${total} testes passaram (${testResult.successRate})`);
        
        return testResult;
    }

    /**
     * 🚀 Executar todos os testes
     */
    async runAllTests() {
        console.log('🚀 INICIANDO SUITE COMPLETA DE TESTES');
        console.log('====================================');
        
        try {
            // Executar testes sequencialmente
            await this.testCoreComponents();
            await this.testAuthentication2FA();
            await this.testFinancialSystem();
            await this.testTradingSystem();
            await this.testOpenAIRateLimiting();
            await this.testMonitoringMetrics();
            
            // Gerar relatório final
            this.generateFinalReport();
            
        } catch (error) {
            console.error('❌ Erro durante execução dos testes:', error);
        }
    }

    /**
     * 📋 Gerar relatório final
     */
    generateFinalReport() {
        const duration = Date.now() - this.results.startTime;
        const successRate = this.results.totalTests > 0 
            ? ((this.results.passedTests / this.results.totalTests) * 100).toFixed(2) + '%'
            : '0%';

        console.log('\n🎯 RELATÓRIO FINAL DOS TESTES');
        console.log('============================');
        console.log(`⏱️ Duração: ${Math.round(duration / 1000)}s`);
        console.log(`📊 Total de testes: ${this.results.totalTests}`);
        console.log(`✅ Testes passaram: ${this.results.passedTests}`);
        console.log(`❌ Testes falharam: ${this.results.failedTests}`);
        console.log(`🎯 Taxa de sucesso: ${successRate}`);
        
        console.log('\n📋 Resumo por categoria:');
        this.results.tests.forEach(test => {
            const status = test.failed === 0 ? '✅' : '❌';
            console.log(`  ${status} ${test.name}: ${test.successRate}`);
        });

        if (this.results.failedTests === 0) {
            console.log('\n🎉 TODOS OS TESTES PASSARAM!');
            console.log('✅ Sistema pronto para produção');
        } else {
            console.log('\n⚠️ ALGUNS TESTES FALHARAM');
            console.log('🔍 Revisar falhas antes do deploy');
        }

        // Salvar relatório em arquivo
        const reportPath = path.join(process.cwd(), 'test-results.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`📁 Relatório salvo em: ${reportPath}`);
    }
}

module.exports = EnterpriseSystemTester;

// 🚀 Executar testes se chamado diretamente
if (require.main === module) {
    const tester = new EnterpriseSystemTester();
    tester.runAllTests().catch(error => {
        console.error('❌ Erro na execução dos testes:', error);
        process.exit(1);
    });
}
