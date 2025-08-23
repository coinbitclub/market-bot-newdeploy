const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function testNewQuery() {
    try {
        console.log('🧪 TESTANDO QUERY CORRIGIDA...\n');
        
        // Query corrigida como será no dashboard
        const columnCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'balances' AND column_name IN ('balance', 'wallet_balance', 'amount', 'value')
        `);
        
        console.log('Colunas encontradas:', columnCheck.rows);
        
        if (columnCheck.rows.length > 0) {
            const columnName = columnCheck.rows[0].column_name;
            console.log(`Usando coluna: ${columnName}`);
            
            const balanceQuery = await pool.query(`
                SELECT COALESCE(SUM(${columnName}), 0) as total_balance
                FROM balances
            `);
            
            console.log('✅ Query executou com sucesso!');
            console.log('Resultado:', balanceQuery.rows[0]);
        } else {
            console.log('❌ Nenhuma coluna de saldo encontrada');
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

testNewQuery();
