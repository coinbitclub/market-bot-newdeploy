// 📡 TRADING ROUTES - ENTERPRISE MARKETBOT
// Consolidação dos webhooks TradingView + execução

const express = require('express');
const router = express.Router();
const tradingController = require('../controllers/trading.controller');
const { validateWebhook, rateLimitTrading } = require('../middleware/trading.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');

// WEBHOOKS TRADINGVIEW (Rate Limited: 300 req/hora)
router.post('/webhooks/signal', 
    rateLimitTrading,
    validateWebhook,
    tradingController.processSignal
);

// EXECUÇÃO MANUAL (Admin/Operador)
router.post('/execute',
    authenticateToken,
    tradingController.executeManualOrder
);

// POSIÇÕES ATIVAS
router.get('/positions',
    authenticateToken,
    tradingController.getActivePositions
);

// FECHAMENTO POR SINAL
router.post('/close',
    rateLimitTrading,
    validateWebhook,
    tradingController.closePositions
);

// ANÁLISE DE MERCADO
router.get('/market-analysis',
    authenticateToken,
    tradingController.getMarketAnalysis
);

// CONFIGURAÇÕES DE TRADING
router.get('/config/:userId',
    authenticateToken,
    tradingController.getTradingConfig
);

router.put('/config/:userId',
    authenticateToken,
    tradingController.updateTradingConfig
);

module.exports = router;