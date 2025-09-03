const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verificarSinais() {
    console.log('🔍 VERIFICANDO TABELA SIGNALS');
    console.log('============================\n');
    
    try {
        // Ver estrutura
        const estrutura = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'signals' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Estrutura:');
        estrutura.rows.forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
        
        // Ver dados
        const dados = await pool.query('SELECT * FROM signals ORDER BY created_at DESC LIMIT 5');
        
        console.log('\n📊 Últimos sinais:');
        dados.rows.forEach((sinal, index) => {
            console.log(`${index + 1}.`, JSON.stringify(sinal, null, 2));
        });

        // Verificar sinais de hoje
        const hoje = await pool.query(`
            SELECT COUNT(*) as hoje,
                   COUNT(DISTINCT symbol) as symbols,
                   COUNT(CASE WHEN side = 'BUY' THEN 1 END) as buy_signals,
                   COUNT(CASE WHEN side = 'SELL' THEN 1 END) as sell_signals
            FROM signals 
            WHERE created_at >= CURRENT_DATE
        `);
        
        console.log('\n📊 Estatísticas de hoje:');
        const stats = hoje.rows[0];
        console.log(`   📈 Total: ${stats.hoje}`);
        console.log(`   🎯 Símbolos: ${stats.symbols}`);
        console.log(`   📈 BUY: ${stats.buy_signals}`);
        console.log(`   📉 SELL: ${stats.sell_signals}`);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
    
    await pool.end();
}

verificarSinais();
