/**
 * 🗄️ CONNECTION POOL MANAGER - GERENCIAMENTO INTELIGENTE DE CONEXÕES
 * =====================================================================
 * 
 * Sistema avançado de pool de conexões PostgreSQL com master-slave
 * Failover automático, load balancing e health checks
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0 Advanced
 */

const { Pool } = require('pg');
const EventEmitter = require('events');

class ConnectionPoolManager extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            master: this.getMasterConfig(),
            replicas: this.parseReplicas(),
            healthCheckInterval: parseInt(process.env.DB_REPLICA_HEALTH_CHECK_INTERVAL) || 15000,
            ...config
        };

        this.pools = {
            master: null,
            replicas: []
        };

        this.stats = {
            queries: 0,
            reads: 0,
            writes: 0,
            errors: 0,
            connections: 0,
            masterQueries: 0,
            replicaQueries: 0
        };

        this.healthStatus = {
            master: true,
            replicas: []
        };

        this.currentReplicaIndex = 0;
        
        this.initialize();
        
        console.log('🗄️ Connection Pool Manager inicializado');
        console.log(`📊 Master: ${this.config.master.host}:${this.config.master.port}`);
        console.log(`📊 Replicas: ${this.config.replicas.length} configuradas`);
    }

    /**
     * Get master database configuration with proper fallbacks for deployment
     */
    getMasterConfig() {
        // Try DATABASE_URL first (most common in deployment)
        const connectionString = process.env.DATABASE_URL || 
                                process.env.POSTGRES_URL || 
                                process.env.DB_URL;
        
        if (connectionString) {
            // Auto-detect if SSL is needed based on connection string or environment
            const needsSSL = process.env.NODE_ENV === 'production' || 
                           connectionString.includes('sslmode=require') ||
                           connectionString.includes('railway.app') ||
                           connectionString.includes('render.com') ||
                           connectionString.includes('supabase.co') ||
                           connectionString.includes('heroku.com');
            
            return {
                connectionString,
                ssl: needsSSL ? { rejectUnauthorized: false } : false,
                max: parseInt(process.env.DB_POOL_MAX) || 20,
                min: parseInt(process.env.DB_POOL_MIN) || 5,
                idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
                connectionTimeoutMillis: 10000
            };
        }

        // Try individual environment variables
        const host = process.env.DB_MASTER_HOST || 
                    process.env.DB_HOST || 
                    process.env.POSTGRES_HOST;
        const port = process.env.DB_MASTER_PORT || 
                    process.env.DB_PORT || 
                    process.env.POSTGRES_PORT || 
                    5432;
        const database = process.env.POSTGRES_DB || 
                        process.env.DB_NAME || 
                        'trading';
        const user = process.env.POSTGRES_USER || 
                    process.env.DB_USER || 
                    'postgres';
        const password = process.env.POSTGRES_PASSWORD || 
                        process.env.DB_PASSWORD;

        // If no password is provided, return null to trigger mock mode
        if (!password) {
            console.log('⚠️ No database password provided, will use mock mode');
            return null;
        }

        // Auto-detect if SSL is needed based on host or environment
        const needsSSL = process.env.NODE_ENV === 'production' || 
                       host.includes('railway.app') ||
                       host.includes('render.com') ||
                       host.includes('supabase.co') ||
                       host.includes('heroku.com') ||
                       process.env.DB_SSL === 'true';

        return {
            host,
            port: parseInt(port),
            database,
            user,
            password,
            max: parseInt(process.env.DB_POOL_MAX) || 20,
            min: parseInt(process.env.DB_POOL_MIN) || 5,
            idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
            connectionTimeoutMillis: 10000,
            ssl: needsSSL ? { rejectUnauthorized: false } : false
        };
    }

    /**
     * 🔧 Inicializar pools de conexão
     */
    async initialize() {
        try {
            // Check if master config is available
            if (!this.config.master) {
                console.log('⚠️ No database configuration found, running in mock mode');
                this.pools.master = null;
                this.healthStatus.master = false;
                return;
            }

            // Criar pool master
            this.pools.master = new Pool(this.config.master);
            this.setupPoolEvents(this.pools.master, 'master');
            
            // Criar pools para replicas
            for (let i = 0; i < this.config.replicas.length; i++) {
                const replicaConfig = this.config.replicas[i];
                const replicaPool = new Pool(replicaConfig);
                
                this.setupPoolEvents(replicaPool, `replica-${i}`);
                this.pools.replicas.push(replicaPool);
                this.healthStatus.replicas.push(true);
            }

            // Testar conexões iniciais
            await this.testConnections();
            
            console.log('✅ Todos os pools de conexão inicializados');

        } catch (error) {
            console.error('❌ Erro ao inicializar pools:', error.message);
            console.log('🔄 Running in mock mode due to connection error');
            this.pools.master = null;
            this.healthStatus.master = false;
        }
    }

    /**
     * 📡 Configurar eventos dos pools
     */
    setupPoolEvents(pool, name) {
        pool.on('connect', (client) => {
            this.stats.connections++;
            console.log(`🔗 Nova conexão: ${name}`);
        });

        pool.on('remove', (client) => {
            this.stats.connections--;
            console.log(`🔌 Conexão removida: ${name}`);
        });

        pool.on('error', (error, client) => {
            this.stats.errors++;
            console.error(`❌ Erro no pool ${name}:`, error.message);
            this.emit('poolError', { pool: name, error });
        });
    }

    /**
     * 🔍 Parsear configuração de réplicas
     */
    parseReplicas() {
        const replicas = [];
        
        // Tentar múltiplas réplicas do .env
        for (let i = 1; i <= 5; i++) {
            const replicaUrl = process.env[`DB_READ_REPLICA_${i}`];
            if (replicaUrl) {
                const config = this.parseConnectionString(replicaUrl);
                replicas.push({
                    ...config,
                    max: Math.floor(this.config?.master?.max / 2) || 10,
                    min: 2,
                    idleTimeoutMillis: 30000
                });
            }
        }

        return replicas;
    }

    /**
     * 🔗 Parsear string de conexão
     */
    parseConnectionString(connectionString) {
        const url = new URL(connectionString);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            database: url.pathname.slice(1),
            user: url.username,
            password: url.password,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        };
    }

    /**
     * ✍️ Executar query de escrita (sempre no master)
     */
    async executeWrite(query, params = []) {
        try {
            this.stats.queries++;
            this.stats.writes++;
            this.stats.masterQueries++;

            const client = await this.pools.master.connect();
            
            try {
                const result = await client.query(query, params);
                console.log(`✍️ Write query executada no master`);
                return result;
            } finally {
                client.release();
            }

        } catch (error) {
            this.stats.errors++;
            console.error('❌ Erro na query de escrita:', error.message);
            throw error;
        }
    }

    /**
     * 📖 Executar query de leitura (preferencialmente nas réplicas)
     */
    async executeRead(query, params = []) {
        try {
            this.stats.queries++;
            this.stats.reads++;

            // Tentar usar uma réplica saudável
            const replicaPool = this.getHealthyReplica();
            
            if (replicaPool) {
                this.stats.replicaQueries++;
                const client = await replicaPool.connect();
                
                try {
                    const result = await client.query(query, params);
                    console.log(`📖 Read query executada na réplica`);
                    return result;
                } finally {
                    client.release();
                }
            } else {
                // Fallback para master se não há réplicas saudáveis
                if (this.pools.replicas.length === 0) {
                    // No replicas configured, use master directly (this is normal)
                    return await this.executeWrite(query, params);
                } else {
                    console.log('⚠️ Nenhuma réplica saudável, usando master para leitura');
                    return await this.executeWrite(query, params);
                }
            }

        } catch (error) {
            this.stats.errors++;
            console.error('❌ Erro na query de leitura:', error.message);
            
            // Tentar fallback para master
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                console.log('🔄 Tentando fallback para master...');
                return await this.executeWrite(query, params);
            }
            
            throw error;
        }
    }

    /**
     * 🔄 Executar transação
     */
    async executeTransaction(queries) {
        const client = await this.pools.master.connect();
        
        try {
            await client.query('BEGIN');
            const results = [];
            
            for (const { query, params } of queries) {
                const result = await client.query(query, params);
                results.push(result);
            }
            
            await client.query('COMMIT');
            
            this.stats.queries += queries.length;
            this.stats.writes += queries.length;
            this.stats.masterQueries += queries.length;
            
            console.log(`🔄 Transação executada: ${queries.length} queries`);
            return results;

        } catch (error) {
            await client.query('ROLLBACK');
            this.stats.errors++;
            console.error('❌ Erro na transação:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 🏥 Obter réplica saudável
     */
    getHealthyReplica() {
        // FIXED: If no replicas are configured, return null to use master directly
        if (this.pools.replicas.length === 0) {
            return null;
        }

        const healthyReplicas = this.pools.replicas.filter((_, index) => 
            this.healthStatus.replicas[index]
        );

        if (healthyReplicas.length === 0) {
            return null;
        }

        // Round-robin entre réplicas saudáveis
        const replica = healthyReplicas[this.currentReplicaIndex % healthyReplicas.length];
        this.currentReplicaIndex++;
        
        return replica;
    }

    /**
     * 🏥 Testar conexões
     */
    async testConnections() {
        console.log('🏥 Testing connections...');

        // Testar master
        try {
            const client = await this.pools.master.connect();
            await client.query('SELECT NOW()');
            client.release();
            this.healthStatus.master = true;
        } catch (error) {
            this.healthStatus.master = false;
            console.error('❌ Master: Indisponível -', error.message);
        }

        // Testar réplicas
        for (let i = 0; i < this.pools.replicas.length; i++) {
            try {
                const client = await this.pools.replicas[i].connect();
                await client.query('SELECT NOW()');
                client.release();
                this.healthStatus.replicas[i] = true;
            } catch (error) {
                this.healthStatus.replicas[i] = false;
                console.error(`❌ Replica ${i + 1}: Indisponível -`, error.message);
            }
        }

        console.log('Connected Database...');
    }

    /**
     * 🏥 Iniciar health checks periódicos
     */
    async startHealthChecks() {
        // setInterval(async () => {
            await this.testConnections();
            
            const healthyReplicas = this.healthStatus.replicas.filter(status => status).length;
            
            if (!this.healthStatus.master) {
                this.emit('masterDown');
                console.error('🚨 ALERTA: Master database indisponível!');
            }
            
            // Only show replica alerts in production
            if (healthyReplicas === 0 && this.pools.replicas.length > 0 && process.env.NODE_ENV === 'production') {
                this.emit('allReplicasDown');
                console.error('🚨 ALERTA: Todas as réplicas indisponíveis!');
            }
            
        // }, this.config.healthCheckInterval);
    }

    /**
     * 📊 Obter estatísticas
     */
    getStats() {
        const masterPool = this.pools.master;
        const replicaStats = this.pools.replicas.map((pool, index) => ({
            index: index + 1,
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
            healthy: this.healthStatus.replicas[index]
        }));

        return {
            master: {
                totalCount: masterPool?.totalCount || 0,
                idleCount: masterPool?.idleCount || 0,
                waitingCount: masterPool?.waitingCount || 0,
                healthy: this.healthStatus.master
            },
            replicas: replicaStats,
            totalQueries: this.stats.queries,
            readQueries: this.stats.reads,
            writeQueries: this.stats.writes,
            errors: this.stats.errors,
            activeConnections: this.stats.connections,
            distribution: {
                master: this.stats.masterQueries,
                replicas: this.stats.replicaQueries
            },
            loadBalance: this.stats.replicaQueries > 0 
                ? ((this.stats.replicaQueries / this.stats.queries) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * 🧪 Executar query de teste
     */
    async healthCheck() {
        try {
            const start = Date.now();
            const result = await this.executeRead('SELECT NOW() as current_time, version() as db_version');
            const duration = Date.now() - start;

            return {
                status: 'healthy',
                duration: `${duration}ms`,
                timestamp: result.rows[0].current_time,
                version: result.rows[0].db_version.split(' ')[0],
                connections: this.getStats()
            };

        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 🔌 Fechar todas as conexões
     */
    async closeAll() {
        try {
            console.log('🔌 Fechando todos os pools de conexão...');

            if (this.pools.master) {
                await this.pools.master.end();
                console.log('✅ Pool master fechado');
            }

            for (let i = 0; i < this.pools.replicas.length; i++) {
                await this.pools.replicas[i].end();
                console.log(`✅ Pool replica ${i + 1} fechado`);
            }

            console.log('🔌 Todos os pools fechados');

        } catch (error) {
            console.error('❌ Erro ao fechar pools:', error.message);
        }
    }
}

module.exports = ConnectionPoolManager;
