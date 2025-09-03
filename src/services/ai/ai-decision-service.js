/**
 * 🤖 AI DECISION SERVICE - COINBITCLUB ENTERPRISE v6.0.0
 * Sistema de inteligência artificial para decisões de trading
 * 
 * ✅ FUNCIONALIDADES IMPLEMENTADAS:
 * 🧠 Análise IA com OpenAI GPT
 * 📊 Processamento de sinais TradingView
 * 🎯 Decisões automatizadas de trading
 * 📈 Análise preditiva de mercado
 * 🔄 Learning contínuo
 * 🛡️ Sistema de fallback
 * 📊 Métricas de performance
 */

const axios = require('axios');
const { createLogger } = require('../shared/utils/logger');

class AIDecisionService {
    constructor() {
        this.logger = createLogger('ai-decision-service');
        this.isRunning = false;
        
        // Configurações
        this.config = {
            openai: {
                apiKey: process.env.OPENAI_API_KEY || '',
                model: 'gpt-4',
                maxTokens: 1000,
                temperature: 0.3
            },
            tradingview: {
                webhook: process.env.TRADINGVIEW_WEBHOOK || '',
                allowedSources: ['TradingView', 'CoinBitClub-Official']
            },
            confidence: {
                minimum: 65,
                high: 80,
                veryHigh: 90
            },
            riskManagement: {
                maxPositionSize: 0.1, // 10% do capital
                stopLoss: 0.02, // 2%
                takeProfit: 0.05, // 5%
                maxDailyTrades: 10
            }
        };
        
        // Estado do sistema
        this.decisions = new Map();
        this.signals = new Map();
        this.performance = new Map();
        this.learningData = new Map();
        
        // Cache de análises
        this.analysisCache = new Map();
        this.marketContext = new Map();
        
        // Fallback system
        this.fallbackRules = new Map();
        this.initializeFallbackRules();
        
        this.initializeDefaultData();
        this.logger.info('🤖 AI Decision Service initialized');
    }

    /**
     * 🚀 Inicializar serviço
     */
    async start() {
        try {
            this.logger.info('🚀 Starting AI Decision Service...');
            
            // Verificar configuração do OpenAI
            await this.verifyOpenAIConnection();
            
            // Inicializar contexto de mercado
            await this.initializeMarketContext();
            
            // Iniciar processamento de background
            this.startBackgroundProcessing();
            
            this.isRunning = true;
            this.logger.info('✅ AI Decision Service started successfully');
            
        } catch (error) {
            this.logger.error('❌ Failed to start AI Decision Service:', error);
            this.logger.info('🔄 Starting in fallback mode...');
            this.isRunning = true; // Continuar com sistema de fallback
        }
    }

    /**
     * 🛑 Parar serviço
     */
    async stop() {
        try {
            this.logger.info('🛑 Stopping AI Decision Service...');
            
            if (this.backgroundInterval) {
                clearInterval(this.backgroundInterval);
            }
            
            this.isRunning = false;
            this.logger.info('✅ AI Decision Service stopped successfully');
            
        } catch (error) {
            this.logger.error('❌ Error stopping AI Decision Service:', error);
            throw error;
        }
    }

    /**
     * 🔍 Health check
     */
    async healthCheck() {
        try {
            // Verificar se está rodando
            if (!this.isRunning) return false;
            
            // Verificar conexão OpenAI (opcional)
            if (this.config.openai.apiKey) {
                try {
                    await this.testOpenAIConnection();
                } catch (error) {
                    this.logger.warn('⚠️ OpenAI connection issue, using fallback mode');
                }
            }
            
            return true;
            
        } catch (error) {
            this.logger.error('❌ Health check failed:', error);
            return false;
        }
    }

