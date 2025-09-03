/**
 * TESTE INDIVIDUAL DE SISTEMAS - COINBITCLUB MARKETBOT
 * Teste detalhado de cada sistema conforme especificação técnica
 */

const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');

class IndividualSystemTester {
    constructor() {
        this.baseURL = 'http://localhost:3333';
        this.results = {
            individual_tests: {},
            timestamp: new Date().toISOString(),
            specification_compliance: {}
        };
        
        // Token de teste válido
        this.testToken = jwt.sign(
            { 
                id: 1, 
                email: 'admin@test.com', 
                perfil: 'ADMIN',
                saldo_real_brl: 1000,
                saldo_real_usd: 200 
            },
            process.env.JWT_SECRET || 'test-secret-key',
            { expiresIn: '1h' }
        );
    }

    log(message) {
        console.log(`🔍 ${message}`);
    }

    async testUserManagementSystem() {
        this.log('TESTANDO SISTEMA DE USUÁRIOS INDIVIDUALMENTE...');
        const results = {};

        try {
            // Teste 1: Consulta de perfis de usuário
            const profileResponse = await axios.get(`${this.baseURL}/api/users/profiles`, {
                headers: { Authorization: `Bearer ${this.testToken}` }
            });
            
            const expectedProfiles = ['ADMIN', 'GESTOR', 'OPERADOR', 'AFFILIATE_VIP', 'AFFILIATE'];
            const hasAllProfiles = expectedProfiles.every(profile => 
                profileResponse.data.includes(profile)
            );
            
            results.user_profiles = {
                status: hasAllProfiles ? 'PASS' : 'FAIL',
                expected: expectedProfiles,
                actual: profileResponse.data,
                compliance: hasAllProfiles ? '100%' : '0%'
            };

            // Teste 2: Tipos de saldo (6 conforme especificação)
            const balanceResponse = await axios.get(`${this.baseURL}/api/users/balance-types`, {
                headers: { Authorization: `Bearer ${this.testToken}` }
            });
            
            const expectedBalances = [
                'saldo_real_brl', 'saldo_real_usd',
                'saldo_admin_brl', 'saldo_admin_usd', 
                'saldo_comissao_brl', 'saldo_comissao_usd'
            ];
            
            const hasAllBalances = expectedBalances.every(balance => 
                balanceResponse.data.includes(balance)
            );
            
            results.balance_types = {
                status: hasAllBalances ? 'PASS' : 'FAIL',
                expected: expectedBalances,
                actual: balanceResponse.data,
                compliance: hasAllBalances ? '100%' : '0%'
            };

            // Teste 3: Sistema de autenticação
            const authResponse = await axios.post(`${this.baseURL}/api/auth/validate`, {}, {
                headers: { Authorization: `Bearer ${this.testToken}` }
            });
            
            results.authentication = {
                status: authResponse.status === 200 ? 'PASS' : 'FAIL',
                response_code: authResponse.status,
                compliance: authResponse.status === 200 ? '100%' : '0%'
            };

        } catch (error) {
            results.error = {
                status: 'FAIL',
                message: error.message,
                compliance: '0%'
            };
        }

        return results;
    }

    async testAffiliateSystem() {
        this.log('TESTANDO SISTEMA DE AFILIAÇÃO INDIVIDUALMENTE...');
        const results = {};

        try {
            // Teste 1: Taxas de comissão conforme especificação
            const commissionResponse = await axios.get(`${this.baseURL}/api/affiliate/commission-rates`);
            
            const expectedRates = {
                normal: 0.015,  // 1.5%
                vip: 0.05       // 5%
            };
            
            const ratesMatch = commissionResponse.data.normal === expectedRates.normal &&
                              commissionResponse.data.vip === expectedRates.vip;
            
            results.commission_rates = {
                status: ratesMatch ? 'PASS' : 'FAIL',
                expected: expectedRates,
                actual: commissionResponse.data,
                compliance: ratesMatch ? '100%' : '0%'
            };

            // Teste 2: Bônus de conversão (+10%)
            const bonusResponse = await axios.get(`${this.baseURL}/api/affiliate/conversion-bonus`);
            
            const expectedBonus = 0.10; // 10%
            const bonusMatch = bonusResponse.data.bonus === expectedBonus;
            
            results.conversion_bonus = {
                status: bonusMatch ? 'PASS' : 'FAIL',
                expected: expectedBonus,
                actual: bonusResponse.data.bonus,
                compliance: bonusMatch ? '100%' : '0%'
            };

            // Teste 3: Estrutura hierárquica
            const hierarchyResponse = await axios.get(`${this.baseURL}/api/affiliate/hierarchy-test`);
            
            results.hierarchy_structure = {
                status: hierarchyResponse.status === 200 ? 'PASS' : 'FAIL',
                response_code: hierarchyResponse.status,
                compliance: hierarchyResponse.status === 200 ? '100%' : '0%'
            };

        } catch (error) {
            results.error = {
                status: 'FAIL',
                message: error.message,
                compliance: '0%'
            };
        }

        return results;
    }

