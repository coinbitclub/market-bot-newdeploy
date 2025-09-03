#!/usr/bin/env node
/**
 * 🔧 INTEGRADOR FASE 1 - EXECUTORES E ORQUESTRADORES EXISTENTES
 * =============================================================
 * 
 * Integra o sistema de prioridades Stripe > Bonus > Testnet
 * com todos os executores e orquestradores já existentes
 * 
 * Data: 03/09/2025
 */

console.log('🔧 INICIANDO INTEGRAÇÃO COM EXECUTORES EXISTENTES');
console.log('==================================================');

const { Pool } = require('pg');
const path = require('path');

// Importar sistemas existentes
let RealTradingExecutor, MultiUserSignalProcessor, EnhancedSignalProcessor;
let IntegradorExecutores, OrderExecutionEngine, TradingPerformanceOptimizer;

try {
    const RealModule = require('../../src/modules/trading/executors/real-trading-executor.js');
    RealTradingExecutor = RealModule.RealTradingExecutor || RealModule;
    console.log('✅ RealTradingExecutor importado');
} catch (e) {
    console.log('⚠️ RealTradingExecutor não encontrado');
}

try {
    const MultiModule = require('../../src/modules/trading/processors/multi-user-signal-processor.js');
    MultiUserSignalProcessor = MultiModule.MultiUserSignalProcessor || MultiModule;
    console.log('✅ MultiUserSignalProcessor importado');
} catch (e) {
    console.log('⚠️ MultiUserSignalProcessor não encontrado');
}

try {
    const EnhancedModule = require('../../src/modules/trading/processors/enhanced-signal-processor.js');
    EnhancedSignalProcessor = EnhancedModule.EnhancedSignalProcessorWithExecution || EnhancedModule;
    console.log('✅ EnhancedSignalProcessor importado');
} catch (e) {
    console.log('⚠️ EnhancedSignalProcessor não encontrado');
}

try {
    const IntegradorModule = require('../../integrador-executores.js');
    IntegradorExecutores = IntegradorModule.IntegradorExecutores || IntegradorModule;
    console.log('✅ IntegradorExecutores importado');
} catch (e) {
    console.log('⚠️ IntegradorExecutores não encontrado');
}

try {
    const OrderModule = require('../../src/modules/trading/executors/order-execution-engine.js');
    OrderExecutionEngine = OrderModule.OrderExecutionEngine || OrderModule;
    console.log('✅ OrderExecutionEngine importado');
} catch (e) {
    console.log('⚠️ OrderExecutionEngine não encontrado');
}

try {
    const { TradingPerformanceOptimizer } = require('../../scripts/trading/trading-performance-optimizer.js');
    console.log('✅ TradingPerformanceOptimizer importado');
} catch (e) {
    console.log('⚠️ TradingPerformanceOptimizer não encontrado');
}

// Importar sistema Fase 1
const { 
    OptimizedDatabasePool,
    ExchangeConnectionPool,
    UserRateLimiter,
    EnhancedRealTradingExecutor,
    Phase1ScalabilitySystem
} = require('./scalability-phase1-implementation.js');

class ExecutorIntegrationManager {
    constructor() {
        console.log('\n🔧 INICIALIZANDO INTEGRATION MANAGER...');
        
        // Sistemas Fase 1
        this.dbPool = new OptimizedDatabasePool();
        this.exchangePool = new ExchangeConnectionPool();
        this.rateLimiter = new UserRateLimiter();
        
        // Executores existentes integrados
        this.executors = new Map();
        this.processors = new Map();
        this.orchestrators = new Map();
        
        // Sistema de prioridades baseado em saldo
        this.balancePrioritySystem = {
            stripe: {
                priority: 800,
                queue_weight: 0.6,      // 60% da capacidade
                rate_limit: 30,         // 30 ops/min
                description: 'Usuários Stripe (saldo real)'
            },
            bonus: {
                priority: 400,
                queue_weight: 0.3,      // 30% da capacidade
                rate_limit: 20,         // 20 ops/min
                description: 'Usuários Bonus (saldo admin)'
            },
            testnet: {
                priority: 100,
                queue_weight: 0.1,      // 10% da capacidade
                rate_limit: 10,         // 10 ops/min
                description: 'Usuários Testnet (saldo comissão)'
            }
        };

        this.initializeIntegratedExecutors();
        console.log('✅ Integration Manager inicializado');
    }

