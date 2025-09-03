/**
 * 🧹 COINBITCLUB MARKETBOT - ORGANIZAÇÃO FINAL DE ARQUIVOS
 * 
 * Script para organizar todos os arquivos soltos na raiz
 * seguindo a estrutura enterprise estabelecida
 * 
 * @author CoinBitClub Enterprise Team
 * @version 4.5.0
 * @date 2025-01-10
 */

const fs = require('fs').promises;
const path = require('path');

class FinalFileOrganizer {
    constructor() {
        this.baseDir = process.cwd();
        this.organizationReport = {
            moved: [],
            skipped: [],
            created: [],
            errors: []
        };
        
        // Estrutura de organização
        this.organizationMap = {
            // Scripts de análise e diagnóstico
            'scripts/analysis/': [
                'analisador-avancado.js',
                'analise-*.js',
                'analyze-*.js',
                'diagnostic*.js',
                'diagnostico*.js',
                'investigation*.js',
                'investigacao*.js',
                'investigar-*.js',
                'investigate-*.js'
            ],
            
            // Scripts de verificação e validação
            'scripts/verification/': [
                'check-*.js',
                'verificar-*.js',
                'verificacao-*.js',
                'verify-*.js',
                'validacao-*.js',
                'validador-*.js'
            ],
            
            // Scripts de deploy e produção
            'scripts/deployment/': [
                'deploy-*.js',
                'deploy-*.ps1',
                'deploy-*.bat',
                'deploy-*.sh',
                'production-*.js',
                'railway-*.js',
                'prepare-*.js',
                'setup-*.js'
            ],
            
            // Scripts de sistema e ativação
            'scripts/system/': [
                'ativacao-*.js',
                'ativador-*.js',
                'ativar-*.js',
                'sistema-*.js',
                'system-*.js',
                'activator*.js',
                'launcher*.js',
                'inicializador-*.js',
                'inicializar-*.js',
                'startup-*.js'
            ],
            
            // Scripts de monitoramento
            'scripts/monitoring/': [
                'monitor-*.js',
                'monitoramento-*.js',
                'monitoring-*.js',
                'real-time-*.js',
                'automatic-*.js'
            ],
            
            // Scripts de teste
            'scripts/testing/': [
                'test-*.js',
                'testar-*.js',
                'teste-*.js',
                'demo-*.js',
                'demonstracao-*.js',
                'bateria-*.js'
            ],
            
            // Scripts de correção e fix
            'scripts/fixes/': [
                'fix-*.js',
                'corretor-*.js',
                'correcoes-*.js',
                'emergency-*.js',
                'auto-fix*.js',
                'patch-*.js',
                'implementar-*.js'
            ],
            
            // Scripts de dados e coleta
            'scripts/data/': [
                'coletor-*.js',
                'collect-*.js',
                'buscar-*.js',
                'data-*.js',
                'database-*.js',
                'top100-*.js',
                'fear-greed-*.js',
                'btc-*.js'
            ],
            
            // Scripts de segurança e limpeza
            'scripts/security/': [
                'security-*.js',
                'clean-*.js',
                'limpar-*.js',
                'limpeza-*.js',
                'safe-*.js',
                'github-*.js',
                'pre-push-*.js'
            ],
            
            // Scripts de utilitários
            'scripts/utils/': [
                'configurar-*.js',
                'atualizar-*.js',
                'adicionar-*.js',
                'criar-*.js',
                'update-*.js',
                'create-*.js',
                'merge-*.js',
                'remove-*.js'
            ],
            
            // Scripts de trading e exchanges
            'scripts/trading/': [
                'real-trading-*.js',
                'trading-*.js',
                'order-*.js',
                'position-*.js',
                'risk-*.js',
                'binance-*.js',
                'bybit-*.js',
                'exchange-*.js'
            ],
            
            // Relatórios
            'docs/reports/': [
                'relatorio-*.js',
                'relatorio-*.json',
                'relatorio-*.md',
                'report*.json',
                '*-report.json',
                'auditoria-*.json',
                'audit-*.json',
                'conformity-*.json',
                'integration-*.json'
            ],
            
            // Arquivos de configuração de ambiente
            'config/environments/': [
                '.env*',
                'railway*.json',
                'railway*.toml',
                'ecosystem.config.js',
                'config*.js'
            ],
            
            // Documentação
            'docs/': [
                '*.md',
                '*.txt',
                'CLEANUP*.md',
                'PLANO*.md',
                'README*.md',
                'RESPOSTA*.txt',
                'terms-*.txt'
            ],
            
            // SQL e banco de dados
            'scripts/database/': [
                '*.sql',
                'migrate-*.sql',
                'database-*.sql'
            ],
            
            // Scripts de shell e batch
            'scripts/shell/': [
                '*.bat',
                '*.ps1',
                '*.sh',
                'acoes-*.bat',
                'iniciar-*.bat',
                'start-*.bat',
                'run-*.bat',
                'comando-*.ps1'
            ],
            
            // Apps e servidores
            'src/apps/': [
                'app-*.js',
                'server-*.js',
                'servidor-*.js',
                'hybrid-*.js',
                'painel-*.js',
                'dashboard-*.js'
            ],
            
            // Integradores e orquestradores
            'src/services/orchestration/': [
                'integrador-*.js',
                'orquestrador-*.js',
                'orchestrator*.js',
                'enterprise-*.js'
            ],
            
            // Sistemas financeiros
            'src/modules/payments/': [
                'financial-*.js',
                'stripe-*.js',
                'commission-*.js',
                'checkout-*.js'
            ],
            
            // Sistemas de IA
            'src/modules/ai/': [
                'ia-*.js',
                'otimizador-*.js',
                'ai-*.js'
            ],
            
            // Utilitários e helpers
            'src/utils/': [
                'connectivity-*.js',
                'encryption-*.js',
                'data-*.js',
                'endpoint-*.js',
                'fetch-*.js',
                'force-*.js',
                'wrapper-*.js'
            ],
            
            // Temporários para revisão
            'temp/review/': [
                'index*.js',
                'main.js',
                'start.js',
                'quick-*.js',
                'simple-*.js',
                'minimal-*.js',
                'final-*.js'
            ]
        };
    }

