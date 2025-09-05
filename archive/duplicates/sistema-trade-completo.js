/**
 * 🚀 SISTEMA DE TRADE COMPLETO - COINBITCLUB
 * =========================================
 * Sistema pronto para execução de trades reais
 * Integra validação + execução + monitoramento
 * Última atualização: 2025-08-11 19:55:00
 */

const express = require('express');
const { Pool } = require('pg');
const ccxt = require('ccxt');
const axios = require('axios');
const crypto = require('crypto');
const cron = require('node-cron');

class SistemaTradeCompleto {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        
        // Configuração do banco
        this.pool = new Pool({
            connectionString: 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });
        
        // Conexões validadas
        this.validatedConnections = new Map();
        this.exchangeInstances = new Map();
        
        // Status do sistema
        this.status = {
            isRunning: false,
            lastValidation: null,
            validatedConnections: 0,
            totalTrades: 0,
            successfulTrades: 0,
            errors: []
        };
        
        this.setupMiddleware();
        this.setupRoutes();
        
        console.log('🚀 SISTEMA DE TRADE COMPLETO INICIALIZADO');
    }

    /**
     * 🔧 CONFIGURAR MIDDLEWARE
     */
    setupMiddleware() {
        this.app.use(express.json());
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    /**
     * 🔧 CONFIGURAR ROTAS DA API
     */
    setupRoutes() {
        // Status do sistema
        this.app.get('/status', (req, res) => {
            res.json({
                ...this.status,
                timestamp: new Date().toISOString(),
                connections: Array.from(this.validatedConnections.values())
            });
        });

        // Executar trade
        this.app.post('/trade', async (req, res) => {
            try {
                const result = await this.executarTrade(req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Executar trade para todos os usuários
        this.app.post('/trade/all', async (req, res) => {
            try {
                const { symbol, side, percentage = 10 } = req.body;
                const results = [];
                
                for (const [keyId, connection] of this.validatedConnections) {
                    try {
                        const tradeResult = await this.executarTrade({
                            userId: connection.userId,
                            exchange: connection.exchange,
                            environment: connection.environment,
                            symbol,
                            side,
                            percentage
                        });
                        
                        results.push({
                            username: connection.username,
                            ...tradeResult
                        });
                        
                    } catch (error) {
                        results.push({
                            username: connection.username,
                            success: false,
                            error: error.message
                        });
                    }
                }
                
                res.json({
                    success: true,
                    message: `Trade executado para ${results.length} usuários`,
                    results
                });
                
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Obter saldos
        this.app.get('/balances', async (req, res) => {
            try {
                const balances = [];
                
                for (const [keyId, connection] of this.validatedConnections) {
                    try {
                        const balance = await this.obterSaldo(connection);
                        balances.push({
                            username: connection.username,
                            exchange: connection.exchange,
                            environment: connection.environment,
                            balance
                        });
                    } catch (error) {
                        balances.push({
                            username: connection.username,
                            exchange: connection.exchange,
                            error: error.message
                        });
                    }
                }
                
                res.json({
                    success: true,
                    balances
                });
                
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Forçar validação
        this.app.post('/validate', async (req, res) => {
            try {
                const result = await this.executarValidacao();
                res.json({
                    success: true,
                    message: 'Validação executada',
                    validatedConnections: this.status.validatedConnections
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Rota raiz
        this.app.get('/', (req, res) => {
            res.json({
                name: 'CoinbitClub Trading System',
                version: '1.0.0',
                status: this.status.isRunning ? 'Running' : 'Stopped',
                validatedConnections: this.status.validatedConnections,
                endpoints: {
                    'GET /status': 'Status do sistema',
                    'POST /trade': 'Executar trade individual',
                    'POST /trade/all': 'Executar trade para todos',
                    'GET /balances': 'Obter saldos',
                    'POST /validate': 'Forçar validação'
                }
            });
        });
    }

    /**
     * 🔍 VALIDAR BYBIT
     */
    async validarBybit(apiKey, secretKey, environment = 'mainnet') {
        const baseURL = environment === 'testnet' 
            ? 'https://api-testnet.bybit.com' 
            : 'https://api.bybit.com';

        try {
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
                    if (coin.coin === 'USDT') {
                        usdtBalance = parseFloat(coin.walletBalance) || 0;
                    }
                    totalUSD += parseFloat(coin.usdValue) || 0;
                });

                return {
                    success: true,
                    balance: {
                        USDT: usdtBalance,
                        totalUSD: totalUSD.toFixed(2),
                        coinCount: coins.length
                    }
                };
            } else {
                return {
                    success: false,
                    error: `${response.data.retCode}: ${response.data.retMsg}`
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🔍 VALIDAR BINANCE
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
                    totalUSD: balance.USDT?.total || 0
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🔄 EXECUTAR VALIDAÇÃO DAS CONEXÕES
     */
    async executarValidacao() {
        console.log('\n🔄 EXECUTANDO VALIDAÇÃO DE CONEXÕES');
        console.log('===================================');
        
        try {
            // Limpar conexões anteriores
            this.validatedConnections.clear();
            this.exchangeInstances.clear();
            
            // Aplicar correções automáticas
            const usuariosCorrigidos = await this.pool.query(`
                UPDATE users SET is_active = true 
                WHERE is_active = false 
                RETURNING id, username
            `);
            
            const chavesCorrigidas = await this.pool.query(`
                UPDATE user_api_keys SET is_active = true 
                WHERE is_active = false 
                RETURNING id, user_id, exchange
            `);
            
            if (usuariosCorrigidos.rows.length > 0) {
                console.log(`🔧 ${usuariosCorrigidos.rows.length} usuários ativados automaticamente`);
            }
            
            if (chavesCorrigidas.rows.length > 0) {
                console.log(`🔧 ${chavesCorrigidas.rows.length} chaves ativadas automaticamente`);
            }
            
            // Buscar chaves para validação
            const chaves = await this.pool.query(`
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    uak.id as key_id,
                    uak.exchange,
                    uak.environment,
                    uak.api_key,
                    uak.secret_key
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                AND LENGTH(TRIM(uak.api_key)) > 10
                AND LENGTH(TRIM(uak.secret_key)) > 10
                ORDER BY u.id, uak.exchange, uak.environment
            `);
            
            console.log(`🔑 Encontradas ${chaves.rows.length} chaves para validação`);
            
            if (chaves.rows.length === 0) {
                console.log('❌ NENHUMA CHAVE ENCONTRADA!');
                this.status.validatedConnections = 0;
                return false;
            }
            
            let sucessos = 0;
            
            for (const chave of chaves.rows) {
                console.log(`🔍 Validando ${chave.username} - ${chave.exchange} ${chave.environment}...`);
                
                try {
                    let result;
                    
                    if (chave.exchange === 'bybit') {
                        result = await this.validarBybit(chave.api_key, chave.secret_key, chave.environment);
                    } else if (chave.exchange === 'binance') {
                        result = await this.validarBinance(chave.api_key, chave.secret_key, chave.environment);
                    } else {
                        console.log(`⚠️ Exchange ${chave.exchange} não suportada`);
                        continue;
                    }
                    
                    if (result.success) {
                        console.log(`✅ ${chave.username}: CONECTADO! Saldo: $${result.balance.totalUSD}`);
                        sucessos++;
                        
                        // Criar instância da exchange
                        const exchangeInstance = await this.criarInstanciaExchange(
                            chave.exchange, 
                            chave.api_key, 
                            chave.secret_key, 
                            chave.environment
                        );
                        
                        // Salvar conexão validada
                        const keyId = `${chave.user_id}_${chave.exchange}_${chave.environment}`;
                        this.validatedConnections.set(keyId, {
                            userId: chave.user_id,
                            username: chave.username,
                            email: chave.email,
                            exchange: chave.exchange,
                            environment: chave.environment,
                            balance: result.balance,
                            lastValidated: new Date(),
                            apiKey: chave.api_key,
                            secretKey: chave.secret_key
                        });
                        
                        this.exchangeInstances.set(keyId, exchangeInstance);
                        
                        // Atualizar status no banco
                        await this.pool.query(`
                            UPDATE user_api_keys 
                            SET validation_status = 'CONNECTED', 
                                last_validated_at = NOW(),
                                error_details = NULL
                            WHERE id = $1
                        `, [chave.key_id]);
                        
                    } else {
                        console.log(`❌ ${chave.username}: FALHA - ${result.error}`);
                        
                        await this.pool.query(`
                            UPDATE user_api_keys 
                            SET validation_status = 'FAILED', 
                                last_validated_at = NOW(),
                                error_details = $2
                            WHERE id = $1
                        `, [chave.key_id, result.error]);
                    }
                    
                } catch (error) {
                    console.log(`❌ ${chave.username}: ERRO - ${error.message}`);
                }
            }
            
            this.status.validatedConnections = sucessos;
            this.status.lastValidation = new Date();
            
            console.log(`\n📊 RESULTADO: ${sucessos}/${chaves.rows.length} conexões validadas`);
            
            if (sucessos > 0) {
                console.log('\n✅ CONEXÕES VALIDADAS E PRONTAS PARA TRADE:');
                for (const [keyId, conn] of this.validatedConnections) {
                    console.log(`   🔑 ${conn.username} (${conn.exchange} ${conn.environment}): $${conn.balance.totalUSD}`);
                }
            }
            
            return sucessos > 0;
            
        } catch (error) {
            console.error('❌ Erro na validação:', error.message);
            this.status.errors.push({
                timestamp: new Date(),
                error: error.message
            });
            return false;
        }
    }

    /**
     * 🏭 CRIAR INSTÂNCIA DA EXCHANGE
     */
    async criarInstanciaExchange(exchange, apiKey, secretKey, environment) {
        if (exchange === 'bybit') {
            return new ccxt.bybit({
                apiKey: apiKey,
                secret: secretKey,
                sandbox: environment === 'testnet',
                enableRateLimit: true,
                timeout: 30000
            });
        } else if (exchange === 'binance') {
            return new ccxt.binance({
                apiKey: apiKey,
                secret: secretKey,
                sandbox: environment === 'testnet',
                enableRateLimit: true,
                timeout: 30000
            });
        }
        
        throw new Error(`Exchange ${exchange} não suportada`);
    }

    /**
     * 💰 OBTER SALDO
     */
    async obterSaldo(connection) {
        const keyId = `${connection.userId}_${connection.exchange}_${connection.environment}`;
        const exchangeInstance = this.exchangeInstances.get(keyId);
        
        if (!exchangeInstance) {
            throw new Error('Instância da exchange não encontrada');
        }
        
        await exchangeInstance.loadMarkets();
        const balance = await exchangeInstance.fetchBalance();
        
        return {
            USDT: balance.USDT?.total || 0,
            totalUSD: balance.USDT?.total || 0,
            free: balance.USDT?.free || 0,
            used: balance.USDT?.used || 0
        };
    }

    /**
     * 📈 EXECUTAR TRADE
     */
    async executarTrade(tradeData) {
        const { userId, exchange, environment, symbol, side, amount, percentage } = tradeData;
        
        console.log(`\n📈 EXECUTANDO TRADE: ${side} ${symbol}`);
        console.log(`👤 Usuário ID: ${userId} | Exchange: ${exchange} ${environment}`);
        
        try {
            // Encontrar conexão
            const keyId = `${userId}_${exchange}_${environment || 'mainnet'}`;
            const connection = this.validatedConnections.get(keyId);
            const exchangeInstance = this.exchangeInstances.get(keyId);
            
            if (!connection || !exchangeInstance) {
                throw new Error('Conexão não encontrada ou não validada');
            }
            
            await exchangeInstance.loadMarkets();
            
            // Calcular quantidade
            let quantity = amount;
            
            if (percentage && !amount) {
                const balance = await this.obterSaldo(connection);
                const availableUSDT = balance.free;
                
                if (side === 'buy') {
                    quantity = (availableUSDT * percentage / 100);
                } else {
                    // Para venda, precisamos obter o saldo da moeda específica
                    const baseSymbol = symbol.replace('/USDT', '');
                    const coinBalance = balance[baseSymbol] || 0;
                    quantity = coinBalance * percentage / 100;
                }
            }
            
            if (!quantity || quantity <= 0) {
                throw new Error('Quantidade inválida para o trade');
            }
            
            console.log(`💵 Quantidade: ${quantity} | Símbolo: ${symbol} | Lado: ${side}`);
            
            // Executar trade
            let order;
            
            if (side === 'buy') {
                order = await exchangeInstance.createMarketBuyOrder(symbol, quantity);
            } else if (side === 'sell') {
                order = await exchangeInstance.createMarketSellOrder(symbol, quantity);
            } else {
                throw new Error('Lado do trade deve ser "buy" ou "sell"');
            }
            
            this.status.totalTrades++;
            this.status.successfulTrades++;
            
            console.log(`✅ Trade executado com sucesso! Order ID: ${order.id}`);
            
            // Salvar trade no banco
            await this.pool.query(`
                INSERT INTO trades (user_id, exchange, environment, symbol, side, quantity, order_id, status, executed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'FILLED', NOW())
            `, [userId, exchange, environment, symbol, side, quantity, order.id]);
            
            return {
                success: true,
                orderId: order.id,
                symbol: symbol,
                side: side,
                quantity: quantity,
                status: order.status,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ Erro no trade: ${error.message}`);
            
            this.status.totalTrades++;
            this.status.errors.push({
                timestamp: new Date(),
                error: error.message,
                tradeData
            });
            
            throw error;
        }
    }

    /**
     * 🚀 INICIAR SISTEMA
     */
    async iniciar() {
        try {
            console.log('\n🚀 INICIANDO SISTEMA DE TRADE COMPLETO');
            console.log('=====================================');
            
            // Testar conexão do banco
            await this.pool.query('SELECT NOW()');
            console.log('✅ Conexão com banco estabelecida');
            
            // Criar tabela de trades se não existir
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS trades (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER,
                    exchange VARCHAR(50),
                    environment VARCHAR(20),
                    symbol VARCHAR(20),
                    side VARCHAR(10),
                    quantity DECIMAL(18,8),
                    order_id VARCHAR(255),
                    status VARCHAR(20),
                    executed_at TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('✅ Tabela de trades verificada');
            
            // Executar validação inicial
            const validacaoOK = await this.executarValidacao();
            
            if (!validacaoOK) {
                console.log('⚠️ Nenhuma conexão validada, mas o sistema continuará rodando');
            }
            
            // Configurar validação automática a cada 5 minutos
            cron.schedule('*/5 * * * *', async () => {
                console.log('\n🔄 Validação automática agendada...');
                await this.executarValidacao();
            });
            
            this.status.isRunning = true;
            
            // Iniciar servidor Express
            this.server = this.app.listen(this.port, () => {
                console.log(`\n✅ SISTEMA DE TRADE OPERACIONAL!`);
                console.log(`🌐 API rodando em: http://localhost:${this.port}`);
                console.log(`🔑 ${this.status.validatedConnections} conexões validadas`);
                console.log('\n📋 ENDPOINTS DISPONÍVEIS:');
                console.log('   GET  /status           - Status do sistema');
                console.log('   POST /trade            - Executar trade individual');
                console.log('   POST /trade/all        - Executar trade para todos');
                console.log('   GET  /balances         - Obter saldos');
                console.log('   POST /validate         - Forçar validação');
                console.log('\n🚀 SISTEMA PRONTO PARA TRADES!');
            });
            
        } catch (error) {
            console.error('❌ Erro ao iniciar sistema:', error.message);
            process.exit(1);
        }
    }

    /**
     * 🛑 PARAR SISTEMA
     */
    async parar() {
        console.log('\n🛑 Parando sistema...');
        
        this.status.isRunning = false;
        
        if (this.server) {
            this.server.close();
        }
        
        await this.pool.end();
        
        console.log('✅ Sistema parado com sucesso');
    }
}

// Inicializar se executado diretamente
if (require.main === module) {
    const sistema = new SistemaTradeCompleto();
    
    sistema.iniciar().catch(error => {
        console.error('❌ Erro fatal:', error.message);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        await sistema.parar();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        await sistema.parar();
        process.exit(0);
    });
}

module.exports = SistemaTradeCompleto;
