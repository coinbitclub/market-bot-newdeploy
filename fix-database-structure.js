#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO ESTRUTURA DO BANCO DE DADOS
 * =======================================
 * 
 * Script para corrigir e completar a estrutura do banco de dados
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

class DatabaseStructureFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });
    }

    async fixAll() {
        console.log('🔧 INICIANDO CORREÇÃO DA ESTRUTURA DO BANCO DE DADOS...\n');
        
        try {
            await this.addMissingColumns();
            await this.createMissingTables();
            await this.updateDefaultValues();
            await this.addExchangeApiColumns(); // Nova função para chaves de API
            
            console.log('\n✅ ESTRUTURA DO BANCO CORRIGIDA COM SUCESSO!');
            
        } catch (error) {
            console.error('❌ ERRO na correção:', error);
            throw error;
        }
        // Não fechar pool aqui - será fechado no final
    }

    async addMissingColumns() {
        console.log('📝 Adicionando colunas faltantes na tabela users...');
        
        const client = await this.pool.connect();
        
        try {
            // Adicionar colunas financeiras
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS balance_real_brl DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS balance_real_usd DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS balance_admin_brl DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS balance_admin_usd DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS balance_commission_brl DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS balance_commission_usd DECIMAL(15,2) DEFAULT 0.00,
                ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'MONTHLY',
                ADD COLUMN IF NOT EXISTS affiliate_type VARCHAR(20) DEFAULT 'none',
                ADD COLUMN IF NOT EXISTS affiliate_id INTEGER,
                ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'regular'
            `);
            
            console.log('   ✅ Colunas financeiras adicionadas');
            
            // Adicionar índices para performance
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type);
                CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
            `);
            
            console.log('   ✅ Índices criados');
            
        } finally {
            client.release();
        }
    }

    async createMissingTables() {
        console.log('🗃️ Criando tabelas faltantes...');
        
        const client = await this.pool.connect();
        
        try {
            // Tabela de transações
            await client.query(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    type VARCHAR(50) NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
                    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                    commission_amount DECIMAL(15,2) DEFAULT 0.00,
                    net_amount DECIMAL(15,2),
                    plan_type VARCHAR(20),
                    description TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            console.log('   ✅ Tabela transactions criada');
            
            // Tabela de comissões
            await client.query(`
                CREATE TABLE IF NOT EXISTS commissions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    affiliate_id INTEGER REFERENCES users(id),
                    trade_profit DECIMAL(15,2) NOT NULL,
                    commission_rate DECIMAL(5,2) NOT NULL,
                    commission_amount DECIMAL(15,2) NOT NULL,
                    affiliate_commission DECIMAL(15,2) DEFAULT 0.00,
                    plan_type VARCHAR(20),
                    currency VARCHAR(3) DEFAULT 'BRL',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            console.log('   ✅ Tabela commissions criada');
            
            // Tabela de cupons
            await client.query(`
                CREATE TABLE IF NOT EXISTS coupons (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    credit_amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3) DEFAULT 'BRL',
                    created_by INTEGER REFERENCES users(id),
                    used_by INTEGER REFERENCES users(id),
                    is_used BOOLEAN DEFAULT FALSE,
                    expiration_date TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW(),
                    used_at TIMESTAMP
                )
            `);
            
            console.log('   ✅ Tabela coupons criada');
            
            // Tabela de saques
            await client.query(`
                CREATE TABLE IF NOT EXISTS withdrawals (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3) DEFAULT 'BRL',
                    status VARCHAR(20) DEFAULT 'PENDING',
                    pix_key TEXT,
                    bank_details JSONB,
                    requested_at TIMESTAMP DEFAULT NOW(),
                    processed_at TIMESTAMP
                )
            `);
            
            console.log('   ✅ Tabela withdrawals criada');
            
            // Criar índices
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
                CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
                CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
                CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
                CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
            `);
            
            console.log('   ✅ Índices das tabelas criados');
            
        } finally {
            client.release();
        }
    }

    async updateDefaultValues() {
        console.log('🔄 Atualizando valores padrão...');
        
        const client = await this.pool.connect();
        
        try {
            // Atualizar usuários sem valores definidos
            const updateResult = await client.query(`
                UPDATE users 
                SET 
                    balance_real_brl = COALESCE(balance_real_brl, 0.00),
                    balance_real_usd = COALESCE(balance_real_usd, 0.00),
                    balance_admin_brl = COALESCE(balance_admin_brl, 0.00),
                    balance_admin_usd = COALESCE(balance_admin_usd, 0.00),
                    balance_commission_brl = COALESCE(balance_commission_brl, 0.00),
                    balance_commission_usd = COALESCE(balance_commission_usd, 0.00),
                    plan_type = COALESCE(plan_type, 'MONTHLY'),
                    affiliate_type = COALESCE(affiliate_type, 'none'),
                    account_type = COALESCE(account_type, 'regular')
                WHERE 
                    balance_real_brl IS NULL 
                    OR balance_real_usd IS NULL 
                    OR plan_type IS NULL 
                    OR affiliate_type IS NULL
                    OR account_type IS NULL
            `);
            
            console.log(`   ✅ ${updateResult.rowCount || 0} usuários atualizados`);
            
        } finally {
            client.release();
        }
    }

    async addExchangeApiColumns() {
        console.log('🔑 Adicionando colunas para chaves de API das exchanges...');
        
        const client = await this.pool.connect();
        
        try {
            // Adicionar colunas para chaves de exchanges criptografadas
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS binance_api_key_encrypted TEXT,
                ADD COLUMN IF NOT EXISTS binance_api_secret_encrypted TEXT,
                ADD COLUMN IF NOT EXISTS bybit_api_key_encrypted TEXT,
                ADD COLUMN IF NOT EXISTS bybit_api_secret_encrypted TEXT,
                ADD COLUMN IF NOT EXISTS exchange_testnet_mode BOOLEAN DEFAULT true,
                ADD COLUMN IF NOT EXISTS exchange_auto_trading BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS last_api_validation TIMESTAMP,
                ADD COLUMN IF NOT EXISTS api_validation_status VARCHAR(20) DEFAULT 'pending'
            `);
            
            console.log('   ✅ Colunas de chaves de exchanges adicionadas');
            
            // Criar tabela para logs de operações por usuário
            await client.query(`
                CREATE TABLE IF NOT EXISTS user_trading_executions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    signal_id INTEGER REFERENCES signals(id),
                    exchange VARCHAR(20) NOT NULL,
                    order_id VARCHAR(100),
                    symbol VARCHAR(20) NOT NULL,
                    side VARCHAR(10) NOT NULL,
                    amount DECIMAL(15,8) NOT NULL,
                    price DECIMAL(15,8),
                    status VARCHAR(20) NOT NULL,
                    profit_loss DECIMAL(15,8) DEFAULT 0,
                    commission_paid DECIMAL(15,8) DEFAULT 0,
                    testnet_mode BOOLEAN DEFAULT true,
                    error_message TEXT,
                    executed_at TIMESTAMP DEFAULT NOW(),
                    closed_at TIMESTAMP,
                    raw_response JSONB
                )
            `);
            
            console.log('   ✅ Tabela user_trading_executions criada');
            
            // Criar índices para performance
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_users_exchange_auto_trading ON users(exchange_auto_trading);
                CREATE INDEX IF NOT EXISTS idx_users_testnet_mode ON users(exchange_testnet_mode);
                CREATE INDEX IF NOT EXISTS idx_user_trading_executions_user_id ON user_trading_executions(user_id);
                CREATE INDEX IF NOT EXISTS idx_user_trading_executions_executed_at ON user_trading_executions(executed_at);
                CREATE INDEX IF NOT EXISTS idx_user_trading_executions_exchange ON user_trading_executions(exchange);
            `);
            
            console.log('   ✅ Índices de exchanges criados');
            
        } finally {
            client.release();
        }
    }

    async verifyStructure() {
        console.log('\n🔍 VERIFICANDO ESTRUTURA FINAL...');
        
        const client = await this.pool.connect();
        
        try {
            // Verificar colunas da tabela users
            const userColumns = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                ORDER BY ordinal_position
            `);
            
            console.log('\n📊 COLUNAS DA TABELA USERS:');
            userColumns.rows.forEach(col => {
                console.log(`   • ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });
            
            // Verificar tabelas existentes
            const tables = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            `);
            
            console.log('\n🗃️ TABELAS EXISTENTES:');
            tables.rows.forEach(table => {
                console.log(`   • ${table.table_name}`);
            });
            
            // Contar registros
            const counts = await client.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as users_count,
                    (SELECT COUNT(*) FROM positions) as positions_count,
                    (SELECT COUNT(*) FROM transactions) as transactions_count,
                    (SELECT COUNT(*) FROM signals) as signals_count
            `);
            
            console.log('\n📈 CONTAGEM DE REGISTROS:');
            const count = counts.rows[0];
            console.log(`   • Usuários: ${count.users_count}`);
            console.log(`   • Posições: ${count.positions_count}`);
            console.log(`   • Transações: ${count.transactions_count}`);
            console.log(`   • Sinais: ${count.signals_count}`);
            
        } finally {
            client.release();
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const fixer = new DatabaseStructureFixer();
    fixer.fixAll()
        .then(() => fixer.verifyStructure())
        .then(() => {
            console.log('\n🎉 BANCO DE DADOS TOTALMENTE CORRIGIDO E OPERACIONAL!');
            return fixer.pool.end();
        })
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 FALHA na correção:', error);
            process.exit(1);
        });
}

module.exports = DatabaseStructureFixer;
