#!/usr/bin/env node

console.log('💰 COLETOR DE SALDOS REAIS DAS EXCHANGES');
console.log('=======================================');

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

class ExchangeBalanceCollector {
    constructor() {
        this.exchanges = {
            binance: 'https://testnet.binance.vision/api/v3',
            bybit: process.env.BYBIT_BASE_URL || 'https://api-testnet.bybit.com'
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
    async getBinanceBalance(apiKey, apiSecret) {
        try {
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}`;
            const signature = this.createBinanceSignature(queryString, apiSecret);
            
            const response = await axios.get(`${this.exchanges.binance}/account`, {
                headers: {
                    'X-MBX-APIKEY': apiKey
                },
                params: {
                    timestamp,
                    signature
                }
            });

            // Calcular saldo total em USDT
            let totalUSDT = 0;
            for (const balance of response.data.balances) {
                const free = parseFloat(balance.free);
                const locked = parseFloat(balance.locked);
                const total = free + locked;
                
                if (total > 0) {
                    if (balance.asset === 'USDT') {
                        totalUSDT += total;
                    } else if (balance.asset === 'BUSD') {
                        totalUSDT += total; // Assumindo paridade 1:1
                    }
                    // Para outros ativos, seria necessário converter usando preços atuais
                }
            }

            console.log(`   ✅ Binance: $${totalUSDT.toFixed(2)} USDT`);
            return totalUSDT;

        } catch (error) {
            console.log(`   ❌ Binance: Erro - ${error.response?.data?.msg || error.message}`);
            return 0;
        }
    }

    // Coletar saldo do Bybit
    async getBybitBalance(apiKey, apiSecret) {
        try {
            const params = {
                api_key: apiKey,
                timestamp: Date.now().toString(),
                recv_window: '5000'
            };

            const signedParams = this.createBybitSignature(params, apiSecret);
            
            const response = await axios.get(`${this.exchanges.bybit}/v2/private/wallet/balance`, {
                params: signedParams
            });

            if (response.data.ret_code === 0) {
                const balances = response.data.result;
                let totalUSDT = 0;
                
                // Bybit retorna diferentes formatos dependendo da versão da API
                if (balances.USDT) {
                    totalUSDT = parseFloat(balances.USDT.wallet_balance || 0);
                } else if (Array.isArray(balances)) {
                    const usdtBalance = balances.find(b => b.coin === 'USDT');
                    if (usdtBalance) {
                        totalUSDT = parseFloat(usdtBalance.wallet_balance || 0);
                    }
                }

                console.log(`   ✅ Bybit: $${totalUSDT.toFixed(2)} USDT`);
                return totalUSDT;
            } else {
                console.log(`   ❌ Bybit: ${response.data.ret_msg}`);
                return 0;
            }

        } catch (error) {
            console.log(`   ❌ Bybit: Erro - ${error.response?.data?.ret_msg || error.message}`);
            return 0;
        }
    }

    // Atualizar saldos no banco de dados
    async updateUserBalance(userId, exchange, balanceUSD) {
        try {
            await pool.query(`
                INSERT INTO user_balances (user_id, exchange, balance_usd, last_update)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (user_id, exchange) 
                DO UPDATE SET 
                    balance_usd = EXCLUDED.balance_usd,
                    last_update = EXCLUDED.last_update
            `, [userId, exchange, balanceUSD]);
            
            console.log(`   💾 Saldo atualizado no banco: $${balanceUSD.toFixed(2)}`);
        } catch (error) {
            console.log(`   ❌ Erro ao atualizar banco: ${error.message}`);
        }
    }

    // Coletar todos os saldos
    async collectAllBalances() {
        try {
            console.log('\n🔍 Buscando usuários com chaves API válidas...');
            
            const users = await pool.query(`
                SELECT DISTINCT u.id, u.username, u.email, uak.exchange, uak.api_key, uak.api_secret, uak.environment
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.id IN (14, 15, 16) 
                AND u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL 
                AND uak.api_secret IS NOT NULL
                AND uak.validation_status = 'valid'
                ORDER BY u.id, uak.exchange
            `);

            if (users.rows.length === 0) {
                console.log('❌ Nenhum usuário com chaves API válidas encontrado');
                return;
            }

            console.log(`\n💰 Coletando saldos de ${users.rows.length} configurações de API...\n`);

            const resultsByUser = {};

            for (const user of users.rows) {
                if (!resultsByUser[user.id]) {
                    resultsByUser[user.id] = {
                        username: user.username,
                        email: user.email,
                        exchanges: {},
                        total: 0
                    };
                }

                console.log(`👤 USUÁRIO ${user.id} (${user.username}) - ${user.exchange.toUpperCase()}:`);
                console.log(`   📧 Email: ${user.email || 'N/A'}`);
                console.log(`   🌐 Ambiente: ${user.environment || 'testnet'}`);
                
                let balance = 0;
                
                if (user.exchange.toLowerCase() === 'binance') {
                    balance = await this.getBinanceBalance(user.api_key, user.api_secret);
                } else if (user.exchange.toLowerCase() === 'bybit') {
                    balance = await this.getBybitBalance(user.api_key, user.api_secret);
                }
                
                // Atualizar no banco
                await this.updateUserBalance(user.id, user.exchange, balance);
                
                // Armazenar resultado
                resultsByUser[user.id].exchanges[user.exchange] = balance;
                resultsByUser[user.id].total += balance;
                
                console.log('');
            }

            // Mostrar resumo final organizado por usuário
            console.log('\n📊 RESUMO DOS SALDOS POR USUÁRIO:');
            console.log('=================================');
            
            let totalGeralSistema = 0;
            
            for (const [userId, userData] of Object.entries(resultsByUser)) {
                console.log(`\n👤 USUÁRIO ${userId} - ${userData.username}`);
                console.log('   📧 Email:', userData.email || 'N/A');
                
                for (const [exchange, balance] of Object.entries(userData.exchanges)) {
                    console.log(`   💰 ${exchange.toUpperCase()}: $${balance.toFixed(2)} USDT`);
                }
                
                console.log(`   💎 TOTAL DO USUÁRIO: $${userData.total.toFixed(2)} USDT`);
                totalGeralSistema += userData.total;
            }

            console.log(`\n🏆 TOTAL GERAL DO SISTEMA: $${totalGeralSistema.toFixed(2)} USDT`);
            
            // Salvar estatísticas na tabela
            try {
                await pool.query(`
                    INSERT INTO balance_statistics (total_users, total_balance_usd, collected_at)
                    VALUES ($1, $2, NOW())
                `, [Object.keys(resultsByUser).length, totalGeralSistema]);
                
                console.log('📈 Estatísticas salvas na tabela balance_statistics');
            } catch (error) {
                // Se a tabela não existir, criar
                if (error.message.includes('does not exist')) {
                    await pool.query(`
                        CREATE TABLE IF NOT EXISTS balance_statistics (
                            id SERIAL PRIMARY KEY,
                            total_users INTEGER,
                            total_balance_usd DECIMAL(20,2),
                            collected_at TIMESTAMP DEFAULT NOW()
                        )
                    `);
                    console.log('� Tabela balance_statistics criada');
                }
            }

        } catch (error) {
            console.error('❌ Erro na coleta de saldos:', error.message);
        }
    }
}

async function main() {
    const collector = new ExchangeBalanceCollector();
    await collector.collectAllBalances();
    await pool.end();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ExchangeBalanceCollector;
