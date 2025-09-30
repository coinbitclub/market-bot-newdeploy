/**
 * 📊 POSITION TRACKING SERVICE
 * Monitors ongoing trades, tracks performance, and manages position lifecycle
 */

class PositionTracker {
    constructor(dbPoolManager, pnlDistributionService, tradingWebSocket) {
        this.dbPoolManager = dbPoolManager;
        this.pnlDistributionService = pnlDistributionService;
        this.tradingWebSocket = tradingWebSocket;

        // In-memory position tracking
        this.activePositions = new Map(); // tradeId -> position data
        this.positionUpdates = new Map(); // tradeId -> update intervals

        // Position monitoring settings
        this.MONITORING_INTERVAL = 30000; // 30 seconds
        this.POSITION_TIMEOUT = 3600000; // 1 hour max position time
        this.PRICE_UPDATE_THRESHOLD = 0.5; // 0.5% price change to trigger update

        console.log('📊 Position Tracker initialized');
    }

    /**
     * Create and start tracking a new position
     * @param {String} tradeId - Unique trade identifier
     * @param {Object} tradeData - Trade execution data
     * @param {Array} participants - Array of participating users
     * @returns {Object} Position tracking result
     */
    async createPosition(tradeId, tradeData, participants) {
        try {
            console.log(`📊 Creating position tracker for ${tradeId}`);

            // Calculate total investment
            const totalInvestment = participants.reduce((sum, p) => sum + p.positionSize, 0);

            // Create position record
            const position = {
                tradeId,
                symbol: tradeData.symbol || 'UNKNOWN',
                side: tradeData.side || 'BUY',
                exchange: tradeData.exchange || 'bybit',
                entryPrice: parseFloat(tradeData.executedPrice || tradeData.price || 0),
                quantity: tradeData.executedQty || totalInvestment / parseFloat(tradeData.executedPrice || 50000),
                totalInvestment,
                participants: participants.map(p => ({
                    userId: p.userId,
                    username: p.username,
                    investment: p.positionSize,
                    percentage: (p.positionSize / totalInvestment) * 100
                })),
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                lastUpdate: new Date().toISOString(),
                currentPrice: parseFloat(tradeData.executedPrice || tradeData.price || 0),
                unrealizedPnL: 0,
                unrealizedPnLPercent: 0,
                stopLoss: tradeData.stopLoss || null,
                takeProfit: tradeData.takeProfit || null,
                maxDrawdown: 0,
                maxProfit: 0
            };

            // Store in database
            await this.savePositionToDatabase(position);

            // Add to active tracking
            this.activePositions.set(tradeId, position);

            // Start monitoring this position
            this.startPositionMonitoring(tradeId);

            // Broadcast position creation
            this.broadcastPositionUpdate(tradeId, 'created');

            console.log(`📊 Position ${tradeId} created and tracking started`);
            return {
                success: true,
                tradeId,
                position,
                message: 'Position tracking started'
            };

        } catch (error) {
            console.error(`❌ Error creating position ${tradeId}:`, error);
            return {
                success: false,
                tradeId,
                error: error.message
            };
        }
    }

    /**
     * Start monitoring a position with periodic price updates
     * @param {String} tradeId - Trade identifier
     */
    startPositionMonitoring(tradeId) {
        // Clear existing interval if any
        if (this.positionUpdates.has(tradeId)) {
            clearInterval(this.positionUpdates.get(tradeId));
        }

        // Set up periodic monitoring
        const monitoringInterval = setInterval(async () => {
            try {
                await this.updatePositionPrice(tradeId);
            } catch (error) {
                console.error(`❌ Error monitoring position ${tradeId}:`, error);
            }
        }, this.MONITORING_INTERVAL);

        this.positionUpdates.set(tradeId, monitoringInterval);

        // Set up position timeout
        setTimeout(() => {
            this.handlePositionTimeout(tradeId);
        }, this.POSITION_TIMEOUT);

        console.log(`📊 Started monitoring position ${tradeId}`);
    }

