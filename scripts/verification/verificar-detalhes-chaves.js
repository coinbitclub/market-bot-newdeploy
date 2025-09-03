#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

async function verificarChaves() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const result = await pool.query(`
            SELECT u.username, k.exchange, k.api_key, k.api_secret, 
                   LENGTH(k.api_key) as key_len, LENGTH(k.api_secret) as secret_len
            FROM users u 
            JOIN user_api_keys k ON u.id = k.user_id 
            WHERE u.id IN (14, 16) 
            ORDER BY u.id, k.exchange
        `);

        console.log('🔍 DETALHES DAS CHAVES:');
        result.rows.forEach(row => {
            console.log(`👤 ${row.username} (${row.exchange}):`);
            console.log(`   🔑 Key: ${row.api_key} (${row.key_len} chars)`);
            console.log(`   🔒 Secret: ${row.api_secret} (${row.secret_len} chars)`);
            console.log('');
        });

        // Verificar se há caracteres especiais ou espaços
        result.rows.forEach(row => {
            console.log(`🔍 Análise ${row.username} (${row.exchange}):`);
            console.log(`   Key trimmed: "${row.api_key.trim()}"`);
            console.log(`   Secret trimmed: "${row.api_secret.trim()}"`);
            console.log(`   Key = Trimmed? ${row.api_key === row.api_key.trim()}`);
            console.log(`   Secret = Trimmed? ${row.api_secret === row.api_secret.trim()}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarChaves();
