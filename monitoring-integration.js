const express = require('express');
const AutomaticMonitoringSystem = require('./automatic-monitoring-system');

/**
 * INTEGRAÇÃO DO SISTEMA DE MONITORAMENTO COM EXPRESS.JS
 * Adiciona rotas e middlewares para integrar o monitoramento automático
 * com o sistema existente do CoinBitClub
 */

class MonitoringIntegration {
  constructor(app) {
    this.app = app;
    this.monitoring = new AutomaticMonitoringSystem();
    this.initialized = false;
  }

  /**
   * Inicializa o sistema de monitoramento
   */
  async initialize(databaseUrl) {
    try {
      await this.monitoring.initialize(databaseUrl);
      await this.monitoring.startSystemMonitoring();
      this.initialized = true;
      
      console.log('✅ Sistema de monitoramento integrado ao Express');
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar monitoramento:', error.message);
      return false;
    }
  }

  /**
   * Adiciona todas as rotas de monitoramento
   */
  setupRoutes() {
    // Middleware para verificar se o sistema está inicializado
    const checkInitialized = (req, res, next) => {
      if (!this.initialized) {
        return res.status(503).json({
          error: 'Sistema de monitoramento não inicializado',
          message: 'Tente novamente em alguns momentos'
        });
      }
      next();
    };

    // 1. ROTA: Adicionar nova chave API (com diagnóstico automático)
    this.app.post('/api/users/:userId/api-keys', checkInitialized, async (req, res) => {
      try {
        const { userId } = req.params;
        const { apiKey, apiSecret, exchange = 'bybit', environment = 'production' } = req.body;

        // Validações básicas
        if (!apiKey || !apiSecret) {
          return res.status(400).json({
            error: 'API Key e Secret são obrigatórios'
          });
        }

        // Determinar URL base
        const baseUrl = exchange === 'bybit' ? 
          (environment === 'testnet' ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com') :
          'https://api.binance.com';

        console.log(`🔔 Nova chave API adicionada para usuário ${userId}`);

        // DIAGNÓSTICO AUTOMÁTICO executado aqui!
        const diagnosticResult = await this.monitoring.onNewApiKeyAdded(
          parseInt(userId),
          apiKey,
          apiSecret,
          baseUrl,
          {
            exchange,
            environment,
            addedVia: 'api',
            userAgent: req.get('User-Agent'),
            ip: req.ip
          }
        );

        // Resposta com resultado do diagnóstico
        res.json({
          success: true,
          message: 'Chave API adicionada e diagnosticada com sucesso',
          diagnostic: {
            id: diagnosticResult.diagnosticId,
            status: diagnosticResult.overall.status,
            successRate: diagnosticResult.overall.successRate,
            executionTime: diagnosticResult.executionTimeMs,
            criticalIssues: diagnosticResult.overall.criticalIssues,
            recommendations: diagnosticResult.overall.recommendations,
            balance: diagnosticResult.results?.balance?.totalEquity || 0
          }
        });

      } catch (error) {
        console.error('❌ Erro ao adicionar chave API:', error.message);
        res.status(500).json({
          error: 'Erro interno do servidor',
          message: error.message
        });
      }
    });

    // 2. ROTA: Obter estatísticas de monitoramento
    this.app.get('/api/monitoring/stats', checkInitialized, async (req, res) => {
      try {
        const stats = await this.monitoring.getMonitoringStats();
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        res.status(500).json({
          error: 'Erro ao obter estatísticas',
          message: error.message
        });
      }
    });

    // 3. ROTA: Obter diagnósticos de um usuário
    this.app.get('/api/users/:userId/diagnostics', checkInitialized, async (req, res) => {
      try {
        const { userId } = req.params;
        const { limit = 10, offset = 0 } = req.query;

        const query = `
          SELECT 
            diagnostic_id,
            overall_status,
            success_rate,
            execution_time_ms,
            connectivity_success,
            authentication_success,
            permissions_success,
            balance_success,
            trading_success,
            market_data_success,
            total_equity,
            critical_issues,
            recommendations,
            created_at
          FROM api_diagnostics 
          WHERE user_id = $1
          ORDER BY created_at DESC 
          LIMIT $2 OFFSET $3
        `;

        const { rows } = await this.monitoring.db.query(query, [userId, limit, offset]);

        res.json({
          success: true,
          data: rows,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: rows.length
          }
        });

      } catch (error) {
        res.status(500).json({
          error: 'Erro ao obter diagnósticos',
          message: error.message
        });
      }
    });

    // 4. ROTA: Executar diagnóstico manual
    this.app.post('/api/users/:userId/diagnostics/run', checkInitialized, async (req, res) => {
      try {
        const { userId } = req.params;
        const { apiKey, apiSecret, environment = 'production' } = req.body;

        if (!apiKey || !apiSecret) {
          return res.status(400).json({
            error: 'API Key e Secret são obrigatórios'
          });
        }

        const baseUrl = environment === 'testnet' ? 
          'https://api-testnet.bybit.com' : 'https://api.bybit.com';

        console.log(`🔍 Diagnóstico manual solicitado para usuário ${userId}`);

        const diagnosticResult = await this.monitoring.diagnostic.runFullDiagnostic(
          apiKey,
          apiSecret,
          baseUrl,
          {
            userId: parseInt(userId),
            environment,
            triggeredBy: 'manual',
            userAgent: req.get('User-Agent')
          }
        );

        // Salvar resultado no banco
        await this.monitoring.saveDiagnosticResult(userId, apiKey, diagnosticResult);

        res.json({
          success: true,
          data: diagnosticResult
        });

      } catch (error) {
        res.status(500).json({
          error: 'Erro ao executar diagnóstico',
          message: error.message
        });
      }
    });

    // 5. ROTA: Obter alertas de um usuário
    this.app.get('/api/users/:userId/alerts', checkInitialized, async (req, res) => {
      try {
        const { userId } = req.params;
        const { resolved = 'all', limit = 20 } = req.query;

        let whereClause = 'WHERE user_id = $1';
        const params = [userId];

        if (resolved === 'true') {
          whereClause += ' AND resolved = true';
        } else if (resolved === 'false') {
          whereClause += ' AND resolved = false';
        }

        const query = `
          SELECT 
            id,
            alert_type,
            severity,
            message,
            notification_sent,
            resolved,
            created_at,
            resolved_at
          FROM monitoring_alerts 
          ${whereClause}
          ORDER BY created_at DESC 
          LIMIT $${params.length + 1}
        `;

        params.push(limit);

        const { rows } = await this.monitoring.db.query(query, params);

        res.json({
          success: true,
          data: rows
        });

      } catch (error) {
        res.status(500).json({
          error: 'Erro ao obter alertas',
          message: error.message
        });
      }
    });

    // 6. ROTA: Resolver alerta
    this.app.patch('/api/alerts/:alertId/resolve', checkInitialized, async (req, res) => {
      try {
        const { alertId } = req.params;

        await this.monitoring.db.query(
          'UPDATE monitoring_alerts SET resolved = true, resolved_at = NOW() WHERE id = $1',
          [alertId]
        );

        res.json({
          success: true,
          message: 'Alerta resolvido com sucesso'
        });

      } catch (error) {
        res.status(500).json({
          error: 'Erro ao resolver alerta',
          message: error.message
        });
      }
    });

    // 7. ROTA: Configurações de monitoramento do usuário
    this.app.get('/api/users/:userId/monitoring-settings', checkInitialized, async (req, res) => {
      try {
        const { userId } = req.params;

        const query = `
          SELECT * FROM monitoring_settings WHERE user_id = $1
        `;

        const { rows } = await this.monitoring.db.query(query, [userId]);

        if (rows.length === 0) {
          // Criar configurações padrão
          const defaultSettings = {
            monitoring_enabled: true,
            health_check_interval_minutes: 60,
            email_alerts: true,
            webhook_alerts: false,
            alert_threshold_success_rate: 80.0
          };

          await this.monitoring.db.query(`
            INSERT INTO monitoring_settings (
              user_id, monitoring_enabled, health_check_interval_minutes,
              email_alerts, webhook_alerts, alert_threshold_success_rate
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            userId,
            defaultSettings.monitoring_enabled,
            defaultSettings.health_check_interval_minutes,
            defaultSettings.email_alerts,
            defaultSettings.webhook_alerts,
            defaultSettings.alert_threshold_success_rate
          ]);

          res.json({
            success: true,
            data: { user_id: userId, ...defaultSettings }
          });
        } else {
          res.json({
            success: true,
            data: rows[0]
          });
        }

      } catch (error) {
        res.status(500).json({
          error: 'Erro ao obter configurações',
          message: error.message
        });
      }
    });

    // 8. ROTA: Atualizar configurações de monitoramento
    this.app.put('/api/users/:userId/monitoring-settings', checkInitialized, async (req, res) => {
      try {
        const { userId } = req.params;
        const {
          monitoring_enabled,
          health_check_interval_minutes,
          email_alerts,
          webhook_alerts,
          webhook_url,
          alert_threshold_success_rate
        } = req.body;

        await this.monitoring.db.query(`
          UPDATE monitoring_settings SET
            monitoring_enabled = COALESCE($2, monitoring_enabled),
            health_check_interval_minutes = COALESCE($3, health_check_interval_minutes),
            email_alerts = COALESCE($4, email_alerts),
            webhook_alerts = COALESCE($5, webhook_alerts),
            webhook_url = COALESCE($6, webhook_url),
            alert_threshold_success_rate = COALESCE($7, alert_threshold_success_rate),
            updated_at = NOW()
          WHERE user_id = $1
        `, [
          userId,
          monitoring_enabled,
          health_check_interval_minutes,
          email_alerts,
          webhook_alerts,
          webhook_url,
          alert_threshold_success_rate
        ]);

        res.json({
          success: true,
          message: 'Configurações atualizadas com sucesso'
        });

      } catch (error) {
        res.status(500).json({
          error: 'Erro ao atualizar configurações',
          message: error.message
        });
      }
    });

    // 9. ROTA: Dashboard de monitoramento (dados agregados)
    this.app.get('/api/monitoring/dashboard', checkInitialized, async (req, res) => {
      try {
        // Estatísticas das últimas 24 horas
        const last24hQuery = `
          SELECT 
            COUNT(DISTINCT user_id) as active_users,
            COUNT(*) as total_checks,
            AVG(success_rate) as avg_success_rate,
            COUNT(*) FILTER (WHERE overall_status IN ('EXCELLENT', 'GOOD')) as healthy_accounts,
            COUNT(*) FILTER (WHERE overall_status IN ('PARTIAL', 'LIMITED', 'FAILED')) as problematic_accounts
          FROM api_diagnostics 
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `;

        const { rows: statsRows } = await this.monitoring.db.query(last24hQuery);
        const stats = statsRows[0];

        // Top problemas
        const issuesQuery = `
          SELECT 
            unnest(critical_issues) as issue,
            COUNT(*) as frequency
          FROM api_diagnostics 
          WHERE created_at > NOW() - INTERVAL '7 days'
          AND array_length(critical_issues, 1) > 0
          GROUP BY issue
          ORDER BY frequency DESC
          LIMIT 5
        `;

        const { rows: issuesRows } = await this.monitoring.db.query(issuesQuery);

        // Evolução temporal (últimos 7 dias)
        const evolutionQuery = `
          SELECT 
            DATE(created_at) as date,
            AVG(success_rate) as avg_success_rate,
            COUNT(*) as checks_count
          FROM api_diagnostics 
          WHERE created_at > NOW() - INTERVAL '7 days'
          GROUP BY DATE(created_at)
          ORDER BY date
        `;

        const { rows: evolutionRows } = await this.monitoring.db.query(evolutionQuery);

        res.json({
          success: true,
          data: {
            summary: {
              activeUsers: parseInt(stats.active_users) || 0,
              totalChecks: parseInt(stats.total_checks) || 0,
              avgSuccessRate: parseFloat(stats.avg_success_rate) || 0,
              healthyAccounts: parseInt(stats.healthy_accounts) || 0,
              problematicAccounts: parseInt(stats.problematic_accounts) || 0
            },
            topIssues: issuesRows,
            evolution: evolutionRows
          }
        });

      } catch (error) {
        res.status(500).json({
          error: 'Erro ao obter dados do dashboard',
          message: error.message
        });
      }
    });

    console.log('✅ Rotas de monitoramento configuradas');
  }

  /**
   * Middleware para executar diagnóstico automático em rotas existentes
   */
  createApiKeyMiddleware() {
    return async (req, res, next) => {
      // Interceptar criação/atualização de chaves API
      const originalSend = res.send;
      
      res.send = function(data) {
        // Se a resposta foi bem-sucedida e contém uma nova chave API
        if (res.statusCode === 200 && req.body && req.body.binance_api_key) {
          // Executar diagnóstico em background (não bloquear resposta)
          setImmediate(async () => {
            try {
              await this.monitoring.onNewApiKeyAdded(
                req.params.userId || req.body.userId,
                req.body.binance_api_key,
                req.body.binance_api_secret || req.body.binance_secret_key,
                'https://api.bybit.com',
                {
                  source: 'existing_endpoint',
                  route: req.route?.path,
                  method: req.method
                }
              );
            } catch (error) {
              console.error('❌ Erro no diagnóstico automático:', error.message);
            }
          });
        }
        
        originalSend.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * Para o sistema de monitoramento
   */
  async shutdown() {
    if (this.monitoring) {
      await this.monitoring.stopMonitoring();
    }
    console.log('🛑 Sistema de monitoramento parado');
  }
}

module.exports = MonitoringIntegration;
