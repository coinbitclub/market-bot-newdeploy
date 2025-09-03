// 📈 ORDER EXECUTOR - ENTERPRISE
// Execução de ordens com Binance/Bybit

class OrderExecutor {
    constructor() {
        this.activePositions = new Map();
        this.orderHistory = [];
        this.isTestMode = process.env.NODE_ENV !== 'production';
    }

    async executeOrder(decision, signal, userConfig) {
        try {
            console.log(`📈 Executando ordem: ${decision.action} ${signal.symbol}`);
            
            // Validar se pode executar
            const validation = this.validateExecution(decision, signal, userConfig);
            if (!validation.canExecute) {
                console.log(`⚠️  Execução bloqueada: ${validation.reason}`);
                return this.createExecutionResult(false, validation.reason);
            }

            // Executar conforme o tipo de ordem
            let result;
            switch (decision.action) {
                case 'BUY':
                    result = await this.executeBuyOrder(signal, decision, userConfig);
                    break;
                case 'SELL':
                    result = await this.executeSellOrder(signal, decision, userConfig);
                    break;
                default:
                    result = this.createExecutionResult(false, 'Ação não suportada');
            }

            // Registrar no histórico
            this.recordExecution(result, signal, decision, userConfig);
            
            console.log(`${result.success ? '✅' : '❌'} Execução: ${result.message}`);
            return result;
            
        } catch (error) {
            console.error('❌ Erro na execução:', error.message);
            return this.createExecutionResult(false, `Erro: ${error.message}`);
        }
    }

    validateExecution(decision, signal, userConfig) {
        // Verificar máximo de posições
        if (this.activePositions.size >= 2) {
            return { canExecute: false, reason: 'Máximo de 2 posições atingido' };
        }

        // Verificar se já tem posição no symbol
        if (this.activePositions.has(signal.symbol)) {
            return { canExecute: false, reason: `Já existe posição em ${signal.symbol}` };
        }

        // Verificar se tem SL/TP
        if (!decision.stopLoss || !decision.takeProfit) {
            return { canExecute: false, reason: 'Stop Loss e Take Profit obrigatórios' };
        }

        // Verificar saldo mínimo
        if (!this.hasMinimumBalance(userConfig)) {
            return { canExecute: false, reason: 'Saldo insuficiente' };
        }

        return { canExecute: true, reason: 'Validação passou' };
    }

    async executeBuyOrder(signal, decision, userConfig) {
        try {
            const orderData = {
                symbol: signal.symbol,
                side: 'BUY',
                type: 'MARKET',
                price: parseFloat(signal.price),
                stopLoss: decision.stopLoss,
                takeProfit: decision.takeProfit,
                timestamp: new Date().toISOString()
            };

            if (this.isTestMode) {
                // Modo teste - simular execução
                orderData.orderId = `TEST_${Date.now()}`;
                orderData.status = 'FILLED';
                orderData.executedQty = this.calculateQuantity(orderData.price, userConfig);
                
                console.log('🧪 MODO TESTE - Ordem simulada');
            } else {
                // Modo produção - executar na exchange
                const exchangeResult = await this.executeOnExchange(orderData, userConfig);
                Object.assign(orderData, exchangeResult);
            }

            // Registrar posição ativa
            this.activePositions.set(signal.symbol, {
                ...orderData,
                openTime: new Date().toISOString(),
                userId: userConfig.userId
            });

            return this.createExecutionResult(true, 'Ordem BUY executada', orderData);
            
        } catch (error) {
            return this.createExecutionResult(false, `Erro BUY: ${error.message}`);
        }
    }

    async executeSellOrder(signal, decision, userConfig) {
        try {
            const orderData = {
                symbol: signal.symbol,
                side: 'SELL',
                type: 'MARKET',
                price: parseFloat(signal.price),
                stopLoss: decision.stopLoss,
                takeProfit: decision.takeProfit,
                timestamp: new Date().toISOString()
            };

            if (this.isTestMode) {
                // Modo teste - simular execução
                orderData.orderId = `TEST_${Date.now()}`;
                orderData.status = 'FILLED';
                orderData.executedQty = this.calculateQuantity(orderData.price, userConfig);
                
                console.log('🧪 MODO TESTE - Ordem simulada');
            } else {
                // Modo produção - executar na exchange
                const exchangeResult = await this.executeOnExchange(orderData, userConfig);
                Object.assign(orderData, exchangeResult);
            }

            // Registrar posição ativa
            this.activePositions.set(signal.symbol, {
                ...orderData,
                openTime: new Date().toISOString(),
                userId: userConfig.userId
            });

            return this.createExecutionResult(true, 'Ordem SELL executada', orderData);
            
        } catch (error) {
            return this.createExecutionResult(false, `Erro SELL: ${error.message}`);
        }
    }

    async executeOnExchange(orderData, userConfig) {
        // Em produção, aqui seria a integração real com Binance/Bybit
        // Por agora, retorna dados simulados
        
        await this.sleep(100); // Simular latência da API
        
        return {
            orderId: `REAL_${Date.now()}`,
            status: 'FILLED',
            executedQty: this.calculateQuantity(orderData.price, userConfig),
            executedPrice: orderData.price,
            commission: 0.001, // 0.1%
            commissionAsset: 'BNB'
        };
    }

    calculateQuantity(price, userConfig) {
        // Calcular quantidade baseada em 2% do saldo
        const riskAmount = (userConfig.balance || 1000) * 0.02; // 2% risk
        const quantity = riskAmount / price;
        return Math.round(quantity * 100000) / 100000; // 5 decimais
    }

    hasMinimumBalance(userConfig) {
        return (userConfig.balance || 0) >= 50; // Mínimo $50
    }

    createExecutionResult(success, message, orderData = null) {
        return {
            success,
            message,
            orderData,
            timestamp: new Date().toISOString(),
            mode: this.isTestMode ? 'TEST' : 'PRODUCTION'
        };
    }

    recordExecution(result, signal, decision, userConfig) {
        this.orderHistory.push({
            timestamp: new Date().toISOString(),
            userId: userConfig.userId,
            symbol: signal.symbol,
            action: decision.action,
            result: result.success,
            message: result.message,
            orderData: result.orderData
        });

        // Manter apenas últimas 1000 execuções
        if (this.orderHistory.length > 1000) {
            this.orderHistory = this.orderHistory.slice(-1000);
        }
    }

    getActivePositions() {
        return Array.from(this.activePositions.values());
    }

    getOrderHistory(limit = 50) {
        return this.orderHistory.slice(-limit);
    }

    closePosition(symbol, reason = 'Manual close') {
        if (this.activePositions.has(symbol)) {
            const position = this.activePositions.get(symbol);
            this.activePositions.delete(symbol);
            
            console.log(`🔒 Posição fechada: ${symbol} - ${reason}`);
            return true;
        }
        return false;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = OrderExecutor;
