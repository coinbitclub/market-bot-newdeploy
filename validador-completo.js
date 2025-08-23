#!/usr/bin/env node

/**
 * 🧪 VALIDADOR COMPLETO PÓS-IMPLEMENTAÇÃO
 * =======================================
 */

const axios = require('axios');

const BASE_URL = 'https://coinbitclub-market-bot.up.railway.app';

async function validarTodasRotas() {
    console.log('🧪 VALIDADOR COMPLETO - TODAS AS ROTAS\n');
    
    const tests = [
        { name: 'Health Check', method: 'GET', url: '/health' },
        { name: 'Status System', method: 'GET', url: '/status' },
        { name: 'Dashboard', method: 'GET', url: '/dashboard' },
        { name: 'Users API', method: 'GET', url: '/api/users' },
        { name: 'Positions API', method: 'GET', url: '/api/positions' },
        { name: 'Webhook Info', method: 'GET', url: '/webhook' },
        { name: 'Trading Status', method: 'GET', url: '/api/trading/status' },
        { name: 'Signals API', method: 'GET', url: '/api/signals' },
        { name: 'Balance API', method: 'GET', url: '/api/balance' },
        { name: 'Financial Summary', method: 'GET', url: '/api/financial/summary' },
        { name: 'Market Data', method: 'GET', url: '/api/market/data' },
        { name: 'Dominance API', method: 'GET', url: '/api/dominance' },
        { name: 'Webhook POST', method: 'POST', url: '/webhook', data: { test: true } },
        { name: 'Register', method: 'POST', url: '/api/register', data: { username: 'test', email: 'test@test.com', password: '123' } },
        { name: 'Login', method: 'POST', url: '/api/login', data: { email: 'test@test.com', password: '123' } }
    ];

    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            console.log(`🔍 Testando: ${test.name}`);
            
            let response;
            if (test.method === 'POST') {
                response = await axios.post(`${BASE_URL}${test.url}`, test.data || {});
            } else {
                response = await axios.get(`${BASE_URL}${test.url}`);
            }
            
            console.log(`✅ ${test.name}: ${response.status} OK`);
            passed++;
            
        } catch (error) {
            console.log(`❌ ${test.name}: ${error.response?.status || 'ERROR'} - ${error.message}`);
            failed++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    const total = passed + failed;
    const successRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`\n📊 RESULTADO FINAL:\n`);
    console.log(`✅ Passaram: ${passed}`);
    console.log(`❌ Falharam: ${failed}`);
    console.log(`📊 Total: ${total}`);
    console.log(`📈 Taxa de Sucesso: ${successRate}%\n`);
    
    if (successRate >= 90) {
        console.log('🎉 SISTEMA EXCELENTE - 90%+ funcionando!');
    } else if (successRate >= 80) {
        console.log('🟢 SISTEMA BOM - 80%+ funcionando!');
    } else if (successRate >= 60) {
        console.log('🟡 SISTEMA PARCIAL - Precisa melhorias');
    } else {
        console.log('🔴 SISTEMA COM PROBLEMAS');
    }
}

validarTodasRotas();