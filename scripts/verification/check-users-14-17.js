#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function checkUsers14to17() {
    console.log('🔍 VERIFICANDO USUÁRIOS 14, 15, 16, 17...\n');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        const result = await client.query(`
            SELECT 
                id,
                username,
                email,
                exchange_auto_trading,
                binance_api_key_encrypted IS NOT NULL as has_b_key,
                binance_api_secret_encrypted IS NOT NULL as has_b_secret,
                bybit_api_key_encrypted IS NOT NULL as has_y_key,
                bybit_api_secret_encrypted IS NOT NULL as has_y_secret
            FROM users 
            WHERE id IN (14, 15, 16, 17)
            ORDER BY id
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ USUÁRIOS 14, 15, 16, 17 NÃO EXISTEM!');
        } else {
            console.log(`📊 ENCONTRADOS ${result.rows.length} USUÁRIOS:`);
            console.log('====================================');
            
            result.rows.forEach(user => {
                console.log(`\n🔹 ID ${user.id}: ${user.username}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Auto Trading: ${user.exchange_auto_trading ? '✅ ATIVO' : '❌ INATIVO'}`);
                console.log(`   Binance: Key=${user.has_b_key ? '✅' : '❌'} Secret=${user.has_b_secret ? '✅' : '❌'}`);
                console.log(`   Bybit: Key=${user.has_y_key ? '✅' : '❌'} Secret=${user.has_y_secret ? '✅' : '❌'}`);
                
                const hasCompleteKeys = (user.has_b_key && user.has_b_secret) || (user.has_y_key && user.has_y_secret);
                console.log(`   Status: ${hasCompleteKeys ? '🎯 TEM CHAVES COMPLETAS' : '⚠️  SEM CHAVES COMPLETAS'}`);
            });
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

checkUsers14to17();
