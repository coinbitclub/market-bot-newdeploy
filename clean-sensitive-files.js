#!/usr/bin/env node

/**
 * 🔐 SCRIPT DE LIMPEZA DE ARQUIVOS SENSÍVEIS
 * ==========================================
 * 
 * Remove arquivos com chaves, senhas e informações sensíveis antes do commit
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 LIMPEZA DE ARQUIVOS SENSÍVEIS');
console.log('================================');
console.log('');

// Lista de arquivos sensíveis para remover/limpar
const sensitiveFiles = [
    '.env',
    '.env.local',
    '.env.production',
    'backup_variables.json',
    'node_modules',
    '.git',
    '*.log',
    '*.key',
    '*.pem',
    'secrets.json'
];

// Padrões sensíveis para limpar dos arquivos
const sensitivePatterns = [
    /postgresql:\/\/.*@.*\/.*/, // URLs de banco
    /[SENSITIVE_DATA_REMOVED]
    /[SENSITIVE_DATA_REMOVED]
    /[SENSITIVE_DATA_REMOVED]
    /[SENSITIVE_DATA_REMOVED]
    /[SENSITIVE_DATA_REMOVED]
    /AKIA[0-9A-Z]{16}/, // AWS Access Keys
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, // UUIDs (possíveis tokens)
];

// Função para verificar se arquivo deve ser removido
function shouldRemoveFile(filePath) {
    const fileName = path.basename(filePath);
    return sensitiveFiles.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(fileName);
        }
        return fileName === pattern;
    });
}

// Função para limpar conteúdo sensível de um arquivo
function cleanFileContent(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        // Substituir padrões sensíveis
        sensitivePatterns.forEach(pattern => {
            content = content.replace(pattern, '[SENSITIVE_DATA_REMOVED]');
        });
        
        // Se houve mudanças, salvar arquivo limpo
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content);
            console.log(`🧹 Limpo: ${filePath}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.log(`⚠️ Erro ao limpar ${filePath}: ${error.message}`);
        return false;
    }
}

// Função recursiva para processar diretório
function processDirectory(dirPath) {
    let removedCount = 0;
    let cleanedCount = 0;
    
    try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                // Verificar se diretório deve ser removido
                if (shouldRemoveFile(itemPath)) {
                    console.log(`🗑️ Removendo diretório: ${itemPath}`);
                    fs.rmSync(itemPath, { recursive: true, force: true });
                    removedCount++;
                } else {
                    // Processar recursivamente
                    const subResults = processDirectory(itemPath);
                    removedCount += subResults.removed;
                    cleanedCount += subResults.cleaned;
                }
            } else {
                // Verificar se arquivo deve ser removido
                if (shouldRemoveFile(itemPath)) {
                    console.log(`🗑️ Removendo arquivo: ${itemPath}`);
                    fs.unlinkSync(itemPath);
                    removedCount++;
                } else {
                    // Limpar conteúdo sensível
                    if (cleanFileContent(itemPath)) {
                        cleanedCount++;
                    }
                }
            }
        }
    } catch (error) {
        console.log(`⚠️ Erro ao processar ${dirPath}: ${error.message}`);
    }
    
    return { removed: removedCount, cleaned: cleanedCount };
}

// Executar limpeza
console.log('🔍 Processando arquivos...');
const results = processDirectory('.');

console.log('');
console.log('📊 RESULTADO DA LIMPEZA:');
console.log(`   🗑️ Arquivos/pastas removidos: ${results.removed}`);
console.log(`   🧹 Arquivos limpos: ${results.cleaned}`);
console.log('');

// Criar arquivo .gitignore se não existir
const gitignoreContent = `# 🔐 ARQUIVOS SENSÍVEIS - NÃO COMMITAR
.env
.env.local
.env.production
.env.*.local
backup_variables.json
secrets.json
*.key
*.pem
*.log

# 📁 DEPENDÊNCIAS
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 🏗️ BUILD
dist/
build/
.cache/

# 🔧 FERRAMENTAS
.vscode/settings.json
.idea/
*.swp
*.swo

# 📊 DADOS TEMPORÁRIOS
*.tmp
*.temp
cache/
logs/

# 🚀 DEPLOY
.railway/
.vercel/
`;

if (!fs.existsSync('.gitignore')) {
    fs.writeFileSync('.gitignore', gitignoreContent);
    console.log('✅ Arquivo .gitignore criado');
} else {
    console.log('✅ Arquivo .gitignore já existe');
}

console.log('');
console.log('🎯 LIMPEZA CONCLUÍDA!');
console.log('✅ Projeto pronto para commit seguro');
console.log('================================');
