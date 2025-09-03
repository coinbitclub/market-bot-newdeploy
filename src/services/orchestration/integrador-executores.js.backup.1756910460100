#!/usr/bin/env node

/**
 * 🔗 INTEGRADOR AUTOMÁTICO - EXECUTORES <-> VALIDAÇÃO
 * ===================================================
 * 
 * Sistema que garante que os executores se conectem automaticamente
 * às contas validadas, sem falhas ou furos de segurança
 * 
 * ESPECIALISTA: INTEGRAÇÃO TOTAL AUTOMÁTICA
 */

const SistemaValidacaoAutomatica = require('./sistema-validacao-automatica');
const EventEmitter = require('events');

class IntegradorExecutores extends EventEmitter {
    constructor() {
        super();
        this.sistemaValidacao = new SistemaValidacaoAutomatica();
        this.executoresAtivos = new Map();
        this.connectionPool = new Map();
        this.tradingEnabled = false;
        
        console.log('🔗 INTEGRADOR DE EXECUTORES INICIALIZADO');
        
        // Configurar eventos automáticos
        this.setupEventHandlers();
    }

    /**
     * 📡 CONFIGURAR MANIPULADORES DE EVENTOS
     */
    setupEventHandlers() {
        // Quando uma nova conexão é validada
        this.on('connectionValidated', (connectionInfo) => {
            this.onConnectionValidated(connectionInfo);
        });

        // Quando uma conexão falha
        this.on('connectionFailed', (connectionInfo) => {
            this.onConnectionFailed(connectionInfo);
        });

        // Quando o sistema precisa rebalancear
        this.on('rebalanceRequired', () => {
            this.rebalanceExecutors();
        });

        console.log('📡 Eventos configurados');
    }

    /**
     * ✅ QUANDO CONEXÃO É VALIDADA
     */
    async onConnectionValidated(connectionInfo) {
        const { userId, exchange, environment, balance } = connectionInfo;
        const executorKey = `${userId}_${exchange}_${environment}`;
        
        console.log(`✅ Nova conexão validada: ${executorKey}`);
        
        try {
            // Obter instância CCXT validada
            const exchangeInstance = this.sistemaValidacao.getValidatedConnection(userId, exchange, environment);
            
            if (!exchangeInstance) {
                console.error(`❌ Instância não encontrada para ${executorKey}`);
                return;
            }

            // Criar executor automaticamente
            const executor = await this.criarExecutorAutomatico(executorKey, exchangeInstance, connectionInfo);
            
            if (executor) {
                this.executoresAtivos.set(executorKey, executor);
                console.log(`🚀 Executor criado e ativo: ${executorKey}`);
                
                // Registrar na pool de conexões
                this.connectionPool.set(executorKey, {
                    ...connectionInfo,
                    instance: exchangeInstance,
                    executor: executor,
                    status: 'ACTIVE',
                    createdAt: new Date(),
                    lastActivity: new Date()
                });

                // Iniciar monitoramento do executor
                this.monitorarExecutor(executorKey);
            }

        } catch (error) {
            console.error(`❌ Erro ao criar executor para ${executorKey}: ${error.message}`);
        }
    }

