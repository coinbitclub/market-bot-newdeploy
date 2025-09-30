/**
 * 💰 P&L DISTRIBUTION SERVICE
 * Handles proportional profit/loss distribution to users based on their balance contributions
 */

class PnLDistributionService {
    constructor(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
        console.log('💰 P&L Distribution Service initialized');
    }

    /**
     * Calculate proportional P&L distribution for a trade pool
     * @param {Array} userBalances - Array of user balance objects
     * @param {Number} totalPnL - Total profit/loss from the trade
     * @param {Number} commissionPercent - Commission percentage to deduct
     * @returns {Array} Array of P&L distribution objects
     */
    calculateProportionalPnL(userBalances, totalPnL, commissionPercent = 0) {
        try {
            // Calculate total pool balance
            const totalPoolBalance = userBalances.reduce((sum, user) => {
                return sum + user.contributedBalance;
            }, 0);

            if (totalPoolBalance === 0) {
                console.log('⚠️ No balance in pool for P&L distribution');
                return [];
            }

            // Calculate individual P&L distributions
            const distributions = userBalances.map(user => {
                // Calculate user's percentage of the total pool
                const balancePercentage = user.contributedBalance / totalPoolBalance;

                // Calculate raw P&L for this user
                const rawPnL = totalPnL * balancePercentage;

                // Calculate commission (only on profits)
                const commission = rawPnL > 0 ? (rawPnL * commissionPercent / 100) : 0;

                // Final P&L after commission
                const finalPnL = rawPnL - commission;

                return {
                    userId: user.userId,
                    username: user.username,
                    contributedBalance: user.contributedBalance,
                    balancePercentage: Math.round(balancePercentage * 10000) / 100, // 2 decimal places
                    rawPnL: Math.round(rawPnL * 100) / 100,
                    commission: Math.round(commission * 100) / 100,
                    finalPnL: Math.round(finalPnL * 100) / 100,
                    commissionPercent
                };
            });

            console.log(`💰 P&L distribution calculated for ${distributions.length} users`);
            console.log(`💰 Total P&L: $${totalPnL}, Total Pool: $${totalPoolBalance}`);

            return distributions;

        } catch (error) {
            console.error('❌ Error calculating proportional P&L:', error);
            return [];
        }
    }

    /**
     * Apply P&L distribution to user balances in database
     * @param {Array} distributions - P&L distribution objects
     * @param {String} tradeId - Trade identifier for tracking
     * @returns {Object} Distribution result summary
     */
    async applyPnLDistribution(distributions, tradeId = null) {
        const results = {
            success: true,
            appliedCount: 0,
            failedCount: 0,
            totalDistributed: 0,
            totalCommission: 0,
            failures: []
        };

        try {
            for (const distribution of distributions) {
                try {
                    // Update user balance based on P&L
                    const updateResult = await this.updateUserBalance(
                        distribution.userId,
                        distribution.finalPnL,
                        distribution.commission,
                        tradeId
                    );

                    if (updateResult.success) {
                        results.appliedCount++;
                        results.totalDistributed += distribution.finalPnL;
                        results.totalCommission += distribution.commission;

                        console.log(`💰 P&L applied to user ${distribution.username}: $${distribution.finalPnL}`);
                    } else {
                        results.failedCount++;
                        results.failures.push({
                            userId: distribution.userId,
                            username: distribution.username,
                            error: updateResult.error
                        });
                    }

                } catch (error) {
                    console.error(`❌ Error applying P&L to user ${distribution.userId}:`, error);
                    results.failedCount++;
                    results.failures.push({
                        userId: distribution.userId,
                        username: distribution.username,
                        error: error.message
                    });
                }
            }

            // Record distribution summary
            if (tradeId) {
                await this.recordDistributionSummary(tradeId, results, distributions);
            }

            results.success = results.failedCount === 0;
            console.log(`💰 P&L Distribution completed: ${results.appliedCount} successful, ${results.failedCount} failed`);

            return results;

        } catch (error) {
            console.error('❌ Error applying P&L distribution:', error);
            results.success = false;
            results.error = error.message;
            return results;
        }
    }

