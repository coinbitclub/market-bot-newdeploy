#!/usr/bin/env node

/**
 * 🔍 VERIFICADOR DE SETUP DE DEPLOY
 * =================================
 * 
 * Verifica se todos os componentes necessários para deploy estão corretos
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO SETUP DE DEPLOY COINBITCLUB');
console.log('==========================================');
console.log('');

const checks = [];

// 1. Verificar arquivos principais
const requiredFiles = [
    'app.js',
    'package.json',
    '.env.production',
    'Dockerfile.production',
    'railway.toml'
];

console.log('📁 VERIFICANDO ARQUIVOS PRINCIPAIS:');
requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    checks.push({ name: `Arquivo ${file}`, status: exists });
});

// 2. Verificar dependências críticas
console.log('\n📦 VERIFICANDO DEPENDÊNCIAS:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const criticalDeps = [
        'express',
        'pg',
        'cors',
        'body-parser',
        'dotenv'
    ];
    
    criticalDeps.forEach(dep => {
        const exists = packageJson.dependencies && packageJson.dependencies[dep];
        console.log(`   ${exists ? '✅' : '❌'} ${dep}`);
        checks.push({ name: `Dependência ${dep}`, status: !!exists });
    });
} catch (error) {
    console.log('   ❌ Erro ao ler package.json');
    checks.push({ name: 'package.json válido', status: false });
}

// 3. Verificar configuração Railway
console.log('\n🚂 VERIFICANDO CONFIGURAÇÃO RAILWAY:');
try {
    const railwayConfig = fs.readFileSync('railway.toml', 'utf8');
    
    const hasCorrectStartCommand = railwayConfig.includes('node app.js');
    const hasHealthcheck = railwayConfig.includes('/health');
    const hasCorrectDockerfile = railwayConfig.includes('Dockerfile.production');
    
    console.log(`   ${hasCorrectStartCommand ? '✅' : '❌'} Start Command: node app.js`);
    console.log(`   ${hasHealthcheck ? '✅' : '❌'} Health Check: /health`);
    console.log(`   ${hasCorrectDockerfile ? '✅' : '❌'} Dockerfile: Dockerfile.production`);
    
    checks.push({ name: 'Railway start command', status: hasCorrectStartCommand });
    checks.push({ name: 'Railway health check', status: hasHealthcheck });
    checks.push({ name: 'Railway dockerfile', status: hasCorrectDockerfile });
} catch (error) {
    console.log('   ❌ Erro ao ler railway.toml');
    checks.push({ name: 'railway.toml válido', status: false });
}

// 4. Verificar variáveis de ambiente
console.log('\n🔧 VERIFICANDO VARIÁVEIS DE AMBIENTE:');
try {
    const envContent = fs.readFileSync('.env.production', 'utf8');
    
    const criticalEnvVars = [
        'NODE_ENV=production',
        'DATABASE_URL=',
        'ENABLE_REAL_TRADING=true',
        'PORT=3000'
    ];
    
    criticalEnvVars.forEach(envVar => {
        const exists = envContent.includes(envVar);
        console.log(`   ${exists ? '✅' : '❌'} ${envVar}`);
        checks.push({ name: `Env ${envVar}`, status: exists });
    });
} catch (error) {
    console.log('   ❌ Erro ao ler .env.production');
    checks.push({ name: '.env.production válido', status: false });
}

// 5. Verificar módulos especializados
console.log('\n🧩 VERIFICANDO MÓDULOS ESPECIALIZADOS:');
const modules = [
    'position-safety-validator.js',
    'enhanced-signal-processor.js',
    'commission-system.js',
    'financial-manager.js'
];

modules.forEach(module => {
    const exists = fs.existsSync(module);
    console.log(`   ${exists ? '✅' : '❌'} ${module}`);
    checks.push({ name: `Módulo ${module}`, status: exists });
});

// 6. Verificar estrutura do app.js
console.log('\n📄 VERIFICANDO ESTRUTURA APP.JS:');
try {
    const appContent = fs.readFileSync('app.js', 'utf8');
    
    const hasHealthEndpoint = appContent.includes("this.app.get('/health'");
    const hasProductionMiddleware = appContent.includes('NODE_ENV === \'production\'');
    const hasFinancialManager = appContent.includes('FinancialManager');
    const hasCommissionSystem = appContent.includes('CommissionSystem');
    
    console.log(`   ${hasHealthEndpoint ? '✅' : '❌'} Health Endpoint`);
    console.log(`   ${hasProductionMiddleware ? '✅' : '❌'} Production Middleware`);
    console.log(`   ${hasFinancialManager ? '✅' : '❌'} Financial Manager`);
    console.log(`   ${hasCommissionSystem ? '✅' : '❌'} Commission System`);
    
    checks.push({ name: 'Health endpoint', status: hasHealthEndpoint });
    checks.push({ name: 'Production middleware', status: hasProductionMiddleware });
    checks.push({ name: 'Financial manager', status: hasFinancialManager });
    checks.push({ name: 'Commission system', status: hasCommissionSystem });
} catch (error) {
    console.log('   ❌ Erro ao ler app.js');
    checks.push({ name: 'app.js válido', status: false });
}

// 7. Resumo final
console.log('\n📊 RESUMO DA VERIFICAÇÃO:');
const totalChecks = checks.length;
const passedChecks = checks.filter(check => check.status).length;
const failedChecks = totalChecks - passedChecks;

console.log(`   ✅ Aprovados: ${passedChecks}/${totalChecks}`);
console.log(`   ❌ Falharam: ${failedChecks}/${totalChecks}`);
console.log(`   📊 Taxa de Sucesso: ${Math.round((passedChecks/totalChecks) * 100)}%`);

if (failedChecks > 0) {
    console.log('\n⚠️ PROBLEMAS ENCONTRADOS:');
    checks.filter(check => !check.status).forEach(check => {
        console.log(`   ❌ ${check.name}`);
    });
}

console.log('\n🎯 RESULTADO:');
if (passedChecks === totalChecks) {
    console.log('   ✅ SISTEMA PRONTO PARA DEPLOY!');
    console.log('   🚀 Todos os componentes verificados com sucesso');
} else if (passedChecks >= totalChecks * 0.8) {
    console.log('   ⚠️ SISTEMA QUASE PRONTO');
    console.log('   🔧 Pequenos ajustes necessários');
} else {
    console.log('   ❌ SISTEMA NÃO ESTÁ PRONTO');
    console.log('   🛠️ Correções importantes necessárias');
}

console.log('\n==========================================');
console.log('🔍 VERIFICAÇÃO CONCLUÍDA');
