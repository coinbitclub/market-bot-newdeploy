#!/usr/bin/env node

/**
 * 🧑‍💼 GERENCIADOR DE USUÁRIOS E CHAVES DE EXCHANGES
 * =================================================
 * 
 * Gerencia chaves de API, configurações e execuções por usuário
 */

const { Pool } = require('pg');
const EncryptionManager = require('./encryption-manager');

class UserExchangeManager {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });
        
        this.encryption = new EncryptionManager();
        console.log('🧑‍💼 User Exchange Manager iniciado');
    }

    async saveUserApiKeys(userId, exchange, apiKey, apiSecret, testnetMode = true) {
        console.log(`🔑 Salvando chaves do ${exchange} para usuário ${userId}`);
        
        try {
            // Criptografar as chaves
            const encryptedKey = this.encryption.encryptSimple(apiKey);
            const encryptedSecret = this.encryption.encryptSimple(apiSecret);
            
            if (!encryptedKey || !encryptedSecret) {
                throw new Error('Falha ao criptografar chaves da API');
            }
            
            const query = `
                UPDATE users 
                SET 
                    ${exchange}_api_key_encrypted = $1,
                    ${exchange}_api_secret_encrypted = $2,
                    exchange_testnet_mode = $3,
                    api_validation_status = 'pending',
                    last_api_validation = NOW()
                WHERE id = $4
            `;
            
            await this.pool.query(query, [encryptedKey, encryptedSecret, testnetMode, userId]);
            
            console.log(`✅ Chaves do ${exchange} salvas para usuário ${userId}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Erro ao salvar chaves do ${exchange}:`, error.message);
            return false;
        }
    }

    async getUserApiKeys(userId, exchange) {
        try {
            const query = `
                SELECT 
                    ${exchange}_api_key_encrypted,
                    ${exchange}_api_secret_encrypted,
                    exchange_testnet_mode,
                    exchange_auto_trading,
                    api_validation_status
                FROM users 
                WHERE id = $1 AND ${exchange}_api_key_encrypted IS NOT NULL
            `;
            
            const result = await this.pool.query(query, [userId]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            const user = result.rows[0];
            
            // Descriptografar as chaves
            const apiKey = this.encryption.decryptSimple(user[`${exchange}_api_key_encrypted`]);
            const apiSecret = this.encryption.decryptSimple(user[`${exchange}_api_secret_encrypted`]);
            
            if (!apiKey || !apiSecret) {
                console.error(`❌ Falha ao descriptografar chaves do ${exchange} para usuário ${userId}`);
                return null;
            }
            
            return {
                apiKey,
                apiSecret,
                testnetMode: user.exchange_testnet_mode,
                autoTradingEnabled: user.exchange_auto_trading,
                validationStatus: user.api_validation_status
            };
            
        } catch (error) {
            console.error(`❌ Erro ao buscar chaves do ${exchange}:`, error.message);
            return null;
        }
    }

    async getAllUsersWithApiKeys() {
        try {
            // MUDANÇA: Buscar TODOS os usuários com chaves COMPLETAS (key + secret)
            // independente do exchange_auto_trading
            const query = `
                SELECT 
                    id,
                    username,
                    email,
                    exchange_auto_trading,
                    exchange_testnet_mode,
                    api_validation_status,
                    CASE WHEN binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL THEN true ELSE false END as has_binance_complete,
                    CASE WHEN bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL THEN true ELSE false END as has_bybit_complete
                FROM users 
                WHERE 
                    (
                        (binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL) OR
                        (bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL)
                    )
                ORDER BY id
            `;
            
            const result = await this.pool.query(query);
            
            // Log para mostrar quais usuários foram encontrados
            console.log(`👥 Encontrados ${result.rows.length} usuários com chaves completas:`);
            result.rows.forEach(user => {
                const autoStatus = user.exchange_auto_trading ? '✅ AUTO' : '⚠️  MANUAL';
                const binanceStatus = user.has_binance_complete ? '🟢 B' : '';
                const bybitStatus = user.has_bybit_complete ? '🟡 Y' : '';
                console.log(`   • ID ${user.id}: ${user.username} ${autoStatus} ${binanceStatus}${bybitStatus}`);
            });
            
            return result.rows;
            
        } catch (error) {
            console.error('❌ Erro ao buscar usuários com chaves:', error.message);
            return [];
        }
    }

    async enableAutoTradingForUsersWithKeys() {
        console.log('🚀 Ativando auto trading para usuários com chaves completas...');
        
        try {
            const updateQuery = `
                UPDATE users 
                SET exchange_auto_trading = true 
                WHERE 
                    exchange_auto_trading = false
                    AND (
                        (binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL) OR
                        (bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL)
                    )
                RETURNING id, username
            `;
            
            const result = await this.pool.query(updateQuery);
            
            if (result.rows.length > 0) {
                console.log(`✅ Auto trading ativado para ${result.rows.length} usuários:`);
                result.rows.forEach(user => {
                    console.log(`   • ID ${user.id}: ${user.username}`);
                });
            } else {
                console.log('ℹ️  Todos os usuários com chaves já têm auto trading ativo');
            }
            
            return result.rows;
            
        } catch (error) {
            console.error('❌ Erro ao ativar auto trading:', error.message);
            return [];
        }
    }

    async validateUserApiKeys(userId, exchange) {
        console.log(`🔍 Validando chaves do ${exchange} para usuário ${userId}`);
        
        try {
            const keys = await this.getUserApiKeys(userId, exchange);
            if (!keys) {
                return { valid: false, error: 'Chaves não encontradas' };
            }
            
            // Configurar CCXT para validação
            const ccxt = require('ccxt');
            let exchangeInstance;
            
            if (exchange === 'binance') {
                exchangeInstance = new ccxt.binance({
                    apiKey: keys.apiKey,
                    secret: keys.apiSecret,
                    sandbox: keys.testnetMode,
                    enableRateLimit: true
                });
            } else if (exchange === 'bybit') {
                exchangeInstance = new ccxt.bybit({
                    apiKey: keys.apiKey,
                    secret: keys.apiSecret,
                    sandbox: keys.testnetMode,
                    enableRateLimit: true
                });
            }
            
            // Testar conexão buscando saldo
            const balance = await exchangeInstance.fetchBalance();
            
            // Atualizar status no banco
            await this.pool.query(`
                UPDATE users 
                SET 
                    api_validation_status = 'valid',
                    last_api_validation = NOW()
                WHERE id = $1
            `, [userId]);
            
            console.log(`✅ Chaves do ${exchange} válidas para usuário ${userId}`);
            
            return { 
                valid: true, 
                balance: balance,
                testnetMode: keys.testnetMode
            };
            
        } catch (error) {
            console.error(`❌ Validação falhou para ${exchange}:`, error.message);
            
            // Atualizar status de erro no banco
            await this.pool.query(`
                UPDATE users 
                SET 
                    api_validation_status = 'invalid',
                    last_api_validation = NOW()
                WHERE id = $1
            `, [userId]);
            
            return { 
                valid: false, 
                error: error.message 
            };
        }
    }

    async saveUserTradingExecution(userId, signalId, exchange, executionData) {
        try {
            const query = `
                INSERT INTO user_trading_executions (
                    user_id, signal_id, exchange, order_id, symbol, side, amount, 
                    price, status, testnet_mode, executed_at, raw_response
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
            `;
            
            const values = [
                userId,
                signalId,
                exchange,
                executionData.orderId || null,
                executionData.symbol,
                executionData.side,
                executionData.amount,
                executionData.price || null,
                executionData.status,
                executionData.testnetMode || true,
                new Date(),
                JSON.stringify(executionData.rawResponse || {})
            ];
            
            const result = await this.pool.query(query, values);
            const executionId = result.rows[0].id;
            
            console.log(`✅ Execução salva para usuário ${userId}: ${executionId}`);
            return executionId;
            
        } catch (error) {
            console.error('❌ Erro ao salvar execução do usuário:', error.message);
            return null;
        }
    }

    async getUserTradingHistory(userId, limit = 10) {
        try {
            const query = `
                SELECT 
                    ute.*,
                    s.symbol as signal_symbol,
                    s.action as signal_action
                FROM user_trading_executions ute
                LEFT JOIN signals s ON ute.signal_id = s.id
                WHERE ute.user_id = $1
                ORDER BY ute.executed_at DESC
                LIMIT $2
            `;
            
            const result = await this.pool.query(query, [userId, limit]);
            return result.rows;
            
        } catch (error) {
            console.error('❌ Erro ao buscar histórico do usuário:', error.message);
            return [];
        }
    }

    async enableAutoTrading(userId, enabled = true) {
        try {
            await this.pool.query(`
                UPDATE users 
                SET exchange_auto_trading = $1
                WHERE id = $2
            `, [enabled, userId]);
            
            console.log(`✅ Auto trading ${enabled ? 'ativado' : 'desativado'} para usuário ${userId}`);
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao alterar auto trading:', error.message);
            return false;
        }
    }
}

module.exports = UserExchangeManager;
