/**
 * 📊 MONITOR DE MÉTRICAS DOS SINAIS
 * Sistema para monitoramento contínuo dos dados recebidos nos sinais
 * para monitoramento das posições em andamento
 * 
 * FUNCIONALIDADES:
 * - Acompanha métricas dos sinais recebidos
 * - Detecta padrões nos sinais de entrada
 * - Monitora qualidade e frequência dos sinais
 * - Avalia efetividade dos sinais por ticker
 * - Análise de timing entre sinais
 */

const { Pool } = require('pg');

class SignalMetricsMonitor {
    constructor() {
        this.pool = new Pool({
            connectionString: 'process.env.DATABASE_URL',
            ssl: false
        });

        // Cache de métricas
        this.signalMetrics = new Map();
        this.tickerMetrics = new Map();
        this.timePatterns = new Map();
        
        console.log('📊 Signal Metrics Monitor inicializado');
    }

    /**
     * 📡 REGISTRAR SINAL RECEBIDO
     */
    async registerSignal(signalData, marketDirection, aiDecision) {
        try {
            // Extrair dados de BTC e RSI se disponíveis
            const btcAnalysis = aiDecision.btcAnalysis || {};
            const rsiAnalysis = aiDecision.rsiAnalysis || {};
            
            const signalRecord = {
                signal: signalData.signal,
                ticker: signalData.ticker,
                symbol: signalData.symbol || signalData.ticker, // Garantir que symbol não seja NULL
                source: signalData.source,
                timestamp: new Date(signalData.timestamp || Date.now()),
                market_direction: marketDirection.allowed,
                fear_greed: marketDirection.fearGreed.value,
                top100_percentage: marketDirection.top100.percentageUp,
                top100_trend: marketDirection.top100.trend || 'NEUTRAL',
                btc_dominance: btcAnalysis.btcDominance?.btcDominance || null,
                market_rsi: rsiAnalysis.marketOverview?.averageRSI || null,
                ai_approved: aiDecision.shouldExecute,
                ai_reason: aiDecision.reason || aiDecision.analysis,
                confidence: aiDecision.confidence || (aiDecision.shouldExecute ? 75 : 25), // Confidence padrão
                is_strong_signal: signalData.signal && signalData.signal.includes('FORTE'),
                execution_time_ms: aiDecision.execution_time_ms || null,
                users_affected: aiDecision.users_affected || 0,
                orders_created: aiDecision.orders_created || 0,
                status: 'PENDING'
            };

            // Salvar no banco com todos os campos
            const result = await this.pool.query(`
                INSERT INTO signal_metrics_log (
                    signal_type, ticker, symbol, source, received_at,
                    market_direction, fear_greed_value, top100_percentage_up, top100_trend,
                    btc_dominance, market_rsi, ai_approved, ai_reason, confidence,
                    is_strong_signal, execution_time_ms, users_affected, orders_created,
                    status, processed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
                RETURNING id
            `, [
                signalRecord.signal,
                signalRecord.ticker,
                signalRecord.symbol,
                signalRecord.source,
                signalRecord.timestamp,
                signalRecord.market_direction,
                signalRecord.fear_greed,
                signalRecord.top100_percentage,
                signalRecord.top100_trend,
                signalRecord.btc_dominance,
                signalRecord.market_rsi,
                signalRecord.ai_approved,
                signalRecord.ai_reason,
                signalRecord.confidence,
                signalRecord.is_strong_signal,
                signalRecord.execution_time_ms,
                signalRecord.users_affected,
                signalRecord.orders_created,
                signalRecord.status
            ]);

            const signalId = result.rows[0].id;
            
            // Atualizar métricas em cache
            await this.updateSignalMetrics(signalRecord);
            await this.updateTickerMetrics(signalRecord);
            await this.updateTimePatterns(signalRecord);
            
            // Analisar padrões do sinal
            const patterns = await this.analyzeSignalPatterns(signalRecord);
            
            console.log(`📊 Sinal registrado: ${signalRecord.signal} ${signalRecord.ticker} | IA: ${signalRecord.ai_approved ? '✅' : '❌'}`);
            
            return {
                signalId,
                metrics: await this.getSignalMetrics(signalRecord.ticker),
                patterns
            };
            
        } catch (error) {
            console.error('❌ Erro ao registrar sinal:', error.message);
            throw error;
        }
    }

