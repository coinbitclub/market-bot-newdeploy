const { Pool } = require('pg');
const axios = require('axios');
const OpenAI = require('openai');
const PriorityQueueManager = require('./priority-queue-manager.js');
const PriorityQueueManager = require('./priority-queue-manager.js');

// IMPORTAR EXECUTORES REAIS
const EnhancedSignalProcessorWithExecution = require('./enhanced-signal-processor-with-execution.js');

// STUBS TEMPORÁRIOS PARA DEPLOY
const SignalHistoryAnalyzer = class { constructor() {} };
const OrderManager = class { constructor() {} };
const MarketDirectionMonitor = class { constructor() {} };
const SignalMetricsMonitor = class { constructor() {} };
const ExchangeKeyValidator = class { constructor() {} };
const BTCDominanceAnalyzer = class { constructor() {} };
const RSIOverheatedMonitor = class { constructor() {} };
const DetailedSignalTracker = class { constructor() {} };

class MultiUserSignalProcessor {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        // Configurar OpenAI - SEMPRE usar variável de ambiente
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'your-openai-key-here'
        });

        // INTEGRAR EXECUTOR REAL
        this.realExecutor = new EnhancedSignalProcessorWithExecution();
        
        // 🎯 SISTEMA DE PRIORIDADES GLOBAL
        this.globalPriorityQueue = new PriorityQueueManager();
        this.globalPriorityQueue.on('operation_completed', (operation) => {
            console.log(`✅ Operação global concluída: ${operation.id}`);
        });
        
        console.log('🎯 Multi-User Signal Processor com Sistema de Prioridades iniciado');
        console.log('Management > Testnet priorização ativa');

        console.log('🚀 Multi-User Signal Processor iniciado com EXECUTORES REAIS INTEGRADOS');
        console.log('🔥 Enhanced Signal Processor: ATIVO');
        console.log(`⚡ Trading Real: ${process.env.ENABLE_REAL_TRADING === 'true' ? 'HABILITADO' : 'SIMULAÇÃO'}`);
    }

    async processSignal(signalData) {
        try {
            console.log('📊 Processando sinal com EXECUTOR REAL:', signalData);
            
            // 🎯 ADICIONAR À FILA GLOBAL DE PRIORIDADES
            const operationId = await this.globalPriorityQueue.addOperation({
                type: 'multi_user_signal_processing',
                signal_data: signalData,
                created_at: Date.now(),
                processor: this.realExecutor
            });

            console.log(`🎯 Sinal adicionado à fila global: ${operationId}`);
            
            // USAR O EXECUTOR REAL PARA PROCESSAR O SINAL
            const resultado = await this.realExecutor.processSignal(signalData);
            
            console.log('✅ Sinal processado pelo executor real:', resultado);
            return { 
                success: true, 
                message: 'Signal processed by real executor with priority queue',
                executionResult: resultado,
                executorUsed: 'process.env.API_KEY_HERE',
                tradingMode: process.env.ENABLE_REAL_TRADING === 'true' ? 'REAL' : 'SIMULATION',
                operationId: operationId,
                prioritySystem: 'ACTIVE'
            };
            
        } catch (error) {
            console.error('❌ Erro ao processar sinal com executor real:', error.message);
            return { 
                success: false, 
                error: error.message,
                executorUsed: 'process.env.API_KEY_HERE'
            };
        }
    }

    /**
     * 🎯 OBTER STATUS COMPLETO DAS FILAS DE PRIORIDADE
     */
    getPrioritySystemStatus() {
        return {
            global_queue: this.globalPriorityQueue.getQueueStatus(),
            real_executor_queue: this.realExecutor.getPriorityQueueStatus ? 
                this.realExecutor.getPriorityQueueStatus() : 'Not available',
            system_info: {
                management_priority: 'HIGH (500 points)',
                testnet_priority: 'LOW (50 points)',
                processing_mode: 'Automatic batching',
                ratio: '80% Management / 20% Testnet'
            }
        };
    }

    /**
     * 🔄 REINICIAR SISTEMA DE PRIORIDADES
     */
    restartPrioritySystem() {
        this.globalPriorityQueue.restartProcessing();
        if (this.realExecutor.restartPrioritySystem) {
            this.realExecutor.restartPrioritySystem();
        }
        console.log('🔄 Sistema de prioridades global reiniciado');
    }
}

module.exports = MultiUserSignalProcessor;
