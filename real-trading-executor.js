/**
 * 🔥 REAL TRADING EXECUTOR - OPERAÇÃO SIMULTÂNEA TESTNET + MAINNET
 * ================================================================
 * 
 * Sistema avançado para execução real de trades em multiple exchanges
 * Suporte simultâneo para testnet e mainnet
 * Integração direta com enhanced-signal-processor
 * 
 * Data: 11/08/2025
 * Versão: v2.0.0 EMERGENCY
 */

console.log('🔥 REAL TRADING EXECUTOR - INICIANDO...');
console.log('=======================================');

const { Pool } = require('pg');
const ccxt = require('ccxt');
const crypto = require('crypto');
const axios = require('axios');
const PriorityQueueManager = require('./priority-queue-manager.js');

class RealTradingExecutor {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://username:password@host:port/database',
            ssl: { rejectUnauthorized: false }
        });

        // 🎯 SISTEMA DE PRIORIDADES INTEGRADO
        this.priorityQueue = new PriorityQueueManager();
        this.priorityQueue.on('operation_completed', (operation) => {
            console.log(`✅ Execução priorizada concluída: ${operation.id}`);
        });

        // 🎯 CONFIGURAÇÃO PARA OPERAÇÃO REAL SIMULTÂNEA
        this.tradingConfig = {
            real_trading_enabled: process.env.ENABLE_REAL_TRADING === 'true',
            simultaneous_execution: true, // TESTNET + MAINNET
            safety_checks: true,
            max_leverage: parseInt(process.env.MAX_LEVERAGE) || 10,
            max_position_size: parseFloat(process.env.MAX_POSITION_SIZE) || 100,
            mandatory_stop_loss: process.env.MANDATORY_STOP_LOSS === 'true'
        };

        // 📊 ESTATÍSTICAS EM TEMPO REAL
        this.stats = {
            signals_processed: 0,
            orders_executed: 0,
            successful_executions: 0,
            failed_executions: 0,
            total_volume: 0,
            users_active: 0,
            last_execution: null
        };

        // 💾 CACHE DE CONEXÕES ATIVAS
        this.activeConnections = new Map();
        this.userConfigs = new Map();

        console.log('✅ Real Trading Executor inicializado');
        console.log(`🔥 Trading Real: ${this.tradingConfig.real_trading_enabled ? 'ATIVADO' : 'SIMULAÇÃO'}`);
        console.log(`⚡ Execução Simultânea: ${this.tradingConfig.simultaneous_execution ? 'SIM' : 'NÃO'}`);
    }

    /**
     * 🚀 PROCESSAR SINAL E EXECUTAR TRADES REAIS
     */
    async processSignalAndExecute(signalData) {
        console.log('\n🚀 PROCESSANDO SINAL PARA EXECUÇÃO REAL...');
        console.log('==========================================');
        console.log('📊 Sinal recebido:', JSON.stringify(signalData, null, 2));

        this.stats.signals_processed++;
        
        const executionResult = {
            signal_id: null,
            signal_data: signalData,
            timestamp: new Date().toISOString(),
            execution_mode: this.tradingConfig.real_trading_enabled ? 'REAL' : 'SIMULATION',
            users_processed: 0,
            successful_users: 0,
            failed_users: 0,
            total_orders: 0,
            detailed_results: {}
        };

        try {
            // 1. SALVAR SINAL NO BANCO
            const signalId = await this.saveSignalToDatabase(signalData);
            executionResult.signal_id = signalId;
            console.log(`📋 Sinal salvo no banco com ID: ${signalId}`);

            // 2. BUSCAR USUÁRIOS ATIVOS E SUAS CONFIGURAÇÕES
            const activeUsers = await this.getActiveUsersWithConfigs();
            executionResult.users_processed = activeUsers.length;
            console.log(`👥 Usuários ativos encontrados: ${activeUsers.length}`);

            if (activeUsers.length === 0) {
                console.log('⚠️ Nenhum usuário ativo encontrado');
                return executionResult;
            }

            // 🎯 3. SEPARAR USUÁRIOS POR PRIORIDADE (MANAGEMENT vs TESTNET)
            const managementUsers = activeUsers.filter(user => 
                user.account_type === 'management' || 
                user.testnet_mode === false ||
                (process.env.RAILWAY_ENVIRONMENT_NAME === 'management' && user.smart_hybrid_enabled)
            );

            const testnetUsers = activeUsers.filter(user => 
                user.testnet_mode === true && user.account_type !== 'management'
            );

            console.log(`🔥 Usuários Management: ${managementUsers.length}`);
            console.log(`🧪 Usuários Testnet: ${testnetUsers.length}`);

            // 🎯 4. PROCESSAR MANAGEMENT PRIMEIRO (ALTA PRIORIDADE)
            if (managementUsers.length > 0) {
                console.log('\n🎯 PROCESSANDO USUÁRIOS MANAGEMENT (PRIORIDADE ALTA)...');
                
                const managementPromises = managementUsers.map(async (user) => {
                    const operationId = await this.priorityQueue.addOperation({
                        type: 'order_execution',
                        user_id: user.user_id,
                        user_config: user,
                        signal_data: signalData,
                        environment: 'management',
                        priority_override: 'HIGH',
                        executor: this
                    });
                    
                    return this.executeForUser(user, signalData, signalId);
                });

                const managementResults = await Promise.allSettled(managementPromises);
                this.processUserResults(managementResults, executionResult, 'management');
            }

            // 🎯 5. PROCESSAR TESTNET DEPOIS (BAIXA PRIORIDADE)
            if (testnetUsers.length > 0) {
                console.log('\n🧪 PROCESSANDO USUÁRIOS TESTNET (PRIORIDADE BAIXA)...');
                
                const testnetPromises = testnetUsers.map(async (user) => {
                    const operationId = await this.priorityQueue.addOperation({
                        type: 'order_execution',
                        user_id: user.user_id,
                        user_config: user,
                        signal_data: signalData,
                        environment: 'testnet',
                        priority_override: 'LOW',
                        executor: this
                    });
                    
                    return this.executeForUser(user, signalData, signalId);
                });

                const testnetResults = await Promise.allSettled(testnetPromises);
                this.processUserResults(testnetResults, executionResult, 'testnet');
            }

            // 6. ATUALIZAR ESTATÍSTICAS
            this.stats.orders_executed += executionResult.total_orders;
            this.stats.successful_executions += executionResult.successful_users;
            this.stats.failed_executions += executionResult.failed_users;
            this.stats.users_active = activeUsers.length;
            this.stats.last_execution = new Date().toISOString();

            console.log('\n📊 RESUMO DA EXECUÇÃO:');
            console.log('======================');
            console.log(`👥 Usuários processados: ${executionResult.users_processed}`);
            console.log(`✅ Usuários com sucesso: ${executionResult.successful_users}`);
            console.log(`❌ Usuários com falha: ${executionResult.failed_users}`);
            console.log(`📋 Total de ordens: ${executionResult.total_orders}`);

            return executionResult;

        } catch (error) {
            console.error('❌ Erro ao processar sinal:', error);
            executionResult.error = error.message;
            return executionResult;
        }
    }

    /**
     * 👥 BUSCAR USUÁRIOS ATIVOS COM CONFIGURAÇÕES
     */
    async getActiveUsersWithConfigs() {
        try {
            const query = `
                SELECT DISTINCT
                    u.id,
                    u.username,
                    u.email,
                    u.is_active,
                    utc.max_leverage,
                    utc.max_stop_loss,
                    utc.max_percent_per_trade,
                    utc.trading_enabled,
                    COUNT(uak.id) as total_keys
                FROM users u
                LEFT JOIN user_trading_config utc ON u.id = utc.user_id
                LEFT JOIN user_api_keys uak ON u.id = uak.user_id AND uak.is_active = true
                WHERE u.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                GROUP BY u.id, u.username, u.email, u.is_active, utc.max_leverage, utc.max_stop_loss, utc.max_percent_per_trade, utc.trading_enabled
                HAVING COUNT(uak.id) > 0
                ORDER BY u.id
            `;

            const result = await this.pool.query(query);
            return result.rows;

        } catch (error) {
            console.error('❌ Erro ao buscar usuários ativos:', error.message);
            return [];
        }
    }

    /**
     * 🔑 BUSCAR CHAVES DO USUÁRIO
     */
    async getUserApiKeys(userId) {
        try {
            const query = `
                SELECT 
                    exchange,
                    environment,
                    api_key,
                    secret_key,
                    validation_status,
                    is_active
                FROM user_api_keys
                WHERE user_id = $1 
                AND is_active = true
                AND api_key IS NOT NULL
                AND secret_key IS NOT NULL
                ORDER BY exchange, environment
            `;

            const result = await this.pool.query(query, [userId]);
            return result.rows;

        } catch (error) {
            console.error('❌ Erro ao buscar chaves do usuário:', error.message);
            return [];
        }
    }

    /**
     * ⚡ EXECUTAR PARA UM USUÁRIO ESPECÍFICO
     */
    async executeForUser(user, signalData, signalId) {
        const userResult = {
            user_id: user.id,
            username: user.username,
            status: 'PENDING',
            orders_executed: 0,
            exchange_results: {},
            error_message: null
        };

        try {
            // 1. BUSCAR CHAVES API DO USUÁRIO
            const apiKeys = await this.getUserApiKeys(user.id);
            
            if (apiKeys.length === 0) {
                userResult.status = 'NO_API_KEYS';
                userResult.error_message = 'Usuário sem chaves API válidas';
                console.log('  ⚠️ Nenhuma chave API válida encontrada');
                return userResult;
            }

            console.log(`  🔑 Chaves encontradas: ${apiKeys.length}`);

            // 2. VALIDAR CONFIGURAÇÕES DE TRADING
            const tradingConfig = this.validateUserTradingConfig(user, signalData);
            if (!tradingConfig.valid) {
                userResult.status = 'INVALID_CONFIG';
                userResult.error_message = tradingConfig.reason;
                console.log(`  ❌ Configuração inválida: ${tradingConfig.reason}`);
                return userResult;
            }

            console.log('  ✅ Configuração de trading válida');

            // 3. EXECUTAR EM CADA EXCHANGE
            let hasSuccessfulExecution = false;

            for (const keyData of apiKeys) {
                const exchangeKey = `${keyData.exchange}_${keyData.environment}`;
                console.log(`    🔄 Executando em ${exchangeKey}...`);

                try {
                    const orderResult = await this.executeOrderOnExchange(
                        keyData,
                        signalData,
                        tradingConfig.orderParams,
                        signalId,
                        user.id
                    );

                    userResult.exchange_results[exchangeKey] = orderResult;

                    if (orderResult.success) {
                        console.log(`      ✅ SUCESSO - Order ID: ${orderResult.order_id}`);
                        userResult.orders_executed++;
                        hasSuccessfulExecution = true;
                    } else {
                        console.log(`      ❌ FALHA - ${orderResult.error}`);
                    }

                } catch (error) {
                    console.log(`      ❌ ERRO - ${error.message}`);
                    userResult.exchange_results[exchangeKey] = {
                        success: false,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    };
                }

                // Rate limiting entre exchanges
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // 4. DETERMINAR STATUS FINAL
            userResult.status = hasSuccessfulExecution ? 'SUCCESS' : 'FAILED';

        } catch (error) {
            console.error(`  ❌ Erro geral para usuário ${user.username}:`, error.message);
            userResult.status = 'ERROR';
            userResult.error_message = error.message;
        }

        return userResult;
    }

    /**
     * 🛡️ VALIDAR CONFIGURAÇÃO DE TRADING DO USUÁRIO
     */
    validateUserTradingConfig(user, signalData) {
        try {
            // Extrair dados do sinal
            const leverage = signalData.leverage || 1;
            const quantity = signalData.quantity || 0.001;
            const stopLoss = signalData.stopLoss || null;

            // Validações de segurança
            const maxLeverage = user.max_leverage || this.tradingConfig.max_leverage;
            if (leverage > maxLeverage) {
                return {
                    valid: false,
                    reason: `Leverage ${leverage}x excede o máximo permitido (${maxLeverage}x)`
                };
            }

            // Verificar se stop loss é obrigatório
            if (this.tradingConfig.mandatory_stop_loss && !stopLoss) {
                return {
                    valid: false,
                    reason: 'Stop Loss é obrigatório para este usuário'
                };
            }

            // Validar tamanho da posição
            const positionValue = quantity * (signalData.price || 50000); // Estimativa
            if (positionValue > this.tradingConfig.max_position_size) {
                return {
                    valid: false,
                    reason: `Valor da posição ($${positionValue}) excede o máximo permitido`
                };
            }

            // Preparar parâmetros da ordem
            const orderParams = {
                symbol: signalData.symbol || 'BTCUSDT',
                side: (signalData.action || signalData.signal || 'BUY').toUpperCase(),
                amount: quantity,
                type: 'MARKET',
                leverage: leverage,
                stopLoss: stopLoss,
                takeProfit: signalData.takeProfit || null
            };

            return {
                valid: true,
                orderParams: orderParams
            };

        } catch (error) {
            return {
                valid: false,
                reason: `Erro na validação: ${error.message}`
            };
        }
    }

    /**
     * 📤 EXECUTAR ORDEM EM UMA EXCHANGE ESPECÍFICA
     */
    async executeOrderOnExchange(keyData, signalData, orderParams, signalId, userId) {
        const result = {
            success: false,
            exchange: keyData.exchange,
            environment: keyData.environment,
            order_id: null,
            error: null,
            timestamp: new Date().toISOString()
        };

        try {
            // Configurar conexão CCXT
            const exchange = this.createExchangeInstance(keyData);
            
            if (!this.tradingConfig.real_trading_enabled) {
                // MODO SIMULAÇÃO
                result.success = true;
                result.order_id = `SIM_${Date.now()}`;
                result.simulation = true;
                
                // Salvar simulação no banco
                await this.saveOrderExecution(userId, signalId, keyData.exchange, keyData.environment, {
                    id: result.order_id,
                    symbol: orderParams.symbol,
                    side: orderParams.side.toLowerCase(),
                    amount: orderParams.amount,
                    price: 0,
                    status: 'SIMULATION'
                });

                return result;
            }

            // MODO REAL - EXECUTAR ORDEM REAL
            console.log(`        📤 Enviando ordem real para ${keyData.exchange} ${keyData.environment}...`);
            
            const order = await exchange.createMarketOrder(
                orderParams.symbol,
                orderParams.side.toLowerCase(),
                orderParams.amount
            );

            result.success = true;
            result.order_id = order.id;
            result.symbol = order.symbol;
            result.side = order.side;
            result.amount = order.amount;
            result.price = order.price || 'MARKET';

            // Salvar execução no banco
            await this.saveOrderExecution(userId, signalId, keyData.exchange, keyData.environment, order);

            console.log(`        ✅ Ordem executada: ${order.id}`);
            
        } catch (error) {
            result.success = false;
            result.error = error.message;
            
            // Salvar erro no banco
            await this.saveOrderError(userId, signalId, keyData.exchange, keyData.environment, error.message);
            
            console.log(`        ❌ Erro na execução: ${error.message}`);
        }

        return result;
    }

    /**
     * 🔧 CRIAR INSTÂNCIA DA EXCHANGE
     */
    createExchangeInstance(keyData) {
        const exchangeConfig = {
            apiKey: keyData.api_key,
            secret: keyData.secret_key,
            enableRateLimit: true,
            timeout: 30000
        };

        if (keyData.exchange === 'bybit') {
            return new ccxt.bybit({
                ...exchangeConfig,
                sandbox: keyData.environment === 'testnet',
                options: {
                    defaultType: 'linear'
                }
            });
        } else if (keyData.exchange === 'binance') {
            return new ccxt.binance({
                ...exchangeConfig,
                sandbox: keyData.environment === 'testnet',
                options: {
                    defaultType: 'future'
                }
            });
        }

        throw new Error(`Exchange ${keyData.exchange} não suportada`);
    }

    /**
     * 💾 SALVAR SINAL NO BANCO
     */
    async saveSignalToDatabase(signalData) {
        try {
            const query = `
                INSERT INTO signals (
                    symbol, action, price, leverage, signal_type,
                    raw_data, processed_at, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `;

            const values = [
                signalData.symbol || 'UNKNOWN',
                signalData.action || signalData.signal || 'BUY',
                signalData.price || 0,
                signalData.leverage || 1,
                'REAL_EXECUTION',
                JSON.stringify(signalData),
                new Date(),
                'PROCESSING'
            ];

            const result = await this.pool.query(query, values);
            return result.rows[0].id;

        } catch (error) {
            console.error('❌ Erro ao salvar sinal:', error.message);
            return null;
        }
    }

    /**
     * 💾 SALVAR EXECUÇÃO DE ORDEM
     */
    async saveOrderExecution(userId, signalId, exchange, environment, order) {
        try {
            await this.pool.query(`
                INSERT INTO trading_executions (
                    user_id, signal_id, exchange, environment, order_id, 
                    symbol, side, amount, price, status, executed_at, raw_response
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                userId,
                signalId,
                exchange,
                environment,
                order.id,
                order.symbol,
                order.side,
                order.amount,
                order.price || 0,
                order.status || 'SUCCESS',
                new Date(),
                JSON.stringify(order)
            ]);

        } catch (error) {
            console.error('❌ Erro ao salvar execução:', error.message);
        }
    }

    /**
     * ⚠️ SALVAR ERRO DE EXECUÇÃO
     */
    async saveOrderError(userId, signalId, exchange, environment, errorMessage) {
        try {
            await this.pool.query(`
                INSERT INTO trading_executions (
                    user_id, signal_id, exchange, environment, status, 
                    error_message, executed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                userId,
                signalId,
                exchange,
                environment,
                'ERROR',
                errorMessage,
                new Date()
            ]);

        } catch (error) {
            console.error('❌ Erro ao salvar erro:', error.message);
        }
    }

    /**
     * 📊 OBTER ESTATÍSTICAS EM TEMPO REAL
     */
    getStats() {
        return {
            ...this.stats,
            config: this.tradingConfig,
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 🧪 TESTAR SISTEMA COMPLETO
     */
    async testCompleteSystem() {
        console.log('\n🧪 TESTANDO SISTEMA COMPLETO...');
        console.log('===============================');

        const testSignal = {
            symbol: 'BTCUSDT',
            action: 'BUY',
            price: 45000,
            quantity: 0.001,
            leverage: 1,
            stopLoss: 44000,
            takeProfit: 46000,
            timestamp: new Date().toISOString()
        };

        console.log('📊 Sinal de teste:', testSignal);

        try {
            const result = await this.processSignalAndExecute(testSignal);
            console.log('\n✅ TESTE COMPLETO FINALIZADO');
            return result;
        } catch (error) {
            console.error('\n❌ ERRO NO TESTE:', error);
            throw error;
        }
    }

    /**
     * 📊 PROCESSAR RESULTADOS DOS USUÁRIOS POR TIPO
     */
    processUserResults(results, executionResult, userType) {
        console.log(`\n📊 Processando resultados ${userType.toUpperCase()}:`);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                executionResult.successful_users++;
                console.log(`✅ Usuário ${index + 1} (${userType}): Sucesso`);
            } else {
                executionResult.failed_users++;
                console.log(`❌ Usuário ${index + 1} (${userType}): Falha - ${result.reason}`);
            }
        });
        
        console.log(`🎯 ${userType.toUpperCase()} - Sucessos: ${results.filter(r => r.status === 'fulfilled').length}`);
        console.log(`🎯 ${userType.toUpperCase()} - Falhas: ${results.filter(r => r.status === 'rejected').length}`);
    }

    /**
     * 🎯 OBTER STATUS DA FILA DE PRIORIDADES
     */
    getPriorityQueueStatus() {
        return this.priorityQueue.getQueueStatus();
    }

    /**
     * 🔄 REINICIAR SISTEMA DE PRIORIDADES
     */
    restartPrioritySystem() {
        this.priorityQueue.restartProcessing();
        console.log('🔄 Sistema de prioridades reiniciado');
    }
}

module.exports = RealTradingExecutor;

// Se executado diretamente
if (require.main === module) {
    console.log('🧪 EXECUTANDO TESTE DO SISTEMA...');
    const executor = new RealTradingExecutor();
    
    executor.testCompleteSystem()
        .then(results => {
            console.log('\n📋 RESULTADOS DO TESTE:');
            console.log('=======================');
            console.log(JSON.stringify(results, null, 2));
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ ERRO NO TESTE:', error);
            process.exit(1);
        });
}
