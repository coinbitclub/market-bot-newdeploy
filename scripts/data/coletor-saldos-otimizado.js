const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class SaldosCollectorOptimized {
    constructor() {
        this.exchangeUrls = {
            binance: {
                mainnet: 'https://api.binance.com',
                testnet: 'https://testnet.binance.vision'
            },
            bybit: {
                mainnet: 'https://api.bybit.com',
                testnet: 'https://api-testnet.bybit.com'
            }
        };
    }

    // Bybit V5 - Método otimizado
    async getBybitBalance(apiKey, apiSecret, environment = 'mainnet') {
        const baseUrl = this.exchangeUrls.bybit[environment];
        const timestamp = Date.now().toString();
        const recvWindow = '20000';
        
        try {
            console.log(`      📡 Bybit V5 (${environment})`);
            
            const params = { accountType: 'UNIFIED' };
            const queryString = new URLSearchParams(params).toString();
            const signaturePayload = timestamp + apiKey + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', apiSecret).update(signaturePayload).digest('hex');
            
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
                timeout: 15000
            });

            if (response.data.retCode === 0 && response.data.result) {
                const accounts = response.data.result.list || [];
                let totalBalance = 0;
                
                for (const account of accounts) {
                    const coins = account.coin || [];
                    for (const coin of coins) {
                        if (coin.coin === 'USDT') {
                            const balance = parseFloat(coin.walletBalance || 0);
                            totalBalance += balance;
                        }
                    }
                }
                
                console.log(`      ✅ USDT: $${totalBalance}`);
                return totalBalance;
            } else {
                console.log(`      ❌ ${response.data.retMsg || 'Unknown error'}`);
                return 0;
            }
            
        } catch (error) {
            console.log(`      ❌ ${error.response?.data?.retMsg || error.message}`);
            return 0;
        }
    }

    // Binance - Método otimizado com fallbacks
    async getBinanceBalance(apiKey, apiSecret, environment = 'mainnet') {
        const baseUrl = this.exchangeUrls.binance[environment];
        
        try {
            console.log(`      📡 Binance (${environment})`);
            
            // Tentar primeiro com timestamp do servidor
            const serverTimeResponse = await axios.get(`${baseUrl}/api/v3/time`, { timeout: 5000 });
            const timestamp = serverTimeResponse.data.serverTime;
            
            const queryString = `timestamp=${timestamp}`;
            const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
            
            const response = await axios.get(`${baseUrl}/api/v3/account`, {
                params: { timestamp, signature },
                headers: { 'X-MBX-APIKEY': apiKey },
                timeout: 10000
            });
            
            if (response.data && response.data.balances) {
                const usdtBalance = response.data.balances.find(b => b.asset === 'USDT');
                if (usdtBalance) {
                    const balance = parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked);
                    console.log(`      ✅ USDT: $${balance}`);
                    return balance;
                } else {
                    const nonZeroBalances = response.data.balances.filter(b => parseFloat(b.free) > 0);
                    console.log(`      ℹ️ Sem USDT, ${nonZeroBalances.length} outras moedas`);
                    return 0;
                }
            }
            
            return 0;
            
        } catch (error) {
            console.log(`      ❌ ${error.response?.data?.msg || error.message}`);
            return 0;
        }
    }

    async collectBalances() {
        try {
            console.log('💰 COLETOR DE SALDOS OTIMIZADO');
            console.log('==============================');
            console.log(`🔄 COLETA - ${new Date().toLocaleString('pt-BR')}`);
            console.log('==================================================');
            
            // Buscar apenas chaves válidas
            const validKeys = await pool.query(`
                SELECT u.id, u.username, u.email,
                       uak.api_key, uak.api_secret, uak.exchange, uak.environment,
                       uak.validation_status
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE uak.api_key IS NOT NULL 
                AND uak.api_secret IS NOT NULL
                AND uak.is_valid = true
                ORDER BY u.id
            `);

            console.log(`💰 Processando ${validKeys.rows.length} chaves válidas...`);

            let successCount = 0;
            let totalCollected = 0;

            for (const config of validKeys.rows) {
                console.log(`\n👤 ${config.username} - ${config.exchange.toUpperCase()}:`);
                
                let balance = 0;
                const environment = config.environment || 'mainnet';

                if (config.exchange === 'binance') {
                    balance = await this.getBinanceBalance(config.api_key, config.api_secret, environment);
                } else if (config.exchange === 'bybit') {
                    balance = await this.getBybitBalance(config.api_key, config.api_secret, environment);
                }

                // Salvar no banco
                try {
                    const accountType = config.exchange === 'bybit' ? 'UNIFIED' : 'SPOT';
                    
                    await pool.query(`
                        DELETE FROM balances 
                        WHERE user_id = $1 AND exchange = $2 AND asset = 'USDT'
                    `, [config.id, config.exchange]);
                    
                    await pool.query(`
                        INSERT INTO balances (user_id, exchange, wallet_balance, asset, account_type, created_at, last_updated)
                        VALUES ($1, $2, $3, 'USDT', $4, NOW(), NOW())
                    `, [config.id, config.exchange, balance, accountType]);
                    
                    console.log(`      💾 Salvo: $${balance} USDT`);
                    successCount++;
                    totalCollected += balance;
                    
                } catch (error) {
                    console.log(`      ❌ Erro DB: ${error.message}`);
                }
            }

            // Verificar chaves com problemas
            const problemKeys = await pool.query(`
                SELECT u.username, uak.exchange, uak.validation_status, uak.validation_error
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE uak.is_valid = false
            `);

            console.log('\n📊 RESUMO DA COLETA:');
            console.log('===================');
            console.log(`✅ Sucessos: ${successCount}/${validKeys.rows.length}`);
            console.log(`💰 Total coletado: $${totalCollected.toFixed(2)} USDT`);
            
            if (problemKeys.rows.length > 0) {
                console.log(`\n⚠️ Chaves com problemas (${problemKeys.rows.length}):`);
                problemKeys.rows.forEach(key => {
                    console.log(`   ${key.username} (${key.exchange}): ${key.validation_status}`);
                });
            }
            
            console.log(`⏰ Finalizado: ${new Date().toLocaleString('pt-BR')}`);

        } catch (error) {
            console.error('❌ ERRO na coleta:', error.message);
        }
    }

    async startAutoCollection() {
        console.log('💰 COLETOR DE SALDOS OTIMIZADO - APENAS CHAVES VÁLIDAS');
        console.log('=====================================================');
        console.log('🚀 Iniciando coletor automático...');
        console.log('⏰ Intervalo: 3 minutos');
        console.log('🔑 Foco: Apenas chaves funcionais');
        console.log('💡 Chaves com problemas são ignoradas\n');
        
        // Primeira coleta
        await this.collectBalances();
        
        // Agendar próximas coletas
        const intervalId = setInterval(async () => {
            await this.collectBalances();
        }, 3 * 60 * 1000); // 3 minutos

        console.log('\n✅ Coletor automático iniciado!');
        
        // Tratar parada graceful
        process.on('SIGINT', () => {
            console.log('\n🛑 Recebido sinal de parada...');
            clearInterval(intervalId);
            console.log('🛑 Parando coletor automático...');
            pool.end();
            console.log('✅ Coletor automático parado');
            process.exit(0);
        });
    }
}

// Iniciar coletor otimizado
const collector = new SaldosCollectorOptimized();
collector.startAutoCollection();
