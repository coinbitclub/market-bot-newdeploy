#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verificarColunas() {
    console.log('🔍 VERIFICANDO COLUNAS NOT NULL da tabela user_api_keys');
    console.log('=====================================================\n');
    
    try {
        const colunas = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                is_nullable, 
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys' 
            AND is_nullable = 'NO'
            ORDER BY ordinal_position
        `);
        
        console.log('📝 Colunas NOT NULL obrigatórias:');
        colunas.rows.forEach(col => {
            console.log(`   ❗ ${col.column_name}: ${col.data_type} (Default: ${col.column_default || 'NENHUM'})`);
        });

        console.log('\n📊 Teste de inserção com dados mínimos...');
        
        // Testar inserção para descobrir o problema
        try {
            await pool.query(`
                INSERT INTO user_api_keys (
                    user_id, exchange, api_key, api_secret,
                    api_key_encrypted, secret_key_encrypted,
                    api_key_iv, secret_key_iv,
                    environment, is_active, is_testnet
                ) VALUES (
                    999, 'test', 'test_key', 'test_secret',
                    'encrypted_test', 'encrypted_secret',
                    'test_iv', 'test_iv',
                    'mainnet', true, false
                )
            `);
            
            console.log('   ✅ Inserção de teste bem sucedida - removendo...');
            await pool.query('DELETE FROM user_api_keys WHERE user_id = 999');
            
        } catch (insertError) {
            console.log(`   ❌ Erro na inserção: ${insertError.message}`);
            console.log('       Detalhes:', insertError.detail);
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarColunas();
