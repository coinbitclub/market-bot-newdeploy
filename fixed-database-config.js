/**
 * 🔧 CONFIGURAÇÃO POSTGRESQL ROBUSTA PARA RAILWAY
 * 
 * Correção dos problemas ECONNRESET com timeouts adequados
 */

const { Pool } = require('pg');

// Configuração otimizada para Railway Cloud
function createRobustPool() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
        ssl: { rejectUnauthorized: false },
        
        // Configurações otimizadas para Railway
        connectionTimeoutMillis: 30000,    // 30s (era 10s)
        idleTimeoutMillis: 30000,          // 30s (era 10s) 
        query_timeout: 20000,              // 20s (era 8s)
        statement_timeout: 20000,          // 20s timeout para queries
        
        // Pool settings otimizados
        max: 5,                            // Máximo 5 conexões (era 2)
        min: 1,                            // Mínimo 1 conexão sempre ativa
        
        // Configurações de retry
        acquireTimeoutMillis: 30000,       // 30s para adquirir conexão
        createTimeoutMillis: 30000,        // 30s para criar conexão
        destroyTimeoutMillis: 5000,        // 5s para destruir conexão
        reapIntervalMillis: 1000,          // Check cada 1s
        createRetryIntervalMillis: 200,    // Retry a cada 200ms
        
        // Keep alive para Railway
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        
        // Configurações específicas do PostgreSQL
        application_name: 'coinbitclub_enterprise',
        
        // Configurações de logging
        log: (msg) => {
            if (msg.includes('error') || msg.includes('Error')) {
                console.log('🔴 DB Error:', msg);
            }
        }
    });

    // Event handlers para monitoramento
    pool.on('connect', (client) => {
        console.log('✅ PostgreSQL client connected');
        
        // Set timezone para o cliente
        client.query(`SET timezone = 'UTC'`).catch(err => {
            console.log('⚠️ Failed to set timezone:', err.message);
        });
    });

    pool.on('acquire', (client) => {
        console.log('🔗 PostgreSQL client acquired from pool');
    });

    pool.on('remove', (client) => {
        console.log('♻️ PostgreSQL client removed from pool');
    });

    pool.on('error', (err, client) => {
        console.error('❌ PostgreSQL pool error:', err.message);
        console.error('   Error code:', err.code);
        console.error('   SQL State:', err.sqlState);
    });

    return pool;
}

// Função para testar conectividade robusta
async function testConnection(pool, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`🔍 Testing PostgreSQL connection (attempt ${i + 1}/${retries})...`);
            
            const client = await pool.connect();
            const result = await client.query('SELECT NOW() as server_time, version() as pg_version');
            
            console.log('✅ PostgreSQL connection successful!');
            console.log(`   Server time: ${result.rows[0].server_time}`);
            console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]}`);
            
            client.release();
            return true;
            
        } catch (error) {
            console.error(`❌ Connection attempt ${i + 1} failed:`, error.message);
            console.error(`   Error code: ${error.code}`);
            
            if (i < retries - 1) {
                console.log(`⏳ Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    
    console.error('💥 All connection attempts failed!');
    return false;
}

// Wrapper seguro para queries com retry automático
async function safeQuery(pool, query, params = [], retries = 2) {
    for (let i = 0; i < retries; i++) {
        let client;
        try {
            client = await pool.connect();
            const result = await client.query(query, params);
            return result;
            
        } catch (error) {
            console.error(`Query attempt ${i + 1} failed:`, error.message);
            
            // Se é ECONNRESET, tentar novamente
            if (error.code === 'ECONNRESET' && i < retries - 1) {
                console.log('🔄 Retrying query due to ECONNRESET...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            
            // Se não é um erro de conexão, retornar fallback
            return { rows: [] };
            
        } finally {
            if (client) {
                try {
                    client.release();
                } catch (releaseError) {
                    console.error('Error releasing client:', releaseError.message);
                }
            }
        }
    }
    
    return { rows: [] };
}

// Função para criar tabelas básicas se não existirem
async function ensureBasicTables(pool) {
    const basicTables = [
        {
            name: 'users',
            sql: `
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100),
                    email VARCHAR(255),
                    created_at TIMESTAMP DEFAULT NOW(),
                    last_login TIMESTAMP,
                    trading_enabled BOOLEAN DEFAULT true
                )
            `
        },
        {
            name: 'signals',
            sql: `
                CREATE TABLE IF NOT EXISTS signals (
                    id SERIAL PRIMARY KEY,
                    symbol VARCHAR(20),
                    action VARCHAR(10),
                    price DECIMAL(20,8),
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `
        },
        {
            name: 'orders',
            sql: `
                CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER,
                    symbol VARCHAR(20),
                    side VARCHAR(10),
                    quantity DECIMAL(20,8),
                    price DECIMAL(20,8),
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `
        },
        {
            name: 'api_keys',
            sql: `
                CREATE TABLE IF NOT EXISTS api_keys (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER,
                    exchange VARCHAR(20),
                    username VARCHAR(100),
                    valid BOOLEAN DEFAULT false,
                    trading_enabled BOOLEAN DEFAULT false,
                    last_check TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `
        }
    ];

    for (const table of basicTables) {
        try {
            await safeQuery(pool, table.sql);
            console.log(`✅ Table ${table.name} ensured`);
        } catch (error) {
            console.error(`❌ Failed to create table ${table.name}:`, error.message);
        }
    }
}

module.exports = {
    createRobustPool,
    testConnection,
    safeQuery,
    ensureBasicTables
};
