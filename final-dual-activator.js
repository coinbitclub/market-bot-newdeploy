/**
 * 🚀 ATIVAÇÃO FINAL - TESTNET + MAINNET SIMULTÂNEO
 * ================================================
 * 
 * Sistema final para ativar operações reais em ambos ambientes
 * IP Fixo Railway: 131.0.31.147 (coinbitclub-bot.eu.ngrok.io)
 * 
 * ✅ TESTNET: Operações de teste
 * ✅ MAINNET: Operações reais
 * 
 * Data: 11/08/2025
 * Status: PRODUÇÃO ATIVA
 */

console.log('🚀 ATIVAÇÃO FINAL - TESTNET + MAINNET SIMULTÂNEO');
console.log('================================================');

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

class FinalDualActivator {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });

        // 🎯 CONFIGURAÇÃO DUAL FINAL
        this.config = {
            railway_ip: '131.0.31.147',
            ngrok_url: 'https://coinbitclub-bot.eu.ngrok.io',
            testnet_enabled: true,
            mainnet_enabled: true,
            simultaneous_mode: true,
            real_trading: true
        };

        // 🎯 AMBIENTES DUAIS
        this.environments = {
            testnet: {
                bybit: 'https://api-testnet.bybit.com',
                binance: 'https://testnet.binance.vision',
                purpose: 'TESTE E VALIDAÇÃO',
                enabled: true
            },
            mainnet: {
                bybit: 'https://api.bybit.com', 
                binance: 'https://api.binance.com',
                purpose: 'OPERAÇÃO REAL',
                enabled: true
            }
        };

        console.log('🔒 Railway IP:', this.config.railway_ip);
        console.log('🌐 Ngrok URL:', this.config.ngrok_url);
        console.log('🧪 Testnet:', this.config.testnet_enabled ? 'ATIVO' : 'INATIVO');
        console.log('💰 Mainnet:', this.config.mainnet_enabled ? 'ATIVO' : 'INATIVO');
        console.log('⚡ Trading Real:', this.config.real_trading ? 'ATIVADO' : 'DESATIVADO');
    }

    /**
     * 🚀 ATIVAÇÃO COMPLETA DUAL
     */
    async executeFullDualActivation() {
        console.log('\n🚀 EXECUTANDO ATIVAÇÃO COMPLETA DUAL...');
        console.log('======================================');

        const activation = {
            timestamp: new Date().toISOString(),
            config: this.config,
            testnet_status: 'pending',
            mainnet_status: 'pending',
            users_testnet: 0,
            users_mainnet: 0,
            total_successful_connections: 0,
            total_failed_connections: 0,
            system_operational: false,
            ready_for_signals: false
        };

        try {
            // FASE 1: Validar configuração de rede
            console.log('\n🌐 FASE 1: Validação de Rede');
            console.log('============================');
            const networkValidation = await this.validateNetworkSetup();
            
            if (!networkValidation.success) {
                console.log('🚨 CRÍTICO: Configuração de rede inválida');
                return activation;
            }

            // FASE 2: Ativar ambiente TESTNET
            console.log('\n🧪 FASE 2: Ativação TESTNET');
            console.log('===========================');
            const testnetActivation = await this.activateTestnetEnvironment();
            activation.testnet_status = testnetActivation.success ? 'active' : 'failed';
            activation.users_testnet = testnetActivation.active_users;
            activation.total_successful_connections += testnetActivation.successful_connections;
            activation.total_failed_connections += testnetActivation.failed_connections;

            // FASE 3: Ativar ambiente MAINNET  
            console.log('\n💰 FASE 3: Ativação MAINNET');
            console.log('===========================');
            const mainnetActivation = await this.activateMainnetEnvironment();
            activation.mainnet_status = mainnetActivation.success ? 'active' : 'failed';
            activation.users_mainnet = mainnetActivation.active_users;
            activation.total_successful_connections += mainnetActivation.successful_connections;
            activation.total_failed_connections += mainnetActivation.failed_connections;

            // FASE 4: Configurar operação simultânea
            console.log('\n🔄 FASE 4: Configuração Simultânea');
            console.log('==================================');
            const simultaneousSetup = await this.setupSimultaneousOperations();

            // FASE 5: Ativar recepção de sinais
            console.log('\n📡 FASE 5: Ativação de Sinais');
            console.log('=============================');
            const signalActivation = await this.activateSignalReception();
            activation.ready_for_signals = signalActivation.success;

            // DETERMINAÇÃO DO STATUS FINAL
            activation.system_operational = (
                activation.testnet_status === 'active' || 
                activation.mainnet_status === 'active'
            ) && activation.ready_for_signals;

            // RELATÓRIO FINAL
            await this.generateFinalReport(activation);

            return activation;

        } catch (error) {
            console.error('\n❌ ERRO CRÍTICO NA ATIVAÇÃO DUAL:', error);
            activation.error = error.message;
            return activation;
        }
    }

    /**
     * 🌐 VALIDAR CONFIGURAÇÃO DE REDE
     */
    async validateNetworkSetup() {
        console.log('  🌐 Validando configuração de rede...');

        try {
            // Verificar conectividade básica
            const connectivityTests = await Promise.all([
                this.testEndpoint('Bybit Testnet', this.environments.testnet.bybit + '/v5/market/time'),
                this.testEndpoint('Bybit Mainnet', this.environments.mainnet.bybit + '/v5/market/time')
            ]);

            const successfulTests = connectivityTests.filter(test => test.success).length;
            const success = successfulTests > 0;

            console.log(`  📊 Conectividade: ${successfulTests}/${connectivityTests.length} exchanges acessíveis`);
            
            if (success) {
                console.log('  ✅ Configuração de rede validada');
            } else {
                console.log('  ❌ Configuração de rede inválida');
            }

            return { success, tests: connectivityTests };

        } catch (error) {
            console.error('  ❌ Erro na validação de rede:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🔗 TESTAR ENDPOINT ESPECÍFICO
     */
    async testEndpoint(name, url) {
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: { 'User-Agent': 'CoinbitClub-Dual-Activator/1.0' }
            });

            console.log(`    ✅ ${name}: Acessível`);
            return { name, success: true, status: response.status };

        } catch (error) {
            console.log(`    ❌ ${name}: ${error.response?.status || error.code}`);
            return { name, success: false, error: error.response?.status || error.code };
        }
    }

    /**
     * 🧪 ATIVAR AMBIENTE TESTNET
     */
    async activateTestnetEnvironment() {
        console.log('  🧪 Ativando ambiente testnet...');

        const testnetResult = {
            success: false,
            active_users: 0,
            successful_connections: 0,
            failed_connections: 0,
            tested_keys: 0
        };

        try {
            // Buscar usuários com chaves testnet
            const testnetUsers = await this.getUsersByEnvironment('testnet');
            console.log(`    👥 Usuários testnet encontrados: ${testnetUsers.length}`);

            for (const user of testnetUsers) {
                const userTest = await this.testUserEnvironment(user, 'testnet');
                testnetResult.tested_keys += userTest.tested_keys;
                testnetResult.successful_connections += userTest.successful_connections;
                testnetResult.failed_connections += userTest.failed_connections;

                if (userTest.has_valid_connection) {
                    testnetResult.active_users++;
                }
            }

            testnetResult.success = testnetResult.active_users > 0;
            
            console.log(`    📊 Testnet: ${testnetResult.active_users} usuários ativos`);
            console.log(`    📊 Conexões: ${testnetResult.successful_connections} sucesso, ${testnetResult.failed_connections} falhas`);

            return testnetResult;

        } catch (error) {
            console.error('    ❌ Erro na ativação testnet:', error.message);
            testnetResult.error = error.message;
            return testnetResult;
        }
    }

    /**
     * 💰 ATIVAR AMBIENTE MAINNET
     */
    async activateMainnetEnvironment() {
        console.log('  💰 Ativando ambiente mainnet...');

        const mainnetResult = {
            success: false,
            active_users: 0,
            successful_connections: 0,
            failed_connections: 0,
            tested_keys: 0
        };

        try {
            // Buscar usuários com chaves mainnet
            const mainnetUsers = await this.getUsersByEnvironment('live');
            console.log(`    👥 Usuários mainnet encontrados: ${mainnetUsers.length}`);

            for (const user of mainnetUsers) {
                const userTest = await this.testUserEnvironment(user, 'live');
                mainnetResult.tested_keys += userTest.tested_keys;
                mainnetResult.successful_connections += userTest.successful_connections;
                mainnetResult.failed_connections += userTest.failed_connections;

                if (userTest.has_valid_connection) {
                    mainnetResult.active_users++;
                }
            }

            mainnetResult.success = mainnetResult.active_users > 0;
            
            console.log(`    📊 Mainnet: ${mainnetResult.active_users} usuários ativos`);
            console.log(`    📊 Conexões: ${mainnetResult.successful_connections} sucesso, ${mainnetResult.failed_connections} falhas`);

            return mainnetResult;

        } catch (error) {
            console.error('    ❌ Erro na ativação mainnet:', error.message);
            mainnetResult.error = error.message;
            return mainnetResult;
        }
    }

    /**
     * 👥 BUSCAR USUÁRIOS POR AMBIENTE
     */
    async getUsersByEnvironment(environment) {
        try {
            const query = `
                SELECT DISTINCT 
                    u.id,
                    u.username,
                    u.email
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true
                AND uak.environment = $1
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                ORDER BY u.id
            `;

            const result = await this.pool.query(query, [environment]);
            return result.rows;

        } catch (error) {
            console.error(`❌ Erro ao buscar usuários ${environment}:`, error.message);
            return [];
        }
    }

    /**
     * 🧪 TESTAR USUÁRIO EM AMBIENTE ESPECÍFICO
     */
    async testUserEnvironment(user, environment) {
        const userTest = {
            user_id: user.id,
            username: user.username,
            environment: environment,
            tested_keys: 0,
            successful_connections: 0,
            failed_connections: 0,
            has_valid_connection: false
        };

        try {
            // Buscar chaves do usuário para o ambiente
            const keysQuery = `
                SELECT exchange, api_key, secret_key
                FROM user_api_keys
                WHERE user_id = $1 AND environment = $2
                AND is_active = true AND api_key IS NOT NULL
            `;

            const keysResult = await this.pool.query(keysQuery, [user.id, environment]);
            
            for (const key of keysResult.rows) {
                userTest.tested_keys++;
                
                const keyTest = await this.testExchangeKey(key, environment);
                
                if (keyTest.success) {
                    userTest.successful_connections++;
                    userTest.has_valid_connection = true;
                    
                    // Atualizar status no banco
                    await this.updateKeyStatus(user.id, key.exchange, environment, 'ACTIVE', null);
                } else {
                    userTest.failed_connections++;
                    
                    // Atualizar status no banco
                    await this.updateKeyStatus(user.id, key.exchange, environment, 'FAILED', keyTest.error);
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            return userTest;

        } catch (error) {
            console.error(`❌ Erro ao testar usuário ${user.username}:`, error.message);
            userTest.error = error.message;
            return userTest;
        }
    }

    /**
     * 🔑 TESTAR CHAVE DE EXCHANGE
     */
    async testExchangeKey(keyData, environment) {
        try {
            if (keyData.exchange === 'bybit') {
                return await this.testBybitKey(keyData, environment);
            }
            
            return { success: false, error: 'Exchange não suportada' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 🟣 TESTAR CHAVE BYBIT
     */
    async testBybitKey(keyData, environment) {
        try {
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            const baseURL = environment === 'testnet' ? 
                this.environments.testnet.bybit : 
                this.environments.mainnet.bybit;
            
            const queryString = `accountType=UNIFIED&apiKey=${keyData.api_key}`;
            const signPayload = timestamp + keyData.api_key + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', keyData.secret_key).update(signPayload).digest('hex');
            
            const headers = {
                'X-BAPI-API-KEY': keyData.api_key,
                'X-BAPI-SIGN': signature,
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            };
            
            const response = await axios.get(`${baseURL}/v5/account/wallet-balance?${queryString}`, {
                headers,
                timeout: 15000
            });

            return { success: response.data.retCode === 0 };

        } catch (error) {
            return { success: false, error: error.response?.data?.retMsg || error.message };
        }
    }

    /**
     * 💾 ATUALIZAR STATUS DA CHAVE
     */
    async updateKeyStatus(userId, exchange, environment, status, errorMessage) {
        try {
            await this.pool.query(`
                UPDATE user_api_keys 
                SET 
                    validation_status = $1,
                    validation_error = $2,
                    last_validated_at = NOW()
                WHERE user_id = $3 AND exchange = $4 AND environment = $5
            `, [status, errorMessage, userId, exchange, environment]);
        } catch (error) {
            console.error('❌ Erro ao atualizar status:', error.message);
        }
    }

    /**
     * 🔄 CONFIGURAR OPERAÇÕES SIMULTÂNEAS
     */
    async setupSimultaneousOperations() {
        console.log('  🔄 Configurando operações simultâneas...');

        try {
            // Inserir/atualizar configurações do sistema
            const configs = [
                ['DUAL_TRADING_ENABLED', 'true'],
                ['TESTNET_ENABLED', 'true'],
                ['MAINNET_ENABLED', 'true'],
                ['SIMULTANEOUS_MODE', 'true'],
                ['RAILWAY_IP', this.config.railway_ip],
                ['NGROK_URL', this.config.ngrok_url]
            ];

            for (const [key, value] of configs) {
                await this.pool.query(`
                    INSERT INTO system_config (key, value, updated_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (key) 
                    DO UPDATE SET value = $2, updated_at = NOW()
                `, [key, value]);
            }

            console.log('    ✅ Configurações simultâneas aplicadas');
            return { success: true };

        } catch (error) {
            console.error('    ❌ Erro ao configurar operações simultâneas:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 📡 ATIVAR RECEPÇÃO DE SINAIS
     */
    async activateSignalReception() {
        console.log('  📡 Ativando recepção de sinais...');

        try {
            // Verificar se há usuários ativos
            const activeUsersQuery = `
                SELECT COUNT(DISTINCT user_id) as count
                FROM user_api_keys 
                WHERE validation_status = 'ACTIVE'
                AND is_active = true
            `;

            const result = await this.pool.query(activeUsersQuery);
            const activeUsers = parseInt(result.rows[0].count) || 0;

            if (activeUsers > 0) {
                // Ativar recepção de sinais
                await this.pool.query(`
                    INSERT INTO system_config (key, value, updated_at)
                    VALUES ('SIGNAL_RECEPTION_ENABLED', 'true', NOW())
                    ON CONFLICT (key) 
                    DO UPDATE SET value = 'true', updated_at = NOW()
                `);

                console.log(`    ✅ Sinais ativados para ${activeUsers} usuários`);
                return { success: true, active_users: activeUsers };
            } else {
                console.log('    ⚠️ Nenhum usuário ativo encontrado');
                return { success: false, active_users: 0 };
            }

        } catch (error) {
            console.error('    ❌ Erro ao ativar sinais:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 📊 GERAR RELATÓRIO FINAL
     */
    async generateFinalReport(activation) {
        const report = {
            title: '🚀 RELATÓRIO FINAL - ATIVAÇÃO DUAL COMPLETA',
            timestamp: activation.timestamp,
            configuration: {
                railway_ip: this.config.railway_ip,
                ngrok_url: this.config.ngrok_url,
                testnet_enabled: this.config.testnet_enabled,
                mainnet_enabled: this.config.mainnet_enabled,
                simultaneous_mode: this.config.simultaneous_mode
            },
            results: {
                testnet_status: activation.testnet_status,
                mainnet_status: activation.mainnet_status,
                users_testnet: activation.users_testnet,
                users_mainnet: activation.users_mainnet,
                total_connections: activation.total_successful_connections,
                failed_connections: activation.total_failed_connections,
                system_operational: activation.system_operational,
                ready_for_signals: activation.ready_for_signals
            },
            next_steps: []
        };

        if (activation.system_operational) {
            report.next_steps = [
                '✅ Sistema operacional e pronto para trading',
                '📡 Webhook disponível: ' + this.config.ngrok_url + '/webhook',
                '🔍 Health check: ' + this.config.ngrok_url + '/health',
                '📊 Monitorar logs em tempo real',
                '⚡ Sinais serão processados automaticamente'
            ];

            console.log('\n🟢 ATIVAÇÃO DUAL CONCLUÍDA COM SUCESSO!');
            console.log('======================================');
            console.log('🧪 TESTNET: ATIVO (' + activation.users_testnet + ' usuários)');
            console.log('💰 MAINNET: ATIVO (' + activation.users_mainnet + ' usuários)');
            console.log('🔄 MODO SIMULTÂNEO: HABILITADO');
            console.log('📡 SINAIS: ATIVADOS');
            console.log('🌐 URL PÚBLICA: ' + this.config.ngrok_url);
            console.log('🚀 SISTEMA PRONTO PARA OPERAÇÃO REAL!');

        } else {
            report.next_steps = [
                '⚠️ Sistema parcialmente operacional',
                '🔧 Verificar logs de erro',
                '🔑 Validar chaves de API bloqueadas',
                '📞 Contatar suporte se necessário'
            ];

            console.log('\n🟡 ATIVAÇÃO PARCIAL - VERIFICAR CONFIGURAÇÕES');
            console.log('============================================');
        }

        console.log('\n📊 RELATÓRIO COMPLETO:');
        console.log(JSON.stringify(report, null, 2));

        return report;
    }
}

module.exports = FinalDualActivator;

// Se executado diretamente
if (require.main === module) {
    console.log('🚀 EXECUTANDO ATIVAÇÃO FINAL DUAL...');
    const activator = new FinalDualActivator();
    
    activator.executeFullDualActivation()
        .then(results => {
            console.log('\n📋 ATIVAÇÃO DUAL FINALIZADA');
            console.log('===========================');
            process.exit(results.system_operational ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ FALHA CRÍTICA:', error);
            process.exit(1);
        });
}