    /**
     * Update user balance with P&L and commission
     * @param {Number} userId - User ID
     * @param {Number} pnlAmount - P&L amount to add/subtract
     * @param {Number} commission - Commission amount
     * @param {String} tradeId - Trade identifier
     * @returns {Object} Update result
     */
    async updateUserBalance(userId, pnlAmount, commission, tradeId) {
        try {
            // Get current user balance
            const currentBalance = await this.dbPoolManager.executeRead(`
                SELECT balance_real_brl, balance_real_usd, balance_admin_brl, balance_admin_usd
                FROM users
                WHERE id = $1
            `, [userId]);

            if (currentBalance.rows.length === 0) {
                return { success: false, error: 'User not found' };
            }

            const user = currentBalance.rows[0];

            // For simplicity, we'll update USD balance
            // In production, this would be more sophisticated based on currency
            const newAdminBalanceUsd = parseFloat(user.balance_admin_usd || 0) + pnlAmount;

            // Update user balance
            await this.dbPoolManager.executeWrite(`
                UPDATE users
                SET
                    balance_admin_usd = $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [newAdminBalanceUsd, userId]);

            // Record P&L transaction
            await this.recordPnLTransaction(userId, pnlAmount, commission, tradeId);

            return {
                success: true,
                oldBalance: parseFloat(user.balance_admin_usd || 0),
                newBalance: newAdminBalanceUsd,
                pnlAmount
            };

        } catch (error) {
            console.error(`❌ Error updating user balance for user ${userId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Record P&L transaction for auditing
     * @param {Number} userId - User ID
     * @param {Number} pnlAmount - P&L amount
     * @param {Number} commission - Commission amount
     * @param {String} tradeId - Trade identifier
     */
    async recordPnLTransaction(userId, pnlAmount, commission, tradeId) {
        try {
            await this.dbPoolManager.executeWrite(`
                INSERT INTO financial_transactions (
                    user_id, transaction_type, amount, commission,
                    description, reference_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
                userId,
                pnlAmount >= 0 ? 'profit_distribution' : 'loss_distribution',
                pnlAmount,
                commission,
                `P&L distribution from trade ${tradeId || 'unknown'}`,
                tradeId
            ]);

            console.log(`📝 P&L transaction recorded for user ${userId}: $${pnlAmount}`);

        } catch (error) {
            // Don't fail the main operation if transaction recording fails
            console.error(`⚠️ Failed to record P&L transaction for user ${userId}:`, error);
        }
    }

    /**
     * Record distribution summary for tracking
     * @param {String} tradeId - Trade identifier
     * @param {Object} results - Distribution results
     * @param {Array} distributions - Distribution details
     */
    async recordDistributionSummary(tradeId, results, distributions) {
        try {
            const summary = {
                tradeId,
                totalUsers: distributions.length,
                successfulDistributions: results.appliedCount,
                failedDistributions: results.failedCount,
                totalDistributed: results.totalDistributed,
                totalCommission: results.totalCommission,
                distributionDetails: distributions,
                timestamp: new Date().toISOString()
            };

            await this.dbPoolManager.executeWrite(`
                INSERT INTO pnl_distribution_logs (
                    trade_id, summary_data, created_at
                ) VALUES ($1, $2, NOW())
            `, [tradeId, JSON.stringify(summary)]);

            console.log(`📊 Distribution summary recorded for trade ${tradeId}`);

        } catch (error) {
            console.error(`⚠️ Failed to record distribution summary:`, error);
        }
    }

    /**
     * Get P&L distribution history for a user
     * @param {Number} userId - User ID
     * @param {Number} limit - Number of records to return
     * @returns {Array} P&L distribution history
     */
    async getUserPnLHistory(userId, limit = 50) {
        try {
            const result = await this.dbPoolManager.executeRead(`
                SELECT
                    ft.id,
                    ft.transaction_type,
                    ft.amount,
                    ft.commission,
                    ft.description,
                    ft.reference_id as trade_id,
                    ft.created_at
                FROM financial_transactions ft
                WHERE ft.user_id = $1
                AND ft.transaction_type IN ('profit_distribution', 'loss_distribution')
                ORDER BY ft.created_at DESC
                LIMIT $2
            `, [userId, limit]);

            return result.rows.map(row => ({
                id: row.id,
                type: row.transaction_type,
                amount: parseFloat(row.amount),
                commission: parseFloat(row.commission || 0),
                description: row.description,
                tradeId: row.trade_id,
                timestamp: row.created_at
            }));

        } catch (error) {
            console.error(`❌ Error getting P&L history for user ${userId}:`, error);
            return [];
        }
    }

    /**
     * Calculate and distribute P&L for a completed trade
     * @param {String} tradeId - Trade identifier
     * @param {Array} participants - Array of user participation objects
     * @param {Number} totalPnL - Total P&L from the trade
     * @param {Number} commissionPercent - Commission percentage
     * @returns {Object} Distribution result
     */
    async distributeTradeResults(tradeId, participants, totalPnL, commissionPercent = 0) {
        try {
            console.log(`💰 Starting P&L distribution for trade ${tradeId}`);
            console.log(`💰 Total P&L: $${totalPnL}, Participants: ${participants.length}`);

            // Calculate proportional distributions
            const distributions = this.calculateProportionalPnL(participants, totalPnL, commissionPercent);

            if (distributions.length === 0) {
                return {
                    success: false,
                    message: 'No valid distributions calculated',
                    tradeId
                };
            }

            // Apply distributions to user balances
            const distributionResult = await this.applyPnLDistribution(distributions, tradeId);

            return {
                success: distributionResult.success,
                tradeId,
                totalPnL,
                participants: participants.length,
                distributions: distributions,
                summary: {
                    appliedCount: distributionResult.appliedCount,
                    failedCount: distributionResult.failedCount,
                    totalDistributed: distributionResult.totalDistributed,
                    totalCommission: distributionResult.totalCommission
                },
                failures: distributionResult.failures,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ Error distributing trade results for ${tradeId}:`, error);
            return {
                success: false,
                error: error.message,
                tradeId
            };
        }
    }
}

module.exports = PnLDistributionService;