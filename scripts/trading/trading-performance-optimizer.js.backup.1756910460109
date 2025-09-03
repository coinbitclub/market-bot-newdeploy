/**
 * 🚀 TRADING PERFORMANCE OPTIMIZER - ENTERPRISE
 * =============================================
 * 
 * Sistema de otimização de performance para operações de trading,
 * incluindo connection pooling, request batching, rate limiting
 * e roteamento inteligente.
 */

const EventEmitter = require('events');
const { Pool } = require('pg');

class TradingPerformanceOptimizer extends EventEmitter {
    constructor() {
        super();
        
        this.connectionPools = new Map();
        this.requestQueues = new Map();
        this.rateLimiters = new Map();
        this.performanceMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            avgLatency: 0,
            requestsPerSecond: 0,
            errorRate: 0,
            cacheHitRate: 0
        };
        
        this.cache = new Map();
        this.cacheConfig = {
            balances: { ttl: 60000 }, // 1 minuto
            positions: { ttl: 30000 }, // 30 segundos
            prices: { ttl: 5000 },     // 5 segundos
            userConfig: { ttl: 300000 } // 5 minutos
        };
        
        this.batchConfig = {
            maxBatchSize: 10,
            batchTimeout: 1000, // 1 segundo
            enableBatching: true
        };
        
