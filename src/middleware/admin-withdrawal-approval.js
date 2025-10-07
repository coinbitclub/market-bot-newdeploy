/**
 * 🛡️ ADMIN WITHDRAWAL APPROVAL MIDDLEWARE
 * Multi-step verification with fraud detection
 * CoinBitClub Enterprise v6.0.0 - Phase 2
 */

const { businessError, authorizationError } = require('./error-handler');
const { affiliateLogger, securityLogger } = require('../config/winston.config');

class AdminWithdrawalApproval {
    constructor() {
        // Fraud detection thresholds
        this.FRAUD_THRESHOLDS = {
            MAX_DAILY_AMOUNT: 10000, // $10,000 per day per affiliate
            MAX_WEEKLY_AMOUNT: 50000, // $50,000 per week
            MAX_SINGLE_WITHDRAWAL: 5000, // $5,000 single withdrawal
            MIN_ACCOUNT_AGE_DAYS: 30, // Minimum 30 days account age
            MIN_REFERRALS: 3, // Minimum 3 active referrals
            SUSPICIOUS_IP_CHANGES: 5, // Max 5 IP changes per week
            VELOCITY_THRESHOLD: 3 // Max 3 withdrawals per 24 hours
        };

        // Risk scoring weights
        this.RISK_WEIGHTS = {
            accountAge: 0.25,
            referralQuality: 0.20,
            transactionHistory: 0.20,
            ipConsistency: 0.15,
            withdrawalPattern: 0.20
        };
    }

    /**
     * Check if withdrawal requires manual approval
     */
    requiresManualApproval(withdrawal, riskScore) {
        return (
            withdrawal.amount > this.FRAUD_THRESHOLDS.MAX_SINGLE_WITHDRAWAL ||
            riskScore >= 70 || // High risk
            withdrawal.method === 'BANK_TRANSFER' // Always require approval for bank transfers
        );
    }

