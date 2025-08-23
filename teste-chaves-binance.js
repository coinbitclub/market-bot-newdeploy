const crypto = require('crypto');
const axios = require('axios');

// Carregar variáveis de ambiente
require('dotenv').config();

// 🔑 TESTE ESPECÍFICO DAS CHAVES BINANCE
// Usando as credenciais exatas do banco de dados

async function testarChavesBinance() {
    try {
        console.log('🔥 TESTE ESPECÍFICO - CHAVES BINANCE');
        console.log('='.repeat(50));
        
        // Buscar chaves Binance do banco de dados
        const { Pool } = require('pg');
        
        let dbConfig;
        if (process.env.DATABASE_URL) {
            dbConfig = {
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            };
        } else {
            dbConfig = {
                host: process.env.DB_HOST || 'trolley.proxy.rlwy.net',
                port: process.env.DB_PORT || 44790,
                database: process.env.DB_NAME || 'railway',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD,
                ssl: { rejectUnauthorized: false }
            };
        }
        
        const pool = new Pool(dbConfig);
        
        console.log('📊 Buscando chaves Binance no banco...');
        const result = await pool.query(`
            SELECT u.username, k.api_key, k.api_secret, k.environment, k.is_testnet
            FROM users u
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE k.exchange = 'binance' 
            AND k.is_active = true
            AND u.is_active = true
            ORDER BY u.id
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ Nenhuma chave Binance encontrada no banco');
            return;
        }
        
        console.log(`✅ Encontradas ${result.rows.length} chaves Binance`);
        console.log();
        
        for (const row of result.rows) {
            await testarChaveBinanceIndividual(
                row.username, 
                row.api_key, 
                row.api_secret, 
                row.is_testnet ? 'testnet' : 'mainnet'
            );
            console.log();
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('💥 ERRO CRÍTICO:', error.message);
    }
}

async function testarChaveBinanceIndividual(username, apiKey, secretKey, environment) {
    try {
        console.log(`🧪 Testando: ${username} (${environment})`);
        console.log(`🔑 API Key: ${apiKey}`);
        
        const timestamp = Date.now();
        const recvWindow = 5000;
        
        // Definir URL base
        const baseUrl = environment === 'testnet' ? 
            'https://testnet.binance.vision' : 
            'https://api.binance.com';
        
        console.log(`🌐 Base URL: ${baseUrl}`);
        
        // 1. Testar server time primeiro
        console.log('⏰ Testando server time...');
        const timeResponse = await axios.get(`${baseUrl}/api/v3/time`, {
            timeout: 10000
        });
        
        if (timeResponse.status === 200) {
            console.log(`   ✅ Server time: ${new Date(timeResponse.data.serverTime)}`);
        }
        
        // 2. Testar autenticação com account info
        console.log('🔐 Testando autenticação...');
        const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(queryString)
            .digest('hex');
        
        console.log(`   📝 Query String: ${queryString}`);
        console.log(`   🔐 Signature: ${signature.substring(0, 16)}...`);
        
        const accountResponse = await axios.get(`${baseUrl}/api/v3/account?${queryString}&signature=${signature}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        if (accountResponse.status === 200) {
            const data = accountResponse.data;
            console.log(`   ✅ Autenticação: SUCESSO`);
            console.log(`   👤 Account Type: ${data.accountType}`);
            console.log(`   🔒 Can Trade: ${data.canTrade}`);
            console.log(`   🛡️ Permissions: ${JSON.stringify(data.permissions)}`);
            
            // Calcular saldo USDT
            const usdtBalance = data.balances?.find(b => b.asset === 'USDT');
            if (usdtBalance) {
                const balance = parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked);
                console.log(`   💰 Saldo USDT: $${balance.toFixed(2)} (Livre: $${parseFloat(usdtBalance.free).toFixed(2)})`);
            } else {
                console.log(`   💰 Saldo USDT: Não encontrado`);
            }
            
            console.log(`   🎉 ${username}: CHAVE BINANCE VÁLIDA E FUNCIONAL!`);
            
        }
        
    } catch (error) {
        console.log(`   ❌ ${username}: ERRO - ${error.message}`);
        if (error.response?.data) {
            console.log(`   📋 Error Data:`, JSON.stringify(error.response.data, null, 2));
        }
        if (error.response?.status) {
            console.log(`   📊 HTTP Status: ${error.response.status}`);
        }
    }
}

// 🚀 EXECUTAR TESTE
testarChavesBinance()
    .then(() => {
        console.log('\n✅ TESTE DE CHAVES BINANCE CONCLUÍDO');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 TESTE FALHOU:', error.message);
        process.exit(1);
    });
