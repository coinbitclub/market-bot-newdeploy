#!/usr/bin/env node

// ===================================================================
// SCRIPT CORREÇÃO BANCO - CHAVES API CORRETAS POR PARTES
// ===================================================================

require('dotenv').config();
const { Pool } = require('pg');

// Configuração do banco usando variável de ambiente
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function corrigirBancoPorPartes() {
    console.log('🔧 CORREÇÃO DO BANCO POR PARTES - CHAVES API CORRETAS');
    console.log('===================================================\n');
    
    try {
        console.log('📋 PARTE 1: Testando conexão com o banco...');
        const testResult = await pool.query('SELECT NOW() as current_time, version() as db_version');
        console.log(`   ✅ Conectado: ${testResult.rows[0].db_version.split(' ')[1]}`);
        console.log(`   🕐 Servidor: ${testResult.rows[0].current_time}\n`);

        console.log('📋 PARTE 2: Verificando estrutura das tabelas...');
        
        // Verificar se tabelas existem
        const tablesCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'user_api_keys')
            ORDER BY table_name
        `);
        
        console.log(`   📊 Tabelas encontradas: ${tablesCheck.rows.map(r => r.table_name).join(', ')}`);

        // Criar tabelas se não existirem
        if (tablesCheck.rows.length < 2) {
            console.log('   🔧 Criando tabelas necessárias...');
            
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    country VARCHAR(10) DEFAULT 'BR',
                    plan_type VARCHAR(50) DEFAULT 'premium',
                    is_active BOOLEAN DEFAULT true,
                    auto_trading_enabled BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT NOW(),
                    last_login TIMESTAMP DEFAULT NOW()
                )
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_api_keys (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    exchange VARCHAR(20) NOT NULL,
                    environment VARCHAR(10) DEFAULT 'mainnet',
                    api_key VARCHAR(255) NOT NULL,
                    api_secret VARCHAR(255) NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    is_testnet BOOLEAN DEFAULT false,
                    validation_status VARCHAR(20) DEFAULT 'pending',
                    validation_error TEXT,
                    last_validated TIMESTAMP,
                    last_used TIMESTAMP,
                    usage_count INTEGER DEFAULT 0,
                    exchange_type VARCHAR(20) DEFAULT 'unified',
                    permissions TEXT DEFAULT 'spot,futures',
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id, exchange)
                )
            `);
            
            console.log('   ✅ Tabelas criadas com sucesso');
        }

        console.log('\n📋 PARTE 3: Inserindo/Atualizando usuários...');
        
        // ID 14 - Luiza Maria de Almeida Pinto
        console.log('   👤 Processando ID 14 - Luiza Maria...');
        await pool.query(`
            INSERT INTO users (id, username, email, country, plan_type, is_active, auto_trading_enabled, password_hash)
            VALUES (14, 'Luiza Maria de Almeida Pinto', 'lmariadeapinto@gmail.com', 'BR', 'premium', true, true, '$2b$10$temp.hash.for.api.trading.user')
            ON CONFLICT (id) DO UPDATE SET 
                username = EXCLUDED.username,
                email = EXCLUDED.email,
                is_active = true,
                auto_trading_enabled = true,
                last_login = NOW()
        `);
        console.log('   ✅ Luiza Maria - usuário criado/atualizado');

        // ID 15 - Paloma Amaral
        console.log('   👤 Processando ID 15 - Paloma Amaral...');
        await pool.query(`
            INSERT INTO users (id, username, email, country, plan_type, is_active, auto_trading_enabled, password_hash)
            VALUES (15, 'Paloma Amaral', 'paloma.amaral@email.com', 'BR', 'premium', true, true, '$2b$10$temp.hash.for.api.trading.user')
            ON CONFLICT (id) DO UPDATE SET 
                username = EXCLUDED.username,
                email = EXCLUDED.email,
                is_active = true,
                auto_trading_enabled = true,
                last_login = NOW()
        `);
        console.log('   ✅ Paloma Amaral - usuário criado/atualizado');

        // ID 16 - Erica dos Santos
        console.log('   👤 Processando ID 16 - Erica dos Santos...');
        await pool.query(`
            INSERT INTO users (id, username, email, country, plan_type, is_active, auto_trading_enabled, password_hash)
            VALUES (16, 'Erica dos Santos', 'erica.andrade.santos@hotmail.com', 'BR', 'premium', true, true, '$2b$10$temp.hash.for.api.trading.user')
            ON CONFLICT (id) DO UPDATE SET 
                username = EXCLUDED.username,
                email = EXCLUDED.email,
                is_active = true,
                auto_trading_enabled = true,
                last_login = NOW()
        `);
        console.log('   ✅ Erica dos Santos - usuário criado/atualizado');

        console.log('\n📋 PARTE 4: Inserindo chaves API CORRETAS...');
        
        // LUIZA MARIA - BYBIT
        console.log('   🔑 ID 14 Luiza Maria - BYBIT...');
        await pool.query(`
            INSERT INTO user_api_keys (
                user_id, exchange, environment, 
                api_key, api_secret,
                api_key_encrypted, secret_key_encrypted,
                api_key_iv, secret_key_iv,
                is_active, is_testnet, validation_status, exchange_type
            )
            VALUES (14, 'bybit', 'mainnet', $1, $2, $3, $4, 'iv_placeholder', 'iv_placeholder', true, false, 'pending', 'unified')
            ON CONFLICT (user_id, exchange) DO UPDATE SET 
                api_key = $1,
                api_secret = $2,
                api_key_encrypted = $3,
                secret_key_encrypted = $4,
                environment = 'mainnet',
                is_active = true,
                is_testnet = false,
                validation_status = 'pending',
                last_validated = NULL
        `, ['JQVNAD0aCqNqPLvo25', 'rQ1Qle81XBkEL5NrvSIOLqpT6OrbZ7wA0dYk', 'JQVNAD0aCqNqPLvo25', 'rQ1Qle81XBkEL5NrvSIOLqpT6OrbZ7wA0dYk']);
        console.log('   ✅ Luiza Maria BYBIT - chave inserida');

        // PALOMA AMARAL - BYBIT
        console.log('   🔑 ID 15 Paloma Amaral - BYBIT...');
        await pool.query(`
            INSERT INTO user_api_keys (
                user_id, exchange, environment, 
                api_key, api_secret,
                api_key_encrypted, secret_key_encrypted,
                api_key_iv, secret_key_iv,
                is_active, is_testnet, validation_status, exchange_type
            )
            VALUES (15, 'bybit', 'mainnet', $1, $2, $3, $4, 'iv_placeholder', 'iv_placeholder', true, false, 'pending', 'unified')
            ON CONFLICT (user_id, exchange) DO UPDATE SET 
                api_key = $1,
                api_secret = $2,
                api_key_encrypted = $3,
                secret_key_encrypted = $4,
                environment = 'mainnet',
                is_active = true,
                is_testnet = false,
                validation_status = 'pending',
                last_validated = NULL
        `, ['DxFAJFj3K19e1g5E', 'ex9M9JA0t12MdT9a1n8W7oiGkQthVYABV', 'DxFAJFj3K19e1g5E', 'ex9M9JA0t12MdT9a1n8W7oiGkQthVYABV']);
        console.log('   ✅ Paloma Amaral BYBIT - chave inserida');

        // ERICA DOS SANTOS - BYBIT
        console.log('   🔑 ID 16 Erica dos Santos - BYBIT...');
        await pool.query(`
            INSERT INTO user_api_keys (
                user_id, exchange, environment, 
                api_key, api_secret,
                api_key_encrypted, secret_key_encrypted,
                api_key_iv, secret_key_iv,
                is_active, is_testnet, validation_status, exchange_type
            )
            VALUES (16, 'bybit', 'mainnet', $1, $2, $3, $4, 'iv_placeholder', 'iv_placeholder', true, false, 'pending', 'unified')
            ON CONFLICT (user_id, exchange) DO UPDATE SET 
                api_key = $1,
                api_secret = $2,
                api_key_encrypted = $3,
                secret_key_encrypted = $4,
                environment = 'mainnet',
                is_active = true,
                is_testnet = false,
                validation_status = 'pending',
                last_validated = NULL
        `, ['2iNeNZQepHJS0lWBkf', '1KkVFTExPQKzZwHsXaUKwzGVSCxCRW6izgbn', '2iNeNZQepHJS0lWBkf', '1KkVFTExPQKzZwHsXaUKwzGVSCxCRW6izgbn']);
        console.log('   ✅ Erica dos Santos BYBIT - chave inserida');

        console.log('\n📋 PARTE 5: Verificando dados inseridos...');
        const verificacao = await pool.query(`
            SELECT 
                u.id, u.username, 
                k.exchange, k.api_key, k.api_secret, k.environment,
                LENGTH(k.api_key) as key_length,
                LENGTH(k.api_secret) as secret_length
            FROM users u
            JOIN user_api_keys k ON u.id = k.user_id
            WHERE u.id IN (14, 15, 16) AND k.is_active = true
            ORDER BY u.id, k.exchange
        `);

        console.log('\n📊 DADOS VERIFICADOS:');
        verificacao.rows.forEach(row => {
            console.log(`   ID ${row.id} (${row.username}) - ${row.exchange.toUpperCase()}`);
            console.log(`      🔑 API Key: ${row.api_key} (${row.key_length} chars)`);
            console.log(`      🔐 Secret: ${row.api_secret.substring(0, 10)}... (${row.secret_length} chars)`);
            console.log(`      🌐 Environment: ${row.environment}`);
            console.log('');
        });

        console.log('🎉 BANCO CORRIGIDO COM SUCESSO!');
        console.log('===============================');
        console.log(`✅ ${verificacao.rows.length} chaves API inseridas corretamente`);
        console.log('✅ Todas as chaves estão no ambiente MAINNET');
        console.log('✅ Estrutura do banco validada');
        console.log('✅ Pronto para teste de conectividade');

    } catch (error) {
        console.error('❌ ERRO na correção do banco:', error.message);
        console.error('   Stack:', error.stack);
    } finally {
        await pool.end();
        console.log('\n👋 Conexão com banco encerrada');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    corrigirBancoPorPartes();
}

module.exports = { corrigirBancoPorPartes };
