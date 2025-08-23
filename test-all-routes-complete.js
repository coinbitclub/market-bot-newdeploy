#!/usr/bin/env node

/**
 * 🧪 TESTE COMPLETO DE ROTAS - COINBITCLUB MARKET BOT
 * ==================================================
 * 
 * Script para testar todas as rotas do sistema em produção
 */

const axios = require('axios');

// Configuração base
const BASE_URL = 'https://coinbitclub-market-bot.up.railway.app';
const LOCAL_URL = 'http://localhost:8080';

// Usar Railway se disponível, senão local
const API_URL = BASE_URL;

console.log('🧪 INICIANDO TESTES COMPLETOS DE ROTAS\n');
console.log(`🌐 URL Base: ${API_URL}\n`);

// Configurar timeout global
axios.defaults.timeout = 10000;

// Resultados dos testes
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// Função para executar teste
async function runTest(name, testFunction) {
    testResults.total++;
    console.log(`🔍 Testando: ${name}`);
    
    try {
        const result = await testFunction();
        testResults.passed++;
        console.log(`✅ ${name}: PASSOU`);
        if (result) console.log(`   📊 ${result}\n`);
        
        testResults.details.push({
            name,
            status: 'PASSOU',
            result: result || 'OK'
        });
        
        return true;
    } catch (error) {
        testResults.failed++;
        console.log(`❌ ${name}: FALHOU`);
        console.log(`   🚨 Erro: ${error.message}\n`);
        
        testResults.details.push({
            name,
            status: 'FALHOU',
            error: error.message
        });
        
        return false;
    }
}

// Testes individuais
const tests = {
    
    // 1. Health Check
    async testHealth() {
        const response = await axios.get(`${API_URL}/health`);
        if (response.status === 200) {
            if (typeof response.data === 'object' && response.data.status === 'healthy') {
                return `Status: ${response.data.status}, Timestamp: ${response.data.timestamp}`;
            } else if (response.data === 'OK' || response.data.includes('OK')) {
                return `Health: OK (string response)`;
            }
            return `Health: ${JSON.stringify(response.data)}`;
        }
        throw new Error('Health check inválido');
    },

    // 2. Status do Sistema
    async testStatus() {
        const response = await axios.get(`${API_URL}/status`);
        if (response.status === 200) {
            return `Sistema: ${response.data.status || 'OK'}`;
        }
        throw new Error('Status endpoint falhou');
    },

    // 3. Dashboard
    async testDashboard() {
        const response = await axios.get(`${API_URL}/dashboard`);
        if (response.status === 200) {
            return `Dashboard carregado`;
        }
        throw new Error('Dashboard não acessível');
    },

    // 4. API Users (GET)
    async testUsersAPI() {
        const response = await axios.get(`${API_URL}/api/users`);
        if (response.status === 200) {
            const users = Array.isArray(response.data) ? response.data : response.data.users || [];
            return `${users.length} usuários encontrados`;
        }
        throw new Error('API Users falhou');
    },

    // 5. API Positions
    async testPositionsAPI() {
        const response = await axios.get(`${API_URL}/api/positions`);
        if (response.status === 200) {
            const positions = Array.isArray(response.data) ? response.data : response.data.positions || [];
            return `${positions.length} posições encontradas`;
        }
        throw new Error('API Positions falhou');
    },

    // 6. Webhook (GET - informações)
    async testWebhookInfo() {
        const response = await axios.get(`${API_URL}/webhook`);
        if (response.status === 200) {
            return 'Webhook endpoint ativo';
        }
        throw new Error('Webhook info falhou');
    },

    // 7. API Trading Status
    async testTradingStatus() {
        const response = await axios.get(`${API_URL}/api/trading/status`);
        if (response.status === 200) {
            return `Trading: ${response.data.enabled ? 'ATIVO' : 'INATIVO'}`;
        }
        throw new Error('Trading status falhou');
    },

    // 8. API Signals
    async testSignalsAPI() {
        const response = await axios.get(`${API_URL}/api/signals`);
        if (response.status === 200) {
            const signals = Array.isArray(response.data) ? response.data : response.data.signals || [];
            return `${signals.length} sinais encontrados`;
        }
        throw new Error('API Signals falhou');
    },

    // 9. API Balance (requer autenticação, mas testa endpoint)
    async testBalanceAPI() {
        try {
            const response = await axios.get(`${API_URL}/api/balance`);
            return 'Balance endpoint acessível';
        } catch (error) {
            if (error.response && error.response.status === 401) {
                return 'Balance endpoint protegido (401 esperado)';
            }
            throw error;
        }
    },

    // 10. API Financial Summary
    async testFinancialSummary() {
        try {
            const response = await axios.get(`${API_URL}/api/financial/summary`);
            if (response.status === 200) {
                return 'Resumo financeiro disponível';
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                return 'Resumo financeiro protegido (401 esperado)';
            }
            throw error;
        }
    },

    // 11. API Market Data
    async testMarketData() {
        const response = await axios.get(`${API_URL}/api/market/data`);
        if (response.status === 200) {
            return 'Dados de mercado disponíveis';
        }
        throw new Error('Market data falhou');
    },

    // 12. API Dominance
    async testDominanceAPI() {
        const response = await axios.get(`${API_URL}/api/dominance`);
        if (response.status === 200) {
            return `Dominância BTC: ${response.data.dominance || 'N/A'}%`;
        }
        throw new Error('Dominance API falhou');
    },

    // 13. Webhook POST (teste com dados mock)
    async testWebhookPost() {
        const mockSignal = {
            symbol: 'BTCUSDT',
            action: 'BUY',
            price: 45000,
            test: true
        };
        
        try {
            const response = await axios.post(`${API_URL}/webhook`, mockSignal);
            return `Webhook aceita sinais (${response.status})`;
        } catch (error) {
            if (error.response && error.response.status >= 200 && error.response.status < 500) {
                return `Webhook processou sinal (${error.response.status})`;
            }
            throw error;
        }
    },

    // 14. API Register (POST - teste com dados inválidos)
    async testRegisterEndpoint() {
        try {
            const response = await axios.post(`${API_URL}/api/register`, {
                test: true,
                invalid: 'data'
            });
            return 'Register endpoint acessível';
        } catch (error) {
            if (error.response && error.response.status === 400) {
                return 'Register endpoint validando dados (400 esperado)';
            }
            throw error;
        }
    },

    // 15. API Login (POST - teste com dados inválidos)
    async testLoginEndpoint() {
        try {
            const response = await axios.post(`${API_URL}/api/login`, {
                test: true,
                invalid: 'data'
            });
            return 'Login endpoint acessível';
        } catch (error) {
            if (error.response && error.response.status === 400 || error.response.status === 401) {
                return 'Login endpoint protegido (400/401 esperado)';
            }
            throw error;
        }
    }
};

