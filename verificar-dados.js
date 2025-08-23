const { Pool } = require('pg');

async function verificarDados() {
    const pool = new Pool({
        connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway'
    });

    try {
        console.log('📊 VERIFICANDO DADOS NO BANCO:');
        
        const signals = await pool.query('SELECT COUNT(*) as total, MAX(created_at) as last_signal FROM trading_signals');
        console.log('📡 Sinais:', signals.rows[0].total, '- Último:', signals.rows[0].last_signal);
        
        const orders = await pool.query('SELECT COUNT(*) as total, MAX(created_at) as last_order FROM trading_orders');
        console.log('💰 Ordens:', orders.rows[0].total, '- Última:', orders.rows[0].last_order);
        
        const metrics = await pool.query('SELECT COUNT(*) as total, MAX(created_at) as last_metric FROM signal_metrics_log');
        console.log('📈 Métricas:', metrics.rows[0].total, '- Última:', metrics.rows[0].last_metric);
        
        const aguia = await pool.query('SELECT COUNT(*) as total, MAX(generated_at) as last_radar FROM aguia_news_radars');
        console.log('🦅 Aguia News:', aguia.rows[0].total, '- Último:', aguia.rows[0].last_radar);
        
        // Verificar últimos sinais se existirem
        if (parseInt(signals.rows[0].total) > 0) {
            const recentSignals = await pool.query('SELECT id, symbol, side, created_at FROM trading_signals ORDER BY created_at DESC LIMIT 5');
            console.log('\n📡 ÚLTIMOS 5 SINAIS:');
            recentSignals.rows.forEach(signal => {
                console.log(`   ${signal.created_at} - ${signal.symbol} ${signal.side}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarDados();
