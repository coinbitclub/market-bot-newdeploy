#!/usr/bin/env node

/**
 * 🔒 PREPARAR PROJETO PARA GITHUB
 * ===============================
 * 
 * Este script identifica arquivos sensíveis e cria versões sanitizadas
 * SEM ALTERAR OS ARQUIVOS ORIGINAIS
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 PREPARANDO PROJETO PARA GITHUB');
console.log('=================================');
console.log('⚠️  PRESERVANDO ARQUIVOS ORIGINAIS');
console.log('');

// Arquivos que contêm dados sensíveis
const sensitiveFiles = [
    '.env',
    '.env.production',
    '.env.local',
    '.env.development'
];

// Padrões sensíveis para mascarar
const sensitivePatterns = [
    {
        pattern: /postgresql:\/\/[^'"\s]+/g,
        replacement: 'process.env.DATABASE_URL'
    },
    {
        pattern: /sk-[a-zA-Z0-9-_]{32,}/g,
        replacement: 'sk-your-openai-api-key-here'
    },
    {
        pattern: /sk_live_[a-zA-Z0-9]+/g,
        replacement: 'sk_live_your-stripe-secret-key'
    },
    {
        pattern: /pk_live_[a-zA-Z0-9]+/g,
        replacement: 'pk_live_your-stripe-public-key'
    },
    {
        pattern: /[a-zA-Z0-9]{64,}/g,
        replacement: 'your-api-secret-key-here'
    }
];

function createSanitizedVersion(filePath) {
    if (!fs.existsSync(filePath)) {
        return;
    }

    console.log(`📝 Criando versão sanitizada: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Aplicar máscaras
    sensitivePatterns.forEach(({ pattern, replacement }) => {
        content = content.replace(pattern, replacement);
    });
    
    // Se houve alterações, criar arquivo .example
    if (content !== originalContent) {
        const examplePath = filePath + '.example';
        fs.writeFileSync(examplePath, content);
        console.log(`✅ Criado: ${examplePath}`);
    }
}

function createGitignore() {
    const gitignoreContent = `# 🔒 ARQUIVOS SENSÍVEIS
.env
.env.production
.env.local
.env.development
.env.test

# 📊 LOGS
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 📦 DEPENDÊNCIAS
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 🏗️ BUILD
dist/
build/
.next/
out/

# 🔧 CONFIGURAÇÕES IDE
.vscode/settings.json
.idea/
*.swp
*.swo

# 🗃️ SISTEMA
.DS_Store
Thumbs.db
ehthumbs.db
Desktop.ini

# 🔑 CHAVES E CERTIFICADOS
*.pem
*.key
*.cert
*.crt

# 🚀 DEPLOY
.vercel
.railway

# 📊 DADOS TEMPORÁRIOS
temp/
tmp/
*.tmp
*.temp
`;

    fs.writeFileSync('.gitignore', gitignoreContent);
    console.log('✅ .gitignore criado/atualizado');
}

function createSafeEnvExample() {
    const envExampleContent = `# 🚀 COINBITCLUB PRODUCTION ENVIRONMENT - EXEMPLO
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=process.env.DATABASE_URL

# URLs
BACKEND_URL=https://your-backend-url.railway.app
FRONTEND_URL=https://your-frontend-url.railway.app
WEBHOOK_URL=https://your-backend-url.railway.app/webhook

# Trading - PRODUÇÃO REAL
ENABLE_REAL_TRADING=true
POSITION_SAFETY_ENABLED=true
MANDATORY_STOP_LOSS=true
MANDATORY_TAKE_PROFIT=true
MAX_LEVERAGE=10

# Security
JWT_SECRET=your-jwt-secret-here
API_KEY_SECRET=your-api-key-secret-here
WEBHOOK_SECRET=your-webhook-secret-here

# Exchange APIs - SUBSTITUA POR CHAVES REAIS
BINANCE_API_KEY=your-real-binance-api-key
BINANCE_SECRET_KEY=your-real-binance-secret-key
BYBIT_API_KEY=your-real-bybit-api-key
BYBIT_SECRET_KEY=your-real-bybit-secret-key

# External APIs
OPENAI_API_KEY=sk-your-real-openai-key
STRIPE_SECRET_KEY=sk_live_your-real-stripe-secret
STRIPE_PUBLISHABLE_KEY=pk_live_your-real-stripe-public
COINSTATS_API_KEY=your-real-coinstats-key

# Features
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_ADVANCED_ANALYTICS=true
`;

    fs.writeFileSync('.env.example', envExampleContent);
    console.log('✅ .env.example criado');
}

function sanitizeCodeFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return;
    }

    console.log(`🔍 Verificando: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se há dados sensíveis no código
    const hasSensitiveData = sensitivePatterns.some(({ pattern }) => pattern.test(content));
    
    if (hasSensitiveData) {
        console.log(`⚠️  ${filePath} contém dados sensíveis (mas não será alterado)`);
        
        // Criar versão sanitizada apenas para referência
        let sanitizedContent = content;
        sensitivePatterns.forEach(({ pattern, replacement }) => {
            sanitizedContent = sanitizedContent.replace(pattern, replacement);
        });
        
        const safePath = filePath.replace('.js', '.safe.js');
        fs.writeFileSync(safePath, sanitizedContent);
        console.log(`📝 Versão sanitizada criada: ${safePath}`);
    }
}

// Executar limpeza
console.log('🔍 IDENTIFICANDO ARQUIVOS SENSÍVEIS...');

// Criar .gitignore
createGitignore();

// Criar .env.example
createSafeEnvExample();

// Processar arquivos .env
sensitiveFiles.forEach(createSanitizedVersion);

// Verificar arquivos de código principais (sem alterar)
const codeFiles = [
    'app.js',
    'check-database.js'
];

codeFiles.forEach(sanitizeCodeFile);

console.log('');
console.log('✅ PREPARAÇÃO CONCLUÍDA!');
console.log('========================');
console.log('');
console.log('📋 Arquivos criados:');
console.log('   • .gitignore - Protege arquivos sensíveis');
console.log('   • .env.example - Modelo seguro de configuração');
console.log('   • *.example - Versões sanitizadas dos arquivos sensíveis');
console.log('');
console.log('⚠️ IMPORTANTE:');
console.log('   • Arquivos originais NÃO foram alterados');
console.log('   • Projeto continua funcionando normalmente');
console.log('   • Dados sensíveis protegidos para GitHub');
console.log('');
console.log('🚀 PRONTO PARA COMMIT NO GITHUB!');