    /**
     * Update position with current market price
     * @param {String} tradeId - Trade identifier
     */
    async updatePositionPrice(tradeId) {
        try {
            const position = this.activePositions.get(tradeId);
            if (!position || position.status !== 'ACTIVE') {
                return;
            }

            // Simulate current price (in production, fetch from exchange)
            const currentPrice = await this.getCurrentPrice(position.symbol);

            if (!currentPrice) {
                return;
            }

            // Calculate price change
            const priceChange = Math.abs((currentPrice - position.currentPrice) / position.currentPrice * 100);

            // Only update if significant price change
            if (priceChange < this.PRICE_UPDATE_THRESHOLD) {
                return;
            }

            // Update position data
            const oldPrice = position.currentPrice;
            position.currentPrice = currentPrice;
            position.lastUpdate = new Date().toISOString();

            // Calculate unrealized P&L
            this.calculateUnrealizedPnL(position);

            // Update max drawdown and profit
            if (position.unrealizedPnL < position.maxDrawdown) {
                position.maxDrawdown = position.unrealizedPnL;
            }
            if (position.unrealizedPnL > position.maxProfit) {
                position.maxProfit = position.unrealizedPnL;
            }

            // Check stop loss and take profit
            await this.checkExitConditions(tradeId);

            // Update database
            await this.updatePositionInDatabase(position);

            // Broadcast update
            this.broadcastPositionUpdate(tradeId, 'price_update');

            console.log(`📊 Position ${tradeId} updated: ${oldPrice} → ${currentPrice} (P&L: $${position.unrealizedPnL.toFixed(2)})`);

        } catch (error) {
            console.error(`❌ Error updating position price for ${tradeId}:`, error);
        }
    }

    /**
     * Get current market price for a symbol
     * @param {String} symbol - Trading symbol
     * @returns {Number} Current price
     */
    async getCurrentPrice(symbol) {
        // Simulate price movement (in production, fetch from exchange API)
        const basePrices = {
            'BTCUSDT': 50000,
            'ETHUSDT': 3000,
            'ADAUSDT': 0.5,
            'SOLUSDT': 100
        };

        const basePrice = basePrices[symbol] || basePrices['BTCUSDT'];

        // Simulate price movement ±2%
        const priceVariation = (Math.random() - 0.5) * 0.04; // ±2%
        const currentPrice = basePrice * (1 + priceVariation);

        return Math.round(currentPrice * 100) / 100;
    }

    /**
     * Calculate unrealized P&L for a position
     * @param {Object} position - Position data
     */
    calculateUnrealizedPnL(position) {
        const priceDiff = position.currentPrice - position.entryPrice;
        const multiplier = position.side === 'BUY' ? 1 : -1;

        // Simple P&L calculation (in production, consider leverage, fees, etc.)
        position.unrealizedPnL = (priceDiff * multiplier * position.quantity);
        position.unrealizedPnLPercent = (priceDiff * multiplier / position.entryPrice) * 100;
    }

    /**
     * Check if position should be closed based on stop loss/take profit
     * @param {String} tradeId - Trade identifier
     */
    async checkExitConditions(tradeId) {
        const position = this.activePositions.get(tradeId);
        if (!position || position.status !== 'ACTIVE') {
            return;
        }

        let shouldClose = false;
        let reason = '';

        // Check stop loss
        if (position.stopLoss) {
            const stopLossHit = position.side === 'BUY'
                ? position.currentPrice <= position.stopLoss
                : position.currentPrice >= position.stopLoss;

            if (stopLossHit) {
                shouldClose = true;
                reason = 'Stop Loss triggered';
            }
        }

        // Check take profit
        if (position.takeProfit && !shouldClose) {
            const takeProfitHit = position.side === 'BUY'
                ? position.currentPrice >= position.takeProfit
                : position.currentPrice <= position.takeProfit;

            if (takeProfitHit) {
                shouldClose = true;
                reason = 'Take Profit triggered';
            }
        }

        if (shouldClose) {
            await this.closePosition(tradeId, reason);
        }
    }

