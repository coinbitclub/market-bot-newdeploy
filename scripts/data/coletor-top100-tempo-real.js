#!/usr/bin/env node

console.log('📊 COLETOR TOP 100 TEMPO REAL - BINANCE API');
console.log('==========================================');

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

class Top100Collector {
    constructor() {
        this.binanceUrl = 'https://api.binance.com/api/v3/ticker/24hr';
    }

    async collectTop100Data() {
        try {
            console.log('🌐 Conectando com Binance API...');
            console.log(`📡 URL: ${this.binanceUrl}`);

            const response = await axios.get(this.binanceUrl, {
                timeout: 15000
            });

            console.log(`✅ Recebidos dados de ${response.data.length} pares de trading`);

            // Filtrar apenas pares USDT
            const usdtPairs = response.data.filter(ticker => 
                ticker.symbol.endsWith('USDT') && 
                !ticker.symbol.includes('UP') && 
                !ticker.symbol.includes('DOWN') &&
                !ticker.symbol.includes('BULL') &&
                !ticker.symbol.includes('BEAR') &&
                parseFloat(ticker.quoteVolume) > 1000000 // Volume mínimo de $1M
            );

            console.log(`📈 Filtrados ${usdtPairs.length} pares USDT com volume significativo`);

            // Ordenar por volume e pegar top 100
            const top100 = usdtPairs
                .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                .slice(0, 100);

            console.log(`🏆 Analisando TOP 100 pares por volume...`);

            // Analisar tendência
            let countUp = 0;
            let countDown = 0;
            let totalChange = 0;

            const analysis = top100.map(ticker => {
                const priceChange = parseFloat(ticker.priceChangePercent);
                totalChange += priceChange;
                
                if (priceChange > 0) {
                    countUp++;
                } else {
                    countDown++;
                }

                return {
                    symbol: ticker.symbol,
                    priceChangePercent: priceChange,
                    volume: parseFloat(ticker.quoteVolume),
                    price: parseFloat(ticker.lastPrice)
                };
            });

            const percentageUp = Math.round((countUp / 100) * 100);
            const percentageDown = Math.round((countDown / 100) * 100);
            const averageChange = totalChange / 100;

            console.log(`📊 Resultado da análise:`);
            console.log(`   🟢 Em alta: ${countUp} moedas (${percentageUp}%)`);
            console.log(`   🔴 Em baixa: ${countDown} moedas (${percentageDown}%)`);
            console.log(`   📈 Variação média: ${averageChange.toFixed(2)}%`);

            // Determinar direção do mercado
            let marketDirection;
            if (percentageUp >= 70) {
                marketDirection = 'STRONG_BULLISH';
            } else if (percentageUp >= 55) {
                marketDirection = 'BULLISH';
            } else if (percentageUp >= 45) {
                marketDirection = 'NEUTRAL';
            } else if (percentageUp >= 30) {
                marketDirection = 'BEARISH';
            } else {
                marketDirection = 'STRONG_BEARISH';
            }

            console.log(`🎯 Direção do mercado: ${marketDirection}`);

            // Salvar no banco de dados
            await this.saveMarketDirection(marketDirection, percentageUp, percentageDown, averageChange);

            // Salvar detalhes dos top 10
            await this.saveTop10Details(analysis.slice(0, 10));

            return {
                marketDirection,
                percentageUp,
                percentageDown,
                averageChange,
                top10: analysis.slice(0, 10)
            };

        } catch (error) {
            console.error('❌ Erro ao coletar dados TOP 100:', error.message);
            
            if (error.response) {
                console.error('📡 Status:', error.response.status);
                console.error('📡 Data:', error.response.data);
            }

            return await this.getLastKnownData();
        }
    }

    async saveMarketDirection(direction, percentageUp, percentageDown, averageChange) {
        try {
            const result = await pool.query(`
                INSERT INTO market_direction (
                    current_direction, 
                    top100_percentage_up, 
                    top100_percentage_down,
                    average_change_percent,
                    last_updated
                )
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (last_updated::date) 
                DO UPDATE SET 
                    current_direction = EXCLUDED.current_direction,
                    top100_percentage_up = EXCLUDED.top100_percentage_up,
                    top100_percentage_down = EXCLUDED.top100_percentage_down,
                    average_change_percent = EXCLUDED.average_change_percent,
                    last_updated = EXCLUDED.last_updated
                RETURNING *
            `, [direction, percentageUp, percentageDown, averageChange]);

            console.log('💾 Market Direction salvo no banco');
            console.log('📊 Registro:', result.rows[0]);

        } catch (error) {
            console.error('❌ Erro ao salvar market direction:', error.message);
            
            // Tentar inserção simples
            try {
                await pool.query(`
                    UPDATE market_direction 
                    SET current_direction = $1, 
                        top100_percentage_up = $2, 
                        top100_percentage_down = $3,
                        average_change_percent = $4,
                        last_updated = NOW()
                    WHERE id = 1
                `, [direction, percentageUp, percentageDown, averageChange]);
                
                console.log('💾 Market Direction atualizado via UPDATE');
            } catch (updateError) {
                console.error('❌ Erro no UPDATE:', updateError.message);
            }
        }
    }

