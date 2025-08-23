console.log('💰 COLETOR DE SALDOS ROBUSTO - API ENDPOINTS CORRIGIDOS');
console.log('======================================================');

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');
const ExchangeIPFixer = require('./exchange-ip-fixer.js');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

class RobustBalanceCollector {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.collectCount = 0;
        this.ipFixer = new ExchangeIPFixer();
        
        // Diagnóstico inicial de IP
        this.ipFixer.suggestAutoFix();
        
        // URLs corrigidas das exchanges
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

    // 🔐 GERAÇÃO DE ASSINATURA BYBIT V5 (CORRIGIDA)
    generateBybitSignature(params, apiKey, apiSecret) {
        const timestamp = Date.now().toString();
        const recvWindow = '5000';
        
        // Criar queryString se params existir
        let queryString = '';
        if (params && Object.keys(params).length > 0) {
            // Adicionar apiKey aos params para assinatura
            const signParams = { ...params, apiKey };
            queryString = new URLSearchParams(signParams).toString();
        } else {
            queryString = `apiKey=${apiKey}`;
        }
        
        // Assinatura conforme documentação Bybit V5
        const signPayload = timestamp + apiKey + recvWindow + queryString;
        const signature = crypto.createHmac('sha256', apiSecret).update(signPayload).digest('hex');
        
        return {
            timestamp,
            signature,
            recvWindow,
            queryString
        };
    }

    // Coletar saldo Bybit com endpoints V5 atualizados (VERSÃO CORRIGIDA)
    async getBybitBalanceV5(apiKey, apiSecret, environment = 'mainnet') {
        try {
            const baseUrl = this.exchangeUrls.bybit[environment];
            console.log(`      🌐 Conectando: ${baseUrl} (API V5)`);
            
            // Parâmetros para wallet balance
            const params = { accountType: 'UNIFIED' };
            const { timestamp, signature, recvWindow, queryString } = this.generateBybitSignature(params, apiKey, apiSecret);
            
            // Headers completos conforme diagnóstico
            const headers = {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': signature,
                'X-BAPI-SIGN-TYPE': '2',  // CRÍTICO: Estava faltando
                'X-BAPI-TIMESTAMP': timestamp,
                'X-BAPI-RECV-WINDOW': recvWindow,
                'Content-Type': 'application/json'
            };
            
            // URL com queryString
            const url = `${baseUrl}/v5/account/wallet-balance?${queryString}`;
            
            const response = await axios.get(url, {
                headers,
                timeout: 15000
            });

            console.log(`         📊 Response retCode: ${response.data.retCode}`);
            
            if (response.data.retCode === 0) {
                const result = response.data.result;
                let totalUSDT = 0;
                let assetsFound = 0;
                
                console.log(`         📊 Resultado: ${JSON.stringify(result).substring(0, 200)}...`);
                
                // Processar diferentes formatos de resposta Bybit
                if (result.list && Array.isArray(result.list)) {
                    for (const account of result.list) {
                        if (account.coin && Array.isArray(account.coin)) {
                            for (const coin of account.coin) {
                                if (coin.coin === 'USDT') {
                                    const balance = parseFloat(coin.walletBalance || coin.equity || 0);
                                    totalUSDT += balance;
                                    assetsFound++;
                                    console.log(`         💰 ${coin.coin}: ${balance.toFixed(4)}`);
                                }
                            }
                        }
                    }
                }
                
                console.log(`      ✅ Bybit V5 (${environment}): $${totalUSDT.toFixed(2)} USDT (${assetsFound} assets)`);
                return totalUSDT;
            } else {
                console.log(`      ❌ Bybit V5 Error: ${response.data.retMsg || 'Erro desconhecido'}`);
                
                // Log específico para IP não autorizado
                if (response.data.retCode === 10010) {
                    console.log(`      🔍 Diagnóstico: IP não está na whitelist da API`);
                    console.log(`      💡 Solução: Adicionar IP atual na configuração da API Key no painel Bybit`);
                }
                
                return 0;
            }

        } catch (error) {
            const errorMsg = error.response?.data?.retMsg || error.message;
            console.log(`      ❌ Bybit V5 (${environment}): ${errorMsg}`);
            
            // Diagnóstico aprimorado de erros
            if (error.response?.status === 401) {
                console.log(`      🔍 Diagnóstico: Problema de autenticação`);
                console.log(`      💡 Solução: Verificar API Key e Secret`);
            } else if (error.response?.status === 403) {
                console.log(`      🔍 Diagnóstico: Acesso negado - verificar permissões`);
                console.log(`      💡 Solução: Habilitar permissões de leitura na API Key`);
            }
            
            return 0;
        }
    }

