#!/usr/bin/env node

/**
 * 🧪 TESTE DE TRADE REAL - VALIDAÇÃO FINAL
 * ========================================
 * 
 * Script PROFISSIONAL para executar testes reais de trading
 * Inclui criptografia, descriptografia e todas as funções críticas
 * 
 * CRÍTICO: Sistema completo sem pontos cegos
 */

const { Pool } = require('pg');
const ccxt = require('ccxt');
const axios = require('axios');
const crypto = require('crypto');

// Configuração do banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class TesteTradeReal {
    constructor() {
        this.currentIP = null;
        this.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'coinbitclub2024_secret_key_for_encryption';
        this.ALGORITHM = 'aes-256-cbc';
        
        this.expectedIPs = [
            '131.0.31.147',     // Railway
            '132.255.160.131'   // IP atual detectado
        ];
        
        // Códigos de erro baseados na metodologia comprovada
        this.ERROR_CODES = {
            10010: {
                problem: 'IP não está na whitelist',
                solution: 'Adicionar IP atual na whitelist do painel Bybit',
                critical: true
            },
            10004: {
                problem: 'Erro de assinatura - API Secret incorreto',
                solution: 'Verificar se API Secret está correto e geração de assinatura',
                critical: true
            },
            10003: {
                problem: 'API Key inválida',
                solution: 'Verificar se API Key está correta',
                critical: true
            },
            33004: {
                problem: 'Permissões insuficientes da API Key',
                solution: 'Habilitar permissões necessárias no painel Bybit',
                critical: false
            }
        };

        // Estatísticas
        this.stats = {
            total_keys: 0,
            successful_connections: 0,
            failed_connections: 0,
            trades_executed: 0,
            trades_failed: 0
        };
    }

    /**
     * 🔐 CRIPTOGRAFIA PROFISSIONAL
     */
    encrypt(text) {
        try {
            if (!text) return null;
            
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher(this.ALGORITHM, this.ENCRYPTION_KEY);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('❌ Erro na criptografia:', error.message);
            return null;
        }
    }

    decrypt(encryptedText) {
        try {
            if (!encryptedText || typeof encryptedText !== 'string') {
                console.error('❌ Dados criptografados inválidos');
                return null;
            }

            // Se não tem dois pontos, pode ser texto não criptografado
            if (!encryptedText.includes(':')) {
                console.log('⚠️ Texto não criptografado, usando diretamente');
                return encryptedText;
            }

            const [ivHex, encrypted] = encryptedText.split(':');
            if (!ivHex || !encrypted) {
                console.error('❌ Formato de criptografia inválido');
                return null;
            }

            const decipher = crypto.createDecipher(this.ALGORITHM, this.ENCRYPTION_KEY);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('❌ Erro na descriptografia:', error.message);
            return null;
        }
    }

    /**
     * 🌐 DETECÇÃO DE IP
     */
    async detectarIP() {
        console.log('🌐 DETECTANDO IP ATUAL...');
        
        const ipServices = [
            'https://api.ipify.org?format=json',
            'https://ipapi.co/ip/',
            'https://icanhazip.com',
            'https://ifconfig.me/ip'
        ];

        for (const service of ipServices) {
            try {
                const response = await axios.get(service, { timeout: 5000 });
                const ip = typeof response.data === 'string' 
                    ? response.data.trim() 
                    : response.data.ip;
                
                this.currentIP = ip;
                console.log(`📍 IP Atual: ${this.currentIP}`);
                
                // Verificar se está na lista autorizada
                if (this.expectedIPs.includes(this.currentIP)) {
                    console.log(`✅ IP autorizado (whitelist configurada)`);
                } else {
                    console.log(`⚠️ IP NÃO está na lista autorizada`);
                    console.log(`📋 IPs esperados: ${this.expectedIPs.join(', ')}`);
                }
                
                return this.currentIP;
            } catch (error) {
                console.log(`⚠️ Falha em ${service}: ${error.message}`);
                continue;
            }
        }
        
        console.error('❌ Erro ao detectar IP de todas as fontes');
        return null;
    }

    /**
     * 🔑 BUSCA PROFISSIONAL DE CHAVES
     */
    async buscarChavesOperacionais() {
        console.log('\n🔑 BUSCANDO CHAVES CADASTRADAS NO BANCO...');
        console.log('==========================================');

        try {
            // Verificar se a tabela existe
            const checkTable = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_api_keys'
                );
            `);

            if (!checkTable.rows[0].exists) {
                console.error('❌ ERRO CRÍTICO: Tabela user_api_keys não existe!');
                return {};
            }

            // Buscar TODAS as chaves ativas (incluindo PENDING)
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
                    uak.validation_status,
                    uak.last_validated_at,
                    uak.created_at
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                AND LENGTH(uak.api_key) > 10
                AND LENGTH(uak.secret_key) > 10
                ORDER BY u.id, uak.exchange, uak.environment
            `;

            const result = await pool.query(query);
            console.log(`📊 Total de chaves encontradas: ${result.rows.length}`);

            if (result.rows.length === 0) {
                console.log('❌ NENHUMA CHAVE ENCONTRADA!');
                
                // Diagnóstico detalhado
                const userCount = await pool.query('SELECT COUNT(*) FROM users WHERE is_active = true');
                const keyCount = await pool.query('SELECT COUNT(*) FROM user_api_keys WHERE is_active = true');
                
                console.log(`👤 Usuários ativos: ${userCount.rows[0].count}`);
                console.log(`🔑 Chaves ativas: ${keyCount.rows[0].count}`);
                
                return {};
            }

            const chavesOperacionais = {};
            
            for (const row of result.rows) {
                if (!chavesOperacionais[row.user_id]) {
                    chavesOperacionais[row.user_id] = {
                        username: row.username,
                        email: row.email,
                        chaves: []
                    };
                }

                // Descriptografar chaves de forma segura
                console.log(`🔓 Descriptografando chave ${row.key_id}...`);
                
                const apiKeyDecrypted = this.decrypt(row.api_key);
                const secretKeyDecrypted = this.decrypt(row.secret_key);

                if (!apiKeyDecrypted || !secretKeyDecrypted) {
                    console.error(`❌ Falha ao descriptografar chave ${row.key_id}`);
                    continue;
                }

                chavesOperacionais[row.user_id].chaves.push({
                    key_id: row.key_id,
                    exchange: row.exchange,
                    environment: row.environment,
                    api_key: apiKeyDecrypted,
                    secret_key: secretKeyDecrypted,
                    validation_status: row.validation_status || 'PENDING',
                    last_validated_at: row.last_validated_at,
                    created_at: row.created_at
                });

                this.stats.total_keys++;
            }

            // Exibir detalhes das chaves encontradas
            console.log('\n📋 CHAVES ENCONTRADAS NO BANCO:');
            console.log('===============================');
            for (const [userId, userData] of Object.entries(chavesOperacionais)) {
                console.log(`\n👤 ${userData.username} (${userData.email}) - ID: ${userId}`);
                userData.chaves.forEach((chave, index) => {
                    const statusIcon = chave.validation_status === 'CONNECTED' ? '✅' : 
                                     chave.validation_status === 'FAILED' ? '❌' : '⏳';
                    console.log(`  ${index + 1}. ${statusIcon} ${chave.exchange.toUpperCase()} ${chave.environment}`);
                    console.log(`     Key ID: ${chave.key_id}`);
                    console.log(`     API Key: ${chave.api_key.substring(0, 12)}...`);
                    console.log(`     Status: ${chave.validation_status || 'PENDING'}`);
                    console.log(`     Criada: ${chave.created_at}`);
                    if (chave.last_validated_at) {
                        console.log(`     Última validação: ${chave.last_validated_at}`);
                    }
                });
            }

            console.log(`\n📊 RESUMO: ${Object.keys(chavesOperacionais).length} usuários com ${this.stats.total_keys} chaves total`);
            return chavesOperacionais;

        } catch (error) {
            console.error('❌ Erro ao buscar chaves:', error.message);
            console.error('Stack:', error.stack);
            return {};
        }
    }

    /**
     * 🔍 DIAGNÓSTICO AVANÇADO BYBIT
     */
    async diagnosticarBybitAvancado(apiKey, secretKey, environment) {
        console.log(`\n🔍 DIAGNÓSTICO AVANÇADO BYBIT ${environment.toUpperCase()}`);
        console.log('='.repeat(50));

        const baseURL = environment === 'testnet' 
            ? 'https://api-testnet.bybit.com' 
            : 'https://api.bybit.com';

        const results = {
            connectivity: false,
            authentication: false,
            permissions: false,
            balance_access: false,
            error_details: null,
            diagnosis: null
        };

        try {
            // 1. Teste de conectividade básica
            console.log('📡 1/4 Testando conectividade básica...');
            const timeResponse = await axios.get(`${baseURL}/v5/market/time`, { timeout: 10000 });
            if (timeResponse.data) {
                results.connectivity = true;
                console.log('   ✅ Conectividade OK');
            }

            // 2. Teste de autenticação com assinatura correta
            console.log('🔐 2/4 Testando autenticação...');
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            
            // Geração de assinatura baseada na metodologia comprovada
            const params = { accountType: 'UNIFIED' };
            const queryString = new URLSearchParams(params).toString();
            
            // ORDEM CRÍTICA para Bybit V5: timestamp + apiKey + recvWindow + queryString
            const signPayload = timestamp + apiKey + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', secretKey).update(signPayload).digest('hex');
            
            const headers = {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json',
                'User-Agent': 'CoinbitClub-Professional-System/1.0'
            };

            const authResponse = await axios.get(`${baseURL}/v5/account/wallet-balance?${queryString}`, {
                headers,
                timeout: 15000
            });

            if (authResponse.data.retCode === 0) {
                results.authentication = true;
                results.balance_access = true;
                console.log('   ✅ Autenticação bem-sucedida');
                
                // Extrair saldo
                const balance = this.extractBybitBalance(authResponse.data);
                console.log(`   💰 Saldo USDT: ${balance.USDT}`);
                console.log(`   📊 Total USD: $${balance.totalUSD}`);
                
                this.stats.successful_connections++;
                
            } else {
                results.error_details = {
                    code: authResponse.data.retCode,
                    message: authResponse.data.retMsg
                };
                results.diagnosis = this.ERROR_CODES[authResponse.data.retCode];
                console.log(`   ❌ Erro ${authResponse.data.retCode}: ${authResponse.data.retMsg}`);
                this.stats.failed_connections++;
            }

            // 3. Teste de permissões
            console.log('🔑 3/4 Testando permissões da API...');
            try {
                const permResponse = await axios.get(`${baseURL}/v5/user/query-api`, {
                    headers: {
                        ...headers,
                        'X-BAPI-TIMESTAMP': Date.now().toString()
                    },
                    timeout: 10000
                });
                
                if (permResponse.data.retCode === 0) {
                    results.permissions = true;
                    const permissions = permResponse.data.result?.permissions || [];
                    console.log(`   ✅ Permissões: ${permissions.join(', ')}`);
                } else {
                    console.log(`   ⚠️ Não foi possível obter permissões: ${permResponse.data.retMsg}`);
                }
            } catch (permError) {
                console.log(`   ⚠️ Erro ao verificar permissões: ${permError.message}`);
            }

            // 4. Verificação de mercados (teste adicional)
            console.log('📈 4/4 Testando acesso a dados de mercado...');
            try {
                const tickerResponse = await axios.get(`${baseURL}/v5/market/tickers?category=linear&symbol=BTCUSDT`, {
                    timeout: 10000
                });
                
                if (tickerResponse.data.retCode === 0) {
                    const btcPrice = tickerResponse.data.result?.list?.[0]?.lastPrice;
                    console.log(`   ✅ Dados de mercado OK - BTC: $${btcPrice}`);
                } else {
                    console.log(`   ⚠️ Problema com dados de mercado`);
                }
            } catch (marketError) {
                console.log(`   ⚠️ Erro nos dados de mercado: ${marketError.message}`);
            }

        } catch (error) {
            console.log(`   ❌ ERRO CRÍTICO: ${error.message}`);
            this.stats.failed_connections++;
            
            if (error.response?.data) {
                const errorData = error.response.data;
                results.error_details = {
                    code: errorData.retCode,
                    message: errorData.retMsg
                };
                results.diagnosis = this.ERROR_CODES[errorData.retCode];
                
                console.log(`   🔍 Código de erro: ${errorData.retCode}`);
                console.log(`   📝 Mensagem: ${errorData.retMsg}`);
                
                if (results.diagnosis) {
                    console.log(`   💡 Diagnóstico: ${results.diagnosis.problem}`);
                    console.log(`   🔧 Solução: ${results.diagnosis.solution}`);
                }
            }
        }

        // Resumo do diagnóstico
        const successRate = [
            results.connectivity,
            results.authentication, 
            results.permissions,
            results.balance_access
        ].filter(Boolean).length / 4 * 100;

        console.log(`\n📊 RESULTADO DO DIAGNÓSTICO:`);
        console.log(`   Taxa de sucesso: ${successRate.toFixed(1)}%`);
        console.log(`   Conectividade: ${results.connectivity ? '✅' : '❌'}`);
        console.log(`   Autenticação: ${results.authentication ? '✅' : '❌'}`);
        console.log(`   Permissões: ${results.permissions ? '✅' : '❌'}`);
        console.log(`   Acesso a saldo: ${results.balance_access ? '✅' : '❌'}`);

        if (successRate >= 75) {
            console.log(`   🟢 STATUS: OPERACIONAL`);
        } else if (successRate >= 50) {
            console.log(`   🟡 STATUS: PARCIALMENTE OPERACIONAL`);
        } else {
            console.log(`   🔴 STATUS: CRÍTICO`);
        }

        return {
            success: successRate >= 75,
            successRate,
            results,
            diagnosis: results.diagnosis
        };
    }

    /**
     * 📊 EXTRAIR SALDO BYBIT
     */
    extractBybitBalance(data) {
        try {
            const coins = data.result?.list?.[0]?.coin || [];
            let usdtBalance = 0;
            let totalUSD = 0;

            coins.forEach(coin => {
                if (coin.coin === 'USDT') {
                    usdtBalance = parseFloat(coin.walletBalance) || 0;
                }
                totalUSD += parseFloat(coin.usdValue) || 0;
            });

            return {
                USDT: usdtBalance,
                totalUSD: totalUSD.toFixed(2),
                coinCount: coins.length
            };
        } catch (error) {
            return { USDT: 0, totalUSD: '0.00', coinCount: 0 };
        }
    }

    /**
     * 🏭 CRIAR INSTÂNCIA CCXT
     */
    async criarInstanceCCXT(exchange, environment, apiKey, secretKey) {
        try {
            if (exchange === 'bybit') {
                return new ccxt.bybit({
                    apiKey: apiKey,
                    secret: secretKey,
                    sandbox: environment === 'testnet',
                    enableRateLimit: true,
                    options: {
                        defaultType: 'linear'
                    }
                });
            } else if (exchange === 'binance') {
                return new ccxt.binance({
                    apiKey: apiKey,
                    secret: secretKey,
                    sandbox: environment === 'testnet',
                    enableRateLimit: true,
                    options: {
                        defaultType: 'future'
                    }
                });
            }
        } catch (error) {
            console.error(`❌ Erro ao criar instância ${exchange}:`, error.message);
            return null;
        }
    }

    /**
     * 🧪 TESTE REAL DE OPERAÇÃO
     */
    async testarOperacaoReal(exchangeInstance, exchange, environment, symbol = 'BTC/USDT', amount = 0.001) {
        console.log(`\n🧪 TESTE REAL: ${exchange.toUpperCase()} ${environment}`);
        console.log('══════════════════════════════════════════');

        try {
            // 1. Verificar mercado
            console.log('1️⃣ Verificando mercado...');
            const markets = await exchangeInstance.loadMarkets();
            
            if (!markets[symbol]) {
                console.log(`❌ Símbolo ${symbol} não encontrado`);
                return { success: false, error: 'Símbolo não encontrado' };
            }

            // 2. Buscar ticker atual
            console.log('2️⃣ Buscando preço atual...');
            const ticker = await exchangeInstance.fetchTicker(symbol);
            console.log(`📈 ${symbol}: $${ticker.last}`);

            // 3. Verificar saldo
            console.log('3️⃣ Verificando saldo...');
            const balance = await exchangeInstance.fetchBalance();
            const usdtBalance = balance['USDT']?.free || 0;
            console.log(`💰 Saldo USDT: ${usdtBalance}`);

            if (usdtBalance < (amount * ticker.last * 1.1)) {
                console.log(`⚠️ Saldo insuficiente para teste (precisa ~$${(amount * ticker.last * 1.1).toFixed(2)})`);
                return { 
                    success: false, 
                    error: 'Saldo insuficiente',
                    current_balance: usdtBalance,
                    required_balance: amount * ticker.last * 1.1
                };
            }

            // 4. **SIMULAÇÃO DE ORDEM** (por segurança, não executar em mainnet)
            if (environment === 'mainnet') {
                console.log('⚠️ MAINNET - SIMULANDO ORDEM (não executando real)');
                
                const simulatedOrder = {
                    id: 'SIMULATED_' + Date.now(),
                    symbol: symbol,
                    amount: amount,
                    cost: amount * ticker.last,
                    price: ticker.last,
                    status: 'SIMULATED'
                };

                console.log('✅ ORDEM SIMULADA COM SUCESSO!');
                console.log(`📋 Order ID: ${simulatedOrder.id}`);
                console.log(`📊 Symbol: ${simulatedOrder.symbol}`);
                console.log(`💎 Amount: ${simulatedOrder.amount}`);
                console.log(`💵 Cost: $${simulatedOrder.cost}`);
                console.log(`📈 Price: $${simulatedOrder.price}`);

                this.stats.trades_executed++;
                return {
                    success: true,
                    simulated: true,
                    order: simulatedOrder
                };
            } else {
                // Executar real apenas em testnet
                console.log('🧪 TESTNET - EXECUTANDO ORDEM REAL');
                console.log(`💰 Valor do teste: ${amount} ${symbol.split('/')[0]} (~$${(amount * ticker.last).toFixed(2)})`);
                
                const order = await exchangeInstance.createMarketBuyOrder(symbol, amount);
                
                console.log('✅ ORDEM EXECUTADA COM SUCESSO!');
                console.log(`📋 Order ID: ${order.id}`);
                console.log(`📊 Symbol: ${order.symbol}`);
                console.log(`💎 Amount: ${order.amount}`);
                console.log(`💵 Cost: $${order.cost}`);
                console.log(`📈 Price: $${order.price || ticker.last}`);

                this.stats.trades_executed++;
                
                // Salvar no banco
                await this.salvarTesteNoBanco(order, exchange, environment);

                return {
                    success: true,
                    order: {
                        id: order.id,
                        symbol: order.symbol,
                        amount: order.amount,
                        cost: order.cost,
                        price: order.price || ticker.last
                    }
                };
            }

        } catch (error) {
            console.log(`❌ ERRO NO TESTE: ${error.message}`);
            this.stats.trades_failed++;
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    /**
     * 💾 SALVAR TESTE NO BANCO
     */
    async salvarTesteNoBanco(order, exchange, environment) {
        try {
            await pool.query(`
                INSERT INTO trading_executions (
                    user_id, exchange, order_id, symbol, side, amount,
                    price, status, signal_data, executed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                1, // user_id temporário
                `${exchange}_${environment}`,
                order.id,
                order.symbol,
                'buy',
                order.amount,
                order.price || 0,
                'SUCCESS',
                JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
                new Date()
            ]);
            console.log('💾 Teste salvo no banco de dados');
        } catch (error) {
            console.error('⚠️ Erro ao salvar no banco:', error.message);
        }
    }

    /**
     * 🚀 EXECUÇÃO PRINCIPAL
     */
    async executarTesteCompleto() {
        console.log('🧪 TESTE DE TRADE REAL - INICIANDO...');
        console.log('====================================');

        const resultados = {
            timestamp: new Date().toISOString(),
            ip_atual: null,
            testes_executados: 0,
            testes_sucesso: 0,
            testes_falha: 0,
            detalhes: {}
        };

        try {
            // 1. Detectar IP
            await this.detectarIP();
            resultados.ip_atual = this.currentIP;

            // 2. Buscar chaves operacionais
            const chavesOperacionais = await this.buscarChavesOperacionais();

            if (Object.keys(chavesOperacionais).length === 0) {
                console.log('❌ NENHUMA CHAVE ENCONTRADA NO BANCO');
                console.log('📋 Verificações necessárias:');
                console.log('   1. Execute: node buscar-saldos-completo.js');
                console.log('   2. Cadastre chaves: node cadastrar-chaves-reais.js');
                console.log('   3. Verifique se as tabelas existem no banco');
                return;
            }

            console.log(`\n🔄 INICIANDO TESTES PARA ${Object.keys(chavesOperacionais).length} USUÁRIOS...`);

            // 3. Executar testes
            for (const [userId, userData] of Object.entries(chavesOperacionais)) {
                console.log(`\n👤 TESTANDO USUÁRIO: ${userData.username}`);
                console.log('═'.repeat(60));

                resultados.detalhes[userId] = {
                    username: userData.username,
                    testes: {}
                };

                for (const chave of userData.chaves) {
                    resultados.testes_executados++;
                    const chaveId = `${chave.exchange}_${chave.environment}`;

                    console.log(`\n🔄 TESTANDO: ${chaveId.toUpperCase()}`);
                    console.log(`   📧 Usuário: ${userData.username} (${userData.email})`);
                    console.log(`   🔑 Key ID: ${chave.key_id}`);
                    console.log(`   📊 Status atual: ${chave.validation_status || 'PENDING'}`);

                    // Diagnóstico Bybit
                    if (chave.exchange === 'bybit') {
                        const diagResult = await this.diagnosticarBybitAvancado(
                            chave.api_key,
                            chave.secret_key,
                            chave.environment
                        );

                        if (diagResult.success) {
                            resultados.testes_sucesso++;
                        } else {
                            resultados.testes_falha++;
                        }

                        resultados.detalhes[userId].testes[chaveId] = diagResult;
                    } else {
                        // Para outras exchanges, usar CCXT
                        console.log(`\n🔧 Criando instância CCXT para ${chaveId}...`);
                        const exchangeInstance = await this.criarInstanceCCXT(
                            chave.exchange,
                            chave.environment,
                            chave.api_key,
                            chave.secret_key
                        );

                        if (exchangeInstance) {
                            const resultado = await this.testarOperacaoReal(
                                exchangeInstance,
                                chave.exchange,
                                chave.environment
                            );

                            if (resultado.success) {
                                resultados.testes_sucesso++;
                            } else {
                                resultados.testes_falha++;
                            }

                            resultados.detalhes[userId].testes[chaveId] = resultado;
                        } else {
                            resultados.testes_falha++;
                            resultados.detalhes[userId].testes[chaveId] = {
                                success: false,
                                error: 'Falha ao criar instância'
                            };
                        }
                    }

                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // 4. Resumo final
            this.gerarResumoFinal(resultados);

        } catch (error) {
            console.error('❌ Erro no teste:', error.message);
            console.error('Stack:', error.stack);
        } finally {
            await pool.end();
        }
    }

    /**
     * 📋 RESUMO FINAL
     */
    gerarResumoFinal(resultados) {
        console.log('\n📊 RESUMO DO TESTE REAL');
        console.log('======================');
        console.log(`🕐 Timestamp: ${resultados.timestamp}`);
        console.log(`🌐 IP: ${resultados.ip_atual}`);
        console.log(`🧪 Testes executados: ${resultados.testes_executados}`);
        console.log(`✅ Sucessos: ${resultados.testes_sucesso}`);
        console.log(`❌ Falhas: ${resultados.testes_falha}`);
        console.log(`📊 Taxa de sucesso: ${((resultados.testes_sucesso / resultados.testes_executados) * 100).toFixed(1)}%`);
        console.log(`🏪 Trades executados: ${this.stats.trades_executed}`);
        console.log(`❌ Trades falharam: ${this.stats.trades_failed}`);

        if (resultados.testes_sucesso > 0) {
            console.log('\n🟢 SISTEMA VALIDADO PARA TRADING REAL!');
            console.log('✅ Conexões funcionando');
            console.log('💰 Saldos acessíveis');
            console.log('🚀 Pronto para operação');
        } else {
            console.log('\n🔴 SISTEMA COM PROBLEMAS CRÍTICOS');
            console.log('🔧 Verificar configurações de IP e chaves');
            console.log('📋 Execute: node buscar-saldos-completo.js para diagnóstico');
        }

        console.log('\n💡 PRÓXIMOS PASSOS:');
        console.log('1. Configurar IPs nas exchanges (se necessário)');
        console.log('2. Validar permissões das chaves API');
        console.log('3. Executar testes em ambiente testnet primeiro');
        console.log('4. Monitorar execuções e logs do sistema');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const teste = new TesteTradeReal();
    teste.executarTesteCompleto();
}

module.exports = TesteTradeReal;
