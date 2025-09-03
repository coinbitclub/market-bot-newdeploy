/**
 * 🔧 ORDER EXECUTOR - VERSÃO CORRIGIDA
 * Execução de ordens nas exchanges com validações
 */

const { createLogger } = require('../../shared/utils/logger');

class OrderExecutor {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.logger = createLogger('order-executor');
        this.isRunning = false;
        this.startTime = null;
        this.exchanges = new Map();
    }

    async start() {
        this.logger.info('Starting order-executor...');
        this.isRunning = true;
        this.startTime = Date.now();
        
        await this.initialize();
        
        this.logger.info('order-executor started successfully');
    }

    async initialize() {
        // Inicializar conexões com exchanges
        await this.initializeExchanges();
        
        // Configurar validações de ordem
        await this.setupOrderValidations();
        
        this.logger.info('order-executor initialized');
    }

    async initializeExchanges() {
        // Mock de inicialização de exchanges
        const supportedExchanges = ['binance', 'bybit'];
        
        for (const exchange of supportedExchanges) {
            this.exchanges.set(exchange, {
                name: exchange,
                connected: true,
                lastPing: Date.now()
            });
        }
        
        this.logger.info(`Initialized ${this.exchanges.size} exchanges`);
    }

    async setupOrderValidations() {
        // Configurar validações de ordem
        this.validations = {
            minOrderSize: 10, // USD
            maxOrderSize: 10000, // USD
            allowedSymbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
            requiredFields: ['symbol', 'side', 'type', 'quantity']
        };
        
        this.logger.info('Order validations configured');
    }

    async stop() {
        this.logger.info('Stopping order-executor...');
        this.isRunning = false;
        
        // Fechar conexões com exchanges
        this.exchanges.clear();
        
        this.logger.info('order-executor stopped');
    }

    async healthCheck() {
        if (!this.isRunning) return false;
        
        // Verificar conexões com exchanges
        for (const [name, exchange] of this.exchanges) {
            if (!exchange.connected) {
                this.logger.warn(`Exchange ${name} not connected`);
                return false;
            }
        }
        
        return true;
    }

    async handleMessage(action, payload, metadata) {
        this.logger.info(`Handling message: ${action}`, {
            correlationId: metadata.correlationId,
            fromService: metadata.fromService
        });

        switch (action) {
            case 'ping':
                return { status: 'pong', service: 'order-executor' };
            
            case 'execute_order':
                return await this.executeOrder(payload);
            
            case 'cancel_order':
                return await this.cancelOrder(payload);
            
            case 'get_order_status':
                return await this.getOrderStatus(payload);
            
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    async executeOrder(orderData) {
        try {
            // Validar ordem
            this.validateOrder(orderData);
            
            // Simular execução
            const executionResult = {
                orderId: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                symbol: orderData.symbol,
                side: orderData.side,
                quantity: orderData.quantity,
                price: orderData.price,
                status: 'filled',
                executedAt: new Date().toISOString()
            };
            
            this.logger.info('Order executed successfully', { orderId: executionResult.orderId });
            return executionResult;
            
        } catch (error) {
            this.logger.error('Failed to execute order:', error);
            throw error;
        }
    }

    validateOrder(orderData) {
        // Validar campos obrigatórios
        for (const field of this.validations.requiredFields) {
            if (!orderData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        // Validar símbolo
        if (!this.validations.allowedSymbols.includes(orderData.symbol)) {
            throw new Error(`Symbol not allowed: ${orderData.symbol}`);
        }
        
        // Validar tamanho da ordem
        const orderValue = orderData.quantity * (orderData.price || 50000); // Mock price
        if (orderValue < this.validations.minOrderSize) {
            throw new Error(`Order size too small: ${orderValue}`);
        }
        if (orderValue > this.validations.maxOrderSize) {
            throw new Error(`Order size too large: ${orderValue}`);
        }
    }

    async cancelOrder(orderData) {
        this.logger.info('Cancelling order', { orderId: orderData.orderId });
        
        return {
            orderId: orderData.orderId,
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
        };
    }

    async getOrderStatus(orderData) {
        return {
            orderId: orderData.orderId,
            status: 'filled',
            executedQuantity: orderData.quantity || 1,
            remainingQuantity: 0
        };
    }

    async sendMessage(targetService, action, payload) {
        return await this.orchestrator.routeMessage(
            'order-executor',
            targetService,
            action,
            payload
        );
    }
}

module.exports = OrderExecutor;