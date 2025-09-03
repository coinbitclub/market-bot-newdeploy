/**
 * 🧪 TESTE DE TRADE REAL - METODOLOGIA COMPROVADA
 * ==============================================
 * 
 * Script baseado na metodologia que alcançou 93.8% de sucesso
 * Inclui diagnóstico avançado Bybit API com detecção de problemas
 * 
 * Baseado no guia: RESOLVENDO PROBLEMAS DE CONEXÃO BYBIT API
 */

const { Pool } = require('pg');
const ccxt = require('ccxt');
const axios = require('axios');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class TesteTradeRealAvancado {
    constructor() {
        this.currentIP = null;
        this.expectedIPs = [
            '131.0.31.147',     // Railway
            '132.255.160.131'   // IP atual detectado
        ];
        
        // Códigos de erro baseados na metodologia comprovada (93.8% sucesso)
        this.ERROR_CODES = {
            10010: {
                problem: 'IP não está na whitelist',
                solution: 'Adicionar IP atual na whitelist do painel Bybit',
                critical: true,
                instructions: [
                    'Acesse: https://www.bybit.com/app/user/api-management',
                    'Edite sua chave API',
                    'Na seção "IP Restrictions"',
                    'Adicione o IP atual',
                    'Aguarde 5-10 minutos'
                ]
            },
            10004: {
                problem: 'Erro de assinatura - API Secret incorreto',
                solution: 'Verificar se API Secret está correto e geração de assinatura',
                critical: true,
                instructions: [
                    'Verificar ordem dos parâmetros na assinatura',
                    'Confirmar API Secret correto',
                    'Usar timestamp em milliseconds',
                    'Verificar recv_window'
                ]
            },
            10003: {
                problem: 'API Key inválida',
                solution: 'Verificar se API Key está correta',
                critical: true
            },
            33004: {
                problem: 'Permissões insuficientes da API Key',
                solution: 'Habilitar permissões necessárias no painel Bybit',
                critical: false,
                instructions: [
                    'Habilitar Read + Trade + Transfer',
                    'Salvar configuração',
                    'Aguardar propagação'
                ]
            }
        };
    }

    /**
     * 🌐 DETECÇÃO DE IP MÚLTIPLAS FONTES (metodologia comprovada)
     */
    async detectarIPAvancado() {
        console.log('🌐 DETECTANDO IP ATUAL (MÚLTIPLAS FONTES)...');
        console.log('===========================================');
        
        const ipServices = [
            { url: 'https://api.ipify.org?format=json', type: 'json' },
            { url: 'https://ipapi.co/ip/', type: 'text' },
            { url: 'https://icanhazip.com', type: 'text' },
            { url: 'https://ifconfig.me/ip', type: 'text' }
        ];

        for (const service of ipServices) {
            try {
                console.log(`   🔍 Testando ${service.url}...`);
                const response = await axios.get(service.url, { timeout: 5000 });
                
                const ip = service.type === 'json' 
                    ? response.data.ip
                    : response.data.trim();
                
                if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
                    this.currentIP = ip;
                    console.log(`📍 IP detectado: ${this.currentIP}`);
                    
                    // Verificar autorização
                    if (this.expectedIPs.includes(this.currentIP)) {
                        console.log(`✅ IP AUTORIZADO (configurado na whitelist)`);
                    } else {
                        console.log(`⚠️ IP NÃO AUTORIZADO`);
                        console.log(`📋 IPs configurados: ${this.expectedIPs.join(', ')}`);
                        console.log(`🔧 Ação necessária: Adicionar ${this.currentIP} na whitelist`);
                    }
                    
                    return this.currentIP;
                }
            } catch (error) {
                console.log(`   ❌ Falha: ${error.message}`);
                continue;
            }
        }
        
        console.error('❌ Erro ao detectar IP de todas as fontes');
        return null;
    }

    /**
     * 🔍 DIAGNÓSTICO AVANÇADO BYBIT (baseado na metodologia 93.8%)
     */
    async diagnosticarBybitCompleto(apiKey, secretKey, environment) {
        console.log(`\n🔍 DIAGNÓSTICO COMPLETO BYBIT ${environment.toUpperCase()}`);
        console.log('='.repeat(55));

        const baseURL = environment === 'testnet' 
            ? 'https://api-testnet.bybit.com' 
            : 'https://api.bybit.com';

        const diagnostico = {
            conectividade: { status: false, details: null },
            autenticacao: { status: false, details: null },
            permissoes: { status: false, details: null },
            saldo: { status: false, details: null },
            mercados: { status: false, details: null },
            error_analysis: null,
            success_rate: 0
        };

        try {
            // 1. TESTE DE CONECTIVIDADE BÁSICA
            console.log('📡 [1/5] Conectividade básica...');
            try {
                const timeResponse = await axios.get(`${baseURL}/v5/market/time`, { 
                    timeout: 10000,
                    headers: { 'User-Agent': 'CoinbitClub-DiagnosticoPro/1.0' }
                });
                
                if (timeResponse.data) {
                    diagnostico.conectividade.status = true;
                    diagnostico.conectividade.details = {
                        server_time: timeResponse.data.result?.timeNano,
                        response_time: timeResponse.headers['x-response-time'] || 'N/A'
                    };
                    console.log('      ✅ Conectividade OK');
                    console.log(`      🕐 Server time: ${new Date(parseInt(timeResponse.data.result?.timeNano) / 1000000).toISOString()}`);
                }
            } catch (connError) {
                console.log(`      ❌ Falha na conectividade: ${connError.message}`);
                diagnostico.conectividade.details = { error: connError.message };
            }

            // 2. TESTE DE AUTENTICAÇÃO (assinatura correta Bybit V5)
            console.log('🔐 [2/5] Autenticação com assinatura V5...');
            try {
                const timestamp = Date.now().toString();
                const recvWindow = '5000';
                
                // Parâmetros para buscar saldo
                const params = { accountType: 'UNIFIED', apiKey: apiKey };
                const queryString = new URLSearchParams(params).toString();
                
                // CRÍTICO: Ordem específica do Bybit V5 (metodologia comprovada)
                const signPayload = timestamp + apiKey + recvWindow + queryString;
                const signature = crypto.createHmac('sha256', secretKey).update(signPayload).digest('hex');
                
                const headers = {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-SIGN-TYPE': '2',
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json',
                    'User-Agent': 'CoinbitClub-DiagnosticoPro/1.0'
                };

                const authResponse = await axios.get(`${baseURL}/v5/account/wallet-balance?${queryString}`, {
                    headers,
                    timeout: 15000
                });

                if (authResponse.data.retCode === 0) {
                    diagnostico.autenticacao.status = true;
                    diagnostico.saldo.status = true;
                    
                    const balanceInfo = this.extrairSaldoBybit(authResponse.data);
                    diagnostico.saldo.details = balanceInfo;
                    
                    console.log('      ✅ Autenticação bem-sucedida');
                    console.log(`      💰 Saldo USDT: ${balanceInfo.usdt}`);
                    console.log(`      📊 Total USD: $${balanceInfo.totalUSD}`);
                    console.log(`      🏦 Moedas na conta: ${balanceInfo.coinCount}`);
                    
                } else {
                    diagnostico.error_analysis = {
                        code: authResponse.data.retCode,
                        message: authResponse.data.retMsg,
                        diagnosis: this.ERROR_CODES[authResponse.data.retCode]
                    };
                    
                    console.log(`      ❌ Erro ${authResponse.data.retCode}: ${authResponse.data.retMsg}`);
                    
                    if (diagnostico.error_analysis.diagnosis) {
                        console.log(`      🔍 Problema: ${diagnostico.error_analysis.diagnosis.problem}`);
                        console.log(`      🔧 Solução: ${diagnostico.error_analysis.diagnosis.solution}`);
                    }
                }
                
            } catch (authError) {
                console.log(`      ❌ Erro de autenticação: ${authError.message}`);
                
                if (authError.response?.data) {
                    const errorData = authError.response.data;
                    diagnostico.error_analysis = {
                        code: errorData.retCode,
                        message: errorData.retMsg,
                        diagnosis: this.ERROR_CODES[errorData.retCode]
                    };
                }
            }

            // 3. TESTE DE PERMISSÕES
            console.log('🔑 [3/5] Verificando permissões da API...');
            try {
                const timestamp = Date.now().toString();
                const signPayload = timestamp + apiKey + '5000';
                const signature = crypto.createHmac('sha256', secretKey).update(signPayload).digest('hex');
                
                const permHeaders = {
                    'X-BAPI-API-KEY': apiKey,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-SIGN-TYPE': '2',
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-RECV-WINDOW': '5000',
                    'Content-Type': 'application/json'
                };

                const permResponse = await axios.get(`${baseURL}/v5/user/query-api`, {
                    headers: permHeaders,
                    timeout: 10000
                });
                
                if (permResponse.data.retCode === 0) {
                    diagnostico.permissoes.status = true;
                    const permissions = permResponse.data.result?.permissions || [];
                    diagnostico.permissoes.details = { permissions };
                    
                    console.log(`      ✅ Permissões obtidas: ${permissions.join(', ')}`);
                    
                    // Verificar permissões essenciais
                    const essentialPerms = ['SpotTrade', 'DerivativesTrade'];
                    const hasEssential = essentialPerms.some(perm => permissions.includes(perm));
                    
                    if (hasEssential) {
                        console.log(`      ✅ Permissões de trading presentes`);
                    } else {
                        console.log(`      ⚠️ Permissões de trading podem estar ausentes`);
                    }
                } else {
                    console.log(`      ⚠️ Não foi possível obter permissões: ${permResponse.data.retMsg}`);
                }
            } catch (permError) {
                console.log(`      ⚠️ Erro ao verificar permissões: ${permError.message}`);
            }

            // 4. TESTE DE DADOS DE MERCADO
            console.log('📈 [4/5] Testando acesso a dados de mercado...');
            try {
                const tickerResponse = await axios.get(`${baseURL}/v5/market/tickers?category=linear&symbol=BTCUSDT`, {
                    timeout: 10000,
                    headers: { 'User-Agent': 'CoinbitClub-DiagnosticoPro/1.0' }
                });
                
                if (tickerResponse.data.retCode === 0) {
                    diagnostico.mercados.status = true;
                    const btcData = tickerResponse.data.result?.list?.[0];
                    diagnostico.mercados.details = {
                        btc_price: btcData?.lastPrice,
                        volume_24h: btcData?.volume24h
                    };
                    
                    console.log(`      ✅ Dados de mercado OK`);
                    console.log(`      📈 BTC/USDT: $${btcData?.lastPrice}`);
                    console.log(`      📊 Volume 24h: ${btcData?.volume24h}`);
                } else {
                    console.log(`      ⚠️ Problema com dados de mercado`);
                }
            } catch (marketError) {
                console.log(`      ⚠️ Erro nos dados de mercado: ${marketError.message}`);
            }

            // 5. TESTE CCXT INTEGRATION
            console.log('🔧 [5/5] Testando integração CCXT...');
            try {
                const ccxtBybit = new ccxt.bybit({
                    apiKey: apiKey,
                    secret: secretKey,
                    sandbox: environment === 'testnet',
                    enableRateLimit: true,
                    options: { defaultType: 'linear' }
                });

                const markets = await ccxtBybit.loadMarkets();
                const ticker = await ccxtBybit.fetchTicker('BTC/USDT');
                
                console.log(`      ✅ CCXT funcionando - ${Object.keys(markets).length} mercados`);
                console.log(`      📈 BTC via CCXT: $${ticker.last}`);
                
            } catch (ccxtError) {
                console.log(`      ❌ Erro CCXT: ${ccxtError.message}`);
            }

        } catch (error) {
            console.log(`❌ ERRO CRÍTICO NO DIAGNÓSTICO: ${error.message}`);
        }

        // CÁLCULO DA TAXA DE SUCESSO (metodologia comprovada)
        const testes = [
            diagnostico.conectividade.status,
            diagnostico.autenticacao.status,
            diagnostico.permissoes.status,
            diagnostico.saldo.status,
            diagnostico.mercados.status
        ];
        
        diagnostico.success_rate = (testes.filter(Boolean).length / testes.length) * 100;

        // RELATÓRIO FINAL
        console.log(`\n📊 RELATÓRIO FINAL DO DIAGNÓSTICO:`);
        console.log('='.repeat(40));
        console.log(`🎯 Taxa de sucesso: ${diagnostico.success_rate.toFixed(1)}%`);
        console.log(`📡 Conectividade: ${diagnostico.conectividade.status ? '✅ OK' : '❌ FALHA'}`);
        console.log(`🔐 Autenticação: ${diagnostico.autenticacao.status ? '✅ OK' : '❌ FALHA'}`);
        console.log(`🔑 Permissões: ${diagnostico.permissoes.status ? '✅ OK' : '❌ FALHA'}`);
        console.log(`💰 Acesso ao saldo: ${diagnostico.saldo.status ? '✅ OK' : '❌ FALHA'}`);
        console.log(`📈 Dados de mercado: ${diagnostico.mercados.status ? '✅ OK' : '❌ FALHA'}`);

        // STATUS FINAL
        if (diagnostico.success_rate >= 80) {
            console.log(`\n🟢 STATUS: PLENAMENTE OPERACIONAL (${diagnostico.success_rate.toFixed(1)}%)`);
        } else if (diagnostico.success_rate >= 60) {
            console.log(`\n🟡 STATUS: OPERACIONAL COM RESTRIÇÕES (${diagnostico.success_rate.toFixed(1)}%)`);
        } else {
            console.log(`\n🔴 STATUS: CRÍTICO - REQUER ATENÇÃO (${diagnostico.success_rate.toFixed(1)}%)`);
        }

        // INSTRUÇÕES DE CORREÇÃO
        if (diagnostico.error_analysis && diagnostico.error_analysis.diagnosis) {
            console.log(`\n🔧 INSTRUÇÕES DE CORREÇÃO:`);
            const diagnosis = diagnostico.error_analysis.diagnosis;
            
            if (diagnosis.instructions) {
                diagnosis.instructions.forEach((instruction, index) => {
                    console.log(`   ${index + 1}. ${instruction}`);
                });
            } else {
                console.log(`   💡 ${diagnosis.solution}`);
            }
            
            if (diagnostico.error_analysis.code === 10010 && this.currentIP) {
                console.log(`\n📝 AÇÃO ESPECÍFICA PARA SEU IP:`);
                console.log(`   Adicionar na whitelist: ${this.currentIP}`);
            }
        }

        return {
            success: diagnostico.success_rate >= 75,
            successRate: diagnostico.success_rate,
            details: diagnostico,
            needsAction: diagnostico.error_analysis !== null
        };
    }

    /**
     * 💰 EXTRAÇÃO DE SALDO BYBIT
     */
    extrairSaldoBybit(data) {
        try {
            const coins = data.result?.list?.[0]?.coin || [];
            let usdtBalance = 0;
            let totalUSD = 0;

            coins.forEach(coin => {
                if (coin.coin === 'USDT') {
                    usdtBalance = parseFloat(coin.walletBalance) || 0;
                }
                totalUSD += parseFloat(coin.usdValue) || 0;
            });

            return {
                usdt: usdtBalance.toFixed(4),
                totalUSD: totalUSD.toFixed(2),
                coinCount: coins.length,
                coins: coins.filter(c => parseFloat(c.walletBalance) > 0).map(c => ({
                    coin: c.coin,
                    balance: parseFloat(c.walletBalance),
                    usdValue: parseFloat(c.usdValue)
                }))
            };
        } catch (error) {
            return { usdt: '0.0000', totalUSD: '0.00', coinCount: 0, coins: [] };
        }
    }

    /**
     * 🔑 BUSCAR CHAVES DO BANCO COM DETALHES
     */
    async buscarChavesCompletas() {
        console.log('\n🔑 BUSCANDO CHAVES NO BANCO (ANÁLISE COMPLETA)...');
        console.log('==================================================');

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
                    uak.validation_status,
                    uak.validation_error,
                    uak.last_validated_at,
                    uak.created_at
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                ORDER BY u.id, uak.exchange, uak.environment
            `;

            const result = await pool.query(query);
            console.log(`📊 Total de chaves encontradas: ${result.rows.length}`);

            if (result.rows.length === 0) {
                console.log('❌ NENHUMA CHAVE ENCONTRADA!');
                console.log('📋 Ações necessárias:');
                console.log('   1. Cadastrar chaves: node cadastrar-chaves-reais.js');
                console.log('   2. Verificar banco: node verificar-banco-atual.js');
                return {};
            }

            const chavesAgrupadas = {};
            result.rows.forEach(row => {
                if (!chavesAgrupadas[row.user_id]) {
                    chavesAgrupadas[row.user_id] = {
                        username: row.username,
                        email: row.email,
                        chaves: []
                    };
                }
                chavesAgrupadas[row.user_id].chaves.push({
                    key_id: row.key_id,
                    exchange: row.exchange,
                    environment: row.environment,
                    api_key: row.api_key,
                    secret_key: row.secret_key,
                    validation_status: row.validation_status || 'PENDING',
                    validation_error: row.validation_error,
                    last_validated_at: row.last_validated_at,
                    created_at: row.created_at
                });
            });

            // Exibir resumo detalhado
            console.log('\n📋 RESUMO DAS CHAVES ENCONTRADAS:');
            console.log('=================================');
            for (const [userId, userData] of Object.entries(chavesAgrupadas)) {
                console.log(`\n👤 ${userData.username} (${userData.email}) - ID: ${userId}`);
                userData.chaves.forEach((chave, index) => {
                    const statusIcon = chave.validation_status === 'CONNECTED' ? '✅' : 
                                     chave.validation_status === 'FAILED' ? '❌' : '⏳';
                    console.log(`  ${index + 1}. ${statusIcon} ${chave.exchange.toUpperCase()} ${chave.environment}`);
                    console.log(`     🔑 Key ID: ${chave.key_id} | API: ${chave.api_key.substring(0, 12)}...`);
                    console.log(`     📊 Status: ${chave.validation_status || 'PENDING'}`);
                    if (chave.validation_error) {
                        console.log(`     ❌ Erro: ${chave.validation_error}`);
                    }
                    console.log(`     📅 Criada: ${chave.created_at}`);
                });
            }

            console.log(`\n📊 ESTATÍSTICAS: ${Object.keys(chavesAgrupadas).length} usuários, ${result.rows.length} chaves`);
            return chavesAgrupadas;

        } catch (error) {
            console.error('❌ Erro ao buscar chaves:', error.message);
            return {};
        }
    }

    /**
     * 🚀 EXECUTAR TESTE COMPLETO COM METODOLOGIA COMPROVADA
     */
    async executarDiagnosticoCompleto() {
        console.log('🚀 TESTE COMPLETO - METODOLOGIA COMPROVADA (93.8% SUCESSO)');
        console.log('='.repeat(65));

        const startTime = Date.now();
        const resultados = {
            timestamp: new Date().toISOString(),
            ip_atual: null,
            total_chaves: 0,
            chaves_testadas: 0,
            sucessos: 0,
            falhas: 0,
            detalhes_por_usuario: {},
            problemas_encontrados: [],
            recomendacoes: []
        };

        try {
            // 1. DETECTAR IP ATUAL
            console.log('\n=== ETAPA 1: DETECÇÃO DE IP ===');
            await this.detectarIPAvancado();
            resultados.ip_atual = this.currentIP;

            // 2. BUSCAR CHAVES NO BANCO
            console.log('\n=== ETAPA 2: ANÁLISE DE CHAVES ===');
            const chavesEncontradas = await this.buscarChavesCompletas();
            resultados.total_chaves = Object.values(chavesEncontradas).reduce((total, user) => total + user.chaves.length, 0);

            if (resultados.total_chaves === 0) {
                console.log('\n🔴 SISTEMA SEM CHAVES - CADASTRO NECESSÁRIO');
                return resultados;
            }

            // 3. EXECUTAR DIAGNÓSTICOS INDIVIDUAIS
            console.log('\n=== ETAPA 3: DIAGNÓSTICOS INDIVIDUAIS ===');
            
            for (const [userId, userData] of Object.entries(chavesEncontradas)) {
                console.log(`\n👤 DIAGNÓSTICO PARA: ${userData.username}`);
                console.log('█'.repeat(50));

                resultados.detalhes_por_usuario[userId] = {
                    username: userData.username,
                    email: userData.email,
                    chaves_testadas: 0,
                    chaves_funcionando: 0,
                    diagnosticos: {}
                };

                for (const chave of userData.chaves) {
                    resultados.chaves_testadas++;
                    resultados.detalhes_por_usuario[userId].chaves_testadas++;

                    const chaveId = `${chave.exchange}_${chave.environment}`;
                    console.log(`\n🔍 Testando: ${chaveId.toUpperCase()}`);
                    console.log(`   📧 Usuário: ${userData.username}`);
                    console.log(`   🔑 API Key: ${chave.api_key.substring(0, 12)}...`);

                    if (chave.exchange === 'bybit') {
                        const diagnostico = await this.diagnosticarBybitCompleto(
                            chave.api_key,
                            chave.secret_key,
                            chave.environment
                        );

                        resultados.detalhes_por_usuario[userId].diagnosticos[chaveId] = diagnostico;

                        if (diagnostico.success) {
                            resultados.sucessos++;
                            resultados.detalhes_por_usuario[userId].chaves_funcionando++;
                            console.log(`✅ ${chaveId}: OPERACIONAL (${diagnostico.successRate.toFixed(1)}%)`);
                            
                            // Atualizar status no banco
                            await this.atualizarStatusChave(chave.key_id, 'CONNECTED', null);
                        } else {
                            resultados.falhas++;
                            console.log(`❌ ${chaveId}: PROBLEMAS (${diagnostico.successRate.toFixed(1)}%)`);
                            
                            // Registrar problema
                            if (diagnostico.details.error_analysis) {
                                resultados.problemas_encontrados.push({
                                    usuario: userData.username,
                                    chave: chaveId,
                                    erro: diagnostico.details.error_analysis,
                                    requer_acao: diagnostico.needsAction
                                });
                            }
                            
                            // Atualizar status no banco
                            const errorMsg = diagnostico.details.error_analysis?.message || 'Diagnóstico com problemas';
                            await this.atualizarStatusChave(chave.key_id, 'FAILED', errorMsg);
                        }
                    } else if (chave.exchange === 'binance') {
                        console.log(`⚠️ ${chaveId}: Diagnóstico Binance ainda não implementado`);
                        resultados.falhas++;
                    }

                    // Rate limiting entre testes
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                console.log(`\n📊 RESUMO USUÁRIO ${userData.username}:`);
                console.log(`   Chaves testadas: ${resultados.detalhes_por_usuario[userId].chaves_testadas}`);
                console.log(`   Chaves funcionando: ${resultados.detalhes_por_usuario[userId].chaves_funcionando}`);
            }

            // 4. ANÁLISE FINAL E RECOMENDAÇÕES
            console.log('\n=== ETAPA 4: ANÁLISE FINAL ===');
            this.gerarRecomendacoes(resultados);

        } catch (error) {
            console.error('❌ Erro no diagnóstico completo:', error.message);
        }

        // RELATÓRIO FINAL
        const duration = (Date.now() - startTime) / 1000;
        const taxaSucesso = resultados.chaves_testadas > 0 ? (resultados.sucessos / resultados.chaves_testadas * 100) : 0;

        console.log('\n📊 RELATÓRIO FINAL DO DIAGNÓSTICO');
        console.log('='.repeat(40));
        console.log(`⏱️ Duração: ${duration.toFixed(1)}s`);
        console.log(`🌐 IP atual: ${resultados.ip_atual}`);
        console.log(`🔑 Total de chaves: ${resultados.total_chaves}`);
        console.log(`🧪 Chaves testadas: ${resultados.chaves_testadas}`);
        console.log(`✅ Sucessos: ${resultados.sucessos}`);
        console.log(`❌ Falhas: ${resultados.falhas}`);
        console.log(`📊 Taxa de sucesso: ${taxaSucesso.toFixed(1)}%`);

        if (taxaSucesso >= 80) {
            console.log('\n🟢 SISTEMA PLENAMENTE OPERACIONAL!');
            console.log('🚀 Pronto para trading real em produção');
        } else if (taxaSucesso >= 50) {
            console.log('\n🟡 SISTEMA PARCIALMENTE OPERACIONAL');
            console.log('🔧 Algumas correções necessárias');
        } else {
            console.log('\n🔴 SISTEMA COM PROBLEMAS CRÍTICOS');
            console.log('⚠️ Ação imediata necessária');
        }

        // Próximos passos
        if (resultados.sucessos > 0) {
            console.log('\n📋 PRÓXIMOS PASSOS:');
            console.log('1. Execute: node teste-trade-real-pequeno.js (teste com valor mínimo)');
            console.log('2. Execute: node dual-trading-activator.js (ativação completa)');
        }

        await pool.end();
        return resultados;
    }

    /**
     * 💡 GERAR RECOMENDAÇÕES BASEADAS NOS PROBLEMAS
     */
    gerarRecomendacoes(resultados) {
        console.log('\n💡 ANÁLISE DE PROBLEMAS E RECOMENDAÇÕES:');
        console.log('=======================================');

        if (resultados.problemas_encontrados.length === 0) {
            console.log('✅ Nenhum problema crítico encontrado!');
            return;
        }

        // Agrupar problemas por tipo
        const problemasPorTipo = {};
        resultados.problemas_encontrados.forEach(problema => {
            const codigo = problema.erro.code;
            if (!problemasPorTipo[codigo]) {
                problemasPorTipo[codigo] = {
                    count: 0,
                    usuarios: [],
                    diagnosis: problema.erro.diagnosis
                };
            }
            problemasPorTipo[codigo].count++;
            problemasPorTipo[codigo].usuarios.push(`${problema.usuario} (${problema.chave})`);
        });

        // Gerar recomendações específicas
        for (const [codigo, info] of Object.entries(problemasPorTipo)) {
            console.log(`\n🔧 PROBLEMA: Erro ${codigo} (${info.count} ocorrências)`);
            console.log(`   📝 Descrição: ${info.diagnosis?.problem || 'Erro não catalogado'}`);
            console.log(`   🎯 Solução: ${info.diagnosis?.solution || 'Verificar documentação'}`);
            console.log(`   👥 Afetados: ${info.usuarios.join(', ')}`);
            
            if (info.diagnosis?.instructions) {
                console.log(`   📋 Instruções:`);
                info.diagnosis.instructions.forEach((instrucao, index) => {
                    console.log(`      ${index + 1}. ${instrucao}`);
                });
            }

            // Recomendação específica para IP
            if (codigo === '10010' && this.currentIP) {
                console.log(`   🌐 Ação específica: Adicionar IP ${this.currentIP} na whitelist`);
                resultados.recomendacoes.push({
                    priority: 'HIGH',
                    action: 'Configurar IP na whitelist',
                    details: `Adicionar ${this.currentIP} nas configurações das APIs`
                });
            }
        }
    }

    /**
     * 📝 ATUALIZAR STATUS DA CHAVE NO BANCO
     */
    async atualizarStatusChave(keyId, status, errorMessage) {
        try {
            await pool.query(`
                UPDATE user_api_keys 
                SET validation_status = $1, validation_error = $2, last_validated_at = NOW()
                WHERE id = $3
            `, [status, errorMessage, keyId]);
        } catch (error) {
            console.log(`⚠️ Erro ao atualizar status da chave ${keyId}:`, error.message);
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    console.log('🚀 DIAGNÓSTICO COMPLETO - METODOLOGIA COMPROVADA');
    console.log('Baseado no guia que alcançou 93.8% de sucesso');
    
    const teste = new TesteTradeRealAvancado();
    teste.executarDiagnosticoCompleto()
        .then(resultados => {
            console.log('\n🎯 DIAGNÓSTICO CONCLUÍDO!');
            process.exit(resultados.sucessos > 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ ERRO NO DIAGNÓSTICO:', error);
            process.exit(1);
        });
}

module.exports = TesteTradeRealAvancado;
