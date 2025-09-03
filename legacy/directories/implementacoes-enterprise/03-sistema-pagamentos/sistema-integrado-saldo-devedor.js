// =====================================================
// 💰 SISTEMA INTEGRADO DE SALDO DEVEDOR
// =====================================================
// Integra o sistema de saldo devedor com:
// 1. Validação automática antes de operações
// 2. Processamento de comissões
// 3. Compensação na recarga
// 4. Bloqueio de operações por saldo insuficiente

const { Pool } = require('pg');

class SistemaIntegradoSaldoDevedor {
    constructor(pool) {
        this.pool = pool;
        this.config = {
            // Configurações padrão
            default_commission_rate: 0.10, // 10%
            allow_negative_balance: true,   // Permitir saldo negativo temporário
            auto_compensate_recharge: true, // Compensação automática
            block_operations_with_debt: true, // Bloquear operações com dívida
            min_balance_enforcement: true,  // Aplicar saldo mínimo
            
            // Saldos mínimos por tipo de usuário
            minimum_balances: {
                BASIC: { BRL: 100.00, USD: 20.00 },
                PREMIUM: { BRL: 50.00, USD: 10.00 },
                VIP: { BRL: 25.00, USD: 5.00 },
                ENTERPRISE: { BRL: 500.00, USD: 100.00 }
            }
        };
    }

    // =======================================
    // 🎯 VALIDAÇÃO ANTES DE OPERAÇÃO
    // =======================================

    async validateBeforeOperation(userId, operationData = {}) {
        try {
            const {
                amount_brl = 0,
                amount_usd = 0,
                user_type = 'BASIC',
                country_code = 'BRL',
                operation_type = 'TRADING'
            } = operationData;

            // 1. Verificar se usuário existe e obter dados
            const userQuery = await this.pool.query(`
                SELECT 
                    id, username, balance_brl, balance_usd,
                    saldo_devedor_brl, saldo_devedor_usd, operacoes_bloqueadas,
                    subscription_status, user_type as current_type
                FROM users WHERE id = $1
            `, [userId]);

            if (userQuery.rows.length === 0) {
                return {
                    valid: false,
                    error: 'USUARIO_NAO_ENCONTRADO',
                    message: 'Usuário não encontrado'
                };
            }

            const user = userQuery.rows[0];

            // 2. Verificar se usuário está bloqueado por dívida
            if (this.config.block_operations_with_debt && user.operacoes_bloqueadas) {
                return {
                    valid: false,
                    error: 'OPERACOES_BLOQUEADAS_DIVIDA',
                    message: 'Operações bloqueadas devido a saldo devedor pendente',
                    debt_brl: parseFloat(user.saldo_devedor_brl),
                    debt_usd: parseFloat(user.saldo_devedor_usd)
                };
            }

            // 3. Verificar saldo mínimo
            if (this.config.min_balance_enforcement) {
                const minBalanceCheck = await this.pool.query(`
                    SELECT verificar_saldo_minimo_operacao($1, $2, $3) as validation
                `, [userId, user_type || user.current_type, country_code]);

                const validation = minBalanceCheck.rows[0].validation;

                if (!validation.can_operate) {
                    return {
                        valid: false,
                        error: 'SALDO_MINIMO_INSUFICIENTE',
                        message: validation.block_reason,
                        minimum_required: validation.minimum_required,
                        available_balance: validation.available_balance
                    };
                }
            }

            // 4. Verificar se tem saldo para a operação específica
            if (amount_brl > 0 || amount_usd > 0) {
                const insufficient_brl = amount_brl > 0 && user.balance_brl < amount_brl;
                const insufficient_usd = amount_usd > 0 && user.balance_usd < amount_usd;

                if (insufficient_brl || insufficient_usd) {
                    return {
                        valid: false,
                        error: 'SALDO_INSUFICIENTE_OPERACAO',
                        message: 'Saldo insuficiente para esta operação',
                        required_brl: amount_brl,
                        required_usd: amount_usd,
                        available_brl: parseFloat(user.balance_brl),
                        available_usd: parseFloat(user.balance_usd)
                    };
                }
            }

            // 5. Verificar posições ativas (máximo permitido)
            const activePositions = await this.pool.query(`
                SELECT COUNT(*) as count 
                FROM active_positions 
                WHERE user_id = $1 AND status = 'ACTIVE'
            `, [userId]);

            const maxPositions = parseInt(process.env.MAX_POSITIONS_PER_USER) || 2;
            
            if (parseInt(activePositions.rows[0].count) >= maxPositions) {
                return {
                    valid: false,
                    error: 'MAXIMO_POSICOES_ATINGIDO',
                    message: `Máximo de ${maxPositions} posições ativas atingido`,
                    active_positions: parseInt(activePositions.rows[0].count),
                    max_allowed: maxPositions
                };
            }

            // ✅ Validação passou
            return {
                valid: true,
                user_data: user,
                message: 'Usuário válido para operação'
            };

        } catch (error) {
            console.error('Erro na validação de operação:', error);
            return {
                valid: false,
                error: 'ERRO_INTERNO',
                message: 'Erro interno na validação'
            };
        }
    }

