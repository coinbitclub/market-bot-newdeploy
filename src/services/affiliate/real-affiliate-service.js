/**
 * 🤝 REAL AFFILIATE SERVICE - COINBITCLUB ENTERPRISE
 * PostgreSQL-based affiliate system
 */

const crypto = require('crypto');

class RealAffiliateService {
    constructor() {
        this.pool = null;
        this.config = {
            commissionRates: {
                tier1: 0.015, // 1.5%
                tier2: 0.025, // 2.5%
                tier3: 0.05,  // 5%
                tier4: 0.075  // 7.5%
            },
            bonusThresholds: {
                bronze: { referrals: 10, bonus: 100 },
                silver: { referrals: 25, bonus: 500 },
                gold: { referrals: 50, bonus: 1000 },
                diamond: { referrals: 100, bonus: 5000 }
            },
            minimumWithdrawal: 50
        };
    }

    /**
     * Set database pool manager
     */
    setDbPoolManager(dbPoolManager) {
        this.pool = dbPoolManager;
        console.log('✅ RealAffiliateService: Database connection configured');
    }

    /**
     * Generate unique affiliate code
     */
    generateAffiliateCode() {
        const prefix = 'CBC';
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `${prefix}${random}`;
    }

    /**
     * Register user as affiliate
     */
    async registerAffiliate(userId) {
        try {
            // Check if already registered
            const existing = await this.pool.executeRead(
                'SELECT id FROM affiliates WHERE user_id = $1',
                [userId]
            );

            if (existing.rows.length > 0) {
                return {
                    success: false,
                    error: 'User is already an affiliate',
                    affiliateId: existing.rows[0].id
                };
            }

            // Generate unique code
            let affiliateCode;
            let unique = false;
            while (!unique) {
                affiliateCode = this.generateAffiliateCode();
                const check = await this.pool.executeRead(
                    'SELECT id FROM affiliates WHERE affiliate_code = $1',
                    [affiliateCode]
                );
                unique = check.rows.length === 0;
            }

            // Create affiliate
            const result = await this.pool.executeWrite(
                `INSERT INTO affiliates (
                    user_id, affiliate_code, tier, status, commission_rate
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING id, affiliate_code, commission_rate`,
                [userId, affiliateCode, 'tier1', 'active', this.config.commissionRates.tier1]
            );

            // Create default affiliate link using FRONTEND_URL from environment
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3003';
            await this.createAffiliateLink(result.rows[0].id, affiliateCode, 'default', frontendUrl);

            return {
                success: true,
                affiliateId: result.rows[0].id,
                affiliateCode: result.rows[0].affiliate_code,
                commissionRate: parseFloat(result.rows[0].commission_rate)
            };

        } catch (error) {
            console.error('Error registering affiliate:', error);
            throw error;
        }
    }

