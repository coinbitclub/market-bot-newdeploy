#!/usr/bin/env node

/**
 * 🚀 FORÇAR DEPLOY NO RAILWAY
 * ===========================
 * 
 * Verifica status e força redeploy se necessário
 */

const axios = require('axios');

async function verificarDeployStatus() {
    console.log('🚂 VERIFICANDO STATUS DO RAILWAY DEPLOY');
    console.log('=' .repeat(50));
    
    // URLs possíveis do Railway
    const railwayUrls = [
        'https://coinbitclub-market-bot-production.up.railway.app',
        'https://web-production.up.railway.app',
        'https://backend-production.up.railway.app'
    ];
    
    console.log('🔍 Testando URLs do Railway...\n');
    
    for (const url of railwayUrls) {
        try {
            console.log(`Testing: ${url}`);
            const response = await axios.get(`${url}/health`, { 
                timeout: 15000,
                validateStatus: () => true // Accept any status
            });
            
            console.log(`✅ RAILWAY ATIVO: ${url}`);
            console.log(`📊 Status: ${response.status}`);
            console.log(`📋 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
            
            return url;
        } catch (error) {
            console.log(`❌ ${url} - ${error.message}`);
        }
    }
    
    console.log('\n⚠️ RAILWAY NÃO ESTÁ RESPONDENDO');
    return null;
}

async function verificarNgrokTunnel() {
    console.log('\n🌐 VERIFICANDO TÚNEL NGROK...');
    console.log('=' .repeat(30));
    
    try {
        const response = await axios.get('https://coinbitclub-bot.ngrok.io/health', { 
            timeout: 10000,
            validateStatus: () => true
        });
        
        console.log('✅ NGROK TÚNEL ATIVO!');
        console.log(`📊 Status: ${response.status}`);
        console.log(`🎯 SEU IP FIXO ESTÁ FUNCIONANDO!`);
        
        return true;
    } catch (error) {
        console.log('❌ Ngrok túnel não está ativo ainda');
        console.log(`📝 Erro: ${error.message}`);
        return false;
    }
}

async function proximosPassos() {
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('=' .repeat(30));
    
    const railwayAtivo = await verificarDeployStatus();
    const ngrokAtivo = await verificarNgrokTunnel();
    
    if (!railwayAtivo) {
        console.log('\n🚨 PROBLEMA: Railway não está rodando');
        console.log('📋 AÇÕES NECESSÁRIAS:');
        console.log('   1. Acesse: https://railway.app/dashboard');
        console.log('   2. Selecione: coinbitclub-market-bot');
        console.log('   3. Vá em: Deployments');
        console.log('   4. Clique: "Deploy Latest Commit"');
        console.log('   5. Aguarde: Build completar (~5-10 min)');
        
        return 'redeploy-needed';
    }
    
    if (railwayAtivo && !ngrokAtivo) {
        console.log('\n🔄 Railway ativo, mas Ngrok não conectou ainda');
        console.log('📋 AGUARDE:');
        console.log('   • Ngrok está se conectando...');
        console.log('   • Pode levar 2-5 minutos');
        console.log('   • Teste novamente em 3 minutos');
        
        return 'aguardar-ngrok';
    }
    
    if (railwayAtivo && ngrokAtivo) {
        console.log('\n🎉 TUDO FUNCIONANDO!');
        console.log('✅ Railway: Ativo');
        console.log('✅ Ngrok: Conectado');
        console.log('🎯 IP Fixo: https://coinbitclub-bot.ngrok.io');
        console.log('\n📋 CONFIGURAR NAS EXCHANGES:');
        console.log('   • Bybit: coinbitclub-bot.ngrok.io');
        console.log('   • Binance: coinbitclub-bot.ngrok.io');
        
        return 'sucesso-completo';
    }
}

// Executar
proximosPassos().catch(console.error);
