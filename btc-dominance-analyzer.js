/**
 * 🔍 ANALISADOR DE DOMINÂNCIA BTC E CORRELAÇÕES
 * Sistema para análise da dominância do Bitcoin e correlação com altcoins
 * Implementa alertas baseados em RSI e Fear & Greed
 */

const axios = require('axios');
const { Pool } = require('pg');

class BTCDominanceAnalyzer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coinbitclub',
            ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
        });

        // Cache para otimização
        this.lastDominanceData = null;
        this.lastAltcoinAnalysis = null;
        this.lastUpdate = null;

        console.log('📊 BTC Dominance Analyzer iniciado');
        console.log('🔍 Monitoramento de correlações ativo');
    }

    /**
     * 📊 ANALISAR DOMINÂNCIA DO BTC E CORRELAÇÃO COM ALTCOINS
     */
    async analyzeBTCDominanceCorrelation() {
        try {
            // Coletar dados de dominância do BTC
            const dominanceData = await this.getBTCDominance();
            
            // Analisar performance das altcoins
            const altcoinPerformance = await this.analyzeAltcoinPerformance();
            
            // Calcular correlação
            const correlation = this.calculateCorrelation(dominanceData, altcoinPerformance);
            
            // Avaliar condições de mercado
            const marketConditions = await this.evaluateMarketConditions();
            
            // Gerar análise completa
            const analysis = {
                btcDominance: dominanceData,
                altcoinPerformance: altcoinPerformance,
                correlation: correlation,
                marketConditions: marketConditions,
                alerts: this.generateAlerts(dominanceData, altcoinPerformance, marketConditions),
                recommendation: this.generateRecommendation(correlation, marketConditions),
                timestamp: new Date()
            };

            // Atualizar cache
            this.lastDominanceData = dominanceData;
            this.lastAltcoinAnalysis = altcoinPerformance;
            this.lastUpdate = new Date();

            // Salvar no banco para histórico
            await this.saveDominanceAnalysis(analysis);

            return analysis;

        } catch (error) {
            console.error('❌ Erro na análise de dominância:', error.message);
            return this.getFallbackAnalysis();
        }
    }

    /**
     * 📈 OBTER DOMINÂNCIA DO BITCOIN
     */
    async getBTCDominance() {
        try {
            // API CoinGecko para dados globais
            const response = await axios.get('https://api.coingecko.com/api/v3/global');
            const globalData = response.data.data;

            const dominanceData = {
                btcDominance: globalData.market_cap_percentage.btc,
                ethDominance: globalData.market_cap_percentage.eth,
                totalMarketCap: globalData.total_market_cap.usd,
                totalVolume: globalData.total_volume.usd,
                dominanceChange24h: this.calculateDominanceChange(globalData.market_cap_percentage.btc),
                classification: this.classifyDominance(globalData.market_cap_percentage.btc)
            };

            console.log(`📊 BTC Dominância: ${dominanceData.btcDominance.toFixed(2)}% (${dominanceData.classification})`);

            return dominanceData;

        } catch (error) {
            console.warn('⚠️ Erro ao obter dominância, usando dados neutros');
            return {
                btcDominance: 50.0,
                ethDominance: 15.0,
                totalMarketCap: 2000000000000,
                totalVolume: 50000000000,
                dominanceChange24h: 0,
                classification: 'NEUTRAL'
            };
        }
    }

    /**
     * 🏷️ CLASSIFICAR DOMINÂNCIA DO BTC
     */
    classifyDominance(dominance) {
        if (dominance > 60) return 'HIGH_DOMINANCE'; // BTC dominante
        if (dominance > 50) return 'MODERATE_HIGH';
        if (dominance > 40) return 'BALANCED';
        if (dominance > 30) return 'MODERATE_LOW';
        return 'LOW_DOMINANCE'; // Altseason potencial
    }

    /**
     * 📊 ANALISAR PERFORMANCE DAS ALTCOINS
     */
    async analyzeAltcoinPerformance() {
        try {
            // Buscar TOP altcoins (excluindo BTC)
            const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 50,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '24h,7d'
                }
            });

            const coins = response.data.filter(coin => coin.id !== 'bitcoin'); // Excluir BTC
            
            const altcoinAnalysis = {
                totalAltcoins: coins.length,
                positiveAltcoins24h: coins.filter(c => c.price_change_percentage_24h > 0).length,
                negativeAltcoins24h: coins.filter(c => c.price_change_percentage_24h < 0).length,
                avgChange24h: coins.reduce((sum, c) => sum + (c.price_change_percentage_24h || 0), 0) / coins.length,
                avgChange7d: coins.reduce((sum, c) => sum + (c.price_change_percentage_7d_in_currency || 0), 0) / coins.length,
                strongPerformers: coins.filter(c => c.price_change_percentage_24h > 5).length,
                weakPerformers: coins.filter(c => c.price_change_percentage_24h < -5).length,
                trend: this.classifyAltcoinTrend(coins)
            };

            altcoinAnalysis.dominanceScore = this.calculateAltcoinDominanceScore(altcoinAnalysis);

            return altcoinAnalysis;

        } catch (error) {
            console.warn('⚠️ Erro na análise de altcoins');
            return {
                totalAltcoins: 50,
                positiveAltcoins24h: 25,
                negativeAltcoins24h: 25,
                avgChange24h: 0,
                avgChange7d: 0,
                strongPerformers: 5,
                weakPerformers: 5,
                trend: 'NEUTRAL',
                dominanceScore: 0.5
            };
        }
    }

    /**
     * 🏷️ CLASSIFICAR TENDÊNCIA DAS ALTCOINS
     */
    classifyAltcoinTrend(coins) {
        const positiveRatio = coins.filter(c => c.price_change_percentage_24h > 0).length / coins.length;
        const strongPositiveRatio = coins.filter(c => c.price_change_percentage_24h > 3).length / coins.length;
        
        if (strongPositiveRatio > 0.4) return 'STRONG_ALTSEASON';
        if (positiveRatio > 0.7) return 'ALTSEASON';
        if (positiveRatio > 0.6) return 'ALTCOIN_STRENGTH';
        if (positiveRatio < 0.3) return 'ALTCOIN_WEAKNESS';
        if (positiveRatio < 0.4) return 'BTC_DOMINANCE_RISING';
        return 'NEUTRAL';
    }

    /**
     * 📊 CALCULAR SCORE DE DOMINÂNCIA DAS ALTCOINS
     */
    calculateAltcoinDominanceScore(altcoinAnalysis) {
        const positiveRatio = altcoinAnalysis.positiveAltcoins24h / altcoinAnalysis.totalAltcoins;
        const strongRatio = altcoinAnalysis.strongPerformers / altcoinAnalysis.totalAltcoins;
        
        // Score baseado na performance geral
        let score = positiveRatio * 0.7 + strongRatio * 0.3;
        
        // Ajustar baseado na média de mudança
        if (altcoinAnalysis.avgChange24h > 5) score += 0.1;
        if (altcoinAnalysis.avgChange24h < -5) score -= 0.1;
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * 📊 CALCULAR CORRELAÇÃO BTC-ALTCOINS
     */
    calculateCorrelation(btcData, altcoinData) {
        // Correlação baseada na dominância vs performance altcoins
        const dominanceScore = btcData.btcDominance / 100;
        const altcoinScore = altcoinData.dominanceScore;
        
        // Correlação inversa esperada: alta dominância BTC = baixa performance altcoins
        const expectedInverseCorrelation = 1 - dominanceScore;
        const actualAltcoinPerformance = altcoinScore;
        
        const correlation = 1 - Math.abs(expectedInverseCorrelation - actualAltcoinPerformance);
        
        return {
            value: correlation,
            strength: this.classifyCorrelationStrength(correlation),
            direction: dominanceScore > 0.5 ? 'BTC_FAVORING' : 'ALTCOIN_FAVORING',
            description: this.describeCorrelation(correlation, dominanceScore, altcoinScore)
        };
    }

    /**
     * 🏷️ CLASSIFICAR FORÇA DA CORRELAÇÃO
     */
    classifyCorrelationStrength(correlation) {
        if (correlation > 0.8) return 'VERY_STRONG';
        if (correlation > 0.6) return 'STRONG';
        if (correlation > 0.4) return 'MODERATE';
        if (correlation > 0.2) return 'WEAK';
        return 'VERY_WEAK';
    }

    /**
     * 📝 DESCREVER CORRELAÇÃO
     */
    describeCorrelation(correlation, dominanceScore, altcoinScore) {
        const strength = this.classifyCorrelationStrength(correlation);
        const direction = dominanceScore > 0.5 ? 'BTC dominante' : 'Altcoins dominantes';
        return `Correlação ${strength.toLowerCase()} - ${direction}`;
    }

    /**
     * 🔍 AVALIAR CONDIÇÕES DE MERCADO (RSI + FEAR & GREED)
     */
    async evaluateMarketConditions() {
        try {
            // Obter Fear & Greed
            const fearGreedResponse = await axios.get('https://api.alternative.me/fng/');
            const fearGreed = parseInt(fearGreedResponse.data.data[0].value);
            
            // Simular RSI (em implementação real, usar dados de preço)
            const rsi = await this.calculateMarketRSI();
            
            const conditions = {
                fearGreed: {
                    value: fearGreed,
                    classification: this.classifyFearGreed(fearGreed),
                    alert: this.getFearGreedAlert(fearGreed)
                },
                rsi: {
                    value: rsi,
                    classification: this.classifyRSI(rsi),
                    alert: this.getRSIAlert(rsi)
                },
                overallCondition: this.getOverallCondition(fearGreed, rsi),
                tradingRecommendation: this.getTradingRecommendation(fearGreed, rsi)
            };

            return conditions;

        } catch (error) {
            console.warn('⚠️ Erro ao avaliar condições de mercado');
            return {
                fearGreed: { value: 50, classification: 'NEUTRAL', alert: 'NONE' },
                rsi: { value: 50, classification: 'NEUTRAL', alert: 'NONE' },
                overallCondition: 'NEUTRAL',
                tradingRecommendation: 'CAUTIOUS'
            };
        }
    }

    /**
     * 📊 CALCULAR RSI DO MERCADO (SIMULADO)
     */
    async calculateMarketRSI() {
        try {
            // Em implementação real, calcular RSI baseado em dados de preço
            // Por enquanto, simulação baseada na variação do TOP 100
            const marketData = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 100,
                    page: 1,
                    price_change_percentage: '24h'
                }
            });
            
            const coins = marketData.data;
            const positiveCount = coins.filter(c => c.price_change_percentage_24h > 0).length;
            const rsiEstimate = (positiveCount / coins.length) * 100;
            
            return Math.min(100, Math.max(0, rsiEstimate));
            
        } catch (error) {
            return 50; // RSI neutro como fallback
        }
    }

    /**
     * 🚨 GERAR ALERTAS
     */
    generateAlerts(btcData, altcoinData, marketConditions) {
        const alerts = [];
        
        // Alertas de sobrecompra/sobrevenda
        if (marketConditions.rsi.value > 70 && marketConditions.fearGreed.value > 75) {
            alerts.push({
                type: 'OVERBOUGHT_EXTREME',
                severity: 'HIGH',
                message: 'Mercado em sobrecompra extrema (RSI + Fear & Greed altos)',
                recommendation: 'REDUCE_LONG_POSITIONS'
            });
        }
        
        if (marketConditions.rsi.value < 30 && marketConditions.fearGreed.value < 25) {
            alerts.push({
                type: 'OVERSOLD_EXTREME',
                severity: 'HIGH',
                message: 'Mercado em sobrevenda extrema (RSI + Fear & Greed baixos)',
                recommendation: 'CONSIDER_LONG_POSITIONS'
            });
        }
        
        // Alertas de dominância
        if (btcData.btcDominance > 60 && altcoinData.trend === 'ALTCOIN_WEAKNESS') {
            alerts.push({
                type: 'BTC_DOMINANCE_HIGH',
                severity: 'MEDIUM',
                message: 'Alta dominância BTC com fraqueza altcoins',
                recommendation: 'FAVOR_BTC_TRADES'
            });
        }
        
        if (btcData.btcDominance < 40 && altcoinData.trend === 'STRONG_ALTSEASON') {
            alerts.push({
                type: 'ALTSEASON_ACTIVE',
                severity: 'MEDIUM',
                message: 'Possível altseason em andamento',
                recommendation: 'CONSIDER_ALTCOIN_TRADES'
            });
        }
        
        return alerts;
    }

    /**
     * 💡 GERAR RECOMENDAÇÃO DE TRADING
     */
    generateRecommendation(correlation, marketConditions) {
        const fearGreed = marketConditions.fearGreed.value;
        const rsi = marketConditions.rsi.value;
        
        let recommendation = 'NEUTRAL';
        let reasoning = [];
        
        // Análise de sobrecompra/sobrevenda
        if (rsi > 70 && fearGreed > 75) {
            recommendation = 'REDUCE_EXPOSURE';
            reasoning.push('Mercado sobrecomprado');
        } else if (rsi < 30 && fearGreed < 25) {
            recommendation = 'INCREASE_EXPOSURE';
            reasoning.push('Mercado sobrevendido');
        }
        
        // Análise de correlação
        if (correlation.strength === 'STRONG') {
            if (correlation.direction === 'BTC_FAVORING') {
                reasoning.push('Favorece trading em BTC');
            } else {
                reasoning.push('Favorece trading em altcoins');
            }
        }
        
        return {
            action: recommendation,
            confidence: this.calculateConfidence(correlation, marketConditions),
            reasoning: reasoning,
            timeframe: 'SHORT_TERM', // 24-48h
            riskLevel: this.assessRiskLevel(marketConditions)
        };
    }

    /**
     * 📊 MÉTODOS AUXILIARES
     */
    classifyFearGreed(value) {
        if (value <= 20) return 'EXTREME_FEAR';
        if (value <= 40) return 'FEAR';
        if (value <= 60) return 'NEUTRAL';
        if (value <= 80) return 'GREED';
        return 'EXTREME_GREED';
    }

    classifyRSI(value) {
        if (value <= 30) return 'OVERSOLD';
        if (value <= 50) return 'WEAK';
        if (value <= 70) return 'STRONG';
        return 'OVERBOUGHT';
    }

    getFearGreedAlert(value) {
        if (value <= 20 || value >= 80) return 'EXTREME';
        if (value <= 30 || value >= 70) return 'HIGH';
        return 'NONE';
    }

    getRSIAlert(value) {
        if (value <= 30 || value >= 70) return 'EXTREME';
        if (value <= 40 || value >= 60) return 'MODERATE';
        return 'NONE';
    }

    getOverallCondition(fearGreed, rsi) {
        if (fearGreed <= 25 && rsi <= 30) return 'EXTREME_OVERSOLD';
        if (fearGreed >= 75 && rsi >= 70) return 'EXTREME_OVERBOUGHT';
        if (fearGreed <= 40 && rsi <= 40) return 'BEARISH';
        if (fearGreed >= 60 && rsi >= 60) return 'BULLISH';
        return 'NEUTRAL';
    }

    getTradingRecommendation(fearGreed, rsi) {
        const condition = this.getOverallCondition(fearGreed, rsi);
        
        switch (condition) {
            case 'EXTREME_OVERSOLD': return 'STRONG_BUY';
            case 'EXTREME_OVERBOUGHT': return 'STRONG_SELL';
            case 'BEARISH': return 'CAUTIOUS_SELL';
            case 'BULLISH': return 'CAUTIOUS_BUY';
            default: return 'HOLD';
        }
    }

    calculateConfidence(correlation, marketConditions) {
        let confidence = correlation.value;
        
        // Ajustar baseado nas condições de mercado
        if (marketConditions.overallCondition === 'EXTREME_OVERSOLD' || 
            marketConditions.overallCondition === 'EXTREME_OVERBOUGHT') {
            confidence += 0.2;
        }
        
        return Math.max(0, Math.min(1, confidence));
    }

    assessRiskLevel(marketConditions) {
        if (marketConditions.overallCondition.includes('EXTREME')) return 'HIGH';
        if (marketConditions.overallCondition === 'NEUTRAL') return 'LOW';
        return 'MODERATE';
    }

    calculateDominanceChange(currentDominance) {
        // Simulação de mudança (em implementação real, usar dados históricos)
        return (Math.random() - 0.5) * 2; // -1% a +1%
    }

    /**
     * 💾 SALVAR ANÁLISE NO BANCO
     */
    async saveDominanceAnalysis(analysis) {
        try {
            await this.pool.query(`
                INSERT INTO btc_dominance_analysis (
                    btc_dominance, altcoin_performance, correlation_value,
                    market_conditions, alerts, recommendation, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
                JSON.stringify(analysis.btcDominance),
                JSON.stringify(analysis.altcoinPerformance),
                analysis.correlation.value,
                JSON.stringify(analysis.marketConditions),
                JSON.stringify(analysis.alerts),
                JSON.stringify(analysis.recommendation)
            ]);
        } catch (error) {
            console.error('❌ Erro ao salvar análise:', error.message);
        }
    }

    /**
     * 🔄 OBTER ANÁLISE ATUAL
     */
    async getCurrentAnalysis() {
        if (!this.lastUpdate || (Date.now() - this.lastUpdate.getTime()) > 10 * 60 * 1000) {
            // Atualizar se dados estão antigos (>10min)
            return await this.analyzeBTCDominanceCorrelation();
        }
        
        return {
            btcDominance: this.lastDominanceData,
            altcoinPerformance: this.lastAltcoinAnalysis,
            lastUpdate: this.lastUpdate
        };
    }

    /**
     * 🔄 FALLBACK PARA ERROS
     */
    getFallbackAnalysis() {
        return {
            btcDominance: { btcDominance: 50, classification: 'NEUTRAL' },
            altcoinPerformance: { trend: 'NEUTRAL', dominanceScore: 0.5 },
            correlation: { value: 0.5, strength: 'MODERATE', direction: 'NEUTRAL' },
            marketConditions: { overallCondition: 'NEUTRAL' },
            alerts: [],
            recommendation: { action: 'NEUTRAL', confidence: 0.5 }
        };
    }
}

module.exports = BTCDominanceAnalyzer;
