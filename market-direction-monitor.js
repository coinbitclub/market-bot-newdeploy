/**
 * 📊 MONITOR DE DIREÇÃO DE MERCADO
 * Sistema para monitoramento contínuo da direção do mercado
 * usando TOP 100 moedas + Fear & Greed
 * 
 * FUNCIONALIDADES:
 * - Acompanha mudanças na direção do mercado
 * - Detecta inversões de tendência
 * - Alerta para fechamento antecipado de posições
 * - Métricas complementares ao Fear & Greed
 */

const { Pool } = require('pg');
const axios = require('axios');

class MarketDirectionMonitor {
    constructor() {
        this.pool = new Pool({
            connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: false
        });

        // Cache para otimização
        this.lastFearGreed = null;
        this.lastTop100Analysis = null;
        this.lastUpdate = null;
        
        // Histórico de direções para detectar mudanças
        this.directionHistory = [];
        this.maxHistorySize = 20; // últimos 20 registros

        console.log('📊 Market Direction Monitor inicializado');
        
        // Iniciar monitoramento contínuo a cada 5 minutos
        this.startContinuousMonitoring();
    }

    /**
     * 🔄 MONITORAMENTO CONTÍNUO DA DIREÇÃO
     */
    startContinuousMonitoring() {
        // Atualiza a cada 5 minutos
        setInterval(async () => {
            try {
                await this.updateMarketDirection();
                await this.checkForDirectionChanges();
            } catch (error) {
                console.error('❌ Erro no monitoramento contínuo:', error.message);
            }
        }, 5 * 60 * 1000); // 5 minutos

        console.log('🔄 Monitoramento contínuo iniciado (5 min)');
    }

    /**
     * 📊 ATUALIZAR DIREÇÃO DO MERCADO
     */
    async updateMarketDirection() {
        try {
            // Coletar dados atuais
            const fearGreedData = await this.getFearGreedIndex();
            const top100Analysis = await this.analyzeTop100Coins();
            
            // Determinar direção atual
            const currentDirection = this.determineMarketDirection(fearGreedData, top100Analysis);
            
            // Atualizar cache
            this.lastFearGreed = fearGreedData;
            this.lastTop100Analysis = top100Analysis;
            this.lastUpdate = new Date();
            
            // Adicionar ao histórico
            this.addToDirectionHistory(currentDirection);
            
            // Salvar no banco para análise
            await this.saveMarketDirectionToDB(currentDirection, fearGreedData, top100Analysis);
            
            console.log(`📊 Direção atualizada: ${currentDirection.allowed} | F&G: ${fearGreedData.value} | TOP100: ${top100Analysis.marketTrend}`);
            
            return currentDirection;
            
        } catch (error) {
            console.error('❌ Erro ao atualizar direção:', error.message);
            throw error;
        }
    }

    /**
     * 🎯 DETERMINAR DIREÇÃO DO MERCADO
     * Combina Fear & Greed + TOP 100 para definir direção
     */
    determineMarketDirection(fearGreedData, top100Analysis) {
        const fearGreedValue = fearGreedData.value;
        
        // Direção baseada no Fear & Greed (REGRA PRINCIPAL)
        let fearGreedDirection;
        if (fearGreedValue < 30) {
            fearGreedDirection = 'SOMENTE_LONG';
        } else if (fearGreedValue > 80) {
            fearGreedDirection = 'SOMENTE_SHORT';
        } else {
            fearGreedDirection = 'LONG_E_SHORT';
        }
        
        // Confirmação baseada no TOP 100 (MÉTRICA COMPLEMENTAR)
        const top100Confirmation = this.getTop100Confirmation(top100Analysis);
        
        // Combinar ambas as métricas
        const finalDirection = this.combineFearGreedAndTop100(fearGreedDirection, top100Confirmation);
        
        return {
            allowed: finalDirection,
            fearGreed: {
                value: fearGreedValue,
                direction: fearGreedDirection,
                classification: fearGreedData.classification
            },
            top100: {
                trend: top100Analysis.marketTrend,
                percentageUp: parseFloat(top100Analysis.percentageUp),
                confirmation: top100Confirmation
            },
            timestamp: new Date(),
            confidence: this.calculateConfidence(fearGreedDirection, top100Confirmation)
        };
    }

