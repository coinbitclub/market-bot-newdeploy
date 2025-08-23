const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

class RealBalanceCollector {
    
    // Bybit V5 - Método corrigido para obter saldo real
    async getBybitBalanceV5(apiKey, apiSecret, isTestnet = false) {
        const baseUrl = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
        const timestamp = Date.now().toString();
        const recvWindow = '20000';
        
        // Parâmetros para Unified Account (spot + futures)
        const params = {
            accountType: 'UNIFIED',
            coin: ''  // Vazio para obter todas as moedas
        };
        
        const queryString = new URLSearchParams(params).toString();
        const signaturePayload = timestamp + apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', apiSecret).update(signaturePayload).digest('hex');
        
        try {
            console.log(`      🔍 Bybit V5 - Testando endpoint: ${baseUrl}/v5/account/wallet-balance`);
            console.log(`      📝 Parâmetros: accountType=UNIFIED`);
            
            const response = await axios.get(`${baseUrl}/v5/account/wallet-balance`, {
                params,
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-SIGN-TYPE': '2',
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            console.log(`      📊 Response status: ${response.status}`);
            console.log(`      📋 Response data:`, JSON.stringify(response.data, null, 2));
            
            if (response.data.retCode === 0 && response.data.result) {
                const accounts = response.data.result.list || [];
                console.log(`      💰 Contas encontradas: ${accounts.length}`);
                
                let totalBalance = 0;
                for (const account of accounts) {
                    const coins = account.coin || [];
                    console.log(`      🏦 Account Type: ${account.accountType}, Coins: ${coins.length}`);
                    
                    for (const coin of coins) {
                        if (coin.coin === 'USDT' || coin.coin === 'USD') {
                            const balance = parseFloat(coin.walletBalance || coin.equity || 0);
                            console.log(`      💵 ${coin.coin}: ${balance} (wallet: ${coin.walletBalance}, equity: ${coin.equity})`);
                            totalBalance += balance;
                        }
                    }
                }
                
                console.log(`      💰 Total Balance: ${totalBalance}`);
                return totalBalance;
            } else {
                console.log(`      ❌ Bybit error: ${response.data.retMsg || 'Unknown error'}`);
                return 0;
            }
            
        } catch (error) {
            console.log(`      ❌ Bybit V5 Error: ${error.response?.data?.retMsg || error.message}`);
            
            // Tentar com accountType SPOT
            console.log(`      🔄 Tentando com accountType=SPOT...`);
            return await this.getBybitSpotBalance(apiKey, apiSecret, isTestnet);
        }
    }
    
    // Método alternativo para Spot Balance
    async getBybitSpotBalance(apiKey, apiSecret, isTestnet = false) {
        const baseUrl = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
        const timestamp = Date.now().toString();
        const recvWindow = '20000';
        
        const params = {
            accountType: 'SPOT'
        };
        
        const queryString = new URLSearchParams(params).toString();
        const signaturePayload = timestamp + apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', apiSecret).update(signaturePayload).digest('hex');
        
        try {
            const response = await axios.get(`${baseUrl}/v5/account/wallet-balance`, {
                params,
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-SIGN-TYPE': '2',
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            console.log(`      📊 SPOT Response:`, JSON.stringify(response.data, null, 2));
            
            if (response.data.retCode === 0 && response.data.result) {
                const accounts = response.data.result.list || [];
                let totalBalance = 0;
                
                for (const account of accounts) {
                    const coins = account.coin || [];
                    for (const coin of coins) {
                        if (coin.coin === 'USDT') {
                            const balance = parseFloat(coin.walletBalance || 0);
                            console.log(`      💵 SPOT ${coin.coin}: ${balance}`);
                            totalBalance += balance;
                        }
                    }
                }
                
                return totalBalance;
            }
            
            return 0;
            
        } catch (error) {
            console.log(`      ❌ Bybit SPOT Error: ${error.response?.data?.retMsg || error.message}`);
            return 0;
        }
    }
    
    // Binance - Método melhorado
    async getBinanceBalance(apiKey, apiSecret, isTestnet = false) {
        const baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
        const timestamp = Date.now();
        
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
        
        try {
            console.log(`      🔍 Binance - Testando endpoint: ${baseUrl}/api/v3/account`);
            
            const response = await axios.get(`${baseUrl}/api/v3/account`, {
                params: {
                    timestamp,
                    signature
                },
                headers: {
                    'X-MBX-APIKEY': apiKey
                },
                timeout: 10000
            });
            
            console.log(`      📊 Binance Response status: ${response.status}`);
            
            if (response.data && response.data.balances) {
                console.log(`      💰 Balances encontrados: ${response.data.balances.length}`);
                
                const usdtBalance = response.data.balances.find(b => b.asset === 'USDT');
                if (usdtBalance) {
                    const balance = parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked);
                    console.log(`      💵 USDT Balance: ${balance} (free: ${usdtBalance.free}, locked: ${usdtBalance.locked})`);
                    return balance;
                } else {
                    console.log(`      ⚠️ USDT não encontrado nos balances`);
                    // Mostrar algumas moedas disponíveis
                    const nonZeroBalances = response.data.balances.filter(b => parseFloat(b.free) > 0);
                    console.log(`      📋 Moedas com saldo: ${nonZeroBalances.map(b => `${b.asset}:${b.free}`).join(', ')}`);
                    return 0;
                }
            }
            
            return 0;
            
        } catch (error) {
            console.log(`      ❌ Binance Error: ${error.response?.data?.msg || error.message}`);
            return 0;
        }
    }
    
    async testRealConnections() {
        try {
            console.log('🔍 TESTANDO CONEXÕES REAIS COM DETALHES...\n');
            
            // Buscar usuários válidos
            const apiConfigs = await pool.query(`
                SELECT u.id, u.username, u.email,
                       uak.api_key, uak.api_secret, uak.exchange, uak.environment
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE uak.api_key IS NOT NULL 
                AND uak.api_secret IS NOT NULL
                ORDER BY u.id
            `);
            
            console.log(`📋 Encontrados ${apiConfigs.rows.length} usuários para teste\n`);
            
            for (const config of apiConfigs.rows) {
                console.log(`👤 USUÁRIO ${config.id} (${config.username}) - ${config.exchange.toUpperCase()}:`);
                
                let balance = 0;
                const isTestnet = config.environment === 'testnet';
                
                if (config.exchange === 'bybit') {
                    balance = await this.getBybitBalanceV5(config.api_key, config.api_secret, isTestnet);
                } else if (config.exchange === 'binance') {
                    balance = await this.getBinanceBalance(config.api_key, config.api_secret, isTestnet);
                }
                
                console.log(`      ✅ SALDO FINAL: $${balance} USDT\n`);
            }
            
            await pool.end();
            
        } catch (error) {
            console.error('❌ Erro geral:', error.message);
            await pool.end();
        }
    }
}

const collector = new RealBalanceCollector();
collector.testRealConnections();