        console.log('🚀 Trading Performance Optimizer inicializado');
        this.setupOptimizations();
    }

    /**
     * Configurações iniciais de otimização
     */
    setupOptimizations() {
        // Setup connection pools por exchange
        this.setupConnectionPools();
        
        // Setup rate limiters
        this.setupRateLimiters();
        
        // Iniciar limpeza de cache
        setInterval(() => this.cleanupCache(), 30000);
        
        // Coletar métricas de performance
        setInterval(() => this.collectPerformanceMetrics(), 60000);
        
        console.log('✅ Otimizações enterprise configuradas');
    }

    /**
     * Configura pools de conexão otimizados
     */
    setupConnectionPools() {
        const exchanges = ['binance', 'bybit'];
        
        exchanges.forEach(exchange => {
            const pool = {
                trading: new Pool({
                    connectionString: process.env.DATABASE_URL,
                    max: 20,        // máximo de conexões
                    min: 5,         // mínimo de conexões
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 5000,
                    ssl: { rejectUnauthorized: false }
                }),
                readonly: new Pool({
                    connectionString: process.env.DATABASE_URL,
                    max: 10,
                    min: 2,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 5000,
                    ssl: { rejectUnauthorized: false }
                })
            };
            
            this.connectionPools.set(exchange, pool);
        });
        
        console.log('✅ Connection pools configurados para exchanges');
    }

    /**
     * Configura rate limiters por exchange
     */
    setupRateLimiters() {
        const rateLimits = {
            binance: {
                requestsPerSecond: 10,
                requestsPerMinute: 1200,
                weightLimit: 6000
            },
            bybit: {
                requestsPerSecond: 50,
                requestsPerMinute: 3000,
                weightLimit: 10000
            }
        };
        
        Object.entries(rateLimits).forEach(([exchange, limits]) => {
            this.rateLimiters.set(exchange, {
                ...limits,
                currentRequests: 0,
                requestHistory: [],
                weightUsed: 0,
                lastReset: Date.now()
            });
        });
        
        console.log('✅ Rate limiters configurados');
    }

    /**
     * Otimiza execução de sinal de trading
     */
    async optimizeExecution(signal) {
        const startTime = Date.now();
        
        try {
            console.log(`🎯 Otimizando execução: ${signal.symbol} ${signal.side}`);
            
            // 1. Verificar cache primeiro
            const cachedData = await this.getCachedData(signal);
            
            // 2. Determinar roteamento otimizado
            const routing = await this.determineOptimalRouting(signal);
            
            // 3. Aplicar batching se possível
            const batchedOperations = await this.batchOperations(signal, routing);
            
            // 4. Executar com rate limiting
            const results = await this.executeWithRateLimit(batchedOperations);
            
            // 5. Atualizar cache
            await this.updateCache(signal, results);
            
            const executionTime = Date.now() - startTime;
            this.updatePerformanceMetrics(executionTime, true);
            
            console.log(`✅ Execução otimizada em ${executionTime}ms`);
            
            return {
                success: true,
                executionTime: executionTime,
                results: results,
                optimizations: {
                    cacheHit: !!cachedData,
                    batched: batchedOperations.length > 1,
                    routing: routing.strategy
                }
            };
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.updatePerformanceMetrics(executionTime, false);
            
            console.error('❌ Erro na otimização:', error.message);
            
            return {
                success: false,
                error: error.message,
                executionTime: executionTime
            };
        }
    }

    /**
     * Verifica dados em cache
     */
    async getCachedData(signal) {
        const cacheKey = `${signal.symbol}_${signal.side}_${signal.userId}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheConfig.positions.ttl) {
            console.log(`📊 Cache hit para ${cacheKey}`);
            this.performanceMetrics.cacheHitRate++;
            return cached.data;
        }
        
        return null;
    }

    /**
     * Determina roteamento otimizado
     */
    async determineOptimalRouting(signal) {
        const factors = {
            latency: await this.measureExchangeLatency(signal.exchange),
            liquidity: await this.checkLiquidity(signal.symbol, signal.exchange),
            spread: await this.getCurrentSpread(signal.symbol, signal.exchange),
            rateLimit: this.checkRateLimit(signal.exchange)
        };
        
        let strategy = 'direct';
        
        if (factors.latency > 500) {
            strategy = 'low-latency';
        } else if (!factors.rateLimit) {
            strategy = 'queued';
        } else if (factors.spread > 0.1) {
            strategy = 'smart-routing';
        }
        
        return {
            strategy: strategy,
            factors: factors,
            recommendedExchange: signal.exchange
        };
    }

    /**
     * Agrupa operações em batches
     */
    async batchOperations(signal, routing) {
        if (!this.batchConfig.enableBatching) {
            return [signal];
        }
        
        const queueKey = `${signal.exchange}_${signal.symbol}`;
        
        if (!this.requestQueues.has(queueKey)) {
            this.requestQueues.set(queueKey, []);
        }
        
        const queue = this.requestQueues.get(queueKey);
        queue.push(signal);
        
        // Se atingiu tamanho máximo do batch ou timeout
        if (queue.length >= this.batchConfig.maxBatchSize) {
            const batch = queue.splice(0, this.batchConfig.maxBatchSize);
            console.log(`📦 Batch criado: ${batch.length} operações`);
            return batch;
        }
        
        // Aguardar timeout para formar batch
        await new Promise(resolve => setTimeout(resolve, this.batchConfig.batchTimeout));
        
        const batch = queue.splice(0);
        return batch.length > 0 ? batch : [signal];
    }

    /**
     * Executa com rate limiting
     */
    async executeWithRateLimit(operations) {
        const results = [];
        
        for (const operation of operations) {
            const rateLimiter = this.rateLimiters.get(operation.exchange);
            
            if (!rateLimiter) {
                throw new Error(`Rate limiter não encontrado para ${operation.exchange}`);
            }
            
            // Verificar se pode executar
            if (!this.checkRateLimit(operation.exchange)) {
                console.log(`⏳ Aguardando rate limit: ${operation.exchange}`);
                await this.waitForRateLimit(operation.exchange);
            }
            
            // Executar operação
            const result = await this.executeOperation(operation);
            results.push(result);
            
            // Atualizar contadores de rate limit
            this.updateRateLimitCounters(operation.exchange);
        }
        
        return results;
    }

    /**
     * Verifica se está dentro do rate limit
     */
    checkRateLimit(exchange) {
        const limiter = this.rateLimiters.get(exchange);
        if (!limiter) return false;
        
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        const oneMinuteAgo = now - 60000;
        
        // Limpar histórico antigo
        limiter.requestHistory = limiter.requestHistory.filter(time => time > oneMinuteAgo);
        
        // Verificar limites
        const requestsLastSecond = limiter.requestHistory.filter(time => time > oneSecondAgo).length;
        const requestsLastMinute = limiter.requestHistory.length;
        
        return requestsLastSecond < limiter.requestsPerSecond && 
               requestsLastMinute < limiter.requestsPerMinute;
    }

    /**
     * Aguarda liberação do rate limit
     */
    async waitForRateLimit(exchange) {
        const limiter = this.rateLimiters.get(exchange);
        const waitTime = Math.ceil(1000 / limiter.requestsPerSecond);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    /**
     * Atualiza contadores de rate limit
     */
    updateRateLimitCounters(exchange) {
        const limiter = this.rateLimiters.get(exchange);
        if (limiter) {
            limiter.requestHistory.push(Date.now());
            limiter.currentRequests++;
        }
    }

    /**
     * Executa operação individual
     */
    async executeOperation(operation) {
        const startTime = Date.now();
        
        try {
            // Simular execução da operação
            // Aqui seria a integração real com a exchange
            
            const pool = this.connectionPools.get(operation.exchange);
            if (pool) {
                const client = await pool.trading.connect();
                
                try {
                    // Exemplo de operação no banco
                    const result = await client.query(
                        'INSERT INTO trading_operations (user_id, symbol, side, amount, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                        [operation.userId, operation.symbol, operation.side, operation.amount, 'executed']
                    );
                    
                    return {
                        success: true,
                        operationId: result.rows[0].id,
                        executionTime: Date.now() - startTime,
                        exchange: operation.exchange
                    };
                    
                } finally {
                    client.release();
                }
            }
            
            throw new Error('Pool de conexão não disponível');
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                executionTime: Date.now() - startTime,
                exchange: operation.exchange
            };
        }
    }

    /**
     * Atualiza cache com novos dados
     */
    async updateCache(signal, results) {
        const cacheKey = `${signal.symbol}_${signal.side}_${signal.userId}`;
        
        this.cache.set(cacheKey, {
            data: results,
            timestamp: Date.now(),
            ttl: this.cacheConfig.positions.ttl
        });
    }

    /**
     * Limpa cache expirado
     */
    cleanupCache() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cache limpo: ${cleaned} entradas removidas`);
        }
    }

    /**
     * Mede latência da exchange
     */
    async measureExchangeLatency(exchange) {
        const startTime = Date.now();
        
        try {
            // Ping simples para medir latência
            // Implementar chamadas reais para as exchanges
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            
            return Date.now() - startTime;
            
        } catch (error) {
            return 999; // Alta latência em caso de erro
        }
    }

    /**
     * Verifica liquidez do par
     */
    async checkLiquidity(symbol, exchange) {
        // Implementar verificação real de liquidez
        return Math.random() > 0.2; // 80% chance de boa liquidez
    }

    /**
     * Obtém spread atual
     */
    async getCurrentSpread(symbol, exchange) {
        // Implementar obtenção real de spread
        return Math.random() * 0.1; // Spread entre 0-0.1%
    }

    /**
     * Atualiza métricas de performance
     */
    updatePerformanceMetrics(executionTime, success) {
        this.performanceMetrics.totalRequests++;
        
        if (success) {
            this.performanceMetrics.successfulRequests++;
        }
        
        // Calcular latência média
        const alpha = 0.1; // Fator de suavização
        this.performanceMetrics.avgLatency = 
            (1 - alpha) * this.performanceMetrics.avgLatency + alpha * executionTime;
        
        // Calcular taxa de erro
        this.performanceMetrics.errorRate = 
            ((this.performanceMetrics.totalRequests - this.performanceMetrics.successfulRequests) / 
             this.performanceMetrics.totalRequests) * 100;
    }

    /**
     * Coleta métricas de performance
     */
    collectPerformanceMetrics() {
        const metrics = {
            ...this.performanceMetrics,
            cacheSize: this.cache.size,
            activeConnections: Array.from(this.connectionPools.values())
                .reduce((total, pool) => total + pool.trading.totalCount + pool.readonly.totalCount, 0),
            queueSizes: Array.from(this.requestQueues.entries())
                .map(([key, queue]) => ({ exchange: key, size: queue.length })),
            timestamp: new Date()
        };
        
        console.log('📊 Métricas de Performance:', JSON.stringify(metrics, null, 2));
        this.emit('performance-metrics', metrics);
        
        return metrics;
    }

    /**
     * Obtém métricas atuais
     */
    getCurrentMetrics() {
        return this.collectPerformanceMetrics();
    }

    /**
     * Fecha todas as conexões
     */
    async close() {
        console.log('🔌 Fechando Trading Performance Optimizer...');
        
        for (const [exchange, pools] of this.connectionPools.entries()) {
            await pools.trading.end();
            await pools.readonly.end();
            console.log(`✅ Pools fechados para ${exchange}`);
        }
        
        this.cache.clear();
        this.requestQueues.clear();
        
        console.log('✅ Trading Performance Optimizer fechado');
    }
}

module.exports = {
    TradingPerformanceOptimizer
};

// Auto-start se executado diretamente
if (require.main === module) {
    const optimizer = new TradingPerformanceOptimizer();
    
    // Teste básico
    const testSignal = {
        userId: 1,
        symbol: 'BTCUSDT',
        side: 'buy',
        amount: 100,
        exchange: 'bybit'
    };
    
    optimizer.optimizeExecution(testSignal)
        .then(result => {
            console.log('🎯 Teste de otimização:', result);
            return optimizer.getCurrentMetrics();
        })
        .then(metrics => {
            console.log('📊 Métricas finais:', metrics);
        })
        .catch(error => {
            console.error('❌ Erro no teste:', error.message);
        })
        .finally(() => {
            optimizer.close();
        });
}
