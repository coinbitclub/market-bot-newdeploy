/**
 * 🔥 TESTE DE CARGA - 1000 USUÁRIOS SIMULTÂNEOS
 * =============================================
 * 
 * Teste de stress para validar performance do CoinBitClub Enterprise
 * Simula 1000+ usuários simultâneos com diferentes cenários
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0 Load Testing Suite
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class LoadTester {
    constructor() {
        this.baseURL = process.env.LOAD_TEST_URL || 'http://localhost:3333';
        this.results = {
            startTime: Date.now(),
            endTime: null,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            maxResponseTime: 0,
            minResponseTime: Infinity,
            responseTimes: [],
            errorTypes: {},
            concurrentUsers: 0,
            requestsPerSecond: 0,
            scenarios: {}
        };
        
        this.scenarios = [
            { name: 'Health Check', weight: 10, endpoint: '/health' },
            { name: 'Dashboard', weight: 20, endpoint: '/dashboard' },
            { name: 'Enterprise API', weight: 25, endpoint: '/api/enterprise/status' },
            { name: 'Trading Status', weight: 15, endpoint: '/api/enterprise/trading/status' },
            { name: 'Métricas', weight: 10, endpoint: '/metrics' },
            { name: '2FA Setup', weight: 10, endpoint: '/api/enterprise/auth/2fa/setup', method: 'POST' },
            { name: 'USD to BRL', weight: 10, endpoint: '/api/enterprise/financial/usd-to-brl/100' }
        ];
    }

    /**
     * 🚀 Executar teste de carga principal
     */
    async runLoadTest() {
        console.log('🔥 INICIANDO TESTE DE CARGA - 1000 USUÁRIOS');
        console.log('==========================================');
        console.log(`🎯 Target URL: ${this.baseURL}`);
        console.log(`⏱️ Início: ${new Date().toISOString()}`);
        
        // Validar se o sistema está online
        const systemCheck = await this.validateSystemHealth();
        if (!systemCheck) {
            console.log('❌ Sistema não está respondendo. Abortando teste.');
            return;
        }

        console.log('✅ Sistema validado. Iniciando testes...\n');

        // Executar diferentes fases de carga
        await this.executePhase1_WarmUp();
        await this.executePhase2_ModerateLoad();
        await this.executePhase3_HeavyLoad();
        await this.executePhase4_StressTest();
        
        // Finalizar e gerar relatório
        this.results.endTime = Date.now();
        this.generateReport();
    }

    /**
     * 🏥 Validar saúde do sistema
     */
    async validateSystemHealth() {
        try {
            console.log('🏥 Validando saúde do sistema...');
            const response = await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
            
            if (response.status === 200) {
                console.log('✅ Sistema saudável e responsivo');
                return true;
            }
            return false;
        } catch (error) {
            console.log(`❌ Sistema não responsivo: ${error.message}`);
            return false;
        }
    }

    /**
     * 🔥 FASE 1: Aquecimento (50 usuários por 30s)
     */
    async executePhase1_WarmUp() {
        console.log('🔥 FASE 1: AQUECIMENTO (50 usuários simultâneos)');
        console.log('===============================================');
        
        const promises = [];
        const users = 50;
        const duration = 30; // segundos
        
        for (let i = 0; i < users; i++) {
            promises.push(this.simulateUser(`warmup_user_${i}`, duration));
        }
        
        await Promise.all(promises);
        console.log('✅ Fase 1 concluída\n');
    }

    /**
     * ⚡ FASE 2: Carga Moderada (200 usuários por 60s)
     */
    async executePhase2_ModerateLoad() {
        console.log('⚡ FASE 2: CARGA MODERADA (200 usuários simultâneos)');
        console.log('==================================================');
        
        const promises = [];
        const users = 200;
        const duration = 60; // segundos
        
        for (let i = 0; i < users; i++) {
            promises.push(this.simulateUser(`moderate_user_${i}`, duration));
        }
        
        await Promise.all(promises);
        console.log('✅ Fase 2 concluída\n');
    }

    /**
     * 🚀 FASE 3: Carga Pesada (500 usuários por 90s)
     */
    async executePhase3_HeavyLoad() {
        console.log('🚀 FASE 3: CARGA PESADA (500 usuários simultâneos)');
        console.log('=================================================');
        
        const promises = [];
        const users = 500;
        const duration = 90; // segundos
        
        for (let i = 0; i < users; i++) {
            promises.push(this.simulateUser(`heavy_user_${i}`, duration));
        }
        
        await Promise.all(promises);
        console.log('✅ Fase 3 concluída\n');
    }

    /**
     * 💥 FASE 4: Teste de Stress (1000 usuários por 120s)
     */
    async executePhase4_StressTest() {
        console.log('💥 FASE 4: TESTE DE STRESS (1000 usuários simultâneos)');
        console.log('=====================================================');
        
        const promises = [];
        const users = 1000;
        const duration = 120; // segundos
        
        for (let i = 0; i < users; i++) {
            promises.push(this.simulateUser(`stress_user_${i}`, duration));
        }
        
        await Promise.all(promises);
        console.log('✅ Fase 4 concluída\n');
    }

    /**
     * 👤 Simular usuário individual
     */
    async simulateUser(userId, durationSeconds) {
        const endTime = Date.now() + (durationSeconds * 1000);
        
        while (Date.now() < endTime) {
            // Escolher cenário aleatório baseado no peso
            const scenario = this.selectScenario();
            await this.executeScenario(scenario, userId);
            
            // Pausa aleatória entre 100ms e 1s
            await this.sleep(Math.random() * 900 + 100);
        }
    }

    /**
     * 🎯 Selecionar cenário baseado no peso
     */
    selectScenario() {
        const random = Math.random() * 100;
        let cumulative = 0;
        
        for (const scenario of this.scenarios) {
            cumulative += scenario.weight;
            if (random <= cumulative) {
                return scenario;
            }
        }
        
        return this.scenarios[0]; // fallback
    }

    /**
     * ⚡ Executar cenário específico
     */
    async executeScenario(scenario, userId) {
        const startTime = Date.now();
        
        try {
            const method = scenario.method || 'GET';
            const config = {
                method,
                url: `${this.baseURL}${scenario.endpoint}`,
                timeout: 10000,
                headers: {
                    'User-Agent': `LoadTest-${userId}`,
                    'X-Load-Test': 'true'
                }
            };

            // Adicionar body para requisições POST
            if (method === 'POST') {
                config.data = { userId, testMode: true };
            }

            const response = await axios(config);
            const responseTime = Date.now() - startTime;
            
            this.recordSuccess(scenario.name, responseTime);
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.recordFailure(scenario.name, error, responseTime);
        }
    }

    /**
     * ✅ Registrar sucesso
     */
    recordSuccess(scenarioName, responseTime) {
        this.results.totalRequests++;
        this.results.successfulRequests++;
        this.results.responseTimes.push(responseTime);
        
        // Atualizar estatísticas de tempo
        if (responseTime > this.results.maxResponseTime) {
            this.results.maxResponseTime = responseTime;
        }
        if (responseTime < this.results.minResponseTime) {
            this.results.minResponseTime = responseTime;
        }
        
        // Registrar por cenário
        if (!this.results.scenarios[scenarioName]) {
            this.results.scenarios[scenarioName] = { success: 0, failures: 0, avgTime: 0 };
        }
        this.results.scenarios[scenarioName].success++;
    }

    /**
     * ❌ Registrar falha
     */
    recordFailure(scenarioName, error, responseTime) {
        this.results.totalRequests++;
        this.results.failedRequests++;
        this.results.responseTimes.push(responseTime);
        
        // Registrar tipo de erro
        const errorType = error.code || error.response?.status || 'UNKNOWN';
        if (!this.results.errorTypes[errorType]) {
            this.results.errorTypes[errorType] = 0;
        }
        this.results.errorTypes[errorType]++;
        
        // Registrar por cenário
        if (!this.results.scenarios[scenarioName]) {
            this.results.scenarios[scenarioName] = { success: 0, failures: 0, avgTime: 0 };
        }
        this.results.scenarios[scenarioName].failures++;
    }

    /**
     * 💤 Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 📊 Gerar relatório final
     */
    generateReport() {
        // Calcular estatísticas
        const duration = (this.results.endTime - this.results.startTime) / 1000;
        this.results.averageResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
        this.results.requestsPerSecond = this.results.totalRequests / duration;
        
        // Calcular percentis
        const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
        const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
        const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
        const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
        const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
        
        console.log('📊 RELATÓRIO FINAL DO TESTE DE CARGA');
        console.log('===================================');
        console.log(`⏱️ Duração total: ${duration.toFixed(2)}s`);
        console.log(`📊 Total de requisições: ${this.results.totalRequests}`);
        console.log(`✅ Requisições bem-sucedidas: ${this.results.successfulRequests}`);
        console.log(`❌ Requisições falhadas: ${this.results.failedRequests}`);
        console.log(`🎯 Taxa de sucesso: ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`);
        console.log(`⚡ Requisições por segundo: ${this.results.requestsPerSecond.toFixed(2)}`);
        
        console.log('\n📈 ESTATÍSTICAS DE TEMPO DE RESPOSTA:');
        console.log(`📊 Tempo médio: ${this.results.averageResponseTime.toFixed(2)}ms`);
        console.log(`⚡ Tempo mínimo: ${this.results.minResponseTime}ms`);
        console.log(`🔥 Tempo máximo: ${this.results.maxResponseTime}ms`);
        console.log(`📊 P50 (mediana): ${p50}ms`);
        console.log(`📊 P90: ${p90}ms`);
        console.log(`📊 P95: ${p95}ms`);
        console.log(`📊 P99: ${p99}ms`);
        
        console.log('\n🎯 RESULTADOS POR CENÁRIO:');
        for (const [scenario, stats] of Object.entries(this.results.scenarios)) {
            const total = stats.success + stats.failures;
            const successRate = (stats.success / total * 100).toFixed(2);
            console.log(`  ${scenario}: ${successRate}% (${stats.success}/${total})`);
        }
        
        if (Object.keys(this.results.errorTypes).length > 0) {
            console.log('\n❌ TIPOS DE ERRO:');
            for (const [errorType, count] of Object.entries(this.results.errorTypes)) {
                console.log(`  ${errorType}: ${count} ocorrências`);
            }
        }
        
        // Avaliar performance
        this.evaluatePerformance();
        
        // Salvar relatório em arquivo
        this.saveReport();
    }

    /**
     * 🎯 Avaliar performance
     */
    evaluatePerformance() {
        console.log('\n🏆 AVALIAÇÃO DE PERFORMANCE:');
        
        const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
        const avgResponseTime = this.results.averageResponseTime;
        const requestsPerSecond = this.results.requestsPerSecond;
        
        let grade = 'F';
        let status = '❌ CRÍTICO';
        
        if (successRate >= 99 && avgResponseTime <= 200 && requestsPerSecond >= 100) {
            grade = 'A+';
            status = '🏆 EXCELENTE';
        } else if (successRate >= 98 && avgResponseTime <= 500 && requestsPerSecond >= 50) {
            grade = 'A';
            status = '✅ MUITO BOM';
        } else if (successRate >= 95 && avgResponseTime <= 1000 && requestsPerSecond >= 25) {
            grade = 'B';
            status = '🟡 BOM';
        } else if (successRate >= 90 && avgResponseTime <= 2000 && requestsPerSecond >= 10) {
            grade = 'C';
            status = '🟠 ACEITÁVEL';
        } else if (successRate >= 80) {
            grade = 'D';
            status = '🔴 FRACO';
        }
        
        console.log(`📊 Nota final: ${grade}`);
        console.log(`🎯 Status: ${status}`);
        
        // Recomendações
        console.log('\n💡 RECOMENDAÇÕES:');
        if (successRate < 95) {
            console.log('  🔧 Melhorar estabilidade do sistema');
        }
        if (avgResponseTime > 1000) {
            console.log('  ⚡ Otimizar tempo de resposta');
        }
        if (requestsPerSecond < 25) {
            console.log('  🚀 Melhorar throughput do sistema');
        }
        if (grade === 'A+' || grade === 'A') {
            console.log('  🎉 Sistema pronto para produção!');
        }
    }

    /**
     * 💾 Salvar relatório em arquivo
     */
    saveReport() {
        const reportData = {
            ...this.results,
            timestamp: new Date().toISOString(),
            testConfig: {
                baseURL: this.baseURL,
                scenarios: this.scenarios
            }
        };
        
        const reportPath = path.join(process.cwd(), 'load-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        
        console.log(`\n📁 Relatório salvo em: ${reportPath}`);
    }
}

// 🚀 Executar teste se chamado diretamente
if (require.main === module) {
    const loadTester = new LoadTester();
    loadTester.runLoadTest().catch(error => {
        console.error('❌ Erro no teste de carga:', error);
        process.exit(1);
    });
}

module.exports = LoadTester;
