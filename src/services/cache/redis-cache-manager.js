/**
 * 🔄 REDIS CACHE MANAGER - SISTEMA AVANÇADO DE CACHE
 * ===================================================
 * 
 * Sistema inteligente de cache multi-layer com TTL dinâmico
 * Otimizado para alta performance e baixa latência
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0 Advanced
 */

const Redis = require('ioredis');
const crypto = require('crypto');

class RedisCacheManager {
    constructor(options = {}) {
        this.isCluster = options.cluster || false;
        this.compression = options.compression || true;
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0
        };
        
        this.initializeRedis(options);
        this.setupEventHandlers();
        
        console.log('🔄 Redis Cache Manager inicializado');
        console.log(`📊 Modo: ${this.isCluster ? 'Cluster' : 'Standalone'}`);
    }

    /**
     * 🔧 Inicializar conexão Redis
     */
    initializeRedis(options) {
        const config = {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: process.env.REDIS_DB || 0,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            keepAlive: 30000,
            commandTimeout: 5000,
            ...options
        };

        if (this.isCluster) {
            const nodes = process.env.REDIS_CLUSTER_NODES?.split(',') || [
                { host: 'redis-1', port: 6379 },
                { host: 'redis-2', port: 6379 },
                { host: 'redis-3', port: 6379 }
            ];
            
            this.redis = new Redis.Cluster(nodes, {
                redisOptions: config,
                enableOfflineQueue: false,
                maxRedirections: 16,
                retryDelayOnFailover: 100
            });
        } else {
            this.redis = new Redis(config);
        }
    }

    /**
     * 📡 Configurar event handlers
     */
    setupEventHandlers() {
        this.redis.on('connect', () => {
            console.log('✅ Redis conectado com sucesso');
        });

        this.redis.on('error', (error) => {
            console.error('❌ Erro Redis:', error.message);
            this.metrics.errors++;
        });

        this.redis.on('close', () => {
            console.log('🔌 Conexão Redis fechada');
        });

        this.redis.on('ready', () => {
            console.log('🚀 Redis pronto para receber comandos');
        });
    }

    /**
     * 💾 Salvar no cache com TTL inteligente
     */
    async set(key, value, options = {}) {
        try {
            const {
                ttl = this.getIntelligentTTL(key),
                namespace = 'app',
                compress = this.compression,
                tags = []
            } = options;

            const fullKey = this.buildKey(namespace, key);
            const serializedValue = await this.serialize(value, compress);
            
            // Salvar com TTL
            if (ttl > 0) {
                await this.redis.setex(fullKey, ttl, serializedValue);
            } else {
                await this.redis.set(fullKey, serializedValue);
            }

            // Salvar tags para invalidação em grupo
            if (tags.length > 0) {
                await this.addToTags(fullKey, tags);
            }

            this.metrics.sets++;
            console.log(`💾 Cache set: ${key} (TTL: ${ttl}s)`);
            
            return true;

        } catch (error) {
            console.error('❌ Erro ao salvar cache:', error.message);
            this.metrics.errors++;
            return false;
        }
    }

    /**
     * 📖 Obter do cache
     */
    async get(key, namespace = 'app') {
        try {
            const fullKey = this.buildKey(namespace, key);
            const value = await this.redis.get(fullKey);
            
            if (value === null) {
                this.metrics.misses++;
                return null;
            }

            const deserializedValue = await this.deserialize(value);
            this.metrics.hits++;
            
            console.log(`📖 Cache hit: ${key}`);
            return deserializedValue;

        } catch (error) {
            console.error('❌ Erro ao obter cache:', error.message);
            this.metrics.errors++;
            this.metrics.misses++;
            return null;
        }
    }

    /**
     * 🗑️ Deletar do cache
     */
    async delete(key, namespace = 'app') {
        try {
            const fullKey = this.buildKey(namespace, key);
            const result = await this.redis.del(fullKey);
            
            this.metrics.deletes++;
            console.log(`🗑️ Cache deleted: ${key}`);
            
            return result > 0;

        } catch (error) {
            console.error('❌ Erro ao deletar cache:', error.message);
            this.metrics.errors++;
            return false;
        }
    }

    /**
     * 🏷️ Invalidar por tags
     */
    async invalidateByTags(tags) {
        try {
            const keys = [];
            
            for (const tag of tags) {
                const tagKey = `tags:${tag}`;
                const taggedKeys = await this.redis.smembers(tagKey);
                keys.push(...taggedKeys);
                
                // Remover a tag
                await this.redis.del(tagKey);
            }

            if (keys.length > 0) {
                await this.redis.del(...keys);
                console.log(`🏷️ Invalidados ${keys.length} items por tags:`, tags);
            }

            return keys.length;

        } catch (error) {
            console.error('❌ Erro ao invalidar por tags:', error.message);
            this.metrics.errors++;
            return 0;
        }
    }

    /**
     * 🧠 TTL inteligente baseado no tipo de dados
     */
    getIntelligentTTL(key) {
        const keyLower = key.toLowerCase();
        
        // Cotações: 30 segundos
        if (keyLower.includes('price') || keyLower.includes('quote')) {
            return 30;
        }
        
        // Análises de mercado: 5 minutos
        if (keyLower.includes('analysis') || keyLower.includes('signal')) {
            return 300;
        }
        
        // Dados de usuário: 1 hora
        if (keyLower.includes('user') || keyLower.includes('profile')) {
            return 3600;
        }
        
        // Configurações: 24 horas
        if (keyLower.includes('config') || keyLower.includes('setting')) {
            return 86400;
        }
        
        // Rate limiting: 1 minuto
        if (keyLower.includes('rate') || keyLower.includes('limit')) {
            return 60;
        }
        
        // Default: 15 minutos
        return 900;
    }

    /**
     * 🔑 Construir chave completa
     */
    buildKey(namespace, key) {
        const env = process.env.NODE_ENV || 'development';
        return `${env}:${namespace}:${key}`;
    }

    /**
     * 📦 Serializar dados
     */
    async serialize(data, compress = false) {
        const json = JSON.stringify(data);
        
        if (compress && json.length > 1000) {
            const zlib = require('zlib');
            const compressed = zlib.gzipSync(json);
            return `gzip:${compressed.toString('base64')}`;
        }
        
        return json;
    }

    /**
     * 📦 Deserializar dados
     */
    async deserialize(data) {
        if (data.startsWith('gzip:')) {
            const zlib = require('zlib');
            const compressed = Buffer.from(data.substring(5), 'base64');
            const decompressed = zlib.gunzipSync(compressed);
            return JSON.parse(decompressed.toString());
        }
        
        return JSON.parse(data);
    }

    /**
     * 🏷️ Adicionar chave às tags
     */
    async addToTags(key, tags) {
        const pipeline = this.redis.pipeline();
        
        for (const tag of tags) {
            const tagKey = `tags:${tag}`;
            pipeline.sadd(tagKey, key);
            pipeline.expire(tagKey, 86400); // Tags expiram em 24h
        }
        
        await pipeline.exec();
    }

    /**
     * 📊 Cache para cotações de mercado
     */
    async cacheQuote(symbol, price, volume) {
        const key = `quote:${symbol}`;
        const data = {
            symbol,
            price: parseFloat(price),
            volume: parseFloat(volume),
            timestamp: Date.now()
        };
        
        return await this.set(key, data, {
            ttl: 30,
            namespace: 'market',
            tags: ['quotes', symbol, 'market_data']
        });
    }

    /**
     * 📈 Cache para análises de IA
     */
    async cacheAnalysis(symbol, analysis) {
        const key = `analysis:${symbol}:${Date.now()}`;
        
        return await this.set(key, analysis, {
            ttl: 300,
            namespace: 'ai',
            tags: ['analysis', symbol, 'ai_data'],
            compress: true
        });
    }

    /**
     * 👤 Cache para sessões de usuário
     */
    async cacheUserSession(userId, sessionData) {
        const key = `session:${userId}`;
        
        return await this.set(key, sessionData, {
            ttl: 3600,
            namespace: 'auth',
            tags: ['sessions', `user:${userId}`]
        });
    }

    /**
     * ⚡ Rate limiting por usuário
     */
    async checkRateLimit(userId, action, limit = 100, window = 3600) {
        const key = `rate:${userId}:${action}`;
        
        try {
            const current = await this.redis.incr(key);
            
            if (current === 1) {
                await this.redis.expire(key, window);
            }
            
            return {
                allowed: current <= limit,
                count: current,
                limit: limit,
                reset: window
            };

        } catch (error) {
            console.error('❌ Erro no rate limiting:', error.message);
            return { allowed: true, count: 0, limit: limit, reset: window };
        }
    }

    /**
     * 📊 Estatísticas do cache
     */
    async getStats() {
        try {
            const info = await this.redis.info('memory');
            const dbInfo = await this.redis.info('keyspace');
            
            const memoryMatch = info.match(/used_memory_human:(.+)/);
            const keysMatch = dbInfo.match(/keys=(\d+)/);
            
            return {
                memory_used: memoryMatch ? memoryMatch[1].trim() : 'Unknown',
                total_keys: keysMatch ? parseInt(keysMatch[1]) : 0,
                hits: this.metrics.hits,
                misses: this.metrics.misses,
                hit_rate: this.metrics.hits + this.metrics.misses > 0 
                    ? ((this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100).toFixed(2) + '%'
                    : '0%',
                operations: {
                    sets: this.metrics.sets,
                    deletes: this.metrics.deletes,
                    errors: this.metrics.errors
                },
                status: 'healthy'
            };

        } catch (error) {
            console.error('❌ Erro ao obter stats:', error.message);
            return {
                status: 'error',
                error: error.message,
                ...this.metrics
            };
        }
    }

    /**
     * 🧹 Limpeza de cache expirado
     */
    async cleanup() {
        try {
            console.log('🧹 Iniciando limpeza de cache...');
            
            // Cleanup de tags órfãs
            const tagKeys = await this.redis.keys('tags:*');
            let cleaned = 0;
            
            for (const tagKey of tagKeys) {
                const members = await this.redis.smembers(tagKey);
                const validMembers = [];
                
                for (const member of members) {
                    const exists = await this.redis.exists(member);
                    if (exists) {
                        validMembers.push(member);
                    } else {
                        cleaned++;
                    }
                }
                
                if (validMembers.length === 0) {
                    await this.redis.del(tagKey);
                } else if (validMembers.length < members.length) {
                    await this.redis.del(tagKey);
                    if (validMembers.length > 0) {
                        await this.redis.sadd(tagKey, ...validMembers);
                    }
                }
            }
            
            console.log(`🧹 Limpeza concluída: ${cleaned} referências removidas`);
            return cleaned;

        } catch (error) {
            console.error('❌ Erro na limpeza:', error.message);
            return 0;
        }
    }

    /**
     * 🔌 Fechar conexão
     */
    async disconnect() {
        try {
            await this.redis.quit();
            console.log('🔌 Redis desconectado');
        } catch (error) {
            console.error('❌ Erro ao desconectar Redis:', error.message);
        }
    }
}

module.exports = RedisCacheManager;
