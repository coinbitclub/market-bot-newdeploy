/**
 * ✅ VERIFICAR ESTRUTURA DA TABELA FEAR_GREED_INDEX
 * Identificar quais colunas existem realmente
 */

const { createRobustPool, testConnection, safeQuery } = require('./fixed-database-config');

async function verificarFearGreedIndex() {
    console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA FEAR_GREED_INDEX...');
    
    const pool = createRobustPool();
    await testConnection(pool);
    
    try {
        // Verificar se tabela existe
        const queryExists = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'fear_greed_index'
            );
        `;
        
        const resultExists = await safeQuery(pool, queryExists);
        console.log(`\n📊 Tabela fear_greed_index existe: ${resultExists.rows[0].exists}`);
        
        if (resultExists.rows[0].exists) {
            // Verificar estrutura da tabela
            const queryStructure = `
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_name = 'fear_greed_index'
                ORDER BY ordinal_position;
            `;
            
            const resultStructure = await safeQuery(pool, queryStructure);
            console.log('\n📋 ESTRUTURA DA TABELA FEAR_GREED_INDEX:');
            resultStructure.rows.forEach(row => {
                console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
            });
            
            // Verificar dados recentes
            const queryData = `
                SELECT COUNT(*) as total_registros
                FROM fear_greed_index;
            `;
            
            const resultData = await safeQuery(pool, queryData);
            console.log(`\n📊 Total de registros: ${resultData.rows[0].total_registros}`);
            
        } else {
            console.log('\n❌ Tabela fear_greed_index não existe!');
        }
        
        await pool.end();
        console.log('\n✅ Verificação completa');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

verificarFearGreedIndex();
