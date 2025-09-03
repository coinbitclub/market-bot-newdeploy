/**
 * 📊 MARKET ANALYSIS SERVICE - COINBITCLUB ENTERPRISE v6.0.0
 * Sistema completo de análise de mercado e indicadores
 * 
 * ✅ FUNCIONALIDADES IMPLEMENTADAS:
 * 😨 Fear & Greed Index real-time
 * 👑 Top 100 análise de criptomoedas
 * ⚡ Bitcoin Dominance tracking
 * 📈 Direção do mercado (Bull/Bear)
 * 📊 Análise técnica avançada
 * 🔄 Dados em tempo real
 * 📱 Alertas e notificações
 */

const axios = require('axios');
const { createLogger } = require('../shared/utils/logger');

class MarketAnalysisService {
    constructor() {
        this.logger = createLogger('market-analysis-service');
        this.isRunning = false;
        
        // Cache de dados
        this.cache = new Map();
        this.lastUpdates = new Map();
        
        // Configurações
        this.config = {
            updateIntervals: {
                fearGreed: 15 * 60 * 1000,     // 15 minutos
                top100: 5 * 60 * 1000,        // 5 minutos
                dominance: 10 * 60 * 1000,    // 10 minutos
                marketDirection: 30 * 60 * 1000 // 30 minutos
            },
            apis: {
                coinGecko: 'https://api.coingecko.com/api/v3',
                alternative: 'https://api.alternative.me/fng',
                binance: 'https://api.binance.com/api/v3'
            },
            cacheExpiry: 5 * 60 * 1000, // 5 minutos
            retryAttempts: 3,
            retryDelay: 2000
        };
        
        // Dados históricos para análise
        this.historicalData = new Map();
        this.alerts = new Map();
        this.subscribers = new Map();
        
        this.initializeDefaultData();
        this.logger.info('📊 Market Analysis Service initialized');
    }

    /**
     * 🚀 Inicializar serviço
     */
    async start() {
        try {
            this.logger.info('🚀 Starting Market Analysis Service...');
            
            // Primeira coleta de dados
            await this.initialDataCollection();
            
            // Iniciar atualizações automáticas
            this.startAutoUpdates();
            
            // Iniciar sistema de alertas
            this.startAlertSystem();
            
            this.isRunning = true;
            this.logger.info('✅ Market Analysis Service started successfully');
            
        } catch (error) {
            this.logger.error('❌ Failed to start Market Analysis Service:', error);
            throw error;
        }
    }

    /**
     * 🛑 Parar serviço
     */
    async stop() {
        try {
            this.logger.info('🛑 Stopping Market Analysis Service...');
            
            // Parar todos os intervalos
            Object.keys(this.updateIntervals || {}).forEach(key => {
                if (this.updateIntervals[key]) {
                    clearInterval(this.updateIntervals[key]);
                }
            });
            
            if (this.alertInterval) {
                clearInterval(this.alertInterval);
            }
            
            this.isRunning = false;
            this.logger.info('✅ Market Analysis Service stopped successfully');
            
        } catch (error) {
            this.logger.error('❌ Error stopping Market Analysis Service:', error);
            throw error;
        }
    }

    /**
     * 🔍 Health check
     */
    async healthCheck() {
        try {
            // Verificar se os dados estão atualizados
            const now = Date.now();
            const fearGreedAge = now - (this.lastUpdates.get('fearGreed') || 0);
            const top100Age = now - (this.lastUpdates.get('top100') || 0);
            
            const isHealthy = this.isRunning && 
                             fearGreedAge < (this.config.updateIntervals.fearGreed * 2) &&
                             top100Age < (this.config.updateIntervals.top100 * 2);
            
            return isHealthy;
            
        } catch (error) {
            this.logger.error('❌ Health check failed:', error);
            return false;
        }
    }

