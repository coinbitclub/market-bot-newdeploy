/**
 * ===============================================
 * 🏦 API SISTEMA DE TAXA DE SAQUE
 * ===============================================
 * CoinBitClub Market Bot - Withdrawal Fees API
 * 
 * 📋 ENDPOINTS:
 * • POST /api/withdrawal-fees/calculate - Calcular taxa
 * • POST /api/withdrawal-fees/validate - Validar saque
 * • POST /api/withdrawal-fees/process - Processar saque
 * • GET /api/withdrawal-fees/user/:id - Resumo do usuário
 * • GET /api/withdrawal-fees/admin/dashboard - Dashboard admin
 * • GET /api/withdrawal-fees/admin/revenue - Relatório receita
 * • PUT /api/withdrawal-fees/admin/config - Atualizar taxas
 * • GET /api/withdrawal-fees/config - Obter configuração
 * • GET /api/withdrawal-fees/health - Health check
 */

const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// ===============================================
// 🔧 CONFIGURAÇÃO DO BANCO
// ===============================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ===============================================
// 🛠️ UTILITÁRIOS
// ===============================================

const responseHelper = {
    success: (data, message = 'Operação realizada com sucesso') => ({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    }),
    
    error: (message, details = null, code = 500) => ({
        success: false,
        error: message,
        details,
        code,
        timestamp: new Date().toISOString()
    }),
    
    validation: (errors) => ({
        success: false,
        error: 'Dados inválidos',
        validation_errors: errors,
        timestamp: new Date().toISOString()
    })
};

const validateRequest = {
    currency: (currency) => {
        if (!currency || !['BRL', 'USD'].includes(currency.toUpperCase())) {
            return 'Moeda deve ser BRL ou USD';
        }
        return null;
    },
    
    amount: (amount) => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return 'Valor deve ser um número positivo';
        }
        return null;
    },
    
    userId: (userId) => {
        if (!userId || typeof userId !== 'string') {
            return 'ID do usuário é obrigatório';
        }
        return null;
    }
};

// ===============================================
// 📊 ENDPOINTS PÚBLICOS
// ===============================================

/**
 * GET /api/withdrawal-fees/config
 * Obter configuração atual de taxas
 */