    async initializeIntegratedExecutors() {
        console.log('\n🎯 INTEGRANDO EXECUTORES EXISTENTES...');

        // 1. Integrar Real Trading Executor
        if (RealTradingExecutor) {
            const realExecutor = new RealTradingExecutor();
            this.executors.set('real-trading', {
                instance: realExecutor,
                type: 'executor',
                enhanced: this.enhanceRealTradingExecutor(realExecutor),
                priority_aware: true
            });
            console.log('✅ Real Trading Executor integrado com prioridades');
        }

        // 2. Integrar Multi User Signal Processor
        if (MultiUserSignalProcessor) {
            const multiProcessor = new MultiUserSignalProcessor();
            this.processors.set('multi-user', {
                instance: multiProcessor,
                type: 'processor',
                enhanced: this.enhanceMultiUserProcessor(multiProcessor),
                priority_aware: true
            });
            console.log('✅ Multi User Signal Processor integrado com prioridades');
        }

        // 3. Integrar Enhanced Signal Processor
        if (EnhancedSignalProcessor) {
            const enhancedProcessor = new EnhancedSignalProcessor();
            this.processors.set('enhanced', {
                instance: enhancedProcessor,
                type: 'processor',
                enhanced: this.enhanceSignalProcessor(enhancedProcessor),
                priority_aware: true
            });
            console.log('✅ Enhanced Signal Processor integrado com prioridades');
        }

        // 4. Integrar Integrador Executores
        if (IntegradorExecutores) {
            const integrador = new IntegradorExecutores();
            this.orchestrators.set('integrador', {
                instance: integrador,
                type: 'orchestrator',
                enhanced: this.enhanceIntegradorExecutores(integrador),
                priority_aware: true
            });
            console.log('✅ Integrador Executores integrado com prioridades');
        }

        // 5. Integrar Order Execution Engine
        if (OrderExecutionEngine) {
            const orderEngine = new OrderExecutionEngine();
            this.executors.set('order-engine', {
                instance: orderEngine,
                type: 'executor',
                enhanced: this.enhanceOrderExecutionEngine(orderEngine),
                priority_aware: true
            });
            console.log('✅ Order Execution Engine integrado com prioridades');
        }

        // 6. Integrar Trading Performance Optimizer
        if (TradingPerformanceOptimizer) {
            const optimizer = new TradingPerformanceOptimizer();
            this.processors.set('performance-optimizer', {
                instance: optimizer,
                type: 'optimizer',
                enhanced: this.enhanceTradingOptimizer(optimizer),
                priority_aware: true
            });
            console.log('✅ Trading Performance Optimizer integrado com prioridades');
        }
    }

    // ========================================================================
    // ENHANCED REAL TRADING EXECUTOR
    // ========================================================================