    /**
     * 📈 ATUALIZAR MÉTRICAS DO SINAL
     */
    async updateSignalMetrics(signalRecord) {
        const key = `${signalRecord.signal}_${signalRecord.ticker}`;
        
        if (!this.signalMetrics.has(key)) {
            this.signalMetrics.set(key, {
                signal: signalRecord.signal,
                ticker: signalRecord.ticker,
                count: 0,
                approved: 0,
                rejected: 0,
                lastReceived: null,
                averageInterval: 0,
                intervals: []
            });
        }
        
        const metrics = this.signalMetrics.get(key);
        
        // Atualizar contadores
        metrics.count++;
        if (signalRecord.ai_approved) {
            metrics.approved++;
        } else {
            metrics.rejected++;
        }
        
        // Calcular intervalo entre sinais
        if (metrics.lastReceived) {
            const interval = (signalRecord.timestamp - metrics.lastReceived) / 1000 / 60; // minutos
            metrics.intervals.push(interval);
            
            // Manter apenas últimos 20 intervalos
            if (metrics.intervals.length > 20) {
                metrics.intervals.shift();
            }
            
            // Calcular média dos intervalos
            metrics.averageInterval = metrics.intervals.reduce((a, b) => a + b, 0) / metrics.intervals.length;
        }
        
        metrics.lastReceived = signalRecord.timestamp;
        
        this.signalMetrics.set(key, metrics);
    }

    /**
     * 🎯 ATUALIZAR MÉTRICAS POR TICKER
     */
    async updateTickerMetrics(signalRecord) {
        const ticker = signalRecord.ticker;
        
        if (!this.tickerMetrics.has(ticker)) {
            this.tickerMetrics.set(ticker, {
                ticker: ticker,
                totalSignals: 0,
                longSignals: 0,
                shortSignals: 0,
                approvedSignals: 0,
                rejectedSignals: 0,
                lastSignalTime: null,
                signalFrequency: 0,
                directions: new Map(),
                success_rate: 0
            });
        }
        
        const metrics = this.tickerMetrics.get(ticker);
        
        // Atualizar contadores
        metrics.totalSignals++;
        
        // Contar por tipo de sinal
        if (['SINAL_LONG', 'SINAL_LONG_FORTE'].includes(signalRecord.signal)) {
            metrics.longSignals++;
        } else if (['SINAL_SHORT', 'SINAL_SHORT_FORTE'].includes(signalRecord.signal)) {
            metrics.shortSignals++;
        }
        
        // Contar aprovações/rejeições
        if (signalRecord.ai_approved) {
            metrics.approvedSignals++;
        } else {
            metrics.rejectedSignals++;
        }
        
        // Direções do mercado quando sinais são recebidos
        const direction = signalRecord.market_direction;
        const directionCount = metrics.directions.get(direction) || 0;
        metrics.directions.set(direction, directionCount + 1);
        
        // Calcular frequência de sinais (sinais por hora)
        if (metrics.lastSignalTime) {
            const hoursDiff = (signalRecord.timestamp - metrics.lastSignalTime) / 1000 / 60 / 60;
            metrics.signalFrequency = metrics.totalSignals / hoursDiff;
        }
        
        metrics.lastSignalTime = signalRecord.timestamp;
        
        this.tickerMetrics.set(ticker, metrics);
    }

    /**
     * ⏱️ ATUALIZAR PADRÕES DE TEMPO
     */
    async updateTimePatterns(signalRecord) {
        const hour = signalRecord.timestamp.getHours();
        const dayOfWeek = signalRecord.timestamp.getDay();
        
        // Padrões por hora
        const hourKey = `hour_${hour}`;
        if (!this.timePatterns.has(hourKey)) {
            this.timePatterns.set(hourKey, { count: 0, approved: 0 });
        }
        const hourMetrics = this.timePatterns.get(hourKey);
        hourMetrics.count++;
        if (signalRecord.ai_approved) hourMetrics.approved++;
        
        // Padrões por dia da semana
        const dayKey = `day_${dayOfWeek}`;
        if (!this.timePatterns.has(dayKey)) {
            this.timePatterns.set(dayKey, { count: 0, approved: 0 });
        }
        const dayMetrics = this.timePatterns.get(dayKey);
        dayMetrics.count++;
        if (signalRecord.ai_approved) dayMetrics.approved++;
    }

