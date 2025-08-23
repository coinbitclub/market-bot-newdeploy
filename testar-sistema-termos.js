/**
 * ===============================================
 * 🧪 SISTEMA DE TESTES - ACEITE DE TERMOS
 * ===============================================
 * Arquivo: testar-sistema-termos.js
 * Versão: 1.0.0
 * Data: 2025-08-22
 * 
 * 🎯 TESTES INCLUÍDOS:
 * ✅ Estrutura de arquivos
 * ✅ Configuração do banco
 * ✅ APIs de backend
 * ✅ Componentes frontend
 * ✅ Integração completa
 */

const fs = require('fs').promises;
const path = require('path');

// ===============================================
// 🎨 CONFIGURAÇÕES E UTILITÁRIOS
// ===============================================

const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${COLORS.blue}ℹ️  ${msg}${COLORS.reset}`),
    success: (msg) => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
    warning: (msg) => console.log(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
    error: (msg) => console.log(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
    test: (msg) => console.log(`${COLORS.cyan}🧪 ${msg}${COLORS.reset}`)
};

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function readFile(filePath) {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch {
        return null;
    }
}

// ===============================================
// 🧪 TESTES DO SISTEMA
// ===============================================

class TermsSystemTester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
    }
    
    async runTest(name, testFn) {
        this.results.total++;
        log.test(`Testando: ${name}`);
        
        try {
            const result = await testFn();
            if (result.success) {
                this.results.passed++;
                log.success(`✓ ${name}${result.details ? ` - ${result.details}` : ''}`);
            } else {
                this.results.failed++;
                log.error(`✗ ${name}${result.reason ? ` - ${result.reason}` : ''}`);
            }
            
            this.results.details.push({
                name,
                success: result.success,
                reason: result.reason || null,
                details: result.details || null
            });
            
        } catch (error) {
            this.results.failed++;
            log.error(`✗ ${name} - Erro: ${error.message}`);
            this.results.details.push({
                name,
                success: false,
                reason: error.message
            });
        }
    }
    
    // ===============================================
    // 📁 TESTE: Estrutura de Arquivos
    // ===============================================
    
    async testFileStructure() {
        const requiredFiles = [
            './routes/terms-api.js',
            './migrate-terms-system.sql',
            './frontend/components/terms/TermsAcceptanceModal.jsx',
            './frontend/components/terms/TermsAdminManager.jsx',
            './frontend/components/terms/terms-config.json'
        ];
        
        let foundFiles = 0;
        const missingFiles = [];
        
        for (const file of requiredFiles) {
            if (await fileExists(file)) {
                foundFiles++;
            } else {
                missingFiles.push(file);
            }
        }
        
        return {
            success: foundFiles === requiredFiles.length,
            details: `${foundFiles}/${requiredFiles.length} arquivos encontrados`,
            reason: missingFiles.length > 0 ? `Arquivos ausentes: ${missingFiles.join(', ')}` : null
        };
    }
    
    // ===============================================
    // 🗄️ TESTE: Migração do Banco
    // ===============================================
    
    async testDatabaseMigration() {
        const migrationFile = './migrate-terms-system.sql';
        
        if (!(await fileExists(migrationFile))) {
            return {
                success: false,
                reason: 'Arquivo de migração não encontrado'
            };
        }
        
        const content = await readFile(migrationFile);
        if (!content) {
            return {
                success: false,
                reason: 'Não foi possível ler o arquivo de migração'
            };
        }
        
        // Verificar elementos essenciais
        const requiredElements = [
            'terms_versions',
            'user_terms_acceptance',
            'terms_acceptance_log',
            'register_terms_acceptance',
            'check_user_terms_status',
            'v_user_terms_status',
            'v_terms_compliance_report'
        ];
        
        let foundElements = 0;
        const missingElements = [];
        
        for (const element of requiredElements) {
            if (content.includes(element)) {
                foundElements++;
            } else {
                missingElements.push(element);
            }
        }
        
        return {
            success: foundElements === requiredElements.length,
            details: `${foundElements}/${requiredElements.length} elementos encontrados`,
            reason: missingElements.length > 0 ? `Elementos ausentes: ${missingElements.join(', ')}` : null
        };
    }
    
    // ===============================================
    // 🔗 TESTE: API Backend
    // ===============================================
    
    async testBackendAPI() {
        const apiFile = './routes/terms-api.js';
        
        if (!(await fileExists(apiFile))) {
            return {
                success: false,
                reason: 'Arquivo da API não encontrado'
            };
        }
        
        const content = await readFile(apiFile);
        if (!content) {
            return {
                success: false,
                reason: 'Não foi possível ler o arquivo da API'
            };
        }
        
        // Verificar endpoints obrigatórios
        const requiredEndpoints = [
            'router.get(\'/current\'',
            'router.post(\'/accept\'',
            'router.get(\'/user/:userId/status\'',
            'router.get(\'/dashboard\'',
            'router.post(\'/admin/create-version\'',
            'router.put(\'/admin/activate/:versionId\'',
            'router.get(\'/admin/versions\'',
            'router.get(\'/admin/compliance-report\'',
            'router.get(\'/health\''
        ];
        
        let foundEndpoints = 0;
        const missingEndpoints = [];
        
        for (const endpoint of requiredEndpoints) {
            if (content.includes(endpoint)) {
                foundEndpoints++;
            } else {
                missingEndpoints.push(endpoint);
            }
        }
        
        // Verificar export
        const hasExport = content.includes('module.exports = router');
        
        return {
            success: foundEndpoints === requiredEndpoints.length && hasExport,
            details: `${foundEndpoints}/${requiredEndpoints.length} endpoints + ${hasExport ? 'export OK' : 'export MISSING'}`,
            reason: !hasExport ? 'Export do router não encontrado' : 
                   missingEndpoints.length > 0 ? `Endpoints ausentes: ${missingEndpoints.join(', ')}` : null
        };
    }
    
    // ===============================================
    // ⚛️ TESTE: Componentes Frontend
    // ===============================================
    
    async testFrontendComponents() {
        const components = [
            {
                file: './frontend/components/terms/TermsAcceptanceModal.jsx',
                requiredElements: ['TermsAcceptanceModal', 'useState', 'useEffect', 'Modal', 'export default']
            },
            {
                file: './frontend/components/terms/TermsAdminManager.jsx',
                requiredElements: ['TermsAdminManager', 'useState', 'useEffect', 'Table', 'export default']
            }
        ];
        
        let componentsOK = 0;
        const issues = [];
        
        for (const component of components) {
            if (!(await fileExists(component.file))) {
                issues.push(`${path.basename(component.file)} não encontrado`);
                continue;
            }
            
            const content = await readFile(component.file);
            if (!content) {
                issues.push(`${path.basename(component.file)} não pôde ser lido`);
                continue;
            }
            
            let elementsFound = 0;
            for (const element of component.requiredElements) {
                if (content.includes(element)) {
                    elementsFound++;
                }
            }
            
            if (elementsFound === component.requiredElements.length) {
                componentsOK++;
            } else {
                issues.push(`${path.basename(component.file)} tem elementos faltando`);
            }
        }
        
        return {
            success: componentsOK === components.length,
            details: `${componentsOK}/${components.length} componentes válidos`,
            reason: issues.length > 0 ? issues.join(', ') : null
        };
    }
    
    // ===============================================
    // 🔧 TESTE: Configuração Frontend
    // ===============================================
    
    async testFrontendConfig() {
        const configFile = './frontend/components/terms/terms-config.json';
        
        if (!(await fileExists(configFile))) {
            return {
                success: false,
                reason: 'Arquivo de configuração não encontrado'
            };
        }
        
        const content = await readFile(configFile);
        if (!content) {
            return {
                success: false,
                reason: 'Não foi possível ler o arquivo de configuração'
            };
        }
        
        try {
            const config = JSON.parse(content);
            
            // Verificar estrutura da configuração
            const hasRequiredStructure = 
                config.termsSystem &&
                config.termsSystem.enabled &&
                config.termsSystem.components &&
                config.termsSystem.apiEndpoints;
            
            return {
                success: hasRequiredStructure,
                details: hasRequiredStructure ? 'Configuração válida' : 'Estrutura inválida',
                reason: !hasRequiredStructure ? 'Estrutura de configuração incompleta' : null
            };
            
        } catch (error) {
            return {
                success: false,
                reason: `JSON inválido: ${error.message}`
            };
        }
    }
    
    // ===============================================
    // 🎯 TESTE: Integração com app.js
    // ===============================================
    
    async testAppIntegration() {
        const appFile = './app.js';
        
        if (!(await fileExists(appFile))) {
            return {
                success: false,
                reason: 'app.js não encontrado'
            };
        }
        
        const content = await readFile(appFile);
        if (!content) {
            return {
                success: false,
                reason: 'Não foi possível ler app.js'
            };
        }
        
        const hasRequire = content.includes('terms-api');
        const hasRoute = content.includes('/api/terms');
        
        return {
            success: hasRequire && hasRoute,
            details: `Require: ${hasRequire ? 'OK' : 'MISSING'}, Route: ${hasRoute ? 'OK' : 'MISSING'}`,
            reason: !hasRequire ? 'Require da API não encontrado' : 
                   !hasRoute ? 'Rota da API não encontrada' : null
        };
    }
    
    // ===============================================
    // 📊 TESTE: Relatório de Integração
    // ===============================================
    
    async testIntegrationReport() {
        const reportFile = './terms-integration-report.json';
        
        if (!(await fileExists(reportFile))) {
            return {
                success: false,
                reason: 'Relatório de integração não encontrado'
            };
        }
        
        const content = await readFile(reportFile);
        if (!content) {
            return {
                success: false,
                reason: 'Não foi possível ler o relatório'
            };
        }
        
        try {
            const report = JSON.parse(content);
            
            const hasRequiredData = 
                report.success !== undefined &&
                report.phases &&
                report.files &&
                report.database &&
                report.apis;
            
            return {
                success: hasRequiredData,
                details: report.success ? 'Integração bem-sucedida' : 'Integração com falhas',
                reason: !hasRequiredData ? 'Dados do relatório incompletos' : null
            };
            
        } catch (error) {
            return {
                success: false,
                reason: `Relatório JSON inválido: ${error.message}`
            };
        }
    }
    
    // ===============================================
    // 🚀 EXECUTAR TODOS OS TESTES
    // ===============================================
    
    async runAllTests() {
        console.log('🧪 INICIANDO TESTES DO SISTEMA DE ACEITE DE TERMOS');
        console.log('='.repeat(60));
        
        await this.runTest('Estrutura de arquivos', () => this.testFileStructure());
        await this.runTest('Migração do banco de dados', () => this.testDatabaseMigration());
        await this.runTest('API de backend', () => this.testBackendAPI());
        await this.runTest('Componentes frontend', () => this.testFrontendComponents());
        await this.runTest('Configuração frontend', () => this.testFrontendConfig());
        await this.runTest('Integração com app.js', () => this.testAppIntegration());
        await this.runTest('Relatório de integração', () => this.testIntegrationReport());
        
        console.log('='.repeat(60));
        this.printSummary();
    }
    
    // ===============================================
    // 📋 RESUMO DOS TESTES
    // ===============================================
    
    printSummary() {
        const successRate = (this.results.passed / this.results.total) * 100;
        
        console.log(`📊 RESUMO DOS TESTES:`);
        console.log(`   Total: ${this.results.total}`);
        console.log(`   Aprovados: ${COLORS.green}${this.results.passed}${COLORS.reset}`);
        console.log(`   Falharam: ${COLORS.red}${this.results.failed}${COLORS.reset}`);
        console.log(`   Taxa de sucesso: ${successRate >= 80 ? COLORS.green : COLORS.red}${successRate.toFixed(1)}%${COLORS.reset}`);
        
        if (this.results.failed > 0) {
            console.log(`\\n❌ TESTES QUE FALHARAM:`);
            this.results.details
                .filter(test => !test.success)
                .forEach(test => {
                    console.log(`   • ${test.name}: ${test.reason}`);
                });
        }
        
        console.log('='.repeat(60));
        
        if (successRate >= 90) {
            log.success('🎉 SISTEMA DE ACEITE DE TERMOS PRONTO! 🎉');
            log.success('✅ PODE SER USADO EM PRODUÇÃO!');
        } else if (successRate >= 70) {
            log.warning('⚠️ Sistema funcional mas precisa de ajustes');
            log.info('🔧 Revise os testes que falharam e faça as correções necessárias');
        } else {
            log.error('❌ Sistema não está pronto para produção');
            log.error('🛠️ Corrija os problemas encontrados antes de prosseguir');
        }
        
        console.log('='.repeat(60));
        console.log('📋 PRÓXIMOS PASSOS:');
        console.log('1. Execute: psql -f migrate-terms-system.sql (banco de dados)');
        console.log('2. Reinicie o servidor: npm restart');
        console.log('3. Teste: GET http://localhost:3000/api/terms/current');
        console.log('4. Configure componentes React no frontend');
        console.log('5. Teste a funcionalidade completa na interface');
    }
}

// ===============================================
// 🎯 EXECUÇÃO PRINCIPAL
// ===============================================

async function main() {
    const tester = new TermsSystemTester();
    await tester.runAllTests();
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(error => {
        log.error(`Erro crítico nos testes: ${error.message}`);
        process.exit(1);
    });
}

module.exports = TermsSystemTester;