    /**
     * Calculate withdrawal risk score (0-100)
     */
    async calculateRiskScore(affiliateId, withdrawalAmount, pool) {
        try {
            let totalScore = 0;

            // 1. Account Age Risk (25%)
            const accountAgeResult = await pool.executeRead(`
                SELECT
                    EXTRACT(DAY FROM (NOW() - created_at)) as age_days
                FROM affiliates
                WHERE id = $1
            `, [affiliateId]);

            const ageDays = parseInt(accountAgeResult.rows[0]?.age_days || 0);
            const ageScore = this.calculateAccountAgeScore(ageDays);
            totalScore += ageScore * this.RISK_WEIGHTS.accountAge;

            affiliateLogger.debug('Risk Score - Account Age', {
                affiliateId,
                ageDays,
                ageScore,
                weight: this.RISK_WEIGHTS.accountAge
            });

            // 2. Referral Quality Risk (20%)
            const referralResult = await pool.executeRead(`
                SELECT
                    COUNT(*) as total_referrals,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_referrals,
                    COALESCE(AVG(conversion_value), 0) as avg_conversion
                FROM referrals
                WHERE affiliate_id = $1
            `, [affiliateId]);

            const referralData = referralResult.rows[0];
            const referralScore = this.calculateReferralQualityScore(referralData);
            totalScore += referralScore * this.RISK_WEIGHTS.referralQuality;

            affiliateLogger.debug('Risk Score - Referral Quality', {
                affiliateId,
                totalReferrals: referralData.total_referrals,
                activeReferrals: referralData.active_referrals,
                avgConversion: referralData.avg_conversion,
                referralScore,
                weight: this.RISK_WEIGHTS.referralQuality
            });

            // 3. Transaction History Risk (20%)
            const transactionResult = await pool.executeRead(`
                SELECT
                    COUNT(*) as total_withdrawals,
                    COALESCE(SUM(amount), 0) as total_withdrawn,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
                FROM affiliate_withdrawals
                WHERE affiliate_id = $1
            `, [affiliateId]);

            const transactionData = transactionResult.rows[0];
            const transactionScore = this.calculateTransactionHistoryScore(transactionData);
            totalScore += transactionScore * this.RISK_WEIGHTS.transactionHistory;

            affiliateLogger.debug('Risk Score - Transaction History', {
                affiliateId,
                totalWithdrawals: transactionData.total_withdrawals,
                rejectedCount: transactionData.rejected_count,
                transactionScore,
                weight: this.RISK_WEIGHTS.transactionHistory
            });

            // 4. IP Consistency Risk (15%)
            const ipResult = await pool.executeRead(`
                SELECT
                    COUNT(DISTINCT metadata->>'ip') as unique_ips,
                    COUNT(*) as total_clicks
                FROM affiliate_clicks ac
                JOIN affiliate_links al ON ac.link_id = al.id
                WHERE al.affiliate_id = $1
                  AND ac.clicked_at >= NOW() - INTERVAL '7 days'
            `, [affiliateId]);

            const ipData = ipResult.rows[0];
            const ipScore = this.calculateIPConsistencyScore(
                parseInt(ipData.unique_ips || 0),
                parseInt(ipData.total_clicks || 0)
            );
            totalScore += ipScore * this.RISK_WEIGHTS.ipConsistency;

            affiliateLogger.debug('Risk Score - IP Consistency', {
                affiliateId,
                uniqueIPs: ipData.unique_ips,
                totalClicks: ipData.total_clicks,
                ipScore,
                weight: this.RISK_WEIGHTS.ipConsistency
            });

            // 5. Withdrawal Pattern Risk (20%)
            const patternResult = await pool.executeRead(`
                SELECT
                    COUNT(*) as recent_withdrawals,
                    COALESCE(SUM(amount), 0) as recent_amount
                FROM affiliate_withdrawals
                WHERE affiliate_id = $1
                  AND created_at >= NOW() - INTERVAL '24 hours'
            `, [affiliateId]);

            const patternData = patternResult.rows[0];
            const patternScore = this.calculateWithdrawalPatternScore(
                parseInt(patternData.recent_withdrawals || 0),
                parseFloat(patternData.recent_amount || 0),
                withdrawalAmount
            );
            totalScore += patternScore * this.RISK_WEIGHTS.withdrawalPattern;

            affiliateLogger.debug('Risk Score - Withdrawal Pattern', {
                affiliateId,
                recentWithdrawals: patternData.recent_withdrawals,
                recentAmount: patternData.recent_amount,
                patternScore,
                weight: this.RISK_WEIGHTS.withdrawalPattern
            });

            // Final score (0-100)
            const finalScore = Math.round(totalScore);

            affiliateLogger.info('Risk Score Calculated', {
                affiliateId,
                withdrawalAmount,
                components: {
                    accountAge: Math.round(ageScore * this.RISK_WEIGHTS.accountAge),
                    referralQuality: Math.round(referralScore * this.RISK_WEIGHTS.referralQuality),
                    transactionHistory: Math.round(transactionScore * this.RISK_WEIGHTS.transactionHistory),
                    ipConsistency: Math.round(ipScore * this.RISK_WEIGHTS.ipConsistency),
                    withdrawalPattern: Math.round(patternScore * this.RISK_WEIGHTS.withdrawalPattern)
                },
                finalScore,
                riskLevel: this.getRiskLevel(finalScore)
            });

            return finalScore;
        } catch (error) {
            affiliateLogger.error('Error calculating risk score', {
                affiliateId,
                error: error.message,
                stack: error.stack
            });
            // Return high risk score on error (fail-safe)
            return 100;
        }
    }

    /**
     * Calculate account age score (0-100, higher = more risk)
     */
    calculateAccountAgeScore(ageDays) {
        if (ageDays < 7) return 100; // Very high risk - new account
        if (ageDays < 30) return 70; // High risk - young account
        if (ageDays < 90) return 40; // Medium risk
        if (ageDays < 180) return 20; // Low risk
        return 0; // Very low risk - established account
    }

    /**
     * Calculate referral quality score (0-100, higher = more risk)
     */
    calculateReferralQualityScore(data) {
        const totalReferrals = parseInt(data.total_referrals || 0);
        const activeReferrals = parseInt(data.active_referrals || 0);
        const avgConversion = parseFloat(data.avg_conversion || 0);

        if (totalReferrals === 0) return 100; // No referrals - very high risk
        if (totalReferrals < 3) return 80; // Few referrals - high risk
        if (activeReferrals === 0) return 90; // No active referrals - very high risk

        const activityRate = activeReferrals / totalReferrals;
        if (activityRate < 0.2) return 70; // Low activity rate
        if (activityRate < 0.4) return 50; // Medium activity rate
        if (avgConversion < 50) return 40; // Low conversion value
        if (avgConversion < 100) return 20; // Medium conversion value

        return 0; // Good referral quality
    }

    /**
     * Calculate transaction history score (0-100, higher = more risk)
     */
    calculateTransactionHistoryScore(data) {
        const totalWithdrawals = parseInt(data.total_withdrawals || 0);
        const rejectedCount = parseInt(data.rejected_count || 0);
        const completedCount = parseInt(data.completed_count || 0);

        if (totalWithdrawals === 0) return 50; // First withdrawal - medium risk

        const rejectionRate = totalWithdrawals > 0 ? rejectedCount / totalWithdrawals : 0;
        if (rejectionRate > 0.5) return 100; // High rejection rate - very high risk
        if (rejectionRate > 0.3) return 80; // Medium rejection rate - high risk
        if (rejectionRate > 0.1) return 50; // Some rejections - medium risk

        if (completedCount >= 5) return 0; // Good history - low risk
        if (completedCount >= 2) return 20; // Some history - low-medium risk

        return 30; // Limited history
    }

