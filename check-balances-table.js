const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
});

async function checkBalances() {
    try {
        console.log('🔍 VERIFICANDO TABELA BALANCES...\n');
        
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position
        `, ['balances']);
        
        console.log('📋 COLUNAS DA TABELA BALANCES:');
        console.log('============================');
        result.rows.forEach((col, index) => {
            console.log(`${index + 1}. ${col.column_name.padEnd(20)} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        const count = await pool.query('SELECT COUNT(*) FROM balances');
        console.log(`\n📊 TOTAL DE REGISTROS: ${count.rows[0].count}`);
        
        if (parseInt(count.rows[0].count) > 0) {
            const sample = await pool.query('SELECT * FROM balances LIMIT 3');
            console.log('\n📄 AMOSTRA DE DADOS:');
            console.log('==================');
            sample.rows.forEach((row, index) => {
                console.log(`${index + 1}.`, JSON.stringify(row, null, 2));
            });
        }
        
        // Testar a query que está falhando no dashboard
        console.log('\n🧪 TESTANDO QUERY DO DASHBOARD:');
        console.log('==============================');
        try {
            const testQuery = await pool.query(`
                SELECT COALESCE(SUM(balance), 0) as total_balance
                FROM balances 
                WHERE currency = 'USDT'
            `);
            console.log('✅ Query executou com sucesso!');
            console.log('Resultado:', testQuery.rows[0]);
        } catch (queryError) {
            console.log('❌ Query falhou:', queryError.message);
            
            // Tentar sem WHERE clause
            try {
                const simpleQuery = await pool.query('SELECT COALESCE(SUM(balance), 0) as total_balance FROM balances');
                console.log('✅ Query simples funcionou:', simpleQuery.rows[0]);
            } catch (simpleError) {
                console.log('❌ Query simples também falhou:', simpleError.message);
            }
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
        await pool.end();
    }
}

checkBalances();
