const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function verificarTabelaPositions() {
    try {
        console.log('🔍 Verificando estrutura da tabela positions...\n');

        // Verificar se a tabela existe
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'positions'
            )
        `);

        if (!tableExists.rows[0].exists) {
            console.log('❌ Tabela positions não existe!');
            return;
        }

        // Estrutura da tabela positions
        const positionsColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'positions'
            ORDER BY ordinal_position
        `);

        console.log('📊 Estrutura da tabela POSITIONS:');
        positionsColumns.rows.forEach(col => {
            console.log(`  • ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Contar registros
        const count = await pool.query('SELECT COUNT(*) as total FROM positions');
        console.log(`\n📈 Total de registros: ${count.rows[0].total}`);

        // Verificar últimos registros
        const latest = await pool.query(`
            SELECT * FROM positions 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        if (latest.rows.length > 0) {
            console.log('\n📋 Últimas posições:');
            latest.rows.forEach((pos, index) => {
                console.log(`  ${index + 1}. User ${pos.user_id}: ${pos.symbol} ${pos.side} ${pos.size} - ${pos.created_at}`);
            });
        }

        // Verificar active_positions se existe
        const activePositionsExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'active_positions'
            )
        `);

        if (activePositionsExists.rows[0].exists) {
            console.log('\n🎯 Tabela active_positions encontrada');
            const activeCount = await pool.query('SELECT COUNT(*) as total FROM active_positions');
            console.log(`   Total: ${activeCount.rows[0].total}`);
        } else {
            console.log('\n⚠️ Tabela active_positions não existe');
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

verificarTabelaPositions();
