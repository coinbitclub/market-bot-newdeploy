#!/usr/bin/env node

/**
 * ⚡ ATIVAÇÃO IMEDIATA DO SISTEMA DUAL
 * 
 * Executa comandos diretos para ativar o sistema dual testnet + management
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function quickActivate() {
    const client = await pool.connect();
    
    try {
        console.log('⚡ ATIVAÇÃO RÁPIDA DO SISTEMA DUAL');
        console.log('==================================');

        // 1. Adicionar colunas se não existirem
        console.log('\n🔧 Adicionando colunas necessárias...');
        
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'testnet' 
            CHECK (account_type IN ('testnet', 'management'))
        `);
        
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS testnet_mode BOOLEAN DEFAULT true
        `);
        
        console.log('✅ Colunas adicionadas');

        // 2. Inserir configurações essenciais
        console.log('\n⚙️ Configurando sistema...');
        
        await client.query(`
            INSERT INTO system_config (config_key, config_value, description)
            VALUES 
                ('DUAL_MODE_ACTIVE', 'true', 'Sistema dual ativo'),
                ('ENABLE_REAL_TRADING', 'true', 'Trading real habilitado'),
                ('MINIMUM_BALANCE_BRL', '100', 'Saldo mínimo BRL para management'),
                ('MINIMUM_BALANCE_USD', '20', 'Saldo mínimo USD para management')
            ON CONFLICT (config_key) 
            DO UPDATE SET config_value = EXCLUDED.config_value
        `);
        
        console.log('✅ Configurações inseridas');

        // 3. Classificar usuários automaticamente
        console.log('\n👥 Classificando usuários...');
        
        // Atualizar usuários para testnet (padrão)
        await client.query(`
            UPDATE users 
            SET account_type = 'testnet', testnet_mode = true
            WHERE is_active = true OR ativo = true
        `);
        
        // Promover usuários com saldo para management
        await client.query(`
            UPDATE users 
            SET account_type = 'management', testnet_mode = false
            WHERE (is_active = true OR ativo = true)
            AND (
                COALESCE(prepaid_balance_brl, 0) >= 100 OR
                COALESCE(prepaid_balance_usd, 0) >= 20 OR
                plan_type = 'MONTHLY'
            )
        `);
        
        console.log('✅ Usuários classificados');

        // 4. Verificar resultados
        console.log('\n📊 Verificando resultados...');
        
        const stats = await client.query(`
            SELECT 
                account_type,
                testnet_mode,
                COUNT(*) as count
            FROM users 
            WHERE is_active = true OR ativo = true
            GROUP BY account_type, testnet_mode
            ORDER BY account_type, testnet_mode
        `);
        
        console.log('\n👥 DISTRIBUIÇÃO DE USUÁRIOS:');
        stats.rows.forEach(row => {
            const mode = row.testnet_mode ? 'TESTNET' : 'MANAGEMENT';
            console.log(`   ${row.account_type} (${mode}): ${row.count} usuários`);
        });

        // 5. Verificar configurações
        const configs = await client.query(`
            SELECT config_key, config_value 
            FROM system_config 
            WHERE config_key IN ('DUAL_MODE_ACTIVE', 'ENABLE_REAL_TRADING')
        `);
        
        console.log('\n⚙️ CONFIGURAÇÕES ATIVAS:');
        configs.rows.forEach(row => {
            console.log(`   ${row.config_key}: ${row.config_value}`);
        });

        console.log('\n🎯 RESULTADO:');
        console.log('✅ Sistema dual TESTNET + MANAGEMENT ativado');
        console.log('📋 Usuários sem saldo/assinatura → TESTNET');
        console.log('💼 Usuários com saldo/assinatura → MANAGEMENT');
        console.log('⚡ Trading real habilitado para ambos os tipos');

    } catch (error) {
        console.error('❌ ERRO:', error.message);
    } finally {
        client.release();
    }
}

// Executar
quickActivate().then(() => {
    console.log('\n🚀 ATIVAÇÃO CONCLUÍDA!');
    process.exit(0);
}).catch(error => {
    console.error('💥 FALHA:', error);
    process.exit(1);
});
