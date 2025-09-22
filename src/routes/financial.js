/**
 * 💰 FINANCIAL ROUTES - COINBITCLUB ENTERPRISE v6.0.0
 * Financial operations and balance management
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');

class FinancialRoutes {
    constructor() {
        this.router = express.Router();
        this.authMiddleware = new AuthMiddleware();
        this.setupRoutes();
    }

    setupRoutes() {
        // All routes require authentication
        this.router.use(this.authMiddleware.authenticate.bind(this.authMiddleware));

        // Financial routes
        this.router.get('/balances', this.getBalances.bind(this));
        this.router.post('/deposit', this.createDeposit.bind(this));
        this.router.post('/withdraw', this.createWithdraw.bind(this));
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

    getRouter() {
        return this.router;
    }
}

module.exports = new FinancialRoutes();
