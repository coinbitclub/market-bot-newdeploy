#!/usr/bin/env node
/**
 * 🧹 ENTERPRISE ROOT CLEANER
 * Organiza raiz mantendo apenas arquivos essenciais
 */

const fs = require('fs').promises;
const path = require('path');

class EnterpriseRootCleaner {
    constructor() {
        this.moved = [];
        this.kept = [];
    }

    async cleanRoot() {
        console.log('🧹 ENTERPRISE ROOT CLEANER');
        console.log('===========================');
        console.log('📂 Organizando raiz para manter apenas essenciais\n');

        try {
            // 1. Definir arquivos essenciais que ficam na raiz
            const essentialFiles = [
                'package.json',
                'package-lock.json',
                'enterprise-orchestrator.js',
                'docker-compose.production.yml',
                'Dockerfile',
                'Procfile',
                '.env',
                '.env.development', 
                '.env.production.example',
                '.gitignore',
                'README.md',
                'ENTERPRISE-CONSOLIDATION-COMPLETE.md',
                'Especificacao_tecnica.txt'
            ];

            // 2. Identificar arquivos para mover
            await this.identifyFilesToMove(essentialFiles);
            
            // 3. Mover arquivos para pastas apropriadas
            await this.moveFilesToFolders();
            
            // 4. Atualizar documentação
            await this.updateDocumentation();
            
            // 5. Verificar sistema ainda funciona
            await this.verifySystem();
            
            console.log('\n✅ RAIZ LIMPA E ORGANIZADA!');
            console.log(`📦 ${this.moved.length} arquivos movidos`);
            console.log(`📁 ${this.kept.length} arquivos essenciais mantidos na raiz`);
            
        } catch (error) {
            console.error('❌ Erro na limpeza:', error.message);
        }
    }

    async identifyFilesToMove(essentialFiles) {
        console.log('🔍 IDENTIFICANDO ARQUIVOS PARA MOVER...');
        
        const files = await fs.readdir('.');
        
        for (const file of files) {
            const stat = await fs.stat(file);
            
            if (stat.isFile() && !essentialFiles.includes(file)) {
                console.log(`📦 Para mover: ${file}`);
                this.moved.push(file);
            } else if (stat.isFile()) {
                console.log(`✅ Manter na raiz: ${file}`);
                this.kept.push(file);
            }
        }
    }

    async moveFilesToFolders() {
        console.log('\n📁 MOVENDO ARQUIVOS PARA PASTAS APROPRIADAS...');
        
        // Mapeamento de arquivos para destinos
        const moveMap = {
            // Arquivos de configuração
            'config.js': 'config/',
            'enterprise-config-phase4.js': 'config/',
            
            // Scripts diversos
            'enterprise-consolidation-executor.js': 'scripts/automation/',
            
            // Documentação MD
            'ANALISE_CONSOLIDACAO_ENTERPRISE.md': 'docs/',
            'CONSOLIDACAO_ENTERPRISE_ESPECIFICACAO.md': 'docs/',
            'CONSOLIDACAO_ENTERPRISE_PLAN.md': 'docs/', 
            'CONSOLIDACAO_ENTERPRISE_SUCESSO.md': 'docs/',
            'PLANO_FASE5.md': 'docs/',
            'PLANO_REORGANIZACAO_ARQUIVOS.md': 'docs/',
            'PLANO_REORGANIZACAO_ENTERPRISE.md': 'docs/',
            'RELATORIO_TESTE_SISTEMA.md': 'docs/',
            'RESUMO_ORGANIZACAO_FINAL.md': 'docs/'
        };

        for (const file of this.moved) {
            try {
                let destination;
                
                if (moveMap[file]) {
                    destination = moveMap[file];
                } else if (file.endsWith('.md')) {
                    destination = 'docs/';
                } else if (file.endsWith('.js') && !file.includes('enterprise-orchestrator')) {
                    destination = 'legacy/';
                } else {
                    destination = 'legacy/';
                }

                // Criar diretório se não existir
                await fs.mkdir(destination, { recursive: true });
                
                // Mover arquivo
                await fs.rename(file, path.join(destination, file));
                console.log(`✅ Movido: ${file} → ${destination}`);
                
            } catch (error) {
                console.log(`⚠️ Erro ao mover ${file}: ${error.message}`);
            }
        }
    }

