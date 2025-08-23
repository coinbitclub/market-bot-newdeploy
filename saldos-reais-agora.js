#!/usr/bin/env node

/**
 * 💰 COLETA DE SALDOS REAIS - EXECUÇÃO IMEDIATA
 * ============================================
 * Coleta os saldos reais das exchanges conectadas
 */

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

// Conexão com banco
const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function coletarSaldosReais() {
    console.log('💰 COLETANDO SALDOS REAIS DAS EXCHANGES');
    console.log('======================================');
    
    try {
        // 1. Conectar ao banco
        console.log('🔗 Conectando ao banco...');
        await pool.query('SELECT NOW()');
        console.log('✅ Conectado com sucesso!');
        
        // 2. Buscar chaves reais
        console.log('\n🔍 Buscando chaves API reais...');
        const chavesQuery = await pool.query(`
            SELECT 
                u.id as user_id,
                u.username,
                u.email,
                uak.id as key_id,
                uak.exchange,
                uak.environment,
                uak.api_key,
                uak.secret_key,
                uak.validation_status,
                uak.last_validated_at
            FROM users u
            JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.is_active = true 
            AND uak.is_active = true
            AND uak.api_key IS NOT NULL
            AND uak.secret_key IS NOT NULL
            ORDER BY u.username, uak.exchange
        `);
        
        const chaves = chavesQuery.rows;
        console.log(`🔑 Encontradas ${chaves.length} chaves para verificação`);
        
        if (chaves.length === 0) {
            console.log('❌ NENHUMA CHAVE ENCONTRADA!');
            console.log('ℹ️ Certifique-se de que há usuários com chaves API cadastradas');
            return false;
        }
        
        // 3. Mostrar chaves encontradas
        console.log('\n📋 CHAVES ENCONTRADAS:');
        console.log('=====================');
        chaves.forEach((chave, index) => {
            console.log(`${index + 1}. ${chave.username} (${chave.email})`);
            console.log(`   Exchange: ${chave.exchange} (${chave.environment})`);
            console.log(`   API Key: ${chave.api_key.substring(0, 10)}...`);
            console.log(`   Status: ${chave.validation_status || 'NÃO VALIDADO'}`);
            console.log(`   Última validação: ${chave.last_validated_at || 'Nunca'}`);
            console.log('');
        });
        
        // 4. Coletar saldos reais
        console.log('💰 COLETANDO SALDOS REAIS...');
        console.log('============================');
        
        let totalUSDGeral = 0;
        let sucessos = 0;
        const resultados = [];
        
        for (const chave of chaves) {
            console.log(`\n🔍 Processando: ${chave.username} - ${chave.exchange} (${chave.environment})`);
            console.log('─'.repeat(70));
            
            try {
                if (chave.exchange === 'bybit') {
                    const saldoBybit = await coletarSaldoBybit(chave.api_key, chave.secret_key, chave.environment);
                    
                    if (saldoBybit.success) {
                        console.log(`✅ SUCESSO! Saldo total: $${saldoBybit.totalUSD}`);
                        console.log(`   💰 USDT: ${saldoBybit.balances.USDT || 0}`);
                        console.log(`   ₿ BTC: ${saldoBybit.balances.BTC || 0}`);
                        console.log(`   ⟠ ETH: ${saldoBybit.balances.ETH || 0}`);
                        console.log(`   🪙 Total de moedas: ${saldoBybit.coinCount}`);
                        
                        totalUSDGeral += parseFloat(saldoBybit.totalUSD);
                        sucessos++;
                        
                        resultados.push({
                            usuario: chave.username,
                            email: chave.email,
                            exchange: chave.exchange,
                            environment: chave.environment,
                            status: 'CONECTADO',
                            saldoUSD: saldoBybit.totalUSD,
                            moedas: saldoBybit.balances,
                            totalMoedas: saldoBybit.coinCount
                        });
                        
                        // Atualizar status no banco
                        await pool.query(`
                            UPDATE user_api_keys 
                            SET validation_status = 'CONNECTED', 
                                last_validated_at = NOW()
                            WHERE id = $1
                        `, [chave.key_id]);
                        
                    } else {
                        console.log(`❌ FALHA: ${saldoBybit.error}`);
                        
                        resultados.push({
                            usuario: chave.username,
                            email: chave.email,
                            exchange: chave.exchange,
                            environment: chave.environment,
                            status: 'ERRO',
                            erro: saldoBybit.error
                        });
                        
                        // Atualizar status de erro no banco
                        await pool.query(`
                            UPDATE user_api_keys 
                            SET validation_status = 'FAILED', 
                                last_validated_at = NOW(),
                                error_details = $2
                            WHERE id = $1
                        `, [chave.key_id, saldoBybit.error]);
                    }
                } else {
                    console.log(`⚠️ Exchange ${chave.exchange} não implementada ainda`);
                }
                
                // Aguardar entre requests para evitar rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.log(`❌ Erro inesperado: ${error.message}`);
            }
        }
        
        // 5. Relatório final
        console.log('\n📊 RELATÓRIO FINAL DE SALDOS REAIS');
        console.log('==================================');
        
        console.log(`✅ Conexões bem-sucedidas: ${sucessos}/${chaves.length}`);
        console.log(`💰 Total USD coletado: $${totalUSDGeral.toFixed(2)}`);
        console.log(`📈 Taxa de sucesso: ${Math.round((sucessos / chaves.length) * 100)}%`);
        
        if (resultados.length > 0) {
            console.log('\n📋 RESUMO DETALHADO:');
            console.log('===================');
            
            resultados.forEach((resultado, index) => {
                console.log(`\n${index + 1}. ${resultado.usuario} (${resultado.email})`);
                console.log(`   Exchange: ${resultado.exchange} (${resultado.environment})`);
                console.log(`   Status: ${resultado.status}`);
                
                if (resultado.status === 'CONECTADO') {
                    console.log(`   💰 Saldo Total: $${resultado.saldoUSD}`);
                    console.log(`   🪙 Moedas disponíveis: ${resultado.totalMoedas}`);
                    
                    if (resultado.moedas) {
                        Object.entries(resultado.moedas).forEach(([moeda, valor]) => {
                            if (valor > 0) {
                                console.log(`      ${moeda}: ${valor}`);
                            }
                        });
                    }
                } else {
                    console.log(`   ❌ Erro: ${resultado.erro}`);
                }
            });
            
            // Mostrar top contas por saldo
            const contasComSaldo = resultados.filter(r => r.status === 'CONECTADO' && r.saldoUSD > 0);
            if (contasComSaldo.length > 0) {
                console.log('\n🏆 TOP CONTAS POR SALDO:');
                console.log('=======================');
                
                contasComSaldo
                    .sort((a, b) => parseFloat(b.saldoUSD) - parseFloat(a.saldoUSD))
                    .forEach((conta, index) => {
                        console.log(`${index + 1}º. ${conta.usuario}: $${conta.saldoUSD} (${conta.exchange})`);
                    });
            }
        }
        
        console.log('\n🎉 COLETA DE SALDOS REAIS CONCLUÍDA!');
        return sucessos > 0;
        
    } catch (error) {
        console.error('❌ Erro na coleta:', error.message);
        return false;
    } finally {
        await pool.end();
    }
}

