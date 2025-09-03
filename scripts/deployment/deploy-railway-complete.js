#!/usr/bin/env node

/**
 * 🚀 SCRIPT COMPLETO DE DEPLOY RAILWAY
 * ====================================
 * 
 * Deploy automatizado do CoinBitClub Market Bot para Railway
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 INICIANDO DEPLOY RAILWAY COINBITCLUB');
console.log('=======================================');
console.log('');

// Função para executar comandos com output
function runCommand(command, description) {
    console.log(`📡 ${description}...`);
    try {
        const output = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
        console.log(`✅ ${description} - Concluído`);
        return true;
    } catch (error) {
        console.error(`❌ ${description} - Erro:`, error.message);
        return false;
    }
}

// Verificar se Railway CLI está instalado
function checkRailwayCLI() {
    try {
        execSync('railway --version', { encoding: 'utf8' });
        console.log('✅ Railway CLI encontrado');
        return true;
    } catch (error) {
        console.log('❌ Railway CLI não encontrado');
        console.log('💡 Instale com: npm install -g @railway/cli');
        return false;
    }
}

// Deploy principal
async function deploy() {
    console.log('🔍 Verificando pré-requisitos...');
    
    // 1. Verificar Railway CLI
    if (!checkRailwayCLI()) {
        process.exit(1);
    }
    
    // 2. Verificar arquivos obrigatórios
    const requiredFiles = ['app.js', 'package.json', 'Dockerfile.production', 'railway.toml'];
    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
            console.log(`❌ Arquivo obrigatório não encontrado: ${file}`);
            process.exit(1);
        }
    }
    console.log('✅ Todos os arquivos obrigatórios encontrados');
    
    // 3. Login no Railway (se necessário)
    console.log('🔐 Verificando login Railway...');
    runCommand('railway whoami', 'Verificar login Railway');
    
    // 4. Instalar dependências
    if (!runCommand('npm install --production', 'Instalar dependências')) {
        process.exit(1);
    }
    
    // 5. Deploy para Railway
    console.log('🚀 Iniciando deploy...');
    if (!runCommand('railway up', 'Deploy Railway')) {
        process.exit(1);
    }
    
    // 6. Verificar status
    console.log('📊 Verificando status...');
    runCommand('railway status', 'Status do deploy');
    
    // 7. Obter URL
    console.log('🌐 Obtendo URL do serviço...');
    runCommand('railway domain', 'URL do serviço');
    
    console.log('');
    console.log('🎉 DEPLOY CONCLUÍDO COM SUCESSO!');
    console.log('================================');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('   1. Verificar logs: railway logs');
    console.log('   2. Testar endpoints: /health, /status');
    console.log('   3. Configurar webhooks TradingView');
    console.log('   4. Monitorar performance');
    console.log('');
    console.log('🔗 Links úteis:');
    console.log('   • Dashboard Railway: https://railway.app/dashboard');
    console.log('   • Logs: railway logs');
    console.log('   • Variáveis: railway vars');
    console.log('');
}

// Executar deploy
deploy().catch(error => {
    console.error('💥 Erro no deploy:', error);
    process.exit(1);
});
