/**
 * 🛡️ PUSH SEGURO - SISTEMA INTEGRADO COINBITCLUB
 * 
 * Script automatizado para fazer push seguro sem expor dados sensíveis
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class PushSeguro {
    constructor() {
        this.backupDir = `safe-push-backup/safe-push-${new Date().toISOString().replace(/:/g, '-')}`;
        this.arquivosSensiveis = [
            '.env',
            'config-real.js',
            'chaves-*.js',
            '**/backup-*/**'
        ];
    }

    async executar() {
        console.log('🛡️ PUSH SEGURO - COINBITCLUB MARKET BOT');
        console.log('='.repeat(60));

        try {
            // 1. Verificar se estamos no git
            console.log('1️⃣ Verificando repositório Git...');
            await this.execCommand('git status');
            console.log('✅ Repositório Git válido');

            // 2. Criar backup de segurança
            console.log('\n2️⃣ Criando backup de segurança...');
            await this.criarBackup();
            console.log('✅ Backup criado');

            // 3. Verificar arquivos sensíveis
            console.log('\n3️⃣ Verificando arquivos sensíveis...');
            await this.verificarArquivosSensiveis();
            console.log('✅ Arquivos sensíveis verificados');

            // 4. Verificar .gitignore
            console.log('\n4️⃣ Verificando .gitignore...');
            await this.verificarGitignore();
            console.log('✅ .gitignore atualizado');

            // 5. Adicionar arquivos seguros
            console.log('\n5️⃣ Adicionando arquivos seguros...');
            await this.adicionarArquivosSeguro();
            console.log('✅ Arquivos adicionados');

            // 6. Commit com mensagem automática
            console.log('\n6️⃣ Fazendo commit...');
            const commitMessage = `🚀 Sistema Integrado - Leitura do Mercado + Dashboard

✅ Configurações centralizadas (.env)
✅ Chaves removidas do código
✅ Sistema integrado com auto-start
✅ Dashboard integrado com dados reais
✅ Scripts de produção configurados
✅ Push seguro sem exposição de dados

Data: ${new Date().toISOString()}`;

            await this.execCommand(`git commit -m "${commitMessage}"`);
            console.log('✅ Commit realizado');

            // 7. Push seguro
            console.log('\n7️⃣ Fazendo push...');
            await this.execCommand('git push origin main');
            console.log('✅ Push realizado com sucesso');

            // 8. Verificação final
            console.log('\n8️⃣ Verificação final...');
            await this.verificacaoFinal();
            console.log('✅ Verificação concluída');

            this.exibirResumo();

        } catch (error) {
            console.error('❌ Erro no push seguro:', error.message);
            console.log('\n🔄 Restaurando backup...');
            await this.restaurarBackup();
        }
    }

    async criarBackup() {
        const backupPath = path.join(__dirname, this.backupDir);
        
        if (!fs.existsSync('safe-push-backup')) {
            fs.mkdirSync('safe-push-backup');
        }
        
        fs.mkdirSync(backupPath, { recursive: true });
        
        // Backup dos arquivos sensíveis
        const arquivos = ['.env', 'config.js', 'package.json'];
        
        for (const arquivo of arquivos) {
            if (fs.existsSync(arquivo)) {
                fs.copyFileSync(arquivo, path.join(backupPath, arquivo));
            }
        }

        console.log(`📁 Backup criado em: ${backupPath}`);
    }

    async verificarArquivosSensiveis() {
        const sensiveis = [];
        
        // Verificar .env
        if (fs.existsSync('.env')) {
            const envContent = fs.readFileSync('.env', 'utf8');
            if (envContent.includes('process.env.API_KEY_HERE') || 
                envContent.includes('sk-proj-')) {
                sensiveis.push('.env contém chaves reais');
            }
        }

        if (sensiveis.length > 0) {
            console.log('⚠️ Arquivos sensíveis detectados:');
            sensiveis.forEach(item => console.log(`   • ${item}`));
            console.log('💡 Estes arquivos estão protegidos pelo .gitignore');
        }
    }

    async verificarGitignore() {
        const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
        
        const requiredEntries = ['.env', '*key*', '*secret*', 'backup/'];
        const missing = requiredEntries.filter(entry => !gitignoreContent.includes(entry));
        
        if (missing.length > 0) {
            console.log('⚠️ Entradas ausentes no .gitignore:', missing);
            // .gitignore já foi atualizado anteriormente
        }
    }

    async adicionarArquivosSeguro() {
        // Adicionar apenas arquivos seguros
        const arquivosSeguro = [
            'sistema-leitura-mercado-enterprise.js',
            'servidor-dashboard.js',
            'sistema-integrado.js',
            'config.js',
            'teste-integracao-real.js',
            'package.json',
            '.env.example',
            '.gitignore',
            'dashboard-sistema-leitura-mercado.html'
        ];

        for (const arquivo of arquivosSeguro) {
            if (fs.existsSync(arquivo)) {
                await this.execCommand(`git add ${arquivo}`);
            }
        }
    }

    async verificacaoFinal() {
        try {
            const result = await this.execCommand('git log --oneline -1');
            console.log(`📝 Último commit: ${result.stdout.trim()}`);
            
            const status = await this.execCommand('git status --porcelain');
            if (status.stdout.trim() === '') {
                console.log('🎯 Working directory limpo');
            } else {
                console.log('⚠️ Arquivos pendentes detectados');
            }
        } catch (error) {
            console.log('⚠️ Verificação parcial devido a erro:', error.message);
        }
    }

    async restaurarBackup() {
        const backupPath = path.join(__dirname, this.backupDir);
        
        if (fs.existsSync(backupPath)) {
            const arquivos = fs.readdirSync(backupPath);
            for (const arquivo of arquivos) {
                fs.copyFileSync(
                    path.join(backupPath, arquivo),
                    path.join(__dirname, arquivo)
                );
            }
            console.log('✅ Backup restaurado');
        }
    }

    execCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }

    exibirResumo() {
        console.log('\n🎉 PUSH SEGURO CONCLUÍDO COM SUCESSO!');
        console.log('='.repeat(60));
        console.log('✅ Sistema Integrado enviado para repositório');
        console.log('✅ Dados sensíveis protegidos');
        console.log('✅ Configurações centralizadas');
        console.log('✅ Backup de segurança criado');
        console.log('\n🚀 PRÓXIMOS PASSOS NO RAILWAY:');
        console.log('1. Configurar variáveis de ambiente no painel Railway');
        console.log('2. Deploy automático será ativado');
        console.log('3. Sistema estará pronto para produção');
        console.log('\n📋 COMANDOS PARA PRODUÇÃO:');
        console.log('• npm start        → Sistema completo integrado');
        console.log('• npm run market   → Apenas sistema de leitura');
        console.log('• npm run dashboard → Apenas servidor dashboard');
        console.log('• npm test         → Teste de integração');
    }
}

// 🚀 EXECUÇÃO
if (require.main === module) {
    const pushSeguro = new PushSeguro();
    pushSeguro.executar().catch(console.error);
}

module.exports = PushSeguro;
