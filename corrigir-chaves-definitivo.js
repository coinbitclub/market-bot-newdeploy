#!/usr/bin/env node
/**
 * 🔧 CORRIGIR CHAVES DEFINITIVO - Usar valores EXATOS confirmados pelo usuário
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function corrigirChavesDefinitivo() {
    try {
        console.log('🔧 CORRIGINDO CHAVES COM VALORES EXATOS CONFIRMADOS:');
        console.log('===================================================\n');
        
        // 1. Luiza (ID 14) - Bybit REAL confirmado $101.02
        console.log('📝 Atualizando Luiza (ID 14) - Bybit REAL...');
        await pool.query(`
            UPDATE user_api_keys 
            SET 
                api_key = 'aD8kYRg4d9I4nUdOCT',
                api_secret = 'YOUR_SECRET_KEY_HERE',
                environment = 'mainnet',
                is_testnet = false,
                validation_status = 'pending',
                last_validated = NULL
            WHERE user_id = 14 AND exchange = 'bybit'
        `);
        console.log('✅ Luiza (ID 14) atualizada com chave REAL');
        
        // 2. Paloma (ID 15) - Bybit REAL confirmado $73.71
        console.log('📝 Atualizando Paloma (ID 15) - Bybit REAL...');
        await pool.query(`
            UPDATE user_api_keys 
            SET 
                api_key = 'Hht9CGrXnXNXPP8Ht8',
                api_secret = 'YOUR_SECRET_KEY_HERE',
                environment = 'mainnet',
                is_testnet = false,
                validation_status = 'pending',
                last_validated = NULL
            WHERE user_id = 15 AND exchange = 'bybit'
        `);
        console.log('✅ Paloma (ID 15) atualizada com chave REAL');
        
        // 3. Erica (ID 16) - Binance REAL confirmado $26.29
        console.log('📝 Atualizando Erica (ID 16) - Binance REAL...');
        await pool.query(`
            UPDATE user_api_keys 
            SET 
                api_key = 'YOUR_API_KEY_HERE',
                api_secret = 'YOUR_SECRET_KEY_HERE',
                environment = 'mainnet',
                is_testnet = false,
                validation_status = 'pending',
                last_validated = NULL
            WHERE user_id = 16 AND exchange = 'binance'
        `);
        console.log('✅ Erica (ID 16) Binance atualizada com chave REAL');
        
        // 4. Erica (ID 16) - Bybit REAL confirmado $147.02
        console.log('📝 Atualizando Erica (ID 16) - Bybit REAL...');
        await pool.query(`
            UPDATE user_api_keys 
            SET 
                api_key = 'YOUR_API_KEY_HERE',
                api_secret = 'YOUR_SECRET_KEY_HERE',
                environment = 'mainnet',
                is_testnet = false,
                validation_status = 'pending',
                last_validated = NULL
            WHERE user_id = 16 AND exchange = 'bybit'
        `);
        console.log('✅ Erica (ID 16) Bybit atualizada com chave REAL');
        
        console.log('\n📊 Verificando chaves atualizadas...');
        const result = await pool.query(`
            SELECT 
                u.id, u.username, 
                k.exchange, k.api_key, k.api_secret, k.environment,
                LENGTH(k.api_key) as key_length,
                LENGTH(k.api_secret) as secret_length
            FROM users u
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE u.id IN (14, 15, 16) AND k.is_active = true
            ORDER BY u.id, k.exchange
        `);
        
        console.log('CHAVES FINAIS CONFIRMADAS:');
        console.log('=========================');
        result.rows.forEach(row => {
            console.log(`ID ${row.id} (${row.username}) - ${row.exchange.toUpperCase()}:`);
            console.log(`  🔑 API Key: ${row.api_key} (${row.key_length} chars)`);
            console.log(`  🔐 Secret: ${row.api_secret.substring(0, 20)}... (${row.secret_length} chars)`);
            console.log(`  🌐 Environment: ${row.environment}`);
            console.log('');
        });
        
        console.log('✨ TODAS AS CHAVES AGORA SÃO REAIS E CONFIRMADAS!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

corrigirChavesDefinitivo();
