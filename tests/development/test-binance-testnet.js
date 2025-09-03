const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class BinanceTestnetTester {
    
    // Testar Binance Testnet
    async testBinanceTestnet(apiKey, apiSecret) {
        const baseUrl = 'https://testnet.binance.vision';
        const timestamp = Date.now();
        
        try {
            console.log(`      🧪 Testando Binance TESTNET...`);
            console.log(`      🌐 Conectando: ${baseUrl}`);
            
            const queryString = `timestamp=${timestamp}`;
            const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
            
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
            
            console.log(`      📊 Response status: ${response.status}`);
            console.log(`      📋 Account info:`, JSON.stringify(response.data, null, 2));
            
            if (response.data && response.data.balances) {
                console.log(`      💰 Total balances: ${response.data.balances.length}`);
                
                // Procurar USDT
                const usdtBalance = response.data.balances.find(b => b.asset === 'USDT');
                if (usdtBalance) {
                    const balance = parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked);
                    console.log(`      💵 USDT Balance: ${balance} (free: ${usdtBalance.free}, locked: ${usdtBalance.locked})`);
                    return balance;
                } else {
                    // Mostrar todas as moedas com saldo
                    const nonZeroBalances = response.data.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
                    console.log(`      📋 Moedas com saldo (${nonZeroBalances.length}):`);
                    nonZeroBalances.forEach(b => {
                        console.log(`        ${b.asset}: ${b.free} (locked: ${b.locked})`);
                    });
                    
                    // Se não tem USDT, pegar BNB ou outra moeda principal
                    const bnbBalance = response.data.balances.find(b => b.asset === 'BNB');
                    if (bnbBalance) {
                        const balance = parseFloat(bnbBalance.free) + parseFloat(bnbBalance.locked);
                        console.log(`      💵 BNB Balance (como referência): ${balance}`);
                        return balance;
                    }
                    
                    return 0;
                }
            }
            
            return 0;
            
        } catch (error) {
            console.log(`      ❌ Binance Testnet Error: ${error.response?.data?.msg || error.message}`);
            
            // Se for erro de permissão, tentar endpoint público
            if (error.response?.status === 401) {
                console.log(`      🔄 Tentando endpoint público para verificar conectividade...`);
                return await this.testBinancePublicEndpoint(baseUrl);
            }
            
            return 0;
        }
    }
    
    // Testar endpoint público da Binance
    async testBinancePublicEndpoint(baseUrl) {
        try {
            const response = await axios.get(`${baseUrl}/api/v3/time`, { timeout: 5000 });
            console.log(`      ✅ Conectividade OK - Server time: ${new Date(response.data.serverTime).toISOString()}`);
            console.log(`      ⚠️ Chave API tem problemas de permissão ou configuração`);
            return 0;
        } catch (error) {
            console.log(`      ❌ Falha total de conectividade: ${error.message}`);
            return 0;
        }
    }
    
    async testBinanceConnection() {
        try {
            console.log('🧪 TESTANDO BINANCE TESTNET...\n');
            
            // Buscar chave Binance
            const binanceKeys = await pool.query(`
                SELECT u.id, u.username, u.email,
                       uak.api_key, uak.api_secret, uak.exchange, uak.environment
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE uak.api_key IS NOT NULL 
                AND uak.api_secret IS NOT NULL
                AND uak.exchange = 'binance'
                ORDER BY u.id
            `);
            
            console.log(`📋 Encontradas ${binanceKeys.rows.length} chaves Binance\n`);
            
            for (const config of binanceKeys.rows) {
                console.log(`👤 USUÁRIO ${config.id} (${config.username}) - BINANCE:`);
                console.log(`   Environment configurado: ${config.environment || 'mainnet'}`);
                
                const balance = await this.testBinanceTestnet(config.api_key, config.api_secret);
                console.log(`   ✅ RESULTADO: $${balance} (moeda principal)\n`);
            }
            
            await pool.end();
            
        } catch (error) {
            console.error('❌ Erro geral:', error.message);
            await pool.end();
        }
    }
}

const tester = new BinanceTestnetTester();
tester.testBinanceConnection();
