/**
 * 🔧 VERIFICADOR DE PRODUÇÃO - DASHBOARD
 * =====================================
 * 
 * Script para verificar se o dashboard está funcionando
 */

const https = require('https');

const urls = [
    'https://coinbitclub-market-bot.up.railway.app/status',
    'https://coinbitclub-market-bot.up.railway.app/health',
    'https://coinbitclub-market-bot.up.railway.app/',
    'https://coinbitclub-market-bot.up.railway.app/dashboard-production'
];

async function checkURL(url) {
    return new Promise((resolve) => {
        console.log(`🔍 Testando: ${url}`);
        
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`✅ Status: ${res.statusCode} - ${url}`);
                if (res.statusCode === 404) {
                    console.log(`❌ Rota não encontrada: ${url}`);
                } else if (res.statusCode === 200) {
                    console.log(`✅ OK: ${url}`);
                    if (data.includes('Dashboard') || data.includes('dashboard')) {
                        console.log(`📊 Dashboard detectado!`);
                    }
                }
                resolve({ url, status: res.statusCode, data: data.substring(0, 100) });
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ Erro: ${url} - ${error.message}`);
            resolve({ url, error: error.message });
        });
        
        req.setTimeout(10000, () => {
            console.log(`⏰ Timeout: ${url}`);
            req.destroy();
            resolve({ url, error: 'timeout' });
        });
    });
}

async function main() {
    console.log('🚀 VERIFICANDO PRODUÇÃO - COINBITCLUB DASHBOARD');
    console.log('=================================================');
    console.log('');
    
    const results = [];
    
    for (const url of urls) {
        const result = await checkURL(url);
        results.push(result);
        console.log('');
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo entre requests
    }
    
    console.log('📋 RESUMO:');
    console.log('==========');
    results.forEach(result => {
        if (result.error) {
            console.log(`❌ ${result.url} - ERRO: ${result.error}`);
        } else {
            console.log(`${result.status === 200 ? '✅' : '❌'} ${result.url} - Status: ${result.status}`);
        }
    });
    
    const dashboardResult = results.find(r => r.url.includes('dashboard-production'));
    if (dashboardResult && dashboardResult.status === 200) {
        console.log('');
        console.log('🎉 DASHBOARD DE PRODUÇÃO ESTÁ FUNCIONANDO!');
    } else if (dashboardResult && dashboardResult.status === 404) {
        console.log('');
        console.log('⚠️ DASHBOARD DE PRODUÇÃO NÃO ENCONTRADO');
        console.log('🔧 É necessário fazer deploy das novas rotas');
    } else {
        console.log('');
        console.log('❌ PROBLEMA COM SERVIDOR DE PRODUÇÃO');
    }
}

main().catch(console.error);