    /**
     * 🏭 CRIAR EXECUTOR AUTOMÁTICO
     */
    async criarExecutorAutomatico(executorKey, exchangeInstance, connectionInfo) {
        try {
            const executor = {
                id: executorKey,
                exchange: connectionInfo.exchange,
                environment: connectionInfo.environment,
                userId: connectionInfo.userId,
                instance: exchangeInstance,
                status: 'INITIALIZED',
                balance: connectionInfo.balance,
                
                // Métodos do executor
                async executeTrade(symbol, side, amount, orderType = 'market') {
                    try {
                        console.log(`🧪 Executando trade: ${side} ${amount} ${symbol}`);
                        
                        if (orderType === 'market') {
                            const order = side === 'buy' 
                                ? await this.instance.createMarketBuyOrder(symbol, amount)
                                : await this.instance.createMarketSellOrder(symbol, amount);
                                
                            // Atualizar última atividade
                            const poolConnection = global.integradorExecutores.connectionPool.get(this.id);
                            if (poolConnection) {
                                poolConnection.lastActivity = new Date();
                            }
                            
                            return { success: true, order };
                        }
                        
                        throw new Error(`Tipo de ordem ${orderType} não suportado`);
                        
                    } catch (error) {
                        console.error(`❌ Erro no trade ${this.id}: ${error.message}`);
                        return { success: false, error: error.message };
                    }
                },
                
                async getBalance() {
                    try {
                        const balance = await this.instance.fetchBalance();
                        
                        // Atualizar cache
                        this.balance = balance;
                        const poolConnection = global.integradorExecutores.connectionPool.get(this.id);
                        if (poolConnection) {
                            poolConnection.lastActivity = new Date();
                            poolConnection.balance = balance;
                        }
                        
                        return balance;
                    } catch (error) {
                        console.error(`❌ Erro ao buscar saldo ${this.id}: ${error.message}`);
                        return null;
                    }
                },
                
                async isHealthy() {
                    try {
                        await this.instance.fetchTicker('BTC/USDT');
                        return true;
                    } catch (error) {
                        return false;
                    }
                }
            };

            executor.status = 'ACTIVE';
            return executor;

        } catch (error) {
            console.error(`❌ Erro ao criar executor: ${error.message}`);
            return null;
        }
    }

    /**
     * 👁️ MONITORAR EXECUTOR
     */
    monitorarExecutor(executorKey) {
        const interval = setInterval(async () => {
            const executor = this.executoresAtivos.get(executorKey);
            const poolConnection = this.connectionPool.get(executorKey);
            
            if (!executor || !poolConnection) {
                clearInterval(interval);
                return;
            }

            try {
                const isHealthy = await executor.isHealthy();
                
                if (!isHealthy) {
                    console.warn(`⚠️ Executor ${executorKey} não está saudável`);
                    
                    // Tentar reconectar
                    await this.reconectarExecutor(executorKey);
                } else {
                    poolConnection.status = 'HEALTHY';
                    poolConnection.lastActivity = new Date();
                }

            } catch (error) {
                console.error(`❌ Erro no monitoramento de ${executorKey}: ${error.message}`);
            }
            
        }, 60000); // Verificar a cada minuto

        console.log(`👁️ Monitoramento iniciado para ${executorKey}`);
    }

    /**
     * 🔄 RECONECTAR EXECUTOR
     */
    async reconectarExecutor(executorKey) {
        console.log(`🔄 Tentando reconectar executor: ${executorKey}`);
        
        try {
            // Remover executor atual
            this.executoresAtivos.delete(executorKey);
            
            // Buscar dados da conexão
            const poolConnection = this.connectionPool.get(executorKey);
            if (!poolConnection) {
                throw new Error('Dados da conexão não encontrados');
            }

            // Revalidar conexão
            const connectionInfo = {
                userId: poolConnection.userId,
                exchange: poolConnection.exchange,
                environment: poolConnection.environment
            };

            // Solicitar revalidação
            this.emit('connectionFailed', connectionInfo);
            
        } catch (error) {
            console.error(`❌ Erro na reconexão de ${executorKey}: ${error.message}`);
        }
    }

    /**
     * ❌ QUANDO CONEXÃO FALHA
     */
    async onConnectionFailed(connectionInfo) {
        const { userId, exchange, environment } = connectionInfo;
        const executorKey = `${userId}_${exchange}_${environment}`;
        
        console.log(`❌ Conexão falhou: ${executorKey}`);
        
        // Remover executor ativo
        this.executoresAtivos.delete(executorKey);
        
        // Marcar como falhada na pool
        const poolConnection = this.connectionPool.get(executorKey);
        if (poolConnection) {
            poolConnection.status = 'FAILED';
            poolConnection.lastActivity = new Date();
        }

        // Tentar revalidar em 30 segundos
        setTimeout(async () => {
            console.log(`🔄 Tentando revalidar ${executorKey}...`);
            
            try {
                const result = await this.sistemaValidacao.validarChaveIndividual({
                    user_id: userId,
                    exchange,
                    environment,
                    // Outros campos necessários...
                });

                if (result.success) {
                    this.emit('connectionValidated', {
                        userId,
                        exchange,
                        environment,
                        balance: result.balance
                    });
                }
            } catch (error) {
                console.error(`❌ Erro na revalidação de ${executorKey}: ${error.message}`);
            }
        }, 30000);
    }