    async testFinancialSystem() {
        this.log('TESTANDO SISTEMA FINANCEIRO INDIVIDUALMENTE...');
        const results = {};

        try {
            // Teste 1: Planos Stripe conforme especificação
            const plansResponse = await axios.get(`${this.baseURL}/api/financial/stripe-plans`);
            
            const expectedPlans = {
                brazil: { price: 297, currency: 'BRL' },
                international: { price: 50, currency: 'USD' }
            };
            
            const plansMatch = plansResponse.data.brazil?.price === expectedPlans.brazil.price &&
                              plansResponse.data.international?.price === expectedPlans.international.price;
            
            results.stripe_plans = {
                status: plansMatch ? 'PASS' : 'FAIL',
                expected: expectedPlans,
                actual: plansResponse.data,
                compliance: plansMatch ? '100%' : '0%'
            };

            // Teste 2: Taxas de comissão sobre LUCRO
            const commissionResponse = await axios.get(`${this.baseURL}/api/financial/commission-rates`);
            
            const expectedCommissions = {
                monthly: 0.10,    // 10% sobre lucro
                prepaid: 0.20     // 20% sobre lucro
            };
            
            const commissionsMatch = commissionResponse.data.monthly === expectedCommissions.monthly &&
                                   commissionResponse.data.prepaid === expectedCommissions.prepaid;
            
            results.commission_rates = {
                status: commissionsMatch ? 'PASS' : 'FAIL',
                expected: expectedCommissions,
                actual: commissionResponse.data,
                compliance: commissionsMatch ? '100%' : '0%'
            };

            // Teste 3: Regras de saque
            const withdrawalResponse = await axios.get(`${this.baseURL}/api/financial/withdrawal-rules`);
            
            results.withdrawal_rules = {
                status: withdrawalResponse.status === 200 ? 'PASS' : 'FAIL',
                response_code: withdrawalResponse.status,
                compliance: withdrawalResponse.status === 200 ? '100%' : '0%'
            };

        } catch (error) {
            results.error = {
                status: 'FAIL',
                message: error.message,
                compliance: '0%'
            };
        }

        return results;
    }

    async testTradingSystem() {
        this.log('TESTANDO SISTEMA DE TRADING/IA INDIVIDUALMENTE...');
        const results = {};

        try {
            // Teste 1: Configurações de trading conforme especificação
            const configResponse = await axios.get(`${this.baseURL}/api/trading/config`);
            
            const expectedConfig = {
                max_positions: 2,
                cooldown_minutes: 120,
                risk_per_trade: 0.02,
                mandatory_sl_tp: true
            };
            
            const configMatch = configResponse.data.max_positions === expectedConfig.max_positions &&
                               configResponse.data.cooldown_minutes === expectedConfig.cooldown_minutes &&
                               configResponse.data.risk_per_trade === expectedConfig.risk_per_trade &&
                               configResponse.data.mandatory_sl_tp === expectedConfig.mandatory_sl_tp;
            
            results.trading_config = {
                status: configMatch ? 'PASS' : 'FAIL',
                expected: expectedConfig,
                actual: configResponse.data,
                compliance: configMatch ? '100%' : '0%'
            };

            // Teste 2: Integração OpenAI GPT-4
            const aiResponse = await axios.get(`${this.baseURL}/api/trading/ai-status`);
            
            const expectedAI = {
                model: 'gpt-4',
                features: ['fear_greed_analysis', 'market_pulse', 'risk_assessment']
            };
            
            const aiMatch = aiResponse.data.model === expectedAI.model;
            
            results.ai_integration = {
                status: aiMatch ? 'PASS' : 'FAIL',
                expected: expectedAI,
                actual: aiResponse.data,
                compliance: aiMatch ? '100%' : '0%'
            };

            // Teste 3: Engine de trading
            const engineResponse = await axios.get(`${this.baseURL}/api/trading/engine-status`);
            
            results.trading_engine = {
                status: engineResponse.status === 200 ? 'PASS' : 'FAIL',
                response_code: engineResponse.status,
                compliance: engineResponse.status === 200 ? '100%' : '0%'
            };

        } catch (error) {
            results.error = {
                status: 'FAIL',
                message: error.message,
                compliance: '0%'
            };
        }

        return results;
    }

