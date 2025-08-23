#!/usr/bin/env node
/**
 * 📊 VERIFICAÇÃO DE SALDOS - USUÁRIOS 14, 15, 16, 17
 */

const { Pool } = require('pg');
const ccxt = require('ccxt');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:FDjupFGvAzzwbuZMRyVxlJBXsQtphlHv@maglev.proxy.rlwy.net:42095/railway',
    ssl: { rejectUnauthorized: false }
});

console.log('📊 VERIFICAÇÃO DE SALDOS - USUÁRIOS 14, 15, 16, 17');
console.log('================================================');

async function verificarSaldosUsuarios() {
    try {
        // Buscar dados dos usuários
        const usuarios = await pool.query(`
            SELECT 
                id, username,
                binance_api_key, binance_api_secret,
                bybit_api_key, bybit_api_secret,
                balance_brl, balance_usd, balance,
                trading_active, ativo
            FROM users 
            WHERE id IN (14, 15, 16, 17)
            ORDER BY id
        `);
        
        console.log(`🔍 Encontrados ${usuarios.rows.length} usuários\n`);
        
        for (const user of usuarios.rows) {
            console.log(`👤 ID ${user.id} - ${user.username}`);
            console.log('   📊 SALDOS NO BANCO:');
            
            const totalSaldo = (user.balance_brl || 0) + (user.balance_usd || 0) + (user.balance || 0);
            console.log(`      Total: $${totalSaldo.toFixed(2)}`);
            console.log(`      BRL: $${(user.balance_brl || 0).toFixed(2)}`);
            console.log(`      USD: $${(user.balance_usd || 0).toFixed(2)}`);
            console.log(`      Balance: $${(user.balance || 0).toFixed(2)}`);
            
            const trading = user.trading_active || user.ativo ? '✅ Ativo' : '❌ Inativo';
            console.log(`      Trading: ${trading}`);
            
            // Verificar exchanges
            console.log('   🔗 EXCHANGES:');
            
            // Binance
            if (user.binance_api_key && user.binance_api_secret) {
                console.log('      🟡 Binance: Configurado');
                await verificarSaldoBinance(user);
            } else {
                console.log('      🟡 Binance: ❌ Não configurado');
            }
            
            // Bybit
            if (user.bybit_api_key && user.bybit_api_secret) {
                console.log('      🟣 Bybit: Configurado');
                await verificarSaldoBybit(user);
            } else {
                console.log('      🟣 Bybit: ❌ Não configurado');
            }
            
            console.log('');
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar usuários:', error.message);
    }
}

async function verificarSaldoBinance(user) {
    try {
        const binance = new ccxt.binance({
            apiKey: user.binance_api_key,
            secret: user.binance_api_secret,
            sandbox: true, // Testnet
            enableRateLimit: true,
            options: { defaultType: 'future' }
        });
        
        const balance = await binance.fetchBalance();
        
        console.log('         💰 Saldos Binance Testnet:');
        console.log(`            USDT: ${balance.USDT?.free || 0}`);
        console.log(`            BNB: ${balance.BNB?.free || 0}`);
        console.log(`            BTC: ${balance.BTC?.free || 0}`);
        
    } catch (error) {
        console.log(`         ❌ Erro Binance: ${error.message}`);
    }
}

async function verificarSaldoBybit(user) {
    try {
        const bybit = new ccxt.bybit({
            apiKey: user.bybit_api_key,
            secret: user.bybit_api_secret,
            sandbox: true, // Testnet
            enableRateLimit: true,
            options: { defaultType: 'linear' }
        });
        
        const balance = await bybit.fetchBalance();
        
        console.log('         💰 Saldos Bybit Testnet:');
        console.log(`            USDT: ${balance.USDT?.free || 0}`);
        console.log(`            BTC: ${balance.BTC?.free || 0}`);
        console.log(`            ETH: ${balance.ETH?.free || 0}`);
        
    } catch (error) {
        console.log(`         ❌ Erro Bybit: ${error.message}`);
    }
}

async function main() {
    await verificarSaldosUsuarios();
    
    console.log('📋 RESUMO:');
    console.log('=========');
    console.log('✅ Verificação de saldos concluída');
    console.log('🔍 Dados coletados do banco e exchanges');
    console.log('💡 Use essas informações para decidir próximos passos');
    
    await pool.end();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { verificarSaldosUsuarios };
