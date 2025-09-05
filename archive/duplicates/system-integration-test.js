/**
 * 🧪 TESTE COMPLETO DO SISTEMA DE MONITORAMENTO
 * Script para testar todas as funcionalidades implementadas
 */

const MultiUserSignalProcessor = require('./multi-user-signal-processor');
const MarketDirectionMonitor = require('./market-direction-monitor');
const SignalMetricsMonitor = require('./signal-metrics-monitor');

class SystemIntegrationTest {
    constructor() {
        this.processor = new MultiUserSignalProcessor();
        this.marketMonitor = new MarketDirectionMonitor();
        this.signalMetrics = new SignalMetricsMonitor();
        
        console.log('🧪 Sistema de Teste Integrado iniciado');
    }

    async runCompleteTest() {
        console.log('\n=== 🧪 TESTE COMPLETO DO SISTEMA INICIADO ===\n');

        try {
            // TESTE 1: Monitoramento de Direção do Mercado
            console.log('📊 TESTE 1: Monitoramento de Direção do Mercado');
            const marketDirection = await this.testMarketDirectionMonitoring();
            console.log('✅ Direção do mercado obtida:', marketDirection.allowed);

            // TESTE 2: Processamento de Sinal LONG FORTE
            console.log('\n📡 TESTE 2: Processamento de Sinal LONG FORTE');
            const signalLongForte = {
                signal: 'SINAL_LONG_FORTE',
                ticker: 'BTCUSDT',
                source: 'TradingView',
                timestamp: new Date().toISOString()
            };
            const resultLong = await this.testSignalProcessing(signalLongForte);

            // TESTE 3: Processamento de Sinal SHORT
            console.log('\n📡 TESTE 3: Processamento de Sinal SHORT');
            const signalShort = {
                signal: 'SINAL_SHORT',
                ticker: 'ETHUSDT',
                source: 'TradingView',
                timestamp: new Date().toISOString()
            };
            const resultShort = await this.testSignalProcessing(signalShort);

            // TESTE 4: Sinal Expirado (deve ser rejeitado)
            console.log('\n⏰ TESTE 4: Sinal Expirado');
            const expiredSignal = {
                signal: 'SINAL_LONG',
                ticker: 'ADAUSDT',
                source: 'TradingView',
                timestamp: new Date(Date.now() - 60000).toISOString() // 1 minuto atrás
            };
            const resultExpired = await this.testSignalProcessing(expiredSignal);

            // TESTE 5: Métricas dos Sinais
            console.log('\n📈 TESTE 5: Métricas dos Sinais');
            await this.testSignalMetrics();

            // TESTE 6: Mudança de Direção do Mercado
            console.log('\n🔄 TESTE 6: Simulação de Mudança de Direção');
            await this.testDirectionChange();

            // RESUMO DOS TESTES
            console.log('\n=== 📋 RESUMO DOS TESTES ===');
            console.log(`✅ Direção do mercado: ${marketDirection.allowed}`);
            console.log(`📡 Sinal LONG FORTE: ${resultLong.success ? '✅ APROVADO' : '❌ REJEITADO'}`);
            console.log(`📡 Sinal SHORT: ${resultShort.success ? '✅ APROVADO' : '❌ REJEITADO'}`);
            console.log(`⏰ Sinal Expirado: ${resultExpired.success ? '❌ ERRO' : '✅ REJEITADO CORRETAMENTE'}`);
            
            console.log('\n🎉 TESTE COMPLETO FINALIZADO COM SUCESSO!');
            
            return {
                success: true,
                tests: {
                    marketDirection: marketDirection,
                    signalLongForte: resultLong,
                    signalShort: resultShort,
                    expiredSignal: resultExpired
                }
            };

        } catch (error) {
            console.error('❌ Erro no teste completo:', error.message);
            return { success: false, error: error.message };
        }
    }

