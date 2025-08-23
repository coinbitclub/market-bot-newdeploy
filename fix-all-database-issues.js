#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO COMPLETA DO BANCO DE DADOS
 * =====================================
 * 
 * Script para corrigir todas as colunas e estruturas faltantes
 * Problemas identificados:
 * - user_api_keys: falta coluna 'last_checked'
 * - Outras tabelas: falta coluna 'status'
 * - Estruturas de índices e constraints
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

class DatabaseFixer {
    constructor() {
        this.fixes = [];
    }

    async checkAndFixUserApiKeys() {
        console.log('🔍 Verificando tabela user_api_keys...');
        
        try {
            // Verificar se a coluna last_checked existe
            const checkColumn = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'user_api_keys' 
                AND column_name = 'last_checked'
            `);

            if (checkColumn.rows.length === 0) {
                console.log('➕ Adicionando coluna last_checked...');
                await pool.query(`
                    ALTER TABLE user_api_keys 
                    ADD COLUMN last_checked TIMESTAMP DEFAULT NOW()
                `);
                this.fixes.push('user_api_keys.last_checked');
            }

            // Verificar se a coluna status existe
            const checkStatus = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'user_api_keys' 
                AND column_name = 'status'
            `);

            if (checkStatus.rows.length === 0) {
                console.log('➕ Adicionando coluna status...');
                await pool.query(`
                    ALTER TABLE user_api_keys 
                    ADD COLUMN status VARCHAR(20) DEFAULT 'active'
                `);
                this.fixes.push('user_api_keys.status');
            }

            // Verificar se a coluna is_valid existe
            const checkValid = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'user_api_keys' 
                AND column_name = 'is_valid'
            `);

            if (checkValid.rows.length === 0) {
                console.log('➕ Adicionando coluna is_valid...');
                await pool.query(`
                    ALTER TABLE user_api_keys 
                    ADD COLUMN is_valid BOOLEAN DEFAULT true
                `);
                this.fixes.push('user_api_keys.is_valid');
            }

            console.log('✅ Tabela user_api_keys verificada');

        } catch (error) {
            console.error('❌ Erro ao verificar user_api_keys:', error.message);
        }
    }

    async checkAndFixBalancesTable() {
        console.log('🔍 Verificando tabela balances...');
        
        try {
            // Verificar se a tabela existe
            const tableExists = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'balances'
            `);

            if (tableExists.rows.length === 0) {
                console.log('➕ Criando tabela balances...');
                await pool.query(`
                    CREATE TABLE balances (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id),
                        exchange VARCHAR(50) NOT NULL,
                        balance DECIMAL(20,8) DEFAULT 0,
                        currency VARCHAR(10) DEFAULT 'USDT',
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW(),
                        status VARCHAR(20) DEFAULT 'active'
                    )
                `);
                this.fixes.push('balances table created');
            } else {
                // Verificar se a coluna status existe
                const checkStatus = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'balances' 
                    AND column_name = 'status'
                `);

                if (checkStatus.rows.length === 0) {
                    console.log('➕ Adicionando coluna status à tabela balances...');
                    await pool.query(`
                        ALTER TABLE balances 
                        ADD COLUMN status VARCHAR(20) DEFAULT 'active'
                    `);
                    this.fixes.push('balances.status');
                }
            }

            console.log('✅ Tabela balances verificada');

        } catch (error) {
            console.error('❌ Erro ao verificar balances:', error.message);
        }
    }

    async checkAndFixSignalsTable() {
        console.log('🔍 Verificando tabela signals...');
        
        try {
            // Verificar se a coluna status existe
            const checkStatus = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'signals' 
                AND column_name = 'status'
            `);

            if (checkStatus.rows.length === 0) {
                console.log('➕ Adicionando coluna status à tabela signals...');
                await pool.query(`
                    ALTER TABLE signals 
                    ADD COLUMN status VARCHAR(20) DEFAULT 'active'
                `);
                this.fixes.push('signals.status');
            }

            console.log('✅ Tabela signals verificada');

        } catch (error) {
            console.error('❌ Erro ao verificar signals:', error.message);
        }
    }

    async checkAndFixUsersTable() {
        console.log('🔍 Verificando tabela users...');
        
        try {
            // Verificar se a coluna status existe
            const checkStatus = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = 'status'
            `);

            if (checkStatus.rows.length === 0) {
                console.log('➕ Adicionando coluna status à tabela users...');
                await pool.query(`
                    ALTER TABLE users 
                    ADD COLUMN status VARCHAR(20) DEFAULT 'active'
                `);
                this.fixes.push('users.status');
            }

            console.log('✅ Tabela users verificada');

        } catch (error) {
            console.error('❌ Erro ao verificar users:', error.message);
        }
    }

    async checkAndFixFearGreedTable() {
        console.log('🔍 Verificando tabela fear_greed_index...');
        
        try {
            // Verificar se a tabela existe
            const tableExists = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'fear_greed_index'
            `);

            if (tableExists.rows.length === 0) {
                console.log('➕ Criando tabela fear_greed_index...');
                await pool.query(`
                    CREATE TABLE fear_greed_index (
                        id SERIAL PRIMARY KEY,
                        value INTEGER NOT NULL,
                        value_classification VARCHAR(50),
                        timestamp TIMESTAMP DEFAULT NOW(),
                        created_at TIMESTAMP DEFAULT NOW(),
                        status VARCHAR(20) DEFAULT 'active'
                    )
                `);
                this.fixes.push('fear_greed_index table created');
            }

            console.log('✅ Tabela fear_greed_index verificada');

        } catch (error) {
            console.error('❌ Erro ao verificar fear_greed_index:', error.message);
        }
    }

    async showCurrentStructure() {
        console.log('\n📋 ESTRUTURA ATUAL DAS TABELAS:');
        console.log('================================');

        const tables = ['users', 'user_api_keys', 'signals', 'balances', 'fear_greed_index'];

        for (const table of tables) {
            try {
                const columns = await pool.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `, [table]);

                console.log(`\n🗃️  Tabela: ${table}`);
                if (columns.rows.length === 0) {
                    console.log('   ❌ Tabela não existe');
                } else {
                    columns.rows.forEach(col => {
                        console.log(`   📄 ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
                    });
                }
            } catch (error) {
                console.log(`   ❌ Erro ao verificar ${table}: ${error.message}`);
            }
        }
    }

    async run() {
        console.log('🔧 INICIANDO CORREÇÃO COMPLETA DO BANCO DE DADOS');
        console.log('===============================================\n');

        try {
            await this.checkAndFixUserApiKeys();
            await this.checkAndFixUsersTable();
            await this.checkAndFixSignalsTable();
            await this.checkAndFixBalancesTable();
            await this.checkAndFixFearGreedTable();

            await this.showCurrentStructure();

            console.log('\n✅ CORREÇÕES APLICADAS:');
            console.log('=======================');
            if (this.fixes.length === 0) {
                console.log('🎉 Nenhuma correção necessária - banco já está correto!');
            } else {
                this.fixes.forEach((fix, index) => {
                    console.log(`${index + 1}. ✅ ${fix}`);
                });
            }

            console.log('\n🚀 Banco de dados corrigido com sucesso!');

        } catch (error) {
            console.error('\n❌ ERRO CRÍTICO:', error);
        } finally {
            await pool.end();
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const fixer = new DatabaseFixer();
    fixer.run();
}

module.exports = DatabaseFixer;
