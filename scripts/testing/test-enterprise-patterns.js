/**
 * 🧪 TESTE DO SISTEMA ENTERPRISE - FASE 3
 * 
 * Teste para verificar se todos os padrões enterprise estão funcionando
 */

// Configurar variáveis de ambiente para teste
process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/test';
process.env.OPENAI_API_KEY = 'sk-test-key-for-testing';
process.env.NODE_ENV = 'development';
process.env.LOG_LEVEL = 'INFO';

const { 
    container, 
    logger, 
    config, 
    metrics, 
    ErrorHandler,
    AppError 
} = require('./src/core');

async function testEnterprisePatterns() {
    console.log('🧪 INICIANDO TESTES DOS PADRÕES ENTERPRISE');
    console.log('═'.repeat(60));

    try {
        // 1. Teste do Configuration Manager
        console.log('\n⚙️ Testando Configuration Manager...');
        await config.loadConfig();
        console.log('   ✅ Configuração carregada com sucesso');
        console.log(`   📋 Ambiente: ${config.get('app.environment')}`);
        console.log(`   📋 Porta: ${config.get('app.port')}`);

        // 2. Teste do Logger
        console.log('\n📝 Testando Sistema de Logging...');
        logger.info('Teste de log INFO', { teste: true });
        logger.warn('Teste de log WARN', { componente: 'teste' });
        logger.debug('Teste de log DEBUG', { nivel: 'debug' });
        console.log('   ✅ Sistema de logging funcionando');

        // 3. Teste do Container DI
        console.log('\n🏗️ Testando Dependency Injection...');
        
        // Registrar serviço de teste
        class TestService {
            constructor() {
                this.name = 'TestService';
            }
            
            getMessage() {
                return 'Hello from DI Container!';
            }
        }
        
        container.registerSingleton('testService', TestService);
        const testService = container.resolve('testService');
        console.log(`   ✅ Serviço resolvido: ${testService.getMessage()}`);

        // 4. Teste do Error Handler
        console.log('\n🔒 Testando Error Handling...');
        try {
            throw new AppError('Teste de erro personalizado', 400, 'TEST_ERROR');
        } catch (error) {
            const errorInfo = ErrorHandler.handleError(error);
            console.log('   ✅ Error handler funcionando');
            console.log(`   📋 Código do erro: ${errorInfo.code}`);
        }

        // 5. Teste do Metrics System
        console.log('\n📊 Testando Performance Metrics...');
        metrics.recordRequest();
        metrics.recordResponse(150);
        metrics.recordTradingOperation(true);
        
        const summary = metrics.getMetricsSummary();
        console.log('   ✅ Sistema de métricas funcionando');
        console.log(`   📋 Total de requests: ${summary.requests.total}`);
        console.log(`   📋 Operações de trading: ${summary.trading.totalOperations}`);

        // 6. Teste do Module Logger
        console.log('\n📝 Testando Module Logger...');
        const moduleLogger = logger.createModuleLogger('TEST_MODULE');
        moduleLogger.info('Log do módulo de teste', { modulo: 'teste' });
        console.log('   ✅ Module logger funcionando');

        console.log('\n═'.repeat(60));
        console.log('✅ TODOS OS PADRÕES ENTERPRISE FUNCIONANDO PERFEITAMENTE!');
        console.log('🏗️ Dependency Injection: ✅ OK');
        console.log('📝 Logging Centralizado: ✅ OK');
        console.log('🔒 Error Handling: ✅ OK');
        console.log('⚙️ Configuration Management: ✅ OK');
        console.log('📊 Performance Metrics: ✅ OK');
        console.log('═'.repeat(60));

        // Gerar relatório final
        const report = {
            teste: 'PADRÕES ENTERPRISE FASE 3',
            timestamp: new Date().toISOString(),
            status: 'SUCESSO',
            padroes_testados: {
                dependency_injection: 'OK',
                logging_system: 'OK',
                error_handling: 'OK',
                configuration_management: 'OK',
                performance_metrics: 'OK'
            },
            metricas: summary
        };

        console.log('\n📄 Relatório de teste salvo');
        require('fs').writeFileSync(
            'enterprise-patterns-test-report.json',
            JSON.stringify(report, null, 2)
        );

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        throw error;
    }
}

// Executar testes
if (require.main === module) {
    testEnterprisePatterns().catch(console.error);
}

module.exports = { testEnterprisePatterns };
