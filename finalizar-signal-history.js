// 🔧 FINALIZAR CORREÇÃO DA SIGNAL_HISTORY
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function finalizarCorrecao() {
    console.log('🔧 FINALIZANDO CORREÇÃO DA SIGNAL_HISTORY');
    console.log('=========================================');
    
    try {
        // Adicionar colunas timestamp e processed_at
        console.log('➕ Adicionando timestamp...');
        await pool.query(`
            ALTER TABLE signal_history 
            ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT NOW()
        `);
        
        console.log('➕ Adicionando processed_at...');
        await pool.query(`
            ALTER TABLE signal_history 
            ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP
        `);
        
        // Testar query corrigida
        console.log('\n🧪 TESTANDO QUERY CORRIGIDA:');
        const teste = await pool.query(`
            SELECT 
                ticker,
                signal,
                signal_type,
                result,
                ai_decision,
                confidence,
                is_strong_signal,
                created_at
            FROM signal_history 
            WHERE ticker = 'BTCUSDT' 
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        console.log(`✅ Query funcionou! ${teste.rows.length} resultados`);
        
        if (teste.rows.length > 0) {
            console.log('📊 Dados encontrados:');
            teste.rows.forEach(row => {
                console.log(`   ${row.ticker}: ${row.signal_type} - ${row.result || 'NULL'}`);
            });
        } else {
            console.log('📊 Tabela vazia - normal para primeira execução');
        }
        
        console.log('\n✅ CORREÇÃO FINALIZADA COM SUCESSO!');
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

finalizarCorrecao();
