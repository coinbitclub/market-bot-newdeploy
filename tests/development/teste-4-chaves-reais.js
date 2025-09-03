#!/usr/bin/env node

/**
 * 🔍 TESTE DIRETO DAS 4 CHAVES REAIS
 * ===================================
 * 
 * Baseado no que você disse: 3 management e 1 testnet
 * Vamos identificar e testar cada uma
 */

const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

console.log('🔍 TESTE DIRETO DAS 4 CHAVES REAIS');
console.log('=================================');

async function identificarChavesReais() {
    try {
        console.log('\n📋 Identificando as 4 chaves reais no banco...\n');
        
        // Buscar todas as configurações de chaves que existem
        const chaves = await pool.query(`
            SELECT 
                id,
                username,
                nome,
                account_type,
                testnet_mode,
                exchange_testnet_mode,
                -- Bybit
                bybit_api_key,
                CASE WHEN bybit_api_secret IS NOT NULL THEN 'CONFIGURADO' ELSE 'VAZIO' END as bybit_secret_status,
                -- Binance
                binance_api_key,
                CASE WHEN binance_api_secret IS NOT NULL THEN 'CONFIGURADO' ELSE 'VAZIO' END as binance_secret_status,
                -- Preferências
                exchange_preference,
                ativo,
                is_active
            FROM users 
            WHERE (bybit_api_key IS NOT NULL OR binance_api_key IS NOT NULL)
            ORDER BY id
        `);

        console.log(`📊 Total de usuários com chaves: ${chaves.rows.length}`);
        console.log('\n👥 ANÁLISE DAS CHAVES:');
        console.log('======================\n');

        const chavesReais = [];

        for (const user of chaves.rows) {
            console.log(`👤 ID ${user.id}: ${user.username || user.nome}`);
            console.log(`   📋 Tipo conta: ${user.account_type || 'não definido'}`);
            console.log(`   🔧 Testnet mode: ${user.testnet_mode}`);
            console.log(`   🔄 Exchange testnet: ${user.exchange_testnet_mode}`);
            console.log(`   ✅ Ativo: ${user.ativo || user.is_active}`);
            
            // Analisar Bybit
            if (user.bybit_api_key) {
                console.log(`   🟡 Bybit: ${user.bybit_api_key} (secret: ${user.bybit_secret_status})`);
                
                if (user.bybit_secret_status === 'CONFIGURADO') {
                    chavesReais.push({
                        user_id: user.id,
                        username: user.username || user.nome,
                        exchange: 'bybit',
                        api_key: user.bybit_api_key,
                        account_type: user.account_type,
                        testnet_mode: user.testnet_mode,
                        is_testnet: user.account_type === 'testnet' || user.testnet_mode === true
                    });
                }
            }
            
            // Analisar Binance
            if (user.binance_api_key) {
                console.log(`   🟨 Binance: ${user.binance_api_key} (secret: ${user.binance_secret_status})`);
                
                if (user.binance_secret_status === 'CONFIGURADO') {
                    chavesReais.push({
                        user_id: user.id,
                        username: user.username || user.nome,
                        exchange: 'binance',
                        api_key: user.binance_api_key,
                        account_type: user.account_type,
                        testnet_mode: user.testnet_mode,
                        is_testnet: user.account_type === 'testnet' || user.testnet_mode === true
                    });
                }
            }
            
            console.log('');
        }

        console.log(`🔑 CHAVES REAIS IDENTIFICADAS: ${chavesReais.length}`);
        console.log('=================================\n');

        // Classificar as chaves
        const testnetKeys = chavesReais.filter(k => k.is_testnet);
        const managementKeys = chavesReais.filter(k => !k.is_testnet);

        console.log(`🧪 TESTNET: ${testnetKeys.length} chaves`);
        testnetKeys.forEach(k => {
            console.log(`   • ID ${k.user_id} (${k.username}): ${k.exchange} - ${k.api_key}`);
        });

        console.log(`\n💼 MANAGEMENT: ${managementKeys.length} chaves`);
        managementKeys.forEach(k => {
            console.log(`   • ID ${k.user_id} (${k.username}): ${k.exchange} - ${k.api_key}`);
        });

        console.log('\n🧪 TESTANDO AS CHAVES IDENTIFICADAS...');
        console.log('======================================');

        // Testar cada chave real
        for (const chave of chavesReais) {
            await testarChaveReal(chave);
        }

    } catch (error) {
        console.error('❌ Erro na identificação:', error.message);
    }
}

