#!/usr/bin/env node

/**
 * 🚀 DEPLOY SCRIPT - COINBITCLUB MARKET BOT
 * ========================================
 * 
 * Script para fazer deploy limpo no Railway
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando deploy do CoinBitClub Market Bot...\n');

// Função para executar comandos
function runCommand(command, description) {
    console.log(`📋 ${description}`);
    try {
        const output = execSync(command, { 
            stdio: 'inherit',
            cwd: __dirname 
        });
        console.log('✅ Sucesso!\n');
        return output;
    } catch (error) {
        console.error(`❌ Erro: ${error.message}\n`);
        process.exit(1);
    }
}

// Verificações pré-deploy
console.log('🔍 Verificações pré-deploy...');

// Verificar se arquivos essenciais existem
const essentialFiles = [
    'package.json',
    'main.js',
    'app.js',
    'Dockerfile',
    '.dockerignore'
];

essentialFiles.forEach(file => {
    if (!fs.existsSync(path.join(__dirname, file))) {
        console.error(`❌ Arquivo essencial não encontrado: ${file}`);
        process.exit(1);
    }
});

console.log('✅ Todos os arquivos essenciais encontrados\n');

// Verificar se Dockerfile não tem BOM
const dockerfileContent = fs.readFileSync(path.join(__dirname, 'Dockerfile'), 'utf8');
if (dockerfileContent.charCodeAt(0) === 0xFEFF) {
    console.log('🔧 Removendo BOM do Dockerfile...');
    fs.writeFileSync(path.join(__dirname, 'Dockerfile'), dockerfileContent.substring(1), 'utf8');
    console.log('✅ BOM removido\n');
}

// Limpar arquivos temporários
console.log('🧹 Limpando arquivos temporários...');
const tempDirs = ['.next', 'node_modules', 'analytics-out'];
tempDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        console.log(`   Removendo ${dir}...`);
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
});
console.log('✅ Limpeza concluída\n');

// Verificar sintaxe do package.json
console.log('🔍 Verificando package.json...');
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    if (!packageJson.scripts || !packageJson.scripts.start) {
        console.error('❌ Script "start" não encontrado no package.json');
        process.exit(1);
    }
    console.log('✅ package.json válido\n');
} catch (error) {
    console.error('❌ Erro no package.json:', error.message);
    process.exit(1);
}

// Deploy no Railway
console.log('🚀 Iniciando deploy no Railway...');
runCommand('railway up', 'Fazendo deploy no Railway');

console.log('🎉 Deploy concluído com sucesso!');
console.log('📊 Monitorar logs: railway logs');
console.log('🌐 Status: railway status');
