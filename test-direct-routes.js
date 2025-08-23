#!/usr/bin/env node

/**
 * 🧪 TESTE DIRETO DAS ROTAS PRINCIPAIS
 */

const axios = require('axios');

const BASE_URL = 'https://coinbitclub-backend.railway.app';

async function testRoute(path, method = 'GET', data = null) {
    try {
        console.log(`🔍 Testando ${method} ${path}`);
        
        let response;
        if (method === 'GET') {
            response = await axios.get(`${BASE_URL}${path}`);
        } else if (method === 'POST') {
            response = await axios.post(`${BASE_URL}${path}`, data);
        }
        
        console.log(`✅ ${path}: Status ${response.status}`);
        console.log(`   📊 Response: ${typeof response.data === 'object' ? JSON.stringify(response.data).slice(0, 100) : response.data.toString().slice(0, 100)}`);
        return true;
    } catch (error) {
        console.log(`❌ ${path}: ${error.response ? error.response.status : error.message}`);
        return false;
    }
}

async function runDirectTests() {
    console.log('🧪 TESTE DIRETO DAS ROTAS PRINCIPAIS\n');
    
    const routes = [
        { path: '/', method: 'GET' },
        { path: '/health', method: 'GET' },
        { path: '/status', method: 'GET' },
        { path: '/dashboard', method: 'GET' },
        { path: '/api/users', method: 'GET' },
        { path: '/api/positions', method: 'GET' },
        { path: '/webhook', method: 'GET' },
        { path: '/webhook', method: 'POST', data: { test: true } },
        { path: '/system-status', method: 'GET' },
        { path: '/commission-plans', method: 'GET' }
    ];
    
    let passed = 0;
    
    for (const route of routes) {
        if (await testRoute(route.path, route.method, route.data)) {
            passed++;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📊 Resultado: ${passed}/${routes.length} rotas funcionando`);
}

runDirectTests().catch(console.error);