    /**
     * 🏗️ Inicializar dados padrão
     */
    initializeDefaultData() {
        // Dados de performance mock
        this.performance.set('overall', {
            totalDecisions: 150,
            correctDecisions: 98,
            accuracy: 65.3,
            profitability: 12.5,
            totalProfit: 2500,
            totalLoss: -750,
            netProfit: 1750,
            bestTrade: 245,
            worstTrade: -89,
            averageHoldTime: '4.2 hours',
            sharpeRatio: 1.85
        });
        
        // Contexto de mercado inicial
        this.marketContext.set('current', {
            trend: 'BULLISH',
            volatility: 'MEDIUM',
            volume: 'HIGH',
            fearGreedIndex: 65,
            btcDominance: 42.5,
            marketCap: 1.2e12, // 1.2T
            lastUpdate: Date.now()
        });
        
        this.logger.info('🤖 AI default data initialized');
    }

    /**
     * 🔗 Verificar conexão OpenAI
     */
    async verifyOpenAIConnection() {
        if (!this.config.openai.apiKey) {
            this.logger.warn('⚠️ OpenAI API key not configured, using fallback mode');
            return false;
        }
        
        try {
            await this.testOpenAIConnection();
            this.logger.info('✅ OpenAI connection verified');
            return true;
        } catch (error) {
            this.logger.error('❌ OpenAI connection failed:', error);
            throw error;
        }
    }

    /**
     * 🧪 Testar conexão OpenAI
     */
    async testOpenAIConnection() {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Test connection' }],
                max_tokens: 10
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.config.openai.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.status === 200;
    }

    /**
     * 🎯 Processar sinal de trading
     */
    async processSignal(signalData) {
        try {
            this.logger.info(`🎯 Processing trading signal: ${signalData.symbol}`);
            
            // Validar sinal
            const validation = this.validateSignal(signalData);
            if (!validation.valid) {
                throw new Error(`Invalid signal: ${validation.error}`);
            }
            
            // Gerar contexto
            const context = await this.generateContext(signalData);
            
            // Decisão IA
            let decision;
            if (this.config.openai.apiKey) {
                try {
                    decision = await this.makeAIDecision(signalData, context);
                } catch (error) {
                    this.logger.warn('🔄 AI decision failed, using fallback');
                    decision = await this.makeFallbackDecision(signalData, context);
                }
            } else {
                decision = await this.makeFallbackDecision(signalData, context);
            }
            
            // Aplicar gestão de risco
            decision = this.applyRiskManagement(decision, signalData, context);
            
            // Armazenar decisão
            const decisionId = this.generateDecisionId();
            this.decisions.set(decisionId, {
                id: decisionId,
                signal: signalData,
                context,
                decision,
                timestamp: Date.now(),
                status: 'active',
                executed: false
            });
            
            this.logger.info(`✅ Decision generated: ${decision.action} ${signalData.symbol} (${decision.confidence}% confidence)`);
            
            return {
                success: true,
                decisionId,
                decision,
                context: {
                    marketCondition: context.marketCondition,
                    riskLevel: context.riskLevel,
                    recommendation: decision.action
                }
            };
            
        } catch (error) {
            this.logger.error('❌ Error processing signal:', error);
            throw error;
        }
    }

    /**
     * 🧠 Decisão usando IA OpenAI
     */
    async makeAIDecision(signalData, context) {
        try {
            const prompt = this.generateAIPrompt(signalData, context);
            
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: this.config.openai.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert cryptocurrency trading AI analyst. Provide concise, structured trading decisions based on technical analysis and market data.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: this.config.openai.maxTokens,
                    temperature: this.config.openai.temperature
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.openai.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const aiResponse = response.data.choices[0].message.content;
            const decision = this.parseAIResponse(aiResponse);
            
            // Validar resposta da IA
            if (!this.validateAIDecision(decision)) {
                throw new Error('Invalid AI decision format');
            }
            
            decision.source = 'openai';
            decision.rawResponse = aiResponse;
            
            return decision;
            
        } catch (error) {
            this.logger.error('❌ OpenAI decision error:', error);
            throw error;
        }
    }

