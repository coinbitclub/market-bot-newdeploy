// 🤝 AFFILIATE CONTROLLER - ENTERPRISE MARKETBOT
// Controle de afiliação (1.5% / 5% comissões)

const db = require('../../../database/connection');

class AffiliateController {
    async getDashboard(req, res) {
        try {
            const { userId } = req.user;
            
            const stats = await db.query(`
                SELECT 
                    COUNT(referrals.id) as total_referrals,
                    COALESCE(SUM(commissions.amount), 0) as total_earnings,
                    affiliates.commission_rate,
                    affiliates.affiliate_code
                FROM affiliates
                LEFT JOIN users referrals ON referrals.referred_by = affiliates.id
                LEFT JOIN affiliate_commissions commissions ON commissions.affiliate_id = affiliates.id
                WHERE affiliates.user_id = $1
                GROUP BY affiliates.id
            `, [userId]);
            
            res.json(stats.rows[0] || {});
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async convertCommission(req, res) {
        try {
            const { userId } = req.user;
            const { amount, currency } = req.body;
            
            // Conversão com +10% bônus
            const bonusAmount = amount * 1.10;
            const balanceColumn = currency === 'BRL' ? 'saldo_admin_brl' : 'saldo_admin_usd';
            const commissionColumn = currency === 'BRL' ? 'saldo_comissao_brl' : 'saldo_comissao_usd';
            
            await db.query('BEGIN');
            
            // Debitar comissão
            await db.query(`
                UPDATE users 
                SET ${commissionColumn} = ${commissionColumn} - $1
                WHERE id = $2 AND ${commissionColumn} >= $1
            `, [amount, userId]);
            
            // Creditar com bônus
            await db.query(`
                UPDATE users 
                SET ${balanceColumn} = ${balanceColumn} + $1
                WHERE id = $2
            `, [bonusAmount, userId]);
            
            await db.query('COMMIT');
            
            res.json({ 
                success: true, 
                converted: amount, 
                received: bonusAmount,
                bonus: bonusAmount - amount 
            });
            
        } catch (error) {
            await db.query('ROLLBACK');
            res.status(500).json({ error: error.message });
        }
    }

    async getEarnings(req, res) {
        try {
            const { userId } = req.user;
            
            const earnings = await db.query(`
                SELECT * FROM affiliate_commissions 
                WHERE affiliate_id = (SELECT id FROM affiliates WHERE user_id = $1)
                ORDER BY created_at DESC
            `, [userId]);
            
            res.json(earnings.rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getAffiliateCode(req, res) {
        try {
            const { userId } = req.user;
            
            const affiliate = await db.query(`
                SELECT affiliate_code FROM affiliates WHERE user_id = $1
            `, [userId]);
            
            if (affiliate.rows.length === 0) {
                return res.status(404).json({ error: 'Código de afiliado não encontrado' });
            }
            
            res.json({ code: affiliate.rows[0].affiliate_code });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getReferrals(req, res) {
        try {
            const { userId } = req.user;
            
            const referrals = await db.query(`
                SELECT u.name, u.email, u.created_at, u.plan_type
                FROM users u
                INNER JOIN affiliates a ON u.referred_by = a.id
                WHERE a.user_id = $1
                ORDER BY u.created_at DESC
            `, [userId]);
            
            res.json(referrals.rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async generateCustomLink(req, res) {
        try {
            const { userId } = req.user;
            const { campaign } = req.body;
            
            const affiliate = await db.query(`
                SELECT affiliate_code FROM affiliates WHERE user_id = $1
            `, [userId]);
            
            if (affiliate.rows.length === 0) {
                return res.status(404).json({ error: 'Código de afiliado não encontrado' });
            }
            
            const code = affiliate.rows[0].affiliate_code;
            const link = `${process.env.FRONTEND_URL}/register?ref=${code}&campaign=${campaign || 'default'}`;
            
            res.json({ link });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

const affiliateController = new AffiliateController();

module.exports = {
    getDashboard: affiliateController.getDashboard.bind(affiliateController),
    convertCommission: affiliateController.convertCommission.bind(affiliateController),
    getEarnings: affiliateController.getEarnings.bind(affiliateController),
    getAffiliateCode: affiliateController.getAffiliateCode.bind(affiliateController),
    getReferrals: affiliateController.getReferrals.bind(affiliateController),
    generateCustomLink: affiliateController.generateCustomLink.bind(affiliateController)
};