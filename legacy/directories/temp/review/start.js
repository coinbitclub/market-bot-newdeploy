#!/usr/bin/env node

/**
 * 🚀 SCRIPT DE INICIALIZAÇÃO PRINCIPAL
 * ===================================
 * 
 * Inicia o sistema com IP fixo automático
 */

const { spawn } = require('child_process');
const fs = require('fs');
require('dotenv').config();

class SystemStarter {
    constructor() {
        this.processes = [];
        this.isShuttingDown = false;
    }

    async start() {
        console.log('🚀 INICIANDO COINBITCLUB MARKET BOT...');
        console.log('=====================================');

        try {
            // 1. Verificar configuração de IP fixo
            await this.checkIPFixConfiguration();

            // 2. Iniciar Ngrok se configurado
            if (this.shouldUseIPFix()) {
                await this.startNgrok();
            }

            // 3. Iniciar aplicação principal
            await this.startMainApp();

            // 4. Configurar handlers de shutdown
            this.setupShutdownHandlers();

            console.log('✅ SISTEMA INICIADO COM SUCESSO!');

        } catch (error) {
            console.error('❌ Erro ao iniciar sistema:', error.message);
            process.exit(1);
        }
    }

    /**
     * 🔍 VERIFICAR CONFIGURAÇÃO DE IP FIXO
     */
    async checkIPFixConfiguration() {
        console.log('🔍 Verificando configuração de IP fixo...');

        const hasNgrokToken = !!process.env.NGROK_AUTH_TOKEN;
        const hasSubdomain = !!process.env.NGROK_SUBDOMAIN;
        const ngrokEnabled = process.env.NGROK_ENABLED === 'true';

        if (ngrokEnabled && hasNgrokToken && hasSubdomain) {
            console.log('✅ IP fixo configurado via Ngrok');
            console.log(`🏷️ Subdomínio: ${process.env.NGROK_SUBDOMAIN}`);
            console.log(`🌍 Região: ${process.env.NGROK_REGION || 'us'}`);
        } else if (ngrokEnabled) {
            console.log('⚠️ IP fixo habilitado mas configuração incompleta');
            console.log(`   NGROK_AUTH_TOKEN: ${hasNgrokToken ? 'OK' : 'FALTANDO'}`);
            console.log(`   NGROK_SUBDOMAIN: ${hasSubdomain ? 'OK' : 'FALTANDO'}`);
        } else {
            console.log('ℹ️ Sistema rodará sem IP fixo (Railway dinâmico)');
        }
    }

    /**
     * 🤔 DEVE USAR IP FIXO?
     */
    shouldUseIPFix() {
        return process.env.NGROK_ENABLED === 'true' && 
               process.env.NGROK_AUTH_TOKEN && 
               process.env.NGROK_SUBDOMAIN;
    }

    /**
     * 🌐 INICIAR NGROK
     */
    async startNgrok() {
        console.log('🌐 Iniciando Ngrok para IP fixo...');

        return new Promise((resolve, reject) => {
            // Configurar Ngrok via linha de comando
            const ngrokArgs = [
                'http',
                process.env.PORT || '3000',
                '--authtoken', process.env.NGROK_AUTH_TOKEN,
                '--subdomain', process.env.NGROK_SUBDOMAIN,
                '--region', process.env.NGROK_REGION || 'us',
                '--log', 'stdout'
            ];

            const ngrokProcess = spawn('ngrok', ngrokArgs, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            this.processes.push({ name: 'ngrok', process: ngrokProcess });

            let tunnelEstablished = false;

            ngrokProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('📡 Ngrok:', output.trim());
                
                // Detectar URL estabelecida
                if (output.includes('started tunnel') && !tunnelEstablished) {
                    tunnelEstablished = true;
                    setTimeout(() => {
                        this.saveNgrokInfo().then(resolve).catch(reject);
                    }, 3000);
                }
            });

            ngrokProcess.stderr.on('data', (data) => {
                const error = data.toString();
                console.error('❌ Ngrok Error:', error.trim());
            });

            ngrokProcess.on('exit', (code) => {
                console.log(`🔌 Ngrok encerrado com código: ${code}`);
                if (!this.isShuttingDown && code !== 0) {
                    setTimeout(() => this.startNgrok(), 5000);
                }
            });

            // Timeout de 30 segundos
            setTimeout(() => {
                if (!tunnelEstablished) {
                    reject(new Error('Timeout ao estabelecer túnel Ngrok'));
                }
            }, 30000);
        });
    }

    /**
     * 💾 SALVAR INFORMAÇÕES DO NGROK
     */
    async saveNgrokInfo() {
        try {
            const response = await fetch('http://127.0.0.1:4040/api/tunnels');
            const data = await response.json();
            
            if (data.tunnels && data.tunnels.length > 0) {
                const tunnel = data.tunnels[0];
                const ngrokInfo = {
                    url: tunnel.public_url,
                    subdomain: process.env.NGROK_SUBDOMAIN,
                    timestamp: new Date().toISOString(),
                    status: 'active'
                };

                fs.writeFileSync('./ngrok-info.json', JSON.stringify(ngrokInfo, null, 2));
                
                console.log('✅ IP fixo estabelecido!');
                console.log(`🌐 URL Pública: ${tunnel.public_url}`);
                console.log('🔒 Configure este URL no whitelist das exchanges');
                
                return ngrokInfo;
            }
        } catch (error) {
            console.log('⚠️ Erro ao obter informações do túnel:', error.message);
        }
    }

    /**
     * 🚀 INICIAR APLICAÇÃO PRINCIPAL
     */
    async startMainApp() {
        console.log('🚀 Iniciando aplicação principal...');

        const appProcess = spawn('node', ['app.js'], {
            stdio: 'inherit',
            env: {
                ...process.env,
                NGROK_ENABLED: this.shouldUseIPFix() ? 'true' : 'false',
                IP_FIXED: this.shouldUseIPFix() ? 'true' : 'false'
            }
        });

        this.processes.push({ name: 'app', process: appProcess });

        appProcess.on('exit', (code) => {
            console.log(`🔌 Aplicação encerrada com código: ${code}`);
            if (!this.isShuttingDown && code !== 0) {
                console.log('🔄 Reiniciando aplicação...');
                setTimeout(() => this.startMainApp(), 3000);
            }
        });
    }

    /**
     * 🛑 CONFIGURAR HANDLERS DE SHUTDOWN
     */
    setupShutdownHandlers() {
        const shutdown = (signal) => {
            console.log(`\n🛑 Recebido sinal ${signal}, encerrando gracefully...`);
            this.isShuttingDown = true;

            this.processes.forEach(({ name, process }) => {
                console.log(`🔌 Encerrando ${name}...`);
                process.kill();
            });

            setTimeout(() => {
                console.log('✅ Sistema encerrado');
                process.exit(0);
            }, 5000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('uncaughtException', (error) => {
            console.error('💥 Erro não capturado:', error);
            shutdown('UNCAUGHT_EXCEPTION');
        });
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const starter = new SystemStarter();
    starter.start();
}

module.exports = SystemStarter;
