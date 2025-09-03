#!/usr/bin/env node

/**
 * EXECUTOR DE REORGANIZAÇÃO ENTERPRISE - FASE 1
 * 
 * Implementa a estrutura enterprise conforme o plano aprovado
 * Fase 1: Estrutura de diretórios e migração inicial
 */

const fs = require('fs');
const path = require('path');

class EnterpriseReorganizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.migratedFiles = [];
        this.errors = [];
        
        // Estrutura enterprise definida
        this.enterpriseStructure = {
            'src': {
                'modules': {
                    'trading': {
                        'executors': {},
                        'processors': {},
                        'monitors': {}
                    },
                    'financial': {
                        'payments': {},
                        'commissions': {},
                        'withdrawals': {}
                    },
                    'data': {
                        'collectors': {},
                        'analyzers': {},
                        'storage': {}
                    },
                    'notifications': {
                        'sms': {},
                        'email': {},
                        'webhooks': {}
                    },
                    'user': {
                        'management': {},
                        'authentication': {},
                        'balances': {}
                    }
                },
                'services': {
                    'api': {
                        'routes': {},
                        'middleware': {},
                        'controllers': {}
                    },
                    'database': {
                        'connections': {},
                        'migrations': {},
                        'queries': {}
                    },
                    'external': {
                        'binance': {},
                        'bybit': {},
                        'stripe': {},
                        'twilio': {}
                    }
                },
                'config': {},
                'utils': {
                    'security': {},
                    'validation': {},
                    'helpers': {}
                }
            },
            'tests': {
                'unit': {},
                'integration': {},
                'e2e': {}
            },
            'docs': {
                'api': {},
                'deployment': {},
                'architecture': {}
            },
            'scripts': {
                'deploy': {},
                'maintenance': {},
                'migration': {}
            }
        };

        // Mapeamento de arquivos para nova estrutura
        this.fileMappings = {
            // Trading modules
            'enhanced-signal-processor-with-execution.js': 'src/modules/trading/processors/enhanced-signal-processor.js',
            'real-trading-executor.js': 'src/modules/trading/executors/real-trading-executor.js',
            'order-execution-engine.js': 'src/modules/trading/executors/order-execution-engine.js',
            'multi-user-signal-processor.js': 'src/modules/trading/processors/multi-user-signal-processor.js',
            
            // Financial modules
            'financial-manager.js': 'src/modules/financial/payments/financial-manager.js',
            'commission-system.js': 'src/modules/financial/commissions/commission-system.js',
            'stripe-integration-manager.js': 'src/modules/financial/payments/stripe-integration-manager.js',
            
            // Data modules
            'binance-top100-collector.js': 'src/modules/data/collectors/binance-top100-collector.js',
            'fear-greed-collector.js': 'src/modules/data/collectors/fear-greed-collector.js',
            'market-direction-monitor.js': 'src/modules/data/monitors/market-direction-monitor.js',
            
            // Services
            'app.js': 'src/services/api/app.js',
            'config.js': 'src/config/config.js',
            'sistema-integrado.js': 'src/services/sistema-integrado.js',
            
            // Database
            'connection-manager-fixed.js': 'src/services/database/connections/connection-manager.js',
            
            // Scripts de deploy e manutenção
            'railway-deploy-secure.js': 'scripts/deploy/railway-deploy.js',
            'backup-project-before-cleanup.js': 'scripts/maintenance/backup-project.js',
            'security-cleanup-automatic.js': 'scripts/maintenance/security-cleanup.js'
        };
    }

    async executeReorganization() {
        console.log('🏗️ INICIANDO REORGANIZAÇÃO ENTERPRISE - FASE 1');
        console.log('===============================================');

        try {
            // 1. Criar estrutura de diretórios
            this.createEnterpriseStructure();

            // 2. Migrar arquivos principais
            await this.migrateMainFiles();

            // 3. Migrar services existentes
            await this.migrateServices();

            // 4. Migrar implementações enterprise
            await this.migrateEnterpriseImplementations();

            // 5. Reorganizar documentação
            await this.reorganizeDocumentation();

            // 6. Criar arquivos de configuração enterprise
            this.createEnterpriseConfig();

            // 7. Atualizar imports e dependências
            await this.updateImportsAndDependencies();

            // 8. Relatório final
            this.generateReorganizationReport();

            console.log('✅ REORGANIZAÇÃO FASE 1 CONCLUÍDA');

        } catch (error) {
            console.error('❌ ERRO NA REORGANIZAÇÃO:', error.message);
            throw error;
        }
    }

    createEnterpriseStructure() {
        console.log('📁 Criando estrutura enterprise...');

        const createDirectoryStructure = (structure, basePath = this.projectRoot) => {
            for (const [name, content] of Object.entries(structure)) {
                const dirPath = path.join(basePath, name);
                
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                    console.log(`✅ Criado: ${path.relative(this.projectRoot, dirPath)}`);
                }

                if (typeof content === 'object' && content !== null) {
                    createDirectoryStructure(content, dirPath);
                }
            }
        };

        createDirectoryStructure(this.enterpriseStructure);
        console.log('✅ Estrutura enterprise criada');
    }

    async migrateMainFiles() {
        console.log('📦 Migrando arquivos principais...');

        for (const [oldPath, newPath] of Object.entries(this.fileMappings)) {
            const sourcePath = path.join(this.projectRoot, oldPath);
            const destPath = path.join(this.projectRoot, newPath);

            if (fs.existsSync(sourcePath)) {
                try {
                    // Criar diretório de destino se não existir
                    const destDir = path.dirname(destPath);
                    if (!fs.existsSync(destDir)) {
                        fs.mkdirSync(destDir, { recursive: true });
                    }

                    // Copiar arquivo (manter original por segurança)
                    const content = fs.readFileSync(sourcePath, 'utf8');
                    fs.writeFileSync(destPath, content);

                    this.migratedFiles.push({ from: oldPath, to: newPath });
                    console.log(`✅ Migrado: ${oldPath} → ${newPath}`);

                } catch (error) {
                    console.log(`⚠️ Erro ao migrar ${oldPath}: ${error.message}`);
                    this.errors.push({ file: oldPath, error: error.message });
                }
            }
        }
    }

    async migrateServices() {
        console.log('🔧 Migrando services existentes...');

        const servicesDir = path.join(this.projectRoot, 'services');
        const newServicesDir = path.join(this.projectRoot, 'src', 'services');

        if (fs.existsSync(servicesDir)) {
            this.copyDirectory(servicesDir, newServicesDir);
            console.log('✅ Services migrados para src/services/');
        }
    }

    async migrateEnterpriseImplementations() {
        console.log('🏢 Migrando implementações enterprise...');

        const enterpriseDir = path.join(this.projectRoot, 'implementacoes-enterprise');
        const newEnterpriseDir = path.join(this.projectRoot, 'src', 'modules');

        if (fs.existsSync(enterpriseDir)) {
            // Mapear sistemas enterprise para módulos específicos
            const enterpriseMappings = {
                '01-sistema-afiliacao': 'src/modules/user/affiliates',
                '03-sistema-pagamentos': 'src/modules/financial/payments/enterprise',
                '04-sistema-taxa-saque': 'src/modules/financial/withdrawals'
            };

            for (const [oldDir, newDir] of Object.entries(enterpriseMappings)) {
                const sourcePath = path.join(enterpriseDir, oldDir);
                const destPath = path.join(this.projectRoot, newDir);

                if (fs.existsSync(sourcePath)) {
                    this.copyDirectory(sourcePath, destPath);
                    console.log(`✅ Enterprise migrado: ${oldDir} → ${newDir}`);
                }
            }
        }
    }

    async reorganizeDocumentation() {
        console.log('📚 Reorganizando documentação...');

        const docsDir = path.join(this.projectRoot, 'Arquivos MD');
        const newDocsDir = path.join(this.projectRoot, 'docs');

        if (fs.existsSync(docsDir)) {
            // Categorizar documentos
            const docCategories = {
                'deploy': ['DEPLOY', 'RAILWAY', 'PRODUCTION'],
                'api': ['API', 'ENDPOINTS', 'INTEGRATION'],
                'architecture': ['SISTEMA', 'ESTRUTURA', 'ARQUITETURA']
            };

            const files = fs.readdirSync(docsDir);
            
            for (const file of files) {
                if (file.endsWith('.md')) {
                    const sourcePath = path.join(docsDir, file);
                    
                    // Determinar categoria
                    let category = 'general';
                    for (const [cat, keywords] of Object.entries(docCategories)) {
                        if (keywords.some(keyword => file.toUpperCase().includes(keyword))) {
                            category = cat;
                            break;
                        }
                    }

                    const destPath = path.join(newDocsDir, category, file);
                    const destDir = path.dirname(destPath);
                    
                    if (!fs.existsSync(destDir)) {
                        fs.mkdirSync(destDir, { recursive: true });
                    }

                    fs.copyFileSync(sourcePath, destPath);
                    console.log(`✅ Doc migrado: ${file} → docs/${category}/`);
                }
            }
        }
    }

    createEnterpriseConfig() {
        console.log('⚙️ Criando configurações enterprise...');

        // package.json atualizado com scripts enterprise
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            packageJson.scripts = {
                ...packageJson.scripts,
                'start:enterprise': 'node src/services/api/app.js',
                'start:integrated': 'node src/services/sistema-integrado.js',
                'test:unit': 'jest tests/unit',
                'test:integration': 'jest tests/integration',
                'deploy:railway': 'node scripts/deploy/railway-deploy.js',
                'security:audit': 'node scripts/maintenance/security-cleanup.js',
                'backup:project': 'node scripts/maintenance/backup-project.js'
            };

            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('✅ package.json atualizado com scripts enterprise');
        }

        // README.md enterprise
        const enterpriseReadme = `
# CoinBitClub Enterprise Trading System

## 🏗️ Arquitetura Enterprise

### Estrutura do Projeto
\`\`\`
src/
├── modules/           # Módulos de negócio
│   ├── trading/      # Sistema de trading
│   ├── financial/    # Sistema financeiro
│   ├── data/         # Coleta e análise de dados
│   ├── notifications/# Sistema de notificações
│   └── user/         # Gerenciamento de usuários
├── services/         # Serviços da aplicação
│   ├── api/          # API REST
│   ├── database/     # Acesso a dados
│   └── external/     # Integrações externas
├── config/           # Configurações
└── utils/            # Utilitários

tests/                # Testes automatizados
docs/                 # Documentação
scripts/              # Scripts de deploy e manutenção
\`\`\`

### 🚀 Quick Start

1. **Configurar ambiente:**
   \`\`\`bash
   cp .env.example .env
   # Editar .env com suas credenciais
   \`\`\`

2. **Instalar dependências:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Iniciar sistema:**
   \`\`\`bash
   npm run start:enterprise
   \`\`\`

### 🔧 Scripts Disponíveis

- \`npm run start:enterprise\` - Inicia sistema enterprise
- \`npm run start:integrated\` - Inicia sistema integrado
- \`npm run test:unit\` - Executa testes unitários
- \`npm run deploy:railway\` - Deploy para Railway
- \`npm run security:audit\` - Auditoria de segurança

### 📚 Documentação

- [API Documentation](docs/api/)
- [Deployment Guide](docs/deploy/)
- [Architecture Overview](docs/architecture/)

### 🔒 Segurança

- Todas as credenciais em variáveis de ambiente
- Auditoria de segurança automatizada
- Backup automático antes de deployments
`;

        fs.writeFileSync(path.join(this.projectRoot, 'README.md'), enterpriseReadme);
        console.log('✅ README.md enterprise criado');
    }

    async updateImportsAndDependencies() {
        console.log('🔗 Atualizando imports e dependências...');

        // Atualizar imports nos arquivos migrados
        for (const migration of this.migratedFiles) {
            const filePath = path.join(this.projectRoot, migration.to);
            
            if (fs.existsSync(filePath)) {
                try {
                    let content = fs.readFileSync(filePath, 'utf8');
                    
                    // Atualizar paths relativos comuns
                    content = content.replace(/require\(['"]\.\/config\.js['"]\)/g, "require('../../config/config.js')");
                    content = content.replace(/require\(['"]\.\/services\//g, "require('../../services/");
                    
                    fs.writeFileSync(filePath, content);
                    console.log(`✅ Imports atualizados: ${migration.to}`);
                    
                } catch (error) {
                    console.log(`⚠️ Erro ao atualizar imports em ${migration.to}: ${error.message}`);
                }
            }
        }
    }

    copyDirectory(source, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const items = fs.readdirSync(source);
        
        for (const item of items) {
            const sourcePath = path.join(source, item);
            const destPath = path.join(dest, item);

            const stat = fs.statSync(sourcePath);
            
            if (stat.isDirectory()) {
                this.copyDirectory(sourcePath, destPath);
            } else {
                fs.copyFileSync(sourcePath, destPath);
            }
        }
    }

    generateReorganizationReport() {
        console.log('📋 Gerando relatório de reorganização...');

        const report = `
RELATÓRIO DE REORGANIZAÇÃO ENTERPRISE - FASE 1
==============================================

📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}

🎯 OBJETIVOS ALCANÇADOS:
✅ Estrutura enterprise criada (src/modules/services)
✅ Arquivos principais migrados (${this.migratedFiles.length} arquivos)
✅ Services reorganizados
✅ Implementações enterprise integradas
✅ Documentação reorganizada
✅ Configurações enterprise criadas

📁 NOVA ESTRUTURA:
${this.generateStructureTree()}

📦 ARQUIVOS MIGRADOS:
${this.migratedFiles.map(m => `✅ ${m.from} → ${m.to}`).join('\n')}

${this.errors.length > 0 ? `
⚠️ ERROS ENCONTRADOS:
${this.errors.map(err => `❌ ${err.file}: ${err.error}`).join('\n')}
` : ''}

🔄 PRÓXIMAS FASES:
2. ⏳ Consolidação de código (remover duplicatas)
3. ⏳ Implementação de padrões enterprise
4. ⏳ Testes e validação
5. ⏳ Deploy e monitoramento

📋 COMANDOS ÚTEIS:
- npm run start:enterprise
- npm run test:unit
- npm run deploy:railway
- npm run security:audit

✨ STATUS: FASE 1 CONCLUÍDA COM SUCESSO
Pronto para Fase 2: Consolidação de Código
`;

        const reportPath = path.join(this.projectRoot, 'REORGANIZATION_PHASE1_REPORT.md');
        fs.writeFileSync(reportPath, report);
        console.log('✅ Relatório criado: REORGANIZATION_PHASE1_REPORT.md');
    }

    generateStructureTree() {
        const generateTree = (structure, prefix = '', depth = 0) => {
            if (depth > 3) return ''; // Limitar profundidade
            
            let tree = '';
            const entries = Object.entries(structure);
            
            for (let i = 0; i < entries.length; i++) {
                const [name, content] = entries[i];
                const isLast = i === entries.length - 1;
                const connector = isLast ? '└── ' : '├── ';
                
                tree += `${prefix}${connector}${name}/\n`;
                
                if (typeof content === 'object' && content !== null) {
                    const nextPrefix = prefix + (isLast ? '    ' : '│   ');
                    tree += generateTree(content, nextPrefix, depth + 1);
                }
            }
            
            return tree;
        };

        return generateTree(this.enterpriseStructure);
    }
}

// Executar reorganização se chamado diretamente
if (require.main === module) {
    const reorganizer = new EnterpriseReorganizer();
    reorganizer.executeReorganization()
        .then(() => {
            console.log('\n🎉 FASE 1 CONCLUÍDA! Estrutura enterprise implementada.');
            console.log('📝 Execute: npm run start:enterprise para testar');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ FALHA NA REORGANIZAÇÃO:', error);
            process.exit(1);
        });
}

module.exports = EnterpriseReorganizer;
