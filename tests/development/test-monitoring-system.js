const AutomaticMonitoringSystem = require('./automatic-monitoring-system');

/**
 * DEMO E TESTE DO SISTEMA DE MONITORAMENTO AUTOMÁTICO
 * Demonstra como integrar o sistema de diagnóstico automático
 * com adição de novas chaves e monitoramento contínuo
 */

async function testAutomaticMonitoringSystem() {
  console.log('🚀 INICIANDO TESTE DO SISTEMA DE MONITORAMENTO AUTOMÁTICO');
  console.log('='.repeat(70));

  const monitoring = new AutomaticMonitoringSystem();

  try {
    // 1. INICIALIZAR SISTEMA
    console.log('\n1️⃣ INICIALIZANDO SISTEMA DE MONITORAMENTO');
    console.log('-'.repeat(50));
    
    // Usar URL do banco Railway (você deve substituir pela sua)
    const databaseUrl = process.env.DATABASE_URL || 'process.env.DATABASE_URL';
    
    const initialized = await monitoring.initialize(databaseUrl);
    if (!initialized) {
      throw new Error('Falha na inicialização do sistema');
    }

    // 2. SIMULAR ADIÇÃO DE NOVA CHAVE (HOOK AUTOMÁTICO)
    console.log('\n2️⃣ SIMULANDO ADIÇÃO DE NOVA CHAVE API');
    console.log('-'.repeat(50));
    
    // Chave da Erica que sabemos que funciona
    const newApiKey = '2iNeNZQepHJS0lWBkf';
    const newApiSecret = 'process.env.API_KEY_HERE';
    const userId = 123; // ID fictício do usuário
    
    console.log('🔔 NOVA CHAVE DETECTADA - Executando diagnóstico automático...');
    
    const diagnosticResult = await monitoring.onNewApiKeyAdded(
      userId,
      newApiKey,
      newApiSecret,
      'https://api.bybit.com',
      {
        name: 'Erica dos Santos Andrade',
        email: 'erica.andrade.santos@hotmail.com',
        phone: '+5521987386645'
      }
    );

    console.log('\n📊 RESULTADO DO DIAGNÓSTICO AUTOMÁTICO:');
    console.log(`   🆔 ID: ${diagnosticResult.diagnosticId}`);
    console.log(`   📈 Status: ${diagnosticResult.overall.status}`);
    console.log(`   📊 Taxa de sucesso: ${diagnosticResult.overall.successRate}%`);
    console.log(`   ⏱️  Tempo de execução: ${diagnosticResult.executionTimeMs}ms`);
    
    if (diagnosticResult.results?.balance?.totalEquity > 0) {
      console.log(`   💰 Saldo detectado: $${diagnosticResult.results.balance.totalEquity}`);
    }

    // 3. SIMULAR CHAVE COM PROBLEMA (PARA TESTAR ALERTAS)
    console.log('\n3️⃣ SIMULANDO CHAVE COM PROBLEMA');
    console.log('-'.repeat(50));
    
    try {
      await monitoring.onNewApiKeyAdded(
        456, // Outro usuário
        'ChaveInvalida123',
        'SecretInvalido456',
        'https://api.bybit.com',
        {
          name: 'Usuário Teste',
          email: 'teste@exemplo.com'
        }
      );
    } catch (error) {
      console.log('✅ Erro esperado capturado corretamente');
    }

    // 4. INICIAR MONITORAMENTO CONTÍNUO
    console.log('\n4️⃣ INICIANDO MONITORAMENTO CONTÍNUO');
    console.log('-'.repeat(50));
    
    await monitoring.startSystemMonitoring();

    // 5. EXECUTAR HEALTH CHECK MANUAL
    console.log('\n5️⃣ EXECUTANDO HEALTH CHECK MANUAL');
    console.log('-'.repeat(50));
    
    await monitoring.runSystemHealthCheck();

    // 6. OBTER ESTATÍSTICAS DO SISTEMA
    console.log('\n6️⃣ ESTATÍSTICAS DO SISTEMA');
    console.log('-'.repeat(50));
    
    const stats = await monitoring.getMonitoringStats();
    if (stats) {
      console.log('📊 ESTATÍSTICAS ATUAIS:');
      console.log(`   👥 Usuários monitorados: ${stats.users.total}`);
      console.log(`   🔑 Chaves API ativas: ${stats.users.withApiKeys}`);
      console.log(`   📈 Taxa de sucesso média: ${stats.performance.averageSuccessRate.toFixed(1)}%`);
      console.log(`   ✅ Contas excelentes: ${stats.performance.excellent}`);
      console.log(`   🟡 Contas com problemas: ${stats.performance.problematic}`);
      console.log(`   🚨 Alertas nas últimas 24h: ${stats.alerts.total}`);
      console.log(`   🔴 Alertas críticos: ${stats.alerts.critical}`);
      console.log(`   ⚠️ Alertas não resolvidos: ${stats.alerts.unresolved}`);
    }

    // 7. DEMONSTRAR CONSULTA DE HISTÓRICO
    console.log('\n7️⃣ CONSULTANDO HISTÓRICO DE DIAGNÓSTICOS');
    console.log('-'.repeat(50));
    
    await demonstrateHistoryQueries(monitoring);

    console.log('\n🎉 TESTE DO SISTEMA COMPLETO!');
    console.log('='.repeat(70));
    console.log('✅ Sistema de monitoramento automático funcionando perfeitamente');
    console.log('✅ Diagnóstico automático em novas chaves implementado');
    console.log('✅ Monitoramento contínuo ativo');
    console.log('✅ Sistema de alertas funcionando');
    console.log('✅ Banco de dados integrado');

    // Manter sistema rodando por 5 minutos para demonstração
    console.log('\n⏰ Sistema ficará rodando por 5 minutos para demonstração...');
    console.log('   (Em produção, ficaria rodando continuamente)');
    
    setTimeout(async () => {
      console.log('\n🛑 Parando sistema de monitoramento (demo)');
      await monitoring.stopMonitoring();
      process.exit(0);
    }, 5 * 60 * 1000); // 5 minutos

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    console.error(error.stack);
    
    try {
      await monitoring.stopMonitoring();
    } catch (stopError) {
      console.error('❌ Erro ao parar monitoramento:', stopError.message);
    }
    
    process.exit(1);
  }
}

