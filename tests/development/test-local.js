#!/usr/bin/env node

/**
 * 🧪 TESTE LOCAL DO SISTEMA
 * ========================
 * 
 * Testa o sistema localmente antes do deploy
 */

const axios = require('axios');
const { spawn } = require('child_process');
require('dotenv').config();

class LocalTester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.appProcess = null;
    }

    async runTests() {
        console.log('🧪 INICIANDO TESTES LOCAIS...');
        console.log('============================');

        try {
            // 1. Iniciar aplicação
            await this.startApp();

            // 2. Aguardar inicialização
            await this.waitForApp();

            // 3. Executar testes
            await this.runHealthTests();
            await this.runAPITests();
            await this.runWebhookTests();

            console.log('\n✅ TODOS OS TESTES PASSARAM!');
            console.log('🚀 Sistema pronto para deploy no Railway');

        } catch (error) {
            console.error('\n❌ TESTES FALHARAM:', error.message);
            console.log('🔧 Corrija os erros antes do deploy');
        } finally {
            this.stopApp();
        }
    }

    async startApp() {
        console.log('🚀 Iniciando aplicação local...');
        
        this.appProcess = spawn('node', ['app.js'], {
            stdio: 'pipe',
            env: {
                ...process.env,
                NODE_ENV: 'development',
                PORT: '3000'
            }
        });

        this.appProcess.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('OPERACIONAL')) {
                console.log('✅ Aplicação iniciada');
            }
        });

        this.appProcess.stderr.on('data', (data) => {
            console.error('❌ Erro:', data.toString());
        });
    }

    async waitForApp() {
        console.log('⏳ Aguardando inicialização...');
        
        for (let i = 0; i < 30; i++) {
            try {
                await axios.get(`${this.baseUrl}/health`, { timeout: 1000 });
                console.log('✅ Aplicação respondendo');
                return;
            } catch (error) {
                await this.sleep(1000);
            }
        }
        
        throw new Error('Aplicação não iniciou em 30 segundos');
    }

    async runHealthTests() {
        console.log('\n🏥 TESTES DE HEALTH...');
        
        // Health check
        const health = await axios.get(`${this.baseUrl}/health`);
        console.log('✅ Health check:', health.data.status);
        
        // Status check
        const status = await axios.get(`${this.baseUrl}/status`);
        console.log('✅ Status check:', status.data.status);
        
        // System status
        const systems = await axios.get(`${this.baseUrl}/api/systems/status`);
        console.log('✅ Systems status:', systems.data.server.status);
    }

    async runAPITests() {
        console.log('\n📡 TESTES DE API...');
        
        // Dashboard API
        const dashboard = await axios.get(`${this.baseUrl}/api/dashboard/summary`);
        console.log('✅ Dashboard API:', dashboard.data.status);
        
        // Users API
        const users = await axios.get(`${this.baseUrl}/api/users`);
        console.log('✅ Users API:', users.data.total >= 0 ? 'OK' : 'FAIL');
        
        // Trading status
        const trading = await axios.get(`${this.baseUrl}/api/trading/status`);
        console.log('✅ Trading API:', trading.data.status);
    }

    async runWebhookTests() {
        console.log('\n🪝 TESTES DE WEBHOOK...');
        
        // Teste webhook principal
        const webhookTest = {
            symbol: 'BTCUSDT',
            action: 'BUY',
            price: 45000,
            leverage: 1,
            test: true
        };
        
        const webhook = await axios.post(`${this.baseUrl}/webhook`, webhookTest);
        console.log('✅ Webhook test:', webhook.data.status);
        
        // Teste validate-position
        const positionTest = {
            leverage: 2,
            stopLoss: 2,
            takeProfit: 4,
            orderValue: 100
        };
        
        const position = await axios.post(`${this.baseUrl}/validate-position`, positionTest);
        console.log('✅ Position validation:', position.data.validation.valid ? 'PASS' : 'FAIL');
    }

    stopApp() {
        if (this.appProcess) {
            console.log('\n🛑 Parando aplicação...');
            this.appProcess.kill();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Executar testes
if (require.main === module) {
    const tester = new LocalTester();
    tester.runTests();
}

module.exports = LocalTester;
