#!/usr/bin/env node
/**
 * 📊 CONSULTA RÁPIDA - SALDOS USUÁRIOS 14, 15, 16, 17
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function consultaRapida() {
    try {
        console.log('📊 CONSULTA RÁPIDA - USUÁRIOS 14, 15, 16, 17');
        console.log('==========================================');
        
        const query = `
            SELECT 
                id, 
                COALESCE(username, 'N/A') as username,
                COALESCE(balance_brl, 0) as balance_brl,
                COALESCE(balance_usd, 0) as balance_usd,
                COALESCE(balance, 0) as balance_main,
                CASE WHEN binance_api_key IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_binance,
                CASE WHEN bybit_api_key IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_bybit,
                COALESCE(trading_active, false) as trading_active,
                COALESCE(ativo, false) as ativo
            FROM users 
            WHERE id IN (14, 15, 16, 17)
            ORDER BY id
        `;
        
        const result = await pool.query(query);
        
        if (result.rows.length === 0) {
            console.log('❌ Nenhum usuário encontrado');
            return;
        }
        
        console.log(`✅ Encontrados ${result.rows.length} usuários\n`);
        
        result.rows.forEach(user => {
            const total = user.balance_brl + user.balance_usd + user.balance_main;
            const trading = user.trading_active || user.ativo;
            
            console.log(`ID ${user.id} - ${user.username}`);
            console.log(`   💰 Saldo Total: $${total.toFixed(2)}`);
            console.log(`      BRL: $${user.balance_brl.toFixed(2)}`);
            console.log(`      USD: $${user.balance_usd.toFixed(2)}`); 
            console.log(`      Main: $${user.balance_main.toFixed(2)}`);
            console.log(`   🔗 Binance: ${user.tem_binance}`);
            console.log(`   🔗 Bybit: ${user.tem_bybit}`);
            console.log(`   📈 Trading: ${trading ? 'ATIVO' : 'INATIVO'}`);
            console.log('');
        });
        
        // Resumo
        const totalGeral = result.rows.reduce((sum, user) => 
            sum + user.balance_brl + user.balance_usd + user.balance_main, 0
        );
        
        const usuariosAtivos = result.rows.filter(user => 
            user.trading_active || user.ativo
        ).length;
        
        const comBinance = result.rows.filter(user => 
            user.tem_binance === 'SIM'
        ).length;
        
        const comBybit = result.rows.filter(user => 
            user.tem_bybit === 'SIM'
        ).length;
        
        console.log('📊 RESUMO:');
        console.log(`   Total usuários: ${result.rows.length}`);
        console.log(`   Usuários ativos: ${usuariosAtivos}`);
        console.log(`   Com Binance: ${comBinance}`);
        console.log(`   Com Bybit: ${comBybit}`);
        console.log(`   Saldo total: $${totalGeral.toFixed(2)}`);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

consultaRapida();
