#!/usr/bin/env node

/**
 * SCRIPT PARA CONFIGURAR TABELAS DO SISTEMA DE MONITORAMENTO
 * Verifica e cria as tabelas necessárias para o diagnóstico automático
 */

const { Pool } = require('pg');

async function setupMonitoringTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Conectando ao banco de dados...');
    const client = await pool.connect();
    
    // Verificar tabelas existentes
    console.log('🔍 Verificando tabelas de monitoramento...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('api_diagnostics', 'monitoring_history', 'monitoring_alerts', 'monitoring_settings')
      ORDER BY table_name
    `;
    
    const result = await client.query(tablesQuery);
    const existingTables = result.rows.map(r => r.table_name);
    console.log('📋 Tabelas encontradas:', existingTables);
    
    // Verificar se precisamos criar as tabelas
    const expectedTables = ['api_diagnostics', 'monitoring_history', 'monitoring_alerts', 'monitoring_settings'];
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('⚠️ Tabelas faltando:', missingTables);
      console.log('🔧 Criando tabelas do sistema de monitoramento...');
      
      // Criar todas as tabelas de uma vez
      await client.query(`
        -- Tabela principal de diagnósticos
        CREATE TABLE IF NOT EXISTS api_diagnostics (
          id SERIAL PRIMARY KEY,
          diagnostic_id VARCHAR(255) UNIQUE NOT NULL,
          user_id INTEGER NOT NULL,
          api_key_hash VARCHAR(255) NOT NULL,
          overall_status VARCHAR(50) NOT NULL,
          success_rate DECIMAL(5,2) NOT NULL,
          execution_time_ms INTEGER NOT NULL,
          connectivity_success BOOLEAN NOT NULL,
          connectivity_time_ms INTEGER,
          authentication_success BOOLEAN NOT NULL,
          authentication_time_ms INTEGER,
          permissions_success BOOLEAN NOT NULL,
          permissions_time_ms INTEGER,
          balance_success BOOLEAN NOT NULL,
          balance_time_ms INTEGER,
          trading_success BOOLEAN NOT NULL,
          trading_time_ms INTEGER,
          market_data_success BOOLEAN NOT NULL,
          market_data_time_ms INTEGER,
          total_equity DECIMAL(20,8) DEFAULT 0,
          account_info JSONB,
          critical_issues TEXT[],
          recommendations TEXT[],
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Tabela de histórico de monitoramento
        CREATE TABLE IF NOT EXISTS monitoring_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          api_key_hash VARCHAR(255) NOT NULL,
          check_type VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL,
          response_time_ms INTEGER,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Tabela de alertas
        CREATE TABLE IF NOT EXISTS monitoring_alerts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          alert_type VARCHAR(100) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          details JSONB,
          notification_sent BOOLEAN DEFAULT FALSE,
          resolved BOOLEAN DEFAULT FALSE,
          resolved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Tabela de configurações de monitoramento
        CREATE TABLE IF NOT EXISTS monitoring_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL,
          monitoring_enabled BOOLEAN DEFAULT TRUE,
          health_check_interval_minutes INTEGER DEFAULT 60,
          email_alerts BOOLEAN DEFAULT TRUE,
          webhook_alerts BOOLEAN DEFAULT FALSE,
          webhook_url TEXT,
          alert_threshold_success_rate DECIMAL(5,2) DEFAULT 80.0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      console.log('✅ Tabelas criadas com sucesso!');
      
      // Criar índices para performance
      console.log('🔧 Criando índices para performance...');
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_api_diagnostics_user_id ON api_diagnostics(user_id);
        CREATE INDEX IF NOT EXISTS idx_api_diagnostics_created_at ON api_diagnostics(created_at);
        CREATE INDEX IF NOT EXISTS idx_api_diagnostics_status ON api_diagnostics(overall_status);
        CREATE INDEX IF NOT EXISTS idx_monitoring_history_user_id ON monitoring_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_monitoring_history_created_at ON monitoring_history(created_at);
        CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_user_id ON monitoring_alerts(user_id);
        CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_resolved ON monitoring_alerts(resolved);
        CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created_at ON monitoring_alerts(created_at);
      `);
      
      console.log('✅ Índices criados com sucesso!');
      
    } else {
      console.log('✅ Todas as tabelas de monitoramento já existem!');
    }
    
    // Verificar se as tabelas estão funcionais
    console.log('🔍 Testando funcionalidade das tabelas...');
    
    // Inserir e deletar um registro de teste
    const testDiagnosticId = 'TEST_' + Date.now();
    await client.query(`
      INSERT INTO api_diagnostics (
        diagnostic_id, user_id, api_key_hash, overall_status, success_rate,
        execution_time_ms, connectivity_success, authentication_success,
        permissions_success, balance_success, trading_success, market_data_success
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      testDiagnosticId, 9999, 'test_hash', 'EXCELLENT', 100.0, 500,
      true, true, true, true, true, true
    ]);
    
    // Verificar se foi inserido
    const testResult = await client.query(
      'SELECT id FROM api_diagnostics WHERE diagnostic_id = $1',
      [testDiagnosticId]
    );
    
    if (testResult.rows.length > 0) {
      // Deletar o registro de teste
      await client.query(
        'DELETE FROM api_diagnostics WHERE diagnostic_id = $1',
        [testDiagnosticId]
      );
      console.log('✅ Teste de funcionalidade: SUCESSO');
    }
    
    // Verificar estrutura final
    const finalCheck = await client.query(tablesQuery);
    console.log('📊 Estrutura final:');
    finalCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('');
    console.log('🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('📋 Sistema de monitoramento automático está pronto para uso.');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro durante configuração:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  setupMonitoringTables();
}

module.exports = setupMonitoringTables;