// Executar todos os testes
async function runAllTests() {
    console.log('🚀 Iniciando bateria de testes...\n');
    
    // Executar testes em sequência
    for (const [testName, testFunction] of Object.entries(tests)) {
        await runTest(testName.replace('test', ''), testFunction);
        
        // Pequena pausa entre testes
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Relatório final
    console.log('📊 RELATÓRIO FINAL DE TESTES');
    console.log('='.repeat(50));
    console.log(`✅ Passaram: ${testResults.passed}`);
    console.log(`❌ Falharam: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.total}`);
    console.log(`📈 Taxa de Sucesso: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETALHES DOS TESTES:');
    console.log('-'.repeat(50));
    
    testResults.details.forEach((test, index) => {
        const icon = test.status === 'PASSOU' ? '✅' : '❌';
        console.log(`${icon} ${index + 1}. ${test.name}: ${test.status}`);
        if (test.result) console.log(`   📊 ${test.result}`);
        if (test.error) console.log(`   🚨 ${test.error}`);
    });

    console.log('\n🎯 RESUMO EXECUTIVO:');
    if (testResults.passed >= testResults.total * 0.8) {
        console.log('🟢 SISTEMA OPERACIONAL - A maioria das rotas está funcionando');
    } else if (testResults.passed >= testResults.total * 0.6) {
        console.log('🟡 SISTEMA PARCIAL - Algumas rotas precisam de atenção');
    } else {
        console.log('🔴 SISTEMA COM PROBLEMAS - Muitas rotas falhando');
    }

    console.log(`\n⏱️  Teste concluído em: ${new Date().toLocaleString()}`);
    
    return testResults;
}

// Executar testes
runAllTests().catch(error => {
    console.error('💥 Erro crítico no teste:', error);
    process.exit(1);
});
