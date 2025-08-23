#!/usr/bin/env node

/**
 * 🔍 DETECTOR E CORRETOR DE ARQUIVOS COM BOM
 * =========================================
 * 
 * Script para encontrar e corrigir arquivos com Byte Order Mark (BOM)
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Procurando arquivos com BOM...\n');

function detectBOM(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        if (buffer.length >= 3) {
            return buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
        }
        return false;
    } catch (error) {
        return false;
    }
}

function removeBOM(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            const content = buffer.slice(3);
            fs.writeFileSync(filePath, content);
            console.log(`✅ BOM removido de: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`❌ Erro ao processar ${filePath}:`, error.message);
        return false;
    }
}

function scanDirectory(dir, extensions = ['.js', '.json', '.md', '.txt', '.env', '.toml', '.yml', '.yaml']) {
    let filesWithBOM = [];
    
    function scan(currentDir) {
        try {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // Pular diretórios problemáticos
                    if (!['node_modules', '.git', '.next', 'analytics-out', 'logs'].includes(item)) {
                        scan(fullPath);
                    }
                } else if (stat.isFile()) {
                    const ext = path.extname(item);
                    
                    // Verificar arquivos relevantes ou Dockerfile
                    if (extensions.includes(ext) || item === 'Dockerfile' || item.startsWith('.env')) {
                        if (detectBOM(fullPath)) {
                            filesWithBOM.push(fullPath);
                            console.log(`🚨 BOM detectado: ${fullPath}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Erro ao escanear ${currentDir}:`, error.message);
        }
    }
    
    scan(dir);
    return filesWithBOM;
}

// Executar escaneamento
const projectDir = __dirname;
console.log(`📁 Escaneando: ${projectDir}\n`);

const filesWithBOM = scanDirectory(projectDir);

if (filesWithBOM.length === 0) {
    console.log('✅ Nenhum arquivo com BOM encontrado!');
} else {
    console.log(`\n🚨 Encontrados ${filesWithBOM.length} arquivo(s) com BOM:`);
    filesWithBOM.forEach(file => console.log(`   - ${file}`));
    
    console.log('\n🔧 Removendo BOM dos arquivos...\n');
    
    let corrected = 0;
    filesWithBOM.forEach(file => {
        if (removeBOM(file)) {
            corrected++;
        }
    });
    
    console.log(`\n✅ ${corrected} arquivo(s) corrigido(s)!`);
}

// Verificar especificamente o Dockerfile
const dockerfilePath = path.join(projectDir, 'Dockerfile');
if (fs.existsSync(dockerfilePath)) {
    console.log('\n🐳 Verificando Dockerfile...');
    if (detectBOM(dockerfilePath)) {
        console.log('🚨 BOM detectado no Dockerfile!');
        removeBOM(dockerfilePath);
    } else {
        console.log('✅ Dockerfile está OK');
    }
}
