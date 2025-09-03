#!/usr/bin/env node

require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createTestUsers() {
    try {
        // Criar usuário 1
        await pool.query(`
            INSERT INTO users (username, email, password_hash, exchange_auto_trading) 
            VALUES ($1, $2, $3, $4) 
            ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
        `, ['testuser1', 'test1@coinbit.club', 'hash123', false]);
        
        // Criar usuário 2  
        await pool.query(`
            INSERT INTO users (username, email, password_hash, exchange_auto_trading) 
            VALUES ($1, $2, $3, $4) 
            ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
        `, ['testuser2', 'test2@coinbit.club', 'hash456', false]);
        
        console.log('✅ Usuários de teste criados');
        
        const users = await pool.query("SELECT id, username, email FROM users WHERE email LIKE '%coinbit.club%'");
        console.log('Usuários criados:', users.rows);
        
    } catch(error) {
        console.error('Erro:', error.message);
    }
    
    process.exit(0);
}

createTestUsers();