    // Fallback: Bybit V2 (legado) - CORRIGIDO
    async getBybitBalanceV2(apiKey, apiSecret, environment = 'mainnet') {
        try {
            const baseUrl = this.exchangeUrls.bybit[environment];
            const timestamp = Date.now().toString();
            
            console.log(`      🔄 Tentando Bybit V2 como fallback...`);
            
            // Parâmetros ordenados para assinatura V2
            const params = {
                api_key: apiKey,
                timestamp: timestamp,
                recv_window: '5000'
            };

            // Criar query string ordenada (importante para V2)
            const queryString = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
            const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
            
            // Adicionar assinatura aos parâmetros
            const finalParams = { ...params, sign: signature };

            const response = await axios.get(`${baseUrl}/v2/private/wallet/balance`, {
                params: finalParams,
                timeout: 15000
            });

            console.log(`         📊 V2 Response ret_code: ${response.data.ret_code}`);

            if (response.data.ret_code === 0) {
                const result = response.data.result;
                let totalUSDT = 0;
                
                // Processar saldo USDT do V2
                if (result && typeof result === 'object') {
                    // Formato V2: { USDT: { wallet_balance: "100.0" } }
                    if (result.USDT && result.USDT.wallet_balance) {
                        totalUSDT = parseFloat(result.USDT.wallet_balance);
                        console.log(`         💰 USDT: ${totalUSDT.toFixed(4)}`);
                    }
                    
                    // Formato alternativo V2: array ou outros formatos
                    if (Array.isArray(result)) {
                        for (const coin of result) {
                            if (coin.coin === 'USDT') {
                                totalUSDT += parseFloat(coin.wallet_balance || 0);
                                console.log(`         💰 ${coin.coin}: ${coin.wallet_balance}`);
                            }
                        }
                    }
                }
                
                console.log(`      ✅ Bybit V2 (${environment}): $${totalUSDT.toFixed(2)} USDT`);
                return totalUSDT;
            } else {
                console.log(`      ❌ Bybit V2 Error: ${response.data.ret_msg || 'Erro desconhecido'}`);
                return 0;
            }

        } catch (error) {
            const errorMsg = error.response?.data?.ret_msg || error.message;
            console.log(`      ❌ Bybit V2 (${environment}): ${errorMsg}`);
            
            // Diagnóstico específico V2
            if (error.response?.status === 404) {
                console.log(`      🔍 Diagnóstico: Endpoint V2 não encontrado ou desabilitado`);
            }
            
            return 0;
        }
    }

    // Método principal para Bybit (tenta V5, depois V2)
    async getBybitBalance(apiKey, apiSecret, environment = 'mainnet') {
        console.log(`      📡 Testando endpoints Bybit...`);
        
        // Primeiro tenta V5
        const v5Balance = await this.getBybitBalanceV5(apiKey, apiSecret, environment);
        if (v5Balance > 0) {
            return v5Balance;
        }
        
        // Se V5 falhar, tenta V2
        const v2Balance = await this.getBybitBalanceV2(apiKey, apiSecret, environment);
        return v2Balance;
    }

