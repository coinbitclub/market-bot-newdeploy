#!/usr/bin/env node

require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkExecutions() {
    try {
        console.log('📊 VERIFICANDO EXECUÇÕES REAIS...\n');
        
        // Últimas execuções
        const executions = await pool.query(`
            SELECT 
                ute.id,
                ute.user_id,
                u.username,
                ute.exchange,
                ute.symbol,
                ute.side,
                ute.amount,
                ute.price,
                ute.status,
                ute.order_id,
                ute.testnet_mode,
                ute.error_message,
                ute.executed_at
            FROM user_trading_executions ute
            LEFT JOIN users u ON ute.user_id = u.id
            ORDER BY ute.executed_at DESC 
            LIMIT 10
        `);
        
        console.log(`🔍 ENCONTRADAS ${executions.rows.length} EXECUÇÕES:\n`);
        
        executions.rows.forEach((exec, index) => {
            console.log(`${index + 1}. 📡 ${exec.exchange?.toUpperCase()} - ${exec.username} (ID: ${exec.user_id})`);
            console.log(`   Symbol: ${exec.symbol} | Side: ${exec.side} | Amount: ${exec.amount}`);
            console.log(`   Status: ${exec.status} | Testnet: ${exec.testnet_mode}`);
            
            if (exec.order_id) {
                console.log(`   ✅ Order ID: ${exec.order_id} | Price: $${exec.price || 'N/A'}`);
            }
            
            if (exec.error_message) {
                console.log(`   ❌ Erro: ${exec.error_message}`);
            }
            
            console.log(`   🕐 Executado: ${exec.executed_at}`);
            console.log('');
        });
        
        // Estatísticas por exchange
        const stats = await pool.query(`
            SELECT 
                exchange,
                COUNT(*) as total_executions,
                COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful,
                COUNT(CASE WHEN status = 'ERROR' THEN 1 END) as errors,
                COUNT(CASE WHEN order_id IS NOT NULL THEN 1 END) as with_order_id
            FROM user_trading_executions
            GROUP BY exchange
            ORDER BY total_executions DESC
        `);
        
        console.log('📈 ESTATÍSTICAS POR EXCHANGE:\n');
        stats.rows.forEach(stat => {
            console.log(`🔹 ${stat.exchange?.toUpperCase()}:`);
            console.log(`   Total: ${stat.total_executions} | Sucesso: ${stat.successful} | Erros: ${stat.errors}`);
            console.log(`   Ordens executadas: ${stat.with_order_id}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
    
    process.exit(0);
}

checkExecutions();
