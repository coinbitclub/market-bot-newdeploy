#!/usr/bin/env node

/**
 * 🚀 COINBITCLUB SISTEMA PROFISSIONAL COMPLETO 2.0
 * ===============================================
 * 
 * SOLUÇÃO PROFISSIONAL COMPLETA que resolve DEFINITIVAMENTE o problema:
 * ✅ Validação automática de APIs funcionando
 * ✅ Executores integrados automaticamente 
 * ✅ Sistema de monitoramento profissional
 * ✅ Servidor Express com APIs completas
 * ✅ Zero falhas - abordagem enterprise
 */

console.log('\n🚀 COINBITCLUB SISTEMA PROFISSIONAL 2.0');
console.log('======================================');

const express = require('express');
const { Pool } = require('pg');
const ccxt = require('ccxt');
const crypto = require('crypto');

// Configuração principal
const CONFIG = {
    database: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    port: process.env.PORT || 3000,
    encryption: {
        key: 'coinbitclub2024_secret_key_for_encryption',
        algorithm: 'aes-256-cbc'
    }
};

class CoinbitClubProfessional {
    constructor() {
        this.pool = new Pool({
            connectionString: CONFIG.database,
            ssl: { rejectUnauthorized: false }
        });
        
        this.app = express();
        this.currentIP = null;
        this.validatedConnections = new Map();
        this.executors = new Map();
        this.systemStats = {
            totalKeys: 0,
            validatedKeys: 0,
            failedKeys: 0,
            startTime: Date.now()
        };
        
        console.log('✅ Sistema CoinbitClub Professional inicializado');
    }

    /**
     * 🔐 Descriptografar dados
     */
    decrypt(encryptedText) {
        try {
            if (!encryptedText || typeof encryptedText !== 'string' || !encryptedText.includes(':')) {
                return encryptedText;
            }
            
            const decipher = crypto.createDecipher(CONFIG.encryption.algorithm, CONFIG.encryption.key);
            const [, encrypted] = encryptedText.split(':');
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            return encryptedText;
        }
    }

    /**
     * 🌐 Detectar IP atual
     */
    async detectIP() {
        try {
            const axios = require('axios');
            const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            this.currentIP = response.data.ip;
            return this.currentIP;
        } catch (error) {
            this.currentIP = '127.0.0.1';
            return this.currentIP;
        }
    }

