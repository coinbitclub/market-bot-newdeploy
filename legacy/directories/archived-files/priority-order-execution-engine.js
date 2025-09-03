#!/usr/bin/env node
/**
 * 🎯 PRIORITY INTEGRATION FOR ORDER EXECUTION ENGINE V2
 * ====================================================
 * 
 * Integração do sistema de prioridades com o Order Execution Engine V2
 * Management operations get HIGH priority
 * Testnet operations get LOW priority
 * 
 * Data: 22/08/2025
 */

console.log('🎯 PRIORITY INTEGRATION - ORDER EXECUTION ENGINE V2');
console.log('==================================================');

const PriorityQueueManager = require('./priority-queue-manager.js');

/**
 * 🎯 ENHANCED ORDER EXECUTION ENGINE WITH PRIORITY SYSTEM
 */
class PriorityOrderExecutionEngine {
    constructor() {
        // Importar o engine original
        const OriginalEngine = require('./order-execution-engine-v2.js');
        this.originalEngine = new OriginalEngine();
        
        // Sistema de prioridades
        this.priorityQueue = new PriorityQueueManager();
        
        // Configuração de priorização
        this.priorityConfig = {
            management_multiplier: 10,    // Management orders get 10x priority
            vip_bonus: 100,              // VIP users get bonus points
            large_order_threshold: 1000,  // Orders > $1000 get priority
            max_concurrent_management: 20, // Max concurrent management orders
            max_concurrent_testnet: 5     // Max concurrent testnet orders
        };
        
        // Estatísticas
        this.stats = {
            management_orders: 0,
            testnet_orders: 0,
            priority_queue_size: 0,
            average_processing_time: 0
        };
        
        console.log('✅ Priority Order Execution Engine inicializado');
        console.log(`🔥 Management Priority Multiplier: ${this.priorityConfig.management_multiplier}x`);
        
        // Configurar eventos
        this.setupEventHandlers();
    }
    
    /**
     * 🎯 CONFIGURAR MANIPULADORES DE EVENTOS
     */
    setupEventHandlers() {
        this.priorityQueue.on('operation_completed', (operation) => {
            if (operation.environment === 'management') {
                this.stats.management_orders++;
            } else {
                this.stats.testnet_orders++;
            }
            console.log(`✅ Ordem priorizada executada: ${operation.id}`);
        });
        
        this.priorityQueue.on('operation_failed', (operation) => {
            console.error(`❌ Falha na ordem priorizada: ${operation.id} - ${operation.error}`);
        });
    }
    
    /**
     * 🎯 EXECUTAR ORDEM COM PRIORIZAÇÃO AUTOMÁTICA
     */
    async executeOrder(orderData) {
        try {
            // Determinar prioridade da ordem
            const environment = this.detectOrderEnvironment(orderData);
            const priority = this.calculateOrderPriority(orderData, environment);
            
            console.log(`📋 Nova ordem: ${orderData.symbol || 'N/A'}`);
            console.log(`🎯 Ambiente: ${environment}`);
            console.log(`📊 Prioridade: ${priority}`);
            
            // Adicionar à fila de prioridades
            const operationId = await this.priorityQueue.addOperation({
                type: 'order_execution',
                order_data: orderData,
                environment: environment,
                priority_override: priority,
                user_id: orderData.user_id,
                created_at: Date.now(),
                executor: this.originalEngine
            });
            
            // Executar através do engine original
            const result = await this.originalEngine.executeOrder(orderData);
            
            return {
                ...result,
                priority_info: {
                    operation_id: operationId,
                    environment: environment,
                    priority: priority,
                    queue_position: this.getQueuePosition(operationId)
                }
            };
            
        } catch (error) {
            console.error('❌ Erro na execução priorizada:', error.message);
            throw error;
        }
    }
    
    /**
     * 🔍 DETECTAR AMBIENTE DA ORDEM
     */
    detectOrderEnvironment(orderData) {
        // 1. Verificar campo explícito
        if (orderData.environment) {
            return orderData.environment.toLowerCase();
        }
        
        // 2. Verificar configuração do usuário
        if (orderData.user_config) {
            if (orderData.user_config.account_type === 'management') {
                return 'management';
            }
            if (orderData.user_config.testnet_mode === true) {
                return 'testnet';
            }
        }
        
        // 3. Verificar API keys
        if (orderData.api_config) {
            if (orderData.api_config.testnet === false) {
                return 'management';
            }
            if (orderData.api_config.testnet === true) {
                return 'testnet';
            }
        }
        
        // 4. Verificar por exchange
        if (orderData.exchange) {
            if (orderData.exchange.includes('testnet') || orderData.exchange.includes('sandbox')) {
                return 'testnet';
            }
            if (orderData.exchange.includes('mainnet') || orderData.exchange.includes('live')) {
                return 'management';
            }
        }
        
        // 5. Verificar variáveis globais
        if (process.env.RAILWAY_ENVIRONMENT_NAME === 'management') {
            return 'management';
        }
        
        // 6. Default seguro
        return 'testnet';
    }
    
