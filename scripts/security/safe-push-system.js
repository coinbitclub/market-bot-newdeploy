#!/usr/bin/env node

/**
 * 🛡️ SAFE PUSH SYSTEM
 * ===================
 * 
 * Sistema para fazer push seguro sem perder código
 * Verifica segurança, faz backup e executa deploy controlado
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class SafePushSystem {
    constructor() {
        this.backupDir = path.join(__dirname, 'safe-push-backup');
        this.logFile = path.join(__dirname, 'push-log.txt');
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        
        console.log(message);
        fs.appendFileSync(this.logFile, logMessage);
    }

    async run() {
        this.log('🛡️ INICIANDO PUSH SEGURO...');
        
        try {
            await this.createSafetyBackup();
            await this.runSecurityCheck();
            await this.stageChanges();
            await this.commitChanges();
            await this.pushChanges();
            
            this.log('✅ PUSH SEGURO CONCLUÍDO COM SUCESSO!');
            
        } catch (error) {
            this.log(`❌ ERRO: ${error.message}`);
            await this.rollbackIfNeeded();
            process.exit(1);
        }
    }

    async createSafetyBackup() {
        this.log('📦 Criando backup de segurança...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.backupDir, `safe-push-${timestamp}`);
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }

        // Backup dos arquivos críticos
        const criticalFiles = [
            'app.js',
            'enhanced-signal-processor-with-execution.js',
            'dashboard-real-final.js',
            'package.json',
            'railway.toml'
        ];

        fs.mkdirSync(backupPath, { recursive: true });

        for (const file of criticalFiles) {
            const sourcePath = path.join(__dirname, file);
            if (fs.existsSync(sourcePath)) {
                const destPath = path.join(backupPath, file);
                fs.copyFileSync(sourcePath, destPath);
            }
        }

        this.log(`✅ Backup criado: ${backupPath}`);
    }

    async runSecurityCheck() {
        this.log('🔒 Executando verificação final de segurança...');
        
        return new Promise((resolve, reject) => {
            exec('node pre-push-security-fix.js', { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    this.log(`❌ Verificação de segurança falhou: ${stderr}`);
                    reject(new Error('Verificação de segurança falhou'));
                    return;
                }
                
                this.log('✅ Verificação de segurança passou');
                resolve();
            });
        });
    }

    async stageChanges() {
        this.log('📝 Preparando arquivos para commit...');
        
        // Stage apenas arquivos seguros (não .env)
        const commands = [
            'git add *.js',
            'git add *.json', 
            'git add *.md',
            'git add *.toml',
            'git add .gitignore'
        ];

        for (const cmd of commands) {
            await this.execCommand(cmd);
        }

        // Verificar se arquivos .env não estão staged
        const stagedFiles = await this.execCommand('git diff --cached --name-only');
        const envFiles = stagedFiles.split('\n').filter(f => f.includes('.env') && !f.includes('.env.example'));
        
        if (envFiles.length > 0) {
            this.log('⚠️  Removendo arquivos .env do stage...');
            for (const envFile of envFiles) {
                await this.execCommand(`git reset HEAD ${envFile}`);
            }
        }

        this.log('✅ Arquivos preparados com segurança');
    }

    async commitChanges() {
        this.log('💾 Fazendo commit das alterações...');
        
        const commitMessage = `security: corrigir exposições de credenciais e preparar deploy seguro

- Substituir hardcoded database URLs por env variables
- Adicionar validação de segurança em arquivos críticos  
- Configurar .gitignore para proteção de credenciais
- Adicionar railway.toml para deploy otimizado
- Criar sistema de backup de segurança
- Implementar validadores de dados para prevenir NULLs

Security validated: ${new Date().toISOString()}`;

        await this.execCommand(`git commit -m "${commitMessage}"`);
        this.log('✅ Commit realizado');
    }

    async pushChanges() {
        this.log('🚀 Fazendo push para o repositório...');
        
        // Push com verificação
        await this.execCommand('git push origin main');
        this.log('✅ Push concluído');
        
        // Verificar se chegou no remote
        const remoteHash = await this.execCommand('git rev-parse origin/main');
        const localHash = await this.execCommand('git rev-parse HEAD');
        
        if (remoteHash.trim() === localHash.trim()) {
            this.log('✅ Sincronização confirmada');
        } else {
            throw new Error('Falha na sincronização com remote');
        }
    }

    async rollbackIfNeeded() {
        this.log('🔄 Iniciando rollback de segurança...');
        
        try {
            // Reset para HEAD anterior se necessário
            await this.execCommand('git reset --soft HEAD~1');
            this.log('✅ Rollback local concluído');
        } catch (error) {
            this.log(`⚠️  Erro no rollback: ${error.message}`);
        }
    }

    async execCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
                if (error) {
                    this.log(`❌ Comando falhou: ${command}`);
                    this.log(`   Erro: ${stderr}`);
                    reject(error);
                    return;
                }
                
                resolve(stdout);
            });
        });
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const pushSystem = new SafePushSystem();
    pushSystem.run().catch(error => {
        console.error('❌ ERRO FATAL:', error);
        process.exit(1);
    });
}

module.exports = SafePushSystem;