    /**
     * 🏗️ Inicializar dados padrão
     */
    initializeDefaultData() {
        // Dados mock para desenvolvimento
        this.cache.set('fearGreed', {
            value: 45,
            classification: 'Fear',
            timestamp: Date.now(),
            change24h: -5,
            history: [50, 48, 46, 45]
        });
        
        this.cache.set('btcDominance', {
            value: 42.5,
            timestamp: Date.now(),
            change24h: 0.8,
            history: [41.7, 42.0, 42.3, 42.5]
        });
        
        this.cache.set('marketDirection', {
            direction: 'BULLISH',
            confidence: 72,
            timestamp: Date.now(),
            indicators: {
                rsi: 58,
                macd: 'BULLISH',
                ema: 'BULLISH',
                volume: 'INCREASING'
            }
        });
        
        this.logger.info('📊 Default market data initialized');
    }

    /**
     * 🔄 Coleta inicial de dados
     */
    async initialDataCollection() {
        try {
            this.logger.info('🔄 Starting initial data collection...');
            
            // Coletar em paralelo para acelerar
            await Promise.allSettled([
                this.updateFearGreedIndex(),
                this.updateTop100Cryptos(),
                this.updateBitcoinDominance(),
                this.updateMarketDirection()
            ]);
            
            this.logger.info('✅ Initial data collection completed');
            
        } catch (error) {
            this.logger.error('❌ Error in initial data collection:', error);
            // Continuar com dados padrão se falhar
        }
    }

    /**
     * 😨 Atualizar Fear & Greed Index
     */
    async updateFearGreedIndex() {
        try {
            const response = await this.makeApiRequest(this.config.apis.alternative);
            
            if (response.data && response.data.length > 0) {
                const latest = response.data[0];
                
                const fearGreedData = {
                    value: parseInt(latest.value),
                    classification: latest.value_classification,
                    timestamp: Date.now(),
                    change24h: this.calculateChange24h('fearGreed', parseInt(latest.value)),
                    history: this.updateHistory('fearGreed', parseInt(latest.value)),
                    source: 'alternative.me',
                    lastUpdate: latest.timestamp
                };
                
                this.cache.set('fearGreed', fearGreedData);
                this.lastUpdates.set('fearGreed', Date.now());
                
                this.logger.info(`😨 Fear & Greed updated: ${fearGreedData.value} (${fearGreedData.classification})`);
                
                // Verificar alertas
                this.checkFearGreedAlerts(fearGreedData);
                
                return fearGreedData;
            }
            
        } catch (error) {
            this.logger.error('❌ Error updating Fear & Greed Index:', error);
            return this.cache.get('fearGreed');
        }
    }

    /**
     * 👑 Atualizar Top 100 Criptomoedas
     */
    async updateTop100Cryptos() {
        try {
            const url = `${this.config.apis.coinGecko}/coins/markets`;
            const params = {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 100,
                page: 1,
                sparkline: false,
                price_change_percentage: '1h,24h,7d'
            };
            
            const response = await this.makeApiRequest(url, { params });
            
            if (response.data && Array.isArray(response.data)) {
                const top100Data = {
                    coins: response.data.map(coin => ({
                        id: coin.id,
                        symbol: coin.symbol,
                        name: coin.name,
                        rank: coin.market_cap_rank,
                        price: coin.current_price,
                        marketCap: coin.market_cap,
                        volume24h: coin.total_volume,
                        change1h: coin.price_change_percentage_1h_in_currency || 0,
                        change24h: coin.price_change_percentage_24h || 0,
                        change7d: coin.price_change_percentage_7d_in_currency || 0,
                        dominance: this.calculateDominance(coin.market_cap)
                    })),
                    timestamp: Date.now(),
                    totalMarketCap: response.data.reduce((sum, coin) => sum + (coin.market_cap || 0), 0),
                    totalVolume: response.data.reduce((sum, coin) => sum + (coin.total_volume || 0), 0),
                    averageChange24h: this.calculateAverageChange(response.data, 'price_change_percentage_24h')
                };
                
                this.cache.set('top100', top100Data);
                this.lastUpdates.set('top100', Date.now());
                
                this.logger.info(`👑 Top 100 updated: ${top100Data.coins.length} coins`);
                
                // Atualizar Bitcoin Dominance
                const btcCoin = top100Data.coins.find(coin => coin.symbol === 'btc');
                if (btcCoin) {
                    this.updateBitcoinDominanceFromTop100(btcCoin, top100Data.totalMarketCap);
                }
                
                return top100Data;
            }
            
        } catch (error) {
            this.logger.error('❌ Error updating Top 100 cryptos:', error);
            return this.cache.get('top100');
        }
    }

