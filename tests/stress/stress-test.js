/**
 * 🔄 STRESS TEST - TESTE DE RESISTÊNCIA MÁXIMA
 * ==========================================
 * 
 * Teste extremo de resistência do sistema
 * Simula condições adversas e picos de tráfego
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0 Stress Testing Suite
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class StressTester {
    constructor() {
        this.baseURL = process.env.STRESS_TEST_URL || 'http://localhost:3333';
        this.testDuration = 5 * 60 * 1000; // 5 minutos
        this.maxConcurrentUsers = 500;
        this.results = {
            timestamp: new Date().toISOString(),
            testDuration: this.testDuration,
            phases: {},
            systemBehavior: {},
            breakingPoint: null,
            summary: {}
        };
        
        this.activeRequests = 0;
        this.totalRequests = 0;
        this.successfulRequests = 0;
        this.failedRequests = 0;
        this.responseTimes = [];
        
        this.testPhases = [
            { name: 'Baseline', users: 10, duration: 30000 },
            { name: 'Gradual Increase', users: 50, duration: 60000 },
            { name: 'Heavy Load', users: 150, duration: 90000 },
            { name: 'Extreme Stress', users: 300, duration: 120000 },
            { name: 'Breaking Point', users: 500, duration: 60000 }
        ];
    }

    /**
     * 🚀 Executar stress test completo
     */
    async runStressTest() {
        console.log('🔥 INICIANDO STRESS TEST EXTREMO');
        console.log('===============================');
        console.log(`🎯 Target URL: ${this.baseURL}`);
        console.log(`⏱️ Duração total estimada: ${(this.testDuration / 1000 / 60).toFixed(1)} minutos`);
        console.log(`👥 Máximo de usuários simultâneos: ${this.maxConcurrentUsers}`);
        console.log(`⏱️ Início: ${new Date().toISOString()}\n`);

        // Validar sistema antes do teste
        const systemHealthy = await this.validateSystem();
        if (!systemHealthy) {
            console.log('❌ Sistema não está saudável. Abortando teste.');
            return;
        }

        // Executar fases do teste
        for (let i = 0; i < this.testPhases.length; i++) {
            const phase = this.testPhases[i];
            console.log(`🔄 FASE ${i + 1}: ${phase.name}`);
            console.log(`👥 Usuários: ${phase.users} | ⏱️ Duração: ${phase.duration / 1000}s`);
            console.log('─'.repeat(50));
            
            await this.executePhase(phase);
            
            // Pausa entre fases para recuperação
            if (i < this.testPhases.length - 1) {
                console.log('⏸️ Pausa para recuperação do sistema...\n');
                await this.sleep(10000);
            }
        }

        // Gerar relatório final
        this.generateStressReport();
    }

    /**
     * 🏥 Validar sistema
     */
    async validateSystem() {
        try {
            console.log('🏥 Validando sistema antes do stress test...');
            const response = await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
            
            if (response.status === 200) {
                console.log('✅ Sistema validado e pronto para stress test\n');
                return true;
            }
            return false;
        } catch (error) {
            console.log(`❌ Falha na validação: ${error.message}`);
            return false;
        }
    }

    /**
     * 🔄 Executar uma fase do teste
     */
    async executePhase(phase) {
        const phaseResults = {
            startTime: Date.now(),
            users: phase.users,
            duration: phase.duration,
            requests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errors: {},
            systemMetrics: []
        };

        // Reset counters para esta fase
        this.activeRequests = 0;
        this.totalRequests = 0;
        this.successfulRequests = 0;
        this.failedRequests = 0;
        this.responseTimes = [];

        // Iniciar coleta de métricas do sistema
        const metricsInterval = setInterval(async () => {
            const metrics = await this.collectSystemMetrics();
            phaseResults.systemMetrics.push({
                timestamp: Date.now(),
                ...metrics
            });
        }, 5000);

        // Iniciar usuários simulados
        const userPromises = [];
        for (let i = 0; i < phase.users; i++) {
            userPromises.push(this.simulateUser(phase.duration));
        }

        // Monitoramento em tempo real
        const monitoringInterval = setInterval(() => {
            const elapsed = Date.now() - phaseResults.startTime;
            const remaining = Math.max(0, phase.duration - elapsed);
            
            console.log(`⏱️ ${(remaining / 1000).toFixed(0)}s | 🔄 Ativas: ${this.activeRequests} | ✅ ${this.successfulRequests} | ❌ ${this.failedRequests}`);
        }, 2000);

        // Aguardar conclusão da fase
        await Promise.allSettled(userPromises);
        
        // Limpar intervalos
        clearInterval(metricsInterval);
        clearInterval(monitoringInterval);

        // Finalizar resultados da fase
        phaseResults.endTime = Date.now();
        phaseResults.actualDuration = phaseResults.endTime - phaseResults.startTime;
        phaseResults.requests = this.totalRequests;
        phaseResults.successfulRequests = this.successfulRequests;
        phaseResults.failedRequests = this.failedRequests;
        phaseResults.responseTimes = [...this.responseTimes];
        
        // Calcular estatísticas
        this.calculatePhaseStatistics(phaseResults);
        
        // Salvar resultados da fase
        this.results.phases[phase.name] = phaseResults;
        
        // Exibir resumo da fase
        this.displayPhaseResults(phase.name, phaseResults);
    }

    /**
     * 👤 Simular um usuário
     */
    async simulateUser(duration) {
        const endTime = Date.now() + duration;
        const endpoints = [
            '/health',
            '/dashboard',
            '/api/enterprise/status',
            '/api/enterprise/cache/stats',
            '/api/enterprise/trading/status'
        ];

        while (Date.now() < endTime) {
            this.activeRequests++;
            this.totalRequests++;
            
            const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
            const startTime = Date.now();
            
            try {
                const response = await axios.get(`${this.baseURL}${endpoint}`, {
                    timeout: 30000
                });
                
                const responseTime = Date.now() - startTime;
                this.responseTimes.push(responseTime);
                
                if (response.status === 200) {
                    this.successfulRequests++;
                } else {
                    this.failedRequests++;
                }
                
            } catch (error) {
                const responseTime = Date.now() - startTime;
                this.responseTimes.push(responseTime);
                this.failedRequests++;
                
                // Log de erros únicos
                const errorKey = error.code || error.message || 'Unknown';
                if (!this.currentPhaseErrors) this.currentPhaseErrors = {};
                this.currentPhaseErrors[errorKey] = (this.currentPhaseErrors[errorKey] || 0) + 1;
            }
            
            this.activeRequests--;
            
            // Pausa aleatória entre requisições (simular comportamento real)
            const pause = Math.random() * 1000 + 500; // 500ms a 1.5s
            await this.sleep(pause);
        }
    }

    /**
     * 📊 Coletar métricas do sistema
     */
    async collectSystemMetrics() {
        try {
            const response = await axios.get(`${this.baseURL}/metrics`, { timeout: 5000 });
            const metricsText = response.data;
            
            return {
                memoryUsage: this.extractMetric(metricsText, 'coinbitclub_nodejs_heap_size_used_bytes'),
                eventLoopLag: this.extractMetric(metricsText, 'coinbitclub_nodejs_eventloop_lag_seconds'),
                activeConnections: this.extractMetric(metricsText, 'coinbitclub_http_active_connections'),
                httpRequests: this.extractMetric(metricsText, 'coinbitclub_http_requests_total')
            };
        } catch (error) {
            return {
                memoryUsage: 0,
                eventLoopLag: 0,
                activeConnections: 0,
                httpRequests: 0
            };
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
     * 📊 Calcular estatísticas da fase
     */
    calculatePhaseStatistics(phaseResults) {
        if (phaseResults.responseTimes.length > 0) {
            const sortedTimes = phaseResults.responseTimes.sort((a, b) => a - b);
            
            phaseResults.statistics = {
                avgResponseTime: sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length,
                minResponseTime: Math.min(...sortedTimes),
                maxResponseTime: Math.max(...sortedTimes),
                p50: this.percentile(sortedTimes, 50),
                p95: this.percentile(sortedTimes, 95),
                p99: this.percentile(sortedTimes, 99),
                successRate: (phaseResults.successfulRequests / phaseResults.requests) * 100,
                requestsPerSecond: phaseResults.requests / (phaseResults.actualDuration / 1000)
            };
        }
    }

    /**
     * 📊 Calcular percentil
     */
    percentile(arr, p) {
        if (arr.length === 0) return 0;
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[Math.max(0, index)];
    }

    /**
     * 📋 Exibir resultados da fase
     */
    displayPhaseResults(phaseName, results) {
        console.log(`\n📊 RESULTADOS DA FASE: ${phaseName}`);
        console.log('═'.repeat(40));
        
        if (results.statistics) {
            console.log(`📈 Requests/seg: ${results.statistics.requestsPerSecond.toFixed(2)}`);
            console.log(`⚡ Tempo médio: ${results.statistics.avgResponseTime.toFixed(2)}ms`);
            console.log(`⚡ P95: ${results.statistics.p95.toFixed(2)}ms`);
            console.log(`⚡ P99: ${results.statistics.p99.toFixed(2)}ms`);
            console.log(`✅ Taxa de sucesso: ${results.statistics.successRate.toFixed(2)}%`);
            console.log(`📊 Total de requests: ${results.requests}`);
        }
        
        // Análise de comportamento do sistema
        if (results.systemMetrics.length > 0) {
            const lastMetrics = results.systemMetrics[results.systemMetrics.length - 1];
            console.log(`🧠 Memória: ${(lastMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
            console.log(`⚡ Event Loop Lag: ${(lastMetrics.eventLoopLag * 1000).toFixed(2)}ms`);
            console.log(`🔗 Conexões ativas: ${lastMetrics.activeConnections}`);
        }
        
        console.log('');
    }

    /**
     * 📋 Gerar relatório final de stress
     */
    generateStressReport() {
        console.log('🔥 RELATÓRIO FINAL DE STRESS TEST');
        console.log('===============================');

        let overallSuccessRate = 0;
        let overallAvgResponseTime = 0;
        let totalPhases = 0;
        let breakingPointDetected = false;

        // Analisar cada fase
        for (const [phaseName, phaseResults] of Object.entries(this.results.phases)) {
            if (phaseResults.statistics) {
                console.log(`\n📊 ${phaseName}:`);
                console.log(`  ✅ Taxa de sucesso: ${phaseResults.statistics.successRate.toFixed(2)}%`);
                console.log(`  ⚡ Tempo médio: ${phaseResults.statistics.avgResponseTime.toFixed(2)}ms`);
                console.log(`  📈 Requests/seg: ${phaseResults.statistics.requestsPerSecond.toFixed(2)}`);
                
                overallSuccessRate += phaseResults.statistics.successRate;
                overallAvgResponseTime += phaseResults.statistics.avgResponseTime;
                totalPhases++;
                
                // Detectar ponto de quebra
                if (phaseResults.statistics.successRate < 95 || phaseResults.statistics.avgResponseTime > 5000) {
                    if (!breakingPointDetected) {
                        this.results.breakingPoint = {
                            phase: phaseName,
                            users: phaseResults.users,
                            successRate: phaseResults.statistics.successRate,
                            avgResponseTime: phaseResults.statistics.avgResponseTime
                        };
                        breakingPointDetected = true;
                        console.log(`  🔴 PONTO DE QUEBRA DETECTADO!`);
                    }
                }
            }
        }

        // Calcular estatísticas gerais
        if (totalPhases > 0) {
            this.results.summary = {
                overallSuccessRate: overallSuccessRate / totalPhases,
                overallAvgResponseTime: overallAvgResponseTime / totalPhases,
                totalPhases,
                breakingPointDetected,
                testDuration: this.testDuration
            };
        }

        console.log('\n🏆 RESUMO GERAL:');
        console.log(`✅ Taxa de sucesso média: ${this.results.summary.overallSuccessRate.toFixed(2)}%`);
        console.log(`⚡ Tempo de resposta médio: ${this.results.summary.overallAvgResponseTime.toFixed(2)}ms`);
        
        if (breakingPointDetected) {
            console.log(`🔴 Ponto de quebra: ${this.results.breakingPoint.users} usuários simultâneos`);
        } else {
            console.log(`🎉 Sistema resistiu a todos os testes de stress!`);
        }

        // Gerar recomendações
        this.generateStressRecommendations();

        // Salvar relatório
        this.saveStressReport();
    }

    /**
     * 💡 Gerar recomendações de stress
     */
    generateStressRecommendations() {
        console.log('\n💡 RECOMENDAÇÕES DE STRESS:');
        
        const recommendations = [];
        
        if (this.results.breakingPoint) {
            recommendations.push(`⚠️ Limite máximo: ${this.results.breakingPoint.users} usuários simultâneos`);
            recommendations.push(`🔧 Otimizar performance antes de atingir ${this.results.breakingPoint.users} usuários`);
        }
        
        if (this.results.summary.overallAvgResponseTime > 1000) {
            recommendations.push('⚡ Tempos de resposta altos - considerar otimizações');
        }
        
        if (this.results.summary.overallSuccessRate < 99) {
            recommendations.push('🔧 Taxa de erro elevada - verificar estabilidade');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('🎉 Sistema demonstrou excelente resistência ao stress!');
        }
        
        recommendations.forEach(rec => console.log(`  ${rec}`));
    }

    /**
     * 💾 Salvar relatório de stress
     */
    saveStressReport() {
        const reportPath = path.join(process.cwd(), 'stress-test-report.json');
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
    const stressTester = new StressTester();
    stressTester.runStressTest().catch(error => {
        console.error('❌ Erro no stress test:', error);
        process.exit(1);
    });
}

module.exports = StressTester;
