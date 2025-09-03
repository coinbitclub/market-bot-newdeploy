/**
 * 🔍 DIAGNÓSTICO RÁPIDO - PROBLEMAS DO BANCO DE DADOS
 * Baseado nos erros encontrados nos testes
 */

const { Pool } = require('pg');

async function diagnosticarProblemasRapido() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 DIAGNÓSTICO RÁPIDO - PROBLEMAS DO BANCO');
        console.log('==========================================');

        // 1. Verificar estrutura user_api_keys
        console.log('\n1️⃣ ESTRUTURA USER_API_KEYS:');
        const columns = await pool.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'user_api_keys' 
            ORDER BY ordinal_position
        `);

        columns.rows.forEach(col => {
            const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
            console.log(`   • ${col.column_name}: ${col.data_type}${length}`);
        });

        // 2. Verificar chaves dos usuários específicos (14, 15, 16)
        console.log('\n2️⃣ CHAVES DOS USUÁRIOS 14, 15, 16:');
        const keys = await pool.query(`
            SELECT 
                u.id, u.username, u.email,
                uak.exchange, uak.environment,
                LENGTH(uak.api_key) as api_key_length,
                LENGTH(uak.secret_key) as secret_key_length,
                SUBSTRING(uak.api_key, 1, 10) as api_preview,
                uak.validation_status,
                uak.last_validated
            FROM users u
            JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.id IN (14, 15, 16)
            ORDER BY u.id, uak.exchange
        `);

        if (keys.rows.length === 0) {
            console.log('   ❌ NENHUMA CHAVE ENCONTRADA para usuários 14, 15, 16!');
        } else {
            keys.rows.forEach(key => {
                console.log(`   👤 ID ${key.id} (${key.username})`);
                console.log(`      📧 ${key.email}`);
                console.log(`      🔗 ${key.exchange} (${key.environment})`);
                console.log(`      🔑 API Key: ${key.api_preview}... (${key.api_key_length} chars)`);
                console.log(`      🔐 Secret: ${key.secret_key_length} chars`);
                console.log(`      ✅ Status: ${key.validation_status}`);
                console.log(`      📅 Validado: ${key.last_validated}`);
                console.log('');
            });
        }

        // 3. Verificar se há problemas de criptografia
        console.log('3️⃣ VERIFICAÇÃO DE CRIPTOGRAFIA:');
        const cryptoCheck = await pool.query(`
            SELECT 
                id, user_id, exchange,
                api_key LIKE '%encrypted%' as api_encrypted,
                secret_key LIKE '%encrypted%' as secret_encrypted,
                CASE 
                    WHEN api_key ~ '^[A-Za-z0-9+/]*={0,2}$' THEN 'base64'
                    WHEN api_key ~ '^[a-f0-9]+$' THEN 'hex'
                    ELSE 'plain_text'
                END as api_format,
                CASE 
                    WHEN secret_key ~ '^[A-Za-z0-9+/]*={0,2}$' THEN 'base64'
                    WHEN secret_key ~ '^[a-f0-9]+$' THEN 'hex'
                    ELSE 'plain_text'
                END as secret_format
            FROM user_api_keys
            WHERE user_id IN (14, 15, 16)
        `);

        cryptoCheck.rows.forEach(check => {
            console.log(`   📋 ID ${check.id} (User ${check.user_id}) - ${check.exchange}:`);
            console.log(`      🔑 API Format: ${check.api_format} (Encrypted: ${check.api_encrypted})`);
            console.log(`      🔐 Secret Format: ${check.secret_format} (Encrypted: ${check.secret_encrypted})`);
        });

        // 4. Verificar tabela balances
        console.log('\n4️⃣ ESTRUTURA TABELA BALANCES:');
        try {
            const balanceColumns = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'balances'
                ORDER BY ordinal_position
            `);

            if (balanceColumns.rows.length === 0) {
                console.log('   ❌ TABELA BALANCES NÃO EXISTE!');
            } else {
                console.log('   ✅ Tabela balances existe com colunas:');
                balanceColumns.rows.forEach(col => {
                    console.log(`      • ${col.column_name}: ${col.data_type}`);
                });
            }
        } catch (error) {
            console.log(`   ❌ Erro ao verificar balances: ${error.message}`);
        }

        // 5. Verificar última atividade
        console.log('\n5️⃣ ÚLTIMA ATIVIDADE:');
        const lastActivity = await pool.query(`
            SELECT 
                COUNT(*) as total_keys,
                COUNT(CASE WHEN last_validated IS NOT NULL THEN 1 END) as validated_keys,
                MAX(last_validated) as last_validation,
                COUNT(CASE WHEN validation_status = 'valid' THEN 1 END) as valid_keys,
                COUNT(CASE WHEN validation_status = 'invalid' THEN 1 END) as invalid_keys
            FROM user_api_keys
        `);

        const activity = lastActivity.rows[0];
        console.log(`   📊 Total de chaves: ${activity.total_keys}`);
        console.log(`   ✅ Chaves validadas: ${activity.validated_keys}`);
        console.log(`   🟢 Chaves válidas: ${activity.valid_keys}`);
        console.log(`   🔴 Chaves inválidas: ${activity.invalid_keys}`);
        console.log(`   📅 Última validação: ${activity.last_validation}`);

        console.log('\n✅ DIAGNÓSTICO CONCLUÍDO!');

    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error.message);
    } finally {
        await pool.end();
    }
}

diagnosticarProblemasRapido();