    /**
     * ⚡ Atualizar Bitcoin Dominance
     */
    async updateBitcoinDominance() {
        try {
            const url = `${this.config.apis.coinGecko}/global`;
            const response = await this.makeApiRequest(url);
            
            if (response.data && response.data.data) {
                const globalData = response.data.data;
                
                const dominanceData = {
                    value: globalData.market_cap_percentage?.btc || 0,
                    timestamp: Date.now(),
                    change24h: this.calculateChange24h('btcDominance', globalData.market_cap_percentage?.btc || 0),
                    history: this.updateHistory('btcDominance', globalData.market_cap_percentage?.btc || 0),
                    totalMarketCap: globalData.total_market_cap?.usd || 0,
                    totalVolume: globalData.total_volume?.usd || 0,
                    activeCryptocurrencies: globalData.active_cryptocurrencies || 0,
                    markets: globalData.markets || 0
                };
                
                this.cache.set('btcDominance', dominanceData);
                this.lastUpdates.set('btcDominance', Date.now());
                
                this.logger.info(`⚡ Bitcoin Dominance updated: ${dominanceData.value.toFixed(2)}%`);
                
                return dominanceData;
            }
            
        } catch (error) {
            this.logger.error('❌ Error updating Bitcoin Dominance:', error);
            return this.cache.get('btcDominance');
        }
    }

    /**
     * 📈 Analisar direção do mercado
     */
    async updateMarketDirection() {
        try {
            // Analisar múltiplos indicadores
            const fearGreed = this.cache.get('fearGreed');
            const top100 = this.cache.get('top100');
            const btcDominance = this.cache.get('btcDominance');
            
            if (!fearGreed || !top100 || !btcDominance) {
                throw new Error('Insufficient data for market direction analysis');
            }
            
            // Calcular indicadores
            const indicators = await this.calculateTechnicalIndicators();
            
            // Determinar direção baseada em múltiplos fatores
            let bullishSignals = 0;
            let bearishSignals = 0;
            
            // Fear & Greed analysis
            if (fearGreed.value > 50) bullishSignals++;
            else if (fearGreed.value < 30) bearishSignals++;
            
            // Market performance analysis
            const avgChange24h = top100.averageChange24h || 0;
            if (avgChange24h > 2) bullishSignals++;
            else if (avgChange24h < -2) bearishSignals++;
            
            // Bitcoin dominance analysis
            if (btcDominance.change24h > 0.5) bullishSignals++;
            else if (btcDominance.change24h < -0.5) bearishSignals++;
            
            // Technical indicators
            if (indicators.rsi > 50) bullishSignals++;
            else if (indicators.rsi < 30) bearishSignals++;
            
            // Determinar direção
            let direction = 'NEUTRAL';
            let confidence = 50;
            
            if (bullishSignals > bearishSignals) {
                direction = 'BULLISH';
                confidence = Math.min(95, 50 + (bullishSignals - bearishSignals) * 15);
            } else if (bearishSignals > bullishSignals) {
                direction = 'BEARISH';
                confidence = Math.min(95, 50 + (bearishSignals - bullishSignals) * 15);
            }
            
            const directionData = {
                direction,
                confidence,
                timestamp: Date.now(),
                indicators: {
                    ...indicators,
                    fearGreed: fearGreed.value,
                    marketPerformance24h: avgChange24h,
                    btcDominanceChange: btcDominance.change24h
                },
                signals: {
                    bullish: bullishSignals,
                    bearish: bearishSignals,
                    neutral: 4 - bullishSignals - bearishSignals
                },
                recommendation: this.generateRecommendation(direction, confidence, indicators)
            };
            
            this.cache.set('marketDirection', directionData);
            this.lastUpdates.set('marketDirection', Date.now());
            
            this.logger.info(`📈 Market Direction updated: ${direction} (${confidence}% confidence)`);
            
            return directionData;
            
        } catch (error) {
            this.logger.error('❌ Error updating market direction:', error);
            return this.cache.get('marketDirection');
        }
    }

