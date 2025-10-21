/**
 * Hybrid Position Management Service
 *
 * This service implements a hybrid approach:
 * - Exchange API = Source of truth for CURRENT positions
 * - Database = Historical records for ANALYTICS
 * - Reconciliation = Auto-sync discrepancies
 *
 * @author CoinBitClub
 * @date October 20, 2025
 */

const BybitService = require('../exchange/bybit-service');
const BinanceService = require('../exchange/binance-service');

class PositionManagementService {
    constructor(dbPoolManager, apiKeyManager) {
        this.dbPoolManager = dbPoolManager;
        this.apiKeyManager = apiKeyManager;

        // Cache exchange services per user to avoid recreation
        this.exchangeServiceCache = new Map();

        // Cache positions for performance (5 second TTL)
        this.positionCache = new Map();
        this.cacheTTL = 5000; // 5 seconds

        console.log('📊 Position Management Service (Hybrid) initialized');
    }

    /**
     * Get exchange service for user
     * @private
     */
    async getExchangeService(userId, exchange) {
        const cacheKey = `${userId}:${exchange}`;

        if (this.exchangeServiceCache.has(cacheKey)) {
            return this.exchangeServiceCache.get(cacheKey);
        }

        const credentials = await this.apiKeyManager.getAPICredentials(userId, exchange);

        if (!credentials.success || !credentials.enabled) {
            return null;
        }

        let service;
        if (exchange.toLowerCase() === 'bybit') {
            service = new BybitService({
                apiKey: credentials.apiKey,
                apiSecret: credentials.apiSecret,
                testnet: credentials.testnet || false
            });
        } else if (exchange.toLowerCase() === 'binance') {
            service = new BinanceService({
                apiKey: credentials.apiKey,
                apiSecret: credentials.apiSecret,
                testnet: credentials.testnet || false
            });
        }

        if (service) {
            this.exchangeServiceCache.set(cacheKey, service);
        }

        return service;
    }

    /**
     * Normalize side from exchange format to our format
     * @private
     */
    normalizeSide(exchangeSide, positionAmt) {
        // Bybit: 'Buy' or 'Sell'
        // Binance: positionAmt positive = long, negative = short
        if (typeof positionAmt !== 'undefined') {
            return parseFloat(positionAmt) >= 0 ? 'LONG' : 'SHORT';
        }

        return exchangeSide === 'Buy' ? 'LONG' : 'SHORT';
    }