    /**
     * 📈 OBTER CONFIRMAÇÃO DO TOP 100
     */
    getTop100Confirmation(top100Analysis) {
        const percentageUp = parseFloat(top100Analysis.percentageUp);
        
        if (percentageUp > 70) {
            return 'STRONG_BULLISH';
        } else if (percentageUp > 60) {
            return 'BULLISH';
        } else if (percentageUp < 30) {
            return 'STRONG_BEARISH';
        } else if (percentageUp < 40) {
            return 'BEARISH';
        } else {
            return 'NEUTRAL';
        }
    }

    /**
     * 🎯 COMBINAR FEAR & GREED + TOP 100
     */
    combineFearGreedAndTop100(fearGreedDirection, top100Confirmation) {
        // Se Fear & Greed indica apenas uma direção, TOP 100 pode ajustar a confiança
        if (fearGreedDirection === 'SOMENTE_LONG') {
            // Confirma se TOP 100 também é bullish
            if (['STRONG_BULLISH', 'BULLISH'].includes(top100Confirmation)) {
                return 'SOMENTE_LONG'; // Confirmado
            } else if (['STRONG_BEARISH', 'BEARISH'].includes(top100Confirmation)) {
                return 'CONFLITO'; // Conflito detectado
            } else {
                return 'SOMENTE_LONG'; // Manter F&G como principal
            }
        }
        
        if (fearGreedDirection === 'SOMENTE_SHORT') {
            // Confirma se TOP 100 também é bearish
            if (['STRONG_BEARISH', 'BEARISH'].includes(top100Confirmation)) {
                return 'SOMENTE_SHORT'; // Confirmado
            } else if (['STRONG_BULLISH', 'BULLISH'].includes(top100Confirmation)) {
                return 'CONFLITO'; // Conflito detectado
            } else {
                return 'SOMENTE_SHORT'; // Manter F&G como principal
            }
        }
        
        // Para LONG_E_SHORT, TOP 100 pode refinar a direção
        if (fearGreedDirection === 'LONG_E_SHORT') {
            if (['STRONG_BULLISH', 'BULLISH'].includes(top100Confirmation)) {
                return 'PREFERENCIA_LONG';
            } else if (['STRONG_BEARISH', 'BEARISH'].includes(top100Confirmation)) {
                return 'PREFERENCIA_SHORT';
            } else {
                return 'LONG_E_SHORT';
            }
        }
        
        return fearGreedDirection;
    }

