const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function verificarDadosReais() {
    try {
        console.log('🔍 VERIFICANDO DADOS REAIS DO SISTEMA...\n');
        
        // 1. Verificar tabelas existentes
        const tables = await pool.query(`
            SELECT table_name, 
                   (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📊 TABELAS ENCONTRADAS:');
        for (const table of tables.rows) {
            const count = await pool.query(`SELECT COUNT(*) FROM ${table.table_name}`);
            console.log(`   ${table.table_name}: ${count.rows[0].count} registros (${table.column_count} colunas)`);
        }
        console.log('');
        
        // 2. Verificar usuários reais
        if (tables.rows.some(t => t.table_name === 'users')) {
            console.log('👥 USUÁRIOS REAIS:');
            const users = await pool.query(`
                SELECT id, name, email, created_at, 
                       CASE 
                           WHEN api_key IS NOT NULL AND secret_key IS NOT NULL THEN 'Com chaves API'
                           ELSE 'Sem chaves API'
                       END as api_status
                FROM users 
                ORDER BY created_at DESC 
                LIMIT 10
            `);
            users.rows.forEach(user => {
                console.log(`   ID ${user.id}: ${user.name} (${user.email}) - ${user.api_status}`);
            });
            console.log('');
        }
        
        // 3. Verificar chaves API reais
        if (tables.rows.some(t => t.table_name === 'user_api_keys')) {
            console.log('🔑 CHAVES API REAIS:');
            const keys = await pool.query(`
                SELECT uk.id, u.name, uk.exchange, uk.is_valid, uk.last_checked, uk.error_message
                FROM user_api_keys uk 
                JOIN users u ON u.id = uk.user_id
                ORDER BY uk.created_at DESC
            `);
            keys.rows.forEach(key => {
                const status = key.is_valid === true ? '✅ Válida' : 
                              key.is_valid === false ? '❌ Inválida' : '⏳ Não testada';
                console.log(`   ${key.name} - ${key.exchange}: ${status}`);
                if (key.error_message) {
                    console.log(`     Erro: ${key.error_message}`);
                }
            });
            console.log('');
        }
        
        // 4. Verificar posições ativas reais
        if (tables.rows.some(t => t.table_name === 'active_positions')) {
            console.log('📈 POSIÇÕES ATIVAS REAIS:');
            const positions = await pool.query(`
                SELECT symbol, position_type, quantity, entry_price, 
                       current_price, pnl, status, created_at
                FROM active_positions 
                WHERE status = 'OPEN'
                ORDER BY created_at DESC
                LIMIT 10
            `);
            if (positions.rows.length === 0) {
                console.log('   Nenhuma posição ativa encontrada');
            } else {
                positions.rows.forEach(pos => {
                    console.log(`   ${pos.symbol} ${pos.position_type}: ${pos.quantity} @ ${pos.entry_price} (PnL: ${pos.pnl || 'N/A'})`);
                });
            }
            console.log('');
        }
        
        // 5. Verificar ordens reais
        if (tables.rows.some(t => t.table_name === 'trading_orders')) {
            console.log('📋 ORDENS REAIS (últimas 10):');
            const orders = await pool.query(`
                SELECT symbol, side, quantity, price, status, created_at,
                       exchange, user_id
                FROM trading_orders 
                ORDER BY created_at DESC
                LIMIT 10
            `);
            if (orders.rows.length === 0) {
                console.log('   Nenhuma ordem encontrada');
            } else {
                orders.rows.forEach(order => {
                    console.log(`   ${order.symbol} ${order.side}: ${order.quantity} @ ${order.price} - ${order.status} (${order.exchange})`);
                });
            }
            console.log('');
        }
        
        // 6. Verificar sinais reais
        if (tables.rows.some(t => t.table_name === 'signals')) {
            console.log('📡 SINAIS REAIS (últimos 5):');
            const signals = await pool.query(`
                SELECT symbol, action, price, confidence, source, created_at
                FROM signals 
                ORDER BY created_at DESC
                LIMIT 5
            `);
            if (signals.rows.length === 0) {
                console.log('   Nenhum sinal encontrado');
            } else {
                signals.rows.forEach(signal => {
                    console.log(`   ${signal.symbol} ${signal.action}: ${signal.price} (${signal.confidence}% confiança) - ${signal.source}`);
                });
            }
            console.log('');
        }
        
        // 7. Verificar saldos reais
        if (tables.rows.some(t => t.table_name === 'balances')) {
            console.log('💰 SALDOS REAIS:');
            const balances = await pool.query(`
                SELECT u.name, b.asset, b.free, b.locked, b.exchange, b.updated_at
                FROM balances b
                JOIN users u ON u.id = b.user_id
                WHERE b.free > 0 OR b.locked > 0
                ORDER BY b.updated_at DESC
                LIMIT 10
            `);
            if (balances.rows.length === 0) {
                console.log('   Nenhum saldo encontrado');
            } else {
                balances.rows.forEach(balance => {
                    console.log(`   ${balance.name} - ${balance.asset}: ${balance.free} livre + ${balance.locked} bloqueado (${balance.exchange})`);
                });
            }
            console.log('');
        }
        
        // 8. Verificar Fear & Greed Index
        if (tables.rows.some(t => t.table_name === 'fear_greed_index')) {
            console.log('😱 FEAR & GREED INDEX:');
            const fearGreed = await pool.query(`
                SELECT value, classification, last_update, source
                FROM fear_greed_index 
                ORDER BY last_update DESC
                LIMIT 3
            `);
            if (fearGreed.rows.length === 0) {
                console.log('   Nenhum dado Fear & Greed encontrado');
            } else {
                fearGreed.rows.forEach(fg => {
                    console.log(`   ${fg.value}/100 - ${fg.classification} (${fg.source})`);
                });
            }
            console.log('');
        }
        
        console.log('✅ VERIFICAÇÃO COMPLETA!');
        
    } catch (error) {
        console.error('❌ Erro ao verificar dados:', error.message);
    } finally {
        await pool.end();
    }
}

verificarDadosReais();
