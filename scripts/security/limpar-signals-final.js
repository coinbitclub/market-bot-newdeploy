#!/usr/bin/env node

/**
 * 🧹 LIMPEZA FINAL - SIGNALS E ORDERS
 * ==================================
 * 
 * Remove signals restantes respeitando foreign keys
 */

const { Pool } = require('pg');

async function cleanSignalsAndOrders() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🧹 Limpando signals e orders com foreign keys...\n');

        // 1. Verificar orders existentes
        const ordersResult = await pool.query('SELECT COUNT(*) as count FROM orders');
        const ordersCount = parseInt(ordersResult.rows[0].count);
        console.log(`📊 Orders encontradas: ${ordersCount}`);

        // 2. Verificar signals existentes
        const signalsResult = await pool.query('SELECT COUNT(*) as count FROM signals');
        const signalsCount = parseInt(signalsResult.rows[0].count);
        console.log(`📊 Signals encontrados: ${signalsCount}`);

        if (ordersCount > 0) {
            // 3. Remover orders primeiro
            await pool.query('DELETE FROM orders');
            console.log('✅ Orders removidas');
        }

        if (signalsCount > 0) {
            // 4. Remover signals
            await pool.query('DELETE FROM signals');
            console.log('✅ Signals removidos');
        }

        // 5. Resetar sequências
        try {
            await pool.query('ALTER SEQUENCE signals_id_seq RESTART WITH 1');
            console.log('🔄 signals_id_seq resetada');
        } catch (e) {
            console.log('⚠️  signals_id_seq não existe');
        }

        try {
            await pool.query('ALTER SEQUENCE orders_id_seq RESTART WITH 1');
            console.log('🔄 orders_id_seq resetada');
        } catch (e) {
            console.log('⚠️  orders_id_seq não existe');
        }

        // 6. Verificação final
        const finalSignals = await pool.query('SELECT COUNT(*) as count FROM signals');
        const finalOrders = await pool.query('SELECT COUNT(*) as count FROM orders');
        
        console.log('\n📊 VERIFICAÇÃO FINAL:');
        console.log(`✅ Signals: ${finalSignals.rows[0].count}`);
        console.log(`✅ Orders: ${finalOrders.rows[0].count}`);
        
        console.log('\n🎯 LIMPEZA FINAL CONCLUÍDA!');
        console.log('💻 Sistema 100% limpo e pronto para produção');

        await pool.end();

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

cleanSignalsAndOrders();
