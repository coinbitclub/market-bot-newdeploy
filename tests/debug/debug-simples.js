#!/usr/bin/env node
/**
 * 🔍 DEBUG SIMPLES - Verificar conectividade e registros
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debugSimples() {
    try {
        console.log('🔗 Testando conectividade...');
        const testConn = await pool.query('SELECT NOW()');
        console.log('✅ Banco conectado:', testConn.rows[0].now);
        
        console.log('\n📊 Verificando usuários...');
        const users = await pool.query('SELECT id, username FROM users WHERE is_active = true ORDER BY id');
        console.log(`Usuários encontrados: ${users.rows.length}`);
        users.rows.forEach(u => console.log(`  ID ${u.id}: ${u.username}`));
        
        console.log('\n🔑 Verificando chaves API...');
        const keys = await pool.query('SELECT user_id, exchange, api_key FROM user_api_keys WHERE is_active = true ORDER BY user_id');
        console.log(`Chaves encontradas: ${keys.rows.length}`);
        keys.rows.forEach(k => console.log(`  User ${k.user_id}: ${k.exchange} - ${k.api_key}`));
        
        console.log('\n🎯 Verificando IDs específicos 14, 15, 16...');
        const specific = await pool.query('SELECT u.id, u.username, k.exchange, k.api_key FROM users u LEFT JOIN user_api_keys k ON u.id = k.user_id WHERE u.id IN (14, 15, 16) ORDER BY u.id');
        console.log(`Registros específicos: ${specific.rows.length}`);
        specific.rows.forEach(s => console.log(`  ID ${s.id} (${s.username}): ${s.exchange || 'SEM CHAVE'} - ${s.api_key || 'N/A'}`));
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

debugSimples();
