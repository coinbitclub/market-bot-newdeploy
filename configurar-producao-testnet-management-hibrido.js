#!/usr/bin/env node
/**
 * 🎯 CONFIGURAÇÃO CORRETA - PRODUÇÃO TESTNET + MANAGEMENT HÍBRIDO
 * ===============================================================
 * 
 * Produção: Testnet (seguro)
 * Management: Híbrido (chaves reais quando disponíveis)
 */

console.log('🎯 CONFIGURAÇÃO CORRETA - PRODUÇÃO TESTNET + MANAGEMENT HÍBRIDO');
console.log('================================================================');

const fs = require('fs');
const path = require('path');

class CorrectConfigurationManager {
    constructor() {
        this.appPath = path.join(__dirname, 'app.js');
        this.changes = [];
    }

    // Configurar produção para testnet e management para híbrido
    applyCorrectConfiguration() {
        console.log('\n🔧 APLICANDO CONFIGURAÇÃO CORRETA...');
        
        try {
            let appContent = fs.readFileSync(this.appPath, 'utf8');
            
            // Substituir configuração de produção real por testnet + híbrido
            const currentConfig = /\/\/ 🌐 CONFIGURAÇÃO PRODUÇÃO REAL - MAINNET ATIVADO[\s\S]*?console\.log\('🚀 SISTEMA EM PRODUÇÃO REAL'\);/;
            
            const correctConfig = `
// 🎯 CONFIGURAÇÃO CORRETA - PRODUÇÃO TESTNET + MANAGEMENT HÍBRIDO
// ===============================================================

// Detectar ambiente
const isManagementMode = process.env.RAILWAY_ENVIRONMENT_NAME === 'management' || 
                        process.env.NODE_ENV === 'management' ||
                        process.env.APP_MODE === 'management';

if (isManagementMode) {
    // MANAGEMENT: Modo Híbrido (chaves reais quando disponíveis)
    console.log('🔧 MODO MANAGEMENT DETECTADO - CONFIGURAÇÃO HÍBRIDA');
    process.env.SMART_HYBRID_MODE = 'true';
    process.env.ENABLE_REAL_TRADING = 'true';
    process.env.USE_DATABASE_KEYS = 'true';
    process.env.AUTO_DETECT_ENVIRONMENT = 'true';
    process.env.FORCE_TESTNET_PRODUCTION = 'false';
    
    console.log('🔧 MANAGEMENT: Modo Híbrido Ativo');
    console.log('✅ Chaves reais quando disponíveis');
    console.log('✅ Auto-detecção de ambiente');
    console.log('✅ Trading inteligente');
} else {
    // PRODUÇÃO: Modo Testnet (sempre seguro)
    console.log('🧪 MODO PRODUÇÃO DETECTADO - CONFIGURAÇÃO TESTNET');
    process.env.PRODUCTION_MODE = 'true';
    process.env.ENABLE_REAL_TRADING = 'false';
    process.env.USE_TESTNET = 'true';
    process.env.FORCE_TESTNET_PRODUCTION = 'true';
    process.env.USE_DATABASE_KEYS = 'false';
    
    console.log('🧪 PRODUÇÃO: Modo Testnet Seguro');
    console.log('✅ Trading em testnet apenas');
    console.log('✅ Sem risco financeiro');
    console.log('✅ Ambiente de teste seguro');
}

console.log('🎯 CONFIGURAÇÃO CORRETA APLICADA');`;

            if (currentConfig.test(appContent)) {
                appContent = appContent.replace(currentConfig, correctConfig);
                console.log('✅ Configuração corrigida: Produção Testnet + Management Híbrido');
                this.changes.push('Configuração correta aplicada');
            }

            // Atualizar mensagens de inicialização
            appContent = appContent.replace(
                /console\.log\('🚀 INICIANDO COINBITCLUB MARKET BOT - MODO PRODUÇÃO REAL'\);/g,
                "console.log('🚀 INICIANDO COINBITCLUB MARKET BOT - CONFIGURAÇÃO CORRETA');"
            );

            // Salvar alterações
            fs.writeFileSync(this.appPath, appContent);
            console.log('✅ app.js atualizado com configuração correta');

        } catch (error) {
            console.error('❌ Erro ao aplicar configuração:', error.message);
        }
    }