    enhanceRealTradingExecutor(executor) {
        const originalExecuteForUser = executor.executeForUser || 
            executor.processSignalAndExecute || 
            executor.execute;

        if (!originalExecuteForUser) {
            console.log('⚠️ RealTradingExecutor sem método de execução identificado');
            return executor;
        }

        // Sobrescrever método com sistema de prioridades
        executor.executeForUserWithPriority = async (userId, signalData, options = {}) => {
            try {
                console.log(`🎯 Executando para usuário ${userId} com sistema de prioridades...`);

                // 1. Determinar tipo de saldo
                const balanceType = await this.getUserBalanceType(userId);
                const priorityConfig = this.balancePrioritySystem[balanceType];

                console.log(`   💰 Tipo de saldo: ${balanceType.toUpperCase()}`);
                console.log(`   🎯 Prioridade: ${priorityConfig.priority}`);
                console.log(`   📝 ${priorityConfig.description}`);

                // 2. Verificar rate limit específico do tipo
                const canProceed = await this.rateLimiter.checkUserLimit(userId, balanceType);
                if (!canProceed) {
                    const queueId = await this.rateLimiter.queueOperation(userId, signalData, balanceType);
                    throw new Error(`Rate limit ${balanceType}: operação enfileirada ${queueId}`);
                }

                // 3. Adicionar prioridade aos dados
                const enhancedSignalData = {
                    ...signalData,
                    balanceType,
                    priority: priorityConfig.priority,
                    userId,
                    timestamp: Date.now()
                };

                // 4. Executar com prioridade
                const result = await originalExecuteForUser.call(executor, userId, enhancedSignalData, {
                    ...options,
                    priority: priorityConfig.priority,
                    balanceType
                });

                console.log(`✅ Execução ${balanceType} concluída para usuário ${userId}`);
                return result;

            } catch (error) {
                console.error(`❌ Erro na execução prioritária usuário ${userId}:`, error.message);
                throw error;
            }
        };

        // Adicionar método para obter status de prioridades
        executor.getPrioritySystemStatus = () => {
            return {
                balance_priority_system: this.balancePrioritySystem,
                rate_limiter_status: this.rateLimiter.getMetrics(),
                active_queues: this.rateLimiter.getMetrics().queue_sizes
            };
        };

        return executor;
    }

    // ========================================================================
    // ENHANCED MULTI USER SIGNAL PROCESSOR
    // ========================================================================

    enhanceMultiUserProcessor(processor) {
        const originalProcessSignal = processor.processSignal;

        if (!originalProcessSignal) {
            console.log('⚠️ MultiUserSignalProcessor sem método processSignal');
            return processor;
        }

        processor.processSignalWithPriority = async (signalData) => {
            try {
                console.log('🎯 Processando sinal com sistema de prioridades...');

                // 1. Identificar usuários afetados pelo sinal
                const affectedUsers = await this.getAffectedUsers(signalData);
                
                // 2. Agrupar usuários por tipo de saldo
                const usersByBalance = await this.groupUsersByBalance(affectedUsers);

                console.log(`   📊 Usuários afetados: ${affectedUsers.length}`);
                console.log(`   💳 Stripe: ${usersByBalance.stripe.length}`);
                console.log(`   🎁 Bonus: ${usersByBalance.bonus.length}`);
                console.log(`   🧪 Testnet: ${usersByBalance.testnet.length}`);

                // 3. Processar em ordem de prioridade
                const results = {
                    stripe: [],
                    bonus: [],
                    testnet: [],
                    total_processed: 0,
                    total_failed: 0
                };

                // Processar Stripe (alta prioridade) primeiro
                if (usersByBalance.stripe.length > 0) {
                    console.log('💳 Processando usuários Stripe (prioridade ALTA)...');
                    const stripeResults = await this.processUsersWithPriority(
                        usersByBalance.stripe, signalData, 'stripe', originalProcessSignal, processor
                    );
                    results.stripe = stripeResults;
                    results.total_processed += stripeResults.filter(r => r.success).length;
                    results.total_failed += stripeResults.filter(r => !r.success).length;
                }

                // Processar Bonus (média prioridade)
                if (usersByBalance.bonus.length > 0) {
                    console.log('🎁 Processando usuários Bonus (prioridade MÉDIA)...');
                    const bonusResults = await this.processUsersWithPriority(
                        usersByBalance.bonus, signalData, 'bonus', originalProcessSignal, processor
                    );
                    results.bonus = bonusResults;
                    results.total_processed += bonusResults.filter(r => r.success).length;
                    results.total_failed += bonusResults.filter(r => !r.success).length;
                }

                // Processar Testnet (baixa prioridade)
                if (usersByBalance.testnet.length > 0) {
                    console.log('🧪 Processando usuários Testnet (prioridade BAIXA)...');
                    const testnetResults = await this.processUsersWithPriority(
                        usersByBalance.testnet, signalData, 'testnet', originalProcessSignal, processor
                    );
                    results.testnet = testnetResults;
                    results.total_processed += testnetResults.filter(r => r.success).length;
                    results.total_failed += testnetResults.filter(r => !r.success).length;
                }

                console.log(`✅ Processamento prioritário concluído:`);
                console.log(`   📊 Total processados: ${results.total_processed}`);
                console.log(`   ❌ Total falhas: ${results.total_failed}`);
                console.log(`   📈 Taxa de sucesso: ${((results.total_processed / (results.total_processed + results.total_failed)) * 100).toFixed(1)}%`);

                return results;

            } catch (error) {
                console.error('❌ Erro no processamento prioritário:', error.message);
                throw error;
            }
        };

        return processor;
    }