    async organizeAllFiles() {
        console.log('🧹 INICIANDO ORGANIZAÇÃO FINAL DE ARQUIVOS');
        console.log('═'.repeat(70));

        try {
            // 1. Criar estrutura de diretórios
            await this.createDirectoryStructure();
            
            // 2. Obter lista de arquivos na raiz
            const rootFiles = await this.getRootFiles();
            
            // 3. Organizar arquivos por categoria
            await this.organizeFilesByCategory(rootFiles);
            
            // 4. Tratar arquivos especiais
            await this.handleSpecialFiles();
            
            // 5. Gerar relatório
            await this.generateOrganizationReport();
            
            console.log('\n✅ ORGANIZAÇÃO FINAL CONCLUÍDA COM SUCESSO!');
            console.log('📁 Todos os arquivos foram organizados na estrutura enterprise');
            
        } catch (error) {
            console.error('❌ Erro na organização final:', error.message);
            throw error;
        }
    }

    async createDirectoryStructure() {
        console.log('\n📁 Criando estrutura de diretórios...');
        
        const directories = Object.keys(this.organizationMap);
        
        for (const dir of directories) {
            const fullPath = path.join(this.baseDir, dir);
            try {
                await fs.mkdir(fullPath, { recursive: true });
                this.organizationReport.created.push(dir);
            } catch (error) {
                this.organizationReport.errors.push(`Erro ao criar ${dir}: ${error.message}`);
            }
        }
        
        console.log(`   ✅ ${directories.length} diretórios criados/verificados`);
    }

    async getRootFiles() {
        console.log('\n📋 Identificando arquivos na raiz...');
        
        const items = await fs.readdir(this.baseDir);
        const files = [];
        
        for (const item of items) {
            const itemPath = path.join(this.baseDir, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isFile() && !this.shouldSkipFile(item)) {
                files.push(item);
            }
        }
        
        console.log(`   📄 ${files.length} arquivos encontrados para organização`);
        return files;
    }

    shouldSkipFile(filename) {
        const skipPatterns = [
            'package.json',
            'package-lock.json',
            '.gitignore',
            'Dockerfile',
            'Procfile',
            'app.js', // App principal
            'start-dev.js',
            'start-phase4.js',
            'app-phase4.js'
        ];
        
        // Verificar padrões exatos
        if (skipPatterns.includes(filename)) {
            return true;
        }
        
        // Verificar se é um arquivo enterprise-*.js
        if (filename.startsWith('enterprise-') && filename.endsWith('.js')) {
            return true;
        }
        
        return false;
    }

    async organizeFilesByCategory(files) {
        console.log('\n🗂️ Organizando arquivos por categoria...');
        
        let organized = 0;
        
        for (const file of files) {
            let moved = false;
            
            for (const [targetDir, patterns] of Object.entries(this.organizationMap)) {
                if (this.matchesPatterns(file, patterns)) {
                    await this.moveFile(file, targetDir);
                    organized++;
                    moved = true;
                    break;
                }
            }
            
            if (!moved) {
                // Se não encontrou categoria, mover para temp/review
                await this.moveFile(file, 'temp/review/');
                this.organizationReport.skipped.push(`${file} -> temp/review/ (sem categoria específica)`);
            }
        }
        
        console.log(`   ✅ ${organized} arquivos organizados em categorias`);
    }