    /**
     * Calculate IP consistency score (0-100, higher = more risk)
     */
    calculateIPConsistencyScore(uniqueIPs, totalClicks) {
        if (totalClicks === 0) return 50; // No data - medium risk

        const ipChangeRate = uniqueIPs / totalClicks;
        if (ipChangeRate > 0.8) return 100; // Very high IP changes - bot-like
        if (ipChangeRate > 0.5) return 70; // High IP changes - suspicious
        if (ipChangeRate > 0.3) return 40; // Medium IP changes
        if (ipChangeRate > 0.1) return 20; // Some variation - normal

        return 0; // Consistent IPs - low risk
    }

    /**
     * Calculate withdrawal pattern score (0-100, higher = more risk)
     */
    calculateWithdrawalPatternScore(recentWithdrawals, recentAmount, currentAmount) {
        if (recentWithdrawals >= this.FRAUD_THRESHOLDS.VELOCITY_THRESHOLD) {
            return 100; // Exceeds velocity threshold - very high risk
        }

        if (recentWithdrawals >= 2) return 70; // Multiple recent withdrawals
        if (recentWithdrawals === 1 && recentAmount > 1000) return 50; // Large recent withdrawal

        if (currentAmount > this.FRAUD_THRESHOLDS.MAX_SINGLE_WITHDRAWAL) {
            return 80; // Large withdrawal amount
        }

        if (currentAmount > 2000) return 40; // Medium-large amount
        if (currentAmount > 1000) return 20; // Medium amount

        return 0; // Normal withdrawal pattern
    }

    /**
     * Get risk level from score
     */
    getRiskLevel(score) {
        if (score >= 80) return 'CRITICAL';
        if (score >= 60) return 'HIGH';
        if (score >= 40) return 'MEDIUM';
        if (score >= 20) return 'LOW';
        return 'MINIMAL';
    }