async function coletarSaldoBybit(apiKey, secretKey, environment = 'mainnet') {
    const baseURL = environment === 'testnet' 
        ? 'https://api-testnet.bybit.com' 
        : 'https://api.bybit.com';
    
    try {
        console.log(`   🔍 Conectando ao Bybit ${environment}...`);
        
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        const params = { accountType: 'UNIFIED' };
        const queryString = new URLSearchParams(params).toString();
        
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
            timeout: 30000
        });

        if (response.data.retCode === 0) {
            const walletList = response.data.result?.list || [];
            let totalUSD = 0;
            const balances = {};
            let coinCount = 0;

            walletList.forEach(wallet => {
                const coins = wallet.coin || [];
                
                coins.forEach(coin => {
                    const balance = parseFloat(coin.walletBalance) || 0;
                    const usdValue = parseFloat(coin.usdValue) || 0;
                    
                    if (balance > 0) {
                        balances[coin.coin] = balance;
                        totalUSD += usdValue;
                        coinCount++;
                    }
                });
            });

            return {
                success: true,
                totalUSD: totalUSD.toFixed(2),
                balances: balances,
                coinCount: coinCount,
                rawData: response.data.result
            };
            
        } else {
            return {
                success: false,
                error: `Código ${response.data.retCode}: ${response.data.retMsg}`
            };
        }

    } catch (error) {
        return {
            success: false,
            error: `Erro de conexão: ${error.message}`
        };
    }
}

// Executar coleta
if (require.main === module) {
    console.log('🚀 INICIANDO COLETA DE SALDOS REAIS...');
    console.log('Timestamp:', new Date().toISOString());
    console.log('');
    
    coletarSaldosReais().then(success => {
        if (success) {
            console.log('\n✅ COLETA CONCLUÍDA COM SUCESSO!');
            process.exit(0);
        } else {
            console.log('\n❌ FALHA NA COLETA');
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Erro fatal:', error.message);
        process.exit(1);
    });
}

module.exports = { coletarSaldosReais };