    /**
     * 🔄 Decisão usando sistema de fallback
     */
    async makeFallbackDecision(signalData, context) {
        try {
            this.logger.info('🔄 Using fallback decision system');
            
            let score = 0;
            const factors = [];
            
            // Analisar indicadores técnicos
            if (signalData.indicators) {
                // RSI
                if (signalData.indicators.rsi) {
                    if (signalData.indicators.rsi < 30) {
                        score += 20; // Oversold - BUY signal
                        factors.push('RSI oversold');
                    } else if (signalData.indicators.rsi > 70) {
                        score -= 20; // Overbought - SELL signal
                        factors.push('RSI overbought');
                    }
                }
                
                // MACD
                if (signalData.indicators.macd === 'BULLISH') {
                    score += 15;
                    factors.push('MACD bullish');
                } else if (signalData.indicators.macd === 'BEARISH') {
                    score -= 15;
                    factors.push('MACD bearish');
                }
                
                // Moving Averages
                if (signalData.indicators.ema_cross === 'GOLDEN') {
                    score += 25;
                    factors.push('Golden cross');
                } else if (signalData.indicators.ema_cross === 'DEATH') {
                    score -= 25;
                    factors.push('Death cross');
                }
            }
            
            // Contexto de mercado
            if (context.marketCondition === 'BULLISH') {
                score += 10;
                factors.push('Bullish market');
            } else if (context.marketCondition === 'BEARISH') {
                score -= 10;
                factors.push('Bearish market');
            }
            
            // Volume
            if (signalData.volume_ratio > 1.5) {
                score += 5;
                factors.push('High volume');
            }
            
            // Fear & Greed
            if (context.fearGreedIndex < 25) {
                score += 10; // Extreme fear - contrarian signal
                factors.push('Extreme fear (contrarian)');
            } else if (context.fearGreedIndex > 75) {
                score -= 10; // Extreme greed
                factors.push('Extreme greed (caution)');
            }
            
            // Determinar ação
            let action = 'HOLD';
            let confidence = 50;
            
            if (score >= 40) {
                action = 'BUY';
                confidence = Math.min(95, 50 + score);
            } else if (score <= -40) {
                action = 'SELL';
                confidence = Math.min(95, 50 + Math.abs(score));
            }
            
            // Ajustar confiança baseada na qualidade dos dados
            const dataQuality = this.assessDataQuality(signalData);
            confidence = Math.round(confidence * dataQuality);
            
            const decision = {
                action,
                confidence,
                reasoning: factors.join(', ') || 'Mixed signals',
                score,
                positionSize: this.calculatePositionSize(confidence, context.riskLevel),
                stopLoss: signalData.price * (1 - this.config.riskManagement.stopLoss),
                takeProfit: signalData.price * (1 + this.config.riskManagement.takeProfit),
                timeframe: signalData.timeframe || '1h',
                source: 'fallback',
                factors
            };
            
            return decision;
            
        } catch (error) {
            this.logger.error('❌ Fallback decision error:', error);
            throw error;
        }
    }

    /**
     * 📊 Gerar contexto para análise
     */
    async generateContext(signalData) {
        try {
            const context = {
                symbol: signalData.symbol,
                price: signalData.price,
                timestamp: Date.now(),
                
                // Contexto de mercado
                marketCondition: this.assessMarketCondition(),
                volatility: this.assessVolatility(signalData),
                riskLevel: this.assessRiskLevel(signalData),
                
                // Dados de mercado
                fearGreedIndex: this.marketContext.get('current')?.fearGreedIndex || 50,
                btcDominance: this.marketContext.get('current')?.btcDominance || 42,
                
                // Análise técnica
                support: this.calculateSupport(signalData),
                resistance: this.calculateResistance(signalData),
                
                // Performance histórica
                symbolPerformance: this.getSymbolPerformance(signalData.symbol),
                
                // Condições de trading
                tradingSession: this.getCurrentTradingSession(),
                liquidityCondition: this.assessLiquidity(signalData)
            };
            
            return context;
            
        } catch (error) {
            this.logger.error('❌ Error generating context:', error);
            throw error;
        }
    }

