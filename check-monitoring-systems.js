#!/usr/bin/env node

/**
 * 🔍 VERIFICAÇÃO RÁPIDA DOS SISTEMAS DE MONITORAMENTO
 * Verifica se os sistemas estão integrados e funcionando
 */

const axios = require('axios');

class SystemChecker {
    constructor() {
        this.baseUrl = 'https://coinbitclub-market-bot-backend-production.up.railway.app';
        this.results = {
            app_health: null,
            monitoring_tests: {},
            api_endpoints: {},
            integration_status: null
        };
    }

    async checkAppHealth() {
        console.log('🏥 Verificando saúde da aplicação...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/health`, { timeout: 10000 });
            this.results.app_health = {
                status: 'healthy',
                response: response.data
            };
            console.log('✅ Aplicação está online e saudável');
            return true;
        } catch (error) {
            this.results.app_health = {
                status: 'error',
                error: error.message
            };
            console.log('❌ Aplicação offline ou com problemas');
            return false;
        }
    }

    async checkTestEndpoints() {
        console.log('\n🧪 Verificando endpoints de teste...');
        
        const testEndpoints = [
            {
                name: 'available_tests',
                path: '/api/test/available-tests',
                method: 'GET'
            },
            {
                name: 'api_key_error_test',
                path: '/api/test/api-key-error',
                method: 'POST',
                body: {
                    userId: 999,
                    apiKey: 'test_invalid_key',
                    exchange: 'bybit'
                }
            },
            {
                name: 'database_constraint_test',
                path: '/api/test/database-constraint-error',
                method: 'POST',
                body: {
                    errorType: 'duplicate_key',
                    userId: 999
                }
            }
        ];

        for (const endpoint of testEndpoints) {
            try {
                console.log(`🔍 Testando ${endpoint.name}...`);
                
                const config = {
                    method: endpoint.method,
                    url: `${this.baseUrl}${endpoint.path}`,
                    timeout: 15000,
                    headers: { 'Content-Type': 'application/json' }
                };

                if (endpoint.body) {
                    config.data = endpoint.body;
                }

                const response = await axios(config);
                
                this.results.monitoring_tests[endpoint.name] = {
                    status: 'success',
                    statusCode: response.status,
                    response: response.data
                };
                
                console.log(`   ✅ ${endpoint.name}: OK`);

            } catch (error) {
                this.results.monitoring_tests[endpoint.name] = {
                    status: 'error',
                    statusCode: error.response?.status || 'timeout',
                    error: error.response?.data || error.message
                };
                
                console.log(`   ❌ ${endpoint.name}: ${error.response?.status || 'ERROR'}`);
            }
        }
    }

    async checkMonitoringEndpoints() {
        console.log('\n📊 Verificando endpoints de monitoramento...');
        
        const monitoringEndpoints = [
            {
                name: 'monitoring_stats',
                path: '/api/monitoring/stats'
            },
            {
                name: 'monitoring_dashboard',
                path: '/api/monitoring/dashboard'
            },
            {
                name: 'systems_status',
                path: '/api/systems/status'
            },
            {
                name: 'ip_diagnostic',
                path: '/api/ip-diagnostic'
            }
        ];

        for (const endpoint of monitoringEndpoints) {
            try {
                console.log(`🔍 Testando ${endpoint.name}...`);
                
                const response = await axios.get(`${this.baseUrl}${endpoint.path}`, { 
                    timeout: 10000 
                });
                
                this.results.api_endpoints[endpoint.name] = {
                    status: 'available',
                    statusCode: response.status,
                    hasData: !!response.data
                };
                
                console.log(`   ✅ ${endpoint.name}: Disponível`);

            } catch (error) {
                this.results.api_endpoints[endpoint.name] = {
                    status: 'error',
                    statusCode: error.response?.status || 'timeout',
                    error: error.message
                };
                
                console.log(`   ❌ ${endpoint.name}: ${error.response?.status || 'ERROR'}`);
            }
        }
    }

