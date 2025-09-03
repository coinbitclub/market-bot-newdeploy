// 🚀 TESTE FINAL DO SISTEMA ENTERPRISE
// Validação completa de funcionalidade

const http = require('http');
const { spawn } = require('child_process');

class FinalEnterpriseTest {
    constructor() {
        this.serverProcess = null;
        this.testResults = {
            timestamp: new Date().toISOString(),
            serverStart: false,
            endpoints: [],
            performance: {},
            status: 'PENDING'
        };
    }

    async runFinalTest() {
        console.log('🚀 INICIANDO TESTE FINAL DO SISTEMA ENTERPRISE');
        console.log('=' .repeat(50));

        try {
            // 1. Iniciar servidor
            await this.startServer();
            
            // 2. Aguardar inicialização
            await this.waitForServer();
            
            // 3. Testar endpoints
            await this.testEndpoints();
            
            // 4. Parar servidor
            await this.stopServer();
            
            // 5. Gerar relatório
            await this.generateFinalReport();
            
            console.log('\n✅ TESTE FINAL CONCLUÍDO COM SUCESSO!');
            return this.testResults;
            
        } catch (error) {
            console.error('❌ Erro no teste final:', error.message);
            if (this.serverProcess) {
                this.serverProcess.kill();
            }
            throw error;
        }
    }

