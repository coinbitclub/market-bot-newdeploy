/**
 * 📡 TRADING WEBSOCKET SERVICE
 * Real-time WebSocket broadcasting for trading events
 */

const { Server } = require('socket.io');

class TradingWebSocket {
    constructor() {
        this.io = null;
        this.userSockets = new Map(); // userId -> socket mapping
        this.adminSockets = new Set(); // Admin dashboard sockets
        this.isInitialized = false;

        console.log('📡 Trading WebSocket service created');
    }

    /**
     * Initialize WebSocket server
     */
    initialize(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: ["http://localhost:3003", "http://localhost:3004", "http://localhost:3000"],
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        this.setupEventHandlers();
        this.isInitialized = true;

        console.log('📡 Trading WebSocket server initialized');
        return this.io;
    }

    /**
     * Setup WebSocket event handlers
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`📡 WebSocket connected: ${socket.id}`);

            // Handle user authentication and room joining
            socket.on('authenticate', (data) => {
                this.handleAuthentication(socket, data);
            });

            // Handle admin dashboard connection
            socket.on('join_admin', () => {
                this.handleAdminJoin(socket);
            });

            // Handle user trading room join
            socket.on('join_trading', (userId) => {
                this.handleTradingJoin(socket, userId);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                this.handleDisconnection(socket);
            });

            // Send initial connection confirmation
            socket.emit('connected', {
                message: 'Connected to CoinBitClub Trading WebSocket',
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Handle user authentication
     */
    handleAuthentication(socket, data) {
        try {
            const { userId, token, userType } = data;

            // In production, validate JWT token here
            if (!userId) {
                socket.emit('auth_error', { message: 'User ID required' });
                return;
            }

            // Store user socket mapping
            socket.userId = userId;
            socket.userType = userType || 'user';
            this.userSockets.set(userId, socket);

            // Join user to their personal room
            socket.join(`user_${userId}`);

            console.log(`👤 User ${userId} authenticated and joined personal room`);

            socket.emit('authenticated', {
                userId,
                userType: socket.userType,
                room: `user_${userId}`,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Authentication error:', error);
            socket.emit('auth_error', { message: 'Authentication failed' });
        }
    }

    /**
     * Handle admin dashboard join
     */
    handleAdminJoin(socket) {
        this.adminSockets.add(socket);
        socket.join('admin_dashboard');
        socket.isAdmin = true;

        console.log('👑 Admin joined dashboard room');

        socket.emit('admin_joined', {
            message: 'Connected to admin trading dashboard',
            totalUsers: this.userSockets.size,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle user trading room join
     */
    handleTradingJoin(socket, userId) {
        if (!userId && socket.userId) {
            userId = socket.userId;
        }

        if (userId) {
            socket.join(`trading_${userId}`);
            console.log(`📈 User ${userId} joined trading room`);

            socket.emit('trading_joined', {
                userId,
                room: `trading_${userId}`,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Handle socket disconnection
     */
    handleDisconnection(socket) {
        console.log(`📡 WebSocket disconnected: ${socket.id}`);

        // Remove from user sockets mapping
        if (socket.userId) {
            this.userSockets.delete(socket.userId);
        }

        // Remove from admin sockets
        if (socket.isAdmin) {
            this.adminSockets.delete(socket);
        }
    }

    /**
     * Broadcast signal received to all users
     */
    broadcastSignalReceived(signal) {
        if (!this.isInitialized) return;

        const signalData = {
            type: 'signal_received',
            data: {
                symbol: signal.symbol,
                action: signal.action,
                price: signal.price,
                source: signal.source || 'TradingView',
                timestamp: signal.timestamp || new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };

        // Broadcast to all connected users
        this.io.emit('signal_received', signalData);

        // Special broadcast to admin dashboard
        this.io.to('admin_dashboard').emit('admin_signal_received', {
            ...signalData,
            totalConnectedUsers: this.userSockets.size
        });

        console.log(`📡 Signal broadcasted: ${signal.symbol} ${signal.action} to ${this.userSockets.size} users`);
    }

    /**
     * Broadcast AI decision to all users
     */
    broadcastAIDecision(aiDecision, signal) {
        if (!this.isInitialized) return;

        const decisionData = {
            type: 'ai_decision',
            data: {
                signal: {
                    symbol: signal.symbol,
                    action: signal.action
                },
                decision: {
                    action: aiDecision.action,
                    confidence: aiDecision.confidence,
                    reason: aiDecision.reason
                },
                timestamp: new Date().toISOString()
            }
        };

        this.io.emit('ai_decision', decisionData);
        console.log(`🤖 AI Decision broadcasted: ${aiDecision.action} (${aiDecision.confidence}%)`);
    }

    /**
     * Broadcast trade execution to specific user
     */
    broadcastTradeExecution(userId, tradeResult) {
        if (!this.isInitialized) return;

        const tradeData = {
            type: 'trade_executed',
            data: {
                userId,
                orderId: tradeResult.orderId,
                symbol: tradeResult.symbol || 'UNKNOWN',
                side: tradeResult.side || 'UNKNOWN',
                executedPrice: tradeResult.executedPrice,
                executedQty: tradeResult.executedQty,
                exchange: tradeResult.exchange,
                status: tradeResult.success ? 'FILLED' : 'FAILED',
                timestamp: tradeResult.timestamp || new Date().toISOString()
            }
        };

        // Send to specific user
        this.io.to(`user_${userId}`).emit('trade_executed', tradeData);

        // Also send to admin dashboard
        this.io.to('admin_dashboard').emit('admin_trade_executed', {
            ...tradeData,
            username: tradeResult.username
        });

        console.log(`📈 Trade execution broadcasted to user ${userId}: ${tradeResult.success ? 'SUCCESS' : 'FAILED'}`);
    }

    /**
     * Broadcast execution summary to all users and admin
     */
    broadcastExecutionSummary(executionResult) {
        if (!this.isInitialized) return;

        const summaryData = {
            type: 'execution_summary',
            data: {
                totalUsers: executionResult.totalUsers,
                executedTrades: executionResult.executedTrades.length,
                successfulTrades: executionResult.executedTrades.filter(t => t.success).length,
                aiDecision: executionResult.aiDecision?.action || 'UNKNOWN',
                aiConfidence: executionResult.aiDecision?.confidence || 0,
                timestamp: new Date().toISOString()
            }
        };

        // Broadcast to all users
        this.io.emit('execution_summary', summaryData);

        // Enhanced summary for admin
        this.io.to('admin_dashboard').emit('admin_execution_summary', {
            ...summaryData,
            detailedResults: executionResult.executedTrades
        });

        console.log(`📊 Execution summary broadcasted: ${executionResult.executedTrades.length} trades executed`);
    }

    /**
     * Broadcast balance update to specific user
     */
    broadcastBalanceUpdate(userId, balanceUpdate) {
        if (!this.isInitialized) return;

        const balanceData = {
            type: 'balance_update',
            data: {
                userId,
                oldBalance: balanceUpdate.oldBalance,
                newBalance: balanceUpdate.newBalance,
                change: balanceUpdate.change,
                changeType: balanceUpdate.changeType, // 'profit' or 'loss'
                timestamp: new Date().toISOString()
            }
        };

        this.io.to(`user_${userId}`).emit('balance_update', balanceData);
        console.log(`💰 Balance update sent to user ${userId}: ${balanceUpdate.change > 0 ? '+' : ''}${balanceUpdate.change}`);
    }

    /**
     * Broadcast live trading stats
     */
    broadcastLiveStats(stats) {
        if (!this.isInitialized) return;

        const statsData = {
            type: 'live_stats',
            data: {
                totalActiveUsers: stats.totalActiveUsers || this.userSockets.size,
                totalPositions: stats.totalPositions || 0,
                totalDailyPnL: stats.totalDailyPnL || 0,
                successRate: stats.successRate || 0,
                timestamp: new Date().toISOString()
            }
        };

        this.io.emit('live_stats', statsData);
        console.log('📊 Live stats broadcasted to all users');
    }

    /**
     * Send notification to specific user
     */
    sendUserNotification(userId, notification) {
        if (!this.isInitialized) return;

        const notificationData = {
            type: 'notification',
            data: {
                title: notification.title,
                message: notification.message,
                type: notification.type || 'info', // info, success, warning, error
                timestamp: new Date().toISOString()
            }
        };

        this.io.to(`user_${userId}`).emit('notification', notificationData);
        console.log(`🔔 Notification sent to user ${userId}: ${notification.title}`);
    }

    /**
     * Broadcast new operation to user (real-time)
     */
    broadcastNewOperation(userId, operation) {
        if (!this.isInitialized) return;

        const operationData = {
            type: 'new_operation',
            data: {
                id: operation.id || operation.operation_id,
                pair: operation.trading_pair || operation.pair,
                direction: operation.operation_type || operation.direction,
                entryPrice: operation.entry_price,
                quantity: operation.quantity,
                status: operation.status,
                timestamp: operation.entry_time || new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };

        this.io.to(`user_${userId}`).emit('new_operation', operationData);
        console.log(`📊 New operation broadcasted to user ${userId}: ${operation.trading_pair}`);
    }

    /**
     * Broadcast operation update to user (price changes, P&L updates)
     */
    broadcastOperationUpdate(userId, operation) {
        if (!this.isInitialized) return;

        const updateData = {
            type: 'operation_update',
            data: {
                id: operation.id || operation.operation_id,
                currentPrice: operation.current_price || operation.exit_price,
                pnl: operation.profit_loss_usd || operation.pnl,
                pnlPercent: operation.profit_loss_percentage || operation.pnlPercent,
                status: operation.status,
                timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };

        this.io.to(`user_${userId}`).emit('operation_update', updateData);
        console.log(`📈 Operation update broadcasted to user ${userId}: ${operation.id}`);
    }

    /**
     * Broadcast operation closed to user
     */
    broadcastOperationClosed(userId, operation) {
        if (!this.isInitialized) return;

        const closedData = {
            type: 'operation_closed',
            data: {
                id: operation.id || operation.operation_id,
                pair: operation.trading_pair || operation.pair,
                entryPrice: operation.entry_price,
                exitPrice: operation.exit_price,
                pnl: operation.profit_loss_usd || operation.pnl,
                pnlPercent: operation.profit_loss_percentage || operation.pnlPercent,
                duration: operation.duration_minutes,
                timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };

        this.io.to(`user_${userId}`).emit('operation_closed', closedData);
        console.log(`✅ Operation closed broadcasted to user ${userId}: P&L ${operation.profit_loss_usd}`);
    }

    /**
     * Broadcast performance update to user
     */
    broadcastPerformanceUpdate(userId, performance) {
        if (!this.isInitialized) return;

        const perfData = {
            type: 'performance_update',
            data: {
                todayOperations: performance.today_operations || performance.operationsToday,
                todayProfitLoss: performance.today_profit_loss || performance.todayReturnUSD,
                todayWinRate: performance.today_win_rate || performance.successRate,
                totalOperations: performance.total_operations,
                totalProfitLoss: performance.total_profit_loss_usd,
                overallWinRate: performance.overall_win_rate,
                timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };

        this.io.to(`user_${userId}`).emit('performance_update', perfData);
        console.log(`📊 Performance update broadcasted to user ${userId}`);
    }

    /**
     * Broadcast all operations data (batch update)
     */
    broadcastOperationsData(userId, data) {
        if (!this.isInitialized) return;

        const opsData = {
            type: 'operations_data',
            data: {
                signals: data.signals || [],
                positions: data.positions || [],
                dailyStats: data.dailyStats || {},
                timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };

        this.io.to(`user_${userId}`).emit('operations_data', opsData);
        console.log(`📡 Operations data broadcasted to user ${userId}: ${data.signals?.length || 0} signals, ${data.positions?.length || 0} positions`);
    }

    /**
     * Broadcast new TradingView signal to ALL users (real-time)
     * This is called when TradingView webhook receives a signal
     */
    broadcastTradingSignal(signal) {
        if (!this.isInitialized) {
            console.warn('⚠️ WebSocket not initialized, cannot broadcast signal');
            return;
        }

        const signalData = {
            type: 'trading_signal',
            data: {
                id: `SIGNAL_${Date.now()}`,
                pair: signal.symbol || signal.pair,
                direction: signal.action || signal.direction,
                price: signal.price,
                quantity: signal.quantity,
                strategy: signal.strategy || signal.alert_name || 'TradingView Signal',
                source: 'TRADINGVIEW',
                confidence: 85, // Default confidence for TradingView signals
                timestamp: new Date().toISOString(),
                // Additional metadata
                interval: signal.interval || signal.timeframe,
                stop_loss: signal.stop_loss,
                take_profit: signal.take_profit
            },
            timestamp: new Date().toISOString()
        };

        // Broadcast to ALL connected clients (not just specific user)
        this.io.emit('trading_signal', signalData);

        console.log(`📊 TradingView signal broadcasted to ALL users: ${signal.symbol} ${signal.action} @ ${signal.price || 'market'}`);
    }

    /**
     * Broadcast signal received event (for monitoring/analytics)
     */
    broadcastSignalReceived(signal) {
        if (!this.isInitialized) return;

        const signalReceivedData = {
            type: 'signal_received',
            data: {
                symbol: signal.symbol,
                action: signal.action,
                source: signal.source || 'TRADINGVIEW',
                timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };

        // Broadcast to all connected clients
        this.io.emit('signal_received', signalReceivedData);

        console.log(`📡 Signal received event broadcasted: ${signal.symbol} ${signal.action}`);
    }

    /**
     * Get connection statistics
     */
    getConnectionStats() {
        return {
            totalConnections: this.io ? this.io.sockets.sockets.size : 0,
            userConnections: this.userSockets.size,
            adminConnections: this.adminSockets.size,
            isInitialized: this.isInitialized
        };
    }
}

// Export singleton instance
const tradingWebSocket = new TradingWebSocket();
module.exports = tradingWebSocket;