/**
 * ⚡ PERFORMANCE OPTIMIZER
 * Otimizações para melhorar performance do sistema
 */

const { createLogger } = require('../../shared/utils/logger');

class PerformanceOptimizer {
    constructor() {
        this.logger = createLogger('performance-optimizer');
        this.cache = new Map();
        this.requestPool = new Map();
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            pooledRequests: 0,
            optimizedQueries: 0
        };
    }

    // Cache com TTL
    setCache(key, value, ttl = 300000) { // 5 minutes default
        const expiresAt = Date.now() + ttl;
        this.cache.set(key, { value, expiresAt });
        this.logger.debug(`Cache set: ${key}`);
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) {
            this.metrics.cacheMisses++;
            return null;
        }

        if (Date.now() > cached.expiresAt) {
            this.cache.delete(key);
            this.metrics.cacheMisses++;
            return null;
        }

        this.metrics.cacheHits++;
        return cached.value;
    }

    // Request pooling para evitar requests duplicadas
    async pooledRequest(key, requestFunction, ttl = 60000) {
        // Verificar se já existe request em andamento
        if (this.requestPool.has(key)) {
            this.metrics.pooledRequests++;
            return await this.requestPool.get(key);
        }

        // Verificar cache primeiro
        const cached = this.getCache(key);
        if (cached !== null) {
            return cached;
        }

        // Executar request e poolear
        const requestPromise = requestFunction().then(result => {
            this.setCache(key, result, ttl);
            this.requestPool.delete(key);
            return result;
        }).catch(error => {
            this.requestPool.delete(key);
            throw error;
        });

        this.requestPool.set(key, requestPromise);
        return await requestPromise;
    }

    // Batching de queries para banco
    async batchDatabaseQueries(queries, batchSize = 10) {
        const results = [];
        
        for (let i = 0; i < queries.length; i += batchSize) {
            const batch = queries.slice(i, i + batchSize);
            const batchPromises = batch.map(query => query.execute());
            
            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                this.metrics.optimizedQueries += batch.length;
            } catch (error) {
                this.logger.error(`Batch query failed:`, error);
                throw error;
            }
        }
        
        return results;
    }

    // Throttling para APIs externas
    createThrottledFunction(func, limit = 10, window = 60000) {
        const calls = [];
        
        return async (...args) => {
            const now = Date.now();
            
            // Remover calls antigas
            while (calls.length > 0 && calls[0] < now - window) {
                calls.shift();
            }
            
            // Verificar limite
            if (calls.length >= limit) {
                const waitTime = calls[0] + window - now + 1000;
                this.logger.warn(`Rate limit reached, waiting ${waitTime}ms`);
                await this.sleep(waitTime);
                return this.createThrottledFunction(func, limit, window)(...args);
            }
            
            calls.push(now);
            return await func(...args);
        };
    }

    // Otimização de memory usage
    optimizeMemoryUsage() {
        // Limpar cache expirado
        const now = Date.now();
        for (const [key, cached] of this.cache) {
            if (now > cached.expiresAt) {
                this.cache.delete(key);
            }
        }

        // Forçar garbage collection se disponível
        if (global.gc) {
            global.gc();
            this.logger.debug('Garbage collection triggered');
        }
    }

    // CPU optimization - processamento assíncrono
    async processConcurrently(items, processor, concurrency = 5) {
        const results = [];
        
        for (let i = 0; i < items.length; i += concurrency) {
            const batch = items.slice(i, i + concurrency);
            const batchPromises = batch.map(item => processor(item));
            
            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            } catch (error) {
                this.logger.error(`Concurrent processing failed:`, error);
                throw error;
            }
        }
        
        return results;
    }

    // Network optimization - connection pooling
    createConnectionPool(maxConnections = 20) {
        const pool = {
            active: new Set(),
            waiting: [],
            maxConnections
        };

        return {
            async acquire() {
                if (pool.active.size < pool.maxConnections) {
                    const connection = { id: Date.now() };
                    pool.active.add(connection);
                    return connection;
                }

                return new Promise((resolve) => {
                    pool.waiting.push(resolve);
                });
            },

            release(connection) {
                pool.active.delete(connection);
                
                if (pool.waiting.length > 0) {
                    const next = pool.waiting.shift();
                    const newConnection = { id: Date.now() };
                    pool.active.add(newConnection);
                    next(newConnection);
                }
            },

            getStats() {
                return {
                    active: pool.active.size,
                    waiting: pool.waiting.length,
                    total: pool.active.size + pool.waiting.length
                };
            }
        };
    }

    // Metrics para monitoramento
    getPerformanceMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            activeRequests: this.requestPool.size,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100 || 0
        };
    }

    // Cleanup periódico
    startPeriodicCleanup(interval = 300000) { // 5 minutes
        setInterval(() => {
            this.optimizeMemoryUsage();
        }, interval);
        
        this.logger.info(`Periodic cleanup started (interval: ${interval}ms)`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = PerformanceOptimizer;