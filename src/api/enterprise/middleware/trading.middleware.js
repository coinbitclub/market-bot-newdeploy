// ⚡ TRADING MIDDLEWARE - ENTERPRISE MARKETBOT
// Rate limiting e validação para trading

const rateLimit = require('express-rate-limit');

// Rate limiting para webhooks (300 req/hora)
const rateLimitTrading = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 300, // 300 requests por hora
    message: {
        error: 'Muitas requisições. Limite: 300 por hora.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const validateWebhook = (req, res, next) => {
    try {
        const { symbol, action } = req.body;
        
        // Validar campos obrigatórios
        if (!symbol || !action) {
            return res.status(400).json({ 
                error: 'Campos obrigatórios: symbol, action' 
            });
        }
        
        // Validar ações permitidas (mais flexível)
        const validActions = [
            'BUY', 'SELL', 'STRONG_BUY', 'STRONG_SELL',
            'SINAL LONG FORTE', 'SINAL SHORT FORTE',
            'FECHE LONG', 'FECHE SHORT',
            'LONG', 'SHORT', 'CLOSE'
        ];
        
        // Verificar se contém palavra-chave válida (busca parcial)
        const hasValidAction = validActions.some(validAction => 
            action.toUpperCase().includes(validAction) || 
            validAction.includes(action.toUpperCase())
        );
        
        if (!hasValidAction) {
            return res.status(400).json({ 
                error: 'Ação inválida' 
            });
        }
        
        // Validar token se fornecido
        const webhookSecret = req.headers['authorization'];
        if (webhookSecret && webhookSecret !== `Bearer ${process.env.TRADINGVIEW_WEBHOOK_SECRET}`) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    rateLimitTrading,
    validateWebhook
};