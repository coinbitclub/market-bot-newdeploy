#!/usr/bin/env node
/**
 * 🔧 CORREÇÃO FINAL - AJUSTAR CAMPO EXCHANGE_ORDER_ID
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function corrigirCampo() {
    try {
        console.log('🔧 Corrigindo campo exchange_order_id...');
        
        await pool.query(`
            ALTER TABLE order_executions_v2 
            ALTER COLUMN exchange_order_id TYPE VARCHAR(255)
        `);
        
        console.log('✅ Campo expandido para VARCHAR(255)');
        
        // Testar inserção
        await pool.query(`
            INSERT INTO order_executions_v2 (
                user_id, exchange, environment, symbol, side, order_type,
                quantity, price, status, execution_latency, api_version,
                exchange_order_id, created_at
            ) VALUES (15, 'bybit', 'mainnet', 'BTCUSDT', 'BUY', 'MARKET', 0.001, 65000, 'EXECUTED', 1000, 'v2_test', 'TEST_ORDER_ID_LONG_FORMAT_12345', NOW())
        `);
        
        console.log('✅ Teste de inserção realizado com sucesso');
        
        // Verificar registros
        const result = await pool.query(`
            SELECT COUNT(*) as total FROM order_executions_v2 
            WHERE created_at >= NOW() - INTERVAL '1 minute'
        `);
        
        console.log(`📊 Registros criados: ${result.rows[0].total}`);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

corrigirCampo();
