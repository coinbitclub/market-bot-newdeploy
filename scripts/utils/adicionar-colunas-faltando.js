require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function adicionarColunasFaltando() {
    try {
        console.log('🔧 Adicionando colunas faltando...\n');

        // Adicionar colunas faltando na signal_metrics_log
        await pool.query(`
            ALTER TABLE signal_metrics_log 
            ADD COLUMN IF NOT EXISTS signal_type VARCHAR(50),
            ADD COLUMN IF NOT EXISTS ticker VARCHAR(50),
            ADD COLUMN IF NOT EXISTS price DECIMAL(20,8),
            ADD COLUMN IF NOT EXISTS symbol VARCHAR(50),
            ADD COLUMN IF NOT EXISTS action VARCHAR(20),
            ADD COLUMN IF NOT EXISTS side VARCHAR(10),
            ADD COLUMN IF NOT EXISTS source VARCHAR(100),
            ADD COLUMN IF NOT EXISTS user_executions JSONB
        `);
        console.log('✅ Colunas adicionadas à signal_metrics_log');

        // Verificar estrutura final
        const columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'signal_metrics_log'
            ORDER BY ordinal_position
        `);

        console.log('\n📊 Estrutura signal_metrics_log:');
        columns.rows.forEach(col => {
            console.log(`   • ${col.column_name} (${col.data_type})`);
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

adicionarColunasFaltando();