    async saveTop10Details(top10) {
        try {
            // Limpar dados anteriores do dia
            await pool.query(`
                DELETE FROM top100_details 
                WHERE DATE(collected_at) = CURRENT_DATE
            `);

            // Inserir novos dados
            for (let i = 0; i < top10.length; i++) {
                const coin = top10[i];
                await pool.query(`
                    INSERT INTO top100_details (
                        rank_position, symbol, price_change_percent, 
                        volume_24h, current_price, collected_at
                    )
                    VALUES ($1, $2, $3, $4, $5, NOW())
                `, [i + 1, coin.symbol, coin.priceChangePercent, coin.volume, coin.price]);
            }

            console.log('💾 TOP 10 detalhes salvos no banco');

        } catch (error) {
            // Se a tabela não existir, criar
            if (error.message.includes('does not exist')) {
                console.log('📋 Criando tabela top100_details...');
                await this.createTop100Table();
                await this.saveTop10Details(top10); // Tentar novamente
            } else {
                console.error('❌ Erro ao salvar TOP 10:', error.message);
            }
        }
    }

    async createTop100Table() {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS top100_details (
                    id SERIAL PRIMARY KEY,
                    rank_position INTEGER NOT NULL,
                    symbol VARCHAR(20) NOT NULL,
                    price_change_percent DECIMAL(10,4),
                    volume_24h DECIMAL(20,2),
                    current_price DECIMAL(20,8),
                    collected_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('✅ Tabela top100_details criada');
        } catch (error) {
            console.error('❌ Erro ao criar tabela:', error.message);
        }
    }

    async getLastKnownData() {
        try {
            const result = await pool.query(`
                SELECT current_direction, top100_percentage_up, top100_percentage_down, last_updated
                FROM market_direction 
                ORDER BY last_updated DESC 
                LIMIT 1
            `);

            if (result.rows.length > 0) {
                const lastData = result.rows[0];
                console.log('📚 Usando últimos dados conhecidos:', lastData);
                return {
                    marketDirection: lastData.current_direction,
                    percentageUp: lastData.top100_percentage_up,
                    percentageDown: lastData.top100_percentage_down
                };
            }

            console.log('⚠️ Nenhum dado conhecido, usando neutro');
            return {
                marketDirection: 'NEUTRAL',
                percentageUp: 50,
                percentageDown: 50
            };

        } catch (error) {
            console.error('❌ Erro ao buscar últimos dados:', error.message);
            return {
                marketDirection: 'NEUTRAL',
                percentageUp: 50,
                percentageDown: 50
            };
        }
    }

    async getDetailedAnalysis() {
        console.log('\n📋 ANÁLISE DETALHADA DO TOP 100');
        console.log('===============================');

        const data = await this.collectTop100Data();
        
        if (data.top10) {
            console.log('\n🏆 TOP 10 MOEDAS POR VOLUME:');
            data.top10.forEach((coin, index) => {
                const emoji = coin.priceChangePercent > 0 ? '🟢' : '🔴';
                console.log(`${index + 1}. ${coin.symbol} ${emoji} ${coin.priceChangePercent.toFixed(2)}% (Vol: $${(coin.volume / 1000000).toFixed(1)}M)`);
            });
        }

        return data;
    }
}

async function main() {
    try {
        const collector = new Top100Collector();
        const data = await collector.getDetailedAnalysis();
        
        console.log('\n🎯 RESUMO FINAL:');
        console.log('===============');
        console.log(`Direção: ${data.marketDirection}`);
        console.log(`Em alta: ${data.percentageUp}%`);
        console.log(`Em baixa: ${data.percentageDown}%`);
        console.log(`Variação média: ${data.averageChange?.toFixed(2)}%`);

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = Top100Collector;
