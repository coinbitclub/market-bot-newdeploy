#!/usr/bin/env node

console.log('🔄 COLETOR AUTOMÁTICO DE SALDOS - EXECUÇÃO A CADA 2 MINUTOS');
console.log('==========================================================');

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

class AutomaticBalanceCollector {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.collectCount = 0;
        
        // URLs das exchanges baseadas no ambiente das chaves
        this.exchangeUrls = {
            binance: {
                testnet: 'https://testnet.binance.vision/api/v3',
                mainnet: 'https://api.binance.com/api/v3'
            },
            bybit: {
                testnet: 'https://api-testnet.bybit.com',
                mainnet: 'https://api.bybit.com'
            }
        };
    }

    // Criar assinatura para Binance
    createBinanceSignature(queryString, secret) {
        return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
    }

    // Criar assinatura para Bybit
    createBybitSignature(params, secret) {
        const timestamp = Date.now().toString();
        params.timestamp = timestamp;
        params.recv_window = '5000';
        
        const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
        const signature = crypto.createHmac('sha256', secret).update(sortedParams).digest('hex');
        
        return { ...params, sign: signature };
    }

    // Coletar saldo da Binance
    async getBinanceBalance(apiKey, apiSecret, environment = 'testnet') {
        try {
            const baseUrl = this.exchangeUrls.binance[environment];
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}`;
            const signature = this.createBinanceSignature(queryString, apiSecret);
            
            console.log(`      🌐 Conectando: ${baseUrl}`);
            
            const response = await axios.get(`${baseUrl}/account`, {
                headers: {
                    'X-MBX-APIKEY': apiKey
                },
                params: {
                    timestamp,
                    signature
                },
                timeout: 10000
            });

            // Calcular saldo total em USDT
            let totalUSDT = 0;
            let assetsCount = 0;
            
            for (const balance of response.data.balances) {
                const free = parseFloat(balance.free);
                const locked = parseFloat(balance.locked);
                const total = free + locked;
                
                if (total > 0) {
                    assetsCount++;
                    if (balance.asset === 'USDT') {
                        totalUSDT += total;
                        console.log(`         💰 ${balance.asset}: ${total.toFixed(4)}`);
                    } else if (balance.asset === 'BUSD') {
                        totalUSDT += total; // Assumindo paridade 1:1
                        console.log(`         💰 ${balance.asset}: ${total.toFixed(4)} (≈USDT)`);
                    } else {
                        console.log(`         🪙 ${balance.asset}: ${total.toFixed(4)} (não convertido)`);
                    }
                }
            }

            console.log(`      ✅ Binance (${environment}): $${totalUSDT.toFixed(2)} USDT (${assetsCount} assets)`);
            return totalUSDT;

        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.message;
            console.log(`      ❌ Binance (${environment}): ${errorMsg}`);
            return 0;
        }
    }

    // Coletar saldo do Bybit  
    async getBybitBalance(apiKey, apiSecret, environment = 'testnet') {
        try {
            const baseUrl = this.exchangeUrls.bybit[environment];
            console.log(`      🌐 Conectando: ${baseUrl}`);
            
            const params = {
                api_key: apiKey,
                timestamp: Date.now().toString(),
                recv_window: '5000'
            };

            const signedParams = this.createBybitSignature(params, apiSecret);
            
            // Tentar diferentes endpoints da API Bybit
            const endpoints = [
                '/v2/private/wallet/balance',
                '/v5/account/wallet-balance',
                '/contract/v3/private/account/wallet/balance'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await axios.get(`${baseUrl}${endpoint}`, {
                        params: signedParams,
                        timeout: 10000
                    });

                    if (response.data.retCode === 0 || response.data.ret_code === 0) {
                        const result = response.data.result;
                        let totalUSDT = 0;
                        
                        // Diferentes formatos de resposta Bybit
                        if (result.USDT) {
                            totalUSDT = parseFloat(result.USDT.wallet_balance || result.USDT.walletBalance || 0);
                            console.log(`         💰 USDT: ${totalUSDT.toFixed(4)}`);
                        } else if (Array.isArray(result)) {
                            const usdtBalance = result.find(b => b.coin === 'USDT');
                            if (usdtBalance) {
                                totalUSDT = parseFloat(usdtBalance.wallet_balance || usdtBalance.walletBalance || 0);
                                console.log(`         💰 USDT: ${totalUSDT.toFixed(4)}`);
                            }
                        } else if (result.list && Array.isArray(result.list)) {
                            for (const account of result.list) {
                                if (account.coin && Array.isArray(account.coin)) {
                                    const usdtCoin = account.coin.find(c => c.coin === 'USDT');
                                    if (usdtCoin) {
                                        totalUSDT += parseFloat(usdtCoin.walletBalance || 0);
                                        console.log(`         💰 USDT: ${totalUSDT.toFixed(4)}`);
                                    }
                                }
                            }
                        }

                        console.log(`      ✅ Bybit (${environment}): $${totalUSDT.toFixed(2)} USDT`);
                        return totalUSDT;
                    }
                } catch (endpointError) {
                    // Continuar para próximo endpoint
                    continue;
                }
            }
            
            console.log(`      ❌ Bybit (${environment}): Nenhum endpoint funcionou`);
            return 0;

        } catch (error) {
            const errorMsg = error.response?.data?.ret_msg || error.response?.data?.retMsg || error.message;
            console.log(`      ❌ Bybit (${environment}): ${errorMsg}`);
            return 0;
        }
    }

    // Atualizar saldos no banco de dados
    async updateUserBalance(userId, exchange, balanceUSD, environment) {
        try {
            await pool.query(`
                INSERT INTO user_balances (user_id, exchange, balance_usd, environment, last_update)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (user_id, exchange) 
                DO UPDATE SET 
                    balance_usd = EXCLUDED.balance_usd,
                    environment = EXCLUDED.environment,
                    last_update = EXCLUDED.last_update
            `, [userId, exchange, balanceUSD, environment]);
            
            console.log(`      💾 Salvo no banco: $${balanceUSD.toFixed(2)} (${environment})`);
            
        } catch (error) {
            // Se a coluna environment não existir, tentar sem ela
            try {
                await pool.query(`
                    INSERT INTO user_balances (user_id, exchange, balance_usd, last_update)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (user_id, exchange) 
                    DO UPDATE SET 
                        balance_usd = EXCLUDED.balance_usd,
                        last_update = EXCLUDED.last_update
                `, [userId, exchange, balanceUSD]);
                
                console.log(`      💾 Salvo no banco: $${balanceUSD.toFixed(2)}`);
            } catch (simpleError) {
                console.log(`      ❌ Erro ao salvar: ${simpleError.message}`);
            }
        }
    }

    // Executar coleta de saldos
    async executeCollection() {
        try {
            this.collectCount++;
            const timestamp = new Date().toLocaleString('pt-BR');
            
            console.log(`\n🔄 COLETA #${this.collectCount} - ${timestamp}`);
            console.log('='.repeat(50));
            
            // Buscar usuários com chaves API válidas (usando colunas corretas)
            const users = await pool.query(`
                SELECT 
                    id, 
                    username,
                    account_type,
                    testnet_mode,
                    CASE 
                        WHEN bybit_api_key IS NOT NULL THEN 'bybit'
                        WHEN binance_api_key IS NOT NULL THEN 'binance'
                    END as exchange,
                    CASE 
                        WHEN bybit_api_key IS NOT NULL THEN bybit_api_key
                        WHEN binance_api_key IS NOT NULL THEN binance_api_key
                    END as api_key,
                    CASE 
                        WHEN bybit_api_secret IS NOT NULL THEN bybit_api_secret
                        WHEN binance_api_secret IS NOT NULL THEN binance_api_secret
                    END as api_secret
                FROM users 
                WHERE (bybit_api_key IS NOT NULL OR binance_api_key IS NOT NULL)
                AND (ativo = true OR is_active = true)
                AND (
                    (bybit_api_key IS NOT NULL AND bybit_api_secret IS NOT NULL) OR
                    (binance_api_key IS NOT NULL AND binance_api_secret IS NOT NULL)
                )
                ORDER BY id
            `);

            if (users.rows.length === 0) {
                console.log('❌ Nenhum usuário com chaves API válidas encontrado');
                return;
            }

            console.log(`💰 Coletando saldos de ${users.rows.length} configurações...\n`);

            const results = [];

            for (const user of users.rows) {
                console.log(`👤 USUÁRIO ${user.id} (${user.username}) - ${user.exchange.toUpperCase()}:`);
                
                // Verificar se tem chave e secret
                if (!user.api_key || !user.api_secret) {
                    console.log(`      ❌ Chaves incompletas (key: ${!!user.api_key}, secret: ${!!user.api_secret})`);
                    continue;
                }
                
                let balance = 0;
                
                // Determinar ambiente baseado no account_type
                const environment = user.account_type === 'testnet' || user.testnet_mode ? 'testnet' : 'mainnet';
                console.log(`      🏷️ Ambiente: ${environment} (tipo: ${user.account_type}, testnet: ${user.testnet_mode})`);
                
                if (user.exchange.toLowerCase() === 'binance') {
                    balance = await this.getBinanceBalance(user.api_key, user.api_secret, environment);
                } else if (user.exchange.toLowerCase() === 'bybit') {
                    balance = await this.getBybitBalance(user.api_key, user.api_secret, environment);
                }
                
                // Atualizar no banco
                await this.updateUserBalance(user.id, user.exchange, balance, environment);
                
                results.push({
                    userId: user.id,
                    username: user.username,
                    exchange: user.exchange,
                    balance: balance,
                    environment: environment
                });
                
                console.log('');
            }

            // Mostrar resumo
            console.log('📊 RESUMO DA COLETA:');
            console.log('===================');
            
            let totalGeral = 0;
            results.forEach(result => {
                console.log(`ID ${result.userId} (${result.username}) - ${result.exchange}: $${result.balance.toFixed(2)} (${result.environment})`);
                totalGeral += result.balance;
            });
            
            console.log(`\n💎 TOTAL GERAL: $${totalGeral.toFixed(2)}`);
            
            // Log da próxima execução
            const nextRun = new Date(Date.now() + 2 * 60 * 1000).toLocaleTimeString('pt-BR');
            console.log(`⏰ Próxima coleta em 2 minutos (${nextRun})`);

        } catch (error) {
            console.error(`❌ Erro na coleta #${this.collectCount}:`, error.message);
        }
    }

    // Iniciar coleta automática
    start() {
        if (this.isRunning) {
            console.log('⚠️ Coletor já está rodando!');
            return;
        }

        console.log('🚀 Iniciando coletor automático de saldos...');
        console.log('⏰ Intervalo: 2 minutos');
        console.log('👥 Usuários: 14, 15, 16');
        console.log('🔑 Fonte: Banco de dados (user_api_keys)');
        
        this.isRunning = true;
        
        // Executar primeira coleta imediatamente
        this.executeCollection();
        
        // Programar execuções a cada 2 minutos
        this.intervalId = setInterval(() => {
            this.executeCollection();
        }, 2 * 60 * 1000); // 2 minutos
        
        console.log('✅ Coletor automático iniciado!');
    }

    // Parar coleta automática
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Coletor não está rodando!');
            return;
        }

        clearInterval(this.intervalId);
        this.isRunning = false;
        console.log('🛑 Coletor automático parado!');
    }

    // Verificar status
    getStatus() {
        return {
            isRunning: this.isRunning,
            collectCount: this.collectCount,
            nextCollection: this.isRunning ? new Date(Date.now() + 2 * 60 * 1000) : null
        };
    }
}

// Função principal
async function main() {
    const collector = new AutomaticBalanceCollector();
    
    // Configurar handlers para parar graciosamente
    process.on('SIGINT', async () => {
        console.log('\n🛑 Recebido sinal de parada...');
        collector.stop();
        await pool.end();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n🛑 Recebido sinal de término...');
        collector.stop();
        await pool.end();
        process.exit(0);
    });

    // Iniciar coletor
    collector.start();
    
    // Manter processo vivo
    console.log('\n💡 Pressione Ctrl+C para parar o coletor\n');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AutomaticBalanceCollector;
