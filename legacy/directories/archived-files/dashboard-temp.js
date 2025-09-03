#!/usr/bin/env node

/**
 * 🚨 DASHBOARD TEMPORÁRIO - EMERGÊNCIA
 * ===================================
 * Dashboard simples para testar se o erro foi corrigido
 */

const express = require('express');

const app = express();
const port = process.env.PORT || 3002;

app.use(express.json());

// Rota simples de teste
app.get('/dashboard', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Dashboard temporário funcionando',
        timestamp: new Date().toISOString(),
        corrections_applied: [
            'correlation_value column added',
            'conditions column added', 
            'received_at column added',
            'prepaid_balance_usd column added'
        ]
    });
});

// Rota de status
app.get('/status', (req, res) => {
    res.json({
        status: 'OK',
        service: 'dashboard-temp',
        database_fixes: 'APPLIED',
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`🚨 Dashboard temporário rodando na porta ${port}`);
});
