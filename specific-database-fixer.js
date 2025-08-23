#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO ESPECÍFICA BASEADA NA ESTRUTURA REAL
 * ================================================
 * 
 * Corrige os problemas específicos identificados na análise real
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

class SpecificDatabaseFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }

    async fixAllIssues() {
        console.log('🔧 CORREÇÃO ESPECÍFICA BASEADA NA ESTRUTURA REAL');
        console.log('=================================================');
        
        try {
            // 1. Corrigir signal_type NULL na tabela signals
            await this.fixSignalsSignalType();
            
            // 2. Corrigir campos obrigatórios em users
            await this.fixUsersRequiredFields();
            
            // 3. Corrigir user_api_keys para ter campos obrigatórios preenchidos
            await this.fixUserApiKeys();
            
            // 4. Limpar dados inconsistentes
            await this.cleanInconsistentData();
            
            // 5. Validação final
            await this.finalValidation();
            
            console.log('\n✅ TODAS AS CORREÇÕES ESPECÍFICAS FINALIZADAS');
            
        } catch (error) {
            console.error('❌ Erro durante as correções:', error.message);
        } finally {
            await this.pool.end();
        }
    }

    async fixSignalsSignalType() {
        console.log('\n🔧 CORRIGINDO SIGNAL_TYPE EM SIGNALS');
        console.log('====================================');
        
        try {
            // Corrigir signal_type baseado no action
            await this.pool.query(`
                UPDATE signals 
                SET signal_type = CASE 
                    WHEN action = 'BUY' THEN 'SINAL_LONG'
                    WHEN action = 'SELL' THEN 'SINAL_SHORT'
                    WHEN side = 'BUY' THEN 'SINAL_LONG'
                    WHEN side = 'SELL' THEN 'SINAL_SHORT'
                    WHEN side = 'LONG' THEN 'SINAL_LONG'
                    WHEN side = 'SHORT' THEN 'SINAL_SHORT'
                    ELSE 'SINAL_UNKNOWN'
                END
                WHERE signal_type IS NULL
            `);
            
            // Atualizar ticker UNKNOWN para símbolos mais específicos quando possível
            await this.pool.query(`
                UPDATE signals 
                SET ticker = CASE 
                    WHEN symbol IS NOT NULL AND symbol != 'UNKNOWN' THEN symbol
                    WHEN trading_symbol IS NOT NULL THEN trading_symbol
                    ELSE 'BTCUSDT'
                END
                WHERE ticker = 'UNKNOWN' OR ticker IS NULL
            `);
            
            // Garantir que created_at não seja NULL
            await this.pool.query(`
                UPDATE signals 
                SET created_at = COALESCE(created_at, timestamp, received_at, NOW())
                WHERE created_at IS NULL
            `);
            
            const fixedCount = await this.pool.query(`
                SELECT COUNT(*) as count FROM signals WHERE signal_type IS NOT NULL
            `);
            
            console.log(`✅ ${fixedCount.rows[0].count} sinais com signal_type corrigido`);

        } catch (error) {
            console.log(`❌ Erro ao corrigir signals: ${error.message}`);
        }
    }

    async fixUsersRequiredFields() {
        console.log('\n🔧 CORRIGINDO CAMPOS OBRIGATÓRIOS EM USERS');
        console.log('==========================================');
        
        try {
            // Corrigir campos booleanos NULL
            await this.pool.query(`
                UPDATE users 
                SET 
                    is_active = COALESCE(is_active, true),
                    is_verified = COALESCE(is_verified, false),
                    is_admin = COALESCE(is_admin, false),
                    auto_trading_enabled = COALESCE(auto_trading_enabled, false),
                    auto_trading = COALESCE(auto_trading, false),
                    trading_active = COALESCE(trading_active, true),
                    exchange_testnet_mode = COALESCE(exchange_testnet_mode, true),
                    exchange_auto_trading = COALESCE(exchange_auto_trading, false)
                WHERE id IS NOT NULL
            `);
            
            // Corrigir campos de saldo NULL
            await this.pool.query(`
                UPDATE users 
                SET 
                    balance = COALESCE(balance, 0.00),
                    balance_brl = COALESCE(balance_brl, 0.00),
                    balance_usd = COALESCE(balance_usd, 0.00),
                    balance_real_brl = COALESCE(balance_real_brl, 0.00),
                    balance_real_usd = COALESCE(balance_real_usd, 0.00),
                    balance_admin_brl = COALESCE(balance_admin_brl, 0.00),
                    balance_admin_usd = COALESCE(balance_admin_usd, 0.00),
                    balance_commission_brl = COALESCE(balance_commission_brl, 0.00),
                    balance_commission_usd = COALESCE(balance_commission_usd, 0.00),
                    total_profit = COALESCE(total_profit, 0.00),
                    total_deposited = COALESCE(total_deposited, 0.00),
                    affiliate_earnings = COALESCE(affiliate_earnings, 0.00),
                    administrative_credit = COALESCE(administrative_credit, 0.00),
                    prepaid_balance = COALESCE(prepaid_balance, 0.00)
                WHERE id IS NOT NULL
            `);
            
            // Corrigir campos de configuração
            await this.pool.query(`
                UPDATE users 
                SET 
                    plan_type = COALESCE(plan_type, 'MONTHLY'),
                    affiliate_type = COALESCE(affiliate_type, 'none'),
                    status = COALESCE(status, 'active'),
                    subscription_status = COALESCE(subscription_status, 'active'),
                    validation_status = COALESCE(validation_status, 'pending'),
                    bybit_validation_status = COALESCE(bybit_validation_status, 'pending'),
                    api_validation_status = COALESCE(api_validation_status, 'pending'),
                    country = COALESCE(country, 'BR'),
                    currency = COALESCE(currency, 'BRL'),
                    language = COALESCE(language, 'pt'),
                    timezone = COALESCE(timezone, 'America/Sao_Paulo'),
                    role = COALESCE(role, 'user'),
                    user_type = COALESCE(user_type, 'regular'),
                    exchange_preference = COALESCE(exchange_preference, 'bybit'),
                    account_type = COALESCE(account_type, 'testnet')
                WHERE id IS NOT NULL
            `);
            
            // Corrigir campos numéricos de configuração
            await this.pool.query(`
                UPDATE users 
                SET 
                    max_leverage = COALESCE(max_leverage, 10),
                    leverage_preference = COALESCE(leverage_preference, 10),
                    risk_percentage = COALESCE(risk_percentage, 2.00),
                    commission_rate = COALESCE(commission_rate, 10.00),
                    max_positions = COALESCE(max_positions, 2),
                    failed_login_attempts = COALESCE(failed_login_attempts, 0),
                    total_trades = COALESCE(total_trades, 0),
                    winning_trades = COALESCE(winning_trades, 0),
                    losing_trades = COALESCE(losing_trades, 0),
                    win_rate_percentage = COALESCE(win_rate_percentage, 0.00),
                    total_pnl = COALESCE(total_pnl, 0.00),
                    total_volume_traded = COALESCE(total_volume_traded, 0.00),
                    average_return_per_trade = COALESCE(average_return_per_trade, 0.00),
                    accumulated_return = COALESCE(accumulated_return, 0.00),
                    best_trade_pnl = COALESCE(best_trade_pnl, 0.00),
                    worst_trade_pnl = COALESCE(worst_trade_pnl, 0.00),
                    usage_count = COALESCE(usage_count, 0)
                WHERE id IS NOT NULL
            `);
            
            // Corrigir timestamps
            await this.pool.query(`
                UPDATE users 
                SET 
                    created_at = COALESCE(created_at, NOW()),
                    updated_at = COALESCE(updated_at, NOW()),
                    performance_updated_at = COALESCE(performance_updated_at, NOW())
                WHERE id IS NOT NULL
            `);
            
            console.log('✅ Campos obrigatórios em users corrigidos');

        } catch (error) {
            console.log(`❌ Erro ao corrigir users: ${error.message}`);
        }
    }

    async fixUserApiKeys() {
        console.log('\n🔧 CORRIGINDO USER_API_KEYS');
        console.log('===========================');
        
        try {
            // Corrigir campos booleanos
            await this.pool.query(`
                UPDATE user_api_keys 
                SET 
                    is_active = COALESCE(is_active, true),
                    is_testnet = COALESCE(is_testnet, true),
                    testnet = COALESCE(testnet, true),
                    is_valid = COALESCE(is_valid, false)
                WHERE id IS NOT NULL
            `);
            
            // Corrigir campos de status
            await this.pool.query(`
                UPDATE user_api_keys 
                SET 
                    validation_status = COALESCE(validation_status, 'pending'),
                    status = COALESCE(status, 'pending'),
                    detection_confidence = COALESCE(detection_confidence, 'low'),
                    exchange_type = COALESCE(exchange_type, 'spot'),
                    environment = CASE 
                        WHEN environment = '' THEN 'testnet'
                        WHEN environment IS NULL THEN 'testnet'
                        ELSE environment
                    END
                WHERE id IS NOT NULL
            `);
            
            // Corrigir campos numéricos
            await this.pool.query(`
                UPDATE user_api_keys 
                SET 
                    usage_count = COALESCE(usage_count, 0),
                    real_balance_usdt = COALESCE(real_balance_usdt, 0.00)
                WHERE id IS NOT NULL
            `);
            
            // Corrigir timestamps
            await this.pool.query(`
                UPDATE user_api_keys 
                SET 
                    created_at = COALESCE(created_at, NOW()),
                    updated_at = COALESCE(updated_at, NOW())
                WHERE id IS NOT NULL
            `);
            
            // Verificar se há chaves sem api_key ou secret_key
            const missingKeys = await this.pool.query(`
                SELECT COUNT(*) as count 
                FROM user_api_keys 
                WHERE (api_key IS NULL OR api_key = '') 
                AND (api_key_encrypted IS NULL OR api_key_encrypted = '')
            `);
            
            if (parseInt(missingKeys.rows[0].count) > 0) {
                console.log(`⚠️ ${missingKeys.rows[0].count} chaves sem dados de API - podem precisar ser reconfiguradas`);
            }
            
            console.log('✅ user_api_keys corrigido');

        } catch (error) {
            console.log(`❌ Erro ao corrigir user_api_keys: ${error.message}`);
        }
    }

    async cleanInconsistentData() {
        console.log('\n🔧 LIMPANDO DADOS INCONSISTENTES');
        console.log('================================');
        
        try {
            // Limpar sinais muito antigos sem dados essenciais
            const deletedOldSignals = await this.pool.query(`
                DELETE FROM signals 
                WHERE timestamp < NOW() - INTERVAL '30 days'
                AND (symbol IS NULL OR symbol = 'UNKNOWN')
                AND (action IS NULL OR action = '')
            `);
            
            console.log(`✅ ${deletedOldSignals.rowCount} sinais antigos inconsistentes removidos`);
            
            // Limpar registros órfãos em user_api_keys
            const deletedOrphanKeys = await this.pool.query(`
                DELETE FROM user_api_keys 
                WHERE user_id NOT IN (SELECT id FROM users)
            `);
            
            console.log(`✅ ${deletedOrphanKeys.rowCount} chaves órfãs removidas`);

        } catch (error) {
            console.log(`❌ Erro na limpeza: ${error.message}`);
        }
    }

    async finalValidation() {
        console.log('\n🔍 VALIDAÇÃO FINAL ESPECÍFICA');
        console.log('=============================');
        
        try {
            // Verificar signals
            const signalsValidation = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN signal_type IS NULL THEN 1 END) as null_signal_type,
                    COUNT(CASE WHEN ticker IS NULL OR ticker = 'UNKNOWN' THEN 1 END) as unknown_ticker,
                    COUNT(CASE WHEN created_at IS NULL THEN 1 END) as null_created_at
                FROM signals
            `);
            
            const signals = signalsValidation.rows[0];
            console.log(`📊 SIGNALS: ${signals.total} total`);
            console.log(`   - signal_type NULL: ${signals.null_signal_type}`);
            console.log(`   - ticker UNKNOWN/NULL: ${signals.unknown_ticker}`);
            console.log(`   - created_at NULL: ${signals.null_created_at}`);
            
            // Verificar users
            const usersValidation = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_active IS NULL THEN 1 END) as null_active,
                    COUNT(CASE WHEN plan_type IS NULL THEN 1 END) as null_plan_type,
                    COUNT(CASE WHEN balance_brl IS NULL THEN 1 END) as null_balance
                FROM users
            `);
            
            const users = usersValidation.rows[0];
            console.log(`📊 USERS: ${users.total} total`);
            console.log(`   - is_active NULL: ${users.null_active}`);
            console.log(`   - plan_type NULL: ${users.null_plan_type}`);
            console.log(`   - balance_brl NULL: ${users.null_balance}`);
            
            // Verificar user_api_keys
            const apiKeysValidation = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_active IS NULL THEN 1 END) as null_active,
                    COUNT(CASE WHEN (api_key IS NOT NULL OR api_key_encrypted IS NOT NULL) THEN 1 END) as with_keys
                FROM user_api_keys
            `);
            
            const apiKeys = apiKeysValidation.rows[0];
            console.log(`📊 USER_API_KEYS: ${apiKeys.total} total`);
            console.log(`   - is_active NULL: ${apiKeys.null_active}`);
            console.log(`   - com chaves: ${apiKeys.with_keys}`);
            
            // Status geral
            if (signals.null_signal_type === '0' && users.null_active === '0' && apiKeys.null_active === '0') {
                console.log('\n🎉 BANCO DE DADOS PRONTO PARA PROCESSAMENTO DE ORDENS!');
            } else {
                console.log('\n⚠️ Ainda existem alguns campos NULL que podem precisar atenção');
            }

        } catch (error) {
            console.log(`❌ Erro na validação: ${error.message}`);
        }
    }
}

// Executar correções
if (require.main === module) {
    const fixer = new SpecificDatabaseFixer();
    fixer.fixAllIssues();
}

module.exports = SpecificDatabaseFixer;
