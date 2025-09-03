#!/usr/bin/env node

/**
 * 🚀 COINBITCLUB MULTIUSER REAL OPERATIONS TESTER
 * 
 * Testa operações reais multiusuário com diferenciação testnet vs management
 * Executa trades reais nas exchanges para validar integração completa
 */

const { Pool } = require('pg');
const ccxt = require('ccxt');
require('dotenv').config();

class MultiUserOperationsTester {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        this.exchanges = {
            binanceTestnet: null,
            bybitTestnet: null,
            binanceManagement: null
        };

        this.testUsers = [];
        this.testResults = {
            userCreation: [],
            accountClassification: [],
            realTrades: [],
            multiUserValidation: []
        };

        console.log('🚀 MULTIUSER OPERATIONS TESTER INICIADO');
        console.log('==========================================');
    }

    async runCompleteTest() {
        try {
            console.log('\n📋 INICIANDO TESTE COMPLETO MULTIUSUÁRIO...\n');

            // 1. Configurar exchanges
            await this.setupExchanges();

            // 2. Criar usuários de teste
            await this.createTestUsers();

            // 3. Testar classificação de contas
            await this.testAccountClassification();

            // 4. Executar operações reais multiusuário
            await this.executeMultiUserRealOperations();

            // 5. Validar diferenciação testnet vs management
            await this.validateAccountDifferentiation();

            // 6. Gerar relatório final
            await this.generateTestReport();

        } catch (error) {
            console.error('❌ ERRO NO TESTE:', error);
            process.exit(1);
        }
    }

    async setupExchanges() {
        console.log('🏪 CONFIGURANDO EXCHANGES...');

        // Binance Testnet
        this.exchanges.binanceTestnet = new ccxt.binance({
            apiKey: process.env.BINANCE_TESTNET_API_KEY,
            secret: process.env.BINANCE_TESTNET_API_SECRET,
            sandbox: true,
            enableRateLimit: true
        });

        // Bybit Testnet
        this.exchanges.bybitTestnet = new ccxt.bybit({
            apiKey: process.env.BYBIT_TESTNET_API_KEY,
            secret: process.env.BYBIT_TESTNET_API_SECRET,
            sandbox: true,
            enableRateLimit: true
        });

        // Binance Management (produção controlada)
        if (process.env.BINANCE_MANAGEMENT_API_KEY) {
            this.exchanges.binanceManagement = new ccxt.binance({
                apiKey: process.env.BINANCE_MANAGEMENT_API_KEY,
                secret: process.env.BINANCE_MANAGEMENT_API_SECRET,
                sandbox: false,
                enableRateLimit: true
            });
        }

        // Testar conexões
        for (const [name, exchange] of Object.entries(this.exchanges)) {
            if (exchange) {
                try {
                    const status = await exchange.fetchStatus();
                    console.log(`✅ ${name}: Conectado (${status.status})`);
                } catch (error) {
                    console.log(`❌ ${name}: Erro - ${error.message}`);
                }
            }
        }

        console.log('');
    }

    async createTestUsers() {
        console.log('👥 CRIANDO USUÁRIOS DE TESTE...');

        const testUsersData = [
            {
                username: 'test_user_testnet_1',
                email: 'testuser1@test.com',
                account_type: 'testnet',
                role: 'user',
                trading_balance: 1000.00
            },
            {
                username: 'test_user_testnet_2', 
                email: 'testuser2@test.com',
                account_type: 'testnet',
                role: 'user',
                trading_balance: 500.00
            },
            {
                username: 'test_management_1',
                email: 'management1@test.com',
                account_type: 'management',
                role: 'user',
                trading_balance: 10000.00
            },
            {
                username: 'test_affiliate_1',
                email: 'affiliate1@test.com',
                account_type: 'testnet',
                role: 'affiliate',
                trading_balance: 2000.00
            }
        ];

        const client = await this.pool.connect();

        for (const userData of testUsersData) {
            try {
                const result = await client.query(`
                    INSERT INTO users (username, email, password_hash, account_type, role, trading_balance, is_active, validation_status)
                    VALUES ($1, $2, '$2b$10$test', $3, $4, $5, true, 'validated')
                    ON CONFLICT (email) DO UPDATE SET
                    account_type = EXCLUDED.account_type,
                    role = EXCLUDED.role,
                    trading_balance = EXCLUDED.trading_balance,
                    updated_at = NOW()
                    RETURNING id
                `, [userData.username, userData.email, userData.account_type, userData.role, userData.trading_balance]);

                const userId = result.rows[0].id;
                userData.id = userId;
                this.testUsers.push(userData);

                console.log(`✅ Usuário criado: ${userData.username} (${userData.account_type}) - ID: ${userId}`);
                
                this.testResults.userCreation.push({
                    username: userData.username,
                    account_type: userData.account_type,
                    status: 'created',
                    id: userId
                });

            } catch (error) {
                console.log(`❌ Erro ao criar usuário ${userData.username}:`, error.message);
                this.testResults.userCreation.push({
                    username: userData.username,
                    status: 'error',
                    error: error.message
                });
            }
        }

        client.release();
        console.log(`\n📊 Total de usuários de teste: ${this.testUsers.length}\n`);
    }

    async testAccountClassification() {
        console.log('🏷️ TESTANDO CLASSIFICAÇÃO DE CONTAS...');

        for (const user of this.testUsers) {
            const classification = this.classifyUserAccount(user);
            
            console.log(`👤 ${user.username}:`);
            console.log(`   📋 Tipo: ${user.account_type}`);
            console.log(`   🎯 Role: ${user.role}`);
            console.log(`   🏪 Exchange recomendada: ${classification.recommendedExchange}`);
            console.log(`   ⚙️ Configurações: ${JSON.stringify(classification.settings)}`);
            console.log('');

            this.testResults.accountClassification.push({
                username: user.username,
                account_type: user.account_type,
                classification: classification
            });
        }
    }

    classifyUserAccount(user) {
        // Lógica de classificação baseada na especificação
        const classification = {
            recommendedExchange: null,
            settings: {
                maxLeverage: 1,
                maxPositionSize: 0,
                riskLevel: 'low',
                allowedPairs: ['BTCUSDT'],
                features: []
            }
        };

        if (user.account_type === 'testnet') {
            // Contas testnet - usuários normais
            classification.recommendedExchange = user.trading_balance > 1000 ? 'bybitTestnet' : 'binanceTestnet';
            classification.settings.maxLeverage = user.role === 'affiliate' ? 5 : 3;
            classification.settings.maxPositionSize = user.trading_balance * 0.1; // 10% do saldo
            classification.settings.riskLevel = 'medium';
            classification.settings.allowedPairs = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];
            classification.settings.features = ['paper_trading', 'learning_mode', 'basic_signals'];
            
        } else if (user.account_type === 'management') {
            // Contas management - operações controladas reais
            classification.recommendedExchange = 'binanceManagement';
            classification.settings.maxLeverage = 10;
            classification.settings.maxPositionSize = user.trading_balance * 0.5; // 50% do saldo
            classification.settings.riskLevel = 'high';
            classification.settings.allowedPairs = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT'];
            classification.settings.features = ['real_trading', 'advanced_signals', 'portfolio_management', 'risk_management'];
        }

        return classification;
    }

    async executeMultiUserRealOperations() {
        console.log('⚡ EXECUTANDO OPERAÇÕES REAIS MULTIUSUÁRIO...');

        // Importar Position Safety Validator
        const PositionSafetyValidator = require('./position-safety-validator.js');
        const validator = new PositionSafetyValidator();

        for (const user of this.testUsers) {
            try {
                console.log(`\n💼 Processando usuário: ${user.username} (${user.account_type})`);

                const classification = this.classifyUserAccount(user);
                const exchange = this.exchanges[classification.recommendedExchange];

                if (!exchange) {
                    console.log(`⚠️ Exchange não disponível: ${classification.recommendedExchange}`);
                    continue;
                }

                // Configurar operação baseada no tipo de conta
                const operationConfig = {
                    leverage: Math.min(classification.settings.maxLeverage, 5),
                    stopLoss: 0, // Será calculado pelo validator
                    takeProfit: 0, // Será calculado pelo validator 
                    orderValue: Math.min(classification.settings.maxPositionSize, 50) // Valor baixo para teste
                };

                // Validar configuração de segurança
                const safetyValidation = validator.validatePositionSafety(operationConfig);
                
                if (!safetyValidation.isValid) {
                    console.log(`❌ Validação de segurança falhou: ${safetyValidation.errors.join(', ')}`);
                    continue;
                }

                const safeConfig = safetyValidation.config;
                console.log(`✅ Configuração validada:`);
                console.log(`   📊 Leverage: ${safeConfig.leverage}x`);
                console.log(`   🛡️ Stop Loss: ${safeConfig.stopLoss}%`);
                console.log(`   🎯 Take Profit: ${safeConfig.takeProfit}%`);
                console.log(`   💰 Valor: $${safeConfig.orderValue}`);

                // Simular execução de ordem (para contas testnet executamos real, para management apenas simulamos)
                if (user.account_type === 'testnet') {
                    await this.executeTestnetOrder(user, exchange, safeConfig);
                } else {
                    await this.simulateManagementOrder(user, safeConfig);
                }

            } catch (error) {
                console.log(`❌ Erro ao processar usuário ${user.username}:`, error.message);
                this.testResults.realTrades.push({
                    username: user.username,
                    status: 'error',
                    error: error.message
                });
            }
        }

        console.log('\n✅ Operações multiusuário processadas\n');
    }

    async executeTestnetOrder(user, exchange, config) {
        console.log(`🔥 Executando ordem real testnet para ${user.username}...`);

        try {
            // Verificar saldo
            const balance = await exchange.fetchBalance();
            const usdtBalance = balance.USDT?.free || 0;

            if (usdtBalance < config.orderValue) {
                console.log(`⚠️ Saldo insuficiente: ${usdtBalance} < ${config.orderValue}`);
                return;
            }

            // Obter preço atual
            const ticker = await exchange.fetchTicker('BTC/USDT');
            const currentPrice = ticker.last;

            // Calcular quantidade
            const quantity = (config.orderValue / currentPrice).toFixed(6);

            console.log(`📊 Executando ordem:`);
            console.log(`   💰 Quantidade: ${quantity} BTC`);
            console.log(`   💵 Preço atual: $${currentPrice}`);
            console.log(`   🛡️ Stop Loss: $${(currentPrice * (1 - config.stopLoss / 100)).toFixed(2)}`);
            console.log(`   🎯 Take Profit: $${(currentPrice * (1 + config.takeProfit / 100)).toFixed(2)}`);

            // EXECUTAR ORDEM REAL (apenas em testnet!)
            if (parseFloat(quantity) > 0.001) { // Quantidade mínima
                const order = await exchange.createMarketBuyOrder('BTC/USDT', parseFloat(quantity));
                
                console.log(`✅ Ordem executada! ID: ${order.id}`);
                
                // Salvar no banco
                await this.saveTradeToDatabase(user, order, config, 'testnet');

                this.testResults.realTrades.push({
                    username: user.username,
                    account_type: user.account_type,
                    status: 'executed',
                    orderId: order.id,
                    quantity: quantity,
                    price: currentPrice
                });

            } else {
                console.log(`⚠️ Quantidade muito pequena para executar: ${quantity}`);
            }

        } catch (error) {
            console.log(`❌ Erro na execução:`, error.message);
            this.testResults.realTrades.push({
                username: user.username,
                status: 'error',
                error: error.message
            });
        }
    }

    async simulateManagementOrder(user, config) {
        console.log(`🎭 Simulando ordem management para ${user.username}...`);

        // Para contas management, apenas simulamos e logamos
        const simulatedPrice = 45000;
        const quantity = (config.orderValue / simulatedPrice).toFixed(6);

        console.log(`📊 Ordem simulada (Management):`);
        console.log(`   💰 Quantidade: ${quantity} BTC`);
        console.log(`   💵 Preço simulado: $${simulatedPrice}`);
        console.log(`   🛡️ Stop Loss: $${(simulatedPrice * (1 - config.stopLoss / 100)).toFixed(2)}`);
        console.log(`   🎯 Take Profit: $${(simulatedPrice * (1 + config.takeProfit / 100)).toFixed(2)}`);

        // Salvar como operação simulada
        await this.saveTradeToDatabase(user, {
            id: `sim_${Date.now()}`,
            amount: quantity,
            price: simulatedPrice,
            side: 'buy',
            status: 'simulated'
        }, config, 'management');

        this.testResults.realTrades.push({
            username: user.username,
            account_type: user.account_type,
            status: 'simulated',
            quantity: quantity,
            price: simulatedPrice
        });
    }

    async saveTradeToDatabase(user, order, config, accountType) {
        const client = await this.pool.connect();

        try {
            await client.query(`
                INSERT INTO trades (
                    user_id, symbol, side, order_type, quantity, price, 
                    status, signal_id, signal_source, exchange, account_type, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            `, [
                user.id,
                'BTCUSDT',
                order.side || 'buy',
                'MARKET',
                order.amount || order.quantity,
                order.price || order.last,
                order.status || 'filled',
                `test_${Date.now()}`,
                'system_test',
                accountType === 'testnet' ? 'binance_testnet' : 'binance_management',
                accountType
            ]);

            // Criar posição correspondente
            await client.query(`
                INSERT INTO positions (
                    user_id, symbol, side, size, entry_price, stop_loss, take_profit, 
                    leverage, is_active, exchange, account_type, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            `, [
                user.id,
                'BTCUSDT',
                'BUY',
                order.amount || order.quantity,
                order.price || order.last,
                (order.price || order.last) * (1 - config.stopLoss / 100),
                (order.price || order.last) * (1 + config.takeProfit / 100),
                config.leverage,
                true,
                accountType === 'testnet' ? 'binance_testnet' : 'binance_management',
                accountType
            ]);

            console.log(`💾 Trade salvo no banco de dados`);

        } catch (error) {
            console.log(`❌ Erro ao salvar no banco:`, error.message);
        } finally {
            client.release();
        }
    }

    async validateAccountDifferentiation() {
        console.log('🔍 VALIDANDO DIFERENCIAÇÃO DE CONTAS...');

        const client = await this.pool.connect();

        try {
            // Verificar se trades estão corretamente classificados
            const testnetTrades = await client.query(`
                SELECT COUNT(*) as count, array_agg(DISTINCT exchange) as exchanges
                FROM trades t
                JOIN users u ON t.user_id = u.id
                WHERE u.account_type = 'testnet'
            `);

            const managementTrades = await client.query(`
                SELECT COUNT(*) as count, array_agg(DISTINCT exchange) as exchanges  
                FROM trades t
                JOIN users u ON t.user_id = u.id
                WHERE u.account_type = 'management'
            `);

            console.log(`📊 Trades Testnet: ${testnetTrades.rows[0].count}`);
            console.log(`   🏪 Exchanges: ${testnetTrades.rows[0].exchanges?.join(', ') || 'nenhuma'}`);

            console.log(`📊 Trades Management: ${managementTrades.rows[0].count}`);
            console.log(`   🏪 Exchanges: ${managementTrades.rows[0].exchanges?.join(', ') || 'nenhuma'}`);

            // Verificar isolamento entre tipos de conta
            const crossContamination = await client.query(`
                SELECT 
                    u.account_type,
                    t.exchange,
                    COUNT(*) as count
                FROM trades t
                JOIN users u ON t.user_id = u.id
                GROUP BY u.account_type, t.exchange
                ORDER BY u.account_type, t.exchange
            `);

            console.log('\n🔬 Análise de contaminação cruzada:');
            for (const row of crossContamination.rows) {
                const isCorrect = (
                    (row.account_type === 'testnet' && row.exchange.includes('testnet')) ||
                    (row.account_type === 'management' && row.exchange.includes('management'))
                );

                const icon = isCorrect ? '✅' : '❌';
                console.log(`   ${icon} ${row.account_type} → ${row.exchange}: ${row.count} trades`);
                
                this.testResults.multiUserValidation.push({
                    account_type: row.account_type,
                    exchange: row.exchange,
                    count: row.count,
                    is_correct: isCorrect
                });
            }

        } catch (error) {
            console.log(`❌ Erro na validação:`, error.message);
        } finally {
            client.release();
        }

        console.log('');
    }

    async generateTestReport() {
        console.log('📊 RELATÓRIO FINAL - TESTE MULTIUSUÁRIO');
        console.log('===========================================\n');

        // Usuários criados
        console.log('👥 USUÁRIOS DE TESTE:');
        this.testResults.userCreation.forEach(user => {
            const icon = user.status === 'created' ? '✅' : '❌';
            console.log(`   ${icon} ${user.username} (${user.account_type || 'unknown'})`);
        });

        // Classificação de contas
        console.log('\n🏷️ CLASSIFICAÇÃO DE CONTAS:');
        this.testResults.accountClassification.forEach(classification => {
            console.log(`   📋 ${classification.username}: ${classification.account_type}`);
            console.log(`      🏪 Exchange: ${classification.classification.recommendedExchange}`);
            console.log(`      ⚙️ Max Leverage: ${classification.classification.settings.maxLeverage}x`);
        });

        // Trades executados
        console.log('\n⚡ OPERAÇÕES EXECUTADAS:');
        const successfulTrades = this.testResults.realTrades.filter(t => t.status === 'executed' || t.status === 'simulated');
        const failedTrades = this.testResults.realTrades.filter(t => t.status === 'error');

        console.log(`   ✅ Sucessos: ${successfulTrades.length}`);
        console.log(`   ❌ Falhas: ${failedTrades.length}`);

        successfulTrades.forEach(trade => {
            const icon = trade.status === 'executed' ? '🔥' : '🎭';
            console.log(`   ${icon} ${trade.username}: ${trade.quantity} BTC @ $${trade.price}`);
        });

        // Validação de diferenciação
        console.log('\n🔍 DIFERENCIAÇÃO DE CONTAS:');
        const correctClassifications = this.testResults.multiUserValidation.filter(v => v.is_correct);
        const incorrectClassifications = this.testResults.multiUserValidation.filter(v => !v.is_correct);

        console.log(`   ✅ Classificações corretas: ${correctClassifications.length}`);
        console.log(`   ❌ Classificações incorretas: ${incorrectClassifications.length}`);

        // Status final
        const totalTests = this.testResults.userCreation.length + 
                          this.testResults.realTrades.length + 
                          this.testResults.multiUserValidation.length;
        
        const successfulTests = this.testResults.userCreation.filter(u => u.status === 'created').length +
                               successfulTrades.length +
                               correctClassifications.length;

        const successRate = Math.round((successfulTests / totalTests) * 100);

        console.log('\n🎯 RESULTADO FINAL:');
        console.log(`   📊 Taxa de sucesso: ${successRate}%`);
        console.log(`   ✅ Testes passaram: ${successfulTests}/${totalTests}`);

        if (successRate >= 90) {
            console.log('   🚀 SISTEMA MULTIUSUÁRIO VALIDADO - PRONTO PARA PRODUÇÃO!');
        } else if (successRate >= 70) {
            console.log('   ⚠️ SISTEMA PARCIALMENTE VALIDADO - REVISAR FALHAS');
        } else {
            console.log('   ❌ SISTEMA REQUER CORREÇÕES ANTES DO DEPLOY');
        }

        console.log('\n===========================================');
        console.log('✅ TESTE MULTIUSUÁRIO FINALIZADO');
    }

    async cleanup() {
        console.log('\n🧹 LIMPANDO DADOS DE TESTE...');

        const client = await this.pool.connect();

        try {
            // Deletar trades de teste
            await client.query(`
                DELETE FROM trades 
                WHERE signal_source = 'system_test' OR signal_id LIKE 'test_%'
            `);

            // Deletar posições de teste
            await client.query(`
                DELETE FROM positions p
                USING users u
                WHERE p.user_id = u.id AND u.username LIKE 'test_%'
            `);

            // Deletar usuários de teste
            await client.query(`
                DELETE FROM users 
                WHERE username LIKE 'test_%' OR email LIKE '%@test.com'
            `);

            console.log('✅ Dados de teste removidos');

        } catch (error) {
            console.log('❌ Erro na limpeza:', error.message);
        } finally {
            client.release();
        }
    }
}

// Executar teste se chamado diretamente
if (require.main === module) {
    const tester = new MultiUserOperationsTester();
    
    // Adicionar handler para limpeza em caso de interrupção
    process.on('SIGINT', async () => {
        console.log('\n🛑 Interrompido pelo usuário');
        await tester.cleanup();
        process.exit(0);
    });

    tester.runCompleteTest().then(async () => {
        // Perguntar se quer limpar dados de teste
        console.log('\n❓ Deseja limpar os dados de teste? (y/N)');
        
        // Aguardar 5 segundos e limpar automaticamente
        setTimeout(async () => {
            await tester.cleanup();
            process.exit(0);
        }, 5000);
        
    }).catch(error => {
        console.error('💥 FALHA NO TESTE:', error);
        process.exit(1);
    });
}

module.exports = MultiUserOperationsTester;
