// SECURITY_VALIDATED: 2025-08-08T23:27:20.618Z
// Este arquivo foi verificado e tem credenciais protegidas

/**
 * 🔥 ENHANCED SIGNAL PROCESSOR WITH REAL EXECUTION - v3.0.0 EMERGENCY
 * ===================================================================
 * 
 * Sistema integrado de processamento e execução real de sinais
 * Suporte completo para operação simultânea TESTNET + MAINNET
 * Integração com emergency-exchange-connector
 */

const { Pool } = require('pg');
const ccxt = require('ccxt');
const EmergencyExchangeConnector = require('./emergency-exchange-connector.js');
const RealTradingExecutor = require('./real-trading-executor.js');
const PriorityQueueManager = require('./priority-queue-manager.js');

class EnhancedSignalProcessorWithExecution {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        // 🚨 SISTEMA DE EMERGÊNCIA INTEGRADO
        this.emergencyConnector = new EmergencyExchangeConnector();
        this.realExecutor = new RealTradingExecutor();
        
        // 🎯 SISTEMA DE PRIORIDADES INTEGRADO
        this.priorityQueue = new PriorityQueueManager();
        this.priorityQueue.on('operation_completed', (operation) => {
            console.log(`✅ Operação priorizada concluída: ${operation.id}`);
        });
        
        // Configurar exchanges com fallback
        this.exchanges = this.setupExchanges();
        