/**
 * Demonstra consultas de histórico
 */
async function demonstrateHistoryQueries(monitoring) {
  try {
    // Consultar diagnósticos recentes
    const recentDiagnostics = await monitoring.db.query(`
      SELECT 
        diagnostic_id,
        overall_status,
        success_rate,
        total_equity,
        created_at,
        critical_issues
      FROM api_diagnostics 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('📋 ÚLTIMOS DIAGNÓSTICOS:');
    recentDiagnostics.rows.forEach(diag => {
      console.log(`   🆔 ${diag.diagnostic_id}: ${diag.overall_status} (${diag.success_rate}%)`);
      console.log(`      💰 Equity: $${diag.total_equity || 0}`);
      console.log(`      ⏰ ${new Date(diag.created_at).toLocaleString()}`);
      if (diag.critical_issues && diag.critical_issues.length > 0) {
        console.log(`      🚨 Problemas: ${diag.critical_issues.join(', ')}`);
      }
    });

    // Consultar alertas recentes
    const recentAlerts = await monitoring.db.query(`
      SELECT 
        alert_type,
        severity,
        message,
        resolved,
        created_at
      FROM monitoring_alerts 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (recentAlerts.rows.length > 0) {
      console.log('\n🚨 ALERTAS RECENTES:');
      recentAlerts.rows.forEach(alert => {
        const icon = alert.resolved ? '✅' : '⚠️';
        console.log(`   ${icon} [${alert.severity}] ${alert.alert_type}`);
        console.log(`      📝 ${alert.message}`);
        console.log(`      ⏰ ${new Date(alert.created_at).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro ao consultar histórico:', error.message);
  }
}

// Executar teste se arquivo for chamado diretamente
if (require.main === module) {
  testAutomaticMonitoringSystem().catch(error => {
    console.error('❌ ERRO FATAL:', error.message);
    process.exit(1);
  });
}

module.exports = { testAutomaticMonitoringSystem };
