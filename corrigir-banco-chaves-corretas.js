#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO DO BANCO - CHAVES API CORRETAS
 * =========================================
 * Atualizando banco com as chaves fornecidas pelo usuário
 */

const { Pool } = require('pg');

// Configuração do banco Railway
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:bJlOYydRNLpPtrnhmIVZGfJaZQuhuyau@junction.proxy.rlwy.net:36587/railway',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function corrigirBancoChaves() {
    try {
        console.log('🔧 CORRIGINDO BANCO COM CHAVES CORRETAS');
        console.log('======================================\n');

        // 1. ID 14 - Luiza Maria de Almeida Pinto - BYBIT
        console.log('📝 Atualizando ID 14 - Luiza Maria - BYBIT...');
        await pool.query(`
            UPDATE user_api_keys 
            SET 
                api_key = 'JQVNAD0aCqNqPLvo25',
                api_secret = 'rQ1Qle81XBkEL5NrvSIOLqpT6OrbZ7wA0dYk',
                environment = 'mainnet',
                is_testnet = false,
                validation_status = 'pending',
                last_validated = NULL,
                validation_error = NULL
            WHERE user_id = 14 AND exchange = 'bybit'
        `);
        console.log('✅ Luiza Maria (ID 14) - BYBIT atualizada');

        // 2. ID 15 - Paloma Amaral - BYBIT  
        console.log('📝 Atualizando ID 15 - Paloma Amaral - BYBIT...');
        await pool.query(`
            UPDATE user_api_keys 
            SET 
                api_key = 'DxFAJFj3K19e1g5E',
                api_secret = 'ex9M9JA0t12MdT9a1n8W7oiGkQthVYABV',
                environment = 'mainnet',
                is_testnet = false,
                validation_status = 'pending',
                last_validated = NULL,
                validation_error = NULL
            WHERE user_id = 15 AND exchange = 'bybit'
        `);
        console.log('✅ Paloma Amaral (ID 15) - BYBIT atualizada');

        // 3. ID 16 - Erica dos Santos - BYBIT
        console.log('📝 Atualizando ID 16 - Erica dos Santos - BYBIT...');
        await pool.query(`
            UPDATE user_api_keys 
            SET 
                api_key = '2iNeNZQepHJS0lWBkf',
                api_secret = '1KkVFTExPQKzZwHsXaUKwzGVSCxCRW6izgbn',
                environment = 'mainnet',
                is_testnet = false,
                validation_status = 'pending',
                last_validated = NULL,
                validation_error = NULL
            WHERE user_id = 16 AND exchange = 'bybit'
        `);
        console.log('✅ Erica dos Santos (ID 16) - BYBIT atualizada');

        console.log('\n📊 Verificando chaves atualizadas...');
        const result = await pool.query(`
            SELECT 
                u.id, u.username, 
                k.exchange, k.api_key, k.api_secret, k.environment,
                LENGTH(k.api_key) as key_length,
                LENGTH(k.api_secret) as secret_length,
                k.validation_status
            FROM users u
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE u.id IN (14, 15, 16) AND k.exchange = 'bybit' AND k.is_active = true
            ORDER BY u.id
        `);

        console.log('\n🔍 CHAVES ATUALIZADAS NO BANCO:');
        console.log('===============================');
        for (const row of result.rows) {
            console.log(`ID ${row.id} (${row.username}) - ${row.exchange.toUpperCase()}:`);
            console.log(`  🔑 API Key: ${row.api_key} (${row.key_length} chars)`);
            console.log(`  🔐 Secret: ${row.api_secret.substring(0, 20)}... (${row.secret_length} chars)`);
            console.log(`  🌐 Environment: ${row.environment}`);
            console.log(`  ✅ Status: ${row.validation_status}`);
            console.log('');
        }

        console.log('🎉 BANCO CORRIGIDO COM SUCESSO!');
        console.log('===============================');
        console.log('✅ Todas as 3 chaves BYBIT foram atualizadas');
        console.log('✅ Environment configurado para mainnet');
        console.log('✅ Status resetado para pending (pronto para validação)');
        
    } catch (error) {
        console.error('❌ Erro ao corrigir banco:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Executar correção
if (require.main === module) {
    corrigirBancoChaves()
        .then(() => {
            console.log('\n👋 Correção do banco concluída!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Falha na correção:', error.message);
            process.exit(1);
        });
}

module.exports = { corrigirBancoChaves };