    /**
     * 📊 CALCULAR CONFIANÇA DA DIREÇÃO
     */
    calculateConfidence(fearGreedDirection, top100Confirmation) {
        let confidence = 0.5; // Base
        
        // Fear & Greed extremos aumentam confiança
        if (fearGreedDirection === 'SOMENTE_LONG' || fearGreedDirection === 'SOMENTE_SHORT') {
            confidence += 0.2;
        }
        
        // TOP 100 forte aumenta confiança
        if (['STRONG_BULLISH', 'STRONG_BEARISH'].includes(top100Confirmation)) {
            confidence += 0.2;
        } else if (['BULLISH', 'BEARISH'].includes(top100Confirmation)) {
            confidence += 0.1;
        }
        
        // Alinhamento entre métricas aumenta muito a confiança
        if (
            (fearGreedDirection === 'SOMENTE_LONG' && ['STRONG_BULLISH', 'BULLISH'].includes(top100Confirmation)) ||
            (fearGreedDirection === 'SOMENTE_SHORT' && ['STRONG_BEARISH', 'BEARISH'].includes(top100Confirmation))
        ) {
            confidence += 0.2;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * 🔄 VERIFICAR MUDANÇAS DE DIREÇÃO
     * Detecta inversões que podem exigir fechamento antecipado
     */
    async checkForDirectionChanges() {
        if (this.directionHistory.length < 2) return;
        
        const current = this.directionHistory[this.directionHistory.length - 1];
        const previous = this.directionHistory[this.directionHistory.length - 2];
        
        // Detectar mudanças significativas
        const significantChange = this.detectSignificantChange(previous, current);
        
        if (significantChange.hasChange) {
            console.log('🚨 MUDANÇA DE DIREÇÃO DETECTADA:', significantChange);
            
            // Verificar posições que podem precisar de fechamento
            await this.checkPositionsForEarlyClose(significantChange);
            
            // Registrar alerta
            await this.saveDirectionChangeAlert(significantChange);
        }
    }

    /**
     * 🚨 DETECTAR MUDANÇA SIGNIFICATIVA
     */
    detectSignificantChange(previous, current) {
        const changes = {
            hasChange: false,
            type: null,
            severity: 'LOW',
            details: {},
            shouldClosePositions: false
        };
        
        // Mudança na direção permitida
        if (previous.allowed !== current.allowed) {
            changes.hasChange = true;
            changes.type = 'DIRECTION_CHANGE';
            changes.details.from = previous.allowed;
            changes.details.to = current.allowed;
            
            // Avaliar severidade
            if (
                (previous.allowed === 'SOMENTE_LONG' && current.allowed === 'SOMENTE_SHORT') ||
                (previous.allowed === 'SOMENTE_SHORT' && current.allowed === 'SOMENTE_LONG')
            ) {
                changes.severity = 'HIGH';
                changes.shouldClosePositions = true;
            } else if (
                (previous.allowed.includes('LONG') && current.allowed === 'SOMENTE_SHORT') ||
                (previous.allowed.includes('SHORT') && current.allowed === 'SOMENTE_LONG')
            ) {
                changes.severity = 'MEDIUM';
                changes.shouldClosePositions = true;
            }
        }
        
        // Mudança abrupta no TOP 100
        const top100Change = Math.abs(current.top100.percentageUp - previous.top100.percentageUp);
        if (top100Change > 15) { // Mudança de mais de 15%
            changes.hasChange = true;
            changes.type = changes.type ? 'MULTIPLE' : 'TOP100_VOLATILITY';
            changes.details.top100Change = top100Change;
            
            if (top100Change > 25) {
                changes.severity = 'HIGH';
            } else if (top100Change > 20) {
                changes.severity = 'MEDIUM';
            }
        }
        
        // Mudança de confiança significativa
        const confidenceChange = Math.abs(current.confidence - previous.confidence);
        if (confidenceChange > 0.3) {
            changes.hasChange = true;
            changes.details.confidenceChange = confidenceChange;
        }
        
        return changes;
    }

    /**
     * 🔍 VERIFICAR POSIÇÕES PARA FECHAMENTO ANTECIPADO
     */
    async checkPositionsForEarlyClose(changeData) {
        try {
            if (!changeData.shouldClosePositions) return;
            
            // Buscar posições ativas
            const result = await this.pool.query(`
                SELECT user_id, ticker, side, pnl_percentage, created_at
                FROM active_positions 
                WHERE status = 'ACTIVE'
            `);
            
            const activePositions = result.rows;
            console.log(`🔍 Verificando ${activePositions.length} posições ativas para fechamento`);
            
            for (const position of activePositions) {
                const shouldClose = this.shouldClosePosition(position, changeData);
                
                if (shouldClose.close) {
                    console.log(`🚨 RECOMENDAR FECHAMENTO: ${position.ticker} ${position.side} - ${shouldClose.reason}`);
                    
                    // Registrar recomendação de fechamento
                    await this.pool.query(`
                        INSERT INTO position_close_recommendations (
                            user_id, ticker, side, reason, market_change_data, created_at
                        ) VALUES ($1, $2, $3, $4, $5, NOW())
                    `, [
                        position.user_id,
                        position.ticker,
                        position.side,
                        shouldClose.reason,
                        JSON.stringify(changeData)
                    ]);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar posições:', error.message);
        }
    }

    /**
     * ⚖️ AVALIAR SE POSIÇÃO DEVE SER FECHADA
     */
    shouldClosePosition(position, changeData) {
        const positionSide = position.side;
        const newDirection = changeData.details.to;
        
        // REGRA: Fechar posição se mercado mudou para direção oposta
        if (positionSide === 'LONG' && newDirection === 'SOMENTE_SHORT') {
            return {
                close: true,
                reason: 'Mercado mudou para SOMENTE_SHORT (contra posição LONG)'
            };
        }
        
        if (positionSide === 'SHORT' && newDirection === 'SOMENTE_LONG') {
            return {
                close: true,
                reason: 'Mercado mudou para SOMENTE_LONG (contra posição SHORT)'
            };
        }
        
        // Posições com PnL negativo em mudança de direção média
        if (changeData.severity === 'MEDIUM' && position.pnl_percentage < -5) {
            if (
                (positionSide === 'LONG' && newDirection.includes('SHORT')) ||
                (positionSide === 'SHORT' && newDirection.includes('LONG'))
            ) {
                return {
                    close: true,
                    reason: `Mudança de direção + PnL negativo (${position.pnl_percentage}%)`
                };
            }
        }
        
        return { close: false };
    }

    /**
     * 💾 SALVAR DIREÇÃO NO BANCO
     */
    async saveMarketDirectionToDB(direction, fearGreedData, top100Analysis) {
        try {
            await this.pool.query(`
                INSERT INTO market_direction_history (
                    allowed_direction, fear_greed_value, fear_greed_classification,
                    top100_percentage_up, top100_trend, confidence, 
                    raw_data, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [
                direction.allowed,
                direction.fearGreed.value,
                direction.fearGreed.classification,
                direction.top100.percentageUp,
                direction.top100.trend,
                direction.confidence,
                JSON.stringify({ fearGreedData, top100Analysis })
            ]);
        } catch (error) {
            console.error('❌ Erro ao salvar direção no banco:', error.message);
        }
    }

    /**
     * 🚨 SALVAR ALERTA DE MUDANÇA
     */
    async saveDirectionChangeAlert(changeData) {
        try {
            await this.pool.query(`
                INSERT INTO market_direction_alerts (
                    change_type, severity, should_close_positions,
                    details, created_at
                ) VALUES ($1, $2, $3, $4, NOW())
            `, [
                changeData.type,
                changeData.severity,
                changeData.shouldClosePositions,
                JSON.stringify(changeData.details)
            ]);
        } catch (error) {
            console.error('❌ Erro ao salvar alerta:', error.message);
        }
    }

    /**
     * 📝 ADICIONAR AO HISTÓRICO
     */
    addToDirectionHistory(direction) {
        this.directionHistory.push(direction);
        
        // Manter apenas os últimos registros
        if (this.directionHistory.length > this.maxHistorySize) {
            this.directionHistory.shift();
        }
    }

    /**
     * 📊 APIs de coleta (Fear & Greed + TOP 100)
     */
    async getFearGreedIndex() {
        try {
            const response = await axios.get('https://api.alternative.me/fng/');
            const data = response.data.data[0];
            
            return {
                value: parseInt(data.value),
                classification: data.value_classification,
                timestamp: new Date(data.timestamp * 1000)
            };
        } catch (error) {
            console.warn('⚠️ Erro ao buscar Fear & Greed, usando fallback (50)');
            return {
                value: 50,
                classification: 'Neutral',
                timestamp: new Date()
            };
        }
    }

    async analyzeTop100Coins() {
        try {
            const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
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
     * 📊 OBTER DIREÇÃO ATUAL
     */
    async getCurrentDirection() {
        if (!this.lastUpdate || (Date.now() - this.lastUpdate.getTime()) > 5 * 60 * 1000) {
            // Atualizar se dados estão antigos (>5min)
            return await this.updateMarketDirection();
        }
        
        return this.directionHistory[this.directionHistory.length - 1];
    }

    /**
     * 📈 OBTER HISTÓRICO DE DIREÇÕES
     */
    getDirectionHistory(limit = 10) {
        return this.directionHistory.slice(-limit);
    }
}

module.exports = MarketDirectionMonitor;
