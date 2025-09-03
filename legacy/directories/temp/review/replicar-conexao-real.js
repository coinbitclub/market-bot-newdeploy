/**
 * 🔥 REPRODUÇÃO EXATA DA CONEXÃO REAL QUE FUNCIONOU ANTES
 * ======================================================
 */

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

// Mesma configuração que funcionou antes
const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function replicarConexaoReal() {
    const logFile = `conexao-real-${Date.now()}.log`;
    const logs = [];
    
    function log(message) {
        const timestamp = new Date().toISOString();
        const fullMessage = `[${timestamp}] ${message}`;
        console.log(fullMessage);
        logs.push(fullMessage);
    }

    try {
        log('🔥 REPLICANDO CONEXÃO REAL QUE FUNCIONOU ANTES');
        log('===============================================');

        // 1. Conexão com banco (igual ao que funcionou)
        log('1️⃣ Conectando ao banco PostgreSQL...');
        await pool.query('SELECT NOW() as timestamp');
        log('✅ Banco conectado com sucesso');

        // 2. Corrigir secret key da Erica (como fizemos antes)
        log('2️⃣ Corrigindo secret key da Erica...');
        const updateResult = await pool.query(`
            UPDATE user_api_keys 
            SET secret_key = $1
            WHERE api_key = $2 AND exchange = 'bybit'
            RETURNING id, user_id
        `, ['process.env.API_KEY_HERE', '2iNeNZQepHJS0lWBkf']);

        if (updateResult.rows.length > 0) {
            log(`✅ Secret key atualizada para chave ID ${updateResult.rows[0].id}`);
        } else {
            log('⚠️ Nenhuma chave atualizada - pode já estar correta');
        }

        // 3. Buscar dados da Erica (exatamente como funcionou)
        log('3️⃣ Buscando dados da conta da Erica...');
        const ericaKey = await pool.query(`
            SELECT 
                u.username,
                uak.api_key,
                uak.secret_key,
                LENGTH(uak.secret_key) as secret_len
            FROM users u
            JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE uak.api_key = '2iNeNZQepHJS0lWBkf'
            AND uak.exchange = 'bybit'
            LIMIT 1
        `);

        if (ericaKey.rows.length === 0) {
            throw new Error('Chave da Erica não encontrada');
        }

        const { username, api_key, secret_key, secret_len } = ericaKey.rows[0];
        log(`👤 Usuário: ${username}`);
        log(`🔑 API Key: ${api_key}`);
        log(`🔐 Secret length: ${secret_len} chars`);

        // 4. CONEXÃO REAL COM BYBIT (exatamente como funcionou antes)
        log('4️⃣ EXECUTANDO CONEXÃO REAL COM BYBIT...');
        log('=====================================');

        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const params = { accountType: 'UNIFIED' };
        const queryString = new URLSearchParams(params).toString();
        
        // Assinatura HMAC-SHA256 (igual ao que funcionou)
        const signPayload = timestamp + api_key + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', secret_key).update(signPayload).digest('hex');
        
        const headers = {
            'X-BAPI-API-KEY': api_key,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp,
            'X-BAPI-RECV-WINDOW': recvWindow,
            'Content-Type': 'application/json'
        };

        log('🔗 Fazendo requisição para Bybit V5 API...');
        log(`📡 URL: https://api.bybit.com/v5/account/wallet-balance?${queryString}`);

        const response = await axios.get(`https://api.bybit.com/v5/account/wallet-balance?${queryString}`, {
            headers,
            timeout: 30000
        });

        log(`📨 Response status: ${response.status}`);
        log(`📊 Bybit retCode: ${response.data.retCode}`);
        log(`📝 Bybit retMsg: ${response.data.retMsg}`);

        if (response.data.retCode === 0) {
            log('🎉 CONEXÃO REAL ESTABELECIDA COM SUCESSO!');
            log('========================================');

            const walletList = response.data.result?.list || [];
            log(`💼 Carteiras encontradas: ${walletList.length}`);

            let totalGeralUSD = 0;
            let totalMoedas = 0;

            walletList.forEach((wallet, walletIndex) => {
                const accountType = wallet.accountType || 'UNIFIED';
                const coins = wallet.coin || [];
                
                log(`\n💼 CARTEIRA ${walletIndex + 1}: ${accountType}`);
                log('-'.repeat(50));

                let totalCarteiraUSD = 0;
                let moedasComSaldo = 0;

                coins.forEach(coin => {
                    const balance = parseFloat(coin.walletBalance) || 0;
                    const usdValue = parseFloat(coin.usdValue) || 0;
                    const availableBalance = parseFloat(coin.availableToWithdraw) || 0;
                    const lockedBalance = parseFloat(coin.locked) || 0;

                    if (balance > 0) {
                        log(`💰 ${coin.coin}: ${balance}`);
                        log(`   💵 Valor USD: $${usdValue.toFixed(2)}`);
                        log(`   🔓 Disponível: ${availableBalance}`);
                        log(`   🔒 Bloqueado: ${lockedBalance}`);
                        
                        totalCarteiraUSD += usdValue;
                        moedasComSaldo++;
                    }
                });

                log(`📊 Total da carteira ${accountType}: $${totalCarteiraUSD.toFixed(2)}`);
                log(`🪙 Moedas com saldo: ${moedasComSaldo}`);
                
                totalGeralUSD += totalCarteiraUSD;
                totalMoedas += moedasComSaldo;
            });

            log('\n🏆 RESUMO FINAL DOS SALDOS REAIS:');
            log('================================');
            log(`👤 Usuário: ${username}`);
            log(`💰 TOTAL GERAL USD: $${totalGeralUSD.toFixed(2)}`);
            log(`🪙 TOTAL DE MOEDAS: ${totalMoedas}`);
            log(`📊 CARTEIRAS ATIVAS: ${walletList.length}`);
            log(`✅ STATUS: SALDOS REAIS COLETADOS COM SUCESSO!`);

            // Atualizar status no banco
            await pool.query(`
                UPDATE user_api_keys 
                SET validation_status = 'CONNECTED', 
                    last_validated_at = NOW(),
                    error_details = NULL
                WHERE api_key = $1
            `, [api_key]);

            log('✅ Status atualizado no banco de dados');

        } else {
            log(`❌ ERRO NA CONEXÃO:`);
            log(`   Código: ${response.data.retCode}`);
            log(`   Mensagem: ${response.data.retMsg}`);
        }

    } catch (error) {
        log(`❌ ERRO CRÍTICO: ${error.message}`);
        if (error.response) {
            log(`📨 Response status: ${error.response.status}`);
            log(`📝 Response data: ${JSON.stringify(error.response.data)}`);
        }
    } finally {
        await pool.end();
        
        // Salvar logs em arquivo
        fs.writeFileSync(logFile, logs.join('\n'));
        log(`📄 Logs salvos em: ${logFile}`);
        
        log('🔚 EXECUÇÃO FINALIZADA');
    }
}

// Executar imediatamente
replicarConexaoReal();
