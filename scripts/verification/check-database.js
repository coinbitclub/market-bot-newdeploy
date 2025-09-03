#!/usr/bin/env node

/**
 * 🚀 COINBITCLUB DATABASE CHECKER
 * 
 * Verificar estrutura atual do banco de dados
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

class DatabaseChecker {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        console.log('🔍 COINBITCLUB DATABASE CHECKER');
        console.log('================================');
    }

    async checkDatabase() {
        try {
            const client = await this.pool.connect();

            // Verificar todas as tabelas
            const tables = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `);

            console.log(`\n📊 TABELAS ENCONTRADAS: ${tables.rows.length}`);
            
            // Verificar estrutura de tabelas importantes
            const importantTables = ['users', 'system_config', 'positions', 'trades'];
            
            for (const tableName of importantTables) {
                const tableExists = tables.rows.find(t => t.table_name === tableName);
                
                if (tableExists) {
                    console.log(`\n✅ TABELA: ${tableName}`);
                    
                    // Verificar colunas
                    const columns = await client.query(`
                        SELECT column_name, data_type, is_nullable, column_default
                        FROM information_schema.columns 
                        WHERE table_name = $1
                        ORDER BY ordinal_position
                    `, [tableName]);

                    columns.rows.forEach(col => {
                        console.log(`   📋 ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
                    });

                    // Contar registros
                    const count = await client.query(`SELECT COUNT(*) as total FROM ${tableName}`);
                    console.log(`   📊 Registros: ${count.rows[0].total}`);

                } else {
                    console.log(`\n❌ TABELA FALTANDO: ${tableName}`);
                }
            }

            // Verificar se há dados de usuários
            const userCount = await client.query('SELECT COUNT(*) as total FROM users');
            console.log(`\n👥 TOTAL DE USUÁRIOS: ${userCount.rows[0].total}`);

            if (userCount.rows[0].total > 0) {
                const sampleUsers = await client.query(`
                    SELECT id, username, email, 
                           COALESCE(account_type, 'N/A') as account_type,
                           COALESCE(subscription_type, 'N/A') as subscription_type,
                           created_at
                    FROM users 
                    LIMIT 5
                `);

                console.log('\n👤 USUÁRIOS EXEMPLO:');
                sampleUsers.rows.forEach(user => {
                    console.log(`   • ${user.username} (${user.email}) - ${user.account_type}`);
                });
            }

            client.release();
            
            console.log('\n✅ VERIFICAÇÃO CONCLUÍDA');

        } catch (error) {
            console.error('❌ ERRO:', error.message);
        }
    }
}

// Executar
if (require.main === module) {
    const checker = new DatabaseChecker();
    checker.checkDatabase();
}

module.exports = DatabaseChecker;