    /**
     * 🔍 ANALISAR PADRÕES DO SINAL
     */
    async analyzeSignalPatterns(signalRecord) {
        try {
            // Buscar sinais recentes do mesmo ticker
            const recentSignals = await this.pool.query(`
                SELECT signal_type, ai_approved, fear_greed_value, top100_percentage_up, received_at
                FROM signal_metrics_log
                WHERE ticker = $1 AND received_at >= NOW() - INTERVAL '24 hours'
                ORDER BY received_at DESC
                LIMIT 10
            `, [signalRecord.ticker]);
            
            const signals = recentSignals.rows;
            
            const patterns = {
                recentSignalCount: signals.length,
                approvalRate: 0,
                signalTypes: {},
                averageFearGreed: 0,
                averageTop100: 0,
                timePattern: this.getTimePattern(signalRecord.timestamp),
                frequency: 'NORMAL',
                quality: 'MEDIUM'
            };
            
            if (signals.length > 0) {
                // Taxa de aprovação
                const approved = signals.filter(s => s.ai_approved).length;
                patterns.approvalRate = (approved / signals.length * 100).toFixed(1);
                
                // Tipos de sinais
                signals.forEach(s => {
                    patterns.signalTypes[s.signal_type] = (patterns.signalTypes[s.signal_type] || 0) + 1;
                });
                
                // Médias
                patterns.averageFearGreed = (signals.reduce((sum, s) => sum + (s.fear_greed_value || 50), 0) / signals.length).toFixed(1);
                patterns.averageTop100 = (signals.reduce((sum, s) => sum + (s.top100_percentage_up || 50), 0) / signals.length).toFixed(1);
                
                // Frequência
                if (signals.length >= 8) patterns.frequency = 'HIGH';
                else if (signals.length <= 2) patterns.frequency = 'LOW';
                
                // Qualidade
                if (patterns.approvalRate > 70) patterns.quality = 'HIGH';
                else if (patterns.approvalRate < 30) patterns.quality = 'LOW';
            }
            
            return patterns;
            
        } catch (error) {
            console.error('❌ Erro ao analisar padrões:', error.message);
            return { error: error.message };
        }
    }

    /**
     * ⏰ OBTER PADRÃO DE TEMPO
     */
    getTimePattern(timestamp) {
        const hour = timestamp.getHours();
        const dayOfWeek = timestamp.getDay();
        
        let timeOfDay;
        if (hour >= 6 && hour < 12) timeOfDay = 'MORNING';
        else if (hour >= 12 && hour < 18) timeOfDay = 'AFTERNOON';
        else if (hour >= 18 && hour < 24) timeOfDay = 'EVENING';
        else timeOfDay = 'NIGHT';
        
        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        
        return {
            hour,
            timeOfDay,
            dayOfWeek: dayNames[dayOfWeek],
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        };
    }

