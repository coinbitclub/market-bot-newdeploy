/**
 * 🧪 TESTE RÁPIDO - QUERIES CORRIGIDAS
 */

const { Pool } = require('pg');

async function testarQueries() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🧪 TESTANDO QUERIES CORRIGIDAS...\n');

        // 1. Testar query user_api_keys corrigida
        console.log('1️⃣ Testando query user_api_keys...');
        const keysQuery = `
            SELECT 
                uk.id,
                uk.user_id,
                u.username as user_name,
                uk.exchange,
                uk.api_key,
                uk.is_testnet,
                uk.is_active,
                uk.ip_restrictions,
                uk.last_used,
                uk.created_at
            FROM user_api_keys uk
            JOIN users u ON uk.user_id = u.id 
            WHERE uk.is_active = true
            ORDER BY uk.user_id, uk.exchange
            LIMIT 5
        `;
        
        const keysResult = await pool.query(keysQuery);
        console.log(`✅ Sucesso! Encontradas ${keysResult.rows.length} chaves ativas`);

        // 2. Testar query balances corrigida
        console.log('\n2️⃣ Testando query balances...');
        const balancesQuery = `
            SELECT 
                b.user_id,
                u.username as user_name,
                b.exchange,
                b.asset,
                b.wallet_balance as balance,
                b.available_balance as free,
                b.locked_balance as used,
                b.account_type,
                b.last_updated as updated_at
            FROM balances b
            JOIN users u ON b.user_id = u.id
            WHERE b.last_updated > NOW() - INTERVAL '24 hours'
            ORDER BY b.last_updated DESC
            LIMIT 5
        `;
        
        const balancesResult = await pool.query(balancesQuery);
        console.log(`✅ Sucesso! Encontrados ${balancesResult.rows.length} registros de saldo`);

        // 3. Mostrar dados se existirem
        if (keysResult.rows.length > 0) {
            console.log('\n🔑 CHAVES ENCONTRADAS:');
            keysResult.rows.forEach(key => {
                console.log(`   👤 User ${key.user_id} (${key.user_name}): ${key.exchange}`);
                console.log(`      🔑 ${key.api_key.substring(0, 8)}...`);
                console.log(`      🧪 Testnet: ${key.is_testnet ? 'Sim' : 'Não'}`);
                console.log(`      ✅ Ativo: ${key.is_active ? 'Sim' : 'Não'}`);
            });
        }

        if (balancesResult.rows.length > 0) {
            console.log('\n💰 SALDOS ENCONTRADOS:');
            balancesResult.rows.forEach(balance => {
                console.log(`   👤 User ${balance.user_id} (${balance.user_name}): ${balance.exchange}`);
                console.log(`      💰 ${balance.asset}: ${balance.balance}`);
                console.log(`      ⏰ Última atualização: ${balance.updated_at}`);
            });
        } else {
            console.log('\n💡 Nenhum saldo encontrado nas últimas 24h');
            console.log('   Isso é normal se o IP acabou de ser configurado');
        }

        console.log('\n🎉 TODAS AS QUERIES ESTÃO FUNCIONANDO!');
        console.log('✅ monitor-chaves-api.js deve funcionar agora');

    } catch (error) {
        console.log('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

testarQueries();
