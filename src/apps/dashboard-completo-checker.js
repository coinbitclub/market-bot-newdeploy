const fs = require('fs');
const path = require('path');

// Verificar se todos os métodos dos endpoints estão implementados
const dashboardFile = path.join(__dirname, 'dashboard-completo.js');
const content = fs.readFileSync(dashboardFile, 'utf8');

// Endpoints mapeados
const endpoints = [
    { route: '/api/dashboard/realtime', method: 'getDadosTempoReal' },
    { route: '/api/dashboard/signals', method: 'getFluxoSinais' },
    { route: '/api/dashboard/market', method: 'getAnalisesMercado' },
    { route: '/api/dashboard/ai-decisions', method: 'getDecissoesIA' },
    { route: '/api/dashboard/orders', method: 'getOrdensExecucoes' },
    { route: '/api/dashboard/users', method: 'process.env.API_KEY_HERE' },
    { route: '/api/dashboard/balances', method: 'process.env.API_KEY_HERE' },
    { route: '/api/dashboard/metrics', method: 'process.env.API_KEY_HERE' },
    { route: '/api/dashboard/system', method: 'getStatusSistema' },
    { route: '/api/dashboard/admin-logs', method: 'process.env.API_KEY_HERE' },
    { route: '/api/dashboard/search', method: 'buscarDados' },
    { route: '/api/dashboard/performance-metrics', method: 'process.env.API_KEY_HERE' },
    { route: '/api/dashboard/aguia-news', method: 'getAguiaNewsReports' },
    { route: '/api/dashboard/stream', method: 'streamDados' },
    { route: '/api/aguia/latest', method: 'getAguiaLatest' },
    { route: '/api/aguia/stats', method: 'getAguiaStats' },
    { route: '/api/aguia/radars', method: 'getAguiaRadars' },
    { route: '/api/aguia/generate', method: 'generateAguiaRadar' }
];

console.log('🔍 VERIFICANDO IMPLEMENTAÇÃO DOS ENDPOINTS NO DASHBOARD COMPLETO\n');

let allImplemented = true;
let summary = {
    implemented: [],
    missing: [],
    total: endpoints.length
};

endpoints.forEach(endpoint => {
    const methodPattern = new RegExp(`async\\s+${endpoint.method}\\s*\\(`, 'g');
    const isImplemented = methodPattern.test(content);
    
    if (isImplemented) {
        console.log(`✅ ${endpoint.route} -> ${endpoint.method}`);
        summary.implemented.push(endpoint);
    } else {
        console.log(`❌ ${endpoint.route} -> ${endpoint.method} (NÃO IMPLEMENTADO)`);
        summary.missing.push(endpoint);
        allImplemented = false;
    }
});

console.log('\n📊 RESUMO DA VERIFICAÇÃO:');
console.log(`✅ Implementados: ${summary.implemented.length}/${summary.total}`);
console.log(`❌ Faltando: ${summary.missing.length}/${summary.total}`);

if (summary.missing.length > 0) {
    console.log('\n🛠️  MÉTODOS QUE PRECISAM SER IMPLEMENTADOS:');
    summary.missing.forEach(endpoint => {
        console.log(`   - ${endpoint.method} (${endpoint.route})`);
    });
}

console.log('\n🎯 PRÓXIMOS PASSOS:');
if (allImplemented) {
    console.log('✅ Todos os endpoints estão implementados!');
    console.log('🚀 O dashboard está pronto para deploy!');
} else {
    console.log('⚠️  Alguns métodos precisam ser implementados antes do deploy.');
    console.log('📝 Execute o dashboard-completo-fixes.js para completar a implementação.');
}

module.exports = summary;