    /**
     * Close a position and distribute P&L
     * @param {String} tradeId - Trade identifier
     * @param {String} reason - Reason for closing
     */
    async closePosition(tradeId, reason = 'Manual close') {
        try {
            const position = this.activePositions.get(tradeId);
            if (!position) {
                console.log(`⚠️ Position ${tradeId} not found for closing`);
                return;
            }

            console.log(`📊 Closing position ${tradeId}: ${reason}`);

            // Update position status
            position.status = 'CLOSED';
            position.closeReason = reason;
            position.closeTime = new Date().toISOString();
            position.closePrice = position.currentPrice;

            // Final P&L calculation
            this.calculateUnrealizedPnL(position);
            const realizedPnL = position.unrealizedPnL;

            // Stop monitoring
            this.stopPositionMonitoring(tradeId);

            // Prepare participants for P&L distribution
            const pnlParticipants = position.participants.map(p => ({
                userId: p.userId,
                username: p.username,
                contributedBalance: p.investment
            }));

            // Distribute P&L to participants
            if (this.pnlDistributionService) {
                const avgCommission = 15; // Average commission rate
                const distributionResult = await this.pnlDistributionService.distributeTradeResults(
                    tradeId,
                    pnlParticipants,
                    realizedPnL,
                    avgCommission
                );

                position.pnlDistributed = distributionResult.success;
                position.distributionSummary = distributionResult.summary;

                // Broadcast P&L updates to users
                if (distributionResult.success && distributionResult.distributions) {
                    for (const distribution of distributionResult.distributions) {
                        const balanceUpdate = {
                            oldBalance: distribution.contributedBalance,
                            newBalance: distribution.contributedBalance + distribution.finalPnL,
                            change: distribution.finalPnL,
                            changeType: distribution.finalPnL >= 0 ? 'profit' : 'loss'
                        };

                        if (this.tradingWebSocket) {
                            this.tradingWebSocket.broadcastBalanceUpdate(distribution.userId, balanceUpdate);
                        }
                    }
                }
            }

            // Update database
            await this.updatePositionInDatabase(position);

            // Remove from active tracking
            this.activePositions.delete(tradeId);

            // Broadcast position closure
            this.broadcastPositionUpdate(tradeId, 'closed');

            console.log(`📊 Position ${tradeId} closed successfully. P&L: $${realizedPnL.toFixed(2)}`);

            return {
                success: true,
                tradeId,
                realizedPnL,
                reason,
                position
            };

        } catch (error) {
            console.error(`❌ Error closing position ${tradeId}:`, error);
            return {
                success: false,
                tradeId,
                error: error.message
            };
        }
    }

    /**
     * Handle position timeout (auto-close after max time)
     * @param {String} tradeId - Trade identifier
     */
    async handlePositionTimeout(tradeId) {
        const position = this.activePositions.get(tradeId);
        if (position && position.status === 'ACTIVE') {
            console.log(`⏰ Position ${tradeId} timed out, auto-closing`);
            await this.closePosition(tradeId, 'Position timeout');
        }
    }

    /**
     * Stop monitoring a position
     * @param {String} tradeId - Trade identifier
     */
    stopPositionMonitoring(tradeId) {
        if (this.positionUpdates.has(tradeId)) {
            clearInterval(this.positionUpdates.get(tradeId));
            this.positionUpdates.delete(tradeId);
            console.log(`📊 Stopped monitoring position ${tradeId}`);
        }
    }

    /**
     * Broadcast position updates via WebSocket
     * @param {String} tradeId - Trade identifier
     * @param {String} updateType - Type of update
     */
    broadcastPositionUpdate(tradeId, updateType) {
        if (!this.tradingWebSocket) return;

        const position = this.activePositions.get(tradeId);
        if (!position) return;

        const updateData = {
            type: 'position_update',
            updateType,
            data: {
                tradeId: position.tradeId,
                symbol: position.symbol,
                side: position.side,
                status: position.status,
                entryPrice: position.entryPrice,
                currentPrice: position.currentPrice,
                unrealizedPnL: position.unrealizedPnL,
                unrealizedPnLPercent: position.unrealizedPnLPercent,
                participants: position.participants.length,
                timestamp: new Date().toISOString()
            }
        };

        // Broadcast to all users
        this.tradingWebSocket.io.emit('position_update', updateData);

        // Send individual updates to participants
        for (const participant of position.participants) {
            const userPnL = position.unrealizedPnL * (participant.percentage / 100);
            const userUpdate = {
                ...updateData,
                userSpecific: {
                    investment: participant.investment,
                    unrealizedPnL: userPnL,
                    percentage: participant.percentage
                }
            };

            this.tradingWebSocket.io.to(`user_${participant.userId}`).emit('user_position_update', userUpdate);
        }

        console.log(`📡 Position update broadcasted: ${tradeId} - ${updateType}`);
    }

