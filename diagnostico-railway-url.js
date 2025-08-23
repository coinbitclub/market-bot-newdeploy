/**
 * 🔍 DIAGNÓSTICO RAILWAY - Verificar status de deploy
 */

const axios = require('axios');

// URLs possíveis do Railway
const POSSIBLE_URLS = [
    'https://coinbitclub-market-bot-production.up.railway.app',
    'https://web-production-a1b2c3.up.railway.app', // Exemplo genérico
    'https://coinbitclub-market-bot.up.railway.app',
    'https://backend-production.up.railway.app'
];

console.log('🔍 DIAGNÓSTICO RAILWAY');
console.log('=====================');

async function diagnoseRailway() {
    for (const url of POSSIBLE_URLS) {
        try {
            console.log(`🌐 Testando: ${url}`);
            
            const response = await axios.get(url, {
                timeout: 5000,
                validateStatus: () => true
            });
            
            console.log(`   Status: ${response.status}`);
            
            if (response.status === 200 || response.status === 404) {
                console.log(`   ✅ Railway ativo!`);
                console.log(`   📋 Conteúdo: ${JSON.stringify(response.data).substring(0, 100)}...`);
                
                // Testar health endpoint especificamente
                try {
                    const healthResponse = await axios.get(`${url}/health`, {
                        timeout: 3000,
                        validateStatus: () => true
                    });
                    console.log(`   🔍 /health: ${healthResponse.status}`);
                } catch (healthError) {
                    console.log(`   🔍 /health: ERROR`);
                }
                
                console.log(`\n🎯 URL ENCONTRADA: ${url}`);
                return url;
            }
            
        } catch (error) {
            console.log(`   ❌ Falha: ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log('❌ Nenhuma URL do Railway funcionando');
    console.log('\n🔧 SOLUÇÕES:');
    console.log('1. Verificar URL real no dashboard Railway');
    console.log('2. Verificar se deploy foi concluído');
    console.log('3. Verificar logs do Railway');
    
    return null;
}

// Teste local também
async function testLocal() {
    console.log('🏠 Testando servidor local...');
    
    try {
        const response = await axios.get('http://localhost:3000/health', {
            timeout: 2000,
            validateStatus: () => true
        });
        
        console.log(`   ✅ Local funcionando: ${response.status}`);
        return true;
    } catch (error) {
        console.log(`   ❌ Local não disponível: ${error.message}`);
        return false;
    }
}

// Executar diagnóstico
async function main() {
    const railwayUrl = await diagnoseRailway();
    const localWorking = await testLocal();
    
    console.log('\n📊 RESUMO:');
    console.log(`🌐 Railway: ${railwayUrl ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
    console.log(`🏠 Local: ${localWorking ? 'FUNCIONANDO' : 'OFFLINE'}`);
    
    if (railwayUrl) {
        console.log(`\n🎯 Use esta URL para testes:`);
        console.log(`   ${railwayUrl}`);
        console.log('\n🚀 Atualize o arquivo teste-rapido-endpoints.js com esta URL');
    }
}

main().catch(console.error);
