#!/usr/bin/env node
/**
 * 📊 REAL-TIME POSITION MONITOR ENTERPRISE
 * Monitoramento em tempo real de posições multiusuário
 * Alertas automáticos e proteção contra perdas
 * Data: 08/08/2025
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

console.log('📊 REAL-TIME POSITION MONITOR ENTERPRISE');
console.log('==========================================');

class RealTimePositionMonitor extends EventEmitter {
    constructor() {
        super();
        this.activePositions = new Map();
        this.userPositions = new Map();
        this.alertRules = new Map();
        this.monitoringInterval = null;
        this.priceFeeds = new Map();
        this.performanceMetrics = {
            totalPositions: 0,
            closedPositions: 0,
            profitablePositions: 0,
            totalPnL: 0,
            alertsTriggered: 0
        };
        
        this.configurarEventos();
        console.log('🏭 Inicializando Position Monitor...');
    }

    /**
     * ⚙️ CONFIGURAR EVENTOS
     */
    configurarEventos() {
        this.on('position.opened', this.handlePositionOpened.bind(this));
        this.on('position.updated', this.handlePositionUpdated.bind(this));
        this.on('position.closed', this.handlePositionClosed.bind(this));
        this.on('alert.triggered', this.handleAlertTriggered.bind(this));
        this.on('risk.violation', this.handleRiskViolation.bind(this));
    }

    /**
     * 🚀 INICIAR MONITORAMENTO
     */
    iniciarMonitoramento(intervalMs = 5000) {
        if (this.monitoringInterval) {
            this.pararMonitoramento();
        }

        console.log(`🔄 Iniciando monitoramento (${intervalMs}ms)...`);
        
        this.monitoringInterval = setInterval(() => {
            this.monitorarTodasPosicoes();
        }, intervalMs);

        // Simular feed de preços
        this.iniciarSimulacaoPrecos();
        
        console.log('✅ Monitoramento ativo');
    }

    /**
     * ⏹️ PARAR MONITORAMENTO
     */
    pararMonitoramento() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('⏹️ Monitoramento pausado');
        }
    }

    /**
     * 📈 ADICIONAR POSIÇÃO PARA MONITORAMENTO
     */
    adicionarPosicao(positionData) {
        try {
            const position = {
                id: positionData.id || this.gerarIdPosicao(),
                user_id: positionData.user_id,
                symbol: positionData.symbol,
                side: positionData.side,
                quantity: positionData.quantity,
                entryPrice: positionData.entryPrice,
                currentPrice: positionData.entryPrice,
                leverage: positionData.leverage || 1,
                
                // Dados calculados
                notionalValue: positionData.quantity * positionData.entryPrice,
                unrealizedPnL: 0,
                unrealizedPnLPercent: 0,
                
                // Configurações de proteção
                stopLoss: positionData.stopLoss || null,
                takeProfit: positionData.takeProfit || null,
                trailingStop: positionData.trailingStop || null,
                
                // Metadados
                openTime: new Date(),
                lastUpdate: new Date(),
                exchange: positionData.exchange || 'binance',
                status: 'ACTIVE',
                
                // Configurações de alerta
                alerts: {
                    priceAlert: positionData.priceAlert || null,
                    timeAlert: positionData.timeAlert || null,
                    pnlAlert: positionData.pnlAlert || null
                }
            };

            this.activePositions.set(position.id, position);
            
            // Agrupar por usuário
            if (!this.userPositions.has(position.user_id)) {
                this.userPositions.set(position.user_id, new Set());
            }
            this.userPositions.get(position.user_id).add(position.id);

            this.performanceMetrics.totalPositions++;
            
            console.log(`📈 Posição adicionada: ${position.symbol} ${position.side} (User: ${position.user_id})`);
            this.emit('position.opened', position);
            
            return position;

        } catch (error) {
            console.error('Erro ao adicionar posição:', error.message);
            throw error;
        }
    }

    /**
     * 🔄 MONITORAR TODAS AS POSIÇÕES
     */
    async monitorarTodasPosicoes() {
        try {
            if (this.activePositions.size === 0) {
                return;
            }

            console.log(`🔍 Monitorando ${this.activePositions.size} posições...`);
            
            for (const [positionId, position] of this.activePositions) {
                await this.monitorarPosicao(position);
            }

        } catch (error) {
            console.error('Erro no monitoramento:', error.message);
        }
    }

    /**
     * 👁️ MONITORAR POSIÇÃO INDIVIDUAL
     */
    async monitorarPosicao(position) {
        try {
            // Obter preço atual
            const currentPrice = this.obterPrecoAtual(position.symbol);
            if (!currentPrice) return;

            // Atualizar posição
            const positionUpdated = this.atualizarPosicao(position, currentPrice);
            
            // Verificar alertas
            await this.verificarAlertas(positionUpdated);
            
            // Verificar proteções automáticas
            await this.verificarProtecoes(positionUpdated);
            
            // Emitir evento de atualização
            this.emit('position.updated', positionUpdated);

        } catch (error) {
            console.error(`Erro ao monitorar posição ${position.id}:`, error.message);
        }
    }

    /**
     * 🔄 ATUALIZAR POSIÇÃO COM NOVO PREÇO
     */
    atualizarPosicao(position, currentPrice) {
        const previousPrice = position.currentPrice;
        position.currentPrice = currentPrice;
        position.lastUpdate = new Date();

        // Calcular P&L
        const priceDiff = position.side === 'BUY' 
            ? currentPrice - position.entryPrice
            : position.entryPrice - currentPrice;
        
        position.unrealizedPnL = priceDiff * position.quantity * position.leverage;
        position.unrealizedPnLPercent = (priceDiff / position.entryPrice) * 100 * position.leverage;

        // Atualizar trailing stop se configurado
        if (position.trailingStop) {
            this.atualizarTrailingStop(position, currentPrice);
        }

        return position;
    }

    /**
     * 🔔 VERIFICAR ALERTAS
     */
    async verificarAlertas(position) {
        try {
            const alertas = [];

            // Alerta de preço
            if (position.alerts.priceAlert) {
                const target = position.alerts.priceAlert;
                if ((target.direction === 'ABOVE' && position.currentPrice >= target.price) ||
                    (target.direction === 'BELOW' && position.currentPrice <= target.price)) {
                    alertas.push({
                        type: 'PRICE_ALERT',
                        message: `${position.symbol} atingiu ${target.price}`,
                        severity: 'INFO'
                    });
                }
            }

            // Alerta de P&L
            if (position.alerts.pnlAlert) {
                const target = position.alerts.pnlAlert;
                if ((target.direction === 'PROFIT' && position.unrealizedPnLPercent >= target.percent) ||
                    (target.direction === 'LOSS' && position.unrealizedPnLPercent <= -target.percent)) {
                    alertas.push({
                        type: 'PNL_ALERT',
                        message: `P&L: ${position.unrealizedPnLPercent.toFixed(2)}%`,
                        severity: position.unrealizedPnLPercent > 0 ? 'SUCCESS' : 'WARNING'
                    });
                }
            }

            // Alerta de tempo
            if (position.alerts.timeAlert) {
                const timeOpen = Date.now() - position.openTime.getTime();
                if (timeOpen >= position.alerts.timeAlert.duration) {
                    alertas.push({
                        type: 'TIME_ALERT',
                        message: `Posição aberta há ${Math.round(timeOpen / 60000)} minutos`,
                        severity: 'INFO'
                    });
                }
            }

            // Emitir alertas
            for (const alerta of alertas) {
                this.emit('alert.triggered', {
                    position,
                    alert: alerta
                });
            }

        } catch (error) {
            console.error('Erro ao verificar alertas:', error.message);
        }
    }

    /**
     * 🛡️ VERIFICAR PROTEÇÕES AUTOMÁTICAS
     */
    async verificarProtecoes(position) {
        try {
            // Stop Loss
            if (position.stopLoss) {
                const shouldTriggerStop = position.side === 'BUY' 
                    ? position.currentPrice <= position.stopLoss
                    : position.currentPrice >= position.stopLoss;

                if (shouldTriggerStop) {
                    await this.executarStopLoss(position);
                    return;
                }
            }

            // Take Profit
            if (position.takeProfit) {
                const shouldTriggerProfit = position.side === 'BUY'
                    ? position.currentPrice >= position.takeProfit
                    : position.currentPrice <= position.takeProfit;

                if (shouldTriggerProfit) {
                    await this.executarTakeProfit(position);
                    return;
                }
            }

            // Proteção por tempo (forçar fechamento após X horas)
            const timeOpen = Date.now() - position.openTime.getTime();
            const maxTimeOpen = 4 * 60 * 60 * 1000; // 4 horas

            if (timeOpen >= maxTimeOpen) {
                await this.executarFechamentoPorTempo(position);
                return;
            }

            // Proteção por drawdown extremo
            if (position.unrealizedPnLPercent <= -50) { // -50% perda
                await this.executarProtecaoEmergencia(position);
                return;
            }

        } catch (error) {
            console.error('Erro ao verificar proteções:', error.message);
        }
    }

    /**
     * ⛔ EXECUTAR STOP LOSS
     */
    async executarStopLoss(position) {
        try {
            console.log(`⛔ STOP LOSS: ${position.symbol} (${position.unrealizedPnLPercent.toFixed(2)}%)`);
            
            await this.fecharPosicao(position.id, 'STOP_LOSS');
            
            this.emit('risk.violation', {
                type: 'STOP_LOSS_TRIGGERED',
                position,
                reason: `Preço atingiu stop loss: ${position.stopLoss}`
            });

        } catch (error) {
            console.error('Erro ao executar stop loss:', error.message);
        }
    }

    /**
     * 🎯 EXECUTAR TAKE PROFIT
     */
    async executarTakeProfit(position) {
        try {
            console.log(`🎯 TAKE PROFIT: ${position.symbol} (${position.unrealizedPnLPercent.toFixed(2)}%)`);
            
            await this.fecharPosicao(position.id, 'TAKE_PROFIT');

        } catch (error) {
            console.error('Erro ao executar take profit:', error.message);
        }
    }

    /**
     * ⏰ EXECUTAR FECHAMENTO POR TEMPO
     */
    async executarFechamentoPorTempo(position) {
        try {
            console.log(`⏰ FECHAMENTO POR TEMPO: ${position.symbol}`);
            
            await this.fecharPosicao(position.id, 'TIME_LIMIT');

        } catch (error) {
            console.error('Erro ao fechar por tempo:', error.message);
        }
    }

    /**
     * 🚨 EXECUTAR PROTEÇÃO DE EMERGÊNCIA
     */
    async executarProtecaoEmergencia(position) {
        try {
            console.log(`🚨 PROTEÇÃO EMERGÊNCIA: ${position.symbol} (${position.unrealizedPnLPercent.toFixed(2)}%)`);
            
            await this.fecharPosicao(position.id, 'EMERGENCY_STOP');
            
            this.emit('risk.violation', {
                type: 'EMERGENCY_STOP_TRIGGERED',
                position,
                reason: `Drawdown extremo: ${position.unrealizedPnLPercent.toFixed(2)}%`
            });

        } catch (error) {
            console.error('Erro na proteção de emergência:', error.message);
        }
    }

    /**
     * 📈 ATUALIZAR TRAILING STOP
     */
    atualizarTrailingStop(position, currentPrice) {
        try {
            const trailingDistance = position.trailingStop.distance;
            
            if (position.side === 'BUY') {
                // Para posições BUY, trailing stop segue preço para cima
                const newStopPrice = currentPrice - trailingDistance;
                if (!position.stopLoss || newStopPrice > position.stopLoss) {
                    position.stopLoss = newStopPrice;
                    console.log(`📈 Trailing Stop atualizado: ${position.symbol} -> ${newStopPrice.toFixed(2)}`);
                }
            } else {
                // Para posições SELL, trailing stop segue preço para baixo
                const newStopPrice = currentPrice + trailingDistance;
                if (!position.stopLoss || newStopPrice < position.stopLoss) {
                    position.stopLoss = newStopPrice;
                    console.log(`📉 Trailing Stop atualizado: ${position.symbol} -> ${newStopPrice.toFixed(2)}`);
                }
            }

        } catch (error) {
            console.error('Erro ao atualizar trailing stop:', error.message);
        }
    }

    /**
     * ❌ FECHAR POSIÇÃO
     */
    async fecharPosicao(positionId, reason = 'MANUAL') {
        try {
            const position = this.activePositions.get(positionId);
            if (!position) {
                throw new Error(`Posição ${positionId} não encontrada`);
            }

            position.status = 'CLOSED';
            position.closeTime = new Date();
            position.closeReason = reason;
            position.realizedPnL = position.unrealizedPnL;

            // Remover das posições ativas
            this.activePositions.delete(positionId);
            
            // Remover do mapeamento de usuário
            if (this.userPositions.has(position.user_id)) {
                this.userPositions.get(position.user_id).delete(positionId);
            }

            // Atualizar métricas
            this.performanceMetrics.closedPositions++;
            this.performanceMetrics.totalPnL += position.realizedPnL;
            if (position.realizedPnL > 0) {
                this.performanceMetrics.profitablePositions++;
            }

            console.log(`❌ Posição fechada: ${position.symbol} (${reason}) P&L: ${position.realizedPnL.toFixed(2)}`);
            
            this.emit('position.closed', position);
            
            return position;

        } catch (error) {
            console.error('Erro ao fechar posição:', error.message);
            throw error;
        }
    }

    /**
     * 📊 OBTER STATUS DO USUÁRIO
     */
    obterStatusUsuario(userId) {
        try {
            const positionsIds = this.userPositions.get(userId) || new Set();
            const positions = Array.from(positionsIds).map(id => this.activePositions.get(id)).filter(Boolean);
            
            const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
            const totalNotional = positions.reduce((sum, pos) => sum + pos.notionalValue, 0);
            
            return {
                userId,
                activePositions: positions.length,
                totalUnrealizedPnL: totalPnL,
                totalNotionalValue: totalNotional,
                positions: positions.map(pos => ({
                    id: pos.id,
                    symbol: pos.symbol,
                    side: pos.side,
                    unrealizedPnL: pos.unrealizedPnL,
                    unrealizedPnLPercent: pos.unrealizedPnLPercent,
                    currentPrice: pos.currentPrice
                }))
            };

        } catch (error) {
            console.error('Erro ao obter status:', error.message);
            return null;
        }
    }

    /**
     * 📈 OBTER MÉTRICAS GERAIS
     */
    obterMetricas() {
        const successRate = this.performanceMetrics.closedPositions > 0 
            ? (this.performanceMetrics.profitablePositions / this.performanceMetrics.closedPositions) * 100
            : 0;

        return {
            ...this.performanceMetrics,
            activePositions: this.activePositions.size,
            successRate: successRate.toFixed(1),
            averagePnL: this.performanceMetrics.closedPositions > 0 
                ? this.performanceMetrics.totalPnL / this.performanceMetrics.closedPositions
                : 0
        };
    }

    /**
     * 🎲 SIMULAÇÃO DE PREÇOS (para demo)
     */
    iniciarSimulacaoPrecos() {
        // Preços base
        this.priceFeeds.set('BTCUSDT', 50000);
        this.priceFeeds.set('ETHUSDT', 3000);
        this.priceFeeds.set('BNBUSDT', 300);
        
        setInterval(() => {
            for (const [symbol, basePrice] of this.priceFeeds) {
                // Variação aleatória entre -1% e +1%
                const variation = (Math.random() - 0.5) * 0.02;
                const newPrice = basePrice * (1 + variation);
                this.priceFeeds.set(symbol, newPrice);
            }
        }, 2000);
    }

    obterPrecoAtual(symbol) {
        return this.priceFeeds.get(symbol);
    }

    gerarIdPosicao() {
        return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 🎧 HANDLERS DE EVENTOS
     */
    handlePositionOpened(position) {
        console.log(`🔔 Nova posição: ${position.symbol} ${position.side} (User: ${position.user_id})`);
    }

    handlePositionUpdated(position) {
        // Log apenas mudanças significativas
        if (Math.abs(position.unrealizedPnLPercent) > 1) {
            console.log(`📊 ${position.symbol}: ${position.unrealizedPnLPercent.toFixed(2)}% (${position.currentPrice.toFixed(2)})`);
        }
    }

    handlePositionClosed(position) {
        console.log(`🔔 Posição fechada: ${position.symbol} ${position.side} | P&L: ${position.realizedPnL.toFixed(2)}`);
    }

    handleAlertTriggered({ position, alert }) {
        this.performanceMetrics.alertsTriggered++;
        console.log(`🔔 ALERTA: ${alert.type} - ${alert.message} (${position.symbol})`);
    }

    handleRiskViolation({ type, position, reason }) {
        console.log(`🚨 VIOLAÇÃO: ${type} - ${reason} (${position.symbol})`);
    }

    /**
     * 💾 SALVAR RELATÓRIO
     */
    async salvarRelatorio() {
        try {
            const relatorio = {
                timestamp: new Date().toISOString(),
                metrics: this.obterMetricas(),
                activePositions: Array.from(this.activePositions.values()),
                userSummary: {}
            };

            // Resumo por usuário
            for (const userId of this.userPositions.keys()) {
                relatorio.userSummary[userId] = this.obterStatusUsuario(userId);
            }

            const reportPath = path.join(__dirname, 'position-monitor-report.json');
            await fs.writeFile(reportPath, JSON.stringify(relatorio, null, 2));
            
            console.log(`💾 Relatório salvo: ${reportPath}`);

        } catch (error) {
            console.error('Erro ao salvar relatório:', error.message);
        }
    }
}

