#!/usr/bin/env node

/**
 * 🔧 FORÇA LIMPEZA DE BOM - COINBITCLUB MARKET BOT
 * ===============================================
 * 
 * Script para forçar limpeza de todos os caracteres BOM
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 FORÇA LIMPEZA DE BOM - INICIANDO...\n');

// Lista de arquivos críticos
const criticalFiles = [
    '../Dockerfile',
    './Dockerfile',
    '../.railwayignore',
    './package.json',
    './app.js',
    './main.js'
];

function cleanBOM(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  ${filePath}: ARQUIVO NÃO EXISTE`);
            return false;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        
        // Verificar se tem BOM
        const hasBOM = content.charCodeAt(0) === 0xFEFF;
        
        if (hasBOM) {
            console.log(`🚨 ${filePath}: BOM DETECTADO - REMOVENDO...`);
            const cleanContent = content.slice(1);
            fs.writeFileSync(filePath, cleanContent, 'utf8');
            console.log(`✅ ${filePath}: BOM REMOVIDO`);
            return true;
        } else {
            console.log(`✅ ${filePath}: SEM BOM`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${filePath}: ERRO - ${error.message}`);
        return false;
    }
}

function forceRebuildDockerfile() {
    const dockerfileContent = `FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./
EXPOSE 3000
CMD ["node", "main.js"]`;

    const dockerfilePaths = ['../Dockerfile', './Dockerfile'];
    
    dockerfilePaths.forEach(dockerfilePath => {
        try {
            console.log(`🔨 Recriando ${dockerfilePath}...`);
            fs.writeFileSync(dockerfilePath, dockerfileContent, 'utf8');
            console.log(`✅ ${dockerfilePath}: RECRIADO LIMPO`);
        } catch (error) {
            console.log(`❌ ${dockerfilePath}: ERRO - ${error.message}`);
        }
    });
}

// Executar limpeza
console.log('📋 Verificando arquivos críticos...\n');

let bomFound = false;
criticalFiles.forEach(file => {
    if (cleanBOM(file)) {
        bomFound = true;
    }
});

console.log('\n🔨 Forçando recriação dos Dockerfiles...\n');
forceRebuildDockerfile();

console.log('\n📊 RESUMO:');
console.log(`BOM encontrado: ${bomFound ? 'SIM' : 'NÃO'}`);
console.log('Dockerfiles: RECRIADOS LIMPOS');

console.log('\n✅ LIMPEZA CONCLUÍDA!\n');