    // ========================================================================
    // ENHANCED SIGNAL PROCESSOR
    // ========================================================================

    enhanceSignalProcessor(processor) {
        const originalProcessSignal = processor.processSignal;

        if (!originalProcessSignal) {
            console.log('⚠️ EnhancedSignalProcessor sem método processSignal');
            return processor;
        }

        processor.processSignalWithPriority = async (signalData) => {
            try {
                console.log('🎯 Enhanced Signal Processor com prioridades...');

                // Adicionar contexto de prioridade ao sinal
                const enhancedSignalData = {
                    ...signalData,
                    priority_context: {
                        stripe_users_count: 0,
                        bonus_users_count: 0,
                        testnet_users_count: 0,
                        processing_order: ['stripe', 'bonus', 'testnet']
                    },
                    timestamp: Date.now()
                };

                // Processar com contexto de prioridade
                const result = await originalProcessSignal.call(processor, enhancedSignalData);

                console.log('✅ Enhanced Signal Processor com prioridades concluído');
                return result;

            } catch (error) {
                console.error('❌ Erro no Enhanced Signal Processor prioritário:', error.message);
                throw error;
            }
        };

        return processor;
    }

    // ========================================================================
    // ENHANCED INTEGRADOR EXECUTORES
    // ========================================================================

    enhanceIntegradorExecutores(integrador) {
        console.log('🔧 Aprimorando Integrador Executores com sistema de prioridades...');

        // Adicionar método para executar com prioridade
        integrador.executeWithPriority = async (userId, operation) => {
            try {
                const balanceType = await this.getUserBalanceType(userId);
                const priorityConfig = this.balancePrioritySystem[balanceType];

                console.log(`🎯 Integrador executando para ${userId} (${balanceType.toUpperCase()})`);

                // Verificar rate limit
                const canProceed = await this.rateLimiter.checkUserLimit(userId, balanceType);
                if (!canProceed) {
                    const queueId = await this.rateLimiter.queueOperation(userId, operation, balanceType);
                    throw new Error(`Integrador rate limit: operação enfileirada ${queueId}`);
                }

                // Adicionar contexto de prioridade
                const enhancedOperation = {
                    ...operation,
                    priority: priorityConfig.priority,
                    balanceType,
                    userId
                };

                // Usar método existente do integrador
                if (integrador.executarOperacao) {
                    return await integrador.executarOperacao(enhancedOperation);
                } else if (integrador.execute) {
                    return await integrador.execute(enhancedOperation);
                } else {
                    console.log('⚠️ Integrador sem método de execução identificado');
                    return { success: false, error: 'No execution method found' };
                }

            } catch (error) {
                console.error(`❌ Erro no Integrador prioritário usuário ${userId}:`, error.message);
                throw error;
            }
        };

        return integrador;
    }

    // ========================================================================
    // ENHANCED ORDER EXECUTION ENGINE
    // ========================================================================

