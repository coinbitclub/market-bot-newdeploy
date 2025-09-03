const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class RealConnectionTester {
    constructor() {
        this.results = [];
    }

    // Binance API Connection
    async testBinanceConnection(apiKey, apiSecret, isTestnet = false) {
        try {
            const baseURL = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
            const timestamp = Date.now();
            const recvWindow = 10000;
            
            // Criar query string
            const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
            
            // Criar signature
            const signature = crypto
                .createHmac('sha256', apiSecret)
                .update(queryString)
                .digest('hex');
            
            // Headers
            const headers = {
                'X-MBX-APIKEY': apiKey,
                'Content-Type': 'application/json'
            };
            
            console.log(`🔗 Testando Binance ${isTestnet ? 'Testnet' : 'Mainnet'}...`);
            
            // Test endpoint - Account Information
            const response = await axios.get(
                `${baseURL}/api/v3/account?${queryString}&signature=${signature}`,
                { headers, timeout: 10000 }
            );
            
            if (response.data && response.data.balances) {
                const usdtBalance = response.data.balances.find(b => b.asset === 'USDT');
                const btcBalance = response.data.balances.find(b => b.asset === 'BTC');
                
                return {
                    success: true,
                    exchange: 'binance',
                    environment: isTestnet ? 'testnet' : 'mainnet',
                    accountType: response.data.accountType,
                    canTrade: response.data.canTrade,
                    canWithdraw: response.data.canWithdraw,
                    balances: {
                        USDT: usdtBalance ? parseFloat(usdtBalance.free) : 0,
                        BTC: btcBalance ? parseFloat(btcBalance.free) : 0
                    },
                    totalBalances: response.data.balances.length
                };
            }
            
        } catch (error) {
            return {
                success: false,
                exchange: 'binance',
                environment: isTestnet ? 'testnet' : 'mainnet',
                error: error.response?.data?.msg || error.message,
                code: error.response?.data?.code || error.code
            };
        }
    }

    // Bybit API Connection
    async testBybitConnection(apiKey, apiSecret, isTestnet = false) {
        try {
            const baseURL = isTestnet ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';
            const timestamp = Date.now();
            const recvWindow = 10000;
            
            console.log(`🔗 Testando Bybit ${isTestnet ? 'Testnet' : 'Mainnet'}...`);
            
            // Test endpoint - Account Information (V5)
            const queryString = `api_key=${apiKey}&timestamp=${timestamp}&recv_window=${recvWindow}`;
            
            const signature = crypto
                .createHmac('sha256', apiSecret)
                .update(queryString)
                .digest('hex');
            
            const headers = {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            };
            
            // Try wallet balance endpoint
            const response = await axios.get(
                `${baseURL}/v5/account/wallet-balance?accountType=UNIFIED`,
                { headers, timeout: 10000 }
            );
            
            if (response.data && response.data.result) {
                const result = response.data.result;
                const accounts = result.list || [];
                
                let totalUSDT = 0;
                let totalBTC = 0;
                
                accounts.forEach(account => {
                    if (account.coin) {
                        account.coin.forEach(coin => {
                            if (coin.coin === 'USDT') {
                                totalUSDT += parseFloat(coin.walletBalance || 0);
                            }
                            if (coin.coin === 'BTC') {
                                totalBTC += parseFloat(coin.walletBalance || 0);
                            }
                        });
                    }
                });
                
                return {
                    success: true,
                    exchange: 'bybit',
                    environment: isTestnet ? 'testnet' : 'mainnet',
                    accountType: 'UNIFIED',
                    balances: {
                        USDT: totalUSDT,
                        BTC: totalBTC
                    },
                    totalAccounts: accounts.length
                };
            }
            
        } catch (error) {
            return {
                success: false,
                exchange: 'bybit',
                environment: isTestnet ? 'testnet' : 'mainnet',
                error: error.response?.data?.retMsg || error.message,
                code: error.response?.data?.retCode || error.code
            };
        }
    }

    async testAllConnections() {
        console.log('🌐 TESTANDO CONEXÕES REAIS COM AS EXCHANGES...\n');
        
        try {
            // Buscar usuários com chaves API
            const apiConfigs = await pool.query(`
                SELECT u.id, u.username, u.email,
                       uak.api_key, uak.api_secret, uak.exchange, uak.environment,
                       uak.is_testnet
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE uak.api_key IS NOT NULL 
                AND uak.api_secret IS NOT NULL
                ORDER BY u.id, uak.exchange
            `);
            
            console.log(`🔑 Encontradas ${apiConfigs.rows.length} configurações de API\n`);
            
            for (const config of apiConfigs.rows) {
                console.log(`👤 USUÁRIO: ${config.username} (ID: ${config.id})`);
                console.log(`🏢 EXCHANGE: ${config.exchange.toUpperCase()}`);
                console.log(`🌍 ENVIRONMENT: ${config.environment || 'mainnet'}`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                let result;
                
                if (config.exchange.toLowerCase() === 'binance') {
                    result = await this.testBinanceConnection(
                        config.api_key,
                        config.api_secret,
                        config.is_testnet || config.environment === 'testnet'
                    );
                } else if (config.exchange.toLowerCase() === 'bybit') {
                    result = await this.testBybitConnection(
                        config.api_key,
                        config.api_secret,
                        config.is_testnet || config.environment === 'testnet'
                    );
                }
                
                if (result) {
                    if (result.success) {
                        console.log('✅ CONEXÃO BEM-SUCEDIDA!');
                        console.log(`   Tipo de Conta: ${result.accountType || 'N/A'}`);
                        console.log(`   Saldo USDT: $${result.balances.USDT.toFixed(4)}`);
                        console.log(`   Saldo BTC: ₿${result.balances.BTC.toFixed(8)}`);
                        if (result.canTrade !== undefined) {
                            console.log(`   Pode Negociar: ${result.canTrade ? 'Sim' : 'Não'}`);
                        }
                        
                        // Salvar resultado real no banco
                        await this.saveRealBalance(config.id, config.exchange, result);
                        
                    } else {
                        console.log('❌ FALHA NA CONEXÃO');
                        console.log(`   Erro: ${result.error}`);
                        if (result.code) {
                            console.log(`   Código: ${result.code}`);
                        }
                    }
                    
                    this.results.push({
                        user_id: config.id,
                        username: config.username,
                        exchange: config.exchange,
                        ...result
                    });
                }
                
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
            
            // Resumo final
            this.showSummary();
            
        } catch (error) {
            console.error('❌ Erro geral:', error.message);
        } finally {
            await pool.end();
        }
    }

    async saveRealBalance(userId, exchange, result) {
        try {
            await pool.query(`
                INSERT INTO balances (
                    user_id, exchange, wallet_balance, asset, 
                    environment, api_status, created_at, last_updated
                ) VALUES ($1, $2, $3, 'USDT', $4, 'success', NOW(), NOW())
            `, [
                userId,
                exchange,
                result.balances.USDT,
                result.environment
            ]);
            
            console.log('   💾 Saldo salvo no banco de dados');
            
        } catch (error) {
            console.log(`   ⚠️ Erro ao salvar no banco: ${error.message}`);
        }
    }

    showSummary() {
        console.log('📊 RESUMO DOS TESTES DE CONEXÃO:');
        console.log('═══════════════════════════════════');
        
        const successful = this.results.filter(r => r.success);
        const failed = this.results.filter(r => !r.success);
        
        console.log(`✅ Conexões bem-sucedidas: ${successful.length}`);
        console.log(`❌ Conexões falharam: ${failed.length}`);
        console.log(`📊 Total testado: ${this.results.length}`);
        
        if (successful.length > 0) {
            console.log('\n🏆 CONEXÕES FUNCIONAIS:');
            successful.forEach(result => {
                console.log(`   ${result.username} - ${result.exchange.toUpperCase()}: $${result.balances.USDT.toFixed(2)} USDT`);
            });
        }
        
        if (failed.length > 0) {
            console.log('\n⚠️ CONEXÕES COM PROBLEMAS:');
            failed.forEach(result => {
                console.log(`   ${result.username} - ${result.exchange.toUpperCase()}: ${result.error}`);
            });
        }
    }
}

// Executar teste
const tester = new RealConnectionTester();
tester.testAllConnections();