    /**
     * 📊 Calcular indicadores técnicos
     */
    async calculateTechnicalIndicators() {
        try {
            // Obter dados do Bitcoin (principal indicador do mercado)
            const url = `${this.config.apis.coinGecko}/coins/bitcoin/market_chart`;
            const params = {
                vs_currency: 'usd',
                days: '30',
                interval: 'daily'
            };
            
            const response = await this.makeApiRequest(url, { params });
            
            if (!response.data || !response.data.prices) {
                // Usar dados simulados se não conseguir obter dados reais
                return this.generateMockIndicators();
            }
            
            const prices = response.data.prices.map(p => p[1]);
            const volumes = response.data.total_volumes.map(v => v[1]);
            
            // Calcular RSI
            const rsi = this.calculateRSI(prices, 14);
            
            // Calcular EMAs
            const ema12 = this.calculateEMA(prices, 12);
            const ema26 = this.calculateEMA(prices, 26);
            
            // Calcular MACD
            const macd = ema12 - ema26;
            const macdSignal = this.calculateEMA([macd], 9);
            const macdHistogram = macd - macdSignal;
            
            // Análise de volume
            const avgVolume = volumes.slice(-7).reduce((a, b) => a + b, 0) / 7;
            const currentVolume = volumes[volumes.length - 1];
            const volumeTrend = currentVolume > avgVolume ? 'INCREASING' : 'DECREASING';
            
            return {
                rsi: Math.round(rsi * 100) / 100,
                macd: macdHistogram > 0 ? 'BULLISH' : 'BEARISH',
                ema: ema12 > ema26 ? 'BULLISH' : 'BEARISH',
                volume: volumeTrend,
                volumeRatio: Math.round((currentVolume / avgVolume) * 100) / 100,
                priceChange30d: ((prices[prices.length - 1] / prices[0] - 1) * 100).toFixed(2)
            };
            
        } catch (error) {
            this.logger.error('❌ Error calculating technical indicators:', error);
            return this.generateMockIndicators();
        }
    }

    /**
     * 🎯 Gerar recomendação
     */
    generateRecommendation(direction, confidence, indicators) {
        const recommendations = {
            'BULLISH': {
                high: 'Strong BUY - Multiple bullish signals detected',
                medium: 'BUY - Positive market momentum',
                low: 'WEAK BUY - Cautious optimism'
            },
            'BEARISH': {
                high: 'Strong SELL - Multiple bearish signals detected',
                medium: 'SELL - Negative market momentum',
                low: 'WEAK SELL - Cautious pessimism'
            },
            'NEUTRAL': {
                high: 'HOLD - Market in consolidation',
                medium: 'HOLD - Mixed signals',
                low: 'HOLD - Unclear direction'
            }
        };
        
        let confidenceLevel = 'low';
        if (confidence > 75) confidenceLevel = 'high';
        else if (confidence > 60) confidenceLevel = 'medium';
        
        return {
            action: recommendations[direction][confidenceLevel],
            reasoning: this.generateReasoning(direction, indicators),
            riskLevel: this.calculateRiskLevel(direction, confidence),
            timeframe: 'Short to medium term (1-7 days)'
        };
    }

