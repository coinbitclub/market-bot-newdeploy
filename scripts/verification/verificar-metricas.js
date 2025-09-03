const { Pool } = require('pg');

async function verificarMetricas() {
    const pool = new Pool({
        connectionString: 'process.env.DATABASE_URL'
    });

    try {
        console.log('📈 VERIFICANDO MÉTRICAS DE IA:');
        
        const metrics = await pool.query(`
            SELECT symbol, ai_approved, ai_reason, created_at 
            FROM signal_metrics_log 
            ORDER BY created_at DESC 
            LIMIT 3
        `);
        
        if (metrics.rows.length > 0) {
            metrics.rows.forEach((row, index) => {
                console.log(`\n${index + 1}. ${row.symbol} - ${row.created_at}`);
                console.log(`   IA Aprovado: ${row.ai_approved}`);
                console.log(`   Motivo: ${row.ai_reason || 'N/A'}`);
            });
        } else {
            console.log('   Nenhuma métrica encontrada');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarMetricas();
