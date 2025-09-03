#!/usr/bin/env node

/**
 * 🚀 SISTEMA DUAL SIMPLIFICADO - TESTNET + MANAGEMENT
 * 
 * Ativa o sistema dual usando infraestrutura existente de forma simplificada
 */

const { Pool } = require('pg');
require('dotenv').config();

class SimpleDualActivator {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        console.log('🚀 ATIVADOR DUAL SIMPLIFICADO');
        console.log('==============================');
    }

    async activate() {
        try {
            // 1. Verificar e configurar database
            await this.setupDatabase();

            // 2. Ativar classificação dual
            await this.enableDualClassification();

            // 3. Configurar sistema de trading
            await this.enableDualTrading();

            // 4. Testar classificação
            await this.testUserClassification();

            // 5. Status final
            await this.showStatus();

            console.log('\n✅ SISTEMA DUAL ATIVADO COM SUCESSO!');

        } catch (error) {
            console.error('❌ ERRO:', error.message);
        }
    }

    async setupDatabase() {
        console.log('\n🗄️ CONFIGURANDO DATABASE...');

        const client = await this.pool.connect();

        try {
            // Verificar se colunas necessárias existem
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'testnet' 
                CHECK (account_type IN ('testnet', 'management'))
            `);

            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS testnet_mode BOOLEAN DEFAULT true
            `);

            // Verificar tabela de configurações
            await client.query(`
                CREATE TABLE IF NOT EXISTS system_config (
                    id SERIAL PRIMARY KEY,
                    config_key VARCHAR(100) UNIQUE NOT NULL,
                    config_value TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            console.log('✅ Database configurado');

        } finally {
            client.release();
        }
    }

    async enableDualClassification() {
        console.log('\n🏷️ ATIVANDO CLASSIFICAÇÃO DUAL...');

        const client = await this.pool.connect();

        try {
            // Configurar thresholds
            await client.query(`
                INSERT INTO system_config (config_key, config_value, description)
                VALUES ('MINIMUM_BALANCE_BRL', '100', 'Minimum BRL for management')
                ON CONFLICT (config_key) DO UPDATE SET config_value = '100'
            `);

            await client.query(`
                INSERT INTO system_config (config_key, config_value, description)
                VALUES ('MINIMUM_BALANCE_USD', '20', 'Minimum USD for management')
                ON CONFLICT (config_key) DO UPDATE SET config_value = '20'
            `);

            // Ativar modo dual
            await client.query(`
                INSERT INTO system_config (config_key, config_value, description)
                VALUES ('DUAL_MODE_ACTIVE', 'true', 'Dual testnet+management mode')
                ON CONFLICT (config_key) DO UPDATE SET config_value = 'true'
            `);

            // Função de classificação
            await client.query(`
                CREATE OR REPLACE FUNCTION classify_user_account(user_id INTEGER)
                RETURNS TABLE(account_type VARCHAR, testnet_mode BOOLEAN) AS $$
                DECLARE
                    user_record RECORD;
                    should_use_testnet BOOLEAN;
                BEGIN
                    SELECT * INTO user_record FROM users WHERE id = user_id;
                    
                    -- Lógica: TESTNET se não tem saldo nem assinatura
                    should_use_testnet := (
                        COALESCE(user_record.prepaid_balance_brl, 0) < 100 AND
                        COALESCE(user_record.prepaid_balance_usd, 0) < 20 AND
                        COALESCE(user_record.plan_type, 'none') != 'MONTHLY'
                    );
                    
                    IF should_use_testnet THEN
                        RETURN QUERY SELECT 'testnet'::VARCHAR, true::BOOLEAN;
                    ELSE
                        RETURN QUERY SELECT 'management'::VARCHAR, false::BOOLEAN;
                    END IF;
                END;
                $$ LANGUAGE plpgsql;
            `);

            console.log('✅ Classificação dual ativada');

        } finally {
            client.release();
        }
    }

    async enableDualTrading() {
        console.log('\n⚡ ATIVANDO TRADING DUAL...');

        const client = await this.pool.connect();

        try {
            // Ativar trading real
            await client.query(`
                INSERT INTO system_config (config_key, config_value, description)
                VALUES ('ENABLE_REAL_TRADING', 'true', 'Enable real trading operations')
                ON CONFLICT (config_key) DO UPDATE SET config_value = 'true'
            `);

            // Configurar modos de exchange
            await client.query(`
                INSERT INTO system_config (config_key, config_value, description)
                VALUES ('TESTNET_EXCHANGE', 'binance_testnet', 'Default testnet exchange')
                ON CONFLICT (config_key) DO UPDATE SET config_value = 'binance_testnet'
            `);

            await client.query(`
                INSERT INTO system_config (config_key, config_value, description)
                VALUES ('MANAGEMENT_EXCHANGE', 'binance_management', 'Default management exchange')
                ON CONFLICT (config_key) DO UPDATE SET config_value = 'binance_management'
            `);

            // Adicionar coluna account_type nas tabelas de trading se não existir
            await client.query(`
                ALTER TABLE trades 
                ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'testnet'
            `);

            await client.query(`
                ALTER TABLE positions 
                ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'testnet'
            `);

            console.log('✅ Trading dual ativado');

        } finally {
            client.release();
        }
    }

    async testUserClassification() {
        console.log('\n🧪 TESTANDO CLASSIFICAÇÃO...');

        const client = await this.pool.connect();

        try {
            // Atualizar classificação de todos os usuários
            await client.query(`
                UPDATE users 
                SET (account_type, testnet_mode) = (
                    SELECT account_type, testnet_mode
                    FROM classify_user_account(users.id)
                )
                WHERE is_active = true OR ativo = true
            `);

            // Verificar resultados
            const stats = await client.query(`
                SELECT 
                    account_type,
                    testnet_mode,
                    COUNT(*) as count
                FROM users 
                WHERE is_active = true OR ativo = true
                GROUP BY account_type, testnet_mode
                ORDER BY account_type
            `);

            console.log('📊 Classificação de usuários:');
            stats.rows.forEach(row => {
                const mode = row.testnet_mode ? 'TESTNET' : 'MANAGEMENT';
                console.log(`   ${row.account_type} (${mode}): ${row.count} usuários`);
            });

            // Mostrar alguns exemplos
            const examples = await client.query(`
                SELECT 
                    username,
                    account_type,
                    testnet_mode,
                    COALESCE(prepaid_balance_brl, 0) as balance_brl,
                    COALESCE(prepaid_balance_usd, 0) as balance_usd,
                    plan_type
                FROM users 
                WHERE is_active = true OR ativo = true
                ORDER BY account_type, username
                LIMIT 10
            `);

            console.log('\n👥 Exemplos de classificação:');
            examples.rows.forEach(user => {
                const mode = user.testnet_mode ? 'TESTNET' : 'MGMT';
                console.log(`   ${user.username}: ${mode} (BRL:${user.balance_brl}, USD:${user.balance_usd}, Plan:${user.plan_type})`);
            });

        } finally {
            client.release();
        }
    }

    async showStatus() {
        console.log('\n📊 STATUS DO SISTEMA DUAL');
        console.log('==========================');

        const client = await this.pool.connect();

        try {
            // Configurações ativas
            const configs = await client.query(`
                SELECT config_key, config_value 
                FROM system_config 
                WHERE config_key IN ('DUAL_MODE_ACTIVE', 'ENABLE_REAL_TRADING', 'MINIMUM_BALANCE_BRL', 'MINIMUM_BALANCE_USD')
                ORDER BY config_key
            `);

            console.log('\n⚙️ CONFIGURAÇÕES:');
            configs.rows.forEach(config => {
                console.log(`   ${config.config_key}: ${config.config_value}`);
            });

            // Estatísticas de usuários
            const userStats = await client.query(`
                SELECT 
                    account_type,
                    COUNT(*) as total,
                    COUNT(CASE WHEN testnet_mode THEN 1 END) as testnet_count,
                    COUNT(CASE WHEN NOT testnet_mode THEN 1 END) as management_count
                FROM users 
                WHERE is_active = true OR ativo = true
                GROUP BY account_type
            `);

            console.log('\n👥 USUÁRIOS POR TIPO:');
            userStats.rows.forEach(stat => {
                console.log(`   ${stat.account_type}: ${stat.total} total`);
                console.log(`     • Testnet: ${stat.testnet_count}`);
                console.log(`     • Management: ${stat.management_count}`);
            });

            // Verificar se há trading ativo
            const activeTrading = await client.query(`
                SELECT COUNT(*) as active_positions
                FROM positions 
                WHERE is_active = true
            `);

            console.log(`\n📈 TRADING ATIVO:`);
            console.log(`   Posições ativas: ${activeTrading.rows[0].active_positions}`);

        } finally {
            client.release();
        }
    }

    async getDualOperationExample() {
        console.log('\n🔄 EXEMPLO DE OPERAÇÃO DUAL');
        console.log('============================');

        const client = await this.pool.connect();

        try {
            // Simular processamento de sinal
            console.log('📡 Processando sinal BTC/USDT BUY...');

            // Buscar usuários de cada tipo
            const testnetUsers = await client.query(`
                SELECT username, account_type FROM users 
                WHERE account_type = 'testnet' AND (is_active = true OR ativo = true)
                LIMIT 3
            `);

            const managementUsers = await client.query(`
                SELECT username, account_type FROM users 
                WHERE account_type = 'management' AND (is_active = true OR ativo = true)
                LIMIT 3
            `);

            console.log('\n👥 USUÁRIOS TESTNET (operação simulada):');
            testnetUsers.rows.forEach(user => {
                console.log(`   🎭 ${user.username}: Executaria em Binance Testnet`);
            });

            console.log('\n👥 USUÁRIOS MANAGEMENT (operação real):');
            managementUsers.rows.forEach(user => {
                console.log(`   💰 ${user.username}: Executaria em Binance Management`);
            });

        } finally {
            client.release();
        }
    }
}

// Executar
if (require.main === module) {
    const activator = new SimpleDualActivator();
    
    activator.activate().then(async () => {
        await activator.getDualOperationExample();
        console.log('\n🎉 SISTEMA DUAL OPERACIONAL!');
        console.log('🔄 Usuarios classificados automaticamente');
        console.log('⚡ Trading real ativo para usuarios qualificados');
        process.exit(0);
        
    }).catch(error => {
        console.error('💥 ERRO:', error);
        process.exit(1);
    });
}

module.exports = SimpleDualActivator;
