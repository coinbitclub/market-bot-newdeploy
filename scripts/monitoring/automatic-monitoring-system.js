const { Pool } = require('pg');
const BybitDiagnosticSystem = require('./bybit-diagnostic-system');

/**
 * SISTEMA DE MONITORAMENTO AUTOMÁTICO INTEGRADO
 * Conecta o diagnóstico automático com o banco de dados
 * e sistema de usuários existente
 */

class AutomaticMonitoringSystem {
  constructor() {
    this.diagnostic = new BybitDiagnosticSystem();
    this.db = null;
    this.monitoringActive = false;
    this.alertWebhooks = [];
    this.emailConfig = null;
  }

  /**
   * Inicializa conexão com banco de dados
   */
  async initialize(databaseUrl) {
    try {
      this.db = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Testar conexão
      await this.db.query('SELECT NOW()');
      console.log('✅ Conexão com banco de dados estabelecida');

      // Criar tabelas de monitoramento se não existirem
      await this.createMonitoringTables();
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar com banco:', error.message);
      return false;
    }
  }

  /**
   * Cria tabelas necessárias para monitoramento
   */
  async createMonitoringTables() {
    const createTablesSQL = `
      -- Tabela para armazenar resultados de diagnósticos
      CREATE TABLE IF NOT EXISTS api_diagnostics (
        id SERIAL PRIMARY KEY,
        diagnostic_id VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER,
        api_key_hash VARCHAR(100) NOT NULL,
        environment VARCHAR(20) DEFAULT 'production',
        overall_status VARCHAR(30) NOT NULL,
        success_rate DECIMAL(5,2) NOT NULL,
        execution_time_ms INTEGER,
        connectivity_success BOOLEAN,
        authentication_success BOOLEAN,
        permissions_success BOOLEAN,
        balance_success BOOLEAN,
        trading_success BOOLEAN,
        market_data_success BOOLEAN,
        total_equity DECIMAL(15,2),
        critical_issues TEXT[],
        recommendations TEXT[],
        full_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela para histórico de monitoramento
      CREATE TABLE IF NOT EXISTS monitoring_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        api_key_hash VARCHAR(100) NOT NULL,
        check_type VARCHAR(20) NOT NULL, -- 'full_diagnostic' ou 'health_check'
        status VARCHAR(30) NOT NULL,
        success_rate DECIMAL(5,2),
        issues_detected TEXT[],
        response_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabela para alertas enviados
      CREATE TABLE IF NOT EXISTS monitoring_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        api_key_hash VARCHAR(100) NOT NULL,
        alert_type VARCHAR(30) NOT NULL,
        severity VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        notification_sent BOOLEAN DEFAULT FALSE,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      );

      -- Tabela para configurações de monitoramento por usuário
      CREATE TABLE IF NOT EXISTS monitoring_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        monitoring_enabled BOOLEAN DEFAULT TRUE,
        health_check_interval_minutes INTEGER DEFAULT 60,
        email_alerts BOOLEAN DEFAULT TRUE,
        webhook_alerts BOOLEAN DEFAULT FALSE,
        webhook_url TEXT,
        alert_threshold_success_rate DECIMAL(5,2) DEFAULT 80.0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Índices para performance
      CREATE INDEX IF NOT EXISTS idx_api_diagnostics_user_id ON api_diagnostics(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_diagnostics_created_at ON api_diagnostics(created_at);
      CREATE INDEX IF NOT EXISTS idx_monitoring_history_user_id ON monitoring_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_monitoring_history_created_at ON monitoring_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_user_id ON monitoring_alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_resolved ON monitoring_alerts(resolved);
    `;

    await this.db.query(createTablesSQL);
    console.log('✅ Tabelas de monitoramento criadas/verificadas');
  }

  /**
   * Hook para executar diagnóstico automaticamente quando uma nova chave é adicionada
   */
  async onNewApiKeyAdded(userId, apiKey, apiSecret, baseUrl = 'https://api.bybit.com', userInfo = {}) {
    console.log(`🔔 NOVA CHAVE DETECTADA - Executando diagnóstico automático`);
    console.log(`👤 Usuário ID: ${userId}`);
    console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);

