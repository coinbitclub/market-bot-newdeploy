/**
 * ✅ PLAN VALIDATOR
 * =================
 * 
 * Microserviço para validação de planos e limites
 * Parte da Etapa 2: Sistema Financeiro Completo
 */

const { createLogger } = require('../../shared/utils/logger');

class PlanValidator {
    constructor(pool, config = {}) {
        this.logger = createLogger('PlanValidator');
        this.pool = pool;
        
        this.config = {
            // Saldos mínimos baseados nas especificações
            minimumBalances: {
                BR: 100,      // R$ 100 para Brasil
                FOREIGN: 20   // $20 para Exterior
            },
            
            // Limites por plano
            planLimits: {
                MONTHLY: {
                    BR: { min: 0, max: 10000 },      // Mensal BR
                    FOREIGN: { min: 0, max: 2000 }   // Mensal Exterior
                },
                PREPAID: {
                    BR: { min: 100, max: 50000 },    // Pré-pago BR
                    FOREIGN: { min: 20, max: 10000 } // Pré-pago Exterior
                }
            },
            
            // Configurações de operação
            maxConcurrentOperations: 2,
            operationCooldown: 120, // 2 minutos em segundos
            
            ...config
        };

        this.logger.info('PlanValidator inicializado', { config: this.config });
    }

    /**
     * Validar limites do usuário para operação
     */
    async validateUserLimits(userId, operationData) {
        try {
            const { amount, currency, type = 'TRADE' } = operationData;
            
            this.logger.info('Validando limites do usuário', { 
                userId, 
                amount, 
                currency, 
                type 
            });

            // 1. Obter dados do usuário
            const userData = await this.getUserData(userId);
            
            // 2. Calcular saldos totais
            const balanceInfo = this.calculateBalances(userData);
            
            // 3. Determinar modo de operação
            const operationMode = this.determineOperationMode(userData, balanceInfo);
            
            // 4. Validar se pode operar
            if (operationMode === 'TESTNET') {
                return {
                    allowed: false,
                    mode: 'TESTNET',
                    reason: 'Insufficient balance and no active subscription - TESTNET mode only',
                    requirements: {
                        minimumBalance: this.config.minimumBalances,
                        activeSubscription: 'MONTHLY plan required',
                        currentBalance: balanceInfo
                    },
                    action: 'Please recharge your account or subscribe to a monthly plan'
                };
            }

            // 5. Validar saldo específico para a operação
            const balanceValidation = await this.validateOperationBalance(userData, amount, currency);
            
            // 6. Validar limites do plano
            const planValidation = this.validatePlanLimits(userData, amount, currency);
            
            // 7. Validar operações concorrentes
            const concurrencyValidation = await this.validateConcurrentOperations(userId);
            
            // 8. Validar cooldown
            const cooldownValidation = await this.validateOperationCooldown(userId);

            // Consolidar validações
            const validations = [
                balanceValidation,
                planValidation,
                concurrencyValidation,
                cooldownValidation
            ];

            const failedValidations = validations.filter(v => !v.allowed);
            const allowed = failedValidations.length === 0;

            const result = {
                allowed,
                mode: 'MANAGEMENT',
                userId,
                operationData,
                balanceInfo,
                validations: {
                    balance: balanceValidation,
                    plan: planValidation,
                    concurrency: concurrencyValidation,
                    cooldown: cooldownValidation
                },
                failedValidations: failedValidations.map(v => v.reason),
                timestamp: new Date().toISOString()
            };

            this.logger.info('Validação de limites concluída', result);

            return result;

        } catch (error) {
            this.logger.error('Erro na validação de limites', { error: error.message, userId, operationData });
            throw error;
        }
    }

