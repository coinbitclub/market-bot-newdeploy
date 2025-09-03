#!/usr/bin/env node

/**
 * 🧪 TESTE RÁPIDO - ROTAS PRINCIPAIS
 * =================================
 */

const axios = require('axios');

const BASE_URL = 'https://coinbitclub-market-bot.up.railway.app';

async function testMainRoutes() {
    console.log('🧪 TESTE RÁPIDO DAS ROTAS PRINCIPAIS\n');
    
    const tests = [
        { name: 'Health Check', url: '/health' },
        { name: 'Status System', url: '/status' },
        { name: 'Dashboard', url: '/dashboard' },
        { name: 'Users API', url: '/api/users' },
        { name: 'Positions API', url: '/api/positions' }
    ];

    for (const test of tests) {
        try {
            console.log(`🔍 Testando: ${test.name}`);
            const response = await axios.get(`${BASE_URL}${test.url}`);
            console.log(`✅ ${test.name}: ${response.status} OK`);
            
            if (test.url === '/api/users' && response.data.users) {
                console.log(`   📊 ${response.data.users.length} usuários encontrados`);
            }
            if (test.url === '/api/positions' && response.data.positions) {
                console.log(`   📊 ${response.data.positions.length} posições encontradas`);
            }
            
        } catch (error) {
            console.log(`❌ ${test.name}: ${error.response?.status || 'ERROR'} - ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎯 Teste concluído!');
}

testMainRoutes();
