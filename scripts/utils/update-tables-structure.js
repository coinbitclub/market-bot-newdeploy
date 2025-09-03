const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function updateTablesStructure() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Atualizando estrutura das tabelas...');
        
        await client.query('BEGIN');
        
        // 1. Recriar tabela top100_cryptocurrencies com estrutura correta
        console.log('📝 Recriando tabela top100_cryptocurrencies...');
        
        await client.query('DROP TABLE IF EXISTS top100_cryptocurrencies CASCADE');
        
        await client.query(`
            CREATE TABLE top100_cryptocurrencies (
                id SERIAL PRIMARY KEY,
                coin_id VARCHAR(100) UNIQUE NOT NULL,
                symbol VARCHAR(20),
                name VARCHAR(255),
                current_price DECIMAL(20, 8),
                market_cap BIGINT,
                market_cap_rank INTEGER,
                total_volume BIGINT,
                price_change_24h DECIMAL(20, 8),
                price_change_percentage_24h DECIMAL(10, 4),
                price_change_percentage_7d DECIMAL(10, 4),
                circulating_supply DECIMAL(30, 2),
                total_supply DECIMAL(30, 2),
                max_supply DECIMAL(30, 2),
                ath DECIMAL(20, 8),
                ath_date TIMESTAMP,
                atl DECIMAL(20, 8),
                atl_date TIMESTAMP,
                image_url TEXT,
                last_updated TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('✅ Tabela top100_cryptocurrencies recriada');
        
        // 2. Verificar se system_logs precisa de ajustes
        console.log('📝 Verificando tabela system_logs...');
        
        // Verificar se precisa criar índices
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component);
            CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
            CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
        `);
        
        console.log('✅ Índices criados para system_logs');
        
        // 3. Criar índices para top100_cryptocurrencies
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_top100_coin_id ON top100_cryptocurrencies(coin_id);
            CREATE INDEX IF NOT EXISTS idx_top100_symbol ON top100_cryptocurrencies(symbol);
            CREATE INDEX IF NOT EXISTS idx_top100_market_cap_rank ON top100_cryptocurrencies(market_cap_rank);
        `);
        
        console.log('✅ Índices criados para top100_cryptocurrencies');
        
        await client.query('COMMIT');
        
        console.log('🎉 Estrutura das tabelas atualizada com sucesso!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao atualizar estrutura:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

updateTablesStructure();