    /**
     * Get current positions from exchange (REAL-TIME)
     * This is the SOURCE OF TRUTH for what positions are actually open
     *
     * @param {number} userId - User ID
     * @param {string} exchange - Optional: specific exchange (bybit/binance)
     * @returns {Promise<Array>} Array of current positions
     */
    async getCurrentPositions(userId, exchange = null) {
        try {
            const cacheKey = `current:${userId}:${exchange || 'all'}`;

            // Check cache
            if (this.positionCache.has(cacheKey)) {
                const cached = this.positionCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTTL) {
                    return cached.data;
                }
            }

            const exchanges = exchange ? [exchange] : ['bybit', 'binance'];
            const allPositions = [];

            for (const ex of exchanges) {
                try {
                    const service = await this.getExchangeService(userId, ex);

                    if (!service) {
                        console.log(`⚠️  No ${ex} credentials for user ${userId}`);
                        continue;
                    }

                    const result = await service.getPositions('linear');

                    if (!result.success) {
                        console.error(`❌ Failed to fetch ${ex} positions for user ${userId}:`, result.error);
                        continue;
                    }

                    // Filter only non-zero positions and normalize
                    const positions = result.data
                        .filter(p => {
                            const size = parseFloat(p.size || Math.abs(p.positionAmt || 0));
                            return size > 0;
                        })
                        .map(p => {
                            const size = parseFloat(p.size || Math.abs(p.positionAmt || 0));
                            const side = this.normalizeSide(p.side, p.positionAmt);
                            const entryPrice = parseFloat(p.entryPrice || p.avgPrice || 0);
                            const markPrice = parseFloat(p.markPrice || 0);
                            const unrealizedPnl = parseFloat(p.unrealisedPnl || p.unRealizedProfit || 0);

                            return {
                                exchange: ex,
                                symbol: p.symbol,
                                side: side,
                                size: size,
                                entryPrice: entryPrice,
                                markPrice: markPrice,
                                unrealizedPnl: unrealizedPnl,
                                unrealizedPnlPercent: entryPrice > 0
                                    ? ((markPrice - entryPrice) / entryPrice) * 100 * (side === 'LONG' ? 1 : -1)
                                    : 0,
                                leverage: parseInt(p.leverage || 1),
                                marginType: this.normalizeMarginType(p.tradeMode, p.marginType),
                                positionValue: size * markPrice,
                                liquidationPrice: parseFloat(p.liqPrice || p.liquidationPrice || 0),
                                updatedTime: p.updatedTime || p.updateTime || Date.now(),
                                dataSource: 'exchange' // Indicates real-time from exchange
                            };
                        });

                    allPositions.push(...positions);

                } catch (error) {
                    console.error(`❌ Error fetching ${ex} positions for user ${userId}:`, error.message);
                }
            }

            // Cache the result
            this.positionCache.set(cacheKey, {
                data: allPositions,
                timestamp: Date.now()
            });

            return allPositions;

        } catch (error) {
            console.error(`❌ Error getting current positions for user ${userId}:`, error);
            return [];
        }
    }

    /**
     * Normalize margin type
     * @private
     */
    normalizeMarginType(tradeMode, marginType) {
        if (typeof tradeMode !== 'undefined') {
            return tradeMode === 0 ? 'cross' : 'isolated';
        }
        return marginType === 'cross' ? 'cross' : 'isolated';
    }

    /**
     * Get positions for display (REAL-TIME + METADATA)
     * Combines exchange real-time data with database metadata
     *
     * @param {number} userId - User ID
     * @param {string} exchange - Optional: specific exchange
     * @returns {Promise<Array>} Array of positions with metadata
     */
    async getPositionsForDisplay(userId, exchange = null) {
        try {
            // 1. Get real-time positions from exchange (SOURCE OF TRUTH)
            const exchangePositions = await this.getCurrentPositions(userId, exchange);

            // 2. Get database records for metadata
            let query = `
                SELECT
                    operation_id,
                    symbol,
                    exchange,
                    operation_type,
                    entry_price,
                    quantity,
                    entry_time,
                    plan_type,
                    commission,
                    slippage,
                    fill_percent,
                    position_size,
                    leverage
                FROM trading_operations
                WHERE user_id = $1 AND status = 'OPEN'
            `;

            const params = [userId];

            if (exchange) {
                query += ` AND exchange = $2`;
                params.push(exchange);
            }

            const dbResult = await this.dbPoolManager.executeRead(query, params);

            // 3. Merge exchange data with database metadata
            const positions = exchangePositions.map(exPos => {
                const dbRecord = dbResult.rows.find(
                    db => db.exchange.toLowerCase() === exPos.exchange.toLowerCase() &&
                          db.symbol === exPos.symbol &&
                          db.operation_type === exPos.side
                );

                return {
                    // Real-time data from exchange (SOURCE OF TRUTH)
                    symbol: exPos.symbol,
                    exchange: exPos.exchange,
                    side: exPos.side,
                    size: exPos.size,
                    entryPrice: exPos.entryPrice,
                    markPrice: exPos.markPrice,
                    unrealizedPnl: exPos.unrealizedPnl,
                    unrealizedPnlPercent: exPos.unrealizedPnlPercent,
                    leverage: exPos.leverage,
                    marginType: exPos.marginType,
                    positionValue: exPos.positionValue,
                    liquidationPrice: exPos.liquidationPrice,
                    updatedTime: exPos.updatedTime,

                    // Metadata from database
                    operation_id: dbRecord?.operation_id,
                    entry_time: dbRecord?.entry_time,
                    plan_type: dbRecord?.plan_type,
                    commission: dbRecord?.commission,
                    slippage: dbRecord?.slippage,
                    fill_percent: dbRecord?.fill_percent,
                    position_size_usd: dbRecord?.position_size,

                    // Calculated fields
                    duration_minutes: dbRecord?.entry_time
                        ? Math.floor((Date.now() - new Date(dbRecord.entry_time).getTime()) / 60000)
                        : 0,

                    // Status flags
                    dataSource: 'exchange', // Real-time from exchange
                    inSync: !!dbRecord,     // Whether database has matching record
                    isTracked: !!dbRecord   // Whether this position is tracked by our bot
                };
            });

            return positions;

        } catch (error) {
            console.error(`❌ Error getting positions for display for user ${userId}:`, error);
            return [];
        }
    }

    /**
     * Get historical trades (ANALYTICS)
     * Database is SOURCE OF TRUTH for historical data
     *
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of historical trades
     */
    async getHistoricalTrades(userId, options = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                endDate = new Date(),
                status = 'CLOSED',  // OPEN, CLOSED, or ALL
                exchange = null,
                symbol = null,
                limit = 100,
                offset = 0
            } = options;

            let query = `
                SELECT
                    id,
                    operation_id,
                    symbol,
                    operation_type,
                    entry_price,
                    exit_price,
                    quantity,
                    exchange,
                    profit_loss_usd,
                    profit_loss_percentage,
                    net_pnl,
                    commission_charged,
                    entry_time,
                    exit_time,
                    duration_minutes,
                    close_reason,
                    plan_type,
                    slippage,
                    fill_percent,
                    position_size,
                    leverage
                FROM trading_operations
                WHERE user_id = $1
                    AND entry_time >= $2
                    AND entry_time <= $3
            `;

            const params = [userId, startDate, endDate];
            let paramIndex = 4;

            if (status !== 'ALL') {
                query += ` AND status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            if (exchange) {
                query += ` AND exchange = $${paramIndex}`;
                params.push(exchange);
                paramIndex++;
            }

            if (symbol) {
                query += ` AND symbol = $${paramIndex}`;
                params.push(symbol);
                paramIndex++;
            }

            query += ` ORDER BY entry_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const result = await this.dbPoolManager.executeRead(query, params);
            return result.rows;

        } catch (error) {
            console.error(`❌ Error getting historical trades for user ${userId}:`, error);
            return [];
        }
    }

    /**
     * Get analytics summary (ANALYTICS)
     *
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Analytics summary
     */
    async getAnalyticsSummary(userId, options = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                endDate = new Date(),
                exchange = null
            } = options;

            let query = `
                SELECT
                    COUNT(*) as total_trades,
                    COUNT(*) FILTER (WHERE net_pnl > 0) as profitable_trades,
                    COUNT(*) FILTER (WHERE net_pnl < 0) as losing_trades,
                    COUNT(*) FILTER (WHERE net_pnl = 0) as breakeven_trades,
                    SUM(net_pnl) as total_pnl,
                    SUM(profit_loss_usd) as gross_pnl,
                    SUM(commission_charged) as total_commission,
                    AVG(net_pnl) as avg_pnl_per_trade,
                    AVG(profit_loss_percentage) as avg_pnl_percentage,
                    AVG(duration_minutes) as avg_duration_minutes,
                    AVG(slippage) as avg_slippage,
                    MAX(net_pnl) as best_trade,
                    MIN(net_pnl) as worst_trade,
                    SUM(position_size) as total_volume
                FROM trading_operations
                WHERE user_id = $1
                    AND status = 'CLOSED'
                    AND exit_time >= $2
                    AND exit_time <= $3
            `;

            const params = [userId, startDate, endDate];

            if (exchange) {
                query += ` AND exchange = $4`;
                params.push(exchange);
            }

            const result = await this.dbPoolManager.executeRead(query, params);
            const stats = result.rows[0];

            // Calculate win rate
            const totalTrades = parseInt(stats.total_trades || 0);
            const profitableTrades = parseInt(stats.profitable_trades || 0);
            const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

            // Get current open positions count
            const openPositions = await this.getPositionsForDisplay(userId, exchange);

            return {
                totalTrades,
                profitableTrades,
                losingTrades: parseInt(stats.losing_trades || 0),
                breakevenTrades: parseInt(stats.breakeven_trades || 0),
                winRate: parseFloat(winRate.toFixed(2)),
                totalPnl: parseFloat(stats.total_pnl || 0),
                grossPnl: parseFloat(stats.gross_pnl || 0),
                totalCommission: parseFloat(stats.total_commission || 0),
                avgPnlPerTrade: parseFloat(stats.avg_pnl_per_trade || 0),
                avgPnlPercentage: parseFloat(stats.avg_pnl_percentage || 0),
                avgDurationMinutes: parseFloat(stats.avg_duration_minutes || 0),
                avgSlippage: parseFloat(stats.avg_slippage || 0),
                bestTrade: parseFloat(stats.best_trade || 0),
                worstTrade: parseFloat(stats.worst_trade || 0),
                totalVolume: parseFloat(stats.total_volume || 0),
                openPositionsCount: openPositions.length,
                period: {
                    startDate,
                    endDate,
                    days: Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000))
                }
            };

        } catch (error) {
            console.error(`❌ Error getting analytics summary for user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Get position by operation ID
     *
     * @param {string} operationId - Operation ID
     * @returns {Promise<Object>} Position details
     */
    async getPositionByOperationId(operationId) {
        try {
            const result = await this.dbPoolManager.executeRead(`
                SELECT * FROM trading_operations
                WHERE operation_id = $1
            `, [operationId]);

            return result.rows[0] || null;

        } catch (error) {
            console.error(`❌ Error getting position ${operationId}:`, error);
            return null;
        }
    }

    /**
     * Clear position cache
     * Call this after significant position changes
     */
    clearCache(userId = null) {
        if (userId) {
            // Clear cache for specific user
            for (const key of this.positionCache.keys()) {
                if (key.includes(`:${userId}:`)) {
                    this.positionCache.delete(key);
                }
            }
        } else {
            // Clear all cache
            this.positionCache.clear();
        }
    }

    /**
     * Get position performance by symbol
     *
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Performance by symbol
     */
    async getPerformanceBySymbol(userId, options = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                endDate = new Date()
            } = options;

            const result = await this.dbPoolManager.executeRead(`
                SELECT
                    symbol,
                    COUNT(*) as trades,
                    COUNT(*) FILTER (WHERE net_pnl > 0) as wins,
                    SUM(net_pnl) as total_pnl,
                    AVG(net_pnl) as avg_pnl,
                    AVG(profit_loss_percentage) as avg_pnl_percent,
                    SUM(position_size) as total_volume
                FROM trading_operations
                WHERE user_id = $1
                    AND status = 'CLOSED'
                    AND exit_time >= $2
                    AND exit_time <= $3
                GROUP BY symbol
                ORDER BY total_pnl DESC
            `, [userId, startDate, endDate]);

            return result.rows.map(row => ({
                symbol: row.symbol,
                trades: parseInt(row.trades),
                wins: parseInt(row.wins),
                winRate: parseFloat(((row.wins / row.trades) * 100).toFixed(2)),
                totalPnl: parseFloat(row.total_pnl),
                avgPnl: parseFloat(row.avg_pnl),
                avgPnlPercent: parseFloat(row.avg_pnl_percent),
                totalVolume: parseFloat(row.total_volume)
            }));

        } catch (error) {
            console.error(`❌ Error getting performance by symbol for user ${userId}:`, error);
            return [];
        }
    }

    /**
     * Get daily P&L chart data
     *
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Daily P&L data
     */
    async getDailyPnlChart(userId, options = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                endDate = new Date()
            } = options;

            const result = await this.dbPoolManager.executeRead(`
                SELECT
                    DATE(exit_time) as date,
                    SUM(net_pnl) as daily_pnl,
                    COUNT(*) as trades,
                    COUNT(*) FILTER (WHERE net_pnl > 0) as wins
                FROM trading_operations
                WHERE user_id = $1
                    AND status = 'CLOSED'
                    AND exit_time >= $2
                    AND exit_time <= $3
                GROUP BY DATE(exit_time)
                ORDER BY date ASC
            `, [userId, startDate, endDate]);

            let cumulativePnl = 0;

            return result.rows.map(row => {
                cumulativePnl += parseFloat(row.daily_pnl);
                return {
                    date: row.date,
                    dailyPnl: parseFloat(row.daily_pnl),
                    cumulativePnl: parseFloat(cumulativePnl.toFixed(2)),
                    trades: parseInt(row.trades),
                    winRate: parseFloat(((row.wins / row.trades) * 100).toFixed(2))
                };
            });

        } catch (error) {
            console.error(`❌ Error getting daily P&L chart for user ${userId}:`, error);
            return [];
        }
    }
}

module.exports = PositionManagementService;
