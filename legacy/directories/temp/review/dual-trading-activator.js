/**
 * 🚀 SISTEMA DE ATIVAÇÃO DUPLA PARA TRADING REAL
 * ==============================================
 * 
 * Ativa simultaneamente operações em testnet e mainnet
 * Resolve problemas de IP fixo
 * Garante execução real de trades
 * 
 * Data: 11/08/2025
 * Autor: CoinbitClub Emergency Team
 */

console.log('🚀 ATIVAÇÃO DUPLA - TESTNET + MAINNET');
console.log('=====================================');

const { Pool } = require('pg');
const EmergencyIPFixer = require('./emergency-ip-fixer.js');
const RealTradingExecutor = require('./real-trading-executor.js');

class DualTradingActivator {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        this.ipFixer = new EmergencyIPFixer();
        this.realExecutor = new RealTradingExecutor();

        this.activationConfig = {
            testnet_enabled: true,
            mainnet_enabled: true,
            simultaneous_mode: true,
            risk_management: 'ENHANCED',
            ip_protection: 'AUTO'
        };

        console.log('✅ Dual Trading Activator inicializado');
    }

    /**
     * 🚀 ATIVAÇÃO COMPLETA DO SISTEMA DUAL
     */
    async activateFullDualSystem() {
        console.log('\n🚀 INICIANDO ATIVAÇÃO COMPLETA DO SISTEMA DUAL...');
        console.log('================================================');

        const activation = {
            timestamp: new Date().toISOString(),
            phase: 'starting',
            steps_completed: [],
            testnet_status: 'pending',
            mainnet_status: 'pending',
            users_activated: 0,
            critical_errors: [],
            success: false
        };

        try {
            // FASE 1: Correção de IP de Emergência
            console.log('\n📡 FASE 1: Correção de IP e Conectividade');
            console.log('=========================================');
            activation.phase = 'ip_fixing';

            const ipFixResults = await this.ipFixer.executeEmergencyFix();
            activation.steps_completed.push('emergency_ip_fix');

            if (!ipFixResults.success) {
                activation.critical_errors.push('IP_FIX_FAILED');
                console.log('🚨 CRÍTICO: Correção de IP falhou');
                return await this.handleCriticalFailure(activation, 'IP fix failed');
            }

            // FASE 2: Preparação do Ambiente Dual
            console.log('\n⚙️ FASE 2: Preparação do Ambiente Dual');
            console.log('======================================');
            activation.phase = 'dual_preparation';

            const dualPrep = await this.prepareDualEnvironment();
            activation.steps_completed.push('dual_environment_prep');

            if (!dualPrep.success) {
                activation.critical_errors.push('DUAL_PREP_FAILED');
                return await this.handleCriticalFailure(activation, 'Dual preparation failed');
            }

            // FASE 3: Ativação Testnet
            console.log('\n🧪 FASE 3: Ativação Testnet');
            console.log('===========================');
            activation.phase = 'testnet_activation';

            const testnetResult = await this.activateTestnetTrading();
            activation.testnet_status = testnetResult.success ? 'active' : 'failed';
            activation.steps_completed.push('testnet_activation');

            if (!testnetResult.success) {
                activation.critical_errors.push('TESTNET_ACTIVATION_FAILED');
            }

            // FASE 4: Ativação Mainnet
            console.log('\n💰 FASE 4: Ativação Mainnet');
            console.log('===========================');
            activation.phase = 'mainnet_activation';

            const mainnetResult = await this.activateMainnetTrading();
            activation.mainnet_status = mainnetResult.success ? 'active' : 'failed';
            activation.steps_completed.push('mainnet_activation');

            if (!mainnetResult.success) {
                activation.critical_errors.push('MAINNET_ACTIVATION_FAILED');
            }

            // FASE 5: Sincronização Dual
            console.log('\n🔄 FASE 5: Sincronização Dual');
            console.log('=============================');
            activation.phase = 'dual_synchronization';

            const syncResult = await this.synchronizeDualOperations();
            activation.steps_completed.push('dual_synchronization');

            // FASE 6: Validação Final
            console.log('\n✅ FASE 6: Validação Final');
            console.log('==========================');
            activation.phase = 'final_validation';

            const validation = await this.validateDualSystem();
            activation.users_activated = validation.users_active;
            activation.success = validation.system_operational;
            activation.steps_completed.push('final_validation');

            // RESUMO FINAL
            await this.generateActivationReport(activation);

            if (activation.success) {
                console.log('\n🟢 SISTEMA DUAL ATIVADO COM SUCESSO!');
                console.log('===================================');
                console.log(`🧪 Testnet: ${activation.testnet_status.toUpperCase()}`);
                console.log(`💰 Mainnet: ${activation.mainnet_status.toUpperCase()}`);
                console.log(`👥 Usuários ativos: ${activation.users_activated}`);
                console.log(`🚀 Pronto para trading real simultâneo!`);
            } else {
                console.log('\n🔴 ATIVAÇÃO PARCIAL - VERIFICAR LOGS');
                console.log('===================================');
                await this.generateTroubleshootingGuide(activation);
            }

            return activation;

        } catch (error) {
            console.error('\n❌ ERRO CRÍTICO NA ATIVAÇÃO:', error);
            activation.critical_errors.push('ACTIVATION_SYSTEM_FAILURE');
            activation.error = error.message;
            return activation;
        }
    }

    /**
     * ⚙️ PREPARAR AMBIENTE DUAL
     */
    async prepareDualEnvironment() {
        console.log('  ⚙️ Preparando ambiente para operação dual...');

        const preparation = {
            success: false,
            database_ready: false,
            configs_updated: false,
            environments_validated: false
        };

        try {
            // Verificar estrutura da base de dados
            console.log('    💾 Verificando estrutura da base de dados...');
            const dbCheck = await this.verifyDatabaseStructure();
            preparation.database_ready = dbCheck.success;

            if (!dbCheck.success) {
                console.log('    🚨 Base de dados não está pronta');
                return preparation;
            }

            // Atualizar configurações do sistema
            console.log('    ⚙️ Atualizando configurações...');
            const configUpdate = await this.updateSystemConfigurations();
            preparation.configs_updated = configUpdate.success;

            // Validar ambos os ambientes
            console.log('    🔍 Validando ambientes testnet e mainnet...');
            const envValidation = await this.validateBothEnvironments();
            preparation.environments_validated = envValidation.success;

            preparation.success = preparation.database_ready && 
                                   preparation.configs_updated && 
                                   preparation.environments_validated;

            console.log(`    📊 Preparação: ${preparation.success ? 'CONCLUÍDA' : 'FALHOU'}`);
            return preparation;

        } catch (error) {
            console.error('    ❌ Erro na preparação:', error.message);
            preparation.error = error.message;
            return preparation;
        }
    }

    /**
     * 🧪 ATIVAR TRADING TESTNET
     */
    async activateTestnetTrading() {
        console.log('  🧪 Ativando trading testnet...');

        const testnetActivation = {
            success: false,
            users_tested: 0,
            working_connections: 0,
            test_trades_executed: 0
        };

        try {
            // Buscar usuários com configuração testnet
            const testnetUsers = await this.getTestnetUsers();
            testnetActivation.users_tested = testnetUsers.length;

            console.log(`    👥 Testando ${testnetUsers.length} usuários testnet...`);

            for (const user of testnetUsers) {
                try {
                    // Testar conexão testnet
                    const connectionTest = await this.testUserTestnetConnection(user);
                    
                    if (connectionTest.success) {
                        testnetActivation.working_connections++;
                        
                        // Executar trade de teste
                        const testTrade = await this.executeTestnetTestTrade(user);
                        if (testTrade.success) {
                            testnetActivation.test_trades_executed++;
                        }
                    }
                } catch (userError) {
                    console.log(`    ⚠️ ${user.username}: ${userError.message}`);
                }
            }

            testnetActivation.success = testnetActivation.working_connections > 0;
            console.log(`    📊 Testnet: ${testnetActivation.working_connections}/${testnetActivation.users_tested} conexões ativas`);

            return testnetActivation;

        } catch (error) {
            console.error('    ❌ Erro na ativação testnet:', error.message);
            testnetActivation.error = error.message;
            return testnetActivation;
        }
    }

    /**
     * 💰 ATIVAR TRADING MAINNET
     */
    async activateMainnetTrading() {
        console.log('  💰 Ativando trading mainnet...');

        const mainnetActivation = {
            success: false,
            users_tested: 0,
            working_connections: 0,
            real_trades_ready: 0
        };

        try {
            // Buscar usuários com configuração mainnet
            const mainnetUsers = await this.getMainnetUsers();
            mainnetActivation.users_tested = mainnetUsers.length;

            console.log(`    👥 Testando ${mainnetUsers.length} usuários mainnet...`);

            for (const user of mainnetUsers) {
                try {
                    // Testar conexão mainnet
                    const connectionTest = await this.testUserMainnetConnection(user);
                    
                    if (connectionTest.success) {
                        mainnetActivation.working_connections++;
                        
                        // Verificar se está pronto para trades reais
                        const readinessCheck = await this.checkRealTradingReadiness(user);
                        if (readinessCheck.ready) {
                            mainnetActivation.real_trades_ready++;
                        }
                    }
                } catch (userError) {
                    console.log(`    ⚠️ ${user.username}: ${userError.message}`);
                }
            }

            mainnetActivation.success = mainnetActivation.working_connections > 0;
            console.log(`    📊 Mainnet: ${mainnetActivation.working_connections}/${mainnetActivation.users_tested} conexões ativas`);

            return mainnetActivation;

        } catch (error) {
            console.error('    ❌ Erro na ativação mainnet:', error.message);
            mainnetActivation.error = error.message;
            return mainnetActivation;
        }
    }

    /**
     * 🔄 SINCRONIZAR OPERAÇÕES DUAIS
     */
    async synchronizeDualOperations() {
        console.log('  🔄 Sincronizando operações duais...');

        const synchronization = {
            success: false,
            sync_rules_applied: 0,
            users_synchronized: 0,
            conflicts_resolved: 0
        };

        try {
            // Aplicar regras de sincronização
            console.log('    ⚙️ Aplicando regras de sincronização...');
            const syncRules = await this.applySynchronizationRules();
            synchronization.sync_rules_applied = syncRules.rules_applied;

            // Sincronizar usuários
            console.log('    👥 Sincronizando usuários...');
            const userSync = await this.synchronizeAllUsers();
            synchronization.users_synchronized = userSync.users_synced;

            // Resolver conflitos
            console.log('    🔧 Resolvendo conflitos...');
            const conflictResolution = await this.resolveEnvironmentConflicts();
            synchronization.conflicts_resolved = conflictResolution.conflicts_resolved;

            synchronization.success = synchronization.users_synchronized > 0;
            console.log(`    📊 Sincronização: ${synchronization.users_synchronized} usuários sincronizados`);

            return synchronization;

        } catch (error) {
            console.error('    ❌ Erro na sincronização:', error.message);
            synchronization.error = error.message;
            return synchronization;
        }
    }

    /**
     * ✅ VALIDAR SISTEMA DUAL
     */
    async validateDualSystem() {
        console.log('  ✅ Validando sistema dual...');

        const validation = {
            system_operational: false,
            users_active: 0,
            testnet_operational: false,
            mainnet_operational: false,
            simultaneous_capable: false
        };

        try {
            // Verificar status operacional geral
            const systemStatus = await this.checkSystemOperationalStatus();
            validation.system_operational = systemStatus.operational;
            validation.users_active = systemStatus.active_users;

            // Validar testnet
            const testnetStatus = await this.validateTestnetOperations();
            validation.testnet_operational = testnetStatus.operational;

            // Validar mainnet
            const mainnetStatus = await this.validateMainnetOperations();
            validation.mainnet_operational = mainnetStatus.operational;

            // Verificar capacidade simultânea
            const simultaneousTest = await this.testSimultaneousOperations();
            validation.simultaneous_capable = simultaneousTest.capable;

            console.log('    📊 Validação final:');
            console.log(`      🧪 Testnet: ${validation.testnet_operational ? 'OK' : 'FALHA'}`);
            console.log(`      💰 Mainnet: ${validation.mainnet_operational ? 'OK' : 'FALHA'}`);
            console.log(`      🔄 Simultâneo: ${validation.simultaneous_capable ? 'OK' : 'FALHA'}`);
            console.log(`      👥 Usuários ativos: ${validation.users_active}`);

            return validation;

        } catch (error) {
            console.error('    ❌ Erro na validação:', error.message);
            validation.error = error.message;
            return validation;
        }
    }

    /**
     * 💾 VERIFICAR ESTRUTURA DA BASE DE DADOS
     */
    async verifyDatabaseStructure() {
        try {
            const requiredTables = [
                'users',
                'user_api_keys',
                'signal_processing_log',
                'executed_trades',
                'user_balance_history'
            ];

            for (const table of requiredTables) {
                const result = await this.pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1
                    )
                `, [table]);

                if (!result.rows[0].exists) {
                    return { success: false, missing_table: table };
                }
            }

            return { success: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * ⚙️ ATUALIZAR CONFIGURAÇÕES DO SISTEMA
     */
    async updateSystemConfigurations() {
        try {
            // Configurações para operação dual
            const dualConfigs = {
                DUAL_TRADING_ENABLED: 'true',
                TESTNET_ENABLED: 'true',
                MAINNET_ENABLED: 'true',
                SIMULTANEOUS_MODE: 'true',
                RISK_MANAGEMENT_LEVEL: 'ENHANCED'
            };

            // Atualizar ou inserir configurações
            for (const [key, value] of Object.entries(dualConfigs)) {
                await this.pool.query(`
                    INSERT INTO system_config (key, value, updated_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (key) 
                    DO UPDATE SET value = $2, updated_at = NOW()
                `, [key, value]);
            }

            return { success: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 🔍 VALIDAR AMBOS OS AMBIENTES
     */
    async validateBothEnvironments() {
        try {
            // Testar conectividade básica
            const testnetTest = await this.ipFixer.testExchangeConnectivity();
            const mainnetTest = await this.ipFixer.testExchangeConnectivity();

            const testnetOk = testnetTest.successful_connections > 0;
            const mainnetOk = mainnetTest.successful_connections > 0;

            return { 
                success: testnetOk && mainnetOk,
                testnet_ok: testnetOk,
                mainnet_ok: mainnetOk
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 👥 BUSCAR USUÁRIOS TESTNET
     */
    async getTestnetUsers() {
        try {
            const result = await this.pool.query(`
                SELECT DISTINCT u.id, u.username, u.email
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true
                AND uak.environment = 'testnet'
                AND uak.is_active = true
            `);

            return result.rows;

        } catch (error) {
            console.error('❌ Erro ao buscar usuários testnet:', error.message);
            return [];
        }
    }

    /**
     * 👥 BUSCAR USUÁRIOS MAINNET
     */
    async getMainnetUsers() {
        try {
            const result = await this.pool.query(`
                SELECT DISTINCT u.id, u.username, u.email
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true
                AND uak.environment = 'live'
                AND uak.is_active = true
            `);

            return result.rows;

        } catch (error) {
            console.error('❌ Erro ao buscar usuários mainnet:', error.message);
            return [];
        }
    }

    /**
     * 📊 GERAR RELATÓRIO DE ATIVAÇÃO
     */
    async generateActivationReport(activation) {
        const report = {
            title: '🚀 RELATÓRIO DE ATIVAÇÃO DUAL',
            timestamp: activation.timestamp,
            final_status: activation.success ? 'SUCESSO' : 'PARCIAL',
            phases_completed: activation.steps_completed,
            environment_status: {
                testnet: activation.testnet_status,
                mainnet: activation.mainnet_status
            },
            users_activated: activation.users_activated,
            critical_errors: activation.critical_errors,
            recommendations: []
        };

        if (activation.success) {
            report.recommendations.push('Sistema pronto para operação real');
            report.recommendations.push('Monitorar trades simultâneos');
            report.recommendations.push('Verificar health check regularmente');
        } else {
            report.recommendations.push('Verificar erros críticos');
            report.recommendations.push('Executar troubleshooting');
            report.recommendations.push('Contatar suporte se necessário');
        }

        console.log('\n📊 RELATÓRIO DE ATIVAÇÃO:');
        console.log(JSON.stringify(report, null, 2));

        return report;
    }

    /**
     * 🚨 TRATAMENTO DE FALHA CRÍTICA
     */
    async handleCriticalFailure(activation, reason) {
        console.log(`\n🚨 FALHA CRÍTICA: ${reason}`);
        activation.phase = 'critical_failure';
        activation.success = false;
        
        // Gerar instruções de recuperação
        await this.generateRecoveryInstructions(activation, reason);
        
        return activation;
    }

    /**
     * 🛠️ GERAR INSTRUÇÕES DE RECUPERAÇÃO
     */
    async generateRecoveryInstructions(activation, reason) {
        const recovery = {
            title: '🛠️ INSTRUÇÕES DE RECUPERAÇÃO',
            failure_reason: reason,
            recovery_steps: [],
            emergency_contacts: ['suporte@coinbitclub.com']
        };

        if (reason.includes('IP')) {
            recovery.recovery_steps.push('Verificar configuração de IP fixo');
            recovery.recovery_steps.push('Configurar whitelist nas exchanges');
            recovery.recovery_steps.push('Reinicar serviços de rede');
        }

        console.log('\n🛠️ INSTRUÇÕES DE RECUPERAÇÃO:');
        console.log(JSON.stringify(recovery, null, 2));

        return recovery;
    }
}

module.exports = DualTradingActivator;

// Se executado diretamente
if (require.main === module) {
    console.log('🚀 EXECUTANDO ATIVAÇÃO DUAL...');
    const activator = new DualTradingActivator();
    
    activator.activateFullDualSystem()
        .then(results => {
            console.log('\n📋 ATIVAÇÃO FINALIZADA');
            console.log('=====================');
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ FALHA CRÍTICA:', error);
            process.exit(1);
        });
}
