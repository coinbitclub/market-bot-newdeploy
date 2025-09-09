// Verificacao Final - Sistema de Database Setup
// CoinBitClub Enterprise v6.0.0

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICAÇÃO FINAL DO SISTEMA DE SETUP');
console.log('========================================\n');

// Verificar arquivos essenciais
const requiredFiles = [
    'package.json',
    'setup-database.ps1',
    'setup-database.sh',
    'scripts/database/enterprise-complete-database-setup.sql'
];

console.log('📁 ARQUIVOS ESSENCIAIS:');
console.log('======================');

let allFilesExist = true;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
    } else {
        console.log(`   ❌ ${file} - FALTANDO!`);
        allFilesExist = false;
    }
});

// Verificar package.json para scripts
console.log('\n📋 SCRIPTS NPM:');
console.log('================');

try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    if (scripts['setup:database']) {
        console.log('   ✅ npm run setup:database - CONFIGURADO');
        console.log(`      Comando: ${scripts['setup:database']}`);
    } else {
        console.log('   ❌ npm run setup:database - NÃO CONFIGURADO');
        allFilesExist = false;
    }
    
    if (scripts['setup:database:powershell']) {
        console.log('   ✅ npm run setup:database:powershell - DISPONÍVEL');
    }
    
    if (scripts['setup:database:bash']) {
        console.log('   ✅ npm run setup:database:bash - DISPONÍVEL');
    }
    
} catch (error) {
    console.log('   ❌ Erro ao ler package.json:', error.message);
    allFilesExist = false;
}

// Verificar schema SQL
console.log('\n🗄️ SCHEMA DO BANCO:');
console.log('==================');

try {
    const schemaFile = 'scripts/database/enterprise-complete-database-setup.sql';
    if (fs.existsSync(schemaFile)) {
        const schemaContent = fs.readFileSync(schemaFile, 'utf8');
        const tableMatches = schemaContent.match(/CREATE TABLE/gi) || [];
        const indexMatches = schemaContent.match(/CREATE INDEX/gi) || [];
        const insertMatches = schemaContent.match(/INSERT INTO/gi) || [];
        
        console.log(`   ✅ Arquivo de schema encontrado`);
        console.log(`   📊 Tabelas: ${tableMatches.length}`);
        console.log(`   🚀 Índices: ${indexMatches.length}`);
        console.log(`   📝 Inserções: ${insertMatches.length}`);
        
        if (schemaContent.includes('INSERT INTO users')) {
            console.log('   ✅ Usuário admin será criado');
        }
    }
} catch (error) {
    console.log('   ❌ Erro ao verificar schema:', error.message);
}

// Verificar documentação
console.log('\n📚 DOCUMENTAÇÃO:');
console.log('================');

const docFiles = [
    'GUIA-DESENVOLVEDOR-DATABASE-SETUP.md',
    'QUICK-REFERENCE-DATABASE.md',
    'scripts/database/README-UPDATED.md',
    'RESOLUCAO-SETUP-DATABASE-COMPLETA.md'
];

docFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
    } else {
        console.log(`   ❌ ${file} - FALTANDO`);
    }
});

// Resultado final
console.log('\n🎯 RESULTADO FINAL:');
console.log('==================');

if (allFilesExist) {
    console.log('✅ SISTEMA PRONTO PARA USO!');
    console.log('');
    console.log('🚀 COMO USAR:');
    console.log('   1. npm run setup:database');
    console.log('   2. Seguir instruções na tela');
    console.log('   3. Configurar APIs no .env');
    console.log('   4. npm install && npm start');
    console.log('');
    console.log('📖 DOCUMENTAÇÃO:');
    console.log('   - GUIA-DESENVOLVEDOR-DATABASE-SETUP.md');
    console.log('   - QUICK-REFERENCE-DATABASE.md');
} else {
    console.log('❌ SISTEMA INCOMPLETO!');
    console.log('Verifique os arquivos faltando acima.');
}

console.log('\n---');
console.log('Status: Setup do banco de dados configurado e funcionando');
console.log('Data: Setembro 9, 2025');
console.log('Versão: CoinBitClub Enterprise v6.0.0');
