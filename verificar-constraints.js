/**
 * 🔍 VERIFICAÇÃO DE CONSTRAINTS DA TABELA
 * Identificar quais valores são aceitos nas colunas com constraints
 */

require('dotenv').config();
const { createRobustPool, testConnection, safeQuery } = require('./fixed-database-config');

async function verificarConstraints() {
    console.log('🔍 VERIFICANDO CONSTRAINTS DA TABELA sistema_leitura_mercado');
    
    let pool = null;
    
    try {
        pool = createRobustPool();
        await testConnection(pool);
        
        // 1. Verificar constraints de check
        console.log('\n📋 CONSTRAINTS DE CHECK:');
        const constraints = await safeQuery(pool, `
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = (
                SELECT oid FROM pg_class WHERE relname = 'sistema_leitura_mercado'
            ) AND contype = 'c'
        `);
        
        constraints.rows.forEach(constraint => {
            console.log(`\n✅ ${constraint.constraint_name}:`);
            console.log(`   ${constraint.definition}`);
        });
        
        // 2. Verificar estrutura completa da tabela
        console.log('\n📊 ESTRUTURA COMPLETA DA TABELA:');
        const colunas = await safeQuery(pool, `
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'sistema_leitura_mercado'
            ORDER BY ordinal_position
        `);
        
        colunas.rows.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL OK' : 'NOT NULL';
            const defaultVal = col.column_default ? ` (default: ${col.column_default})` : '';
            console.log(`   ${col.column_name}: ${col.data_type} [${nullable}]${defaultVal}`);
        });
        
        // 3. Verificar últimos registros para entender o padrão
        console.log('\n📈 ÚLTIMOS REGISTROS SALVOS:');
        const registros = await safeQuery(pool, `
            SELECT 
                market_direction, 
                fear_greed_value, 
                confidence_level,
                created_at
            FROM sistema_leitura_mercado 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        if (registros.rows.length > 0) {
            console.log('   Padrão dos valores aceitos:');
            registros.rows.forEach((reg, i) => {
                console.log(`   ${i + 1}. market_direction: "${reg.market_direction}" | FG: ${reg.fear_greed_value} | Conf: ${reg.confidence_level}%`);
            });
        } else {
            console.log('   Nenhum registro encontrado na tabela');
        }
        
        console.log('\n🎯 VALORES VÁLIDOS IDENTIFICADOS PARA market_direction:');
        console.log('   Analisando constraints...');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        return false;
        
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

verificarConstraints().then(sucesso => {
    if (sucesso) {
        console.log('\n✅ VERIFICAÇÃO CONCLUÍDA');
    } else {
        console.log('\n❌ VERIFICAÇÃO FALHOU');
    }
    process.exit(sucesso ? 0 : 1);
});
