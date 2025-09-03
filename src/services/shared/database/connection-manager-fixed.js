/**
 * 🗄️ DATABASE CONNECTION MANAGER - VERSÃO CORRIGIDA
 * Gerenciamento robusto de conexões de banco
 */

const { Pool } = require('pg');
const { createLogger } = require('../shared/utils/logger');

class DatabaseConnectionManager {
    constructor() {
        this.logger = createLogger('database-manager');
        this.pools = new Map();
        this.connectionConfigs = new Map();
        this.healthCheckInterval = null;
    }

    async initialize() {
        this.logger.info('Initializing database connections...');
        
        // Configurações de conexão
        await this.setupConnectionConfigs();
        
        // Criar pools de conexão
        await this.createConnectionPools();
        
        // Iniciar health checks
        await this.startHealthChecks();
        
        this.logger.info('Database connections initialized successfully');
    }

    async setupConnectionConfigs() {
        const configs = {
            main: {
                connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
                statement_timeout: 30000,
                query_timeout: 30000
            },
            cache: {
                connectionString: process.env.CACHE_DATABASE_URL || 'process.env.DATABASE_URL',
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000
            },
            analytics: {
                connectionString: process.env.ANALYTICS_DATABASE_URL || 'process.env.DATABASE_URL',
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                max: 5,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000
            }
        };

        for (const [name, config] of Object.entries(configs)) {
            this.connectionConfigs.set(name, config);
        }

        this.logger.info(`Setup ${this.connectionConfigs.size} database configurations`);
    }

    async createConnectionPools() {
        for (const [name, config] of this.connectionConfigs) {
            try {
                const pool = new Pool(config);
                
                // Configurar event handlers
                pool.on('error', (err) => {
                    this.logger.error(`Database pool error (${name}):`, err);
                });

                pool.on('connect', () => {
                    this.logger.debug(`New client connected to ${name} pool`);
                });

                pool.on('remove', () => {
                    this.logger.debug(`Client removed from ${name} pool`);
                });

                // Testar conexão
                const client = await pool.connect();
                await client.query('SELECT NOW()');
                client.release();

                this.pools.set(name, pool);
                this.logger.info(`Database pool '${name}' created and tested successfully`);

            } catch (error) {
                this.logger.error(`Failed to create database pool '${name}':`, error);
                throw error;
            }
        }
    }

    async startHealthChecks() {
        // Health check a cada 30 segundos
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthChecks();
        }, 30000);

        // Health check inicial
        await this.performHealthChecks();
        
        this.logger.info('Database health checks started');
    }

    async performHealthChecks() {
        for (const [name, pool] of this.pools) {
            try {
                const start = Date.now();
                const client = await pool.connect();
                
                await client.query('SELECT 1 as health_check');
                const responseTime = Date.now() - start;
                
                client.release();
                
                this.logger.debug(`Database '${name}' health check OK (${responseTime}ms)`);

            } catch (error) {
                this.logger.error(`Database '${name}' health check failed:`, error);
            }
        }
    }

    getPool(name = 'main') {
        const pool = this.pools.get(name);
        if (!pool) {
            throw new Error(`Database pool '${name}' not found`);
        }
        return pool;
    }

    async query(sql, params = [], poolName = 'main') {
        const pool = this.getPool(poolName);
        const start = Date.now();
        
        try {
            const result = await pool.query(sql, params);
            const duration = Date.now() - start;
            
            this.logger.debug(`Query executed in ${duration}ms`, { 
                sql: sql.substring(0, 100),
                rows: result.rows?.length || 0 
            });
            
            return result;

        } catch (error) {
            const duration = Date.now() - start;
            this.logger.error(`Query failed after ${duration}ms:`, { 
                sql: sql.substring(0, 100),
                error: error.message 
            });
            throw error;
        }
    }

    async transaction(callback, poolName = 'main') {
        const pool = this.getPool(poolName);
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getConnectionStats() {
        const stats = {};
        
        for (const [name, pool] of this.pools) {
            stats[name] = {
                totalCount: pool.totalCount,
                idleCount: pool.idleCount,
                waitingCount: pool.waitingCount
            };
        }
        
        return stats;
    }

    async close() {
        this.logger.info('Closing database connections...');
        
        // Parar health checks
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        // Fechar todos os pools
        for (const [name, pool] of this.pools) {
            try {
                await pool.end();
                this.logger.info(`Database pool '${name}' closed`);
            } catch (error) {
                this.logger.error(`Error closing database pool '${name}':`, error);
            }
        }
        
        this.pools.clear();
        this.logger.info('All database connections closed');
    }
}

module.exports = DatabaseConnectionManager;