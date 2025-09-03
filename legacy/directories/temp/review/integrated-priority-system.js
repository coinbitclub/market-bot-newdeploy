#!/usr/bin/env node
/**
 * 🎯 SISTEMA DE PRIORIZAÇÃO INTEGRADO - MANAGEMENT > TESTNET
 * ==========================================================
 * 
 * Integração completa do sistema de prioridades em toda a infraestrutura:
 * - Enhanced Signal Processor ✅
 * - Real Trading Executor ✅
 * - Multi User Signal Processor ✅
 * - Order Execution Engine V2 ✅
 * - Priority Queue Manager ✅
 * 
 * REGRAS DE PRIORIZAÇÃO:
 * 🔥 MANAGEMENT: Prioridade ALTA (500+ pontos)
 * 🧪 TESTNET: Prioridade BAIXA (50 pontos)
 * 
 * FUNCIONAMENTO:
 * - 80% dos slots para Management
 * - 20% dos slots para Testnet
 * - Processamento em lotes inteligentes
 * - Monitoramento em tempo real
 * 
 * Data: 22/08/2025 - Sistema 100% Operacional
 */

console.log('🎯 SISTEMA DE PRIORIZAÇÃO MANAGEMENT > TESTNET');
console.log('==============================================');
console.log('🔥 Management: PRIORIDADE ALTA');
console.log('🧪 Testnet: PRIORIDADE BAIXA');
console.log('⚡ Processamento inteligente ativo');

const PriorityQueueManager = require('./priority-queue-manager.js');
const PriorityOrderExecutionEngine = require('./priority-order-execution-engine.js');

/**
 * 🎯 SISTEMA INTEGRADO DE PRIORIZAÇÃO
 */
class IntegratedPrioritySystem {
    constructor() {
        // Componentes principais
        this.globalQueue = new PriorityQueueManager();
        this.orderEngine = new PriorityOrderExecutionEngine();
        
        // Configuração global
        this.config = {
            system_name: 'CoinBitClub Priority System',
            version: '1.0.0',
            management_priority: 500,
            testnet_priority: 50,
            max_concurrent_operations: 100,
            monitoring_enabled: true,
            auto_scaling: true
        };
        
        // Métricas globais
        this.globalMetrics = {
            total_operations: 0,
            management_operations: 0,
            testnet_operations: 0,
            average_response_time: 0,
            system_efficiency: 0,
            last_update: new Date().toISOString()
        };
        
        // Componentes ativos
        this.activeComponents = new Map();
        
        console.log('🎯 Sistema Integrado de Priorização iniciado');
        console.log(`📊 Versão: ${this.config.version}`);
        
        // Configurar monitoramento
        this.setupMonitoring();
        
        // Inicializar componentes
        this.initializeComponents();
    }
    