    // Coletar saldo Binance - INTEGRAÇÃO CORRIGIDA
    async getBinanceBalance(apiKey, apiSecret, environment = 'mainnet') {
        try {
            const baseUrl = this.exchangeUrls.binance[environment];
            const timestamp = Date.now();
            
            console.log(`      🔄 Consultando Binance (${environment})...`);
            console.log(`      🌐 Conectando: ${baseUrl}`);
            
            // Query string para assinatura - incluindo recvWindow
            const queryString = `timestamp=${timestamp}&recvWindow=5000`;
            
            // Gerar assinatura HMAC-SHA256 conforme padrão profissional
            const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
            
            // Headers conforme padrão profissional
            const headers = {
                'X-MBX-APIKEY': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            // Fazer requisição com parâmetros corretos
            const response = await axios.get(`${baseUrl}/account`, {
                params: {
                    timestamp: timestamp,
                    recvWindow: 5000,
                    signature: signature
                },
                headers: headers,
                timeout: 15000
            });

            console.log(`         📊 Binance Status: ${response.status}`);

            if (response.data && response.data.balances) {
                let totalUSDT = 0;
                let assetsCount = 0;
                
                // Processar todos os saldos
                for (const balance of response.data.balances) {
                    const free = parseFloat(balance.free || 0);
                    const locked = parseFloat(balance.locked || 0);
                    const total = free + locked;
                    
                    if (total > 0) {
                        assetsCount++;
                        
                        // Log detalhado para stablecoins principais
                        if (balance.asset === 'USDT' || balance.asset === 'BUSD' || balance.asset === 'USDC') {
                            totalUSDT += total;
                            console.log(`         💰 ${balance.asset}: ${total.toFixed(4)} (Livre: ${free.toFixed(4)}, Bloqueado: ${locked.toFixed(4)})`);
                        }
                        
                        // Log para outros assets com saldo significativo
                        if (total > 0.001 && balance.asset !== 'USDT' && balance.asset !== 'BUSD' && balance.asset !== 'USDC') {
                            console.log(`         🪙 ${balance.asset}: ${total.toFixed(8)}`);
                        }
                    }
                }

                console.log(`      ✅ Binance (${environment}): $${totalUSDT.toFixed(2)} USDT (${assetsCount} assets)`);
                return totalUSDT;
            } else {
                console.log(`      ❌ Binance: Resposta sem dados de saldo`);
                return 0;
            }

        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.message;
            const errorCode = error.response?.data?.code || error.response?.status || 'unknown';
            
            console.log(`      ❌ Binance (${environment}): [${errorCode}] ${errorMsg}`);
            
            // Diagnóstico específico da Binance
            if (error.response?.status === 403) {
                console.log(`      🔍 Diagnóstico: Problema de autorização - verifique API Key/Secret`);
            } else if (error.response?.data?.code === -1021) {
                console.log(`      🔍 Diagnóstico: Timestamp fora da janela permitida`);
            } else if (error.response?.data?.code === -2014) {
                console.log(`      🔍 Diagnóstico: API Key inválida`);
            } else if (error.response?.data?.code === -1022) {
                console.log(`      🔍 Diagnóstico: Assinatura inválida`);
            } else if (error.response?.status === 451) {
                console.log(`      🔍 Diagnóstico: IP não autorizado - adicione IP à whitelist`);
            }
            
            return 0;
        }
    }

    // Coletar saldos de todos os usuários (VERSÃO CORRIGIDA PARA 403)
    async collectAllBalances() {
        this.collectCount++;
        
        console.log(`\n🔄 COLETA #${this.collectCount} - ${new Date().toLocaleString('pt-BR')}`);
        console.log('==================================================');

        try {
            // Buscar configurações de API (query segura)
            const apiConfigs = await pool.query(`
                SELECT u.id, u.username, u.email,
                       uak.api_key, uak.api_secret, uak.exchange, 
                       COALESCE(uak.environment, 'testnet') as environment
                FROM users u
                INNER JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE uak.api_key IS NOT NULL 
                AND uak.api_secret IS NOT NULL
                ORDER BY u.id
            `);

            console.log(`💰 Coletando saldos de ${apiConfigs.rows.length} configurações...`);

            const results = [];

            for (const config of apiConfigs.rows) {
                console.log(`\n👤 USUÁRIO ${config.id} (${config.username}) - ${config.exchange.toUpperCase()}:`);
                
                let balance = 0;
                // FORÇAR TESTNET PARA EVITAR 403 (CORREÇÃO TEMPORÁRIA)
                const environment = process.env.FORCE_TESTNET_ONLY === 'true' ? 'testnet' : (config.environment || 'testnet');
                
                console.log(`      🌐 Ambiente: ${environment} ${environment === 'testnet' ? '(Forçado para evitar 403)' : ''}`);

                if (config.exchange === 'binance') {
                    balance = await this.getBinanceBalance(config.api_key, config.api_secret, environment);
                } else if (config.exchange === 'bybit') {
                    balance = await this.getBybitBalance(config.api_key, config.api_secret, environment);
                } else {
                    console.log(`      ⚠️ Exchange ${config.exchange} não suportada`);
                    continue;
                }

                // Salvar no banco com UPSERT CORRIGIDO para evitar duplicatas
                try {
                    // CORREÇÃO: Verificar se a tabela balances tem a constraint correta
                    const upsertResult = await pool.query(`
                        INSERT INTO balances (user_id, exchange, wallet_balance, asset, account_type, created_at, last_updated)
                        VALUES ($1, $2, $3, 'USDT', 'unified', NOW(), NOW())
                        ON CONFLICT (user_id, asset, account_type) 
                        DO UPDATE SET 
                            exchange = EXCLUDED.exchange,
                            wallet_balance = EXCLUDED.wallet_balance,
                            last_updated = NOW()
                        RETURNING *
                    `, [config.id, config.exchange, balance]);
                    
                    if (upsertResult.rows.length > 0) {
                        console.log(`      💾 Salvo no banco: $${balance.toFixed(2)} (ID: ${upsertResult.rows[0].id})`);
                    } else {
                        console.log(`      💾 Saldo atualizado: $${balance.toFixed(2)}`);
                    }
                    
                    results.push({
                        userId: config.id,
                        username: config.username,
                        exchange: config.exchange,
                        balance: balance
                    });
                    
                } catch (dbError) {
                    console.log(`      ❌ Erro ao salvar no banco: ${dbError.message}`);
                    
                    // Fallback: tentar UPDATE direto
                    if (dbError.message.includes('duplicate key') || dbError.message.includes('violates unique constraint')) {
                        console.log(`      🔧 Fallback: tentando UPDATE direto...`);
                        try {
                            const updateResult = await pool.query(`
                                UPDATE balances 
                                SET wallet_balance = $3, last_updated = NOW(), exchange = $2
                                WHERE user_id = $1 AND asset = 'USDT' AND account_type = 'unified'
                            `, [config.id, config.exchange, balance]);
                            
                            if (updateResult.rowCount > 0) {
                                console.log(`      ✅ Registro atualizado com sucesso`);
                                results.push({
                                    userId: config.id,
                                    username: config.username,
                                    exchange: config.exchange,
                                    balance: balance
                                });
                            } else {
                                console.log(`      ⚠️ Nenhum registro atualizado - pode ser necessário INSERT simples`);
                                // Tentar INSERT simples como último recurso
                                await pool.query(`
                                    INSERT INTO balances (user_id, exchange, wallet_balance, asset, account_type, created_at, last_updated)
                                    VALUES ($1, $2, $3, 'USDT', 'unified', NOW(), NOW())
                                `, [config.id, config.exchange, balance]);
                                console.log(`      ✅ INSERT simples executado com sucesso`);
                            }
                        } catch (updateError) {
                            console.log(`      ❌ Erro no fallback: ${updateError.message}`);
                        }
                    }
                }
            }

            console.log(`\n📊 RESUMO DA COLETA:`);
            console.log('===================');
            results.forEach(r => {
                console.log(`ID ${r.userId} (${r.username}) - ${r.exchange}: $${r.balance.toFixed(2)} (${r.balance > 0 ? 'mainnet' : 'mainnet'})`);
            });

            return results;

        } catch (error) {
            console.error('❌ Erro na coleta automática:', error.message);
            return [];
        }
    }

    // Iniciar coleta automática
    start() {
        if (this.isRunning) {
            console.log('⚠️ Coletor já está rodando');
            return;
        }

        console.log('🚀 Iniciando coletor automático de saldos...');
        console.log('⏰ Intervalo: 2 minutos');
        console.log('👥 Usuários: Todos com chaves API válidas');
        console.log('🔑 Fonte: Banco de dados (user_api_keys)\n');

        this.isRunning = true;
        
        // Executar primeira coleta imediatamente
        this.collectAllBalances();
        
        // Agendar coletas automáticas a cada 2 minutos
        this.intervalId = setInterval(() => {
            this.collectAllBalances();
        }, 2 * 60 * 1000);

        console.log('✅ Coletor automático iniciado!');
    }

    // Parar coleta automática
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Coletor não está rodando');
            return;
        }

        console.log('🛑 Parando coletor automático...');
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.isRunning = false;
        console.log('✅ Coletor automático parado');
    }

    // Status do coletor
    getStatus() {
        return {
            isRunning: this.isRunning,
            collectCount: this.collectCount,
            nextCollection: this.isRunning ? new Date(Date.now() + 2 * 60 * 1000) : null
        };
    }
}

// Exportar para uso em outros módulos
module.exports = RobustBalanceCollector;

// Executar se chamado diretamente
if (require.main === module) {
    const collector = new RobustBalanceCollector();
    collector.start();
    
    // Parar com Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n🛑 Recebido sinal de parada...');
        collector.stop();
        process.exit(0);
    });
}
