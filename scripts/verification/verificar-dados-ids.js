#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

async function verificarDadosIDs() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Verificando dados dos IDs 14 e 16...\n');
        
        const result = await pool.query(`
            SELECT u.id, u.username, u.email,
                   k.id as key_id, k.exchange, k.api_key, k.api_secret, 
                   k.environment, k.is_testnet, k.validation_status,
                   k.is_active, k.created_at
            FROM users u 
            JOIN user_api_keys k ON u.id = k.user_id 
            WHERE u.id IN (14, 16) 
            ORDER BY u.id, k.exchange
        `);

        if (result.rows.length === 0) {
            console.log('❌ Nenhum dado encontrado para IDs 14 e 16');
            return;
        }

        console.log('📊 DADOS ENCONTRADOS:');
        console.log('===================');
        
        result.rows.forEach((row, index) => {
            console.log(`\n${index + 1}. USUÁRIO ID ${row.id}:`);
            console.log(`   Username: ${row.username}`);
            console.log(`   Email: ${row.email}`);
            console.log(`   Key ID: ${row.key_id}`);
            console.log(`   Exchange: ${row.exchange}`);
            console.log(`   API Key: ${row.api_key}`);
            console.log(`   API Secret: ${row.api_secret}`);
            console.log(`   Environment: ${row.environment}`);
            console.log(`   Is Testnet: ${row.is_testnet}`);
            console.log(`   Status: ${row.validation_status}`);
            console.log(`   Active: ${row.is_active}`);
            console.log(`   Created: ${row.created_at}`);
        });

        // Verificar também se há usuários com username luiza ou erica
        const userSearch = await pool.query(`
            SELECT u.id, u.username, u.email,
                   k.exchange, k.api_key, k.api_secret
            FROM users u 
            LEFT JOIN user_api_keys k ON u.id = k.user_id 
            WHERE LOWER(u.username) LIKE '%luiza%' 
            OR LOWER(u.username) LIKE '%erica%'
            OR LOWER(u.email) LIKE '%luiza%'
            OR LOWER(u.email) LIKE '%erica%'
            ORDER BY u.id
        `);

        if (userSearch.rows.length > 0) {
            console.log('\n🔍 USUÁRIOS LUIZA/ERICA ENCONTRADOS:');
            console.log('===================================');
            userSearch.rows.forEach(row => {
                console.log(`ID: ${row.id}, User: ${row.username}, Email: ${row.email}`);
                if (row.exchange) {
                    console.log(`   Exchange: ${row.exchange}, Key: ${row.api_key}`);
                }
            });
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarDadosIDs();