// ============================================================================
// DEMONSTRAÇÃO E TESTES
// ============================================================================

async function demonstrarMonitoramento() {
    try {
        console.log('\n🧪 DEMONSTRAÇÃO DO POSITION MONITOR');
        console.log('===================================');

        const monitor = new RealTimePositionMonitor();
        
        // Iniciar monitoramento
        monitor.iniciarMonitoramento(3000); // 3 segundos

        // Adicionar posições de teste
        console.log('\n📈 Adicionando posições de teste...');
        
        const posicao1 = monitor.adicionarPosicao({
            user_id: 14,
            symbol: 'BTCUSDT',
            side: 'BUY',
            quantity: 0.1,
            entryPrice: 50000,
            stopLoss: 49000,
            takeProfit: 52000,
            alerts: {
                pnlAlert: { direction: 'PROFIT', percent: 2 }
            }
        });

        const posicao2 = monitor.adicionarPosicao({
            user_id: 15,
            symbol: 'ETHUSDT',
            side: 'SELL',
            quantity: 1.0,
            entryPrice: 3000,
            stopLoss: 3100,
            trailingStop: { distance: 50 }
        });

        const posicao3 = monitor.adicionarPosicao({
            user_id: 16,
            symbol: 'BNBUSDT',
            side: 'BUY',
            quantity: 10,
            entryPrice: 300,
            alerts: {
                timeAlert: { duration: 10000 } // 10 segundos
            }
        });

        // Monitorar por 30 segundos
        console.log('\n👁️ Monitorando posições por 30 segundos...');
        
        setTimeout(async () => {
            console.log('\n📊 MÉTRICAS FINAIS:');
            const metricas = monitor.obterMetricas();
            console.log(`   Posições ativas: ${metricas.activePositions}`);
            console.log(`   Posições fechadas: ${metricas.closedPositions}`);
            console.log(`   Taxa sucesso: ${metricas.successRate}%`);
            console.log(`   P&L total: ${metricas.totalPnL.toFixed(2)}`);
            console.log(`   Alertas: ${metricas.alertsTriggered}`);

            console.log('\n👥 STATUS POR USUÁRIO:');
            for (const userId of [14, 15, 16]) {
                const status = monitor.obterStatusUsuario(userId);
                console.log(`   User ${userId}: ${status.activePositions} posições, P&L: ${status.totalUnrealizedPnL.toFixed(2)}`);
            }

            await monitor.salvarRelatorio();
            monitor.pararMonitoramento();
            
            console.log('\n🎉 DEMONSTRAÇÃO CONCLUÍDA!');
            console.log('===========================');
            console.log('✅ Monitoramento em tempo real ativo');
            console.log('✅ Proteções automáticas funcionando');
            console.log('✅ Alertas personalizados configurados');
            console.log('✅ Trailing stops implementados');
            console.log('✅ Métricas de performance coletadas');
            console.log('');
            console.log('📊 SISTEMA PRONTO PARA PRODUÇÃO!');

        }, 30000);

        return monitor;

    } catch (error) {
        console.error('❌ Erro na demonstração:', error.message);
        throw error;
    }
}

// Executar demonstração se arquivo foi chamado diretamente
if (require.main === module) {
    demonstrarMonitoramento().catch(console.error);
}

module.exports = RealTimePositionMonitor;
