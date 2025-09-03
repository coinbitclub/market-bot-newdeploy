const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function createFearGreedTable() {
    try {
        console.log('📊 Criando tabela fear_greed_index...');
        
        // Remover tabela se existir
        await pool.query(`DROP TABLE IF EXISTS fear_greed_index CASCADE`);
        
        // Criar tabela
        await pool.query(`
            CREATE TABLE fear_greed_index (
                id SERIAL PRIMARY KEY,
                value INTEGER NOT NULL,
                value_classification VARCHAR(50) NOT NULL,
                timestamp_unix BIGINT,
                time_until_update VARCHAR(50),
                source VARCHAR(50) DEFAULT 'alternative.me',
                collected_at TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        // Criar índices
        await pool.query(`CREATE INDEX idx_fear_greed_collected_at ON fear_greed_index(collected_at)`);
        await pool.query(`CREATE INDEX idx_fear_greed_value ON fear_greed_index(value)`);
        
        console.log('✅ Tabela fear_greed_index criada com sucesso');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

createFearGreedTable();