    /**
     * Get all active positions
     * @returns {Array} Array of active positions
     */
    getActivePositions() {
        return Array.from(this.activePositions.values()).filter(p => p.status === 'ACTIVE');
    }

    /**
     * Get position by trade ID
     * @param {String} tradeId - Trade identifier
     * @returns {Object} Position data
     */
    getPosition(tradeId) {
        return this.activePositions.get(tradeId);
    }

    /**
     * Get positions for a specific user
     * @param {Number} userId - User ID
     * @returns {Array} Array of user positions
     */
    getUserPositions(userId) {
        return Array.from(this.activePositions.values()).filter(position =>
            position.participants.some(p => p.userId === userId)
        );
    }

    /**
     * Save position to database
     * @param {Object} position - Position data
     */
    async savePositionToDatabase(position) {
        try {
            await this.dbPoolManager.executeWrite(`
                INSERT INTO trading_positions (
                    trade_id, symbol, side, exchange, entry_price, quantity,
                    total_investment, participants, status, created_at,
                    stop_loss, take_profit
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                position.tradeId,
                position.symbol,
                position.side,
                position.exchange,
                position.entryPrice,
                position.quantity,
                position.totalInvestment,
                JSON.stringify(position.participants),
                position.status,
                position.createdAt,
                position.stopLoss,
                position.takeProfit
            ]);

            console.log(`📝 Position ${position.tradeId} saved to database`);

        } catch (error) {
            console.error(`❌ Error saving position to database:`, error);
        }
    }

    /**
     * Update position in database
     * @param {Object} position - Position data
     */
    async updatePositionInDatabase(position) {
        try {
            await this.dbPoolManager.executeWrite(`
                UPDATE trading_positions SET
                    current_price = $1,
                    unrealized_pnl = $2,
                    unrealized_pnl_percent = $3,
                    status = $4,
                    last_update = $5,
                    max_drawdown = $6,
                    max_profit = $7,
                    close_reason = $8,
                    close_time = $9,
                    close_price = $10
                WHERE trade_id = $11
            `, [
                position.currentPrice,
                position.unrealizedPnL,
                position.unrealizedPnLPercent,
                position.status,
                position.lastUpdate,
                position.maxDrawdown,
                position.maxProfit,
                position.closeReason || null,
                position.closeTime || null,
                position.closePrice || null,
                position.tradeId
            ]);

        } catch (error) {
            console.error(`❌ Error updating position in database:`, error);
        }
    }

    /**
     * Get position statistics
     * @returns {Object} Position statistics
     */
    getPositionStats() {
        const activePositions = this.getActivePositions();
        const totalInvestment = activePositions.reduce((sum, p) => sum + p.totalInvestment, 0);
        const totalUnrealizedPnL = activePositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

        return {
            activePositions: activePositions.length,
            totalInvestment,
            totalUnrealizedPnL,
            avgPnLPercent: activePositions.length > 0
                ? activePositions.reduce((sum, p) => sum + p.unrealizedPnLPercent, 0) / activePositions.length
                : 0,
            positions: activePositions.map(p => ({
                tradeId: p.tradeId,
                symbol: p.symbol,
                side: p.side,
                unrealizedPnL: p.unrealizedPnL,
                unrealizedPnLPercent: p.unrealizedPnLPercent,
                participants: p.participants.length
            }))
        };
    }
}

module.exports = PositionTracker;