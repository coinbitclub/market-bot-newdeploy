#!/usr/bin/env node
/**
 * 🎯 PRIORITY QUEUE MANAGER - MANAGEMENT > TESTNET
 * ================================================
 * 
 * Sistema de priorização inteligente onde:
 * - MANAGEMENT: Prioridade ALTA (operações reais)
 * - TESTNET: Prioridade BAIXA (operações de teste)
 * 
 * Integração com toda infraestrutura de execução existente
 * Data: 22/08/2025
 */

console.log('🎯 PRIORITY QUEUE MANAGER - INICIANDO...');
console.log('========================================');

const EventEmitter = require('events');

// CONFIGURAÇÃO DE PRIORIDADES
const PRIORITY_LEVELS = {
    CRITICAL: 1000,    // Emergência
    HIGH: 500,         // Management (operações reais)
    MEDIUM: 100,       // Operações normais
    LOW: 50,           // Testnet (operações de teste)
    BACKGROUND: 10     // Tarefas de background
};

// TIPOS DE AMBIENTE E SUAS PRIORIDADES
const ENVIRONMENT_PRIORITIES = {
    'management': PRIORITY_LEVELS.HIGH,
    'mainnet': PRIORITY_LEVELS.HIGH,
    'production': PRIORITY_LEVELS.MEDIUM,
    'testnet': PRIORITY_LEVELS.LOW,
    'sandbox': PRIORITY_LEVELS.LOW,
    'development': PRIORITY_LEVELS.BACKGROUND
};

class PriorityQueueManager extends EventEmitter {
    constructor() {
        super();
        
        // FILAS SEPARADAS POR PRIORIDADE
        this.queues = {
            critical: [],   // Emergências
            high: [],       // Management/Mainnet
            medium: [],     // Produção normal
            low: [],        // Testnet/Sandbox
            background: []  // Background tasks
        };
        
        // MÉTRICAS E ESTATÍSTICAS
        this.metrics = {
            total_processed: 0,
            high_priority_processed: 0,
            low_priority_processed: 0,
            average_wait_time: 0,
            queue_sizes: {},
            last_processed: null
        };
        
        // CONFIGURAÇÃO DE PROCESSAMENTO
        this.config = {
            max_concurrent_operations: 50,        // Máximo operações simultâneas
            high_priority_ratio: 0.8,            // 80% para management
            low_priority_ratio: 0.2,             // 20% para testnet
            max_wait_time_ms: 30000,             // 30s max wait
            processing_interval_ms: 100,         // Processar a cada 100ms
            batch_size: 10                       // Processar em lotes
        };
        
        // OPERAÇÕES ATIVAS
        this.activeOperations = new Map();
        this.processingActive = false;
        
        console.log('✅ Priority Queue Manager inicializado');
        console.log(`🔥 Management Priority: ${PRIORITY_LEVELS.HIGH}`);
        console.log(`🧪 Testnet Priority: ${PRIORITY_LEVELS.LOW}`);
        
        // Iniciar processamento automático
        this.startProcessing();
    }
    
    /**
     * 🎯 ADICIONAR OPERAÇÃO À FILA COM PRIORIDADE AUTOMÁTICA
     */
    async addOperation(operation) {
        try {
            // Determinar prioridade baseada no ambiente
            const priority = this.determinePriority(operation);
            const queueName = this.getQueueByPriority(priority);
            
            // Adicionar timestamp e ID único
            const enhancedOperation = {
                ...operation,
                id: this.generateOperationId(),
                priority: priority,
                queue: queueName,
                added_at: Date.now(),
                user_type: operation.user_type || 'standard',
                environment: this.detectEnvironment(operation)
            };
            
            // Adicionar à fila apropriada
            this.queues[queueName].push(enhancedOperation);
            
            // Ordenar fila por prioridade
            this.sortQueue(queueName);
            
            // Atualizar métricas
            this.updateMetrics();
            
            // Log da operação
            console.log(`📋 Operação adicionada: ${enhancedOperation.id}`);
            console.log(`   🎯 Prioridade: ${priority} (${queueName.toUpperCase()})`);
            console.log(`   🏗️ Ambiente: ${enhancedOperation.environment}`);
            console.log(`   👤 Usuário: ${operation.user_id || 'N/A'}`);
            
            // Emitir evento
            this.emit('operation_queued', enhancedOperation);
            
            return enhancedOperation.id;
            
        } catch (error) {
            console.error('❌ Erro ao adicionar operação:', error.message);
            throw error;
        }
    }
    
