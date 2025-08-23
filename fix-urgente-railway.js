#!/usr/bin/env node

/**
 * 🚨 FIX URGENTE - RAILWAY 404
 * ============================
 * 
 * Corrige problema de aplicação não encontrada
 */

const axios = require('axios');

async function criarFixUrgente() {
    console.log('🚨 FIX URGENTE PARA RAILWAY 404');
    console.log('=' .repeat(40));
    
    console.log('\n🔍 PROBLEMA IDENTIFICADO:');
    console.log('   ❌ Railway retorna 404 "Application not found"');
    console.log('   ❌ Isso significa que o app.js não está rodando');
    console.log('   ❌ Ou as rotas não estão configuradas');
    
    console.log('\n🔧 POSSÍVEIS CAUSAS:');
    console.log('   1. Build falhou');
    console.log('   2. app.js não está sendo executado');
    console.log('   3. Rotas /health não existem');
    console.log('   4. Porta errada');
    console.log('   5. Dockerfile CMD incorreto');
    
    console.log('\n⚡ AÇÕES IMEDIATAS:');
    console.log('=' .repeat(20));
    
    console.log('\n1️⃣ VERIFICAR LOGS DO RAILWAY:');
    console.log('   🔗 https://railway.app/dashboard');
    console.log('   📋 Deployments > View Logs');
    console.log('   🔍 Procurar erros em vermelho');
    
    console.log('\n2️⃣ VERIFICAR SE BUILD PASSOU:');
    console.log('   ✅ Build should show "SUCCESS"');
    console.log('   ✅ Deploy should show "ACTIVE"');
    console.log('   ❌ Se falhou, redeploy necessário');
    
    console.log('\n3️⃣ FORÇAR REDEPLOY:');
    console.log('   1. Railway Dashboard');
    console.log('   2. Deployments tab');
    console.log('   3. Latest deployment');
    console.log('   4. Click "..." menu');
    console.log('   5. Select "Redeploy"');
    console.log('   6. Wait 5-10 minutes');
    
    console.log('\n4️⃣ VERIFICAR BRANCH:');
    console.log('   1. Settings > Source');
    console.log('   2. Should be: clean-deploy');
    console.log('   3. If wrong: change to clean-deploy');
    
    console.log('\n5️⃣ BACKUP PLAN - USAR MAIN BRANCH:');
    console.log('   Se clean-deploy não funcionar:');
    console.log('   1. Settings > Source > Branch: main');
    console.log('   2. Redeploy with main branch');
    
    console.log('\n⏰ TEMPO ESTIMADO DE CORREÇÃO:');
    console.log('   🕐 Redeploy: 5-10 minutos');
    console.log('   🕐 Build + Deploy: 10-15 minutos');
    console.log('   🕐 Total: Máximo 15 minutos');
    
    console.log('\n📞 MONITORAMENTO:');
    console.log('   Execute a cada 2 minutos:');
    console.log('   node diagnostico-ngrok-completo.js');
}

async function testarTodosEndpoints() {
    console.log('\n🧪 TESTANDO OUTROS ENDPOINTS...');
    
    const baseUrl = 'https://coinbitclub-market-bot-production.up.railway.app';
    const endpoints = ['/', '/health', '/api/status', '/ping'];
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`${baseUrl}${endpoint}`, { 
                timeout: 10000,
                validateStatus: () => true
            });
            console.log(`${endpoint}: Status ${response.status}`);
            
            if (response.status === 200) {
                console.log(`✅ FUNCIONANDO: ${baseUrl}${endpoint}`);
            }
        } catch (error) {
            console.log(`${endpoint}: ${error.message}`);
        }
    }
}

// Executar
criarFixUrgente()
    .then(() => testarTodosEndpoints())
    .catch(console.error);