    matchesPatterns(filename, patterns) {
        return patterns.some(pattern => {
            if (pattern.includes('*')) {
                // Converter padrão glob para regex
                const regexPattern = pattern
                    .replace(/\./g, '\\.')  // Escapar pontos
                    .replace(/\*/g, '.*');  // Converter * para .*
                const regex = new RegExp(`^${regexPattern}$`);
                return regex.test(filename);
            }
            return filename === pattern;
        });
    }

    async moveFile(filename, targetDir) {
        const sourcePath = path.join(this.baseDir, filename);
        const targetPath = path.join(this.baseDir, targetDir, filename);
        
        try {
            // Verificar se o arquivo de destino já existe
            try {
                await fs.access(targetPath);
                // Se existe, adicionar timestamp
                const ext = path.extname(filename);
                const base = path.basename(filename, ext);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const newFilename = `${base}-${timestamp}${ext}`;
                const newTargetPath = path.join(this.baseDir, targetDir, newFilename);
                
                await fs.rename(sourcePath, newTargetPath);
                this.organizationReport.moved.push(`${filename} -> ${targetDir}${newFilename} (renamed to avoid conflict)`);
            } catch {
                // Arquivo não existe, pode mover normalmente
                await fs.rename(sourcePath, targetPath);
                this.organizationReport.moved.push(`${filename} -> ${targetDir}`);
            }
        } catch (error) {
            this.organizationReport.errors.push(`Erro ao mover ${filename}: ${error.message}`);
        }
    }

    async handleSpecialFiles() {
        console.log('\n🔧 Tratando arquivos especiais...');
        
        // Criar README para temp/review
        const reviewReadme = `# 📋 Arquivos para Revisão

Esta pasta contém arquivos que precisam de revisão manual:

## Instruções:
1. Revise cada arquivo para determinar sua função
2. Mova para a pasta apropriada ou delete se obsoleto
3. Documente decisões importantes

## Categorias sugeridas:
- **src/apps/** - Aplicações principais
- **src/utils/** - Utilitários diversos  
- **scripts/utils/** - Scripts auxiliares
- **temp/archive/** - Arquivos obsoletos para arquivar

Gerado em: ${new Date().toISOString()}
`;
        
        await fs.writeFile(
            path.join(this.baseDir, 'temp', 'review', 'README.md'),
            reviewReadme
        );
        
        console.log('   ✅ README criado em temp/review/');
    }

    async generateOrganizationReport() {
        console.log('\n📊 Gerando relatório de organização...');
        
        const report = {
            fase: 'ORGANIZAÇÃO FINAL DE ARQUIVOS',
            timestamp: new Date().toISOString(),
            summary: {
                totalMoved: this.organizationReport.moved.length,
                totalSkipped: this.organizationReport.skipped.length,
                directoriesCreated: this.organizationReport.created.length,
                errors: this.organizationReport.errors.length
            },
            directories: {
                'scripts/analysis/': 'Scripts de análise e diagnóstico',
                'scripts/verification/': 'Scripts de verificação e validação', 
                'scripts/deployment/': 'Scripts de deploy e produção',
                'scripts/system/': 'Scripts de sistema e ativação',
                'scripts/monitoring/': 'Scripts de monitoramento',
                'scripts/testing/': 'Scripts de teste',
                'scripts/fixes/': 'Scripts de correção',
                'scripts/data/': 'Scripts de coleta de dados',
                'scripts/security/': 'Scripts de segurança',
                'scripts/utils/': 'Scripts utilitários',
                'scripts/trading/': 'Scripts de trading',
                'docs/reports/': 'Relatórios e análises',
                'temp/review/': 'Arquivos para revisão manual'
            },
            details: this.organizationReport
        };

        const reportPath = path.join(this.baseDir, 'docs', 'reports', 'final-organization-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 RELATÓRIO DE ORGANIZAÇÃO:');
        console.log('═'.repeat(50));
        console.log(`📁 Arquivos movidos: ${report.summary.totalMoved}`);
        console.log(`📂 Diretórios criados: ${report.summary.directoriesCreated}`);
        console.log(`⏳ Para revisão: ${report.summary.totalSkipped}`);
        console.log(`❌ Erros: ${report.summary.errors}`);
        console.log('═'.repeat(50));
        console.log(`📄 Relatório salvo em: docs/reports/final-organization-report.json`);
        
        if (report.summary.errors > 0) {
            console.log('\n⚠️ ERROS ENCONTRADOS:');
            this.organizationReport.errors.forEach(error => {
                console.log(`   ❌ ${error}`);
            });
        }
    }
}

// Executar organização
async function main() {
    const organizer = new FinalFileOrganizer();
    await organizer.organizeAllFiles();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { FinalFileOrganizer };
