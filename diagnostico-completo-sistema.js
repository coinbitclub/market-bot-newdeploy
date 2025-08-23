// SECURITY_VALIDATED: 2025-08-08T23:29:34.795Z
// Este arquivo foi verificado e tem credenciais protegidas

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:PROTECTED_DB_PASSWORD@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function diagnosticoCompleto() {
    try {
        console.log('🔍 DIAGNÓSTICO COMPLETO DO SISTEMA DE TRADING');
        console.log('='.repeat(60));

        // 1. Verificar sinais recentes
        console.log('\n📡 SINAIS RECENTES (últimas 24h):');
        const recentSignals = await pool.query(`
            SELECT 
                id, symbol, action, side, signal_type, status, processed, 
                created_at, processed_at, source, source_webhook
            FROM signals 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        if (recentSignals.rows.length === 0) {
            console.log('❌ Nenhum sinal encontrado nas últimas 24h');
        } else {
            recentSignals.rows.forEach(signal => {
                console.log(`   ${signal.id}: ${signal.symbol} ${signal.action}/${signal.side} - Status: ${signal.status} - Processed: ${signal.processed} - ${signal.created_at}`);
            });
        }

        // 2. Verificar sinais não processados
        console.log('\n⏳ SINAIS NÃO PROCESSADOS:');
        const unprocessedSignals = await pool.query(`
            SELECT COUNT(*) as count 
            FROM signals 
            WHERE processed = false OR processed IS NULL
        `);
        console.log(`   Total: ${unprocessedSignals.rows[0].count}`);

        if (parseInt(unprocessedSignals.rows[0].count) > 0) {
            const examples = await pool.query(`
                SELECT id, symbol, action, status, created_at 
                FROM signals 
                WHERE processed = false OR processed IS NULL
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            examples.rows.forEach(signal => {
                console.log(`   🔄 ${signal.id}: ${signal.symbol} ${signal.action} - ${signal.status} - ${signal.created_at}`);
            });
        }

        // 3. Verificar ordens executadas
        console.log('\n💰 ORDENS EXECUTADAS (últimas 24h):');
        const recentOrders = await pool.query(`
            SELECT 
                id, user_id, symbol, side, quantity, status, exchange, 
                created_at, order_id
            FROM real_orders 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        if (recentOrders.rows.length === 0) {
            console.log('❌ Nenhuma ordem executada nas últimas 24h');
        } else {
            recentOrders.rows.forEach(order => {
                console.log(`   ${order.id}: User ${order.user_id} - ${order.symbol} ${order.side} ${order.quantity} - ${order.status} - ${order.exchange}`);
            });
        }

        // 4. Verificar usuários ativos
        console.log('\n👥 USUÁRIOS ATIVOS:');
        const activeUsers = await pool.query(`
            SELECT 
                u.id, u.username, u.email, u.is_active,
                COUNT(uak.id) as keys_count
            FROM users u
            LEFT JOIN user_api_keys uak ON u.id = uak.user_id AND uak.is_active = true
            WHERE u.is_active = true
            GROUP BY u.id, u.username, u.email, u.is_active
            ORDER BY u.id
        `);

        if (activeUsers.rows.length === 0) {
            console.log('❌ Nenhum usuário ativo encontrado');
        } else {
            activeUsers.rows.forEach(user => {
                console.log(`   ${user.id}: ${user.username} (${user.email}) - ${user.keys_count} chaves`);
            });
        }

        // 5. Verificar chaves de API válidas
        console.log('\n🔐 CHAVES DE API:');
        const apiKeys = await pool.query(`
            SELECT 
                user_id, exchange, environment, validation_status, is_active, created_at
            FROM user_api_keys
            WHERE is_active = true
            ORDER BY user_id, exchange
        `);

        if (apiKeys.rows.length === 0) {
            console.log('❌ Nenhuma chave de API ativa encontrada');
        } else {
            apiKeys.rows.forEach(key => {
                console.log(`   User ${key.user_id}: ${key.exchange} (${key.environment}) - ${key.validation_status}`);
            });
        }

        // 6. Verificar posições ativas
        console.log('\n📊 POSIÇÕES ATIVAS:');
        const activePositions = await pool.query(`
            SELECT 
                user_id, symbol, side, size, entry_price, 
                stop_loss, take_profit, exchange, created_at
            FROM positions 
            WHERE is_active = true
            ORDER BY created_at DESC
            LIMIT 10
        `);

        if (activePositions.rows.length === 0) {
            console.log('✅ Nenhuma posição ativa (esperado se não há trading)');
        } else {
            activePositions.rows.forEach(pos => {
                console.log(`   User ${pos.user_id}: ${pos.symbol} ${pos.side} ${pos.size} - Entry: ${pos.entry_price}`);
            });
        }

        // 7. Verificar logs de validação de chaves
        console.log('\n🔍 LOGS DE VALIDAÇÃO DE CHAVES (últimas):');
        try {
            const keyLogs = await pool.query(`
                SELECT user_id, exchange, status, error_message, validated_at
                FROM key_validation_log
                ORDER BY validated_at DESC
                LIMIT 5
            `);
            
            if (keyLogs.rows.length === 0) {
                console.log('⚠️ Nenhum log de validação encontrado');
            } else {
                keyLogs.rows.forEach(log => {
                    console.log(`   User ${log.user_id}: ${log.exchange} - ${log.status} - ${log.validated_at}`);
                    if (log.error_message) {
                        console.log(`     Erro: ${log.error_message}`);
                    }
                });
            }
        } catch (error) {
            console.log('⚠️ Tabela key_validation_log não encontrada');
        }

        // 8. Verificar configurações do sistema
        console.log('\n⚙️ CONFIGURAÇÕES DO SISTEMA:');
        console.log(`   ENABLE_REAL_TRADING: ${process.env.ENABLE_REAL_TRADING || 'not set'}`);
        console.log(`   POSITION_SAFETY_ENABLED: ${process.env.POSITION_SAFETY_ENABLED || 'not set'}`);
        console.log(`   MAX_LEVERAGE: ${process.env.MAX_LEVERAGE || 'not set'}`);
        console.log(`   MIN_BALANCE_BRAZIL_BRL: ${process.env.MIN_BALANCE_BRAZIL_BRL || 'not set'}`);
        console.log(`   MIN_BALANCE_FOREIGN_USD: ${process.env.MIN_BALANCE_FOREIGN_USD || 'not set'}`);

        // 9. Testar conectividade do banco
        console.log('\n🗄️ CONECTIVIDADE DO BANCO:');
        const dbTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        console.log(`   ✅ Conectado: ${dbTest.rows[0].current_time}`);
        console.log(`   📊 PostgreSQL: ${dbTest.rows[0].pg_version.split(' ')[1]}`);

        console.log('\n' + '='.repeat(60));
        console.log('🎯 DIAGNÓSTICO CONCLUÍDO');

    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error.message);
    } finally {
        await pool.end();
    }
}

diagnosticoCompleto();
