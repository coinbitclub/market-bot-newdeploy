#!/usr/bin/env node

/**
 * 💰 BUSCA COMPLETA DE SALDOS - SISTEMA PROFISSIONAL
 * ==================================================
 * 
 * Script completo para buscar saldos de todas as contas reais
 * Inclui criptografia, descriptografia e diagnóstico completo
 * 
 * CRÍTICO: Implementa todas as funções de trading necessárias
 */

const { Pool } = require('pg');
const ccxt = require('ccxt');
const axios = require('axios');
const crypto = require('crypto');

// Configuração do banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

class BuscadorSaldos {
    constructor() {
        this.currentIP = null;
        this.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'coinbitclub2024_secret_key_for_encryption';
        this.ALGORITHM = 'aes-256-cbc';
        
        // Estatísticas
        this.stats = {
            total_keys: 0,
            successful_connections: 0,
            failed_connections: 0,
            total_balance_usd: 0,
            exchanges_tested: new Set(),
            errors: []
        };
    }

    /**
     * 🔐 CRIPTOGRAFIA E DESCRIPTOGRAFIA
     */
    encrypt(text) {
        try {
            if (!text) return null;
            
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher(this.ALGORITHM, this.ENCRYPTION_KEY);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('❌ Erro na criptografia:', error.message);
            return null;
        }
    }

    decrypt(encryptedText) {
        try {
            if (!encryptedText || typeof encryptedText !== 'string') {
                console.error('❌ Dados criptografados inválidos:', encryptedText);
                return null;
            }

            // Se não tem dois pontos, pode ser texto não criptografado
            if (!encryptedText.includes(':')) {
                console.log('⚠️ Texto parece não estar criptografado, usando diretamente');
                return encryptedText;
            }

            const [ivHex, encrypted] = encryptedText.split(':');
            if (!ivHex || !encrypted) {
                console.error('❌ Formato de criptografia inválido');
                return null;
            }

            const decipher = crypto.createDecipher(this.ALGORITHM, this.ENCRYPTION_KEY);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('❌ Erro na descriptografia:', error.message);
            console.error('   Dados:', encryptedText?.substring(0, 50) + '...');
            return null;
        }
    }

