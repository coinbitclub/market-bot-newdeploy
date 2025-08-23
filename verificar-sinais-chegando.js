const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function verificarSinaisChegando() {
  try {
    console.log('🔍 VERIFICANDO SINAIS QUE ESTÃO CHEGANDO');
    console.log('=====================================');

    // 1. Verificar sinais das últimas 24 horas
    console.log('\n📊 SINAIS DAS ÚLTIMAS 24 HORAS:');
    const sinais24h = await pool.query(`
      SELECT 
        id,
        symbol,
        side,
        entry_price,
        status,
        source,
        created_at AT TIME ZONE 'America/Sao_Paulo' as created_br,
        received_at AT TIME ZONE 'America/Sao_Paulo' as received_br
      FROM trading_signals 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 20
    `);
    console.log(`   ✅ Total: ${sinais24h.rows.length} sinais`);
    sinais24h.rows.forEach((sinal, index) => {
      console.log(`   ${index + 1}. ${sinal.symbol} | ${sinal.side} | ${sinal.status} | ${sinal.created_br}`);
    });

    // 2. Verificar signal_metrics_log das últimas 24 horas
    console.log('\n📈 SIGNAL METRICS LOG (24h):');
    const metricsLog = await pool.query(`
      SELECT 
        id,
        symbol,
        action,
        side,
        ai_decision,
        status,
        created_at AT TIME ZONE 'America/Sao_Paulo' as created_br,
        received_at AT TIME ZONE 'America/Sao_Paulo' as received_br
      FROM signal_metrics_log 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 20
    `);
    console.log(`   ✅ Total: ${metricsLog.rows.length} registros`);
    metricsLog.rows.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.symbol || 'N/A'} | ${log.action || log.side || 'N/A'} | ${log.ai_decision || log.status || 'N/A'} | ${log.created_br}`);
    });

    // 3. Verificar sinais da última hora
    console.log('\n⏰ SINAIS DA ÚLTIMA HORA:');
    const sinais1h = await pool.query(`
      SELECT 
        id,
        symbol,
        side,
        status,
        source,
        ai_decision,
        created_at AT TIME ZONE 'America/Sao_Paulo' as created_br
      FROM trading_signals 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
    `);
    console.log(`   ✅ Total: ${sinais1h.rows.length} sinais na última hora`);
    sinais1h.rows.forEach((sinal, index) => {
      console.log(`   ${index + 1}. ${sinal.symbol} | ${sinal.side} | ${sinal.status} | AI: ${sinal.ai_decision} | ${sinal.created_br}`);
    });

    // 4. Verificar últimos 10 registros de system_logs
    console.log('\n📝 SYSTEM LOGS RECENTES:');
    const systemLogs = await pool.query(`
      SELECT 
        id,
        level,
        message,
        module,
        created_at AT TIME ZONE 'America/Sao_Paulo' as created_br
      FROM system_logs 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log(`   ✅ Total: ${systemLogs.rows.length} logs na última hora`);
    systemLogs.rows.forEach((log, index) => {
      console.log(`   ${index + 1}. [${log.level}] ${log.module}: ${log.message.substring(0, 100)}... | ${log.created_br}`);
    });

    // 5. Estatísticas gerais
    console.log('\n📊 ESTATÍSTICAS GERAIS:');
    
    const totalSignals = await pool.query('SELECT COUNT(*) as total FROM trading_signals');
    console.log(`   📈 Total de sinais no banco: ${totalSignals.rows[0].total}`);
    
    const signals24h = await pool.query(`
      SELECT COUNT(*) as total 
      FROM trading_signals 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    console.log(`   📅 Sinais nas últimas 24h: ${signals24h.rows[0].total}`);
    
    const signals1h = await pool.query(`
      SELECT COUNT(*) as total 
      FROM trading_signals 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
    `);
    console.log(`   ⏰ Sinais na última hora: ${signals1h.rows[0].total}`);

    // 6. Verificar webhook logs se existir tabela
    try {
      console.log('\n🔗 VERIFICANDO WEBHOOK LOGS:');
      const webhookLogs = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE '%webhook%' OR table_name LIKE '%api_log%' OR table_name LIKE '%external%')
      `);
      
      if (webhookLogs.rows.length > 0) {
        console.log('   📋 Tabelas relacionadas a webhooks encontradas:');
        webhookLogs.rows.forEach(table => {
          console.log(`      - ${table.table_name}`);
        });
      } else {
        console.log('   ❌ Nenhuma tabela de webhook logs encontrada');
      }
    } catch (error) {
      console.log('   ⚠️ Erro ao verificar webhook logs:', error.message);
    }

    console.log('\n✅ VERIFICAÇÃO CONCLUÍDA!');
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  } finally {
    await pool.end();
  }
}

// Executar verificação
verificarSinaisChegando();
