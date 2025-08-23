#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

async function atualizarChavesValidas() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 Atualizando chaves com as da imagem (que funcionam)...\n');
        
        // Atualizar Luiza (ID 14) com chaves válidas da imagem
        console.log('1️⃣ Atualizando LUIZA (ID 14)...');
        const luizaResult = await pool.query(`
            UPDATE user_api_keys 
            SET api_key = $1, 
                api_secret = $2,
                validation_status = 'pending',
                last_validated = NOW(),
                updated_at = NOW()
            WHERE user_id = 14 AND exchange = 'bybit'
            RETURNING id, exchange, api_key, api_secret
        `, ['9HZy9BiUW95iXprVRl', 'QJjDXNmsIQq1gakTUk7FHAHZnjlEN8AaRkQ0']);

        if (luizaResult.rows.length > 0) {
            console.log('   ✅ Luiza atualizada:');
            console.log(`      Key: ${luizaResult.rows[0].api_key}`);
            console.log(`      Secret: ${luizaResult.rows[0].api_secret}`);
        } else {
            console.log('   ⚠️ Luiza não encontrada, criando nova entrada...');
            await pool.query(`
                INSERT INTO user_api_keys (
                    user_id, exchange, environment, api_key, api_secret,
                    is_active, is_testnet, validation_status, exchange_type
                ) VALUES (14, 'bybit', 'mainnet', $1, $2, true, false, 'pending', 'spot')
            `, ['9HZy9BiUW95iXprVRl', 'QJjDXNmsIQq1gakTUk7FHAHZnjlEN8AaRkQ0']);
            console.log('   ✅ Nova entrada criada para Luiza');
        }

        // Atualizar Erica (ID 16) com chaves válidas da imagem
        console.log('\n2️⃣ Atualizando ERICA (ID 16)...');
        const ericaResult = await pool.query(`
            UPDATE user_api_keys 
            SET api_key = $1, 
                api_secret = $2,
                validation_status = 'pending',
                last_validated = NOW(),
                updated_at = NOW()
            WHERE user_id = 16 AND exchange = 'bybit'
            RETURNING id, exchange, api_key, api_secret
        `, ['2iNeNZQepHJS0lWBkf', '1KkVFTExPQKzZwHsXaUKwzGVSCxCRW6izgDn']);

        if (ericaResult.rows.length > 0) {
            console.log('   ✅ Erica atualizada:');
            console.log(`      Key: ${ericaResult.rows[0].api_key}`);
            console.log(`      Secret: ${ericaResult.rows[0].api_secret}`);
        } else {
            console.log('   ⚠️ Erica Bybit não encontrada, criando nova entrada...');
            await pool.query(`
                INSERT INTO user_api_keys (
                    user_id, exchange, environment, api_key, api_secret,
                    is_active, is_testnet, validation_status, exchange_type
                ) VALUES (16, 'bybit', 'mainnet', $1, $2, true, false, 'pending', 'spot')
            `, ['2iNeNZQepHJS0lWBkf', '1KkVFTExPQKzZwHsXaUKwzGVSCxCRW6izgDn']);
            console.log('   ✅ Nova entrada criada para Erica');
        }

        // Verificar as atualizações
        console.log('\n3️⃣ Verificando atualizações...');
        const verificacao = await pool.query(`
            SELECT u.username, u.email, k.exchange, k.api_key, k.api_secret, k.validation_status
            FROM users u 
            JOIN user_api_keys k ON u.id = k.user_id 
            WHERE u.id IN (14, 16) AND k.exchange = 'bybit'
            ORDER BY u.id
        `);

        console.log('📊 CHAVES ATUALIZADAS:');
        verificacao.rows.forEach(row => {
            console.log(`   👤 ${row.username}: ${row.api_key} / ${row.api_secret}`);
        });

        console.log('\n🎉 CHAVES VÁLIDAS INSERIDAS NO BANCO!');
        console.log('Agora o Order Execution Engine V2.0 deve funcionar!');

    } catch (error) {
        console.error('❌ Erro na atualização:', error.message);
    } finally {
        await pool.end();
    }
}

atualizarChavesValidas();
