#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO DA ESTRUTURA DO BANCO DE DADOS
 * ==========================================
 * 
 * Adiciona colunas faltantes e corrige estruturas de tabelas
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function fixDatabaseStructure() {
    console.log('🔧 INICIANDO CORREÇÃO DA ESTRUTURA DO BANCO...');
    console.log('==============================================');
    
    try {
        // 1. Verificar e adicionar colunas na tabela user_api_keys
        console.log('\n📋 Verificando tabela user_api_keys...');
        
        // Verificar se a coluna last_checked existe
        const checkLastChecked = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys' 
            AND column_name = 'last_checked'
        `);
        
        if (checkLastChecked.rows.length === 0) {
            console.log('➕ Adicionando coluna last_checked...');
            await pool.query(`
                ALTER TABLE user_api_keys 
                ADD COLUMN last_checked TIMESTAMPTZ DEFAULT NOW()
            `);
            console.log('✅ Coluna last_checked adicionada');
        } else {
            console.log('✅ Coluna last_checked já existe');
        }
        
        // Verificar se a coluna error_message existe
        const checkErrorMessage = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys' 
            AND column_name = 'error_message'
        `);
        
        if (checkErrorMessage.rows.length === 0) {
            console.log('➕ Adicionando coluna error_message...');
            await pool.query(`
                ALTER TABLE user_api_keys 
                ADD COLUMN error_message TEXT
            `);
            console.log('✅ Coluna error_message adicionada');
        } else {
            console.log('✅ Coluna error_message já existe');
        }
        
        // 2. Verificar estrutura atual da tabela
        console.log('\n📊 Estrutura atual da tabela user_api_keys:');
        const tableStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys'
            ORDER BY ordinal_position
        `);
        
        tableStructure.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // 3. Verificar dados existentes
        console.log('\n👥 Verificando dados existentes...');
        const usersWithKeys = await pool.query(`
            SELECT u.id, u.username, uak.exchange, uak.is_valid, uak.last_checked
            FROM users u
            INNER JOIN user_api_keys uak ON u.id = uak.user_id
            ORDER BY u.id
        `);
        
        console.log(`📊 Total de configurações de API: ${usersWithKeys.rows.length}`);
        usersWithKeys.rows.forEach(user => {
            console.log(`   - ID ${user.id} (${user.username}): ${user.exchange} - Válida: ${user.is_valid} - Última verificação: ${user.last_checked || 'nunca'}`);
        });
        
        // 4. Atualizar last_checked para registros sem data
        console.log('\n🔄 Atualizando registros sem data de verificação...');
        const updateResult = await pool.query(`
            UPDATE user_api_keys 
            SET last_checked = NOW() 
            WHERE last_checked IS NULL
        `);
        console.log(`✅ ${updateResult.rowCount} registros atualizados`);
        
        console.log('\n✅ CORREÇÃO DA ESTRUTURA CONCLUÍDA COM SUCESSO!');
        
    } catch (error) {
        console.error('❌ Erro na correção da estrutura:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    fixDatabaseStructure()
        .then(() => {
            console.log('\n🎉 Processo concluído!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Erro no processo:', error);
            process.exit(1);
        });
}

module.exports = { fixDatabaseStructure };
