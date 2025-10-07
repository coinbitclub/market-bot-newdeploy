/**
 * 🤝 AFFILIATE ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * Affiliate system with 7-level hierarchy
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');
const RealAffiliateService = require('../services/affiliate/real-affiliate-service');

class AffiliateRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.affiliateService = new RealAffiliateService();
        this.pool = null;
        this.setupRoutes();
    }

    /**
     * Set database pool manager
     */
    setDbPoolManager(dbPoolManager) {
        this.pool = dbPoolManager;
        this.affiliateService.setDbPoolManager(dbPoolManager);
        console.log('✅ AffiliateRoutes: Database connection configured');
    }

    setupRoutes() {
        // Public routes (no authentication)
        this.router.post('/track-click', this.trackClick.bind(this));
        this.router.get('/validate/:code', this.validateAffiliateCode.bind(this));

        // Authenticated routes
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // Affiliate routes
        this.router.get('/stats', this.getStats.bind(this));
        this.router.get('/commissions', this.getCommissions.bind(this));
        this.router.get('/referrals', this.getReferrals.bind(this));
        this.router.post('/register', this.registerAffiliate.bind(this));
        this.router.get('/links', this.getAffiliateLinks.bind(this));
        this.router.get('/performance', this.getPerformance.bind(this));
        this.router.post('/create-link', this.createAffiliateLink.bind(this));

        // New endpoints
        this.router.get('/reports', this.getReports.bind(this));
        this.router.post('/withdraw', this.requestWithdrawal.bind(this));
        this.router.get('/withdrawals', this.getWithdrawals.bind(this));
        this.router.post('/convert-to-credit', this.convertToCredit.bind(this));
    }

    /**
     * GET /stats - Get affiliate statistics
     */
    async getStats(req, res) {
        try {
            const userId = req.user.id;
            const stats = await this.affiliateService.getStats(userId);

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            console.error('Error getting affiliate stats:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /commissions - Get commission history
     */
    async getCommissions(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 100;
            const commissions = await this.affiliateService.getCommissions(userId, limit);

            res.json({
                success: true,
                commissions
            });
        } catch (error) {
            console.error('Error getting commissions:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /referrals - Get referral list
     */
    async getReferrals(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;
            const referrals = await this.affiliateService.getReferrals(userId, limit);

            res.json({
                success: true,
                referrals
            });
        } catch (error) {
            console.error('Error getting referrals:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /register - Register as affiliate
     */
    async registerAffiliate(req, res) {
        try {
            const userId = req.user.id;
            const result = await this.affiliateService.registerAffiliate(userId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json({
                success: true,
                message: 'Affiliate registration successful',
                affiliateId: result.affiliateId,
                affiliateCode: result.affiliateCode,
                commissionRate: result.commissionRate
            });
        } catch (error) {
            console.error('Error registering affiliate:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /links - Get affiliate links
     */
    async getAffiliateLinks(req, res) {
        try {
            const userId = req.user.id;
            const links = await this.affiliateService.getAffiliateLinks(userId);

            res.json({
                success: true,
                links
            });
        } catch (error) {
            console.error('Error getting affiliate links:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /performance - Get performance metrics
     */
    async getPerformance(req, res) {
        try {
            const userId = req.user.id;
            const stats = await this.affiliateService.getStats(userId);
            const links = await this.affiliateService.getAffiliateLinks(userId);
            const referrals = await this.affiliateService.getReferrals(userId, 100);

            // Calculate performance metrics
            const totalClicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0);
            const totalConversions = referrals.filter(r => r.status === 'active').length;
            const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100) : 0;

            const avgCommission = stats.totalReferrals > 0
                ? stats.totalCommissions / stats.totalReferrals
                : 0;

            // Find top referral by conversion value
            const topReferral = referrals.reduce((top, ref) => {
                if (!top || (ref.conversionValue > (top.conversionValue || 0))) {
                    return ref;
                }
                return top;
            }, null);

            res.json({
                success: true,
                performance: {
                    conversionRate: Math.round(conversionRate * 100) / 100,
                    averageCommission: Math.round(avgCommission * 100) / 100,
                    topReferral: topReferral ? {
                        userId: topReferral.userId,
                        name: topReferral.name,
                        conversionValue: topReferral.conversionValue
                    } : null
                }
            });
        } catch (error) {
            console.error('Error getting performance:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /track-click - Track affiliate link click (public)
     */
    async trackClick(req, res) {
        try {
            const { affiliateCode, campaign } = req.body;
            const metadata = {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent'],
                referrer: req.headers.referer || req.headers.referrer,
                campaign: campaign || 'default'
            };

            const result = await this.affiliateService.trackClick(affiliateCode, metadata);
            res.json(result);
        } catch (error) {
            console.error('Error tracking click:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /validate/:code - Validate affiliate code (public)
     */
    async validateAffiliateCode(req, res) {
        try {
            const { code } = req.params;
            const affiliate = await this.affiliateService.getAffiliateByCode(code);

            res.json({
                success: true,
                valid: affiliate !== null,
                code: code
            });
        } catch (error) {
            console.error('Error validating affiliate code:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /create-link - Create custom affiliate link
     */
    async createAffiliateLink(req, res) {
        try {
            const userId = req.user.id;
            const { campaign } = req.body;

            const affiliate = await this.affiliateService.getAffiliateByUserId(userId);
            if (!affiliate) {
                return res.status(404).json({
                    success: false,
                    error: 'User is not registered as affiliate'
                });
            }

            // Use FRONTEND_URL from environment variable
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3003';

            const link = await this.affiliateService.createAffiliateLink(
                affiliate.id,
                affiliate.affiliate_code,
                campaign || 'custom',
                frontendUrl
            );

            res.json({
                success: true,
                link
            });
        } catch (error) {
            console.error('Error creating affiliate link:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /reports - Get affiliate reports and analytics
     */
    async getReports(req, res) {
        try {
            const userId = req.user.id;
            const { period = 'month' } = req.query;

            const affiliate = await this.affiliateService.getAffiliateByUserId(userId);
            if (!affiliate) {
                return res.status(404).json({
                    success: false,
                    error: 'User is not registered as affiliate'
                });
            }

            // Calculate date range based on period
            let dateFilter = "created_at >= NOW() - INTERVAL '1 month'";
            if (period === 'week') dateFilter = "created_at >= NOW() - INTERVAL '1 week'";
            if (period === 'quarter') dateFilter = "created_at >= NOW() - INTERVAL '3 months'";
            if (period === 'year') dateFilter = "created_at >= NOW() - INTERVAL '1 year'";

            // Get monthly performance data
            const monthlyStats = await this.pool.executeRead(`
                SELECT
                    TO_CHAR(DATE_TRUNC('month', c.created_at), 'Mon') as month,
                    COUNT(DISTINCT r.id) as referrals,
                    COALESCE(SUM(c.amount), 0) as commissions,
                    COUNT(DISTINCT CASE WHEN r.status = 'active' THEN r.id END) as conversions,
                    COALESCE(SUM(r.conversion_value), 0) as revenue
                FROM commissions c
                LEFT JOIN referrals r ON c.affiliate_id = r.affiliate_id
                WHERE c.affiliate_id = $1 AND c.created_at >= NOW() - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', c.created_at), month
                ORDER BY DATE_TRUNC('month', c.created_at) ASC
                LIMIT 6
            `, [affiliate.id]);

            // Get top referrals by commission
            const topReferrals = await this.pool.executeRead(`
                SELECT
                    r.id,
                    u.full_name as name,
                    u.email,
                    COALESCE(SUM(c.amount), 0) as total_commissions,
                    COUNT(DISTINCT c.id) as total_trades,
                    r.referred_at as join_date,
                    CASE
                        WHEN COUNT(c.id) > 0 THEN
                            (COUNT(CASE WHEN c.status = 'paid' THEN 1 END)::float / COUNT(c.id) * 100)
                        ELSE 0
                    END as success_rate
                FROM referrals r
                JOIN users u ON r.referred_user_id = u.id
                LEFT JOIN commissions c ON c.affiliate_id = r.affiliate_id
                WHERE r.affiliate_id = $1
                GROUP BY r.id, u.full_name, u.email, r.referred_at
                ORDER BY total_commissions DESC
                LIMIT 5
            `, [affiliate.id]);

            // Get click and conversion funnel data
            const funnelData = await this.pool.executeRead(`
                SELECT
                    COUNT(DISTINCT ac.id) as total_clicks,
                    COUNT(DISTINCT ac.ip) as unique_visitors,
                    COUNT(DISTINCT r.id) as signups,
                    COUNT(DISTINCT CASE WHEN r.conversion_value > 0 THEN r.id END) as deposits,
                    COUNT(DISTINCT CASE WHEN r.status = 'active' THEN r.id END) as active_traders
                FROM affiliate_links al
                LEFT JOIN affiliate_clicks ac ON al.id = ac.link_id
                LEFT JOIN referrals r ON r.affiliate_id = al.affiliate_id
                WHERE al.affiliate_id = $1
            `, [affiliate.id]);

            res.json({
                success: true,
                monthlyStats: monthlyStats.rows,
                topReferrals: topReferrals.rows,
                performanceMetrics: {
                    totalClicks: parseInt(funnelData.rows[0]?.total_clicks || 0),
                    uniqueVisitors: parseInt(funnelData.rows[0]?.unique_visitors || 0),
                    signupConversions: parseInt(funnelData.rows[0]?.signups || 0),
                    tradingConversions: parseInt(funnelData.rows[0]?.active_traders || 0)
                },
                conversionFunnel: {
                    clicks: parseInt(funnelData.rows[0]?.total_clicks || 0),
                    visitors: parseInt(funnelData.rows[0]?.unique_visitors || 0),
                    signups: parseInt(funnelData.rows[0]?.signups || 0),
                    deposits: parseInt(funnelData.rows[0]?.deposits || 0),
                    activeTraders: parseInt(funnelData.rows[0]?.active_traders || 0)
                }
            });
        } catch (error) {
            console.error('Error getting affiliate reports:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /withdraw - Request withdrawal with fraud detection
     * Phase 2: Enhanced with risk scoring and auto-approval
     */
    async requestWithdrawal(req, res) {
        try {
            const userId = req.user.id;
            const { amount, method } = req.body;

            // Validate
            if (!amount || amount < 50) {
                return res.status(400).json({
                    success: false,
                    error: 'Minimum withdrawal is $50'
                });
            }

            if (!['PIX', 'BANK_TRANSFER'].includes(method)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid withdrawal method. Use PIX or BANK_TRANSFER'
                });
            }

            const affiliate = await this.affiliateService.getAffiliateByUserId(userId);
            if (!affiliate) {
                return res.status(404).json({
                    success: false,
                    error: 'User is not registered as affiliate'
                });
            }

            // Check balance
            const currentBalance = parseFloat(affiliate.current_balance);
            if (amount > currentBalance) {
                return res.status(400).json({
                    success: false,
                    error: `Insufficient balance. Available: $${currentBalance.toFixed(2)}`
                });
            }

            // Import fraud detection functions
            const { calculateRiskScore, checkFraudRules, getRiskLevel } = require('../middleware/admin-withdrawal-approval');

            // Run fraud detection
            const fraudCheck = await checkFraudRules(affiliate.id, amount, this.pool);

            if (!fraudCheck.passed) {
                const { affiliateLogger } = require('../config/winston.config');
                affiliateLogger.warn('Withdrawal request blocked by fraud detection', {
                    userId,
                    affiliateId: affiliate.id,
                    amount,
                    violations: fraudCheck.violations
                });

                return res.status(400).json({
                    success: false,
                    error: 'Withdrawal request cannot be processed',
                    violations: fraudCheck.violations.map(v => v.message)
                });
            }

            // Calculate risk score
            const riskScore = await calculateRiskScore(affiliate.id, amount, this.pool);
            const riskLevel = getRiskLevel(riskScore);

            // Determine initial status based on risk
            let initialStatus = 'pending';
            let autoApproved = false;

            // Auto-approve low-risk withdrawals
            if (riskScore < 20 && method === 'PIX' && amount <= 1000) {
                initialStatus = 'approved';
                autoApproved = true;
            }

            // Calculate fees
            const feeRate = method === 'PIX' ? 0.005 : 0.01; // 0.5% for PIX, 1% for bank transfer
            const fees = amount * feeRate;
            const netAmount = amount - fees;

            // Start transaction for data consistency
            await this.pool.executeWrite('BEGIN');

            let result;
            try {
                // Create withdrawal request
                result = await this.pool.executeWrite(`
                    INSERT INTO affiliate_withdrawals (
                        affiliate_id, amount, method, fees, net_amount, status,
                        risk_score, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                    RETURNING *
                `, [affiliate.id, amount, method, fees, netAmount, initialStatus, riskScore]);

                // Reserve amount from balance
                await this.pool.executeWrite(`
                    UPDATE affiliates
                    SET current_balance = current_balance - $1
                    WHERE id = $2
                `, [amount, affiliate.id]);

                // Commit transaction
                await this.pool.executeWrite('COMMIT');

            } catch (dbError) {
                // Rollback on any error
                await this.pool.executeWrite('ROLLBACK');

                const { affiliateLogger } = require('../config/winston.config');
                affiliateLogger.error('Error creating withdrawal request', {
                    userId,
                    affiliateId: affiliate.id,
                    amount,
                    error: dbError.message
                });

                throw dbError;
            }

            const { affiliateLogger } = require('../config/winston.config');
            affiliateLogger.info('Withdrawal requested', {
                userId,
                affiliateId: affiliate.id,
                withdrawalId: result.rows[0].id,
                amount,
                method,
                riskScore,
                riskLevel,
                autoApproved,
                initialStatus
            });

            res.json({
                success: true,
                withdrawal: {
                    id: result.rows[0].id,
                    amount: parseFloat(result.rows[0].amount),
                    method: result.rows[0].method,
                    fees: parseFloat(result.rows[0].fees),
                    netAmount: parseFloat(result.rows[0].net_amount),
                    status: result.rows[0].status,
                    createdAt: result.rows[0].created_at,
                    riskAssessment: {
                        score: riskScore,
                        level: riskLevel
                    },
                    autoApproved
                },
                message: autoApproved
                    ? 'Your withdrawal has been auto-approved and will be processed shortly'
                    : 'Your withdrawal request is pending admin approval'
            });
        } catch (error) {
            console.error('Error requesting withdrawal:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET /withdrawals - Get withdrawal history
     */
    async getWithdrawals(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;

            const affiliate = await this.affiliateService.getAffiliateByUserId(userId);
            if (!affiliate) {
                return res.status(404).json({
                    success: false,
                    error: 'User is not registered as affiliate'
                });
            }

            const result = await this.pool.executeRead(`
                SELECT
                    id,
                    amount,
                    method,
                    fees,
                    net_amount,
                    status,
                    created_at,
                    approved_at,
                    completed_at,
                    rejected_at,
                    rejection_reason,
                    transaction_id
                FROM affiliate_withdrawals
                WHERE affiliate_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            `, [affiliate.id, limit]);

            res.json({
                success: true,
                withdrawals: result.rows.map(w => ({
                    id: w.id,
                    amount: parseFloat(w.amount),
                    method: w.method,
                    fees: parseFloat(w.fees),
                    netAmount: parseFloat(w.net_amount),
                    status: w.status,
                    requestDate: w.created_at,
                    approvedAt: w.approved_at,
                    completedAt: w.completed_at,
                    rejectedAt: w.rejected_at,
                    rejectionReason: w.rejection_reason,
                    transactionId: w.transaction_id
                }))
            });
        } catch (error) {
            console.error('Error getting withdrawals:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /convert-to-credit - Convert affiliate balance to trading credit
     */
    async convertToCredit(req, res) {
        try {
            const userId = req.user.id;
            const { amount } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid conversion amount'
                });
            }

            const affiliate = await this.affiliateService.getAffiliateByUserId(userId);
            if (!affiliate) {
                return res.status(404).json({
                    success: false,
                    error: 'User is not registered as affiliate'
                });
            }

            // Check balance
            const currentBalance = parseFloat(affiliate.current_balance);
            if (amount > currentBalance) {
                return res.status(400).json({
                    success: false,
                    error: `Insufficient balance. Available: $${currentBalance.toFixed(2)}`
                });
            }

            // Calculate bonus (10%)
            const bonusAmount = amount * 0.1;
            const totalCredit = amount + bonusAmount;

            // Start transaction
            await this.pool.executeWrite('BEGIN');

            try {
                // Deduct from affiliate balance
                await this.pool.executeWrite(`
                    UPDATE affiliates
                    SET current_balance = current_balance - $1
                    WHERE id = $2
                `, [amount, affiliate.id]);

                // Add to user trading balance
                await this.pool.executeWrite(`
                    UPDATE users
                    SET balance_real_usd = COALESCE(balance_real_usd, 0) + $1
                    WHERE id = $2
                `, [totalCredit, userId]);

                // Create transaction record
                await this.pool.executeWrite(`
                    INSERT INTO transactions (
                        user_id, type, amount, description, created_at
                    ) VALUES ($1, 'affiliate_conversion', $2, $3, NOW())
                `, [
                    userId,
                    totalCredit,
                    `Affiliate commission converted: $${amount.toFixed(2)} + $${bonusAmount.toFixed(2)} bonus (10%)`
                ]);

                await this.pool.executeWrite('COMMIT');

                console.log(`✅ Credit conversion: User ${userId}, $${amount} → $${totalCredit} (with 10% bonus)`);

                res.json({
                    success: true,
                    conversion: {
                        amount: amount,
                        bonus: bonusAmount,
                        total: totalCredit,
                        newAffiliateBalance: currentBalance - amount
                    }
                });
            } catch (error) {
                await this.pool.executeWrite('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error('Error converting to credit:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new AffiliateRoutes();




