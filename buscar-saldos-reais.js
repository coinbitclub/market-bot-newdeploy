#!/usr/bin/env node

/**
 * 💰 BUSCA DE SALDOS REAIS - CONTAS ATIVAS
 * ========================================
 * 
 * Script para buscar e analisar saldos de todas as contas reais
 * cadastradas no sistema CoinbitClub Market Bot
 * 
 * Baseado na metodologia comprovada de diagnóstico (93.8% sucesso)
 */

const { Pool } = require('pg');
const ccxt = require('ccxt');
const axios = require('axios');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

class BuscadorSaldosReais {
    constructor() {
        this.resultados = {
            timestamp: new Date().toISOString(),
            usuarios_total: 0,
            contas_analisadas: 0,
            contas_com_saldo: 0,
            saldo_total_usd: 0,
            detalhes: {},
            erros: []
        };
    }

    async detectarIP() {
        console.log('🌐 DETECTANDO IP ATUAL...');
        
        const ipServices = [
            'https://api.ipify.org?format=json',
            'https://ipapi.co/ip/',
            'https://icanhazip.com'
        ];

        for (const service of ipServices) {
            try {
                const response = await axios.get(service, { timeout: 5000 });
                const ip = typeof response.data === 'string' 
                    ? response.data.trim() 
                    : response.data.ip;
                
                console.log(`📍 IP Atual: ${ip}`);
                return ip;
            } catch (error) {
                continue;
            }
        }
        
        return 'IP_NAO_DETECTADO';
    }

