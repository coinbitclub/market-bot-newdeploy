const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

class FixedRealBalanceCollector {
    
    // Bybit V5 - Corrigido sem parâmetro coin inválido
    async getBybitBalanceV5(apiKey, apiSecret, isTestnet = false) {
        const baseUrl = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
        const timestamp = Date.now().toString();
        const recvWindow = '20000';
        
        // Apenas accountType, sem coin
        const params = {
            accountType: 'UNIFIED'
        };
        
        const queryString = new URLSearchParams(params).toString();
        const signaturePayload = timestamp + apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', apiSecret).update(signaturePayload).digest('hex');
        
        try {
            console.log(`      🔍 Bybit V5 UNIFIED - Corrigido`);
            
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
            
            console.log(`      📊 Response:`, JSON.stringify(response.data, null, 2));
            
            if (response.data.retCode === 0 && response.data.result) {
                const accounts = response.data.result.list || [];
                console.log(`      💰 Contas encontradas: ${accounts.length}`);
                
                let totalBalance = 0;
                for (const account of accounts) {
                    const coins = account.coin || [];
                    console.log(`      🏦 Account: ${account.accountType}, Coins: ${coins.length}`);
                    
                    for (const coin of coins) {
                        if (coin.coin === 'USDT') {
                            const balance = parseFloat(coin.walletBalance || 0);
                            console.log(`      💵 ${coin.coin}: ${balance}`);
                            totalBalance += balance;
                        }
                    }
                }
                
                return totalBalance;
            } else {
                console.log(`      ❌ Erro: ${response.data.retMsg}`);
                // Tentar SPOT
                return await this.getBybitSpotBalance(apiKey, apiSecret, isTestnet);
            }
            
        } catch (error) {
            console.log(`      ❌ Erro V5: ${error.response?.data?.retMsg || error.message}`);
            return await this.getBybitSpotBalance(apiKey, apiSecret, isTestnet);
        }
    }
    
    // Bybit SPOT
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
            console.log(`      🔄 Tentando SPOT...`);
            
            const response = await axios.get(`${baseUrl}/v5/account/wallet-balance`, {
                params,
                headers: {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-SIGN-TYPE': '2',
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
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
            } else {
                console.log(`      ❌ SPOT Erro: ${response.data.retMsg}`);
                // Tentar método V3 legado
                return await this.getBybitV3Balance(apiKey, apiSecret, isTestnet);
            }
            
        } catch (error) {
            console.log(`      ❌ SPOT Error: ${error.response?.data?.retMsg || error.message}`);
            return await this.getBybitV3Balance(apiKey, apiSecret, isTestnet);
        }
    }
    
    // Bybit V3 (método legado)
    async getBybitV3Balance(apiKey, apiSecret, isTestnet = false) {
        const baseUrl = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
        const timestamp = Date.now();
        
        try {
            console.log(`      🔄 Tentando V3 legado...`);
            
            // Sem parâmetros, apenas headers
            const queryString = `api_key=${apiKey}&timestamp=${timestamp}`;
            const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
            
            const response = await axios.get(`${baseUrl}/spot/v3/private/account`, {
                params: {
                    api_key: apiKey,
                    timestamp,
                    sign: signature
                },
                timeout: 10000
            });
            
            console.log(`      📊 V3 Response:`, JSON.stringify(response.data, null, 2));
            
            if (response.data.result && response.data.result.balances) {
                const usdtBalance = response.data.result.balances.find(b => b.coin === 'USDT');
                if (usdtBalance) {
                    const balance = parseFloat(usdtBalance.free || 0);
                    console.log(`      💵 V3 USDT: ${balance}`);
                    return balance;
                }
            }
            
            return 0;
            
        } catch (error) {
            console.log(`      ❌ V3 Error: ${error.response?.data?.ret_msg || error.message}`);
            return 0;
        }
    }
    
    async testRealConnectionsFixed() {
        try {
            console.log('🔧 TESTANDO CONEXÕES REAIS - VERSÃO CORRIGIDA...\n');
            
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
                    console.log(`      ⚠️ Binance tem restrição de IP - pulando por enquanto`);
                    balance = 0;
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

const collector = new FixedRealBalanceCollector();
collector.testRealConnectionsFixed();
