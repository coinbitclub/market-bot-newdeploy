#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

async function buscarChavesID16() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Buscando dados do usuário ID 16...');
        
        const result = await pool.query(`
            SELECT 
                u.id, u.username, u.email,
                k.exchange, k.api_key, k.api_secret, 
                k.environment, k.is_testnet, k.validation_status
            FROM users u
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE u.id = 16
        `);

        if (result.rows.length > 0) {
            console.log('🔑 Dados encontrados:');
            result.rows.forEach((row, i) => {
                console.log(`\n${i+1}. Usuario: ${row.username} (${row.email})`);
                console.log(`   Exchange: ${row.exchange}`);
                console.log(`   API Key: ${row.api_key}`);
                console.log(`   API Secret: ${row.api_secret}`);
                console.log(`   Environment: ${row.environment}`);
                console.log(`   Testnet: ${row.is_testnet}`);
                console.log(`   Status: ${row.validation_status}`);
            });
        } else {
            console.log('❌ Usuário ID 16 não encontrado');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

buscarChavesID16();
