/**
 * 📋 SISTEMA DE ORDENS COM TP/SL OBRIGATÓRIOS
 * ===========================================
 * 
 * Garante que TODA ordem tenha Take Profit e Stop Loss configurados
 * Implementa validações obrigatórias conforme regras de negócio
 */

const { Pool } = require('pg');

class OrderManager {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        console.log('📋 Order Manager iniciado');
        console.log('🔒 TP/SL obrigatórios: ATIVADO');
    }

    /**
     * 📝 Criar ordem com TP/SL obrigatórios
     */
    async createOrder(orderData) {
        try {
            console.log('📝 Criando ordem com TP/SL obrigatórios...');

            // VALIDAÇÃO OBRIGATÓRIA: TP e SL devem existir
            const validation = this.validateOrderRequirements(orderData);
            if (!validation.valid) {
                throw new Error(`Validação falhou: ${validation.reason}`);
            }

            // Calcular TP e SL baseado nas regras de negócio
            const calculatedParams = this.calculateTpSlParameters(orderData);
            
            // Criar ordem completa com todos os parâmetros
            const completeOrder = {
                ...orderData,
                ...calculatedParams,
                status: 'PENDING',
                created_at: new Date(),
                tp_sl_mandatory: true
            };

            // Salvar no banco de dados
            const orderId = await this.saveOrderToDatabase(completeOrder);
            
            console.log(`✅ Ordem criada com ID: ${orderId}`);
            console.log(`🎯 Take Profit: ${calculatedParams.take_profit}%`);
            console.log(`🛡️ Stop Loss: ${calculatedParams.stop_loss}%`);

            return {
                success: true,
                orderId: orderId,
                order: completeOrder
            };

        } catch (error) {
            console.error('❌ Erro ao criar ordem:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ✅ Validar requisitos obrigatórios da ordem
     */
    validateOrderRequirements(orderData) {
        // 1. Verificar campos obrigatórios básicos
        const requiredFields = ['user_id', 'ticker', 'direction', 'amount'];
        for (const field of requiredFields) {
            if (!orderData[field]) {
                return {
                    valid: false,
                    reason: `Campo obrigatório faltando: ${field}`
                };
            }
        }

        // 2. Verificar direção válida
        if (!['LONG', 'SHORT'].includes(orderData.direction)) {
            return {
                valid: false,
                reason: 'Direção deve ser LONG ou SHORT'
            };
        }

        // 3. Verificar valor mínimo
        const minAmount = orderData.currency === 'BRL' ? 100 : 20;
        if (orderData.amount < minAmount) {
            return {
                valid: false,
                reason: `Valor mínimo: ${minAmount} ${orderData.currency || 'USD'}`
            };
        }

        // 4. Verificar alavancagem dentro dos limites
        const leverage = orderData.leverage || 5;
        if (leverage < 1 || leverage > 10) {
            return {
                valid: false,
                reason: 'Alavancagem deve estar entre 1x e 10x'
            };
        }

        return { valid: true };
    }

    /**
     * 🧮 Calcular parâmetros TP/SL baseado nas regras
     */
    calculateTpSlParameters(orderData) {
        const leverage = orderData.leverage || parseInt(process.env.DEFAULT_LEVERAGE) || 5;
        
        // Parâmetros padrão do sistema
        const defaultSlMultiplier = parseFloat(process.env.DEFAULT_SL_MULTIPLIER) || 2;
        const defaultTpMultiplier = parseFloat(process.env.DEFAULT_TP_MULTIPLIER) || 3;
        
        // Usar configuração personalizada do usuário se existir
        const slMultiplier = orderData.custom_sl_multiplier || defaultSlMultiplier;
        const tpMultiplier = orderData.custom_tp_multiplier || defaultTpMultiplier;
        
        // Calcular TP e SL como percentual
        const stopLoss = leverage * slMultiplier; // Ex: 5x * 2 = 10%
        const takeProfit = leverage * tpMultiplier; // Ex: 5x * 3 = 15%

        // Validar limites máximos
        const maxSl = leverage * (parseFloat(process.env.MAX_SL_MULTIPLIER) || 5);
        const maxTp = leverage * (parseFloat(process.env.MAX_TP_MULTIPLIER) || 6);

        const finalStopLoss = Math.min(stopLoss, maxSl);
        const finalTakeProfit = Math.min(takeProfit, maxTp);

        return {
            leverage: leverage,
            stop_loss: finalStopLoss,
            take_profit: finalTakeProfit,
            sl_multiplier: slMultiplier,
            tp_multiplier: tpMultiplier,
            entry_price: orderData.entry_price || 0,
            calculated_at: new Date()
        };
    }

    /**
     * 💾 Salvar ordem no banco de dados
     */
    async saveOrderToDatabase(orderData) {
        try {
            const query = `
                INSERT INTO orders (
                    user_id, ticker, direction, amount, leverage,
                    stop_loss, take_profit, entry_price, 
                    sl_multiplier, tp_multiplier,
                    status, tp_sl_mandatory, raw_data, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING id
            `;

            const values = [
                orderData.user_id,
                orderData.ticker,
                orderData.direction,
                orderData.amount,
                orderData.leverage,
                orderData.stop_loss,
                orderData.take_profit,
                orderData.entry_price,
                orderData.sl_multiplier,
                orderData.tp_multiplier,
                orderData.status,
                orderData.tp_sl_mandatory,
                JSON.stringify(orderData),
                orderData.created_at
            ];

            const result = await this.pool.query(query, values);
            return result.rows[0].id;

        } catch (error) {
            console.error('❌ Erro ao salvar ordem:', error.message);
            throw error;
        }
    }

    /**
     * 🔍 Buscar ordens ativas de um usuário
     */
    async getActiveOrders(userId) {
        try {
            const query = `
                SELECT * FROM orders
                WHERE user_id = $1 
                  AND status IN ('PENDING', 'ACTIVE', 'FILLED')
                ORDER BY created_at DESC
            `;

            const result = await this.pool.query(query, [userId]);
            return result.rows;

        } catch (error) {
            console.error('❌ Erro ao buscar ordens ativas:', error.message);
            return [];
        }
    }

    /**
     * 📊 Validar limite de posições por usuário
     */
    async validateUserPositionLimit(userId) {
        try {
            const activeOrders = await this.getActiveOrders(userId);
            const maxPositions = parseInt(process.env.MAX_POSITIONS_PER_USER) || 2;

            if (activeOrders.length >= maxPositions) {
                return {
                    valid: false,
                    reason: `Máximo de ${maxPositions} posições ativas atingido`,
                    current: activeOrders.length
                };
            }

            return {
                valid: true,
                current: activeOrders.length,
                limit: maxPositions
            };

        } catch (error) {
            console.error('❌ Erro ao validar limite de posições:', error.message);
            return { valid: false, reason: 'Erro interno' };
        }
    }

    /**
     * 🔒 Validar bloqueio de ticker
     */
    async validateTickerBlock(userId, ticker) {
        try {
            const blockHours = parseInt(process.env.TICKER_BLOCK_HOURS) || 2;
            
            const query = `
                SELECT id, closed_at FROM orders
                WHERE user_id = $1 
                  AND ticker = $2 
                  AND status = 'CLOSED'
                  AND closed_at > NOW() - INTERVAL '${blockHours} hours'
                ORDER BY closed_at DESC
                LIMIT 1
            `;

            const result = await this.pool.query(query, [userId, ticker]);

            if (result.rows.length > 0) {
                const lastClosed = result.rows[0].closed_at;
                const hoursAgo = (new Date() - new Date(lastClosed)) / (1000 * 60 * 60);
                const remainingHours = blockHours - hoursAgo;

                return {
                    blocked: true,
                    reason: `Ticker bloqueado por ${remainingHours.toFixed(1)}h após fechamento`,
                    lastClosed: lastClosed
                };
            }

            return { blocked: false };

        } catch (error) {
            console.error('❌ Erro ao validar bloqueio de ticker:', error.message);
            return { blocked: false };
        }
    }

    /**
     * 📈 Atualizar ordem com preços de mercado
     */
    async updateOrderWithMarketPrice(orderId, marketPrice) {
        try {
            const query = `
                UPDATE orders 
                SET entry_price = $1,
                    status = 'ACTIVE',
                    activated_at = NOW()
                WHERE id = $2
                RETURNING *
            `;

            const result = await this.pool.query(query, [marketPrice, orderId]);
            
            if (result.rows.length > 0) {
                console.log(`✅ Ordem ${orderId} ativada com preço: ${marketPrice}`);
                return result.rows[0];
            }

            return null;

        } catch (error) {
            console.error('❌ Erro ao atualizar ordem:', error.message);
            return null;
        }
    }

    /**
     * 🛑 Fechar ordem (TP/SL atingido ou sinal FECHE)
     */
    async closeOrder(orderId, closeReason, closePrice) {
        try {
            const query = `
                UPDATE orders 
                SET status = 'CLOSED',
                    close_reason = $1,
                    close_price = $2,
                    closed_at = NOW()
                WHERE id = $3
                RETURNING *
            `;

            const result = await this.pool.query(query, [closeReason, closePrice, orderId]);
            
            if (result.rows.length > 0) {
                const order = result.rows[0];
                const pnl = this.calculatePnL(order);
                
                console.log(`🛑 Ordem ${orderId} fechada: ${closeReason}`);
                console.log(`💰 PnL: ${pnl.percent.toFixed(2)}% (${pnl.amount.toFixed(2)} USD)`);
                
                // Se houver lucro, disparar processo de comissionamento
                if (pnl.amount > 0) {
                    await this.triggerCommissionProcess(order, pnl);
                }

                return order;
            }

            return null;

        } catch (error) {
            console.error('❌ Erro ao fechar ordem:', error.message);
            return null;
        }
    }

    /**
     * 💰 Calcular PnL da ordem
     */
    calculatePnL(order) {
        if (!order.entry_price || !order.close_price) {
            return { percent: 0, amount: 0 };
        }

        const entryPrice = parseFloat(order.entry_price);
        const closePrice = parseFloat(order.close_price);
        const amount = parseFloat(order.amount);
        const leverage = parseFloat(order.leverage);
        const isLong = order.direction === 'LONG';

        let percentChange;
        if (isLong) {
            percentChange = ((closePrice - entryPrice) / entryPrice) * 100;
        } else {
            percentChange = ((entryPrice - closePrice) / entryPrice) * 100;
        }

        const pnlAmount = (amount * (percentChange / 100)) * leverage;

        return {
            percent: percentChange,
            amount: pnlAmount
        };
    }

    /**
     * 💼 Disparar processo de comissionamento
     */
    async triggerCommissionProcess(order, pnl) {
        try {
            // Aqui integraria com o sistema de comissionamento
            console.log(`💼 Disparando comissionamento para ordem ${order.id}`);
            console.log(`💰 Lucro: ${pnl.amount.toFixed(2)} USD`);
            
            // TODO: Integrar com financial-manager para cobrança
            
        } catch (error) {
            console.error('❌ Erro no processo de comissionamento:', error.message);
        }
    }

    /**
     * 🗄️ Criar tabela de ordens
     */
    async createOrderTable() {
        try {
            const createOrderTable = `
                CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    ticker VARCHAR(20) NOT NULL,
                    direction VARCHAR(10) NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    leverage INTEGER DEFAULT 5,
                    stop_loss DECIMAL(8,4) NOT NULL,
                    take_profit DECIMAL(8,4) NOT NULL,
                    entry_price DECIMAL(15,8),
                    close_price DECIMAL(15,8),
                    sl_multiplier DECIMAL(4,2),
                    tp_multiplier DECIMAL(4,2),
                    status VARCHAR(20) DEFAULT 'PENDING',
                    close_reason VARCHAR(100),
                    tp_sl_mandatory BOOLEAN DEFAULT true,
                    raw_data JSONB,
                    created_at TIMESTAMP DEFAULT NOW(),
                    activated_at TIMESTAMP,
                    closed_at TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_orders_user_status 
                ON orders(user_id, status);
                
                CREATE INDEX IF NOT EXISTS idx_orders_ticker_status 
                ON orders(ticker, status);
                
                CREATE INDEX IF NOT EXISTS idx_orders_created_at 
                ON orders(created_at DESC);
            `;

            await this.pool.query(createOrderTable);
            console.log('✅ Tabela orders verificada/criada');
        } catch (error) {
            console.log('⚠️ Aviso ao criar tabela de ordens:', error.message);
        }
    }
}

module.exports = OrderManager;
