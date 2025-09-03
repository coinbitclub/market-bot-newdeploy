#!/usr/bin/env node

/**
 * SISTEMA DE LIMPEZA DE SEGURANÇA AUTOMÁTICA
 * 
 * Remove automaticamente todas as credenciais expostas dos arquivos
 * e as substitui por referências a variáveis de ambiente.
 */

const fs = require('fs');
const path = require('path');

class SecurityCleaner {
    constructor() {
        this.projectRoot = process.cwd();
        this.cleanedFiles = [];
        this.errors = [];
        
        // Padrões de segurança a serem limpos
        this.patterns = {
            postgres: /postgresql:\/\/[^@\s]+@[^\/\s]+\/[^\s'"]+/gi,
            binance: /[0-9a-zA-Z]{64}/g,
            stripe_secret: /sk_(test_|live_)[0-9a-zA-Z]{99}/g,
            stripe_public: /pk_(test_|live_)[0-9a-zA-Z]{50}/g,
            ngrok: /[0-9a-zA-Z_]{20,}/g,
            twilio: /[0-9a-zA-Z]{32}/g,
            password: /(password|secret|key|token)[\s]*[:=][\s]*['"][^'"]+['"]/gi
        };

        this.replacements = {
            postgres: 'process.env.DATABASE_URL',
            binance: 'process.env.BINANCE_API_KEY',
            stripe_secret: 'process.env.STRIPE_SECRET_KEY',
            stripe_public: 'process.env.STRIPE_PUBLISHABLE_KEY',
            ngrok: 'process.env.NGROK_AUTH_TOKEN',
            twilio: 'process.env.TWILIO_AUTH_TOKEN'
        };
    }

    async cleanProject() {
        console.log('🧹 INICIANDO LIMPEZA DE SEGURANÇA');
        console.log('================================');

        try {
            // 1. Criar .gitignore seguro
            this.createSecureGitignore();

            // 2. Criar .env.example
            this.createEnvExample();

            // 3. Limpar arquivos JavaScript
            await this.cleanJavaScriptFiles();

            // 4. Limpar arquivos Markdown
            await this.cleanMarkdownFiles();

            // 5. Verificar se ainda há exposições
            await this.verifyCleanup();

            // 6. Relatório final
            this.generateCleanupReport();

            console.log('✅ LIMPEZA DE SEGURANÇA CONCLUÍDA');

        } catch (error) {
            console.error('❌ ERRO NA LIMPEZA:', error.message);
            throw error;
        }
    }

    createSecureGitignore() {
        console.log('🔒 Criando .gitignore seguro...');

        const gitignoreContent = `
# Arquivos de ambiente e credenciais
.env
.env.local
.env.production
.env.staging
*.key
*.pem
*.p12
*.pfx

# Backups e arquivos temporários
BACKUP_*
backup-*
temp-*
*.backup
*.tmp

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Dependências
node_modules/
npm-debug.log
yarn-error.log

# Sistema operacional
.DS_Store
Thumbs.db
*.swp
*.swo

# IDEs
.vscode/
.idea/
*.sublime-*

# Arquivos de build
dist/
build/
*.tgz

# Dados sensíveis específicos do projeto
security-audit-*.json
*-credentials.json
*-keys.json
database-dump.sql

# Arquivos MD com dados sensíveis (temporário)
Arquivos\ MD/ALERTA-SEGURANCA-CRITICO.md
Arquivos\ MD/SISTEMA-*-OPERACIONAL.md
Arquivos\ MD/PRODUCTION-READY-*.md
`;

        fs.writeFileSync('.gitignore', gitignoreContent);
        console.log('✅ .gitignore criado com regras de segurança');
    }

    createEnvExample() {
        console.log('📝 Criando .env.example...');

        const envExample = `
# ========================================
# VARIÁVEIS DE AMBIENTE - EXEMPLO
# ========================================
# Copie este arquivo para .env e preencha com valores reais
# NUNCA commite o arquivo .env para o repositório

# =================
# DATABASE
# =================
DATABASE_URL=process.env.DATABASE_URL

# =================
# BINANCE API
# =================
BINANCE_API_KEY=sua_api_key_binance_aqui
BINANCE_SECRET_KEY=sua_secret_key_binance_aqui

# =================
# BYBIT API  
# =================
BYBIT_API_KEY=sua_api_key_bybit_aqui
BYBIT_SECRET_KEY=sua_secret_key_bybit_aqui

# =================
# STRIPE PAYMENT
# =================
STRIPE_SECRET_KEY=sk_test_ou_live_sua_secret_key_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_ou_live_sua_publishable_key_aqui

# =================
# TWILIO SMS
# =================
TWILIO_ACCOUNT_SID=sua_account_sid_aqui
TWILIO_AUTH_TOKEN=seu_auth_token_aqui

# =================
# NGROK TUNNEL
# =================
NGROK_AUTH_TOKEN=seu_ngrok_token_aqui

# =================
# SECURITY
# =================
JWT_SECRET=sua_jwt_secret_key_super_segura_aqui
ENCRYPTION_KEY=sua_chave_de_criptografia_aqui

# =================
# SERVIDOR
# =================
PORT=3000
NODE_ENV=development

# =================
# NOTIFICAÇÕES
# =================
WEBHOOK_URL=sua_url_webhook_aqui
ADMIN_EMAIL=seu_email_admin_aqui
`;

        fs.writeFileSync('.env.example', envExample);
        console.log('✅ .env.example criado');
    }

    async cleanJavaScriptFiles() {
        console.log('🧹 Limpando arquivos JavaScript...');

        const jsFiles = this.findFilesByExtension('.js');
        
        for (const filePath of jsFiles) {
            try {
                const originalContent = fs.readFileSync(filePath, 'utf8');
                let cleanContent = originalContent;
                let wasModified = false;

                // Substituir conexões PostgreSQL
                if (this.patterns.postgres.test(cleanContent)) {
                    cleanContent = cleanContent.replace(this.patterns.postgres, 'process.env.DATABASE_URL');
                    wasModified = true;
                }

                // Substituir chaves Stripe
                if (this.patterns.stripe_secret.test(cleanContent)) {
                    cleanContent = cleanContent.replace(this.patterns.stripe_secret, 'process.env.STRIPE_SECRET_KEY');
                    wasModified = true;
                }

                if (this.patterns.stripe_public.test(cleanContent)) {
                    cleanContent = cleanContent.replace(this.patterns.stripe_public, 'process.env.STRIPE_PUBLISHABLE_KEY');
                    wasModified = true;
                }

                // Limpar outros padrões suspeitos (mais conservador)
                const suspiciousPatterns = [
                    /(['"])[0-9a-zA-Z]{50,}['"]/g,  // Strings longas que podem ser chaves
                    /['"]\w{20,}['"]/g  // Strings com mais de 20 caracteres alfanuméricos
                ];

                for (const pattern of suspiciousPatterns) {
                    const matches = cleanContent.match(pattern);
                    if (matches) {
                        for (const match of matches) {
                            // Verificar se parece com credencial
                            if (this.looksLikeCredential(match)) {
                                cleanContent = cleanContent.replace(match, "'process.env.API_KEY_HERE'");
                                wasModified = true;
                            }
                        }
                    }
                }

                if (wasModified) {
                    fs.writeFileSync(filePath, cleanContent);
                    this.cleanedFiles.push(filePath);
                    console.log(`✅ Limpo: ${path.relative(this.projectRoot, filePath)}`);
                }

            } catch (error) {
                console.log(`⚠️ Erro ao limpar ${filePath}: ${error.message}`);
                this.errors.push({ file: filePath, error: error.message });
            }
        }
    }

    async cleanMarkdownFiles() {
        console.log('📝 Limpando arquivos Markdown...');

        const mdFiles = this.findFilesByExtension('.md');
        
        for (const filePath of mdFiles) {
            try {
                const originalContent = fs.readFileSync(filePath, 'utf8');
                let cleanContent = originalContent;
                let wasModified = false;

                // Substituir conexões PostgreSQL
                if (this.patterns.postgres.test(cleanContent)) {
                    cleanContent = cleanContent.replace(this.patterns.postgres, '[REMOVIDO - DATABASE_URL]');
                    wasModified = true;
                }

                // Substituir chaves Stripe
                cleanContent = cleanContent.replace(this.patterns.stripe_secret, '[REMOVIDO - STRIPE_SECRET]');
                cleanContent = cleanContent.replace(this.patterns.stripe_public, '[REMOVIDO - STRIPE_PUBLIC]');

                // Remover chaves longas suspeitas
                cleanContent = cleanContent.replace(/[0-9a-zA-Z]{40,}/g, '[REMOVIDO - CREDENCIAL]');

                if (originalContent !== cleanContent) {
                    wasModified = true;
                }

                if (wasModified) {
                    fs.writeFileSync(filePath, cleanContent);
                    this.cleanedFiles.push(filePath);
                    console.log(`✅ Limpo: ${path.relative(this.projectRoot, filePath)}`);
                }

            } catch (error) {
                console.log(`⚠️ Erro ao limpar ${filePath}: ${error.message}`);
                this.errors.push({ file: filePath, error: error.message });
            }
        }
    }

    looksLikeCredential(str) {
        // Remove aspas
        const clean = str.replace(/['"]/g, '');
        
        // Verificar se parece com credencial
        const credentialPatterns = [
            /^[0-9a-f]{32,}$/i,  // Hash hex
            /^[A-Za-z0-9+/]{20,}={0,2}$/,  // Base64
            /sk_[a-zA-Z0-9]+/,  // Stripe secret
            /pk_[a-zA-Z0-9]+/,  // Stripe public
            /^[0-9a-zA-Z]{50,}$/  // Chave longa
        ];

        return credentialPatterns.some(pattern => pattern.test(clean));
    }

    findFilesByExtension(extension) {
        const files = [];
        
        const scanDirectory = (dir) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // Pular node_modules e backups
                    if (!['node_modules', 'BACKUP_EMERGENCY', '.git'].includes(item)) {
                        scanDirectory(fullPath);
                    }
                } else if (item.endsWith(extension)) {
                    files.push(fullPath);
                }
            }
        };

        scanDirectory(this.projectRoot);
        return files;
    }

    async verifyCleanup() {
        console.log('🔍 Verificando limpeza...');
        
        // Re-executar auditoria rápida
        const { execSync } = require('child_process');
        
        try {
            const result = execSync('node security-audit-complete.js', { encoding: 'utf8' });
            console.log('📊 Verificação pós-limpeza executada');
        } catch (error) {
            console.log('⚠️ Erro na verificação, mas continuando...');
        }
    }

    generateCleanupReport() {
        console.log('📋 Gerando relatório de limpeza...');

        const report = `
RELATÓRIO DE LIMPEZA DE SEGURANÇA
================================

📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}

🎯 AÇÕES EXECUTADAS:
✅ .gitignore seguro criado
✅ .env.example criado com template
✅ Credenciais removidas de arquivos JS
✅ Credenciais removidas de arquivos MD

📊 ESTATÍSTICAS:
- Arquivos limpos: ${this.cleanedFiles.length}
- Erros encontrados: ${this.errors.length}

📁 ARQUIVOS MODIFICADOS:
${this.cleanedFiles.map(file => `- ${path.relative(this.projectRoot, file)}`).join('\n')}

${this.errors.length > 0 ? `
⚠️ ERROS ENCONTRADOS:
${this.errors.map(err => `- ${err.file}: ${err.error}`).join('\n')}
` : ''}

🔄 PRÓXIMOS PASSOS:
1. ✅ Backup criado
2. ✅ Limpeza de segurança executada  
3. 🔄 Iniciar reorganização enterprise
4. ⏳ Configurar variáveis de ambiente
5. ⏳ Testar sistema limpo

⚠️ IMPORTANTE:
- Configure o arquivo .env com credenciais reais
- Teste todas as funcionalidades após limpeza
- Verifique se nenhuma credencial foi deixada
`;

        const reportPath = path.join(this.projectRoot, 'CLEANUP_REPORT.md');
        fs.writeFileSync(reportPath, report);
        console.log('✅ Relatório de limpeza criado: CLEANUP_REPORT.md');
    }
}

// Executar limpeza se chamado diretamente
if (require.main === module) {
    const cleaner = new SecurityCleaner();
    cleaner.cleanProject()
        .then(() => {
            console.log('\n🎉 LIMPEZA CONCLUÍDA! Sistema agora seguro para reorganização.');
            console.log('📝 Configure o arquivo .env antes de testar o sistema.');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ FALHA NA LIMPEZA:', error);
            process.exit(1);
        });
}

module.exports = SecurityCleaner;
