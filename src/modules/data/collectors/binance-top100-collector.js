const { Pool } = require('pg');
const { Spot } = require('@binance/connector');
const axios = require('axios');
require('dotenv').config();

// Configuração da conexão com a base de dados
const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

// Configuração da API Binance (sem credenciais para endpoints públicos)
const binanceClient = new Spot();

// Sistema de coleta automatizada das TOP 100 via Binance
class BinanceTop100Collector {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.updateInterval = 30 * 60 * 1000; // 30 minutos
        this.lastUpdate = null;
        this.metricsHistory = [];
    }

    async logMessage(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type}] ${message}`);
        
        try {
            await pool.query(`
                INSERT INTO system_logs (component, level, message, timestamp, data)
                VALUES ($1, $2, $3, $4, $5)
            `, ['binance_top100_collector', type, message, new Date(), {}]);
        } catch (err) {
            console.error('Erro ao salvar log:', err.message);
        }
    }

    async fetchBinance24hrStats() {
        try {
            this.logMessage('Coletando estatísticas 24h da Binance...');
            
            // Pegar estatísticas de 24h de todos os símbolos
            const response = await binanceClient.ticker24hr();
            
            if (!response.data || !Array.isArray(response.data)) {
                throw new Error('Resposta inválida da API Binance');
            }

            // Filtrar apenas pares USDT e ordenar por volume
            const usdtPairs = response.data
                .filter(item => item.symbol.endsWith('USDT') && item.symbol !== 'USDT')
                .map(item => ({
                    symbol: item.symbol,
                    baseAsset: item.symbol.replace('USDT', ''),
                    price: parseFloat(item.lastPrice),
                    priceChange24h: parseFloat(item.priceChange),
                    priceChangePercent24h: parseFloat(item.priceChangePercent),
                    volume24h: parseFloat(item.volume),
                    quoteVolume24h: parseFloat(item.quoteVolume),
                    high24h: parseFloat(item.highPrice),
                    low24h: parseFloat(item.lowPrice),
                    openPrice: parseFloat(item.openPrice),
                    count: parseInt(item.count),
                    timestamp: new Date()
                }))
                .sort((a, b) => b.quoteVolume24h - a.quoteVolume24h)
                .slice(0, 100); // TOP 100 por volume

            this.logMessage(`Dados coletados: ${usdtPairs.length} pares USDT`);
            return usdtPairs;
            
        } catch (error) {
            this.logMessage(`Erro ao coletar dados Binance: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async saveToDatabase(cryptoData) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            let insertedCount = 0;
            let updatedCount = 0;
            
            for (const crypto of cryptoData) {
                try {
                    // Verificar se já existe (usando symbol como chave única)
                    const existingQuery = await client.query(
                        'SELECT id FROM top100_cryptocurrencies WHERE coin_id = $1',
                        [crypto.symbol.toLowerCase()]
                    );
                    
                    if (existingQuery.rows.length > 0) {
                        // Atualizar registro existente
                        await client.query(`
                            UPDATE top100_cryptocurrencies SET
                                symbol = $2,
                                name = $3,
                                current_price = $4,
                                market_cap_rank = $5,
                                price_change_24h = $6,
                                price_change_percentage_24h = $7,
                                total_volume = $8,
                                quote_volume_24h = $9,
                                high_24h = $10,
                                low_24h = $11,
                                open_price = $12,
                                trade_count = $13,
                                last_updated = $14,
                                updated_at = NOW()
                            WHERE coin_id = $1
                        `, [
                            crypto.symbol.toLowerCase(),
                            crypto.baseAsset,
                            crypto.baseAsset + ' / USDT',
                            crypto.price,
                            cryptoData.indexOf(crypto) + 1, // Ranking por volume
                            crypto.priceChange24h,
                            crypto.priceChangePercent24h,
                            crypto.volume24h,
                            crypto.quoteVolume24h,
                            crypto.high24h,
                            crypto.low24h,
                            crypto.openPrice,
                            crypto.count,
                            crypto.timestamp
                        ]);
                        updatedCount++;
                    } else {
                        // Inserir novo registro
                        await client.query(`
                            INSERT INTO top100_cryptocurrencies (
                                coin_id, symbol, name, current_price, market_cap_rank,
                                price_change_24h, price_change_percentage_24h, total_volume,
                                quote_volume_24h, high_24h, low_24h, open_price, trade_count,
                                last_updated
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
                            )
                        `, [
                            crypto.symbol.toLowerCase(),
                            crypto.baseAsset,
                            crypto.baseAsset + ' / USDT',
                            crypto.price,
                            cryptoData.indexOf(crypto) + 1,
                            crypto.priceChange24h,
                            crypto.priceChangePercent24h,
                            crypto.volume24h,
                            crypto.quoteVolume24h,
                            crypto.high24h,
                            crypto.low24h,
                            crypto.openPrice,
                            crypto.count,
                            crypto.timestamp
                        ]);
                        insertedCount++;
                    }
                    
                } catch (itemError) {
                    this.logMessage(`Erro ao processar ${crypto.symbol}: ${itemError.message}`, 'ERROR');
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

    async calculateMarketMetrics(cryptoData) {
        try {
            this.logMessage('Calculando métricas de mercado...');
            
            // Calcular métricas gerais
            const totalVolume = cryptoData.reduce((sum, crypto) => sum + crypto.quoteVolume24h, 0);
            const positiveCount = cryptoData.filter(crypto => crypto.priceChangePercent24h > 0).length;
            const negativeCount = cryptoData.filter(crypto => crypto.priceChangePercent24h < 0).length;
            const avgPriceChange = cryptoData.reduce((sum, crypto) => sum + crypto.priceChangePercent24h, 0) / cryptoData.length;
            
            // Encontrar maior alta e baixa
            const biggestGainer = cryptoData.reduce((max, crypto) => 
                crypto.priceChangePercent24h > max.priceChangePercent24h ? crypto : max
            );
            const biggestLoser = cryptoData.reduce((min, crypto) => 
                crypto.priceChangePercent24h < min.priceChangePercent24h ? crypto : min
            );

            // Calcular dominância do Bitcoin (aproximação)
            const btcData = cryptoData.find(crypto => crypto.baseAsset === 'BTC');
            const btcDominance = btcData ? (btcData.quoteVolume24h / totalVolume * 100) : 0;

            const metrics = {
                timestamp: new Date(),
                total_pairs: cryptoData.length,
                total_volume_24h: totalVolume,
                positive_count: positiveCount,
                negative_count: negativeCount,
                avg_price_change_24h: avgPriceChange,
                biggest_gainer: biggestGainer.baseAsset,
                biggest_gainer_change: biggestGainer.priceChangePercent24h,
                biggest_loser: biggestLoser.baseAsset,
                biggest_loser_change: biggestLoser.priceChangePercent24h,
                btc_price: btcData ? btcData.price : 0,
                btc_volume_dominance: btcDominance,
                market_sentiment: avgPriceChange > 0 ? 'BULLISH' : avgPriceChange < -2 ? 'BEARISH' : 'NEUTRAL'
            };

            // Salvar métricas no log
            await pool.query(`
                INSERT INTO system_logs (component, level, message, timestamp, data)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                'market_metrics',
                'INFO',
                'Métricas de mercado calculadas',
                new Date(),
                metrics
            ]);

            this.metricsHistory.push(metrics);
            
            // Manter apenas últimas 48 métricas (24 horas se coletando a cada 30min)
            if (this.metricsHistory.length > 48) {
                this.metricsHistory = this.metricsHistory.slice(-48);
            }

            this.logMessage(`Métricas: ${positiveCount}↗️ ${negativeCount}↘️ Avg: ${avgPriceChange.toFixed(2)}%`);
            return metrics;
            
        } catch (error) {
            this.logMessage(`Erro ao calcular métricas: ${error.message}`, 'ERROR');
        }
    }

    async detectMarketTrends() {
        if (this.metricsHistory.length < 4) {
            return null; // Precisamos de pelo menos 2 horas de dados
        }

        try {
            const recent = this.metricsHistory.slice(-4); // Últimas 2 horas
            const avgVolumeRecent = recent.reduce((sum, m) => sum + m.total_volume_24h, 0) / recent.length;
            const avgChangeRecent = recent.reduce((sum, m) => sum + m.avg_price_change_24h, 0) / recent.length;
            
            const older = this.metricsHistory.slice(-8, -4); // 2-4 horas atrás
            const avgVolumeOlder = older.reduce((sum, m) => sum + m.total_volume_24h, 0) / older.length;
            const avgChangeOlder = older.reduce((sum, m) => sum + m.avg_price_change_24h, 0) / older.length;

            const volumeTrend = ((avgVolumeRecent - avgVolumeOlder) / avgVolumeOlder) * 100;
            const priceTrend = avgChangeRecent - avgChangeOlder;

            const trend = {
                volume_trend_percent: volumeTrend,
                price_trend_change: priceTrend,
                trend_signal: volumeTrend > 10 && priceTrend > 1 ? 'STRONG_BULLISH' :
                             volumeTrend > 5 && priceTrend > 0 ? 'BULLISH' :
                             volumeTrend < -10 && priceTrend < -1 ? 'STRONG_BEARISH' :
                             volumeTrend < -5 && priceTrend < 0 ? 'BEARISH' : 'NEUTRAL',
                confidence: Math.min(Math.abs(volumeTrend) + Math.abs(priceTrend * 10), 100)
            };

            this.logMessage(`Tendência detectada: ${trend.trend_signal} (${trend.confidence.toFixed(1)}% confiança)`);
            return trend;

        } catch (error) {
            this.logMessage(`Erro ao detectar tendências: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async collectBTCDominance() {
        try {
            this.logMessage('📊 Coletando dominância do BTC...');
            
            const response = await axios.get('https://api.coingecko.com/api/v3/global', {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.data && response.data.data && response.data.data.market_cap_percentage) {
                const btcDominance = response.data.data.market_cap_percentage.btc;
                const totalMarketCap = response.data.data.total_market_cap && response.data.data.total_market_cap.usd 
                    ? response.data.data.total_market_cap.usd 
                    : 0;
                
                await pool.query(`
                    INSERT INTO system_logs (component, level, message, timestamp, data)
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    'btc_dominance_binance',
                    'INFO',
                    `BTC Dominance: ${btcDominance.toFixed(2)}%`,
                    new Date(),
                    {
                        btc_dominance: btcDominance,
                        total_market_cap: totalMarketCap,
                        market_cap_change_24h: response.data.data.market_cap_change_percentage_24h_usd,
                        collection_source: 'binance_collector'
                    }
                ]);
                
                this.logMessage(`📈 BTC Dominance: ${btcDominance.toFixed(2)}% | Cap: $${(totalMarketCap/1e12).toFixed(2)}T`);
                return btcDominance;
            }
            
        } catch (error) {
            this.logMessage(`❌ Erro ao coletar BTC Dominance: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async runFullCollection() {
        if (this.isRunning) {
            this.logMessage('Coleta já em execução, aguardando...', 'WARN');
            return;
        }

        this.isRunning = true;
        
        try {
            this.logMessage('=== INICIANDO CICLO DE COLETA BINANCE TOP 100 ===');
            
            // 1. Coletar dados da Binance
            const cryptoData = await this.fetchBinance24hrStats();
            const saveResult = await this.saveToDatabase(cryptoData);
            
            // 2. Coletar dominância do BTC
            const btcDominance = await this.collectBTCDominance();
            
            // 3. Calcular métricas de mercado
            const metrics = await this.calculateMarketMetrics(cryptoData);
            
            // 4. Detectar tendências (se tivermos histórico suficiente)
            const trends = await this.detectMarketTrends();
            
            // 5. Atualizar timestamp da última coleta
            this.lastUpdate = new Date();
            
            this.logMessage(`=== CICLO COMPLETO: ${saveResult.inserted} novos, ${saveResult.updated} atualizados, BTC Dom: ${btcDominance?.toFixed(2)}% ===`);
            
            if (trends) {
                this.logMessage(`Tendência: ${trends.trend_signal} (Confiança: ${trends.confidence.toFixed(1)}%)`);
            }
            
        } catch (error) {
            this.logMessage(`Erro no ciclo de coleta: ${error.message}`, 'ERROR');
        } finally {
            this.isRunning = false;
        }
    }

    async start() {
        if (this.intervalId) {
            this.logMessage('Collector já está rodando', 'WARN');
            return;
        }

        this.logMessage('=== INICIANDO BINANCE TOP 100 COLLECTOR ===');
        this.logMessage('Configuração: Coleta a cada 30 minutos');
        
        // Executar primeira coleta imediatamente
        await this.runFullCollection();
        
        // Configurar coletas automáticas a cada 30 minutos
        this.intervalId = setInterval(() => {
            this.runFullCollection();
        }, this.updateInterval);
        
        this.logMessage(`Collector ativo - próxima coleta em 30 minutos`);
    }

    async stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.logMessage('=== BINANCE TOP 100 COLLECTOR PARADO ===');
        }
    }

    async getStatus() {
        try {
            const statsQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(DISTINCT coin_id) as unique_cryptos,
                    MAX(updated_at) as last_update,
                    COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 1 END) as updated_last_hour
                FROM top100_cryptocurrencies
            `);
            
            return {
                ...statsQuery.rows[0],
                collector_running: this.intervalId !== null,
                last_collection: this.lastUpdate,
                metrics_history_count: this.metricsHistory.length
            };
            
        } catch (error) {
            this.logMessage(`Erro ao obter status: ${error.message}`, 'ERROR');
            return null;
        }
    }
}

// Função principal
async function main() {
    console.log('🚀 Binance TOP 100 Cryptocurrency Collector - Iniciando...');
    console.log('⏰ Coleta automática a cada 30 minutos');
    console.log('📊 Métricas comparativas para referência da IA');
    
    const collector = new BinanceTop100Collector();
    
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
            await collector.runFullCollection();
            console.log('✅ Coleta única concluída');
            
            // Mostrar status
            const status = await collector.getStatus();
            if (status) {
                console.log(`📊 Status: ${status.total_records} registros, ${status.unique_cryptos} cryptos únicas`);
            }
            
            process.exit(0);
        } else {
            console.log('🔄 Iniciando coleta contínua a cada 30 minutos...');
            await collector.start();
            
            // Manter processo ativo
            process.on('SIGINT', async () => {
                console.log('\n🛑 Parando collector...');
                await collector.stop();
                process.exit(0);
            });
            
            // Log de status a cada hora
            setInterval(async () => {
                const status = await collector.getStatus();
                if (status) {
                    console.log(`📊 Status: ${status.total_records} registros, última coleta: ${status.last_collection}`);
                }
            }, 60 * 60 * 1000); // A cada hora
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

module.exports = { BinanceTop100Collector };