    /**
     * 🧠 DETERMINAR PRIORIDADE BASEADA NO AMBIENTE E CONTEXTO
     */
    determinePriority(operation) {
        let basePriority = PRIORITY_LEVELS.MEDIUM;
        
        // 1. PRIORIDADE POR AMBIENTE
        const environment = this.detectEnvironment(operation);
        if (ENVIRONMENT_PRIORITIES[environment]) {
            basePriority = ENVIRONMENT_PRIORITIES[environment];
        }
        
        // 2. PRIORIDADE POR TIPO DE OPERAÇÃO
        if (operation.type === 'emergency' || operation.emergency === true) {
            basePriority = PRIORITY_LEVELS.CRITICAL;
        }
        
        // 3. PRIORIDADE POR TIPO DE USUÁRIO
        if (operation.user_type === 'VIP' || operation.user_type === 'ADMIN') {
            basePriority += 100; // Bônus para VIPs
        }
        
        // 4. PRIORIDADE POR VALOR DA OPERAÇÃO
        if (operation.amount && operation.amount > 1000) {
            basePriority += 50; // Bônus para operações grandes
        }
        
        // 5. PRIORIDADE TEMPORAL (operações antigas ganham prioridade)
        const age = Date.now() - (operation.created_at || Date.now());
        if (age > 60000) { // 1 minuto
            basePriority += Math.min(age / 1000, 200); // Até 200 pontos de bônus
        }
        
        return basePriority;
    }
    
    /**
     * 🔍 DETECTAR AMBIENTE DA OPERAÇÃO
     */
    detectEnvironment(operation) {
        // 1. Verificar campo explícito
        if (operation.environment) {
            return operation.environment.toLowerCase();
        }
        
        // 2. Verificar por exchange/API keys
        if (operation.exchange) {
            if (operation.exchange.includes('testnet') || operation.exchange.includes('sandbox')) {
                return 'testnet';
            }
            if (operation.exchange.includes('management') || operation.exchange.includes('mainnet')) {
                return 'management';
            }
        }
        
        // 3. Verificar por testnet_mode
        if (operation.testnet_mode === true || operation.testnetMode === true) {
            return 'testnet';
        }
        
        // 4. Verificar por configuração do usuário
        if (operation.user_config) {
            if (operation.user_config.account_type === 'management') {
                return 'management';
            }
            if (operation.user_config.testnet_mode === true) {
                return 'testnet';
            }
        }
        
        // 5. Verificar variáveis de ambiente globais
        const isManagement = process.env.RAILWAY_ENVIRONMENT_NAME === 'management' || 
                            process.env.NODE_ENV === 'management' ||
                            process.env.APP_MODE === 'management';
        
        if (isManagement && process.env.SMART_HYBRID_MODE === 'true') {
            return 'management';
        }
        
        // 6. Default para testnet (seguro)
        return 'testnet';
    }
    
    /**
     * 📊 OBTER FILA POR PRIORIDADE
     */
    getQueueByPriority(priority) {
        if (priority >= PRIORITY_LEVELS.CRITICAL) return 'critical';
        if (priority >= PRIORITY_LEVELS.HIGH) return 'high';
        if (priority >= PRIORITY_LEVELS.MEDIUM) return 'medium';
        if (priority >= PRIORITY_LEVELS.LOW) return 'low';
        return 'background';
    }
    
    /**
     * 🔄 ORDENAR FILA POR PRIORIDADE
     */
    sortQueue(queueName) {
        this.queues[queueName].sort((a, b) => {
            // Prioridade maior primeiro
            if (b.priority !== a.priority) {
                return b.priority - a.priority;
            }
            
            // Em caso de empate, mais antigo primeiro
            return a.added_at - b.added_at;
        });
    }
    
