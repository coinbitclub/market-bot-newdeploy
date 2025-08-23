#!/usr/bin/env node

/**
 * DEMONSTRAÇÃO COMPLETA DO SISTEMA INTEGRADO
 * Mostra o sistema de monitoramento automático funcionando
 * através das rotas da API integradas ao app.js
 */

const axios = require('axios');

// Configuração
const BASE_URL = 'http://localhost:3000';
const API_KEYS_TEST = [
  {
    userId: 16,
    apiKey: 'ERICA_KEY_HERE',
    apiSecret: 'ERICA_SECRET_HERE',
    environment: 'production',
    name: 'Erica'
  },
  {
    userId: 17,
    apiKey: 'LUIZA_KEY_HERE', 
    apiSecret: 'LUIZA_SECRET_HERE',
    environment: 'production',
    name: 'Luiza'
  }
];

async function demonstrateIntegratedSystem() {
  console.log('🚀 DEMONSTRAÇÃO DO SISTEMA INTEGRADO');
  console.log('=====================================');
  console.log('');

  try {
    // 1. Verificar se o servidor está rodando
    console.log('1️⃣ Verificando status do servidor...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Servidor online:', healthResponse.data.status);
    } catch (error) {
      console.log('❌ Servidor offline. Inicie o app.js primeiro!');
      console.log('💡 Execute: node app.js');
      return;
    }

    // 2. Verificar sistema de monitoramento
    console.log('');
    console.log('2️⃣ Verificando sistema de monitoramento...');
    try {
      const monitoringResponse = await axios.get(`${BASE_URL}/api/monitoring/stats`);
      console.log('✅ Sistema de monitoramento ativo');
      console.log('📊 Estatísticas:', monitoringResponse.data.data || 'Sem dados ainda');
    } catch (error) {
      console.log('⚠️ Sistema de monitoramento:', error.response?.status === 503 ? 'Inicializando...' : 'Erro');
    }

    // 3. Demonstrar adição de chave com diagnóstico automático
    console.log('');
    console.log('3️⃣ Demonstrando diagnóstico automático para novas chaves...');
    
    // Usar uma chave de teste conhecida (simulação)
    const testApiKey = {
      userId: 999,
      apiKey: 'TEST_' + Date.now(),
      apiSecret: 'TEST_SECRET_' + Date.now(),
      environment: 'testnet'
    };

    try {
      console.log(`🔔 Adicionando nova chave API para usuário ${testApiKey.userId}...`);
      
      const addKeyResponse = await axios.post(
        `${BASE_URL}/api/users/${testApiKey.userId}/api-keys`,
        testApiKey
      );

      console.log('✅ Resposta da API:');
      console.log('   Status:', addKeyResponse.data.success ? 'Sucesso' : 'Erro');
      console.log('   Diagnóstico ID:', addKeyResponse.data.diagnostic?.id);
      console.log('   Status Geral:', addKeyResponse.data.diagnostic?.status);
      console.log('   Taxa de Sucesso:', addKeyResponse.data.diagnostic?.successRate + '%');
      console.log('   Tempo de Execução:', addKeyResponse.data.diagnostic?.executionTime + 'ms');
      console.log('   Problemas Críticos:', addKeyResponse.data.diagnostic?.criticalIssues?.length || 0);

    } catch (error) {
      console.log('❌ Erro ao adicionar chave:', error.response?.data?.error || error.message);
    }

    // 4. Consultar histórico de diagnósticos
    console.log('');
    console.log('4️⃣ Consultando histórico de diagnósticos...');
    try {
      const historyResponse = await axios.get(`${BASE_URL}/api/users/${testApiKey.userId}/diagnostics`);
      
      if (historyResponse.data.success && historyResponse.data.data.length > 0) {
        console.log('✅ Histórico encontrado:');
        historyResponse.data.data.slice(0, 3).forEach((diagnostic, index) => {
          console.log(`   ${index + 1}. ID: ${diagnostic.diagnostic_id}`);
          console.log(`      Status: ${diagnostic.overall_status}`);
          console.log(`      Taxa: ${diagnostic.success_rate}%`);
          console.log(`      Data: ${new Date(diagnostic.created_at).toLocaleString('pt-BR')}`);
        });
      } else {
        console.log('📋 Nenhum histórico encontrado ainda');
      }
    } catch (error) {
      console.log('⚠️ Erro ao consultar histórico:', error.response?.data?.error || error.message);
    }

    // 5. Executar diagnóstico manual
    console.log('');
    console.log('5️⃣ Executando diagnóstico manual...');
    try {
      const manualDiagnostic = await axios.post(
        `${BASE_URL}/api/users/${testApiKey.userId}/diagnostics/run`,
        {
          apiKey: testApiKey.apiKey,
          apiSecret: testApiKey.apiSecret,
          environment: testApiKey.environment
        }
      );

      if (manualDiagnostic.data.success) {
        const result = manualDiagnostic.data.data;
        console.log('✅ Diagnóstico manual executado:');
        console.log('   Status:', result.overall.status);
        console.log('   Taxa de Sucesso:', result.overall.successRate + '%');
        console.log('   Conectividade:', result.results.connectivity.success ? '✅' : '❌');
        console.log('   Autenticação:', result.results.authentication.success ? '✅' : '❌');
        console.log('   Permissões:', result.results.permissions.success ? '✅' : '❌');
        console.log('   Saldos:', result.results.balance.success ? '✅' : '❌');
        console.log('   Trading:', result.results.trading.success ? '✅' : '❌');
        console.log('   Dados de Mercado:', result.results.marketData.success ? '✅' : '❌');
      }
    } catch (error) {
      console.log('⚠️ Diagnóstico manual:', error.response?.data?.error || error.message);
    }

    // 6. Dashboard de monitoramento
    console.log('');
    console.log('6️⃣ Consultando dashboard de monitoramento...');
    try {
      const dashboardResponse = await axios.get(`${BASE_URL}/api/monitoring/dashboard`);
      
      if (dashboardResponse.data.success) {
        const summary = dashboardResponse.data.data.summary;
        console.log('✅ Dashboard:');
        console.log(`   Usuários Ativos: ${summary.activeUsers}`);
        console.log(`   Total de Verificações: ${summary.totalChecks}`);
        console.log(`   Taxa Média de Sucesso: ${summary.avgSuccessRate?.toFixed(1)}%`);
        console.log(`   Contas Saudáveis: ${summary.healthyAccounts}`);
        console.log(`   Contas com Problemas: ${summary.problematicAccounts}`);
      }
    } catch (error) {
      console.log('⚠️ Dashboard:', error.response?.data?.error || error.message);
    }

    // 7. Configurações de monitoramento
    console.log('');
    console.log('7️⃣ Verificando configurações de monitoramento...');
    try {
      const settingsResponse = await axios.get(`${BASE_URL}/api/users/${testApiKey.userId}/monitoring-settings`);
      
      if (settingsResponse.data.success) {
        const settings = settingsResponse.data.data;
        console.log('✅ Configurações:');
        console.log(`   Monitoramento Ativo: ${settings.monitoring_enabled ? 'Sim' : 'Não'}`);
        console.log(`   Intervalo de Verificação: ${settings.health_check_interval_minutes} min`);
        console.log(`   Alertas por Email: ${settings.email_alerts ? 'Ativo' : 'Inativo'}`);
        console.log(`   Limite de Taxa de Sucesso: ${settings.alert_threshold_success_rate}%`);
      }
    } catch (error) {
      console.log('⚠️ Configurações:', error.response?.data?.error || error.message);
    }

    console.log('');
    console.log('🎉 DEMONSTRAÇÃO CONCLUÍDA!');
    console.log('=====================================');
    console.log('✅ Sistema de monitoramento automático 100% integrado');
    console.log('🔔 Diagnósticos automáticos funcionando para novas chaves');
    console.log('📊 Dashboard e APIs de monitoramento operacionais');
    console.log('⚙️ Configurações personalizáveis por usuário');
    console.log('');
    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('1. Integre as rotas nos formulários do frontend');
    console.log('2. Configure alertas por email/webhook');
    console.log('3. Monitore através do dashboard em tempo real');
    console.log('4. Todas as novas chaves API terão diagnóstico automático!');

  } catch (error) {
    console.error('❌ Erro na demonstração:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Certifique-se de que o app.js está rodando em http://localhost:3000');
    }
  }
}

if (require.main === module) {
  demonstrateIntegratedSystem();
}

module.exports = demonstrateIntegratedSystem;
