const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

class BinanceDeepTester {
    
    async testBinanceAPIInfo(apiKey, apiSecret) {
        const baseUrl = 'https://testnet.binance.vision';
        const timestamp = Date.now();
        
        try {
            console.log(`      🔍 Testando API Info (sem permissões especiais)...`);
            
            // Primeiro, testar endpoint público
            const publicTest = await axios.get(`${baseUrl}/api/v3/exchangeInfo`, { timeout: 5000 });
            console.log(`      ✅ Conectividade pública OK`);
            
            // Testar API key info (endpoint mais básico)
            const queryString = `timestamp=${timestamp}`;
            const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
            
            console.log(`      🔑 Testando API Key validation...`);
            console.log(`      📝 Timestamp: ${timestamp}`);
            console.log(`      📝 Query: ${queryString}`);
            console.log(`      📝 Signature: ${signature.substring(0, 20)}...`);
            
            const apiResponse = await axios.get(`${baseUrl}/api/v3/account`, {
                params: {
                    timestamp,
                    signature
                },
                headers: {
                    'X-MBX-APIKEY': apiKey
                },
                timeout: 10000
            });
            
            console.log(`      ✅ API Key válida!`);
            console.log(`      📊 Account data:`, JSON.stringify(apiResponse.data, null, 2));
            
            return apiResponse.data;
            
        } catch (error) {
            console.log(`      ❌ Erro detalhado:`);
            console.log(`         Status: ${error.response?.status}`);
            console.log(`         Headers: ${JSON.stringify(error.response?.headers)}`);
            console.log(`         Data: ${JSON.stringify(error.response?.data)}`);
            console.log(`         Message: ${error.message}`);
            
            // Testar diferentes timestamps
            if (error.response?.data?.msg?.includes('Timestamp')) {
                console.log(`      🔄 Testando com timestamp ajustado...`);
                return await this.testWithAdjustedTimestamp(apiKey, apiSecret, baseUrl);
            }
            
            return null;
        }
    }
    
    async testWithAdjustedTimestamp(apiKey, apiSecret, baseUrl) {
        try {
            // Pegar o tempo do servidor primeiro
            const serverTimeResponse = await axios.get(`${baseUrl}/api/v3/time`);
            const serverTime = serverTimeResponse.data.serverTime;
            console.log(`      ⏰ Server time: ${serverTime}, Local time: ${Date.now()}, Diff: ${Date.now() - serverTime}ms`);
            
            const queryString = `timestamp=${serverTime}`;
            const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
            
            const response = await axios.get(`${baseUrl}/api/v3/account`, {
                params: {
                    timestamp: serverTime,
                    signature
                },
                headers: {
                    'X-MBX-APIKEY': apiKey
                },
                timeout: 10000
            });
            
            console.log(`      ✅ Sucesso com timestamp do servidor!`);
            return response.data;
            
        } catch (error) {
            console.log(`      ❌ Ainda falhou com timestamp do servidor: ${error.response?.data?.msg || error.message}`);
            return null;
        }
    }
    
    async deepTestBinance() {
        try {
            console.log('🔬 TESTE PROFUNDO DA BINANCE TESTNET...\n');
            
            // Buscar chave Binance
            const binanceKeys = await pool.query(`
                SELECT u.id, u.username, uak.api_key, uak.api_secret, uak.environment
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE uak.exchange = 'binance'
            `);
            
            if (binanceKeys.rows.length === 0) {
                console.log('❌ Nenhuma chave Binance encontrada');
                return;
            }
            
            const config = binanceKeys.rows[0];
            console.log(`👤 Testando User ${config.id} (${config.username})`);
            console.log(`🔧 Environment: ${config.environment}`);
            console.log(`🔑 API Key: ${config.api_key.substring(0, 10)}...`);
            console.log(`🔐 Secret: ${config.api_secret.substring(0, 10)}...\n`);
            
            const result = await this.testBinanceAPIInfo(config.api_key, config.api_secret);
            
            if (result) {
                console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
                if (result.balances) {
                    const nonZeroBalances = result.balances.filter(b => parseFloat(b.free) > 0);
                    console.log(`💰 Moedas com saldo: ${nonZeroBalances.length}`);
                    nonZeroBalances.forEach(b => {
                        console.log(`   ${b.asset}: ${b.free}`);
                    });
                }
            } else {
                console.log('\n❌ TESTE FALHOU - Chave pode estar inválida ou com restrições');
            }
            
            await pool.end();
            
        } catch (error) {
            console.error('❌ Erro geral:', error.message);
            await pool.end();
        }
    }
}

const tester = new BinanceDeepTester();
tester.deepTestBinance();