        console.log('🔥 Enhanced Signal Processor with EMERGENCY EXECUTION iniciado');
        console.log(`🔗 Trading Real: ${process.env.ENABLE_REAL_TRADING === 'true' ? 'ATIVADO' : 'SIMULAÇÃO'}`);
        console.log('🚨 Sistema de emergência para IP fixo: ATIVO');
        console.log('🎯 Sistema de priorização Management > Testnet: ATIVO');
    }

    setupExchanges() {
        const exchanges = {};
        
        try {
            // Bybit TESTNET com chaves reais - OPERAÇÕES REAIS DE TESTE
            if (process.env.BYBIT_API_KEY && process.env.BYBIT_API_SECRET) {
                exchanges.bybit = new ccxt.bybit({
                    apiKey: process.env.BYBIT_API_KEY,
                    secret: process.env.BYBIT_API_SECRET,
                    sandbox: true, // TESTNET para operações reais de teste
                    enableRateLimit: true,
                    options: {
                        defaultType: 'linear' // Para USDT Perpetual
                    }
                });
                console.log('✅ Bybit TESTNET configurado para operações reais');
            }

            // Binance TESTNET com chaves reais - OPERAÇÕES REAIS DE TESTE  
            if (process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET) {
                exchanges.binance = new ccxt.binance({
                    apiKey: process.env.BINANCE_API_KEY,
                    secret: process.env.BINANCE_API_SECRET,
                    sandbox: true, // TESTNET para operações reais de teste
                    enableRateLimit: true,
                    options: {
                        defaultType: 'future' // Para futures
                    }
                });
                console.log('✅ Binance TESTNET configurado para operações reais');
            }

        } catch (error) {
            console.error('❌ Erro ao configurar exchanges:', error.message);
        }

        return exchanges;
    }

    async processSignal(signalData) {
        console.log('🔄 Processando sinal com EMERGENCY EXECUTION:', signalData);

        try {
            // 1. Validar estrutura do sinal
            if (!signalData || typeof signalData !== 'object') {
                throw new Error('Dados do sinal inválidos');
            }

            // 2. Extrair informações do sinal
            const {
                symbol = 'BTCUSDT',
                action = 'BUY',
                price = 0,
                leverage = 1,
                quantity = 0.001,
                stopLoss = null,
                takeProfit = null,
                timestamp = new Date().toISOString(),
                user_id = null,
                user_config = null
            } = signalData;

            // 3. Registrar sinal no banco
            const signalId = await this.saveTradingSignal(signalData);

            // 🎯 4. ADICIONAR À FILA DE PRIORIDADES
            const operationId = await this.priorityQueue.addOperation({
                type: 'signal_processing',
                signal_data: signalData,
                user_id: user_id,
                user_config: user_config,
                created_at: Date.now(),
                processor: this,
                executor: this.realExecutor
            });

            console.log(`🎯 Sinal adicionado à fila de prioridades: ${operationId}`);

            // 🚨 5. EXECUTAR COM SISTEMA DE EMERGÊNCIA (para operações de alta prioridade)
            if (process.env.ENABLE_REAL_TRADING === 'true') {
                console.log('🔥 EXECUTANDO COM SISTEMA DE EMERGÊNCIA...');
                
                // Usar o novo executor real com suporte a IP fixo
                const executionResult = await this.realExecutor.processSignalAndExecute(signalData);
                
                // Se falhou, tentar com sistema de emergência
                if (executionResult.successful_users === 0) {
                    console.log('🚨 Tentando com Emergency Connector...');
                    const emergencyResult = await this.emergencyConnector.executeRealOrder(signalData);
                    
                    return {
                        id: signalId,
                        symbol,
                        action,
                        price,
                        leverage,
                        status: 'EXECUTED_EMERGENCY',
                        executionResult: executionResult,
                        emergencyResult: emergencyResult,
                        timestamp: new Date().toISOString()
                    };
                }

                return {
                    id: signalId,
                    symbol,
                    action,
                    price,
                    leverage,
                    status: 'EXECUTED_REAL',
                    executionResult: executionResult,
                    timestamp: new Date().toISOString()
                };
            } else {
                console.log('🔄 Modo simulação - operação NÃO executada');
                
                return {
                    id: signalId,
                    symbol,
                    action,
                    price,
                    leverage,
                    status: 'PROCESSED_SIMULATION',
                    timestamp: new Date().toISOString()
                };
            }

        } catch (error) {
            console.error('❌ Erro ao processar sinal:', error);
            await this.saveSignalError(signalData, error.message);
            throw error;
        }
    }

    async saveTradingSignal(signalData) {
        const query = `
            INSERT INTO signals (
                symbol, action, price, leverage, signal_type,
                raw_data, processed_at, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;

        const symbol = signalData.ticker || signalData.symbol || 'UNKNOWN';
        const action = signalData.signal || signalData.action || 'BUY';
        const price = signalData.close || signalData.price || 0;
        const leverage = signalData.leverage || 1;
        const signalType = this.determineSignalType(action, signalData);

        const values = [
            symbol,
            action,
            price,
            leverage,
            signalType,
            JSON.stringify(signalData),
            new Date(),
            'PROCESSED'
        ];

        const result = await this.pool.query(query, values);
        const signalId = result.rows[0]?.id;
        
        console.log('✅ Sinal salvo no banco com ID:', signalId);
        return signalId;
    }

    async executeRealOperation({signalId, symbol, action, price, leverage, quantity, stopLoss, takeProfit}) {
        console.log(`🔥 EXECUTANDO OPERAÇÃO REAL: ${action} ${quantity} ${symbol}`);
        
        const results = [];
        
        // Executar em todas as exchanges configuradas
        for (const [exchangeName, exchange] of Object.entries(this.exchanges)) {
            try {
                console.log(`📡 Executando em ${exchangeName.toUpperCase()}...`);
                
                // 1. Verificar saldo
                const balance = await exchange.fetchBalance();
                console.log(`💰 Saldo ${exchangeName}:`, balance.USDT?.free || 'N/A');
                
                // 2. Preparar parâmetros da ordem
                const orderParams = this.prepareOrderParams(exchangeName, {
                    symbol,
                    action,
                    quantity,
                    leverage,
                    stopLoss,
                    takeProfit
                });
                
                // 3. Executar ordem
                const order = await this.placeOrder(exchange, exchangeName, orderParams);
                
                // 4. Salvar resultado no banco
                await this.saveOrderExecution(signalId, exchangeName, order);
                
                results.push({
                    exchange: exchangeName,
                    status: 'SUCCESS',
                    orderId: order.id,
                    symbol: order.symbol,
                    amount: order.amount,
                    price: order.price
                });

                console.log(`✅ Ordem executada em ${exchangeName}: ${order.id}`);
                
            } catch (error) {
                console.error(`❌ Erro ao executar em ${exchangeName}:`, error.message);
                
                results.push({
                    exchange: exchangeName,
                    status: 'ERROR',
                    error: error.message
                });

                // Salvar erro no banco
                await this.saveOrderError(signalId, exchangeName, error.message);
            }
        }
        
        return results;
    }

    prepareOrderParams(exchangeName, {symbol, action, quantity, leverage, stopLoss, takeProfit}) {
        const side = action.toUpperCase() === 'BUY' ? 'buy' : 'sell';
        
        const baseParams = {
            symbol: symbol,
            type: 'market',
            side: side,
            amount: quantity
        };

        // Configurações específicas por exchange - simplificadas para TESTNET
        if (exchangeName === 'bybit') {
            return {
                ...baseParams,
                params: {
                    // Remover parâmetros problemáticos no TESTNET
                }
            };
        } else if (exchangeName === 'binance') {
            return {
                ...baseParams,
                params: {
                    // Remover parâmetros problemáticos no TESTNET  
                }
            };
        }

        return baseParams;
    }

    async placeOrder(exchange, exchangeName, orderParams) {
        console.log(`📤 Enviando ordem para ${exchangeName}:`, orderParams);
        
        // Executar ordem no mercado
        const order = await exchange.createOrder(
            orderParams.symbol,
            orderParams.type,
            orderParams.side,
            orderParams.amount,
            null, // price (null para market order)
            orderParams.params
        );

        console.log(`✅ Ordem criada:`, {
            id: order.id,
            symbol: order.symbol,
            side: order.side,
            amount: order.amount,
            status: order.status
        });

        return order;
    }

    async saveOrderExecution(signalId, exchange, order) {
        try {
            await this.pool.query(`
                INSERT INTO trading_executions (
                    signal_id, exchange, order_id, symbol, side, amount, 
                    price, status, executed_at, raw_response
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                signalId,
                exchange,
                order.id,
                order.symbol,
                order.side,
                order.amount,
                order.price,
                order.status,
                new Date(),
                JSON.stringify(order)
            ]);
            
            console.log(`✅ Execução salva no banco: ${exchange} - ${order.id}`);
            
        } catch (error) {
            console.error('❌ Erro ao salvar execução:', error.message);
        }
    }

    async saveOrderError(signalId, exchange, errorMessage) {
        try {
            await this.pool.query(`
                INSERT INTO trading_executions (
                    signal_id, exchange, status, error_message, executed_at
                ) VALUES ($1, $2, $3, $4, $5)
            `, [
                signalId,
                exchange,
                'ERROR',
                errorMessage,
                new Date()
            ]);
        } catch (error) {
            console.error('❌ Erro ao salvar erro de execução:', error.message);
        }
    }

    async saveSignalError(signalData, errorMessage) {
        try {
            await this.pool.query(`
                INSERT INTO signals (
                    symbol, action, signal_type, raw_data, processed_at, status, error_message
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                'ERROR',
                'FAILED',
                'ERRO_PROCESSAMENTO',
                JSON.stringify(signalData),
                new Date(),
                'ERROR',
                errorMessage
            ]);
        } catch (dbError) {
            console.error('❌ Erro ao registrar erro no banco:', dbError);
        }
    }

    async createSignalsTable() {
        try {
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS signals (
                    id SERIAL PRIMARY KEY,
                    symbol VARCHAR(20),
                    action VARCHAR(10),
                    price DECIMAL(15,8),
                    leverage INTEGER DEFAULT 1,
                    raw_data JSONB,
                    processed_at TIMESTAMP DEFAULT NOW(),
                    status VARCHAR(20) DEFAULT 'PENDING',
                    error_message TEXT
                )
            `);

            // Tabela para execuções
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS trading_executions (
                    id SERIAL PRIMARY KEY,
                    signal_id INTEGER REFERENCES signals(id),
                    exchange VARCHAR(20),
                    order_id VARCHAR(100),
                    symbol VARCHAR(20),
                    side VARCHAR(10),
                    amount DECIMAL(15,8),
                    price DECIMAL(15,8),
                    status VARCHAR(20),
                    error_message TEXT,
                    executed_at TIMESTAMP DEFAULT NOW(),
                    raw_response JSONB
                )
            `);

            console.log('✅ Tabelas de sinais e execuções verificadas');
            
        } catch (error) {
            console.error('❌ Erro ao criar tabelas:', error);
        }
    }

    async getRecentSignals(limit = 10) {
        try {
            const query = `
                SELECT 
                    s.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'exchange', te.exchange,
                                'order_id', te.order_id,
                                'status', te.status,
                                'executed_at', te.executed_at
                            )
                        ) FILTER (WHERE te.id IS NOT NULL), 
                        '[]'
                    ) as executions
                FROM signals s
                LEFT JOIN trading_executions te ON s.id = te.signal_id
                GROUP BY s.id
                ORDER BY s.processed_at DESC 
                LIMIT $1
            `;
            
            const result = await this.pool.query(query, [limit]);
            return result.rows;
            
        } catch (error) {
            console.error('❌ Erro ao buscar sinais:', error);
            return [];
        }
    }

    /**
     * 🎯 Determinar tipo do sinal baseado na ação e dados
     */
    determineSignalType(action, signalData) {
        // Mapear action para signal_type
        const actionToSignalType = {
            'BUY': 'SINAL_LONG',
            'SELL': 'SINAL_SHORT',
            'LONG': 'SINAL_LONG',
            'SHORT': 'SINAL_SHORT',
            'STRONG_BUY': 'SINAL_LONG_FORTE',
            'STRONG_SELL': 'SINAL_SHORT_FORTE'
        };

        // Se temos signal_type explícito nos dados, usar ele
        if (signalData.signal_type) {
            return signalData.signal_type;
        }

        // Mapear baseado na action
        return actionToSignalType[action?.toUpperCase()] || 'SINAL_LONG';
    }
}

module.exports = EnhancedSignalProcessorWithExecution;
