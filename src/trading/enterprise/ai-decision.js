// 🤖 AI DECISION ENGINE - ENTERPRISE
// Decisão de trading com OpenAI GPT-4

const OpenAI = require('openai');

class AIDecision {
    constructor() {
        this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        }) : null;
        
        this.decisionCache = new Map();
        this.cooldowns = new Map();
    }

    async makeDecision(signal, marketAnalysis) {
        try {
            console.log('🤖 AI analisando decisão de trading...');
            
            // Verificar cooldown
            if (this.isInCooldown(signal.symbol)) {
                return this.createDecision('HOLD', 'Em período de cooldown', 0);
            }

            // Preparar contexto para IA
            const context = this.prepareAIContext(signal, marketAnalysis);
            
            // Fazer decisão com IA (se disponível) ou lógica padrão
            const decision = this.openai ? 
                await this.makeAIDecision(context) : 
                await this.makeLogicalDecision(context);

            // Aplicar risk management
            const finalDecision = this.applyRiskManagement(decision, signal);
            
            console.log(`🎯 Decisão AI: ${finalDecision.action} (confiança: ${finalDecision.confidence}%)`);
            return finalDecision;
            
        } catch (error) {
            console.error('❌ Erro na decisão AI:', error.message);
            return this.createDecision('HOLD', 'Erro na análise AI', 0);
        }
    }

    prepareAIContext(signal, marketAnalysis) {
        return {
            signal: {
                symbol: signal.symbol,
                action: signal.action,
                price: signal.price,
                source: 'TradingView'
            },
            market: {
                fearGreed: marketAnalysis.fearGreedIndex,
                btcDominance: marketAnalysis.btcDominance,
                top100: marketAnalysis.top100Movement,
                technical: marketAnalysis.technicalIndicators,
                sentiment: marketAnalysis.sentiment
            },
            constraints: {
                maxPositions: 2,
                requireSLTP: true,
                riskPerTrade: 2, // 2% max risk
                cooldownMinutes: 120
            }
        };
    }

    async makeAIDecision(context) {
        try {
            const prompt = this.buildAIPrompt(context);
            
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "Você é um especialista em trading de criptomoedas. Analise o contexto e retorne APENAS um JSON com: {\"action\": \"BUY|SELL|HOLD\", \"confidence\": 0-100, \"reason\": \"motivo\", \"stopLoss\": preço, \"takeProfit\": preço}"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 200,
                temperature: 0.1
            });

            const aiResponse = completion.choices[0].message.content;
            const decision = JSON.parse(aiResponse);
            
            return this.createDecision(
                decision.action,
                decision.reason,
                decision.confidence,
                decision.stopLoss,
                decision.takeProfit
            );
            
        } catch (error) {
            console.error('❌ Erro na API OpenAI:', error.message);
            return this.makeLogicalDecision(context);
        }
    }

    async makeLogicalDecision(context) {
        const { signal, market } = context;
        let score = 50; // Neutro
        let action = 'HOLD';
        let reason = 'Análise lógica padrão';

        // Análise do sinal TradingView
        if (signal.action.includes('LONG') || signal.action.includes('BUY')) {
            score += 20;
        } else if (signal.action.includes('SHORT') || signal.action.includes('SELL')) {
            score -= 20;
        }

        // Análise Fear & Greed
        const fearGreed = market.fearGreed.value;
        if (fearGreed < 25) score += 15; // Extreme Fear = oportunidade
        else if (fearGreed > 75) score -= 15; // Extreme Greed = cuidado

        // Análise sentiment geral
        if (market.sentiment === 'VERY_BULLISH') score += 25;
        else if (market.sentiment === 'BULLISH') score += 15;
        else if (market.sentiment === 'BEARISH') score -= 15;
        else if (market.sentiment === 'VERY_BEARISH') score -= 25;

        // Decisão final
        if (score >= 70) {
            action = 'BUY';
            reason = 'Múltiplos indicadores bullish';
        } else if (score <= 30) {
            action = 'SELL';
            reason = 'Múltiplos indicadores bearish';
        } else {
            action = 'HOLD';
            reason = 'Sinais mistos - aguardar';
        }

        const confidence = Math.min(100, Math.max(0, Math.abs(score - 50) * 2));
        
        return this.createDecision(action, reason, confidence);
    }

    buildAIPrompt(context) {
        return `
ANÁLISE DE TRADING - ${context.signal.symbol}

SINAL RECEBIDO:
- Ação: ${context.signal.action}
- Preço: $${context.signal.price}
- Fonte: ${context.signal.source}

ANÁLISE DE MERCADO:
- Fear & Greed: ${context.market.fearGreed.value} (${context.market.fearGreed.sentiment})
- BTC Dominance: ${context.market.btcDominance.percentage}% (${context.market.btcDominance.trend})
- Top100 Movement: ${context.market.top100.green_percentage}% green (${context.market.top100.trend})
- Sentiment Geral: ${context.market.sentiment}
- RSI: ${context.market.technical.rsi}
- MACD: ${context.market.technical.macd_signal}

REGRAS DE RISK MANAGEMENT:
- Máximo 2 posições simultâneas
- Stop Loss e Take Profit obrigatórios
- Risco máximo 2% por trade
- Cooldown de 120 minutos entre trades

Analise e decida: BUY, SELL ou HOLD?
        `;
    }

    createDecision(action, reason, confidence, stopLoss = null, takeProfit = null) {
        return {
            action,
            reason,
            confidence: Math.round(confidence),
            stopLoss,
            takeProfit,
            timestamp: new Date().toISOString(),
            cooldownUntil: action !== 'HOLD' ? 
                new Date(Date.now() + 120 * 60 * 1000).toISOString() : null
        };
    }

    applyRiskManagement(decision, signal) {
        // Se não tem SL/TP definidos, calcular automaticamente
        if (decision.action === 'BUY' && !decision.stopLoss) {
            const price = parseFloat(signal.price);
            decision.stopLoss = Math.round(price * 0.98 * 100) / 100; // -2%
            decision.takeProfit = Math.round(price * 1.04 * 100) / 100; // +4%
        } else if (decision.action === 'SELL' && !decision.stopLoss) {
            const price = parseFloat(signal.price);
            decision.stopLoss = Math.round(price * 1.02 * 100) / 100; // +2%
            decision.takeProfit = Math.round(price * 0.96 * 100) / 100; // -4%
        }

        // Registrar cooldown se for executar trade
        if (decision.action !== 'HOLD') {
            this.setCooldown(signal.symbol);
        }

        return decision;
    }

    isInCooldown(symbol) {
        const cooldownUntil = this.cooldowns.get(symbol);
        return cooldownUntil && new Date() < cooldownUntil;
    }

    setCooldown(symbol) {
        const cooldownUntil = new Date(Date.now() + 120 * 60 * 1000); // 120 min
        this.cooldowns.set(symbol, cooldownUntil);
    }
}

module.exports = AIDecision;
