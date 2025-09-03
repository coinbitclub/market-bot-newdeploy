// =====================================================
// 💰 API SISTEMA DE SALDO DEVEDOR E COMPENSAÇÃO
// =====================================================
// Implementa APIs para:
// 1. Processar comissões com saldo devedor
// 2. Compensação automática na recarga
// 3. Validação de saldo mínimo para operações
// 4. Dashboard administrativo de dívidas

const express = require('express');
const { Pool } = require('pg');

class SaldoDevedorAPI {
    constructor(pool) {
        this.pool = pool;
        this.router = express.Router();
        this.setupRoutes();
    }

    setupRoutes() {
        // =======================================
        // 🎯 ENDPOINTS PRINCIPAIS
        // =======================================

        // Processar comissão com saldo devedor
        this.router.post('/process-commission', this.processCommissionWithDebt.bind(this));
        
        // Compensar dívida na recarga
        this.router.post('/compensate-debt', this.compensateDebt.bind(this));
        
        // Verificar saldo mínimo para operação
        this.router.get('/check-minimum-balance/:userId', this.checkMinimumBalance.bind(this));
        
        // Obter status de dívidas do usuário
        this.router.get('/debt-status/:userId', this.getDebtStatus.bind(this));
        
        // Dashboard administrativo
        this.router.get('/admin/debt-dashboard', this.getDebtDashboard.bind(this));
        
        // Perdoar dívida (admin only)
        this.router.post('/admin/forgive-debt', this.forgiveDebt.bind(this));
        
        // Configurar saldo mínimo (admin only)
        this.router.post('/admin/set-minimum-balance', this.setMinimumBalance.bind(this));
        
        // Relatório de compensações
        this.router.get('/admin/compensation-report', this.getCompensationReport.bind(this));

        // Health check
        this.router.get('/health', this.healthCheck.bind(this));
    }

    // =======================================
    // 🎯 MÉTODO PRINCIPAL: PROCESSAR COMISSÃO
    // =======================================

    async processCommissionWithDebt(req, res) {
        try {
            const {
                user_id,
                operation_id,
                profit_brl = 0,
                profit_usd = 0,
                commission_rate = 0.10, // 10% padrão
                force_debt = false // Para permitir débito mesmo sem saldo
            } = req.body;

            // Validar entrada
            if (!user_id || !operation_id) {
                return res.status(400).json({
                    success: false,
                    error: 'user_id e operation_id são obrigatórios'
                });
            }

            // Verificar se operação teve lucro
            if (profit_brl <= 0 && profit_usd <= 0) {
                return res.json({
                    success: true,
                    commission_charged: false,
                    message: 'Operação sem lucro - sem cobrança de comissão'
                });
            }

            // Calcular comissão
            const commission_brl = profit_brl * commission_rate;
            const commission_usd = profit_usd * commission_rate;

            // Obter saldo atual do usuário
            const userQuery = await this.pool.query(`
                SELECT id, username, balance_brl, balance_usd, 
                       saldo_devedor_brl, saldo_devedor_usd, operacoes_bloqueadas
                FROM users WHERE id = $1
            `, [user_id]);

            if (userQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuário não encontrado'
                });
            }

            const user = userQuery.rows[0];

            // Determinar se pode cobrar ou precisa criar dívida
            const can_charge_brl = user.balance_brl >= commission_brl;
            const can_charge_usd = user.balance_usd >= commission_usd;

            let result;

            if ((can_charge_brl && commission_brl > 0) && (can_charge_usd && commission_usd > 0)) {
                // Pode cobrar normalmente
                await this.pool.query(`
                    UPDATE users SET 
                        balance_brl = balance_brl - $1,
                        balance_usd = balance_usd - $2
                    WHERE id = $3
                `, [commission_brl, commission_usd, user_id]);

                result = {
                    success: true,
                    commission_charged: true,
                    debt_created: false,
                    commission_brl,
                    commission_usd,
                    message: 'Comissão debitada com sucesso'
                };

            } else if (force_debt || (!can_charge_brl && commission_brl > 0) || (!can_charge_usd && commission_usd > 0)) {
                // Precisa criar saldo devedor
                const debtResult = await this.pool.query(`
                    SELECT registrar_saldo_devedor($1, $2, $3, $4, $5) as result
                `, [
                    user_id, 
                    operation_id, 
                    commission_brl, 
                    commission_usd,
                    `Comissão de operação #${operation_id} - Saldo insuficiente`
                ]);

                result = {
                    success: true,
                    commission_charged: true,
                    ...debtResult.rows[0].result,
                    commission_brl,
                    commission_usd
                };
            }

