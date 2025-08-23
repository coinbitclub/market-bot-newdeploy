/**
 * 🧪 TESTE SIMPLES DE CONEXÃO - CHAVES REAIS
 * ==========================================
 * 
 * Teste básico para verificar se as chaves estão funcionando
 */

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

class TesteConexaoSimples {
    async detectarIP() {
        try {
            const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            console.log(`🌐 IP Atual: ${response.data.ip}`);
            return response.data.ip;
        } catch (error) {
            console.log('❌ Erro ao detectar IP:', error.message);
            return null;
        }
    }

    async buscarTodasChaves() {
        console.log('🔍 BUSCANDO TODAS AS CHAVES NO BANCO...');
        
        try {
            const query = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    uak.id as key_id,
                    uak.exchange,
                    uak.environment,
                    uak.api_key,
                    uak.secret_key,
                    uak.is_active,
                    uak.validation_status
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                ORDER BY u.id, uak.exchange, uak.environment
            `;

            const result = await pool.query(query);
            console.log(`📊 Chaves encontradas: ${result.rows.length}`);

            return result.rows;
        } catch (error) {
            console.error('❌ Erro ao buscar chaves:', error.message);
            return [];
        }
    }

    async testarBybit(apiKey, secretKey, environment) {
        const baseURL = environment === 'testnet' 
            ? 'https://api-testnet.bybit.com' 
            : 'https://api.bybit.com';

        try {
            console.log(`   🟣 Testando Bybit ${environment}...`);
            
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            const queryString = `accountType=UNIFIED&apiKey=${apiKey}`;
            const signPayload = timestamp + apiKey + recvWindow + queryString;
            const signature = crypto.createHmac('sha256', secretKey).update(signPayload).digest('hex');
            
            const headers = {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-SIGN-TYPE': '2',
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            };
            
            const response = await axios.get(`${baseURL}/v5/account/wallet-balance?${queryString}`, {
                headers,
                timeout: 10000
            });

            if (response.data.retCode === 0) {
                // Verificar saldo USDT
                let usdtBalance = 0;
                const result = response.data.result;
                if (result && result.list && result.list.length > 0) {
                    const account = result.list[0];
                    if (account.coin) {
                        const usdtCoin = account.coin.find(c => c.coin === 'USDT');
                        if (usdtCoin) {
                            usdtBalance = parseFloat(usdtCoin.walletBalance) || 0;
                        }
                    }
                }

                console.log(`      ✅ CONECTADO - Saldo USDT: ${usdtBalance}`);
                return { success: true, balance: usdtBalance };
            } else {
                console.log(`      ❌ ERRO - ${response.data.retMsg}`);
                return { success: false, error: response.data.retMsg };
            }

        } catch (error) {
            const errorMsg = error.response?.data?.retMsg || error.message;
            console.log(`      ❌ ERRO - ${errorMsg}`);
            return { success: false, error: errorMsg };
        }
    }

    async testarBinance(apiKey, secretKey, environment) {
        if (environment === 'mainnet') {
            console.log(`   🟡 Binance mainnet - Bloqueado no Brasil`);
            return { success: false, error: 'Bloqueado no Brasil' };
        }

        const baseURL = 'https://testnet.binance.vision';

        try {
            console.log(`   🟡 Testando Binance ${environment}...`);
            
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}&recvWindow=5000`;
            const signature = crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
            
            const headers = {
                'X-MBX-APIKEY': apiKey,
                'Content-Type': 'application/json'
            };
            
            const response = await axios.get(
                `${baseURL}/api/v3/account?${queryString}&signature=${signature}`,
                { headers, timeout: 10000 }
            );

            if (response.status === 200) {
                // Verificar saldo USDT
                let usdtBalance = 0;
                if (response.data.balances) {
                    const usdtAsset = response.data.balances.find(b => b.asset === 'USDT');
                    if (usdtAsset) {
                        usdtBalance = parseFloat(usdtAsset.free) || 0;
                    }
                }

                console.log(`      ✅ CONECTADO - Saldo USDT: ${usdtBalance}`);
                return { success: true, balance: usdtBalance };
            } else {
                console.log(`      ❌ ERRO - Status ${response.status}`);
                return { success: false, error: `HTTP ${response.status}` };
            }

        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.message;
            console.log(`      ❌ ERRO - ${errorMsg}`);
            return { success: false, error: errorMsg };
        }
    }

