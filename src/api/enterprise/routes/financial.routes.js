// 💰 FINANCIAL ROUTES - ENTERPRISE MARKETBOT
// Sistema financeiro completo (Stripe + 6 saldos + saques)

const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financial.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

// STRIPE CHECKOUT
router.post('/checkout',
    authenticateToken,
    financialController.createCheckoutSession
);

// TIPOS DE SALDO (Endpoint público para testes)
router.get('/balance/types', (req, res) => {
    res.json({
        types: [
            'saldo_real_brl',     // Saldo real BRL (trading + saques)
            'saldo_real_usd',     // Saldo real USD (trading + saques) 
            'saldo_admin_brl',    // Saldo admin BRL (cupons + conversões)
            'saldo_admin_usd',    // Saldo admin USD (cupons + conversões)
            'saldo_comissao_brl', // Comissões BRL (afiliação)
            'saldo_comissao_usd'  // Comissões USD (afiliação)
        ],
        description: 'Os 6 tipos de saldo conforme especificação enterprise'
    });
});

// STRIPE WEBHOOKS
router.post('/webhook',
    express.raw({ type: 'application/json' }),
    financialController.handleStripeWebhook
);

// SALDOS (6 tipos conforme especificação)
router.get('/balance/:userId',
    authenticateToken,
    financialController.getBalance
);

// SOLICITAÇÃO SAQUE
router.post('/withdraw',
    authenticateToken,
    financialController.requestWithdrawal
);

// CUPONS ADMINISTRATIVOS
router.post('/coupons',
    authenticateToken,
    requireAdmin,
    financialController.generateCoupon
);

// USAR CUPOM
router.post('/coupons/use',
    authenticateToken,
    financialController.useCoupon
);

// TRANSAÇÕES
router.get('/transactions/:userId',
    authenticateToken,
    financialController.getTransactions
);

// RELATÓRIOS FINANCEIROS (Admin)
router.get('/reports',
    authenticateToken,
    requireAdmin,
    financialController.getFinancialReports
);

module.exports = router;