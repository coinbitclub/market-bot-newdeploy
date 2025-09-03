/**
 * ✅ VERIFICAR CONSTRAINT DO STATUS
 * Checkar exatamente qual constraint está aplicada no campo status
 */

const fs = require('fs');
const path = require('path');

// Configuração do banco
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixed-database-config.js'), 'utf8'));

async function verificarConstraintStatus() {
    console.log('🔍 VERIFICANDO CONSTRAINT DE STATUS...');
    
    const { Pool } = require('pg');
    const pool = new Pool(config.database);
    
    try {
        const client = await pool.connect();
        console.log('✅ Conectado ao banco');
        
        // Verificar constraint de status
        const queryConstraint = `
            SELECT 
                con.conname as constraint_name,
                pg_get_constraintdef(con.oid) as constraint_definition
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE rel.relname = 'sistema_leitura_mercado' 
            AND con.conname LIKE '%status%';
        `;
        
        const resultConstraint = await client.query(queryConstraint);
        console.log('\n📋 CONSTRAINTS DE STATUS ENCONTRADAS:');
        resultConstraint.rows.forEach(row => {
            console.log(`   ${row.constraint_name}: ${row.constraint_definition}`);
        });
        
        // Verificar todos os constraints da tabela
        const queryAllConstraints = `
            SELECT 
                con.conname as constraint_name,
                con.contype as constraint_type,
                pg_get_constraintdef(con.oid) as constraint_definition
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE rel.relname = 'sistema_leitura_mercado'
            ORDER BY con.conname;
        `;
        
        const resultAll = await client.query(queryAllConstraints);
        console.log('\n📋 TODOS OS CONSTRAINTS DA TABELA:');
        resultAll.rows.forEach(row => {
            console.log(`   ${row.constraint_name} (${row.constraint_type}): ${row.constraint_definition}`);
        });
        
        client.release();
        await pool.end();
        
        console.log('\n✅ Verificação completa');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

verificarConstraintStatus();