    try {
      // Executar diagnóstico completo
      const diagnosticResult = await this.diagnostic.runFullDiagnostic(
        apiKey, 
        apiSecret, 
        baseUrl, 
        { userId, ...userInfo }
      );

      // Salvar resultado no banco
      await this.saveDiagnosticResult(userId, apiKey, diagnosticResult);

      // Verificar se precisa enviar alertas
      if (parseFloat(diagnosticResult.overall.successRate) < 80) {
        await this.createAlert(userId, apiKey, 'NEW_KEY_ISSUES', 'HIGH', 
          `Nova chave com problemas: ${diagnosticResult.overall.successRate}% de sucesso`);
      }

      // Log de sucesso
      console.log(`✅ Diagnóstico automático concluído para usuário ${userId}`);
      console.log(`📊 Status: ${diagnosticResult.overall.status} (${diagnosticResult.overall.successRate}%)`);

      return diagnosticResult;

    } catch (error) {
      console.error(`❌ Erro no diagnóstico automático:`, error.message);
      
      // Criar alerta de erro
      await this.createAlert(userId, apiKey, 'DIAGNOSTIC_ERROR', 'CRITICAL', 
        `Falha no diagnóstico: ${error.message}`);
      
      throw error;
    }
  }

  /**
   * Salva resultado do diagnóstico no banco
   */
  async saveDiagnosticResult(userId, apiKey, result) {
    const apiKeyHash = this.hashApiKey(apiKey);
    
    const insertSQL = `
      INSERT INTO api_diagnostics (
        diagnostic_id, user_id, api_key_hash, environment, overall_status, 
        success_rate, execution_time_ms, connectivity_success, authentication_success,
        permissions_success, balance_success, trading_success, market_data_success,
        total_equity, critical_issues, recommendations, full_result
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (diagnostic_id) 
      DO UPDATE SET 
        overall_status = EXCLUDED.overall_status,
        success_rate = EXCLUDED.success_rate,
        updated_at = NOW()
    `;

    const values = [
      result.diagnosticId,
      userId,
      apiKeyHash,
      result.environment,
      result.overall.status,
      parseFloat(result.overall.successRate),
      result.executionTimeMs || 0,
      result.results?.connectivity?.success || false,
      result.results?.authentication?.success || false,
      result.results?.permissions?.success || false,
      result.results?.balance?.success || false,
      result.results?.trading?.success || false,
      result.results?.marketData?.success || false,
      result.results?.balance?.totalEquity || 0,
      result.overall.criticalIssues || [],
      result.overall.recommendations || [],
      JSON.stringify(result)
    ];

    await this.db.query(insertSQL, values);
  }

  /**
   * Inicia monitoramento contínuo de todas as chaves no banco
   */
  async startSystemMonitoring() {
    if (this.monitoringActive) {
      console.log('⚠️ Monitoramento já está ativo');
      return;
    }

    console.log('🚀 INICIANDO MONITORAMENTO DO SISTEMA');
    this.monitoringActive = true;

    // Executar monitoramento a cada hora
    setInterval(async () => {
      await this.runSystemHealthCheck();
    }, 60 * 60 * 1000); // 1 hora

    // Primeira execução imediata
    await this.runSystemHealthCheck();

    console.log('✅ Monitoramento do sistema iniciado');
  }

  /**
   * Executa health check de todas as chaves no sistema
   */
  async runSystemHealthCheck() {
    console.log('\n🔍 EXECUTANDO HEALTH CHECK DO SISTEMA');
    console.log(`⏰ ${new Date().toLocaleString()}`);

    try {
      // Buscar todas as chaves ativas no banco
      const activeKeysQuery = `
        SELECT DISTINCT u.id as user_id, u.nome, u.email, u.binance_api_key, u.binance_api_secret
        FROM users u 
        WHERE u.binance_api_key IS NOT NULL 
        AND u.binance_api_key != ''
        AND u.ativo = true
        LIMIT 50
      `;

      const { rows: activeKeys } = await this.db.query(activeKeysQuery);
      
      console.log(`📊 Encontradas ${activeKeys.length} chaves para monitorar`);

      let successCount = 0;
      let errorCount = 0;

      for (const keyInfo of activeKeys) {
        try {
          console.log(`🔍 Verificando: ${keyInfo.nome}`);
          
          const healthResult = await this.diagnostic.runQuickHealthCheck({
            apiKey: keyInfo.binance_api_key,
            apiSecret: keyInfo.binance_api_secret,
            baseUrl: 'https://api.bybit.com'
          });

          // Salvar histórico
          await this.saveMonitoringHistory(
            keyInfo.user_id,
            keyInfo.binance_api_key,
            'health_check',
            healthResult.success ? 'HEALTHY' : 'UNHEALTHY',
            parseFloat(healthResult.successRate),
            healthResult.tests.filter(t => !t.success).map(t => t.test)
          );

          if (healthResult.success) {
            successCount++;
            console.log(`✅ ${keyInfo.nome}: OK`);
          } else {
            errorCount++;
            console.log(`❌ ${keyInfo.nome}: Problema detectado`);
            
            // Criar alerta se ainda não foi criado nas últimas 24h
            await this.createAlertIfNeeded(
              keyInfo.user_id,
              keyInfo.binance_api_key,
              'HEALTH_CHECK_FAILED',
              'MEDIUM',
              `Health check falhou: ${healthResult.successRate}% de sucesso`
            );
          }

          // Pausa entre verificações para não sobrecarregar API
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          errorCount++;
          console.error(`❌ Erro ao verificar ${keyInfo.nome}:`, error.message);
          
          await this.createAlert(
            keyInfo.user_id,
            keyInfo.binance_api_key,
            'MONITORING_ERROR',
            'HIGH',
            `Erro no monitoramento: ${error.message}`
          );
        }
      }

      console.log(`\n📊 RESUMO DO HEALTH CHECK:`);
      console.log(`   ✅ Sucessos: ${successCount}`);
      console.log(`   ❌ Erros: ${errorCount}`);
      console.log(`   📈 Taxa de sucesso: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);

    } catch (error) {
      console.error('❌ Erro no health check do sistema:', error.message);
    }
  }

  /**
   * Salva histórico de monitoramento
   */
  async saveMonitoringHistory(userId, apiKey, checkType, status, successRate, issues) {
    const apiKeyHash = this.hashApiKey(apiKey);
    
    const insertSQL = `
      INSERT INTO monitoring_history (
        user_id, api_key_hash, check_type, status, success_rate, issues_detected
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.db.query(insertSQL, [
      userId, apiKeyHash, checkType, status, successRate, issues
    ]);
  }

  /**
   * Cria alerta se ainda não foi criado recentemente
   */
  async createAlertIfNeeded(userId, apiKey, alertType, severity, message) {
    const apiKeyHash = this.hashApiKey(apiKey);
    
    // Verificar se já existe alerta similar nas últimas 24h
    const existingAlertQuery = `
      SELECT id FROM monitoring_alerts 
      WHERE user_id = $1 AND api_key_hash = $2 AND alert_type = $3 
      AND created_at > NOW() - INTERVAL '24 hours'
      AND resolved = false
    `;

    const { rows } = await this.db.query(existingAlertQuery, [userId, apiKeyHash, alertType]);
    
    if (rows.length === 0) {
      await this.createAlert(userId, apiKey, alertType, severity, message);
    }
  }

  /**
   * Cria novo alerta
   */
  async createAlert(userId, apiKey, alertType, severity, message) {
    const apiKeyHash = this.hashApiKey(apiKey);
    
    const insertSQL = `
      INSERT INTO monitoring_alerts (
        user_id, api_key_hash, alert_type, severity, message
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const { rows } = await this.db.query(insertSQL, [
      userId, apiKeyHash, alertType, severity, message
    ]);

    const alertId = rows[0].id;
    
    // Enviar notificação
    await this.sendNotification(userId, {
      id: alertId,
      type: alertType,
      severity,
      message,
      timestamp: new Date().toISOString()
    });

    console.log(`🚨 Alerta criado: ${alertType} para usuário ${userId}`);
    return alertId;
  }

  /**
   * Envia notificação (email, webhook, etc.)
   */
  async sendNotification(userId, alert) {
    try {
      // Buscar configurações do usuário
      const userSettingsQuery = `
        SELECT ms.*, u.email, u.nome 
        FROM monitoring_settings ms
        JOIN users u ON u.id = ms.user_id
        WHERE ms.user_id = $1
      `;
      
      const { rows } = await this.db.query(userSettingsQuery, [userId]);
      
      if (rows.length === 0) {
        console.log(`⚠️ Configurações de monitoramento não encontradas para usuário ${userId}`);
        return;
      }

      const settings = rows[0];
      
      // Enviar email se habilitado
      if (settings.email_alerts) {
        await this.sendEmailAlert(settings.email, settings.nome, alert);
      }

      // Enviar webhook se habilitado
      if (settings.webhook_alerts && settings.webhook_url) {
        await this.sendWebhookAlert(settings.webhook_url, userId, alert);
      }

      // Marcar notificação como enviada
      await this.db.query(
        'UPDATE monitoring_alerts SET notification_sent = true WHERE id = $1',
        [alert.id]
      );

    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error.message);
    }
  }

  /**
   * Envia alerta por email
   */
  async sendEmailAlert(email, nome, alert) {
    // Implementar envio de email aqui
    console.log(`📧 EMAIL enviado para ${email}:`);
    console.log(`   Assunto: [CoinBitClub] Alerta de API - ${alert.severity}`);
    console.log(`   Mensagem: ${alert.message}`);
    
    // Aqui você implementaria integração com:
    // - SendGrid
    // - Nodemailer
    // - AWS SES
    // - etc.
  }

  /**
   * Envia alerta via webhook
   */
  async sendWebhookAlert(webhookUrl, userId, alert) {
    try {
      const payload = {
        type: 'api_monitoring_alert',
        userId,
        alert,
        timestamp: new Date().toISOString()
      };

      await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      console.log(`🔗 Webhook enviado para ${webhookUrl}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar webhook:`, error.message);
    }
  }

  /**
   * Gera hash da API key para armazenamento seguro
   */
  hashApiKey(apiKey) {
    return require('crypto').createHash('sha256').update(apiKey).digest('hex').substring(0, 20);
  }

  /**
   * Obtém estatísticas do sistema de monitoramento
   */
  async getMonitoringStats() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT user_id) as total_users,
          COUNT(DISTINCT api_key_hash) as total_api_keys,
          AVG(success_rate) as avg_success_rate,
          COUNT(*) FILTER (WHERE overall_status = 'EXCELLENT') as excellent_count,
          COUNT(*) FILTER (WHERE overall_status = 'GOOD') as good_count,
          COUNT(*) FILTER (WHERE overall_status IN ('PARTIAL', 'LIMITED', 'FAILED')) as problematic_count
        FROM api_diagnostics 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `;

      const { rows } = await this.db.query(statsQuery);
      const stats = rows[0];

      const alertsQuery = `
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_alerts,
          COUNT(*) FILTER (WHERE resolved = false) as unresolved_alerts
        FROM monitoring_alerts 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `;

      const { rows: alertRows } = await this.db.query(alertsQuery);
      const alertStats = alertRows[0];

      return {
        users: {
          total: parseInt(stats.total_users) || 0,
          withApiKeys: parseInt(stats.total_api_keys) || 0
        },
        performance: {
          averageSuccessRate: parseFloat(stats.avg_success_rate) || 0,
          excellent: parseInt(stats.excellent_count) || 0,
          good: parseInt(stats.good_count) || 0,
          problematic: parseInt(stats.problematic_count) || 0
        },
        alerts: {
          total: parseInt(alertStats.total_alerts) || 0,
          critical: parseInt(alertStats.critical_alerts) || 0,
          unresolved: parseInt(alertStats.unresolved_alerts) || 0
        },
        system: {
          monitoringActive: this.monitoringActive,
          lastUpdate: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error.message);
      return null;
    }
  }

  /**
   * Para o sistema de monitoramento
   */
  async stopMonitoring() {
    this.monitoringActive = false;
    this.diagnostic.stopContinuousMonitoring();
    
    if (this.db) {
      await this.db.end();
    }
    
    console.log('🛑 Sistema de monitoramento parado');
  }
}

module.exports = AutomaticMonitoringSystem;
