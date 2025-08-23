/**
 * 🚨 EMERGENCY EXCHANGE CONNECTOR - OPERAÇÃO REAL
 * ===============================================
 * 
 * Sistema de emergência para reconectar exchanges após IP fixo
 * Suporte simultâneo: TESTNET + MAINNET
 * Execução real de trades com fallback automático
 * 
 * Data: 11/08/2025
 * Versão: v1.0.0 EMERGENCY
 */

console.log('🚨 EMERGENCY EXCHANGE CONNECTOR - INICIANDO...');
console.log('===============================================');

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');
const ccxt = require('ccxt');

class EmergencyExchangeConnector {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });

        // 🔥 CONFIGURAÇÃO DUPLA: TESTNET + MAINNET SIMULTÂNEO
        this.exchangeConfigs = {
            bybit: {
                testnet: {
                    baseURL: 'https://api-testnet.bybit.com',
                    name: 'Bybit Testnet',
                    enabled: true
                },
                mainnet: {
                    baseURL: 'https://api.bybit.com',
                    name: 'Bybit Mainnet',
                    enabled: true
                }
            },
            binance: {
                testnet: {
                    baseURL: 'https://testnet.binance.vision',
                    name: 'Binance Testnet',
                    enabled: true
                },
                mainnet: {
                    baseURL: 'https://api.binance.com',
                    name: 'Binance Mainnet',
                    enabled: false // Bloqueado no Brasil
                }
            }
        };

        // 🌐 DETECÇÃO AUTOMÁTICA DE IP
        this.currentIP = null;
        this.publicURL = null;
        this.connectionStatus = {
            ip_detected: false,
            exchanges_connected: {},
            users_validated: 0,
            ready_for_trading: false
        };

        console.log('✅ Emergency Exchange Connector inicializado');
        console.log('🌐 Detectando configuração de rede...');
    }

    /**
     * 🌐 DETECTAR IP ATUAL E CONFIGURAÇÃO DE REDE
     */
    async detectNetworkConfiguration() {
        console.log('\n🌐 DETECTANDO CONFIGURAÇÃO DE REDE...');
        console.log('=====================================');

        try {
            // 1. Detectar IP público atual
            const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            this.currentIP = ipResponse.data.ip;
            console.log(`📍 IP Público Atual: ${this.currentIP}`);

            // 2. Verificar se é IP fixo (Ngrok)
            try {
                const ngrokResponse = await axios.get('http://127.0.0.1:4040/api/tunnels', { timeout: 3000 });
                if (ngrokResponse.data.tunnels && ngrokResponse.data.tunnels.length > 0) {
                    const tunnel = ngrokResponse.data.tunnels[0];
                    this.publicURL = tunnel.public_url;
                    console.log(`🔒 Ngrok Ativo: ${this.publicURL}`);
                    console.log(`🌐 IP Fixo Detectado: SIM`);
                } else {
                    console.log('⚠️ Ngrok: Nenhum túnel ativo');
                    console.log(`🌐 IP Fixo Detectado: NÃO`);
                }
            } catch (ngrokError) {
                console.log('⚠️ Ngrok não está rodando - IP dinâmico');
                console.log(`🌐 IP Fixo Detectado: NÃO`);
            }

            // 3. Verificar geolocalização
            try {
                const geoResponse = await axios.get(`http://ip-api.com/json/${this.currentIP}`, { timeout: 5000 });
                if (geoResponse.data.status === 'success') {
                    console.log(`🌍 Localização: ${geoResponse.data.country} (${geoResponse.data.countryCode})`);
                    console.log(`🏙️ Cidade: ${geoResponse.data.city}`);
                    console.log(`🏢 ISP: ${geoResponse.data.isp}`);
                    
                    // Ajustar configurações baseado na localização
                    if (geoResponse.data.countryCode === 'BR') {
                        console.log('🇧🇷 Brasil detectado - Binance Mainnet DESABILITADO');
                        this.exchangeConfigs.binance.mainnet.enabled = false;
                    }
                }
            } catch (geoError) {
                console.log('⚠️ Não foi possível detectar geolocalização');
            }

            this.connectionStatus.ip_detected = true;
            console.log('✅ Configuração de rede detectada com sucesso');

        } catch (error) {
            console.error('❌ Erro ao detectar configuração de rede:', error.message);
            this.connectionStatus.ip_detected = false;
        }
    }

    /**
     * 🔑 BUSCAR TODAS AS CHAVES DOS USUÁRIOS ATIVOS
     */
    async getAllActiveUserKeys() {
        console.log('\n🔑 BUSCANDO CHAVES DE USUÁRIOS ATIVOS...');
        console.log('========================================');

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
                    uak.validation_status
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                ORDER BY u.id, uak.exchange, uak.environment
            `;

            const result = await this.pool.query(query);
            console.log(`📊 Encontradas ${result.rows.length} chaves ativas de usuários`);

            // Agrupar por usuário
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
                    validation_status: row.validation_status
                });
            });

            console.log(`👥 Usuários únicos com chaves: ${Object.keys(userKeys).length}`);
            return userKeys;

        } catch (error) {
            console.error('❌ Erro ao buscar chaves dos usuários:', error.message);
            return {};
        }
    }

    /**
     * 🧪 TESTAR CONEXÃO ESPECÍFICA COM EXCHANGE
     */
    async testExchangeConnection(exchange, environment, apiKey, secretKey) {
        const config = this.exchangeConfigs[exchange][environment];
        
        if (!config.enabled) {
            return {
                success: false,
                reason: 'Exchange/Environment desabilitado',
                status: 'DISABLED'
            };
        }

        try {
            if (exchange === 'bybit') {
                return await this.testBybitConnection(config.baseURL, apiKey, secretKey);
            } else if (exchange === 'binance') {
                return await this.testBinanceConnection(config.baseURL, apiKey, secretKey);
            }
        } catch (error) {
            return {
                success: false,
                reason: error.message,
                status: 'ERROR'
            };
        }
    }

    /**
     * 🟣 TESTAR CONEXÃO BYBIT V5
     */
    async testBybitConnection(baseURL, apiKey, secretKey) {
        try {
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            
            // Testar endpoint de saldo
            const params = { accountType: 'UNIFIED' };
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
                'User-Agent': 'CoinbitClub-Emergency-Connector/1.0'
            };
            
            const response = await axios.get(`${baseURL}/v5/account/wallet-balance?${queryString}`, {
                headers,
                timeout: 10000
            });

            if (response.data.retCode === 0) {
                // Verificar saldo USDT
                let usdtBalance = 0;
                const result = response.data.result;
                if (result && result.list && result.list.length > 0) {
                    const account = result.list[0];
                    if (account.coin) {
                        const usdtCoin = account.coin.find(c => c.coin === 'USDT');
                        if (usdtCoin) {
                            usdtBalance = parseFloat(usdtCoin.walletBalance) || 0;
                        }
                    }
                }

                return {
                    success: true,
                    status: 'CONNECTED',
                    balance: {
                        USDT: usdtBalance
                    },
                    response_time: response.headers['x-response-time'] || 'unknown',
                    server_time: response.data.time
                };
            } else {
                return {
                    success: false,
                    reason: response.data.retMsg || 'Erro desconhecido',
                    status: 'API_ERROR',
                    error_code: response.data.retCode
                };
            }

        } catch (error) {
            return {
                success: false,
                reason: this.parseBybitError(error),
                status: 'CONNECTION_ERROR'
            };
        }
    }

    /**
     * 🟡 TESTAR CONEXÃO BINANCE V3
     */
    async testBinanceConnection(baseURL, apiKey, secretKey) {
        try {
            const timestamp = Date.now();
            const recvWindow = 5000;
            
            const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
            const signature = crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
            
            const headers = {
                'X-MBX-APIKEY': apiKey,
                'Content-Type': 'application/json',
                'User-Agent': 'CoinbitClub-Emergency-Connector/1.0'
            };
            
            const response = await axios.get(
                `${baseURL}/api/v3/account?${queryString}&signature=${signature}`,
                { headers, timeout: 10000 }
            );

            if (response.status === 200) {
                // Verificar saldo USDT
                let usdtBalance = 0;
                if (response.data.balances) {
                    const usdtAsset = response.data.balances.find(b => b.asset === 'USDT');
                    if (usdtAsset) {
                        usdtBalance = parseFloat(usdtAsset.free) || 0;
                    }
                }

                return {
                    success: true,
                    status: 'CONNECTED',
                    balance: {
                        USDT: usdtBalance
                    },
                    response_time: response.headers['x-response-time'] || 'unknown',
                    server_time: response.data.serverTime
                };
            } else {
                return {
                    success: false,
                    reason: 'Resposta inválida da API',
                    status: 'API_ERROR'
                };
            }

        } catch (error) {
            return {
                success: false,
                reason: this.parseBinanceError(error),
                status: 'CONNECTION_ERROR'
            };
        }
    }

    /**
     * 🔍 VALIDAR TODAS AS CONEXÕES DOS USUÁRIOS
     */
    async validateAllUserConnections() {
        console.log('\n🔍 VALIDANDO CONEXÕES DE TODOS OS USUÁRIOS...');
        console.log('==============================================');

        const userKeys = await this.getAllActiveUserKeys();
        const validationResults = {
            total_users: Object.keys(userKeys).length,
            total_keys: 0,
            successful_connections: 0,
            failed_connections: 0,
            users_ready: 0,
            detailed_results: {}
        };

        for (const [userId, userData] of Object.entries(userKeys)) {
            console.log(`\n👤 VALIDANDO USUÁRIO: ${userData.username} (ID: ${userId})`);
            console.log('─'.repeat(60));

            const userResult = {
                username: userData.username,
                email: userData.email,
                connections: {},
                status: 'UNKNOWN',
                ready_for_trading: false
            };

            let userHasValidConnection = false;

            for (const keyData of userData.keys) {
                validationResults.total_keys++;
                console.log(`  🔑 Testando ${keyData.exchange.toUpperCase()} ${keyData.environment}...`);

                const connectionResult = await this.testExchangeConnection(
                    keyData.exchange,
                    keyData.environment,
                    keyData.api_key,
                    keyData.secret_key
                );

                const connectionKey = `${keyData.exchange}_${keyData.environment}`;
                userResult.connections[connectionKey] = {
                    ...connectionResult,
                    api_key_preview: keyData.api_key.substring(0, 12) + '...'
                };

                if (connectionResult.success) {
                    console.log(`     ✅ CONECTADO - Saldo USDT: ${connectionResult.balance?.USDT || 0}`);
                    validationResults.successful_connections++;
                    userHasValidConnection = true;

                    // Atualizar status no banco
                    await this.updateKeyValidationStatus(userId, keyData.exchange, keyData.environment, 'CONNECTED', null);
                } else {
                    console.log(`     ❌ FALHOU - ${connectionResult.reason}`);
                    validationResults.failed_connections++;

                    // Atualizar status no banco
                    await this.updateKeyValidationStatus(userId, keyData.exchange, keyData.environment, 'FAILED', connectionResult.reason);
                }

                // Aguardar um pouco entre requests para evitar rate limit
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Determinar status final do usuário
            if (userHasValidConnection) {
                userResult.status = 'READY';
                userResult.ready_for_trading = true;
                validationResults.users_ready++;
                console.log(`  🟢 USUÁRIO PRONTO PARA TRADING`);
            } else {
                userResult.status = 'NO_VALID_CONNECTIONS';
                userResult.ready_for_trading = false;
                console.log(`  🔴 USUÁRIO SEM CONEXÕES VÁLIDAS`);
            }

            validationResults.detailed_results[userId] = userResult;
        }

        console.log('\n📊 RESUMO DA VALIDAÇÃO:');
        console.log('=======================');
        console.log(`👥 Total de usuários: ${validationResults.total_users}`);
        console.log(`🔑 Total de chaves testadas: ${validationResults.total_keys}`);
        console.log(`✅ Conexões bem-sucedidas: ${validationResults.successful_connections}`);
        console.log(`❌ Conexões falharam: ${validationResults.failed_connections}`);
        console.log(`🟢 Usuários prontos: ${validationResults.users_ready}`);
        console.log(`🔴 Usuários sem conexão: ${validationResults.total_users - validationResults.users_ready}`);

        // Atualizar status global
        this.connectionStatus.users_validated = validationResults.total_users;
        this.connectionStatus.ready_for_trading = validationResults.users_ready > 0;

        return validationResults;
    }

    /**
     * 💾 ATUALIZAR STATUS DE VALIDAÇÃO NO BANCO
     */
    async updateKeyValidationStatus(userId, exchange, environment, status, errorMessage) {
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
            console.error('❌ Erro ao atualizar status no banco:', error.message);
        }
    }

    /**
     * 🔧 CONFIGURAR EXCHANGES CCXT PARA OPERAÇÃO REAL
     */
    async setupCCXTExchanges() {
        console.log('\n🔧 CONFIGURANDO EXCHANGES CCXT PARA OPERAÇÃO REAL...');
        console.log('====================================================');

        const userKeys = await this.getAllActiveUserKeys();
        const ccxtInstances = {};

        for (const [userId, userData] of Object.entries(userKeys)) {
            console.log(`\n👤 Configurando CCXT para: ${userData.username} (ID: ${userId})`);
            
            ccxtInstances[userId] = {
                username: userData.username,
                exchanges: {}
            };

            for (const keyData of userData.keys) {
                const connectionKey = `${keyData.exchange}_${keyData.environment}`;
                
                try {
                    if (keyData.exchange === 'bybit') {
                        const bybitInstance = new ccxt.bybit({
                            apiKey: keyData.api_key,
                            secret: keyData.secret_key,
                            sandbox: keyData.environment === 'testnet',
                            enableRateLimit: true,
                            options: {
                                defaultType: 'linear'
                            }
                        });
                        
                        ccxtInstances[userId].exchanges[connectionKey] = bybitInstance;
                        console.log(`  ✅ Bybit ${keyData.environment} configurado`);
                        
                    } else if (keyData.exchange === 'binance' && this.exchangeConfigs.binance[keyData.environment].enabled) {
                        const binanceInstance = new ccxt.binance({
                            apiKey: keyData.api_key,
                            secret: keyData.secret_key,
                            sandbox: keyData.environment === 'testnet',
                            enableRateLimit: true,
                            options: {
                                defaultType: 'future'
                            }
                        });
                        
                        ccxtInstances[userId].exchanges[connectionKey] = binanceInstance;
                        console.log(`  ✅ Binance ${keyData.environment} configurado`);
                    }
                } catch (error) {
                    console.log(`  ❌ Erro ao configurar ${keyData.exchange} ${keyData.environment}: ${error.message}`);
                }
            }
        }

        console.log(`\n✅ CCXT configurado para ${Object.keys(ccxtInstances).length} usuários`);
        return ccxtInstances;
    }

    /**
     * 🚀 EXECUTAR ORDEM REAL MULTIUSUÁRIO
     */
    async executeRealOrder(signalData) {
        console.log('\n🚀 EXECUTANDO ORDEM REAL MULTIUSUÁRIO...');
        console.log('=========================================');
        console.log('📊 Sinal recebido:', signalData);

        const ccxtInstances = await this.setupCCXTExchanges();
        const executionResults = {
            signal_data: signalData,
            execution_timestamp: new Date().toISOString(),
            total_users: Object.keys(ccxtInstances).length,
            successful_executions: 0,
            failed_executions: 0,
            detailed_results: {}
        };

        for (const [userId, userData] of Object.entries(ccxtInstances)) {
            console.log(`\n👤 Executando para usuário: ${userData.username} (ID: ${userId})`);
            
            const userResult = {
                username: userData.username,
                executions: {},
                status: 'PENDING'
            };

            for (const [exchangeKey, exchangeInstance] of Object.entries(userData.exchanges)) {
                console.log(`  🔄 Executando em ${exchangeKey}...`);
                
                try {
                    // Preparar parâmetros da ordem
                    const orderParams = this.prepareOrderParams(signalData);
                    
                    // Executar ordem
                    const order = await exchangeInstance.createMarketOrder(
                        orderParams.symbol,
                        orderParams.side,
                        orderParams.amount
                    );

                    userResult.executions[exchangeKey] = {
                        status: 'SUCCESS',
                        order_id: order.id,
                        symbol: order.symbol,
                        side: order.side,
                        amount: order.amount,
                        price: order.price || 'MARKET',
                        timestamp: order.timestamp
                    };

                    console.log(`    ✅ SUCESSO - Order ID: ${order.id}`);
                    executionResults.successful_executions++;

                    // Salvar no banco
                    await this.saveOrderExecution(userId, exchangeKey, order, signalData);

                } catch (error) {
                    userResult.executions[exchangeKey] = {
                        status: 'ERROR',
                        error: error.message,
                        timestamp: new Date().toISOString()
                    };

                    console.log(`    ❌ ERRO - ${error.message}`);
                    executionResults.failed_executions++;

                    // Salvar erro no banco
                    await this.saveOrderError(userId, exchangeKey, error.message, signalData);
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            userResult.status = Object.values(userResult.executions).some(e => e.status === 'SUCCESS') ? 'SUCCESS' : 'FAILED';
            executionResults.detailed_results[userId] = userResult;
        }

        console.log('\n📊 RESUMO DA EXECUÇÃO:');
        console.log('======================');
        console.log(`👥 Total de usuários: ${executionResults.total_users}`);
        console.log(`✅ Execuções bem-sucedidas: ${executionResults.successful_executions}`);
        console.log(`❌ Execuções falharam: ${executionResults.failed_executions}`);

        return executionResults;
    }

    /**
     * 📝 PREPARAR PARÂMETROS DA ORDEM
     */
    prepareOrderParams(signalData) {
        return {
            symbol: signalData.symbol || 'BTCUSDT',
            side: (signalData.action || signalData.signal || 'BUY').toLowerCase(),
            amount: signalData.quantity || 0.001,
            type: 'market'
        };
    }

    /**
     * 💾 SALVAR EXECUÇÃO DE ORDEM NO BANCO
     */
    async saveOrderExecution(userId, exchangeKey, order, signalData) {
        try {
            await this.pool.query(`
                INSERT INTO trading_executions (
                    user_id, exchange, order_id, symbol, side, amount,
                    price, status, signal_data, executed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                userId,
                exchangeKey,
                order.id,
                order.symbol,
                order.side,
                order.amount,
                order.price || 0,
                'SUCCESS',
                JSON.stringify(signalData),
                new Date()
            ]);
        } catch (error) {
            console.error('❌ Erro ao salvar execução:', error.message);
        }
    }

    /**
     * ⚠️ SALVAR ERRO DE EXECUÇÃO NO BANCO
     */
    async saveOrderError(userId, exchangeKey, errorMessage, signalData) {
        try {
            await this.pool.query(`
                INSERT INTO trading_executions (
                    user_id, exchange, status, error_message, signal_data, executed_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                userId,
                exchangeKey,
                'ERROR',
                errorMessage,
                JSON.stringify(signalData),
                new Date()
            ]);
        } catch (error) {
            console.error('❌ Erro ao salvar erro:', error.message);
        }
    }

    /**
     * 🔍 PARSE DE ERROS BYBIT
     */
    parseBybitError(error) {
        if (error.response) {
            const data = error.response.data;
            if (data && data.retMsg) {
                if (data.retMsg.includes('IP')) {
                    return `IP bloqueado: ${data.retMsg} (Configurar whitelist)`;
                }
                return data.retMsg;
            }
            return `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
        return error.message;
    }

    /**
     * 🔍 PARSE DE ERROS BINANCE
     */
    parseBinanceError(error) {
        if (error.response) {
            const data = error.response.data;
            if (data && data.msg) {
                if (data.msg.includes('IP')) {
                    return `IP bloqueado: ${data.msg} (Configurar whitelist)`;
                }
                return data.msg;
            }
            return `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
        return error.message;
    }

    /**
     * 🎯 EXECUTAR DIAGNÓSTICO COMPLETO
     */
    async runCompleteDiagnostic() {
        console.log('\n🎯 EXECUTANDO DIAGNÓSTICO COMPLETO...');
        console.log('====================================');

        const diagnosticResults = {
            timestamp: new Date().toISOString(),
            network_config: {},
            connection_validation: {},
            system_status: 'UNKNOWN'
        };

        // 1. Detectar configuração de rede
        await this.detectNetworkConfiguration();
        diagnosticResults.network_config = {
            current_ip: this.currentIP,
            public_url: this.publicURL,
            ip_fixed: !!this.publicURL
        };

        // 2. Validar todas as conexões
        const validationResults = await this.validateAllUserConnections();
        diagnosticResults.connection_validation = validationResults;

        // 3. Determinar status do sistema
        if (validationResults.users_ready > 0) {
            diagnosticResults.system_status = 'OPERATIONAL';
            console.log('\n🟢 SISTEMA OPERACIONAL - PRONTO PARA TRADING REAL');
        } else {
            diagnosticResults.system_status = 'CRITICAL';
            console.log('\n🔴 SISTEMA CRÍTICO - NENHUM USUÁRIO PRONTO');
        }

        return diagnosticResults;
    }
}

module.exports = EmergencyExchangeConnector;

// Se executado diretamente
if (require.main === module) {
    console.log('🚨 EXECUTANDO DIAGNÓSTICO DE EMERGÊNCIA...');
    const connector = new EmergencyExchangeConnector();
    
    connector.runCompleteDiagnostic()
        .then(results => {
            console.log('\n📋 RESULTADOS DO DIAGNÓSTICO:');
            console.log('=============================');
            console.log(JSON.stringify(results, null, 2));
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ ERRO NO DIAGNÓSTICO:', error);
            process.exit(1);
        });
}
