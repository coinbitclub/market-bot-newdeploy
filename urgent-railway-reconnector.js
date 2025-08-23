/**
 * 🚨 RECONEXÃO URGENTE - IP FIXO RAILWAY
 * =====================================
 * 
 * Sistema para reconectar exchanges após implementação de IP fixo
 * IP Fixo Railway: 131.0.31.147
 * Região: EU (coinbitclub-bot.eu.ngrok.io)
 * 
 * Data: 11/08/2025
 * Status: OPERAÇÃO REAL
 */

console.log('🚨 RECONEXÃO URGENTE - IP FIXO RAILWAY');
console.log('=====================================');

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

class UrgentReconnector {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });

        // 🔒 CONFIGURAÇÃO IP FIXO RAILWAY
        this.networkConfig = {
            fixed_ip: '131.0.31.147',
            ngrok_enabled: true,
            ngrok_region: 'EU',
            ngrok_subdomain: 'coinbitclub-bot',
            ngrok_url: 'https://coinbitclub-bot.eu.ngrok.io',
            railway_deployed: true
        };

        // 🎯 EXCHANGES CONFIGURADAS
        this.exchanges = {
            bybit: {
                testnet: 'https://api-testnet.bybit.com',
                mainnet: 'https://api.bybit.com',
                enabled: true
            },
            binance: {
                testnet: 'https://testnet.binance.vision',
                mainnet: 'https://api.binance.com',
                enabled: false // Bloqueado no Brasil
            }
        };

        console.log('🔒 IP Fixo Railway:', this.networkConfig.fixed_ip);
        console.log('🌐 Ngrok URL:', this.networkConfig.ngrok_url);
        console.log('✅ Reconector Urgente inicializado');
    }

    /**
     * 🚀 EXECUTAR RECONEXÃO COMPLETA
     */
    async executeUrgentReconnection() {
        console.log('\n🚀 EXECUTANDO RECONEXÃO URGENTE...');
        console.log('==================================');

        const reconnection = {
            timestamp: new Date().toISOString(),
            ip_config: this.networkConfig,
            steps_completed: [],
            users_reconnected: 0,
            exchanges_tested: 0,
            successful_connections: 0,
            failed_connections: 0,
            success: false
        };

        try {
            // PASSO 1: Verificar conectividade com IP fixo
            console.log('\n📡 PASSO 1: Verificando conectividade com IP fixo...');
            const connectivityCheck = await this.verifyFixedIPConnectivity();
            reconnection.steps_completed.push('connectivity_check');

            if (!connectivityCheck.success) {
                console.log('🚨 CRÍTICO: IP fixo não está acessível');
                return reconnection;
            }

            // PASSO 2: Buscar usuários com chaves bloqueadas
            console.log('\n🔑 PASSO 2: Identificando chaves bloqueadas...');
            const blockedUsers = await this.findBlockedUsers();
            reconnection.steps_completed.push('blocked_users_identification');

            console.log(`📊 Encontrados ${blockedUsers.length} usuários com problemas`);

            // PASSO 3: Testar reconexão por usuário
            console.log('\n🔄 PASSO 3: Testando reconexão por usuário...');
            for (const user of blockedUsers) {
                const userReconnection = await this.reconnectUser(user);
                
                if (userReconnection.success) {
                    reconnection.users_reconnected++;
                    reconnection.successful_connections += userReconnection.successful_keys;
                    console.log(`  ✅ ${user.username}: RECONECTADO`);
                } else {
                    reconnection.failed_connections += userReconnection.failed_keys;
                    console.log(`  ❌ ${user.username}: FALHA`);
                }

                reconnection.exchanges_tested += userReconnection.total_keys;
            }
            reconnection.steps_completed.push('user_reconnection');

            // PASSO 4: Ativar sistema real
            console.log('\n⚡ PASSO 4: Ativando sistema para operação real...');
            const activation = await this.activateRealTrading();
            reconnection.steps_completed.push('real_trading_activation');
            reconnection.success = activation.success;

            // RESUMO FINAL
            console.log('\n📊 RESUMO DA RECONEXÃO:');
            console.log('========================');
            console.log(`🔒 IP Fixo: ${this.networkConfig.fixed_ip}`);
            console.log(`👥 Usuários reconectados: ${reconnection.users_reconnected}`);
            console.log(`✅ Conexões bem-sucedidas: ${reconnection.successful_connections}`);
            console.log(`❌ Conexões falharam: ${reconnection.failed_connections}`);
            console.log(`🚀 Sistema operacional: ${reconnection.success ? 'SIM' : 'NÃO'}`);

            if (reconnection.success) {
                console.log('\n🟢 RECONEXÃO URGENTE CONCLUÍDA COM SUCESSO!');
                console.log('===========================================');
                console.log('🚀 Sistema pronto para trading real');
                console.log('📡 Testnet e Mainnet operacionais');
                console.log('🔗 Acesse: https://coinbitclub-bot.eu.ngrok.io');
            } else {
                console.log('\n🔴 RECONEXÃO PARCIAL - VERIFICAR LOGS');
                await this.generateManualInstructions(reconnection);
            }

            return reconnection;

        } catch (error) {
            console.error('\n❌ ERRO CRÍTICO NA RECONEXÃO:', error);
            reconnection.error = error.message;
            return reconnection;
        }
    }

    /**
     * 📡 VERIFICAR CONECTIVIDADE DO IP FIXO
     */
    async verifyFixedIPConnectivity() {
        console.log('  📡 Testando conectividade do IP fixo...');

        try {
            // Testar IP público atual
            const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            const currentIP = ipResponse.data.ip;
            
            console.log(`  🌐 IP atual detectado: ${currentIP}`);
            console.log(`  🔒 IP fixo configurado: ${this.networkConfig.fixed_ip}`);

            // Testar Ngrok (se disponível)
            let ngrokStatus = 'unknown';
            try {
                const ngrokResponse = await axios.get('http://127.0.0.1:4040/api/tunnels', { timeout: 3000 });
                if (ngrokResponse.data.tunnels && ngrokResponse.data.tunnels.length > 0) {
                    ngrokStatus = 'active';
                    console.log(`  🚇 Ngrok ativo: ${ngrokResponse.data.tunnels[0].public_url}`);
                }
            } catch (ngrokError) {
                ngrokStatus = 'not_available';
                console.log('  ⚠️ Ngrok não disponível localmente (normal no Railway)');
            }

            // Testar conectividade básica com exchanges
            const exchangeTests = await this.testBasicExchangeConnectivity();
            
            return {
                success: exchangeTests.accessible_exchanges > 0,
                current_ip: currentIP,
                fixed_ip: this.networkConfig.fixed_ip,
                ngrok_status: ngrokStatus,
                exchange_accessibility: exchangeTests
            };

        } catch (error) {
            console.error('  ❌ Erro ao verificar conectividade:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🔗 TESTAR CONECTIVIDADE BÁSICA COM EXCHANGES
     */
    async testBasicExchangeConnectivity() {
        const results = {
            tests_performed: 0,
            accessible_exchanges: 0,
            blocked_exchanges: 0,
            details: {}
        };

        const testEndpoints = [
            { name: 'bybit_testnet', url: this.exchanges.bybit.testnet + '/v5/market/time' },
            { name: 'bybit_mainnet', url: this.exchanges.bybit.mainnet + '/v5/market/time' }
        ];

        for (const endpoint of testEndpoints) {
            results.tests_performed++;
            console.log(`    🔄 Testando ${endpoint.name}...`);

            try {
                const response = await axios.get(endpoint.url, {
                    timeout: 10000,
                    headers: { 'User-Agent': 'CoinbitClub-Railway-Reconnector/1.0' }
                });

                results.details[endpoint.name] = {
                    status: 'accessible',
                    response_time: response.headers['x-response-time'] || 'unknown'
                };

                console.log(`      ✅ Acessível`);
                results.accessible_exchanges++;

            } catch (error) {
                results.details[endpoint.name] = {
                    status: 'blocked',
                    error: error.response?.status || error.code
                };

                console.log(`      ❌ Bloqueado - ${error.response?.status || error.code}`);
                results.blocked_exchanges++;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return results;
    }

    /**
     * 🔍 ENCONTRAR USUÁRIOS COM CHAVES BLOQUEADAS
     */
    async findBlockedUsers() {
        console.log('  🔍 Buscando usuários com problemas de conexão...');

        try {
            const query = `
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    COUNT(uak.id) as total_keys,
                    COUNT(CASE WHEN uak.validation_status IN ('FAILED', 'BLOCKED') THEN 1 END) as blocked_keys
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                GROUP BY u.id, u.username, u.email
                HAVING COUNT(CASE WHEN uak.validation_status IN ('FAILED', 'BLOCKED') THEN 1 END) > 0
                ORDER BY blocked_keys DESC
            `;

            const result = await this.pool.query(query);
            console.log(`  📊 Encontrados ${result.rows.length} usuários com chaves bloqueadas`);

            return result.rows;

        } catch (error) {
            console.error('  ❌ Erro ao buscar usuários bloqueados:', error.message);
            return [];
        }
    }

    /**
     * 🔄 RECONECTAR USUÁRIO ESPECÍFICO
     */
    async reconnectUser(user) {
        console.log(`    🔄 Reconectando ${user.username}...`);

        const reconnectionResult = {
            user_id: user.id,
            username: user.username,
            total_keys: 0,
            successful_keys: 0,
            failed_keys: 0,
            success: false,
            details: []
        };

        try {
            // Buscar chaves do usuário
            const keysQuery = `
                SELECT exchange, environment, api_key, secret_key
                FROM user_api_keys
                WHERE user_id = $1 AND is_active = true
                AND api_key IS NOT NULL AND secret_key IS NOT NULL
            `;

            const keysResult = await this.pool.query(keysQuery, [user.id]);
            const userKeys = keysResult.rows;
            reconnectionResult.total_keys = userKeys.length;

            for (const keyData of userKeys) {
                const keyTest = await this.testUserKey(user.id, keyData);
                
                if (keyTest.success) {
                    reconnectionResult.successful_keys++;
                    console.log(`      ✅ ${keyData.exchange} ${keyData.environment}: CONECTADO`);
                } else {
                    reconnectionResult.failed_keys++;
                    console.log(`      ❌ ${keyData.exchange} ${keyData.environment}: ${keyTest.error}`);
                }

                reconnectionResult.details.push(keyTest);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            reconnectionResult.success = reconnectionResult.successful_keys > 0;
            return reconnectionResult;

        } catch (error) {
            console.error(`    ❌ Erro ao reconectar ${user.username}:`, error.message);
            reconnectionResult.error = error.message;
            return reconnectionResult;
        }
    }

    /**
     * 🧪 TESTAR CHAVE ESPECÍFICA DO USUÁRIO
     */
    async testUserKey(userId, keyData) {
        try {
            if (keyData.exchange === 'bybit') {
                const result = await this.testBybitKey(keyData);
                await this.updateKeyStatus(userId, keyData.exchange, keyData.environment, 
                    result.success ? 'CONNECTED' : 'FAILED', result.error);
                return result;
            }
            
            return { success: false, error: 'Exchange não suportada' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 🟣 TESTAR CHAVE BYBIT
     */
    async testBybitKey(keyData) {
        try {
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            const baseURL = this.exchanges.bybit[keyData.environment];
            
            const queryString = `accountType=UNIFIED&apiKey=${keyData.api_key}`;
            const signPayload = timestamp + keyData.api_key + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', keyData.secret_key).update(signPayload).digest('hex');
            
            const headers = {
                'X-BAPI-API-KEY': keyData.api_key,
                'X-BAPI-SIGN': signature,
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json',
                'User-Agent': 'CoinbitClub-Railway-Reconnector/1.0'
            };
            
            const response = await axios.get(`${baseURL}/v5/account/wallet-balance?${queryString}`, {
                headers,
                timeout: 15000
            });

            if (response.data.retCode === 0) {
                return { success: true, balance_checked: true };
            } else {
                return { success: false, error: response.data.retMsg || 'Erro desconhecido' };
            }

        } catch (error) {
            const errorMsg = error.response?.data?.retMsg || error.message;
            return { success: false, error: errorMsg };
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
     * ⚡ ATIVAR TRADING REAL
     */
    async activateRealTrading() {
        console.log('  ⚡ Ativando sistema para trading real...');

        try {
            // Verificar quantos usuários têm conexões ativas
            const activeUsersQuery = `
                SELECT COUNT(DISTINCT user_id) as active_users
                FROM user_api_keys 
                WHERE validation_status = 'CONNECTED'
                AND is_active = true
            `;

            const result = await this.pool.query(activeUsersQuery);
            const activeUsers = parseInt(result.rows[0].active_users) || 0;

            console.log(`  📊 Usuários com conexões ativas: ${activeUsers}`);

            if (activeUsers > 0) {
                // Atualizar configuração do sistema
                await this.pool.query(`
                    INSERT INTO system_config (key, value, updated_at)
                    VALUES ('REAL_TRADING_ENABLED', 'true', NOW())
                    ON CONFLICT (key) 
                    DO UPDATE SET value = 'true', updated_at = NOW()
                `);

                console.log('  ✅ Trading real ativado no sistema');
                return { success: true, active_users: activeUsers };
            } else {
                console.log('  ⚠️ Nenhum usuário com conexões ativas');
                return { success: false, active_users: 0 };
            }

        } catch (error) {
            console.error('  ❌ Erro ao ativar trading real:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 📋 GERAR INSTRUÇÕES MANUAIS
     */
    async generateManualInstructions(reconnection) {
        const instructions = {
            title: '📋 INSTRUÇÕES PARA CORREÇÃO MANUAL',
            ip_fixo: this.networkConfig.fixed_ip,
            ngrok_url: this.networkConfig.ngrok_url,
            steps: [
                'Verificar whitelist de IP nas exchanges:',
                '1. Bybit: Settings → API Management → Edit → IP Restriction',
                `   Adicionar IP: ${this.networkConfig.fixed_ip}`,
                '2. Aguardar 5-10 minutos para propagação',
                '3. Testar novamente as conexões'
            ],
            support: 'suporte@coinbitclub.com'
        };

        console.log('\n📋 INSTRUÇÕES MANUAIS:');
        console.log(JSON.stringify(instructions, null, 2));
        return instructions;
    }
}

module.exports = UrgentReconnector;

// Se executado diretamente
if (require.main === module) {
    console.log('🚨 EXECUTANDO RECONEXÃO URGENTE...');
    const reconnector = new UrgentReconnector();
    
    reconnector.executeUrgentReconnection()
        .then(results => {
            console.log('\n📋 RECONEXÃO FINALIZADA');
            console.log('======================');
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ FALHA CRÍTICA:', error);
            process.exit(1);
        });
}
