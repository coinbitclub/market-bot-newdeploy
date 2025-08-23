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
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coinbitclub',
            ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
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
     * 📝 Registrar novo sinal no histórico
     */
    async recordSignal(signalData) {
        try {
            const ticker = signalData.ticker || 'BTCUSDT';
            
            // Salvar no banco
            await this.saveSignalToDatabase(signalData);
            
            // Atualizar cache
            await this.updateSignalCache(ticker);
            
            console.log(`📝 Sinal registrado para ${ticker}: ${signalData.signal}`);
            
        } catch (error) {
            console.error('❌ Erro ao registrar sinal:', error.message);
        }
    }

    /**
     * 📊 Analisar histórico de sinais para uma moeda
     */
    async analyzeSignalHistory(ticker) {
        try {
            const history = await this.getRecentSignalHistory(ticker, 50); // Últimos 50 sinais
            
            const analysis = {
                totalSignals: history.length,
                longSignals: history.filter(s => s.signal.includes('LONG')).length,
                shortSignals: history.filter(s => s.signal.includes('SHORT')).length,
                recentTrend: this.calculateRecentTrend(history.slice(0, 10)),
                contrarianRisk: this.detectContrarianMovement(history),
                recommendation: 'NEUTRAL'
            };
            
            // Gerar recomendação baseada na análise
            analysis.recommendation = this.generateRecommendation(analysis);
            
            return analysis;
            
        } catch (error) {
            console.error('❌ Erro na análise:', error.message);
            return { error: error.message };
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
            
            if (history.length === 0) {
                return {
                    ticker: ticker,
                    trend: 'NEUTRAL',
                    strength: 0,
                    lastSignals: [],
                    recommendation: 'HOLD'
                };
            }

            // Analisar tendência dos últimos sinais
            const analysis = this.analyzeSignalTrend(history);
            
            return {
                ticker: ticker,
                trend: analysis.trend,
                strength: analysis.strength,
                lastSignals: history.slice(0, 10), // Últimos 10
                recommendation: analysis.recommendation,
                volatilityDirection: analysis.volatilityDirection,
                signalCount: history.length
            };

        } catch (error) {
            console.error(`❌ Erro ao analisar histórico ${ticker}:`, error.message);
            return null;
        }
    }

    /**
     * 🔍 Detectar movimento contrário para encerramento
     */
    async detectContrarianMovement(currentPosition) {
        try {
            const ticker = currentPosition.ticker;
            const positionDirection = currentPosition.direction; // LONG ou SHORT
            
            // Buscar sinais recentes (últimas 2 horas)
            const recentSignals = await this.getRecentSignals(ticker, 2);
            
            // Analisar se há sinais contrários
            const contrarianAnalysis = this.analyzeContrarianSignals(recentSignals, positionDirection);
            
            if (contrarianAnalysis.shouldClose) {
                console.log(`⚠️ Movimento contrário detectado em ${ticker}:`, contrarianAnalysis.reason);
                return {
                    shouldClose: true,
                    reason: contrarianAnalysis.reason,
                    confidence: contrarianAnalysis.confidence,
                    recentSignals: recentSignals.slice(0, 5)
                };
            }

            return { shouldClose: false };

        } catch (error) {
            console.error('❌ Erro na detecção de movimento contrário:', error.message);
            return { shouldClose: false };
        }
    }

    /**
     * 📈 Analisar tendência dos sinais
     */
    analyzeSignalTrend(signals) {
        const longSignals = signals.filter(s => s.signal_type.includes('LONG')).length;
        const shortSignals = signals.filter(s => s.signal_type.includes('SHORT')).length;
        const forteSignals = signals.filter(s => s.signal_type.includes('FORTE')).length;
        
        const totalSignals = signals.length;
        const longRatio = longSignals / totalSignals;
        const shortRatio = shortSignals / totalSignals;
        const forteRatio = forteSignals / totalSignals;

        let trend = 'NEUTRAL';
        let strength = 0;
        let recommendation = 'HOLD';
        let volatilityDirection = 'STABLE';

        // Determinar tendência
        if (longRatio > 0.6) {
            trend = 'BULLISH';
            strength = Math.min(longRatio + forteRatio, 1);
            recommendation = 'LONG';
        } else if (shortRatio > 0.6) {
            trend = 'BEARISH';
            strength = Math.min(shortRatio + forteRatio, 1);
            recommendation = 'SHORT';
        }

        // Analisar volatilidade das últimas 10 sinais
        const recent10 = signals.slice(0, 10);
        const recentLongs = recent10.filter(s => s.signal_type.includes('LONG')).length;
        const recentShorts = recent10.filter(s => s.signal_type.includes('SHORT')).length;

        if (recentLongs > recentShorts * 2) {
            volatilityDirection = 'LONG_BIAS';
        } else if (recentShorts > recentLongs * 2) {
            volatilityDirection = 'SHORT_BIAS';
        } else if (Math.abs(recentLongs - recentShorts) <= 2) {
            volatilityDirection = 'MIXED';
        }

        return {
            trend,
            strength: Math.round(strength * 100) / 100,
            recommendation,
            volatilityDirection,
            stats: {
                total: totalSignals,
                longs: longSignals,
                shorts: shortSignals,
                fortes: forteSignals,
                longRatio: Math.round(longRatio * 100),
                shortRatio: Math.round(shortRatio * 100)
            }
        };
    }

    /**
     * ⚠️ Analisar sinais contrários para fechamento
     */
    analyzeContrarianSignals(recentSignals, currentDirection) {
        if (recentSignals.length < 3) {
            return { shouldClose: false };
        }

        const last5Signals = recentSignals.slice(0, 5);
        
        // Se posição é LONG, verificar sinais SHORT recentes
        if (currentDirection === 'LONG') {
            const shortSignals = last5Signals.filter(s => s.signal_type.includes('SHORT'));
            const shortForteSignals = shortSignals.filter(s => s.signal_type.includes('FORTE'));
            
            // Fechar se 3+ sinais SHORT nos últimos 5, ou 2+ SHORT FORTE
            if (shortSignals.length >= 3 || shortForteSignals.length >= 2) {
                return {
                    shouldClose: true,
                    reason: `${shortSignals.length} sinais SHORT recentes (${shortForteSignals.length} FORTE)`,
                    confidence: Math.min((shortSignals.length / 5) * 100, 100)
                };
            }
        }

        // Se posição é SHORT, verificar sinais LONG recentes
        if (currentDirection === 'SHORT') {
            const longSignals = last5Signals.filter(s => s.signal_type.includes('LONG'));
            const longForteSignals = longSignals.filter(s => s.signal_type.includes('FORTE'));
            
            // Fechar se 3+ sinais LONG nos últimos 5, ou 2+ LONG FORTE
            if (longSignals.length >= 3 || longForteSignals.length >= 2) {
                return {
                    shouldClose: true,
                    reason: `${longSignals.length} sinais LONG recentes (${longForteSignals.length} FORTE)`,
                    confidence: Math.min((longSignals.length / 5) * 100, 100)
                };
            }
        }

        return { shouldClose: false };
    }

    /**
     * 🗄️ Buscar histórico recente de sinais
     */
    async getRecentSignalHistory(ticker, limit = 50) {
        try {
            const query = `
                SELECT signal_type, ticker, timestamp, processed_at,
                       EXTRACT(EPOCH FROM (NOW() - timestamp))/3600 as hours_ago
                FROM trading_signals
                WHERE ticker = $1
                ORDER BY timestamp DESC
                LIMIT $2
            `;
            
            const result = await this.pool.query(query, [ticker, limit]);
            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao buscar histórico:', error.message);
            return [];
        }
    }

    /**
     * ⏰ Buscar sinais recentes (últimas X horas)
     */
    async getRecentSignals(ticker, hours = 2) {
        try {
            const query = `
                SELECT signal_type, ticker, timestamp, processed_at
                FROM trading_signals
                WHERE ticker = $1 
                  AND timestamp > NOW() - INTERVAL '${hours} hours'
                ORDER BY timestamp DESC
            `;
            
            const result = await this.pool.query(query, [ticker]);
            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao buscar sinais recentes:', error.message);
            return [];
        }
    }

    /**
     * 💾 Salvar sinal no banco de dados
     */
    async saveSignalToDatabase(signalData) {
        try {
            const query = `
                INSERT INTO trading_signals (
                    signal_type, ticker, source, raw_data, timestamp, processed_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
            `;
            
            await this.pool.query(query, [
                signalData.signal,
                signalData.ticker || 'BTCUSDT',
                signalData.source || 'TradingView',
                JSON.stringify(signalData),
                signalData.timestamp || new Date()
            ]);
        } catch (error) {
            console.warn('⚠️ Erro ao salvar sinal no banco:', error.message);
        }
    }

    /**
     * 🔄 Atualizar cache de sinais
     */
    async updateSignalCache(ticker) {
        try {
            const recentHistory = await this.getRecentSignalHistory(ticker, 20);
            this.signalHistory.set(ticker, recentHistory);
        } catch (error) {
            console.warn('⚠️ Erro ao atualizar cache:', error.message);
        }
    }

    /**
     * 📊 Obter estatísticas consolidadas
     */
    async getSignalStatistics(ticker, days = 7) {
        try {
            const query = `
                SELECT 
                    signal_type,
                    COUNT(*) as count,
                    DATE(timestamp) as date
                FROM trading_signals
                WHERE ticker = $1 
                  AND timestamp > NOW() - INTERVAL '${days} days'
                GROUP BY signal_type, DATE(timestamp)
                ORDER BY date DESC, count DESC
            `;
            
            const result = await this.pool.query(query, [ticker]);
            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error.message);
            return [];
        }
    }

    /**
     * 🗄️ Criar tabelas necessárias
     */
    async createTables() {
        try {
            const createSignalHistoryTable = `
                CREATE TABLE IF NOT EXISTS signal_history (
                    id SERIAL PRIMARY KEY,
                    ticker VARCHAR(20) NOT NULL,
                    signal_type VARCHAR(50) NOT NULL,
                    source VARCHAR(50) DEFAULT 'TradingView',
                    timestamp TIMESTAMP NOT NULL,
                    processed_at TIMESTAMP DEFAULT NOW(),
                    analysis_result JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_signal_history_ticker_timestamp 
                ON signal_history(ticker, timestamp DESC);
                
                CREATE INDEX IF NOT EXISTS idx_signal_history_processed_at 
                ON signal_history(processed_at DESC);
            `;

            await this.pool.query(createSignalHistoryTable);
            console.log('✅ Tabela signal_history verificada/criada');
        } catch (error) {
            console.log('⚠️ Aviso ao criar tabela de histórico:', error.message);
        }
    }
}

module.exports = SignalHistoryAnalyzer;
