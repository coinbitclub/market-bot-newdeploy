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
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith("YOUR_OPENAI_API_KEY")) {
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

    /**
     * ⚡ ETAPA 6: Executar para usuários (coordenado pela IA)
     */
    async executeForAllUsers(signalData, aiDecision) {
        try {
            // Buscar usuários ativos
            const activeUsers = await this.getActiveUsers();
            console.log(`👥 ${activeUsers.length} usuários para execução coordenada pela IA`);

            if (activeUsers.length === 0) {
                return { executions: [], message: 'Nenhum usuário ativo encontrado' };
            }

            const executions = [];

            for (const user of activeUsers) {
                try {
                    const userExecution = await this.executeForUser(user, signalData, aiDecision);
                    executions.push(userExecution);
                } catch (error) {
                    console.error(`❌ Erro ao executar para usuário ${user.id}:`, error.message);
                    executions.push({
                        userId: user.id,
                        success: false,
                        error: error.message
                    });
                }
            }

            const successCount = executions.filter(e => e.success).length;
            console.log(`✅ ${successCount}/${executions.length} execuções bem-sucedidas`);

            return {
                executions,
                summary: {
                    total: executions.length,
                    successful: successCount,
                    failed: executions.length - successCount
                }
            };

        } catch (error) {
            console.error('❌ Erro na execução coordenada:', error.message);
            return { error: error.message, executions: [] };
        }
    }

    /**
     * 👥 BUSCAR USUÁRIOS ATIVOS
     */
    async getActiveUsers() {
        try {
            const result = await this.pool.query(`
                SELECT id, email, plan_type, balance_brl, balance_usd,
                       custom_config, exchange_config, is_active
                FROM users 
                WHERE is_active = true 
                AND (balance_brl > 0 OR balance_usd > 0)
                ORDER BY plan_type DESC, id ASC
            `);

            return result.rows || [];

        } catch (error) {
            console.error('❌ Erro ao buscar usuários:', error.message);
            return [];
        }
    }

    /**
     * 👤 EXECUTAR PARA USUÁRIO ESPECÍFICO
     */
    async executeForUser(user, signalData, aiDecision) {
        try {
            // Validações pré-execução
            const userValidation = await this.validateUserForExecution(user, signalData);
            if (!userValidation.valid) {
                return {
                    userId: user.id,
                    success: false,
                    reason: userValidation.reason
                };
            }

            // Usar OrderManager para criar ordem com TP/SL obrigatórios
            const orderResult = await this.orderManager.createOrder({
                userId: user.id,
                ticker: signalData.ticker,
                signal: signalData.signal,
                userConfig: user.custom_config || {},
                exchangeConfig: user.exchange_config || {}
            });

            if (!orderResult.success) {
                return {
                    userId: user.id,
                    success: false,
                    reason: orderResult.reason
                };
            }

            // Registrar execução no histórico
            await this.signalHistory.recordSignalExecution(
                signalData.ticker,
                signalData.signal,
                user.id,
                orderResult.orderId
            );

            return {
                userId: user.id,
                success: true,
                orderId: orderResult.orderId,
                details: orderResult.details
            };

        } catch (error) {
            console.error(`❌ Erro na execução para usuário ${user.id}:`, error.message);
            return {
                userId: user.id,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ✅ VALIDAR USUÁRIO PARA EXECUÇÃO
     */
    async validateUserForExecution(user, signalData) {
        try {
            // Verificar saldo mínimo
            const minBalanceBRL = parseFloat(process.env.MIN_BALANCE_BRAZIL_BRL) || 100;
            const minBalanceUSD = parseFloat(process.env.MIN_BALANCE_FOREIGN_USD) || 20;
            
            if (user.balance_brl < minBalanceBRL && user.balance_usd < minBalanceUSD) {
                return {
                    valid: false,
                    reason: 'Saldo insuficiente para trading'
                };
            }

            // Verificar máximo de posições ativas
            const maxPositions = parseInt(process.env.MAX_POSITIONS_PER_USER) || 2;
            const activePositions = await this.pool.query(`
                SELECT COUNT(*) as count 
                FROM active_positions 
                WHERE user_id = $1 AND status = 'ACTIVE'
            `, [user.id]);

            if (parseInt(activePositions.rows[0].count) >= maxPositions) {
                return {
                    valid: false,
                    reason: `Máximo de ${maxPositions} posições ativas atingido`
                };
            }

            // Verificar bloqueio de ticker
            const tickerBlockHours = parseInt(process.env.TICKER_BLOCK_HOURS) || 2;
            const blockedTicker = await this.pool.query(`
                SELECT id FROM bloqueio_ticker 
                WHERE user_id = $1 AND ticker = $2 
                AND created_at > NOW() - INTERVAL '${tickerBlockHours} hours'
            `, [user.id, signalData.ticker]);

            if (blockedTicker.rows.length > 0) {
                return {
                    valid: false,
                    reason: `Ticker ${signalData.ticker} bloqueado por ${tickerBlockHours}h`
                };
            }

            return { valid: true };

        } catch (error) {
            console.error('❌ Erro na validação do usuário:', error.message);
            return {
                valid: false,
                reason: 'Erro na validação'
            };
        }
    }
}

module.exports = MultiUserSignalProcessor;
