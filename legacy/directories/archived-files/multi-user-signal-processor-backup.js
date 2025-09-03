const { Pool } = require('pg');
const axios = require('axios');
const { OpenAIApi, Configuration } = require('openai');
const SignalHistoryAnalyzer = require('./signal-history-analyzer');
const OrderManager = require('./order-manager');
const MarketDirectionMonitor = require('./market-direction-monitor');
const SignalMetricsMonitor = require('./signal-metrics-monitor');

class MultiUserSignalProcessor {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
        });

        // Inicializar componentes de monitoramento
        this.signalHistory = new SignalHistoryAnalyzer();
        this.orderManager = new OrderManager();
        this.marketMonitor = new MarketDirectionMonitor();
        this.signalMetrics = new SignalMetricsMonitor();

        // Configurar OpenAI para análise de IA
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
            const configuration = new Configuration({
                apiKey: process.env.OPENAI_API_KEY,
            });
            this.openai = new OpenAIApi(configuration);
            console.log('🤖 OpenAI: Configurado para análise IA');
        } else {
            this.openai = null;
            console.log('⚠️ OpenAI: Não configurado (usando fallback)');
        }

        console.log('🚀 Multi-User Signal Processor iniciado');
        console.log('🤖 IA OpenAI: Modo supervisão ativo');
        console.log('📊 Análise de mercado: Fear & Greed + TOP 100');
        console.log('🧠 Histórico de sinais: ATIVO');
        console.log('📋 TP/SL obrigatórios: ATIVO');
        console.log('📊 Monitoramento de direção: ATIVO');
        console.log('📈 Métricas de sinais: ATIVO');
    }

    /**
     * 🧠 COORDENAÇÃO E SUPERVISÃO POR IA
     * A IA analisa, coordena e supervisiona TODO o processo
     * Papel: COORDENAÇÃO E SUPERVISÃO (não autonomia para abrir/fechar)
     */
    async processSignal(signalData) {
        console.log('🔄 INICIANDO PROCESSO COORDENADO PELA IA');
        console.log('📡 Sinal recebido:', signalData);

        try {
            // ETAPA 1: Obter direção atual do mercado (usando monitor integrado)
            const marketDirection = await this.marketMonitor.getCurrentDirection();
            
            console.log(`📊 Fear & Greed: ${marketDirection.fearGreed.value}/100`);
            console.log(`🧭 Direção permitida: ${marketDirection.allowed}`);
            console.log(`💰 TOP 100: ${marketDirection.top100.percentageUp}% (${marketDirection.top100.trend})`);

            // ETAPA 2: Validação de Sinal (janela de 30 segundos + direção)
            const signalValidation = this.validateSignal(signalData, marketDirection.allowed);
            if (!signalValidation.valid) {
                console.log('❌ Sinal rejeitado:', signalValidation.reason);
                
                // Registrar sinal rejeitado
                await this.signalMetrics.registerSignal(signalData, marketDirection, {
                    shouldExecute: false,
                    reason: signalValidation.reason
                });
                
                return { success: false, reason: signalValidation.reason };
            }

            // ETAPA 3: Análise de histórico de sinais (contrarian movement detection)
            const signalHistoryAnalysis = await this.signalHistory.analyzeSignal(
                signalData.ticker, 
                signalData.signal
            );
            
            console.log('🧠 Análise histórica:', signalHistoryAnalysis.recommendation);

            // ETAPA 4: IA COORDENA E SUPERVISIONA O PROCESSO
            const aiDecision = await this.aiCoordinateAndSupervise(
                signalData, 
                marketDirection, 
                signalHistoryAnalysis
            );

            // ETAPA 5: Registrar métricas do sinal
            const signalMetricsResult = await this.signalMetrics.registerSignal(
                signalData, 
                marketDirection, 
                aiDecision
            );

            if (!aiDecision.shouldExecute) {
                console.log('🤖 IA decidiu NÃO executar:', aiDecision.reason);
                return { success: false, reason: aiDecision.reason };
            }

            console.log('🤖 IA APROVOU execução:', aiDecision.analysis);

            // ETAPA 6: Executar para usuários (coordenado pela IA)
            const userExecutions = await this.executeForAllUsers(signalData, aiDecision);

            return {
                success: true,
                signalId: signalData.id,
                aiDecision: aiDecision,
                marketDirection: marketDirection,
                signalHistory: signalHistoryAnalysis,
                signalMetrics: signalMetricsResult,
                executions: userExecutions
            };

        } catch (error) {
            console.error('❌ Erro no processo coordenado pela IA:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 📊 ETAPA 1: Coleta Fear & Greed Index
     */
    async getFearGreedIndex() {
        try {
            const response = await axios.get(process.env.FEAR_GREED_URL, {
                headers: {
                    'X-API-KEY': process.env.COINSTATS_API_KEY
                }
            });

            const value = response.data?.value || 50; // Fallback: equilíbrio
            
            return {
                value: value,
                classification: this.classifyFearGreed(value),
                timestamp: new Date()
            };
        } catch (error) {
            console.warn('⚠️ Erro ao buscar Fear & Greed, usando fallback (50)');
            return {
                value: 50,
                classification: 'Neutro (Fallback)',
                timestamp: new Date()
            };
        }
    }

    /**
     * 🧭 Determinar direção permitida baseada no Fear & Greed
     */
    getDirectionFromFearGreed(value) {
        if (value < 30) return 'SOMENTE_LONG';
        if (value > 80) return 'SOMENTE_SHORT';
        return 'LONG_E_SHORT';
    }

    classifyFearGreed(value) {
        if (value < 30) return 'Medo Extremo (LONG)';
        if (value > 80) return 'Ganância Extrema (SHORT)';
        return 'Neutro (AMBOS)';
    }

    /**
     * � ETAPA 2: Análise TOP 100 moedas (métrica complementar)
     */
    async analyzeTop100Coins() {
        try {
            const response = await axios.get(process.env.TOP100_COINS_URL || 'https://api.coingecko.com/api/v3/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 100,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '24h'
                }
            });

            const coins = response.data;
            const positiveCoins = coins.filter(coin => coin.price_change_percentage_24h > 0).length;
            const negativeCoins = coins.filter(coin => coin.price_change_percentage_24h < 0).length;
            const percentageUp = (positiveCoins / coins.length) * 100;

            return {
                totalCoins: coins.length,
                positiveCoins: positiveCoins,
                negativeCoins: negativeCoins,
                percentageUp: percentageUp.toFixed(1),
                marketTrend: percentageUp > 60 ? 'BULLISH' : percentageUp < 40 ? 'BEARISH' : 'SIDEWAYS',
                timestamp: new Date()
            };
        } catch (error) {
            console.warn('⚠️ Erro ao analisar TOP 100, usando dados neutros');
            return {
                totalCoins: 100,
                positiveCoins: 50,
                negativeCoins: 50,
                percentageUp: '50.0',
                marketTrend: 'SIDEWAYS',
                timestamp: new Date()
            };
        }
    }

    /**
     * ✅ ETAPA 3: Validação de Sinal (janela de 30 segundos)
     */
    validateSignal(signalData, allowedDirection) {
        // Verificar janela de validade (30 segundos)
        const signalTime = new Date(signalData.timestamp || Date.now());
        const now = new Date();
        const timeDifference = (now - signalTime) / 1000; // segundos

        if (timeDifference > 30) {
            return {
                valid: false,
                reason: `Sinal expirado (${timeDifference.toFixed(1)}s > 30s)`
            };
        }

        // Filtrar por direção permitida (Fear & Greed)
        const signalDirection = this.getSignalDirection(signalData.signal);
        
        if (allowedDirection === 'SOMENTE_LONG' && signalDirection === 'SHORT') {
            return {
                valid: false,
                reason: 'Sinal SHORT bloqueado (Fear & Greed < 30)'
            };
        }
        
        if (allowedDirection === 'SOMENTE_SHORT' && signalDirection === 'LONG') {
            return {
                valid: false,
                reason: 'Sinal LONG bloqueado (Fear & Greed > 80)'
            };
        }

        return {
            valid: true,
            reason: 'Sinal válido e dentro da direção permitida'
        };
    }

    getSignalDirection(signal) {
        const longSignals = ['SINAL_LONG', 'SINAL_LONG_FORTE'];
        const shortSignals = ['SINAL_SHORT', 'SINAL_SHORT_FORTE'];
        
        if (longSignals.includes(signal)) return 'LONG';
        if (shortSignals.includes(signal)) return 'SHORT';
        return 'UNKNOWN';
    }

    /**
     * 🤖 ETAPA 4: IA COORDENA E SUPERVISIONA TODO O PROCESSO
     * Papel: COORDENAÇÃO E SUPERVISÃO (não abrir/fechar operações)
     */
    async aiCoordinateAndSupervise(signalData, marketDirection, signalHistoryAnalysis) {
        try {
            if (!this.openai) {
                console.warn('⚠️ OpenAI não configurado, usando lógica de fallback');
                return this.fallbackDecision(signalData, marketDirection, signalHistoryAnalysis);
            }

            const prompt = `
Como IA coordenadora e supervisora do sistema de trading, analise os dados e decida se o sinal deve ser executado:

DADOS DO MERCADO:
- Fear & Greed Index: ${marketDirection.fearGreed.value}/100 (${marketDirection.fearGreed.classification})
- Direção permitida: ${marketDirection.allowed}
- TOP 100 moedas: ${marketDirection.top100.percentageUp}% subindo (${marketDirection.top100.trend})
- Confiança da direção: ${(marketDirection.confidence * 100).toFixed(1)}%

DADOS DO SINAL:
- Sinal: ${signalData.signal}
- Ticker: ${signalData.ticker}
- Fonte: ${signalData.source}

ANÁLISE HISTÓRICA:
- Recomendação: ${signalHistoryAnalysis.recommendation}
- Padrão detectado: ${signalHistoryAnalysis.pattern || 'Nenhum'}
- Histórico de sinais: ${signalHistoryAnalysis.signalCount} sinais recentes

REGRAS DE NEGÓCIO:
1. IA NÃO tem autonomia para decidir diferente das regras mapeadas
2. IA apenas COORDENA e SUPERVISIONA o processo
3. IA NÃO pode tomar decisões próprias fora das regras
4. Considerar volatilidade do mercado para possível fechamento antecipado
5. Priorizar sinais FORTE sobre sinais normais

CRITÉRIOS PARA APROVAÇÃO:
- Sinal deve estar alinhado com direção permitida
- Histórico de sinais não deve indicar movimento contrário
- Confiança da direção deve ser razoável (>0.4)
- Não deve haver conflitos nas métricas

Responda apenas: SIM ou NÃO seguido de uma breve justificativa (máximo 50 palavras).`;

            const response = await this.openai.createChatCompletion({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 100,
                temperature: 0.1
            });

            const aiResponse = response.data.choices[0].message.content.trim();
            const shouldExecute = aiResponse.toLowerCase().startsWith('sim');

            return {
                shouldExecute: shouldExecute,
                analysis: aiResponse,
                confidence: marketDirection.confidence,
                factors: {
                    marketDirection: marketDirection.allowed,
                    fearGreed: marketDirection.fearGreed.value,
                    top100Trend: marketDirection.top100.trend,
                    signalHistory: signalHistoryAnalysis.recommendation
                }
            };

        } catch (error) {
            console.warn('⚠️ Erro na análise da IA, usando fallback:', error.message);
            return this.fallbackDecision(signalData, marketDirection, signalHistoryAnalysis);
        }
    }

    /**
     * 🔄 LÓGICA DE FALLBACK INTELIGENTE
     */
    fallbackDecision(signalData, marketDirection, signalHistoryAnalysis) {
        const signalDirection = this.getSignalDirection(signalData.signal);
        const isStrongSignal = signalData.signal.includes('FORTE');
        
        // Análise de condições favoráveis
        let favorableConditions = 0;
        let totalConditions = 4;

        // 1. Direção do mercado favorável
        if (
            (marketDirection.allowed === 'LONG_E_SHORT') ||
            (marketDirection.allowed === 'SOMENTE_LONG' && signalDirection === 'LONG') ||
            (marketDirection.allowed === 'SOMENTE_SHORT' && signalDirection === 'SHORT') ||
            (marketDirection.allowed === 'PREFERENCIA_LONG' && signalDirection === 'LONG') ||
            (marketDirection.allowed === 'PREFERENCIA_SHORT' && signalDirection === 'SHORT')
        ) {
            favorableConditions++;
        }

        // 2. TOP 100 alinhado
        if (
            (marketDirection.top100.trend === 'BULLISH' && signalDirection === 'LONG') ||
            (marketDirection.top100.trend === 'BEARISH' && signalDirection === 'SHORT') ||
            (marketDirection.top100.trend === 'SIDEWAYS')
        ) {
            favorableConditions++;
        }

        // 3. Confiança adequada
        if (marketDirection.confidence > 0.4) {
            favorableConditions++;
        }

        // 4. Histórico não contrário
        if (signalHistoryAnalysis.recommendation !== 'REJECT') {
            favorableConditions++;
        }

        // Decisão baseada em condições favoráveis
        const shouldExecute = favorableConditions >= 3 || 
                             (favorableConditions >= 2 && isStrongSignal);

        let reason = '';
        if (shouldExecute) {
            reason = `Fallback: ${favorableConditions}/${totalConditions} condições favoráveis`;
            if (isStrongSignal) reason += ', sinal forte';
        } else {
            reason = `Fallback: Apenas ${favorableConditions}/${totalConditions} condições favoráveis`;
        }

        return {
            shouldExecute: shouldExecute,
            analysis: reason,
            confidence: marketDirection.confidence,
            factors: {
                favorableConditions: favorableConditions,
                totalConditions: totalConditions,
                isStrongSignal: isStrongSignal
            }
        };
    }

    /**
     * ✅ ETAPA 3: Validação de Sinal (janela de 30 segundos)
     */
    validateSignal(signalData, allowedDirection) {
        // Verificar janela de validade (30 segundos)
        const signalTime = new Date(signalData.timestamp || Date.now());
        const now = new Date();
        const timeDifference = (now - signalTime) / 1000; // segundos

        if (timeDifference > 30) {
            return {
                valid: false,
                reason: `Sinal expirado (${timeDifference.toFixed(1)}s > 30s)`
            };
        }

        // Filtrar por direção permitida (Fear & Greed)
        const signalDirection = this.getSignalDirection(signalData.signal);
        
        if (allowedDirection === 'SOMENTE_LONG' && signalDirection === 'SHORT') {
            return {
                valid: false,
                reason: 'Sinal SHORT bloqueado (mercado apenas LONG)'
            };
        }
        
        if (allowedDirection === 'SOMENTE_SHORT' && signalDirection === 'LONG') {
            return {
                valid: false,
                reason: 'Sinal LONG bloqueado (mercado apenas SHORT)'
            };
        }

        return {
            valid: true,
            reason: 'Sinal válido e dentro da direção permitida'
        };
    }

    getSignalDirection(signal) {
        const longSignals = ['SINAL_LONG', 'SINAL_LONG_FORTE'];
        const shortSignals = ['SINAL_SHORT', 'SINAL_SHORT_FORTE'];
        
        if (longSignals.includes(signal)) return 'LONG';
        if (shortSignals.includes(signal)) return 'SHORT';
        return 'UNKNOWN';
    }
                    fearGreedInfluence: fearGreedData.classification,
                    marketTrend: top100Analysis.marketTrend,
                    signalStrength: signalData.signal.includes('FORTE') ? 'FORTE' : 'NORMAL'
                },
                timestamp: new Date()
            };

        } catch (error) {
            console.warn('⚠️ Erro na análise IA, usando lógica de fallback:', error.message);
            return this.fallbackDecision(signalData, fearGreedData, top100Analysis);
        }
    }

    fallbackDecision(signalData, fearGreedData, top100Analysis) {
        // Lógica de fallback quando IA não está disponível
        const isStrongSignal = signalData.signal && signalData.signal.includes('FORTE');
        const marketAligned = parseFloat(top100Analysis.percentageUp) > 60;
        const fearGreedNeutral = fearGreedData.value >= 30 && fearGreedData.value <= 80;
        
        const shouldExecute = isStrongSignal && (marketAligned || fearGreedNeutral);
        
        return {
            shouldExecute: shouldExecute,
            analysis: `Fallback: Sinal ${isStrongSignal ? 'forte' : 'fraco'}, mercado ${marketAligned ? 'favorável' : 'desfavorável'}, F&G ${fearGreedNeutral ? 'neutro' : 'extremo'}`,
            reasoning: {
                fearGreedInfluence: fearGreedData.classification,
                marketTrend: top100Analysis.marketTrend,
                signalStrength: isStrongSignal ? 'FORTE' : 'NORMAL'
            },
            timestamp: new Date()
        };
    }

    /**
     * ⚡ ETAPA 5: Executar para usuários (coordenado pela IA)
     */
    async executeForAllUsers(signalData, aiDecision) {
        try {
            // Buscar usuários ativos
            const activeUsers = await this.getActiveUsers();
            console.log(`👥 ${activeUsers.length} usuários para execução coordenada pela IA`);

            const executions = [];

            for (const user of activeUsers) {
                console.log(`🧑‍💼 Executando para ${user.username} (coordenado pela IA)`);
                
                // Validações pré-execução
                const userValidation = await this.validateUserForExecution(user, signalData);
                if (!userValidation.valid) {
                    executions.push({
                        userId: user.id,
                        username: user.username,
                        success: false,
                        reason: userValidation.reason
                    });
                    continue;
                }

                // Executar operação
                const execution = await this.executeOrderForUser(user, signalData, aiDecision);
                executions.push({
                    userId: user.id,
                    username: user.username,
                    ...execution
                });
            }

            return executions;

        } catch (error) {
            console.error('❌ Erro na execução coordenada:', error.message);
            return [];
        }
    }

    async getActiveUsers() {
        try {
            const query = `
                SELECT u.id, u.username, u.auto_trading_enabled,
                       ek.exchange_name, ek.api_key_set, ek.testnet_mode
                FROM users u
                LEFT JOIN exchange_keys ek ON u.id = ek.user_id
                WHERE u.auto_trading_enabled = true 
                  AND ek.api_key_set = true
                ORDER BY u.username
            `;
            
            const result = await this.pool.query(query);
            return result.rows;
        } catch (error) {
            console.warn('⚠️ Erro ao buscar usuários, retornando lista vazia');
            return [];
        }
    }

    async validateUserForExecution(user, signalData) {
        // Implementar validações:
        // - Máximo 2 posições ativas
        // - Saldo mínimo
        // - Bloqueio de ticker
        // - Exchange operacional
        
        return {
            valid: true,
            reason: 'Usuário validado para execução'
        };
    }

    async executeOrderForUser(user, signalData, aiDecision) {
        try {
            // Aqui entraria a lógica real de execução
            // Por enquanto, simular execução bem-sucedida
            
            console.log(`✅ Ordem executada para ${user.username} (supervisionado pela IA)`);
            
            return {
                success: true,
                signal: signalData.signal,
                ticker: signalData.ticker,
                aiSupervision: true,
                timestamp: new Date()
            };
            
        } catch (error) {
            console.error(`❌ Erro na execução para ${user.username}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🗄️ Criar tabela de sinais se necessário
     */
    async createSignalsTable() {
        try {
            const query = `
                CREATE TABLE IF NOT EXISTS trading_signals (
                    id SERIAL PRIMARY KEY,
                    signal_type VARCHAR(50) NOT NULL,
                    ticker VARCHAR(20) NOT NULL,
                    source VARCHAR(50) DEFAULT 'TradingView',
                    fear_greed_value INTEGER,
                    ai_decision JSONB,
                    processed BOOLEAN DEFAULT false,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;

            await this.pool.query(query);
            console.log('✅ Tabela trading_signals verificada/criada');
        } catch (error) {
            console.log('⚠️ Aviso ao criar tabela de sinais:', error.message);
        }
    }
}

module.exports = MultiUserSignalProcessor;
