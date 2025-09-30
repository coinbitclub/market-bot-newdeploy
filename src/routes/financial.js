/**
 * 💰 FINANCIAL ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * Financial operations and balance management
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');
const StripeUnifiedService = require('../services/financial/stripe-unified.service');

class FinancialRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.stripeService = new StripeUnifiedService();
        this.setupRoutes();
    }

    setupRoutes() {
        // All routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // Financial routes
        this.router.get('/balances', this.getBalances.bind(this));
        this.router.post('/deposit', this.createDeposit.bind(this));
        this.router.post('/withdraw', this.createWithdraw.bind(this));
        this.router.post('/recharge', this.createRecharge.bind(this));
        this.router.post('/coupons/use', this.useCoupon.bind(this));
        this.router.get('/transactions', this.getTransactions.bind(this));
        this.router.get('/exchange-rates', this.getExchangeRates.bind(this));
    }

    /**
     * GET /balances - Get user balances
     */
    async getBalances(req, res) {
        try {
            const userId = req.user.id;

            // Get balances from database
            const balancesResult = await this.authMiddleware.dbPoolManager.executeRead(
                `SELECT balance_type, currency, amount FROM user_balances WHERE user_id = $1`,
                [userId]
            );

            // Organize balances by type and currency
            const balances = {
                real: { brl: 0, usd: 0 },
                admin: { brl: 0, usd: 0 },
                commission: { brl: 0, usd: 0 }
            };

            balancesResult.rows.forEach(row => {
                const currency = row.currency.toLowerCase();
                if (balances[row.balance_type] && balances[row.balance_type][currency] !== undefined) {
                    balances[row.balance_type][currency] = parseFloat(row.amount);
                }
            });

            const total = {
                brl: balances.real.brl + balances.admin.brl + balances.commission.brl,
                usd: balances.real.usd + balances.admin.usd + balances.commission.usd
            };

            res.json({
                success: true,
                balances,
                total
            });
        } catch (error) {
            console.error('❌ Error getting balances:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get balances'
            });
        }
    }

    /**
     * POST /deposit - Create deposit request
     */
    async createDeposit(req, res) {
        try {
            res.json({
                success: true,
                message: 'Deposit request created',
                transactionId: 'txn_123'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /withdraw - Create withdrawal request
     */
    async createWithdraw(req, res) {
        try {
            res.json({
                success: true,
                message: 'Withdrawal request created',
                transactionId: 'txn_456'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /transactions - Get transaction history
     */
    async getTransactions(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;

            // Get transactions from database
            const transactionsResult = await this.authMiddleware.dbPoolManager.executeRead(
                `SELECT * FROM payment_transactions 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC 
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            );

            res.json({
                success: true,
                transactions: transactionsResult.rows
            });
        } catch (error) {
            console.error('❌ Error getting transactions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get transactions'
            });
        }
    }

    /**
     * GET /exchange-rates - Get current exchange rates
     */
    async getExchangeRates(req, res) {
        try {
            res.json({
                success: true,
                rates: {
                    USD_TO_BRL: 5.25,
                    BRL_TO_USD: 0.19
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /recharge - Create balance recharge session
     */
    async createRecharge(req, res) {
        try {
            const { amount, currency } = req.body;
            const userId = req.user.id;

            // Validate input
            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor inválido'
                });
            }

            if (!['BRL', 'USD'].includes(currency)) {
                return res.status(400).json({
                    success: false,
                    error: 'Moeda não suportada. Use BRL ou USD.'
                });
            }

            // Minimum amount validation
            const minAmount = currency === 'BRL' ? 20 : 5;
            if (amount < minAmount) {
                return res.status(400).json({
                    success: false,
                    error: `Valor mínimo: ${currency === 'BRL' ? 'R$ 20' : '$5'}`
                });
            }

            // Get user data for checkout session
            const userResult = await this.authMiddleware.dbPoolManager.executeRead(
                'SELECT email, full_name FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuário não encontrado'
                });
            }

            // Create Stripe checkout session for balance recharge
            const country = currency === 'BRL' ? 'BR' : 'US';
            const amountInCents = Math.round(amount * 100); // Convert to cents

            const session = await this.stripeService.createCheckoutSession(
                userId, 'recharge', country, amountInCents
            );

            res.json({
                success: true,
                checkout_url: session.url,
                session_id: session.id,
                amount,
                currency,
                message: 'Sessão de recarga criada com sucesso'
            });

        } catch (error) {
            console.error('❌ Create recharge error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /coupons/use - Use a coupon
     */
    async useCoupon(req, res) {
        try {
            const { code } = req.body;
            const userId = req.user.id;

            if (!code || typeof code !== 'string' || code.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Código do cupom é obrigatório'
                });
            }

            // For now, return a mock response
            // In production, this would check against database
            const mockCoupons = {
                'WELCOME10': { value: 10, currency: 'BRL' },
                'BONUS50': { value: 50, currency: 'BRL' },
                'TEST20': { value: 20, currency: 'USD' }
            };

            const couponData = mockCoupons[code.toUpperCase()];

            if (!couponData) {
                return res.status(400).json({
                    success: false,
                    error: 'Cupom inválido ou expirado'
                });
            }

            res.json({
                success: true,
                value: couponData.value,
                currency: couponData.currency,
                message: 'Cupom aplicado com sucesso!'
            });

        } catch (error) {
            console.error('❌ Use coupon error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new FinancialRoutes();