    async testWebhooksSystem() {
        this.log('TESTANDO SISTEMA DE WEBHOOKS INDIVIDUALMENTE...');
        const results = {};

        try {
            // Teste 1: Webhook sinal LONG
            const longSignal = {
                action: 'BUY',
                symbol: 'BTCUSDT',
                strength: 'FORTE',
                timestamp: new Date().toISOString()
            };
            
            const longResponse = await axios.post(`${this.baseURL}/webhook/tradingview/signal`, longSignal);
            
            results.long_signal = {
                status: longResponse.status === 200 ? 'PASS' : 'FAIL',
                response_code: longResponse.status,
                compliance: longResponse.status === 200 ? '100%' : '0%'
            };

            // Teste 2: Webhook sinal SHORT
            const shortSignal = {
                action: 'SELL',
                symbol: 'BTCUSDT',
                strength: 'FORTE',
                timestamp: new Date().toISOString()
            };
            
            const shortResponse = await axios.post(`${this.baseURL}/webhook/tradingview/signal`, shortSignal);
            
            results.short_signal = {
                status: shortResponse.status === 200 ? 'PASS' : 'FAIL',
                response_code: shortResponse.status,
                compliance: shortResponse.status === 200 ? '100%' : '0%'
            };

            // Teste 3: Validação de tempo (30s conforme especificação)
            const timeValidationResponse = await axios.get(`${this.baseURL}/api/webhooks/time-validation`);
            
            results.time_validation = {
                status: timeValidationResponse.status === 200 ? 'PASS' : 'FAIL',
                response_code: timeValidationResponse.status,
                compliance: timeValidationResponse.status === 200 ? '100%' : '0%'
            };

        } catch (error) {
            results.error = {
                status: 'FAIL',
                message: error.message,
                compliance: '0%'
            };
        }

        return results;
    }

    async generateIndividualReport() {
        this.log('🎯 INICIANDO TESTES INDIVIDUAIS DE TODOS OS SISTEMAS...');
        
        // Executar todos os testes individuais
        this.results.individual_tests.user_management = await this.testUserManagementSystem();
        this.results.individual_tests.affiliate_system = await this.testAffiliateSystem();
        this.results.individual_tests.financial_system = await this.testFinancialSystem();
        this.results.individual_tests.trading_system = await this.testTradingSystem();
        this.results.individual_tests.webhooks_system = await this.testWebhooksSystem();

        // Calcular conformidade geral
        let totalTests = 0;
        let passedTests = 0;

        Object.keys(this.results.individual_tests).forEach(system => {
            const systemTests = this.results.individual_tests[system];
            Object.keys(systemTests).forEach(test => {
                if (test !== 'error') {
                    totalTests++;
                    if (systemTests[test].status === 'PASS') {
                        passedTests++;
                    }
                }
            });
        });

        this.results.overall_compliance = {
            total_tests: totalTests,
            passed_tests: passedTests,
            compliance_percentage: ((passedTests / totalTests) * 100).toFixed(1),
            status: passedTests === totalTests ? 'FULLY_COMPLIANT' : 'NEEDS_ATTENTION'
        };

        // Salvar relatório
        const reportPath = `docs/enterprise/individual-systems-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        
        if (!fs.existsSync('docs/enterprise')) {
            fs.mkdirSync('docs/enterprise', { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

        return this.results;
    }

    displayResults() {
        console.log('\n📊 RELATÓRIO DE TESTES INDIVIDUAIS POR SISTEMA:');
        console.log('='.repeat(60));

        Object.keys(this.results.individual_tests).forEach(system => {
            console.log(`\n🔧 SISTEMA: ${system.toUpperCase()}`);
            const systemTests = this.results.individual_tests[system];
            
            Object.keys(systemTests).forEach(test => {
                if (test !== 'error') {
                    const result = systemTests[test];
                    const status = result.status === 'PASS' ? '✅' : '❌';
                    console.log(`  ${status} ${test}: ${result.compliance}`);
                }
            });
        });

        console.log('\n📈 CONFORMIDADE GERAL:');
        console.log(`  🎯 Testes totais: ${this.results.overall_compliance.total_tests}`);
        console.log(`  ✅ Testes aprovados: ${this.results.overall_compliance.passed_tests}`);
        console.log(`  📊 Conformidade: ${this.results.overall_compliance.compliance_percentage}%`);
        console.log(`  🏆 Status: ${this.results.overall_compliance.status}`);
    }
}

// Executar testes se chamado diretamente
if (require.main === module) {
    const tester = new IndividualSystemTester();
    
    tester.generateIndividualReport()
        .then(() => {
            tester.displayResults();
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro nos testes individuais:', error.message);
            process.exit(1);
        });
}

module.exports = IndividualSystemTester;
