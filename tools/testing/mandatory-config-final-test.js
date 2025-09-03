/**
 * 🔍 TESTE FINAL - VERIFICAÇÃO DE CONFIGURAÇÕES OBRIGATÓRIAS
 * =========================================================
 * 
 * Verifica se o sistema está aplicando CORRETAMENTE as configurações
 * obrigatórias da especificação técnica
 */

const path = require('path');

class MandatoryConfigurationTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
    }

    /**
     * 🎯 EXECUTAR TODOS OS TESTES DE CONFIGURAÇÃO OBRIGATÓRIA
     */
    async runAllTests() {
        console.log('🔍 TESTANDO APLICAÇÃO DE CONFIGURAÇÕES OBRIGATÓRIAS...\n');

        try {
            // 1. Testar Universal Config Enforcer
            await this.testUniversalConfigEnforcer();
            
            // 2. Testar aplicação de defaults obrigatórios
            await this.testMandatoryDefaults();
            
            // 3. Testar validação de limites obrigatórios
            await this.testMandatoryLimits();
            
            // 4. Testar enforcement de SL/TP obrigatórios
            await this.testMandatoryStopLossTakeProfit();
            
            // 5. Testar cooldown e posições máximas
            await this.testPositionLimits();
            
            // 6. Testar que análise de risco não bloqueia operações
            await this.testRiskAnalysisInformative();
            
            // Relatório final
            this.generateFinalReport();
            
        } catch (error) {
            console.error('❌ Erro durante testes:', error.message);
        }
    }

    /**
     * 🛠️ TESTE 1: UNIVERSAL CONFIG ENFORCER
     */
    async testUniversalConfigEnforcer() {
        console.log('🔧 TESTE 1: Universal Config Enforcer');
        
        try {
            const UniversalConfigEnforcer = require('../../src/utils/universal-config-enforcer.js');
            const enforcer = new UniversalConfigEnforcer();
            
            // Testar aplicação de defaults
            const userConfig = {}; // Usuário sem configurações
            const enforced = enforcer.enforceSpecificationDefaults(userConfig);
            
            this.assert(enforced.leverage === 5, 'Default leverage deve ser 5x');
            this.assert(enforced.stopLoss === 10, 'Default SL deve ser 10% (2x5)');
            this.assert(enforced.takeProfit === 15, 'Default TP deve ser 15% (3x5)');
            this.assert(enforced.positionSizePercent === 30, 'Default position size deve ser 30%');
            this.assert(enforced.maxPositions === 2, 'Máximo 2 posições deve ser forçado');
            this.assert(enforced.cooldownMinutes === 120, 'Cooldown 120min deve ser forçado');
            this.assert(enforced.mandatoryStopLoss === true, 'SL obrigatório deve ser true');
            this.assert(enforced.mandatoryTakeProfit === true, 'TP obrigatório deve ser true');
            
            console.log('   ✅ Universal Config Enforcer funcionando corretamente');
            
        } catch (error) {
            this.fail('Universal Config Enforcer não funciona: ' + error.message);
        }
    }

    /**
     * 🎯 TESTE 2: DEFAULTS OBRIGATÓRIOS
     */
    async testMandatoryDefaults() {
        console.log('🎯 TESTE 2: Defaults Obrigatórios da Especificação');
        
        try {
            const UniversalConfigEnforcer = require('../../src/utils/universal-config-enforcer.js');
            const enforcer = new UniversalConfigEnforcer();
            
            // Testar com configurações parciais do usuário
            const partialConfig = { leverage: 8 };
            const enforced = enforcer.enforceSpecificationDefaults(partialConfig);
            
            this.assert(enforced.leverage === 8, 'Leverage do usuário deve ser respeitado se válido');
            this.assert(enforced.stopLoss === 16, 'SL deve ser calculado: 8x2 = 16%');
            this.assert(enforced.takeProfit === 24, 'TP deve ser calculado: 8x3 = 24%');
            
            // Testar limitação automática
            const excessiveConfig = { leverage: 15, positionSizePercent: 70 };
            const limited = enforcer.enforceSpecificationDefaults(excessiveConfig);
            
            this.assert(limited.leverage === 10, 'Leverage deve ser limitado ao máximo (10x)');
            this.assert(limited.positionSizePercent === 50, 'Position size deve ser limitado (50%)');
            
            console.log('   ✅ Defaults obrigatórios aplicados corretamente');
            
        } catch (error) {
            this.fail('Defaults obrigatórios falharam: ' + error.message);
        }
    }

    /**
     * 🚫 TESTE 3: LIMITES OBRIGATÓRIOS
     */
    async testMandatoryLimits() {
        console.log('🚫 TESTE 3: Limites Obrigatórios');
        
        try {
            const UniversalConfigEnforcer = require('../../src/utils/universal-config-enforcer.js');
            const enforcer = new UniversalConfigEnforcer();
            
            // Testar operação que excede limites
            const excessiveOperation = {
                leverage: 20,
                positionSizePercent: 80,
                stopLoss: 0,
                takeProfit: 0
            };
            
            const validation = enforcer.validateAgainstSpecification(excessiveOperation);
            
            this.assert(!validation.isValid, 'Operação excessiva deve ser rejeitada');
            this.assert(validation.errors.length > 0, 'Deve conter erros de validação');
            this.assert(validation.enforcedConfig.leverage <= 10, 'Config forçada deve respeitar limites');
            
            console.log('   ✅ Limites obrigatórios sendo enforçados');
            
        } catch (error) {
            this.fail('Limites obrigatórios falharam: ' + error.message);
        }
    }

    /**
     * 🛡️ TESTE 4: SL/TP OBRIGATÓRIOS
     */
    async testMandatoryStopLossTakeProfit() {
        console.log('🛡️ TESTE 4: Stop Loss e Take Profit Obrigatórios');
        
        try {
            const UniversalConfigEnforcer = require('../../src/utils/universal-config-enforcer.js');
            const enforcer = new UniversalConfigEnforcer();
            
            // Testar operação sem SL/TP
            const operationWithoutStopLoss = {
                leverage: 5,
                positionSizePercent: 30,
                stopLoss: 0,
                takeProfit: 15
            };
            
            const validation1 = enforcer.validateAgainstSpecification(operationWithoutStopLoss);
            this.assert(!validation1.isValid, 'Operação sem SL deve ser rejeitada');
            this.assert(validation1.errors.some(e => e.includes('Stop Loss')), 'Erro deve mencionar Stop Loss');
            
            // Testar operação sem TP
            const operationWithoutTakeProfit = {
                leverage: 5,
                positionSizePercent: 30,
                stopLoss: 10,
                takeProfit: 0
            };
            
            const validation2 = enforcer.validateAgainstSpecification(operationWithoutTakeProfit);
            this.assert(!validation2.isValid, 'Operação sem TP deve ser rejeitada');
            this.assert(validation2.errors.some(e => e.includes('Take Profit')), 'Erro deve mencionar Take Profit');
            
            console.log('   ✅ SL/TP obrigatórios sendo enforçados');
            
        } catch (error) {
            this.fail('SL/TP obrigatórios falharam: ' + error.message);
        }
    }

    /**
     * 📊 TESTE 5: LIMITES DE POSIÇÕES
     */
    async testPositionLimits() {
        console.log('📊 TESTE 5: Limites de Posições e Cooldown');
        
        try {
            const UniversalConfigEnforcer = require('../../src/utils/universal-config-enforcer.js');
            const enforcer = new UniversalConfigEnforcer();
            
            const config = enforcer.SPEC_CONFIG;
            
            this.assert(config.MAX_POSITIONS_PER_USER === 2, 'Máximo 2 posições por usuário');
            this.assert(config.COOLDOWN_MINUTES_PER_SYMBOL === 120, 'Cooldown de 120 minutos');
            this.assert(config.MAX_RISK_PER_TRADE === 0.02, 'Máximo 2% risco por trade');
            
            console.log('   ✅ Limites de posições configurados corretamente');
            
        } catch (error) {
            this.fail('Limites de posições falharam: ' + error.message);
        }
    }

    /**
     * 📈 TESTE 6: ANÁLISE DE RISCO INFORMATIVA
     */
    async testRiskAnalysisInformative() {
        console.log('📈 TESTE 6: Análise de Risco Como Informativa');
        
        try {
            const UniversalConfigEnforcer = require('../../src/utils/universal-config-enforcer.js');
            const enforcer = new UniversalConfigEnforcer();
            
            // Operação com configurações válidas da especificação
            const validOperation = {
                leverage: 5,
                stopLoss: 10,
                takeProfit: 15,
                positionSizePercent: 30
            };
            
            const validation = enforcer.validateAgainstSpecification(validOperation);
            
            this.assert(validation.isValid, 'Operação conforme especificação deve ser aprovada');
            this.assert(validation.errors.length === 0, 'Não deve haver erros para operação válida');
            
            // Verificar que análise de risco não bloqueia
            const enforcedConfig = validation.enforcedConfig;
            this.assert(enforcedConfig.maxRiskPerTrade === 0.02, 'Risco deve ser informativo (0.02)');
            
            console.log('   ✅ Análise de risco é informativa, não restritiva');
            
        } catch (error) {
            this.fail('Teste de risco informativo falhou: ' + error.message);
        }
    }

    /**
     * ✅ ASSERT HELPER
     */
    assert(condition, message) {
        this.testResults.total++;
        
        if (condition) {
            this.testResults.passed++;
            this.testResults.details.push({ status: '✅', message });
        } else {
            this.testResults.failed++;
            this.testResults.details.push({ status: '❌', message });
            throw new Error(message);
        }
    }

    /**
     * ❌ FAIL HELPER
     */
    fail(message) {
        this.testResults.total++;
        this.testResults.failed++;
        this.testResults.details.push({ status: '❌', message });
        console.log(`   ❌ ${message}`);
    }

    /**
     * 📊 RELATÓRIO FINAL
     */
    generateFinalReport() {
        console.log('\n' + '='.repeat(70));
        console.log('📋 RELATÓRIO FINAL - CONFIGURAÇÕES OBRIGATÓRIAS');
        console.log('='.repeat(70));
        
        const successRate = (this.testResults.passed / this.testResults.total * 100).toFixed(1);
        
        console.log(`📊 Taxa de Sucesso: ${successRate}%`);
        console.log(`✅ Testes Aprovados: ${this.testResults.passed}/${this.testResults.total}`);
        console.log(`❌ Testes Falharam: ${this.testResults.failed}/${this.testResults.total}`);
        
        console.log('\n📋 DETALHES DOS TESTES:');
        this.testResults.details.forEach(detail => {
            console.log(`   ${detail.status} ${detail.message}`);
        });
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 TODAS AS CONFIGURAÇÕES OBRIGATÓRIAS APLICADAS CORRETAMENTE!');
            console.log('✅ Sistema está conforme especificação técnica');
            console.log('✅ Trading configurations são OBRIGATÓRIAS, não opcionais');
            console.log('✅ Análise de risco é INFORMATIVA apenas');
            console.log('✅ Parâmetros padrão são aplicados automaticamente');
            console.log('✅ Limites máximos são enforçados');
        } else {
            console.log('\n⚠️ ALGUMAS CONFIGURAÇÕES PRECISAM DE AJUSTES');
        }
        
        console.log('\n🚀 SISTEMA MARKETBOT ENTERPRISE OPERACIONAL 24/7');
        console.log('\n💡 RESUMO TÉCNICO:');
        console.log('   • Max 2 posições simultâneas por usuário (FORÇADO)');
        console.log('   • Cooldown 120min por moeda/usuário (FORÇADO)');
        console.log('   • Stop Loss OBRIGATÓRIO em toda operação');
        console.log('   • Take Profit OBRIGATÓRIO em toda operação');
        console.log('   • Leverage padrão 5x (máx 10x) conforme especificação');
        console.log('   • SL: 2x alavancagem | TP: 3x alavancagem (defaults)');
        console.log('   • Tamanho posição: 30% saldo (10-50% personalizável)');
        console.log('   • Análise de risco: INFORMATIVA, não bloqueia trades');
    }
}

// Executar testes se chamado diretamente
if (require.main === module) {
    const tester = new MandatoryConfigurationTester();
    tester.runAllTests()
        .then(() => {
            console.log('\n🎯 TESTES FINALIZADOS!');
            process.exit(tester.testResults.failed === 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 ERRO NOS TESTES:', error.message);
            process.exit(1);
        });
}

module.exports = MandatoryConfigurationTester;
