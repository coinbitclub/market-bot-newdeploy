/**
 * 🚀 SISTEMA INTEGRADO - LEITURA DO MERCADO + DASHBOARD
 * 
 * Sistema completo que inicia automaticamente:
 * - Sistema de Leitura do Mercado (coleta de dados)
 * - Servidor Dashboard (visualização web)
 * - Monitoramento integrado
 */

const { CONFIG, validateConfig } = require('../../config/config');
const { exec, spawn } = require('child_process');
const path = require('path');

class SistemaIntegrado {
    constructor() {
        this.sistemaLeitura = null;
        this.servidorDashboard = null;
        this.isRunning = false;
        this.healthCheckInterval = null;
    }

    async inicializar() {
        console.log('🚀 SISTEMA INTEGRADO - COINBITCLUB MARKET BOT');
        console.log('='.repeat(60));
        
        try {
            // 1. Validar configurações
            console.log('1️⃣ Validando configurações...');
            validateConfig();
            console.log('✅ Configurações validadas');

            // 2. Verificar dependências
            console.log('\n2️⃣ Verificando dependências...');
            await this.verificarDependencias();
            console.log('✅ Dependências verificadas');

            // 3. Iniciar Sistema de Leitura (se auto-start ativado)
            if (CONFIG.SISTEMA.AUTO_START) {
                console.log('\n3️⃣ Iniciando Sistema de Leitura do Mercado...');
                await this.iniciarSistemaLeitura();
                console.log('✅ Sistema de Leitura iniciado');
            }

            // 4. Iniciar Servidor Dashboard
            console.log('\n4️⃣ Iniciando Servidor Dashboard...');
            await this.iniciarServidorDashboard();
            console.log('✅ Servidor Dashboard iniciado');

            // 5. Configurar monitoramento
            console.log('\n5️⃣ Configurando monitoramento...');
            this.configurarMonitoramento();
            console.log('✅ Monitoramento ativo');

            this.isRunning = true;
            this.exibirResumo();

        } catch (error) {
            console.error('❌ Erro na inicialização:', error.message);
            process.exit(1);
        }
    }

    async verificarDependencias() {
        return new Promise((resolve, reject) => {
            exec('npm list --depth=0', (error, stdout, stderr) => {
                if (error && !stdout.includes('pg') && !stdout.includes('axios')) {
                    console.log('⚠️ Instalando dependências...');
                    exec('npm install', (installError) => {
                        if (installError) {
                            reject(new Error('Falha ao instalar dependências'));
                        } else {
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    async iniciarSistemaLeitura() {
        return new Promise((resolve, reject) => {
            const sistemaPath = path.join(__dirname, '../../scripts/system/sistema-leitura-mercado-completo.js');
            
            this.sistemaLeitura = spawn('node', [sistemaPath], {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });

            this.sistemaLeitura.stdout.on('data', (data) => {
                console.log(`[SISTEMA] ${data.toString().trim()}`);
            });

            this.sistemaLeitura.stderr.on('data', (data) => {
                console.error(`[SISTEMA ERROR] ${data.toString().trim()}`);
            });

            this.sistemaLeitura.on('close', (code) => {
                console.log(`[SISTEMA] Processo encerrado com código ${code}`);
                if (code !== 0) {
                    this.isRunning = false;
                }
            });

            // Aguardar inicialização
            setTimeout(() => {
                if (this.sistemaLeitura && !this.sistemaLeitura.killed) {
                    resolve();
                } else {
                    reject(new Error('Sistema de Leitura falhou ao iniciar'));
                }
            }, 3000);
        });
    }

    async iniciarServidorDashboard() {
        return new Promise((resolve, reject) => {
            const servidorPath = path.join(__dirname, '../apps/servidor-dashboard.js');
            
            this.servidorDashboard = spawn('node', [servidorPath], {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });

            this.servidorDashboard.stdout.on('data', (data) => {
                const output = data.toString().trim();
                console.log(`[DASHBOARD] ${output}`);
                
                // Detectar quando servidor está pronto
                if (output.includes('rodando')) {
                    resolve();
                }
            });

            this.servidorDashboard.stderr.on('data', (data) => {
                console.error(`[DASHBOARD ERROR] ${data.toString().trim()}`);
            });

            this.servidorDashboard.on('close', (code) => {
                console.log(`[DASHBOARD] Processo encerrado com código ${code}`);
                if (code !== 0) {
                    this.isRunning = false;
                }
            });

            // Timeout de segurança
            setTimeout(() => {
                if (this.servidorDashboard && !this.servidorDashboard.killed) {
                    resolve();
                } else {
                    reject(new Error('Servidor Dashboard falhou ao iniciar'));
                }
            }, 5000);
        });
    }

    configurarMonitoramento() {
        this.healthCheckInterval = setInterval(() => {
            this.verificarSaude();
        }, 60000); // Check a cada minuto

        // Graceful shutdown
        process.on('SIGINT', () => this.encerrar());
        process.on('SIGTERM', () => this.encerrar());
    }

    verificarSaude() {
        if (!this.isRunning) return;

        let sistemaSaude = this.sistemaLeitura && !this.sistemaLeitura.killed;
        let dashboardSaude = this.servidorDashboard && !this.servidorDashboard.killed;

        if (!sistemaSaude || !dashboardSaude) {
            console.log('⚠️ Problema detectado no sistema');
            if (!sistemaSaude) console.log('   • Sistema de Leitura parado');
            if (!dashboardSaude) console.log('   • Servidor Dashboard parado');
            
            // Tentar restart automático
            if (CONFIG.SISTEMA.AUTO_START) {
                console.log('🔄 Tentando restart automático...');
                this.reiniciar();
            }
        }
    }

    async reiniciar() {
        console.log('🔄 Reiniciando sistema...');
        await this.encerrar(false);
        setTimeout(() => {
            this.inicializar();
        }, 2000);
    }

    async encerrar(exit = true) {
        console.log('\n🛑 Encerrando Sistema Integrado...');
        this.isRunning = false;

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        if (this.sistemaLeitura && !this.sistemaLeitura.killed) {
            console.log('   • Parando Sistema de Leitura...');
            this.sistemaLeitura.kill('SIGTERM');
        }

        if (this.servidorDashboard && !this.servidorDashboard.killed) {
            console.log('   • Parando Servidor Dashboard...');
            this.servidorDashboard.kill('SIGTERM');
        }

        console.log('✅ Sistema encerrado com sucesso');
        
        if (exit) {
            process.exit(0);
        }
    }

    exibirResumo() {
        console.log('\n🎉 SISTEMA TOTALMENTE OPERACIONAL!');
        console.log('='.repeat(60));
        console.log(`🌐 Dashboard: http://localhost:${CONFIG.SERVER.PORT}`);
        console.log(`📊 API Dados: http://localhost:${CONFIG.SERVER.PORT}/api/sistema-leitura-mercado`);
        console.log(`📈 API Status: http://localhost:${CONFIG.SERVER.PORT}/api/status`);
        console.log('='.repeat(60));
        console.log('🔄 Monitoramento ativo - Sistema se auto-monitora');
        console.log('🛑 Para parar: Ctrl+C');
        console.log('\n⚡ SISTEMA PRONTO PARA PRODUÇÃO!');
    }
}

// 🚀 INICIALIZAÇÃO AUTOMÁTICA
if (require.main === module) {
    const sistema = new SistemaIntegrado();
    sistema.inicializar().catch((error) => {
        console.error('❌ Falha na inicialização:', error.message);
        process.exit(1);
    });
}

module.exports = SistemaIntegrado;
