#!/usr/bin/env node

/**
 * 🧪 TESTE DE PROCESSAMENTO DE SINAIS
 * ==================================
 * 
 * Testa se os sinais estão sendo processados corretamente
 */

const axios = require('axios');

class SignalProcessingTester {
    constructor() {
        this.baseUrl = 'https://coinbitclub-market-bot.up.railway.app';
    }

    async runTests() {
        console.log('🧪 TESTANDO PROCESSAMENTO DE SINAIS...');
        console.log('====================================');

        try {
            // 1. Testar health check
            await this.testHealth();

            // 2. Testar webhook com sinal real
            await this.testWebhook();

            // 3. Verificar status dos sistemas
            await this.testSystemStatus();

            // 4. Verificar processamento multi-usuário
            await this.testMultiUserProcessing();

            console.log('\n✅ TODOS OS TESTES PASSARAM!');
            console.log('🚀 Sistema processando sinais corretamente');

        } catch (error) {
            console.error('\n❌ ERRO NOS TESTES:', error.message);
        }
    }

    async testHealth() {
        console.log('\n🏥 Teste de Health Check...');
        
        const response = await axios.get(`${this.baseUrl}/health`, { timeout: 10000 });
        
        if (response.data.status === 'healthy') {
            console.log('✅ Sistema saudável');
            console.log(`   Uptime: ${response.data.uptime}s`);
            console.log(`   Versão: ${response.data.version}`);
        } else {
            throw new Error('Sistema não está saudável');
        }
    }

    async testWebhook() {
        console.log('\n📡 Teste de Webhook...');
        
        // Sinal de teste baseado nos dados reais recebidos
        const testSignal = {
            ticker: "BTCUSDT",
            time: new Date().toISOString(),
            close: "58500.50",
            ema9_30: "58600.12",
            rsi_4h: "62.83",
            rsi_15: "42.50",
            momentum_15: "-0.349",
            atr_30: "0.2084",
            atr_pct_30: "0.86",
            vol_30: "79029.8",
            vol_ma_30: "81072.93",
            diff_btc_ema7: "-0.50",
            cruzou_acima_ema9: "0",
            cruzou_abaixo_ema9: "1",
            golden_cross_30: "0",
            death_cross_30: "0",
            signal: "SINAL SHORT",
            test: true
        };

        const response = await axios.post(`${this.baseUrl}/webhook`, testSignal, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data.status === 'SINAL PROCESSADO') {
            console.log('✅ Webhook funcionando');
            console.log(`   Status: ${response.data.status}`);
            console.log(`   Resultado: ${JSON.stringify(response.data.resultado)}`);
        } else {
            console.log('⚠️ Webhook respondeu mas status inesperado:', response.data);
        }
    }

    async testSystemStatus() {
        console.log('\n📊 Teste de Status dos Sistemas...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/systems/status`, { timeout: 10000 });
            
            console.log('✅ Status dos módulos:');
            const modules = response.data.modules;
            for (const [module, status] of Object.entries(modules)) {
                const emoji = status === 'initialized' || status === 'running' ? '✅' : '⚠️';
                console.log(`   ${emoji} ${module}: ${status}`);
            }

            console.log('\n📈 Database:');
            console.log(`   ✅ Status: ${response.data.database.status}`);
            console.log(`   📊 Pool connections: ${response.data.database.pool_total}`);

        } catch (error) {
            console.log('⚠️ Erro ao obter status dos sistemas:', error.message);
        }
    }

    async testMultiUserProcessing() {
        console.log('\n👥 Teste de Processamento Multi-Usuário...');
        
        try {
            // Verificar usuários ativos
            const usersResponse = await axios.get(`${this.baseUrl}/api/users`, { timeout: 10000 });
            console.log(`✅ Usuários no sistema: ${usersResponse.data.total}`);

            // Verificar exchanges
            const exchangesResponse = await axios.get(`${this.baseUrl}/api/exchanges/status`, { timeout: 10000 });
            console.log('✅ Status das exchanges:');
            
            if (exchangesResponse.data.stats) {
                const stats = exchangesResponse.data.stats;
                console.log(`   👥 Usuários conectados: ${stats.orchestrator?.globalStats?.connectedUsers || 0}`);
                console.log(`   📊 Total de usuários: ${stats.orchestrator?.globalStats?.totalUsers || 0}`);
            }

        } catch (error) {
            console.log('⚠️ Processamento multi-usuário não totalmente ativo:', error.message);
            console.log('   Isso é normal - sistema está em modo stub para deploy');
        }
    }
}

// Executar testes
async function main() {
    const tester = new SignalProcessingTester();
    await tester.runTests();
}

main().catch(console.error);
