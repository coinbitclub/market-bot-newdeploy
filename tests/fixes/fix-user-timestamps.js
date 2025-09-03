#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO DE TIMESTAMPS EM USERS
 * ==================================
 * 
 * Corrige campos de timestamp NULL na tabela users
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

class UserTimestampFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }

    async fixUserTimestamps() {
        console.log('🔧 INICIANDO CORREÇÃO DE TIMESTAMPS EM USERS');
        console.log('=============================================');
        
        try {
            // Verificar quantos registros precisam de correção
            const checkResult = await this.pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN created_at IS NULL THEN 1 END) as created_at_null,
                    COUNT(CASE WHEN updated_at IS NULL THEN 1 END) as updated_at_null,
                    COUNT(CASE WHEN performance_updated_at IS NULL THEN 1 END) as performance_updated_at_null
                FROM users
            `);

            const stats = checkResult.rows[0];
            console.log(`📊 Status atual:`);
            console.log(`   Total de usuários: ${stats.total}`);
            console.log(`   created_at NULL: ${stats.created_at_null}`);
            console.log(`   updated_at NULL: ${stats.updated_at_null}`);
            console.log(`   performance_updated_at NULL: ${stats.performance_updated_at_null}`);

            if (parseInt(stats.created_at_null) === 0 && 
                parseInt(stats.updated_at_null) === 0 && 
                parseInt(stats.performance_updated_at_null) === 0) {
                console.log('✅ Todos os timestamps já estão preenchidos!');
                return;
            }

            // Executar correção
            console.log('\n🔧 Aplicando correções...');
            
            const updateResult = await this.pool.query(`
                UPDATE users 
                SET 
                    created_at = COALESCE(created_at, NOW()),
                    updated_at = COALESCE(updated_at, NOW()),
                    performance_updated_at = COALESCE(performance_updated_at, NOW())
                WHERE 
                    created_at IS NULL 
                    OR updated_at IS NULL 
                    OR performance_updated_at IS NULL
            `);

            console.log(`✅ ${updateResult.rowCount} usuários corrigidos`);

            // Verificar resultado final
            const finalCheck = await this.pool.query(`
                SELECT 
                    COUNT(CASE WHEN created_at IS NULL THEN 1 END) as created_at_null,
                    COUNT(CASE WHEN updated_at IS NULL THEN 1 END) as updated_at_null,
                    COUNT(CASE WHEN performance_updated_at IS NULL THEN 1 END) as performance_updated_at_null
                FROM users
            `);

            const finalStats = finalCheck.rows[0];
            console.log('\n📊 Status final:');
            console.log(`   created_at NULL: ${finalStats.created_at_null}`);
            console.log(`   updated_at NULL: ${finalStats.updated_at_null}`);
            console.log(`   performance_updated_at NULL: ${finalStats.performance_updated_at_null}`);

            if (parseInt(finalStats.created_at_null) === 0 && 
                parseInt(finalStats.updated_at_null) === 0 && 
                parseInt(finalStats.performance_updated_at_null) === 0) {
                console.log('\n🎉 CORREÇÃO FINALIZADA COM SUCESSO!');
            } else {
                console.log('\n⚠️  Ainda existem campos NULL - verificar manualmente');
            }

        } catch (error) {
            console.error('❌ Erro na correção:', error.message);
        } finally {
            await this.pool.end();
        }
    }
}

// Executar correção
if (require.main === module) {
    const fixer = new UserTimestampFixer();
    fixer.fixUserTimestamps();
}

module.exports = UserTimestampFixer;
