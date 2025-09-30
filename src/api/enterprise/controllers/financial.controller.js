// 💰 FINANCIAL CONTROLLER - ENTERPRISE MARKETBOT
// Sistema financeiro completo

const StripeUnifiedService = require('../../../services/financial/stripe-unified.service');
const db = require('../../../database/connection');

class FinancialController {
    constructor() {
        this.stripeService = new StripeUnifiedService();
    }

    async createCheckoutSession(req, res) {
        try {
            const { userId } = req.user;
            const { planType, country, amount } = req.body;
            
            const session = await this.stripeService.createCheckoutSession(
                userId, planType, country, amount
            );
            
            res.json(session);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async handleStripeWebhook(req, res) {
        try {
            const signature = req.headers['stripe-signature'];
            
            // Verificar assinatura Stripe
            const event = stripe.webhooks.constructEvent(
                req.body, signature, process.env.STRIPE_WEBHOOK_SECRET
            );
            
            await this.stripeService.handleWebhook(event);
            
            res.status(200).send('Webhook processado');
        } catch (error) {
            console.error('Erro webhook:', error);
            res.status(400).send('Webhook inválido');
        }
    }

    async getBalance(req, res) {
        try {
            const { userId } = req.params;
            
            const balance = await db.query(`
                SELECT 
                    saldo_real_brl,
                    saldo_real_usd,
                    saldo_admin_brl,
                    saldo_admin_usd,
                    saldo_comissao_brl,
                    saldo_comissao_usd
                FROM users WHERE id = $1
            `, [userId]);
            
            if (balance.rows.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            
            res.json(balance.rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async requestWithdrawal(req, res) {
        try {
            const { userId } = req.user;
            const { amount, currency, bank_data } = req.body;
            
            // Validar saldo mínimo
            const minAmount = currency === 'BRL' ? 50 : 10;
            if (amount < minAmount) {
                return res.status(400).json({ 
                    error: `Valor mínimo: ${currency === 'BRL' ? 'R$ 50' : '$10'}` 
                });
            }
            
            // Verificar saldo disponível (apenas saldo real)
            const balanceColumn = currency === 'BRL' ? 'saldo_real_brl' : 'saldo_real_usd';
            const user = await db.query(`
                SELECT ${balanceColumn} as balance FROM users WHERE id = $1
            `, [userId]);
            
            if (user.rows[0].balance < amount) {
                return res.status(400).json({ error: 'Saldo insuficiente' });
            }
            
            // Criar solicitação de saque
            const withdrawal = await db.query(`
                INSERT INTO withdrawals (user_id, amount, currency, bank_data, status, created_at)
                VALUES ($1, $2, $3, $4, 'PENDING', NOW())
                RETURNING id
            `, [userId, amount, currency, JSON.stringify(bank_data)]);
            
            res.json({ 
                success: true, 
                withdrawal_id: withdrawal.rows[0].id,
                message: 'Solicitação de saque criada. Processamento em até 48h.' 
            });
            
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async createRechargeSession(req, res) {
        try {
            const { userId } = req.user;
            const { amount, currency } = req.body;

            // Validate input
            if (!amount || amount <= 0) {
                return res.status(400).json({
                    error: 'Valor inválido'
                });
            }

            if (!['BRL', 'USD'].includes(currency)) {
                return res.status(400).json({
                    error: 'Moeda não suportada. Use BRL ou USD.'
                });
            }

            // Minimum amount validation
            const minAmount = currency === 'BRL' ? 20 : 5;
            if (amount < minAmount) {
                return res.status(400).json({
                    error: `Valor mínimo: ${currency === 'BRL' ? 'R$ 20' : '$5'}`
                });
            }

            // Get user data for Stripe session
            const userResult = await db.query(
                'SELECT email, full_name FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            const user = userResult.rows[0];

            // Create Stripe checkout session for balance recharge
            const session = await this.stripeService.createBalanceRechargeSession(
                userId, amount, currency, user.email, user.full_name
            );

            res.json({
                success: true,
                checkout_url: session.url,
                session_id: session.id,
                amount,
                currency
            });

        } catch (error) {
            console.error('❌ Create recharge session error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async generateCoupon(req, res) {
        try {
            const { type, value, currency, description } = req.body;
            const { userId: adminId } = req.user;
            
            // Gerar código único
            const code = this.generateUniqueCode();
            
            const coupon = await db.query(`
                INSERT INTO coupons (code, type, value, currency, admin_id, description, status, created_at, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW(), NOW() + INTERVAL '30 days')
                RETURNING *
            `, [code, type, value, currency, adminId, description]);
            
            res.json(coupon.rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async useCoupon(req, res) {
        try {
            const { userId } = req.user;
            const { code } = req.body;
            
            await db.query('BEGIN');
            
            // Verificar cupom
            const coupon = await db.query(`
                SELECT * FROM coupons 
                WHERE code = $1 AND status = 'ACTIVE' AND expires_at > NOW()
            `, [code]);
            
            if (coupon.rows.length === 0) {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'Cupom inválido ou expirado' });
            }
            
            const couponData = coupon.rows[0];
            
            // Verificar se já foi usado
            const used = await db.query(`
                SELECT id FROM coupon_usage WHERE coupon_id = $1 AND user_id = $2
            `, [couponData.id, userId]);
            
            if (used.rows.length > 0) {
                await db.query('ROLLBACK');
                return res.status(400).json({ error: 'Cupom já utilizado' });
            }
            
            // Creditar saldo administrativo
            const balanceColumn = couponData.currency === 'BRL' ? 'saldo_admin_brl' : 'saldo_admin_usd';
            
            await db.query(`
                UPDATE users 
                SET ${balanceColumn} = ${balanceColumn} + $1
                WHERE id = $2
            `, [couponData.value, userId]);
            
            // Marcar como usado
            await db.query(`
                INSERT INTO coupon_usage (coupon_id, user_id, used_at)
                VALUES ($1, $2, NOW())
            `, [couponData.id, userId]);
            
            // Atualizar status do cupom
            await db.query(`
                UPDATE coupons SET status = 'USED' WHERE id = $1
            `, [couponData.id]);
            
            await db.query('COMMIT');
            
            res.json({ 
                success: true, 
                value: couponData.value,
                currency: couponData.currency 
            });
            
        } catch (error) {
            await db.query('ROLLBACK');
            res.status(500).json({ error: error.message });
        }
    }

    generateUniqueCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'CBC';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async getTransactions(req, res) {
        try {
            const { userId } = req.params;
            const { limit = 50, offset = 0 } = req.query;
            
            const transactions = await db.query(`
                SELECT * FROM transactions 
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            `, [userId, limit, offset]);
            
            res.json(transactions.rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getFinancialReports(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            const reports = await db.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN type = 'PAYMENT' THEN amount ELSE 0 END) as total_payments,
                    SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END) as total_withdrawals,
                    SUM(CASE WHEN type = 'COMMISSION' THEN amount ELSE 0 END) as total_commissions
                FROM transactions
                WHERE created_at BETWEEN $1 AND $2
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `, [startDate || '2023-01-01', endDate || new Date().toISOString().split('T')[0]]);
            
            res.json(reports.rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

const financialController = new FinancialController();

module.exports = {
    createCheckoutSession: financialController.createCheckoutSession.bind(financialController),
    handleStripeWebhook: financialController.handleStripeWebhook.bind(financialController),
    getBalance: financialController.getBalance.bind(financialController),
    requestWithdrawal: financialController.requestWithdrawal.bind(financialController),
    createRechargeSession: financialController.createRechargeSession.bind(financialController),
    generateCoupon: financialController.generateCoupon.bind(financialController),
    useCoupon: financialController.useCoupon.bind(financialController),
    getTransactions: financialController.getTransactions.bind(financialController),
    getFinancialReports: financialController.getFinancialReports.bind(financialController)
};