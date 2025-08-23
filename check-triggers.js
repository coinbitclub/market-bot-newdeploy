/**
 * ✅ VERIFICAR TRIGGERS NA TABELA SISTEMA_LEITURA_MERCADO
 * Identificar se há triggers que inserem na fear_greed_index
 */

const { createRobustPool, testConnection, safeQuery } = require('./fixed-database-config');

async function verificarTriggers() {
    console.log('🔍 VERIFICANDO TRIGGERS NA TABELA SISTEMA_LEITURA_MERCADO...');
    
    const pool = createRobustPool();
    await testConnection(pool);
    
    try {
        // Verificar triggers na tabela
        const queryTriggers = `
            SELECT 
                tgname as trigger_name,
                proname as function_name,
                pg_get_triggerdef(tg.oid) as trigger_definition
            FROM pg_trigger tg
            JOIN pg_class c ON tg.tgrelid = c.oid
            JOIN pg_proc p ON tg.tgfoid = p.oid
            WHERE c.relname = 'sistema_leitura_mercado'
            AND NOT tg.tgisinternal;
        `;
        
        const resultTriggers = await safeQuery(pool, queryTriggers);
        console.log('\n📋 TRIGGERS ENCONTRADOS:');
        if (resultTriggers.rows.length > 0) {
            resultTriggers.rows.forEach(row => {
                console.log(`\n   🔧 ${row.trigger_name} (função: ${row.function_name})`);
                console.log(`   📄 Definição: ${row.trigger_definition}`);
            });
        } else {
            console.log('   ✅ Nenhum trigger encontrado');
        }
        
        // Verificar funções que mencionam fear_greed_index
        const queryFunctions = `
            SELECT 
                proname as function_name,
                prosrc as function_body
            FROM pg_proc 
            WHERE prosrc ILIKE '%fear_greed_index%'
            AND prosrc ILIKE '%source%';
        `;
        
        const resultFunctions = await safeQuery(pool, queryFunctions);
        console.log('\n📋 FUNÇÕES QUE USAM FEAR_GREED_INDEX COM SOURCE:');
        if (resultFunctions.rows.length > 0) {
            resultFunctions.rows.forEach(row => {
                console.log(`\n   🔧 ${row.function_name}`);
                console.log(`   📄 Corpo da função:`);
                console.log(`   ${row.function_body.substring(0, 200)}...`);
            });
        } else {
            console.log('   ✅ Nenhuma função problemática encontrada');
        }
        
        await pool.end();
        console.log('\n✅ Verificação completa');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

verificarTriggers();
