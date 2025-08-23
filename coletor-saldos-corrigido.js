#!/usr/bin/env node

/**
 * 🔄 COLETOR DE SALDOS CORRIGIDO
 * 
 * Corrige o problema de $0.00 usando as colunas corretas do banco
 */

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

class FixedBalanceCollector {
    constructor() {
        // URLs das exchanges baseadas no ambiente
        this.exchangeUrls = {
            binance: {
                testnet: 'https://testnet.binance.vision/api/v3',
                mainnet: 'https://api.binance.com/api/v3'
            },
            bybit: {
                testnet: 'https://api-testnet.bybit.com',
                mainnet: 'https://api.bybit.com'
            }
        };
    }

    // Criar assinatura para Bybit
    createBybitSignature(params, secret) {
        const timestamp = Date.now().toString();
        params.timestamp = timestamp;
        params.recv_window = '5000';
        
        const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
        const signature = crypto.createHmac('sha256', secret).update(sortedParams).digest('hex');
        
        return { ...params, sign: signature };
    }

    // Criar assinatura para Binance
    createBinanceSignature(queryString, secret) {
        return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
    }

    // Coletar saldo Bybit
    async getBybitBalance(apiKey, apiSecret, environment = 'testnet') {
        try {
            const baseUrl = this.exchangeUrls.bybit[environment];
            console.log(`      🌐 Conectando: ${baseUrl}`);

            const params = {
                api_key: apiKey,
                coin: 'USDT'
            };

            const signedParams = this.createBybitSignature(params, apiSecret);
            const queryString = Object.keys(signedParams).map(key => `${key}=${signedParams[key]}`).join('&');

            const response = await axios.get(`${baseUrl}/v2/private/wallet/balance?${queryString}`, {
                timeout: 10000
            });

            if (response.data && response.data.result && response.data.result.USDT) {
                const balance = parseFloat(response.data.result.USDT.available_balance || 0);
                console.log(`      ✅ Saldo coletado: $${balance.toFixed(2)}`);
                return balance;
            } else {
                console.log(`      ⚠️ Resposta inesperada:`, response.data);
                return 0;
            }

        } catch (error) {
            console.log(`      ❌ Bybit (${environment}): ${error.message}`);
            return 0;
        }
    }

    // Coletar saldo Binance
    async getBinanceBalance(apiKey, apiSecret, environment = 'testnet') {
        try {
            const baseUrl = this.exchangeUrls.binance[environment];
            console.log(`      🌐 Conectando: ${baseUrl}`);

            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}`;
            const signature = this.createBinanceSignature(queryString, apiSecret);

            const response = await axios.get(`${baseUrl}/account?${queryString}&signature=${signature}`, {
                headers: { 'X-MBX-APIKEY': apiKey },
                timeout: 10000
            });

            if (response.data && response.data.balances) {
                const usdtBalance = response.data.balances.find(b => b.asset === 'USDT');
                const balance = parseFloat(usdtBalance?.free || 0);
                console.log(`      ✅ Saldo coletado: $${balance.toFixed(2)}`);
                return balance;
            } else {
                console.log(`      ⚠️ Resposta inesperada:`, response.data);
                return 0;
            }

        } catch (error) {
            console.log(`      ❌ Binance (${environment}): ${error.message}`);
            return 0;
        }
    }

    // Executar coleta corrigida
    async executeCorrectCollection() {
        try {
            console.log('🔄 COLETA DE SALDOS CORRIGIDA');
            console.log('=============================');
            
            // Query corrigida usando as colunas certas
            const users = await pool.query(`
                SELECT 
                    id, 
                    username,
                    account_type,
                    testnet_mode,
                    CASE 
                        WHEN bybit_api_key IS NOT NULL THEN 'bybit'
                        WHEN binance_api_key IS NOT NULL THEN 'binance'
                    END as exchange,
                    CASE 
                        WHEN bybit_api_key IS NOT NULL THEN bybit_api_key
                        WHEN binance_api_key IS NOT NULL THEN binance_api_key
                    END as api_key,
                    CASE 
                        WHEN bybit_api_secret IS NOT NULL THEN bybit_api_secret
                        WHEN binance_secret_key IS NOT NULL THEN binance_secret_key
                    END as api_secret
                FROM users 
                WHERE (bybit_api_key IS NOT NULL OR binance_api_key IS NOT NULL)
                AND (ativo = true OR is_active = true)
                ORDER BY id
            `);

            if (users.rows.length === 0) {
                console.log('❌ Nenhum usuário com chaves API válidas encontrado');
                return;
            }

            console.log(`💰 Coletando saldos de ${users.rows.length} configurações...\n`);

            const results = [];
            let totalGeral = 0;

            for (const user of users.rows) {
                console.log(`👤 USUÁRIO ${user.id} (${user.username}) - ${user.exchange.toUpperCase()}:`);
                console.log(`      📋 Tipo: ${user.account_type} | Testnet: ${user.testnet_mode}`);
                
                // Verificar se tem chave e secret
                if (!user.api_key || !user.api_secret) {
                    console.log(`      ❌ Chaves incompletas (key: ${!!user.api_key}, secret: ${!!user.api_secret})`);
                    continue;
                }
                
                let balance = 0;
                
                // Determinar ambiente baseado no account_type
                const environment = user.account_type === 'testnet' || user.testnet_mode ? 'testnet' : 'mainnet';
                console.log(`      🏷️ Ambiente: ${environment}`);
                
                if (user.exchange.toLowerCase() === 'binance') {
                    balance = await this.getBinanceBalance(user.api_key, user.api_secret, environment);
                } else if (user.exchange.toLowerCase() === 'bybit') {
                    balance = await this.getBybitBalance(user.api_key, user.api_secret, environment);
                }
                
                results.push({
                    userId: user.id,
                    username: user.username,
                    exchange: user.exchange,
                    balance: balance,
                    environment: environment
                });
                
                totalGeral += balance;
                console.log('');
            }

            // Mostrar resumo
            console.log('📊 RESUMO DA COLETA CORRIGIDA:');
            console.log('==============================');
            
            results.forEach(result => {
                console.log(`ID ${result.userId} (${result.username}) - ${result.exchange}: $${result.balance.toFixed(2)} (${result.environment})`);
            });
            
            console.log(`\n💎 TOTAL GERAL: $${totalGeral.toFixed(2)}`);
            
            if (totalGeral > 0) {
                console.log('\n✅ PROBLEMA RESOLVIDO! Saldos reais coletados com sucesso');
            } else {
                console.log('\n⚠️ Ainda retornando $0.00 - verificar chaves de API');
            }

        } catch (error) {
            console.error('❌ Erro na coleta:', error.message);
        }
    }
}

// Executar teste
if (require.main === module) {
    const collector = new FixedBalanceCollector();
    
    collector.executeCorrectCollection().then(() => {
        console.log('\n🎯 Teste de coleta finalizado');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Erro:', error);
        process.exit(1);
    });
}

module.exports = FixedBalanceCollector;
