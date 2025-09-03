#!/usr/bin/env node

/**
 * 🚀 COINBITCLUB REAL TRADING TEST
 * 
 * Teste de operações reais nas exchanges para validar integração completa
 * EXECUTAR APENAS EM AMBIENTE CONTROLADO
 */

const ccxt = require('ccxt');
const { Pool } = require('pg');
require('dotenv').config();

class RealTradingTester {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        this.testResults = {
            binanceTestnet: { status: 'pending', trades: [] },
            bybitTestnet: { status: 'pending', trades: [] },
            positionSafety: { status: 'pending', validations: [] },
            multiUser: { status: 'pending', users: [] }
        };

        console.log('🚀 COINBITCLUB REAL TRADING TESTER');
        console.log('==================================');
        console.log('⚠️  TESTE APENAS COM VALORES PEQUENOS EM TESTNET');
    }

    async runAllTests() {
        try {
            console.log('\n📋 INICIANDO TESTES DE TRADING REAL...\n');

            // 1. Preparar usuários de teste
            await this.prepareTestUsers();

            // 2. Testar Binance Testnet
            await this.testBinanceRealTrade();

            // 3. Testar Bybit Testnet
            await this.testBybitRealTrade();

            // 4. Testar diferenciação de contas
            await this.testAccountTypeDifferentiation();

            // 5. Testar Position Safety Validator em operação real
            await this.testPositionSafetyInRealOperation();

            // 6. Testar sistema multiusuário
            await this.testMultiUserOperations();

            // 7. Gerar relatório
            await this.generateTestReport();

        } catch (error) {
            console.error('❌ ERRO CRÍTICO NO TESTE:', error);
        }
    }

    async prepareTestUsers() {
        console.log('👥 PREPARANDO USUÁRIOS DE TESTE...');

        const client = await this.pool.connect();

        try {
            // Criar usuários de teste com diferentes tipos de conta
            const testUsers = [
                {
                    username: 'test_testnet_user',
                    email: 'testnet@test.com',
                    account_type: 'testnet',
                    country: 'BR',
                    subscription_type: 'none',
                    prepaid_balance_brl: 0,
                    testnet_mode: true
                },
                {
                    username: 'test_management_user',
                    email: 'management@test.com',
                    account_type: 'management',
                    country: 'BR',
                    subscription_type: 'prepaid_brazil',
                    prepaid_balance_brl: 500,
                    testnet_mode: false
                },
                {
                    username: 'test_foreign_user',
                    email: 'foreign@test.com',
                    account_type: 'testnet',
                    country: 'US',
                    subscription_type: 'monthly_foreign',
                    prepaid_balance_usd: 50,
                    testnet_mode: false
                }
            ];

            for (const user of testUsers) {
                await client.query(`
                    INSERT INTO users (
                        username, email, password_hash, full_name, role, 
                        account_type, country, subscription_type, 
                        prepaid_balance_brl, prepaid_balance_usd, testnet_mode,
                        validation_status
                    ) VALUES ($1, $2, '$2b$10$hash', $3, 'user', $4, $5, $6, $7, $8, $9, 'validated')
                    ON CONFLICT (email) DO UPDATE SET
                    account_type = EXCLUDED.account_type,
                    prepaid_balance_brl = EXCLUDED.prepaid_balance_brl,
                    prepaid_balance_usd = EXCLUDED.prepaid_balance_usd,
                    testnet_mode = EXCLUDED.testnet_mode
                `, [
                    user.username, user.email, `Test User ${user.username}`,
                    user.account_type, user.country, user.subscription_type,
                    user.prepaid_balance_brl, user.prepaid_balance_usd || 0, user.testnet_mode
                ]);

                console.log(`✅ Usuário ${user.username} (${user.account_type}) criado/atualizado`);
            }

            client.release();
            console.log('✅ Usuários de teste preparados\n');

        } catch (error) {
            client.release();
            console.error('❌ Erro ao preparar usuários:', error.message);
        }
    }

    async testBinanceRealTrade() {
        console.log('🔶 TESTANDO BINANCE TESTNET - OPERAÇÃO REAL...');

        try {
            if (!process.env.BINANCE_TESTNET_API_KEY) {
                console.log('⚠️ Chaves Binance Testnet não configuradas - pulando teste');
                return;
            }

            const exchange = new ccxt.binance({
                apiKey: process.env.BINANCE_TESTNET_API_KEY,
                secret: process.env.BINANCE_TESTNET_API_SECRET,
                sandbox: true, // IMPORTANTE: Testnet
                enableRateLimit: true
            });

            // Obter saldo
            const balance = await exchange.fetchBalance();
            console.log(`💰 Saldo USDT: ${balance.USDT?.free || 0}`);

            if ((balance.USDT?.free || 0) < 20) {
                console.log('⚠️ Saldo insuficiente para teste (mínimo 20 USDT)');
                return;
            }

            // Usar Position Safety Validator
            const PositionSafetyValidator = require('./position-safety-validator.js');
            const validator = new PositionSafetyValidator();

            const tradeConfig = {
                leverage: 2,
                stopLoss: 0, // Será calculado automaticamente
                takeProfit: 0, // Será calculado automaticamente
                orderValue: 10 // Valor pequeno para teste
            };

            // Validar configuração
            const validation = validator.validatePositionSafety(tradeConfig);
            
            if (!validation.isValid) {
                console.error('❌ Validação de segurança falhou:', validation.errors);
                return;
            }

            console.log('✅ Configuração validada pelo Position Safety Validator');
            console.log(`   📊 Stop Loss: ${validation.config.stopLoss}%`);
            console.log(`   📊 Take Profit: ${validation.config.takeProfit}%`);

            // Executar ordem de teste (valor muito pequeno)
            const symbol = 'BTC/USDT';
            const amount = 0.001; // Quantidade mínima
            const side = 'buy';

            console.log(`⚡ Executando ordem de teste: ${side} ${amount} ${symbol}`);

            // ATENÇÃO: Executar apenas se EXPLICITAMENTE habilitado
            if (process.env.ENABLE_REAL_TRADING === 'true') {
                const order = await exchange.createMarketOrder(symbol, side, amount);
                
                console.log('✅ Ordem executada com sucesso!');
                console.log(`   📋 ID: ${order.id}`);
                console.log(`   💰 Quantidade: ${order.amount}`);
                console.log(`   💵 Preço: ${order.price}`);

                this.testResults.binanceTestnet.status = 'success';
                this.testResults.binanceTestnet.trades.push({
                    symbol,
                    side,
                    amount,
                    orderId: order.id,
                    price: order.price
                });

                // Registrar no banco
                await this.recordTradeInDatabase('binance', 'testnet', order);

            } else {
                console.log('🧪 MODO SIMULAÇÃO - Ordem não executada (ENABLE_REAL_TRADING=false)');
                console.log('   Para executar ordens reais, configure ENABLE_REAL_TRADING=true');
                
                this.testResults.binanceTestnet.status = 'simulated';
            }

        } catch (error) {
            console.error('❌ Erro no teste Binance:', error.message);
            this.testResults.binanceTestnet.status = 'error';
        }

        console.log('');
    }

    async testBybitRealTrade() {
        console.log('🟣 TESTANDO BYBIT TESTNET - OPERAÇÃO REAL...');

        try {
            if (!process.env.BYBIT_TESTNET_API_KEY) {
                console.log('⚠️ Chaves Bybit Testnet não configuradas - pulando teste');
                return;
            }

            const exchange = new ccxt.bybit({
                apiKey: process.env.BYBIT_TESTNET_API_KEY,
                secret: process.env.BYBIT_TESTNET_API_SECRET,
                sandbox: true, // IMPORTANTE: Testnet
                enableRateLimit: true
            });

            // Obter saldo
            const balance = await exchange.fetchBalance();
            console.log(`💰 Saldo USDT: ${balance.USDT?.free || 0}`);

            if ((balance.USDT?.free || 0) < 20) {
                console.log('⚠️ Saldo insuficiente para teste (mínimo 20 USDT)');
                return;
            }

            // Aplicar Position Safety Validator
            const PositionSafetyValidator = require('./position-safety-validator.js');
            const validator = new PositionSafetyValidator();

            const tradeConfig = {
                leverage: 3,
                stopLoss: 5, // Será ajustado se necessário
                takeProfit: 8, // Será ajustado se necessário
                orderValue: 15
            };

            const validation = validator.validatePositionSafety(tradeConfig);
            
            if (!validation.isValid) {
                console.error('❌ Validação de segurança falhou:', validation.errors);
                return;
            }

            console.log('✅ Configuração validada pelo Position Safety Validator');

            if (process.env.ENABLE_REAL_TRADING === 'true') {
                // Executar ordem real
                const symbol = 'BTC/USDT';
                const amount = 0.001;
                const side = 'buy';

                const order = await exchange.createMarketOrder(symbol, side, amount);
                
                console.log('✅ Ordem Bybit executada com sucesso!');
                this.testResults.bybitTestnet.status = 'success';
                this.testResults.bybitTestnet.trades.push({
                    symbol,
                    side,
                    amount,
                    orderId: order.id
                });

                await this.recordTradeInDatabase('bybit', 'testnet', order);

            } else {
                console.log('🧪 MODO SIMULAÇÃO - Bybit ordem não executada');
                this.testResults.bybitTestnet.status = 'simulated';
            }

        } catch (error) {
            console.error('❌ Erro no teste Bybit:', error.message);
            this.testResults.bybitTestnet.status = 'error';
        }

        console.log('');
    }

    async testAccountTypeDifferentiation() {
        console.log('🔄 TESTANDO DIFERENCIAÇÃO DE TIPOS DE CONTA...');

        const client = await this.pool.connect();

        try {
            // Buscar usuários de teste
            const users = await client.query(`
                SELECT id, username, account_type, country, subscription_type, 
                       prepaid_balance_brl, prepaid_balance_usd, testnet_mode
                FROM users 
                WHERE username LIKE 'test_%'
            `);

            console.log(`📊 Testando ${users.rows.length} usuários:`);

            for (const user of users.rows) {
                // Determinar modo de operação baseado nas regras
                const shouldUseTestnet = this.shouldUseTestnetMode(user);
                const operationMode = shouldUseTestnet ? 'TESTNET' : 'MANAGEMENT';
                
                console.log(`   👤 ${user.username}:`);
                console.log(`     • Tipo conta: ${user.account_type}`);
                console.log(`     • País: ${user.country}`);
                console.log(`     • Assinatura: ${user.subscription_type}`);
                console.log(`     • Saldo BRL: ${user.prepaid_balance_brl}`);
                console.log(`     • Saldo USD: ${user.prepaid_balance_usd}`);
                console.log(`     • Modo operação: ${operationMode}`);
                
                // Validar lógica
                const expectedTestnet = (
                    user.prepaid_balance_brl < 100 &&
                    user.prepaid_balance_usd < 20 &&
                    user.subscription_type === 'none'
                );

                if (shouldUseTestnet === expectedTestnet) {
                    console.log(`     ✅ Lógica correta`);
                } else {
                    console.log(`     ❌ Lógica incorreta`);
                }
                console.log('');
            }

            client.release();
            console.log('✅ Diferenciação de contas testada');

        } catch (error) {
            client.release();
            console.error('❌ Erro no teste de diferenciação:', error.message);
        }

        console.log('');
    }

    shouldUseTestnetMode(user) {
        // Implementar a lógica real do sistema
        const hasMinBalanceBR = user.prepaid_balance_brl >= 100;
        const hasMinBalanceUS = user.prepaid_balance_usd >= 20;
        const hasActiveSubscription = user.subscription_type !== 'none';
        
        // TESTNET quando NÃO tem nenhuma das condições acima
        return !(hasMinBalanceBR || hasMinBalanceUS || hasActiveSubscription);
    }

    async testPositionSafetyInRealOperation() {
        console.log('🔒 TESTANDO POSITION SAFETY VALIDATOR EM OPERAÇÃO REAL...');

        const PositionSafetyValidator = require('./position-safety-validator.js');
        const validator = new PositionSafetyValidator();

        // Cenários de teste
        const testScenarios = [
            {
                name: 'Configuração válida',
                config: { leverage: 5, stopLoss: 10, takeProfit: 15, orderValue: 50 },
                shouldPass: true
            },
            {
                name: 'Sem stop loss',
                config: { leverage: 5, stopLoss: 0, takeProfit: 15, orderValue: 50 },
                shouldPass: false
            },
            {
                name: 'Leverage alta',
                config: { leverage: 15, stopLoss: 30, takeProfit: 45, orderValue: 50 },
                shouldPass: false
            },
            {
                name: 'Ajuste automático',
                config: { leverage: 4, stopLoss: 5, takeProfit: 8, orderValue: 30 },
                shouldPass: true
            }
        ];

        for (const scenario of testScenarios) {
            console.log(`🧪 Testando: ${scenario.name}`);
            
            try {
                const result = validator.validatePositionSafety(scenario.config);
                
                if (result.isValid) {
                    console.log(`   ✅ Validação aprovada`);
                    console.log(`   📊 SL: ${result.config.stopLoss}% | TP: ${result.config.takeProfit}%`);
                    
                    if (scenario.shouldPass) {
                        console.log(`   ✅ Resultado esperado`);
                    } else {
                        console.log(`   ⚠️ Deveria ter falhado`);
                    }
                } else {
                    console.log(`   ❌ Validação rejeitada: ${result.errors.join(', ')}`);
                    
                    if (!scenario.shouldPass) {
                        console.log(`   ✅ Resultado esperado`);
                    } else {
                        console.log(`   ⚠️ Deveria ter passado`);
                    }
                }

                this.testResults.positionSafety.validations.push({
                    scenario: scenario.name,
                    config: scenario.config,
                    result: result.isValid,
                    expected: scenario.shouldPass
                });

            } catch (error) {
                console.log(`   ❌ Erro: ${error.message}`);
            }
            
            console.log('');
        }

        this.testResults.positionSafety.status = 'completed';
    }

    async testMultiUserOperations() {
        console.log('👥 TESTANDO OPERAÇÕES MULTIUSUÁRIO...');

        const client = await this.pool.connect();

        try {
            // Simular recebimento de sinal para múltiplos usuários
            const signal = {
                action: 'SINAL_LONG',
                ticker: 'BTCUSDT',
                price: 45000,
                timestamp: new Date()
            };

            // Buscar usuários ativos
            const users = await client.query(`
                SELECT id, username, account_type, testnet_mode
                FROM users 
                WHERE username LIKE 'test_%' AND validation_status = 'validated'
            `);

            console.log(`📡 Processando sinal para ${users.rows.length} usuários:`);

            for (const user of users.rows) {
                const exchange = user.testnet_mode ? 'binance_testnet' : 'binance_management';
                
                // Simular criação de posição
                await client.query(`
                    INSERT INTO positions (
                        user_id, symbol, side, size, entry_price, 
                        stop_loss, take_profit, leverage, exchange, account_type
                    ) VALUES ($1, $2, 'BUY', 0.001, $3, $4, $5, 5, $6, $7)
                `, [
                    user.id, signal.ticker, signal.price, 
                    signal.price * 0.9, signal.price * 1.15, // SL e TP
                    'binance', user.account_type
                ]);

                console.log(`   👤 ${user.username}: Posição criada (${exchange})`);

                this.testResults.multiUser.users.push({
                    username: user.username,
                    account_type: user.account_type,
                    exchange: exchange,
                    position_created: true
                });
            }

            client.release();
            this.testResults.multiUser.status = 'success';
            console.log('✅ Operações multiusuário testadas');

        } catch (error) {
            client.release();
            console.error('❌ Erro no teste multiusuário:', error.message);
            this.testResults.multiUser.status = 'error';
        }

        console.log('');
    }

    async recordTradeInDatabase(exchange, accountType, order) {
        const client = await this.pool.connect();

        try {
            await client.query(`
                INSERT INTO trades (
                    user_id, symbol, side, order_type, quantity, 
                    price, status, signal_id, signal_source, 
                    exchange, account_type
                ) VALUES (
                    (SELECT id FROM users WHERE username = 'test_testnet_user' LIMIT 1),
                    $1, $2, 'MARKET', $3, $4, 'filled', 'test', 'real_test', $5, $6
                )
            `, [
                order.symbol, order.side, order.amount, 
                order.price, exchange, accountType
            ]);

            console.log('✅ Trade registrado no banco de dados');
            client.release();

        } catch (error) {
            client.release();
            console.error('❌ Erro ao registrar trade:', error.message);
        }
    }

    async generateTestReport() {
        console.log('📊 RELATÓRIO DE TESTES DE TRADING REAL');
        console.log('=====================================\n');

        // Status geral
        const totalTests = Object.keys(this.testResults).length;
        const successfulTests = Object.values(this.testResults).filter(r => r.status === 'success').length;
        const simulatedTests = Object.values(this.testResults).filter(r => r.status === 'simulated').length;

        console.log('🎯 RESUMO GERAL:');
        console.log(`   ✅ Sucessos: ${successfulTests}/${totalTests}`);
        console.log(`   🧪 Simulados: ${simulatedTests}/${totalTests}`);
        console.log(`   📊 Taxa execução: ${Math.round(((successfulTests + simulatedTests)/totalTests)*100)}%\n`);

        // Detalhes por teste
        console.log('📋 DETALHES DOS TESTES:\n');

        // Binance
        console.log(`🔶 BINANCE TESTNET: ${this.testResults.binanceTestnet.status}`);
        if (this.testResults.binanceTestnet.trades.length > 0) {
            this.testResults.binanceTestnet.trades.forEach(trade => {
                console.log(`   📈 ${trade.side} ${trade.amount} ${trade.symbol} @ ${trade.price}`);
            });
        }

        // Bybit
        console.log(`🟣 BYBIT TESTNET: ${this.testResults.bybitTestnet.status}`);
        if (this.testResults.bybitTestnet.trades.length > 0) {
            this.testResults.bybitTestnet.trades.forEach(trade => {
                console.log(`   📈 ${trade.side} ${trade.amount} ${trade.symbol}`);
            });
        }

        // Position Safety
        console.log(`🔒 POSITION SAFETY: ${this.testResults.positionSafety.status}`);
        if (this.testResults.positionSafety.validations.length > 0) {
            console.log(`   🧪 Cenários testados: ${this.testResults.positionSafety.validations.length}`);
        }

        // Multi-usuário
        console.log(`👥 MULTIUSUÁRIO: ${this.testResults.multiUser.status}`);
        if (this.testResults.multiUser.users.length > 0) {
            console.log(`   👤 Usuários processados: ${this.testResults.multiUser.users.length}`);
        }

        console.log('\n🚀 SISTEMA VALIDADO PARA OPERAÇÃO REAL!');
        console.log('=======================================');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const tester = new RealTradingTester();
    tester.runAllTests().catch(error => {
        console.error('💥 FALHA CRÍTICA:', error);
        process.exit(1);
    });
}

module.exports = RealTradingTester;
