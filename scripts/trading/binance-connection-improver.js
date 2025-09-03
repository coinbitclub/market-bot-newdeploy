const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class BinanceConnectionImprover {
    
    constructor() {
        this.binanceUrls = {
            mainnet: [
                'https://api.binance.com',
                'https://api1.binance.com',
                'https://api2.binance.com',
                'https://api3.binance.com'
            ],
            testnet: [
                'https://testnet.binance.vision',
                'https://testnet.binancefuture.com'
            ]
        };
    }
    
    // Método melhorado para Binance com múltiplas tentativas
    async getBinanceBalanceImproved(apiKey, apiSecret, environment = 'mainnet') {
        const urls = this.binanceUrls[environment];
        
        console.log(`      🔍 Binance - Testando ${urls.length} endpoints...`);
        
        for (let i = 0; i < urls.length; i++) {
            const baseUrl = urls[i];
            console.log(`      🌐 Tentativa ${i + 1}/${urls.length}: ${baseUrl}`);
            
            try {
                // Método 1: Account Info (mais restritivo)
                const balance1 = await this.tryBinanceAccount(apiKey, apiSecret, baseUrl);
                if (balance1 > 0) {
                    console.log(`      ✅ Sucesso com Account Info: $${balance1}`);
                    return balance1;
                }
                
                // Método 2: Wallet Info (menos restritivo)
                const balance2 = await this.tryBinanceWallet(apiKey, apiSecret, baseUrl);
                if (balance2 > 0) {
                    console.log(`      ✅ Sucesso com Wallet Info: $${balance2}`);
                    return balance2;
                }
                
                // Método 3: Spot Account (alternativo)
                const balance3 = await this.tryBinanceSpotAccount(apiKey, apiSecret, baseUrl);
                if (balance3 > 0) {
                    console.log(`      ✅ Sucesso com Spot Account: $${balance3}`);
                    return balance3;
                }
                
            } catch (error) {
                console.log(`      ❌ Erro no endpoint ${baseUrl}: ${error.message}`);
                continue;
            }
        }
        
        console.log(`      ⚠️ Todos os endpoints falharam`);
        return 0;
    }
    
    // Método 1: Account Info padrão
    async tryBinanceAccount(apiKey, apiSecret, baseUrl) {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
        
        try {
            const response = await axios.get(`${baseUrl}/api/v3/account`, {
                params: {
                    timestamp,
                    signature
                },
                headers: {
                    'X-MBX-APIKEY': apiKey
                },
                timeout: 8000
            });
            
            if (response.data && response.data.balances) {
                const usdtBalance = response.data.balances.find(b => b.asset === 'USDT');
                if (usdtBalance) {
                    const balance = parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked);
                    console.log(`        💵 Account USDT: ${balance}`);
                    return balance;
                }
            }
            
            return 0;
            
        } catch (error) {
            throw new Error(`Account: ${error.response?.data?.msg || error.message}`);
        }
    }
    
    // Método 2: Capital Config (wallet info)
    async tryBinanceWallet(apiKey, apiSecret, baseUrl) {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
        
        try {
            const response = await axios.get(`${baseUrl}/sapi/v1/capital/config/getall`, {
                params: {
                    timestamp,
                    signature
                },
                headers: {
                    'X-MBX-APIKEY': apiKey
                },
                timeout: 8000
            });
            
            if (response.data && Array.isArray(response.data)) {
                const usdtConfig = response.data.find(coin => coin.coin === 'USDT');
                if (usdtConfig) {
                    const balance = parseFloat(usdtConfig.free || 0) + parseFloat(usdtConfig.locked || 0);
                    console.log(`        💵 Wallet USDT: ${balance}`);
                    return balance;
                }
            }
            
            return 0;
            
        } catch (error) {
            throw new Error(`Wallet: ${error.response?.data?.msg || error.message}`);
        }
    }
    
    // Método 3: Spot Account (alternativo)
    async tryBinanceSpotAccount(apiKey, apiSecret, baseUrl) {
        const timestamp = Date.now();
        const queryString = `type=SPOT&timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
        
        try {
            const response = await axios.get(`${baseUrl}/sapi/v1/account/status`, {
                params: {
                    type: 'SPOT',
                    timestamp,
                    signature
                },
                headers: {
                    'X-MBX-APIKEY': apiKey
                },
                timeout: 8000
            });
            
            console.log(`        📊 Spot Status: ${JSON.stringify(response.data)}`);
            
            // Se o status endpoint funcionar, tentar balance
            return await this.tryBinanceSpotBalance(apiKey, apiSecret, baseUrl);
            
        } catch (error) {
            throw new Error(`Spot: ${error.response?.data?.msg || error.message}`);
        }
    }
    
    // Balance específico para Spot
    async tryBinanceSpotBalance(apiKey, apiSecret, baseUrl) {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
        
        try {
            const response = await axios.get(`${baseUrl}/api/v3/account`, {
                params: {
                    timestamp,
                    signature
                },
                headers: {
                    'X-MBX-APIKEY': apiKey,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 8000
            });
            
            if (response.data && response.data.balances) {
                const nonZeroBalances = response.data.balances.filter(b => parseFloat(b.free) > 0);
                console.log(`        💰 Total assets with balance: ${nonZeroBalances.length}`);
                
                const usdtBalance = response.data.balances.find(b => b.asset === 'USDT');
                if (usdtBalance) {
                    const balance = parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked);
                    console.log(`        💵 Spot USDT: ${balance}`);
                    return balance;
                } else {
                    // Mostrar outras moedas disponíveis
                    console.log(`        📋 Outras moedas: ${nonZeroBalances.slice(0, 3).map(b => `${b.asset}:${b.free}`).join(', ')}`);
                }
            }
            
            return 0;
            
        } catch (error) {
            throw new Error(`SpotBalance: ${error.response?.data?.msg || error.message}`);
        }
    }
    
    async testBinanceConnections() {
        try {
            console.log('🔧 MELHORANDO CONEXÕES BINANCE...\n');
            
            // Buscar usuários com Binance
            const binanceUsers = await pool.query(`
                SELECT u.id, u.username, u.email,
                       uak.api_key, uak.api_secret, uak.exchange, uak.environment
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE uak.api_key IS NOT NULL 
                AND uak.api_secret IS NOT NULL
                AND uak.exchange = 'binance'
                ORDER BY u.id
            `);
            
            console.log(`📋 Encontrados ${binanceUsers.rows.length} usuários Binance\n`);
            
            for (const user of binanceUsers.rows) {
                console.log(`👤 USUÁRIO ${user.id} (${user.username}) - BINANCE:`);
                
                const environment = user.environment || 'mainnet';
                const balance = await this.getBinanceBalanceImproved(user.api_key, user.api_secret, environment);
                
                console.log(`      ✅ SALDO FINAL: $${balance} USDT\n`);
                
                // Tentar salvar no banco
                try {
                    await pool.query(`
                        DELETE FROM balances 
                        WHERE user_id = $1 AND exchange = 'binance' AND asset = 'USDT'
                    `, [user.id]);
                    
                    await pool.query(`
                        INSERT INTO balances (user_id, exchange, wallet_balance, asset, account_type, created_at, last_updated)
                        VALUES ($1, 'binance', $2, 'USDT', 'SPOT', NOW(), NOW())
                    `, [user.id, balance]);
                    
                    console.log(`      ✅ Salvo no banco: $${balance} USDT\n`);
                    
                } catch (error) {
                    console.log(`      ❌ Erro ao salvar: ${error.message}\n`);
                }
            }
            
            await pool.end();
            
        } catch (error) {
            console.error('❌ Erro geral:', error.message);
            await pool.end();
        }
    }
}

const improver = new BinanceConnectionImprover();
improver.testBinanceConnections();