    /**
     * ⚖️ REBALANCEAR EXECUTORES
     */
    async rebalanceExecutors() {
        console.log('⚖️ Rebalanceando executores...');
        
        // Verificar executores inativos
        for (const [key, connection] of this.connectionPool) {
            const timeSinceActivity = Date.now() - connection.lastActivity.getTime();
            
            if (timeSinceActivity > 10 * 60 * 1000) { // 10 minutos sem atividade
                console.log(`🔄 Reativando executor inativo: ${key}`);
                await this.reconectarExecutor(key);
            }
        }
    }

    /**
     * 🎯 OBTER EXECUTOR PARA TRADING
     */
    getExecutorForTrading(userId, exchange, environment) {
        const executorKey = `${userId}_${exchange}_${environment}`;
        const executor = this.executoresAtivos.get(executorKey);
        
        if (!executor) {
            console.warn(`⚠️ Executor não encontrado: ${executorKey}`);
            return null;
        }

        if (executor.status !== 'ACTIVE') {
            console.warn(`⚠️ Executor não está ativo: ${executorKey} (status: ${executor.status})`);
            return null;
        }

        return executor;
    }

    /**
     * 📊 OBTER STATUS GERAL
     */
    getSystemStatus() {
        const activeExecutors = Array.from(this.executoresAtivos.values()).filter(e => e.status === 'ACTIVE');
        const totalConnections = this.connectionPool.size;
        
        return {
            tradingEnabled: this.tradingEnabled,
            activeExecutors: activeExecutors.length,
            totalConnections: totalConnections,
            healthyConnections: Array.from(this.connectionPool.values()).filter(c => c.status === 'HEALTHY').length,
            failedConnections: Array.from(this.connectionPool.values()).filter(c => c.status === 'FAILED').length,
            executorDetails: Array.from(this.executoresAtivos.entries()).map(([key, executor]) => ({
                key,
                exchange: executor.exchange,
                environment: executor.environment,
                status: executor.status,
                balance: executor.balance
            }))
        };
    }

    /**
     * 🚀 INICIALIZAR INTEGRAÇÃO COMPLETA
     */
    async inicializarIntegracao() {
        console.log('🚀 INICIALIZANDO INTEGRAÇÃO COMPLETA');
        
        try {
            // Registrar globalmente
            global.integradorExecutores = this;
            
            // Inicializar sistema de validação
            await this.sistemaValidacao.inicializarSistemaCompleto();
            
            // Aguardar validação inicial
            setTimeout(() => {
                // Conectar a todas as conexões validadas
                for (const [keyId, connection] of this.sistemaValidacao.validatedConnections) {
                    const [userId, exchange, environment] = keyId.split('_');
                    
                    this.emit('connectionValidated', {
                        userId: parseInt(userId),
                        exchange,
                        environment,
                        balance: connection.balance
                    });
                }

                // Habilitar trading
                this.tradingEnabled = true;
                console.log('✅ Trading habilitado - todos os executores conectados');
                
            }, 5000); // 5 segundos após validação inicial

            // Configurar rebalanceamento automático
            setInterval(() => {
                this.emit('rebalanceRequired');
            }, 5 * 60 * 1000); // A cada 5 minutos

            console.log('🎉 INTEGRAÇÃO COMPLETA ATIVA');
            return true;

        } catch (error) {
            console.error('❌ Erro na inicialização da integração:', error.message);
            return false;
        }
    }
}

module.exports = IntegradorExecutores;

// Executar se chamado diretamente
if (require.main === module) {
    const integrador = new IntegradorExecutores();
    integrador.inicializarIntegracao();
}
