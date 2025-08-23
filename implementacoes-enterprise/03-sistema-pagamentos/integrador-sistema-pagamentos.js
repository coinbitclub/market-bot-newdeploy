// =====================================================
// 🚀 SISTEMA INTEGRADOR - SALDO DEVEDOR E PAGAMENTOS
// =====================================================
// Implementa integração automática do sistema de saldo devedor
// com o sistema existente de trading e pagamentos

const { Pool } = require('pg');
const express = require('express');
const SistemaIntegradoSaldoDevedor = require('./sistema-integrado-saldo-devedor');
const SaldoDevedorAPI = require('./routes/saldo-devedor-api');

class IntegradorSistemaPagamentos {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        this.sistemaDebt = new SistemaIntegradoSaldoDevedor(this.pool);
        this.api = new SaldoDevedorAPI(this.pool);
        
        this.config = {
            enable_debt_system: true,
            auto_compensate: true,
            block_operations_with_debt: true,
            min_balance_enforcement: true
        };
    }

    // =======================================
    // 🎯 INTEGRAÇÃO COM SISTEMA EXISTENTE
    // =======================================

    // Wrapper para validação antes de operações
    async wrapValidateOperation(originalValidator) {
        return async (req, res, next) => {
            try {
                if (!this.config.enable_debt_system) {
                    return originalValidator(req, res, next);
                }

                const { user_id } = req.body || req.user || {};
                
                if (!user_id) {
                    return res.status(400).json({
                        success: false,
                        error: 'user_id é obrigatório'
                    });
                }

                // Executar validação de saldo devedor
                const debtValidation = await this.sistemaDebt.validateBeforeOperation(user_id, {
                    amount_brl: req.body.amount_brl || 0,
                    amount_usd: req.body.amount_usd || 0,
                    user_type: req.user?.user_type || 'BASIC',
                    country_code: req.user?.country_code || 'BRL',
                    operation_type: req.body.operation_type || 'TRADING'
                });

                if (!debtValidation.valid) {
                    return res.status(400).json({
                        success: false,
                        error: debtValidation.error,
                        message: debtValidation.message,
                        validation_details: debtValidation
                    });
                }

                // Adicionar dados de validação ao request
                req.debt_validation = debtValidation;
                
                // Continuar com validação original
                return originalValidator(req, res, next);

            } catch (error) {
                console.error('Erro na validação de saldo devedor:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Erro interno na validação'
                });
            }
        };
    }

    // Wrapper para processamento de comissões
    async wrapCommissionProcessing(originalProcessor) {
        return async (operationResult) => {
            try {
                // Executar processamento original primeiro
                const originalResult = await originalProcessor(operationResult);

                if (!this.config.enable_debt_system) {
                    return originalResult;
                }

                // Processar comissão com sistema de saldo devedor
                const debtResult = await this.sistemaDebt.processCommissionAfterOperation({
                    user_id: operationResult.user_id,
                    operation_id: operationResult.operation_id || operationResult.id,
                    profit_brl: operationResult.profit_brl || 0,
                    profit_usd: operationResult.profit_usd || 0,
                    subscription_status: operationResult.subscription_status || 'PREPAID'
                });

                // Combinar resultados
                return {
                    ...originalResult,
                    debt_system: debtResult,
                    commission_processed_with_debt: true
                };

            } catch (error) {
                console.error('Erro no processamento de comissão com dívida:', error);
                throw error;
            }
        };
    }

    // Wrapper para processamento de recargas
    async wrapRechargeProcessing(originalProcessor) {
        return async (rechargeData) => {
            try {
                if (!this.config.enable_debt_system || !this.config.auto_compensate) {
                    return originalProcessor(rechargeData);
                }

                // Processar recarga com compensação automática
                const debtResult = await this.sistemaDebt.processRechargeWithCompensation({
                    user_id: rechargeData.user_id,
                    amount_brl: rechargeData.amount_brl || 0,
                    amount_usd: rechargeData.amount_usd || 0,
                    recharge_id: rechargeData.recharge_id,
                    payment_method: rechargeData.payment_method || 'STRIPE',
                    force_compensation: true
                });

                // Executar processamento original apenas se não houve compensação total
                let originalResult = null;
                if (!debtResult.debt_compensation_applied || debtResult.remaining_balance_brl > 0 || debtResult.remaining_balance_usd > 0) {
                    // Ajustar valores para processamento original (apenas o que sobrou)
                    const adjustedRecharge = {
                        ...rechargeData,
                        amount_brl: debtResult.remaining_balance_brl || 0,
                        amount_usd: debtResult.remaining_balance_usd || 0
                    };
                    
                    if (adjustedRecharge.amount_brl > 0 || adjustedRecharge.amount_usd > 0) {
                        originalResult = await originalProcessor(adjustedRecharge);
                    }
                }

                return {
                    ...originalResult,
                    debt_compensation: debtResult,
                    recharge_processed_with_compensation: true
                };

            } catch (error) {
                console.error('Erro no processamento de recarga com compensação:', error);
                throw error;
            }
        };
    }

    // =======================================
    // 🔧 INTEGRAÇÃO COM APP.JS
    // =======================================

    setupExpressIntegration(app) {
        // Adicionar rotas da API de saldo devedor
        app.use('/api/debt', this.api.router);

        // Middleware global para logging de operações financeiras
        app.use('/api/operations', (req, res, next) => {
            // Interceptar resposta para log
            const originalSend = res.send;
            res.send = function(body) {
                if (req.method === 'POST' && body) {
                    try {
                        const responseData = typeof body === 'string' ? JSON.parse(body) : body;
                        if (responseData.success && responseData.profit) {
                            // Log da operação para auditoria
                            console.log(`💰 Operação finalizada - Usuário ${req.body.user_id}, Lucro: ${responseData.profit}`);
                        }
                    } catch (e) {
                        // Ignorar erro de parsing
                    }
                }
                originalSend.call(this, body);
            };
            next();
        });

        console.log('✅ Integração do sistema de saldo devedor configurada no Express');
    }

    // =======================================
    // 📊 MONITORAMENTO E RELATÓRIOS
    // =======================================

    async generateDailyReport() {
        try {
            const stats = await this.sistemaDebt.getSystemDebtStatistics();
            
            const report = {
                date: new Date().toISOString().split('T')[0],
                users_with_debt: stats.users_with_debt,
                total_debt_brl: parseFloat(stats.total_debt_brl || 0),
                total_debt_usd: parseFloat(stats.total_debt_usd || 0),
                blocked_users: stats.blocked_users,
                avg_debt_per_user: parseFloat(stats.avg_debt_per_user || 0),
                debt_records_today: stats.total_debt_records_today,
                compensated_today: parseFloat(stats.total_compensated_today || 0)
            };

            // Salvar relatório no banco
            await this.pool.query(`
                INSERT INTO daily_debt_reports (
                    report_date, users_with_debt, total_debt_brl, total_debt_usd,
                    blocked_users, avg_debt_per_user, debt_records_today, compensated_today,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (report_date) DO UPDATE SET
                    users_with_debt = $2,
                    total_debt_brl = $3,
                    total_debt_usd = $4,
                    blocked_users = $5,
                    avg_debt_per_user = $6,
                    debt_records_today = $7,
                    compensated_today = $8,
                    updated_at = NOW()
            `, [
                report.date,
                report.users_with_debt,
                report.total_debt_brl,
                report.total_debt_usd,
                report.blocked_users,
                report.avg_debt_per_user,
                report.debt_records_today,
                report.compensated_today
            ]);

            console.log('📊 Relatório diário de dívidas gerado:', report);
            return report;

        } catch (error) {
            console.error('Erro ao gerar relatório diário:', error);
            throw error;
        }
    }

    // =======================================
    // 🚀 DEPLOYMENT E ATIVAÇÃO
    // =======================================

    async deploy() {
        try {
            console.log('🚀 Iniciando deployment do sistema de saldo devedor...');

            // 1. Verificar saúde do sistema
            const healthCheck = await this.sistemaDebt.healthCheck();
            if (!healthCheck.healthy) {
                throw new Error(`Sistema não está saudável: ${healthCheck.error}`);
            }

            // 2. Executar migração se necessário
            try {
                await this.executeMigration();
            } catch (migrationError) {
                console.log('⚠️ Migração já executada ou erro esperado:', migrationError.message);
            }

            // 3. Verificar configurações
            await this.validateConfiguration();

            // 4. Testar funcionalidades principais
            await this.runSystemTests();

            // 5. Gerar relatório inicial
            await this.generateDailyReport();

            console.log('✅ Sistema de saldo devedor deployado com sucesso!');
            return {
                success: true,
                deployed_at: new Date().toISOString(),
                health_check: healthCheck
            };

        } catch (error) {
            console.error('❌ Erro no deployment:', error);
            throw error;
        }
    }

    async executeMigration() {
        const fs = require('fs');
        const path = require('path');
        
        const migrationPath = path.join(__dirname, 'migrate-saldo-devedor.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error('Arquivo de migração não encontrado');
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        await this.pool.query(migrationSQL);
        
        console.log('✅ Migração executada com sucesso');
    }

    async validateConfiguration() {
        // Verificar variáveis de ambiente necessárias
        const requiredEnvVars = [
            'DATABASE_URL',
            'MIN_BALANCE_BRAZIL_BRL',
            'MIN_BALANCE_FOREIGN_USD'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            throw new Error(`Variáveis de ambiente faltando: ${missingVars.join(', ')}`);
        }

        console.log('✅ Configuração validada');
    }

    async runSystemTests() {
        console.log('🧪 Executando testes do sistema...');

        // Teste 1: Verificar conexão com banco
        await this.pool.query('SELECT 1');

        // Teste 2: Verificar se funções existem
        const functions = await this.pool.query(`
            SELECT routine_name FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN ('registrar_saldo_devedor', 'compensar_divida_recarga', 'verificar_saldo_minimo_operacao')
        `);

        if (functions.rows.length !== 3) {
            throw new Error('Funções do banco de dados não encontradas');
        }

        // Teste 3: Verificar se tabelas existem
        const tables = await this.pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('user_debt_history', 'debt_compensations', 'minimum_balance_config')
        `);

        if (tables.rows.length !== 3) {
            throw new Error('Tabelas do banco de dados não encontradas');
        }

        console.log('✅ Todos os testes passaram');
    }

    // =======================================
    // 🔧 UTILITÁRIOS
    // =======================================

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.sistemaDebt.updateConfig(newConfig);
        console.log('✅ Configuração atualizada');
    }

    async getSystemStatus() {
        try {
            const healthCheck = await this.sistemaDebt.healthCheck();
            const stats = await this.sistemaDebt.getSystemDebtStatistics();
            
            return {
                healthy: healthCheck.healthy,
                config: this.config,
                statistics: stats,
                last_check: new Date().toISOString()
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                last_check: new Date().toISOString()
            };
        }
    }
}

// Instância singleton para uso global
let integradorInstance = null;

function getIntegrador() {
    if (!integradorInstance) {
        integradorInstance = new IntegradorSistemaPagamentos();
    }
    return integradorInstance;
}

// Para uso em linha de comando
if (require.main === module) {
    async function main() {
        const integrador = getIntegrador();
        
        try {
            const result = await integrador.deploy();
            console.log('🎉 Sistema de saldo devedor ativado com sucesso!');
            console.log(JSON.stringify(result, null, 2));
            process.exit(0);
        } catch (error) {
            console.error('❌ Falha na ativação:', error);
            process.exit(1);
        }
    }
    
    main();
}

module.exports = {
    IntegradorSistemaPagamentos,
    getIntegrador
};
