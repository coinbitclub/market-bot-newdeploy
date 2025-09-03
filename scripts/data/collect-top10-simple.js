const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function collectTop10Simple() {
    console.log('🚀 Coletando TOP 10 de forma simplificada...');
    
    try {
        // Coletar dados do CoinGecko
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 10,
                page: 1,
                sparkline: false
            },
            timeout: 30000
        });

        console.log(`📊 Dados coletados: ${response.data.length} criptomoedas`);
        
        // Inserir uma por uma sem transação
        let inserted = 0;
        
        for (const crypto of response.data) {
            try {
                await pool.query(`
                    INSERT INTO top100_cryptocurrencies (
                        coin_id, symbol, name, current_price, market_cap_rank
                    ) VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (coin_id) DO UPDATE SET
                        current_price = EXCLUDED.current_price,
                        updated_at = NOW()
                `, [
                    crypto.id,
                    crypto.symbol ? crypto.symbol.toUpperCase() : null,
                    crypto.name,
                    crypto.current_price,
                    crypto.market_cap_rank
                ]);
                
                console.log(`✅ Inserido: ${crypto.symbol} - $${crypto.current_price}`);
                inserted++;
                
            } catch (error) {
                console.log(`❌ Erro ao inserir ${crypto.id}: ${error.message}`);
            }
        }
        
        console.log(`🎉 Total inserido: ${inserted} criptomoedas`);
        
        // Verificar inserção
        const verifyResult = await pool.query('SELECT COUNT(*) FROM top100_cryptocurrencies');
        console.log(`🔢 Registros na tabela: ${verifyResult.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

collectTop10Simple();
