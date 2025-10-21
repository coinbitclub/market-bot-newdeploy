/**
 * Position Reconciliation Service
 *
 * This service automatically reconciles positions between exchange and database:
 * - Detects positions closed externally
 * - Detects positions opened externally (not tracked)
 * - Auto-fixes discrepancies
 * - Runs every 5 minutes
 *
 * @author CoinBitClub
 * @date October 20, 2025
 */

class PositionReconciliationService {
    constructor(dbPoolManager, positionManagementService, tradingWebSocket) {
        this.dbPoolManager = dbPoolManager;
        this.positionManagementService = positionManagementService;
        this.tradingWebSocket = tradingWebSocket;

        // Reconciliation interval (5 minutes)
        this.reconciliationInterval = 5 * 60 * 1000;

        // Stats
        this.stats = {
            totalReconciliations: 0,
            discrepanciesFound: 0,
            discrepanciesFixed: 0,
            lastReconciliation: null,
            errors: []
        };

        // Interval handle
        this.intervalHandle = null;

        console.log('🔄 Position Reconciliation Service initialized');
    }

    /**
     * Start reconciliation service
     */
    async start() {
        console.log('🔄 Starting position reconciliation service...');
        console.log(`⏱️  Reconciliation interval: ${this.reconciliationInterval / 1000} seconds`);

        // Run immediately on start
        await this.reconcileAllUsers();

        // Then run on interval
        this.intervalHandle = setInterval(() => {
            this.reconcileAllUsers();
        }, this.reconciliationInterval);

        console.log('✅ Position reconciliation service started');
    }

