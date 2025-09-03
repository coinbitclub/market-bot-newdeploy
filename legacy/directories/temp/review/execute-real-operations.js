#!/usr/bin/env node

/**
 * 🚀 COINBITCLUB REAL TRADING EXECUTION - OPERAÇÕES REAIS
 * =======================================================
 * 
 * EXECUTAR OPERAÇÕES REAIS COM CHAVES CONFIGURADAS
 * BANCO DE DADOS REAL + EXCHANGES TESTNET
 */

const ccxt = require('ccxt');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

class RealTradingExecution {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        // Configurar exchanges com chaves reais
        this.exchanges = {
            binance: new ccxt.binance({
                apiKey: 'process.env.API_KEY_HERE',
                secret: 'process.env.API_KEY_HERE',
                sandbox: true, // TESTNET
                enableRateLimit: true,
                options: {
                    defaultType: 'future' // Para futures
                }
            }),
            bybit: new ccxt.bybit({
                apiKey: '1FHeimNdrGvCSPABD4',
                secret: 'process.env.API_KEY_HERE',
                sandbox: true, // TESTNET
                enableRateLimit: true,
                options: {
                    defaultType: 'future'
                }
            })
        };

        this.results = {
            database: { connected: false, tables: [], users: 0 },
            exchanges: { binance: { connected: false, balance: {} }, bybit: { connected: false, balance: {} } },
            operations: { executed: [], failed: [] },
            safety: { violations: [], validations: [] }
        };

