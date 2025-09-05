/**
 * 🧪 TESTE RÁPIDO - VALIDAÇÃO BÁSICA DO SISTEMA
 * =============================================
 * 
 * Teste rápido para validar se o sistema está funcionando
 */

const axios = require('axios');

async function testeRapido() {
    console.log('🧪 TESTE RÁPIDO DO SISTEMA ENTERPRISE');
    console.log('====================================');
    
    const baseURL = 'http://localhost:3333';
    let testsPass = 0;
    let totalTests = 0;

    // Teste 1: Sistema principal
    try {
        totalTests++;
        console.log('1. Testando sistema principal...');
        const response = await axios.get(baseURL, { timeout: 5000 });
        
        if (response.status === 200 && response.data.system) {
            console.log('  ✅ Sistema principal respondendo');
            console.log(`  📊 Versão: ${response.data.system}`);
            testsPass++;
        } else {
            console.log('  ❌ Sistema principal não respondeu adequadamente');
        }
    } catch (error) {
        console.log('  ❌ Erro no sistema principal:', error.message);
    }

    // Teste 2: Health check
    try {
        totalTests++;
        console.log('2. Testando health check...');
        const response = await axios.get(`${baseURL}/health`, { timeout: 5000 });
        
        if (response.status === 200) {
            console.log('  ✅ Health check OK');
            testsPass++;
        } else {
            console.log('  ❌ Health check falhou');
        }
    } catch (error) {
        console.log('  ❌ Erro no health check:', error.message);
    }

    // Teste 3: Enterprise API
    try {
        totalTests++;
        console.log('3. Testando Enterprise API...');
        const response = await axios.get(`${baseURL}/api/enterprise/status`, { timeout: 5000 });
        
        if (response.status === 200) {
            console.log('  ✅ Enterprise API funcionando');
            testsPass++;
        } else {
            console.log('  ❌ Enterprise API falhou');
        }
    } catch (error) {
        console.log('  ❌ Erro na Enterprise API:', error.message);
    }

    // Teste 4: Métricas Prometheus
    try {
        totalTests++;
        console.log('4. Testando métricas Prometheus...');
        const response = await axios.get(`${baseURL}/metrics`, { timeout: 5000 });
        
        if (response.status === 200 && response.data.includes('coinbitclub_')) {
            console.log('  ✅ Métricas Prometheus funcionando');
            testsPass++;
        } else {
            console.log('  ❌ Métricas Prometheus não disponíveis');
        }
    } catch (error) {
        console.log('  ❌ Erro nas métricas:', error.message);
    }

    // Teste 5: Dashboard
    try {
        totalTests++;
        console.log('5. Testando dashboard...');
        const response = await axios.get(`${baseURL}/dashboard`, { timeout: 5000 });
        
        if (response.status === 200) {
            console.log('  ✅ Dashboard acessível');
            testsPass++;
        } else {
            console.log('  ❌ Dashboard não acessível');
        }
    } catch (error) {
        console.log('  ❌ Erro no dashboard:', error.message);
    }

    // Resultados
    console.log('\n🎯 RESULTADOS DO TESTE RÁPIDO');
    console.log('============================');
    console.log(`📊 Testes executados: ${totalTests}`);
    console.log(`✅ Testes passou: ${testsPass}`);
    console.log(`❌ Testes falharam: ${totalTests - testsPass}`);
    console.log(`🎯 Taxa de sucesso: ${((testsPass / totalTests) * 100).toFixed(1)}%`);

    if (testsPass === totalTests) {
        console.log('\n🎉 TODOS OS TESTES BÁSICOS PASSARAM!');
        console.log('✅ Sistema está funcionando corretamente');
    } else {
        console.log('\n⚠️ ALGUNS TESTES FALHARAM');
        console.log('🔍 Verificar componentes com falha');
    }

    return { testsPass, totalTests };
}

// Executar se chamado diretamente
if (require.main === module) {
    testeRapido().catch(console.error);
}

module.exports = testeRapido;
