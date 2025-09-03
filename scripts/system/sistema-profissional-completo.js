#!/usr/bin/env node

/**
 * 🚀 SISTEMA PROFISSIONAL COMPLETO - COINBITCLUB
 * ==============================================
 * 
 * SOLUÇÃO COMPLETA E PROFISSIONAL que integra:
 * - Sistema de validação automática avançado
 * - Executores automáticos integrados
 * - Servidor Express com APIs completas
 * - Monitoramento em tempo real
 * - Trading automático profissional
 * - Tratamento de erros robusto
 * - Sistema de logs avançado
 * 
 * ABORDAGEM PROFISSIONAL - ZERO FALHAS
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const ccxt = require('ccxt');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// Configuração do banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class SistemaProfissionalCompleto extends EventEmitter {
    constructor() {
        super();
        
        // Configurações do sistema
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.currentIP = null;
        this.isSystemRunning = false;
        this.startTime = Date.now();
        
        // Sistema de criptografia
        this.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'coinbitclub2024_secret_key_for_encryption';
        this.ALGORITHM = 'aes-256-cbc';
        
        // Cache e conexões
        this.validatedConnections = new Map();
        this.connectionInstances = new Map();
        this.executorsPool = new Map();
        this.activePositions = new Map();
        
        // Configurações avançadas
        this.config = {
            validation: {
                intervalMs: 5 * 60 * 1000, // 5 minutos
                retryAttempts: 5,
                timeoutMs: 45000,
                healthCheckIntervalMs: 60 * 1000 // 1 minuto
            },
            trading: {
                enabled: process.env.ENABLE_REAL_TRADING === 'true',
                maxLeverage: parseInt(process.env.MAX_LEVERAGE) || 10,
                stopLossRequired: true,
                takeProfitRequired: true
            },
            monitoring: {
                logLevel: 'INFO',
                saveStateInterval: 10 * 60 * 1000, // 10 minutos
                alertThresholds: {
                    failureRate: 0.2, // 20% falha
                    responseTime: 5000 // 5 segundos
                }
            }
        };
        
        // Estatísticas do sistema
        this.systemStats = {
            totalKeys: 0,
            validatedKeys: 0,
            failedKeys: 0,
            activeConnections: 0,
            activeExecutors: 0,
            totalTrades: 0,
            successfulTrades: 0,
            lastValidation: null,
            uptime: Date.now(),
            errors: []
        };
        
        console.log('🚀 SISTEMA PROFISSIONAL COMPLETO INICIALIZANDO...');
        this.initializeSystem();
    }

    /**
     * 🔧 INICIALIZAÇÃO DO SISTEMA
     */
    async initializeSystem() {
        try {
            // Configurar tratamento de erros
            this.setupErrorHandling();
            
            // Configurar servidor Express
            this.setupExpressServer();
            
            // Verificar dependências
            await this.verifyDependencies();
            
            console.log('✅ Sistema inicializado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error.message);
            process.exit(1);
        }
    }

    /**
     * 🔧 CONFIGURAR TRATAMENTO DE ERROS
     */
    setupErrorHandling() {
        // Tratamento de erros não capturados
        process.on('uncaughtException', (error) => {
            console.error('❌ Erro não capturado:', error.message);
            this.logError('UNCAUGHT_EXCEPTION', error);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Promise rejeitada não tratada:', reason);
            this.logError('UNHANDLED_REJECTION', reason);
        });

        // Sinais de sistema
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    }

    /**
     * 📝 LOGGING AVANÇADO
     */
    logError(type, error) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            type: type,
            message: error.message || error,
            stack: error.stack || null,
            systemState: {
                validatedConnections: this.validatedConnections.size,
                activeExecutors: this.executorsPool.size,
                uptime: Date.now() - this.startTime
            }
        };
        
        this.systemStats.errors.push(errorLog);
        
        // Manter apenas os últimos 100 erros
        if (this.systemStats.errors.length > 100) {
            this.systemStats.errors = this.systemStats.errors.slice(-100);
        }
        
        // Salvar em arquivo
        try {
            const logFile = path.join(__dirname, 'system-errors.log');
            fs.appendFileSync(logFile, JSON.stringify(errorLog) + '\n');
        } catch (logError) {
            console.error('❌ Erro ao salvar log:', logError.message);
        }
    }

    /**
     * 🌐 CONFIGURAR SERVIDOR EXPRESS
     */
    setupExpressServer() {
        // Middleware
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Middleware de logging
        this.app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const duration = Date.now() - start;
                console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
            });
            next();
        });

        this.setupRoutes();
        console.log('🌐 Servidor Express configurado');
    }

    /**
     * 🛣️ CONFIGURAR ROTAS DA API
     */
    setupRoutes() {
        // Health check avançado
        this.app.get('/health', (req, res) => {
            const stats = this.getDetailedSystemStats();
            res.json({
                status: this.isSystemRunning ? 'RUNNING' : 'STARTING',
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.startTime,
                version: '2.0.0-professional',
                stats: stats,
                endpoints: this.getAvailableEndpoints()
            });
        });

        // Status completo do sistema
        this.app.get('/api/system/status', async (req, res) => {
            try {
                const dbStatus = await this.checkDatabaseConnection();
                const validationStats = this.getValidationStats();
                const executorStats = this.getExecutorStats();
                
                res.json({
                    system: 'COINBITCLUB_PROFESSIONAL',
                    status: 'OPERATIONAL',
                    database: dbStatus,
                    validation: validationStats,
                    executors: executorStats,
                    trading: {
                        enabled: this.config.trading.enabled,
                        totalTrades: this.systemStats.totalTrades,
                        successRate: this.systemStats.totalTrades > 0 
                            ? (this.systemStats.successfulTrades / this.systemStats.totalTrades * 100).toFixed(1) + '%'
                            : 'N/A'
                    },
                    ip: this.currentIP,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                res.status(500).json({
                    error: 'Erro ao obter status',
                    details: error.message
                });
            }
        });

        // Validação forçada
        this.app.post('/api/validation/force', async (req, res) => {
            try {
                console.log('🔄 Validação forçada solicitada via API');
                const result = await this.executeCompleteValidation();
                
                res.json({
                    success: result.success,
                    message: result.message,
                    stats: result.stats,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Listar conexões validadas
        this.app.get('/api/connections', (req, res) => {
            const connections = Array.from(this.validatedConnections.entries()).map(([key, conn]) => ({
                key,
                username: conn.username,
                exchange: conn.exchange,
                environment: conn.environment,
                balance: conn.balance,
                lastValidated: conn.lastValidated,
                status: 'ACTIVE'
            }));

            res.json({
                total: connections.length,
                connections: connections,
                timestamp: new Date().toISOString()
            });
        });

        // Status dos executores
        this.app.get('/api/executors', (req, res) => {
            const executors = Array.from(this.executorsPool.entries()).map(([key, executor]) => ({
                key,
                userId: executor.userId,
                username: executor.username,
                exchange: executor.exchange,
                environment: executor.environment,
                status: executor.status,
                lastActivity: executor.lastActivity,
                totalTrades: executor.totalTrades || 0,
                successRate: executor.getSuccessRate ? executor.getSuccessRate() : 'N/A'
            }));

            res.json({
                total: this.executorsPool.size,
                active: executors.filter(e => e.status === 'ACTIVE').length,
                executors: executors,
                timestamp: new Date().toISOString()
            });
        });

        // Executar trade profissional
        this.app.post('/api/trade/execute', async (req, res) => {
            try {
                const tradeRequest = req.body;
                const result = await this.executeProfessionalTrade(tradeRequest);
                
                res.json(result);
                
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Logs do sistema
        this.app.get('/api/system/logs', (req, res) => {
            const limit = parseInt(req.query.limit) || 50;
            const logs = this.systemStats.errors.slice(-limit);
            
            res.json({
                total: this.systemStats.errors.length,
                showing: logs.length,
                logs: logs,
                timestamp: new Date().toISOString()
            });
        });

        // Dashboard dados em tempo real
        this.app.get('/api/dashboard/realtime', (req, res) => {
            res.json({
                system: {
                    status: this.isSystemRunning ? 'RUNNING' : 'STOPPED',
                    uptime: Date.now() - this.startTime,
                    currentIP: this.currentIP
                },
                validation: {
                    totalKeys: this.systemStats.totalKeys,
                    validatedKeys: this.systemStats.validatedKeys,
                    successRate: this.systemStats.totalKeys > 0 
                        ? (this.systemStats.validatedKeys / this.systemStats.totalKeys * 100).toFixed(1) + '%'
                        : '0%',
                    lastValidation: this.systemStats.lastValidation
                },
                trading: {
                    enabled: this.config.trading.enabled,
                    activeExecutors: this.executorsPool.size,
                    totalTrades: this.systemStats.totalTrades,
                    successfulTrades: this.systemStats.successfulTrades
                },
                balances: this.getTotalBalances(),
                timestamp: new Date().toISOString()
            });
        });

        console.log('🛣️ Rotas da API configuradas');
    }

    /**
     * 🔐 SISTEMA DE DESCRIPTOGRAFIA
     */
    decrypt(encryptedText) {
        try {
            if (!encryptedText || typeof encryptedText !== 'string') {
                return encryptedText; // Retorna como está se não for string
            }

            // Se não contém ':', provavelmente não está criptografado
            if (!encryptedText.includes(':')) {
                return encryptedText;
            }

            const [ivHex, encrypted] = encryptedText.split(':');
            if (!ivHex || !encrypted) {
                return encryptedText; // Retorna original se formato inválido
            }

            const decipher = crypto.createDecipher(this.ALGORITHM, this.ENCRYPTION_KEY);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
            
        } catch (error) {
            console.warn(`⚠️ Falha na descriptografia, usando valor original: ${error.message}`);
            return encryptedText; // Retorna original em caso de erro
        }
    }

    /**
     * 🌐 DETECÇÃO AUTOMÁTICA DE IP
     */
    async detectCurrentIP() {
        const ipServices = [
            'https://api.ipify.org?format=json',
            'https://ipapi.co/ip/',
            'https://icanhazip.com',
            'https://ifconfig.me/ip',
            'https://httpbin.org/ip'
        ];

        for (const service of ipServices) {
            try {
                const response = await axios.get(service, { timeout: 5000 });
                const ip = typeof response.data === 'string' 
                    ? response.data.trim() 
                    : response.data.ip || response.data.origin;
                
                if (ip && ip.length > 0) {
                    this.currentIP = ip;
                    return this.currentIP;
                }
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Não foi possível detectar IP público');
    }

    /**
     * 🔍 VERIFICAR DEPENDÊNCIAS
     */
    async verifyDependencies() {
        console.log('🔍 Verificando dependências do sistema...');
        
        const checks = [
            { name: 'PostgreSQL', test: () => this.checkDatabaseConnection() },
            { name: 'IP Detection', test: () => this.detectCurrentIP() },
            { name: 'Exchange APIs', test: () => this.testExchangeConnectivity() }
        ];

        for (const check of checks) {
            try {
                await check.test();
                console.log(`✅ ${check.name}: OK`);
            } catch (error) {
                console.error(`❌ ${check.name}: FALHA - ${error.message}`);
                throw new Error(`Dependência ${check.name} não atendida`);
            }
        }
        
        console.log('✅ Todas as dependências verificadas');
    }

    /**
     * 🗄️ VERIFICAR CONEXÃO COM BANCO
     */
    async checkDatabaseConnection() {
        try {
            const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
            return {
                status: 'CONNECTED',
                currentTime: result.rows[0].current_time,
                version: result.rows[0].pg_version.split(' ')[0],
                poolStats: {
                    total: pool.totalCount,
                    idle: pool.idleCount,
                    waiting: pool.waitingCount
                }
            };
        } catch (error) {
            throw new Error(`Falha na conexão PostgreSQL: ${error.message}`);
        }
    }

    /**
     * 🌐 TESTAR CONECTIVIDADE COM EXCHANGES
     */
    async testExchangeConnectivity() {
        const exchanges = [
            { name: 'Bybit Mainnet', url: 'https://api.bybit.com/v5/market/time' },
            { name: 'Bybit Testnet', url: 'https://api-testnet.bybit.com/v5/market/time' },
            { name: 'Binance Mainnet', url: 'https://api.binance.com/api/v3/time' },
            { name: 'Binance Testnet', url: 'https://testnet.binance.vision/api/v3/time' }
        ];

        const results = [];
        
        for (const exchange of exchanges) {
            try {
                const response = await axios.get(exchange.url, { 
                    timeout: 10000,
                    headers: { 'User-Agent': 'CoinbitClub-Professional/2.0' }
                });
                
                results.push({
                    name: exchange.name,
                    status: 'ACCESSIBLE',
                    responseTime: response.headers['x-response-time'] || 'unknown'
                });
                
            } catch (error) {
                results.push({
                    name: exchange.name,
                    status: 'BLOCKED',
                    error: error.response?.status || error.code
                });
            }
        }
        
        const accessible = results.filter(r => r.status === 'ACCESSIBLE').length;
        if (accessible === 0) {
            throw new Error('Nenhuma exchange acessível');
        }
        
        return results;
    }

    /**
     * 🔑 BUSCAR TODAS AS CHAVES NO BANCO
     */
    async fetchAllApiKeys() {
        try {
            console.log('🔍 Buscando chaves API no banco...');
            
            // Query profissional com joins e validações
            const query = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    u.is_active as user_active,
                    uak.id as key_id,
                    uak.exchange,
                    uak.environment,
                    uak.api_key,
                    uak.secret_key,
                    uak.is_active as key_active,
                    uak.validation_status,
                    uak.last_validated_at,
                    uak.error_details,
                    uak.created_at,
                    uak.updated_at
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                    AND uak.is_active = true
                    AND uak.api_key IS NOT NULL
                    AND uak.secret_key IS NOT NULL
                    AND LENGTH(TRIM(uak.api_key)) > 10
                    AND LENGTH(TRIM(uak.secret_key)) > 10
                ORDER BY u.id, uak.exchange, uak.environment
            `;

            const result = await pool.query(query);
            const keys = result.rows;
            
            console.log(`🔑 Encontradas ${keys.length} chaves válidas para validação`);
            
            // Log detalhado das chaves encontradas
            keys.forEach(key => {
                console.log(`   📋 ${key.username} - ${key.exchange} ${key.environment} (Key ID: ${key.key_id})`);
            });
            
            this.systemStats.totalKeys = keys.length;
            return keys;
            
        } catch (error) {
            console.error('❌ Erro ao buscar chaves API:', error.message);
            this.logError('FETCH_KEYS_ERROR', error);
            throw error;
        }
    }

    /**
     * ✅ VALIDAR CHAVE INDIVIDUAL (BYBIT)
     */
    async validateBybitKey(apiKey, secretKey, environment = 'mainnet') {
        try {
            const baseURL = environment === 'testnet' 
                ? 'https://api-testnet.bybit.com' 
                : 'https://api.bybit.com';

            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            const params = { accountType: 'UNIFIED' };
            const queryString = new URLSearchParams(params).toString();
            
            // Assinatura Bybit V5
            const signPayload = timestamp + apiKey + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', secretKey).update(signPayload).digest('hex');
            
            const headers = {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json',
                'User-Agent': 'CoinbitClub-Professional/2.0'
            };

            const response = await axios.get(`${baseURL}/v5/account/wallet-balance?${queryString}`, {
                headers,
                timeout: this.config.validation.timeoutMs
            });

            if (response.data.retCode === 0) {
                const balance = this.extractBybitBalance(response.data);
                return {
                    success: true,
                    balance: balance,
                    responseCode: response.data.retCode,
                    responseTime: response.headers['x-response-time'] || 'unknown',
                    timestamp: new Date()
                };
            } else {
                return {
                    success: false,
                    error: `Bybit Error ${response.data.retCode}: ${response.data.retMsg}`,
                    timestamp: new Date()
                };
            }

        } catch (error) {
            return {
                success: false,
                error: `Connection Error: ${error.message}`,
                timestamp: new Date()
            };
        }
    }

    /**
     * ✅ VALIDAR CHAVE INDIVIDUAL (BINANCE)
     */
    async validateBinanceKey(apiKey, secretKey, environment = 'mainnet') {
        try {
            const exchange = new ccxt.binance({
                apiKey: apiKey,
                secret: secretKey,
                sandbox: environment === 'testnet',
                enableRateLimit: true,
                timeout: this.config.validation.timeoutMs,
                headers: {
                    'User-Agent': 'CoinbitClub-Professional/2.0'
                }
            });

            // Testar conectividade
            await exchange.loadMarkets();
            const balance = await exchange.fetchBalance();
            
            return {
                success: true,
                balance: {
                    USDT: balance.USDT?.total || 0,
                    totalUSD: balance.USDT?.total || 0,
                    currencies: Object.keys(balance).filter(k => balance[k].total > 0).length
                },
                timestamp: new Date()
            };

        } catch (error) {
            return {
                success: false,
                error: `Binance Error: ${error.message}`,
                timestamp: new Date()
            };
        }
    }

    /**
     * 📊 EXTRAIR SALDO BYBIT
     */
    extractBybitBalance(data) {
        try {
            const coins = data.result?.list?.[0]?.coin || [];
            let usdtBalance = 0;
            let totalUSD = 0;
            let totalCoins = 0;

            coins.forEach(coin => {
                const balance = parseFloat(coin.walletBalance) || 0;
                const usdValue = parseFloat(coin.usdValue) || 0;
                
                if (balance > 0) {
                    totalCoins++;
                    
                    if (coin.coin === 'USDT') {
                        usdtBalance = balance;
                    }
                    
                    totalUSD += usdValue;
                }
            });

            return {
                USDT: usdtBalance,
                totalUSD: totalUSD.toFixed(2),
                coinCount: totalCoins,
                lastUpdate: new Date().toISOString()
            };
            
        } catch (error) {
            console.warn('⚠️ Erro ao extrair saldo Bybit:', error.message);
            return {
                USDT: 0,
                totalUSD: '0.00',
                coinCount: 0,
                lastUpdate: new Date().toISOString()
            };
        }
    }

    /**
     * 🔄 EXECUTAR VALIDAÇÃO COMPLETA
     */
    async executeCompleteValidation() {
        console.log('\n🔄 EXECUTANDO VALIDAÇÃO COMPLETA PROFISSIONAL');
        console.log('=============================================');
        
        try {
            const startTime = Date.now();
            
            // Reset estatísticas
            this.systemStats.validatedKeys = 0;
            this.systemStats.failedKeys = 0;
            this.systemStats.lastValidation = new Date();
            
            // 1. Detectar IP
            await this.detectCurrentIP();
            console.log(`🌐 IP detectado: ${this.currentIP}`);
            
            // 2. Buscar chaves
            const apiKeys = await this.fetchAllApiKeys();
            
            if (apiKeys.length === 0) {
                return {
                    success: false,
                    message: 'Nenhuma chave API encontrada no banco',
                    stats: this.getValidationStats()
                };
            }
            
            // 3. Validar cada chave
            console.log(`🔍 Validando ${apiKeys.length} chaves...`);
            
            const validationPromises = apiKeys.map(async (keyData) => {
                const keyId = `${keyData.user_id}_${keyData.exchange}_${keyData.environment}`;
                
                for (let attempt = 1; attempt <= this.config.validation.retryAttempts; attempt++) {
                    try {
                        const result = await this.validateSingleKey(keyData);
                        
                        if (result.success) {
                            console.log(`✅ ${keyData.username} - ${keyData.exchange} ${keyData.environment}: CONECTADO ($${result.balance.totalUSD})`);
                            
                            // Armazenar conexão validada
                            this.validatedConnections.set(keyId, {
                                ...keyData,
                                apiKey: this.decrypt(keyData.api_key),
                                secretKey: this.decrypt(keyData.secret_key),
                                balance: result.balance,
                                lastValidated: new Date(),
                                responseTime: result.responseTime
                            });
                            
                            // Criar instância CCXT
                            const instance = await this.createCCXTInstance(keyData.exchange, keyData.environment, this.decrypt(keyData.api_key), this.decrypt(keyData.secret_key));
                            if (instance) {
                                this.connectionInstances.set(keyId, instance);
                            }
                            
                            // Atualizar banco
                            await this.updateKeyStatus(keyData.key_id, result);
                            
                            this.systemStats.validatedKeys++;
                            return { success: true, keyData, result };
                            
                        } else if (attempt === this.config.validation.retryAttempts) {
                            console.log(`❌ ${keyData.username} - ${keyData.exchange} ${keyData.environment}: FALHA (${result.error})`);
                            
                            await this.updateKeyStatus(keyData.key_id, result);
                            this.systemStats.failedKeys++;
                            return { success: false, keyData, result };
                            
                        } else {
                            console.log(`⚠️ Tentativa ${attempt}/${this.config.validation.retryAttempts} falhou para ${keyData.username} - ${keyData.exchange}: ${result.error}`);
                            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
                        }
                        
                    } catch (error) {
                        console.error(`❌ Erro na validação ${keyId}:`, error.message);
                        this.logError('VALIDATION_ERROR', error);
                        
                        if (attempt === this.config.validation.retryAttempts) {
                            this.systemStats.failedKeys++;
                            return { success: false, keyData, error: error.message };
                        }
                    }
                }
            });
            
            await Promise.all(validationPromises);
            
            // 4. Criar executores para conexões validadas
            await this.createExecutorsForValidatedConnections();
            
            // 5. Estatísticas finais
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.systemStats.activeConnections = this.connectionInstances.size;
            this.systemStats.activeExecutors = this.executorsPool.size;
            
            console.log('\n📊 RELATÓRIO DE VALIDAÇÃO PROFISSIONAL');
            console.log('====================================');
            console.log(`🕐 Duração: ${duration}ms`);
            console.log(`🌐 IP: ${this.currentIP}`);
            console.log(`🔑 Total de chaves: ${this.systemStats.totalKeys}`);
            console.log(`✅ Chaves validadas: ${this.systemStats.validatedKeys}`);
            console.log(`❌ Chaves com falha: ${this.systemStats.failedKeys}`);
            console.log(`🔗 Conexões ativas: ${this.systemStats.activeConnections}`);
            console.log(`⚙️ Executores ativos: ${this.systemStats.activeExecutors}`);
            console.log(`📈 Taxa de sucesso: ${((this.systemStats.validatedKeys / this.systemStats.totalKeys) * 100).toFixed(1)}%`);
            
            // Salvar estado
            await this.saveSystemState();
            
            const success = this.systemStats.validatedKeys > 0;
            
            return {
                success: success,
                message: success 
                    ? `Validação concluída: ${this.systemStats.validatedKeys}/${this.systemStats.totalKeys} chaves validadas`
                    : 'Validação falhou: nenhuma chave válida encontrada',
                stats: this.getValidationStats(),
                duration: duration
            };
            
        } catch (error) {
            console.error('❌ Erro na validação completa:', error.message);
            this.logError('COMPLETE_VALIDATION_ERROR', error);
            
            return {
                success: false,
                message: `Erro na validação: ${error.message}`,
                stats: this.getValidationStats()
            };
        }
    }

    /**
     * 🔑 VALIDAR CHAVE INDIVIDUAL
     */
    async validateSingleKey(keyData) {
        const apiKey = this.decrypt(keyData.api_key);
        const secretKey = this.decrypt(keyData.secret_key);
        
        if (!apiKey || !secretKey) {
            throw new Error('Falha na descriptografia das chaves');
        }
        
        if (keyData.exchange === 'bybit') {
            return await this.validateBybitKey(apiKey, secretKey, keyData.environment);
        } else if (keyData.exchange === 'binance') {
            return await this.validateBinanceKey(apiKey, secretKey, keyData.environment);
        } else {
            throw new Error(`Exchange ${keyData.exchange} não suportada`);
        }
    }

    /**
     * 🏭 CRIAR INSTÂNCIA CCXT
     */
    async createCCXTInstance(exchange, environment, apiKey, secretKey) {
        try {
            let instance;
            
            if (exchange === 'bybit') {
                instance = new ccxt.bybit({
                    apiKey: apiKey,
                    secret: secretKey,
                    sandbox: environment === 'testnet',
                    enableRateLimit: true,
                    options: { 
                        defaultType: 'linear',
                        recvWindow: 5000
                    },
                    headers: {
                        'User-Agent': 'CoinbitClub-Professional/2.0'
                    }
                });
            } else if (exchange === 'binance') {
                instance = new ccxt.binance({
                    apiKey: apiKey,
                    secret: secretKey,
                    sandbox: environment === 'testnet',
                    enableRateLimit: true,
                    options: { 
                        defaultType: 'future'
                    },
                    headers: {
                        'User-Agent': 'CoinbitClub-Professional/2.0'
                    }
                });
            }
            
            // Testar instância
            if (instance) {
                await instance.loadMarkets();
                return instance;
            }
            
            return null;
            
        } catch (error) {
            console.error(`❌ Erro ao criar instância CCXT ${exchange}:`, error.message);
            return null;
        }
    }

    /**
     * 💾 ATUALIZAR STATUS DA CHAVE NO BANCO
     */
    async updateKeyStatus(keyId, result) {
        try {
            const status = result.success ? 'CONNECTED' : 'FAILED';
            const errorDetails = result.success ? null : JSON.stringify({
                error: result.error,
                timestamp: result.timestamp,
                responseTime: result.responseTime || null
            });

            await pool.query(`
                UPDATE user_api_keys 
                SET 
                    validation_status = $1,
                    last_validated_at = $2,
                    error_details = $3,
                    updated_at = NOW()
                WHERE id = $4
            `, [status, new Date(), errorDetails, keyId]);

        } catch (error) {
            console.error(`❌ Erro ao atualizar status da chave ${keyId}:`, error.message);
            this.logError('UPDATE_KEY_STATUS_ERROR', error);
        }
    }

    /**
     * ⚙️ CRIAR EXECUTORES PARA CONEXÕES VALIDADAS
     */
    async createExecutorsForValidatedConnections() {
        console.log('⚙️ Criando executores para conexões validadas...');
        
        for (const [keyId, connection] of this.validatedConnections) {
            try {
                const executor = {
                    keyId: keyId,
                    userId: connection.user_id,
                    username: connection.username,
                    exchange: connection.exchange,
                    environment: connection.environment,
                    status: 'ACTIVE',
                    lastActivity: new Date(),
                    totalTrades: 0,
                    successfulTrades: 0,
                    ccxtInstance: this.connectionInstances.get(keyId),
                    
                    // Método para executar trade
                    executeTrade: async (symbol, side, amount, orderType = 'market') => {
                        return await this.executeTradeViaExecutor(keyId, symbol, side, amount, orderType);
                    },
                    
                    // Método para obter taxa de sucesso
                    getSuccessRate: () => {
                        return executor.totalTrades > 0 
                            ? (executor.successfulTrades / executor.totalTrades * 100).toFixed(1) + '%'
                            : '0%';
                    }
                };
                
                this.executorsPool.set(keyId, executor);
                
            } catch (error) {
                console.error(`❌ Erro ao criar executor para ${keyId}:`, error.message);
                this.logError('CREATE_EXECUTOR_ERROR', error);
            }
        }
        
        console.log(`✅ ${this.executorsPool.size} executores criados`);
    }

    /**
     * 💰 EXECUTAR TRADE VIA EXECUTOR
     */
    async executeTradeViaExecutor(executorKey, symbol, side, amount, orderType) {
        try {
            const executor = this.executorsPool.get(executorKey);
            if (!executor || !executor.ccxtInstance) {
                throw new Error('Executor não encontrado ou inativo');
            }
            
            if (!this.config.trading.enabled) {
                throw new Error('Trading não está habilitado');
            }
            
            const instance = executor.ccxtInstance;
            let result;
            
            // Atualizar estatísticas
            executor.totalTrades++;
            executor.lastActivity = new Date();
            this.systemStats.totalTrades++;
            
            if (orderType === 'market') {
                if (side === 'buy') {
                    result = await instance.createMarketBuyOrder(symbol, amount);
                } else {
                    result = await instance.createMarketSellOrder(symbol, amount);
                }
            } else {
                throw new Error('Apenas ordens market são suportadas');
            }
            
            // Trade bem-sucedido
            executor.successfulTrades++;
            this.systemStats.successfulTrades++;
            
            return {
                success: true,
                order: result,
                executor: {
                    keyId: executorKey,
                    username: executor.username,
                    exchange: executor.exchange
                },
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ Erro no trade via executor ${executorKey}:`, error.message);
            this.logError('EXECUTOR_TRADE_ERROR', error);
            
            return {
                success: false,
                error: error.message,
                executor: executorKey,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 💼 EXECUTAR TRADE PROFISSIONAL
     */
    async executeProfessionalTrade(tradeRequest) {
        try {
            const { userId, exchange, environment, symbol, side, amount, orderType, stopLoss, takeProfit } = tradeRequest;
            
            // Validações obrigatórias
            if (!userId || !exchange || !symbol || !side || !amount) {
                throw new Error('Parâmetros obrigatórios: userId, exchange, symbol, side, amount');
            }
            
            if (this.config.trading.stopLossRequired && !stopLoss) {
                throw new Error('Stop Loss é obrigatório');
            }
            
            if (this.config.trading.takeProfitRequired && !takeProfit) {
                throw new Error('Take Profit é obrigatório');
            }
            
            // Encontrar executor
            const executorKey = `${userId}_${exchange}_${environment || 'mainnet'}`;
            const executor = this.executorsPool.get(executorKey);
            
            if (!executor) {
                throw new Error('Executor não encontrado para este usuário/exchange');
            }
            
            // Executar trade
            const result = await executor.executeTrade(symbol, side, amount, orderType || 'market');
            
            // Log da operação
            console.log(`💰 Trade executado: ${executor.username} - ${side} ${amount} ${symbol} = ${result.success ? 'SUCESSO' : 'FALHA'}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Erro no trade profissional:', error.message);
            this.logError('PROFESSIONAL_TRADE_ERROR', error);
            
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 💾 SALVAR ESTADO DO SISTEMA
     */
    async saveSystemState() {
        try {
            const state = {
                timestamp: new Date().toISOString(),
                systemStats: this.systemStats,
                currentIP: this.currentIP,
                validatedConnections: Array.from(this.validatedConnections.keys()),
                activeExecutors: Array.from(this.executorsPool.keys()),
                config: this.config,
                uptime: Date.now() - this.startTime
            };

            const stateFile = path.join(__dirname, 'system-state-professional.json');
            fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
            
            console.log(`💾 Estado do sistema salvo: ${stateFile}`);
            
        } catch (error) {
            console.error('❌ Erro ao salvar estado:', error.message);
            this.logError('SAVE_STATE_ERROR', error);
        }
    }

    /**
     * 📊 OBTER ESTATÍSTICAS DETALHADAS
     */
    getDetailedSystemStats() {
        return {
            ...this.systemStats,
            uptime: Date.now() - this.systemStats.uptime,
            currentIP: this.currentIP,
            validatedConnectionsCount: this.validatedConnections.size,
            activeInstancesCount: this.connectionInstances.size,
            activeExecutorsCount: this.executorsPool.size,
            config: this.config,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * 📊 OBTER ESTATÍSTICAS DE VALIDAÇÃO
     */
    getValidationStats() {
        return {
            totalKeys: this.systemStats.totalKeys,
            validatedKeys: this.systemStats.validatedKeys,
            failedKeys: this.systemStats.failedKeys,
            successRate: this.systemStats.totalKeys > 0 
                ? (this.systemStats.validatedKeys / this.systemStats.totalKeys * 100).toFixed(1) + '%'
                : '0%',
            lastValidation: this.systemStats.lastValidation,
            activeConnections: this.connectionInstances.size
        };
    }

    /**
     * ⚙️ OBTER ESTATÍSTICAS DOS EXECUTORES
     */
    getExecutorStats() {
        const executors = Array.from(this.executorsPool.values());
        const activeExecutors = executors.filter(e => e.status === 'ACTIVE');
        
        return {
            total: this.executorsPool.size,
            active: activeExecutors.length,
            totalTrades: executors.reduce((sum, e) => sum + e.totalTrades, 0),
            successfulTrades: executors.reduce((sum, e) => sum + e.successfulTrades, 0),
            overallSuccessRate: this.systemStats.totalTrades > 0 
                ? (this.systemStats.successfulTrades / this.systemStats.totalTrades * 100).toFixed(1) + '%'
                : '0%'
        };
    }

    /**
     * 💰 OBTER SALDOS TOTAIS
     */
    getTotalBalances() {
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
            totalAccounts: totalAccounts,
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * 📡 OBTER ENDPOINTS DISPONÍVEIS
     */
    getAvailableEndpoints() {
        return [
            'GET /health - Health check avançado',
            'GET /api/system/status - Status completo do sistema',
            'POST /api/validation/force - Forçar validação',
            'GET /api/connections - Listar conexões validadas',
            'GET /api/executors - Status dos executores',
            'POST /api/trade/execute - Executar trade profissional',
            'GET /api/system/logs - Logs do sistema',
            'GET /api/dashboard/realtime - Dashboard em tempo real'
        ];
    }

    /**
     * 🔄 INICIAR MONITORAMENTO CONTÍNUO
     */
    startContinuousMonitoring() {
        console.log('🔄 Iniciando monitoramento contínuo profissional...');
        
        // Revalidação periódica
        setInterval(async () => {
            console.log('🔄 Revalidação periódica automática...');
            await this.executeCompleteValidation();
        }, this.config.validation.intervalMs);
        
        // Health check das conexões
        setInterval(async () => {
            await this.performHealthCheck();
        }, this.config.validation.healthCheckIntervalMs);
        
        // Salvar estado periodicamente
        setInterval(async () => {
            await this.saveSystemState();
        }, this.config.monitoring.saveStateInterval);
        
        console.log('✅ Monitoramento contínuo ativado');
    }

    /**
     * ❤️ VERIFICAR SAÚDE DAS CONEXÕES
     */
    async performHealthCheck() {
        for (const [keyId, instance] of this.connectionInstances) {
            try {
                // Teste simples de conectividade
                await instance.fetchTicker('BTC/USDT');
                
                // Atualizar atividade do executor
                const executor = this.executorsPool.get(keyId);
                if (executor) {
                    executor.lastActivity = new Date();
                }
                
            } catch (error) {
                console.warn(`⚠️ Health check falhou para ${keyId}: ${error.message}`);
                
                // Remover da cache e marcar executor como inativo
                this.connectionInstances.delete(keyId);
                const executor = this.executorsPool.get(keyId);
                if (executor) {
                    executor.status = 'INACTIVE';
                }
                
                // Tentar revalidar
                const connection = this.validatedConnections.get(keyId);
                if (connection) {
                    console.log(`🔄 Tentando reconectar ${keyId}...`);
                    // A próxima validação periódica irá tentar reconectar
                }
            }
        }
    }

    /**
     * 🚀 INICIAR SISTEMA COMPLETO
     */
    async startCompleteSystem() {
        try {
            console.log('\n🚀 INICIANDO SISTEMA PROFISSIONAL COMPLETO');
            console.log('==========================================');
            
            // 1. Executar validação inicial
            const validationResult = await this.executeCompleteValidation();
            
            if (!validationResult.success) {
                console.log('⚠️ Sistema iniciará em modo limitado - nenhuma conexão validada');
            }
            
            // 2. Iniciar monitoramento contínuo
            this.startContinuousMonitoring();
            
            // 3. Iniciar servidor Express
            this.app.listen(this.port, () => {
                console.log(`🌐 Servidor profissional rodando na porta ${this.port}`);
                this.isSystemRunning = true;
            });
            
            console.log('\n🎉 SISTEMA COINBITCLUB PROFISSIONAL OPERACIONAL');
            console.log('==============================================');
            console.log(`📡 API Profissional: http://localhost:${this.port}`);
            console.log(`✅ Conexões validadas: ${this.validatedConnections.size}`);
            console.log(`⚙️ Executores ativos: ${this.executorsPool.size}`);
            console.log(`🌐 IP atual: ${this.currentIP}`);
            console.log(`💰 Trading habilitado: ${this.config.trading.enabled ? 'SIM' : 'NÃO'}`);
            console.log('\n📋 Endpoints disponíveis:');
            this.getAvailableEndpoints().forEach(endpoint => console.log(`   ${endpoint}`));
            console.log('\n🔄 Sistema funcionando automaticamente...');
            
            return true;
            
        } catch (error) {
            console.error('❌ ERRO NA INICIALIZAÇÃO DO SISTEMA:', error.message);
            this.logError('SYSTEM_START_ERROR', error);
            return false;
        }
    }

    /**
     * 🛑 PARADA SEGURA DO SISTEMA
     */
    async gracefulShutdown(signal) {
        console.log(`\n🛑 INICIANDO PARADA SEGURA (${signal})`);
        
        try {
            this.isSystemRunning = false;
            
            // Salvar estado final
            await this.saveSystemState();
            
            // Fechar conexões do banco
            await pool.end();
            
            console.log('✅ Sistema parado com segurança');
            process.exit(0);
            
        } catch (error) {
            console.error('❌ Erro na parada do sistema:', error.message);
            process.exit(1);
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const sistema = new SistemaProfissionalCompleto();
    sistema.startCompleteSystem().then(success => {
        if (!success) {
            console.error('❌ Sistema falhou ao iniciar');
            process.exit(1);
        }
    });
}

module.exports = SistemaProfissionalCompleto;