async function testarChaveReal(chave) {
    try {
        console.log(`\n🔍 Testando: ${chave.username} (ID: ${chave.user_id})`);
        console.log(`   Exchange: ${chave.exchange}`);
        console.log(`   Tipo: ${chave.is_testnet ? 'TESTNET' : 'MANAGEMENT'}`);
        console.log(`   API Key: ${chave.api_key}`);

        // Buscar o secret do banco
        const secretQuery = await pool.query(`
            SELECT 
                bybit_api_secret,
                binance_api_secret
            FROM users 
            WHERE id = $1
        `, [chave.user_id]);

        if (secretQuery.rows.length === 0) {
            console.log('   ❌ Usuário não encontrado');
            return;
        }

        const secrets = secretQuery.rows[0];
        const secret = chave.exchange === 'bybit' ? secrets.bybit_api_secret : secrets.binance_api_secret;

        if (!secret) {
            console.log('   ❌ Secret não encontrado');
            return;
        }

        console.log(`   🔐 Secret: ${secret.substring(0, 8)}...`);

        // Determinar ambiente
        const environment = chave.is_testnet ? 'testnet' : 'mainnet';
        console.log(`   🌐 Ambiente: ${environment}`);

        let saldo = 0;

        if (chave.exchange === 'bybit') {
            saldo = await testarBybit(chave.api_key, secret, environment);
        } else if (chave.exchange === 'binance') {
            saldo = await testarBinance(chave.api_key, secret, environment);
        }

        console.log(`   💰 Resultado: $${saldo.toFixed(2)} USDT`);

        // Atualizar no banco
        await atualizarSaldoNoBanco(chave.user_id, chave.exchange, saldo, environment);

    } catch (error) {
        console.log(`   ❌ Erro no teste: ${error.message}`);
    }
}

async function testarBybit(apiKey, secret, environment) {
    try {
        const baseUrl = environment === 'testnet' 
            ? 'https://api-testnet.bybit.com' 
            : 'https://api.bybit.com';

        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const queryParams = 'accountType=UNIFIED';
        
        const signPayload = timestamp + apiKey + recvWindow + queryParams;
        const signature = crypto.createHmac('sha256', secret).update(signPayload).digest('hex');

        const response = await fetch(`${baseUrl}/v5/account/wallet-balance?${queryParams}`, {
            method: 'GET',
            headers: {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'X-BAPI-SIGN-TYPE': '2'
            }
        });

        const data = await response.json();
        
        if (data.retCode === 0) {
            const account = data.result?.list?.[0];
            if (account && account.coin) {
                const usdtCoin = account.coin.find(coin => coin.coin === 'USDT');
                if (usdtCoin) {
                    return parseFloat(usdtCoin.walletBalance) || 0;
                }
            }
            return 0;
        } else {
            console.log(`     ❌ Bybit erro: ${data.retMsg}`);
            return 0;
        }

    } catch (error) {
        console.log(`     ❌ Bybit exceção: ${error.message}`);
        return 0;
    }
}

async function testarBinance(apiKey, secret, environment) {
    try {
        const baseUrl = environment === 'testnet' 
            ? 'https://testnet.binance.vision/api/v3' 
            : 'https://api.binance.com/api/v3';

        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', secret).update(queryString).digest('hex');

        const response = await fetch(`${baseUrl}/account?${queryString}&signature=${signature}`, {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': apiKey
            }
        });

        if (response.ok) {
            const data = await response.json();
            const usdtBalance = data.balances.find(b => b.asset === 'USDT');
            if (usdtBalance) {
                return parseFloat(usdtBalance.free) + parseFloat(usdtBalance.locked);
            }
            return 0;
        } else {
            console.log(`     ❌ Binance erro: ${response.status}`);
            return 0;
        }

    } catch (error) {
        console.log(`     ❌ Binance exceção: ${error.message}`);
        return 0;
    }
}

async function atualizarSaldoNoBanco(userId, exchange, balance, environment) {
    try {
        // Criar tabela se não existir
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_balance_real (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                exchange VARCHAR(20) NOT NULL,
                balance_usdt DECIMAL(15,8) NOT NULL,
                environment VARCHAR(20) NOT NULL,
                tested_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, exchange)
            )
        `);

        await pool.query(`
            INSERT INTO user_balance_real (user_id, exchange, balance_usdt, environment)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, exchange)
            DO UPDATE SET 
                balance_usdt = EXCLUDED.balance_usdt,
                environment = EXCLUDED.environment,
                tested_at = NOW()
        `, [userId, exchange, balance, environment]);

        console.log(`     💾 Salvo no banco: $${balance.toFixed(2)}`);

    } catch (error) {
        console.log(`     ❌ Erro ao salvar: ${error.message}`);
    }
}

// Executar
if (require.main === module) {
    identificarChavesReais().finally(() => {
        pool.end();
    });
}

module.exports = { identificarChavesReais };
