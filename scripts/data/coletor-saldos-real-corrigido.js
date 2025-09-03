const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class SaldosCollectorReal {
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

    // Bybit V5 - Método correto que funciona
    async getBybitBalance(apiKey, apiSecret, environment = 'mainnet') {
        const isTestnet = environment === 'testnet';
        const baseUrl = this.exchangeUrls.bybit[environment];
        const timestamp = Date.now().toString();
        const recvWindow = '20000';
        
        try {
            console.log(`      📡 Testando Bybit V5...`);
            console.log(`      🌐 Conectando: ${baseUrl}`);
            
            // Parâmetros corretos - apenas accountType
            const params = {
                accountType: 'UNIFIED'
            };
            
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
                console.log(`      💰 Contas encontradas: ${accounts.length}`);
                
                let totalBalance = 0;
                for (const account of accounts) {
                    const coins = account.coin || [];
                    
                    for (const coin of coins) {
                        if (coin.coin === 'USDT') {
                            const balance = parseFloat(coin.walletBalance || 0);
                            console.log(`      💵 USDT Balance: ${balance}`);
                            totalBalance += balance;
                        }
                    }
                }
                
                console.log(`      ✅ Total USDT: ${totalBalance}`);
                return totalBalance;
            } else {
                console.log(`      ❌ Bybit Error: ${response.data.retMsg || 'Unknown error'}`);
                return 0;
            }
            
        } catch (error) {
            console.log(`      ❌ Bybit Error: ${error.response?.data?.retMsg || error.message}`);
            return 0;
        }
    }

    // Binance - Suporte para mainnet e testnet
    async getBinanceBalance(apiKey, apiSecret, environment = 'mainnet') {
        // Usar testnet se especificado
        const baseUrl = environment === 'testnet' 
            ? 'https://testnet.binance.vision' 
            : 'https://api.binance.com';
        
        const timestamp = Date.now();
        
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
        
        try {
            console.log(`      🌐 Conectando: ${baseUrl}/api/v3 (${environment})`);
            
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
            
            if (response.data && response.data.balances) {
                console.log(`      💰 Balances encontrados: ${response.data.balances.length}`);
                
                const usdtBalance = response.data.balances.find(b => b.asset === 'USDT');
                if (usdtBalance) {
                    const balance = parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked);
                    console.log(`      💵 USDT Balance: ${balance} (free: ${usdtBalance.free}, locked: ${usdtBalance.locked})`);
                    return balance;
                } else {
                    // Se não tem USDT, mostrar outras moedas
                    const nonZeroBalances = response.data.balances.filter(b => parseFloat(b.free) > 0);
                    console.log(`      📋 Moedas disponíveis: ${nonZeroBalances.map(b => `${b.asset}:${b.free}`).slice(0, 5).join(', ')}`);
                    
                    // Usar BNB como fallback
                    const bnbBalance = response.data.balances.find(b => b.asset === 'BNB');
                    if (bnbBalance && parseFloat(bnbBalance.free) > 0) {
                        const balance = parseFloat(bnbBalance.free);
                        console.log(`      💵 BNB Balance (convertido): ${balance}`);
                        return balance * 600; // Conversão aproximada BNB->USDT
                    }
                    
                    return 0;
                }
            }
            
            return 0;
            
        } catch (error) {
            console.log(`      ❌ Binance (${environment}): ${error.response?.data?.msg || error.message}`);
            return 0;
        }
    }

    async collectBalances() {
        try {
            console.log('💰 COLETOR DE SALDOS REAL - VERSÃO CORRIGIDA');
            console.log('===========================================');
            console.log(`🔄 COLETA REAL - ${new Date().toLocaleString('pt-BR')}`);
            console.log('==================================================');
            
            // Buscar configurações de API (query corrigida)
            const apiConfigs = await pool.query(`
                SELECT u.id, u.username, u.email,
                       uak.api_key, uak.api_secret, uak.exchange, uak.environment
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE uak.api_key IS NOT NULL 
                AND uak.api_secret IS NOT NULL
                ORDER BY u.id
            `);

            console.log(`💰 Coletando saldos de ${apiConfigs.rows.length} configurações...`);

            let successCount = 0;
            let totalCollected = 0;

            for (const config of apiConfigs.rows) {
                console.log(`\n👤 USUÁRIO ${config.id} (${config.username}) - ${config.exchange.toUpperCase()}:`);
                
                let balance = 0;
                const environment = config.environment || 'mainnet';

                if (config.exchange === 'binance') {
                    balance = await this.getBinanceBalance(config.api_key, config.api_secret, environment);
                } else if (config.exchange === 'bybit') {
                    balance = await this.getBybitBalance(config.api_key, config.api_secret, environment);
                } else {
                    console.log(`      ⚠️ Exchange ${config.exchange} não suportada`);
                    continue;
                }

                // Salvar no banco com account_type
                try {
                    // Definir account_type baseado na exchange
                    const accountType = config.exchange === 'bybit' ? 'UNIFIED' : 'SPOT';
                    
                    // Delete anterior e insert novo
                    await pool.query(`
                        DELETE FROM balances 
                        WHERE user_id = $1 AND exchange = $2 AND asset = 'USDT'
                    `, [config.id, config.exchange]);
                    
                    await pool.query(`
                        INSERT INTO balances (user_id, exchange, wallet_balance, asset, account_type, created_at, last_updated)
                        VALUES ($1, $2, $3, 'USDT', $4, NOW(), NOW())
                    `, [config.id, config.exchange, balance, accountType]);
                    
                    console.log(`      ✅ Saldo salvo no banco: $${balance} USDT [${accountType}]`);
                    successCount++;
                    totalCollected += balance;
                    
                } catch (error) {
                    console.log(`      ❌ Erro ao salvar no banco: ${error.message}`);
                }
            }

            console.log('\n📊 RESUMO DA COLETA:');
            console.log('===================');
            console.log(`✅ Sucessos: ${successCount}/${apiConfigs.rows.length}`);
            console.log(`💰 Total coletado: $${totalCollected.toFixed(2)} USDT`);
            console.log(`⏰ Finalizado: ${new Date().toLocaleString('pt-BR')}`);

        } catch (error) {
            console.error('❌ ERRO na coleta:', error.message);
        }
    }

    async startAutoCollection() {
        console.log('💰 COLETOR DE SALDOS REAL - API ENDPOINTS CORRETOS');
        console.log('==================================================');
        console.log('🚀 Iniciando coletor automático de saldos...');
        console.log('⏰ Intervalo: 2 minutos');
        console.log('👥 Usuários: Todos com chaves API válidas');
        console.log('🔑 Fonte: Banco de dados (user_api_keys)');
        
        // Primeira coleta
        await this.collectBalances();
        
        // Agendar próximas coletas
        const intervalId = setInterval(async () => {
            await this.collectBalances();
        }, 2 * 60 * 1000); // 2 minutos

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

// Iniciar coletor
const collector = new SaldosCollectorReal();
collector.startAutoCollection();
