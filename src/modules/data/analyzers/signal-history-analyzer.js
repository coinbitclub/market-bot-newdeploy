/**
 * 🧠 SISTEMA DE HISTÓRICO E ANÁLISE DE SINAIS
 * ==========================================
 * 
 * Mantém histórico de todos os sinais por moeda para análise da IA
 * Monitora tendências e movimentos contrários em tempo real
 */

const { Pool } = require('pg');

class SignalHistoryAnalyzer {
    constructor() {
        this.pool = new Pool({
            connectionString: 'process.env.DATABASE_URL',
            ssl: false
        });

        // Cache de histórico por ticker
        this.signalHistory = new Map();
        
        console.log('🧠 Signal History Analyzer iniciado');
        console.log('📊 Monitoramento de histórico de sinais ativo');
    }

    /**
     * 🔍 ANÁLISE DE SINAL (Método principal para o processador)
     */
    async analyzeSignal(ticker, signal) {
        try {
            // Buscar histórico recente
            const history = await this.getRecentSignalHistory(ticker, 20);
            
            // Analisar padrões
            const analysis = this.analyzePatterns(history, signal);
            
            // Detectar movimento contrário
            const contrarianAnalysis = this.detectContrarianMovement(history, signal);
            
            return {
                recommendation: analysis.recommendation,
                pattern: analysis.pattern,
                signalCount: history.length,
                contrarianRisk: contrarianAnalysis.risk,
                confidence: analysis.confidence,
                details: {
                    recentSignals: history.slice(0, 5).map(h => h.signal),
                    lastSignal: history[0]?.signal || 'Nenhum',
                    timePattern: this.analyzeTimePattern(history)
                }
            };
            
        } catch (error) {
            console.error('❌ Erro na análise de sinal:', error.message);
            return {
                recommendation: 'NEUTRAL',
                pattern: 'ERROR',
                signalCount: 0,
                contrarianRisk: 'LOW',
                confidence: 0.5
            };
        }
    }

    /**
     * 🔍 BUSCAR HISTÓRICO RECENTE DE SINAIS
     */
    async getRecentSignalHistory(ticker, limit = 20) {
        try {
            const result = await this.pool.query(`
                SELECT signal, received_at, source, ai_approved, execution_success
                FROM signal_history 
                WHERE ticker = $1 
                ORDER BY received_at DESC 
                LIMIT $2
            `, [ticker, limit]);
            
            return result.rows || [];
            
        } catch (error) {
            console.warn('⚠️ Erro ao buscar histórico, usando cache:', error.message);
            
            // Fallback para cache em memória
            const cached = this.signalHistory.get(ticker) || [];
            return cached.slice(0, limit);
        }
    }

    /**
     * 🔍 ANALISAR PADRÕES
     */
    analyzePatterns(history, currentSignal) {
        if (history.length === 0) {
            return {
                recommendation: 'NEUTRAL',
                pattern: 'NO_HISTORY',
                confidence: 0.5
            };
        }

        const recentSignals = history.slice(0, 5);
        const longCount = recentSignals.filter(s => s.signal.includes('LONG')).length;
        const shortCount = recentSignals.filter(s => s.signal.includes('SHORT')).length;
        
        // Detectar padrões
        let pattern = 'MIXED';
        let confidence = 0.5;
        
        if (longCount >= 4) {
            pattern = 'STRONG_LONG_TREND';
            confidence = 0.8;
        } else if (shortCount >= 4) {
            pattern = 'STRONG_SHORT_TREND';
            confidence = 0.8;
        } else if (longCount > shortCount) {
            pattern = 'LONG_BIAS';
            confidence = 0.6;
        } else if (shortCount > longCount) {
            pattern = 'SHORT_BIAS';
            confidence = 0.6;
        }
        
        // Gerar recomendação
        let recommendation = 'NEUTRAL';
        const currentDirection = currentSignal.includes('LONG') ? 'LONG' : 'SHORT';
        
        if (pattern.includes('LONG') && currentDirection === 'LONG') {
            recommendation = 'APPROVE';
        } else if (pattern.includes('SHORT') && currentDirection === 'SHORT') {
            recommendation = 'APPROVE';
        } else if (pattern.includes('STRONG') && 
                  ((pattern.includes('LONG') && currentDirection === 'SHORT') ||
                   (pattern.includes('SHORT') && currentDirection === 'LONG'))) {
            recommendation = 'REJECT'; // Movimento contrário forte
        }
        
        return { recommendation, pattern, confidence };
    }

