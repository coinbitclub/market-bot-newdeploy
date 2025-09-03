#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

async function buscarChaves() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Buscando chaves do usuário ID 16...');
        
        const result = await pool.query(`
            SELECT u.id, u.username, u.email, 
                   k.exchange, k.api_key, k.api_secret, 
                   k.environment, k.is_testnet, k.validation_status
            FROM users u 
            JOIN user_api_keys k ON u.id = k.user_id 
            WHERE u.id = 16 AND k.is_active = true
        `);

        console.log('========================');
        if (result.rows.length === 0) {
            console.log('❌ Nenhuma chave encontrada para o usuário ID 16');
            return;
        }

        result.rows.forEach((row, index) => {
            console.log(`\n${index + 1}. ${row.username} (${row.email})`);
            console.log(`   Exchange: ${row.exchange}`);
            console.log(`   Environment: ${row.environment}`);
            console.log(`   Testnet: ${row.is_testnet}`);
            console.log(`   Status: ${row.validation_status}`);
            console.log(`   API Key: ${row.api_key}`);
            console.log(`   API Secret: ${row.api_secret}`);
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

buscarChaves();