    /**
     * Check fraud detection rules
     */
    async checkFraudRules(affiliateId, withdrawalAmount, pool) {
        const violations = [];

        try {
            // Check daily limit
            const dailyResult = await pool.executeRead(`
                SELECT COALESCE(SUM(amount), 0) as daily_total
                FROM affiliate_withdrawals
                WHERE affiliate_id = $1
                  AND created_at >= CURRENT_DATE
                  AND status != 'rejected'
            `, [affiliateId]);

            const dailyTotal = parseFloat(dailyResult.rows[0]?.daily_total || 0);
            if (dailyTotal + withdrawalAmount > this.FRAUD_THRESHOLDS.MAX_DAILY_AMOUNT) {
                violations.push({
                    rule: 'DAILY_LIMIT_EXCEEDED',
                    message: `Daily withdrawal limit exceeded ($${this.FRAUD_THRESHOLDS.MAX_DAILY_AMOUNT})`,
                    currentTotal: dailyTotal,
                    requestedAmount: withdrawalAmount,
                    limit: this.FRAUD_THRESHOLDS.MAX_DAILY_AMOUNT
                });
            }

            // Check weekly limit
            const weeklyResult = await pool.executeRead(`
                SELECT COALESCE(SUM(amount), 0) as weekly_total
                FROM affiliate_withdrawals
                WHERE affiliate_id = $1
                  AND created_at >= NOW() - INTERVAL '7 days'
                  AND status != 'rejected'
            `, [affiliateId]);

            const weeklyTotal = parseFloat(weeklyResult.rows[0]?.weekly_total || 0);
            if (weeklyTotal + withdrawalAmount > this.FRAUD_THRESHOLDS.MAX_WEEKLY_AMOUNT) {
                violations.push({
                    rule: 'WEEKLY_LIMIT_EXCEEDED',
                    message: `Weekly withdrawal limit exceeded ($${this.FRAUD_THRESHOLDS.MAX_WEEKLY_AMOUNT})`,
                    currentTotal: weeklyTotal,
                    requestedAmount: withdrawalAmount,
                    limit: this.FRAUD_THRESHOLDS.MAX_WEEKLY_AMOUNT
                });
            }

            // Check account age
            const ageResult = await pool.executeRead(`
                SELECT EXTRACT(DAY FROM (NOW() - created_at)) as age_days
                FROM affiliates
                WHERE id = $1
            `, [affiliateId]);

            const ageDays = parseInt(ageResult.rows[0]?.age_days || 0);
            if (ageDays < this.FRAUD_THRESHOLDS.MIN_ACCOUNT_AGE_DAYS) {
                violations.push({
                    rule: 'ACCOUNT_TOO_NEW',
                    message: `Account must be at least ${this.FRAUD_THRESHOLDS.MIN_ACCOUNT_AGE_DAYS} days old`,
                    currentAge: ageDays,
                    requiredAge: this.FRAUD_THRESHOLDS.MIN_ACCOUNT_AGE_DAYS
                });
            }

            // Check minimum referrals
            const referralResult = await pool.executeRead(`
                SELECT COUNT(*) as active_referrals
                FROM referrals
                WHERE affiliate_id = $1 AND status = 'active'
            `, [affiliateId]);

            const activeReferrals = parseInt(referralResult.rows[0]?.active_referrals || 0);
            if (activeReferrals < this.FRAUD_THRESHOLDS.MIN_REFERRALS) {
                violations.push({
                    rule: 'INSUFFICIENT_REFERRALS',
                    message: `Minimum ${this.FRAUD_THRESHOLDS.MIN_REFERRALS} active referrals required`,
                    currentReferrals: activeReferrals,
                    requiredReferrals: this.FRAUD_THRESHOLDS.MIN_REFERRALS
                });
            }

            // Log fraud check results
            if (violations.length > 0) {
                securityLogger.warn('Fraud Detection - Violations Found', {
                    affiliateId,
                    withdrawalAmount,
                    violationCount: violations.length,
                    violations
                });
            } else {
                securityLogger.info('Fraud Detection - Passed', {
                    affiliateId,
                    withdrawalAmount,
                    checks: ['daily_limit', 'weekly_limit', 'account_age', 'referrals']
                });
            }

            return {
                passed: violations.length === 0,
                violations
            };
        } catch (error) {
            securityLogger.error('Error checking fraud rules', {
                affiliateId,
                error: error.message,
                stack: error.stack
            });

            // Fail-safe: treat as fraud on error
            return {
                passed: false,
                violations: [{
                    rule: 'FRAUD_CHECK_ERROR',
                    message: 'Unable to verify fraud rules',
                    error: error.message
                }]
            };
        }
    }

    /**
     * Middleware to validate withdrawal request
     */
    validateWithdrawalRequest() {
        return async (req, res, next) => {
            try {
                const { amount, method } = req.body;

                // Validate amount
                if (!amount || amount <= 0) {
                    throw businessError('Invalid withdrawal amount', 'INVALID_AMOUNT');
                }

                if (amount < 50) {
                    throw businessError('Minimum withdrawal is $50', 'MINIMUM_AMOUNT');
                }

                // Validate method
                if (!['PIX', 'BANK_TRANSFER'].includes(method)) {
                    throw businessError(
                        'Invalid withdrawal method. Use PIX or BANK_TRANSFER',
                        'INVALID_METHOD'
                    );
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Middleware to check admin authorization for withdrawal actions
     */
    requireApprovalPermission() {
        return (req, res, next) => {
            if (!req.user) {
                return next(authorizationError('Authentication required'));
            }

            const userType = req.user.userType;
            const allowedRoles = ['admin', 'superadmin', 'financial_admin'];

            if (!allowedRoles.includes(userType)) {
                securityLogger.warn('Unauthorized withdrawal approval attempt', {
                    userId: req.user.id,
                    userType,
                    requiredRoles: allowedRoles,
                    ip: req.ip
                });

                return next(authorizationError(
                    'Insufficient permissions. Financial admin access required.'
                ));
            }

            next();
        };
    }
}

// Export singleton instance
const adminWithdrawalApproval = new AdminWithdrawalApproval();

module.exports = {
    AdminWithdrawalApproval,
    adminWithdrawalApproval,
    calculateRiskScore: adminWithdrawalApproval.calculateRiskScore.bind(adminWithdrawalApproval),
    checkFraudRules: adminWithdrawalApproval.checkFraudRules.bind(adminWithdrawalApproval),
    validateWithdrawalRequest: adminWithdrawalApproval.validateWithdrawalRequest.bind(adminWithdrawalApproval),
    requireApprovalPermission: adminWithdrawalApproval.requireApprovalPermission.bind(adminWithdrawalApproval),
    getRiskLevel: adminWithdrawalApproval.getRiskLevel.bind(adminWithdrawalApproval),
    requiresManualApproval: adminWithdrawalApproval.requiresManualApproval.bind(adminWithdrawalApproval)
};