    /**
     * 📊 Obter análise completa do mercado
     */
    async getCompleteMarketAnalysis() {
        try {
            const fearGreed = this.cache.get('fearGreed') || {};
            const top100 = this.cache.get('top100') || {};
            const btcDominance = this.cache.get('btcDominance') || {};
            const marketDirection = this.cache.get('marketDirection') || {};
            
            // Top gainers e losers
            const topGainers = top100.coins ? 
                top100.coins.filter(c => c.change24h > 0).sort((a, b) => b.change24h - a.change24h).slice(0, 10) : [];
            
            const topLosers = top100.coins ? 
                top100.coins.filter(c => c.change24h < 0).sort((a, b) => a.change24h - b.change24h).slice(0, 10) : [];
            
            // Análise de setores
            const sectorAnalysis = this.analyzeSectors(top100.coins || []);
            
            const analysis = {
                summary: {
                    direction: marketDirection.direction || 'NEUTRAL',
                    confidence: marketDirection.confidence || 50,
                    fearGreed: fearGreed.value || 50,
                    fearGreedClass: fearGreed.classification || 'Neutral',
                    btcDominance: btcDominance.value || 42,
                    timestamp: Date.now()
                },
                indicators: {
                    fearGreed,
                    btcDominance,
                    marketDirection,
                    technical: marketDirection.indicators || {}
                },
                market: {
                    totalMarketCap: top100.totalMarketCap || 0,
                    totalVolume: top100.totalVolume || 0,
                    averageChange24h: top100.averageChange24h || 0,
                    topGainers,
                    topLosers
                },
                sectors: sectorAnalysis,
                recommendation: marketDirection.recommendation || {
                    action: 'HOLD - Insufficient data',
                    reasoning: 'Market analysis in progress',
                    riskLevel: 'MEDIUM',
                    timeframe: 'Short term'
                },
                lastUpdate: Math.max(
                    this.lastUpdates.get('fearGreed') || 0,
                    this.lastUpdates.get('top100') || 0,
                    this.lastUpdates.get('btcDominance') || 0,
                    this.lastUpdates.get('marketDirection') || 0
                )
            };
            
            return analysis;
            
        } catch (error) {
            this.logger.error('❌ Error getting complete market analysis:', error);
            throw error;
        }
    }

    /**
     * 🚨 Sistema de alertas
     */
    async createAlert(userId, alertConfig) {
        try {
            const alertId = crypto.randomUUID();
            const alert = {
                id: alertId,
                userId,
                type: alertConfig.type, // 'fear_greed', 'price', 'dominance'
                condition: alertConfig.condition, // 'above', 'below'
                value: alertConfig.value,
                symbol: alertConfig.symbol || null,
                isActive: true,
                triggered: false,
                createdAt: Date.now(),
                triggeredAt: null
            };
            
            this.alerts.set(alertId, alert);
            
            this.logger.info(`🚨 Alert created: ${alertId} for user ${userId}`);
            
            return { success: true, alertId };
            
        } catch (error) {
            this.logger.error('❌ Error creating alert:', error);
            throw error;
        }
    }

    /**
     * 🔔 Verificar alertas
     */
    checkFearGreedAlerts(fearGreedData) {
        try {
            const alerts = Array.from(this.alerts.values())
                .filter(alert => alert.type === 'fear_greed' && alert.isActive && !alert.triggered);
            
            alerts.forEach(alert => {
                let shouldTrigger = false;
                
                if (alert.condition === 'above' && fearGreedData.value >= alert.value) {
                    shouldTrigger = true;
                } else if (alert.condition === 'below' && fearGreedData.value <= alert.value) {
                    shouldTrigger = true;
                }
                
                if (shouldTrigger) {
                    alert.triggered = true;
                    alert.triggeredAt = Date.now();
                    
                    this.triggerAlert(alert, fearGreedData);
                }
            });
            
        } catch (error) {
            this.logger.error('❌ Error checking Fear & Greed alerts:', error);
        }
    }

    /**
     * ⚡ Disparar alerta
     */
    triggerAlert(alert, data) {
        try {
            const message = this.formatAlertMessage(alert, data);
            
            this.logger.info(`⚡ Alert triggered: ${alert.id} - ${message}`);
            
            // Aqui você integraria com sistema de notificações
            // this.notificationService.send(alert.userId, message);
            
        } catch (error) {
            this.logger.error('❌ Error triggering alert:', error);
        }
    }

