/**
 * 🧪 TESTE REAL DE CONEXÕES - VALIDAÇÃO COMPLETA
 * =============================================
 * 
 * Script para testar conexões reais com IPs atualizados:
 * ✅ 131.0.31.147 (Railway)
 * ➕ 132.255.160.131 (IP atual)
 * 
 * Data: 11/08/2025
 */

console.log('🧪 TESTE REAL DE CONEXÕES - INICIANDO...');
console.log('========================================');

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');
const ccxt = require('ccxt');

class RealConnectionTester {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        this.currentIP = null;
        this.expectedIPs = [
            '131.0.31.147', // Railway
            '132.255.160.131' // IP atual
        ];
    }

    /**
     * 🌐 DETECTAR IP ATUAL
     */
    async detectCurrentIP() {
        console.log('\n🌐 DETECTANDO IP ATUAL...');
        console.log('========================');

        try {
            const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            this.currentIP = response.data.ip;
            console.log(`📍 IP Público Atual: ${this.currentIP}`);
            
            if (this.expectedIPs.includes(this.currentIP)) {
                console.log(`✅ IP está na lista autorizada`);
            } else {
                console.log(`⚠️ IP NÃO está na lista autorizada`);
                console.log(`📋 IPs esperados: ${this.expectedIPs.join(', ')}`);
            }
            
            return this.currentIP;
        } catch (error) {
            console.error('❌ Erro ao detectar IP:', error.message);
            return null;
        }
    }

    /**
     * 🔑 BUSCAR CHAVES ATIVAS
     */
    async getActiveAPIKeys() {
        console.log('\n🔑 BUSCANDO CHAVES API ATIVAS...');
        console.log('================================');

        try {
            const query = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    uak.exchange,
                    uak.environment,
                    uak.api_key,
                    uak.secret_key,
                    uak.is_active,
                    uak.validation_status,
                    uak.created_at,
                    uak.last_validated_at
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                ORDER BY u.id, uak.exchange, uak.environment
            `;

            const result = await this.pool.query(query);
            console.log(`📊 Total de chaves encontradas: ${result.rows.length}`);

            const userKeys = {};
            result.rows.forEach(row => {
                if (!userKeys[row.user_id]) {
                    userKeys[row.user_id] = {
                        username: row.username,
                        email: row.email,
                        keys: []
                    };
                }
                userKeys[row.user_id].keys.push({
                    exchange: row.exchange,
                    environment: row.environment,
                    api_key: row.api_key,
                    secret_key: row.secret_key,
                    validation_status: row.validation_status,
                    last_validated_at: row.last_validated_at
                });
            });

            console.log(`👥 Usuários únicos: ${Object.keys(userKeys).length}`);
            
            // Mostrar resumo das chaves
            for (const [userId, userData] of Object.entries(userKeys)) {
                console.log(`\n👤 ${userData.username}:`);
                userData.keys.forEach(key => {
                    console.log(`  🔑 ${key.exchange.toUpperCase()} ${key.environment} - ${key.api_key.substring(0, 12)}... (${key.validation_status || 'PENDING'})`);
                });
            }

            return userKeys;

        } catch (error) {
            console.error('❌ Erro ao buscar chaves:', error.message);
            return {};
        }
    }

    /**
     * 🟣 TESTE AVANÇADO BYBIT
     */
    async testBybitAdvanced(apiKey, secretKey, environment) {
        console.log(`\n🟣 TESTANDO BYBIT ${environment.toUpperCase()}...`);
        console.log('──────────────────────────────────────');

        const baseURL = environment === 'testnet' 
            ? 'https://api-testnet.bybit.com' 
            : 'https://api.bybit.com';

        try {
            // 1. Teste de conectividade básica
            console.log('1️⃣ Testando conectividade básica...');
            const pingResponse = await axios.get(`${baseURL}/v5/market/time`, { timeout: 10000 });
            console.log(`   ✅ Ping OK - Server Time: ${new Date(pingResponse.data.result.timeNano / 1000000).toISOString()}`);

            // 2. Teste de autenticação
            console.log('2️⃣ Testando autenticação...');
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            
            const queryString = `accountType=UNIFIED&apiKey=${apiKey}`;
            const signPayload = timestamp + apiKey + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', secretKey).update(signPayload).digest('hex');
            
            const headers = {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json',
                'User-Agent': 'CoinbitClub-RealTest/1.0'
            };
            
            const authResponse = await axios.get(`${baseURL}/v5/account/wallet-balance?${queryString}`, {
                headers,
                timeout: 15000
            });

            if (authResponse.data.retCode === 0) {
                console.log('   ✅ Autenticação OK');
                
                // 3. Verificar saldos
                console.log('3️⃣ Verificando saldos...');
                const result = authResponse.data.result;
                if (result && result.list && result.list.length > 0) {
                    const account = result.list[0];
                    console.log(`   📊 Tipo de conta: ${account.accountType}`);
                    
                    if (account.coin && account.coin.length > 0) {
                        console.log('   💰 Saldos principais:');
                        account.coin.forEach(coin => {
                            const balance = parseFloat(coin.walletBalance);
                            if (balance > 0) {
                                console.log(`      ${coin.coin}: ${balance}`);
                            }
                        });
                    } else {
                        console.log('   ℹ️ Nenhum saldo encontrado');
                    }
                } else {
                    console.log('   ℹ️ Conta sem dados de saldo');
                }

                // 4. Teste CCXT
                console.log('4️⃣ Testando CCXT...');
                const ccxtBybit = new ccxt.bybit({
                    apiKey: apiKey,
                    secret: secretKey,
                    sandbox: environment === 'testnet',
                    enableRateLimit: true
                });

                const markets = await ccxtBybit.loadMarkets();
                console.log(`   ✅ CCXT OK - ${Object.keys(markets).length} mercados carregados`);

                // Testar fetch de ticker
                const ticker = await ccxtBybit.fetchTicker('BTC/USDT');
                console.log(`   📈 BTC/USDT: $${ticker.last}`);

                return {
                    success: true,
                    status: 'FULLY_OPERATIONAL',
                    details: {
                        connectivity: 'OK',
                        authentication: 'OK',
                        balance_access: 'OK',
                        ccxt_integration: 'OK',
                        btc_price: ticker.last
                    }
                };

            } else {
                console.log(`   ❌ Erro de autenticação: ${authResponse.data.retMsg}`);
                return {
                    success: false,
                    status: 'AUTH_ERROR',
                    error: authResponse.data.retMsg
                };
            }

        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}`);
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                if (errorData.retMsg && errorData.retMsg.includes('IP')) {
                    return {
                        success: false,
                        status: 'IP_BLOCKED',
                        error: `IP bloqueado: ${errorData.retMsg}`,
                        action_required: 'Adicionar IP nas configurações da API'
                    };
                }
            }

            return {
                success: false,
                status: 'CONNECTION_ERROR',
                error: error.message
            };
        }
    }

    /**
     * 🟡 TESTE AVANÇADO BINANCE
     */
    async testBinanceAdvanced(apiKey, secretKey, environment) {
        console.log(`\n🟡 TESTANDO BINANCE ${environment.toUpperCase()}...`);
        console.log('────────────────────────────────────────');

        if (environment === 'mainnet') {
            console.log('⚠️ Binance Mainnet bloqueado no Brasil - SKIP');
            return {
                success: false,
                status: 'BLOCKED_REGION',
                error: 'Binance Mainnet bloqueado no Brasil'
            };
        }

        const baseURL = 'https://testnet.binance.vision';

        try {
            // 1. Teste de conectividade
            console.log('1️⃣ Testando conectividade básica...');
            const pingResponse = await axios.get(`${baseURL}/api/v3/ping`, { timeout: 10000 });
            console.log('   ✅ Ping OK');

            // 2. Teste de autenticação
            console.log('2️⃣ Testando autenticação...');
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}&recvWindow=5000`;
            const signature = crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
            
            const headers = {
                'X-MBX-APIKEY': apiKey,
                'User-Agent': 'CoinbitClub-RealTest/1.0'
            };
            
            const authResponse = await axios.get(
                `${baseURL}/api/v3/account?${queryString}&signature=${signature}`,
                { headers, timeout: 15000 }
            );

            if (authResponse.status === 200) {
                console.log('   ✅ Autenticação OK');
                
                // 3. Verificar saldos
                console.log('3️⃣ Verificando saldos...');
                if (authResponse.data.balances) {
                    console.log('   💰 Saldos principais:');
                    authResponse.data.balances.forEach(balance => {
                        const free = parseFloat(balance.free);
                        if (free > 0) {
                            console.log(`      ${balance.asset}: ${free}`);
                        }
                    });
                }

                // 4. Teste CCXT
                console.log('4️⃣ Testando CCXT...');
                const ccxtBinance = new ccxt.binance({
                    apiKey: apiKey,
                    secret: secretKey,
                    sandbox: true,
                    enableRateLimit: true
                });

                const markets = await ccxtBinance.loadMarkets();
                console.log(`   ✅ CCXT OK - ${Object.keys(markets).length} mercados carregados`);

                return {
                    success: true,
                    status: 'FULLY_OPERATIONAL',
                    details: {
                        connectivity: 'OK',
                        authentication: 'OK',
                        balance_access: 'OK',
                        ccxt_integration: 'OK'
                    }
                };

            } else {
                console.log(`   ❌ Erro de autenticação: Status ${authResponse.status}`);
                return {
                    success: false,
                    status: 'AUTH_ERROR',
                    error: `HTTP ${authResponse.status}`
                };
            }

        } catch (error) {
            console.log(`   ❌ Erro: ${error.message}`);
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                if (errorData.msg && errorData.msg.includes('IP')) {
                    return {
                        success: false,
                        status: 'IP_BLOCKED',
                        error: `IP bloqueado: ${errorData.msg}`,
                        action_required: 'Adicionar IP nas configurações da API'
                    };
                }
            }

            return {
                success: false,
                status: 'CONNECTION_ERROR',
                error: error.message
            };
        }
    }

    /**
     * 🚀 EXECUTAR TESTE COMPLETO
     */
    async runCompleteTest() {
        console.log('\n🚀 EXECUTANDO TESTE COMPLETO...');
        console.log('==============================');

        const testResults = {
            timestamp: new Date().toISOString(),
            current_ip: null,
            ip_status: 'UNKNOWN',
            total_keys: 0,
            successful_tests: 0,
            failed_tests: 0,
            detailed_results: {},
            recommendations: []
        };

        // 1. Detectar IP atual
        await this.detectCurrentIP();
        testResults.current_ip = this.currentIP;
        testResults.ip_status = this.expectedIPs.includes(this.currentIP) ? 'AUTHORIZED' : 'UNAUTHORIZED';

        // 2. Buscar chaves
        const userKeys = await this.getActiveAPIKeys();
        
        // 3. Testar cada chave
        for (const [userId, userData] of Object.entries(userKeys)) {
            console.log(`\n👤 TESTANDO USUÁRIO: ${userData.username} (ID: ${userId})`);
            console.log('═'.repeat(60));

            const userResult = {
                username: userData.username,
                email: userData.email,
                tests: {},
                overall_status: 'UNKNOWN'
            };

            let userHasWorkingConnection = false;

            for (const keyData of userData.keys) {
                testResults.total_keys++;
                const testKey = `${keyData.exchange}_${keyData.environment}`;
                
                if (keyData.exchange === 'bybit') {
                    userResult.tests[testKey] = await this.testBybitAdvanced(
                        keyData.api_key,
                        keyData.secret_key,
                        keyData.environment
                    );
                } else if (keyData.exchange === 'binance') {
                    userResult.tests[testKey] = await this.testBinanceAdvanced(
                        keyData.api_key,
                        keyData.secret_key,
                        keyData.environment
                    );
                }

                if (userResult.tests[testKey].success) {
                    testResults.successful_tests++;
                    userHasWorkingConnection = true;
                } else {
                    testResults.failed_tests++;
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            userResult.overall_status = userHasWorkingConnection ? 'OPERATIONAL' : 'FAILED';
            testResults.detailed_results[userId] = userResult;
        }

        // 4. Gerar recomendações
        this.generateRecommendations(testResults);

        // 5. Exibir resumo final
        this.displayFinalSummary(testResults);

        return testResults;
    }

    /**
     * 💡 GERAR RECOMENDAÇÕES
     */
    generateRecommendations(testResults) {
        console.log('\n💡 GERANDO RECOMENDAÇÕES...');
        console.log('===========================');

        if (testResults.ip_status === 'UNAUTHORIZED') {
            testResults.recommendations.push({
                priority: 'HIGH',
                action: 'Adicionar IP atual nas configurações das APIs',
                details: `Adicionar ${testResults.current_ip} na whitelist`
            });
        }

        if (testResults.failed_tests > 0) {
            testResults.recommendations.push({
                priority: 'MEDIUM',
                action: 'Verificar chaves com falha',
                details: 'Algumas chaves falharam nos testes - verificar configuração'
            });
        }

        if (testResults.successful_tests === 0) {
            testResults.recommendations.push({
                priority: 'CRITICAL',
                action: 'Sistema não operacional',
                details: 'Nenhuma chave está funcionando - verificar urgentemente'
            });
        }

        testResults.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. [${rec.priority}] ${rec.action}`);
            console.log(`   ${rec.details}`);
        });
    }

    /**
     * 📋 EXIBIR RESUMO FINAL
     */
    displayFinalSummary(testResults) {
        console.log('\n📋 RESUMO FINAL DO TESTE');
        console.log('========================');
        console.log(`🕐 Timestamp: ${testResults.timestamp}`);
        console.log(`🌐 IP Atual: ${testResults.current_ip} (${testResults.ip_status})`);
        console.log(`🔑 Total de chaves testadas: ${testResults.total_keys}`);
        console.log(`✅ Testes bem-sucedidos: ${testResults.successful_tests}`);
        console.log(`❌ Testes com falha: ${testResults.failed_tests}`);
        
        const successRate = testResults.total_keys > 0 
            ? (testResults.successful_tests / testResults.total_keys * 100).toFixed(1)
            : 0;
        console.log(`📊 Taxa de sucesso: ${successRate}%`);

        if (testResults.successful_tests > 0) {
            console.log('\n🟢 STATUS: SISTEMA OPERACIONAL PARA TRADING REAL');
        } else {
            console.log('\n🔴 STATUS: SISTEMA NÃO OPERACIONAL - AÇÃO NECESSÁRIA');
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const tester = new RealConnectionTester();
    
    tester.runCompleteTest()
        .then(results => {
            console.log('\n🎯 TESTE COMPLETO FINALIZADO');
            process.exit(results.successful_tests > 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ ERRO NO TESTE:', error);
            process.exit(1);
        });
}

module.exports = RealConnectionTester;
