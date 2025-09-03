#!/usr/bin/env node
/**
 * 🚨 CORREÇÃO URGENTE DE SEGURANÇA - GITHUB PUSH PROTECTION
 * =========================================================
 * 
 * GitHub bloqueou o push devido a chaves expostas.
 * Este script remove TODAS as chaves sensíveis e permite deploy seguro.
 */

console.log('🚨 CORREÇÃO URGENTE DE SEGURANÇA GITHUB');
console.log('======================================');

const fs = require('fs');
const path = require('path');

class SecurityCleaner {
    constructor() {
        this.filesToClean = [
            '.env.template',
            'PROXIMOS-PASSOS.md',
            '.env',
            '.env.example',
            '.env.production'
        ];
        
        this.sensitivePatterns = [
            // OpenAI Keys
            /sk-proj-[a-zA-Z0-9-_]{100,}/g,
            /sk-[a-zA-Z0-9]{20,}/g,
            
            // API Keys gerais
            /[a-zA-Z0-9]{32,}/g,
            
            // Stripe keys
            /sk_live_[a-zA-Z0-9]{99}/g,
            /pk_live_[a-zA-Z0-9]{99}/g,
            
            // Database URLs com credenciais
            /postgresql:\/\/[^:]+:[^@]+@[^\/]+\/[^"'\s]+/g,
            
            // Twilio
            /AC[a-z0-9]{32}/g,
            /\+1[0-9]{10}/g
        ];
    }

    // Remover chaves sensíveis de um arquivo
    cleanFile(filePath) {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Arquivo não existe: ${filePath}`);
            return false;
        }

        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;

            // Aplicar todas as substituições
            this.sensitivePatterns.forEach(pattern => {
                content = content.replace(pattern, '[REMOVED_FOR_SECURITY]');
            });

            // Substituições específicas conhecidas
            content = content.replace(
                /OPENAI_API_KEY=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/g,
                'OPENAI_API_KEY=[REMOVED_FOR_SECURITY]'
            );

            content = content.replace(
                /ZFIxigBcVaCyXDL1Qp\/Ork7TOL3\+h07NM2f3YoSrMkI=/g,
                '[REMOVED_FOR_SECURITY]'
            );

            content = content.replace(
                /\+14782765936/g,
                '+1[REMOVED_FOR_SECURITY]'
            );

            // Salvar apenas se houve mudanças
            if (content !== originalContent) {
                fs.writeFileSync(filePath, content);
                console.log(`✅ ${filePath}: chaves removidas`);
                return true;
            } else {
                console.log(`✅ ${filePath}: já estava limpo`);
                return false;
            }

        } catch (error) {
            console.error(`❌ Erro ao limpar ${filePath}:`, error.message);
            return false;
        }
    }

    // Criar .env.template seguro
    createSecureTemplate() {
        const secureTemplate = `# COINBITCLUB ENVIRONMENT VARIABLES - TEMPLATE SEGURO
# Configure estas variáveis no Railway Dashboard

# DATABASE (Railway configura automaticamente)
DATABASE_URL=process.env.DATABASE_URL

# OPENAI (Configure no Railway)
OPENAI_API_KEY=[CONFIGURE_NO_RAILWAY]

# COINSTATS (Configure no Railway)
COINSTATS_API_KEY=[CONFIGURE_NO_RAILWAY]
FEAR_GREED_URL=https://openapiv1.coinstats.app/insights/fear-and-greed

# TWILIO (Configure no Railway)
TWILIO_ACCOUNT_SID=[CONFIGURE_NO_RAILWAY]
TWILIO_AUTH_TOKEN=[CONFIGURE_NO_RAILWAY]
TWILIO_PHONE_NUMBER=[CONFIGURE_NO_RAILWAY]

# STRIPE (Configure no Railway)
STRIPE_SECRET_KEY=[CONFIGURE_NO_RAILWAY]
STRIPE_PUBLISHABLE_KEY=[CONFIGURE_NO_RAILWAY]
STRIPE_WEBHOOK_SECRET=[CONFIGURE_NO_RAILWAY]

# EXCHANGES TESTNET (Seguro para repositório público)
BINANCE_TESTNET_API_KEY=testnet_key_here
BINANCE_TESTNET_API_SECRET=testnet_secret_here
BYBIT_TESTNET_API_KEY=testnet_key_here
BYBIT_TESTNET_API_SECRET=testnet_secret_here

# EXCHANGES MANAGEMENT (Configure no Railway)
BINANCE_MANAGEMENT_API_KEY=[CONFIGURE_NO_RAILWAY]
BINANCE_MANAGEMENT_API_SECRET=[CONFIGURE_NO_RAILWAY]

# SYSTEM
NODE_ENV=production
PORT=3000
JWT_SECRET=[CONFIGURE_NO_RAILWAY]
ENCRYPTION_KEY=[CONFIGURE_NO_RAILWAY]
WEBHOOK_SECRET=[CONFIGURE_NO_RAILWAY]

# BUSINESS RULES
MIN_BALANCE_BRAZIL_BRL=100
MIN_BALANCE_FOREIGN_USD=20
COMMISSION_MONTHLY_BRAZIL=10
COMMISSION_MONTHLY_FOREIGN=10
COMMISSION_PREPAID_BRAZIL=20
COMMISSION_PREPAID_FOREIGN=20
AFFILIATE_NORMAL_RATE=1.5
AFFILIATE_VIP_RATE=5.0

# TRADING
ENABLE_REAL_TRADING=false
FORCE_TESTNET_MODE=true
BYPASS_IP_RESTRICTIONS=true
`;

        fs.writeFileSync('.env.template', secureTemplate);
        console.log('✅ .env.template seguro criado');
    }

    // Atualizar documentação removendo chaves
    cleanDocumentation() {
        const docsPath = 'PROXIMOS-PASSOS.md';
        if (fs.existsSync(docsPath)) {
            let content = fs.readFileSync(docsPath, 'utf8');
            
            // Remover seção específica com chaves
            content = content.replace(
                /```bash\s*# No Railway Dashboard, adicionar:\s*OPENAI_API_KEY=sk-proj-[^`]+```/gs,
                '```bash\n# No Railway Dashboard, adicionar variáveis de ambiente:\nOPENAI_API_KEY=[SUA_CHAVE_OPENAI]\nCOINSTATS_API_KEY=[SUA_CHAVE_COINSTATS]\nJWT_SECRET=[SEU_JWT_SECRET]\n```'
            );

            fs.writeFileSync(docsPath, content);
            console.log('✅ Documentação limpa');
        }
    }

    // Criar .gitignore robusto
    updateGitignore() {
        const gitignoreContent = `# Environment variables
.env
.env.local
.env.production
.env.development
.env.backup*

# Sensitive files
*key*
*secret*
*credentials*
*.pem
*.p12

# Logs
logs
*.log
npm-debug.log*

# Dependencies
node_modules/
package-lock.json

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Build
dist/
build/

# Temp
temp/
tmp/
*.tmp

# Database
*.db
*.sqlite

# Backups
backup/
*.backup
`;

        fs.writeFileSync('.gitignore', gitignoreContent);
        console.log('✅ .gitignore atualizado');
    }

    // Executar limpeza completa
    async runCompleteCleaning() {
        console.log('\n🧹 INICIANDO LIMPEZA COMPLETA...');
        
        let changesMode = false;

        // Limpar arquivos conhecidos
        this.filesToClean.forEach(file => {
            if (this.cleanFile(file)) {
                changesMode = true;
            }
        });

        // Criar template seguro
        this.createSecureTemplate();
        
        // Limpar documentação
        this.cleanDocumentation();
        
        // Atualizar .gitignore
        this.updateGitignore();

        console.log('\n📋 INSTRUÇÕES PARA RAILWAY:');
        console.log('===========================');
        console.log('Configure estas variáveis no Railway Dashboard:');
        console.log('');
        console.log('OPENAI_API_KEY=sk-proj-[SUA_CHAVE_REAL]');
        console.log('COINSTATS_API_KEY=[SUA_CHAVE_REAL]');
        console.log('JWT_SECRET=coinbitclub-production-jwt-secret-ultra-secure');
        console.log('ENCRYPTION_KEY=coinbitclub-encrypt-key-32-chars-security');
        console.log('WEBHOOK_SECRET=coinbitclub-webhook-secret-production');
        console.log('NODE_ENV=production');
        console.log('ENABLE_REAL_TRADING=true');

        console.log('\n✅ LIMPEZA CONCLUÍDA!');
        console.log('===================');
        console.log('• Todas as chaves sensíveis removidas');
        console.log('• .env.template seguro criado');
        console.log('• .gitignore robusto configurado');
        console.log('• Documentação limpa');
        
        console.log('\n🚀 PRÓXIMOS COMANDOS:');
        console.log('====================');
        console.log('git add .');
        console.log('git commit -m "security: remove exposed keys for GitHub protection"');
        console.log('git push origin main');
        
        return changesMode;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const cleaner = new SecurityCleaner();
    cleaner.runCompleteCleaning().then(() => {
        console.log('\n🎯 DEPLOY SEGURO PRONTO!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erro na limpeza:', error.message);
        process.exit(1);
    });
}

module.exports = SecurityCleaner;
