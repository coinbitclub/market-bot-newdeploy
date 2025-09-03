/**
 * 🚀 LAUNCHER PARA DEMONSTRAÇÃO DE SALDOS
 * =====================================
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

class DemoLauncher {
    constructor() {
        this.serverProcess = null;
        this.port = 3005;
    }

    async startServer() {
        return new Promise((resolve, reject) => {
            console.log('🚀 INICIANDO SERVIDOR PARA DEMONSTRAÇÃO');
            console.log('======================================');
            
            // Iniciar servidor
            this.serverProcess = spawn('node', ['app.js'], {
                cwd: process.cwd(),
                stdio: 'pipe'
            });

            let serverStarted = false;

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(output);
                
                if (output.includes('100% OPERACIONAL') && !serverStarted) {
                    serverStarted = true;
                    resolve(true);
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.error('❌ Erro:', data.toString());
            });

            this.serverProcess.on('close', (code) => {
                console.log(`Servidor encerrado com código: ${code}`);
            });

            // Timeout de 30 segundos
            setTimeout(() => {
                if (!serverStarted) {
                    reject(new Error('Timeout - servidor não iniciou'));
                }
            }, 30000);
        });
    }

    async testDemoEndpoint() {
        console.log('\n🧪 TESTANDO ENDPOINT DE DEMONSTRAÇÃO');
        console.log('====================================');
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: this.port,
                path: '/api/demo/saldos',
                method: 'GET',
                timeout: 10000
            };

            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        console.log('✅ DEMONSTRAÇÃO EXECUTADA COM SUCESSO!');
                        console.log('=====================================');
                        
                        if (result.success && result.data) {
                            const resumo = result.data.resumo;
                            console.log(`💰 Total demonstrado: $${resumo.totalUSD.toFixed(2)}`);
                            console.log(`👥 Usuários: ${resumo.totalUsuarios}`);
                            console.log(`🔑 Chaves: ${resumo.totalChaves}`);
                            console.log(`📊 Média por usuário: $${resumo.mediaUSDPorUsuario.toFixed(2)}`);
                            
                            console.log('\n📋 SALDOS COLETADOS:');
                            result.data.saldosColetados.forEach((saldo, index) => {
                                console.log(`${index + 1}. ${saldo.usuario} (${saldo.exchange}): $${saldo.saldos.totalUSD.toFixed(2)}`);
                            });
                            
                            console.log('\n🎯 PRÓXIMOS PASSOS:');
                            result.data.proximos_passos.forEach(passo => {
                                console.log(`   ${passo}`);
                            });
                        }
                        
                        resolve(result);
                    } catch (error) {
                        console.error('❌ Erro ao analisar resposta:', error.message);
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ Erro na requisição:', error.message);
                reject(error);
            });

            req.on('timeout', () => {
                console.error('❌ Timeout na requisição');
                req.destroy();
                reject(new Error('Timeout'));
            });

            req.end();
        });
    }

    async openBrowser() {
        console.log('\n🌐 ABRINDO NAVEGADOR PARA VISUALIZAÇÃO');
        console.log('=====================================');
        
        const url = `http://localhost:${this.port}/api/demo/saldos`;
        console.log(`📍 URL: ${url}`);
        
        // Tentar abrir no navegador (Windows)
        try {
            const { spawn } = require('child_process');
            spawn('cmd', ['/c', 'start', url], { detached: true });
            console.log('✅ Navegador aberto');
        } catch (error) {
            console.log('⚠️ Não foi possível abrir o navegador automaticamente');
            console.log(`💡 Acesse manualmente: ${url}`);
        }
    }

    async executarDemonstracao() {
        try {
            console.log('🎬 INICIANDO DEMONSTRAÇÃO COMPLETA DE SALDOS');
            console.log('=============================================');
            
            // 1. Iniciar servidor
            await this.startServer();
            console.log('✅ Servidor iniciado com sucesso');
            
            // Aguardar estabilização
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 2. Testar endpoint
            const resultado = await this.testDemoEndpoint();
            
            if (resultado.success) {
                console.log('\n🎉 DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO!');
                console.log('====================================');
                
                // 3. Abrir navegador
                await this.openBrowser();
                
                console.log('\n📋 RESUMO DA DEMONSTRAÇÃO:');
                console.log('==========================');
                console.log('✅ Servidor iniciado');
                console.log('✅ Endpoint de saldos funcional');
                console.log('✅ Dados coletados e processados');
                console.log('✅ Navegador aberto para visualização');
                
                console.log('\n🔧 MANTER SERVIDOR ATIVO...');
                console.log('Pressione Ctrl+C para encerrar');
                
            } else {
                throw new Error('Falha na demonstração');
            }
            
        } catch (error) {
            console.error('❌ Erro na demonstração:', error.message);
            if (this.serverProcess) {
                this.serverProcess.kill();
            }
        }
    }

    stop() {
        if (this.serverProcess) {
            this.serverProcess.kill();
            console.log('🛑 Servidor encerrado');
        }
    }
}

// Executar demonstração
if (require.main === module) {
    const launcher = new DemoLauncher();
    
    // Capturar Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n🛑 Encerrando demonstração...');
        launcher.stop();
        process.exit(0);
    });
    
    launcher.executarDemonstracao().catch(error => {
        console.error('❌ Erro fatal:', error.message);
        launcher.stop();
        process.exit(1);
    });
}

module.exports = DemoLauncher;
