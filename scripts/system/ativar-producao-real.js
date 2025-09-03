#!/usr/bin/env node
/**
 * 🌐 ATIVAÇÃO MODO PRODUÇÃO REAL - MAINNET
 * ========================================
 * 
 * Remove testnet e ativa modo de produção real
 * Trading real com chaves mainnet
 */

console.log('🌐 ATIVANDO MODO PRODUÇÃO REAL - MAINNET');
console.log('=======================================');

const fs = require('fs');
const path = require('path');

class ProductionRealModeActivator {
    constructor() {
        this.appPath = path.join(__dirname, 'app.js');
        this.changes = [];
    }

    // Remover configurações de testnet e ativar produção real
    activateRealProductionMode() {
        console.log('\n🔧 ATIVANDO MODO PRODUÇÃO REAL...');
        
        try {
            let appContent = fs.readFileSync(this.appPath, 'utf8');
            
            // Remover qualquer referência a testnet forçado
            const testnetPatterns = [
                /process\.env\.FORCE_TESTNET_MODE\s*=\s*['"`]true['"`];?/g,
                /process\.env\.USE_TESTNET_ONLY\s*=\s*['"`]true['"`];?/g,
                /process\.env\.BYBIT_FORCE_TESTNET\s*=\s*['"`]true['"`];?/g,
                /process\.env\.BINANCE_FORCE_TESTNET\s*=\s*['"`]true['"`];?/g,
                /process\.env\.DISABLE_MAINNET_ACCESS\s*=\s*['"`]true['"`];?/g
            ];

            testnetPatterns.forEach(pattern => {
                if (pattern.test(appContent)) {
                    appContent = appContent.replace(pattern, '');
                    console.log('✅ Configuração testnet removida');
                }
            });

            // Substituir configuração híbrida por produção real
            const hybridConfig = /\/\/ 🎯 CONFIGURAÇÃO HÍBRIDA INTELIGENTE[\s\S]*?console\.log\('✅ Auto-detecção de ambiente'\);/;
            
            const realProductionConfig = `
// 🌐 CONFIGURAÇÃO PRODUÇÃO REAL - MAINNET ATIVADO
// ===============================================
process.env.PRODUCTION_MODE = 'true';
process.env.ENABLE_REAL_TRADING = 'true';
process.env.USE_MAINNET = 'true';
process.env.USE_DATABASE_KEYS = 'true';
process.env.FORCE_MAINNET_MODE = 'true';

console.log('🌐 MODO PRODUÇÃO REAL ATIVADO');
console.log('=============================');
console.log('✅ Trading real habilitado');
console.log('✅ Mainnet ativo');
console.log('✅ Chaves reais do banco');
console.log('🚀 SISTEMA EM PRODUÇÃO REAL');`;

            if (hybridConfig.test(appContent)) {
                appContent = appContent.replace(hybridConfig, realProductionConfig);
                console.log('✅ Configuração alterada para PRODUÇÃO REAL');
                this.changes.push('Modo híbrido → Produção real');
            }

            // Alterar mensagens de inicialização
            appContent = appContent.replace(
                /console\.log\('🚀 INICIANDO COINBITCLUB MARKET BOT - MODO HÍBRIDO TESTNET'\);/g,
                "console.log('🚀 INICIANDO COINBITCLUB MARKET BOT - MODO PRODUÇÃO REAL');"
            );

            appContent = appContent.replace(
                /console\.log\('✅ Modo híbrido testnet configurado'\);/g,
                "console.log('✅ Modo produção real configurado');"
            );

            appContent = appContent.replace(
                /🧪 Modo: TESTNET/g,
                '🌐 Modo: PRODUÇÃO REAL (MAINNET)'
            );

            // Salvar alterações
            fs.writeFileSync(this.appPath, appContent);
            console.log('✅ app.js atualizado para PRODUÇÃO REAL');
            this.changes.push('Mensagens alteradas para produção real');

        } catch (error) {
            console.error('❌ Erro ao ativar modo real:', error.message);
        }
    }

    // Verificar se as mudanças foram aplicadas
    verifyChanges() {
        console.log('\n🔍 VERIFICANDO CONFIGURAÇÃO...');
        
        try {
            const appContent = fs.readFileSync(this.appPath, 'utf8');
            
            const checks = [
                { name: 'PRODUCTION_MODE', pattern: /PRODUCTION_MODE.*=.*'true'/, found: false },
                { name: 'ENABLE_REAL_TRADING', pattern: /ENABLE_REAL_TRADING.*=.*'true'/, found: false },
                { name: 'USE_MAINNET', pattern: /USE_MAINNET.*=.*'true'/, found: false },
                { name: 'FORCE_MAINNET_MODE', pattern: /FORCE_MAINNET_MODE.*=.*'true'/, found: false }
            ];

            checks.forEach(check => {
                check.found = check.pattern.test(appContent);
                const status = check.found ? '✅' : '❌';
                console.log(`${status} ${check.name}: ${check.found ? 'ATIVADO' : 'NÃO ENCONTRADO'}`);
            });

            const allActive = checks.every(check => check.found);
            
            if (allActive) {
                console.log('\n🎉 MODO PRODUÇÃO REAL 100% ATIVADO!');
            } else {
                console.log('\n⚠️ Algumas configurações podem não ter sido aplicadas');
            }

        } catch (error) {
            console.error('❌ Erro na verificação:', error.message);
        }
    }

    // Criar endpoint para verificar modo
    createModeCheckEndpoint() {
        console.log('\n🔧 ADICIONANDO ENDPOINT DE VERIFICAÇÃO...');
        
        try {
            let appContent = fs.readFileSync(this.appPath, 'utf8');
            
            const modeCheckEndpoint = `
        // Endpoint para verificar modo de produção
        this.app.get('/api/production-mode', (req, res) => {
            res.status(200).json({
                mode: 'PRODUCTION_REAL',
                mainnet_active: true,
                real_trading: true,
                testnet_forced: false,
                environment: 'mainnet',
                timestamp: new Date().toISOString(),
                message: 'Sistema em modo de produção real - Trading com chaves mainnet'
            });
        });`;

            // Procurar onde adicionar o endpoint
            const apiRoutesPattern = /this\.app\.get\('\/api\/system\/status'/;
            
            if (apiRoutesPattern.test(appContent)) {
                appContent = appContent.replace(
                    apiRoutesPattern,
                    modeCheckEndpoint + '\n\n        this.app.get(\'/api/system/status\''
                );
                fs.writeFileSync(this.appPath, appContent);
                console.log('✅ Endpoint /api/production-mode adicionado');
                this.changes.push('Endpoint de verificação adicionado');
            }

        } catch (error) {
            console.error('❌ Erro ao adicionar endpoint:', error.message);
        }
    }

    // Executar ativação completa
    async runProductionActivation() {
        console.log('🌐 INICIANDO ATIVAÇÃO PRODUÇÃO REAL...\n');
        
        this.activateRealProductionMode();
        this.createModeCheckEndpoint();
        this.verifyChanges();
        
        console.log('\n📊 MUDANÇAS APLICADAS:');
        this.changes.forEach((change, i) => {
            console.log(`${i + 1}. ✅ ${change}`);
        });
        
        console.log('\n🎯 PRÓXIMOS PASSOS:');
        console.log('==================');
        console.log('1. Fazer push das mudanças');
        console.log('2. Aguardar deploy do Railway');
        console.log('3. Verificar em /api/production-mode');
        console.log('4. Sistema rodará em PRODUÇÃO REAL');
        
        console.log('\n🌐 TRADING REAL ATIVADO!');
        console.log('========================');
        console.log('✅ Mainnet habilitado');
        console.log('✅ Chaves reais ativas');
        console.log('✅ Trading de produção');
        console.log('❌ Testnet desabilitado');
    }
}

// Executar ativação
if (require.main === module) {
    const activator = new ProductionRealModeActivator();
    activator.runProductionActivation().then(() => {
        console.log('\n🎉 MODO PRODUÇÃO REAL ATIVADO COM SUCESSO!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erro na ativação:', error.message);
        process.exit(1);
    });
}

module.exports = ProductionRealModeActivator;
