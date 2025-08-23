const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function limpezaCompleta() {
  try {
    console.log('🧹 INICIANDO LIMPEZA COMPLETA DO BANCO DE DADOS');
    console.log('================================================');

    // 1. Limpar dados de teste e sinais recebidos
    console.log('\n📊 LIMPANDO SINAIS DE TESTE...');
    
    const deleteSignals = await pool.query('DELETE FROM trading_signals WHERE created_at < NOW()');
    console.log(`   ✅ ${deleteSignals.rowCount} sinais removidos de trading_signals`);
    
    const deleteMetrics = await pool.query('DELETE FROM signal_metrics_log WHERE created_at < NOW()');
    console.log(`   ✅ ${deleteMetrics.rowCount} registros removidos de signal_metrics_log`);
    
    // 2. Limpar ordens de teste
    console.log('\n📋 LIMPANDO ORDENS DE TESTE...');
    
    try {
      const deleteRealOrders = await pool.query('DELETE FROM real_orders WHERE created_at < NOW()');
      console.log(`   ✅ ${deleteRealOrders.rowCount} ordens removidas de real_orders`);
    } catch (error) {
      console.log('   ⚠️ Tabela real_orders não existe ou vazia');
    }
    
    try {
      const deleteTradeExecs = await pool.query('DELETE FROM trade_executions WHERE created_at < NOW()');
      console.log(`   ✅ ${deleteTradeExecs.rowCount} execuções removidas de trade_executions`);
    } catch (error) {
      console.log('   ⚠️ Tabela trade_executions não existe ou vazia');
    }
    
    // 3. Limpar posições de teste
    console.log('\n💼 LIMPANDO POSIÇÕES DE TESTE...');
    
    try {
      const deleteActivePos = await pool.query('DELETE FROM active_positions WHERE created_at < NOW()');
      console.log(`   ✅ ${deleteActivePos.rowCount} posições removidas de active_positions`);
    } catch (error) {
      console.log('   ⚠️ Tabela active_positions não existe ou vazia');
    }
    
    try {
      const deleteUserPos = await pool.query('DELETE FROM user_positions WHERE created_at < NOW()');
      console.log(`   ✅ ${deleteUserPos.rowCount} posições removidas de user_positions`);
    } catch (error) {
      console.log('   ⚠️ Tabela user_positions não existe ou vazia');
    }
    
    // 4. Verificar estrutura das tabelas problemáticas
    console.log('\n🔍 VERIFICANDO ESTRUTURA DAS TABELAS...');
    
    // Verificar active_positions
    try {
      const activePosCols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'active_positions' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      console.log('\n📋 Colunas de active_positions:');
      activePosCols.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } catch (error) {
      console.log('   ❌ Erro ao verificar active_positions:', error.message);
    }
    
    // Verificar system_logs
    try {
      const systemLogsCols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'system_logs' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      console.log('\n📋 Colunas de system_logs:');
      systemLogsCols.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } catch (error) {
      console.log('   ❌ Tabela system_logs não existe');
    }
    
    // 5. Resetar sequences se necessário
    console.log('\n🔄 RESETANDO SEQUENCES...');
    
    try {
      await pool.query("SELECT setval('trading_signals_id_seq', 1, false)");
      console.log('   ✅ Sequence trading_signals resetada');
    } catch (error) {
      console.log('   ⚠️ Sequence trading_signals não encontrada');
    }
    
    try {
      await pool.query("SELECT setval('signal_metrics_log_id_seq', 1, false)");
      console.log('   ✅ Sequence signal_metrics_log resetada');
    } catch (error) {
      console.log('   ⚠️ Sequence signal_metrics_log não encontrada');
    }
    
    // 6. Criar tabela system_logs se não existir
    console.log('\n🛠️ CRIANDO TABELAS FALTANTES...');
    
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS system_logs (
          id SERIAL PRIMARY KEY,
          level VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          module VARCHAR(100),
          user_id INTEGER,
          metadata JSONB,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('   ✅ Tabela system_logs criada/verificada');
    } catch (error) {
      console.log('   ❌ Erro ao criar system_logs:', error.message);
    }
    
    // 7. Verificar status final
    console.log('\n📊 STATUS FINAL APÓS LIMPEZA:');
    
    const signalsCount = await pool.query('SELECT COUNT(*) as count FROM trading_signals');
    console.log(`   📊 Sinais restantes: ${signalsCount.rows[0].count}`);
    
    const metricsCount = await pool.query('SELECT COUNT(*) as count FROM signal_metrics_log');
    console.log(`   📈 Métricas restantes: ${metricsCount.rows[0].count}`);
    
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`   👥 Usuários totais: ${usersCount.rows[0].count}`);
    
    console.log('\n✅ LIMPEZA COMPLETA FINALIZADA!');
    console.log('🔄 Reinicie o dashboard para ver as mudanças');
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
  } finally {
    await pool.end();
  }
}

// Executar limpeza
limpezaCompleta();