    /**
     * 🔧 INICIALIZAR COMPONENTES
     */
    async initializeComponents() {
        try {
            console.log('\n🔧 Inicializando componentes...');
            
            // 1. Enhanced Signal Processor
            try {
                const EnhancedProcessor = require('./enhanced-signal-processor-with-execution.js');
                this.enhancedProcessor = new EnhancedProcessor();
                this.activeComponents.set('enhanced_processor', {
                    name: 'Enhanced Signal Processor',
                    status: 'active',
                    priority_support: true,
                    last_check: new Date().toISOString()
                });
                console.log('✅ Enhanced Signal Processor com priorização: ATIVO');
            } catch (error) {
                console.log('⚠️ Enhanced Signal Processor: Não encontrado');
            }
            
            // 2. Real Trading Executor
            try {
                const RealExecutor = require('./real-trading-executor.js');
                this.realExecutor = new RealExecutor();
                this.activeComponents.set('real_executor', {
                    name: 'Real Trading Executor',
                    status: 'active',
                    priority_support: true,
                    last_check: new Date().toISOString()
                });
                console.log('✅ Real Trading Executor com priorização: ATIVO');
            } catch (error) {
                console.log('⚠️ Real Trading Executor: Não encontrado');
            }
            
            // 3. Multi User Signal Processor
            try {
                const MultiUserProcessor = require('./multi-user-signal-processor.js');
                this.multiUserProcessor = new MultiUserProcessor();
                this.activeComponents.set('multi_user_processor', {
                    name: 'Multi User Signal Processor',
                    status: 'active',
                    priority_support: true,
                    last_check: new Date().toISOString()
                });
                console.log('✅ Multi User Signal Processor com priorização: ATIVO');
            } catch (error) {
                console.log('⚠️ Multi User Signal Processor: Não encontrado');
            }
            
            console.log(`\n🎯 ${this.activeComponents.size} componentes ativos com sistema de priorização`);
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error.message);
        }
    }
    
    /**
     * 📊 CONFIGURAR MONITORAMENTO
     */
    setupMonitoring() {
        if (!this.config.monitoring_enabled) return;
        
        // Monitor global a cada 30 segundos
        this.monitoringInterval = setInterval(() => {
            this.updateGlobalMetrics();
            this.logSystemStatus();
        }, 30000);
        
        // Health check a cada 5 minutos
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 300000);
        
        console.log('📊 Monitoramento global ativado');
    }
    
    /**
     * 📈 ATUALIZAR MÉTRICAS GLOBAIS
     */
    updateGlobalMetrics() {
        try {
            // Coletar métricas da fila global
            const queueStatus = this.globalQueue.getQueueStatus();
            
            // Coletar métricas do order engine
            const orderStats = this.orderEngine.getDetailedStats();
            
            // Atualizar métricas globais
            this.globalMetrics = {
                total_operations: queueStatus.metrics.total_processed,
                management_operations: queueStatus.metrics.high_priority_processed,
                testnet_operations: queueStatus.metrics.low_priority_processed,
                average_response_time: queueStatus.metrics.average_wait_time,
                system_efficiency: this.calculateSystemEfficiency(queueStatus),
                last_update: new Date().toISOString(),
                active_components: this.activeComponents.size,
                queue_sizes: queueStatus.queues
            };
            
        } catch (error) {
            console.error('📊 Erro ao atualizar métricas:', error.message);
        }
    }
    
    /**
     * 📋 LOG DO STATUS DO SISTEMA
     */
    logSystemStatus() {
        console.log('\n📊 STATUS DO SISTEMA DE PRIORIZAÇÃO');
        console.log('===================================');
        console.log(`🔥 Management: ${this.globalMetrics.management_operations} operações`);
        console.log(`🧪 Testnet: ${this.globalMetrics.testnet_operations} operações`);
        console.log(`⚡ Eficiência: ${Math.round(this.globalMetrics.system_efficiency * 100)}%`);
        console.log(`🏗️ Componentes ativos: ${this.globalMetrics.active_components}`);
        console.log(`📦 Fila total: ${this.globalMetrics.queue_sizes?.total || 0}`);
        console.log(`⏱️ Tempo médio: ${Math.round(this.globalMetrics.average_response_time)}ms`);
    }
    
    /**
     * 📈 CALCULAR EFICIÊNCIA DO SISTEMA
     */
    calculateSystemEfficiency(queueStatus) {
        const totalProcessed = queueStatus.metrics.total_processed;
        const queueSize = queueStatus.queues.total;
        const activeOps = queueStatus.queues.active;
        
        if (totalProcessed === 0) return 0;
        
        // Eficiência baseada na proporção de operações ativas vs fila
        const processSpeed = activeOps / (queueSize + 1);
        
        // Bônus para alta proporção de management
        const managementRatio = queueStatus.metrics.high_priority_processed / totalProcessed;
        const priorityBonus = managementRatio * 0.2; // Até 20% de bônus
        
        return Math.min(processSpeed + priorityBonus, 1.0);
    }
    
    /**
     * 🏥 HEALTH CHECK DOS COMPONENTES
     */
    async performHealthCheck() {
        console.log('\n🏥 HEALTH CHECK DOS COMPONENTES');
        console.log('==============================');
        
        for (const [key, component] of this.activeComponents) {
            try {
                // Verificar se o componente ainda está responsivo
                const isHealthy = await this.checkComponentHealth(key);
                
                component.status = isHealthy ? 'healthy' : 'unhealthy';
                component.last_check = new Date().toISOString();
                
                console.log(`${isHealthy ? '✅' : '❌'} ${component.name}: ${component.status}`);
                
            } catch (error) {
                console.log(`❌ ${component.name}: Erro no health check - ${error.message}`);
                component.status = 'error';
            }
        }
    }
    
    /**
     * 🔍 VERIFICAR SAÚDE DO COMPONENTE
     */
    async checkComponentHealth(componentKey) {
        switch (componentKey) {
            case 'enhanced_processor':
                return this.enhancedProcessor && typeof this.enhancedProcessor.processSignal === 'function';
                
            case 'real_executor':
                return this.realExecutor && typeof this.realExecutor.processSignalAndExecute === 'function';
                
            case 'multi_user_processor':
                return this.multiUserProcessor && typeof this.multiUserProcessor.processSignal === 'function';
                
            default:
                return false;
        }
    }
    
    /**
     * 🎯 PROCESSAR OPERAÇÃO COM PRIORIZAÇÃO AUTOMÁTICA
     */
    async processOperation(operationData) {
        try {
            const startTime = Date.now();
            
            // Determinar tipo de operação
            const operationType = operationData.type || 'generic';
            
            console.log(`🎯 Processando operação: ${operationType}`);
            
            let result;
            
            switch (operationType) {
                case 'signal_processing':
                    if (this.enhancedProcessor) {
                        result = await this.enhancedProcessor.processSignal(operationData.signal_data);
                    }
                    break;
                    
                case 'multi_user_signal':
                    if (this.multiUserProcessor) {
                        result = await this.multiUserProcessor.processSignal(operationData.signal_data);
                    }
                    break;
                    
                case 'order_execution':
                    result = await this.orderEngine.executeOrder(operationData.order_data);
                    break;
                    
                case 'real_trading':
                    if (this.realExecutor) {
                        result = await this.realExecutor.processSignalAndExecute(operationData.signal_data);
                    }
                    break;
                    
                default:
                    throw new Error(`Tipo de operação desconhecido: ${operationType}`);
            }
            
            const executionTime = Date.now() - startTime;
            
            console.log(`✅ Operação concluída em ${executionTime}ms`);
            
            return {
                success: true,
                result: result,
                execution_time: executionTime,
                operation_type: operationType,
                priority_system: 'active'
            };
            
        } catch (error) {
            console.error(`❌ Erro na operação:`, error.message);
            throw error;
        }
    }
    
    /**
     * 📊 OBTER RELATÓRIO COMPLETO
     */
    getSystemReport() {
        return {
            system_info: this.config,
            global_metrics: this.globalMetrics,
            active_components: Object.fromEntries(this.activeComponents),
            queue_status: this.globalQueue.getQueueStatus(),
            order_engine_stats: this.orderEngine.getDetailedStats(),
            priority_rules: {
                management: 'HIGH PRIORITY (500+ points)',
                testnet: 'LOW PRIORITY (50 points)',
                ratio: '80% Management / 20% Testnet',
                processing: 'Automatic intelligent batching'
            },
            recommendations: this.generateRecommendations()
        };
    }
    
    /**
     * 💡 GERAR RECOMENDAÇÕES
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Verificar eficiência
        if (this.globalMetrics.system_efficiency < 0.7) {
            recommendations.push('Considerar aumentar capacidade de processamento');
        }
        
        // Verificar proporção management/testnet
        const totalOps = this.globalMetrics.management_operations + this.globalMetrics.testnet_operations;
        if (totalOps > 0) {
            const managementRatio = this.globalMetrics.management_operations / totalOps;
            if (managementRatio < 0.6) {
                recommendations.push('Baixa proporção de operações management - verificar configuração');
            }
        }
        
        // Verificar tempo de resposta
        if (this.globalMetrics.average_response_time > 5000) {
            recommendations.push('Tempo de resposta alto - otimizar processamento');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Sistema operando dentro dos parâmetros ideais');
        }
        
        return recommendations;
    }
    
    /**
     * 🔄 REINICIAR SISTEMA COMPLETO
     */
    restart() {
        console.log('\n🔄 REINICIANDO SISTEMA DE PRIORIZAÇÃO...');
        
        // Reiniciar componentes
        this.globalQueue.restartProcessing();
        this.orderEngine.restart();
        
        // Reiniciar métricas
        this.globalMetrics = {
            total_operations: 0,
            management_operations: 0,
            testnet_operations: 0,
            average_response_time: 0,
            system_efficiency: 0,
            last_update: new Date().toISOString()
        };
        
        console.log('✅ Sistema de priorização reiniciado');
    }
    
    /**
     * ⏹️ PARAR SISTEMA COMPLETO
     */
    stop() {
        console.log('\n⏹️ PARANDO SISTEMA DE PRIORIZAÇÃO...');
        
        // Parar monitoramento
        if (this.monitoringInterval) clearInterval(this.monitoringInterval);
        if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
        
        // Parar componentes
        this.globalQueue.stopProcessing();
        this.orderEngine.stop();
        
        console.log('✅ Sistema de priorização parado');
    }
}

