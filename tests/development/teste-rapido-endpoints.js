/**
 * 🎯 TESTE RÁPIDO - ENDPOINTS CRÍTICOS
 * Verificar se correção funcionou (5 endpoints principais)
 */

const axios = require('axios');

// URL do Railway (substitua pela sua)
const RAILWAY_URL = 'https://coinbitclub-market-bot-production.up.railway.app';

console.log('🎯 TESTE RÁPIDO - ENDPOINTS CRÍTICOS');
console.log('====================================');
console.log(`🌐 URL: ${RAILWAY_URL}`);
console.log('');

// Endpoints críticos para teste rápido
const CRITICAL_ENDPOINTS = [
    '/health',
    '/',
    '/api/system/status',
    '/api/current-mode',
    '/ativar-chaves-reais'
];

async function quickTest() {
    console.log('🚀 Testando endpoints críticos...\n');
    
    let working = 0;
    let total = CRITICAL_ENDPOINTS.length;
    
    for (const endpoint of CRITICAL_ENDPOINTS) {
        try {
            process.stdout.write(`🔍 ${endpoint.padEnd(25)} `);
            
            const response = await axios.get(`${RAILWAY_URL}${endpoint}`, {
                timeout: 8000,
                validateStatus: () => true
            });
            
            if (response.status === 404) {
                console.log('❌ 404 Not Found');
            } else if (response.status < 500) {
                console.log(`✅ ${response.status} OK`);
                working++;
            } else {
                console.log(`⚠️ ${response.status} Server Error`);
            }
            
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.log('⏱️ TIMEOUT');
            } else {
                console.log(`❌ ${error.message}`);
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 RESULTADO:');
    console.log(`✅ Funcionando: ${working}/${total}`);
    console.log(`📈 Taxa sucesso: ${(working/total*100).toFixed(1)}%`);
    
    if (working === total) {
        console.log('\n🎉 PERFEITO! Todos endpoints críticos funcionando!');
        console.log('✅ Correção do hybrid-server foi um SUCESSO!');
        console.log('🔥 Pode executar o teste completo dos 85+ endpoints');
    } else if (working > total/2) {
        console.log('\n🔄 PROGRESSO! Maioria funcionando');
        console.log('⏳ Deploy pode ainda estar processando');
        console.log('🔄 Tente novamente em 1-2 minutos');
    } else {
        console.log('\n❌ PROBLEMA detectado');
        console.log('🔧 Verificar logs do Railway');
        console.log('📋 Deploy pode ter falhado');
    }
    
    console.log('\n🎯 Próximo passo:');
    console.log('📋 node teste-85-endpoints-completo.js');
}

// Executar teste
quickTest().catch(error => {
    console.error('❌ Erro:', error.message);
});