    /**
     * Obter dados do usuário
     */
    async getUserData(userId) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    id, username, email, plan_type, affiliate_type,
                    balance_real_brl, balance_real_usd,
                    balance_admin_brl, balance_admin_usd,
                    balance_commission_brl, balance_commission_usd,
                    created_at, updated_at,
                    last_operation_at
                FROM users 
                WHERE id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                throw new Error('Usuário não encontrado');
            }

            return result.rows[0];

        } finally {
            client.release();
        }
    }

    /**
     * Calcular saldos do usuário
     */
    calculateBalances(userData) {
        const realBRL = parseFloat(userData.balance_real_brl) || 0;
        const realUSD = parseFloat(userData.balance_real_usd) || 0;
        const adminBRL = parseFloat(userData.balance_admin_brl) || 0;
        const adminUSD = parseFloat(userData.balance_admin_usd) || 0;
        const commissionBRL = parseFloat(userData.balance_commission_brl) || 0;
        const commissionUSD = parseFloat(userData.balance_commission_usd) || 0;

        return {
            real: {
                brl: realBRL,
                usd: realUSD,
                total: realBRL + realUSD
            },
            admin: {
                brl: adminBRL,
                usd: adminUSD,
                total: adminBRL + adminUSD
            },
            commission: {
                brl: commissionBRL,
                usd: commissionUSD,
                total: commissionBRL + commissionUSD
            },
            operational: {
                brl: realBRL + adminBRL,
                usd: realUSD + adminUSD,
                total: realBRL + realUSD + adminBRL + adminUSD
            },
            grandTotal: realBRL + realUSD + adminBRL + adminUSD + commissionBRL + commissionUSD
        };
    }

    /**
     * Determinar modo de operação
     */
    determineOperationMode(userData, balanceInfo) {
        const hasActiveSubscription = userData.plan_type === 'MONTHLY';
        const hasMinimumBalance = 
            balanceInfo.operational.brl >= this.config.minimumBalances.BR ||
            balanceInfo.operational.usd >= this.config.minimumBalances.FOREIGN;

        // TESTNET apenas quando NÃO há saldo suficiente E NÃO há assinatura ativa
        if (!hasMinimumBalance && !hasActiveSubscription) {
            return 'TESTNET';
        }

        return 'MANAGEMENT';
    }

    /**
     * Validar saldo para operação específica
     */
    async validateOperationBalance(userData, amount, currency) {
        try {
            const balanceInfo = this.calculateBalances(userData);
            const availableBalance = currency === 'BRL' ? 
                balanceInfo.operational.brl : balanceInfo.operational.usd;

            const sufficient = availableBalance >= amount;

            return {
                allowed: sufficient,
                type: 'balance',
                availableBalance,
                requestedAmount: amount,
                currency,
                deficit: sufficient ? 0 : amount - availableBalance,
                reason: sufficient ? 'Sufficient balance' : `Insufficient balance. Available: ${availableBalance} ${currency}, Required: ${amount} ${currency}`
            };

        } catch (error) {
            this.logger.error('Erro na validação de saldo', { error: error.message });
            throw error;
        }
    }

    /**
     * Validar limites do plano
     */
    validatePlanLimits(userData, amount, currency) {
        try {
            const planType = userData.plan_type || 'PREPAID';
            const country = currency === 'BRL' ? 'BR' : 'FOREIGN';
            
            const limits = this.config.planLimits[planType] && this.config.planLimits[planType][country];
            
            if (!limits) {
                return {
                    allowed: true,
                    type: 'plan',
                    reason: 'No specific limits defined for this plan'
                };
            }

            const withinLimits = amount >= limits.min && amount <= limits.max;

            return {
                allowed: withinLimits,
                type: 'plan',
                planType,
                country,
                limits,
                requestedAmount: amount,
                reason: withinLimits ? 
                    'Amount within plan limits' : 
                    `Amount outside plan limits. Min: ${limits.min}, Max: ${limits.max}, Requested: ${amount}`
            };

        } catch (error) {
            this.logger.error('Erro na validação de limites do plano', { error: error.message });
            throw error;
        }
    }

    /**
     * Validar operações concorrentes
     */
    async validateConcurrentOperations(userId) {
        const client = await this.pool.connect();
        
        try {
            // Contar operações ativas (mock - seria tabela de operações real)
            const result = await client.query(`
                SELECT COUNT(*) as active_operations
                FROM transactions 
                WHERE user_id = $1 
                AND type LIKE '%TRADE%' 
                AND status = 'PENDING'
                AND created_at > NOW() - INTERVAL '1 hour'
            `, [userId]);

            const activeOperations = parseInt(result.rows[0].active_operations) || 0;
            const allowed = activeOperations < this.config.maxConcurrentOperations;

            return {
                allowed,
                type: 'concurrency',
                activeOperations,
                maxAllowed: this.config.maxConcurrentOperations,
                reason: allowed ? 
                    'Concurrent operations within limit' : 
                    `Too many concurrent operations. Active: ${activeOperations}, Max: ${this.config.maxConcurrentOperations}`
            };

        } finally {
            client.release();
        }
    }

    /**
     * Validar cooldown entre operações
     */
    async validateOperationCooldown(userId) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT last_operation_at 
                FROM users 
                WHERE id = $1
            `, [userId]);

            const lastOperation = result.rows[0].last_operation_at;
            
            if (!lastOperation) {
                return {
                    allowed: true,
                    type: 'cooldown',
                    reason: 'No previous operations'
                };
            }

            const now = new Date();
            const lastOpTime = new Date(lastOperation);
            const timeDiff = (now.getTime() - lastOpTime.getTime()) / 1000; // em segundos
            
            const allowed = timeDiff >= this.config.operationCooldown;

            return {
                allowed,
                type: 'cooldown',
                lastOperation: lastOperation,
                timeSinceLastOp: Math.floor(timeDiff),
                cooldownRequired: this.config.operationCooldown,
                remainingCooldown: allowed ? 0 : this.config.operationCooldown - Math.floor(timeDiff),
                reason: allowed ? 
                    'Cooldown period satisfied' : 
                    `Cooldown period not satisfied. Wait ${this.config.operationCooldown - Math.floor(timeDiff)} more seconds`
            };

        } finally {
            client.release();
        }
    }

    /**
     * Atualizar último tempo de operação
     */
    async updateLastOperationTime(userId) {
        const client = await this.pool.connect();
        
        try {
            await client.query(`
                UPDATE users 
                SET last_operation_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
            `, [userId]);

            this.logger.info('Tempo de última operação atualizado', { userId });

        } finally {
            client.release();
        }
    }

    /**
     * Obter resumo de validação para usuário
     */
    async getUserValidationSummary(userId) {
        try {
            const userData = await this.getUserData(userId);
            const balanceInfo = this.calculateBalances(userData);
            const operationMode = this.determineOperationMode(userData, balanceInfo);

            return {
                userId,
                operationMode,
                balanceInfo,
                planType: userData.plan_type,
                canOperate: operationMode === 'MANAGEMENT',
                requirements: operationMode === 'TESTNET' ? {
                    minimumBalance: this.config.minimumBalances,
                    activeSubscription: 'MONTHLY plan',
                    current: balanceInfo
                } : null,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error('Erro ao obter resumo de validação', { error: error.message, userId });
            throw error;
        }
    }

    /**
     * Simular validação para diferentes cenários
     */
    async simulateValidation(scenarios) {
        try {
            const results = [];

            for (const scenario of scenarios) {
                try {
                    const result = await this.validateUserLimits(scenario.userId, scenario.operation);
                    results.push({
                        scenario: scenario.name,
                        input: scenario,
                        output: result
                    });
                } catch (error) {
                    results.push({
                        scenario: scenario.name,
                        input: scenario,
                        error: error.message
                    });
                }
            }

            return {
                simulations: results,
                summary: {
                    total: scenarios.length,
                    successful: results.filter(r => !r.error).length,
                    failed: results.filter(r => r.error).length
                }
            };

        } catch (error) {
            this.logger.error('Erro na simulação de validação', { error: error.message });
            throw error;
        }
    }
}

module.exports = PlanValidator;