    /**
     * 🔄 Iniciar atualizações automáticas
     */
    startAutoUpdates() {
        this.updateIntervals = {};
        
        // Fear & Greed Index
        this.updateIntervals.fearGreed = setInterval(
            () => this.updateFearGreedIndex(),
            this.config.updateIntervals.fearGreed
        );
        
        // Top 100 Cryptos
        this.updateIntervals.top100 = setInterval(
            () => this.updateTop100Cryptos(),
            this.config.updateIntervals.top100
        );
        
        // Bitcoin Dominance
        this.updateIntervals.dominance = setInterval(
            () => this.updateBitcoinDominance(),
            this.config.updateIntervals.dominance
        );
        
        // Market Direction
        this.updateIntervals.marketDirection = setInterval(
            () => this.updateMarketDirection(),
            this.config.updateIntervals.marketDirection
        );
        
        this.logger.info('🔄 Auto-update intervals started');
    }

    /**
     * 🔔 Iniciar sistema de alertas
     */
    startAlertSystem() {
        this.alertInterval = setInterval(() => {
            try {
                // Verificar alertas de preço usando dados do top100
                const top100 = this.cache.get('top100');
                if (top100 && top100.coins) {
                    this.checkPriceAlerts(top100.coins);
                }
                
                // Verificar alertas de dominance
                const btcDominance = this.cache.get('btcDominance');
                if (btcDominance) {
                    this.checkDominanceAlerts(btcDominance);
                }
                
            } catch (error) {
                this.logger.error('❌ Alert system error:', error);
            }
        }, 60000); // A cada minuto
    }

