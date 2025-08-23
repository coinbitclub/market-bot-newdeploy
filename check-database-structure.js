#!/usr/bin/env node

/**
 * 🔍 VERIFICADOR DE ESTRUTURA DE TABELAS
 * =====================================
 * 
 * Script para verificar a estrutura real das tabelas no banco
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function checkTableStructure() {
    console.log('🔍 VERIFICANDO ESTRUTURA DAS TABELAS');
    console.log('===================================\n');

    try {
        // Listar todas as tabelas
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📋 TABELAS ENCONTRADAS:');
        tablesResult.rows.forEach(row => {
            console.log(`   📄 ${row.table_name}`);
        });

        console.log('\n📊 ESTRUTURA DETALHADA:');
        console.log('========================');

        for (const table of tablesResult.rows) {
            const tableName = table.table_name;
            
            console.log(`\n🗃️  Tabela: ${tableName}`);
            console.log('─'.repeat(40));

            const columnsResult = await pool.query(`
                SELECT 
                    column_name, 
                    data_type, 
                    is_nullable, 
                    column_default,
                    character_maximum_length
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [tableName]);

            if (columnsResult.rows.length === 0) {
                console.log('   ❌ Nenhuma coluna encontrada');
            } else {
                columnsResult.rows.forEach(col => {
                    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                    const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                    const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
                    console.log(`   📄 ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
                });
            }

            // Verificar se há dados na tabela
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                console.log(`   📊 Registros: ${countResult.rows[0].count}`);
            } catch (error) {
                console.log(`   ❌ Erro ao contar registros: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Erro ao verificar estrutura:', error);
    } finally {
        await pool.end();
    }
}

checkTableStructure();
