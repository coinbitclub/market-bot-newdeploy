
// 🔥 TRADING SYSTEMS INTEGRATOR - ENTERPRISE
// Integra todos os sistemas de trading existentes

const TradingEngine = require('../trading/enterprise/trading-engine');
const MarketAnalyzer = require('../trading/enterprise/market-analyzer');
const AIDecision = require('../trading/enterprise/ai-decision');
const OrderExecutor = require('../trading/enterprise/order-executor');
const RealTradingExecutor = require('../../scripts/trading/real-trading-executor');
const RiskManagement = require('../../scripts/trading/risk-management-system');
const PositionMonitor = require('../../scripts/monitoring/real-time-position-monitor');

class TradingSystemsIntegrator {
    constructor() {
        this.tradingEngine = new TradingEngine();
        this.marketAnalyzer = new MarketAnalyzer();
        this.aiDecision = new AIDecision();
        this.orderExecutor = new OrderExecutor();
        this.realExecutor = new RealTradingExecutor();
        this.riskManager = new RiskManagement();
        this.positionMonitor = new PositionMonitor();
        
        console.log('🔥 Trading Systems Integrator iniciado');
    }

    async processCompleteSignal(signal) {
        try {
            console.log('📡 Processando sinal completo:', signal.symbol);
            
            // 1. Análise de mercado (Market Analyzer)
            const marketAnalysis = await this.marketAnalyzer.analyzeMarket(signal.symbol);
            
            // 2. Decisão IA (AI Decision)
            const aiDecision = await this.aiDecision.makeDecision(signal, marketAnalysis);
            
            // 3. Validação de risco (Risk Management)
            const riskValidation = await this.riskManager.validarOrdemPreExecucao({
                signal,
                decision: aiDecision,
                marketAnalysis
            });
            
            if (!riskValidation.approved) {
                console.log('⚠️ Execução bloqueada pelo sistema de risco');
                return { success: false, reason: riskValidation.reason };
            }
            
            // 4. Execução real (Real Trading Executor)
            const executionResult = await this.realExecutor.processSignalAndExecute(signal);
            
            // 5. Monitoramento em tempo real (Position Monitor)
            if (executionResult.success) {
                await this.positionMonitor.adicionarPosicao({
                    signal,
                    execution: executionResult,
                    aiDecision,
                    marketAnalysis
                });
            }
            
            return {
                success: true,
                marketAnalysis,
                aiDecision,
                riskValidation,
                executionResult,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Erro no processamento completo:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getSystemStatus() {
        return {
            trading_engine: await this.tradingEngine.getStatus(),
            market_analyzer: await this.marketAnalyzer.getStatus(),
            ai_decision: await this.aiDecision.getStatus(),
            real_executor: await this.realExecutor.getStatus(),
            risk_manager: await this.riskManager.getStatus(),
            position_monitor: await this.positionMonitor.obterMetricas(),
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = TradingSystemsIntegrator;
