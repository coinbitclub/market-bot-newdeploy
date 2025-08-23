/**
 * 🔍 VERIFICAÇÃO DAS TABELAS PARA DASHBOARD
 * ========================================
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function verificarTabelas() {
    try {
        console.log('🔍 VERIFICANDO ESTRUTURA DO BANCO PARA DASHBOARD');
        console.log('===============================================');

        // Verificar se tabelas principais existem
        const tabelas = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE '%signal%' 
                 OR table_name LIKE '%order%' 
                 OR table_name LIKE '%position%' 
                 OR table_name LIKE '%execution%')
            ORDER BY table_name
        `);

        console.log('📊 TABELAS ENCONTRADAS:');
        tabelas.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });

        // Verificar estrutura da tabela trading_signals
        console.log('\n📡 ESTRUTURA DA TABELA trading_signals:');
        const sigColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'trading_signals'
            ORDER BY column_name
        `);
        
        sigColumns.rows.forEach(col => {
            console.log(`  • ${col.column_name}: ${col.data_type}`);
        });

        // Verificar estrutura da tabela trading_orders (se existir)
        console.log('\n💰 ESTRUTURA DA TABELA trading_orders:');
        const ordColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'trading_orders'
            ORDER BY column_name
        `);
        
        if (ordColumns.rows.length > 0) {
            ordColumns.rows.forEach(col => {
                console.log(`  • ${col.column_name}: ${col.data_type}`);
            });
        } else {
            console.log('  ❌ Tabela trading_orders não existe');
        }

        // Verificar estrutura da tabela positions
        console.log('\n📈 ESTRUTURA DA TABELA positions:');
        const posColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'positions'
            ORDER BY column_name
        `);
        
        if (posColumns.rows.length > 0) {
            posColumns.rows.forEach(col => {
                console.log(`  • ${col.column_name}: ${col.data_type}`);
            });
        } else {
            console.log('  ❌ Tabela positions não existe');
        }

        // Verificar se signal_metrics existe
        console.log('\n🎯 VERIFICANDO signal_metrics:');
        const metricExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'signal_metrics'
            )
        `);
        
        if (metricExists.rows[0].exists) {
            const metricColumns = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'signal_metrics'
                ORDER BY column_name
            `);
            metricColumns.rows.forEach(col => {
                console.log(`  • ${col.column_name}: ${col.data_type}`);
            });
        } else {
            console.log('  ❌ Tabela signal_metrics NÃO EXISTE');
        }

        // Contar registros nas tabelas principais
        console.log('\n📊 CONTAGEM DE REGISTROS:');
        
        const sigCount = await pool.query('SELECT COUNT(*) as count FROM trading_signals');
        console.log(`  📡 trading_signals: ${sigCount.rows[0].count} registros`);

        try {
            const ordCount = await pool.query('SELECT COUNT(*) as count FROM trading_orders');
            console.log(`  💰 trading_orders: ${ordCount.rows[0].count} registros`);
        } catch {
            console.log(`  💰 trading_orders: tabela não existe`);
        }

        try {
            const posCount = await pool.query('SELECT COUNT(*) as count FROM positions');
            console.log(`  📈 positions: ${posCount.rows[0].count} registros`);
        } catch {
            console.log(`  📈 positions: tabela não existe`);
        }

        // Verificar últimos sinais
        console.log('\n🔄 ÚLTIMOS SINAIS (5 mais recentes):');
        const ultSignals = await pool.query(`
            SELECT id, signal, ticker, source, created_at 
            FROM trading_signals 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        ultSignals.rows.forEach(signal => {
            console.log(`  🎯 ID:${signal.id} | ${signal.signal} | ${signal.ticker} | ${signal.created_at}`);
        });

        console.log('\n✅ VERIFICAÇÃO CONCLUÍDA');

    } catch (error) {
        console.error('❌ Erro na verificação:', error);
    } finally {
        await pool.end();
    }
}

verificarTabelas();