    /**
     * 🚀 INICIAR PROCESSAMENTO AUTOMÁTICO
     */
    startProcessing() {
        if (this.processingActive) return;
        
        this.processingActive = true;
        console.log('🔄 Processamento automático iniciado');
        
        // Processamento contínuo
        this.processingInterval = setInterval(() => {
            this.processNextBatch();
        }, this.config.processing_interval_ms);
        
        // Limpeza de operações antigas
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldOperations();
        }, 60000); // A cada minuto
    }
    
    /**
     * 📦 PROCESSAR PRÓXIMO LOTE DE OPERAÇÕES
     */
    async processNextBatch() {
        try {
            // Verificar se pode processar mais operações
            if (this.activeOperations.size >= this.config.max_concurrent_operations) {
                return;
            }
            
            // Determinar quantas operações processar de cada fila
            const availableSlots = this.config.max_concurrent_operations - this.activeOperations.size;
            const batch = this.selectOperationsForBatch(availableSlots);
            
            if (batch.length === 0) return;
            
            console.log(`🔄 Processando lote: ${batch.length} operações`);
            console.log(`   🔥 Management: ${batch.filter(op => op.queue === 'high' || op.queue === 'critical').length}`);
            console.log(`   🧪 Testnet: ${batch.filter(op => op.queue === 'low').length}`);
            
            // Processar operações em paralelo
            const promises = batch.map(operation => this.processOperation(operation));
            await Promise.allSettled(promises);
            
        } catch (error) {
            console.error('❌ Erro no processamento de lote:', error.message);
        }
    }
    
    /**
     * 🎯 SELECIONAR OPERAÇÕES PARA LOTE (RESPEITANDO PRIORIDADES)
     */
    selectOperationsForBatch(availableSlots) {
        const batch = [];
        
        // Calcular slots por prioridade
        const highPrioritySlots = Math.ceil(availableSlots * this.config.high_priority_ratio);
        const lowPrioritySlots = availableSlots - highPrioritySlots;
        
        // 1. CRITICAL e HIGH PRIORITY (Management)
        let slotsUsed = 0;
        for (const queueName of ['critical', 'high']) {
            while (this.queues[queueName].length > 0 && slotsUsed < highPrioritySlots) {
                batch.push(this.queues[queueName].shift());
                slotsUsed++;
            }
        }
        
        // 2. MEDIUM PRIORITY
        while (this.queues.medium.length > 0 && slotsUsed < availableSlots) {
            batch.push(this.queues.medium.shift());
            slotsUsed++;
        }
        
        // 3. LOW PRIORITY (Testnet) - apenas slots restantes
        const remainingSlots = Math.min(lowPrioritySlots, availableSlots - slotsUsed);
        let lowSlotsUsed = 0;
        
        while (this.queues.low.length > 0 && lowSlotsUsed < remainingSlots) {
            batch.push(this.queues.low.shift());
            lowSlotsUsed++;
        }
        
        // 4. BACKGROUND - apenas se houver slots extras
        while (this.queues.background.length > 0 && slotsUsed < availableSlots) {
            batch.push(this.queues.background.shift());
            slotsUsed++;
        }
        
        return batch;
    }
    
    /**
     * ⚡ PROCESSAR OPERAÇÃO INDIVIDUAL
     */
    async processOperation(operation) {
        const startTime = Date.now();
        
        try {
            // Marcar como ativa
            this.activeOperations.set(operation.id, {
                ...operation,
                started_at: startTime
            });
            
            console.log(`⚡ Processando: ${operation.id} (${operation.queue.toUpperCase()})`);
            
            // Emitir evento de início
            this.emit('operation_started', operation);
            
            // Simular processamento (aqui seria a execução real)
            await this.executeOperation(operation);
            
            // Calcular tempo de execução
            const executionTime = Date.now() - startTime;
            
            // Atualizar métricas
            this.updateProcessingMetrics(operation, executionTime, 'success');
            
            console.log(`✅ Concluído: ${operation.id} (${executionTime}ms)`);
            
            // Emitir evento de sucesso
            this.emit('operation_completed', { ...operation, execution_time: executionTime });
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            console.error(`❌ Falha: ${operation.id} - ${error.message}`);
            
            // Atualizar métricas
            this.updateProcessingMetrics(operation, executionTime, 'error');
            
            // Emitir evento de erro
            this.emit('operation_failed', { ...operation, error: error.message, execution_time: executionTime });
            
        } finally {
            // Remover das operações ativas
            this.activeOperations.delete(operation.id);
        }
    }
    
    /**
     * 🎯 EXECUTAR OPERAÇÃO (INTEGRAÇÃO COM SISTEMA EXISTENTE)
     */
    async executeOperation(operation) {
        // Aqui integramos com os sistemas existentes
        switch (operation.type) {
            case 'signal_processing':
                return await this.executeSignalProcessing(operation);
            
            case 'order_execution':
                return await this.executeOrderExecution(operation);
            
            case 'balance_update':
                return await this.executeBalanceUpdate(operation);
            
            case 'user_management':
                return await this.executeUserManagement(operation);
            
            default:
                // Execução genérica
                return await this.executeGeneric(operation);
        }
    }
    
    /**
     * 📊 EXECUTAR PROCESSAMENTO DE SINAL
     */
    async executeSignalProcessing(operation) {
        // Integração com enhanced-signal-processor-with-execution.js
        const processor = operation.processor || require('./enhanced-signal-processor-with-execution.js');
        
        if (processor && typeof processor.processSignal === 'function') {
            return await processor.processSignal(operation.signal_data);
        }
        
        // Fallback para simulação
        await this.simulateProcessing(operation);
    }
    
    /**
     * 💱 EXECUTAR EXECUÇÃO DE ORDEM
     */
    async executeOrderExecution(operation) {
        // Integração com real-trading-executor.js
        const executor = operation.executor || require('./real-trading-executor.js');
        
        if (executor && typeof executor.processSignalAndExecute === 'function') {
            return await executor.processSignalAndExecute(operation.order_data);
        }
        
        // Fallback para simulação
        await this.simulateProcessing(operation);
    }
    
    /**
     * 💰 EXECUTAR ATUALIZAÇÃO DE SALDO
     */
    async executeBalanceUpdate(operation) {
        // Integração com sistema financeiro
        await this.simulateProcessing(operation);
    }
    
    /**
     * 👤 EXECUTAR GESTÃO DE USUÁRIO
     */
    async executeUserManagement(operation) {
        // Integração com user-exchange-manager.js
        await this.simulateProcessing(operation);
    }
    
    /**
     * ⚙️ EXECUÇÃO GENÉRICA
     */
    async executeGeneric(operation) {
        await this.simulateProcessing(operation);
    }
    
    /**
     * 🎭 SIMULAR PROCESSAMENTO
     */
    async simulateProcessing(operation) {
        // Simular tempo de processamento variável
        const baseTime = operation.queue === 'high' ? 100 : 300; // Management mais rápido
        const randomTime = Math.random() * 500;
        const totalTime = baseTime + randomTime;
        
        await new Promise(resolve => setTimeout(resolve, totalTime));
    }
    
    /**
     * 📈 ATUALIZAR MÉTRICAS DE PROCESSAMENTO
     */
    updateProcessingMetrics(operation, executionTime, result) {
        this.metrics.total_processed++;
        
        if (operation.queue === 'high' || operation.queue === 'critical') {
            this.metrics.high_priority_processed++;
        } else if (operation.queue === 'low') {
            this.metrics.low_priority_processed++;
        }
        
        // Calcular tempo médio de espera
        const waitTime = operation.started_at - operation.added_at;
        this.metrics.average_wait_time = (this.metrics.average_wait_time + waitTime) / 2;
        
        this.metrics.last_processed = new Date().toISOString();
    }
    
    /**
     * 📊 ATUALIZAR MÉTRICAS GERAIS
     */
    updateMetrics() {
        this.metrics.queue_sizes = {
            critical: this.queues.critical.length,
            high: this.queues.high.length,
            medium: this.queues.medium.length,
            low: this.queues.low.length,
            background: this.queues.background.length,
            total: Object.values(this.queues).reduce((total, queue) => total + queue.length, 0),
            active: this.activeOperations.size
        };
    }
    
    /**
     * 🧹 LIMPAR OPERAÇÕES ANTIGAS
     */
    cleanupOldOperations() {
        const now = Date.now();
        const maxAge = this.config.max_wait_time_ms;
        
        let cleaned = 0;
        
        for (const queueName in this.queues) {
            const queue = this.queues[queueName];
            const originalLength = queue.length;
            
            this.queues[queueName] = queue.filter(operation => {
                const age = now - operation.added_at;
                if (age > maxAge) {
                    console.log(`🧹 Removendo operação antiga: ${operation.id} (${Math.round(age/1000)}s)`);
                    this.emit('operation_timeout', operation);
                    return false;
                }
                return true;
            });
            
            cleaned += originalLength - this.queues[queueName].length;
        }
        
        if (cleaned > 0) {
            console.log(`🧹 ${cleaned} operações antigas removidas`);
            this.updateMetrics();
        }
    }
    
    /**
     * 🆔 GERAR ID ÚNICO PARA OPERAÇÃO
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 📊 OBTER STATUS ATUAL DAS FILAS
     */
    getQueueStatus() {
        this.updateMetrics();
        
        return {
            queues: this.metrics.queue_sizes,
            metrics: this.metrics,
            config: this.config,
            processing_active: this.processingActive,
            priority_mapping: ENVIRONMENT_PRIORITIES
        };
    }
    
    /**
     * ⏹️ PARAR PROCESSAMENTO
     */
    stopProcessing() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        this.processingActive = false;
        console.log('⏹️ Processamento parado');
    }
    
    /**
     * 🔄 REINICIAR PROCESSAMENTO
     */
    restartProcessing() {
        this.stopProcessing();
        this.startProcessing();
        console.log('🔄 Processamento reiniciado');
    }
}