    // =======================================
    // 💰 PROCESSAR COMISSÃO COM SALDO DEVEDOR
    // =======================================

    async processCommissionAfterOperation(operationResult) {
        try {
            const {
                user_id,
                operation_id,
                profit_brl = 0,
                profit_usd = 0,
                subscription_status = 'PREPAID'
            } = operationResult;

            // Apenas cobrar comissão se houve LUCRO
            if (profit_brl <= 0 && profit_usd <= 0) {
                return {
                    success: true,
                    commission_charged: false,
                    message: 'Operação sem lucro - sem cobrança de comissão'
                };
            }

            // Determinar taxa de comissão baseada na assinatura
            const commission_rate = subscription_status === 'active' ? 0.10 : 0.20; // 10% ou 20%

            // Calcular comissão
            const commission_brl = profit_brl * commission_rate;
            const commission_usd = profit_usd * commission_rate;

            // Processar comissão (permite criar saldo devedor)
            const commissionResult = await this.pool.query(`
                SELECT registrar_saldo_devedor($1, $2, $3, $4, $5) as result
            `, [
                user_id,
                operation_id,
                commission_brl,
                commission_usd,
                `Comissão ${(commission_rate * 100)}% sobre lucro da operação #${operation_id}`
            ]);

            const result = commissionResult.rows[0].result;

            // Log da comissão
            await this.pool.query(`
                INSERT INTO commission_history (
                    user_id, operation_id, profit_brl, profit_usd, 
                    commission_brl, commission_usd, commission_rate,
                    debt_created, processed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            `, [
                user_id, operation_id, profit_brl, profit_usd,
                commission_brl, commission_usd, commission_rate,
                result.debt_created
            ]);

            return {
                success: true,
                commission_charged: true,
                commission_brl,
                commission_usd,
                commission_rate,
                debt_created: result.debt_created,
                ...result
            };

        } catch (error) {
            console.error('Erro ao processar comissão:', error);
            throw error;
        }
    }

    // =======================================
    // 🔄 COMPENSAÇÃO AUTOMÁTICA NA RECARGA
    // =======================================