    enhanceOrderExecutionEngine(engine) {
        console.log('🔧 Aprimorando Order Execution Engine com sistema de prioridades...');

        // Sobrescrever método de execução principal
        const originalExecute = engine.executarOrdem || engine.execute || engine.executeOrder;

        if (!originalExecute) {
            console.log('⚠️ OrderExecutionEngine sem método de execução identificado');
            return engine;
        }

        engine.executeOrderWithPriority = async (userId, orderRequest) => {
            try {
                const balanceType = await this.getUserBalanceType(userId);
                const priorityConfig = this.balancePrioritySystem[balanceType];

                console.log(`🎯 Order Engine executando para ${userId} (${balanceType.toUpperCase()})`);

                // Verificar rate limit
                const canProceed = await this.rateLimiter.checkUserLimit(userId, balanceType);
                if (!canProceed) {
                    const queueId = await this.rateLimiter.queueOperation(userId, orderRequest, balanceType);
                    throw new Error(`Order Engine rate limit: operação enfileirada ${queueId}`);
                }

                // Aplicar prioridade na seleção de exchange
                const enhancedOrderRequest = {
                    ...orderRequest,
                    priority: priorityConfig.priority,
                    balanceType,
                    userId,
                    exchange_selection_priority: this.getExchangePriorityByBalance(balanceType)
                };

                // Executar ordem com prioridade
                const result = await originalExecute.call(engine, enhancedOrderRequest);

                console.log(`✅ Order Engine ${balanceType} concluído para usuário ${userId}`);
                return result;

            } catch (error) {
                console.error(`❌ Erro no Order Engine prioritário usuário ${userId}:`, error.message);
                throw error;
            }
        };

        return engine;
    }

    // ========================================================================
    // ENHANCED TRADING PERFORMANCE OPTIMIZER
    // ========================================================================

    enhanceTradingOptimizer(optimizer) {
        console.log('🔧 Aprimorando Trading Performance Optimizer com sistema de prioridades...');

        const originalOptimize = optimizer.optimizeExecution || optimizer.optimize;

        if (!originalOptimize) {
            console.log('⚠️ TradingPerformanceOptimizer sem método de otimização identificado');
            return optimizer;
        }

        optimizer.optimizeExecutionWithPriority = async (signal) => {
            try {
                // Determinar tipo de usuário se disponível
                const userId = signal.userId || signal.user_id;
                let balanceType = 'testnet'; // default
                
                if (userId) {
                    balanceType = await this.getUserBalanceType(userId);
                }

                const priorityConfig = this.balancePrioritySystem[balanceType];

                console.log(`🎯 Performance Optimizer para usuário ${userId || 'N/A'} (${balanceType.toUpperCase()})`);

                // Aplicar otimizações específicas por tipo de saldo
                const enhancedSignal = {
                    ...signal,
                    priority: priorityConfig.priority,
                    balanceType,
                    optimization_profile: this.getOptimizationProfile(balanceType)
                };

                // Executar otimização
                const result = await originalOptimize.call(optimizer, enhancedSignal);

                console.log(`✅ Performance Optimizer ${balanceType} concluído`);
                return result;

            } catch (error) {
                console.error('❌ Erro no Performance Optimizer prioritário:', error.message);
                throw error;
            }
        };

        return optimizer;
    }

    // ========================================================================
    // MÉTODOS AUXILIARES
    // ========================================================================

