const { createRobustPool, testConnection, safeQuery } = require('./fixed-database-config');

async function checkConstraints() {
    const pool = createRobustPool();
    await testConnection(pool);
    
    console.log('🔍 VERIFICANDO CONSTRAINTS DA TABELA...\n');
    
    const result = await safeQuery(pool, `
        SELECT conname, consrc 
        FROM pg_constraint 
        WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'sistema_leitura_mercado')
        AND contype = 'c'
        ORDER BY conname
    `);
    
    result.rows.forEach(row => {
        console.log(`📋 ${row.conname}:`);
        console.log(`   ${row.consrc}\n`);
    });
    
    await pool.end();
}

checkConstraints().catch(console.error);
