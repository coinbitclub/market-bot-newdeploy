const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'process.env.DATABASE_URL',
    ssl: { rejectUnauthorized: false }
});

async function verificarEstrutura() {
    try {
        console.log('🔍 Verificando estrutura das tabelas...\n');
        
        // Listar todas as tabelas
        const tabelas = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('📋 TABELAS ENCONTRADAS:');
        tabelas.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
        console.log('');
        
        // Verificar colunas de cada tabela relevante
        const tabelasRelevantes = ['users', 'trading_signals', 'signals', 'active_positions', 'positions', 'trading_orders', 'orders', 'trade_executions'];
        
        for (const nomeTabela of tabelasRelevantes) {
            const existeTabela = tabelas.rows.some(row => row.table_name === nomeTabela);
            
            if (existeTabela) {
                const colunas = await pool.query(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `, [nomeTabela]);
                
                console.log(`📊 TABELA: ${nomeTabela.toUpperCase()}`);
                colunas.rows.forEach(col => {
                    console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
                });
                console.log('');
            }
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

verificarEstrutura();
