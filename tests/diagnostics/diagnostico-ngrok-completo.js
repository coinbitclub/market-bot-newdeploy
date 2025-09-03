#!/usr/bin/env node

/**
 * 🔧 DIAGNÓSTICO COMPLETO NGROK
 * =============================
 * 
 * Identifica e corrige problemas de conexão do Ngrok
 */

const axios = require('axios');
const { exec } = require('child_process');

async function diagnosticoCompleto() {
    console.log('🔧 DIAGNÓSTICO COMPLETO DO NGROK');
    console.log('=' .repeat(50));
    
    // 1. Verificar se Railway está rodando
    await verificarRailway();
    
    // 2. Verificar logs do Railway
    await verificarLogsRailway();
    
    // 3. Verificar configuração Ngrok
    await verificarConfigNgrok();
    
    // 4. Soluções possíveis
    await sugerirSolucoes();
}

async function verificarRailway() {
    console.log('\n1️⃣ VERIFICANDO RAILWAY...');
    
    try {
        // Testar URL direta do Railway (sem Ngrok)
        const response = await axios.get('https://coinbitclub-market-bot-production.up.railway.app/health', { 
            timeout: 15000,
            validateStatus: () => true
        });
        
        console.log(`✅ Railway Status: ${response.status}`);
        
        if (response.status === 200) {
            console.log('✅ Railway está funcionando normalmente');
            console.log('🔍 Problema: Ngrok não está conectando ao Railway');
        } else {
            console.log('⚠️ Railway está online mas com problemas');
            console.log(`📋 Response: ${JSON.stringify(response.data)}`);
        }
        
    } catch (error) {
        console.log('❌ Railway não está respondendo');
        console.log(`📝 Erro: ${error.message}`);
        console.log('🚨 PROBLEMA PRINCIPAL: Railway está offline');
    }
}

async function verificarLogsRailway() {
    console.log('\n2️⃣ POSSÍVEIS PROBLEMAS NO RAILWAY...');
    
    console.log('🔍 Checklist de problemas comuns:');
    console.log('   □ Build falhou');
    console.log('   □ Variáveis de ambiente faltando');
    console.log('   □ Ngrok não instalou corretamente');
    console.log('   □ Porta errada (deve ser PORT=3000)');
    console.log('   □ Dockerfile com erro');
    console.log('   □ Processo Ngrok não iniciou');
    
    console.log('\n📋 PARA VERIFICAR NO RAILWAY:');
    console.log('   1. Acesse: https://railway.app/dashboard');
    console.log('   2. Clique: coinbitclub-market-bot');
    console.log('   3. Vá: Deployments > View Logs');
    console.log('   4. Procure: Erros em vermelho');
    console.log('   5. Busque: "Ngrok" nos logs');
}

async function verificarConfigNgrok() {
    console.log('\n3️⃣ VERIFICANDO CONFIGURAÇÃO NGROK...');
    
    const requiredVars = [
        'NGROK_AUTH_TOKEN',
        'NGROK_REGION', 
        'NGROK_SUBDOMAIN',
        'PORT',
        'NODE_ENV'
    ];
    
    console.log('📋 Variáveis que devem estar no Railway:');
    requiredVars.forEach(varName => {
        console.log(`   ✓ ${varName}=314SgsgTA9RpH3gJJenmvEEOnu3_3uXNyK3QBwE4u8vZa7tFZ`);
    });
}

async function sugerirSolucoes() {
    console.log('\n🔧 SOLUÇÕES PARA CORRIGIR:');
    console.log('=' .repeat(30));
    
    console.log('\n🚀 SOLUÇÃO 1: REDEPLOY FORÇADO');
    console.log('   1. Railway Dashboard > coinbitclub-market-bot');
    console.log('   2. Deployments > Latest Deploy');
    console.log('   3. Click "..." > Redeploy');
    console.log('   4. Aguardar 5-10 minutos');
    
    console.log('\n🔧 SOLUÇÃO 2: VERIFICAR VARIÁVEIS');
    console.log('   1. Settings > Variables');
    console.log('   2. Confirmar todas as variáveis estão preenchidas');
    console.log('   3. NGROK_AUTH_TOKEN não pode estar vazio');
    
    console.log('\n🐛 SOLUÇÃO 3: VERIFICAR LOGS');
    console.log('   1. Deployments > View Logs');
    console.log('   2. Procurar erros de Ngrok');
    console.log('   3. Verificar se "Ngrok tunnel established" aparece');
    
    console.log('\n⚡ SOLUÇÃO 4: BRANCH CORRETO');
    console.log('   1. Settings > Source');
    console.log('   2. Confirmar branch: clean-deploy');
    console.log('   3. Se não estiver, mudar para clean-deploy');
    
    console.log('\n🔄 TESTE RÁPIDO:');
    console.log('   Aguarde 5 minutos e acesse novamente:');
    console.log('   https://coinbitclub-bot.ngrok.io');
}

async function testeRapido() {
    console.log('\n⏱️ TESTE RÁPIDO EM 30 SEGUNDOS...');
    
    setTimeout(async () => {
        try {
            const response = await axios.get('https://coinbitclub-bot.ngrok.io', { 
                timeout: 10000,
                validateStatus: () => true
            });
            
            if (response.status === 200) {
                console.log('🎉 FUNCIONANDO! Problema resolvido!');
            } else {
                console.log(`⚠️ Status: ${response.status} - Ainda com problemas`);
            }
        } catch (error) {
            console.log('❌ Ainda offline - Continue com as soluções acima');
        }
    }, 30000);
    
    console.log('⏳ Aguardando 30 segundos para novo teste...');
}

// Executar diagnóstico
diagnosticoCompleto()
    .then(() => testeRapido())
    .catch(console.error);