    /**
     * 📊 OBTER MÉTRICAS DO SINAL
     */
    async getSignalMetrics(ticker) {
        try {
            // Métricas do ticker
            const tickerMetrics = this.tickerMetrics.get(ticker) || {};
            
            // Métricas recentes do banco
            const recentMetrics = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_signals,
                    COUNT(*) FILTER (WHERE ai_approved = true) as approved_signals,
                    COUNT(*) FILTER (WHERE signal_type LIKE '%LONG%') as long_signals,
                    COUNT(*) FILTER (WHERE signal_type LIKE '%SHORT%') as short_signals,
                    AVG(fear_greed_value) as avg_fear_greed,
                    AVG(top100_percentage_up) as avg_top100,
                    MAX(received_at) as last_signal
                FROM signal_metrics_log
                WHERE ticker = $1 AND received_at >= NOW() - INTERVAL '24 hours'
            `, [ticker]);
            
            const dbMetrics = recentMetrics.rows[0];
            
            return {
                ticker,
                last24h: {
                    totalSignals: parseInt(dbMetrics.total_signals) || 0,
                    approvedSignals: parseInt(dbMetrics.approved_signals) || 0,
                    longSignals: parseInt(dbMetrics.long_signals) || 0,
                    shortSignals: parseInt(dbMetrics.short_signals) || 0,
                    approvalRate: dbMetrics.total_signals > 0 ? 
                        ((dbMetrics.approved_signals / dbMetrics.total_signals) * 100).toFixed(1) : '0.0',
                    avgFearGreed: parseFloat(dbMetrics.avg_fear_greed || 50).toFixed(1),
                    avgTop100: parseFloat(dbMetrics.avg_top100 || 50).toFixed(1),
                    lastSignal: dbMetrics.last_signal
                },
                cache: tickerMetrics,
                summary: this.generateMetricsSummary(dbMetrics, tickerMetrics)
            };
            
        } catch (error) {
            console.error('❌ Erro ao obter métricas:', error.message);
            return { error: error.message };
        }
    }

    /**
     * 📋 GERAR RESUMO DAS MÉTRICAS
     */
    generateMetricsSummary(dbMetrics, cacheMetrics) {
        const totalSignals = parseInt(dbMetrics.total_signals) || 0;
        const approvalRate = totalSignals > 0 ? 
            ((dbMetrics.approved_signals / totalSignals) * 100) : 0;
        
        let quality = 'MEDIUM';
        if (approvalRate > 70) quality = 'HIGH';
        else if (approvalRate < 30) quality = 'LOW';
        
        let frequency = 'NORMAL';
        if (totalSignals >= 10) frequency = 'HIGH';
        else if (totalSignals <= 2) frequency = 'LOW';
        
        let balance = 'BALANCED';
        const longSignals = parseInt(dbMetrics.long_signals) || 0;
        const shortSignals = parseInt(dbMetrics.short_signals) || 0;
        
        if (longSignals > shortSignals * 2) balance = 'LONG_BIAS';
        else if (shortSignals > longSignals * 2) balance = 'SHORT_BIAS';
        
        return {
            quality,
            frequency,
            balance,
            recommendation: this.getRecommendation(quality, frequency, balance, approvalRate)
        };
    }

    /**
     * 💡 OBTER RECOMENDAÇÃO
     */
    getRecommendation(quality, frequency, balance, approvalRate) {
        if (quality === 'HIGH' && frequency === 'NORMAL') {
            return 'OPTIMAL - Sinais de alta qualidade com frequência adequada';
        } else if (quality === 'HIGH' && frequency === 'HIGH') {
            return 'MONITOR - Alta qualidade mas muitos sinais, verificar não spam';
        } else if (quality === 'LOW') {
            return 'CAUTION - Baixa aprovação da IA, revisar critérios';
        } else if (frequency === 'LOW') {
            return 'WAIT - Poucos sinais, aguardar mais dados';
        } else {
            return 'NORMAL - Continuar monitoramento';
        }
    }

    /**
     * 📊 OBTER MÉTRICAS GLOBAIS
     */
    async getGlobalMetrics() {
        try {
            const globalStats = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_signals,
                    COUNT(DISTINCT ticker) as unique_tickers,
                    COUNT(*) FILTER (WHERE ai_approved = true) as approved_signals,
                    COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '1 hour') as last_hour_signals,
                    COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '24 hours') as last_24h_signals,
                    AVG(fear_greed_value) as avg_fear_greed,
                    AVG(top100_percentage_up) as avg_top100
                FROM signal_metrics_log
                WHERE received_at >= NOW() - INTERVAL '7 days'
            `);
            
            const stats = globalStats.rows[0];
            
            // Métricas por hora
            const hourlyStats = await this.pool.query(`
                SELECT 
                    EXTRACT(hour FROM received_at) as hour,
                    COUNT(*) as count,
                    COUNT(*) FILTER (WHERE ai_approved = true) as approved
                FROM signal_metrics_log
                WHERE received_at >= NOW() - INTERVAL '24 hours'
                GROUP BY EXTRACT(hour FROM received_at)
                ORDER BY hour
            `);
            
            return {
                global: {
                    totalSignals: parseInt(stats.total_signals) || 0,
                    uniqueTickers: parseInt(stats.unique_tickers) || 0,
                    approvedSignals: parseInt(stats.approved_signals) || 0,
                    approvalRate: stats.total_signals > 0 ? 
                        ((stats.approved_signals / stats.total_signals) * 100).toFixed(1) : '0.0',
                    lastHourSignals: parseInt(stats.last_hour_signals) || 0,
                    last24hSignals: parseInt(stats.last_24h_signals) || 0,
                    avgFearGreed: parseFloat(stats.avg_fear_greed || 50).toFixed(1),
                    avgTop100: parseFloat(stats.avg_top100 || 50).toFixed(1)
                },
                hourlyDistribution: hourlyStats.rows,
                cacheMetrics: {
                    signalMetrics: this.signalMetrics.size,
                    tickerMetrics: this.tickerMetrics.size,
                    timePatterns: this.timePatterns.size
                }
            };
            
        } catch (error) {
            console.error('❌ Erro ao obter métricas globais:', error.message);
            return { error: error.message };
        }
    }

    /**
     * 🧹 LIMPEZA DE DADOS ANTIGOS
     */
    async cleanOldData() {
        try {
            // Limpar logs antigos (>30 dias)
            await this.pool.query(`
                DELETE FROM signal_metrics_log 
                WHERE received_at < NOW() - INTERVAL '30 days'
            `);
            
            console.log('🧹 Limpeza de dados antigos concluída');
            
        } catch (error) {
            console.error('❌ Erro na limpeza:', error.message);
        }
    }
}

module.exports = SignalMetricsMonitor;
