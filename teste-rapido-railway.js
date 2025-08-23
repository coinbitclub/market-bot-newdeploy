/**
 * 🚀 TESTE RÁPIDO - VERIFICAÇÃO IMEDIATA
 * Teste express para identificar rapidamente o problema
 */

const axios = require('axios');

async function testeRapido() {
    console.log('🚀 TESTE RÁPIDO - RAILWAY ENDPOINTS');
    console.log('==================================');
    
    const baseUrl = 'https://coinbitclub-market-bot-production.up.railway.app';
    
    // 1. Verificar se Railway está online
    try {
        console.log('🔍 1. Testando conectividade Railway...');
        const response = await axios.get(baseUrl, { timeout: 10000 });
        console.log(`✅ Railway ONLINE - Status: ${response.status}`);
        console.log(`📊 Content-Type: ${response.headers['content-type']}`);
        console.log(`📏 Content-Length: ${response.headers['content-length'] || 'N/A'}`);
    } catch (error) {
        console.log(`❌ Railway OFFLINE - Erro: ${error.message}`);
        return;
    }
    
    // 2. Testar endpoints críticos
    const endpoints = ['/health', '/', '/api/system/status', '/api/current-mode'];
    
    console.log('\n🎯 2. Testando endpoints críticos...');
    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`${baseUrl}${endpoint}`, { 
                timeout: 5000,
                validateStatus: status => status < 500 
            });
            
            const sucesso = response.status < 400;
            console.log(`${sucesso ? '✅' : '❌'} ${endpoint}: ${response.status}`);
            
            if (sucesso && endpoint === '/health') {
                console.log(`   📊 Health: ${JSON.stringify(response.data)}`);
            }
            
        } catch (error) {
            console.log(`❌ ${endpoint}: ERRO - ${error.message}`);
        }
    }
    
    // 3. Verificar IP e geolocalização
    console.log('\n🌍 3. Verificando IP e localização...');
    try {
        const ipResponse = await axios.get('https://api.ipify.org?format=json');
        const ip = ipResponse.data.ip;
        console.log(`📍 Nosso IP: ${ip}`);
        
        const geoResponse = await axios.get(`http://ip-api.com/json/${ip}`);
        const geo = geoResponse.data;
        console.log(`🌍 Localização: ${geo.country}, ${geo.regionName}`);
        console.log(`🏢 ISP: ${geo.isp}`);
        
        if (geo.country !== 'Brazil' && geo.country !== 'United States') {
            console.log('⚠️ ALERTA: IP de região restrita para exchanges!');
        }
        
    } catch (error) {
        console.log(`❌ Erro verificação IP: ${error.message}`);
    }
    
    // 4. Teste IP fixo
    console.log('\n🔒 4. Verificando se IP é fixo...');
    try {
        const ips = [];
        for (let i = 0; i < 3; i++) {
            const response = await axios.get('https://api.ipify.org?format=json');
            ips.push(response.data.ip);
            if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const ipFixo = new Set(ips).size === 1;
        console.log(`📍 IPs: ${ips.join(', ')}`);
        console.log(`🔒 IP Fixo: ${ipFixo ? 'SIM ✅' : 'NÃO ⚠️'}`);
        
        if (!ipFixo) {
            console.log('🚨 PROBLEMA: IP dinâmico pode causar bloqueios!');
        }
        
    } catch (error) {
        console.log(`❌ Erro teste IP fixo: ${error.message}`);
    }
    
    console.log('\n🎯 CONCLUSÃO RÁPIDA:');
    console.log('==================');
    console.log('Se endpoints retornam 404 mas Railway está online,');
    console.log('o problema é na integração hybrid-server + app.js');
    console.log('');
    console.log('Se há problemas de IP/região, usar VPN/Proxy');
    console.log('');
    console.log('📋 Execute o diagnóstico completo para análise detalhada:');
    console.log('node diagnostico-completo-railway.js');
}

// Executar
testeRapido().catch(error => {
    console.error('❌ Erro no teste rápido:', error.message);
});