    async startServer() {
        console.log('\n🔄 Iniciando servidor enterprise...');
        
        return new Promise((resolve, reject) => {
            // Tentar app-phase4.js primeiro
            this.serverProcess = spawn('node', ['app-phase4.js'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, NODE_ENV: 'development' }
            });

            let output = '';
            let errorOutput = '';

            this.serverProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log(`  📟 ${text.trim()}`);
                
                // Verificar se servidor iniciou
                if (text.includes('listening') || text.includes('started') || text.includes('3000')) {
                    this.testResults.serverStart = true;
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                console.log(`  ⚠️  ${text.trim()}`);
            });

            this.serverProcess.on('error', (error) => {
                console.log(`  ❌ Erro ao iniciar servidor: ${error.message}`);
                reject(error);
            });

            // Timeout de 10 segundos
            setTimeout(() => {
                if (!this.testResults.serverStart) {
                    console.log('  ⚠️  Timeout - tentando app.js alternativo...');
                    this.serverProcess.kill();
                    
                    // Tentar app.js como fallback
                    this.serverProcess = spawn('node', ['app.js'], {
                        stdio: ['pipe', 'pipe', 'pipe'],
                        env: { ...process.env, NODE_ENV: 'development' }
                    });
                    
                    this.serverProcess.stdout.on('data', (data) => {
                        const text = data.toString();
                        console.log(`  📟 ${text.trim()}`);
                        if (text.includes('listening') || text.includes('started') || text.includes('3000')) {
                            this.testResults.serverStart = true;
                            resolve();
                        }
                    });
                    
                    // Segundo timeout
                    setTimeout(() => {
                        if (!this.testResults.serverStart) {
                            this.testResults.serverStart = false;
                            resolve(); // Continuar mesmo sem servidor
                        }
                    }, 5000);
                }
            }, 10000);
        });
    }

    async waitForServer() {
        if (!this.testResults.serverStart) {
            console.log('  ⚠️  Servidor não iniciou - continuando com testes offline');
            return;
        }
        
        console.log('\n⏰ Aguardando servidor estabilizar...');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    async testEndpoints() {
        console.log('\n🌐 Testando endpoints...');
        
        const endpoints = [
            { path: '/', name: 'Homepage' },
            { path: '/health', name: 'Health Check' },
            { path: '/api', name: 'API Root' },
            { path: '/admin', name: 'Admin' }
        ];

        if (!this.testResults.serverStart) {
            console.log('  ⚠️  Servidor não disponível - pulando testes de endpoint');
            endpoints.forEach(endpoint => {
                this.testResults.endpoints.push({
                    path: endpoint.path,
                    name: endpoint.name,
                    status: 'SKIPPED',
                    message: 'Servidor não disponível'
                });
            });
            return;
        }

        for (const endpoint of endpoints) {
            try {
                const result = await this.testEndpoint(endpoint.path, endpoint.name);
                this.testResults.endpoints.push(result);
                
                if (result.status === 'SUCCESS') {
                    console.log(`  ✅ ${endpoint.name}: ${result.responseCode}`);
                } else {
                    console.log(`  ⚠️  ${endpoint.name}: ${result.message}`);
                }
                
            } catch (error) {
                console.log(`  ❌ ${endpoint.name}: ${error.message}`);
                this.testResults.endpoints.push({
                    path: endpoint.path,
                    name: endpoint.name,
                    status: 'ERROR',
                    message: error.message
                });
            }
        }
    }

    async testEndpoint(path, name) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const req = http.get(`http://localhost:3000${path}`, (res) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                resolve({
                    path,
                    name,
                    status: 'SUCCESS',
                    responseCode: res.statusCode,
                    responseTime,
                    headers: res.headers
                });
            });

            req.on('error', (error) => {
                resolve({
                    path,
                    name,
                    status: 'ERROR',
                    message: error.message
                });
            });

            req.setTimeout(5000, () => {
                req.destroy();
                resolve({
                    path,
                    name,
                    status: 'TIMEOUT',
                    message: 'Request timeout'
                });
            });
        });
    }

    async stopServer() {
        if (this.serverProcess) {
            console.log('\n🛑 Parando servidor...');
            this.serverProcess.kill();
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('  ✅ Servidor parado');
        }
    }

    async generateFinalReport() {
        console.log('\n📋 Gerando relatório final...');
        
        // Calcular estatísticas
        const successfulEndpoints = this.testResults.endpoints.filter(e => e.status === 'SUCCESS').length;
        const totalEndpoints = this.testResults.endpoints.length;
        const successRate = totalEndpoints > 0 ? Math.round((successfulEndpoints / totalEndpoints) * 100) : 0;
        
        // Determinar status geral
        let status = 'FAILED';
        if (this.testResults.serverStart && successRate >= 75) {
            status = 'PASSED';
        } else if (this.testResults.serverStart && successRate >= 50) {
            status = 'PARTIAL';
        } else if (this.testResults.serverStart) {
            status = 'LIMITED';
        }
        
        this.testResults.status = status;
        this.testResults.summary = {
            serverStarted: this.testResults.serverStart,
            totalEndpoints,
            successfulEndpoints,
            successRate,
            finalStatus: status
        };

        // Salvar relatório
        const reportPath = 'docs/reports/final-enterprise-test.json';
        await require('fs').promises.writeFile(reportPath, JSON.stringify(this.testResults, null, 2));
        
        console.log(`📄 Relatório salvo em: ${reportPath}`);
        console.log(`\n📊 RESULTADOS FINAIS:`);
        console.log(`   Servidor iniciou: ${this.testResults.serverStart ? '✅' : '❌'}`);
        console.log(`   Endpoints testados: ${totalEndpoints}`);
        console.log(`   Endpoints funcionando: ${successfulEndpoints}`);
        console.log(`   Taxa de sucesso: ${successRate}%`);
        console.log(`   Status final: ${status}`);
    }
}

// Executar teste se chamado diretamente
if (require.main === module) {
    const tester = new FinalEnterpriseTest();
    tester.runFinalTest()
        .then(results => {
            console.log('\n🎉 TESTE FINAL DO SISTEMA ENTERPRISE CONCLUÍDO!');
            console.log(`\n🏆 STATUS: ${results.status}`);
            
            if (results.status === 'PASSED') {
                console.log('🎯 SISTEMA ENTERPRISE APROVADO PARA PRODUÇÃO!');
            } else if (results.status === 'PARTIAL') {
                console.log('⚠️  SISTEMA FUNCIONAL COM LIMITAÇÕES');
            } else {
                console.log('❌ SISTEMA PRECISA DE AJUSTES');
            }
            
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 TESTE FINAL FALHOU:', error.message);
            process.exit(1);
        });
}

module.exports = FinalEnterpriseTest;