            // Log da operação
            await this.pool.query(`
                INSERT INTO system_logs (user_id, action, details, created_at)
                VALUES ($1, 'COMMISSION_PROCESSED', $2, NOW())
            `, [user_id, JSON.stringify({
                operation_id,
                commission_brl,
                commission_usd,
                debt_created: result.debt_created,
                result
            })]);

            res.json(result);

        } catch (error) {
            console.error('Erro ao processar comissão:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    // =======================================
    // 💰 COMPENSAÇÃO AUTOMÁTICA NA RECARGA
    // =======================================

    async compensateDebt(req, res) {
        try {
            const {
                user_id,
                recharge_amount_brl = 0,
                recharge_amount_usd = 0,
                recharge_id = null,
                auto_compensate = true
            } = req.body;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'user_id é obrigatório'
                });
            }

            if (recharge_amount_brl <= 0 && recharge_amount_usd <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor de recarga deve ser maior que zero'
                });
            }

            // Verificar se usuário tem dívidas pendentes
            const debtCheck = await this.pool.query(`
                SELECT saldo_devedor_brl, saldo_devedor_usd 
                FROM users WHERE id = $1
            `, [user_id]);

            if (debtCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuário não encontrado'
                });
            }

            const debt = debtCheck.rows[0];
            const has_debt = debt.saldo_devedor_brl > 0 || debt.saldo_devedor_usd > 0;

            let result;

            if (has_debt && auto_compensate) {
                // Aplicar compensação automática
                const compensationResult = await this.pool.query(`
                    SELECT compensar_divida_recarga($1, $2, $3, $4) as result
                `, [user_id, recharge_amount_brl, recharge_amount_usd, recharge_id]);

                result = {
                    success: true,
                    debt_compensation_applied: true,
                    ...compensationResult.rows[0].result
                };

            } else {
                // Adicionar saldo normalmente (sem dívida ou sem auto-compensação)
                await this.pool.query(`
                    UPDATE users SET 
                        balance_brl = balance_brl + $1,
                        balance_usd = balance_usd + $2
                    WHERE id = $3
                `, [recharge_amount_brl, recharge_amount_usd, user_id]);

                result = {
                    success: true,
                    debt_compensation_applied: false,
                    balance_added_brl: recharge_amount_brl,
                    balance_added_usd: recharge_amount_usd,
                    message: 'Recarga adicionada sem compensação de dívida'
                };
            }

            // Log da recarga
            await this.pool.query(`
                INSERT INTO system_logs (user_id, action, details, created_at)
                VALUES ($1, 'RECHARGE_PROCESSED', $2, NOW())
            `, [user_id, JSON.stringify({
                recharge_id,
                recharge_amount_brl,
                recharge_amount_usd,
                compensation_applied: result.debt_compensation_applied,
                result
            })]);

            res.json(result);

        } catch (error) {
            console.error('Erro ao processar recarga:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    // =======================================
    // ✅ VERIFICAÇÃO DE SALDO MÍNIMO
    // =======================================

    async checkMinimumBalance(req, res) {
        try {
            const { userId } = req.params;
            const { 
                user_type = 'BASIC', 
                country_code = 'BRL',
                operation_amount = 0 
            } = req.query;

            const result = await this.pool.query(`
                SELECT verificar_saldo_minimo_operacao($1, $2, $3) as validation
            `, [userId, user_type, country_code]);

            const validation = result.rows[0].validation;

            // Se for para uma operação específica, verificar se tem saldo para ela
            if (operation_amount > 0) {
                const available_balance = validation.available_balance;
                const can_afford_operation = available_balance >= parseFloat(operation_amount);
                
                validation.can_afford_operation = can_afford_operation;
                validation.operation_amount = parseFloat(operation_amount);
                
                if (!can_afford_operation) {
                    validation.can_operate = false;
                    validation.block_reason = `Saldo insuficiente para operação de ${operation_amount} ${country_code}`;
                }
            }

            res.json({
                success: true,
                user_id: parseInt(userId),
                validation
            });

        } catch (error) {
            console.error('Erro ao verificar saldo mínimo:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    // =======================================
    // 📊 STATUS DE DÍVIDAS DO USUÁRIO
    // =======================================

    async getDebtStatus(req, res) {
        try {
            const { userId } = req.params;

            // Obter status completo do usuário
            const userQuery = await this.pool.query(`
                SELECT 
                    u.id, u.username, u.email,
                    u.balance_brl, u.balance_usd,
                    u.saldo_devedor_brl, u.saldo_devedor_usd,
                    u.operacoes_bloqueadas, u.ultima_compensacao,
                    COUNT(udh.id) as total_debts,
                    SUM(CASE WHEN udh.status = 'PENDING' THEN udh.amount_brl ELSE 0 END) as pending_debt_brl,
                    SUM(CASE WHEN udh.status = 'PENDING' THEN udh.amount_usd ELSE 0 END) as pending_debt_usd
                FROM users u
                LEFT JOIN user_debt_history udh ON u.id = udh.user_id
                WHERE u.id = $1
                GROUP BY u.id, u.username, u.email, u.balance_brl, u.balance_usd,
                         u.saldo_devedor_brl, u.saldo_devedor_usd, u.operacoes_bloqueadas, u.ultima_compensacao
            `, [userId]);

            if (userQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuário não encontrado'
                });
            }

            const user = userQuery.rows[0];

            // Obter histórico de dívidas
            const debtHistory = await this.pool.query(`
                SELECT id, operation_id, debt_type, amount_brl, amount_usd, 
                       reason, status, created_at, compensated_at
                FROM user_debt_history 
                WHERE user_id = $1 
                ORDER BY created_at DESC
                LIMIT 10
            `, [userId]);

            // Obter histórico de compensações
            const compensationHistory = await this.pool.query(`
                SELECT id, recharge_id, amount_compensated_brl, amount_compensated_usd,
                       remaining_debt_brl, remaining_debt_usd, processed_at
                FROM debt_compensations 
                WHERE user_id = $1 
                ORDER BY processed_at DESC
                LIMIT 10
            `, [userId]);

            res.json({
                success: true,
                user_status: user,
                debt_history: debtHistory.rows,
                compensation_history: compensationHistory.rows,
                summary: {
                    has_pending_debt: user.saldo_devedor_brl > 0 || user.saldo_devedor_usd > 0,
                    operations_blocked: user.operacoes_bloqueadas,
                    total_debt_brl: parseFloat(user.saldo_devedor_brl),
                    total_debt_usd: parseFloat(user.saldo_devedor_usd),
                    last_compensation: user.ultima_compensacao
                }
            });

        } catch (error) {
            console.error('Erro ao obter status de dívida:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    // =======================================
    // 🔧 DASHBOARD ADMINISTRATIVO
    // =======================================

    async getDebtDashboard(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            // Obter dashboard de saldos devedores
            const dashboard = await this.pool.query(`
                SELECT * FROM dashboard_saldos_devedores
                LIMIT $1 OFFSET $2
            `, [limit, offset]);

            // Obter estatísticas gerais
            const stats = await this.pool.query(`
                SELECT 
                    COUNT(DISTINCT u.id) as usuarios_com_divida,
                    SUM(u.saldo_devedor_brl) as total_divida_brl,
                    SUM(u.saldo_devedor_usd) as total_divida_usd,
                    COUNT(CASE WHEN u.operacoes_bloqueadas THEN 1 END) as usuarios_bloqueados,
                    COUNT(udh.id) as total_dividas_registradas,
                    SUM(dc.amount_compensated_brl) as total_compensado_brl,
                    SUM(dc.amount_compensated_usd) as total_compensado_usd
                FROM users u
                LEFT JOIN user_debt_history udh ON u.id = udh.user_id
                LEFT JOIN debt_compensations dc ON u.id = dc.user_id
                WHERE u.saldo_devedor_brl > 0 OR u.saldo_devedor_usd > 0
            `);

            res.json({
                success: true,
                dashboard: dashboard.rows,
                statistics: stats.rows[0],
                pagination: {
                    current_page: parseInt(page),
                    limit: parseInt(limit),
                    total_records: dashboard.rows.length
                }
            });

        } catch (error) {
            console.error('Erro ao obter dashboard:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    // =======================================
    // 🔧 FUNÇÕES ADMINISTRATIVAS
    // =======================================

    async forgiveDebt(req, res) {
        try {
            const { user_id, debt_type = 'ALL', reason = 'Perdão administrativo' } = req.body;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'user_id é obrigatório'
                });
            }

            // Zerar saldo devedor do usuário
            await this.pool.query(`
                UPDATE users SET 
                    saldo_devedor_brl = 0,
                    saldo_devedor_usd = 0,
                    operacoes_bloqueadas = FALSE
                WHERE id = $1
            `, [user_id]);

            // Marcar dívidas como perdoadas
            await this.pool.query(`
                UPDATE user_debt_history SET 
                    status = 'FORGIVEN',
                    reason = $2
                WHERE user_id = $1 AND status = 'PENDING'
            `, [user_id, reason]);

            // Log da ação
            await this.pool.query(`
                INSERT INTO system_logs (user_id, action, details, created_at)
                VALUES ($1, 'DEBT_FORGIVEN', $2, NOW())
            `, [user_id, JSON.stringify({ reason, admin_action: true })]);

            res.json({
                success: true,
                message: 'Dívida perdoada com sucesso'
            });

        } catch (error) {
            console.error('Erro ao perdoar dívida:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    async setMinimumBalance(req, res) {
        try {
            const { user_type, country_code, minimum_amount, applies_to = 'NEW_OPERATIONS' } = req.body;

            if (!user_type || !country_code || !minimum_amount) {
                return res.status(400).json({
                    success: false,
                    error: 'user_type, country_code e minimum_amount são obrigatórios'
                });
            }

            // Atualizar ou inserir configuração
            await this.pool.query(`
                INSERT INTO minimum_balance_config (user_type, country_code, minimum_amount, applies_to)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_type, country_code) DO UPDATE SET
                    minimum_amount = $3,
                    applies_to = $4,
                    updated_at = NOW()
            `, [user_type, country_code, minimum_amount, applies_to]);

            res.json({
                success: true,
                message: 'Configuração de saldo mínimo atualizada'
            });

        } catch (error) {
            console.error('Erro ao configurar saldo mínimo:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    async getCompensationReport(req, res) {
        try {
            const { start_date, end_date, user_id } = req.query;

            let query = `
                SELECT 
                    dc.id, dc.user_id, u.username, u.email,
                    dc.recharge_id, dc.amount_compensated_brl, dc.amount_compensated_usd,
                    dc.remaining_debt_brl, dc.remaining_debt_usd, dc.processed_at
                FROM debt_compensations dc
                JOIN users u ON dc.user_id = u.id
                WHERE 1=1
            `;
            
            const params = [];
            let paramCount = 0;

            if (start_date) {
                paramCount++;
                query += ` AND dc.processed_at >= $${paramCount}`;
                params.push(start_date);
            }

            if (end_date) {
                paramCount++;
                query += ` AND dc.processed_at <= $${paramCount}`;
                params.push(end_date);
            }

            if (user_id) {
                paramCount++;
                query += ` AND dc.user_id = $${paramCount}`;
                params.push(user_id);
            }

            query += ` ORDER BY dc.processed_at DESC LIMIT 100`;

            const result = await this.pool.query(query, params);

            res.json({
                success: true,
                compensations: result.rows,
                total_records: result.rows.length
            });

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }

    async healthCheck(req, res) {
        try {
            // Testar conexão com banco
            await this.pool.query('SELECT 1');
            
            res.json({
                success: true,
                service: 'Saldo Devedor API',
                status: 'healthy',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(503).json({
                success: false,
                service: 'Saldo Devedor API',
                status: 'unhealthy',
                error: error.message
            });
        }
    }
}

module.exports = SaldoDevedorAPI;
