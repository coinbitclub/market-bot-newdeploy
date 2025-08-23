#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

async function testeConectividade() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 Testando conectividade e queries...');
        
        // Teste básico de conectividade
        const timeResult = await pool.query('SELECT NOW() as time');
        console.log('✅ Banco conectado:', timeResult.rows[0].time);

        // Teste da query principal
        console.log('\n🔍 Testando query de carregamento de usuários...');
        const result = await pool.query(`
            SELECT DISTINCT 
                u.id, u.username, u.email, u.country, u.plan_type,
                u.is_active, u.auto_trading_enabled, u.created_at, u.last_login,
                k.id as key_id, k.exchange, k.environment, k.is_active as key_active,
                k.api_key, k.api_secret, k.validation_status, k.last_validated,
                k.is_testnet, k.permissions, k.exchange_type
            FROM users u
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE u.is_active = true 
            AND k.is_active = true
            AND (k.api_key IS NOT NULL OR k.api_key_encrypted IS NOT NULL)
            ORDER BY u.id, k.exchange
            LIMIT 5
        `);

        console.log(`✅ Query executada com sucesso. ${result.rows.length} registros encontrados.`);
        
        if (result.rows.length > 0) {
            console.log('\n📊 Primeiros registros:');
            result.rows.forEach((row, i) => {
                console.log(`${i+1}. User: ${row.username} | Exchange: ${row.exchange} | Env: ${row.environment}`);
                console.log(`   API Key: ${row.api_key ? row.api_key.substring(0, 10) + '...' : 'N/A'}`);
                console.log(`   Status: ${row.validation_status || 'N/A'} | Testnet: ${row.is_testnet}`);
            });
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

testeConectividade();