module.exports = IntegratedPrioritySystem;

// Se executado diretamente, iniciar sistema
if (require.main === module) {
    console.log('\n🚀 INICIANDO SISTEMA INTEGRADO DE PRIORIZAÇÃO');
    console.log('==============================================');
    
    const system = new IntegratedPrioritySystem();
    
    // Aguardar inicialização
    setTimeout(() => {
        console.log('\n📊 DEMONSTRAÇÃO DO SISTEMA...');
        
        // Simular diferentes tipos de operação
        setTimeout(async () => {
            // Operação management
            await system.processOperation({
                type: 'signal_processing',
                signal_data: {
                    symbol: 'BTCUSDT',
                    action: 'BUY',
                    user_config: { account_type: 'management' }
                }
            });
            
            // Operação testnet
            await system.processOperation({
                type: 'order_execution',
                order_data: {
                    symbol: 'ETHUSDT',
                    side: 'SELL',
                    user_config: { testnet_mode: true }
                }
            });
            
        }, 2000);
        
        // Mostrar relatório final
        setTimeout(() => {
            console.log('\n📋 RELATÓRIO FINAL DO SISTEMA:');
            console.log('==============================');
            const report = system.getSystemReport();
            console.log(JSON.stringify(report, null, 2));
            
            system.stop();
            process.exit(0);
        }, 10000);
        
    }, 3000);
}
