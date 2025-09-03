const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function verificarEstrutura() {
    try {
        console.log('🔍 Verificando estrutura das tabelas signals e real_orders...\n');

        // Estrutura da tabela signals
        const signalsColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'signals'
            ORDER BY ordinal_position
        `);

        console.log('📊 Estrutura da tabela SIGNALS:');
        signalsColumns.rows.forEach(col => {
            console.log(`  • ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Estrutura da tabela real_orders
        const ordersColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'real_orders'
            ORDER BY ordinal_position
        `);

        console.log('\n📋 Estrutura da tabela REAL_ORDERS:');
        ordersColumns.rows.forEach(col => {
            console.log(`  • ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Verificar algumas linhas de exemplo
        console.log('\n🔍 Amostra de dados da tabela signals:');
        const sampleSignals = await pool.query('SELECT * FROM signals LIMIT 3');
        if (sampleSignals.rows.length > 0) {
            console.log('Colunas:', Object.keys(sampleSignals.rows[0]));
        } else {
            console.log('Nenhum dado encontrado');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarEstrutura();
