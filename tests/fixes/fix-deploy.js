#!/usr/bin/env node

/**
 * 🔧 CORREÇÃO CRÍTICA - DEPLOY IMEDIATO
 * ====================================
 * 
 * Corrigindo erro de testDatabaseConnection duplicado
 */

const { execSync } = require('child_process');

console.log('🚨 CORREÇÃO CRÍTICA - DEPLOY IMEDIATO');
console.log('====================================');
console.log('');
console.log('🔧 Problema identificado: Método testDatabaseConnection duplicado');
console.log('✅ Solução aplicada: Renomeado método da API para testDatabaseConnectionAPI');
console.log('');

try {
    console.log('📝 Fazendo commit da correção...');
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "fix: Corrigir erro testDatabaseConnection duplicado - dashboard produção"', { stdio: 'inherit' });
    
    console.log('🚀 Enviando correção para produção...');
    execSync('git push origin main', { stdio: 'inherit' });
    
    console.log('');
    console.log('✅ CORREÇÃO ENVIADA COM SUCESSO!');
    console.log('');
    console.log('⏰ Aguarde 2-3 minutos para o Railway fazer o deploy');
    console.log('📊 Dashboard estará disponível em:');
    console.log('   https://coinbitclub-market-bot.up.railway.app/dashboard-production');
    console.log('');
    console.log('🔍 Monitorar logs do Railway para confirmar deploy');
    
} catch (error) {
    console.error('❌ Erro no deploy:', error.message);
    console.log('');
    console.log('🔧 Execute manualmente:');
    console.log('   git add .');
    console.log('   git commit -m "fix: Corrigir testDatabaseConnection"');
    console.log('   git push origin main');
}

console.log('');
console.log('🎯 Após deploy, testar:');
console.log('1. https://coinbitclub-market-bot.up.railway.app/status');
console.log('2. https://coinbitclub-market-bot.up.railway.app/dashboard-production');
console.log('3. https://coinbitclub-market-bot.up.railway.app/api/test-connection');