router.get('/config', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT currency, fee_amount, fee_type, min_withdrawal, active, updated_at
            FROM withdrawal_fees_config 
            WHERE active = true
            ORDER BY currency
        `);
        
        const config = {};
        result.rows.forEach(row => {
            config[row.currency.toLowerCase()] = {
                currency: row.currency,
                fee_amount: parseFloat(row.fee_amount),
                fee_type: row.fee_type,
                min_withdrawal: parseFloat(row.min_withdrawal),
                updated_at: row.updated_at
            };
        });
        
        res.json(responseHelper.success(config, 'Configuração de taxas obtida'));
        
    } catch (error) {
        console.error('Erro ao obter configuração:', error);
        res.status(500).json(responseHelper.error('Erro interno do servidor'));
    }
});

/**
 * POST /api/withdrawal-fees/calculate
 * Calcular taxa para um saque
 */
router.post('/calculate', async (req, res) => {
    try {
        const { currency, amount } = req.body;
        
        // Validações
        const currencyError = validateRequest.currency(currency);
        if (currencyError) {
            return res.status(400).json(responseHelper.validation([currencyError]));
        }
        
        const amountError = validateRequest.amount(amount);
        if (amountError) {
            return res.status(400).json(responseHelper.validation([amountError]));
        }
        
        // Calcular taxa
        const result = await pool.query(
            'SELECT calculate_withdrawal_fee($1, $2) as calculation',
            [currency.toUpperCase(), parseFloat(amount)]
        );
        
        const calculation = result.rows[0].calculation;
        
        if (!calculation.success) {
            return res.status(400).json(responseHelper.error(calculation.error));
        }
        
        res.json(responseHelper.success(calculation, 'Taxa calculada com sucesso'));
        
    } catch (error) {
        console.error('Erro ao calcular taxa:', error);
        res.status(500).json(responseHelper.error('Erro interno do servidor'));
    }
});

/**
 * POST /api/withdrawal-fees/validate
 * Validar se usuário pode realizar saque
 */
router.post('/validate', async (req, res) => {
    try {
        const { user_id, currency, amount } = req.body;
        
        // Validações
        const userIdError = validateRequest.userId(user_id);
        if (userIdError) {
            return res.status(400).json(responseHelper.validation([userIdError]));
        }
        
        const currencyError = validateRequest.currency(currency);
        if (currencyError) {
            return res.status(400).json(responseHelper.validation([currencyError]));
        }
        
        const amountError = validateRequest.amount(amount);
        if (amountError) {
            return res.status(400).json(responseHelper.validation([amountError]));
        }
        
        // Validar saque
        const result = await pool.query(
            'SELECT validate_withdrawal_with_fee($1, $2, $3) as validation',
            [user_id, currency.toUpperCase(), parseFloat(amount)]
        );
        
        const validation = result.rows[0].validation;
        
        const status = validation.can_withdraw ? 'approved' : 'rejected';
        const message = validation.can_withdraw 
            ? 'Saque pode ser processado' 
            : `Saque rejeitado: ${validation.failure_reason || 'Saldo insuficiente'}`;
        
        res.json(responseHelper.success({
            ...validation,
            status
        }, message));
        
    } catch (error) {
        console.error('Erro ao validar saque:', error);
        res.status(500).json(responseHelper.error('Erro interno do servidor'));
    }
});

/**
 * GET /api/withdrawal-fees/user/:id
 * Obter resumo de taxas do usuário
 */
router.get('/user/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const userIdError = validateRequest.userId(id);
        if (userIdError) {
            return res.status(400).json(responseHelper.validation([userIdError]));
        }
        
        const result = await pool.query(
            'SELECT get_user_withdrawal_fees_summary($1) as summary',
            [id]
        );
        
        const summary = result.rows[0].summary;
        
        if (summary.error) {
            return res.status(404).json(responseHelper.error(summary.error));
        }
        
        res.json(responseHelper.success(summary, 'Resumo do usuário obtido'));
        
    } catch (error) {
        console.error('Erro ao obter resumo do usuário:', error);
        res.status(500).json(responseHelper.error('Erro interno do servidor'));
    }
});

// ===============================================
// 🔐 ENDPOINTS ADMINISTRATIVOS
// ===============================================

/**
 * POST /api/withdrawal-fees/process
 * Processar saque com taxa (Admin only)
 */
router.post('/process', async (req, res) => {
    try {
        const { user_id, currency, amount, approved_by, withdrawal_id, transaction_id } = req.body;
        
        // Validações básicas
        const validationErrors = [];
        
        const userIdError = validateRequest.userId(user_id);
        if (userIdError) validationErrors.push(userIdError);
        
        const currencyError = validateRequest.currency(currency);
        if (currencyError) validationErrors.push(currencyError);
        
        const amountError = validateRequest.amount(amount);
        if (amountError) validationErrors.push(amountError);
        
        const approvedByError = validateRequest.userId(approved_by);
        if (approvedByError) validationErrors.push('ID do aprovador é obrigatório');
        
        if (validationErrors.length > 0) {
            return res.status(400).json(responseHelper.validation(validationErrors));
        }
        
        // Processar saque
        const result = await pool.query(
            'SELECT process_withdrawal_with_fee($1, $2, $3, $4, $5, $6) as processing',
            [
                user_id, 
                currency.toUpperCase(), 
                parseFloat(amount), 
                approved_by,
                withdrawal_id || null,
                transaction_id || null
            ]
        );
        
        const processing = result.rows[0].processing;
        
        if (!processing.success) {
            return res.status(400).json(responseHelper.error(
                processing.error, 
                processing.validation_details
            ));
        }
        
        res.json(responseHelper.success(processing, 'Saque processado com sucesso'));
        
    } catch (error) {
        console.error('Erro ao processar saque:', error);
        res.status(500).json(responseHelper.error('Erro interno do servidor'));
    }
});

/**
 * GET /api/withdrawal-fees/admin/dashboard
 * Dashboard administrativo de taxas
 */
router.get('/admin/dashboard', async (req, res) => {
    try {
        const { currency, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT * FROM dashboard_withdrawal_fees
        `;
        const params = [];
        
        if (currency) {
            query += ` WHERE currency = $1`;
            params.push(currency.toUpperCase());
        }
        
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, params);
        
        // Obter estatísticas gerais
        const statsQuery = `
            SELECT 
                currency,
                COUNT(*) as total_withdrawals,
                SUM(withdrawal_amount) as total_withdrawn,
                SUM(fee_amount) as total_fees_collected,
                AVG(fee_amount) as avg_fee
            FROM withdrawal_fees_charged
            ${currency ? 'WHERE currency = $1' : ''}
            GROUP BY currency
        `;
        
        const statsResult = await pool.query(
            statsQuery, 
            currency ? [currency.toUpperCase()] : []
        );
        
        res.json(responseHelper.success({
            users: result.rows,
            statistics: statsResult.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total_users: result.rows.length
            }
        }, 'Dashboard obtido com sucesso'));
        
    } catch (error) {
        console.error('Erro ao obter dashboard:', error);
        res.status(500).json(responseHelper.error('Erro interno do servidor'));
    }
});

/**
 * GET /api/withdrawal-fees/admin/revenue
 * Relatório de receita com taxas
 */
