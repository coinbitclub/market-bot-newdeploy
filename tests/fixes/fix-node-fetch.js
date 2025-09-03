#!/usr/bin/env node

/**
 * CORRETOR DE NODE-FETCH - SOLUÇÃO ESM
 * Converte todos os require('node-fetch') para axios
 */

const fs = require('fs');
const path = require('path');

class NodeFetchFixer {
    constructor() {
        this.fixed = 0;
        this.errors = 0;
    }

    fixNodeFetch() {
        console.log('🔧 CORRIGINDO NODE-FETCH → AXIOS');
        console.log('================================');
        console.log('');

        const filesToFix = [
            'dashboard-real-final.js',
            'dashboard-tempo-real.js', 
            'order-execution-engine.js'
        ];

        filesToFix.forEach(file => {
            if (fs.existsSync(file)) {
                this.fixFile(file);
            }
        });

        console.log('');
        console.log('📊 RESULTADO:');
        console.log(`✅ Arquivos corrigidos: ${this.fixed}`);
        console.log(`❌ Erros: ${this.errors}`);
        
        if (this.fixed > 0) {
            console.log('');
            console.log('🚀 Reinstalando dependências...');
            this.updateDependencies();
        }
    }

    fixFile(filename) {
        try {
            console.log(`🔧 Corrigindo: ${filename}`);
            
            let content = fs.readFileSync(filename, 'utf8');
            let modified = false;

            // Substituir require('node-fetch')
            if (content.includes("require('node-fetch')")) {
                content = content.replace(/const fetch = require\('node-fetch'\);?/g, 'const axios = require(\'axios\');');
                content = content.replace(/const { default: fetch } = require\('node-fetch'\);?/g, 'const axios = require(\'axios\');');
                modified = true;
                console.log('   ✅ require node-fetch → axios');
            }

            // Substituir uso de fetch() por axios.get()
            if (content.includes('fetch(')) {
                // Substituir fetch simples por axios.get
                content = content.replace(/const response = await fetch\(([^)]+)\);?/g, 'const response = await axios.get($1);');
                content = content.replace(/fetch\(([^)]+)\)\.then/g, 'axios.get($1).then');
                
                // Corrigir response.json() para response.data
                content = content.replace(/response\.json\(\)/g, 'response.data');
                content = content.replace(/\.then\(response => response\.json\(\)\)/g, '.then(response => response.data)');
                
                modified = true;
                console.log('   ✅ fetch() → axios.get()');
            }

            if (modified) {
                fs.writeFileSync(filename, content);
                this.fixed++;
                console.log(`   💾 ${filename} salvo`);
            } else {
                console.log(`   ⏭️ ${filename} não precisava de correção`);
            }

        } catch (error) {
            console.log(`   ❌ Erro em ${filename}: ${error.message}`);
            this.errors++;
        }
    }

    updateDependencies() {
        try {
            const { execSync } = require('child_process');
            
            console.log('📦 Removendo package-lock.json...');
            if (fs.existsSync('package-lock.json')) {
                fs.unlinkSync('package-lock.json');
            }

            console.log('📦 Reinstalando dependências...');
            execSync('npm install', { stdio: 'inherit' });
            
            console.log('✅ Dependências atualizadas!');
            console.log('');
            console.log('🧪 Testando npm ci...');
            execSync('npm ci --omit=dev', { stdio: 'inherit' });
            
            console.log('✅ TUDO FUNCIONANDO!');
            
        } catch (error) {
            console.log('❌ Erro ao atualizar dependências:', error.message);
        }
    }
}

// Executar
if (require.main === module) {
    const fixer = new NodeFetchFixer();
    fixer.fixNodeFetch();
}

module.exports = NodeFetchFixer;
