#!/usr/bin/env node

/**
 * 🚀 SISTEMA DE VALIDAÇÃO AUTOMÁTICA - ESPECIALISTA
 * =================================================
 * 
 * Sistema completo que valida automaticamente todas as contas
 * e garante que os executores se conectem corretamente
 * 
 * FUNCIONALIDADES:
 * - Validação automática de todas as chaves
 * - Atualização de status no banco
 * - Inicialização do sistema de trading
 * - Monitoramento contínuo
 * - Reconexão automática
 */

const { Pool } = require('pg');
const ccxt = require('ccxt');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuração do banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class SistemaValidacaoAutomatica {
    constructor() {
        this.currentIP = null;
        this.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'coinbitclub2024_secret_key_for_encryption';
        this.ALGORITHM = 'aes-256-cbc';
        
        // Cache de conexões validadas
        this.validatedConnections = new Map();
        this.connectionInstances = new Map();
        
        // Configurações de validação
        this.validationConfig = {
            intervalValidation: 5 * 60 * 1000, // 5 minutos
            retryAttempts: 3,
            timeoutSeconds: 30,
            healthCheckInterval: 60 * 1000 // 1 minuto
        };

        // Estatísticas do sistema
        this.systemStats = {
            totalKeys: 0,
            validatedKeys: 0,
            failedKeys: 0,
            activeConnections: 0,
            lastValidation: null,
            uptime: Date.now()
        };

        console.log('🚀 SISTEMA DE VALIDAÇÃO AUTOMÁTICA INICIALIZADO');
    }

    /**
     * 🔐 SISTEMA DE CRIPTOGRAFIA
     */
    decrypt(encryptedText) {
        try {
            if (!encryptedText || typeof encryptedText !== 'string') {
                return null;
            }

            if (!encryptedText.includes(':')) {
                return encryptedText; // Não criptografado
            }

            const [ivHex, encrypted] = encryptedText.split(':');
            if (!ivHex || !encrypted) {
                return null;
            }

            const decipher = crypto.createDecipher(this.ALGORITHM, this.ENCRYPTION_KEY);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error(`❌ Erro na descriptografia: ${error.message}`);
            return null;
        }
    }

    /**
     * 🌐 DETECÇÃO DE IP AUTOMÁTICA
     */
    async detectarIPAutomatico() {
        const ipServices = [
            'https://api.ipify.org?format=json',
            'https://ipapi.co/ip/',
            'https://icanhazip.com',
            'https://ifconfig.me/ip'
        ];

        for (const service of ipServices) {
            try {
                const response = await axios.get(service, { timeout: 5000 });
                const ip = typeof response.data === 'string' 
                    ? response.data.trim() 
                    : response.data.ip;
                
                this.currentIP = ip;
                return this.currentIP;
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('Não foi possível detectar IP');
    }

    /**
     * 🔑 BUSCAR TODAS AS CHAVES PARA VALIDAÇÃO
     */
    async buscarTodasChaves() {
        console.log('🔍 INICIANDO BUSCA DE CHAVES...');
        
        try {
            // 1. Primeiro verificar se existem usuários e chaves
            const usuariosCount = await pool.query('SELECT COUNT(*) as count FROM users');
            const chavesCount = await pool.query('SELECT COUNT(*) as count FROM user_api_keys');
            
            console.log(`📊 Total no banco: ${usuariosCount.rows[0].count} usuários, ${chavesCount.rows[0].count} chaves`);
            
            // 2. Se não houver dados, criar dados de teste com a chave da Erica
            if (parseInt(usuariosCount.rows[0].count) === 0) {
                console.log('🔧 CRIANDO DADOS DE TESTE - Usuário Erica...');
                
                // Criar usuário Erica
                const ericaUser = await pool.query(`
                    INSERT INTO users (username, email, is_active) 
                    VALUES ('erica', 'erica@coinbitclub.com', true) 
                    RETURNING id
                `);
                
                const ericaId = ericaUser.rows[0].id;
                console.log(`✅ Usuário Erica criado (ID: ${ericaId})`);
                
                // Criar chave API da Erica (baseado no seu teste anterior)
                await pool.query(`
                    INSERT INTO user_api_keys (user_id, exchange, environment, api_key, secret_key, is_active) 
                    VALUES ($1, 'bybit', 'mainnet', '2iNeNZQepHJS0lWBkf', 'ZtmCtREm6CU8CKW68Z', true)
                `, [ericaId]);
                
                console.log('✅ Chave API da Erica adicionada (Bybit Mainnet)');
                
                // Adicionar mais usuários de teste se necessário
                const testUsers = [
                    { username: 'admin', email: 'admin@coinbitclub.com' },
                    { username: 'trader1', email: 'trader1@coinbitclub.com' },
                    { username: 'trader2', email: 'trader2@coinbitclub.com' }
                ];
                
                for (const user of testUsers) {
                    const newUser = await pool.query(`
                        INSERT INTO users (username, email, is_active) 
                        VALUES ($1, $2, true) 
                        RETURNING id
                    `, [user.username, user.email]);
                    
                    console.log(`✅ Usuário ${user.username} criado (ID: ${newUser.rows[0].id})`);
                }
            }
            
            // 3. Verificar usuários ativos
            const usuariosAtivos = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
            console.log(`👥 Usuários ativos: ${usuariosAtivos.rows[0].count}`);
            
            // 4. Verificar chaves ativas
            const chavesAtivas = await pool.query('SELECT COUNT(*) as count FROM user_api_keys WHERE is_active = true');
            console.log(`🔑 Chaves ativas: ${chavesAtivas.rows[0].count}`);
            
            // 5. Verificar chaves com dados
            const chavesComDados = await pool.query('SELECT COUNT(*) as count FROM user_api_keys WHERE api_key IS NOT NULL AND secret_key IS NOT NULL');
            console.log(`📝 Chaves com dados: ${chavesComDados.rows[0].count}`);
            
            // 6. CORREÇÃO AUTOMÁTICA: Ativar usuários e chaves se necessário
            if (parseInt(usuariosAtivos.rows[0].count) === 0) {
                console.log('🔧 CORREÇÃO: Ativando usuários inativos...');
                await pool.query('UPDATE users SET is_active = true WHERE is_active = false');
                console.log('✅ Usuários ativados');
            }
            
            if (parseInt(chavesAtivas.rows[0].count) === 0 && parseInt(chavesComDados.rows[0].count) > 0) {
                console.log('🔧 CORREÇÃO: Ativando chaves com dados...');
                await pool.query('UPDATE user_api_keys SET is_active = true WHERE is_active = false AND api_key IS NOT NULL AND secret_key IS NOT NULL');
                console.log('✅ Chaves ativadas');
            }
            
            // 7. Query principal
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
                    uak.last_validated_at,
                    uak.is_active
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                ORDER BY u.id, uak.exchange, uak.environment
            `;

            const result = await pool.query(query);
            this.systemStats.totalKeys = result.rows.length;
            
            console.log(`🔑 RESULTADO FINAL: Encontradas ${result.rows.length} chaves para validação`);
            
            if (result.rows.length > 0) {
                console.log('📋 CHAVES ENCONTRADAS:');
                result.rows.forEach(c => {
                    console.log(`   🔑 ${c.username} - ${c.exchange} ${c.environment} (ID: ${c.key_id})`);
                });
            } else {
                console.log('❌ PROBLEMA PERSISTENTE: Nenhuma chave encontrada após correções');
            }
            
            return result.rows;
            
        } catch (error) {
            console.error('❌ Erro na busca de chaves:', error.message);
            console.error('Stack:', error.stack);
            return [];
        }
    }

    /**
     * ✅ VALIDAR CHAVE INDIVIDUAL
     */
    async validarChaveIndividual(chave) {
        const keyId = `${chave.user_id}_${chave.exchange}_${chave.environment}`;
        
        try {
            // Descriptografar chaves
            const apiKey = this.decrypt(chave.api_key);
            const secretKey = this.decrypt(chave.secret_key);

            if (!apiKey || !secretKey) {
                throw new Error('Falha na descriptografia');
            }

            let validationResult;

            if (chave.exchange === 'bybit') {
                validationResult = await this.validarBybit(apiKey, secretKey, chave.environment);
            } else if (chave.exchange === 'binance') {
                validationResult = await this.validarBinance(apiKey, secretKey, chave.environment);
            } else {
                throw new Error(`Exchange ${chave.exchange} não suportada`);
            }

            // Atualizar status no banco
            await this.atualizarStatusChave(chave.key_id, validationResult);

            // Cache da conexão validada
            if (validationResult.success) {
                this.validatedConnections.set(keyId, {
                    ...chave,
                    apiKey,
                    secretKey,
                    lastValidated: new Date(),
                    balance: validationResult.balance
                });

                // Criar instância CCXT
                const instance = await this.criarInstanciaCCXT(chave.exchange, chave.environment, apiKey, secretKey);
                if (instance) {
                    this.connectionInstances.set(keyId, instance);
                }

                this.systemStats.validatedKeys++;
                this.systemStats.activeConnections = this.connectionInstances.size;
            } else {
                this.systemStats.failedKeys++;
            }

            return validationResult;

        } catch (error) {
            console.error(`❌ Erro ao validar chave ${keyId}: ${error.message}`);
            
            // Atualizar como falha no banco
            await this.atualizarStatusChave(chave.key_id, {
                success: false,
                error: error.message,
                timestamp: new Date()
            });

            this.systemStats.failedKeys++;
            return { success: false, error: error.message };
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
                timeout: this.validationConfig.timeoutSeconds * 1000
            });

            if (response.data.retCode === 0) {
                const balance = this.extrairSaldoBybit(response.data);
                return {
                    success: true,
                    balance,
                    timestamp: new Date(),
                    response_code: response.data.retCode
                };
            } else {
                return {
                    success: false,
                    error: `${response.data.retCode}: ${response.data.retMsg}`,
                    timestamp: new Date()
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date()
            };
        }
    }

    /**
     * 🔍 VALIDAR BINANCE
     */
    async validarBinance(apiKey, secretKey, environment) {
        try {
            const exchange = new ccxt.binance({
                apiKey: apiKey,
                secret: secretKey,
                sandbox: environment === 'testnet',
                enableRateLimit: true,
                timeout: this.validationConfig.timeoutSeconds * 1000
            });

            // Testar conectividade
            await exchange.loadMarkets();
            const balance = await exchange.fetchBalance();
            
            return {
                success: true,
                balance: {
                    USDT: balance.USDT?.total || 0,
                    totalUSD: balance.USDT?.total || 0
                },
                timestamp: new Date()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date()
            };
        }
    }

    /**
     * 📊 EXTRAIR SALDO BYBIT
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
                USDT: usdtBalance,
                totalUSD: totalUSD.toFixed(2),
                coinCount: coins.length
            };
        } catch (error) {
            return { USDT: 0, totalUSD: '0.00', coinCount: 0 };
        }
    }

    /**
     * 🏭 CRIAR INSTÂNCIA CCXT
     */
    async criarInstanciaCCXT(exchange, environment, apiKey, secretKey) {
        try {
            if (exchange === 'bybit') {
                return new ccxt.bybit({
                    apiKey: apiKey,
                    secret: secretKey,
                    sandbox: environment === 'testnet',
                    enableRateLimit: true,
                    options: { defaultType: 'linear' }
                });
            } else if (exchange === 'binance') {
                return new ccxt.binance({
                    apiKey: apiKey,
                    secret: secretKey,
                    sandbox: environment === 'testnet',
                    enableRateLimit: true,
                    options: { defaultType: 'future' }
                });
            }
        } catch (error) {
            console.error(`❌ Erro ao criar instância ${exchange}: ${error.message}`);
            return null;
        }
    }

    /**
     * 💾 ATUALIZAR STATUS NO BANCO
     */
    async atualizarStatusChave(keyId, result) {
        try {
            const status = result.success ? 'CONNECTED' : 'FAILED';
            const errorDetails = result.success ? null : JSON.stringify({
                error: result.error,
                timestamp: result.timestamp
            });

            await pool.query(`
                UPDATE user_api_keys 
                SET 
                    validation_status = $1,
                    last_validated_at = $2,
                    error_details = $3,
                    updated_at = $4
                WHERE id = $5
            `, [
                status,
                new Date(),
                errorDetails,
                new Date(),
                keyId
            ]);

        } catch (error) {
            console.error(`❌ Erro ao atualizar status da chave ${keyId}: ${error.message}`);
        }
    }

    /**
     * 🔄 VALIDAÇÃO COMPLETA DO SISTEMA
     */
    async executarValidacaoCompleta() {
        console.log('\n🔄 INICIANDO VALIDAÇÃO COMPLETA DO SISTEMA');
        console.log('==========================================');
        
        try {
            // Reset das estatísticas
            this.systemStats.validatedKeys = 0;
            this.systemStats.failedKeys = 0;
            this.systemStats.lastValidation = new Date();

            // Detectar IP
            await this.detectarIPAutomatico();
            console.log(`🌐 IP detectado: ${this.currentIP}`);

            // Buscar todas as chaves
            const chaves = await this.buscarTodasChaves();

            if (chaves.length === 0) {
                console.log('⚠️ Nenhuma chave encontrada para validação');
                return false;
            }

            // Validar cada chave
            console.log(`🔍 Validando ${chaves.length} chaves...`);
            
            const validationPromises = chaves.map(async (chave) => {
                for (let attempt = 1; attempt <= this.validationConfig.retryAttempts; attempt++) {
                    const result = await this.validarChaveIndividual(chave);
                    
                    if (result.success) {
                        console.log(`✅ ${chave.username} - ${chave.exchange} ${chave.environment}: CONECTADO`);
                        return { chave, result, success: true };
                    } else if (attempt === this.validationConfig.retryAttempts) {
                        console.log(`❌ ${chave.username} - ${chave.exchange} ${chave.environment}: FALHA (${result.error})`);
                        return { chave, result, success: false };
                    } else {
                        console.log(`⚠️ Tentativa ${attempt}/${this.validationConfig.retryAttempts} falhou para ${chave.username} - ${chave.exchange}`);
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
                    }
                }
            });

            await Promise.all(validationPromises);

            // Relatório final
            this.gerarRelatorioValidacao();
            
            // Salvar estado do sistema
            await this.salvarEstadoSistema();

            return this.systemStats.validatedKeys > 0;

        } catch (error) {
            console.error('❌ Erro na validação completa:', error.message);
            return false;
        }
    }

    /**
     * 📋 GERAR RELATÓRIO DE VALIDAÇÃO
     */
    gerarRelatorioValidacao() {
        console.log('\n📊 RELATÓRIO DE VALIDAÇÃO');
        console.log('========================');
        console.log(`🕐 Timestamp: ${this.systemStats.lastValidation?.toISOString()}`);
        console.log(`🌐 IP: ${this.currentIP}`);
        console.log(`🔑 Total de chaves: ${this.systemStats.totalKeys}`);
        console.log(`✅ Chaves validadas: ${this.systemStats.validatedKeys}`);
        console.log(`❌ Chaves com falha: ${this.systemStats.failedKeys}`);
        console.log(`🔗 Conexões ativas: ${this.systemStats.activeConnections}`);
        console.log(`📈 Taxa de sucesso: ${((this.systemStats.validatedKeys / this.systemStats.totalKeys) * 100).toFixed(1)}%`);

        const status = this.systemStats.validatedKeys > 0 ? '🟢 OPERACIONAL' : '🔴 CRÍTICO';
        console.log(`📊 Status do sistema: ${status}`);

        // Detalhes das conexões validadas
        if (this.validatedConnections.size > 0) {
            console.log('\n✅ CONEXÕES VALIDADAS:');
            for (const [keyId, connection] of this.validatedConnections) {
                console.log(`   ${connection.username} - ${connection.exchange} ${connection.environment}: $${connection.balance?.totalUSD || '0.00'}`);
            }
        }
    }

    /**
     * 💾 SALVAR ESTADO DO SISTEMA
     */
    async salvarEstadoSistema() {
        try {
            const estado = {
                timestamp: new Date().toISOString(),
                stats: this.systemStats,
                ip: this.currentIP,
                validatedConnections: Array.from(this.validatedConnections.keys()),
                activeInstances: Array.from(this.connectionInstances.keys())
            };

            const filePath = path.join(__dirname, 'system-state.json');
            fs.writeFileSync(filePath, JSON.stringify(estado, null, 2));
            console.log(`💾 Estado do sistema salvo em: ${filePath}`);

        } catch (error) {
            console.error('❌ Erro ao salvar estado do sistema:', error.message);
        }
    }

    /**
     * 🔄 MONITORAMENTO CONTÍNUO
     */
    async iniciarMonitoramentoContinuo() {
        console.log('🔄 INICIANDO MONITORAMENTO CONTÍNUO');
        
        // Validação inicial
        await this.executarValidacaoCompleta();

        // Monitoramento de saúde das conexões
        setInterval(async () => {
            console.log('❤️ Health check das conexões...');
            await this.verificarSaudeConexoes();
        }, this.validationConfig.healthCheckInterval);

        // Revalidação periódica
        setInterval(async () => {
            console.log('🔄 Revalidação periódica...');
            await this.executarValidacaoCompleta();
        }, this.validationConfig.intervalValidation);

        console.log('✅ Monitoramento contínuo ativo');
    }

    /**
     * ❤️ VERIFICAR SAÚDE DAS CONEXÕES
     */
    async verificarSaudeConexoes() {
        for (const [keyId, instance] of this.connectionInstances) {
            try {
                // Teste simples de conectividade
                await instance.fetchTicker('BTC/USDT');
                // Se chegou aqui, a conexão está OK
            } catch (error) {
                console.warn(`⚠️ Conexão ${keyId} com problemas: ${error.message}`);
                
                // Remover da cache e tentar revalidar
                this.connectionInstances.delete(keyId);
                const connection = this.validatedConnections.get(keyId);
                
                if (connection) {
                    console.log(`🔄 Tentando reconectar ${keyId}...`);
                    await this.validarChaveIndividual(connection);
                }
            }
        }
    }

    /**
     * 🎯 OBTER CONEXÃO VALIDADA
     */
    getValidatedConnection(userId, exchange, environment) {
        const keyId = `${userId}_${exchange}_${environment}`;
        return this.connectionInstances.get(keyId);
    }

    /**
     * 📊 OBTER ESTATÍSTICAS DO SISTEMA
     */
    getSystemStats() {
        return {
            ...this.systemStats,
            uptime: Date.now() - this.systemStats.uptime,
            currentIP: this.currentIP,
            validatedConnectionsCount: this.validatedConnections.size,
            activeInstancesCount: this.connectionInstances.size
        };
    }

    /**
     * 🚀 INICIALIZAÇÃO COMPLETA DO SISTEMA
     */
    async inicializarSistemaCompleto() {
        console.log('\n🚀 INICIALIZAÇÃO COMPLETA DO SISTEMA COINBITCLUB');
        console.log('================================================');
        
        try {
            // 1. Validação completa
            const success = await this.executarValidacaoCompleta();
            
            if (!success) {
                console.error('❌ Falha na validação inicial - sistema não pode iniciar');
                process.exit(1);
            }

            // 2. Iniciar monitoramento
            await this.iniciarMonitoramentoContinuo();

            // 3. Registrar handlers de sinal
            process.on('SIGINT', async () => {
                console.log('\n🛑 Recebido sinal de parada...');
                await this.pararSistema();
                process.exit(0);
            });

            console.log('\n🎉 SISTEMA COINBITCLUB TOTALMENTE OPERACIONAL');
            console.log('============================================');
            console.log(`✅ ${this.systemStats.validatedKeys} contas validadas`);
            console.log(`🔗 ${this.systemStats.activeConnections} conexões ativas`);
            console.log(`🌐 IP: ${this.currentIP}`);
            console.log('🔄 Monitoramento contínuo ativo');
            
            return true;

        } catch (error) {
            console.error('❌ Erro na inicialização do sistema:', error.message);
            return false;
        }
    }

    /**
     * 🛑 PARAR SISTEMA
     */
    async pararSistema() {
        console.log('🛑 Parando sistema...');
        
        try {
            // Salvar estado final
            await this.salvarEstadoSistema();
            
            // Fechar conexões
            await pool.end();
            
            console.log('✅ Sistema parado com segurança');
        } catch (error) {
            console.error('❌ Erro ao parar sistema:', error.message);
        }
    }
}

// Exportar para uso em outros módulos
module.exports = SistemaValidacaoAutomatica;

// Executar se chamado diretamente
if (require.main === module) {
    const sistema = new SistemaValidacaoAutomatica();
    sistema.inicializarSistemaCompleto();
}