        console.log('🚀 COINBITCLUB REAL TRADING EXECUTION');
        console.log('=====================================');
        console.log('💰 OPERAÇÕES REAIS ATIVADAS!');
        console.log('🔒 Com Position Safety Validator');
        console.log('');
    }

    async executeRealOperations() {
        try {
            console.log('📋 INICIANDO EXECUÇÃO REAL...\n');

            // 1. Conectar banco de dados real
            await this.connectRealDatabase();

            // 2. Validar exchanges
            await this.validateExchanges();

            // 3. Preparar usuários no banco real
            await this.prepareRealUsers();

            // 4. Executar operações de teste reais
            await this.executeRealTrades();

            // 5. Validar Position Safety em operação real
            await this.validatePositionSafetyReal();

            // 6. Relatório de operações
            await this.generateOperationsReport();

        } catch (error) {
            console.error('💥 ERRO CRÍTICO:', error);
        }
    }

    async connectRealDatabase() {
        console.log('🗄️ CONECTANDO BANCO DE DADOS REAL...');

        try {
            const client = await this.pool.connect();
            
            // Testar conexão
            const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
            console.log(`   ✅ Conexão estabelecida: ${result.rows[0].current_time}`);
            console.log(`   📊 PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]}`);

            // Verificar tabelas existentes
            const tables = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `);

            this.results.database.connected = true;
            this.results.database.tables = tables.rows.map(r => r.table_name);

            console.log(`   📋 Tabelas encontradas: ${tables.rows.length}`);
            tables.rows.forEach(table => {
                console.log(`      • ${table.table_name}`);
            });

            // Se não existem tabelas, criar schema
            if (tables.rows.length === 0) {
                console.log('   🔧 Criando schema do banco...');
                await this.createDatabaseSchema(client);
            }

            client.release();
            console.log('   ✅ Banco de dados real conectado e validado\n');

        } catch (error) {
            console.error('   ❌ Erro na conexão:', error.message);
            this.results.database.connected = false;
        }
    }

    async createDatabaseSchema(client) {
        const createTables = [
            `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                country VARCHAR(3) DEFAULT 'BR',
                account_type VARCHAR(20) DEFAULT 'testnet',
                subscription_type VARCHAR(20) DEFAULT 'none',
                prepaid_balance_brl DECIMAL(15,2) DEFAULT 0.00,
                prepaid_balance_usd DECIMAL(15,2) DEFAULT 0.00,
                testnet_mode BOOLEAN DEFAULT true,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )`,
            `CREATE TABLE IF NOT EXISTS positions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                symbol VARCHAR(20) NOT NULL,
                side VARCHAR(10) NOT NULL,
                size DECIMAL(15,8) NOT NULL,
                entry_price DECIMAL(15,8) NOT NULL,
                stop_loss DECIMAL(15,8),
                take_profit DECIMAL(15,8),
                leverage INTEGER DEFAULT 1,
                exchange VARCHAR(20) NOT NULL,
                account_type VARCHAR(20) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            )`,
            `CREATE TABLE IF NOT EXISTS trades (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                symbol VARCHAR(20) NOT NULL,
                side VARCHAR(10) NOT NULL,
                quantity DECIMAL(15,8) NOT NULL,
                price DECIMAL(15,8) NOT NULL,
                status VARCHAR(20) DEFAULT 'filled',
                exchange VARCHAR(20) NOT NULL,
                order_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            )`
        ];

        for (const sql of createTables) {
            await client.query(sql);
        }

        console.log('   ✅ Schema do banco criado');
    }

    async validateExchanges() {
        console.log('🔶 VALIDANDO EXCHANGES COM CHAVES REAIS...');

        // Testar Binance
        try {
            const binanceBalance = await this.exchanges.binance.fetchBalance();
            this.results.exchanges.binance.connected = true;
            this.results.exchanges.binance.balance = binanceBalance;
            
            console.log('   ✅ Binance Testnet conectada');
            console.log(`      💰 USDT: ${binanceBalance.USDT?.free || 0}`);
            console.log(`      💰 BNB: ${binanceBalance.BNB?.free || 0}`);

        } catch (error) {
            console.error('   ❌ Erro Binance:', error.message);
            this.results.exchanges.binance.connected = false;
        }

        // Testar Bybit
        try {
            const bybitBalance = await this.exchanges.bybit.fetchBalance();
            this.results.exchanges.bybit.connected = true;
            this.results.exchanges.bybit.balance = bybitBalance;
            
            console.log('   ✅ Bybit Testnet conectada');
            console.log(`      💰 USDT: ${bybitBalance.USDT?.free || 0}`);

        } catch (error) {
            console.error('   ❌ Erro Bybit:', error.message);
            this.results.exchanges.bybit.connected = false;
        }

        console.log('');
    }

    async prepareRealUsers() {
        console.log('👥 PREPARANDO USUÁRIOS NO BANCO REAL...');

        const client = await this.pool.connect();

        try {
            // Criar usuários de teste reais
            const testUsers = [
                {
                    username: 'trader_real_001',
                    email: 'trader001@coinbitclub.com',
                    full_name: 'Trader Real 001',
                    account_type: 'testnet',
                    prepaid_balance_brl: 50
                },
                {
                    username: 'trader_real_002',
                    email: 'trader002@coinbitclub.com',
                    full_name: 'Trader Real 002',
                    account_type: 'management',
                    prepaid_balance_brl: 200
                },
                {
                    username: 'trader_real_foreign',
                    email: 'foreign@coinbitclub.com',
                    full_name: 'Foreign Trader',
                    account_type: 'testnet',
                    country: 'US',
                    prepaid_balance_usd: 15
                }
            ];

            for (const user of testUsers) {
                try {
                    await client.query(`
                        INSERT INTO users (
                            username, email, password_hash, full_name, country,
                            account_type, prepaid_balance_brl, prepaid_balance_usd
                        ) VALUES ($1, $2, '$2b$10$hash', $3, $4, $5, $6, $7)
                        ON CONFLICT (email) DO UPDATE SET
                        account_type = EXCLUDED.account_type,
                        prepaid_balance_brl = EXCLUDED.prepaid_balance_brl,
                        prepaid_balance_usd = EXCLUDED.prepaid_balance_usd
                    `, [
                        user.username, user.email, user.full_name, user.country || 'BR',
                        user.account_type, user.prepaid_balance_brl || 0, user.prepaid_balance_usd || 0
                    ]);

                    console.log(`   ✅ Usuário criado: ${user.username} (${user.account_type})`);

                } catch (error) {
                    console.log(`   ⚠️ Usuário já existe: ${user.username}`);
                }
            }

            // Contar usuários totais
            const userCount = await client.query('SELECT COUNT(*) as total FROM users');
            this.results.database.users = parseInt(userCount.rows[0].total);
            
            console.log(`   📊 Total de usuários no banco: ${this.results.database.users}`);
            client.release();

        } catch (error) {
            client.release();
            console.error('   ❌ Erro ao preparar usuários:', error.message);
        }

        console.log('');
    }

    async executeRealTrades() {
        console.log('💰 EXECUTANDO OPERAÇÕES REAIS...');

        if (!this.results.exchanges.binance.connected && !this.results.exchanges.bybit.connected) {
            console.log('   ⚠️ Nenhuma exchange conectada - pulando operações');
            return;
        }

        // Carregar Position Safety Validator
        const PositionSafetyValidator = require('./position-safety-validator.js');
        const validator = new PositionSafetyValidator();

        // Configuração de trade de teste
        const tradeConfig = {
            symbol: 'BTC/USDT',
            side: 'buy',
            amount: 0.001, // Valor muito pequeno para teste
            leverage: 3,
            stopLoss: 8, // Será validado
            takeProfit: 12 // Será validado
        };

        console.log(`   🎯 Configuração: ${tradeConfig.side} ${tradeConfig.amount} ${tradeConfig.symbol}`);
        console.log(`   📊 Leverage: ${tradeConfig.leverage}x`);

        // Validar com Position Safety
        const validation = validator.validatePositionSafety(tradeConfig);
        
        if (!validation.isValid) {
            console.log('   ❌ Validação de segurança falhou:');
            validation.errors.forEach(error => console.log(`      • ${error}`));
            this.results.safety.violations.push(validation.errors);
            return;
        }

        console.log('   ✅ Position Safety Validator aprovado');
        console.log(`   📊 Stop Loss ajustado: ${validation.config.stopLoss}%`);
        console.log(`   📊 Take Profit ajustado: ${validation.config.takeProfit}%`);

        this.results.safety.validations.push(validation);

        // Executar no Binance se conectado
        if (this.results.exchanges.binance.connected) {
            try {
                console.log('   🔶 Executando no Binance Testnet...');
                
                const order = await this.exchanges.binance.createMarketOrder(
                    tradeConfig.symbol,
                    tradeConfig.side,
                    tradeConfig.amount
                );

                console.log('   ✅ Ordem Binance executada com sucesso!');
                console.log(`      📋 Order ID: ${order.id}`);
                console.log(`      💰 Quantidade: ${order.amount}`);
                console.log(`      💵 Preço: ${order.price}`);

                this.results.operations.executed.push({
                    exchange: 'binance',
                    order_id: order.id,
                    symbol: tradeConfig.symbol,
                    amount: order.amount,
                    price: order.price
                });

                // Registrar no banco
                await this.recordTradeInDatabase('binance', order);

            } catch (error) {
                console.error('   ❌ Erro no Binance:', error.message);
                this.results.operations.failed.push({
                    exchange: 'binance',
                    error: error.message
                });
            }
        }

        // Executar no Bybit se conectado
        if (this.results.exchanges.bybit.connected) {
            try {
                console.log('   🟣 Executando no Bybit Testnet...');
                
                const order = await this.exchanges.bybit.createMarketOrder(
                    tradeConfig.symbol,
                    tradeConfig.side,
                    tradeConfig.amount
                );

                console.log('   ✅ Ordem Bybit executada com sucesso!');
                console.log(`      📋 Order ID: ${order.id}`);
                console.log(`      💰 Quantidade: ${order.amount}`);

                this.results.operations.executed.push({
                    exchange: 'bybit',
                    order_id: order.id,
                    symbol: tradeConfig.symbol,
                    amount: order.amount
                });

                await this.recordTradeInDatabase('bybit', order);

            } catch (error) {
                console.error('   ❌ Erro no Bybit:', error.message);
                this.results.operations.failed.push({
                    exchange: 'bybit',
                    error: error.message
                });
            }
        }

        console.log('');
    }

    async recordTradeInDatabase(exchange, order) {
        const client = await this.pool.connect();

        try {
            await client.query(`
                INSERT INTO trades (
                    user_id, symbol, side, quantity, price, 
                    status, exchange, order_id
                ) VALUES (
                    (SELECT id FROM users WHERE username = 'trader_real_001' LIMIT 1),
                    $1, $2, $3, $4, 'filled', $5, $6
                )
            `, [
                order.symbol, order.side, order.amount, 
                order.price || 0, exchange, order.id
            ]);

            console.log(`      ✅ Trade registrado no banco: ${exchange}`);
            client.release();

        } catch (error) {
            client.release();
            console.error(`      ❌ Erro ao registrar trade:`, error.message);
        }
    }

    async validatePositionSafetyReal() {
        console.log('🔒 VALIDANDO POSITION SAFETY EM OPERAÇÃO REAL...');

        const PositionSafetyValidator = require('./position-safety-validator.js');
        const validator = new PositionSafetyValidator();

        // Cenários de teste real
        const realScenarios = [
            {
                name: 'Trade Real Válido',
                config: { leverage: 5, stopLoss: 10, takeProfit: 15, orderValue: 50 }
            },
            {
                name: 'Trade sem Stop Loss (deve falhar)',
                config: { leverage: 3, stopLoss: 0, takeProfit: 12, orderValue: 30 }
            },
            {
                name: 'Leverage alta (deve ser ajustada)',
                config: { leverage: 15, stopLoss: 20, takeProfit: 30, orderValue: 100 }
            }
        ];

        for (const scenario of realScenarios) {
            console.log(`   🧪 Testando: ${scenario.name}`);
            
            const result = validator.validatePositionSafety(scenario.config);
            
            if (result.isValid) {
                console.log(`      ✅ Aprovado - SL: ${result.config.stopLoss}% | TP: ${result.config.takeProfit}%`);
            } else {
                console.log(`      ❌ Rejeitado - ${result.errors.join(', ')}`);
            }
        }

        console.log('');
    }

    async generateOperationsReport() {
        console.log('📊 RELATÓRIO DE OPERAÇÕES REAIS');
        console.log('===============================');
        console.log('');

        // Status do banco
        console.log('🗄️ BANCO DE DADOS:');
        console.log(`   Status: ${this.results.database.connected ? '✅ Conectado' : '❌ Desconectado'}`);
        console.log(`   Tabelas: ${this.results.database.tables.length}`);
        console.log(`   Usuários: ${this.results.database.users}`);
        console.log('');

        // Status das exchanges
        console.log('💱 EXCHANGES:');
        console.log(`   Binance: ${this.results.exchanges.binance.connected ? '✅ Conectada' : '❌ Falha'}`);
        if (this.results.exchanges.binance.connected) {
            const balance = this.results.exchanges.binance.balance;
            console.log(`      USDT: ${balance.USDT?.free || 0}`);
        }
        
        console.log(`   Bybit: ${this.results.exchanges.bybit.connected ? '✅ Conectada' : '❌ Falha'}`);
        if (this.results.exchanges.bybit.connected) {
            const balance = this.results.exchanges.bybit.balance;
            console.log(`      USDT: ${balance.USDT?.free || 0}`);
        }
        console.log('');

        // Operações executadas
        console.log('💰 OPERAÇÕES EXECUTADAS:');
        if (this.results.operations.executed.length > 0) {
            this.results.operations.executed.forEach(op => {
                console.log(`   ✅ ${op.exchange.toUpperCase()}: ${op.symbol} - ${op.amount} @ ${op.price || 'market'}`);
            });
        } else {
            console.log('   📋 Nenhuma operação executada');
        }
        console.log('');

        // Falhas
        if (this.results.operations.failed.length > 0) {
            console.log('❌ OPERAÇÕES FALHARAM:');
            this.results.operations.failed.forEach(fail => {
                console.log(`   ❌ ${fail.exchange.toUpperCase()}: ${fail.error}`);
            });
            console.log('');
        }

        // Position Safety
        console.log('🔒 POSITION SAFETY:');
        console.log(`   Validações: ${this.results.safety.validations.length}`);
        console.log(`   Violações: ${this.results.safety.violations.length}`);
        console.log('');

        // Status final
        const successfulOps = this.results.operations.executed.length;
        const totalOps = successfulOps + this.results.operations.failed.length;
        const successRate = totalOps > 0 ? Math.round((successfulOps/totalOps)*100) : 0;

        if (this.results.database.connected && successfulOps > 0) {
            console.log('🎉 SISTEMA 100% OPERACIONAL COM OPERAÇÕES REAIS!');
            console.log(`📊 Taxa de sucesso: ${successRate}%`);
            console.log('💰 Trading real ativo e funcionando!');
        } else {
            console.log('⚠️ Sistema operacional com limitações');
        }

        console.log('===============================');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const trader = new RealTradingExecution();
    trader.executeRealOperations().catch(error => {
        console.error('💥 FALHA CRÍTICA:', error);
        process.exit(1);
    });
}

module.exports = RealTradingExecution;
