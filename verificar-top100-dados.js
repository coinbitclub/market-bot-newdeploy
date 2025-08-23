const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function verificarDados() {
    try {
        console.log('🔍 Verificando dados coletados...');
        
        // Verificar quantos registros foram inseridos
        const countQuery = await pool.query('SELECT COUNT(*) FROM top100_cryptocurrencies');
        console.log(`🔢 Total de criptomoedas: ${countQuery.rows[0].count}`);
        
        // Mostrar os primeiros 10
        const top10Query = await pool.query(`
            SELECT coin_id, symbol, name, current_price, market_cap_rank 
            FROM top100_cryptocurrencies 
            ORDER BY market_cap_rank LIMIT 10
        `);
        console.log('\n🏆 TOP 10 CRIPTOMOEDAS:');
        top10Query.rows.forEach(row => {
            console.log(`#${row.market_cap_rank} ${row.symbol} (${row.name}): $${row.current_price}`);
        });
        
        // Verificar logs do sistema
        const logsQuery = await pool.query(`
            SELECT component, level, message 
            FROM system_logs 
            ORDER BY timestamp DESC LIMIT 5
        `);
        console.log('\n📊 ÚLTIMOS LOGS:');
        logsQuery.rows.forEach(row => {
            console.log(`[${row.component}] ${row.level}: ${row.message}`);
        });
        
        console.log('\n✅ Verificação concluída');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarDados();