    async executarTeste() {
        console.log('🧪 TESTE SIMPLES DE CONEXÃO - INICIANDO...');
        console.log('==========================================');

        const startTime = new Date();
        await this.detectarIP();

        // Buscar chaves
        const chaves = await this.buscarTodasChaves();

        if (chaves.length === 0) {
            console.log('\n❌ NENHUMA CHAVE ENCONTRADA!');
            console.log('📋 Cadastre chaves primeiro: node cadastrar-chaves-reais.js');
            return;
        }

        console.log('\n🧪 INICIANDO TESTES DE CONEXÃO...');
        console.log('=================================');

        let totalTestes = 0;
        let sucessos = 0;
        let falhas = 0;

        // Agrupar por usuário
        const usuariosChaves = {};
        chaves.forEach(chave => {
            if (!usuariosChaves[chave.user_id]) {
                usuariosChaves[chave.user_id] = {
                    username: chave.username,
                    email: chave.email,
                    chaves: []
                };
            }
            usuariosChaves[chave.user_id].chaves.push(chave);
        });

        // Testar cada usuário
        for (const [userId, userData] of Object.entries(usuariosChaves)) {
            console.log(`\n👤 USUÁRIO: ${userData.username} (${userData.email})`);
            console.log('─'.repeat(60));

            for (const chave of userData.chaves) {
                totalTestes++;
                console.log(`\n🔑 Chave ${chave.key_id}: ${chave.exchange.toUpperCase()} ${chave.environment}`);
                console.log(`   API Key: ${chave.api_key.substring(0, 12)}...`);
                console.log(`   Status atual: ${chave.validation_status || 'PENDING'}`);

                let resultado;
                if (chave.exchange === 'bybit') {
                    resultado = await this.testarBybit(chave.api_key, chave.secret_key, chave.environment);
                } else if (chave.exchange === 'binance') {
                    resultado = await this.testarBinance(chave.api_key, chave.secret_key, chave.environment);
                } else {
                    console.log(`   ⚠️ Exchange não suportada: ${chave.exchange}`);
                    resultado = { success: false, error: 'Exchange não suportada' };
                }

                if (resultado.success) {
                    sucessos++;
                    // Atualizar status no banco
                    await this.atualizarStatus(chave.key_id, 'CONNECTED', null);
                } else {
                    falhas++;
                    // Atualizar status no banco
                    await this.atualizarStatus(chave.key_id, 'FAILED', resultado.error);
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Resumo final
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;

        console.log('\n📊 RESUMO DO TESTE');
        console.log('==================');
        console.log(`⏱️ Duração: ${duration.toFixed(1)}s`);
        console.log(`🧪 Total testado: ${totalTestes} chaves`);
        console.log(`✅ Sucessos: ${sucessos}`);
        console.log(`❌ Falhas: ${falhas}`);
        console.log(`📊 Taxa de sucesso: ${totalTestes > 0 ? (sucessos/totalTestes*100).toFixed(1) : 0}%`);

        if (sucessos > 0) {
            console.log('\n🟢 SISTEMA OPERACIONAL!');
            console.log('📋 Próximo passo: node teste-trade-real.js');
        } else {
            console.log('\n🔴 SISTEMA COM PROBLEMAS!');
            console.log('📋 Verifique:');
            console.log('   1. IPs configurados nas exchanges');
            console.log('   2. Chaves API válidas');
            console.log('   3. Permissões das chaves');
        }
    }

    async atualizarStatus(keyId, status, error) {
        try {
            await pool.query(`
                UPDATE user_api_keys 
                SET validation_status = $1, validation_error = $2, last_validated_at = NOW()
                WHERE id = $3
            `, [status, error, keyId]);
        } catch (err) {
            console.log(`⚠️ Erro ao atualizar status da chave ${keyId}:`, err.message);
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const teste = new TesteConexaoSimples();
    teste.executarTeste()
        .then(() => {
            pool.end();
            console.log('\n🎯 TESTE CONCLUÍDO!');
        })
        .catch(error => {
            console.error('\n❌ ERRO NO TESTE:', error);
            pool.end();
            process.exit(1);
        });
}

module.exports = TesteConexaoSimples;