    async processRechargeWithCompensation(rechargeData) {
        try {
            const {
                user_id,
                amount_brl = 0,
                amount_usd = 0,
                recharge_id = null,
                payment_method = 'STRIPE',
                force_compensation = true
            } = rechargeData;

            console.log(`💰 Processando recarga: ${amount_brl} BRL / ${amount_usd} USD para usuário ${user_id}`);

            // 1. Verificar se usuário tem dívidas pendentes
            const debtQuery = await this.pool.query(`
                SELECT saldo_devedor_brl, saldo_devedor_usd, operacoes_bloqueadas
                FROM users WHERE id = $1
            `, [user_id]);

            if (debtQuery.rows.length === 0) {
                throw new Error('Usuário não encontrado');
            }

            const userDebt = debtQuery.rows[0];
            const has_debt = userDebt.saldo_devedor_brl > 0 || userDebt.saldo_devedor_usd > 0;

            let result;

            if (has_debt && (this.config.auto_compensate_recharge || force_compensation)) {
                console.log(`🔄 Aplicando compensação automática de dívida`);
                
                // Aplicar compensação usando a função do banco
                const compensationResult = await this.pool.query(`
                    SELECT compensar_divida_recarga($1, $2, $3, $4) as result
                `, [user_id, amount_brl, amount_usd, recharge_id]);

                result = {
                    success: true,
                    debt_compensation_applied: true,
                    recharge_id,
                    payment_method,
                    ...compensationResult.rows[0].result
                };

                // Notificar usuário sobre compensação
                await this.sendCompensationNotification(user_id, result);

            } else {
                console.log(`📈 Recarga sem compensação de dívida`);
                
                // Adicionar saldo normalmente
                await this.pool.query(`
                    UPDATE users SET 
                        balance_brl = balance_brl + $1,
                        balance_usd = balance_usd + $2
                    WHERE id = $3
                `, [amount_brl, amount_usd, user_id]);

                result = {
                    success: true,
                    debt_compensation_applied: false,
                    recharge_id,
                    payment_method,
                    balance_added_brl: amount_brl,
                    balance_added_usd: amount_usd,
                    message: 'Recarga processada sem compensação de dívida'
                };
            }

            // Log da recarga
            await this.pool.query(`
                INSERT INTO recharge_history (
                    user_id, recharge_id, amount_brl, amount_usd, 
                    payment_method, compensation_applied, processed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
                user_id, recharge_id, amount_brl, amount_usd,
                payment_method, result.debt_compensation_applied
            ]);

            console.log(`✅ Recarga processada com sucesso`);
            return result;

        } catch (error) {
            console.error('Erro ao processar recarga:', error);
            throw error;
        }
    }

    // =======================================
    // 📊 RELATÓRIOS E ESTATÍSTICAS
    // =======================================

    async getUserDebtSummary(userId) {
        try {
            const summary = await this.pool.query(`
                SELECT 
                    u.id, u.username, u.balance_brl, u.balance_usd,
                    u.saldo_devedor_brl, u.saldo_devedor_usd, u.operacoes_bloqueadas,
                    u.ultima_compensacao,
                    COUNT(udh.id) as total_debt_records,
                    SUM(CASE WHEN udh.status = 'PENDING' THEN udh.amount_brl ELSE 0 END) as pending_debt_brl,
                    SUM(CASE WHEN udh.status = 'PENDING' THEN udh.amount_usd ELSE 0 END) as pending_debt_usd,
                    COUNT(dc.id) as total_compensations,
                    SUM(dc.amount_compensated_brl) as total_compensated_brl,
                    SUM(dc.amount_compensated_usd) as total_compensated_usd
                FROM users u
                LEFT JOIN user_debt_history udh ON u.id = udh.user_id
                LEFT JOIN debt_compensations dc ON u.id = dc.user_id
                WHERE u.id = $1
                GROUP BY u.id, u.username, u.balance_brl, u.balance_usd,
                         u.saldo_devedor_brl, u.saldo_devedor_usd, u.operacoes_bloqueadas, u.ultima_compensacao
            `, [userId]);

            return summary.rows[0] || null;

        } catch (error) {
            console.error('Erro ao obter resumo de dívida:', error);
            throw error;
        }
    }

    async getSystemDebtStatistics() {
        try {
            const stats = await this.pool.query(`
                SELECT 
                    COUNT(DISTINCT u.id) as users_with_debt,
                    SUM(u.saldo_devedor_brl) as total_debt_brl,
                    SUM(u.saldo_devedor_usd) as total_debt_usd,
                    COUNT(CASE WHEN u.operacoes_bloqueadas THEN 1 END) as blocked_users,
                    AVG(u.saldo_devedor_brl + u.saldo_devedor_usd) as avg_debt_per_user,
                    COUNT(udh.id) as total_debt_records_today,
                    SUM(dc.amount_compensated_brl + dc.amount_compensated_usd) as total_compensated_today
                FROM users u
                LEFT JOIN user_debt_history udh ON u.id = udh.user_id AND udh.created_at >= CURRENT_DATE
                LEFT JOIN debt_compensations dc ON u.id = dc.user_id AND dc.processed_at >= CURRENT_DATE
                WHERE u.saldo_devedor_brl > 0 OR u.saldo_devedor_usd > 0
            `);

            return stats.rows[0];

        } catch (error) {
            console.error('Erro ao obter estatísticas do sistema:', error);
            throw error;
        }
    }

    // =======================================
    // 🔧 FUNÇÕES AUXILIARES
    // =======================================

    async sendCompensationNotification(userId, compensationData) {
        try {
            // Implementar notificação para o usuário
            console.log(`📧 Enviando notificação de compensação para usuário ${userId}:`, compensationData);
            
            // Aqui pode integrar com sistema de email/SMS/push notification
            // Por agora, apenas log no banco
            await this.pool.query(`
                INSERT INTO user_notifications (
                    user_id, type, title, message, data, created_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
            `, [
                userId,
                'DEBT_COMPENSATION',
                'Compensação de Dívida Aplicada',
                `Sua recarga foi parcialmente usada para compensar dívidas pendentes.`,
                JSON.stringify(compensationData)
            ]);

        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
            // Não falhar por causa de notificação
        }
    }

    // Verificar se sistema está configurado corretamente
    async healthCheck() {
        try {
            // Testar funções principais
            await this.pool.query('SELECT 1');
            
            // Verificar se tabelas existem
            const tables = await this.pool.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('user_debt_history', 'debt_compensations', 'minimum_balance_config')
            `);

            const requiredTables = ['user_debt_history', 'debt_compensations', 'minimum_balance_config'];
            const existingTables = tables.rows.map(row => row.table_name);
            const missingTables = requiredTables.filter(table => !existingTables.includes(table));

            if (missingTables.length > 0) {
                return {
                    healthy: false,
                    error: `Tabelas faltando: ${missingTables.join(', ')}`,
                    suggestion: 'Execute migrate-saldo-devedor.sql'
                };
            }

            return {
                healthy: true,
                message: 'Sistema de saldo devedor funcionando corretamente'
            };

        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    // Configurar sistema
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('✅ Configuração do sistema de saldo devedor atualizada');
    }
}

module.exports = SistemaIntegradoSaldoDevedor;
