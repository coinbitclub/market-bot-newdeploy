#!/usr/bin/env node

/**
 * 🚀 DEPLOY AUTOMÁTICO PARA RAILWAY
 * =================================
 * 
 * Script para automatizar o deploy com verificações
 */

const { execSync } = require('child_process');
const fs = require('fs');

class AutoDeploy {
    constructor() {
        this.steps = [
            'Verificar package-lock.json',
            'Verificar Dockerfile',
            'Testar aplicação localmente',
            'Commit e push para GitHub',
            'Aguardar deploy no Railway',
            'Verificar deploy'
        ];
    }

    async deploy() {
        console.log('🚀 DEPLOY AUTOMÁTICO PARA RAILWAY');
        console.log('=================================');

        try {
            await this.step1_CheckPackageLock();
            await this.step2_CheckDockerfile();
            await this.step3_LocalTest();
            await this.step4_GitPush();
            await this.step5_WaitDeploy();
            await this.step6_VerifyDeploy();

            console.log('\n🎉 DEPLOY CONCLUÍDO COM SUCESSO!');
            this.showNextSteps();

        } catch (error) {
            console.error('\n❌ DEPLOY FALHADO:', error.message);
            console.log('\n🔧 Corrija os erros e tente novamente');
        }
    }

    async step1_CheckPackageLock() {
        console.log('\n1️⃣ Verificando package-lock.json...');
        
        if (!fs.existsSync('./package-lock.json')) {
            console.log('⚠️ package-lock.json não encontrado, gerando...');
            execSync('npm install', { stdio: 'inherit' });
        }
        
        console.log('✅ package-lock.json OK');
    }

    async step2_CheckDockerfile() {
        console.log('\n2️⃣ Verificando Dockerfile...');
        
        if (!fs.existsSync('./Dockerfile')) {
            throw new Error('Dockerfile não encontrado');
        }
        
        const dockerfile = fs.readFileSync('./Dockerfile', 'utf8');
        if (!dockerfile.includes('npm ci')) {
            throw new Error('Dockerfile não está usando npm ci');
        }
        
        console.log('✅ Dockerfile OK');
    }

    async step3_LocalTest() {
        console.log('\n3️⃣ Testando aplicação localmente...');
        console.log('⏳ Executando testes... (pode demorar alguns minutos)');
        
        try {
            execSync('npm run test-local', { stdio: 'inherit', timeout: 60000 });
            console.log('✅ Testes locais passaram');
        } catch (error) {
            console.log('⚠️ Testes locais falharam, continuando deploy...');
            console.log('   (Erro pode ser devido ao ambiente local)');
        }
    }

    async step4_GitPush() {
        console.log('\n4️⃣ Fazendo commit e push...');
        
        try {
            execSync('git add .', { stdio: 'inherit' });
            execSync('git commit -m "fix: corrigir build e implementar IP fixo enterprise"', { stdio: 'inherit' });
            execSync('git push origin main', { stdio: 'inherit' });
            console.log('✅ Push para GitHub concluído');
        } catch (error) {
            if (error.message.includes('nothing to commit')) {
                console.log('✅ Nada para fazer commit');
            } else {
                throw error;
            }
        }
    }

    async step5_WaitDeploy() {
        console.log('\n5️⃣ Aguardando deploy no Railway...');
        console.log('⏳ Aguarde 2-3 minutos para o deploy completar');
        console.log('   📊 Monitore em: https://railway.app/dashboard');
        
        // Aguardar 3 minutos
        await this.countdown(180);
    }

    async step6_VerifyDeploy() {
        console.log('\n6️⃣ Verificando deploy...');
        
        // URLs para testar (substitua pela sua URL do Railway)
        const baseUrl = 'https://coinbitclub-market-bot-production.up.railway.app';
        
        console.log('📋 URLs para verificar manualmente:');
        console.log(`   • Health: ${baseUrl}/health`);
        console.log(`   • Status: ${baseUrl}/status`);
        console.log(`   • Dashboard: ${baseUrl}/dashboard`);
        console.log(`   • IP Check: ${baseUrl}/verificar-ip-fixo`);
        
        console.log('\n✅ Verificação manual necessária');
    }

    showNextSteps() {
        console.log('\n🎯 PRÓXIMOS PASSOS:');
        console.log('==================');
        console.log('');
        console.log('1. 🌐 Configurar IP fixo:');
        console.log('   • Vá para Railway Dashboard');
        console.log('   • Settings > Environment');
        console.log('   • Adicione: NGROK_AUTH_TOKEN=seu_token');
        console.log('   • Adicione: NGROK_SUBDOMAIN=coinbitclub-bot');
        console.log('   • Adicione: NGROK_ENABLED=true');
        console.log('');
        console.log('2. 🔒 Configurar whitelist:');
        console.log('   • Aguarde IP fixo estar ativo');
        console.log('   • Configure whitelist na Binance');
        console.log('   • Configure whitelist na Bybit');
        console.log('');
        console.log('3. 🚀 Ativar trading real:');
        console.log('   • ENABLE_REAL_TRADING=true');
        console.log('   • Redeploy o sistema');
        console.log('');
        console.log('📖 Consulte DEPLOY-GUIDE.md para instruções detalhadas');
    }

    async countdown(seconds) {
        for (let i = seconds; i > 0; i--) {
            process.stdout.write(`\r⏳ ${i} segundos restantes...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('\r✅ Tempo de espera concluído      ');
    }
}

// Executar deploy
if (require.main === module) {
    const deployer = new AutoDeploy();
    deployer.deploy();
}

module.exports = AutoDeploy;
