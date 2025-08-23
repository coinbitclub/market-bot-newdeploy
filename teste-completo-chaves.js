require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');
const { Pool } = require('pg');

// 🎯 TESTE COMPLETO DE TODAS AS CHAVES - BINANCE E BYBIT
async function testeCompletoChaves() {
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

    try {
        console.log('🚀 TESTE COMPLETO DE CHAVES API - BINANCE E BYBIT');
        console.log('='.repeat(60));

        // Buscar todas as chaves ativas
        const result = await pool.query(`
            SELECT u.id, u.username, k.id as key_id, k.exchange, k.api_key, k.api_secret, 
                   k.environment, k.validation_status, k.is_testnet
            FROM users u
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE u.is_active = true AND k.is_active = true
            AND k.api_key IS NOT NULL AND k.api_secret IS NOT NULL
            ORDER BY u.id, k.exchange
        `);

        console.log(`📊 Encontradas ${result.rows.length} chaves para testar\n`);

        let totalTested = 0;
        let totalValid = 0;
        let totalBalance = 0;

        for (const row of result.rows) {
            console.log(`🧪 Testando: ${row.username} (${row.exchange}) - ${row.environment}`);
            console.log(`🔑 Key ID: ${row.key_id} | API Key: ${row.api_key}`);

            totalTested++;
            let resultado;

            if (row.exchange === 'binance') {
                resultado = await testarBinance(row);
            } else if (row.exchange === 'bybit') {
                resultado = await testarBybit(row);
            }

            if (resultado && resultado.valid) {
                totalValid++;
                totalBalance += resultado.balance || 0;
                console.log(`   ✅ VÁLIDA: $${resultado.balance || 0} | Tipo: ${resultado.accountType || 'N/A'}`);
                
                // Atualizar no banco se mudou
                if (row.validation_status !== 'valid') {
                    await pool.query(`
                        UPDATE user_api_keys 
                        SET validation_status = 'valid', last_validated = NOW()
                        WHERE id = $1
                    `, [row.key_id]);
                    console.log(`   📝 Status atualizado no banco`);
                }
            } else {
                console.log(`   ❌ INVÁLIDA: ${resultado?.error || 'Erro desconhecido'}`);
            }

            console.log();
        }

        await pool.end();

        console.log('📊 RESULTADO FINAL DO TESTE:');
        console.log('='.repeat(40));
        console.log(`🔢 Total testado: ${totalTested} chaves`);
        console.log(`✅ Chaves válidas: ${totalValid}`);
        console.log(`❌ Chaves inválidas: ${totalTested - totalValid}`);
        console.log(`💰 Saldo total: $${totalBalance.toFixed(2)}`);
        console.log(`📈 Taxa de sucesso: ${((totalValid/totalTested)*100).toFixed(1)}%`);

        if (totalValid > 0) {
            console.log('\n🎉 SISTEMA PRONTO PARA OPERAR COM CHAVES VÁLIDAS!');
        }

    } catch (error) {
        console.error('💥 ERRO CRÍTICO:', error.message);
    }
}

async function testarBinance(chave) {
    try {
        const timestamp = Date.now();
        const recvWindow = 5000;
        const queryString = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
        const signature = crypto
            .createHmac('sha256', chave.api_secret)
            .update(queryString)
            .digest('hex');

        const baseUrl = chave.is_testnet ? 
            'https://testnet.binance.vision' : 
            'https://api.binance.com';

        const response = await axios.get(`${baseUrl}/api/v3/account?${queryString}&signature=${signature}`, {
            headers: {
                'X-MBX-APIKEY': chave.api_key,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const data = response.data;
        const usdtBalance = data.balances?.find(b => b.asset === 'USDT');
        const balance = usdtBalance ? parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked) : 0;

        return {
            valid: true,
            balance: balance,
            accountType: data.accountType,
            canTrade: data.canTrade,
            permissions: data.permissions
        };

    } catch (error) {
        return {
            valid: false,
            error: error.response?.data?.msg || error.message
        };
    }
}

async function testarBybit(chave) {
    try {
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryString = 'accountType=UNIFIED';
        
        const signaturePayload = timestamp + chave.api_key + recvWindow + queryString;
        const signature = crypto
            .createHmac('sha256', chave.api_secret)
            .update(signaturePayload)
            .digest('hex');

        const baseUrl = chave.is_testnet ? 
            'https://api-testnet.bybit.com' : 
            'https://api.bybit.com';

        const response = await axios.get(`${baseUrl}/v5/account/wallet-balance?${queryString}`, {
            headers: {
                'X-BAPI-API-KEY': chave.api_key,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const data = response.data;
        
        if (data.retCode !== 0) {
            return {
                valid: false,
                error: data.retMsg || 'Erro Bybit'
            };
        }

        const walletBalance = data.result?.list?.[0]?.totalWalletBalance || 0;

        return {
            valid: true,
            balance: parseFloat(walletBalance),
            accountType: 'UNIFIED',
            canTrade: true
        };

    } catch (error) {
        return {
            valid: false,
            error: error.response?.data?.retMsg || error.message
        };
    }
}

testeCompletoChaves();
