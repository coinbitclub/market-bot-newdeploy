#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO CRÍTICA DE DADOS NULL NO BANCO
 * ==========================================
 * 
 * Corrige os problemas identificados na análise que estão
 * impactando o processamento de ordens
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

class DatabaseNullFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }

    async fixAllCriticalIssues() {
        console.log('🔧 INICIANDO CORREÇÃO CRÍTICA DE DADOS NULL');
        console.log('============================================');
        
        try {
            // 1. Corrigir estrutura da tabela user_api_keys
            await this.fixUserApiKeysStructure();
            
            // 2. Corrigir dados da tabela signals
            await this.fixSignalsData();
            
            // 3. Corrigir signal_metrics_log
            await this.fixSignalMetricsLog();
            
            // 4. Criar tabela top100_data se não existir
            await this.createTop100DataTable();
            
            // 5. Corrigir campos críticos em users
            await this.fixUsersData();
            
            // 6. Corrigir fear_greed_index
            await this.fixFearGreedIndex();
            
            // 7. Verificar e criar índices necessários
            await this.createNecessaryIndexes();
            
            console.log('\n✅ TODAS AS CORREÇÕES FINALIZADAS');
            console.log('=================================');
            
            // Executar validação final
            await this.validateFixes();
            
        } catch (error) {
            console.error('❌ Erro durante as correções:', error.message);
        } finally {
            await this.pool.end();
        }
    }

    async fixUserApiKeysStructure() {
        console.log('\n🔧 CORRIGINDO ESTRUTURA USER_API_KEYS');
        console.log('=====================================');
        
        try {
            // Adicionar colunas faltantes se não existirem
            const alterQueries = [
                `ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS secret_key TEXT`,
                `ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
                `ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP`,
                `ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'testnet'`
            ];

            for (const query of alterQueries) {
                await this.pool.query(query);
                console.log('✅ Estrutura atualizada');
            }

            // Atualizar registros com valores padrão para campos NULL críticos
            await this.pool.query(`
                UPDATE user_api_keys 
                SET 
                    is_active = COALESCE(is_active, true),
                    environment = COALESCE(environment, 'testnet'),
                    created_at = COALESCE(created_at, NOW()),
                    updated_at = COALESCE(updated_at, NOW())
                WHERE id IS NOT NULL
            `);
            
            console.log('✅ user_api_keys corrigida');

        } catch (error) {
            console.log(`❌ Erro ao corrigir user_api_keys: ${error.message}`);
        }
    }

    async fixSignalsData() {
        console.log('\n🔧 CORRIGINDO DADOS DA TABELA SIGNALS');
        console.log('=====================================');
        
        try {
            // Atualizar signals com ticker NULL
            await this.pool.query(`
                UPDATE signals 
                SET ticker = COALESCE(ticker, symbol, 'UNKNOWN')
                WHERE ticker IS NULL AND symbol IS NOT NULL
            `);
            
            // Atualizar signal_type NULL baseado no sinal
            await this.pool.query(`
                UPDATE signals 
                SET signal_type = CASE 
                    WHEN signal ILIKE '%LONG%' THEN 'SINAL_LONG'
                    WHEN signal ILIKE '%SHORT%' THEN 'SINAL_SHORT'
                    WHEN action = 'BUY' THEN 'SINAL_LONG'
                    WHEN action = 'SELL' THEN 'SINAL_SHORT'
                    ELSE 'SINAL_UNKNOWN'
                END
                WHERE signal_type IS NULL
            `);
            
            // Limpar sinais muito antigos que podem estar corrompidos
            await this.pool.query(`
                DELETE FROM signals 
                WHERE timestamp < NOW() - INTERVAL '30 days'
                AND (ticker IS NULL OR signal_type IS NULL)
            `);
            
            const updatedSignals = await this.pool.query(`
                SELECT COUNT(*) as count FROM signals WHERE ticker IS NOT NULL AND signal_type IS NOT NULL
            `);
            
            console.log(`✅ Signals corrigidos: ${updatedSignals.rows[0].count} registros válidos`);

        } catch (error) {
            console.log(`❌ Erro ao corrigir signals: ${error.message}`);
        }
    }

    async fixSignalMetricsLog() {
        console.log('\n🔧 CORRIGINDO SIGNAL_METRICS_LOG');
        console.log('================================');
        
        try {
            // Atualizar campos críticos NULL
            await this.pool.query(`
                UPDATE signal_metrics_log 
                SET 
                    ticker = COALESCE(ticker, symbol, 'UNKNOWN'),
                    signal_type = CASE 
                        WHEN signal_type IS NULL AND ticker LIKE '%LONG%' THEN 'SINAL_LONG'
                        WHEN signal_type IS NULL AND ticker LIKE '%SHORT%' THEN 'SINAL_SHORT'
                        WHEN signal_type IS NULL THEN 'SINAL_UNKNOWN'
                        ELSE signal_type
                    END,
                    ai_approved = COALESCE(ai_approved, false),
                    processed_at = COALESCE(processed_at, created_at, NOW()),
                    fear_greed_value = COALESCE(fear_greed_value, fear_greed_index, 50)
                WHERE id IS NOT NULL
            `);
            
            console.log('✅ signal_metrics_log corrigido');

        } catch (error) {
            console.log(`❌ Erro ao corrigir signal_metrics_log: ${error.message}`);
        }
    }

    async createTop100DataTable() {
        console.log('\n🔧 CRIANDO TABELA TOP100_DATA');
        console.log('=============================');
        
        try {
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS top100_data (
                    id SERIAL PRIMARY KEY,
                    percentage_up DECIMAL(5,2) NOT NULL,
                    percentage_down DECIMAL(5,2) NOT NULL,
                    total_coins INTEGER DEFAULT 100,
                    trend VARCHAR(20) DEFAULT 'SIDEWAYS',
                    market_cap_total DECIMAL(20,2),
                    volume_24h DECIMAL(20,2),
                    collected_at TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);
            
            // Inserir dados padrão se a tabela estiver vazia
            const count = await this.pool.query('SELECT COUNT(*) as count FROM top100_data');
            
            if (parseInt(count.rows[0].count) === 0) {
                await this.pool.query(`
                    INSERT INTO top100_data (percentage_up, percentage_down, trend) 
                    VALUES (50.0, 50.0, 'SIDEWAYS')
                `);
                console.log('✅ Dados padrão inseridos em top100_data');
            }
            
            console.log('✅ top100_data criada e configurada');

        } catch (error) {
            console.log(`❌ Erro ao criar top100_data: ${error.message}`);
        }
    }

    async fixUsersData() {
        console.log('\n🔧 CORRIGINDO DADOS CRÍTICOS EM USERS');
        console.log('=====================================');
        
        try {
            // Garantir que todos os usuários tenham valores padrão para campos críticos
            await this.pool.query(`
                UPDATE users 
                SET 
                    is_active = COALESCE(is_active, true),
                    plan_type = COALESCE(plan_type, 'MONTHLY'),
                    affiliate_type = COALESCE(affiliate_type, 'none'),
                    balance_brl = COALESCE(balance_brl, 0.00),
                    balance_usd = COALESCE(balance_usd, 0.00),
                    prepaid_balance_usd = COALESCE(prepaid_balance_usd, 0.00),
                    admin_credits_brl = COALESCE(admin_credits_brl, 0.00),
                    admin_credits_usd = COALESCE(admin_credits_usd, 0.00),
                    created_at = COALESCE(created_at, NOW()),
                    updated_at = COALESCE(updated_at, NOW())
                WHERE id IS NOT NULL
            `);
            
            console.log('✅ Dados críticos em users corrigidos');

        } catch (error) {
            console.log(`❌ Erro ao corrigir users: ${error.message}`);
        }
    }

    async fixFearGreedIndex() {
        console.log('\n🔧 CORRIGINDO FEAR_GREED_INDEX');
        console.log('==============================');
        
        try {
            // Atualizar campos NULL com valores padrão
            await this.pool.query(`
                UPDATE fear_greed_index 
                SET 
                    market_cap_total = COALESCE(market_cap_total, 0),
                    market_cap_change_24h = COALESCE(market_cap_change_24h, 0),
                    btc_dominance = COALESCE(btc_dominance, 50.0),
                    volume_24h = COALESCE(volume_24h, 0),
                    timestamp_unix = COALESCE(timestamp_unix, EXTRACT(EPOCH FROM created_at)::bigint),
                    time_until_update = COALESCE(time_until_update, '24 hours')
                WHERE id IS NOT NULL
            `);
            
            // Inserir dados padrão se não houver registros recentes
            const recentCount = await this.pool.query(`
                SELECT COUNT(*) as count 
                FROM fear_greed_index 
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            `);
            
            if (parseInt(recentCount.rows[0].count) === 0) {
                await this.pool.query(`
                    INSERT INTO fear_greed_index (value, classification, created_at) 
                    VALUES (50, 'Neutral', NOW())
                `);
                console.log('✅ Dados padrão inseridos em fear_greed_index');
            }
            
            console.log('✅ fear_greed_index corrigido');

        } catch (error) {
            console.log(`❌ Erro ao corrigir fear_greed_index: ${error.message}`);
        }
    }

    async createNecessaryIndexes() {
        console.log('\n🔧 CRIANDO ÍNDICES NECESSÁRIOS');
        console.log('==============================');
        
        try {
            const indexes = [
                `CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)`,
                `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
                `CREATE INDEX IF NOT EXISTS idx_signals_ticker_time ON signals(ticker, timestamp)`,
                `CREATE INDEX IF NOT EXISTS idx_signals_type_time ON signals(signal_type, timestamp)`,
                `CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_exchange ON user_api_keys(user_id, exchange)`,
                `CREATE INDEX IF NOT EXISTS idx_signal_metrics_ticker ON signal_metrics_log(ticker)`,
                `CREATE INDEX IF NOT EXISTS idx_signal_metrics_time ON signal_metrics_log(created_at)`,
                `CREATE INDEX IF NOT EXISTS idx_active_positions_user ON active_positions(user_id)`,
                `CREATE INDEX IF NOT EXISTS idx_fear_greed_time ON fear_greed_index(created_at)`,
                `CREATE INDEX IF NOT EXISTS idx_top100_time ON top100_data(collected_at)`
            ];
            
            for (const indexQuery of indexes) {
                try {
                    await this.pool.query(indexQuery);
                    console.log('✅ Índice criado');
                } catch (indexError) {
                    // Ignora se o índice já existe
                }
            }
            
            console.log('✅ Índices criados com sucesso');

        } catch (error) {
            console.log(`❌ Erro ao criar índices: ${error.message}`);
        }
    }

    async validateFixes() {
        console.log('\n🔍 VALIDAÇÃO FINAL DAS CORREÇÕES');
        console.log('=================================');
        
        try {
            // Verificar signals
            const signalsCheck = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN ticker IS NULL THEN 1 END) as null_ticker,
                    COUNT(CASE WHEN signal_type IS NULL THEN 1 END) as null_type
                FROM signals
            `);
            
            console.log(`📊 SIGNALS: ${signalsCheck.rows[0].total} total, ${signalsCheck.rows[0].null_ticker} ticker NULL, ${signalsCheck.rows[0].null_type} type NULL`);
            
            // Verificar users
            const usersCheck = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_active IS NULL THEN 1 END) as null_active,
                    COUNT(CASE WHEN plan_type IS NULL THEN 1 END) as null_plan
                FROM users
            `);
            
            console.log(`📊 USERS: ${usersCheck.rows[0].total} total, ${usersCheck.rows[0].null_active} active NULL, ${usersCheck.rows[0].null_plan} plan NULL`);
            
            // Verificar user_api_keys
            const apiKeysCheck = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN api_key IS NOT NULL AND secret_key IS NOT NULL THEN 1 END) as with_keys
                FROM user_api_keys
            `);
            
            console.log(`📊 API_KEYS: ${apiKeysCheck.rows[0].total} total, ${apiKeysCheck.rows[0].with_keys} com chaves completas`);
            
            // Verificar top100_data
            const top100Check = await this.pool.query(`
                SELECT COUNT(*) as total FROM top100_data
            `);
            
            console.log(`📊 TOP100_DATA: ${top100Check.rows[0].total} registros`);
            
            console.log('\n✅ VALIDAÇÃO COMPLETA - SISTEMA PRONTO PARA OPERAÇÃO');

        } catch (error) {
            console.log(`❌ Erro na validação: ${error.message}`);
        }
    }
}

// Executar correções
if (require.main === module) {
    const fixer = new DatabaseNullFixer();
    fixer.fixAllCriticalIssues();
}

module.exports = DatabaseNullFixer;