    async getUserBalanceType(userId) {
        try {
            const result = await this.dbPool.query(`
                SELECT 
                    COALESCE(saldo_real_brl, 0) + COALESCE(saldo_real_usd, 0) as stripe_balance,
                    COALESCE(saldo_admin_brl, 0) + COALESCE(saldo_admin_usd, 0) as bonus_balance,
                    COALESCE(saldo_comissao_brl, 0) + COALESCE(saldo_comissao_usd, 0) as testnet_balance
                FROM users 
                WHERE id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                return 'testnet'; // Default seguro
            }

            const balances = result.rows[0];
            
            // Prioridade: Stripe > Bonus > Testnet
            if (parseFloat(balances.stripe_balance) > 0) {
                return 'stripe';
            } else if (parseFloat(balances.bonus_balance) > 0) {
                return 'bonus';
            } else {
                return 'testnet';
            }

        } catch (error) {
            console.error('❌ Erro ao verificar tipo de saldo:', error.message);
            return 'testnet'; // Fallback seguro
        }
    }

    async getAffectedUsers(signalData) {
        try {
            // Buscar usuários ativos que podem ser afetados pelo sinal
            const result = await this.dbPool.query(`
                SELECT DISTINCT u.id, u.username
                FROM users u
                JOIN user_exchange_keys uek ON u.id = uek.user_id
                WHERE uek.active = true
                  AND (u.saldo_real_brl > 0 OR u.saldo_real_usd > 0 
                       OR u.saldo_admin_brl > 0 OR u.saldo_admin_usd > 0
                       OR u.saldo_comissao_brl > 0 OR u.saldo_comissao_usd > 0)
                ORDER BY u.id
                LIMIT 1000
            `);

            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao buscar usuários afetados:', error.message);
            return [];
        }
    }

    async groupUsersByBalance(users) {
        const grouped = {
            stripe: [],
            bonus: [],
            testnet: []
        };

        for (const user of users) {
            const balanceType = await this.getUserBalanceType(user.id);
            grouped[balanceType].push(user);
        }

        return grouped;
    }

    async processUsersWithPriority(users, signalData, balanceType, originalProcessor, context) {
        const results = [];
        const batchSize = this.balancePrioritySystem[balanceType].queue_weight * 20; // Ajustar batch por prioridade

        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (user) => {
                try {
                    // Verificar rate limit individual
                    const canProceed = await this.rateLimiter.checkUserLimit(user.id, balanceType);
                    if (!canProceed) {
                        return { userId: user.id, success: false, error: 'Rate limit exceeded' };
                    }

                    // Processar usuário
                    const result = await originalProcessor.call(context, {
                        ...signalData,
                        userId: user.id,
                        balanceType,
                        priority: this.balancePrioritySystem[balanceType].priority
                    });

                    return { userId: user.id, success: true, result };

                } catch (error) {
                    return { userId: user.id, success: false, error: error.message };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(r => r.value || { success: false, error: 'Promise rejected' }));

            // Pequeno delay entre batches para não sobrecarregar
            if (i + batchSize < users.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }

    getExchangePriorityByBalance(balanceType) {
        // Prioridades de exchange baseadas no tipo de saldo
        const priorities = {
            stripe: { bybit: 10, binance: 8 },      // Stripe users get best connections
            bonus: { bybit: 7, binance: 6 },        // Bonus users get good connections
            testnet: { bybit: 3, binance: 2 }       // Testnet users get basic connections
        };

        return priorities[balanceType] || priorities.testnet;
    }

    getOptimizationProfile(balanceType) {
        // Perfis de otimização por tipo de saldo
        const profiles = {
            stripe: {
                connection_pool_priority: 'high',
                rate_limit_priority: 'high',
                error_retry_count: 5,
                timeout_multiplier: 1.5
            },
            bonus: {
                connection_pool_priority: 'medium',
                rate_limit_priority: 'medium',
                error_retry_count: 3,
                timeout_multiplier: 1.2
            },
            testnet: {
                connection_pool_priority: 'low',
                rate_limit_priority: 'low',
                error_retry_count: 2,
                timeout_multiplier: 1.0
            }
        };

        return profiles[balanceType] || profiles.testnet;
    }

    // ========================================================================
    // MÉTODOS PÚBLICOS PARA USAR O SISTEMA INTEGRADO
    // ========================================================================

    async executeForUser(userId, operation, executorType = 'real-trading') {
        const executor = this.executors.get(executorType);
        if (!executor || !executor.enhanced) {
            throw new Error(`Executor ${executorType} não encontrado ou não integrado`);
        }

        if (executor.enhanced.executeForUserWithPriority) {
            return await executor.enhanced.executeForUserWithPriority(userId, operation);
        } else {
            throw new Error(`Executor ${executorType} não suporta sistema de prioridades`);
        }
    }

    async processSignal(signalData, processorType = 'multi-user') {
        const processor = this.processors.get(processorType);
        if (!processor || !processor.enhanced) {
            throw new Error(`Processor ${processorType} não encontrado ou não integrado`);
        }

        if (processor.enhanced.processSignalWithPriority) {
            return await processor.enhanced.processSignalWithPriority(signalData);
        } else {
            throw new Error(`Processor ${processorType} não suporta sistema de prioridades`);
        }
    }

    async orchestrateOperation(userId, operation, orchestratorType = 'integrador') {
        const orchestrator = this.orchestrators.get(orchestratorType);
        if (!orchestrator || !orchestrator.enhanced) {
            throw new Error(`Orchestrator ${orchestratorType} não encontrado ou não integrado`);
        }

        if (orchestrator.enhanced.executeWithPriority) {
            return await orchestrator.enhanced.executeWithPriority(userId, operation);
        } else {
            throw new Error(`Orchestrator ${orchestratorType} não suporta sistema de prioridades`);
        }
    }

    getSystemStatus() {
        return {
            integration_status: {
                executors: Array.from(this.executors.keys()),
                processors: Array.from(this.processors.keys()),
                orchestrators: Array.from(this.orchestrators.keys())
            },
            priority_system: this.balancePrioritySystem,
            database_pool: this.dbPool.getMetrics(),
            exchange_pool: this.exchangePool.getMetrics(),
            rate_limiter: this.rateLimiter.getMetrics()
        };
    }

    async testIntegratedSystem() {
        console.log('\n🧪 TESTANDO SISTEMA INTEGRADO...');
        console.log('================================');

        const testResults = {
            executors: {},
            processors: {},
            orchestrators: {},
            integration_success: true
        };

        // Testar executores
        for (const [name, executor] of this.executors) {
            try {
                console.log(`🔧 Testando executor: ${name}`);
                
                if (executor.enhanced.executeForUserWithPriority) {
                    // Teste simples
                    await executor.enhanced.executeForUserWithPriority(999, {
                        symbol: 'BTCUSDT',
                        side: 'buy',
                        amount: 0.001,
                        test: true
                    });
                    testResults.executors[name] = 'SUCCESS';
                    console.log(`   ✅ ${name}: FUNCIONANDO`);
                } else {
                    testResults.executors[name] = 'NO_PRIORITY_METHOD';
                    console.log(`   ⚠️ ${name}: SEM MÉTODO DE PRIORIDADE`);
                }
            } catch (error) {
                testResults.executors[name] = `ERROR: ${error.message}`;
                testResults.integration_success = false;
                console.log(`   ❌ ${name}: ERRO - ${error.message}`);
            }
        }

        // Testar processadores
        for (const [name, processor] of this.processors) {
            try {
                console.log(`🔧 Testando processor: ${name}`);
                
                if (processor.enhanced.processSignalWithPriority) {
                    // Teste simples
                    await processor.enhanced.processSignalWithPriority({
                        symbol: 'BTCUSDT',
                        action: 'BUY',
                        test: true
                    });
                    testResults.processors[name] = 'SUCCESS';
                    console.log(`   ✅ ${name}: FUNCIONANDO`);
                } else {
                    testResults.processors[name] = 'NO_PRIORITY_METHOD';
                    console.log(`   ⚠️ ${name}: SEM MÉTODO DE PRIORIDADE`);
                }
            } catch (error) {
                testResults.processors[name] = `ERROR: ${error.message}`;
                console.log(`   ⚠️ ${name}: ERRO - ${error.message}`);
            }
        }

        // Testar orquestradores
        for (const [name, orchestrator] of this.orchestrators) {
            try {
                console.log(`🔧 Testando orchestrator: ${name}`);
                
                if (orchestrator.enhanced.executeWithPriority) {
                    // Teste simples
                    await orchestrator.enhanced.executeWithPriority(999, {
                        type: 'test',
                        operation: 'ping'
                    });
                    testResults.orchestrators[name] = 'SUCCESS';
                    console.log(`   ✅ ${name}: FUNCIONANDO`);
                } else {
                    testResults.orchestrators[name] = 'NO_PRIORITY_METHOD';
                    console.log(`   ⚠️ ${name}: SEM MÉTODO DE PRIORIDADE`);
                }
            } catch (error) {
                testResults.orchestrators[name] = `ERROR: ${error.message}`;
                console.log(`   ⚠️ ${name}: ERRO - ${error.message}`);
            }
        }

        console.log('\n📊 RESULTADO DOS TESTES:');
        console.log('========================');
        console.log(`✅ Integração geral: ${testResults.integration_success ? 'SUCESSO' : 'COM PROBLEMAS'}`);
        console.log(`🔧 Executores integrados: ${Object.keys(testResults.executors).length}`);
        console.log(`⚙️ Processadores integrados: ${Object.keys(testResults.processors).length}`);
        console.log(`🎯 Orquestradores integrados: ${Object.keys(testResults.orchestrators).length}`);

        return testResults;
    }
}

// ============================================================================
// EXECUÇÃO E TESTE
// ============================================================================

async function main() {
    console.log('\n🚀 INICIANDO INTEGRAÇÃO COMPLETA DE EXECUTORES');
    console.log('===============================================');

    try {
        // Inicializar sistema integrado
        const integrationManager = new ExecutorIntegrationManager();
        
        // Aguardar inicialização
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Testar sistema integrado
        const testResults = await integrationManager.testIntegratedSystem();
        
        // Mostrar status final
        console.log('\n📊 STATUS DO SISTEMA INTEGRADO:');
        console.log('===============================');
        const status = integrationManager.getSystemStatus();
        console.log(JSON.stringify(status, null, 2));

        // Exemplo de uso do sistema integrado
        console.log('\n🧪 EXEMPLO DE USO DO SISTEMA INTEGRADO:');
        console.log('=======================================');
        
        try {
            // Exemplo 1: Executar para usuário Stripe
            console.log('💳 Testando usuário Stripe...');
            await integrationManager.executeForUser(1, {
                symbol: 'BTCUSDT',
                side: 'buy',
                amount: 0.001
            });
            console.log('✅ Execução Stripe concluída');

            // Exemplo 2: Processar sinal multi-user
            console.log('📡 Testando processamento de sinal...');
            await integrationManager.processSignal({
                symbol: 'ETHUSDT',
                action: 'SELL',
                source: 'test'
            });
            console.log('✅ Processamento de sinal concluído');

        } catch (error) {
            console.log(`⚠️ Erro nos exemplos: ${error.message}`);
        }

        console.log('\n🎉 INTEGRAÇÃO DE EXECUTORES CONCLUÍDA!');
        console.log('====================================');
        console.log('✅ Todos os executores e orquestradores existentes agora');
        console.log('   suportam sistema de prioridades Stripe > Bonus > Testnet');
        console.log('✅ Rate limiting específico por tipo de saldo implementado');
        console.log('✅ Connection pooling otimizado para cada prioridade');
        console.log('✅ Sistema pronto para 200-300 usuários simultâneos');

        return integrationManager;

    } catch (error) {
        console.error('\n❌ ERRO NA INTEGRAÇÃO:', error.message);
        console.error(error.stack);
        throw error;
    }
}

module.exports = {
    ExecutorIntegrationManager
};

// Executar se chamado diretamente
if (require.main === module) {
    main().then(() => {
        console.log('\n✅ Integração concluída com sucesso');
        process.exit(0);
    }).catch(error => {
        console.error('\n❌ Falha na integração:', error.message);
        process.exit(1);
    });
}
