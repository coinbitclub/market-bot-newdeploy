/**
 * 💰 DEMONSTRAÇÃO DE LEVANTAMENTO DE SALDOS
 * =======================================
 * Sistema completo para coleta e exibição de saldos em tempo real
 * Última atualização: 2025-08-11 20:10:00
 */

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');
const ccxt = require('ccxt');

class DemonstracaoSaldos {
    constructor() {
        this.pool = new Pool({
            connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });
        
        this.validatedConnections = new Map();
        this.exchangeInstances = new Map();
        this.saldosColetados = [];
        
        console.log('💰 SISTEMA DE DEMONSTRAÇÃO DE SALDOS INICIALIZADO');
    }

    /**
     * 🔍 VALIDAR E CONECTAR BYBIT
     */
    async validarBybit(apiKey, secretKey, environment = 'mainnet') {
        const baseURL = environment === 'testnet' 
            ? 'https://api-testnet.bybit.com' 
            : 'https://api.bybit.com';

        try {
            console.log(`🔍 Validando Bybit ${environment}...`);
            
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
                let saldoDetalhado = {
                    success: true,
                    totalUSD: 0,
                    moedas: [],
                    carteiras: {}
                };

                walletList.forEach(wallet => {
                    const coins = wallet.coin || [];
                    const tipoCarteira = wallet.accountType || 'UNIFIED';
                    
                    saldoDetalhado.carteiras[tipoCarteira] = {
                        moedas: [],
                        totalUSD: 0
                    };

                    coins.forEach(coin => {
                        const saldo = parseFloat(coin.walletBalance) || 0;
                        const valorUSD = parseFloat(coin.usdValue) || 0;
                        
                        if (saldo > 0) {
                            const moedasInfo = {
                                moeda: coin.coin,
                                saldo: saldo,
                                valorUSD: valorUSD,
                                livre: parseFloat(coin.availableToWithdraw) || 0,
                                bloqueado: parseFloat(coin.locked) || 0
                            };
                            
                            saldoDetalhado.moedas.push(moedasInfo);
                            saldoDetalhado.carteiras[tipoCarteira].moedas.push(moedasInfo);
                            saldoDetalhado.carteiras[tipoCarteira].totalUSD += valorUSD;
                            saldoDetalhado.totalUSD += valorUSD;
                        }
                    });
                });

                console.log(`✅ Bybit validado - Total: $${saldoDetalhado.totalUSD.toFixed(2)}`);
                return saldoDetalhado;
                
            } else {
                console.log(`❌ Erro Bybit: ${response.data.retCode} - ${response.data.retMsg}`);
                return {
                    success: false,
                    error: `${response.data.retCode}: ${response.data.retMsg}`
                };
            }

        } catch (error) {
            console.log(`❌ Erro de conexão Bybit: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🔍 VALIDAR E CONECTAR BINANCE
     */
    async validarBinance(apiKey, secretKey, environment = 'mainnet') {
        try {
            console.log(`🔍 Validando Binance ${environment}...`);
            
            const binance = new ccxt.binance({
                apiKey: apiKey,
                secret: secretKey,
                sandbox: environment === 'testnet',
                enableRateLimit: true,
                timeout: 30000
            });

            await binance.loadMarkets();
            const balance = await binance.fetchBalance();
            
            let saldoDetalhado = {
                success: true,
                totalUSD: 0,
                moedas: [],
                carteiras: {
                    spot: { moedas: [], totalUSD: 0 }
                }
            };

            for (const [moeda, info] of Object.entries(balance)) {
                if (moeda !== 'info' && moeda !== 'free' && moeda !== 'used' && moeda !== 'total') {
                    const total = info.total || 0;
                    
                    if (total > 0) {
                        // Estimar valor USD (simplificado - para USDT = 1:1)
                        let valorUSD = 0;
                        if (moeda === 'USDT' || moeda === 'BUSD') {
                            valorUSD = total;
                        } else if (moeda === 'BTC') {
                            valorUSD = total * 45000; // Estimativa
                        } else if (moeda === 'ETH') {
                            valorUSD = total * 2800; // Estimativa
                        } else {
                            valorUSD = total * 1; // Fallback
                        }

                        const moedasInfo = {
                            moeda: moeda,
                            saldo: total,
                            valorUSD: valorUSD,
                            livre: info.free || 0,
                            bloqueado: info.used || 0
                        };

                        saldoDetalhado.moedas.push(moedasInfo);
                        saldoDetalhado.carteiras.spot.moedas.push(moedasInfo);
                        saldoDetalhado.carteiras.spot.totalUSD += valorUSD;
                        saldoDetalhado.totalUSD += valorUSD;
                    }
                }
            }

            console.log(`✅ Binance validado - Total: $${saldoDetalhado.totalUSD.toFixed(2)}`);
            return saldoDetalhado;

        } catch (error) {
            console.log(`❌ Erro de conexão Binance: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🔄 EXECUTAR COLETA COMPLETA DE SALDOS
     */
    async executarColetaCompleta() {
        console.log('\n💰 INICIANDO DEMONSTRAÇÃO DE LEVANTAMENTO DE SALDOS');
        console.log('==================================================');
        
        try {
            // 1. Buscar chaves do banco
            console.log('\n🔍 1. BUSCANDO CHAVES NO BANCO DE DADOS...');
            
            const chaves = await this.pool.query(`
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    uak.id as key_id,
                    uak.exchange,
                    uak.environment,
                    uak.api_key,
                    uak.secret_key,
                    uak.validation_status
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                ORDER BY u.username, uak.exchange
            `);
            
            console.log(`🔑 Encontradas ${chaves.rows.length} chaves para análise de saldos`);
            
            if (chaves.rows.length === 0) {
                console.log('❌ Nenhuma chave encontrada!');
                return false;
            }

            // 2. Validar e coletar saldos
            console.log('\n💰 2. COLETANDO SALDOS EM TEMPO REAL...');
            console.log('======================================');
            
            let totalGeralUSD = 0;
            let sucessos = 0;
            
            for (const chave of chaves.rows) {
                console.log(`\n👤 Processando: ${chave.username} (${chave.exchange} ${chave.environment})`);
                console.log('─'.repeat(60));
                
                try {
                    let saldoResult;
                    
                    if (chave.exchange === 'bybit') {
                        saldoResult = await this.validarBybit(chave.api_key, chave.secret_key, chave.environment);
                    } else if (chave.exchange === 'binance') {
                        saldoResult = await this.validarBinance(chave.api_key, chave.secret_key, chave.environment);
                    } else {
                        console.log(`⚠️ Exchange ${chave.exchange} não suportada`);
                        continue;
                    }
                    
                    if (saldoResult.success) {
                        sucessos++;
                        totalGeralUSD += saldoResult.totalUSD;
                        
                        // Salvar resultado detalhado
                        const saldoCompleto = {
                            usuario: {
                                id: chave.user_id,
                                username: chave.username,
                                email: chave.email
                            },
                            exchange: {
                                nome: chave.exchange,
                                environment: chave.environment,
                                status: 'CONECTADO'
                            },
                            saldos: saldoResult,
                            timestamp: new Date()
                        };
                        
                        this.saldosColetados.push(saldoCompleto);
                        
                        // Exibir detalhes do saldo
                        console.log(`📊 RESUMO DO SALDO:`);
                        console.log(`   💵 Total USD: $${saldoResult.totalUSD.toFixed(2)}`);
                        console.log(`   🪙 Total de moedas: ${saldoResult.moedas.length}`);
                        
                        if (saldoResult.moedas.length > 0) {
                            console.log(`   📋 Detalhamento por moeda:`);
                            saldoResult.moedas.forEach(moeda => {
                                console.log(`      ${moeda.moeda}: ${moeda.saldo} ($${moeda.valorUSD.toFixed(2)})`);
                            });
                        }
                        
                        // Atualizar status no banco
                        await this.pool.query(`
                            UPDATE user_api_keys 
                            SET validation_status = 'CONNECTED', 
                                last_validated_at = NOW()
                            WHERE id = $1
                        `, [chave.key_id]);
                        
                    } else {
                        console.log(`❌ Falha na coleta: ${saldoResult.error}`);
                        
                        await this.pool.query(`
                            UPDATE user_api_keys 
                            SET validation_status = 'FAILED', 
                                last_validated_at = NOW(),
                                error_details = $2
                            WHERE id = $1
                        `, [chave.key_id, saldoResult.error]);
                    }
                    
                } catch (error) {
                    console.log(`❌ Erro inesperado: ${error.message}`);
                }
                
                // Aguardar entre requisições para evitar rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // 3. Gerar relatório final
            console.log('\n📊 3. RELATÓRIO FINAL DE SALDOS');
            console.log('==============================');
            
            console.log(`🎯 Estatísticas Gerais:`);
            console.log(`   ✅ Conexões bem-sucedidas: ${sucessos}/${chaves.rows.length}`);
            console.log(`   💰 Valor total coletado: $${totalGeralUSD.toFixed(2)}`);
            console.log(`   📈 Taxa de sucesso: ${Math.round((sucessos / chaves.rows.length) * 100)}%`);
            
            if (this.saldosColetados.length > 0) {
                console.log(`\n📋 Resumo por usuário:`);
                this.saldosColetados.forEach(saldo => {
                    console.log(`   👤 ${saldo.usuario.username} (${saldo.exchange.nome}): $${saldo.saldos.totalUSD.toFixed(2)}`);
                });
                
                console.log(`\n🏆 Top 3 maiores saldos:`);
                const top3 = this.saldosColetados
                    .sort((a, b) => b.saldos.totalUSD - a.saldos.totalUSD)
                    .slice(0, 3);
                    
                top3.forEach((saldo, index) => {
                    console.log(`   ${index + 1}º. ${saldo.usuario.username}: $${saldo.saldos.totalUSD.toFixed(2)}`);
                });
            }
            
            return sucessos > 0;
            
        } catch (error) {
            console.error('❌ Erro na coleta de saldos:', error.message);
            return false;
        }
    }

    /**
     * 📊 GERAR RELATÓRIO DETALHADO
     */
    async gerarRelatorioDetalhado() {
        console.log('\n📊 GERANDO RELATÓRIO DETALHADO DE SALDOS');
        console.log('=======================================');
        
        const relatorio = {
            timestamp: new Date().toISOString(),
            resumo: {
                totalUsuarios: this.saldosColetados.length,
                totalUSD: this.saldosColetados.reduce((sum, s) => sum + s.saldos.totalUSD, 0),
                exchanges: {}
            },
            detalhes: this.saldosColetados,
            estatisticas: {}
        };
        
        // Agrupar por exchange
        this.saldosColetados.forEach(saldo => {
            const exchange = saldo.exchange.nome;
            if (!relatorio.resumo.exchanges[exchange]) {
                relatorio.resumo.exchanges[exchange] = {
                    usuarios: 0,
                    totalUSD: 0
                };
            }
            relatorio.resumo.exchanges[exchange].usuarios++;
            relatorio.resumo.exchanges[exchange].totalUSD += saldo.saldos.totalUSD;
        });
        
        // Estatísticas
        const valores = this.saldosColetados.map(s => s.saldos.totalUSD);
        relatorio.estatisticas = {
            maiorSaldo: Math.max(...valores),
            menorSaldo: Math.min(...valores),
            saldoMedio: valores.reduce((a, b) => a + b, 0) / valores.length,
            totalMoedas: this.saldosColetados.reduce((sum, s) => sum + s.saldos.moedas.length, 0)
        };
        
        console.log('📄 Relatório gerado com sucesso!');
        console.log(`📊 Dados coletados de ${relatorio.resumo.totalUsuarios} usuários`);
        console.log(`💰 Valor total: $${relatorio.resumo.totalUSD.toFixed(2)}`);
        
        return relatorio;
    }

    /**
     * 🚀 EXECUTAR DEMONSTRAÇÃO COMPLETA
     */
    async executarDemonstracao() {
        try {
            console.log('\n🚀 INICIANDO DEMONSTRAÇÃO COMPLETA DE SALDOS');
            console.log('============================================');
            
            // Testar conexão do banco
            await this.pool.query('SELECT NOW()');
            console.log('✅ Conexão com banco estabelecida');
            
            // Executar coleta
            const coletaOK = await this.executarColetaCompleta();
            
            if (coletaOK) {
                // Gerar relatório
                const relatorio = await this.gerarRelatorioDetalhado();
                
                console.log('\n🎉 DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO!');
                console.log('====================================');
                console.log('✅ Saldos coletados em tempo real');
                console.log('✅ Dados salvos no sistema');
                console.log('✅ Relatório detalhado gerado');
                
                return relatorio;
            } else {
                console.log('\n❌ FALHA NA COLETA DE SALDOS');
                return null;
            }
            
        } catch (error) {
            console.error('❌ Erro na demonstração:', error.message);
            return null;
        } finally {
            await this.pool.end();
        }
    }
}

// Executar demonstração se chamado diretamente
if (require.main === module) {
    const demo = new DemonstracaoSaldos();
    
    demo.executarDemonstracao().then(relatorio => {
        if (relatorio) {
            console.log('\n📋 RELATÓRIO FINAL DISPONÍVEL');
            console.log('Para integração, use os dados coletados no sistema');
        }
        process.exit(relatorio ? 0 : 1);
    }).catch(error => {
        console.error('❌ Erro fatal:', error.message);
        process.exit(1);
    });
}

module.exports = DemonstracaoSaldos;
