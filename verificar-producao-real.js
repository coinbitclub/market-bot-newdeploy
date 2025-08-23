#!/usr/bin/env node
/**
 * 🔍 VERIFICADOR DE PRODUÇÃO REAL LOCAL
 * =====================================
 * 
 * Testa o modo produção real localmente
 */

console.log('🔍 VERIFICANDO MODO PRODUÇÃO REAL');
console.log('=================================');

const fs = require('fs');
const path = require('path');

function checkProductionMode() {
    console.log('\n📋 VERIFICAÇÃO CONFIGURAÇÃO PRODUÇÃO...');
    
    try {
        const appPath = path.join(__dirname, 'app.js');
        const appContent = fs.readFileSync(appPath, 'utf8');
        
        // Verificar todas as configurações de produção
        const productionChecks = [
            { name: 'PRODUCTION_MODE = true', pattern: /PRODUCTION_MODE.*=.*'true'/ },
            { name: 'ENABLE_REAL_TRADING = true', pattern: /ENABLE_REAL_TRADING.*=.*'true'/ },
            { name: 'USE_MAINNET = true', pattern: /USE_MAINNET.*=.*'true'/ },
            { name: 'FORCE_MAINNET_MODE = true', pattern: /FORCE_MAINNET_MODE.*=.*'true'/ },
            { name: 'USE_DATABASE_KEYS = true', pattern: /USE_DATABASE_KEYS.*=.*'true'/ }
        ];
        
        console.log('\n🎯 STATUS CONFIGURAÇÕES:');
        console.log('========================');
        
        let allOk = true;
        productionChecks.forEach(check => {
            const found = check.pattern.test(appContent);
            const status = found ? '✅' : '❌';
            console.log(`${status} ${check.name}: ${found ? 'ATIVO' : 'INATIVO'}`);
            if (!found) allOk = false;
        });
        
        // Verificar se não há configurações de testnet
        const testnetChecks = [
            { name: 'FORCE_TESTNET_MODE', pattern: /FORCE_TESTNET_MODE.*=.*'true'/ },
            { name: 'USE_TESTNET_ONLY', pattern: /USE_TESTNET_ONLY.*=.*'true'/ },
            { name: 'DISABLE_MAINNET_ACCESS', pattern: /DISABLE_MAINNET_ACCESS.*=.*'true'/ }
        ];
        
        console.log('\n🚫 VERIFICAÇÃO TESTNET (deve estar INATIVO):');
        console.log('============================================');
        
        testnetChecks.forEach(check => {
            const found = check.pattern.test(appContent);
            const status = found ? '❌' : '✅';
            console.log(`${status} ${check.name}: ${found ? 'ATIVO (PROBLEMA!)' : 'INATIVO (CORRETO)'}`);
            if (found) allOk = false;
        });
        
        // Verificar mensagens de inicialização
        console.log('\n📢 VERIFICAÇÃO MENSAGENS:');
        console.log('=========================');
        
        const hasRealMode = /MODO PRODUÇÃO REAL ATIVADO/.test(appContent);
        const hasMainnetMessage = /SISTEMA EM PRODUÇÃO REAL/.test(appContent);
        
        console.log(`✅ Mensagem produção real: ${hasRealMode ? 'ENCONTRADA' : 'NÃO ENCONTRADA'}`);
        console.log(`✅ Mensagem mainnet: ${hasMainnetMessage ? 'ENCONTRADA' : 'NÃO ENCONTRADA'}`);
        
        // Resultado final
        console.log('\n🎯 RESULTADO FINAL:');
        console.log('==================');
        
        if (allOk && hasRealMode && hasMainnetMessage) {
            console.log('🎉 MODO PRODUÇÃO REAL 100% CONFIGURADO!');
            console.log('✅ Todas as configurações corretas');
            console.log('✅ Testnet desabilitado');
            console.log('✅ Mainnet ativado');
            console.log('🚀 Sistema pronto para trading real');
        } else {
            console.log('⚠️ Algumas configurações precisam de ajuste');
            console.log('❌ Verificar configurações acima');
        }
        
    } catch (error) {
        console.error('❌ Erro na verificação:', error.message);
    }
}

// Verificar se há package.json para testar início
function checkStartupPossible() {
    console.log('\n🚀 VERIFICAÇÃO STARTUP:');
    console.log('=======================');
    
    try {
        const packagePath = path.join(__dirname, 'package.json');
        if (fs.existsSync(packagePath)) {
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            console.log('✅ package.json encontrado');
            
            if (pkg.scripts && pkg.scripts.start) {
                console.log('✅ Script start disponível:', pkg.scripts.start);
                console.log('💡 Para testar: npm start');
            }
            
            if (pkg.scripts && pkg.scripts.dev) {
                console.log('✅ Script dev disponível:', pkg.scripts.dev);
                console.log('💡 Para testar: npm run dev');
            }
        } else {
            console.log('⚠️ package.json não encontrado');
        }
        
        // Verificar se app.js existe
        const appPath = path.join(__dirname, 'app.js');
        if (fs.existsSync(appPath)) {
            console.log('✅ app.js encontrado');
            console.log('💡 Para testar: node app.js');
        } else {
            console.log('❌ app.js não encontrado');
        }
        
    } catch (error) {
        console.error('❌ Erro na verificação startup:', error.message);
    }
}

// Executar verificações
console.log('🌐 COINBITCLUB MARKET BOT - VERIFICAÇÃO PRODUÇÃO REAL');
console.log('======================================================');

checkProductionMode();
checkStartupPossible();

console.log('\n🎯 VERIFICAÇÃO COMPLETA!');
console.log('========================');
console.log('📊 Use este relatório para confirmar o status');
console.log('🚀 Se tudo estiver correto, o sistema está em PRODUÇÃO REAL');
console.log('🌐 Trading com chaves mainnet ativado');
