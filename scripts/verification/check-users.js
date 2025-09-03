#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function verificarEstrutura() {
    try {
        console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA USERS');
        console.log('========================================');
        
        const colunas = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        console.log('Colunas encontradas:');
        colunas.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
        console.log('\n🔍 VERIFICANDO DADOS DOS USUÁRIOS');
        console.log('=================================');
        
        // Tentar diferentes combinações de colunas
        const possiveisColunas = ['id', 'username', 'email', 'created_at'];
        let query = 'SELECT ';
        
        for (const col of possiveisColunas) {
            try {
                await pool.query(`SELECT ${col} FROM users LIMIT 1`);
                query += `${col}, `;
            } catch (error) {
                // Coluna não existe
            }
        }
        
        query = query.slice(0, -2) + ' FROM users ORDER BY id LIMIT 10';
        
        const usuarios = await pool.query(query);
        
        if (usuarios.rows.length === 0) {
            console.log('❌ Nenhum usuário encontrado!');
        } else {
            console.log(`✅ Encontrados ${usuarios.rows.length} usuários:`);
            usuarios.rows.forEach((user, index) => {
                console.log(`  ${index + 1}. ${JSON.stringify(user)}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarEstrutura().catch(console.error);
