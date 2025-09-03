const { Pool } = require('pg');
const axios = require('axios');

// Configuração da conexão com a base de dados
const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: {
        rejectUnauthorized: false
    }
});

// Sistema de coleta automática das TOP 100 criptomoedas
class Top100Collector {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.updateInterval = 5 * 60 * 1000; // 5 minutos
    }

    async logMessage(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type}] ${message}`);
        
        try {
            await pool.query(`
                INSERT INTO system_logs (component, level, message, timestamp, data)
                VALUES ($1, $2, $3, $4, $5)
            `, ['top100_collector', type, message, new Date(), {}]);
        } catch (err) {
            console.error('Erro ao salvar log:', err.message);
        }
    }

    async fetchTop100Data() {
        try {
            this.logMessage('Iniciando coleta de dados das TOP 100 criptomoedas...');
            
            // Coletar dados das TOP 100 criptomoedas do CoinGecko
            const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 100,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '24h,7d'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });

            if (!response.data || !Array.isArray(response.data)) {
                throw new Error('Resposta inválida da API CoinGecko');
            }

            this.logMessage(`Dados coletados: ${response.data.length} criptomoedas`);
            return response.data;
            
        } catch (error) {
            this.logMessage(`Erro ao coletar dados: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async saveToDatabase(cryptos) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            let insertedCount = 0;
            let updatedCount = 0;
            
            for (const crypto of cryptos) {
                try {
                    // Verificar se já existe
                    const existingQuery = await client.query(
                        'SELECT id FROM top100_cryptocurrencies WHERE coin_id = $1',
                        [crypto.id]
                    );
                    
                    const cryptoData = {
                        coin_id: crypto.id,
                        symbol: crypto.symbol ? crypto.symbol.toUpperCase() : null,
                        name: crypto.name,
                        current_price: crypto.current_price,
                        market_cap: crypto.market_cap,
                        market_cap_rank: crypto.market_cap_rank,
                        total_volume: crypto.total_volume,
                        price_change_24h: crypto.price_change_24h,
                        price_change_percentage_24h: crypto.price_change_percentage_24h,
                        price_change_percentage_7d: crypto.price_change_percentage_7d_in_currency,
                        circulating_supply: crypto.circulating_supply,
                        total_supply: crypto.total_supply,
                        max_supply: crypto.max_supply,
                        ath: crypto.ath,
                        ath_date: crypto.ath_date ? new Date(crypto.ath_date) : null,
                        atl: crypto.atl,
                        atl_date: crypto.atl_date ? new Date(crypto.atl_date) : null,
                        image_url: crypto.image,
                        last_updated: new Date(crypto.last_updated)
                    };
                    
                    if (existingQuery.rows.length > 0) {
                        // Atualizar registro existente
                        await client.query(`
                            UPDATE top100_cryptocurrencies SET
                                symbol = $2,
                                name = $3,
                                current_price = $4,
                                market_cap = $5,
                                market_cap_rank = $6,
                                total_volume = $7,
                                price_change_24h = $8,
                                price_change_percentage_24h = $9,
                                price_change_percentage_7d = $10,
                                circulating_supply = $11,
                                total_supply = $12,
                                max_supply = $13,
                                ath = $14,
                                ath_date = $15,
                                atl = $16,
                                atl_date = $17,
                                image_url = $18,
                                last_updated = $19,
                                updated_at = NOW()
                            WHERE coin_id = $1
                        `, [
                            cryptoData.coin_id, cryptoData.symbol, cryptoData.name,
                            cryptoData.current_price, cryptoData.market_cap, cryptoData.market_cap_rank,
                            cryptoData.total_volume, cryptoData.price_change_24h, cryptoData.price_change_percentage_24h,
                            cryptoData.price_change_percentage_7d, cryptoData.circulating_supply,
                            cryptoData.total_supply, cryptoData.max_supply, cryptoData.ath,
                            cryptoData.ath_date, cryptoData.atl, cryptoData.atl_date,
                            cryptoData.image_url, cryptoData.last_updated
                        ]);
                        updatedCount++;
                    } else {
                        // Inserir novo registro
                        await client.query(`
                            INSERT INTO top100_cryptocurrencies (
                                coin_id, symbol, name, current_price, market_cap, market_cap_rank,
                                total_volume, price_change_24h, price_change_percentage_24h,
                                price_change_percentage_7d, circulating_supply, total_supply,
                                max_supply, ath, ath_date, atl, atl_date, image_url, last_updated
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
                            )
                        `, [
                            cryptoData.coin_id, cryptoData.symbol, cryptoData.name,
                            cryptoData.current_price, cryptoData.market_cap, cryptoData.market_cap_rank,
                            cryptoData.total_volume, cryptoData.price_change_24h, cryptoData.price_change_percentage_24h,
                            cryptoData.price_change_percentage_7d, cryptoData.circulating_supply,
                            cryptoData.total_supply, cryptoData.max_supply, cryptoData.ath,
                            cryptoData.ath_date, cryptoData.atl, cryptoData.atl_date,
                            cryptoData.image_url, cryptoData.last_updated
                        ]);
                        insertedCount++;
                    }
                    
                } catch (itemError) {
                    this.logMessage(`Erro ao processar ${crypto.id}: ${itemError.message}`, 'ERROR');
                    continue;
                }
            }
            
            await client.query('COMMIT');
            this.logMessage(`Dados salvos: ${insertedCount} novos, ${updatedCount} atualizados`);
            
            return { inserted: insertedCount, updated: updatedCount };
            
        } catch (error) {
            await client.query('ROLLBACK');
            this.logMessage(`Erro ao salvar no banco: ${error.message}`, 'ERROR');
            throw error;
        } finally {
            client.release();
        }
    }

    async collectFearGreedIndex() {
        try {
            this.logMessage('Coletando índice Fear & Greed...');
            
            const response = await axios.get('https://api.alternative.me/fng/', {
                timeout: 15000
            });

            if (response.data && response.data.data && response.data.data[0]) {
                const fearGreedData = response.data.data[0];
                
                await pool.query(`
                    INSERT INTO system_logs (component, level, message, timestamp, data)
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    'fear_greed_index',
                    'INFO',
                    `Fear & Greed Index: ${fearGreedData.value} (${fearGreedData.value_classification})`,
                    new Date(),
                    {
                        value: fearGreedData.value,
                        classification: fearGreedData.value_classification,
                        timestamp: fearGreedData.timestamp
                    }
                ]);
                
                this.logMessage(`Fear & Greed Index coletado: ${fearGreedData.value} (${fearGreedData.value_classification})`);
                return fearGreedData;
            }
            
        } catch (error) {
            this.logMessage(`Erro ao coletar Fear & Greed Index: ${error.message}`, 'ERROR');
        }
    }

    async collectBTCDominance() {
        try {
            this.logMessage('Coletando dominância do Bitcoin...');
            
            const response = await axios.get('https://api.coingecko.com/api/v3/global', {
                timeout: 15000
            });

            if (response.data && response.data.data && response.data.data.market_cap_percentage) {
                const btcDominance = response.data.data.market_cap_percentage.btc;
                
                await pool.query(`
                    INSERT INTO system_logs (component, level, message, timestamp, data)
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    'btc_dominance',
                    'INFO',
                    `BTC Dominance: ${btcDominance.toFixed(2)}%`,
                    new Date(),
                    {
                        btc_dominance: btcDominance,
                        total_market_cap: response.data.data.total_market_cap,
                        total_volume: response.data.data.total_volume_24h
                    }
                ]);
                
                this.logMessage(`BTC Dominance coletada: ${btcDominance.toFixed(2)}%`);
                return btcDominance;
            }
            
        } catch (error) {
            this.logMessage(`Erro ao coletar BTC Dominance: ${error.message}`, 'ERROR');
        }
    }

    async runCollection() {
        if (this.isRunning) {
            this.logMessage('Coleta já em execução, aguardando...', 'WARN');
            return;
        }

        this.isRunning = true;
        
        try {
            this.logMessage('=== INICIANDO CICLO DE COLETA COMPLETA ===');
            
            // 1. Coletar dados das TOP 100
            const cryptoData = await this.fetchTop100Data();
            const saveResult = await this.saveToDatabase(cryptoData);
            
            // 2. Coletar Fear & Greed Index
            await this.collectFearGreedIndex();
            
            // 3. Coletar BTC Dominance
            await this.collectBTCDominance();
            
            // 4. Atualizar estatísticas do sistema
            await this.updateSystemStats();
            
            this.logMessage(`=== CICLO COMPLETO: ${saveResult.inserted} novos, ${saveResult.updated} atualizados ===`);
            
        } catch (error) {
            this.logMessage(`Erro no ciclo de coleta: ${error.message}`, 'ERROR');
        } finally {
            this.isRunning = false;
        }
    }

    async updateSystemStats() {
        try {
            const statsQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total_cryptos,
                    COUNT(CASE WHEN price_change_percentage_24h > 0 THEN 1 END) as positive_24h,
                    COUNT(CASE WHEN price_change_percentage_24h < 0 THEN 1 END) as negative_24h,
                    AVG(price_change_percentage_24h) as avg_change_24h,
                    SUM(market_cap) as total_market_cap,
                    MAX(last_updated) as last_update
                FROM top100_cryptocurrencies
            `);
            
            const stats = statsQuery.rows[0];
            
            await pool.query(`
                INSERT INTO system_logs (component, level, message, timestamp, data)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                'market_stats',
                'INFO',
                'Estatísticas de mercado atualizadas',
                new Date(),
                {
                    total_cryptos: parseInt(stats.total_cryptos),
                    positive_24h: parseInt(stats.positive_24h),
                    negative_24h: parseInt(stats.negative_24h),
                    avg_change_24h: parseFloat(stats.avg_change_24h),
                    total_market_cap: parseFloat(stats.total_market_cap),
                    last_update: stats.last_update
                }
            ]);
            
            this.logMessage(`Stats: ${stats.total_cryptos} cryptos, ${stats.positive_24h} positive, avg: ${parseFloat(stats.avg_change_24h).toFixed(2)}%`);
            
        } catch (error) {
            this.logMessage(`Erro ao atualizar estatísticas: ${error.message}`, 'ERROR');
        }
    }

    async start() {
        if (this.intervalId) {
            this.logMessage('Collector já está rodando', 'WARN');
            return;
        }

        this.logMessage('=== INICIANDO TOP 100 COLLECTOR ===');
        
        // Executar primeira coleta imediatamente
        await this.runCollection();
        
        // Configurar coletas automáticas
        this.intervalId = setInterval(() => {
            this.runCollection();
        }, this.updateInterval);
        
        this.logMessage(`Collector ativo - próxima coleta em ${this.updateInterval / 60000} minutos`);
    }

    async stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.logMessage('=== TOP 100 COLLECTOR PARADO ===');
        }
    }

    async getStats() {
        try {
            const statsQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(DISTINCT coin_id) as unique_cryptos,
                    MAX(updated_at) as last_update,
                    COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 1 END) as updated_last_hour
                FROM top100_cryptocurrencies
            `);
            
            return statsQuery.rows[0];
            
        } catch (error) {
            this.logMessage(`Erro ao obter estatísticas: ${error.message}`, 'ERROR');
            return null;
        }
    }
}

// Função principal
async function main() {
    console.log('🚀 TOP 100 Cryptocurrency Collector - Iniciando...');
    
    const collector = new Top100Collector();
    
    try {
        // Testar conexão com banco
        await pool.query('SELECT NOW()');
        console.log('✅ Conexão com banco de dados estabelecida');
        
        // Verificar se tabela existe
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'top100_cryptocurrencies'
            )
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('❌ Tabela top100_cryptocurrencies não encontrada');
            process.exit(1);
        }
        
        console.log('✅ Tabela top100_cryptocurrencies encontrada');
        
        // Executar coleta única ou contínua
        if (process.argv.includes('--once')) {
            console.log('🔄 Executando coleta única...');
            await collector.runCollection();
            console.log('✅ Coleta única concluída');
            process.exit(0);
        } else {
            console.log('🔄 Iniciando coleta contínua...');
            await collector.start();
            
            // Manter processo ativo
            process.on('SIGINT', async () => {
                console.log('\n🛑 Parando collector...');
                await collector.stop();
                process.exit(0);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro fatal:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { Top100Collector };