    async testMarketDirectionMonitoring() {
        try {
            console.log('   🔍 Atualizando direção do mercado...');
            const direction = await this.marketMonitor.updateMarketDirection();
            
            console.log(`   📊 Fear & Greed: ${direction.fearGreed.value}/100`);
            console.log(`   💰 TOP 100: ${direction.top100.percentageUp}% subindo`);
            console.log(`   🧭 Direção: ${direction.allowed}`);
            console.log(`   🎯 Confiança: ${(direction.confidence * 100).toFixed(1)}%`);
            
            return direction;
            
        } catch (error) {
            console.error('   ❌ Erro no teste de direção:', error.message);
            throw error;
        }
    }

    async testSignalProcessing(signalData) {
        try {
            console.log(`   📡 Processando: ${signalData.signal} ${signalData.ticker}`);
            
            const result = await this.processor.processSignal(signalData);
            
            if (result.success) {
                console.log(`   ✅ Sinal aprovado pela IA: ${result.aiDecision.analysis}`);
                console.log(`   👥 Execuções: ${result.executions?.summary?.total || 0} usuários`);
            } else {
                console.log(`   ❌ Sinal rejeitado: ${result.reason}`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`   ❌ Erro no processamento: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async testSignalMetrics() {
        try {
            console.log('   📊 Coletando métricas globais...');
            
            const globalMetrics = await this.signalMetrics.getGlobalMetrics();
            
            console.log(`   📈 Total de sinais: ${globalMetrics.global.totalSignals}`);
            console.log(`   ✅ Taxa de aprovação: ${globalMetrics.global.approvalRate}%`);
            console.log(`   🎯 Tickers únicos: ${globalMetrics.global.uniqueTickers}`);
            console.log(`   ⏰ Sinais última hora: ${globalMetrics.global.lastHourSignals}`);
            
            return globalMetrics;
            
        } catch (error) {
            console.error('   ❌ Erro nas métricas:', error.message);
            throw error;
        }
    }

    async testDirectionChange() {
        try {
            console.log('   🔄 Verificando mudanças de direção...');
            
            const historyCount = this.marketMonitor.getDirectionHistory().length;
            console.log(`   📚 Histórico de direções: ${historyCount} registros`);
            
            if (historyCount >= 2) {
                const recent = this.marketMonitor.getDirectionHistory(2);
                console.log(`   📊 Direções recentes: ${recent.map(d => d.allowed).join(' → ')}`);
            }
            
        } catch (error) {
            console.error('   ❌ Erro na verificação de mudanças:', error.message);
        }
    }

    async testWebhookSimulation() {
        console.log('\n🌐 SIMULAÇÃO DE WEBHOOK COMPLETA');
        
        const webhookData = {
            signal: 'SINAL_LONG_FORTE',
            ticker: 'BTCUSDT',
            source: 'TradingView',
            timestamp: new Date().toISOString(),
            price: 45000,
            volume: 1000000
        };
        
        console.log('📡 Simulando webhook TradingView...');
        console.log('Dados recebidos:', webhookData);
        
        const result = await this.processor.processSignal(webhookData);
        
        console.log('\n📋 RESULTADO COMPLETO:');
        console.log(`🎯 Sucesso: ${result.success}`);
        if (result.success) {
            console.log(`🤖 Decisão IA: ${result.aiDecision.analysis}`);
            console.log(`📊 Direção: ${result.marketDirection.allowed}`);
            console.log(`🧠 Histórico: ${result.signalHistory.recommendation}`);
            console.log(`👥 Execuções: ${result.executions.summary.total} usuários`);
        } else {
            console.log(`❌ Motivo: ${result.reason}`);
        }
        
        return result;
    }
}

// Executar testes se chamado diretamente
if (require.main === module) {
    const tester = new SystemIntegrationTest();
    
    const testType = process.argv[2] || '1';
    
    switch (testType) {
        case '1':
            tester.runCompleteTest()
                .then(result => {
                    console.log('\n🎉 Teste finalizado:', result.success ? 'SUCESSO' : 'FALHA');
                    process.exit(result.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('❌ Erro:', error);
                    process.exit(1);
                });
            break;
            
        case '2':
            tester.testWebhookSimulation()
                .then(result => {
                    console.log('\n🎉 Simulação finalizada');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Erro:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('❌ Tipo de teste inválido');
            process.exit(1);
    }
}

module.exports = SystemIntegrationTest;
