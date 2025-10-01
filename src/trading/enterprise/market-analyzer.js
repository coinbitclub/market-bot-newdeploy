// 📊 MARKET ANALYZER - ENTERPRISE
// Análise de mercado com Fear & Greed + Top100 + BTC Dominance

const axios = require('axios');

class MarketAnalyzer {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    async analyzeMarket(symbol) {
        try {
            console.log(`📊 Analisando mercado para ${symbol}...`);
            
            const analysis = {
                symbol,
                timestamp: new Date().toISOString(),
                fearGreedIndex: await this.getFearGreedIndex(),
                btcDominance: await this.getBTCDominance(),
                top100Movement: await this.getTop100Movement(),
                technicalIndicators: await this.getTechnicalIndicators(symbol),
                sentiment: 'NEUTRAL'
            };

            // Calcular sentiment geral
            analysis.sentiment = this.calculateOverallSentiment(analysis);
            
            console.log(`✅ Análise concluída: ${analysis.sentiment}`);
            return analysis;
            
        } catch (error) {
            console.error('❌ Erro na análise de mercado:', error.message);
            return this.getDefaultAnalysis(symbol);
        }
    }

    async getFearGreedIndex() {
        try {
            // Check cache first
            const cacheKey = 'fear_greed';
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.cachedAt < this.cacheTimeout) {
                return cached.data;
            }

            // Fetch from real API (alternative.me - Free Crypto Fear & Greed Index API)
            const response = await axios.get('https://api.alternative.me/fng/', {
                timeout: 5000
            });

            const data = response.data.data[0];
            const index = parseInt(data.value);
            let sentiment = 'NEUTRAL';

            if (index <= 25) sentiment = 'EXTREME_FEAR';
            else if (index <= 45) sentiment = 'FEAR';
            else if (index <= 55) sentiment = 'NEUTRAL';
            else if (index <= 75) sentiment = 'GREED';
            else sentiment = 'EXTREME_GREED';

            const result = {
                value: index,
                sentiment,
                timestamp: new Date().toISOString()
            };

            // Cache the result
            this.cache.set(cacheKey, { data: result, cachedAt: Date.now() });

            console.log(`📊 Fear & Greed Index: ${index} (${sentiment})`);
            return result;

        } catch (error) {
            console.error('❌ Error fetching Fear & Greed Index, using fallback:', error.message);
            // Fallback to neutral if API fails
            return {
                value: 50,
                sentiment: 'NEUTRAL',
                timestamp: new Date().toISOString(),
                error: 'API unavailable'
            };
        }
    }

    async getBTCDominance() {
        try {
            // Check cache first
            const cacheKey = 'btc_dominance';
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.cachedAt < this.cacheTimeout) {
                return cached.data;
            }

            // Fetch from CoinGecko Global API (free, no auth required)
            const response = await axios.get('https://api.coingecko.com/api/v3/global', {
                timeout: 5000
            });

            const dominance = response.data.data.market_cap_percentage.btc;

            // Determine trend (compare with historical average of ~45%)
            let trend = 'NEUTRAL';
            if (dominance > 52) trend = 'INCREASING';
            else if (dominance < 42) trend = 'DECREASING';

            const result = {
                percentage: Math.round(dominance * 100) / 100,
                trend,
                timestamp: new Date().toISOString()
            };

            // Cache the result
            this.cache.set(cacheKey, { data: result, cachedAt: Date.now() });

            console.log(`📊 BTC Dominance: ${result.percentage}% (${trend})`);
            return result;

        } catch (error) {
            console.error('❌ Error fetching BTC Dominance, using fallback:', error.message);
            // Fallback to average value if API fails
            return {
                percentage: 50.0,
                trend: 'NEUTRAL',
                timestamp: new Date().toISOString(),
                error: 'API unavailable'
            };
        }
    }

    async getTop100Movement() {
        try {
            // Check cache first
            const cacheKey = 'top100_movement';
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.cachedAt < this.cacheTimeout) {
                return cached.data;
            }

            // Fetch top 100 coins from CoinGecko
            const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 100,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '24h'
                },
                timeout: 10000
            });

            // Count green vs red coins
            let greenCount = 0;
            let redCount = 0;

            response.data.forEach(coin => {
                if (coin.price_change_percentage_24h > 0) {
                    greenCount++;
                } else {
                    redCount++;
                }
            });

            const greenPercent = (greenCount / 100) * 100;

            let trend = 'NEUTRAL';
            if (greenPercent > 60) trend = 'BULLISH';
            else if (greenPercent < 40) trend = 'BEARISH';

            const result = {
                green_percentage: Math.round(greenPercent),
                red_percentage: Math.round(100 - greenPercent),
                trend,
                timestamp: new Date().toISOString()
            };

            // Cache the result
            this.cache.set(cacheKey, { data: result, cachedAt: Date.now() });

            console.log(`📊 Top100 Movement: ${result.green_percentage}% green (${trend})`);
            return result;

        } catch (error) {
            console.error('❌ Error fetching Top100 movement, using fallback:', error.message);
            // Fallback to neutral if API fails
            return {
                green_percentage: 50,
                red_percentage: 50,
                trend: 'NEUTRAL',
                timestamp: new Date().toISOString(),
                error: 'API unavailable'
            };
        }
    }

    async getTechnicalIndicators(symbol) {
        // Simulação - em produção usaria APIs de mercado
        return {
            rsi: 30 + Math.random() * 40, // 30-70
            macd_signal: Math.random() > 0.5 ? 'BUY' : 'SELL',
            bollinger_position: Math.random() > 0.5 ? 'UPPER' : 'LOWER',
            support_level: 65000 + Math.random() * 5000,
            resistance_level: 70000 + Math.random() * 5000
        };
    }

    calculateOverallSentiment(analysis) {
        let score = 0;
        
        // Fear & Greed (peso 30%)
        const fearGreed = analysis.fearGreedIndex.sentiment;
        if (fearGreed === 'EXTREME_GREED' || fearGreed === 'GREED') score += 30;
        else if (fearGreed === 'NEUTRAL') score += 15;
        
        // BTC Dominance (peso 20%)
        if (analysis.btcDominance.trend === 'INCREASING') score += 20;
        else if (analysis.btcDominance.trend === 'DECREASING') score += 10;
        
        // Top100 Movement (peso 30%)
        const top100 = analysis.top100Movement.trend;
        if (top100 === 'BULLISH') score += 30;
        else if (top100 === 'NEUTRAL') score += 15;
        
        // Technical Indicators (peso 20%)
        if (analysis.technicalIndicators.rsi < 40) score += 20; // Oversold
        else if (analysis.technicalIndicators.rsi < 60) score += 10;
        
        // Determinar sentiment final
        if (score >= 70) return 'VERY_BULLISH';
        else if (score >= 50) return 'BULLISH';
        else if (score >= 30) return 'NEUTRAL';
        else if (score >= 15) return 'BEARISH';
        else return 'VERY_BEARISH';
    }

    getDefaultAnalysis(symbol) {
        return {
            symbol,
            timestamp: new Date().toISOString(),
            fearGreedIndex: { value: 50, sentiment: 'NEUTRAL' },
            btcDominance: { percentage: 50, trend: 'NEUTRAL' },
            top100Movement: { green_percentage: 50, trend: 'NEUTRAL' },
            technicalIndicators: { rsi: 50, macd_signal: 'NEUTRAL' },
            sentiment: 'NEUTRAL',
            error: 'Usando análise padrão devido a erro'
        };
    }
}

module.exports = MarketAnalyzer;
