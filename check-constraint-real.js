/**
 * ✅ VERIFICAR CONSTRAINT REAL DO STATUS NO BANCO
 * Conectar diretamente e verificar a definição exata
 */

const { createRobustPool, testConnection, safeQuery } = require('./fixed-database-config');

async function verificarConstraintStatus() {
    console.log('🔍 VERIFICANDO CONSTRAINT REAL DE STATUS...');
    
    const pool = createRobustPool();
    await testConnection(pool);
    
    try {
        // Verificar constraint de status
        const queryConstraint = `
            SELECT 
                con.conname as constraint_name,
                pg_get_constraintdef(con.oid) as constraint_definition
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE rel.relname = 'sistema_leitura_mercado' 
            AND con.conname LIKE '%status%';
        `;
        
        const resultConstraint = await safeQuery(pool, queryConstraint);
        console.log('\n📋 CONSTRAINTS DE STATUS ENCONTRADAS:');
        if (resultConstraint.rows.length > 0) {
            resultConstraint.rows.forEach(row => {
                console.log(`   ${row.constraint_name}: ${row.constraint_definition}`);
            });
        } else {
            console.log('   ❌ Nenhuma constraint de status encontrada');
        }
        
        // Verificar todos os constraints check da tabela
        const queryAllConstraints = `
            SELECT 
                con.conname as constraint_name,
                con.contype as constraint_type,
                pg_get_constraintdef(con.oid) as constraint_definition
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE rel.relname = 'sistema_leitura_mercado'
            AND con.contype = 'c'
            ORDER BY con.conname;
        `;
        
        const resultAll = await safeQuery(pool, queryAllConstraints);
        console.log('\n📋 TODOS OS CHECK CONSTRAINTS DA TABELA:');
        if (resultAll.rows.length > 0) {
            resultAll.rows.forEach(row => {
                console.log(`   ${row.constraint_name}: ${row.constraint_definition}`);
            });
        } else {
            console.log('   ❌ Nenhum check constraint encontrado');
        }
        
        // Verificar estrutura do campo status
        const queryColumn = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = 'sistema_leitura_mercado'
            AND column_name = 'status';
        `;
        
        const resultColumn = await safeQuery(pool, queryColumn);
        console.log('\n📋 ESTRUTURA DO CAMPO STATUS:');
        if (resultColumn.rows.length > 0) {
            console.log(`   Campo: ${JSON.stringify(resultColumn.rows[0], null, 2)}`);
        } else {
            console.log('   ❌ Campo status não encontrado');
        }
        
        await pool.end();
        console.log('\n✅ Verificação completa');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

verificarConstraintStatus();