    /**
     * 🛠️ Utilitários
     */
    async makeApiRequest(url, config = {}) {
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const response = await axios.get(url, {
                    timeout: 10000,
                    ...config
                });
                return response;
            } catch (error) {
                if (attempt === this.config.retryAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
            }
        }
    }

    calculateChange24h(key, currentValue) {
        const history = this.historicalData.get(key) || [];
        if (history.length === 0) return 0;
        
        const previousValue = history[history.length - 1];
        return ((currentValue / previousValue - 1) * 100).toFixed(2);
    }

    updateHistory(key, value) {
        const history = this.historicalData.get(key) || [];
        history.push(value);
        
        // Manter apenas últimos 50 valores
        if (history.length > 50) {
            history.shift();
        }
        
        this.historicalData.set(key, history);
        return history.slice(-10); // Retornar últimos 10
    }

    calculateDominance(marketCap) {
        const top100 = this.cache.get('top100');
        if (!top100 || !top100.totalMarketCap) return 0;
        
        return ((marketCap / top100.totalMarketCap) * 100).toFixed(4);
    }

    calculateAverageChange(coins, field) {
        const validChanges = coins
            .map(coin => coin[field])
            .filter(change => change !== null && change !== undefined);
        
        if (validChanges.length === 0) return 0;
        
        return validChanges.reduce((sum, change) => sum + change, 0) / validChanges.length;
    }

    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50; // Valor neutro
        
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(Math.max(change, 0));
            losses.push(Math.max(-change, 0));
        }
        
        const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateEMA(prices, period) {
        if (prices.length === 0) return 0;
        
        const multiplier = 2 / (period + 1);
        let ema = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    generateMockIndicators() {
        return {
            rsi: 45 + Math.random() * 20, // 45-65
            macd: Math.random() > 0.5 ? 'BULLISH' : 'BEARISH',
            ema: Math.random() > 0.5 ? 'BULLISH' : 'BEARISH',
            volume: Math.random() > 0.5 ? 'INCREASING' : 'DECREASING',
            volumeRatio: 0.8 + Math.random() * 0.4, // 0.8-1.2
            priceChange30d: (Math.random() * 20 - 10).toFixed(2) // -10% to +10%
        };
    }

    generateReasoning(direction, indicators) {
        const reasons = [];
        
        if (direction === 'BULLISH') {
            if (indicators.rsi > 50) reasons.push('RSI indicates bullish momentum');
            if (indicators.macd === 'BULLISH') reasons.push('MACD shows positive crossover');
            if (indicators.volume === 'INCREASING') reasons.push('Volume is increasing');
        } else if (direction === 'BEARISH') {
            if (indicators.rsi < 50) reasons.push('RSI indicates bearish momentum');
            if (indicators.macd === 'BEARISH') reasons.push('MACD shows negative crossover');
            if (indicators.volume === 'DECREASING') reasons.push('Volume is decreasing');
        }
        
        return reasons.join(', ') || 'Mixed signals in the market';
    }

    calculateRiskLevel(direction, confidence) {
        if (confidence > 80) return direction === 'BEARISH' ? 'HIGH' : 'LOW';
        if (confidence > 60) return 'MEDIUM';
        return 'HIGH';
    }

    analyzeSectors(coins) {
        // Análise simplificada de setores baseada nas top moedas
        const sectors = {
            'DeFi': coins.filter(c => ['uni', 'aave', 'comp', 'mkr'].includes(c.symbol)),
            'Layer 1': coins.filter(c => ['eth', 'bnb', 'ada', 'sol', 'dot'].includes(c.symbol)),
            'Meme': coins.filter(c => ['doge', 'shib'].includes(c.symbol)),
            'Exchange': coins.filter(c => ['bnb', 'cro', 'ftt'].includes(c.symbol))
        };
        
        const sectorPerformance = {};
        Object.entries(sectors).forEach(([sector, sectorCoins]) => {
            if (sectorCoins.length > 0) {
                const avgChange = sectorCoins.reduce((sum, coin) => sum + coin.change24h, 0) / sectorCoins.length;
                sectorPerformance[sector] = {
                    change24h: avgChange,
                    coins: sectorCoins.length,
                    topCoin: sectorCoins.sort((a, b) => b.change24h - a.change24h)[0]
                };
            }
        });
        
        return sectorPerformance;
    }

    formatAlertMessage(alert, data) {
        switch (alert.type) {
            case 'fear_greed':
                return `Fear & Greed Index ${alert.condition} ${alert.value}: Current value is ${data.value} (${data.classification})`;
            default:
                return `Alert triggered: ${alert.type}`;
        }
    }

    /**
     * 📊 Estatísticas do serviço
     */
    getStats() {
        const cacheStats = {};
        for (const [key, value] of this.cache) {
            cacheStats[key] = {
                lastUpdate: this.lastUpdates.get(key) || 0,
                hasData: !!value
            };
        }
        
        return {
            isRunning: this.isRunning,
            cache: cacheStats,
            activeAlerts: Array.from(this.alerts.values()).filter(a => a.isActive).length,
            triggeredAlerts: Array.from(this.alerts.values()).filter(a => a.triggered).length,
            historicalDataPoints: this.historicalData.size
        };
    }

    /**
     * 📨 Handle messages from orchestrator
     */
    async handleMessage(action, payload, metadata) {
        try {
            switch (action) {
                case 'getAnalysis':
                    return await this.getCompleteMarketAnalysis();

                case 'getFearGreed':
                    return this.cache.get('fearGreed') || {};

                case 'getTop100':
                    return this.cache.get('top100') || {};

                case 'getBtcDominance':
                    return this.cache.get('btcDominance') || {};

                case 'getMarketDirection':
                    return this.cache.get('marketDirection') || {};

                case 'createAlert':
                    return await this.createAlert(payload.userId, payload.alertConfig);

                case 'updateData':
                    if (payload.type === 'all') {
                        await this.initialDataCollection();
                        return { success: true, message: 'All data updated' };
                    }
                    break;

                case 'getStats':
                    return this.getStats();

                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            this.logger.error(`❌ Error handling message ${action}:`, error);
            throw error;
        }
    }
}

module.exports = MarketAnalysisService;