    /**
     * Get affiliate by user ID
     */
    async getAffiliateByUserId(userId) {
        try {
            const result = await this.pool.executeRead(
                `SELECT * FROM affiliates WHERE user_id = $1`,
                [userId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error getting affiliate:', error);
            throw error;
        }
    }

    /**
     * Get affiliate by code
     */
    async getAffiliateByCode(code) {
        try {
            const result = await this.pool.executeRead(
                `SELECT * FROM affiliates WHERE affiliate_code = $1`,
                [code]
            );

            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error getting affiliate by code:', error);
            throw error;
        }
    }

    /**
     * Create affiliate link
     */
    async createAffiliateLink(affiliateId, affiliateCode, campaign, baseUrl) {
        try {
            const linkCode = `${affiliateCode}_${campaign}_${Date.now()}`;
            const url = `${baseUrl}?ref=${affiliateCode}&campaign=${campaign}`;

            const result = await this.pool.executeWrite(
                `INSERT INTO affiliate_links (
                    affiliate_id, link_code, campaign_id, url
                ) VALUES ($1, $2, $3, $4)
                RETURNING *`,
                [affiliateId, linkCode, campaign, url]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Error creating affiliate link:', error);
            throw error;
        }
    }

    /**
     * Track click on affiliate link
     */
    async trackClick(affiliateCode, metadata = {}) {
        try {
            const affiliate = await this.getAffiliateByCode(affiliateCode);
            if (!affiliate) return { success: false, error: 'Invalid affiliate code' };

            // Get link for this affiliate and campaign
            const linkResult = await this.pool.executeRead(
                `SELECT id FROM affiliate_links
                 WHERE affiliate_id = $1 AND campaign_id = $2
                 ORDER BY created_at DESC LIMIT 1`,
                [affiliate.id, metadata.campaign || 'default']
            );

            if (linkResult.rows.length === 0) return { success: false };

            const linkId = linkResult.rows[0].id;

            // Record click
            await this.pool.executeWrite(
                `INSERT INTO affiliate_clicks (
                    link_id, affiliate_id, ip_address, user_agent, referrer
                ) VALUES ($1, $2, $3, $4, $5)`,
                [linkId, affiliate.id, metadata.ip, metadata.userAgent, metadata.referrer]
            );

            // Update click count
            await this.pool.executeWrite(
                `UPDATE affiliate_links SET clicks = clicks + 1 WHERE id = $1`,
                [linkId]
            );

            return { success: true, affiliateId: affiliate.id };

        } catch (error) {
            console.error('Error tracking click:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Track conversion (user signup via affiliate link)
     */
    async trackConversion(affiliateCode, userId, amount = 0) {
        try {
            const affiliate = await this.getAffiliateByCode(affiliateCode);
            if (!affiliate) return { success: false };

            // Create referral record
            const referralResult = await this.pool.executeWrite(
                `INSERT INTO referrals (
                    affiliate_id, referred_user_id, status, converted_at, conversion_value
                ) VALUES ($1, $2, $3, NOW(), $4)
                ON CONFLICT (affiliate_id, referred_user_id) DO NOTHING
                RETURNING id`,
                [affiliate.id, userId, 'active', amount]
            );

            if (referralResult.rows.length === 0) {
                return { success: false, error: 'Referral already exists' };
            }

            // Update affiliate stats
            await this.pool.executeWrite(
                `UPDATE affiliates
                 SET total_referrals = total_referrals + 1,
                     active_referrals = active_referrals + 1,
                     last_activity_at = NOW()
                 WHERE id = $1`,
                [affiliate.id]
            );

            // Calculate and create signup commission
            const commissionAmount = amount * parseFloat(affiliate.commission_rate);
            if (commissionAmount > 0) {
                await this.createCommission(
                    affiliate.id,
                    referralResult.rows[0].id,
                    commissionAmount,
                    'signup',
                    'Signup bonus commission'
                );
            }

            // Check for tier bonus
            await this.checkAndAwardBonus(affiliate.id);

            return { success: true, referralId: referralResult.rows[0].id };

        } catch (error) {
            console.error('Error tracking conversion:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create commission
     */
    async createCommission(affiliateId, referralId, amount, type, description) {
        try {
            const result = await this.pool.executeWrite(
                `INSERT INTO commissions (
                    affiliate_id, referral_id, amount, type, status, description
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [affiliateId, referralId, amount, type, 'pending', description]
            );

            // Update affiliate balance
            await this.pool.executeWrite(
                `UPDATE affiliates
                 SET total_earnings = total_earnings + $1,
                     current_balance = current_balance + $1
                 WHERE id = $2`,
                [amount, affiliateId]
            );

            return result.rows[0];

        } catch (error) {
            console.error('Error creating commission:', error);
            throw error;
        }
    }

    /**
     * Calculate trading commission
     */
    async calculateTradingCommission(userId, tradingAmount) {
        try {
            // Find if user was referred
            const referralResult = await this.pool.executeRead(
                `SELECT r.*, a.commission_rate
                 FROM referrals r
                 JOIN affiliates a ON r.affiliate_id = a.id
                 WHERE r.referred_user_id = $1 AND r.status = 'active'
                 LIMIT 1`,
                [userId]
            );

            if (referralResult.rows.length === 0) return null;

            const referral = referralResult.rows[0];
            const commission = tradingAmount * parseFloat(referral.commission_rate);

            // Create commission
            await this.createCommission(
                referral.affiliate_id,
                referral.id,
                commission,
                'trading',
                `Trading commission from user ${userId}`
            );

            return { affiliateId: referral.affiliate_id, commission };

        } catch (error) {
            console.error('Error calculating trading commission:', error);
            return null;
        }
    }

    /**
     * Get affiliate statistics
     */
    async getStats(userId) {
        try {
            const affiliate = await this.getAffiliateByUserId(userId);
            if (!affiliate) {
                return {
                    totalReferrals: 0,
                    activeReferrals: 0,
                    totalCommissions: 0,
                    monthlyCommissions: 0,
                    commissionRate: this.config.commissionRates.tier1
                };
            }

            // Get monthly commissions
            const monthlyResult = await this.pool.executeRead(
                `SELECT COALESCE(SUM(amount), 0) as monthly_total
                 FROM commissions
                 WHERE affiliate_id = $1
                 AND created_at >= NOW() - INTERVAL '30 days'`,
                [affiliate.id]
            );

            return {
                totalReferrals: affiliate.total_referrals,
                activeReferrals: affiliate.active_referrals,
                totalCommissions: parseFloat(affiliate.total_earnings),
                monthlyCommissions: parseFloat(monthlyResult.rows[0].monthly_total),
                commissionRate: parseFloat(affiliate.commission_rate),
                currentBalance: parseFloat(affiliate.current_balance),
                tier: affiliate.tier,
                affiliateCode: affiliate.affiliate_code
            };

        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }

    /**
     * Get referrals list
     */
    async getReferrals(userId, limit = 50) {
        try {
            const affiliate = await this.getAffiliateByUserId(userId);
            if (!affiliate) return [];

            const result = await this.pool.executeRead(
                `SELECT r.*, u.name, u.email
                 FROM referrals r
                 LEFT JOIN users u ON r.referred_user_id = u.id
                 WHERE r.affiliate_id = $1
                 ORDER BY r.referred_at DESC
                 LIMIT $2`,
                [affiliate.id, limit]
            );

            return result.rows.map(row => ({
                id: row.id,
                userId: row.referred_user_id,
                name: row.name,
                email: row.email,
                status: row.status,
                referredAt: row.referred_at,
                convertedAt: row.converted_at,
                conversionValue: parseFloat(row.conversion_value || 0)
            }));

        } catch (error) {
            console.error('Error getting referrals:', error);
            return [];
        }
    }

    /**
     * Get commission history
     */
    async getCommissions(userId, limit = 100) {
        try {
            const affiliate = await this.getAffiliateByUserId(userId);
            if (!affiliate) return [];

            const result = await this.pool.executeRead(
                `SELECT * FROM commissions
                 WHERE affiliate_id = $1
                 ORDER BY created_at DESC
                 LIMIT $2`,
                [affiliate.id, limit]
            );

            return result.rows.map(row => ({
                id: row.id,
                amount: parseFloat(row.amount),
                type: row.type,
                status: row.status,
                description: row.description,
                createdAt: row.created_at,
                paidAt: row.paid_at
            }));

        } catch (error) {
            console.error('Error getting commissions:', error);
            return [];
        }
    }

    /**
     * Get affiliate links
     */
    async getAffiliateLinks(userId) {
        try {
            const affiliate = await this.getAffiliateByUserId(userId);
            if (!affiliate) return [];

            const result = await this.pool.executeRead(
                `SELECT * FROM affiliate_links
                 WHERE affiliate_id = $1 AND active = true
                 ORDER BY created_at DESC`,
                [affiliate.id]
            );

            return result.rows.map(row => ({
                id: row.id,
                code: affiliate.affiliate_code,
                url: row.url,
                campaign: row.campaign_id,
                clicks: row.clicks,
                conversions: row.conversions,
                createdAt: row.created_at
            }));

        } catch (error) {
            console.error('Error getting links:', error);
            return [];
        }
    }

    /**
     * Check and award tier bonus
     */
    async checkAndAwardBonus(affiliateId) {
        try {
            const affiliate = await this.pool.executeRead(
                'SELECT * FROM affiliates WHERE id = $1',
                [affiliateId]
            );

            if (affiliate.rows.length === 0) return;

            const totalRefs = affiliate.rows[0].total_referrals;

            // Check each threshold
            for (const [tier, config] of Object.entries(this.config.bonusThresholds)) {
                if (totalRefs === config.referrals) {
                    await this.createCommission(
                        affiliateId,
                        null,
                        config.bonus,
                        'bonus',
                        `${tier.toUpperCase()} tier bonus - ${config.referrals} referrals`
                    );
                    console.log(`✨ Bonus awarded: ${tier} tier ($${config.bonus}) to affiliate ${affiliateId}`);
                }
            }

        } catch (error) {
            console.error('Error checking bonus:', error);
        }
    }
}

module.exports = RealAffiliateService;
