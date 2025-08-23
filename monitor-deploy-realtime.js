/**
 * 📡 MONITOR DEPLOY RAILWAY EM TEMPO REAL
 * Acompanhar quando deploy sair do fallback
 */

const axios = require('axios');

console.log('📡 MONITOR DEPLOY RAILWAY EM TEMPO REAL');
console.log('======================================');

let tentativas = 0;
const maxTentativas = 30; // 5 minutos (10s cada)

async function monitorarDeploy() {
    tentativas++;
    
    try {
        console.log(`🔍 Tentativa ${tentativas}/${maxTentativas} - ${new Date().toLocaleTimeString()}`);
        
        const response = await axios.get('https://coinbitclub-market-bot-production.up.railway.app/health', {
            timeout: 8000,
            validateStatus: () => true
        });
        
        const isFallback = response.headers['x-railway-fallback'] === 'true';
        
        if (isFallback) {
            console.log('⏳ Ainda em fallback - deploy processando...');
            console.log(`   Status: ${response.status} | Fallback: ${isFallback}`);
        } else {
            console.log('🎉 DEPLOY PROCESSADO COM SUCESSO!');
            console.log('================================');
            console.log(`✅ Status: ${response.status}`);
            console.log(`✅ Fallback: ${isFallback}`);
            console.log(`✅ Data:`, response.data);
            
            // Testar outros endpoints
            await testarEndpointsPrincipais();
            return;
        }
        
    } catch (error) {
        console.log(`❌ Erro na tentativa ${tentativas}: ${error.message}`);
        if (error.response) {
            console.log(`   Status: ${error.response.status} | Fallback: ${error.response.headers['x-railway-fallback']}`);
        }
    }
    
    if (tentativas < maxTentativas) {
        setTimeout(monitorarDeploy, 10000); // Tentar novamente em 10s
    } else {
        console.log('⚠️ TIMEOUT: Deploy não foi processado em 5 minutos');
        console.log('🔧 Ações recomendadas:');
        console.log('   1. Verificar Railway dashboard');
        console.log('   2. Verificar logs de build');
        console.log('   3. Considerar rollback');
    }
}

async function testarEndpointsPrincipais() {
    console.log('\n🧪 Testando endpoints principais...');
    
    const endpoints = [
        '/',
        '/health',
        '/api/system/status',
        '/api/current-mode',
        '/ativar-chaves-reais'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const url = `https://coinbitclub-market-bot-production.up.railway.app${endpoint}`;
            const response = await axios.get(url, {
                timeout: 5000,
                validateStatus: () => true
            });
            
            const status = response.status === 200 ? '✅' : response.status === 404 ? '❌' : '⚠️';
            console.log(`${status} ${endpoint}: ${response.status}`);
            
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.message}`);
        }
    }
    
    console.log('\n🎯 RESULTADO: Deploy concluído - endpoints testados!');
}

// Iniciar monitoramento
console.log('🚀 Iniciando monitoramento...');
console.log('⏱️ Verificando a cada 10 segundos por 5 minutos');
console.log('');
monitorarDeploy();
