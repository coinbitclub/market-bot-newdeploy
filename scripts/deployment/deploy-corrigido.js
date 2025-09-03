#!/usr/bin/env node

/**
 * DEPLOY CORRIGIDO PARA RAILWAY
 * Resolve problemas de package-lock.json e dependências
 */

const { execSync } = require('child_process');
const fs = require('fs');

class DeployCorrigido {
    constructor() {
        this.timestamp = new Date().toISOString();
        this.backupDir = 'backup-pre-deploy';
    }

    async corrigirDeploy() {
        console.log('🚀 CORREÇÃO DE DEPLOY RAILWAY');
        console.log('==============================');
        console.log(`📅 ${new Date().toLocaleString()}`);
        console.log('');

        try {
            // 1. Fazer backup
            this.criarBackup();
            
            // 2. Limpar dependências
            this.limparDependencias();
            
            // 3. Corrigir package.json
            this.corrigirPackageJson();
            
            // 4. Reinstalar dependências
            this.reinstalarDependencias();
            
            // 5. Verificar estrutura
            this.verificarEstrutura();
            
            // 6. Preparar para deploy
            this.prepararDeploy();
            
            console.log('✅ DEPLOY CORRIGIDO COM SUCESSO!');
            console.log('🚀 Pronto para deploy no Railway');
            
        } catch (error) {
            console.log('❌ Erro na correção:', error.message);
            this.restaurarBackup();
        }
    }

    criarBackup() {
        console.log('💾 1. Criando backup...');
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir);
        }
        
        // Backup package.json e package-lock.json
        if (fs.existsSync('package.json')) {
            fs.copyFileSync('package.json', `${this.backupDir}/package.json`);
        }
        if (fs.existsSync('package-lock.json')) {
            fs.copyFileSync('package-lock.json', `${this.backupDir}/package-lock.json`);
        }
        
        console.log('   ✅ Backup criado em:', this.backupDir);
    }

    limparDependencias() {
        console.log('🧹 2. Limpando dependências...');
        
        // Remover node_modules e package-lock.json
        try {
            if (fs.existsSync('node_modules')) {
                execSync('rm -rf node_modules', { stdio: 'inherit' });
            }
            if (fs.existsSync('package-lock.json')) {
                fs.unlinkSync('package-lock.json');
            }
            console.log('   ✅ Dependências limpas');
        } catch (error) {
            console.log('   ⚠️ Aviso na limpeza:', error.message);
        }
    }

    corrigirPackageJson() {
        console.log('🔧 3. Corrigindo package.json...');
        
        const packageConfig = {
            "name": "coinbitclub-market-bot",
            "version": "1.0.0",
            "description": "Sistema de Trading Automatizado CoinBitClub",
            "main": "app.js",
            "scripts": {
                "start": "node app.js",
                "dev": "nodemon app.js",
                "test": "echo \"No tests specified\" && exit 0",
                "build": "echo \"No build required\" && exit 0"
            },
            "dependencies": {
                "express": "^4.18.2",
                "cors": "^2.8.5",
                "body-parser": "^1.20.3",
                "pg": "^8.11.3",
                "dotenv": "^16.3.1",
                "axios": "^1.5.0",
                "node-fetch": "^3.3.2",
                "openai": "^4.104.0",
                "ccxt": "^4.0.0"
            },
            "engines": {
                "node": ">=18.0.0",
                "npm": ">=8.0.0"
            },
            "keywords": [
                "trading",
                "bot",
                "crypto",
                "automated",
                "coinbitclub"
            ],
            "author": "CoinBitClub",
            "license": "MIT",
            "repository": {
                "type": "git",
                "url": "https://github.com/coinbitclub/coinbitclub-market-bot"
            }
        };
        
        fs.writeFileSync('package.json', JSON.stringify(packageConfig, null, 2));
        console.log('   ✅ package.json corrigido');
    }

    reinstalarDependencias() {
        console.log('📦 4. Reinstalando dependências...');
        
        try {
            // Limpar cache npm
            execSync('npm cache clean --force', { stdio: 'inherit' });
            
            // Instalar dependências
            execSync('npm install', { stdio: 'inherit' });
            
            console.log('   ✅ Dependências reinstaladas');
        } catch (error) {
            throw new Error(`Erro ao reinstalar dependências: ${error.message}`);
        }
    }

    verificarEstrutura() {
        console.log('🔍 5. Verificando estrutura...');
        
        const arquivosEssenciais = [
            'app.js',
            'package.json',
            'package-lock.json',
            'Dockerfile',
            '.dockerignore'
        ];
        
        let arquivosEncontrados = 0;
        arquivosEssenciais.forEach(arquivo => {
            if (fs.existsSync(arquivo)) {
                console.log(`   ✅ ${arquivo}`);
                arquivosEncontrados++;
            } else {
                console.log(`   ❌ ${arquivo} - AUSENTE!`);
            }
        });
        
        console.log(`   📊 ${arquivosEncontrados}/${arquivosEssenciais.length} arquivos encontrados`);
        
        if (arquivosEncontrados < arquivosEssenciais.length) {
            throw new Error('Arquivos essenciais ausentes!');
        }
    }

    prepararDeploy() {
        console.log('🚀 6. Preparando para deploy...');
        
        // Verificar se npm ci funciona
        try {
            execSync('npm ci --omit=dev', { stdio: 'inherit' });
            console.log('   ✅ npm ci testado com sucesso');
        } catch (error) {
            throw new Error(`npm ci falhou: ${error.message}`);
        }
        
        // Criar arquivo de verificação de deploy
        const deployInfo = {
            timestamp: this.timestamp,
            node_version: process.version,
            npm_version: execSync('npm --version', { encoding: 'utf8' }).trim(),
            dependencies_count: Object.keys(require('./package.json').dependencies).length,
            deploy_ready: true
        };
        
        fs.writeFileSync('.deploy-info.json', JSON.stringify(deployInfo, null, 2));
        console.log('   ✅ Deploy preparado');
        
        // Mostrar próximos passos
        this.mostrarProximosPassos();
    }

    restaurarBackup() {
        console.log('🔄 Restaurando backup...');
        
        try {
            if (fs.existsSync(`${this.backupDir}/package.json`)) {
                fs.copyFileSync(`${this.backupDir}/package.json`, 'package.json');
            }
            if (fs.existsSync(`${this.backupDir}/package-lock.json`)) {
                fs.copyFileSync(`${this.backupDir}/package-lock.json`, 'package-lock.json');
            }
            console.log('✅ Backup restaurado');
        } catch (error) {
            console.log('❌ Erro ao restaurar backup:', error.message);
        }
    }

    mostrarProximosPassos() {
        console.log('');
        console.log('📋 PRÓXIMOS PASSOS PARA DEPLOY:');
        console.log('================================');
        console.log('');
        console.log('1. 🔄 Commit das correções:');
        console.log('   git add .');
        console.log('   git commit -m "fix: Corrigir dependências para deploy"');
        console.log('');
        console.log('2. 🚀 Push para Railway:');
        console.log('   git push origin main');
        console.log('');
        console.log('3. 🔍 Monitorar deploy no Railway dashboard');
        console.log('');
        console.log('4. ✅ Verificar se app iniciou corretamente');
        console.log('');
        console.log('🎯 DEPLOY DEVE FUNCIONAR AGORA!');
        console.log('Todas as inconsistências foram corrigidas.');
    }
}

// Executar correção
if (require.main === module) {
    const deploy = new DeployCorrigido();
    deploy.corrigirDeploy();
}

module.exports = DeployCorrigido;
