#!/usr/bin/env node

/**
 * 🔍 VERIFICAÇÃO COMPLETA DOS USUÁRIOS
 * ====================================
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function checkUsers() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
        ssl: { rejectUnauthorized: false }
    });

    console.log('🔍 VERIFICAÇÃO COMPLETA DOS USUÁRIOS 14, 15, 16, 17...\n');
    
    const client = await pool.connect();
    
    try {
        // 1. Verificar se os usuários existem
        const existsQuery = await client.query(`
            SELECT id, username, email, created_at FROM users WHERE id IN (14, 15, 16, 17) ORDER BY id
        `);
        
        console.log('📋 USUÁRIOS ENCONTRADOS:');
        console.log('========================');
        if (existsQuery.rows.length === 0) {
            console.log('❌ NENHUM usuário encontrado com IDs 14, 15, 16, 17');
            return;
        }
        
        existsQuery.rows.forEach(user => {
            console.log(`🔹 ID ${user.id}: ${user.username} (${user.email}) - Criado: ${user.created_at}`);
        });
        
        // 2. Verificar campos específicos
        const detailQuery = await client.query(`
            SELECT 
                id,
                username,
                exchange_auto_trading,
                exchange_testnet_mode,
                binance_api_key_encrypted,
                binance_api_secret_encrypted,
                bybit_api_key_encrypted,
                bybit_api_secret_encrypted,
                api_validation_status
            FROM users 
            WHERE id IN (14, 15, 16, 17)
            ORDER BY id
        `);
        
        console.log('\n\n🔑 ANÁLISE DETALHADA DAS CHAVES:');
        console.log('================================');
        
        detailQuery.rows.forEach(user => {
            console.log(`\n🔹 USUÁRIO ${user.id} (${user.username}):`);
            console.log(`   Exchange Auto Trading: ${user.exchange_auto_trading}`);
            console.log(`   Exchange Testnet Mode: ${user.exchange_testnet_mode}`);
            console.log(`   API Validation Status: ${user.api_validation_status || 'NULL'}`);
            
            console.log(`\n    CHAVES CRIPTOGRAFADAS:`);
            console.log(`      Binance Key Encrypted: ${user.binance_api_key_encrypted || 'NULL'}`);
            console.log(`      Binance Secret Encrypted: ${user.binance_api_secret_encrypted || 'NULL'}`);
            console.log(`      Bybit Key Encrypted: ${user.bybit_api_key_encrypted || 'NULL'}`);
            console.log(`      Bybit Secret Encrypted: ${user.bybit_api_secret_encrypted || 'NULL'}`);
            
            // Determinar o problema
            let problema = [];
            if (!user.exchange_auto_trading) problema.push('AUTO_TRADING_DESABILITADO');
            if (!user.binance_api_key_encrypted && !user.bybit_api_key_encrypted) {
                problema.push('NENHUMA_CHAVE_CADASTRADA');
            }
            
            if (problema.length > 0) {
                console.log(`\n   🚨 PROBLEMAS IDENTIFICADOS: ${problema.join(', ')}`);
            } else {
                console.log(`\n   ✅ USUÁRIO PARECE OK`);
            }
        });
        
        // 3. Verificar o que seria necessário para ativá-los
        console.log('\n\n💡 SOLUÇÕES NECESSÁRIAS:');
        console.log('========================');
        
        detailQuery.rows.forEach(user => {
            console.log(`\n🔹 USUÁRIO ${user.id} (${user.username}):`);
            
            const temChaves = user.binance_api_key_encrypted || user.bybit_api_key_encrypted;
            
            if (!user.exchange_auto_trading) {
                console.log(`   1. ✅ HABILITAR AUTO TRADING: UPDATE users SET exchange_auto_trading = true WHERE id = ${user.id};`);
            }
            
            if (!temChaves) {
                console.log(`   2. ✅ CADASTRAR CHAVES DE API nas exchanges (Binance ou Bybit)`);
            }
            
            if (user.exchange_auto_trading && temChaves) {
                console.log(`   ✅ USUÁRIO JÁ ESTÁ CONFIGURADO CORRETAMENTE`);
            }
        });
        
    } finally {
        client.release();
        await pool.end();
    }
}

checkUsers().catch(console.error);
