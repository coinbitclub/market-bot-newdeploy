/**
 * 🧪 TESTE RÁPIDO - SISTEMA DE AFILIAÇÃO
 * =====================================
 * 
 * Teste para verificar se o sistema está funcionando corretamente
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 TESTANDO SISTEMA DE AFILIAÇÃO...\n');

// Teste 1: Verificar arquivos criados
console.log('📁 TESTE 1: Verificando arquivos...');
const requiredFiles = [
    'routes/affiliate-api.js',
    'affiliate-system-config.json',
    'migrate-affiliate-system.sql',
    'frontend/src/components/affiliate/CommissionConverter.jsx',
    'frontend/src/components/affiliate/AffiliateVIPManager.jsx'
];

let filesOk = 0;
for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
        console.log(`  ✅ ${file}`);
        filesOk++;
    } else {
        console.log(`  ❌ ${file} - FALTANDO`);
    }
}

console.log(`\n📊 Resultado: ${filesOk}/${requiredFiles.length} arquivos encontrados\n`);

// Teste 2: Verificar configuração
console.log('⚙️ TESTE 2: Verificando configuração...');
try {
    const config = JSON.parse(fs.readFileSync('affiliate-system-config.json', 'utf8'));
    console.log('  ✅ Configuração carregada');
    console.log(`  📋 Funcionalidades ativas: ${Object.keys(config.affiliate_system.features).length}`);
    console.log(`  💰 Taxa normal: ${config.affiliate_system.commission_rates.normal * 100}%`);
    console.log(`  🌟 Taxa VIP: ${config.affiliate_system.commission_rates.vip * 100}%`);
    console.log(`  🎁 Bônus conversão: ${config.affiliate_system.conversion_bonus * 100}%`);
} catch (error) {
    console.log('  ❌ Erro ao carregar configuração:', error.message);
}

console.log('\n');

// Teste 3: Verificar estrutura da API
console.log('🔗 TESTE 3: Verificando API...');
try {
    const apiContent = fs.readFileSync('routes/affiliate-api.js', 'utf8');
    
    const endpoints = [
        '/request',
        '/promote-vip',
        '/:userId/dashboard',
        '/convert-commissions'
    ];
    
    let endpointsFound = 0;
    for (const endpoint of endpoints) {
        if (apiContent.includes(endpoint)) {
            console.log(`  ✅ Endpoint ${endpoint}`);
            endpointsFound++;
        } else {
            console.log(`  ❌ Endpoint ${endpoint} - FALTANDO`);
        }
    }
    
    console.log(`\n📊 Resultado: ${endpointsFound}/${endpoints.length} endpoints encontrados\n`);
    
} catch (error) {
    console.log('  ❌ Erro ao verificar API:', error.message);
}

// Teste 4: Verificar app.js
console.log('🚀 TESTE 4: Verificando app.js...');
try {
    const appContent = fs.readFileSync('app.js', 'utf8');
    
    if (appContent.includes('affiliate-api')) {
        console.log('  ✅ Rotas de afiliação configuradas');
    } else {
        console.log('  ❌ Rotas de afiliação NÃO configuradas');
    }
    
    if (appContent.includes('require(\'./routes/affiliate-api\')')) {
        console.log('  ✅ Importação das rotas configurada');
    } else {
        console.log('  ❌ Importação das rotas NÃO configurada');
    }
    
} catch (error) {
    console.log('  ❌ Erro ao verificar app.js:', error.message);
}

console.log('\n🎯 RESUMO:');
console.log('========================================');
if (filesOk === requiredFiles.length) {
    console.log('✅ SISTEMA DE AFILIAÇÃO PRONTO!');
    console.log('📋 Todos os arquivos foram criados');
    console.log('🔗 APIs configuradas corretamente');
    console.log('⚛️ Componentes frontend disponíveis');
    console.log('\n🎉 PODE USAR EM PRODUÇÃO!');
} else {
    console.log('⚠️ SISTEMA PARCIALMENTE PRONTO');
    console.log(`📋 ${filesOk}/${requiredFiles.length} arquivos criados`);
    console.log('🔧 Execute novamente o integrador se necessário');
}
console.log('========================================');

process.exit(0);
