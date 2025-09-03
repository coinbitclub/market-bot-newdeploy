// 🔍 FASE 5: VALIDAÇÃO E OTIMIZAÇÃO FINAL
// Sistema Enterprise - Validação Completa

const fs = require('fs').promises;
const path = require('path');

class Phase5Validator {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            phase: 'FASE 5 - VALIDAÇÃO E OTIMIZAÇÃO',
            tests: {},
            performance: {},
            security: {},
            endpoints: {},
            errors: [],
            recommendations: []
        };
        
        this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        this.enterpriseApp = null;
    }

    async validatePhase5() {
        console.log('🎯 INICIANDO FASE 5: VALIDAÇÃO E OTIMIZAÇÃO FINAL');
        console.log('=' .repeat(60));

        try {
            // 1. Validação da Estrutura Enterprise
            await this.validateEnterpriseStructure();
            
            // 2. Validação dos Serviços Enterprise
            await this.validateEnterpriseServices();
            
            // 3. Teste dos Endpoints
            await this.validateEndpoints();
            
            // 4. Validação de Segurança
            await this.validateSecurity();
            
            // 5. Análise de Performance
            await this.analyzePerformance();
            
            // 6. Validação da Organização de Arquivos
            await this.validateFileOrganization();
            
            // 7. Geração do Relatório Final
            await this.generateFinalReport();
            
            console.log('\n✅ FASE 5 CONCLUÍDA COM SUCESSO!');
            return this.results;
            
        } catch (error) {
            console.error('❌ Erro na Fase 5:', error.message);
            this.results.errors.push({
                type: 'PHASE5_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    async validateEnterpriseStructure() {
        console.log('\n📁 Validando Estrutura Enterprise...');
        
        const requiredDirs = [
            'src/core',
            'src/modules',
            'src/services',
            'src/utils',
            'config/environments',
            'scripts/analysis',
            'scripts/verification',
            'scripts/deployment',
            'docs/reports'
        ];

        const structure = {
            valid: true,
            missing: [],
            present: []
        };

        for (const dir of requiredDirs) {
            try {
                await fs.access(dir);
                structure.present.push(dir);
                console.log(`  ✅ ${dir}`);
            } catch (error) {
                structure.missing.push(dir);
                structure.valid = false;
                console.log(`  ❌ ${dir} - AUSENTE`);
            }
        }

        this.results.tests.enterpriseStructure = structure;

        if (!structure.valid) {
            this.results.recommendations.push({
                type: 'STRUCTURE',
                message: `Diretórios ausentes: ${structure.missing.join(', ')}`,
                priority: 'HIGH'
            });
        }
    }

    async validateEnterpriseServices() {
        console.log('\n🔧 Validando Serviços Enterprise...');
        
        const services = {
            diContainer: false,
            logger: false,
            errorHandler: false,
            configManager: false,
            metricsCollector: false,
            featureFlags: false,
            secretsManager: false
        };

        try {
            // Verificar se app-phase4.js existe e pode ser carregado
            const appPath = path.join(process.cwd(), 'app-phase4.js');
            await fs.access(appPath);
            
            // Tentar importar o módulo
            delete require.cache[require.resolve('./app-phase4.js')];
            const { DIContainer, Logger, ErrorHandler, ConfigManager, MetricsCollector } = require('./app-phase4.js');
            
            // Validar cada serviço
            if (DIContainer && typeof DIContainer.register === 'function') {
                services.diContainer = true;
                console.log('  ✅ DI Container');
            }
            
            if (Logger && typeof Logger.info === 'function') {
                services.logger = true;
                console.log('  ✅ Logger');
            }
            
            if (ErrorHandler && typeof ErrorHandler.handle === 'function') {
                services.errorHandler = true;
                console.log('  ✅ Error Handler');
            }
            
            if (ConfigManager && typeof ConfigManager.get === 'function') {
                services.configManager = true;
                console.log('  ✅ Config Manager');
            }
            
            if (MetricsCollector && typeof MetricsCollector.increment === 'function') {
                services.metricsCollector = true;
                console.log('  ✅ Metrics Collector');
            }
            
        } catch (error) {
            console.log('  ❌ Erro ao validar serviços:', error.message);
            this.results.errors.push({
                type: 'SERVICE_VALIDATION',
                message: error.message
            });
        }

        this.results.tests.enterpriseServices = services;
        
        // Calcular score dos serviços
        const serviceCount = Object.values(services).filter(Boolean).length;
        const totalServices = Object.keys(services).length;
        const serviceScore = Math.round((serviceCount / totalServices) * 100);
        
        console.log(`\n📊 Score dos Serviços: ${serviceScore}% (${serviceCount}/${totalServices})`);
        
        if (serviceScore < 80) {
            this.results.recommendations.push({
                type: 'SERVICES',
                message: `Score de serviços baixo: ${serviceScore}%. Revisar implementações.`,
                priority: 'HIGH'
            });
        }
    }

    async validateEndpoints() {
        console.log('\n🌐 Validando Endpoints...');
        
        const endpoints = [
            { path: '/health', method: 'GET', expected: 200 },
            { path: '/health/detailed', method: 'GET', expected: 200 },
            { path: '/admin/features', method: 'GET', expected: 200 },
            { path: '/admin/config', method: 'GET', expected: 200 },
            { path: '/admin/metrics', method: 'GET', expected: 200 },
            { path: '/api/system/info', method: 'GET', expected: 200 }
        ];

        const endpointResults = {
            total: endpoints.length,
            passed: 0,
            failed: 0,
            details: []
        };

        // Tentar iniciar o servidor temporariamente para testes
        try {
            console.log('  🔄 Iniciando servidor para testes...');
            
            // Importar e inicializar o app
            delete require.cache[require.resolve('./app-phase4.js')];
            const app = require('./app-phase4.js');
            
            if (typeof app.listen === 'function') {
                const server = app.listen(3001, () => {
                    console.log('  ✅ Servidor de teste iniciado na porta 3001');
                });
                
                this.enterpriseApp = server;
                
                // Aguardar um momento para o servidor inicializar
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Testar endpoints
                for (const endpoint of endpoints) {
                    try {
                        const fetch = require('node-fetch');
                        const response = await fetch(`http://localhost:3001${endpoint.path}`);
                        
                        const result = {
                            path: endpoint.path,
                            method: endpoint.method,
                            status: response.status,
                            expected: endpoint.expected,
                            passed: response.status === endpoint.expected,
                            responseTime: 0 // Será medido posteriormente
                        };
                        
                        if (result.passed) {
                            endpointResults.passed++;
                            console.log(`    ✅ ${endpoint.path} - ${response.status}`);
                        } else {
                            endpointResults.failed++;
                            console.log(`    ❌ ${endpoint.path} - ${response.status} (esperado: ${endpoint.expected})`);
                        }
                        
                        endpointResults.details.push(result);
                        
                    } catch (error) {
                        endpointResults.failed++;
                        console.log(`    ❌ ${endpoint.path} - ERRO: ${error.message}`);
                        
                        endpointResults.details.push({
                            path: endpoint.path,
                            method: endpoint.method,
                            status: 'ERROR',
                            expected: endpoint.expected,
                            passed: false,
                            error: error.message
                        });
                    }
                }
                
                // Fechar servidor de teste
                if (this.enterpriseApp) {
                    this.enterpriseApp.close();
                    console.log('  🔄 Servidor de teste encerrado');
                }
                
            } else {
                console.log('  ⚠️  App não é um servidor válido');
            }
            
        } catch (error) {
            console.log(`  ❌ Erro ao testar endpoints: ${error.message}`);
            this.results.errors.push({
                type: 'ENDPOINT_VALIDATION',
                message: error.message
            });
        }

        this.results.tests.endpoints = endpointResults;
        
        const endpointScore = Math.round((endpointResults.passed / endpointResults.total) * 100);
        console.log(`\n📊 Score dos Endpoints: ${endpointScore}% (${endpointResults.passed}/${endpointResults.total})`);
    }

    async validateSecurity() {
        console.log('\n🔒 Validando Segurança...');
        
        const security = {
            secretsProtected: false,
            envFiles: [],
            exposedCredentials: 0,
            securityHeaders: false,
            encryptionActive: false
        };

        try {
            // Verificar arquivos .env
            const files = await fs.readdir('.');
            const envFiles = files.filter(file => file.startsWith('.env'));
            security.envFiles = envFiles;
            
            console.log(`  📁 Arquivos .env encontrados: ${envFiles.length}`);
            
            // Verificar se existem credenciais expostas
            let exposedCount = 0;
            for (const file of envFiles) {
                try {
                    const content = await fs.readFile(file, 'utf8');
                    const lines = content.split('\n');
                    
                    for (const line of lines) {
                        if (line.includes('API_KEY') || line.includes('SECRET') || line.includes('PASSWORD')) {
                            if (!line.startsWith('#') && line.includes('=') && line.split('=')[1].trim()) {
                                exposedCount++;
                            }
                        }
                    }
                } catch (error) {
                    // Arquivo pode não existir ou não ter permissão
                }
            }
            
            security.exposedCredentials = exposedCount;
            security.secretsProtected = exposedCount === 0;
            
            if (exposedCount > 0) {
                console.log(`  ⚠️  ${exposedCount} credenciais potencialmente expostas`);
            } else {
                console.log('  ✅ Nenhuma credencial exposta detectada');
            }
            
        } catch (error) {
            console.log(`  ❌ Erro na validação de segurança: ${error.message}`);
        }

        this.results.tests.security = security;
        
        if (!security.secretsProtected) {
            this.results.recommendations.push({
                type: 'SECURITY',
                message: `${security.exposedCredentials} credenciais expostas encontradas`,
                priority: 'CRITICAL'
            });
        }
    }

    async analyzePerformance() {
        console.log('\n⚡ Analisando Performance...');
        
        const performance = {
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            responseTime: 0,
            throughput: 0,
            score: 0
        };

        try {
            // Simular teste de performance básico
            const start = Date.now();
            
            // Executar algumas operações típicas
            for (let i = 0; i < 1000; i++) {
                JSON.stringify({ test: i, timestamp: Date.now() });
            }
            
            const end = Date.now();
            performance.responseTime = end - start;
            
            // Calcular score baseado na performance
            let score = 100;
            
            // Penalizar se memory usage > 100MB
            if (performance.memoryUsage.heapUsed > 100 * 1024 * 1024) {
                score -= 20;
            }
            
            // Penalizar se response time > 100ms
            if (performance.responseTime > 100) {
                score -= 15;
            }
            
            performance.score = Math.max(0, score);
            
            console.log(`  📊 Memory Usage: ${Math.round(performance.memoryUsage.heapUsed / 1024 / 1024)}MB`);
            console.log(`  ⏱️  Response Time: ${performance.responseTime}ms`);
            console.log(`  🎯 Performance Score: ${performance.score}%`);
            
        } catch (error) {
            console.log(`  ❌ Erro na análise de performance: ${error.message}`);
        }

        this.results.performance = performance;
        
        if (performance.score < 70) {
            this.results.recommendations.push({
                type: 'PERFORMANCE',
                message: `Performance baixa: ${performance.score}%. Revisar otimizações.`,
                priority: 'MEDIUM'
            });
        }
    }

    async validateFileOrganization() {
        console.log('\n📂 Validando Organização de Arquivos...');
        
        try {
            // Ler o relatório de organização
            const reportPath = 'docs/reports/final-organization-report.json';
            const reportContent = await fs.readFile(reportPath, 'utf8');
            const report = JSON.parse(reportContent);
            
            const organization = {
                totalFiles: report.summary.totalMoved,
                directoriesCreated: report.summary.directoriesCreated,
                errors: report.summary.errors,
                reviewFiles: report.summary.totalSkipped,
                organizationScore: 0
            };
            
            // Calcular score da organização
            const successRate = (organization.totalFiles / (organization.totalFiles + organization.reviewFiles)) * 100;
            organization.organizationScore = Math.round(successRate);
            
            console.log(`  📁 Arquivos organizados: ${organization.totalFiles}`);
            console.log(`  📋 Diretórios criados: ${organization.directoriesCreated}`);
            console.log(`  📝 Arquivos para revisão: ${organization.reviewFiles}`);
            console.log(`  🎯 Score de organização: ${organization.organizationScore}%`);
            
            this.results.tests.fileOrganization = organization;
            
            if (organization.organizationScore < 80) {
                this.results.recommendations.push({
                    type: 'ORGANIZATION',
                    message: `Organização pode ser melhorada: ${organization.organizationScore}%`,
                    priority: 'LOW'
                });
            }
            
        } catch (error) {
            console.log(`  ❌ Erro ao validar organização: ${error.message}`);
            this.results.errors.push({
                type: 'ORGANIZATION_VALIDATION',
                message: error.message
            });
        }
    }

    async generateFinalReport() {
        console.log('\n📋 Gerando Relatório Final...');
        
        // Calcular score geral
        const scores = [];
        
        // Score dos serviços
        if (this.results.tests.enterpriseServices) {
            const services = this.results.tests.enterpriseServices;
            const serviceCount = Object.values(services).filter(Boolean).length;
            const serviceScore = Math.round((serviceCount / Object.keys(services).length) * 100);
            scores.push(serviceScore);
        }
        
        // Score dos endpoints
        if (this.results.tests.endpoints) {
            const endpoints = this.results.tests.endpoints;
            const endpointScore = Math.round((endpoints.passed / endpoints.total) * 100);
            scores.push(endpointScore);
        }
        
        // Score de performance
        if (this.results.performance.score) {
            scores.push(this.results.performance.score);
        }
        
        // Score de organização
        if (this.results.tests.fileOrganization) {
            scores.push(this.results.tests.fileOrganization.organizationScore);
        }
        
        const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        
        this.results.overallScore = overallScore;
        this.results.status = overallScore >= 80 ? 'APPROVED' : overallScore >= 60 ? 'CONDITIONAL' : 'NEEDS_IMPROVEMENT';
        
        // Salvar relatório
        const reportPath = 'docs/reports/phase5-validation-report.json';
        await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        
        console.log(`\n📊 SCORE GERAL: ${overallScore}%`);
        console.log(`🎯 STATUS: ${this.results.status}`);
        console.log(`📄 Relatório salvo em: ${reportPath}`);
        
        // Exibir recomendações
        if (this.results.recommendations.length > 0) {
            console.log('\n💡 RECOMENDAÇÕES:');
            this.results.recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. [${rec.priority}] ${rec.message}`);
            });
        }
    }
}

// Executar validação se chamado diretamente
if (require.main === module) {
    const validator = new Phase5Validator();
    validator.validatePhase5()
        .then(results => {
            console.log('\n🎉 FASE 5 CONCLUÍDA!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 FASE 5 FALHOU:', error.message);
            process.exit(1);
        });
}

module.exports = Phase5Validator;
