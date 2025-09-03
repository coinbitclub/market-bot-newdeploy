require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function corrigirTabelaCompleta() {
    try {
        console.log('🔧 Corrigindo tabela signal_metrics_log completamente...\n');

        // Adicionar todas as colunas que podem estar faltando
        await pool.query(`
            ALTER TABLE signal_metrics_log 
            ADD COLUMN IF NOT EXISTS received_at TIMESTAMP DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING',
            ADD COLUMN IF NOT EXISTS error_message TEXT,
            ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER,
            ADD COLUMN IF NOT EXISTS users_affected INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS orders_created INTEGER DEFAULT 0
        `);
        console.log('✅ Todas as colunas adicionadas');

        console.log('\n🧪 Testando inserção na tabela...');
        
        // Testar inserção
        const testInsert = await pool.query(`
            INSERT INTO signal_metrics_log (
                signal_data, should_execute, reason, signal_type, 
                ticker, price, action, source, received_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id
        `, [
            JSON.stringify({test: true}),
            true,
            'Teste de inserção',
            'BUY',
            'BTCUSDT',
            45000,
            'BUY',
            'test'
        ]);

        console.log(`✅ Teste de inserção bem-sucedido - ID: ${testInsert.rows[0].id}`);

        // Limpar o teste
        await pool.query('DELETE FROM signal_metrics_log WHERE id = $1', [testInsert.rows[0].id]);
        console.log('✅ Registro de teste removido');

        console.log('\n🎯 Tabela signal_metrics_log está funcional!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

corrigirTabelaCompleta();