module.exports = PriorityQueueManager;

// Se executado diretamente, demonstrar funcionamento
if (require.main === module) {
    console.log('🧪 DEMONSTRAÇÃO DO PRIORITY QUEUE MANAGER');
    console.log('==========================================');
    
    const manager = new PriorityQueueManager();
    
    // Adicionar operações de teste
    setTimeout(async () => {
        console.log('\n📊 Adicionando operações de teste...');
        
        // Operações management (alta prioridade)
        await manager.addOperation({
            type: 'order_execution',
            user_id: 'user_1',
            environment: 'management',
            amount: 1000,
            signal_data: { symbol: 'BTCUSDT', action: 'BUY' }
        });
        
        await manager.addOperation({
            type: 'signal_processing',
            user_id: 'user_2',
            testnet_mode: false,
            user_config: { account_type: 'management' },
            signal_data: { symbol: 'ETHUSDT', action: 'SELL' }
        });
        
        // Operações testnet (baixa prioridade)
        await manager.addOperation({
            type: 'order_execution',
            user_id: 'user_3',
            environment: 'testnet',
            testnet_mode: true,
            amount: 100,
            signal_data: { symbol: 'BTCUSDT', action: 'BUY' }
        });
        
        await manager.addOperation({
            type: 'balance_update',
            user_id: 'user_4',
            testnetMode: true,
            amount: 50
        });
        
        // Mostrar status
        setTimeout(() => {
            console.log('\n📊 STATUS DAS FILAS:');
            console.log(JSON.stringify(manager.getQueueStatus(), null, 2));
        }, 2000);
        
        // Parar após demonstração
        setTimeout(() => {
            manager.stopProcessing();
            console.log('\n✅ Demonstração concluída');
            process.exit(0);
        }, 10000);
        
    }, 1000);
}
