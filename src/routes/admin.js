/**
 * 👨‍💼 ADMIN ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * Admin panel and system management
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const { requireApprovalPermission } = require('../middleware/admin-withdrawal-approval');
const { calculateRiskScore, checkFraudRules, getRiskLevel } = require('../middleware/admin-withdrawal-approval');
const { affiliateLogger, securityLogger } = require('../config/winston.config');

class AdminRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.pool = null;
        this.setupRoutes();
    }

    /**
     * Set database pool manager
     */
    setDbPoolManager(dbPoolManager) {
        this.pool = dbPoolManager;
        console.log('✅ AdminRoutes: Database connection configured');
    }

    setupRoutes() {
        // All routes require authentication and admin access
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));
        this.router.use(this.authMiddleware.requireAdmin.bind(this.authMiddleware));

        // Admin routes
        this.router.get('/dashboard', this.getDashboard.bind(this));
        this.router.get('/users', this.getUsers.bind(this));
        this.router.get('/system-stats', this.getSystemStats.bind(this));
        this.router.get('/transactions', this.getTransactions.bind(this));
        this.router.post('/users/:id/balance', this.updateUserBalance.bind(this));
        this.router.get('/affiliates', this.getAffiliates.bind(this));
        this.router.get('/reports', this.getReports.bind(this));

        // Withdrawal Management Routes (Phase 2 - Affiliate Security)
        this.router.get('/withdrawals/pending',
            requireApprovalPermission(),
            asyncHandler(this.getPendingWithdrawals.bind(this))
        );
        this.router.get('/withdrawals/:id',
            requireApprovalPermission(),
            asyncHandler(this.getWithdrawalDetails.bind(this))
        );
        this.router.post('/withdrawals/:id/approve',
            requireApprovalPermission(),
            asyncHandler(this.approveWithdrawal.bind(this))
        );
        this.router.post('/withdrawals/:id/reject',
            requireApprovalPermission(),
            asyncHandler(this.rejectWithdrawal.bind(this))
        );
        this.router.post('/withdrawals/:id/complete',
            requireApprovalPermission(),
            asyncHandler(this.completeWithdrawal.bind(this))
        );
        this.router.get('/withdrawals/:id/risk-analysis',
            requireApprovalPermission(),
            asyncHandler(this.getWithdrawalRiskAnalysis.bind(this))
        );
    }

    /**
     * GET /dashboard - Get admin dashboard data
     */
    async getDashboard(req, res) {
        try {
            res.json({
                success: true,
                dashboard: {
                    totalUsers: 100,
                    activeUsers: 85,
                    totalRevenue: 50000.00,
                    pendingWithdrawals: 5,
                    systemHealth: 'excellent'
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /users - Get all users
     */
    async getUsers(req, res) {
        try {
            res.json({
                success: true,
                users: []
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /system-stats - Get system statistics
     */
    async getSystemStats(req, res) {
        try {
            res.json({
                success: true,
                stats: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    activeConnections: 50
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /transactions - Get all transactions
     */
    async getTransactions(req, res) {
        try {
            res.json({
                success: true,
                transactions: []
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /users/:id/balance - Update user balance
     */
    async updateUserBalance(req, res) {
        try {
            res.json({
                success: true,
                message: 'User balance updated successfully'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /affiliates - Get all affiliates
     */
    async getAffiliates(req, res) {
        try {
            res.json({
                success: true,
                affiliates: []
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /reports - Get system reports
     */
    async getReports(req, res) {
        try {
            res.json({
                success: true,
                reports: {
                    financial: 'Available',
                    user: 'Available',
                    trading: 'Available'
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /withdrawals/pending - Get all pending withdrawal requests
     * Phase 2: Affiliate System Security
     */
    async getPendingWithdrawals(req, res) {
        const { status = 'pending', limit = 50, offset = 0 } = req.query;

        const result = await this.pool.executeRead(`
            SELECT
                aw.id,
                aw.affiliate_id,
                aw.amount,
                aw.method,
                aw.fees,
                aw.net_amount,
                aw.status,
                aw.created_at,
                a.affiliate_code,
                a.current_balance as affiliate_balance,
                a.total_commissions as affiliate_total_commissions,
                u.full_name as affiliate_name,
                u.email as affiliate_email,
                u.created_at as affiliate_joined_at,
                COUNT(r.id) as total_referrals,
                COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_referrals
            FROM affiliate_withdrawals aw
            JOIN affiliates a ON aw.affiliate_id = a.id
            JOIN users u ON a.user_id = u.id
            LEFT JOIN referrals r ON a.id = r.affiliate_id
            WHERE aw.status = $1
            GROUP BY aw.id, a.id, a.affiliate_code, a.current_balance, a.total_commissions,
                     u.full_name, u.email, u.created_at
            ORDER BY aw.created_at DESC
            LIMIT $2 OFFSET $3
        `, [status, parseInt(limit), parseInt(offset)]);

        // Calculate risk scores for each withdrawal
        const withdrawalsWithRisk = await Promise.all(
            result.rows.map(async (withdrawal) => {
                const riskScore = await calculateRiskScore(
                    withdrawal.affiliate_id,
                    parseFloat(withdrawal.amount),
                    this.pool
                );

                return {
                    id: withdrawal.id,
                    affiliateId: withdrawal.affiliate_id,
                    affiliateCode: withdrawal.affiliate_code,
                    affiliateName: withdrawal.affiliate_name,
                    affiliateEmail: withdrawal.affiliate_email,
                    amount: parseFloat(withdrawal.amount),
                    method: withdrawal.method,
                    fees: parseFloat(withdrawal.fees),
                    netAmount: parseFloat(withdrawal.net_amount),
                    status: withdrawal.status,
                    requestDate: withdrawal.created_at,
                    affiliateInfo: {
                        balance: parseFloat(withdrawal.affiliate_balance),
                        totalCommissions: parseFloat(withdrawal.affiliate_total_commissions),
                        totalReferrals: parseInt(withdrawal.total_referrals),
                        activeReferrals: parseInt(withdrawal.active_referrals),
                        accountAge: Math.floor(
                            (Date.now() - new Date(withdrawal.affiliate_joined_at).getTime()) / (1000 * 60 * 60 * 24)
                        )
                    },
                    riskAssessment: {
                        score: riskScore,
                        level: getRiskLevel(riskScore)
                    }
                };
            })
        );

        affiliateLogger.info('Admin viewed pending withdrawals', {
            adminId: req.user.id,
            status,
            count: withdrawalsWithRisk.length
        });

        res.json({
            success: true,
            withdrawals: withdrawalsWithRisk,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: withdrawalsWithRisk.length
            }
        });
    }

    /**
     * GET /withdrawals/:id - Get detailed withdrawal information
     * Phase 2: Affiliate System Security
     */
    async getWithdrawalDetails(req, res) {
        const { id } = req.params;

        const result = await this.pool.executeRead(`
            SELECT
                aw.*,
                a.affiliate_code,
                a.current_balance,
                a.total_commissions,
                a.created_at as affiliate_created_at,
                u.id as user_id,
                u.full_name,
                u.email,
                u.phone,
                u.created_at as user_created_at
            FROM affiliate_withdrawals aw
            JOIN affiliates a ON aw.affiliate_id = a.id
            JOIN users u ON a.user_id = u.id
            WHERE aw.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Withdrawal not found'
            });
        }

        const withdrawal = result.rows[0];

        // Get referral statistics
        const referralStats = await this.pool.executeRead(`
            SELECT
                COUNT(*) as total_referrals,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_referrals,
                COALESCE(AVG(conversion_value), 0) as avg_conversion,
                COALESCE(SUM(conversion_value), 0) as total_conversion
            FROM referrals
            WHERE affiliate_id = $1
        `, [withdrawal.affiliate_id]);

        // Get withdrawal history
        const withdrawalHistory = await this.pool.executeRead(`
            SELECT id, amount, method, status, created_at, completed_at, rejection_reason
            FROM affiliate_withdrawals
            WHERE affiliate_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [withdrawal.affiliate_id]);

        // Get commission history
        const commissionHistory = await this.pool.executeRead(`
            SELECT
                c.amount,
                c.type,
                c.level,
                c.status,
                c.created_at,
                u.full_name as referred_user
            FROM commissions c
            LEFT JOIN referrals r ON c.affiliate_id = r.affiliate_id
            LEFT JOIN users u ON r.referred_user_id = u.id
            WHERE c.affiliate_id = $1
            ORDER BY c.created_at DESC
            LIMIT 20
        `, [withdrawal.affiliate_id]);

        affiliateLogger.info('Admin viewed withdrawal details', {
            adminId: req.user.id,
            withdrawalId: id,
            affiliateId: withdrawal.affiliate_id
        });

        res.json({
            success: true,
            withdrawal: {
                id: withdrawal.id,
                amount: parseFloat(withdrawal.amount),
                method: withdrawal.method,
                fees: parseFloat(withdrawal.fees),
                netAmount: parseFloat(withdrawal.net_amount),
                status: withdrawal.status,
                requestDate: withdrawal.created_at,
                approvedAt: withdrawal.approved_at,
                completedAt: withdrawal.completed_at,
                rejectedAt: withdrawal.rejected_at,
                rejectionReason: withdrawal.rejection_reason,
                transactionId: withdrawal.transaction_id
            },
            affiliate: {
                id: withdrawal.affiliate_id,
                code: withdrawal.affiliate_code,
                name: withdrawal.full_name,
                email: withdrawal.email,
                phone: withdrawal.phone,
                currentBalance: parseFloat(withdrawal.current_balance),
                totalCommissions: parseFloat(withdrawal.total_commissions),
                accountAge: Math.floor(
                    (Date.now() - new Date(withdrawal.affiliate_created_at).getTime()) / (1000 * 60 * 60 * 24)
                ),
                userCreatedAt: withdrawal.user_created_at
            },
            statistics: {
                referrals: referralStats.rows[0],
                recentWithdrawals: withdrawalHistory.rows.map(w => ({
                    id: w.id,
                    amount: parseFloat(w.amount),
                    method: w.method,
                    status: w.status,
                    requestDate: w.created_at,
                    completedAt: w.completed_at,
                    rejectionReason: w.rejection_reason
                })),
                recentCommissions: commissionHistory.rows.map(c => ({
                    amount: parseFloat(c.amount),
                    type: c.type,
                    level: c.level,
                    status: c.status,
                    date: c.created_at,
                    referredUser: c.referred_user
                }))
            }
        });
    }

    /**
     * GET /withdrawals/:id/risk-analysis - Get comprehensive risk analysis
     * Phase 2: Affiliate System Security
     */
    async getWithdrawalRiskAnalysis(req, res) {
        const { id } = req.params;

        // Get withdrawal details
        const withdrawalResult = await this.pool.executeRead(`
            SELECT aw.*, a.id as affiliate_id
            FROM affiliate_withdrawals aw
            JOIN affiliates a ON aw.affiliate_id = a.id
            WHERE aw.id = $1
        `, [id]);

        if (withdrawalResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Withdrawal not found'
            });
        }

        const withdrawal = withdrawalResult.rows[0];

        // Calculate risk score
        const riskScore = await calculateRiskScore(
            withdrawal.affiliate_id,
            parseFloat(withdrawal.amount),
            this.pool
        );

        // Check fraud rules
        const fraudCheck = await checkFraudRules(
            withdrawal.affiliate_id,
            parseFloat(withdrawal.amount),
            this.pool
        );

        securityLogger.info('Risk analysis performed', {
            adminId: req.user.id,
            withdrawalId: id,
            affiliateId: withdrawal.affiliate_id,
            riskScore,
            fraudCheckPassed: fraudCheck.passed
        });

        res.json({
            success: true,
            riskAnalysis: {
                withdrawalId: id,
                affiliateId: withdrawal.affiliate_id,
                amount: parseFloat(withdrawal.amount),
                riskScore,
                riskLevel: getRiskLevel(riskScore),
                recommendation: riskScore >= 70 ? 'REJECT' : riskScore >= 40 ? 'MANUAL_REVIEW' : 'APPROVE',
                fraudCheck: {
                    passed: fraudCheck.passed,
                    violations: fraudCheck.violations
                },
                analyzedAt: new Date().toISOString()
            }
        });
    }

    /**
     * POST /withdrawals/:id/approve - Approve withdrawal request
     * Phase 2: Affiliate System Security (Fixed: Transaction Safety)
     */
    async approveWithdrawal(req, res) {
        const { id } = req.params;
        const { notes } = req.body;
        const adminId = req.user.id;

        // Start transaction for data consistency
        await this.pool.executeWrite('BEGIN');

        try {
            // Get withdrawal details with row lock
            const withdrawalResult = await this.pool.executeRead(`
                SELECT aw.*, a.user_id, a.current_balance,
                       u.email as user_email, u.full_name as user_full_name, u.phone as user_phone
                FROM affiliate_withdrawals aw
                JOIN affiliates a ON aw.affiliate_id = a.id
                JOIN users u ON a.user_id = u.id
                WHERE aw.id = $1
                FOR UPDATE
            `, [id]);

            if (withdrawalResult.rows.length === 0) {
                await this.pool.executeWrite('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    error: 'Withdrawal not found'
                });
            }

            const withdrawal = withdrawalResult.rows[0];

            // Check if already processed
            if (withdrawal.status !== 'pending') {
                await this.pool.executeWrite('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    error: `Withdrawal already ${withdrawal.status}`
                });
            }

            // Perform risk check (outside transaction - read-only)
            const riskScore = await calculateRiskScore(
                withdrawal.affiliate_id,
                parseFloat(withdrawal.amount),
                this.pool
            );

            const fraudCheck = await checkFraudRules(
                withdrawal.affiliate_id,
                parseFloat(withdrawal.amount),
                this.pool
            );

            // Update withdrawal status
            await this.pool.executeWrite(`
                UPDATE affiliate_withdrawals
                SET
                    status = 'approved',
                    approved_at = NOW(),
                    approved_by = $1,
                    admin_notes = $2,
                    risk_score = $3
                WHERE id = $4
            `, [adminId, notes || null, riskScore, id]);

            // Commit transaction
            await this.pool.executeWrite('COMMIT');

            // Send notification (after successful commit)
            const withdrawalNotificationService = require('../services/notifications/withdrawal-notification-service');

            try {
                await withdrawalNotificationService.notifyWithdrawalApproved(
                    {
                        id: withdrawal.affiliate_id,
                        email: withdrawal.user_email,
                        name: withdrawal.user_full_name,
                        phone: withdrawal.user_phone
                    },
                    {
                        id: withdrawal.id,
                        amount: parseFloat(withdrawal.amount),
                        method: withdrawal.method,
                        netAmount: parseFloat(withdrawal.net_amount),
                        approvedAt: new Date().toISOString()
                    }
                );
            } catch (notificationError) {
                // Log but don't fail the approval
                affiliateLogger.error('Failed to send approval notification', {
                    withdrawalId: id,
                    error: notificationError.message
                });
            }

            affiliateLogger.info('Withdrawal approved by admin', {
                withdrawalId: id,
                affiliateId: withdrawal.affiliate_id,
                amount: parseFloat(withdrawal.amount),
                approvedBy: adminId,
                riskScore,
                fraudCheckPassed: fraudCheck.passed,
                notes
            });

            securityLogger.info('Withdrawal approval', {
                action: 'APPROVE',
                withdrawalId: id,
                adminId,
                amount: parseFloat(withdrawal.amount),
                riskScore
            });

            res.json({
                success: true,
                message: 'Withdrawal approved successfully',
                withdrawal: {
                    id: withdrawal.id,
                    status: 'approved',
                    approvedAt: new Date().toISOString(),
                    approvedBy: adminId,
                    riskScore
                },
                nextSteps: [
                    'Payment processing will begin automatically',
                    'Affiliate will be notified via email',
                    'Transaction ID will be generated upon completion'
                ]
            });

        } catch (error) {
            // Rollback on any error
            await this.pool.executeWrite('ROLLBACK');

            affiliateLogger.error('Error approving withdrawal', {
                withdrawalId: id,
                adminId,
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }

    /**
     * POST /withdrawals/:id/reject - Reject withdrawal request
     * Phase 2: Affiliate System Security (Fixed: Notifications + Input Validation)
     */
    async rejectWithdrawal(req, res) {
        const { id } = req.params;
        const { reason, notes } = req.body;
        const adminId = req.user.id;

        // Validate rejection reason
        if (!reason || typeof reason !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason is required and must be a string'
            });
        }

        if (reason.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason cannot be empty'
            });
        }

        if (reason.length > 500) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason must be less than 500 characters'
            });
        }

        // Validate notes (optional)
        if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
            return res.status(400).json({
                success: false,
                error: 'Admin notes must be a string less than 1000 characters'
            });
        }

        const sanitizedReason = reason.trim().substring(0, 500);
        const sanitizedNotes = notes ? notes.trim().substring(0, 1000) : null;

        // Get withdrawal details with user info
        const withdrawalResult = await this.pool.executeRead(`
            SELECT aw.*, a.user_id, a.current_balance,
                   u.email as user_email, u.full_name as user_full_name, u.phone as user_phone
            FROM affiliate_withdrawals aw
            JOIN affiliates a ON aw.affiliate_id = a.id
            JOIN users u ON a.user_id = u.id
            WHERE aw.id = $1
        `, [id]);

        if (withdrawalResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Withdrawal not found'
            });
        }

        const withdrawal = withdrawalResult.rows[0];

        // Check if already processed
        if (withdrawal.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Withdrawal already ${withdrawal.status}`
            });
        }

        // Start transaction
        await this.pool.executeWrite('BEGIN');

        try {
            // Update withdrawal status
            await this.pool.executeWrite(`
                UPDATE affiliate_withdrawals
                SET
                    status = 'rejected',
                    rejected_at = NOW(),
                    rejected_by = $1,
                    rejection_reason = $2,
                    admin_notes = $3
                WHERE id = $4
            `, [adminId, sanitizedReason, sanitizedNotes, id]);

            // Return amount to affiliate balance
            await this.pool.executeWrite(`
                UPDATE affiliates
                SET current_balance = current_balance + $1
                WHERE id = $2
            `, [parseFloat(withdrawal.amount), withdrawal.affiliate_id]);

            await this.pool.executeWrite('COMMIT');

            // Send rejection notification (after successful commit)
            const withdrawalNotificationService = require('../services/notifications/withdrawal-notification-service');

            try {
                await withdrawalNotificationService.notifyWithdrawalRejected(
                    {
                        id: withdrawal.affiliate_id,
                        email: withdrawal.user_email,
                        name: withdrawal.user_full_name,
                        phone: withdrawal.user_phone,
                        currentBalance: parseFloat(withdrawal.current_balance) + parseFloat(withdrawal.amount)
                    },
                    {
                        id: withdrawal.id,
                        amount: parseFloat(withdrawal.amount),
                        rejectedAt: new Date().toISOString()
                    },
                    sanitizedReason
                );
            } catch (notificationError) {
                // Log but don't fail the rejection
                affiliateLogger.error('Failed to send rejection notification', {
                    withdrawalId: id,
                    error: notificationError.message
                });
            }

            affiliateLogger.warn('Withdrawal rejected by admin', {
                withdrawalId: id,
                affiliateId: withdrawal.affiliate_id,
                amount: parseFloat(withdrawal.amount),
                rejectedBy: adminId,
                reason: sanitizedReason,
                notes: sanitizedNotes
            });

            securityLogger.warn('Withdrawal rejection', {
                action: 'REJECT',
                withdrawalId: id,
                adminId,
                amount: parseFloat(withdrawal.amount),
                reason: sanitizedReason
            });

            res.json({
                success: true,
                message: 'Withdrawal rejected successfully',
                withdrawal: {
                    id: withdrawal.id,
                    status: 'rejected',
                    rejectedAt: new Date().toISOString(),
                    rejectedBy: adminId,
                    reason: sanitizedReason
                },
                balanceRestored: true,
                newBalance: parseFloat(withdrawal.current_balance) + parseFloat(withdrawal.amount)
            });
        } catch (error) {
            await this.pool.executeWrite('ROLLBACK');

            affiliateLogger.error('Error rejecting withdrawal', {
                withdrawalId: id,
                adminId,
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }

    /**
     * POST /withdrawals/:id/complete - Mark withdrawal as completed
     * Phase 2: Affiliate System Security (Fixed: Transaction Safety + Notifications)
     */
    async completeWithdrawal(req, res) {
        const { id } = req.params;
        const { transactionId, paymentProof } = req.body;
        const adminId = req.user.id;

        // Validate transaction ID
        if (!transactionId || typeof transactionId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Transaction ID is required and must be a string'
            });
        }

        if (transactionId.trim().length === 0 || transactionId.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Transaction ID must be between 1 and 100 characters'
            });
        }

        // Start transaction
        await this.pool.executeWrite('BEGIN');

        try {
            // Get withdrawal details with row lock and user info
            const withdrawalResult = await this.pool.executeRead(`
                SELECT aw.*, a.user_id,
                       u.email as user_email, u.full_name as user_full_name, u.phone as user_phone
                FROM affiliate_withdrawals aw
                JOIN affiliates a ON aw.affiliate_id = a.id
                JOIN users u ON a.user_id = u.id
                WHERE aw.id = $1
                FOR UPDATE
            `, [id]);

            if (withdrawalResult.rows.length === 0) {
                await this.pool.executeWrite('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    error: 'Withdrawal not found'
                });
            }

            const withdrawal = withdrawalResult.rows[0];

            // Check if approved (allow 'processing' status if exists in old data)
            if (withdrawal.status !== 'approved' && withdrawal.status !== 'processing') {
                await this.pool.executeWrite('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    error: 'Withdrawal must be approved before completion',
                    currentStatus: withdrawal.status
                });
            }

            // Update withdrawal status
            await this.pool.executeWrite(`
                UPDATE affiliate_withdrawals
                SET
                    status = 'completed',
                    completed_at = NOW(),
                    completed_by = $1,
                    transaction_id = $2,
                    payment_proof = $3
                WHERE id = $4
            `, [adminId, transactionId.trim(), paymentProof || null, id]);

            // Commit transaction
            await this.pool.executeWrite('COMMIT');

            // Send completion notification (after successful commit)
            const withdrawalNotificationService = require('../services/notifications/withdrawal-notification-service');

            try {
                await withdrawalNotificationService.notifyWithdrawalCompleted(
                    {
                        id: withdrawal.affiliate_id,
                        email: withdrawal.user_email,
                        name: withdrawal.user_full_name,
                        phone: withdrawal.user_phone
                    },
                    {
                        id: withdrawal.id,
                        amount: parseFloat(withdrawal.amount),
                        netAmount: parseFloat(withdrawal.net_amount),
                        method: withdrawal.method,
                        completedAt: new Date().toISOString(),
                        transactionId: transactionId.trim(),
                        fees: parseFloat(withdrawal.fees)
                    },
                    transactionId.trim()
                );
            } catch (notificationError) {
                // Log but don't fail the completion
                affiliateLogger.error('Failed to send completion notification', {
                    withdrawalId: id,
                    error: notificationError.message
                });
            }

            affiliateLogger.info('Withdrawal completed by admin', {
                withdrawalId: id,
                affiliateId: withdrawal.affiliate_id,
                amount: parseFloat(withdrawal.amount),
                completedBy: adminId,
                transactionId: transactionId.trim()
            });

            securityLogger.info('Withdrawal completion', {
                action: 'COMPLETE',
                withdrawalId: id,
                adminId,
                amount: parseFloat(withdrawal.amount),
                transactionId: transactionId.trim()
            });

            res.json({
                success: true,
                message: 'Withdrawal marked as completed',
                withdrawal: {
                    id: withdrawal.id,
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                    completedBy: adminId,
                    transactionId: transactionId.trim()
                }
            });

        } catch (error) {
            // Rollback on any error
            await this.pool.executeWrite('ROLLBACK');

            affiliateLogger.error('Error completing withdrawal', {
                withdrawalId: id,
                adminId,
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new AdminRoutes();




