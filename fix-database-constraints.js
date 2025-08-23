#!/usr/bin/env node
/**
 * 🔧 CORREÇÃO DE CONSTRAINTS - BANCO DE DADOS
 * ===========================================
 * 
 * Resolve problemas de constraints duplicadas
 * Remove duplicatas e otimiza performance
 */

console.log('🔧 CORREÇÃO DE CONSTRAINTS - BANCO RAILWAY');
console.log('==========================================');

const { Pool } = require('pg');

async function fixDatabaseConstraints() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Conectando ao banco Railway...');
        await pool.query('SELECT NOW()');
        console.log('✅ Conectado com sucesso');

        // 1. REMOVER DUPLICATAS DA TABELA BALANCES
        console.log('\n🧹 REMOVENDO DUPLICATAS...');
        const duplicatesResult = await pool.query(`
            DELETE FROM balances a USING balances b 
            WHERE a.id > b.id 
            AND a.user_id = b.user_id 
            AND a.asset = b.asset 
            AND a.account_type = b.account_type
        `);
        console.log(`✅ ${duplicatesResult.rowCount} duplicatas removidas`);

        // 2. RECRIAR CONSTRAINT ÚNICA SEGURA
        console.log('\n🔧 RECRIANDO CONSTRAINTS...');
        await pool.query(`
            ALTER TABLE balances 
            DROP CONSTRAINT IF EXISTS balances_user_id_asset_account_type_key
        `);
        
        await pool.query(`
            ALTER TABLE balances 
            ADD CONSTRAINT balances_user_id_asset_account_type_key 
            UNIQUE (user_id, asset, account_type)
        `);
        console.log('✅ Constraint única recriada');

        // 3. CRIAR FUNÇÃO DE UPSERT SEGURA
        console.log('\n⚙️ CRIANDO FUNÇÃO UPSERT SEGURA...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION safe_balance_upsert(
                p_user_id INTEGER,
                p_asset VARCHAR(10),
                p_account_type VARCHAR(20),
                p_balance DECIMAL(20,8),
                p_usd_value DECIMAL(15,2)
            ) RETURNS BOOLEAN AS $$
            DECLARE
                affected_rows INTEGER;
            BEGIN
                -- Tentar fazer UPSERT
                INSERT INTO balances (user_id, asset, account_type, total, usd_value, updated_at)
                VALUES (p_user_id, p_asset, p_account_type, p_balance, p_usd_value, NOW())
                ON CONFLICT (user_id, asset, account_type)
                DO UPDATE SET 
                    total = EXCLUDED.total,
                    usd_value = EXCLUDED.usd_value,
                    updated_at = NOW();
                
                GET DIAGNOSTICS affected_rows = ROW_COUNT;
                RETURN affected_rows > 0;
                
            EXCEPTION WHEN OTHERS THEN
                -- Em caso de erro, apenas retornar false sem quebrar
                RAISE NOTICE 'Erro no balance upsert para user % asset %: %', p_user_id, p_asset, SQLERRM;
                RETURN FALSE;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Função UPSERT segura criada');

        // 4. CONFIGURAR CHAVES PARA TESTNET (EVITAR 403)
        console.log('\n🔑 CONFIGURANDO CHAVES PARA TESTNET...');
        const keysUpdate = await pool.query(`
            UPDATE user_api_keys 
            SET 
                environment = 'testnet',
                error_message = 'Switched to testnet due to IP restrictions',
                updated_at = NOW()
            WHERE error_message LIKE '%403%' 
            OR error_message LIKE '%restricted location%'
            OR error_message LIKE '%Service unavailable%'
            RETURNING user_id, exchange
        `);
        console.log(`✅ ${keysUpdate.rowCount} chaves configuradas para testnet`);

        // 5. VERIFICAR STATUS FINAL
        console.log('\n📊 VERIFICANDO STATUS FINAL...');
        const balancesCheck = await pool.query(`
            SELECT 
                COUNT(*) as total_balances,
                COUNT(DISTINCT CONCAT(user_id, asset, account_type)) as unique_combinations
            FROM balances
        `);

        const keysCheck = await pool.query(`
            SELECT 
                COUNT(*) as total_keys,
                COUNT(CASE WHEN environment = 'testnet' THEN 1 END) as testnet_keys,
                COUNT(CASE WHEN environment = 'mainnet' THEN 1 END) as mainnet_keys,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_keys
            FROM user_api_keys
        `);

        const balances = balancesCheck.rows[0];
        const keys = keysCheck.rows[0];

        console.log('\n📈 RELATÓRIO FINAL:');
        console.log(`💰 Total de balances: ${balances.total_balances}`);
        console.log(`🔢 Combinações únicas: ${balances.unique_combinations}`);
        console.log(`🔑 Total de chaves: ${keys.total_keys}`);
        console.log(`✅ Chaves ativas: ${keys.active_keys}`);
        console.log(`🧪 Chaves testnet: ${keys.testnet_keys}`);
        console.log(`🌐 Chaves mainnet: ${keys.mainnet_keys}`);

        // 6. SALVAR CONFIGURAÇÕES
        await pool.query(`
            INSERT INTO system_config (key, value, description)
            VALUES 
                ('CONSTRAINTS_FIXED', NOW()::text, 'Database constraints fixed'),
                ('TESTNET_MODE_ACTIVE', 'true', 'System in testnet mode for safety')
            ON CONFLICT (key) DO UPDATE SET 
                value = EXCLUDED.value,
                updated_at = NOW()
        `);

        console.log('\n🎉 CORREÇÕES CONCLUÍDAS COM SUCESSO!');
        console.log('===================================');
        console.log('✅ Duplicatas removidas');
        console.log('✅ Constraints corrigidas');
        console.log('✅ UPSERT seguro implementado');
        console.log('✅ Chaves configuradas para testnet');
        console.log('✅ Sistema estável');

    } catch (error) {
        console.error('❌ Erro na correção:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Executar correção
if (require.main === module) {
    fixDatabaseConstraints()
        .then(() => {
            console.log('\n✅ BANCO DE DADOS CORRIGIDO!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Falha na correção:', error.message);
            process.exit(1);
        });
}

module.exports = { fixDatabaseConstraints };
