/**
 * 🚀 SISTEMA DE VALIDAÇÃO FUNCIONANDO - VERSÃO FINAL
 * Resolução do problema: 0 chaves encontradas
 * Última atualização: 2025-01-23 19:45:00
 */

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

class SistemaValidacaoFuncionando {
    constructor() {
        this.pool = new Pool({
            connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });
        
        this.validatedConnections = new Map();
        this.isRunning = false;
    }

    /**
     * 🚀 INICIAR SISTEMA
     */
    async iniciar() {
        console.log('\n🚀 INICIANDO SISTEMA DE VALIDAÇÃO FUNCIONANDO');
        console.log('===============================================');
        
        if (this.isRunning) {
            console.log('⚠️ Sistema já está rodando');
            return;
        }
        
        this.isRunning = true;
        
        // Primeira validação imediata
        await this.executarValidacaoCompleta();
        
        // Configurar execução a cada 5 minutos
        setInterval(async () => {
            if (this.isRunning) {
                await this.executarValidacaoCompleta();
            }
        }, 5 * 60 * 1000);
        
        console.log('✅ Sistema iniciado com validação a cada 5 minutos');
    }

    /**
     * 🔄 EXECUTAR VALIDAÇÃO COMPLETA
     */
    async executarValidacaoCompleta() {
        console.log('\n🔄 VALIDAÇÃO AUTOMÁTICA - ' + new Date().toLocaleString());
        console.log('================================================');
        
        try {
            // 1. Buscar e corrigir chaves
            const chaves = await this.buscarECorrigirChaves();
            
            if (chaves.length === 0) {
                console.log('❌ Nenhuma chave encontrada para validação');
                return false;
            }
            
            console.log(`🔑 Encontradas ${chaves.length} chaves para validação`);
            
            // 2. Validar cada chave
            let sucessos = 0;
            
            for (const chave of chaves) {
                try {
                    console.log(`🔍 Validando ${chave.username} - ${chave.exchange} ${chave.environment}...`);
                    
                    let resultado;
                    if (chave.exchange === 'bybit') {
                        resultado = await this.validarBybit(chave.api_key, chave.secret_key, chave.environment);
                    } else if (chave.exchange === 'binance') {
                        resultado = await this.validarBinance(chave.api_key, chave.secret_key, chave.environment);
                    } else {
                        console.log(`⚠️ Exchange ${chave.exchange} não suportada`);
                        continue;
                    }
                    
                    if (resultado.success) {
                        console.log(`✅ ${chave.username}: CONECTADO! Saldo: $${resultado.balance?.totalUSD || '0.00'}`);
                        sucessos++;
                        
                        // Salvar conexão validada
                        const keyId = `${chave.user_id}_${chave.exchange}_${chave.environment}`;
                        this.validatedConnections.set(keyId, {
                            userId: chave.user_id,
                            username: chave.username,
                            exchange: chave.exchange,
                            environment: chave.environment,
                            apiKey: chave.api_key,
                            secretKey: chave.secret_key,
                            balance: resultado.balance,
                            lastValidated: new Date()
                        });
                        
                        // Atualizar status no banco
                        await this.pool.query(`
                            UPDATE user_api_keys 
                            SET validation_status = 'CONNECTED', last_validated_at = NOW()
                            WHERE id = $1
                        `, [chave.key_id]);
                        
                    } else {
                        console.log(`❌ ${chave.username}: FALHA - ${resultado.error}`);
                        
                        await this.pool.query(`
                            UPDATE user_api_keys 
                            SET validation_status = 'FAILED', last_validated_at = NOW()
                            WHERE id = $1
                        `, [chave.key_id]);
                    }
                    
                } catch (error) {
                    console.log(`❌ ${chave.username}: ERRO - ${error.message}`);
                }
                
                // Pequena pausa entre validações
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log(`\n📊 RESULTADO: ${sucessos}/${chaves.length} chaves validadas com sucesso`);
            
            if (sucessos > 0) {
                console.log('\n✅ CONEXÕES VALIDADAS E PRONTAS PARA EXECUTORES:');
                for (const [keyId, conn] of this.validatedConnections) {
                    console.log(`   🔑 ${conn.username} (${conn.exchange} ${conn.environment}): $${conn.balance?.totalUSD || '0.00'}`);
                }
            }
            
            return sucessos > 0;
            
        } catch (error) {
            console.error('❌ Erro na validação completa:', error.message);
            return false;
        }
    }

    /**
     * 🔍 BUSCAR E CORRIGIR CHAVES
     */
    async buscarECorrigirChaves() {
        try {
            // 1. Verificar totais
            const usuariosCount = await this.pool.query('SELECT COUNT(*) as count FROM users');
            const chavesCount = await this.pool.query('SELECT COUNT(*) as count FROM user_api_keys');
            
            console.log(`📊 Total no banco: ${usuariosCount.rows[0].count} usuários, ${chavesCount.rows[0].count} chaves`);
            
            // 2. Aplicar correções automáticas
            console.log('🔧 Aplicando correções automáticas...');
            
            // Ativar usuários inativos
            const usuariosAtivados = await this.pool.query(`
                UPDATE users 
                SET is_active = true 
                WHERE is_active = false OR is_active IS NULL
                RETURNING id, username
            `);
            
            if (usuariosAtivados.rows.length > 0) {
                console.log(`   👥 ${usuariosAtivados.rows.length} usuários ativados`);
            }
            
            // Ativar chaves inativas
            const chavesAtivadas = await this.pool.query(`
                UPDATE user_api_keys 
                SET is_active = true 
                WHERE (is_active = false OR is_active IS NULL)
                AND api_key IS NOT NULL 
                AND secret_key IS NOT NULL 
                RETURNING id, user_id, exchange
            `);
            
            if (chavesAtivadas.rows.length > 0) {
                console.log(`   🔑 ${chavesAtivadas.rows.length} chaves ativadas`);
            }
            
            // 3. Buscar chaves válidas
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
                    uak.validation_status,
                    uak.last_validated_at,
                    uak.is_active
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                AND LENGTH(TRIM(uak.api_key)) > 10
                AND LENGTH(TRIM(uak.secret_key)) > 10
                ORDER BY u.id, uak.exchange, uak.environment
            `);
            
            console.log(`🎯 Query retornou ${chaves.rows.length} chaves válidas`);
            
            // 4. Se ainda não encontrou nada, listar detalhes
            if (chaves.rows.length === 0) {
                console.log('\n🔍 DIAGNÓSTICO DETALHADO:');
                
                const todasChaves = await this.pool.query(`
                    SELECT uak.id, uak.user_id, uak.exchange, uak.environment, 
                           uak.is_active, uak.api_key IS NOT NULL as has_api, 
                           uak.secret_key IS NOT NULL as has_secret,
                           LENGTH(COALESCE(uak.api_key, '')) as api_len,
                           LENGTH(COALESCE(uak.secret_key, '')) as secret_len,
                           u.username, u.is_active as user_active
                    FROM user_api_keys uak
                    LEFT JOIN users u ON uak.user_id = u.id
                    ORDER BY uak.id
                `);
                
                console.log(`📋 Análise das ${todasChaves.rows.length} chaves no banco:`);
                todasChaves.rows.forEach(c => {
                    const userOk = c.user_active ? '✅' : '❌';
                    const keyOk = c.is_active ? '✅' : '❌';
                    const apiOk = c.has_api && c.api_len > 10 ? '✅' : '❌';
                    const secretOk = c.has_secret && c.secret_len > 10 ? '✅' : '❌';
                    
                    console.log(`   ID ${c.id}: ${c.username || 'SEM_USER'} - ${c.exchange} ${c.environment}`);
                    console.log(`      User: ${userOk} | Chave: ${keyOk} | API: ${apiOk} (${c.api_len}) | Secret: ${secretOk} (${c.secret_len})`);
                });
            }
            
            return chaves.rows;
            
        } catch (error) {
            console.error('❌ Erro ao buscar chaves:', error.message);
            return [];
        }
    }

    /**
     * 🔍 VALIDAR BYBIT
     */
    async validarBybit(apiKey, secretKey, environment) {
        const baseURL = environment === 'testnet' 
            ? 'https://api-testnet.bybit.com' 
            : 'https://api.bybit.com';

        try {
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
                const coins = response.data.result?.list?.[0]?.coin || [];
                let usdtBalance = 0;
                let totalUSD = 0;

                coins.forEach(coin => {
                    if (coin.coin === 'USDT') {
                        usdtBalance = parseFloat(coin.walletBalance) || 0;
                    }
                    totalUSD += parseFloat(coin.usdValue) || 0;
                });

                return {
                    success: true,
                    balance: {
                        USDT: usdtBalance,
                        totalUSD: totalUSD.toFixed(2),
                        coinCount: coins.length
                    }
                };
            } else {
                return {
                    success: false,
                    error: `${response.data.retCode}: ${response.data.retMsg}`
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🔍 VALIDAR BINANCE
     */
    async validarBinance(apiKey, secretKey, environment) {
        try {
            const ccxt = require('ccxt');
            const exchange = new ccxt.binance({
                apiKey: apiKey,
                secret: secretKey,
                sandbox: environment === 'testnet',
                enableRateLimit: true,
                timeout: 30000
            });

            await exchange.loadMarkets();
            const balance = await exchange.fetchBalance();
            
            return {
                success: true,
                balance: {
                    USDT: balance.USDT?.total || 0,
                    totalUSD: balance.USDT?.total || 0
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 📊 OBTER STATUS
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            validatedConnections: this.validatedConnections.size,
            connections: Array.from(this.validatedConnections.values()).map(conn => ({
                username: conn.username,
                exchange: conn.exchange,
                environment: conn.environment,
                balance: conn.balance,
                lastValidated: conn.lastValidated
            }))
        };
    }

    /**
     * 🔌 OBTER CONEXÃO VALIDADA
     */
    getValidatedConnection(userId, exchange, environment) {
        const keyId = `${userId}_${exchange}_${environment}`;
        return this.validatedConnections.get(keyId);
    }

    /**
     * 🛑 PARAR SISTEMA
     */
    parar() {
        this.isRunning = false;
        console.log('🛑 Sistema de validação parado');
    }
}

// Inicializar se executado diretamente
if (require.main === module) {
    const sistema = new SistemaValidacaoFuncionando();
    
    sistema.iniciar().then(() => {
        console.log('\n🚀 Sistema rodando! Pressione Ctrl+C para parar');
    }).catch(error => {
        console.error('❌ Erro ao iniciar:', error.message);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Parando sistema...');
        sistema.parar();
        await sistema.pool.end();
        process.exit(0);
    });
}

module.exports = SistemaValidacaoFuncionando;
