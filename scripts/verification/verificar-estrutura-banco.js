#!/usr/bin/env node

/**
 * 🔍 VERIFICADOR DE ESTRUTURA DO BANCO
 * ===================================
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: {
        rejectUnauthorized: false
    }
});

async function verificarEstrutura() {
    try {
        // Verificar tabelas
        console.log('📊 TABELAS EXISTENTES:');
        const tabelas = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        for (const row of tabelas.rows) {
            console.log(`\n🔸 ${row.table_name}`);
            
            // Verificar colunas da tabela
            const colunas = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 
                AND table_schema = 'public'
                ORDER BY ordinal_position
            `, [row.table_name]);
            
            colunas.rows.forEach(col => {
                console.log(`   • ${col.column_name} (${col.data_type})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarEstrutura();
