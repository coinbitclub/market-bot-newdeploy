// 🗄️ DATABASE CONNECTION - ENTERPRISE
// Conexão PostgreSQL Railway

const { Pool } = require('pg');

class DatabaseConnection {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            if (this.pool) {
                return this.pool;
            }

            const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
            
            if (!connectionString) {
                console.log('⚠️  Variável POSTGRES_URL não encontrada, usando modo simulação');
                return this.createMockConnection();
            }

            this.pool = new Pool({
                connectionString,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // Testar conexão
            const client = await this.pool.connect();
            console.log('✅ Conectado ao PostgreSQL Railway');
            client.release();
            
            this.isConnected = true;
            return this.pool;

        } catch (error) {
            console.error('❌ Erro ao conectar PostgreSQL:', error.message);
            console.log('🔄 Usando conexão simulada');
            return this.createMockConnection();
        }
    }

    createMockConnection() {
        console.log('🧪 Usando conexão PostgreSQL simulada');
        
        return {
            query: async (text, params) => {
                console.log(`📝 Query simulada: ${text.substring(0, 50)}...`);
                
                // Simular resultados básicos
                if (text.includes('SELECT')) {
                    return { rows: [], rowCount: 0 };
                } else if (text.includes('INSERT')) {
                    return { rows: [{ id: Date.now() }], rowCount: 1 };
                } else if (text.includes('UPDATE')) {
                    return { rows: [], rowCount: 1 };
                } else if (text.includes('DELETE')) {
                    return { rows: [], rowCount: 0 };
                }
                
                return { rows: [], rowCount: 0 };
            },
            connect: async () => ({
                query: this.query,
                release: () => console.log('🔄 Cliente simulado liberado')
            }),
            end: async () => console.log('🔚 Conexão simulada encerrada')
        };
    }

    async query(text, params = []) {
        const pool = await this.connect();
        return pool.query(text, params);
    }

    async getClient() {
        const pool = await this.connect();
        return pool.connect();
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.isConnected = false;
            console.log('🔚 Desconectado do PostgreSQL');
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            pool_total: this.pool?.totalCount || 0,
            pool_idle: this.pool?.idleCount || 0,
            pool_waiting: this.pool?.waitingCount || 0
        };
    }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

module.exports = dbConnection;
