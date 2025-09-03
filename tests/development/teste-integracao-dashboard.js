/**
 * 🔍 TESTE DE INTEGRAÇÃO DO DASHBOARD
 * ===================================
 * 
 * Script para testar todas as APIs e verificar integração
 */

const { default: fetch } = require('node-fetch');

const BASE_URL = 'http://localhost:5003';

async function testarTodasAPIs() {
    console.log('🔍 INICIANDO TESTE DE INTEGRAÇÃO DO DASHBOARD');
    console.log('============================================');

    const tests = [
        {
            name: '📊 Dados em Tempo Real',
            url: `${BASE_URL}/api/dashboard/realtime`,
            test: (data) => data.success && data.data.signals && data.data.orders
        },
        {
            name: '📡 Fluxo de Sinais',
            url: `${BASE_URL}/api/dashboard/signals`,
            test: (data) => data.success && Array.isArray(data.data.signals)
        },
        {
            name: '💰 Ordens',
            url: `${BASE_URL}/api/dashboard/orders`,
            test: (data) => data.success && Array.isArray(data.data.orders)
        },
        {
            name: '👥 Usuários',
            url: `${BASE_URL}/api/dashboard/users`,
            test: (data) => data.success && Array.isArray(data.data.userPerformance)
        },
        {
            name: '🔧 Status Sistema',
            url: `${BASE_URL}/api/dashboard/system`,
            test: (data) => data.success && data.data.database
        },
        {
            name: '🦅 Águia Stats',
            url: `${BASE_URL}/api/aguia/stats`,
            test: (data) => data.success && data.stats.total_radars !== undefined
        },
        {
            name: '🦅 Águia Latest',
            url: `${BASE_URL}/api/aguia/latest`,
            test: (data) => data.success // radar pode ser null
        },
        {
            name: '🤖 IA Análises',
            url: `${BASE_URL}/api/ia/analyses`,
            test: (data) => data.success && Array.isArray(data.data.analyses)
        },
        {
            name: '🚨 IA Alertas',
            url: `${BASE_URL}/api/ia/alerts`,
            test: (data) => data.success && Array.isArray(data.data.alerts)
        },
        {
            name: '🎯 IA Supervisor',
            url: `${BASE_URL}/api/ia/supervisor`,
            test: (data) => data.success && data.data.supervisor_status
        }
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
        try {
            console.log(`\n🔄 Testando: ${test.name}`);
            console.log(`   URL: ${test.url}`);

            const response = await fetch(test.url);
            const data = await response.json();

            if (test.test(data)) {
                console.log(`   ✅ PASSOU`);
                console.log(`   📊 Dados: ${JSON.stringify(data).substring(0, 100)}...`);
                passedTests++;
            } else {
                console.log(`   ❌ FALHOU - Estrutura de dados incorreta`);
                console.log(`   📊 Dados: ${JSON.stringify(data, null, 2)}`);
            }

        } catch (error) {
            console.log(`   ❌ ERRO: ${error.message}`);
        }
    }

    console.log(`\n📊 RESULTADO DOS TESTES:`);
    console.log(`=============================`);
    console.log(`✅ Testes Passou: ${passedTests}/${totalTests}`);
    console.log(`❌ Testes Falhou: ${totalTests - passedTests}/${totalTests}`);
    console.log(`📈 Taxa de Sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (passedTests === totalTests) {
        console.log(`\n🎉 TODOS OS TESTES PASSARAM!`);
        console.log(`   O backend está 100% funcional.`);
        console.log(`   Se o frontend não está mostrando dados, o problema é no JavaScript.`);
    } else {
        console.log(`\n⚠️ ALGUNS TESTES FALHARAM!`);
        console.log(`   Verifique as APIs que falharam acima.`);
    }

    // Teste de geração de radar
    console.log(`\n🔧 TESTANDO GERAÇÃO DE RADAR:`);
    try {
        const response = await fetch(`${BASE_URL}/api/aguia/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.success) {
            console.log(`   ✅ Geração de radar funciona`);
        } else {
            console.log(`   ❌ Erro na geração: ${data.error}`);
        }
    } catch (error) {
        console.log(`   ❌ Erro na geração: ${error.message}`);
    }

    console.log(`\n🔧 VERIFICANDO ESTRUTURA DO DASHBOARD:`);
    
    // Verificar se o dashboard responde
    try {
        const response = await fetch(BASE_URL);
        const html = await response.text();
        
        const checks = [
            { name: 'Águia News Cards', test: html.includes('🦅 Águia News') },
            { name: 'IA Supervisão Cards', test: html.includes('🤖 IA Supervisão') },
            { name: 'Função atualizarAguiaNews', test: html.includes('atualizarAguiaNews') },
            { name: 'Função atualizarIASupervisao', test: html.includes('process.env.API_KEY_HERE') },
            { name: 'ID aguiaStats', test: html.includes('id="aguiaStats"') },
            { name: 'ID iaStats', test: html.includes('id="iaStats"') },
            { name: 'Botão Gerar Radar', test: html.includes('gerarRadarManual') }
        ];

        console.log(`\n📋 VERIFICAÇÃO DO FRONTEND:`);
        for (const check of checks) {
            console.log(`   ${check.test ? '✅' : '❌'} ${check.name}`);
        }

    } catch (error) {
        console.log(`   ❌ Erro ao acessar dashboard: ${error.message}`);
    }
}

// Executar testes
testarTodasAPIs().catch(console.error);
