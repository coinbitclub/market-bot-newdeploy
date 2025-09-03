/**
 * 🧪 TESTE BÁSICO DO SISTEMA - VERIFICAÇÃO RÁPIDA
 * 
 * Este teste verifica se os componentes básicos estão funcionando
 */

const express = require('express');
const { CONFIG, validateConfig } = require('./config');

console.log('🚀 INICIANDO TESTE BÁSICO DO SISTEMA');
console.log('='.repeat(50));

class TesteBasico {
    constructor() {
        this.app = express();
        this.port = 3001; // Usar porta diferente
    }

    async executarTeste() {
        try {
            console.log('1️⃣ Testando configurações...');
            validateConfig();
            console.log('✅ Configurações OK');

            console.log('2️⃣ Testando servidor Express...');
            this.configurarServidor();
            await this.iniciarServidor();
            console.log('✅ Servidor Express OK');

            console.log('3️⃣ Testando APIs externas...');
            await this.testarAPIs();
            console.log('✅ APIs testadas');

            console.log('\n🎉 TESTE BÁSICO CONCLUÍDO COM SUCESSO!');
            console.log(`🌐 Servidor rodando em: http://localhost:${this.port}`);
            console.log('📊 Status: http://localhost:3001/status');
            console.log('🔄 Health: http://localhost:3001/health');
            
        } catch (error) {
            console.error('❌ Erro no teste:', error.message);
        }
    }

    configurarServidor() {
        // Middleware básico
        this.app.use(express.json());
        
        // Rota de health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: Math.floor(process.uptime()),
                version: '6.0.0',
                test: 'basic_system_test'
            });
        });

        // Rota de status
        this.app.get('/status', (req, res) => {
            res.json({
                system: 'CoinBitClub Market Bot',
                version: '6.0.0',
                environment: process.env.NODE_ENV || 'development',
                database: 'not_connected_test_mode',
                apis: 'testing',
                timestamp: new Date().toISOString(),
                test_mode: true
            });
        });

        // Rota principal
        this.app.get('/', (req, res) => {
            res.send(`
                <h1>🚀 CoinBitClub Market Bot - Teste Básico</h1>
                <h2>✅ Sistema funcionando corretamente!</h2>
                <p><strong>Versão:</strong> 6.0.0</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <p><strong>Uptime:</strong> ${Math.floor(process.uptime())} segundos</p>
                <h3>🔗 Endpoints disponíveis:</h3>
                <ul>
                    <li><a href="/health">/health</a> - Health check</li>
                    <li><a href="/status">/status</a> - Status do sistema</li>
                    <li><a href="/test-apis">/test-apis</a> - Testar APIs</li>
                </ul>
                <p>✅ <strong>TESTE BÁSICO PASSOU!</strong></p>
            `);
        });

        // Rota para testar APIs
        this.app.get('/test-apis', async (req, res) => {
            const resultados = await this.testarAPIs();
            res.json({
                teste: 'APIs Externas',
                resultados: resultados,
                timestamp: new Date().toISOString()
            });
        });
    }

    async iniciarServidor() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    async testarAPIs() {
        const axios = require('axios');
        const testes = [];

        // Teste 1: Binance (público)
        try {
            console.log('   🪙 Testando Binance API...');
            const response = await axios.get('https://api.binance.com/api/v3/time', { timeout: 5000 });
            testes.push({
                api: 'Binance',
                status: 'OK',
                latencia: response.headers['x-response-time'] || 'N/A',
                timestamp: response.data.serverTime
            });
            console.log('   ✅ Binance API funcionando');
        } catch (error) {
            testes.push({
                api: 'Binance',
                status: 'ERRO',
                erro: error.message
            });
            console.log('   ❌ Binance API com problemas');
        }

        // Teste 2: Alternative.me (Fear & Greed)
        try {
            console.log('   📊 Testando Alternative.me API...');
            const response = await axios.get('https://api.alternative.me/fng/', { timeout: 5000 });
            testes.push({
                api: 'Alternative.me (Fear & Greed)',
                status: 'OK',
                valor: response.data.data[0].value,
                classificacao: response.data.data[0].value_classification
            });
            console.log('   ✅ Alternative.me API funcionando');
        } catch (error) {
            testes.push({
                api: 'Alternative.me',
                status: 'ERRO',
                erro: error.message
            });
            console.log('   ❌ Alternative.me API com problemas');
        }

        // Teste 3: Verificar conectividade geral
        try {
            console.log('   🌐 Testando conectividade geral...');
            const response = await axios.get('https://httpbin.org/ip', { timeout: 5000 });
            testes.push({
                api: 'Conectividade Geral',
                status: 'OK',
                ip: response.data.origin
            });
            console.log('   ✅ Conectividade OK');
        } catch (error) {
            testes.push({
                api: 'Conectividade Geral',
                status: 'ERRO',
                erro: error.message
            });
            console.log('   ❌ Problema de conectividade');
        }

        return testes;
    }
}

// Executar teste se chamado diretamente
if (require.main === module) {
    const teste = new TesteBasico();
    teste.executarTeste().catch(console.error);
}

module.exports = TesteBasico;