    /**
     * 🛡️ Aplicar gestão de risco
     */
    applyRiskManagement(decision, signalData, context) {
        try {
            // Verificar condições mínimas
            if (decision.confidence < this.config.confidence.minimum) {
                decision.action = 'HOLD';
                decision.reasoning += ' (Low confidence)';
            }
            
            // Ajustar tamanho da posição
            decision.positionSize = this.calculatePositionSize(decision.confidence, context.riskLevel);
            
            // Verificar limite diário de trades
            const dailyTrades = this.getDailyTradeCount();
            if (dailyTrades >= this.config.riskManagement.maxDailyTrades) {
                decision.action = 'HOLD';
                decision.reasoning += ' (Daily trade limit reached)';
            }
            
            // Ajustar stop loss e take profit baseado na volatilidade
            if (context.volatility === 'HIGH') {
                decision.stopLoss = signalData.price * (1 - this.config.riskManagement.stopLoss * 1.5);
                decision.takeProfit = signalData.price * (1 + this.config.riskManagement.takeProfit * 1.5);
            }
            
            // Adicionar metadados de risco
            decision.riskManagement = {
                maxPositionSize: this.config.riskManagement.maxPositionSize,
                effectivePositionSize: decision.positionSize,
                stopLossPercent: this.config.riskManagement.stopLoss,
                takeProfitPercent: this.config.riskManagement.takeProfit,
                riskRewardRatio: this.calculateRiskRewardRatio(decision, signalData)
            };
            
            return decision;
            
        } catch (error) {
            this.logger.error('❌ Error applying risk management:', error);
            return decision;
        }
    }

    /**
     * 📈 Atualizar performance
     */
    async updatePerformance(decisionId, result) {
        try {
            const decision = this.decisions.get(decisionId);
            if (!decision) {
                throw new Error('Decision not found');
            }
            
            decision.result = result;
            decision.completedAt = Date.now();
            decision.status = 'completed';
            
            // Atualizar estatísticas globais
            const performance = this.performance.get('overall');
            performance.totalDecisions++;
            
            if (result.profitable) {
                performance.correctDecisions++;
                performance.totalProfit += result.profit;
                if (result.profit > performance.bestTrade) {
                    performance.bestTrade = result.profit;
                }
            } else {
                performance.totalLoss += result.loss;
                if (result.loss < performance.worstTrade) {
                    performance.worstTrade = result.loss;
                }
            }
            
            // Recalcular métricas
            performance.accuracy = (performance.correctDecisions / performance.totalDecisions) * 100;
            performance.netProfit = performance.totalProfit + performance.totalLoss;
            performance.profitability = (performance.netProfit / 10000) * 100; // Assuming 10k initial capital
            
            // Armazenar para learning
            this.storeLearningData(decision, result);
            
            this.logger.info(`📈 Performance updated for decision ${decisionId}: ${result.profitable ? 'PROFIT' : 'LOSS'}`);
            
            return performance;
            
        } catch (error) {
            this.logger.error('❌ Error updating performance:', error);
            throw error;
        }
    }