    /**
     * 🔑 Buscar chaves API
     */
    async buscarChavesAPI() {
        try {
            console.log('🔍 Buscando chaves API no banco...');
            
            const query = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    uak.id as key_id,
                    uak.exchange,
                    uak.environment,
                    uak.api_key,
                    uak.secret_key,
                    uak.is_active
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                    AND uak.is_active = true
                    AND uak.api_key IS NOT NULL
                    AND uak.secret_key IS NOT NULL
                    AND LENGTH(TRIM(uak.api_key)) > 10
                    AND LENGTH(TRIM(uak.secret_key)) > 10
                ORDER BY u.username, uak.exchange
            `;

            const result = await this.pool.query(query);
            const chaves = result.rows;
            
            console.log(`🔑 Encontradas ${chaves.length} chaves válidas para validação`);
            
            this.systemStats.totalKeys = chaves.length;
            return chaves;
            
        } catch (error) {
            console.error('❌ Erro ao buscar chaves:', error.message);
            throw error;
        }
    }

    /**
     * ✅ Validar chave Bybit
     */
    async validarBybit(apiKey, secretKey, environment = 'mainnet') {
        try {
            const baseURL = environment === 'testnet' 
                ? 'https://api-testnet.bybit.com' 
                : 'https://api.bybit.com';

            const axios = require('axios');
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            const params = { accountType: 'UNIFIED' };
            const queryString = new URLSearchParams(params).toString();
            
            const signPayload = timestamp + apiKey + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', secretKey).update(signPayload).digest('hex');
            
            const headers = {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            };

            const response = await axios.get(`${baseURL}/v5/account/wallet-balance?${queryString}`, {
                headers,
                timeout: 30000
            });

            if (response.data.retCode === 0) {
                const coins = response.data.result?.list?.[0]?.coin || [];
                let usdtBalance = 0;
                let totalUSD = 0;

                coins.forEach(coin => {
                    const balance = parseFloat(coin.walletBalance) || 0;
                    const usdValue = parseFloat(coin.usdValue) || 0;
                    
                    if (coin.coin === 'USDT') {
                        usdtBalance = balance;
                    }
                    totalUSD += usdValue;
                });

                return {
                    success: true,
                    balance: {
                        USDT: usdtBalance,
                        totalUSD: totalUSD.toFixed(2),
                        coinCount: coins.filter(c => parseFloat(c.walletBalance) > 0).length
                    }
                };
            } else {
                return {
                    success: false,
                    error: `Bybit Error ${response.data.retCode}: ${response.data.retMsg}`
                };
            }

        } catch (error) {
            return {
                success: false,
                error: `Conexão falhou: ${error.message}`
            };
        }
    }

    /**
     * ✅ Validar chave Binance
     */
    async validarBinance(apiKey, secretKey, environment = 'mainnet') {
        try {
            const exchange = new ccxt.binance({
                apiKey: apiKey,
                secret: secretKey,
                sandbox: environment === 'testnet',
                enableRateLimit: true,
                timeout: 30000
            });

            await exchange.loadMarkets();
            const balance = await exchange.fetchBalance();
            
            return {
                success: true,
                balance: {
                    USDT: balance.USDT?.total || 0,
                    totalUSD: balance.USDT?.total || 0,
                    coinCount: Object.keys(balance).filter(k => balance[k].total > 0).length
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Binance Error: ${error.message}`
            };
        }
    }

    /**
     * 🔄 Executar validação completa
     */
    async executarValidacaoCompleta() {
        console.log('\n🔄 EXECUTANDO VALIDAÇÃO COMPLETA PROFISSIONAL');
        console.log('===========================================');
        
        try {
            // 1. Detectar IP
            await this.detectIP();
            console.log(`🌐 IP detectado: ${this.currentIP}`);
            
            // 2. Buscar chaves
            const chaves = await this.buscarChavesAPI();
            
            if (chaves.length === 0) {
                console.log('⚠️ Nenhuma chave encontrada no banco');
                return false;
            }
            
            // 3. Validar cada chave
            console.log(`🔍 Validando ${chaves.length} chaves...`);
            
            let validadas = 0;
            let falharam = 0;
            
            for (const chave of chaves) {
                const keyId = `${chave.user_id}_${chave.exchange}_${chave.environment}`;
                
                try {
                    const apiKey = this.decrypt(chave.api_key);
                    const secretKey = this.decrypt(chave.secret_key);
                    
                    let resultado;
                    
                    if (chave.exchange === 'bybit') {
                        resultado = await this.validarBybit(apiKey, secretKey, chave.environment);
                    } else if (chave.exchange === 'binance') {
                        resultado = await this.validarBinance(apiKey, secretKey, chave.environment);
                    } else {
                        console.log(`⚠️ Exchange ${chave.exchange} não suportada`);
                        continue;
                    }
                    
                    if (resultado.success) {
                        console.log(`✅ ${chave.username} - ${chave.exchange} ${chave.environment}: CONECTADO ($${resultado.balance.totalUSD})`);
                        
                        // Armazenar conexão validada
                        this.validatedConnections.set(keyId, {
                            ...chave,
                            apiKey: apiKey,
                            secretKey: secretKey,
                            balance: resultado.balance,
                            lastValidated: new Date()
                        });
                        
                        // Criar executor
                        await this.criarExecutor(keyId, chave, apiKey, secretKey);
                        
                        validadas++;
                    } else {
                        console.log(`❌ ${chave.username} - ${chave.exchange} ${chave.environment}: FALHA (${resultado.error})`);
                        falharam++;
                    }
                    
                } catch (error) {
                    console.error(`❌ Erro na validação ${keyId}:`, error.message);
                    falharam++;
                }
            }
            
            this.systemStats.validatedKeys = validadas;
            this.systemStats.failedKeys = falharam;
            
            console.log('\n📊 RELATÓRIO FINAL');
            console.log('================');
            console.log(`🔑 Total de chaves: ${chaves.length}`);
            console.log(`✅ Chaves validadas: ${validadas}`);
            console.log(`❌ Chaves com falha: ${falharam}`);
            console.log(`🔗 Conexões ativas: ${this.validatedConnections.size}`);
            console.log(`⚙️ Executores ativos: ${this.executors.size}`);
            console.log(`📈 Taxa de sucesso: ${((validadas / chaves.length) * 100).toFixed(1)}%`);
            
            return validadas > 0;
            
        } catch (error) {
            console.error('❌ Erro na validação completa:', error.message);
            return false;
        }
    }

    /**
     * ⚙️ Criar executor para conexão validada
     */
    async criarExecutor(keyId, chave, apiKey, secretKey) {
        try {
            let ccxtInstance;
            
            if (chave.exchange === 'bybit') {
                ccxtInstance = new ccxt.bybit({
                    apiKey: apiKey,
                    secret: secretKey,
                    sandbox: chave.environment === 'testnet',
                    enableRateLimit: true,
                    options: { defaultType: 'linear' }
                });
            } else if (chave.exchange === 'binance') {
                ccxtInstance = new ccxt.binance({
                    apiKey: apiKey,
                    secret: secretKey,
                    sandbox: chave.environment === 'testnet',
                    enableRateLimit: true,
                    options: { defaultType: 'future' }
                });
            }
            
            if (ccxtInstance) {
                await ccxtInstance.loadMarkets();
                
                const executor = {
                    keyId: keyId,
                    userId: chave.user_id,
                    username: chave.username,
                    exchange: chave.exchange,
                    environment: chave.environment,
                    ccxtInstance: ccxtInstance,
                    status: 'ACTIVE',
                    totalTrades: 0,
                    lastActivity: new Date(),
                    
                    // Método para executar trade
                    executeTrade: async (symbol, side, amount) => {
                        try {
                            executor.lastActivity = new Date();
                            executor.totalTrades++;
                            
                            let order;
                            if (side === 'buy') {
                                order = await ccxtInstance.createMarketBuyOrder(symbol, amount);
                            } else {
                                order = await ccxtInstance.createMarketSellOrder(symbol, amount);
                            }
                            
                            console.log(`💰 Trade executado: ${executor.username} - ${side} ${amount} ${symbol}`);
                            
                            return {
                                success: true,
                                order: order,
                                executor: keyId
                            };
                            
                        } catch (error) {
                            console.error(`❌ Erro no trade ${keyId}:`, error.message);
                            return {
                                success: false,
                                error: error.message,
                                executor: keyId
                            };
                        }
                    }
                };
                
                this.executors.set(keyId, executor);
                console.log(`⚙️ Executor criado: ${chave.username} - ${chave.exchange}`);
                
                return executor;
            }
            
        } catch (error) {
            console.error(`❌ Erro ao criar executor ${keyId}:`, error.message);
            return null;
        }
    }

    /**
     * 🌐 Configurar servidor Express
     */
    configurarServidor() {
        // Middleware
        this.app.use(express.json());
        this.app.use(require('cors')());
        
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'RUNNING',
                system: 'CoinbitClub Professional',
                uptime: Date.now() - this.systemStats.startTime,
                connections: this.validatedConnections.size,
                executors: this.executors.size,
                stats: this.systemStats,
                ip: this.currentIP,
                timestamp: new Date().toISOString()
            });
        });

        // Status do sistema
        this.app.get('/api/system/status', (req, res) => {
            const connections = Array.from(this.validatedConnections.entries()).map(([key, conn]) => ({
                key,
                username: conn.username,
                exchange: conn.exchange,
                environment: conn.environment,
                balance: conn.balance,
                lastValidated: conn.lastValidated
            }));

            const executors = Array.from(this.executors.entries()).map(([key, exec]) => ({
                key,
                username: exec.username,
                exchange: exec.exchange,
                environment: exec.environment,
                status: exec.status,
                totalTrades: exec.totalTrades,
                lastActivity: exec.lastActivity
            }));

            res.json({
                system: 'OPERATIONAL',
                timestamp: new Date().toISOString(),
                connections: connections,
                executors: executors,
                balances: this.calcularSaldosTotal(),
                ip: this.currentIP
            });
        });

        // Executar trade
        this.app.post('/api/trade/execute', async (req, res) => {
            try {
                const { userId, exchange, environment, symbol, side, amount } = req.body;
                
                if (!userId || !exchange || !symbol || !side || !amount) {
                    return res.status(400).json({
                        error: 'Parâmetros obrigatórios: userId, exchange, symbol, side, amount'
                    });
                }
                
                const keyId = `${userId}_${exchange}_${environment || 'mainnet'}`;
                const executor = this.executors.get(keyId);
                
                if (!executor) {
                    return res.status(404).json({
                        error: 'Executor não encontrado para este usuário/exchange'
                    });
                }
                
                const result = await executor.executeTrade(symbol, side, amount);
                res.json(result);
                
            } catch (error) {
                res.status(500).json({
                    error: error.message
                });
            }
        });

        // Forçar validação
        this.app.post('/api/validation/force', async (req, res) => {
            try {
                const result = await this.executarValidacaoCompleta();
                res.json({
                    success: result,
                    message: result ? 'Validação concluída com sucesso' : 'Validação falhou',
                    stats: this.systemStats
                });
            } catch (error) {
                res.status(500).json({
                    error: error.message
                });
            }
        });

        console.log('🌐 Servidor Express configurado');
    }

    /**
     * 💰 Calcular saldos totais
     */
    calcularSaldosTotal() {
        let totalUSD = 0;
        let totalUSDT = 0;
        let totalAccounts = 0;
        
        for (const connection of this.validatedConnections.values()) {
            if (connection.balance) {
                totalUSD += parseFloat(connection.balance.totalUSD) || 0;
                totalUSDT += parseFloat(connection.balance.USDT) || 0;
                totalAccounts++;
            }
        }
        
        return {
            totalUSD: totalUSD.toFixed(2),
            totalUSDT: totalUSDT.toFixed(2),
            totalAccounts: totalAccounts
        };
    }

    /**
     * 🚀 Iniciar sistema completo
     */
    async iniciarSistema() {
        try {
            console.log('\n🚀 INICIANDO SISTEMA COINBITCLUB PROFISSIONAL');
            console.log('============================================');
            
            // Configurar servidor
            this.configurarServidor();
            
            // Executar validação inicial
            const sucesso = await this.executarValidacaoCompleta();
            
            if (!sucesso) {
                console.log('⚠️ Sistema iniciará em modo limitado - nenhuma conexão validada');
            }
            
            // Iniciar servidor
            this.app.listen(CONFIG.port, () => {
                console.log(`\n🎉 SISTEMA COINBITCLUB PROFISSIONAL ATIVO`);
                console.log('========================================');
                console.log(`📡 API: http://localhost:${CONFIG.port}`);
                console.log(`✅ Conexões: ${this.validatedConnections.size}`);
                console.log(`⚙️ Executores: ${this.executors.size}`);
                console.log(`🌐 IP: ${this.currentIP}`);
                console.log('\n📋 Endpoints disponíveis:');
                console.log('   GET /health - Status do sistema');
                console.log('   GET /api/system/status - Status detalhado');
                console.log('   POST /api/trade/execute - Executar trade');
                console.log('   POST /api/validation/force - Forçar validação');
                console.log('\n🔄 Sistema funcionando automaticamente!');
            });
            
            // Monitoramento contínuo
            setInterval(async () => {
                console.log('\n🔄 Revalidação automática...');
                await this.executarValidacaoCompleta();
            }, 5 * 60 * 1000); // A cada 5 minutos
            
            return true;
            
        } catch (error) {
            console.error('❌ ERRO CRÍTICO:', error.message);
            return false;
        }
    }
}

// Executar sistema
if (require.main === module) {
    const sistema = new CoinbitClubProfessional();
    sistema.iniciarSistema().then(sucesso => {
        if (!sucesso) {
            console.error('❌ Sistema falhou ao iniciar');
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ ERRO FATAL:', error.message);
        process.exit(1);
    });
}

module.exports = CoinbitClubProfessional;