    /**
     * 📊 CALCULAR PRIORIDADE DA ORDEM
     */
    calculateOrderPriority(orderData, environment) {
        let basePriority = 50; // Padrão baixo
        
        // 1. PRIORIDADE POR AMBIENTE
        if (environment === 'management' || environment === 'mainnet') {
            basePriority = 500; // Management = alta prioridade
        } else if (environment === 'testnet') {
            basePriority = 50;  // Testnet = baixa prioridade
        }
        
        // 2. MULTIPLICADOR MANAGEMENT
        if (environment === 'management') {
            basePriority *= this.priorityConfig.management_multiplier;
        }
        
        // 3. BÔNUS VIP
        if (orderData.user_type === 'VIP' || orderData.user_type === 'PREMIUM') {
            basePriority += this.priorityConfig.vip_bonus;
        }
        
        // 4. BÔNUS PARA ORDENS GRANDES
        if (orderData.amount && orderData.amount > this.priorityConfig.large_order_threshold) {
            basePriority += 200;
        }
        
        // 5. BÔNUS POR URGÊNCIA
        if (orderData.urgent === true || orderData.priority === 'HIGH') {
            basePriority += 300;
        }
        
        // 6. PENALIDADE POR IDADE (ordens muito antigas perdem prioridade)
        if (orderData.created_at) {
            const age = Date.now() - orderData.created_at;
            if (age > 300000) { // 5 minutos
                basePriority = Math.max(basePriority * 0.5, 10); // Reduzir pela metade, mín 10
            }
        }
        
        return Math.round(basePriority);
    }
    
    /**
     * 📍 OBTER POSIÇÃO NA FILA
     */
    getQueuePosition(operationId) {
        const status = this.priorityQueue.getQueueStatus();
        return {
            total_queued: status.queues.total,
            high_priority: status.queues.high + status.queues.critical,
            low_priority: status.queues.low,
            active_operations: status.queues.active
        };
    }
    
    /**
     * 📊 OBTER ESTATÍSTICAS DETALHADAS
     */
    getDetailedStats() {
        const queueStatus = this.priorityQueue.getQueueStatus();
        
        return {
            execution_stats: this.stats,
            queue_status: queueStatus,
            priority_config: this.priorityConfig,
            performance: {
                management_ratio: this.stats.management_orders / (this.stats.management_orders + this.stats.testnet_orders) || 0,
                total_processed: this.stats.management_orders + this.stats.testnet_orders,
                queue_efficiency: this.calculateQueueEfficiency()
            }
        };
    }
    
    /**
     * 📈 CALCULAR EFICIÊNCIA DA FILA
     */
    calculateQueueEfficiency() {
        const status = this.priorityQueue.getQueueStatus();
        const totalQueued = status.queues.total;
        const activeProcessing = status.queues.active;
        
        if (totalQueued === 0) return 1.0; // 100% se não há fila
        
        return Math.min(activeProcessing / totalQueued, 1.0);
    }
    
    /**
     * ⚙️ CONFIGURAR PRIORIDADES DINÂMICAS
     */
    updatePriorityConfig(newConfig) {
        this.priorityConfig = { ...this.priorityConfig, ...newConfig };
        console.log('⚙️ Configuração de prioridades atualizada:', this.priorityConfig);
    }
    
    /**
     * 🔄 REINICIAR SISTEMA
     */
    restart() {
        this.priorityQueue.restartProcessing();
        this.stats = {
            management_orders: 0,
            testnet_orders: 0,
            priority_queue_size: 0,
            average_processing_time: 0
        };
        console.log('🔄 Priority Order Execution Engine reiniciado');
    }
    
    /**
     * ⏹️ PARAR SISTEMA
     */
    stop() {
        this.priorityQueue.stopProcessing();
        console.log('⏹️ Priority Order Execution Engine parado');
    }
}

module.exports = PriorityOrderExecutionEngine;

// Se executado diretamente, demonstrar funcionamento
if (require.main === module) {
    console.log('\n🧪 DEMONSTRAÇÃO PRIORITY ORDER EXECUTION ENGINE');
    console.log('===============================================');
    
    const engine = new PriorityOrderExecutionEngine();
    
    // Simular ordens de teste
    setTimeout(async () => {
        console.log('\n📊 Simulando ordens de diferentes prioridades...');
        
        // Ordem Management (alta prioridade)
        await engine.executeOrder({
            symbol: 'BTCUSDT',
            side: 'BUY',
            amount: 1000,
            user_id: 'management_user_1',
            user_config: { account_type: 'management' },
            environment: 'management'
        });
        
        // Ordem VIP Testnet
        await engine.executeOrder({
            symbol: 'ETHUSDT',
            side: 'SELL',
            amount: 500,
            user_id: 'vip_user_1',
            user_type: 'VIP',
            user_config: { testnet_mode: true },
            environment: 'testnet'
        });
        
        // Ordem Testnet normal
        await engine.executeOrder({
            symbol: 'ADAUSDT',
            side: 'BUY',
            amount: 100,
            user_id: 'regular_user_1',
            user_config: { testnet_mode: true },
            environment: 'testnet'
        });
        
        // Mostrar estatísticas
        setTimeout(() => {
            console.log('\n📊 ESTATÍSTICAS FINAIS:');
            console.log(JSON.stringify(engine.getDetailedStats(), null, 2));
            
            engine.stop();
            process.exit(0);
        }, 3000);
        
    }, 1000);
}