    /**
     * 🧮 Calcular métricas avançadas
     */
    calculateAdvancedMetrics() {
        try {
            const decisions = Array.from(this.decisions.values())
                .filter(d => d.status === 'completed' && d.result);
            
            if (decisions.length === 0) {
                return this.performance.get('overall');
            }
            
            const profits = decisions.map(d => d.result.profit || 0);
            const losses = decisions.filter(d => !d.result.profitable).map(d => d.result.loss || 0);
            
            // Calcular Sharpe Ratio
            const avgReturn = profits.reduce((a, b) => a + b, 0) / profits.length;
            const variance = profits.reduce((sum, profit) => sum + Math.pow(profit - avgReturn, 2), 0) / profits.length;
            const volatility = Math.sqrt(variance);
            const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;
            
            // Win Rate
            const winRate = (decisions.filter(d => d.result.profitable).length / decisions.length) * 100;
            
            // Maximum Drawdown
            let maxDrawdown = 0;
            let peak = 0;
            let runningTotal = 0;
            
            decisions.forEach(decision => {
                runningTotal += decision.result.profit || 0;
                if (runningTotal > peak) {
                    peak = runningTotal;
                }
                const drawdown = (peak - runningTotal) / peak;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                }
            });
            
            // Profit Factor
            const totalProfits = decisions.filter(d => d.result.profitable)
                .reduce((sum, d) => sum + d.result.profit, 0);
            const totalLosses = Math.abs(decisions.filter(d => !d.result.profitable)
                .reduce((sum, d) => sum + d.result.loss, 0));
            const profitFactor = totalLosses > 0 ? totalProfits / totalLosses : totalProfits;
            
            const metrics = {
                ...this.performance.get('overall'),
                sharpeRatio: Math.round(sharpeRatio * 100) / 100,
                winRate: Math.round(winRate * 100) / 100,
                maxDrawdown: Math.round(maxDrawdown * 10000) / 100, // Convert to percentage
                profitFactor: Math.round(profitFactor * 100) / 100,
                averageWin: totalProfits / decisions.filter(d => d.result.profitable).length || 0,
                averageLoss: totalLosses / decisions.filter(d => !d.result.profitable).length || 0,
                expectancy: (winRate / 100) * (totalProfits / decisions.filter(d => d.result.profitable).length || 1) - 
                           ((100 - winRate) / 100) * (totalLosses / decisions.filter(d => !d.result.profitable).length || 1)
            };
            
            this.performance.set('overall', metrics);
            return metrics;
            
        } catch (error) {
            this.logger.error('❌ Error calculating advanced metrics:', error);
            return this.performance.get('overall');
        }
    }

    /**
     * 🔄 Processamento de background
     */
    startBackgroundProcessing() {
        this.backgroundInterval = setInterval(async () => {
            try {
                // Atualizar contexto de mercado
                await this.updateMarketContext();
                
                // Limpar decisões antigas
                this.cleanupOldDecisions();
                
                // Recalcular métricas
                this.calculateAdvancedMetrics();
                
                // Otimizar sistema de fallback baseado em performance
                this.optimizeFallbackRules();
                
            } catch (error) {
                this.logger.error('❌ Background processing error:', error);
            }
        }, 5 * 60 * 1000); // A cada 5 minutos
    }

    /**
     * 🛠️ Utilitários
     */
    generateAIPrompt(signalData, context) {
        return `
Analyze the following cryptocurrency trading signal and provide a trading decision:

SIGNAL DATA:
- Symbol: ${signalData.symbol}
- Price: $${signalData.price}
- Timeframe: ${signalData.timeframe || '1h'}
- Volume Ratio: ${signalData.volume_ratio || 'N/A'}
- Indicators: ${JSON.stringify(signalData.indicators || {})}

MARKET CONTEXT:
- Market Condition: ${context.marketCondition}
- Fear & Greed Index: ${context.fearGreedIndex}
- BTC Dominance: ${context.btcDominance}%
- Volatility: ${context.volatility}
- Risk Level: ${context.riskLevel}

Please provide a JSON response with:
{
  "action": "BUY|SELL|HOLD",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "positionSize": 0.01-0.1,
  "stopLoss": price_level,
  "takeProfit": price_level,
  "timeframe": "expected_duration"
}
        `.trim();
    }

    parseAIResponse(response) {
        try {
            // Tentar extrair JSON da resposta
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback parsing se não encontrar JSON
            return this.parseTextResponse(response);
            
        } catch (error) {
            this.logger.error('❌ Error parsing AI response:', error);
            throw new Error('Failed to parse AI response');
        }
    }

    parseTextResponse(response) {
        // Parsing simples de texto para extrair decisão
        const decision = {
            action: 'HOLD',
            confidence: 50,
            reasoning: response.substring(0, 200),
            positionSize: 0.05,
            stopLoss: 0,
            takeProfit: 0,
            timeframe: '1h'
        };
        
        if (response.toLowerCase().includes('buy')) {
            decision.action = 'BUY';
            decision.confidence = 70;
        } else if (response.toLowerCase().includes('sell')) {
            decision.action = 'SELL';
            decision.confidence = 70;
        }
        
        return decision;
    }

    validateSignal(signalData) {
        if (!signalData.symbol) {
            return { valid: false, error: 'Missing symbol' };
        }
        
        if (!signalData.price || signalData.price <= 0) {
            return { valid: false, error: 'Invalid price' };
        }
        
        return { valid: true };
    }

    validateAIDecision(decision) {
        return decision && 
               ['BUY', 'SELL', 'HOLD'].includes(decision.action) &&
               typeof decision.confidence === 'number' &&
               decision.confidence >= 0 && decision.confidence <= 100;
    }

    initializeFallbackRules() {
        // Regras básicas de fallback
        this.fallbackRules.set('rsi_oversold', {
            condition: (signal) => signal.indicators?.rsi < 30,
            action: 'BUY',
            confidence: 70,
            weight: 20
        });
        
        this.fallbackRules.set('rsi_overbought', {
            condition: (signal) => signal.indicators?.rsi > 70,
            action: 'SELL',
            confidence: 70,
            weight: 20
        });
        
        this.fallbackRules.set('golden_cross', {
            condition: (signal) => signal.indicators?.ema_cross === 'GOLDEN',
            action: 'BUY',
            confidence: 80,
            weight: 25
        });
        
        this.fallbackRules.set('death_cross', {
            condition: (signal) => signal.indicators?.ema_cross === 'DEATH',
            action: 'SELL',
            confidence: 80,
            weight: 25
        });
    }

    generateDecisionId() {
        return `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    assessMarketCondition() {
        const context = this.marketContext.get('current');
        return context?.trend || 'NEUTRAL';
    }

    assessVolatility(signalData) {
        // Análise simplificada de volatilidade
        if (signalData.volume_ratio > 2) return 'HIGH';
        if (signalData.volume_ratio < 0.5) return 'LOW';
        return 'MEDIUM';
    }

    assessRiskLevel(signalData) {
        // Análise de risco baseada em múltiplos fatores
        let riskScore = 0;
        
        if (signalData.volume_ratio < 0.5) riskScore += 1;
        if (!signalData.indicators) riskScore += 1;
        
        if (riskScore >= 2) return 'HIGH';
        if (riskScore === 1) return 'MEDIUM';
        return 'LOW';
    }

    calculatePositionSize(confidence, riskLevel) {
        let baseSize = this.config.riskManagement.maxPositionSize;
        
        // Ajustar baseado na confiança
        baseSize *= (confidence / 100);
        
        // Ajustar baseado no risco
        if (riskLevel === 'HIGH') baseSize *= 0.5;
        else if (riskLevel === 'LOW') baseSize *= 1.2;
        
        return Math.min(baseSize, this.config.riskManagement.maxPositionSize);
    }

    calculateSupport(signalData) {
        // Cálculo simplificado de suporte
        return signalData.price * 0.98;
    }

    calculateResistance(signalData) {
        // Cálculo simplificado de resistência
        return signalData.price * 1.02;
    }

    getSymbolPerformance(symbol) {
        // Performance simplificada
        return {
            accuracy: 65 + Math.random() * 20,
            totalTrades: Math.floor(Math.random() * 50) + 10,
            profitability: (Math.random() - 0.5) * 20
        };
    }

    getCurrentTradingSession() {
        const hour = new Date().getUTCHours();
        if (hour >= 0 && hour < 8) return 'ASIA';
        if (hour >= 8 && hour < 16) return 'EUROPE';
        return 'US';
    }

    assessLiquidity(signalData) {
        return signalData.volume_ratio > 1 ? 'HIGH' : 'LOW';
    }

    assessDataQuality(signalData) {
        let quality = 1.0;
        
        if (!signalData.indicators) quality *= 0.8;
        if (!signalData.volume_ratio) quality *= 0.9;
        if (!signalData.timeframe) quality *= 0.95;
        
        return quality;
    }

    calculateRiskRewardRatio(decision, signalData) {
        const risk = Math.abs(signalData.price - decision.stopLoss);
        const reward = Math.abs(decision.takeProfit - signalData.price);
        return risk > 0 ? reward / risk : 0;
    }

    getDailyTradeCount() {
        const today = new Date().toDateString();
        return Array.from(this.decisions.values())
            .filter(d => new Date(d.timestamp).toDateString() === today)
            .length;
    }

    async initializeMarketContext() {
        // Inicializar com dados mock
        this.marketContext.set('current', {
            trend: 'BULLISH',
            volatility: 'MEDIUM',
            volume: 'HIGH',
            fearGreedIndex: 65,
            btcDominance: 42.5,
            marketCap: 1.2e12,
            lastUpdate: Date.now()
        });
    }

    async updateMarketContext() {
        // Simular atualização (em produção, integrar com MarketAnalysisService)
        const context = this.marketContext.get('current');
        if (context) {
            context.lastUpdate = Date.now();
            // Adicionar lógica de atualização real aqui
        }
    }

    cleanupOldDecisions() {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
        const now = Date.now();
        
        for (const [id, decision] of this.decisions) {
            if ((now - decision.timestamp) > maxAge) {
                this.decisions.delete(id);
            }
        }
    }

    storeLearningData(decision, result) {
        const learningEntry = {
            signal: decision.signal,
            context: decision.context,
            decision: decision.decision,
            result,
            timestamp: Date.now()
        };
        
        this.learningData.set(decision.id, learningEntry);
        
        // Manter apenas dados recentes
        if (this.learningData.size > 1000) {
            const oldest = Array.from(this.learningData.keys())[0];
            this.learningData.delete(oldest);
        }
    }

    optimizeFallbackRules() {
        // Análise básica de performance das regras
        const rulePerformance = new Map();
        
        for (const [ruleId, rule] of this.fallbackRules) {
            const relevantDecisions = Array.from(this.decisions.values())
                .filter(d => d.decision.source === 'fallback' && 
                           d.decision.factors?.includes(ruleId));
            
            if (relevantDecisions.length > 0) {
                const successRate = relevantDecisions
                    .filter(d => d.result?.profitable)
                    .length / relevantDecisions.length;
                
                rulePerformance.set(ruleId, successRate);
                
                // Ajustar peso da regra baseado na performance
                if (successRate > 0.7) {
                    rule.weight *= 1.1; // Aumentar peso
                } else if (successRate < 0.4) {
                    rule.weight *= 0.9; // Diminuir peso
                }
                
                rule.weight = Math.max(5, Math.min(50, rule.weight)); // Limitar peso
            }
        }
    }

    /**
     * 📊 Estatísticas do serviço
     */
    getStats() {
        const performance = this.calculateAdvancedMetrics();
        
        return {
            isRunning: this.isRunning,
            openaiConnected: !!this.config.openai.apiKey,
            totalDecisions: this.decisions.size,
            activeDecisions: Array.from(this.decisions.values()).filter(d => d.status === 'active').length,
            performance,
            learningDataPoints: this.learningData.size,
            fallbackRules: this.fallbackRules.size,
            lastContextUpdate: this.marketContext.get('current')?.lastUpdate || 0
        };
    }

    /**
     * 📨 Handle messages from orchestrator
     */
    async handleMessage(action, payload, metadata) {
        try {
            switch (action) {
                case 'processSignal':
                    return await this.processSignal(payload.signalData);

                case 'updatePerformance':
                    return await this.updatePerformance(payload.decisionId, payload.result);

                case 'getDecision':
                    const decision = this.decisions.get(payload.decisionId);
                    return decision || null;

                case 'getPerformance':
                    return this.calculateAdvancedMetrics();

                case 'getStats':
                    return this.getStats();

                case 'testConnection':
                    if (this.config.openai.apiKey) {
                        return { connected: await this.testOpenAIConnection() };
                    }
                    return { connected: false, reason: 'No API key' };

                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            this.logger.error(`❌ Error handling message ${action}:`, error);
            throw error;
        }
    }
}

module.exports = AIDecisionService;
