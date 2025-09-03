// 📊 MARKET ANALYZER - ENTERPRISE
// Análise de mercado com Fear & Greed + Top100 + BTC Dominance

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
        // Simulação - em produção conectaria à API real
        const index = Math.floor(Math.random() * 100);
        let sentiment = 'NEUTRAL';
        
        if (index <= 25) sentiment = 'EXTREME_FEAR';
        else if (index <= 45) sentiment = 'FEAR';
        else if (index <= 55) sentiment = 'NEUTRAL';
        else if (index <= 75) sentiment = 'GREED';
        else sentiment = 'EXTREME_GREED';

        return {
            value: index,
            sentiment,
            timestamp: new Date().toISOString()
        };
    }

    async getBTCDominance() {
        // Simulação - em produção conectaria à API real
        const dominance = 40 + Math.random() * 20; // 40-60%
        
        return {
            percentage: Math.round(dominance * 100) / 100,
            trend: dominance > 50 ? 'INCREASING' : 'DECREASING',
            timestamp: new Date().toISOString()
        };
    }

    async getTop100Movement() {
        // Simulação - em produção analisaria top 100 cryptos
        const greenPercent = Math.random() * 100;
        
        return {
            green_percentage: Math.round(greenPercent),
            red_percentage: Math.round(100 - greenPercent),
            trend: greenPercent > 60 ? 'BULLISH' : greenPercent < 40 ? 'BEARISH' : 'NEUTRAL',
            timestamp: new Date().toISOString()
        };
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
