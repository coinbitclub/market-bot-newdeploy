/**
 * 💰 EXECUÇÃO DIRETA DE COLETA DE SALDOS REAIS
 * ===========================================
 */

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

console.log('🚀 COLETA DE SALDOS REAIS - EXECUÇÃO DIRETA');
console.log('============================================');
console.log('🕒 Início:', new Date().toISOString());

async function coletarSaldosReais() {
    const pool = new Pool({
        connectionString: 'process.env.DATABASE_URL',
        ssl: { rejectUnauthorized: false }
    });

    try {
        // 1. Conectar e verificar banco
        console.log('\n1️⃣ CONECTANDO AO BANCO...');
        await pool.query('SELECT NOW()');
        console.log('✅ Conectado com sucesso');

        // 2. Corrigir secret key da Erica
        console.log('\n2️⃣ CORRIGINDO SECRET KEY DA ERICA...');
        const updateResult = await pool.query(`
            UPDATE user_api_keys 
            SET secret_key = $1
            WHERE api_key = $2
            RETURNING id, LENGTH(secret_key) as secret_len
        `, ['process.env.API_KEY_HERE', '2iNeNZQepHJS0lWBkf']);

        if (updateResult.rows.length > 0) {
            console.log(`✅ Secret key atualizada - ${updateResult.rows[0].secret_len} caracteres`);
        }

        // 3. Buscar chaves para validação
        console.log('\n3️⃣ BUSCANDO CHAVES PARA VALIDAÇÃO...');
        const chaves = await pool.query(`
            SELECT 
                u.id as user_id,
                u.username,
                uak.id as key_id,
                uak.exchange,
                uak.environment,
                uak.api_key,
                uak.secret_key
            FROM users u
            JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.is_active = true 
            AND uak.is_active = true
            AND uak.api_key IS NOT NULL
            AND uak.secret_key IS NOT NULL
            AND LENGTH(uak.secret_key) > 0
        `);

        console.log(`🔑 Encontradas ${chaves.rows.length} chaves válidas`);

        // 4. Validar Bybit e coletar saldos REAIS
        console.log('\n4️⃣ COLETANDO SALDOS REAIS DA BYBIT...');
        
        for (const chave of chaves.rows) {
            if (chave.exchange === 'bybit') {
                console.log(`\n🔍 Validando ${chave.username}...`);
                
                try {
                    const timestamp = Date.now().toString();
                    const recvWindow = '5000';
                    const params = { accountType: 'UNIFIED' };
                    const queryString = new URLSearchParams(params).toString();
                    
                    const signPayload = timestamp + chave.api_key + recvWindow + queryString;
                    const signature = crypto.createHmac('sha256', chave.secret_key).update(signPayload).digest('hex');
                    
                    const headers = {
                        'X-BAPI-API-KEY': chave.api_key,
                        'X-BAPI-SIGN': signature,
                        'X-BAPI-SIGN-TYPE': '2',
                        'X-BAPI-TIMESTAMP': timestamp,
                        'X-BAPI-RECV-WINDOW': recvWindow,
                        'Content-Type': 'application/json'
                    };

                    const response = await axios.get('https://api.bybit.com/v5/account/wallet-balance?' + queryString, {
                        headers,
                        timeout: 30000
                    });

                    if (response.data.retCode === 0) {
                        const coins = response.data.result?.list?.[0]?.coin || [];
                        let usdtBalance = 0;
                        let totalUSD = 0;

                        console.log(`📊 SALDOS REAIS DE ${chave.username.toUpperCase()}:`);
                        console.log('='.repeat(50));

                        coins.forEach(coin => {
                            const balance = parseFloat(coin.walletBalance) || 0;
                            const usdValue = parseFloat(coin.usdValue) || 0;
                            
                            if (balance > 0) {
                                console.log(`💰 ${coin.coin}: ${balance} (USD: $${usdValue.toFixed(2)})`);
                                
                                if (coin.coin === 'USDT') {
                                    usdtBalance = balance;
                                }
                                totalUSD += usdValue;
                            }
                        });

                        console.log('-'.repeat(50));
                        console.log(`💵 Total USDT: ${usdtBalance}`);
                        console.log(`💰 Total USD: $${totalUSD.toFixed(2)}`);
                        console.log(`🪙 Total de moedas: ${coins.filter(c => parseFloat(c.walletBalance) > 0).length}`);
                        console.log('✅ SALDOS REAIS COLETADOS COM SUCESSO!');

                        // Atualizar status no banco
                        await pool.query(`
                            UPDATE user_api_keys 
                            SET validation_status = 'CONNECTED', last_validated_at = NOW()
                            WHERE id = $1
                        `, [chave.key_id]);

                    } else {
                        console.log(`❌ Erro Bybit: ${response.data.retCode} - ${response.data.retMsg}`);
                    }

                } catch (error) {
                    console.log(`❌ Erro de conexão: ${error.message}`);
                }
            }
        }

        console.log('\n🎉 COLETA DE SALDOS REAIS FINALIZADA!');
        
    } catch (error) {
        console.error('❌ Erro fatal:', error.message);
    } finally {
        await pool.end();
        console.log('🔚 Conexão encerrada');
    }
}

// Executar
coletarSaldosReais().then(() => {
    console.log('\n✅ PROCESSO CONCLUÍDO');
    console.log('🕒 Fim:', new Date().toISOString());
}).catch(error => {
    console.error('💥 Erro na execução:', error.message);
});
