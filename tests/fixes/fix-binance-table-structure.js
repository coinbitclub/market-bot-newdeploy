const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function fixTableStructure() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Corrigindo estrutura da tabela para dados da Binance...');
        
        await client.query('BEGIN');
        
        // Recriar tabela com tipos de dados adequados para a Binance
        await client.query('DROP TABLE IF EXISTS top100_cryptocurrencies CASCADE');
        
        await client.query(`
            CREATE TABLE top100_cryptocurrencies (
                id SERIAL PRIMARY KEY,
                coin_id VARCHAR(100) UNIQUE NOT NULL,
                symbol VARCHAR(20),
                name VARCHAR(255),
                current_price DECIMAL(30, 8),
                market_cap_rank INTEGER,
                price_change_24h DECIMAL(30, 8),
                price_change_percentage_24h DECIMAL(10, 4),
                total_volume DECIMAL(30, 2),
                quote_volume_24h DECIMAL(30, 2),
                high_24h DECIMAL(30, 8),
                low_24h DECIMAL(30, 8),
                open_price DECIMAL(30, 8),
                trade_count INTEGER,
                ath DECIMAL(30, 8),
                atl DECIMAL(30, 8),
                last_updated TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('✅ Tabela recriada com tipos de dados corretos');
        
        // Criar índices
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_top100_coin_id ON top100_cryptocurrencies(coin_id);
            CREATE INDEX IF NOT EXISTS idx_top100_symbol ON top100_cryptocurrencies(symbol);
            CREATE INDEX IF NOT EXISTS idx_top100_rank ON top100_cryptocurrencies(market_cap_rank);
            CREATE INDEX IF NOT EXISTS idx_top100_volume ON top100_cryptocurrencies(quote_volume_24h);
        `);
        
        console.log('✅ Índices criados');
        
        await client.query('COMMIT');
        
        console.log('🎉 Estrutura corrigida com sucesso!');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao corrigir estrutura:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixTableStructure();
