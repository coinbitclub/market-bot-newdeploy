#!/usr/bin/env node

/**
 * 🔄 MONITOR DE DEPLOY RAILWAY
 * ============================
 * 
 * Monitora o status do deploy até ficar online
 */

const axios = require('axios');

class DeployMonitor {
    constructor() {
        this.tentativas = 0;
        this.maxTentativas = 30; // 15 minutos (30 x 30 segundos)
        this.intervalId = null;
    }

    async iniciarMonitoramento() {
        console.log('🔄 MONITORAMENTO DE DEPLOY INICIADO');
        console.log('=' .repeat(50));
        console.log('⏰ Verificando a cada 30 segundos por 15 minutos...');
        console.log('🎯 Aguardando Railway processar as correções...\n');

        this.intervalId = setInterval(() => {
            this.verificarStatus();
        }, 30000); // 30 segundos

        // Primeira verificação imediata
        await this.verificarStatus();
    }

    async verificarStatus() {
        this.tentativas++;
        
        console.log(`🔍 Tentativa ${this.tentativas}/${this.maxTentativas} - ${new Date().toLocaleTimeString()}`);
        
        try {
            // Testar Railway direto
            const railwayResponse = await axios.get('https://coinbitclub-market-bot-production.up.railway.app/health', { 
                timeout: 15000,
                validateStatus: () => true
            });

            if (railwayResponse.status === 200) {
                console.log('🎉 RAILWAY FUNCIONANDO!');
                await this.testarNgrok();
                return;
            } else {
                console.log(`⏳ Railway Status: ${railwayResponse.status} - Ainda carregando...`);
            }

        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log('⏳ Railway ainda não está respondendo - Build em progresso...');
            } else {
                console.log(`⏳ Railway: ${error.message}`);
            }
        }

        // Verificar timeout
        if (this.tentativas >= this.maxTentativas) {
            console.log('\n⚠️ TIMEOUT ATINGIDO');
            console.log('📋 AÇÕES NECESSÁRIAS:');
            console.log('   1. Verificar logs do Railway manualmente');
            console.log('   2. Forçar redeploy se necessário');
            console.log('   3. Verificar se branch está correto');
            this.pararMonitoramento();
        }
    }

    async testarNgrok() {
        console.log('🌐 Testando túnel Ngrok...');
        
        try {
            const ngrokResponse = await axios.get('https://coinbitclub-bot.ngrok.io/health', { 
                timeout: 10000,
                validateStatus: () => true
            });

            if (ngrokResponse.status === 200) {
                console.log('🎉🎉 SUCESSO COMPLETO! 🎉🎉');
                console.log('✅ Railway: Online');
                console.log('✅ Ngrok: Conectado');
                console.log('🎯 IP FIXO ATIVO: https://coinbitclub-bot.ngrok.io');
                console.log('\n📋 PRÓXIMO PASSO:');
                console.log('   Configure nas exchanges:');
                console.log('   • Bybit: coinbitclub-bot.ngrok.io');
                console.log('   • Binance: coinbitclub-bot.ngrok.io');
                
                this.pararMonitoramento();
            } else {
                console.log('✅ Railway online, aguardando Ngrok conectar...');
                console.log('⏳ Ngrok pode levar mais 2-3 minutos...');
            }

        } catch (error) {
            console.log('✅ Railway online, Ngrok ainda conectando...');
        }
    }

    pararMonitoramento() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            console.log('\n🔚 Monitoramento finalizado.');
        }
    }
}

// Executar monitor
const monitor = new DeployMonitor();
monitor.iniciarMonitoramento().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Monitoramento interrompido pelo usuário');
    monitor.pararMonitoramento();
    process.exit(0);
});
