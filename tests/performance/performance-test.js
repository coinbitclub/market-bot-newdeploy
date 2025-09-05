/**
 * 🎯 TESTE DE PERFORMANCE - MÉTRICAS DETALHADAS
 * =============================================
 * 
 * Teste focado em performance e otimização do sistema
 * Coleta métricas detalhadas de CPU, memória e latência
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0 Performance Testing Suite
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PerformanceTester {
    constructor() {
        this.baseURL = process.env.PERF_TEST_URL || 'http://localhost:3333';
        this.results = {
            timestamp: new Date().toISOString(),
            systemMetrics: {},
            endpointMetrics: {},
            performanceScore: 0,
            recommendations: []
        };
        
        this.endpoints = [
            { name: 'Health Check', url: '/health', expectedTime: 100 },
            { name: 'Dashboard', url: '/dashboard', expectedTime: 300 },
            { name: 'Enterprise Status', url: '/api/enterprise/status', expectedTime: 200 },
            { name: 'Prometheus Metrics', url: '/metrics', expectedTime: 500 },
            { name: 'Cache Stats', url: '/api/enterprise/cache/stats', expectedTime: 200 },
            { name: 'Database Stats', url: '/api/enterprise/database/stats', expectedTime: 150 },
            { name: 'Trading Status', url: '/api/enterprise/trading/status', expectedTime: 150 },
            { name: 'AI Rate Limiter', url: '/api/enterprise/ai/rate-limiter/stats', expectedTime: 100 }
        ];
    }

    /**
     * 🚀 Executar teste de performance
     */
    async runPerformanceTest() {
        console.log('🎯 INICIANDO TESTE DE PERFORMANCE DETALHADO');
        console.log('==========================================');
        console.log(`🎯 Target URL: ${this.baseURL}`);
        console.log(`⏱️ Início: ${new Date().toISOString()}\n`);

        // 1. Validar sistema
        const systemHealthy = await this.validateSystem();
        if (!systemHealthy) {
            console.log('❌ Sistema não está saudável. Abortando teste.');
            return;
        }

        // 2. Coletar métricas do sistema
        await this.collectSystemMetrics();

        // 3. Testar performance de endpoints
        await this.testEndpointPerformance();

        // 4. Teste de concorrência
        await this.testConcurrency();

        // 5. Análise de memory leaks
        await this.testMemoryUsage();

        // 6. Gerar relatório final
        this.generatePerformanceReport();
    }

    /**
     * 🏥 Validar sistema
     */
    async validateSystem() {
        try {
            console.log('🏥 Validando sistema...');
            const response = await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
            
            if (response.status === 200) {
                console.log('✅ Sistema validado com sucesso\n');
                return true;
            }
            return false;
        } catch (error) {
            console.log(`❌ Falha na validação: ${error.message}`);
            return false;
        }
    }

    /**
     * 📊 Coletar métricas do sistema
     */
    async collectSystemMetrics() {
        console.log('📊 COLETANDO MÉTRICAS DO SISTEMA');
        console.log('==============================');

        try {
            // Coletar métricas Prometheus
            const metricsResponse = await axios.get(`${this.baseURL}/metrics`);
            const metricsText = metricsResponse.data;
            
            // Extrair métricas específicas
            this.results.systemMetrics = {
                uptime: this.extractMetric(metricsText, 'coinbitclub_uptime_seconds'),
                memoryUsage: this.extractMetric(metricsText, 'coinbitclub_nodejs_heap_size_used_bytes'),
                eventLoopLag: this.extractMetric(metricsText, 'coinbitclub_nodejs_eventloop_lag_seconds'),
                httpRequests: this.extractMetric(metricsText, 'coinbitclub_http_requests_total'),
                activeConnections: this.extractMetric(metricsText, 'coinbitclub_http_active_connections'),
                processUptime: process.uptime()
            };

            console.log(`✅ Uptime do sistema: ${this.results.systemMetrics.uptime}s`);
            console.log(`📊 Uso de memória: ${(this.results.systemMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
            console.log(`⚡ Event Loop Lag: ${(this.results.systemMetrics.eventLoopLag * 1000).toFixed(2)}ms`);
            console.log(`🔗 Conexões ativas: ${this.results.systemMetrics.activeConnections}\n`);

        } catch (error) {
            console.log(`⚠️ Erro ao coletar métricas: ${error.message}\n`);
        }
    }

    /**
     * 📈 Extrair métrica específica
     */
    extractMetric(metricsText, metricName) {
        const regex = new RegExp(`${metricName}[^\\n]*?([0-9.]+)(?:\\s|$)`, 'i');
        const match = metricsText.match(regex);
        return match ? parseFloat(match[1]) : 0;
    }

    /**
     * ⚡ Testar performance de endpoints
     */
    async testEndpointPerformance() {
        console.log('⚡ TESTANDO PERFORMANCE DE ENDPOINTS');
        console.log('=================================');

        for (const endpoint of this.endpoints) {
            console.log(`🎯 Testando ${endpoint.name}...`);
            
            const metrics = await this.measureEndpointPerformance(endpoint);
            this.results.endpointMetrics[endpoint.name] = metrics;
            
            const status = metrics.avgTime <= endpoint.expectedTime ? '✅' : '⚠️';
            console.log(`  ${status} Tempo médio: ${metrics.avgTime.toFixed(2)}ms (esperado: ${endpoint.expectedTime}ms)`);
            console.log(`  📊 Min/Max: ${metrics.minTime}ms / ${metrics.maxTime}ms`);
            console.log(`  🎯 Taxa de sucesso: ${metrics.successRate.toFixed(2)}%\n`);
        }
    }

    /**
     * 📏 Medir performance de um endpoint
     */
    async measureEndpointPerformance(endpoint) {
        const measurements = [];
        const iterations = 20;
        let successCount = 0;

        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            
            try {
                const response = await axios.get(`${this.baseURL}${endpoint.url}`, { 
                    timeout: 10000 
                });
                
                if (response.status === 200) {
                    successCount++;
                }
                
                const responseTime = Date.now() - startTime;
                measurements.push(responseTime);
                
            } catch (error) {
                const responseTime = Date.now() - startTime;
                measurements.push(responseTime);
            }
            
            // Pequena pausa entre requisições
            await this.sleep(50);
        }

        // Calcular estatísticas
        const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        const minTime = Math.min(...measurements);
        const maxTime = Math.max(...measurements);
        const successRate = (successCount / iterations) * 100;

        return {
            avgTime,
            minTime,
            maxTime,
            successRate,
            measurements
        };
    }

    /**
     * 🔄 Testar concorrência
     */
    async testConcurrency() {
        console.log('🔄 TESTE DE CONCORRÊNCIA');
        console.log('======================');

        const concurrencyLevels = [5, 10, 25, 50];
        const concurrencyResults = {};

        for (const level of concurrencyLevels) {
            console.log(`🎯 Testando ${level} requisições simultâneas...`);
            
            const startTime = Date.now();
            const promises = [];
            
            for (let i = 0; i < level; i++) {
                promises.push(axios.get(`${this.baseURL}/health`, { timeout: 10000 }));
            }
            
            try {
                await Promise.all(promises);
                const totalTime = Date.now() - startTime;
                const avgTimePerRequest = totalTime / level;
                
                concurrencyResults[level] = {
                    totalTime,
                    avgTimePerRequest,
                    success: true
                };
                
                console.log(`  ✅ Sucesso em ${totalTime}ms (${avgTimePerRequest.toFixed(2)}ms por req)`);
                
            } catch (error) {
                const totalTime = Date.now() - startTime;
                concurrencyResults[level] = {
                    totalTime,
                    success: false,
                    error: error.message
                };
                
                console.log(`  ❌ Falha em ${totalTime}ms: ${error.message}`);
            }
        }
        
        this.results.concurrencyResults = concurrencyResults;
        console.log('');
    }

    /**
     * 🧠 Testar uso de memória
     */
    async testMemoryUsage() {
        console.log('🧠 TESTE DE USO DE MEMÓRIA');
        console.log('========================');

        // Coletar baseline
        const baseline = await this.collectMemoryMetrics();
        console.log(`📊 Baseline de memória: ${baseline.heapUsed}MB`);

        // Executar carga de trabalho
        console.log('🔄 Executando carga de trabalho...');
        const promises = [];
        for (let i = 0; i < 100; i++) {
            promises.push(axios.get(`${this.baseURL}/api/enterprise/status`));
        }
        await Promise.all(promises);

        // Aguardar um pouco para coleta de lixo
        await this.sleep(2000);

        // Coletar métricas finais
        const afterLoad = await this.collectMemoryMetrics();
        console.log(`📊 Memória após carga: ${afterLoad.heapUsed}MB`);

        const memoryIncrease = afterLoad.heapUsed - baseline.heapUsed;
        console.log(`📈 Aumento de memória: ${memoryIncrease.toFixed(2)}MB`);

        this.results.memoryTest = {
            baseline: baseline.heapUsed,
            afterLoad: afterLoad.heapUsed,
            increase: memoryIncrease,
            leakDetected: memoryIncrease > 50 // Consideramos leak se aumentar mais que 50MB
        };

        if (memoryIncrease > 50) {
            console.log('⚠️ Possível vazamento de memória detectado');
        } else {
            console.log('✅ Uso de memória estável');
        }
        console.log('');
    }

    /**
     * 📊 Coletar métricas de memória
     */
    async collectMemoryMetrics() {
        try {
            const response = await axios.get(`${this.baseURL}/metrics`);
            const metricsText = response.data;
            
            const heapUsed = this.extractMetric(metricsText, 'coinbitclub_nodejs_heap_size_used_bytes');
            
            return {
                heapUsed: (heapUsed / 1024 / 1024) // Converter para MB
            };
        } catch (error) {
            return { heapUsed: 0 };
        }
    }

    /**
     * 📋 Gerar relatório de performance
     */
    generatePerformanceReport() {
        console.log('📋 RELATÓRIO FINAL DE PERFORMANCE');
        console.log('===============================');

        // Calcular score geral
        let totalScore = 0;
        let endpointCount = 0;

        for (const [name, metrics] of Object.entries(this.results.endpointMetrics)) {
            const endpoint = this.endpoints.find(e => e.name === name);
            if (endpoint) {
                const timeScore = Math.max(0, 100 - (metrics.avgTime / endpoint.expectedTime * 100));
                const successScore = metrics.successRate;
                const endpointScore = (timeScore + successScore) / 2;
                
                totalScore += endpointScore;
                endpointCount++;
                
                console.log(`📊 ${name}: ${endpointScore.toFixed(1)}/100`);
            }
        }

        const finalScore = totalScore / endpointCount;
        this.results.performanceScore = finalScore;

        console.log(`\n🏆 SCORE FINAL: ${finalScore.toFixed(1)}/100`);

        // Determinar classificação
        let classification;
        if (finalScore >= 90) {
            classification = '🏆 EXCELENTE';
        } else if (finalScore >= 80) {
            classification = '✅ MUITO BOM';
        } else if (finalScore >= 70) {
            classification = '🟡 BOM';
        } else if (finalScore >= 60) {
            classification = '🟠 ACEITÁVEL';
        } else {
            classification = '🔴 PRECISA MELHORAR';
        }

        console.log(`📊 Classificação: ${classification}`);

        // Gerar recomendações
        this.generateRecommendations();

        // Salvar relatório
        this.savePerformanceReport();
    }

    /**
     * 💡 Gerar recomendações
     */
    generateRecommendations() {
        console.log('\n💡 RECOMENDAÇÕES:');

        const recommendations = [];

        // Analisar endpoints lentos
        for (const [name, metrics] of Object.entries(this.results.endpointMetrics)) {
            const endpoint = this.endpoints.find(e => e.name === name);
            if (endpoint && metrics.avgTime > endpoint.expectedTime * 1.5) {
                recommendations.push(`⚡ Otimizar ${name} - tempo atual: ${metrics.avgTime.toFixed(2)}ms`);
            }
        }

        // Analisar uso de memória
        if (this.results.memoryTest && this.results.memoryTest.leakDetected) {
            recommendations.push('🧠 Investigar possível vazamento de memória');
        }

        // Analisar métricas do sistema
        if (this.results.systemMetrics.eventLoopLag > 0.01) {
            recommendations.push('⚡ Event Loop com alta latência - verificar operações bloqueantes');
        }

        if (recommendations.length === 0) {
            recommendations.push('🎉 Sistema performando dentro dos parâmetros esperados!');
        }

        recommendations.forEach(rec => console.log(`  ${rec}`));
        this.results.recommendations = recommendations;
    }

    /**
     * 💾 Salvar relatório
     */
    savePerformanceReport() {
        const reportPath = path.join(process.cwd(), 'performance-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        console.log(`\n📁 Relatório detalhado salvo em: ${reportPath}`);
    }

    /**
     * 💤 Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 🚀 Executar teste se chamado diretamente
if (require.main === module) {
    const perfTester = new PerformanceTester();
    perfTester.runPerformanceTest().catch(error => {
        console.error('❌ Erro no teste de performance:', error);
        process.exit(1);
    });
}

module.exports = PerformanceTester;
