// ⚡ TRADING CONTROLLER - ENTERPRISE MARKETBOT
// Processamento de sinais + IA + execução

const TradingEngine = require('../../../trading/enterprise/trading-engine');
const MarketAnalyzer = require('../../../trading/enterprise/market-analyzer');
const AIDecision = require('../../../trading/enterprise/ai-decision');
const OrderExecutor = require('../../../trading/enterprise/order-executor');

class TradingController {
    constructor() {
        this.tradingEngine = new TradingEngine();
        this.marketAnalyzer = new MarketAnalyzer();
        this.aiDecision = new AIDecision();
        this.orderExecutor = new OrderExecutor();
    }

    async processSignal(req, res) {
        try {
            const signal = req.body;
            
            // 1. Validar sinal (30 segundos)
            const isValid = await this.validateSignal(signal);
            if (!isValid) {
                return res.status(400).json({ error: 'Sinal inválido ou expirado' });
            }

            // 2. Análise de mercado
            const marketData = await this.marketAnalyzer.analyzeMarket(signal.symbol || 'BTCUSDT');
            
            // 3. Decisão IA (GPT-4)
            const aiDecision = await this.aiDecision.makeDecision(signal, marketData);
            
                        // 4. Executar se decisão for BUY/SELL
            let executionResult = { success: false, message: 'Decisão HOLD - não executado' };
            
            if (aiDecision.action !== 'HOLD') {
                // Simular execução para usuário de teste
                const testUserConfig = { userId: 'test', balance: 1000 };
                executionResult = await this.orderExecutor.executeOrder(aiDecision, signal, testUserConfig);
            }
            
            res.json({
                success: true,
                signal_processed: true,
                execution_result: executionResult,
                ai_decision: aiDecision.action,
                confidence: aiDecision.confidence,
                market_analysis: marketData.sentiment
            });
            
        } catch (error) {
            console.error('Erro processando sinal:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }

    async executeManualOrder(req, res) {
        try {
            const { userId, symbol, side, leverage, stopLoss, takeProfit } = req.body;
            
            // Executar ordem manual
            const result = await this.orderExecutor.executeManualOrder({
                userId,
                symbol,
                side,
                leverage,
                stopLoss,
                takeProfit
            });
            
            res.json(result);
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getActivePositions(req, res) {
        try {
            const { userId } = req.params;
            const positions = await this.tradingEngine.getActivePositions(userId);
            res.json(positions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async closePositions(req, res) {
        try {
            const { action } = req.body; // "FECHE_LONG" ou "FECHE_SHORT"
            
            const results = await this.orderExecutor.closePositionsBySignal(action);
            
            res.json({
                success: true,
                closed_positions: results.length,
                action
            });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getMarketAnalysis(req, res) {
        try {
            const analysis = await this.marketAnalyzer.analyzeMarket('BTCUSDT');
            res.json({
                success: true,
                analysis
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getTradingConfig(req, res) {
        try {
            const { userId } = req.params;
            // Em produção, buscar do banco de dados
            const config = {
                userId,
                maxPositions: 2,
                riskPerTrade: 0.02,
                cooldownMinutes: 120,
                enableAI: true,
                exchanges: ['binance', 'bybit'],
                testMode: process.env.NODE_ENV !== 'production'
            };
            
            res.json({
                success: true,
                config
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateTradingConfig(req, res) {
        try {
            const { userId } = req.params;
            const updates = req.body;
            
            // Em produção, salvar no banco de dados
            console.log(`🔧 Configurações atualizadas para usuário ${userId}:`, updates);
            
            res.json({
                success: true,
                message: 'Configurações atualizadas',
                userId,
                updates
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async validateSignal(signal) {
        // Validar estrutura do sinal
        if (!signal.symbol || !signal.action) return false;
        
        // Validar tempo (30 segundos de janela)
        if (signal.timestamp) {
            const now = Date.now();
            const signalTime = new Date(signal.timestamp).getTime();
            if (now - signalTime > 30000) return false; // 30 segundos
        }
        
        return true;
    }
}

const tradingController = new TradingController();

module.exports = {
    processSignal: tradingController.processSignal.bind(tradingController),
    executeManualOrder: tradingController.executeManualOrder.bind(tradingController),
    getActivePositions: tradingController.getActivePositions.bind(tradingController),
    closePositions: tradingController.closePositions.bind(tradingController),
    getMarketAnalysis: tradingController.getMarketAnalysis.bind(tradingController),
    getTradingConfig: tradingController.getTradingConfig.bind(tradingController),
    updateTradingConfig: tradingController.updateTradingConfig.bind(tradingController)
};