#!/usr/bin/env node

/**
 * CORRETOR COMPLETO DE FETCH → AXIOS
 * Remove TODOS os vestígios de node-fetch do sistema
 */

const fs = require('fs');
const path = require('path');

class FetchAxiosCorretor {
    constructor() {
        this.fixed = 0;
        this.errors = 0;
    }

    async corrigirTudo() {
        console.log('🔧 CORRETOR COMPLETO FETCH → AXIOS');
        console.log('==================================');
        console.log('');

        // 1. Garantir package.json correto
        this.corrigirPackageJson();
        
        // 2. Corrigir arquivos principais
        this.corrigirArquivos();
        
        // 3. Remover node_modules e reinstalar
        await this.reinstalarLimpo();
        
        // 4. Testar
        this.testarSistema();
        
        console.log('');
        console.log('📊 RESULTADO FINAL:');
        console.log(`✅ Arquivos corrigidos: ${this.fixed}`);
        console.log(`❌ Erros: ${this.errors}`);
    }

    corrigirPackageJson() {
        console.log('📦 1. Corrigindo package.json...');
        
        const packageJson = {
            "name": "coinbitclub-market-bot",
            "version": "1.0.0",
            "description": "Sistema de Trading Automatizado CoinBitClub",
            "main": "app.js",
            "scripts": {
                "start": "node app.js",
                "dev": "nodemon app.js",
                "test": "echo \"No tests specified\" && exit 0",
                "build": "echo \"No build required\" && exit 0"
            },
            "dependencies": {
                "express": "^4.18.2",
                "cors": "^2.8.5", 
                "body-parser": "^1.20.3",
                "pg": "^8.11.3",
                "dotenv": "^16.3.1",
                "axios": "^1.5.0",
                "openai": "^4.104.0",
                "ccxt": "^4.0.0"
            },
            "engines": {
                "node": ">=18.0.0",
                "npm": ">=8.0.0"
            },
            "keywords": [
                "trading",
                "bot", 
                "crypto",
                "automated",
                "coinbitclub"
            ],
            "author": "CoinBitClub",
            "license": "MIT",
            "repository": {
                "type": "git",
                "url": "https://github.com/coinbitclub/coinbitclub-market-bot"
            }
        };
        
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        console.log('   ✅ package.json sem node-fetch');
    }

    corrigirArquivos() {
        console.log('🔧 2. Corrigindo arquivos...');
        
        const arquivos = [
            'dashboard-real-final.js',
            'dashboard-tempo-real.js',
            'order-execution-engine.js',
            'app.js'
        ];

        arquivos.forEach(arquivo => {
            if (fs.existsSync(arquivo)) {
                this.corrigirArquivo(arquivo);
            }
        });
    }

    corrigirArquivo(arquivo) {
        try {
            console.log(`   🔧 ${arquivo}...`);
            
            let content = fs.readFileSync(arquivo, 'utf8');
            let modificado = false;

            // Remover requires de node-fetch
            const regexRequires = [
                /const fetch = require\('node-fetch'\);?/g,
                /const { default: fetch } = require\('node-fetch'\);?/g,
                /import fetch from 'node-fetch';?/g,
                /import { fetch } from 'node-fetch';?/g
            ];

            regexRequires.forEach(regex => {
                if (regex.test(content)) {
                    content = content.replace(regex, '// axios substituiu node-fetch');
                    modificado = true;
                }
            });

            // Garantir que axios está importado
            if (!content.includes("require('axios')") && !content.includes('import axios')) {
                // Encontrar a primeira linha de require e adicionar axios
                const linhas = content.split('\\n');
                let inserido = false;
                
                for (let i = 0; i < linhas.length; i++) {
                    if (linhas[i].includes("require('") && !inserido) {
                        linhas.splice(i, 0, "const axios = require('axios');");
                        inserido = true;
                        modificado = true;
                        break;
                    }
                }
                
                if (inserido) {
                    content = linhas.join('\\n');
                }
            }

            // Converter fetch() para axios.get()
            const conversoes = [
                // fetch simples
                {
                    regex: /const response = await fetch\\(([^)]+)\\);?/g,
                    replace: 'const response = await axios.get($1);'
                },
                // response.json()
                {
                    regex: /response\\.json\\(\\)/g,
                    replace: 'response.data'
                },
                // .then(response => response.json())
                {
                    regex: /\\.then\\(response => response\\.json\\(\\)\\)/g,
                    replace: '.then(response => response.data)'
                },
                // fetch().then
                {
                    regex: /fetch\\(([^)]+)\\)\\.then/g,
                    replace: 'axios.get($1).then'
                }
            ];

            conversoes.forEach(conv => {
                if (conv.regex.test(content)) {
                    content = content.replace(conv.regex, conv.replace);
                    modificado = true;
                }
            });

            if (modificado) {
                fs.writeFileSync(arquivo, content);
                this.fixed++;
                console.log(`      ✅ Corrigido`);
            } else {
                console.log(`      ⏭️ Já estava correto`);
            }

        } catch (error) {
            console.log(`      ❌ Erro: ${error.message}`);
            this.errors++;
        }
    }

    async reinstalarLimpo() {
        console.log('🧹 3. Reinstalação limpa...');
        
        try {
            const { execSync } = require('child_process');
            
            // Remover node_modules e lock
            console.log('   🗑️ Removendo node_modules...');
            if (fs.existsSync('node_modules')) {
                execSync('rm -rf node_modules 2>/dev/null || rmdir /s /q node_modules 2>nul || echo "Removido"', { stdio: 'inherit' });
            }
            
            if (fs.existsSync('package-lock.json')) {
                fs.unlinkSync('package-lock.json');
            }
            
            // Limpar cache
            console.log('   🧹 Limpando cache npm...');
            execSync('npm cache clean --force', { stdio: 'inherit' });
            
            // Instalar
            console.log('   📦 Instalando dependências...');
            execSync('npm install', { stdio: 'inherit' });
            
            console.log('   ✅ Reinstalação concluída');
            
        } catch (error) {
            console.log(`   ❌ Erro na reinstalação: ${error.message}`);
            this.errors++;
        }
    }

    testarSistema() {
        console.log('🧪 4. Testando npm ci...');
        
        try {
            const { execSync } = require('child_process');
            execSync('npm ci --omit=dev', { stdio: 'inherit' });
            console.log('   ✅ npm ci funcionando');
        } catch (error) {
            console.log(`   ❌ npm ci falhou: ${error.message}`);
            this.errors++;
        }
    }
}

// Executar
if (require.main === module) {
    const corretor = new FetchAxiosCorretor();
    corretor.corrigirTudo();
}

module.exports = FetchAxiosCorretor;