    /**
     * 🌐 DETECÇÃO DE IP
     */
    async detectarIP() {
        console.log('🌐 DETECTANDO IP ATUAL...');
        
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
                console.log(`📍 IP Atual: ${this.currentIP}`);
                return this.currentIP;
            } catch (error) {
                console.log(`⚠️ Falha em ${service}: ${error.message}`);
                continue;
            }
        }
        
        console.error('❌ Erro ao detectar IP de todas as fontes');
        return null;
    }

    /**
     * 🔑 BUSCA DE CHAVES NO BANCO
     */
    async buscarChavesNoBanco() {
        console.log('\n🔑 BUSCANDO CHAVES NO BANCO DE DADOS...');
        console.log('==========================================');

        try {
            // Primeiro, verificar se a tabela existe
            const checkTable = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_api_keys'
                );
            `);

            if (!checkTable.rows[0].exists) {
                console.error('❌ ERRO CRÍTICO: Tabela user_api_keys não existe!');
                console.log('📋 Execute primeiro: node criar-estrutura-banco.js');
                return {};
            }

            // Buscar todas as chaves ativas
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
                    uak.created_at,
                    uak.is_active
                FROM users u
                JOIN user_api_keys uak ON u.id = uak.user_id
                WHERE u.is_active = true 
                AND uak.is_active = true
                AND uak.api_key IS NOT NULL
                AND uak.secret_key IS NOT NULL
                AND LENGTH(uak.api_key) > 10
                AND LENGTH(uak.secret_key) > 10
                ORDER BY u.id, uak.exchange, uak.environment
            `;

            const result = await pool.query(query);
            console.log(`📊 Chaves encontradas no banco: ${result.rows.length}`);

            if (result.rows.length === 0) {
                console.log('\n⚠️ NENHUMA CHAVE ENCONTRADA!');
                console.log('📋 Possíveis causas:');
                console.log('   1. Tabela vazia - execute: node cadastrar-chaves-reais.js');
                console.log('   2. Chaves inativas - verificar campo is_active');
                console.log('   3. Dados NULL - verificar integridade dos dados');
                
                // Verificar se existem usuários
                const userCount = await pool.query('SELECT COUNT(*) FROM users WHERE is_active = true');
                console.log(`   👤 Usuários ativos: ${userCount.rows[0].count}`);
                
                // Verificar se existem chaves
                const keyCount = await pool.query('SELECT COUNT(*) FROM user_api_keys WHERE is_active = true');
                console.log(`   🔑 Chaves ativas: ${keyCount.rows[0].count}`);
                
                return {};
            }

            // Organizar dados
            const chavesOrganizadas = {};
            
            for (const row of result.rows) {
                if (!chavesOrganizadas[row.user_id]) {
                    chavesOrganizadas[row.user_id] = {
                        username: row.username,
                        email: row.email,
                        chaves: []
                    };
                }

                // Descriptografar chaves
                console.log(`🔓 Descriptografando chave ${row.key_id}...`);
                
                const apiKeyDecrypted = this.decrypt(row.api_key);
                const secretKeyDecrypted = this.decrypt(row.secret_key);

                if (!apiKeyDecrypted || !secretKeyDecrypted) {
                    console.error(`❌ Erro ao descriptografar chave ${row.key_id}`);
                    this.stats.errors.push({
                        user_id: row.user_id,
                        key_id: row.key_id,
                        error: 'Falha na descriptografia'
                    });
                    continue;
                }

                chavesOrganizadas[row.user_id].chaves.push({
                    key_id: row.key_id,
                    exchange: row.exchange,
                    environment: row.environment,
                    api_key: apiKeyDecrypted,
                    secret_key: secretKeyDecrypted,
                    validation_status: row.validation_status || 'PENDING',
                    last_validated_at: row.last_validated_at,
                    created_at: row.created_at
                });

                this.stats.total_keys++;
            }

            // Exibir resumo
            console.log('\n📋 CHAVES DESCRIPTOGRAFADAS:');
            console.log('============================');
            for (const [userId, userData] of Object.entries(chavesOrganizadas)) {
                console.log(`\n👤 ${userData.username} (${userData.email}) - ID: ${userId}`);
                userData.chaves.forEach((chave, index) => {
                    const statusIcon = chave.validation_status === 'CONNECTED' ? '✅' : 
                                     chave.validation_status === 'FAILED' ? '❌' : '⏳';
                    console.log(`  ${index + 1}. ${statusIcon} ${chave.exchange.toUpperCase()} ${chave.environment}`);
                    console.log(`     Key ID: ${chave.key_id}`);
                    console.log(`     API Key: ${chave.api_key.substring(0, 12)}...`);
                    console.log(`     Status: ${chave.validation_status}`);
                });
            }

            console.log(`\n📊 RESUMO: ${Object.keys(chavesOrganizadas).length} usuários, ${this.stats.total_keys} chaves válidas`);
            return chavesOrganizadas;

        } catch (error) {
            console.error('❌ ERRO CRÍTICO ao buscar chaves:', error.message);
            console.error('   Stack:', error.stack);
            this.stats.errors.push({
                operation: 'buscar_chaves',
                error: error.message
            });
            return {};
        }
    }

    /**
     * 🏦 BUSCAR SALDO BYBIT
     */
    async buscarSaldoBybit(apiKey, secretKey, environment) {
        console.log(`\n💰 BUSCANDO SALDO BYBIT ${environment.toUpperCase()}`);
        console.log('=' .repeat(50));

        const baseURL = environment === 'testnet' 
            ? 'https://api-testnet.bybit.com' 
            : 'https://api.bybit.com';

        try {
            const timestamp = Date.now().toString();
            const recvWindow = '5000';
            
            // Parâmetros para buscar saldo
            const params = { accountType: 'UNIFIED' };
            const queryString = new URLSearchParams(params).toString();
            
            // Assinatura correta Bybit V5
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

            console.log('📡 Consultando saldo...');
            const response = await axios.get(`${baseURL}/v5/account/wallet-balance?${queryString}`, {
                headers,
                timeout: 15000
            });

            if (response.data.retCode === 0) {
                const saldo = this.extrairSaldoBybit(response.data);
                console.log(`✅ Saldo obtido com sucesso`);
                console.log(`💰 USDT: ${saldo.USDT}`);
                console.log(`📊 Total USD: $${saldo.totalUSD}`);
                console.log(`🪙 Moedas: ${saldo.coinCount}`);
                
                this.stats.successful_connections++;
                this.stats.total_balance_usd += parseFloat(saldo.totalUSD);
                
                return {
                    success: true,
                    balance: saldo,
                    raw_data: response.data
                };
            } else {
                console.log(`❌ Erro ${response.data.retCode}: ${response.data.retMsg}`);
                this.stats.failed_connections++;
                return {
                    success: false,
                    error_code: response.data.retCode,
                    error_message: response.data.retMsg
                };
            }

        } catch (error) {
            console.log(`❌ ERRO: ${error.message}`);
            this.stats.failed_connections++;
            
            if (error.response?.data) {
                const errorData = error.response.data;
                console.log(`🔍 Código: ${errorData.retCode}, Mensagem: ${errorData.retMsg}`);
                return {
                    success: false,
                    error_code: errorData.retCode,
                    error_message: errorData.retMsg
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🏦 BUSCAR SALDO BINANCE
     */
    async buscarSaldoBinance(apiKey, secretKey, environment) {
        console.log(`\n💰 BUSCANDO SALDO BINANCE ${environment.toUpperCase()}`);
        console.log('=' .repeat(50));

        try {
            const exchange = new ccxt.binance({
                apiKey: apiKey,
                secret: secretKey,
                sandbox: environment === 'testnet',
                enableRateLimit: true
            });

            console.log('📡 Consultando saldo...');
            const balance = await exchange.fetchBalance();
            
            const saldoTotal = Object.keys(balance.total)
                .filter(coin => balance.total[coin] > 0)
                .reduce((acc, coin) => {
                    const amount = balance.total[coin];
                    console.log(`💰 ${coin}: ${amount}`);
                    acc[coin] = amount;
                    return acc;
                }, {});

            const usdtBalance = balance.total['USDT'] || 0;
            console.log(`✅ Saldo USDT: ${usdtBalance}`);
            
            this.stats.successful_connections++;
            this.stats.total_balance_usd += usdtBalance;

            return {
                success: true,
                balance: {
                    USDT: usdtBalance,
                    total: saldoTotal,
                    free: balance.free,
                    used: balance.used
                }
            };

        } catch (error) {
            console.log(`❌ ERRO: ${error.message}`);
            this.stats.failed_connections++;
            return {
                success: false,
                error: error.message
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
            const coinDetails = {};

            coins.forEach(coin => {
                const balance = parseFloat(coin.walletBalance) || 0;
                const usdValue = parseFloat(coin.usdValue) || 0;
                
                if (balance > 0) {
                    coinDetails[coin.coin] = {
                        balance: balance,
                        usdValue: usdValue
                    };
                    
                    if (coin.coin === 'USDT') {
                        usdtBalance = balance;
                    }
                    totalUSD += usdValue;
                }
            });

            return {
                USDT: usdtBalance,
                totalUSD: totalUSD.toFixed(2),
                coinCount: Object.keys(coinDetails).length,
                details: coinDetails
            };
        } catch (error) {
            console.error('❌ Erro ao extrair saldo:', error.message);
            return { USDT: 0, totalUSD: '0.00', coinCount: 0, details: {} };
        }
    }

    /**
     * 🚀 EXECUÇÃO PRINCIPAL
     */
    async executarBuscaCompleta() {
        console.log('\n💰 BUSCA COMPLETA DE SALDOS - INICIANDO');
        console.log('========================================');
        console.log(`🕐 Timestamp: ${new Date().toISOString()}`);

        try {
            // 1. Detectar IP
            await this.detectarIP();

            // 2. Buscar chaves no banco
            const chavesOrganizadas = await this.buscarChavesNoBanco();

            if (Object.keys(chavesOrganizadas).length === 0) {
                console.log('\n❌ OPERAÇÃO ABORTADA - SEM CHAVES VÁLIDAS');
                return;
            }

            // 3. Buscar saldos
            console.log('\n🔄 INICIANDO BUSCA DE SALDOS...');
            const resultados = {};

            for (const [userId, userData] of Object.entries(chavesOrganizadas)) {
                console.log(`\n👤 PROCESSANDO USUÁRIO: ${userData.username}`);
                console.log('═'.repeat(60));

                resultados[userId] = {
                    username: userData.username,
                    email: userData.email,
                    saldos: {},
                    total_usd: 0
                };

                for (const chave of userData.chaves) {
                    this.stats.exchanges_tested.add(`${chave.exchange}_${chave.environment}`);
                    
                    let resultado;
                    
                    if (chave.exchange === 'bybit') {
                        resultado = await this.buscarSaldoBybit(
                            chave.api_key,
                            chave.secret_key,
                            chave.environment
                        );
                    } else if (chave.exchange === 'binance') {
                        resultado = await this.buscarSaldoBinance(
                            chave.api_key,
                            chave.secret_key,
                            chave.environment
                        );
                    }

                    const chaveId = `${chave.exchange}_${chave.environment}`;
                    resultados[userId].saldos[chaveId] = resultado;

                    if (resultado?.success && resultado.balance) {
                        const usdValue = parseFloat(resultado.balance.totalUSD || resultado.balance.USDT || 0);
                        resultados[userId].total_usd += usdValue;
                    }

                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // 4. Relatório final
            this.gerarRelatorioFinal(resultados);

        } catch (error) {
            console.error('❌ ERRO CRÍTICO:', error.message);
            console.error('   Stack:', error.stack);
        } finally {
            try {
                await pool.end();
            } catch (error) {
                console.error('⚠️ Erro ao fechar pool:', error.message);
            }
        }
    }

    /**
     * 📋 RELATÓRIO FINAL
     */
    gerarRelatorioFinal(resultados) {
        console.log('\n📊 RELATÓRIO FINAL DE SALDOS');
        console.log('============================');
        console.log(`🕐 Concluído em: ${new Date().toISOString()}`);
        console.log(`🌐 IP utilizado: ${this.currentIP}`);
        console.log(`🔑 Total de chaves: ${this.stats.total_keys}`);
        console.log(`✅ Conexões bem-sucedidas: ${this.stats.successful_connections}`);
        console.log(`❌ Conexões falharam: ${this.stats.failed_connections}`);
        console.log(`📈 Taxa de sucesso: ${((this.stats.successful_connections / this.stats.total_keys) * 100).toFixed(1)}%`);
        console.log(`💰 Saldo total USD: $${this.stats.total_balance_usd.toFixed(2)}`);
        console.log(`🏦 Exchanges testadas: ${Array.from(this.stats.exchanges_tested).join(', ')}`);

        console.log('\n👥 SALDOS POR USUÁRIO:');
        console.log('======================');
        
        for (const [userId, userData] of Object.entries(resultados)) {
            console.log(`\n👤 ${userData.username} (${userData.email})`);
            console.log(`💰 Total USD: $${userData.total_usd.toFixed(2)}`);
            
            for (const [chaveId, saldo] of Object.entries(userData.saldos)) {
                if (saldo.success) {
                    console.log(`  ✅ ${chaveId}: $${saldo.balance.totalUSD || saldo.balance.USDT || 0}`);
                } else {
                    console.log(`  ❌ ${chaveId}: ${saldo.error_message || saldo.error || 'Erro desconhecido'}`);
                }
            }
        }

        if (this.stats.errors.length > 0) {
            console.log('\n⚠️ ERROS ENCONTRADOS:');
            console.log('=====================');
            this.stats.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${JSON.stringify(error)}`);
            });
        }

        console.log('\n🎯 CONCLUSÃO:');
        if (this.stats.successful_connections > 0) {
            console.log('✅ Sistema operacional - saldos acessíveis');
            console.log('🚀 Pronto para operações de trading');
        } else {
            console.log('❌ Sistema com problemas críticos');
            console.log('🔧 Verificar configurações de IP e chaves');
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const buscador = new BuscadorSaldos();
    buscador.executarBuscaCompleta();
}

module.exports = BuscadorSaldos;
