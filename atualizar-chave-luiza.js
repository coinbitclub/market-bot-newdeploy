#!/usr/bin/env node

/**
 * 🔄 ATUALIZAÇÃO DA CHAVE DA LUIZA - CORREÇÃO ESPECÍFICA
 * Atualizando com as chaves corretas fornecidas pelo usuário
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function atualizarChaveLuiza() {
    console.log('🔄 ATUALIZANDO CHAVE DA LUIZA (ID 14)');
    console.log('=====================================');

    try {
        // Novas chaves da Luiza fornecidas pelo usuário
        const novaChaveAPI = '9HZy9BiUW95iXprVRl';
        const novoSecret = 'QUjDXNmsl0qiqakTUk7FHAHZnjlEN8AaRkQ0';

        console.log('📝 Dados para atualização:');
        console.log(`   👤 Usuário: Luiza Maria (ID 14)`);
        console.log(`   🔑 Nova API Key: ${novaChaveAPI}`);
        console.log(`   🔐 Novo Secret: ${novoSecret.substring(0, 10)}...${novoSecret.substring(novoSecret.length-4)}`);
        console.log(`   🏢 Exchange: Bybit`);

        // 1. Verificar se o usuário existe
        console.log('\n1️⃣ Verificando usuário Luiza...');
        const userCheck = await pool.query(`
            SELECT id, username, email FROM users WHERE id = 14
        `);

        if (userCheck.rows.length === 0) {
            throw new Error('Usuário Luiza (ID 14) não encontrado');
        }

        console.log(`   ✅ Usuário encontrado: ${userCheck.rows[0].username} (${userCheck.rows[0].email})`);

        // 2. Atualizar a chave API da Luiza
        console.log('\n2️⃣ Atualizando chave API da Luiza...');
        const updateResult = await pool.query(`
            UPDATE user_api_keys 
            SET 
                api_key = $1::VARCHAR,
                api_secret = $2::VARCHAR,
                api_key_encrypted = $3::VARCHAR,
                secret_key_encrypted = $4::VARCHAR,
                validation_status = 'pending',
                last_validated = NULL,
                validation_error = NULL,
                is_active = true
            WHERE user_id = 14 AND exchange = 'bybit'
            RETURNING id, user_id, exchange, api_key
        `, [novaChaveAPI, novoSecret, novaChaveAPI, novoSecret]);

        if (updateResult.rows.length === 0) {
            // Se não existe registro, criar um novo
            console.log('   ⚠️ Registro não encontrado, criando novo...');
            
            const insertResult = await pool.query(`
                INSERT INTO user_api_keys (
                    user_id, exchange, environment, 
                    api_key, api_secret, api_key_encrypted, secret_key_encrypted,
                    api_key_iv, secret_key_iv,
                    is_active, is_testnet, validation_status, exchange_type
                )
                VALUES (14, 'bybit', 'mainnet', $1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, 'iv_placeholder', 'iv_placeholder', true, false, 'pending', 'unified')
                RETURNING id, user_id, exchange, api_key
            `, [novaChaveAPI, novoSecret, novaChaveAPI, novoSecret]);

            console.log(`   ✅ Nova chave criada: ID ${insertResult.rows[0].id}`);
        } else {
            console.log(`   ✅ Chave atualizada: ID ${updateResult.rows[0].id}`);
        }

        // 3. Verificar a atualização
        console.log('\n3️⃣ Verificando atualização...');
        const verification = await pool.query(`
            SELECT 
                u.id, u.username,
                k.exchange, k.api_key, k.api_secret, k.validation_status,
                k.is_active, k.environment,
                LENGTH(k.api_key) as key_length,
                LENGTH(k.api_secret) as secret_length
            FROM users u
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE u.id = 14 AND k.exchange = 'bybit'
        `);

        if (verification.rows.length > 0) {
            const row = verification.rows[0];
            console.log('   📊 Dados atualizados:');
            console.log(`      👤 Usuário: ${row.username} (ID ${row.id})`);
            console.log(`      🏢 Exchange: ${row.exchange.toUpperCase()}`);
            console.log(`      🔑 API Key: ${row.api_key}`);
            console.log(`      🔐 Secret: ${row.api_secret.substring(0, 10)}...${row.api_secret.substring(row.api_secret.length-4)}`);
            console.log(`      🌐 Environment: ${row.environment}`);
            console.log(`      ✅ Status: ${row.is_active ? 'ATIVA' : 'INATIVA'}`);
            console.log(`      📏 Tamanhos: Key=${row.key_length}, Secret=${row.secret_length}`);
        } else {
            throw new Error('Erro na verificação: registro não encontrado após atualização');
        }

        console.log('\n🎉 CHAVE DA LUIZA ATUALIZADA COM SUCESSO!');
        console.log('=========================================');
        console.log('✅ A chave foi atualizada no banco de dados');
        console.log('✅ Status definido como "pending" para nova validação');
        console.log('✅ Pronto para testar a nova conectividade');

    } catch (error) {
        console.error('\n❌ ERRO na atualização:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Executar a atualização
atualizarChaveLuiza().catch(console.error);
