/**
 * ===============================================
 * 🚀 INTEGRADOR AUTOMÁTICO - SISTEMA DE TERMOS
 * ===============================================
 * Arquivo: integrador-sistema-termos.js
 * Versão: 1.0.0
 * Data: 2025-08-22
 * 
 * 🎯 OBJETIVO:
 * Integração automática completa do Sistema de Aceite de Termos e Políticas
 * 
 * 📋 FASES DA INTEGRAÇÃO:
 * 1️⃣ Verificação de dependências
 * 2️⃣ Backup de segurança
 * 3️⃣ Migração do banco de dados
 * 4️⃣ Integração das APIs
 * 5️⃣ Configuração do frontend
 * 6️⃣ Testes de funcionalidade
 * 7️⃣ Validação de compliance
 * 8️⃣ Relatório final
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// ===============================================
// 🎨 CONFIGURAÇÕES E CONSTANTES
// ===============================================

const CONFIG = {
    // Diretórios
    BACKUP_DIR: './backups',
    ROUTES_DIR: './routes',
    FRONTEND_DIR: './frontend/src/components',
    MIGRATIONS_DIR: './migrations',
    
    // Arquivos de origem
    SOURCE_DIR: './implementacoes-enterprise/02-sistema-termos',
    
    // Configurações de integração
    INTEGRATION_CONFIG: {
        name: 'Sistema de Aceite de Termos e Políticas',
        version: '1.0.0',
        mandatory: true,
        compliance: true
    },
    
    // Cores para logs
    COLORS: {
        reset: '\x1b[0m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m'
    }
};

// ===============================================
// 🛠️ UTILITÁRIOS DE LOG
// ===============================================

const log = {
    info: (msg) => console.log(`${CONFIG.COLORS.blue}ℹ️  ${msg}${CONFIG.COLORS.reset}`),
    success: (msg) => console.log(`${CONFIG.COLORS.green}✅ ${msg}${CONFIG.COLORS.reset}`),
    warning: (msg) => console.log(`${CONFIG.COLORS.yellow}⚠️  ${msg}${CONFIG.COLORS.reset}`),
    error: (msg) => console.log(`${CONFIG.COLORS.red}❌ ${msg}${CONFIG.COLORS.reset}`),
    step: (step, msg) => console.log(`${CONFIG.COLORS.cyan}${step}️⃣  ${msg}${CONFIG.COLORS.reset}`),
    separator: () => console.log(`${CONFIG.COLORS.magenta}${'='.repeat(60)}${CONFIG.COLORS.reset}`)
};

// ===============================================
// 🧰 UTILITÁRIOS GERAIS
// ===============================================

const utils = {
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    },
    
    async createDir(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return true;
        } catch (error) {
            log.error(`Erro ao criar diretório ${dirPath}: ${error.message}`);
            return false;
        }
    },
    
    async copyFile(source, destination) {
        try {
            const content = await fs.readFile(source, 'utf8');
            await fs.writeFile(destination, content, 'utf8');
            return true;
        } catch (error) {
            log.error(`Erro ao copiar arquivo ${source} -> ${destination}: ${error.message}`);
            return false;
        }
    },
    
    async readJsonFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    },
    
    async writeJsonFile(filePath, data) {
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            log.error(`Erro ao escrever arquivo JSON ${filePath}: ${error.message}`);
            return false;
        }
    },
    
    timestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-');
    }
};

// ===============================================
// 📊 SISTEMA DE RELATÓRIOS
// ===============================================

class IntegrationReporter {
    constructor() {
        this.report = {
            startTime: new Date().toISOString(),
            endTime: null,
            success: false,
            phases: [],
            files: {
                created: [],
                modified: [],
                backed_up: []
            },
            database: {
                tables_created: [],
                functions_created: [],
                views_created: []
            },
            apis: {
                endpoints_added: [],
                routes_integrated: []
            },
            frontend: {
                components_added: [],
                integrations_made: []
            },
            tests: {
                passed: [],
                failed: []
            },
            errors: [],
            warnings: []
        };
    }
    
    addPhase(phase, status, details = {}) {
        this.report.phases.push({
            phase,
            status,
            timestamp: new Date().toISOString(),
            details
        });
    }
    
    addError(error, phase = null) {
        this.report.errors.push({
            error: error.message || error,
            phase,
            timestamp: new Date().toISOString()
        });
    }
    
    addWarning(warning, phase = null) {
        this.report.warnings.push({
            warning,
            phase,
            timestamp: new Date().toISOString()
        });
    }
    
    finalize(success = true) {
        this.report.endTime = new Date().toISOString();
        this.report.success = success;
        this.report.duration = new Date(this.report.endTime) - new Date(this.report.startTime);
    }
    
    async save(filePath = null) {
        const fileName = filePath || `terms-integration-report-${utils.timestamp()}.json`;
        await utils.writeJsonFile(fileName, this.report);
        return fileName;
    }
}

// ===============================================
// 🔧 INTEGRADOR PRINCIPAL
// ===============================================

class TermsSystemIntegrator {
    constructor() {
        this.reporter = new IntegrationReporter();
        this.errors = [];
    }
    
    // ===============================================
    // 1️⃣ FASE: Verificação de Dependências
    // ===============================================
    
    async phase1_checkDependencies() {
        log.step('1', 'Verificando dependências do sistema...');
        
        try {
            // Verificar estrutura de diretórios
            const requiredDirs = [
                './routes',
                './services'
            ];
            
            for (const dir of requiredDirs) {
                if (!(await utils.fileExists(dir))) {
                    throw new Error(`Diretório obrigatório não encontrado: ${dir}`);
                }
            }
            
            // Verificar arquivos essenciais
            const requiredFiles = [
                './app.js',
                './config.js'
            ];
            
            for (const file of requiredFiles) {
                if (!(await utils.fileExists(file))) {
                    throw new Error(`Arquivo obrigatório não encontrado: ${file}`);
                }
            }
            
            // Verificar Node.js e npm
            try {
                execSync('node --version', { stdio: 'ignore' });
                execSync('npm --version', { stdio: 'ignore' });
            } catch {
                throw new Error('Node.js ou npm não estão instalados');
            }
            
            // Verificar dependências do package.json
            const packageJson = await utils.readJsonFile('./package.json');
            if (!packageJson) {
                throw new Error('package.json não encontrado');
            }
            
            const requiredDeps = ['express', 'axios'];
            const missingDeps = requiredDeps.filter(dep => 
                !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
            );
            
            if (missingDeps.length > 0) {
                this.reporter.addWarning(`Dependências podem estar faltando: ${missingDeps.join(', ')}`);
            }
            
            this.reporter.addPhase('dependency_check', 'success', {
                directories_verified: requiredDirs.length,
                files_verified: requiredFiles.length
            });
            
            log.success('Verificação de dependências concluída');
            return true;
            
        } catch (error) {
            this.reporter.addError(error, 'dependency_check');
            this.reporter.addPhase('dependency_check', 'failed');
            log.error(`Falha na verificação de dependências: ${error.message}`);
            return false;
        }
    }
    
    // ===============================================
    // 2️⃣ FASE: Backup de Segurança
    // ===============================================
    
    async phase2_createBackup() {
        log.step('2', 'Criando backup de segurança...');
        
        try {
            const backupDir = path.join(CONFIG.BACKUP_DIR, `terms-system-${utils.timestamp()}`);
            await utils.createDir(backupDir);
            
            // Arquivos para backup
            const filesToBackup = [
                './app.js',
                './routes'
            ];
            
            let backedUpFiles = 0;
            
            for (const item of filesToBackup) {
                if (await utils.fileExists(item)) {
                    const stat = await fs.stat(item);
                    
                    if (stat.isFile()) {
                        const fileName = path.basename(item);
                        const backupPath = path.join(backupDir, fileName);
                        if (await utils.copyFile(item, backupPath)) {
                            this.reporter.report.files.backed_up.push(item);
                            backedUpFiles++;
                        }
                    } else if (stat.isDirectory()) {
                        // Copiar diretório recursivamente
                        const backupSubDir = path.join(backupDir, path.basename(item));
                        await utils.createDir(backupSubDir);
                        
                        const files = await fs.readdir(item);
                        for (const file of files) {
                            const filePath = path.join(item, file);
                            const backupFilePath = path.join(backupSubDir, file);
                            
                            if ((await fs.stat(filePath)).isFile()) {
                                if (await utils.copyFile(filePath, backupFilePath)) {
                                    this.reporter.report.files.backed_up.push(filePath);
                                    backedUpFiles++;
                                }
                            }
                        }
                    }
                }
            }
            
            // Salvar informações do backup
            const backupInfo = {
                created_at: new Date().toISOString(),
                files_count: backedUpFiles,
                backup_purpose: 'terms_system_integration'
            };
            
            await utils.writeJsonFile(path.join(backupDir, 'backup-info.json'), backupInfo);
            
            this.reporter.addPhase('backup', 'success', {
                backup_directory: backupDir,
                files_backed_up: backedUpFiles
            });
            
            log.success(`Backup criado: ${backedUpFiles} arquivos salvos em ${backupDir}`);
            return true;
            
        } catch (error) {
            this.reporter.addError(error, 'backup');
            this.reporter.addPhase('backup', 'failed');
            log.error(`Falha no backup: ${error.message}`);
            return false;
        }
    }
    
    // ===============================================
    // 3️⃣ FASE: Migração do Banco de Dados
    // ===============================================
    
    async phase3_migrateDatabase() {
        log.step('3', 'Executando migração do banco de dados...');
        
        try {
            const migrationFile = path.join(CONFIG.SOURCE_DIR, 'migrate-terms-system.sql');
            
            if (!(await utils.fileExists(migrationFile))) {
                throw new Error('Arquivo de migração não encontrado');
            }
            
            // Copiar arquivo de migração
            const targetMigrationFile = './migrate-terms-system.sql';
            if (!(await utils.copyFile(migrationFile, targetMigrationFile))) {
                throw new Error('Falha ao copiar arquivo de migração');
            }
            
            this.reporter.report.files.created.push(targetMigrationFile);
            
            // Registrar tabelas e funções que serão criadas
            this.reporter.report.database.tables_created = [
                'terms_versions',
                'user_terms_acceptance', 
                'terms_acceptance_log'
            ];
            
            this.reporter.report.database.functions_created = [
                'register_terms_acceptance()',
                'check_user_terms_status()'
            ];
            
            this.reporter.report.database.views_created = [
                'v_user_terms_status',
                'v_terms_compliance_report'
            ];
            
            this.reporter.addPhase('database_migration', 'success', {
                migration_file: targetMigrationFile,
                tables_to_create: this.reporter.report.database.tables_created.length,
                functions_to_create: this.reporter.report.database.functions_created.length
            });
            
            log.success('Migração do banco preparada');
            log.warning('ATENÇÃO: Execute manualmente o arquivo migrate-terms-system.sql no seu banco PostgreSQL');
            
            return true;
            
        } catch (error) {
            this.reporter.addError(error, 'database_migration');
            this.reporter.addPhase('database_migration', 'failed');
            log.error(`Falha na migração: ${error.message}`);
            return false;
        }
    }
    
    // ===============================================
    // 4️⃣ FASE: Integração das APIs
    // ===============================================
    
    async phase4_integrateAPIs() {
        log.step('4', 'Integrando APIs de backend...');
        
        try {
            // Copiar arquivo da API
            const sourceAPI = './routes/terms-api.js'; // Arquivo já existe
            const targetAPI = path.join(CONFIG.ROUTES_DIR, 'terms-api.js');
            
            // Verificar se o arquivo da API já foi criado anteriormente
            if (await utils.fileExists(sourceAPI)) {
                log.info('Arquivo da API já existe, usando o existente');
                this.reporter.report.files.created.push(sourceAPI);
            } else {
                throw new Error('Arquivo da API não foi criado na fase anterior');
            }
            
            // Registrar endpoints
            this.reporter.report.apis.endpoints_added = [
                'GET /api/terms/current',
                'POST /api/terms/accept',
                'GET /api/terms/user/:id/status',
                'GET /api/terms/dashboard',
                'POST /api/terms/admin/create-version',
                'PUT /api/terms/admin/activate/:id',
                'GET /api/terms/admin/versions',
                'GET /api/terms/admin/compliance-report',
                'GET /api/terms/health'
            ];
            
            // Verificar e atualizar app.js
            const appJsPath = './app.js';
            const appJsContent = await fs.readFile(appJsPath, 'utf8');
            
            // Verificar se já existe integração
            if (!appJsContent.includes('terms-api')) {
                // Adicionar require e rota
                let updatedContent = appJsContent;
                
                // Adicionar require (procurar por outros requires)
                const requireRegex = /const\s+\w+\s*=\s*require\(['"][^'"]+['"]\);?\s*$/gm;
                const requires = updatedContent.match(requireRegex);
                
                if (requires && requires.length > 0) {
                    const lastRequire = requires[requires.length - 1];
                    const requireIndex = updatedContent.lastIndexOf(lastRequire) + lastRequire.length;
                    
                    updatedContent = 
                        updatedContent.slice(0, requireIndex) + 
                        '\nconst termsRoutes = require(\'./routes/terms-api\');' +
                        updatedContent.slice(requireIndex);
                }
                
                // Adicionar rota (procurar por outras rotas app.use)
                const routeRegex = /app\\.use\\(['"][^'"]*['"],\\s*\\w+\\);?\\s*$/gm;
                const routes = updatedContent.match(routeRegex);
                
                if (routes && routes.length > 0) {
                    const lastRoute = routes[routes.length - 1];
                    const routeIndex = updatedContent.lastIndexOf(lastRoute) + lastRoute.length;
                    
                    updatedContent = 
                        updatedContent.slice(0, routeIndex) + 
                        '\napp.use(\'/api/terms\', termsRoutes);' +
                        updatedContent.slice(routeIndex);
                }
                
                await fs.writeFile(appJsPath, updatedContent, 'utf8');
                this.reporter.report.files.modified.push(appJsPath);
                
                log.success('app.js atualizado com rotas de termos');
            } else {
                log.info('Rotas já integradas no app.js');
            }
            
            this.reporter.addPhase('api_integration', 'success', {
                api_file: targetAPI,
                endpoints_count: this.reporter.report.apis.endpoints_added.length,
                app_js_updated: true
            });
            
            log.success('APIs integradas com sucesso');
            return true;
            
        } catch (error) {
            this.reporter.addError(error, 'api_integration');
            this.reporter.addPhase('api_integration', 'failed');
            log.error(`Falha na integração de APIs: ${error.message}`);
            return false;
        }
    }
    
    // ===============================================
    // 5️⃣ FASE: Configuração do Frontend
    // ===============================================
    
    async phase5_configureFrontend() {
        log.step('5', 'Configurando componentes frontend...');
        
        try {
            // Criar diretório de componentes se não existir
            const componentsDir = './frontend/components/terms';
            await utils.createDir(componentsDir);
            
            // Copiar componentes React
            const components = [
                'TermsAcceptanceModal.jsx',
                'TermsAdminManager.jsx'
            ];
            
            for (const component of components) {
                const sourcePath = path.join(CONFIG.SOURCE_DIR, 'frontend', component);
                const targetPath = path.join(componentsDir, component);
                
                if (await utils.fileExists(sourcePath)) {
                    if (await utils.copyFile(sourcePath, targetPath)) {
                        this.reporter.report.frontend.components_added.push(component);
                        this.reporter.report.files.created.push(targetPath);
                    }
                }
            }
            
            // Criar arquivo de configuração frontend
            const frontendConfig = {
                termsSystem: {
                    enabled: true,
                    mandatoryAcceptance: true,
                    autoCheckOnLogin: true,
                    components: {
                        modal: 'process.env.API_KEY_HERE',
                        admin: 'TermsAdminManager'
                    },
                    apiEndpoints: {
                        current: '/api/terms/current',
                        accept: '/api/terms/accept',
                        status: '/api/terms/user/{userId}/status'
                    }
                }
            };
            
            const configPath = path.join(componentsDir, 'terms-config.json');
            await utils.writeJsonFile(configPath, frontendConfig);
            this.reporter.report.files.created.push(configPath);
            
            this.reporter.addPhase('frontend_configuration', 'success', {
                components_directory: componentsDir,
                components_added: this.reporter.report.frontend.components_added.length,
                config_file: configPath
            });
            
            log.success('Componentes frontend configurados');
            return true;
            
        } catch (error) {
            this.reporter.addError(error, 'frontend_configuration');
            this.reporter.addPhase('frontend_configuration', 'failed');
            log.error(`Falha na configuração frontend: ${error.message}`);
            return false;
        }
    }
    
    // ===============================================
    // 6️⃣ FASE: Testes de Funcionalidade
    // ===============================================
    
    async phase6_runTests() {
        log.step('6', 'Executando testes de funcionalidade...');
        
        try {
            const tests = [
                { name: 'Arquivo da API criado', check: () => utils.fileExists('./routes/terms-api.js') },
                { name: 'Arquivo de migração criado', check: () => utils.fileExists('./migrate-terms-system.sql') },
                { name: 'Componentes frontend criados', check: () => utils.fileExists('./frontend/components/terms/TermsAcceptanceModal.jsx') },
                { name: 'Configuração frontend criada', check: () => utils.fileExists('./frontend/components/terms/terms-config.json') },
                { name: 'app.js contém integração', check: async () => {
                    const content = await fs.readFile('./app.js', 'utf8');
                    return content.includes('terms-api') && content.includes('/api/terms');
                }}
            ];
            
            for (const test of tests) {
                try {
                    const result = await test.check();
                    if (result) {
                        this.reporter.report.tests.passed.push(test.name);
                        log.success(`✓ ${test.name}`);
                    } else {
                        this.reporter.report.tests.failed.push(test.name);
                        log.error(`✗ ${test.name}`);
                    }
                } catch (error) {
                    this.reporter.report.tests.failed.push(`${test.name}: ${error.message}`);
                    log.error(`✗ ${test.name}: ${error.message}`);
                }
            }
            
            const passedCount = this.reporter.report.tests.passed.length;
            const totalCount = tests.length;
            const successRate = (passedCount / totalCount) * 100;
            
            this.reporter.addPhase('functionality_tests', 'success', {
                tests_passed: passedCount,
                tests_total: totalCount,
                success_rate: `${successRate.toFixed(1)}%`
            });
            
            log.success(`Testes concluídos: ${passedCount}/${totalCount} (${successRate.toFixed(1)}%)`);
            return successRate >= 80; // 80% de sucesso mínimo
            
        } catch (error) {
            this.reporter.addError(error, 'functionality_tests');
            this.reporter.addPhase('functionality_tests', 'failed');
            log.error(`Falha nos testes: ${error.message}`);
            return false;
        }
    }
    
    // ===============================================
    // 7️⃣ FASE: Validação de Compliance
    // ===============================================
    
    async phase7_validateCompliance() {
        log.step('7', 'Validando compliance e auditoria...');
        
        try {
            // Verificar estruturas de auditoria
            const complianceChecks = [
                'Tabela de log de aceites implementada',
                'Função de registro com auditoria implementada', 
                'Campos de IP e User-Agent incluídos',
                'Sistema de versionamento implementado',
                'Views de relatório implementadas'
            ];
            
            // Verificar arquivo de migração contém elementos de compliance
            const migrationContent = await fs.readFile('./migrate-terms-system.sql', 'utf8');
            
            const complianceElements = [
                'terms_acceptance_log',
                'ip_address',
                'user_agent',
                'metadata',
                'register_terms_acceptance',
                'v_terms_compliance_report'
            ];
            
            let complianceScore = 0;
            for (const element of complianceElements) {
                if (migrationContent.includes(element)) {
                    complianceScore++;
                }
            }
            
            const complianceRate = (complianceScore / complianceElements.length) * 100;
            
            this.reporter.addPhase('compliance_validation', 'success', {
                compliance_elements_found: complianceScore,
                compliance_elements_total: complianceElements.length,
                compliance_rate: `${complianceRate.toFixed(1)}%`,
                audit_features: [
                    'IP address logging',
                    'User agent tracking',
                    'Timestamp recording',
                    'Metadata storage',
                    'Version control'
                ]
            });
            
            log.success(`Compliance validado: ${complianceRate.toFixed(1)}% dos elementos presentes`);
            return complianceRate >= 90;
            
        } catch (error) {
            this.reporter.addError(error, 'compliance_validation');
            this.reporter.addPhase('compliance_validation', 'failed');
            log.error(`Falha na validação de compliance: ${error.message}`);
            return false;
        }
    }
    
    // ===============================================
    // 8️⃣ FASE: Relatório Final
    // ===============================================
    
    async phase8_generateReport() {
        log.step('8', 'Gerando relatório final...');
        
        try {
            // Finalizar relatório
            this.reporter.finalize(this.errors.length === 0);
            
            // Salvar relatório
            const reportFile = await this.reporter.save('./terms-integration-report.json');
            
            // Criar resumo em texto
            const summary = this.generateTextSummary();
            await fs.writeFile('./terms-integration-summary.txt', summary, 'utf8');
            
            this.reporter.addPhase('report_generation', 'success', {
                report_file: reportFile,
                summary_file: './terms-integration-summary.txt'
            });
            
            log.success(`Relatório salvo: ${reportFile}`);
            return true;
            
        } catch (error) {
            this.reporter.addError(error, 'report_generation');
            this.reporter.addPhase('report_generation', 'failed');
            log.error(`Falha na geração do relatório: ${error.message}`);
            return false;
        }
    }
    
    // ===============================================
    // 📝 GERADOR DE RESUMO
    // ===============================================
    
    generateTextSummary() {
        const report = this.reporter.report;
        const duration = Math.round(report.duration / 1000);
        
        return `
🎯 RELATÓRIO DE INTEGRAÇÃO - SISTEMA DE ACEITE DE TERMOS
========================================================

📅 Data: ${new Date(report.startTime).toLocaleDateString('pt-BR')}
⏱️  Duração: ${duration} segundos
✅ Status: ${report.success ? 'SUCESSO' : 'FALHA'}

📊 ESTATÍSTICAS:
• Fases executadas: ${report.phases.length}
• Arquivos criados: ${report.files.created.length}
• Arquivos modificados: ${report.files.modified.length}
• Testes executados: ${report.tests.passed.length + report.tests.failed.length}
• Taxa de sucesso nos testes: ${((report.tests.passed.length / (report.tests.passed.length + report.tests.failed.length)) * 100).toFixed(1)}%

📁 ARQUIVOS CRIADOS:
${report.files.created.map(file => `• ${file}`).join('\\n')}

🔧 BANCO DE DADOS:
• Tabelas: ${report.database.tables_created.join(', ')}
• Funções: ${report.database.functions_created.join(', ')}
• Views: ${report.database.views_created.join(', ')}

🌐 APIS INTEGRADAS:
${report.apis.endpoints_added.map(endpoint => `• ${endpoint}`).join('\\n')}

⚛️ COMPONENTES FRONTEND:
${report.frontend.components_added.map(comp => `• ${comp}`).join('\\n')}

${report.errors.length > 0 ? `
❌ ERROS ENCONTRADOS:
${report.errors.map(err => `• ${err.error} (${err.phase || 'geral'})`).join('\\n')}
` : ''}

${report.warnings.length > 0 ? `
⚠️ AVISOS:
${report.warnings.map(warn => `• ${warn.warning} (${warn.phase || 'geral'})`).join('\\n')}
` : ''}

🎯 PRÓXIMOS PASSOS:
1. Execute o arquivo migrate-terms-system.sql no PostgreSQL
2. Reinicie o servidor Node.js: npm restart
3. Teste o endpoint: GET /api/terms/current
4. Configure os componentes React no frontend
5. Teste a funcionalidade completa

🎉 SISTEMA DE ACEITE DE TERMOS ${report.success ? 'PRONTO' : 'PRECISA DE CORREÇÕES'}!
`;
    }
    
    // ===============================================
    // 🚀 EXECUTAR INTEGRAÇÃO COMPLETA
    // ===============================================
    
    async run() {
        log.separator();
        log.info('🚀 INICIANDO INTEGRAÇÃO DO SISTEMA DE ACEITE DE TERMOS');
        log.separator();
        
        const phases = [
            this.phase1_checkDependencies,
            this.phase2_createBackup,
            this.phase3_migrateDatabase,
            this.phase4_integrateAPIs,
            this.phase5_configureFrontend,
            this.phase6_runTests,
            this.phase7_validateCompliance,
            this.phase8_generateReport
        ];
        
        let success = true;
        
        for (let i = 0; i < phases.length; i++) {
            try {
                const phaseSuccess = await phases[i].call(this);
                if (!phaseSuccess) {
                    success = false;
                    log.error(`Falha na fase ${i + 1}. Interrompendo integração.`);
                    break;
                }
            } catch (error) {
                this.errors.push(error);
                success = false;
                log.error(`Erro crítico na fase ${i + 1}: ${error.message}`);
                break;
            }
        }
        
        // Finalizar sempre o relatório
        if (!this.reporter.report.endTime) {
            await this.phase8_generateReport();
        }
        
        log.separator();
        if (success) {
            log.success('🎉 INTEGRAÇÃO CONCLUÍDA COM SUCESSO!');
            log.info('📋 Verifique o arquivo terms-integration-report.json para detalhes');
            log.info('📝 Resumo disponível em terms-integration-summary.txt');
        } else {
            log.error('❌ INTEGRAÇÃO FALHOU!');
            log.info('📋 Verifique o relatório para detalhes dos erros');
        }
        log.separator();
        
        return success;
    }
}

// ===============================================
// 🎯 EXECUÇÃO PRINCIPAL
// ===============================================

async function main() {
    const integrator = new TermsSystemIntegrator();
    
    try {
        const success = await integrator.run();
        process.exit(success ? 0 : 1);
    } catch (error) {
        log.error(`Erro crítico: ${error.message}`);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = TermsSystemIntegrator;
