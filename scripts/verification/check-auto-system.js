#!/usr/bin/env node

require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');
const UserExchangeManager = require('./user-exchange-manager');

async function checkAutoSystem() {
    console.log('🔍 VERIFICANDO SISTEMA AUTOMÁTICO...\n');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    const userManager = new UserExchangeManager();
    
    try {
        // 1. Verificar usuários com auto trading
        console.log('1️⃣ USUÁRIOS COM AUTO TRADING:');
        const autoUsers = await pool.query(`
            SELECT 
                id, 
                username, 
                exchange_auto_trading,
                exchange_testnet_mode,
                binance_api_key_encrypted IS NOT NULL as has_binance,
                bybit_api_key_encrypted IS NOT NULL as has_bybit,
                api_validation_status,
                last_api_validation
            FROM users 
            WHERE exchange_auto_trading = true
            ORDER BY id
        `);
        
        if (autoUsers.rows.length === 0) {
            console.log('❌ NENHUM usuário com auto trading ativo');
        } else {
            autoUsers.rows.forEach(user => {
                console.log(`🔹 ${user.username} (ID: ${user.id})`);
                console.log(`   Auto Trading: ${user.exchange_auto_trading ? '✅' : '❌'}`);
                console.log(`   Testnet: ${user.exchange_testnet_mode ? '✅' : '❌'}`);
                console.log(`   Binance: ${user.has_binance ? '✅' : '❌'} | Bybit: ${user.has_bybit ? '✅' : '❌'}`);
                console.log(`   Status API: ${user.api_validation_status || 'N/A'}`);
                console.log('');
            });
        }
        
        // 2. Verificar se o UserExchangeManager está funcionando
        console.log('2️⃣ TESTANDO USER EXCHANGE MANAGER:');
        const activeUsers = await userManager.getAllUsersWithApiKeys();
        console.log(`📊 Usuários encontrados pelo sistema: ${activeUsers.length}`);
        
        activeUsers.forEach(user => {
            console.log(`🔹 ${user.username} (ID: ${user.id})`);
            console.log(`   Binance: ${user.has_binance ? '✅' : '❌'} | Bybit: ${user.has_bybit ? '✅' : '❌'}`);
        });
        
        // 3. Verificar sinais recentes
        console.log('\n3️⃣ SINAIS RECENTES:');
        const recentSignals = await pool.query(`
            SELECT 
                id, 
                symbol, 
                action, 
                status, 
                processed_at,
                (SELECT COUNT(*) FROM user_trading_executions WHERE signal_id = signals.id) as executions_count
            FROM signals 
            WHERE status = 'MULTI_USER_PROCESSED'
            ORDER BY processed_at DESC 
            LIMIT 5
        `);
        
        recentSignals.rows.forEach(signal => {
            console.log(`🔹 Sinal ID: ${signal.id} | ${signal.symbol} ${signal.action}`);
            console.log(`   Status: ${signal.status} | Execuções: ${signal.executions_count}`);
            console.log(`   Processado: ${signal.processed_at}`);
        });
        
        // 4. Verificar se há webhook sendo recebido
        console.log('\n4️⃣ WEBHOOK STATUS:');
        const webhookSignals = await pool.query(`
            SELECT COUNT(*) as total_today
            FROM signals 
            WHERE processed_at >= CURRENT_DATE
        `);
        
        console.log(`📡 Sinais recebidos hoje: ${webhookSignals.rows[0]?.total_today || 0}`);
        
        // 5. Status do sistema
        console.log('\n5️⃣ STATUS DO SISTEMA:');
        console.log(`🔗 ENABLE_REAL_TRADING: ${process.env.ENABLE_REAL_TRADING}`);
        console.log(`🧪 TESTNET_MODE: ${process.env.TESTNET_MODE}`);
        
        console.log('\n📋 RESUMO:');
        if (activeUsers.length > 0) {
            console.log('✅ Sistema ESTÁ buscando usuários automaticamente');
            console.log(`✅ ${activeUsers.length} usuários configurados para auto trading`);
            console.log('✅ Pronto para processar sinais do TradingView');
        } else {
            console.log('❌ Sistema NÃO está encontrando usuários automaticamente');
            console.log('⚠️ Verificar configurações de auto trading dos usuários');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
    
    process.exit(0);
}

checkAutoSystem();