    async updateDocumentation() {
        console.log('\n📚 ATUALIZANDO DOCUMENTAÇÃO...');
        
        // Mover ENTERPRISE-CONSOLIDATION-COMPLETE.md para raiz se estiver em docs/
        try {
            await fs.access('docs/ENTERPRISE-CONSOLIDATION-COMPLETE.md');
            await fs.rename('docs/ENTERPRISE-CONSOLIDATION-COMPLETE.md', 'ENTERPRISE-CONSOLIDATION-COMPLETE.md');
            console.log('✅ ENTERPRISE-CONSOLIDATION-COMPLETE.md movido para raiz');
        } catch {
            console.log('✅ ENTERPRISE-CONSOLIDATION-COMPLETE.md já está na raiz');
        }

        // Verificar Especificacao_tecnica.txt
        try {
            await fs.access('Especificacao_tecnica.txt');
            console.log('✅ Especificacao_tecnica.txt mantido na raiz');
        } catch {
            console.log('⚠️ Especificacao_tecnica.txt não encontrado');
        }
    }

    async verifySystem() {
        console.log('\n🔍 VERIFICANDO INTEGRIDADE DO SISTEMA...');
        
        // Verificar arquivos essenciais
        const criticalFiles = [
            'package.json',
            'enterprise-orchestrator.js',
            'docker-compose.production.yml',
            'Dockerfile'
        ];

        for (const file of criticalFiles) {
            try {
                await fs.access(file);
                console.log(`✅ Arquivo crítico: ${file}`);
            } catch {
                console.log(`❌ ERRO: Arquivo crítico faltando: ${file}`);
            }
        }

        // Verificar se diretórios importantes existem
        const importantDirs = ['src/', 'config/', 'scripts/', 'docs/', 'tools/'];
        
        for (const dir of importantDirs) {
            try {
                await fs.access(dir);
                console.log(`✅ Diretório: ${dir}`);
            } catch {
                console.log(`⚠️ Diretório faltando: ${dir}`);
            }
        }
    }

    async generateCleanupReport() {
        const report = {
            timestamp: new Date().toISOString(),
            operation: 'Root Directory Cleanup',
            files_moved: this.moved.length,
            files_kept: this.kept.length,
            essential_files: this.kept,
            moved_files: this.moved,
            root_status: 'CLEAN_AND_ORGANIZED'
        };

        const reportPath = 'docs/ROOT_CLEANUP_REPORT.md';
        const markdown = `
# 🧹 RELATÓRIO DE LIMPEZA DA RAIZ

## ✅ LIMPEZA COMPLETA

**Data**: ${new Date().toLocaleString()}
**Status**: RAIZ ORGANIZADA
**Arquivos movidos**: ${this.moved.length}
**Arquivos mantidos**: ${this.kept.length}

## 📁 ARQUIVOS ESSENCIAIS NA RAIZ

${this.kept.map(file => `- ✅ \`${file}\``).join('\n')}

## 📦 ARQUIVOS MOVIDOS

${this.moved.map(file => `- 📦 \`${file}\` → pastas apropriadas`).join('\n')}

## 🎯 ESTRUTURA FINAL DA RAIZ

\`\`\`
market-bot-newdeploy/
├── 📦 package.json                           # Configuração do projeto
├── 📦 package-lock.json                      # Lock das dependências
├── 🚀 enterprise-orchestrator.js             # Orquestrador principal
├── 🐳 docker-compose.production.yml          # Deploy production
├── 🐳 Dockerfile                             # Container config
├── 🌐 Procfile                              # Deploy config
├── 🔧 .env*                                 # Environment variables
├── 📄 .gitignore                            # Git ignore
├── 📚 README.md                             # Documentação principal
├── 📋 ENTERPRISE-CONSOLIDATION-COMPLETE.md   # Documentação enterprise
├── 📄 Especificacao_tecnica.txt             # Especificação técnica
├── 📂 src/                                  # Código fonte
├── 📂 config/                               # Configurações
├── 📂 scripts/                              # Scripts
├── 📂 docs/                                 # Documentação
├── 📂 tools/                                # Ferramentas
├── 📂 legacy/                               # Arquivos antigos
└── ... (outros diretórios)
\`\`\`

## 🎉 BENEFÍCIOS

✅ **Raiz Limpa**: Apenas arquivos essenciais
✅ **Organização**: Arquivos em pastas apropriadas  
✅ **Manutenibilidade**: Estrutura clara e profissional
✅ **Deploy**: Pronto para produção
✅ **Documentação**: Acessível na raiz

---
*Limpeza automática da raiz concluída*
`;

        await fs.writeFile(reportPath, markdown);
        console.log(`✅ Relatório salvo: ${reportPath}`);
    }
}

// Executar limpeza
if (require.main === module) {
    const cleaner = new EnterpriseRootCleaner();
    cleaner.cleanRoot()
        .then(() => cleaner.generateCleanupReport())
        .catch(console.error);
}

module.exports = EnterpriseRootCleaner;
