const { Pool } = require('pg');

async function verificarTabelas() {
    const pool = new Pool({
        connectionString: 'process.env.DATABASE_URL',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Verificando tabelas específicas...');
        
        // Verificar se signal_metrics existe
        const signalMetrics = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'signal_metrics'
            );
        `);
        
        console.log('📊 signal_metrics:', signalMetrics.rows[0].exists ? '✅ EXISTE' : '❌ NÃO EXISTE');
        
        // Verificar se signal_metrics_log existe
        const signalMetricsLog = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'signal_metrics_log'
            );
        `);
        
        console.log('📊 signal_metrics_log:', signalMetricsLog.rows[0].exists ? '✅ EXISTE' : '❌ NÃO EXISTE');
        
        // Verificar se aguia_news_radars existe
        const aguiaRadars = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'aguia_news_radars'
            );
        `);
        
        console.log('🦅 aguia_news_radars:', aguiaRadars.rows[0].exists ? '✅ EXISTE' : '❌ NÃO EXISTE');
        
        // Verificar se trading_signals existe
        const tradingSignals = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'trading_signals'
            );
        `);
        
        console.log('📡 trading_signals:', tradingSignals.rows[0].exists ? '✅ EXISTE' : '❌ NÃO EXISTE');
        
        // Verificar se trading_orders existe
        const tradingOrders = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'trading_orders'
            );
        `);
        
        console.log('💰 trading_orders:', tradingOrders.rows[0].exists ? '✅ EXISTE' : '❌ NÃO EXISTE');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarTabelas();