    /**
     * Stop reconciliation service
     */
    stop() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
            console.log('🛑 Position reconciliation service stopped');
        }
    }

    /**
     * Reconcile all users
     */
    async reconcileAllUsers() {
        try {
            this.stats.totalReconciliations++;
            this.stats.lastReconciliation = new Date();

            console.log(`🔄 [Reconciliation #${this.stats.totalReconciliations}] Starting...`);

            // Get all users with active API keys
            const users = await this.dbPoolManager.executeRead(`
                SELECT DISTINCT user_id
                FROM user_api_keys
                WHERE is_active = true
                    AND trading_enabled = true
            `);

            if (users.rows.length === 0) {
                console.log('ℹ️  No users with active API keys to reconcile');
                return;
            }

            console.log(`🔄 Reconciling positions for ${users.rows.length} users...`);

            let totalDiscrepancies = 0;

            for (const { user_id } of users.rows) {
                const discrepancies = await this.reconcileUserPositions(user_id);
                totalDiscrepancies += discrepancies;
            }

            console.log(`✅ Reconciliation complete. Found ${totalDiscrepancies} discrepancies.`);

        } catch (error) {
            console.error('❌ Error in reconcileAllUsers:', error);
            this.stats.errors.push({
                timestamp: new Date(),
                error: error.message
            });
        }
    }

    /**
     * Reconcile positions for a specific user
     *
     * @param {number} userId - User ID
     * @returns {Promise<number>} Number of discrepancies found
     */
    async reconcileUserPositions(userId) {
        try {
            // 1. Get positions from database (what we think is open)
            const dbPositions = await this.dbPoolManager.executeRead(`
                SELECT
                    id,
                    operation_id,
                    symbol,
                    exchange,
                    operation_type,
                    quantity,
                    entry_price,
                    entry_time
                FROM trading_operations
                WHERE user_id = $1 AND status = 'OPEN'
            `, [userId]);

            // 2. Get actual positions from exchanges
            const exchangePositions = await this.positionManagementService.getCurrentPositions(userId);

            // 3. Find discrepancies
            const discrepancies = this.findDiscrepancies(dbPositions.rows, exchangePositions);

            // 4. Auto-fix discrepancies
            for (const issue of discrepancies) {
                await this.fixDiscrepancy(userId, issue);
            }

            if (discrepancies.length > 0) {
                console.log(`⚠️  User ${userId}: Fixed ${discrepancies.length} discrepancies`);
                this.stats.discrepanciesFound += discrepancies.length;
                this.stats.discrepanciesFixed += discrepancies.length;
            }

            return discrepancies.length;

        } catch (error) {
            console.error(`❌ Error reconciling user ${userId}:`, error);
            return 0;
        }
    }

    /**
     * Find discrepancies between database and exchange
     *
     * @param {Array} dbPositions - Positions from database
     * @param {Array} exchangePositions - Positions from exchange
     * @returns {Array} Array of discrepancies
     */
    findDiscrepancies(dbPositions, exchangePositions) {
        const discrepancies = [];

        // Find positions in database but NOT on exchange (externally closed)
        for (const dbPos of dbPositions) {
            const exchangePos = exchangePositions.find(
                ep => ep.exchange.toLowerCase() === dbPos.exchange.toLowerCase() &&
                      ep.symbol === dbPos.symbol &&
                      ep.side === dbPos.operation_type
            );

            if (!exchangePos) {
                discrepancies.push({
                    type: 'CLOSED_EXTERNALLY',
                    position: dbPos,
                    action: 'UPDATE_TO_CLOSED',
                    reason: 'Position found in database but not on exchange - likely closed externally (stop-loss, take-profit, manual close)'
                });
            }
        }

        // Find positions on exchange but NOT in database (externally opened)
        for (const exPos of exchangePositions) {
            const dbPos = dbPositions.find(
                dp => dp.exchange.toLowerCase() === exPos.exchange.toLowerCase() &&
                      dp.symbol === exPos.symbol &&
                      dp.operation_type === exPos.side
            );

            if (!dbPos) {
                discrepancies.push({
                    type: 'OPENED_EXTERNALLY',
                    position: exPos,
                    action: 'LOG_ONLY',
                    reason: 'Position found on exchange but not in database - opened externally (not tracked by bot)'
                });
            }
        }

        return discrepancies;
    }

    /**
     * Fix a discrepancy
     *
     * @param {number} userId - User ID
     * @param {Object} issue - Discrepancy issue
     */
    async fixDiscrepancy(userId, issue) {
        try {
            if (issue.type === 'CLOSED_EXTERNALLY') {
                // Position closed on exchange but database thinks it's open
                console.log(`🔧 Fixing: ${issue.position.symbol} on ${issue.position.exchange} - ${issue.reason}`);

                // Calculate duration
                const entryTime = new Date(issue.position.entry_time);
                const durationMinutes = Math.floor((Date.now() - entryTime.getTime()) / 60000);

                // Update database to mark as closed
                await this.dbPoolManager.executeWrite(`
                    UPDATE trading_operations
                    SET status = 'CLOSED',
                        exit_time = NOW(),
                        close_reason = 'CLOSED_EXTERNALLY',
                        duration_minutes = $1,
                        updated_at = NOW()
                    WHERE operation_id = $2
                `, [durationMinutes, issue.position.operation_id]);

                console.log(`✅ Updated database: ${issue.position.operation_id} marked as CLOSED`);

                // Broadcast to user via WebSocket
                if (this.tradingWebSocket) {
                    this.tradingWebSocket.broadcastOperationClosed(userId, {
                        position_id: issue.position.id,
                        operation_id: issue.position.operation_id,
                        symbol: issue.position.symbol,
                        exchange: issue.position.exchange,
                        side: issue.position.operation_type,
                        entry_price: issue.position.entry_price,
                        close_reason: 'CLOSED_EXTERNALLY',
                        message: 'Position was closed outside the trading bot (stop-loss, take-profit, or manual close)',
                        closedAt: new Date().toISOString()
                    });
                }

                // Clear cache for this user
                this.positionManagementService.clearCache(userId);
            }

            if (issue.type === 'OPENED_EXTERNALLY') {
                // Position exists on exchange but not in database
                console.log(`ℹ️  Note: ${issue.position.symbol} on ${issue.position.exchange} - ${issue.reason}`);

                // Just log for now - we don't want to auto-add positions opened externally
                // This is expected behavior if users manually open positions on exchange
                // They won't be tracked by the bot, which is fine
            }

        } catch (error) {
            console.error(`❌ Error fixing discrepancy:`, error);
        }
    }

    /**
     * Get reconciliation stats
     *
     * @returns {Object} Stats
     */
    getStats() {
        return {
            ...this.stats,
            isRunning: !!this.intervalHandle,
            intervalSeconds: this.reconciliationInterval / 1000,
            nextReconciliation: this.intervalHandle
                ? new Date(Date.now() + this.reconciliationInterval)
                : null
        };
    }

    /**
     * Manually trigger reconciliation for a specific user
     *
     * @param {number} userId - User ID
     */
    async reconcileUser(userId) {
        console.log(`🔄 Manual reconciliation triggered for user ${userId}`);
        return await this.reconcileUserPositions(userId);
    }
}

module.exports = PositionReconciliationService;