    /**
     * 🚨 DETECTAR MOVIMENTO CONTRÁRIO
     */
    detectContrarianMovement(history, currentSignal) {
        if (history.length < 3) {
            return { risk: 'LOW', reason: 'Histórico insuficiente' };
        }

        const recent = history.slice(0, 3);
        const currentDirection = currentSignal.includes('LONG') ? 'LONG' : 'SHORT';
        
        // Verificar se os últimos sinais foram na direção oposta
        const oppositeSignals = recent.filter(s => {
            const signalDirection = s.signal.includes('LONG') ? 'LONG' : 'SHORT';
            return signalDirection !== currentDirection;
        });
        
        if (oppositeSignals.length >= 2) {
            return {
                risk: 'HIGH',
                reason: `${oppositeSignals.length}/3 sinais recentes na direção oposta`
            };
        } else if (oppositeSignals.length === 1) {
            return {
                risk: 'MEDIUM',
                reason: 'Possível mudança de tendência'
            };
        }
        
        return { risk: 'LOW', reason: 'Sinais alinhados' };
    }

    /**
     * ⏰ ANALISAR PADRÃO DE TEMPO
     */
    analyzeTimePattern(history) {
        if (history.length < 2) return 'INSUFFICIENT_DATA';
        
        const intervals = [];
        for (let i = 0; i < history.length - 1; i++) {
            const time1 = new Date(history[i].received_at);
            const time2 = new Date(history[i + 1].received_at);
            intervals.push((time1 - time2) / 1000 / 60); // minutos
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        if (avgInterval < 15) return 'HIGH_FREQUENCY';
        else if (avgInterval < 60) return 'NORMAL_FREQUENCY';
        else return 'LOW_FREQUENCY';
    }

    /**
     * 📝 REGISTRAR EXECUÇÃO DE SINAL
     */
    async recordSignalExecution(ticker, signal, userId, orderId) {
        try {
            await this.pool.query(`
                INSERT INTO signal_history (
                    ticker, signal, user_id, order_id, 
                    received_at, execution_success
                ) VALUES ($1, $2, $3, $4, NOW(), true)
            `, [ticker, signal, userId, orderId]);
            
            console.log(`📝 Execução registrada: ${signal} ${ticker} para usuário ${userId}`);
            
        } catch (error) {
            console.error('❌ Erro ao registrar execução:', error.message);
        }
    }

    /**
     * 📊 OBTER ESTATÍSTICAS DO TICKER
     */
    async getTickerStatistics(ticker) {
        try {
            const result = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_signals,
                    COUNT(*) FILTER (WHERE signal LIKE '%LONG%') as long_signals,
                    COUNT(*) FILTER (WHERE signal LIKE '%SHORT%') as short_signals,
                    COUNT(*) FILTER (WHERE execution_success = true) as successful_executions,
                    MAX(received_at) as last_signal_time
                FROM signal_history 
                WHERE ticker = $1 
                AND received_at >= NOW() - INTERVAL '7 days'
            `, [ticker]);
            
            const stats = result.rows[0];
            
            return {
                ticker: ticker,
                totalSignals: parseInt(stats.total_signals) || 0,
                longSignals: parseInt(stats.long_signals) || 0,
                shortSignals: parseInt(stats.short_signals) || 0,
                successfulExecutions: parseInt(stats.successful_executions) || 0,
                lastSignalTime: stats.last_signal_time,
                successRate: stats.total_signals > 0 ? 
                    ((stats.successful_executions / stats.total_signals) * 100).toFixed(1) : '0.0'
            };
            
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error.message);
            return {
                ticker: ticker,
                totalSignals: 0,
                longSignals: 0,
                shortSignals: 0,
                successfulExecutions: 0,
                successRate: '0.0'
            };
        }
    }
}

module.exports = SignalHistoryAnalyzer;