    // Criar endpoint para verificar modo atual
    addModeDetectionEndpoint() {
        console.log('\n🔧 ADICIONANDO ENDPOINT DE DETECÇÃO...');
        
        try {
            let appContent = fs.readFileSync(this.appPath, 'utf8');
            
            const modeEndpoint = `
        // Endpoint para verificar modo atual (produção vs management)
        this.app.get('/api/current-mode', (req, res) => {
            const isManagement = process.env.RAILWAY_ENVIRONMENT_NAME === 'management' || 
                                process.env.NODE_ENV === 'management' ||
                                process.env.APP_MODE === 'management';
            
            res.status(200).json({
                environment: isManagement ? 'management' : 'production',
                mode: isManagement ? 'HYBRID' : 'TESTNET',
                trading_type: isManagement ? 'real_when_available' : 'testnet_only',
                real_trading: isManagement ? 'conditional' : 'disabled',
                testnet_forced: !isManagement,
                message: isManagement ? 
                    'Management: Modo híbrido - chaves reais quando disponíveis' :
                    'Produção: Modo testnet - trading seguro apenas',
                timestamp: new Date().toISOString()
            });
        });`;

            // Procurar onde adicionar o endpoint
            const apiRoutesPattern = /this\.app\.get\('\/api\/system\/status'/;
            
            if (apiRoutesPattern.test(appContent)) {
                appContent = appContent.replace(
                    apiRoutesPattern,
                    modeEndpoint + '\n\n        this.app.get(\'/api/system/status\''
                );
                fs.writeFileSync(this.appPath, appContent);
                console.log('✅ Endpoint /api/current-mode adicionado');
                this.changes.push('Endpoint de detecção adicionado');
            }

        } catch (error) {
            console.error('❌ Erro ao adicionar endpoint:', error.message);
        }
    }

    // Verificar se as mudanças foram aplicadas
    verifyConfiguration() {
        console.log('\n🔍 VERIFICANDO CONFIGURAÇÃO...');
        
        try {
            const appContent = fs.readFileSync(this.appPath, 'utf8');
            
            const hasManagementDetection = /isManagementMode.*=/.test(appContent);
            const hasTestnetProduction = /FORCE_TESTNET_PRODUCTION.*=.*'true'/.test(appContent);
            const hasHybridManagement = /SMART_HYBRID_MODE.*=.*'true'/.test(appContent);
            
            console.log('✅ Detecção de management:', hasManagementDetection ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
            console.log('✅ Produção testnet:', hasTestnetProduction ? 'CONFIGURADA' : 'NÃO CONFIGURADA');
            console.log('✅ Management híbrido:', hasHybridManagement ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
            
            if (hasManagementDetection && hasTestnetProduction && hasHybridManagement) {
                console.log('\n🎉 CONFIGURAÇÃO CORRETA 100% APLICADA!');
                return true;
            } else {
                console.log('\n⚠️ Algumas configurações podem estar incorretas');
                return false;
            }

        } catch (error) {
            console.error('❌ Erro na verificação:', error.message);
            return false;
        }
    }

    // Executar configuração completa
    async runCorrectConfiguration() {
        console.log('🎯 INICIANDO CONFIGURAÇÃO CORRETA...\n');
        
        this.applyCorrectConfiguration();
        this.addModeDetectionEndpoint();
        const success = this.verifyConfiguration();
        
        console.log('\n📊 MUDANÇAS APLICADAS:');
        this.changes.forEach((change, i) => {
            console.log(`${i + 1}. ✅ ${change}`);
        });
        
        console.log('\n🎯 CONFIGURAÇÃO FINAL:');
        console.log('=====================');
        console.log('🧪 PRODUÇÃO: Testnet (trading seguro)');
        console.log('🔧 MANAGEMENT: Híbrido (chaves reais quando disponíveis)');
        console.log('✅ Auto-detecção de ambiente');
        console.log('✅ Sem risco em produção');
        
        console.log('\n🚀 PRÓXIMOS PASSOS:');
        console.log('==================');
        console.log('1. Fazer push das mudanças');
        console.log('2. Deploy automático no Railway');
        console.log('3. Verificar em /api/current-mode');
        console.log('4. Produção rodará em testnet');
        console.log('5. Management em modo híbrido');
        
        return success;
    }
}

// Executar configuração
if (require.main === module) {
    const manager = new CorrectConfigurationManager();
    manager.runCorrectConfiguration().then((success) => {
        if (success) {
            console.log('\n🎉 CONFIGURAÇÃO CORRETA APLICADA COM SUCESSO!');
            process.exit(0);
        } else {
            console.log('\n❌ Erro na configuração');
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    });
}

module.exports = CorrectConfigurationManager;