    async generateReport() {
        console.log('\n📋 RELATÓRIO DE VERIFICAÇÃO DOS SISTEMAS');
        console.log('='.repeat(60));

        // 1. Status geral
        const appHealthy = this.results.app_health?.status === 'healthy';
        const testsWorking = Object.values(this.results.monitoring_tests)
            .some(test => test.status === 'success');
        const endpointsWorking = Object.values(this.results.api_endpoints)
            .some(endpoint => endpoint.status === 'available');

        console.log(`\n🎯 STATUS GERAL:`);
        console.log(`   🏥 Aplicação: ${appHealthy ? '✅ Online' : '❌ Offline'}`);
        console.log(`   🧪 Testes: ${testsWorking ? '✅ Funcionando' : '❌ Problemas'}`);
        console.log(`   📊 Monitoramento: ${endpointsWorking ? '✅ Ativo' : '❌ Inativo'}`);

        // 2. Detalhes dos testes
        console.log(`\n🧪 TESTES DE ERRO:`);
        Object.entries(this.results.monitoring_tests).forEach(([name, result]) => {
            const icon = result.status === 'success' ? '✅' : '❌';
            console.log(`   ${icon} ${name}: ${result.statusCode}`);
            
            if (result.status === 'success' && result.response) {
                if (result.response.test) {
                    console.log(`      📝 Teste: ${result.response.test}`);
                }
                if (result.response.message) {
                    console.log(`      💬 Mensagem: ${result.response.message}`);
                }
            }
        });

        // 3. Endpoints de monitoramento
        console.log(`\n📊 ENDPOINTS DE MONITORAMENTO:`);
        Object.entries(this.results.api_endpoints).forEach(([name, result]) => {
            const icon = result.status === 'available' ? '✅' : '❌';
            console.log(`   ${icon} ${name}: ${result.statusCode}`);
        });

        // 4. Resumo de integração
        const successfulTests = Object.values(this.results.monitoring_tests)
            .filter(test => test.status === 'success').length;
        const availableEndpoints = Object.values(this.results.api_endpoints)
            .filter(endpoint => endpoint.status === 'available').length;

        console.log(`\n🎯 RESUMO DE INTEGRAÇÃO:`);
        console.log(`   🧪 Testes funcionais: ${successfulTests}/3`);
        console.log(`   📊 Endpoints ativos: ${availableEndpoints}/4`);
        
        if (appHealthy && successfulTests > 0 && availableEndpoints > 0) {
            console.log(`   🎉 SISTEMAS INTEGRADOS E FUNCIONAIS!`);
            this.results.integration_status = 'success';
        } else {
            console.log(`   ⚠️  Alguns sistemas precisam de atenção`);
            this.results.integration_status = 'partial';
        }

        // 5. Próximos passos
        console.log(`\n🔧 PRÓXIMOS PASSOS RECOMENDADOS:`);
        
        if (!appHealthy) {
            console.log(`   1. ⚡ Verificar deploy no Railway`);
            console.log(`   2. 📊 Verificar logs de erro`);
        }
        
        if (successfulTests === 0) {
            console.log(`   1. 🔍 Verificar integração dos endpoints de teste`);
            console.log(`   2. 📊 Verificar sistema de tratamento de erros`);
        }
        
        if (availableEndpoints === 0) {
            console.log(`   1. 🔧 Verificar inicialização do MonitoringIntegration`);
            console.log(`   2. 📊 Verificar conexão com banco de dados`);
        }

        console.log(`\n📞 COMANDOS PARA TESTE MANUAL:`);
        console.log(`   curl ${this.baseUrl}/health`);
        console.log(`   curl ${this.baseUrl}/api/test/available-tests`);
        console.log(`   curl -X POST ${this.baseUrl}/api/test/api-key-error -H "Content-Type: application/json" -d '{"userId":999,"apiKey":"test","exchange":"bybit"}'`);

        return this.results;
    }

    async run() {
        console.log('🚀 INICIANDO VERIFICAÇÃO DOS SISTEMAS DE MONITORAMENTO');
        console.log('='.repeat(60));
        
        try {
            // 1. Verificar saúde da app
            const appHealthy = await this.checkAppHealth();
            
            if (appHealthy) {
                // 2. Verificar endpoints de teste
                await this.checkTestEndpoints();
                
                // 3. Verificar endpoints de monitoramento
                await this.checkMonitoringEndpoints();
            } else {
                console.log('⚠️ App offline - pulando testes de endpoints');
            }
            
            // 4. Gerar relatório final
            const results = await this.generateReport();
            
            console.log('\n✅ Verificação concluída!');
            return results;
            
        } catch (error) {
            console.error('❌ Erro durante verificação:', error.message);
            throw error;
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const checker = new SystemChecker();
    checker.run().catch(error => {
        console.error('💥 ERRO FATAL:', error.message);
        process.exit(1);
    });
}

module.exports = SystemChecker;
