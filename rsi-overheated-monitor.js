/**
 * 🔍 MONITOR RSI E ALERTAS DE SOBRECOMPRA/SOBREVENDA
 * Sistema avançado de análise RSI com múltiplos timeframes
 * Implementa alertas inteligentes baseados em condições extremas
 */

const axios = require('axios');
const { Pool } = require('pg');

class RSIOverheatedMonitor {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coinbitclub',
            ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
        });

        // Cache e configurações
        this.rsiCache = new Map();
        this.lastUpdate = null;
        this.updateInterval = 5 * 60 * 1000; // 5 minutos
        
        // Configurações RSI
        this.rsiConfig = {
            period: 14,
            overboughtLevel: 70,
            oversoldLevel: 30,
            extremeOverbought: 80,
            extremeOversold: 20
        };

        console.log('📊 RSI Overheated Monitor iniciado');
        console.log(`🔍 Monitoramento: Sobrecompra(${this.rsiConfig.overboughtLevel}) | Sobrevenda(${this.rsiConfig.oversoldLevel})`);
    }

    /**
     * 📊 ANÁLISE COMPLETA RSI MULTI-TIMEFRAME
     */
    async analyzeMarketRSI() {
        try {
            // Analisar múltiplas moedas importantes
            const coins = ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 'polkadot', 'chainlink', 'litecoin'];
            
            const rsiAnalysis = {
                individual: {},
                marketOverview: null,
                alerts: [],
                conditions: null,
                recommendation: null,
                timestamp: new Date()
            };

            // Analisar cada moeda individualmente
            for (const coin of coins) {
                rsiAnalysis.individual[coin] = await this.calculateCoinRSI(coin);
            }

            // Análise do mercado geral
            rsiAnalysis.marketOverview = this.calculateMarketOverview(rsiAnalysis.individual);
            
            // Detectar condições extremas
            rsiAnalysis.conditions = this.detectExtremeConditions(rsiAnalysis.individual, rsiAnalysis.marketOverview);
            
            // Gerar alertas
            rsiAnalysis.alerts = this.generateRSIAlerts(rsiAnalysis.conditions, rsiAnalysis.individual);
            
            // Gerar recomendação
            rsiAnalysis.recommendation = this.generateTradingRecommendation(rsiAnalysis.conditions, rsiAnalysis.marketOverview);

            // Salvar análise
            await this.saveRSIAnalysis(rsiAnalysis);

            return rsiAnalysis;

        } catch (error) {
            console.error('❌ Erro na análise RSI:', error.message);
            return this.getFallbackRSIAnalysis();
        }
    }

    /**
     * 💰 CALCULAR RSI PARA UMA MOEDA ESPECÍFICA
     */
    async calculateCoinRSI(coinId) {
        try {
            // Obter dados históricos de preço (30 dias para cálculo RSI)
            const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
                params: {
                    vs_currency: 'usd',
                    days: '30',
                    interval: 'hourly'
                }
            });

            const prices = response.data.prices.map(p => p[1]);
            
            // Calcular RSI
            const rsi = this.calculateRSI(prices, this.rsiConfig.period);
            const currentPrice = prices[prices.length - 1];
            
            // Análise adicional
            const analysis = {
                coin: coinId,
                currentRSI: rsi,
                currentPrice: currentPrice,
                classification: this.classifyRSI(rsi),
                alertLevel: this.getRSIAlertLevel(rsi),
                priceChange24h: await this.getPriceChange24h(coinId),
                divergenceSignal: this.detectDivergence(prices, this.calculateRSIArray(prices)),
                recommendation: this.getCoinRecommendation(rsi, coinId)
            };

            // Cache para otimização
            this.rsiCache.set(coinId, {
                data: analysis,
                timestamp: new Date()
            });

            return analysis;

        } catch (error) {
            console.warn(`⚠️ Erro no RSI para ${coinId}:`, error.message);
            return this.getFallbackCoinRSI(coinId);
        }
    }

    /**
     * 📈 CALCULAR RSI (RELATIVE STRENGTH INDEX)
     */
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50; // Fallback

        const gains = [];
        const losses = [];

        // Calcular ganhos e perdas
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        // Calcular médias móveis
        const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
        const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

        if (avgLoss === 0) return 100; // Apenas ganhos
        
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return Math.round(rsi * 100) / 100;
    }

    /**
     * 📊 CALCULAR ARRAY DE RSI PARA DETECTAR DIVERGÊNCIAS
     */
    calculateRSIArray(prices, period = 14) {
        const rsiArray = [];
        
        for (let i = period; i < prices.length; i++) {
            const periodPrices = prices.slice(i - period, i + 1);
            const rsi = this.calculateRSI(periodPrices, period);
            rsiArray.push(rsi);
        }
        
        return rsiArray;
    }

    /**
     * 🔍 DETECTAR DIVERGÊNCIAS RSI-PREÇO
     */
    detectDivergence(prices, rsiArray) {
        if (prices.length < 10 || rsiArray.length < 10) return 'NONE';

        const recentPrices = prices.slice(-10);
        const recentRSI = rsiArray.slice(-10);

        // Tendência de preços
        const priceStart = recentPrices[0];
        const priceEnd = recentPrices[recentPrices.length - 1];
        const priceTrend = priceEnd > priceStart ? 'UP' : 'DOWN';

        // Tendência RSI
        const rsiStart = recentRSI[0];
        const rsiEnd = recentRSI[recentRSI.length - 1];
        const rsiTrend = rsiEnd > rsiStart ? 'UP' : 'DOWN';

        // Detectar divergência
        if (priceTrend === 'UP' && rsiTrend === 'DOWN') return 'BEARISH_DIVERGENCE';
        if (priceTrend === 'DOWN' && rsiTrend === 'UP') return 'BULLISH_DIVERGENCE';
        
        return 'NONE';
    }

    /**
     * 📊 ANÁLISE GERAL DO MERCADO
     */
    calculateMarketOverview(individualAnalysis) {
        const coins = Object.values(individualAnalysis);
        
        if (coins.length === 0) return this.getFallbackMarketOverview();

        const avgRSI = coins.reduce((sum, coin) => sum + coin.currentRSI, 0) / coins.length;
        
        const overboughtCoins = coins.filter(c => c.currentRSI > this.rsiConfig.overboughtLevel);
        const oversoldCoins = coins.filter(c => c.currentRSI < this.rsiConfig.oversoldLevel);
        const extremeCoins = coins.filter(c => 
            c.currentRSI > this.rsiConfig.extremeOverbought || 
            c.currentRSI < this.rsiConfig.extremeOversold
        );

        return {
            averageRSI: Math.round(avgRSI * 100) / 100,
            totalCoins: coins.length,
            overboughtCount: overboughtCoins.length,
            oversoldCount: oversoldCoins.length,
            extremeCount: extremeCoins.length,
            marketClassification: this.classifyMarketRSI(avgRSI),
            dominantCondition: this.getDominantCondition(overboughtCoins.length, oversoldCoins.length),
            riskLevel: this.calculateMarketRiskLevel(avgRSI, extremeCoins.length)
        };
    }

    /**
     * 🚨 DETECTAR CONDIÇÕES EXTREMAS
     */
    detectExtremeConditions(individualAnalysis, marketOverview) {
        const conditions = {
            marketOverheated: false,
            marketOversold: false,
            massiveBullishDivergence: false,
            massiveBearishDivergence: false,
            extremeRiskLevel: 'NORMAL'
        };

        // Condições de mercado
        if (marketOverview.averageRSI > this.rsiConfig.overboughtLevel && 
            marketOverview.overboughtCount > marketOverview.totalCoins * 0.6) {
            conditions.marketOverheated = true;
        }

        if (marketOverview.averageRSI < this.rsiConfig.oversoldLevel && 
            marketOverview.oversoldCount > marketOverview.totalCoins * 0.6) {
            conditions.marketOversold = true;
        }

        // Divergências massivas
        const coins = Object.values(individualAnalysis);
        const bullishDivergences = coins.filter(c => c.divergenceSignal === 'BULLISH_DIVERGENCE').length;
        const bearishDivergences = coins.filter(c => c.divergenceSignal === 'BEARISH_DIVERGENCE').length;

        if (bullishDivergences > coins.length * 0.5) {
            conditions.massiveBullishDivergence = true;
        }

        if (bearishDivergences > coins.length * 0.5) {
            conditions.massiveBearishDivergence = true;
        }

        // Nível de risco extremo
        if (marketOverview.extremeCount > marketOverview.totalCoins * 0.4) {
            conditions.extremeRiskLevel = 'HIGH';
        }

        return conditions;
    }

    /**
     * 🚨 GERAR ALERTAS RSI
     */
    generateRSIAlerts(conditions, individualAnalysis) {
        const alerts = [];

        // Alerta de mercado superaquecido
        if (conditions.marketOverheated) {
            alerts.push({
                type: 'MARKET_OVERHEATED',
                severity: 'HIGH',
                message: 'Mercado em sobrecompra extrema - RSI elevado na maioria das moedas',
                recommendation: 'REDUCE_LONG_POSITIONS',
                action: 'SELL_PRESSURE_EXPECTED'
            });
        }

        // Alerta de mercado sobrevendido
        if (conditions.marketOversold) {
            alerts.push({
                type: 'MARKET_OVERSOLD',
                severity: 'HIGH',
                message: 'Mercado em sobrevenda extrema - RSI baixo na maioria das moedas',
                recommendation: 'CONSIDER_LONG_POSITIONS',
                action: 'BUY_OPPORTUNITY'
            });
        }

        // Alertas de divergência massiva
        if (conditions.massiveBullishDivergence) {
            alerts.push({
                type: 'MASSIVE_BULLISH_DIVERGENCE',
                severity: 'MEDIUM',
                message: 'Divergência bullish detectada em múltiplas moedas',
                recommendation: 'PREPARE_FOR_REVERSAL_UP',
                action: 'BULLISH_REVERSAL_SIGNAL'
            });
        }

        if (conditions.massiveBearishDivergence) {
            alerts.push({
                type: 'MASSIVE_BEARISH_DIVERGENCE',
                severity: 'MEDIUM',
                message: 'Divergência bearish detectada em múltiplas moedas',
                recommendation: 'PREPARE_FOR_REVERSAL_DOWN',
                action: 'BEARISH_REVERSAL_SIGNAL'
            });
        }

        // Alertas individuais para moedas em extremos
        const coins = Object.values(individualAnalysis);
        coins.forEach(coin => {
            if (coin.currentRSI > this.rsiConfig.extremeOverbought) {
                alerts.push({
                    type: 'COIN_EXTREME_OVERBOUGHT',
                    severity: 'MEDIUM',
                    coin: coin.coin,
                    message: `${coin.coin.toUpperCase()} em sobrecompra extrema (RSI: ${coin.currentRSI})`,
                    recommendation: 'AVOID_LONG_POSITIONS',
                    action: 'INDIVIDUAL_SELL_SIGNAL'
                });
            }

            if (coin.currentRSI < this.rsiConfig.extremeOversold) {
                alerts.push({
                    type: 'COIN_EXTREME_OVERSOLD',
                    severity: 'MEDIUM',
                    coin: coin.coin,
                    message: `${coin.coin.toUpperCase()} em sobrevenda extrema (RSI: ${coin.currentRSI})`,
                    recommendation: 'CONSIDER_LONG_POSITION',
                    action: 'INDIVIDUAL_BUY_SIGNAL'
                });
            }
        });

        return alerts;
    }

    /**
     * 💡 GERAR RECOMENDAÇÃO DE TRADING
     */
    generateTradingRecommendation(conditions, marketOverview) {
        let action = 'HOLD';
        let confidence = 0.5;
        let reasoning = [];
        let riskLevel = 'NORMAL';

        // Análise de condições extremas
        if (conditions.marketOverheated) {
            action = 'REDUCE_EXPOSURE';
            confidence = 0.8;
            reasoning.push('Mercado em sobrecompra extrema');
            riskLevel = 'HIGH';
        } else if (conditions.marketOversold) {
            action = 'INCREASE_EXPOSURE';
            confidence = 0.8;
            reasoning.push('Mercado em sobrevenda extrema');
            riskLevel = 'OPPORTUNITY';
        }

        // Análise de divergências
        if (conditions.massiveBullishDivergence) {
            action = action === 'HOLD' ? 'PREPARE_LONG' : action;
            reasoning.push('Sinais de reversão bullish');
            confidence = Math.min(confidence + 0.2, 0.9);
        }

        if (conditions.massiveBearishDivergence) {
            action = action === 'HOLD' ? 'PREPARE_SHORT' : action;
            reasoning.push('Sinais de reversão bearish');
            confidence = Math.min(confidence + 0.2, 0.9);
        }

        return {
            action: action,
            confidence: confidence,
            reasoning: reasoning,
            riskLevel: riskLevel,
            timeframe: 'SHORT_TO_MEDIUM', // 24-72h
            marketRSI: marketOverview.averageRSI,
            urgency: this.calculateUrgency(conditions, marketOverview)
        };
    }

    /**
     * 🔧 MÉTODOS AUXILIARES
     */
    classifyRSI(rsi) {
        if (rsi >= this.rsiConfig.extremeOverbought) return 'EXTREME_OVERBOUGHT';
        if (rsi >= this.rsiConfig.overboughtLevel) return 'OVERBOUGHT';
        if (rsi <= this.rsiConfig.extremeOversold) return 'EXTREME_OVERSOLD';
        if (rsi <= this.rsiConfig.oversoldLevel) return 'OVERSOLD';
        if (rsi > 60) return 'STRONG';
        if (rsi < 40) return 'WEAK';
        return 'NEUTRAL';
    }

    getRSIAlertLevel(rsi) {
        if (rsi >= this.rsiConfig.extremeOverbought || rsi <= this.rsiConfig.extremeOversold) return 'EXTREME';
        if (rsi >= this.rsiConfig.overboughtLevel || rsi <= this.rsiConfig.oversoldLevel) return 'HIGH';
        if (rsi > 65 || rsi < 35) return 'MODERATE';
        return 'NONE';
    }

    async getPriceChange24h(coinId) {
        try {
            const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
                params: {
                    ids: coinId,
                    vs_currencies: 'usd',
                    include_24hr_change: true
                }
            });
            return response.data[coinId]?.usd_24h_change || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 💾 SALVAR ANÁLISE RSI
     */
    async saveRSIAnalysis(analysis) {
        try {
            await this.pool.query(`
                INSERT INTO rsi_overheated_log (
                    market_rsi, individual_analysis, conditions,
                    alerts, recommendation, created_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
            `, [
                analysis.marketOverview.averageRSI,
                JSON.stringify(analysis.individual),
                JSON.stringify(analysis.conditions),
                JSON.stringify(analysis.alerts),
                JSON.stringify(analysis.recommendation)
            ]);
        } catch (error) {
            console.error('❌ Erro ao salvar análise RSI:', error.message);
        }
    }

    /**
     * 🔄 FALLBACKS
     */
    getFallbackRSIAnalysis() {
        return {
            individual: {},
            marketOverview: this.getFallbackMarketOverview(),
            alerts: [],
            conditions: { marketOverheated: false, marketOversold: false },
            recommendation: { action: 'HOLD', confidence: 0.5 }
        };
    }

    getFallbackCoinRSI(coinId) {
        return {
            coin: coinId,
            currentRSI: 50,
            classification: 'NEUTRAL',
            alertLevel: 'NONE',
            divergenceSignal: 'NONE',
            recommendation: 'HOLD'
        };
    }

    getFallbackMarketOverview() {
        return {
            averageRSI: 50,
            totalCoins: 0,
            overboughtCount: 0,
            oversoldCount: 0,
            extremeCount: 0,
            marketClassification: 'NEUTRAL',
            dominantCondition: 'BALANCED',
            riskLevel: 'LOW'
        };
    }

    classifyMarketRSI(avgRSI) {
        if (avgRSI >= 70) return 'OVERBOUGHT';
        if (avgRSI >= 60) return 'STRONG';
        if (avgRSI <= 30) return 'OVERSOLD';
        if (avgRSI <= 40) return 'WEAK';
        return 'NEUTRAL';
    }

    getDominantCondition(overboughtCount, oversoldCount) {
        if (overboughtCount > oversoldCount * 2) return 'OVERBOUGHT_DOMINANT';
        if (oversoldCount > overboughtCount * 2) return 'OVERSOLD_DOMINANT';
        return 'BALANCED';
    }

    calculateMarketRiskLevel(avgRSI, extremeCount) {
        if (extremeCount > 3) return 'HIGH';
        if (avgRSI > 75 || avgRSI < 25) return 'HIGH';
        if (avgRSI > 65 || avgRSI < 35) return 'MODERATE';
        return 'LOW';
    }

    getCoinRecommendation(rsi, coinId) {
        if (rsi >= this.rsiConfig.extremeOverbought) return `STRONG_SELL_${coinId.toUpperCase()}`;
        if (rsi >= this.rsiConfig.overboughtLevel) return `SELL_${coinId.toUpperCase()}`;
        if (rsi <= this.rsiConfig.extremeOversold) return `STRONG_BUY_${coinId.toUpperCase()}`;
        if (rsi <= this.rsiConfig.oversoldLevel) return `BUY_${coinId.toUpperCase()}`;
        return `HOLD_${coinId.toUpperCase()}`;
    }

    calculateUrgency(conditions, marketOverview) {
        if (conditions.marketOverheated || conditions.marketOversold) return 'HIGH';
        if (conditions.massiveBullishDivergence || conditions.massiveBearishDivergence) return 'MEDIUM';
        if (marketOverview.extremeCount > 0) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * � OBTER RSI ESPECÍFICO PARA UM TICKER
     */
    async getRSIForTicker(ticker, period = 15) {
        try {
            // Converter ticker para formato Binance se necessário
            let symbol = ticker;
            if (!ticker.endsWith('USDT')) {
                symbol = ticker + 'USDT';
            }

            const url = `https://api.binance.com/api/v3/klines`;
            const response = await axios.get(url, {
                params: {
                    symbol: symbol,
                    interval: '15m', // 15 minutos para RSI_15
                    limit: period + 20 // Dados extras para cálculo preciso
                },
                timeout: 5000
            });

            if (!response.data || response.data.length < period) {
                console.warn(`⚠️ Dados insuficientes para calcular RSI_${period} de ${ticker}`);
                return null;
            }

            // Calcular RSI
            const closes = response.data.map(candle => parseFloat(candle[4]));
            const rsi = this.calculateRSI(closes, period);
            
            return {
                ticker: ticker,
                rsi: rsi,
                period: period,
                timestamp: new Date(),
                recommendation: this.getCoinRecommendation(rsi, ticker)
            };

        } catch (error) {
            console.warn(`⚠️ Erro ao obter RSI_${period} para ${ticker}:`, error.message);
            return null;
        }
    }

    /**
     * 🔢 CALCULAR RSI MANUAL
     */
    calculateRSI(closes, period = 14) {
        if (closes.length < period + 1) return null;

        let gains = [];
        let losses = [];

        // Calcular ganhos e perdas
        for (let i = 1; i < closes.length; i++) {
            const change = closes[i] - closes[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        // Calcular médias iniciais
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

        // RSI Wilder smoothing
        for (let i = period; i < gains.length; i++) {
            avgGain = (avgGain * (period - 1) + gains[i]) / period;
            avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        }

        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return Math.round(rsi * 100) / 100; // 2 casas decimais
    }

    /**
     * �🚀 MONITORAMENTO CONTÍNUO
     */
    startContinuousMonitoring() {
        console.log('🔄 Iniciando monitoramento contínuo RSI...');
        
        setInterval(async () => {
            try {
                const analysis = await this.analyzeMarketRSI();
                
                if (analysis.alerts.length > 0) {
                    console.log(`🚨 ${analysis.alerts.length} alertas RSI detectados!`);
                    analysis.alerts.forEach(alert => {
                        console.log(`⚠️ ${alert.type}: ${alert.message}`);
                    });
                }
                
            } catch (error) {
                console.error('❌ Erro no monitoramento RSI:', error.message);
            }
        }, this.updateInterval);
    }
}

module.exports = RSIOverheatedMonitor;
