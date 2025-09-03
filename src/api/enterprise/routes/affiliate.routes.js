// 🤝 AFFILIATE ROUTES - ENTERPRISE MARKETBOT
// Sistema de afiliação (1.5% / 5% comissões)

const express = require('express');
const router = express.Router();
const affiliateController = require('../controllers/affiliate.controller');
const { authenticateToken, requireAffiliate } = require('../middleware/auth.middleware');

// DASHBOARD AFILIADO
router.get('/dashboard',
    authenticateToken,
    requireAffiliate,
    affiliateController.getDashboard
);

// CONVERSÃO COMISSÃO (+10% bônus)
router.post('/convert',
    authenticateToken,
    requireAffiliate,
    affiliateController.convertCommission
);

// HISTÓRICO COMISSÕES
router.get('/earnings',
    authenticateToken,
    requireAffiliate,
    affiliateController.getEarnings
);

// CÓDIGO DE AFILIADO
router.get('/code',
    authenticateToken,
    requireAffiliate,
    affiliateController.getAffiliateCode
);

// REFERÊNCIAS
router.get('/referrals',
    authenticateToken,
    requireAffiliate,
    affiliateController.getReferrals
);

// LINKS PERSONALIZADOS
router.post('/links',
    authenticateToken,
    requireAffiliate,
    affiliateController.generateCustomLink
);

module.exports = router;