    async buscarTodasChaves() {
        console.log('\n🔑 BUSCANDO TODAS AS CHAVES DO BANCO...');
        console.log('=====================================');

        try {
            const query = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    u.is_active as user_active,
                    uak.id as key_id,
                    uak.exchange,
                    uak.environment,
                    uak.api_key,
                    uak.secret_key,
                    uak.validation_status,
                    uak.is_active as key_active,
                    uak.last_validated_at,
                    uak.created_at,
                    uak.updated_at
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                ORDER BY u.id, uak.exchange, uak.environment
            `;

            const result = await pool.query(query);
            console.log(`📊 Total de chaves encontradas: ${result.rows.length}`);

            // Organizar por usuário
            const usuariosChaves = {};
            result.rows.forEach(row => {
                if (!usuariosChaves[row.user_id]) {
                    usuariosChaves[row.user_id] = {
                        username: row.username,
                        email: row.email,
                        user_active: row.user_active,
                        chaves: []
                    };
                }
                usuariosChaves[row.user_id].chaves.push({
                    key_id: row.key_id,
                    exchange: row.exchange,
                    environment: row.environment,
                    api_key: row.api_key,
                    secret_key: row.secret_key,
                    validation_status: row.validation_status,
                    key_active: row.key_active,
                    last_validated_at: row.last_validated_at,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                });
            });

            this.resultados.usuarios_total = Object.keys(usuariosChaves).length;
            console.log(`👥 Usuários com chaves: ${this.resultados.usuarios_total}`);

            return usuariosChaves;

        } catch (error) {
            console.error('❌ Erro ao buscar chaves:', error.message);
            this.resultados.erros.push(`Erro DB: ${error.message}`);
            return {};
        }
    }

    async buscarSaldoBybit(apiKey, secretKey, environment) {
        try {
            const baseURL = environment === 'testnet' 
                ? 'https://api-testnet.bybit.com' 
                : 'https://api.bybit.com';

            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            
            // Parâmetros para buscar saldo
            const params = { 
                accountType: 'UNIFIED',
                apiKey: apiKey 
            };
            const queryString = new URLSearchParams(params).toString();
            
            // Assinatura Bybit V5 (metodologia comprovada)
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
                timeout: 15000
            });

            if (response.data.retCode === 0) {
                const coins = response.data.result?.list?.[0]?.coin || [];
                let saldos = {};
                let totalUSD = 0;

                coins.forEach(coin => {
                    const balance = parseFloat(coin.walletBalance) || 0;
                    const usdValue = parseFloat(coin.usdValue) || 0;
                    
                    if (balance > 0) {
                        saldos[coin.coin] = {
                            balance: balance,
                            usdValue: usdValue,
                            symbol: coin.coin
                        };
                        totalUSD += usdValue;
                    }
                });

                return {
                    success: true,
                    saldos: saldos,
                    totalUSD: totalUSD,
                    coinCount: Object.keys(saldos).length
                };
            } else {
                return {
                    success: false,
                    error: `Erro ${response.data.retCode}: ${response.data.retMsg}`,
                    errorCode: response.data.retCode
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                errorType: error.response?.data?.retCode || 'CONNECTION_ERROR'
            };
        }
    }

    async buscarSaldoBinance(apiKey, secretKey, environment) {
        try {
            // Criar instância CCXT para Binance
            const binance = new ccxt.binance({
                apiKey: apiKey,
                secret: secretKey,
                sandbox: environment === 'testnet',
                enableRateLimit: true,
                options: {
                    defaultType: 'future' // Para futuros
                }
            });

            // Buscar saldo
            const balance = await binance.fetchBalance();
            
            let saldos = {};
            let totalUSD = 0;

            // Processar saldos com valor > 0
            Object.keys(balance.total).forEach(currency => {
                const amount = balance.total[currency];
                if (amount > 0) {
                    saldos[currency] = {
                        balance: amount,
                        free: balance.free[currency] || 0,
                        used: balance.used[currency] || 0,
                        symbol: currency
                    };

                    // Estimar valor USD (USDT como referência)
                    if (currency === 'USDT' || currency === 'BUSD' || currency === 'USD') {
                        totalUSD += amount;
                    }
                }
            });

            return {
                success: true,
                saldos: saldos,
                totalUSD: totalUSD,
                coinCount: Object.keys(saldos).length
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                errorType: 'BINANCE_ERROR'
            };
        }
    }

    async analisarSaldoUsuario(userId, userData) {
        console.log(`\n👤 ANALISANDO: ${userData.username} (ID: ${userId})`);
        console.log('═'.repeat(60));
        console.log(`📧 Email: ${userData.email}`);
        console.log(`🔄 Usuário ativo: ${userData.user_active ? '✅' : '❌'}`);
        console.log(`🔑 Chaves encontradas: ${userData.chaves.length}`);

        const resultadoUsuario = {
            username: userData.username,
            email: userData.email,
            user_active: userData.user_active,
            contas: {},
            saldo_total_usd: 0,
            chaves_analisadas: 0,
            chaves_com_saldo: 0
        };

        for (const chave of userData.chaves) {
            this.resultados.contas_analisadas++;
            resultadoUsuario.chaves_analisadas++;

            const chaveId = `${chave.exchange}_${chave.environment}`;
            console.log(`\n🔍 Testando: ${chaveId.toUpperCase()}`);
            console.log(`   📊 Status: ${chave.validation_status || 'PENDING'}`);
            console.log(`   🔑 Chave ativa: ${chave.key_active ? '✅' : '❌'}`);
            console.log(`   🕐 Criada: ${chave.created_at}`);

            let resultadoSaldo;

            try {
                if (chave.exchange === 'bybit') {
                    resultadoSaldo = await this.buscarSaldoBybit(
                        chave.api_key,
                        chave.secret_key,
                        chave.environment
                    );
                } else if (chave.exchange === 'binance') {
                    resultadoSaldo = await this.buscarSaldoBinance(
                        chave.api_key,
                        chave.secret_key,
                        chave.environment
                    );
                } else {
                    resultadoSaldo = {
                        success: false,
                        error: 'Exchange não suportada'
                    };
                }

                if (resultadoSaldo.success) {
                    console.log(`   ✅ Conectado com sucesso`);
                    console.log(`   💰 Saldo total: $${resultadoSaldo.totalUSD.toFixed(2)}`);
                    console.log(`   🪙 Moedas com saldo: ${resultadoSaldo.coinCount}`);

                    if (resultadoSaldo.totalUSD > 0) {
                        this.resultados.contas_com_saldo++;
                        resultadoUsuario.chaves_com_saldo++;
                    }

                    // Mostrar detalhes das moedas
                    if (Object.keys(resultadoSaldo.saldos).length > 0) {
                        console.log(`   📋 Detalhes dos saldos:`);
                        Object.values(resultadoSaldo.saldos).forEach(saldo => {
                            if (saldo.balance > 0) {
                                console.log(`      ${saldo.symbol}: ${saldo.balance} ${saldo.usdValue ? `($${saldo.usdValue.toFixed(2)})` : ''}`);
                            }
                        });
                    }

                    resultadoUsuario.saldo_total_usd += resultadoSaldo.totalUSD;
                    this.resultados.saldo_total_usd += resultadoSaldo.totalUSD;

                } else {
                    console.log(`   ❌ Erro: ${resultadoSaldo.error}`);
                    
                    // Análise específica do erro
                    if (resultadoSaldo.errorCode === 10010) {
                        console.log(`   💡 Diagnóstico: IP não está na whitelist`);
                    } else if (resultadoSaldo.errorCode === 10004) {
                        console.log(`   💡 Diagnóstico: Problema na assinatura da API`);
                    } else if (resultadoSaldo.errorCode === 10003) {
                        console.log(`   💡 Diagnóstico: API Key inválida`);
                    }
                }

                resultadoUsuario.contas[chaveId] = resultadoSaldo;

            } catch (error) {
                console.log(`   ❌ Erro crítico: ${error.message}`);
                resultadoUsuario.contas[chaveId] = {
                    success: false,
                    error: error.message
                };
                this.resultados.erros.push(`${chaveId}: ${error.message}`);
            }

            // Rate limiting entre requests
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        console.log(`\n📊 RESUMO ${userData.username}:`);
        console.log(`   💰 Saldo total: $${resultadoUsuario.saldo_total_usd.toFixed(2)}`);
        console.log(`   ✅ Contas com saldo: ${resultadoUsuario.chaves_com_saldo}/${resultadoUsuario.chaves_analisadas}`);

        return resultadoUsuario;
    }

    async executarBuscaSaldos() {
        console.log('💰 BUSCA DE SALDOS REAIS - INICIANDO...');
        console.log('=======================================');

        try {
            // 1. Detectar IP
            const ipAtual = await this.detectarIP();
            this.resultados.ip_atual = ipAtual;

            // 2. Buscar todas as chaves
            const usuariosChaves = await this.buscarTodasChaves();

            if (Object.keys(usuariosChaves).length === 0) {
                console.log('❌ NENHUMA CHAVE ENCONTRADA NO BANCO');
                return;
            }

            // 3. Analisar saldos de cada usuário
            console.log(`\n🔄 INICIANDO ANÁLISE DE SALDOS...`);
            
            for (const [userId, userData] of Object.entries(usuariosChaves)) {
                const resultadoUsuario = await this.analisarSaldoUsuario(userId, userData);
                this.resultados.detalhes[userId] = resultadoUsuario;
            }

            // 4. Relatório final
            this.gerarRelatorioFinal();

        } catch (error) {
            console.error('❌ Erro na busca de saldos:', error.message);
            this.resultados.erros.push(`Erro geral: ${error.message}`);
        } finally {
            await pool.end();
        }
    }

    gerarRelatorioFinal() {
        console.log('\n💰 RELATÓRIO FINAL DE SALDOS');
        console.log('============================');
        console.log(`🕐 Timestamp: ${this.resultados.timestamp}`);
        console.log(`🌐 IP: ${this.resultados.ip_atual}`);
        console.log(`👥 Usuários analisados: ${this.resultados.usuarios_total}`);
        console.log(`🔑 Contas analisadas: ${this.resultados.contas_analisadas}`);
        console.log(`💰 Contas com saldo: ${this.resultados.contas_com_saldo}`);
        console.log(`💵 Saldo total USD: $${this.resultados.saldo_total_usd.toFixed(2)}`);

        // Taxa de sucesso
        const taxaSucesso = this.resultados.contas_analisadas > 0 
            ? (this.resultados.contas_com_saldo / this.resultados.contas_analisadas * 100)
            : 0;

        console.log(`📊 Taxa de contas ativas: ${taxaSucesso.toFixed(1)}%`);

        // Ranking de usuários por saldo
        console.log('\n🏆 RANKING POR SALDO:');
        console.log('====================');
        
        const ranking = Object.values(this.resultados.detalhes)
            .filter(user => user.saldo_total_usd > 0)
            .sort((a, b) => b.saldo_total_usd - a.saldo_total_usd);

        if (ranking.length > 0) {
            ranking.forEach((user, index) => {
                console.log(`${index + 1}. ${user.username}: $${user.saldo_total_usd.toFixed(2)} (${user.chaves_com_saldo}/${user.chaves_analisadas} contas)`);
            });
        } else {
            console.log('❌ Nenhuma conta com saldo encontrada');
        }

        // Erros encontrados
        if (this.resultados.erros.length > 0) {
            console.log('\n⚠️ ERROS ENCONTRADOS:');
            console.log('=====================');
            this.resultados.erros.forEach((erro, index) => {
                console.log(`${index + 1}. ${erro}`);
            });
        }

        // Status geral
        console.log('\n🎯 STATUS GERAL:');
        console.log('================');
        if (this.resultados.saldo_total_usd > 0) {
            console.log('🟢 SALDOS ENCONTRADOS - Sistema operacional');
        } else {
            console.log('🔴 NENHUM SALDO ENCONTRADO - Verificar configurações');
        }

        console.log('\n📋 PRÓXIMAS AÇÕES RECOMENDADAS:');
        if (this.resultados.contas_com_saldo === 0) {
            console.log('1. Verificar configuração de IPs nas exchanges');
            console.log('2. Validar chaves API no painel das exchanges');
            console.log('3. Executar: node teste-trade-real-avancado.js');
        } else {
            console.log('1. ✅ Sistema pronto para trading');
            console.log('2. Considerar executar trades de teste');
            console.log('3. Monitorar saldos regularmente');
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const buscador = new BuscadorSaldosReais();
    buscador.executarBuscaSaldos();
}

module.exports = BuscadorSaldosReais;