router.get('/admin/revenue', async (req, res) => {
    try {
        const { months = 12, currency } = req.query;
        
        let query = `
            SELECT * FROM withdrawal_fees_revenue_report
        `;
        const params = [];
        
        if (currency) {
            query += ` WHERE currency = $1`;
            params.push(currency.toUpperCase());
        }
        
        query += ` ORDER BY month DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(months));
        
        const result = await pool.query(query, params);
        
        // Calcular totais
        const totals = result.rows.reduce((acc, row) => {
            if (!acc[row.currency]) {
                acc[row.currency] = {
                    currency: row.currency,
                    total_withdrawals: 0,
                    total_withdrawn: 0,
                    total_fees: 0
                };
            }
            
            acc[row.currency].total_withdrawals += parseInt(row.withdrawals_count);
            acc[row.currency].total_withdrawn += parseFloat(row.total_withdrawn);
            acc[row.currency].total_fees += parseFloat(row.total_fees_collected);
            
            return acc;
        }, {});
        
        res.json(responseHelper.success({
            monthly_data: result.rows,
            totals: Object.values(totals),
            period: `Últimos ${months} meses`
        }, 'Relatório de receita obtido'));
        
    } catch (error) {
        console.error('Erro ao obter relatório de receita:', error);
        res.status(500).json(responseHelper.error('Erro interno do servidor'));
    }
});

/**
 * PUT /api/withdrawal-fees/admin/config
 * Atualizar configuração de taxas
 */
router.put('/admin/config', async (req, res) => {
    try {
        const { currency, fee_amount, updated_by } = req.body;
        
        // Validações
        const validationErrors = [];
        
        const currencyError = validateRequest.currency(currency);
        if (currencyError) validationErrors.push(currencyError);
        
        const amountError = validateRequest.amount(fee_amount);
        if (amountError) validationErrors.push('Taxa deve ser um valor positivo');
        
        const updatedByError = validateRequest.userId(updated_by);
        if (updatedByError) validationErrors.push('ID do usuário atualizador é obrigatório');
        
        if (validationErrors.length > 0) {
            return res.status(400).json(responseHelper.validation(validationErrors));
        }
        
        // Atualizar configuração
        const result = await pool.query(`
            UPDATE withdrawal_fees_config 
            SET fee_amount = $2, updated_at = CURRENT_TIMESTAMP
            WHERE currency = $1 AND active = true
            RETURNING *
        `, [currency.toUpperCase(), parseFloat(fee_amount)]);
        
        if (result.rows.length === 0) {
            return res.status(404).json(responseHelper.error('Configuração não encontrada'));
        }
        
        // Log da alteração
        await pool.query(`
            INSERT INTO withdrawal_fees_charged (
                withdrawal_id, user_id, currency, withdrawal_amount, fee_amount,
                total_charged, charged_by, metadata
            ) VALUES (
                -1, $3, $1, 0, $2, 0, $3,
                jsonb_build_object(
                    'action', 'config_update',
                    'old_fee', (SELECT fee_amount FROM withdrawal_fees_config WHERE currency = $1 AND active = true),
                    'new_fee', $2,
                    'updated_at', CURRENT_TIMESTAMP
                )
            )
        `, [currency.toUpperCase(), parseFloat(fee_amount), updated_by]);
        
        res.json(responseHelper.success(result.rows[0], 'Configuração atualizada com sucesso'));
        
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        res.status(500).json(responseHelper.error('Erro interno do servidor'));
    }
});

// ===============================================
// 🏥 HEALTH CHECK
// ===============================================

/**
 * GET /api/withdrawal-fees/health
 * Verificar saúde do sistema
 */
router.get('/health', async (req, res) => {
    try {
        // Verificar conexão com banco
        const dbCheck = await pool.query('SELECT 1 as health');
        
        // Verificar configurações ativas
        const configCheck = await pool.query(`
            SELECT currency, fee_amount, active 
            FROM withdrawal_fees_config 
            WHERE active = true
        `);
        
        // Verificar última transação
        const lastTransactionCheck = await pool.query(`
            SELECT MAX(charged_at) as last_transaction
            FROM withdrawal_fees_charged
        `);
        
        const health = {
            status: 'healthy',
            database: dbCheck.rows.length > 0 ? 'connected' : 'disconnected',
            active_configs: configCheck.rows.length,
            configurations: configCheck.rows,
            last_transaction: lastTransactionCheck.rows[0].last_transaction,
            timestamp: new Date().toISOString()
        };
        
        res.json(responseHelper.success(health, 'Sistema saudável'));
        
    } catch (error) {
        console.error('Erro no health check:', error);
        res.status(500).json(responseHelper.error('Sistema com problemas', {
            database: 'disconnected',
            error: error.message
        }));
    }
});

// ===============================================
// 🛡️ MIDDLEWARE DE ERRO
// ===============================================

router.use((error, req, res, next) => {
    console.error('Erro não tratado na API de taxas de saque:', error);
    
    if (error.code === '23505') { // Violação de unique constraint
        return res.status(409).json(responseHelper.error('Conflito de dados'));
    }
    
    if (error.code === '23503') { // Violação de foreign key
        return res.status(400).json(responseHelper.error('Referência inválida'));
    }
    
    res.status(500).json(responseHelper.error('Erro interno do servidor'));
});

module.exports = router;
