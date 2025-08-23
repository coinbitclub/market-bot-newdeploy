/**
 * ✅ REMOVER TRIGGER PROBLEMÁTICO
 * Remover trigger que usa coluna 'source' inexistente
 */

const { createRobustPool, testConnection, safeQuery } = require('./fixed-database-config');

async function removerTriggerProblematico() {
    console.log('🔧 REMOVENDO TRIGGER PROBLEMÁTICO...');
    
    const pool = createRobustPool();
    await testConnection(pool);
    
    try {
        // Remover trigger
        console.log('   🗑️ Removendo trigger trigger_sync_fear_greed...');
        await safeQuery(pool, `
            DROP TRIGGER IF EXISTS trigger_sync_fear_greed ON sistema_leitura_mercado;
        `);
        
        // Remover função
        console.log('   🗑️ Removendo função sync_fear_greed_to_ai...');
        await safeQuery(pool, `
            DROP FUNCTION IF EXISTS sync_fear_greed_to_ai();
        `);
        
        // Verificar se removeu
        const queryCheck = `
            SELECT 
                tgname as trigger_name
            FROM pg_trigger tg
            JOIN pg_class c ON tg.tgrelid = c.oid
            WHERE c.relname = 'sistema_leitura_mercado'
            AND tgname = 'trigger_sync_fear_greed'
            AND NOT tg.tgisinternal;
        `;
        
        const resultCheck = await safeQuery(pool, queryCheck);
        
        if (resultCheck.rows.length === 0) {
            console.log('   ✅ Trigger removido com sucesso!');
        } else {
            console.log('   ❌ Trigger ainda existe');
        }
        
        await pool.end();
        console.log('\n✅ Limpeza completa - Sistema pronto para teste');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

removerTriggerProblematico();
