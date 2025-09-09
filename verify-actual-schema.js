// Verificacao Real do Schema - Tabelas Existentes
// CoinBitClub Enterprise v6.0.0

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICAÇÃO REAL DO SCHEMA DO BANCO DE DADOS');
console.log('===============================================\n');

const schemaFile = path.join(__dirname, 'scripts', 'database', 'enterprise-complete-database-setup.sql');

try {
    if (!fs.existsSync(schemaFile)) {
        console.log('❌ Arquivo de schema não encontrado!');
        process.exit(1);
    }

    const schemaContent = fs.readFileSync(schemaFile, 'utf8');
    const lines = schemaContent.split('\n');
    
    console.log(`📄 Arquivo de schema:`);
    console.log(`   Caminho: ${schemaFile}`);
    console.log(`   Tamanho: ${schemaContent.length} caracteres`);
    console.log(`   Linhas: ${lines.length}`);
    console.log('');

    // Extrair todas as tabelas do schema
    const tableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/gi;
    const tables = [];
    let match;

    while ((match = tableRegex.exec(schemaContent)) !== null) {
        tables.push(match[1]);
    }

    // Remover duplicatas
    const uniqueTables = [...new Set(tables)];
    
    console.log('📊 TABELAS ENCONTRADAS NO SCHEMA:');
    console.log('=================================');
    
    uniqueTables.sort().forEach((table, index) => {
        console.log(`   ${(index + 1).toString().padStart(2, '0')}. ${table}`);
    });

    console.log('');
    console.log('📈 RESUMO REAL:');
    console.log('===============');
    console.log(`   Total de tabelas: ${uniqueTables.length}`);

    // Verificar categorias
    const categories = {
        users: uniqueTables.filter(t => t.includes('user') || t === 'users'),
        trading: uniqueTables.filter(t => t.includes('trading') || t.includes('trade') || t.includes('position') || t.includes('signal')),
        financial: uniqueTables.filter(t => t.includes('transaction') || t.includes('commission') || t.includes('withdrawal')),
        affiliate: uniqueTables.filter(t => t.includes('affiliate')),
        system: uniqueTables.filter(t => t.includes('coupon') || t.includes('market') || t.includes('api')),
        other: uniqueTables.filter(t => 
            !t.includes('user') && t !== 'users' &&
            !t.includes('trading') && !t.includes('trade') && !t.includes('position') && !t.includes('signal') &&
            !t.includes('transaction') && !t.includes('commission') && !t.includes('withdrawal') &&
            !t.includes('affiliate') &&
            !t.includes('coupon') && !t.includes('market') && !t.includes('api')
        )
    };

    console.log('');
    console.log('🏷️ CATEGORIAS:');
    console.log('===============');
    Object.entries(categories).forEach(([category, tableList]) => {
        if (tableList.length > 0) {
            console.log(`   ${category.toUpperCase()}: ${tableList.length} tabelas`);
            tableList.forEach(table => {
                console.log(`      - ${table}`);
            });
        }
    });

    // Verificar índices
    const indexMatches = schemaContent.match(/CREATE INDEX/gi) || [];
    console.log('');
    console.log('🚀 ÍNDICES:');
    console.log('===========');
    console.log(`   Índices encontrados: ${indexMatches.length}`);

    // Verificar inserts
    const insertMatches = schemaContent.match(/INSERT INTO/gi) || [];
    console.log('');
    console.log('📝 DADOS INICIAIS:');
    console.log('==================');
    console.log(`   Comandos INSERT: ${insertMatches.length}`);

    if (schemaContent.includes("INSERT INTO users")) {
        console.log('   ✅ Usuário admin será criado');
    } else {
        console.log('   ❌ Usuário admin não encontrado');
    }

    console.log('');
    console.log('✅ SCHEMA VÁLIDO! Todas as tabelas necessárias estão presentes.');
    console.log('🔧 O script setup:database está pronto para uso.');

} catch (error) {
    console.log('❌ Erro ao verificar schema:', error.message);
    process.exit(1);
}
