#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function simpleTest() {
    console.log('🧪 TESTE SIMPLES - BUSCA DE CHAVES\n');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        const client = await pool.connect();
        
        // Consulta atualizada que busca TODAS as chaves completas
        const result = await client.query(`
            SELECT 
                id,
                username,
                exchange_auto_trading,
                CASE WHEN binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL THEN true ELSE false END as has_binance_complete,
                CASE WHEN bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL THEN true ELSE false END as has_bybit_complete
            FROM users 
            WHERE 
                (
                    (binance_api_key_encrypted IS NOT NULL AND binance_api_secret_encrypted IS NOT NULL) OR
                    (bybit_api_key_encrypted IS NOT NULL AND bybit_api_secret_encrypted IS NOT NULL)
                )
            ORDER BY id
        `);
        
        console.log(`📊 USUÁRIOS COM CHAVES COMPLETAS: ${result.rows.length}`);
        console.log('===========================================');
        
        result.rows.forEach(user => {
            const autoStatus = user.exchange_auto_trading ? '✅ AUTO' : '⚠️  MANUAL';
            const binanceStatus = user.has_binance_complete ? '🟢 B' : '';
            const bybitStatus = user.has_bybit_complete ? '🟡 Y' : '';
            console.log(`   • ID ${user.id}: ${user.username} ${autoStatus} ${binanceStatus}${bybitStatus}`);
        });
        
        client.release();
        await pool.end();
        
        console.log('\n✅ TESTE CONCLUÍDO!');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

simpleTest();
