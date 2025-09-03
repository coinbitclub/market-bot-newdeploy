const crypto = require('crypto');
const axios = require('axios');

/**
 * SISTEMA DE DIAGNÓSTICO AUTOMÁTICO BYBIT
 * Executa diagnóstico completo sempre que uma nova chave é adicionada
 * e monitora continuamente as chaves existentes
 */

class BybitDiagnosticSystem {
  constructor() {
    this.diagnosticResults = new Map();
    this.monitoringInterval = null;
    this.isMonitoring = false;
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      monitoringIntervalMs: 60 * 60 * 1000, // 1 hora
      healthCheckEndpoints: [
        '/v5/account/info',
        '/v5/account/wallet-balance',
        '/v5/position/list',
        '/v5/market/tickers'
      ]
    };
  }

  /**
   * Executa diagnóstico completo em uma nova chave
   */
  async runFullDiagnostic(apiKey, apiSecret, baseUrl = 'https://api.bybit.com', accountInfo = {}) {
    console.log(`🔍 INICIANDO DIAGNÓSTICO AUTOMÁTICO`);
    console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...`);
    console.log(`🌐 Environment: ${baseUrl.includes('testnet') ? 'TESTNET' : 'PRODUÇÃO'}`);
    console.log('='.repeat(60));

    const account = {
      apiKey,
      apiSecret,
      baseUrl,
      ...accountInfo
    };

    const diagnosticId = this.generateDiagnosticId(apiKey);
    const startTime = Date.now();

    try {
      // 1. Teste de conectividade básica
      const connectivityResult = await this.testConnectivity(account);
      
      // 2. Teste de autenticação
      const authResult = await this.testAuthentication(account);
      
      // 3. Teste de permissões
      const permissionsResult = await this.testPermissions(account);
      
      // 4. Teste de saldos
      const balanceResult = await this.testBalanceAccess(account);
      
      // 5. Teste de trading endpoints
      const tradingResult = await this.testTradingEndpoints(account);
      
      // 6. Teste de market data
      const marketDataResult = await this.testMarketData(account);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      const fullResult = {
        diagnosticId,
        apiKey: apiKey.substring(0, 8) + '...',
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime,
        environment: baseUrl.includes('testnet') ? 'testnet' : 'production',
        results: {
          connectivity: connectivityResult,
          authentication: authResult,
          permissions: permissionsResult,
          balance: balanceResult,
          trading: tradingResult,
          marketData: marketDataResult
        },
        overall: this.calculateOverallStatus({
          connectivity: connectivityResult,
          authentication: authResult,
          permissions: permissionsResult,
          balance: balanceResult,
          trading: tradingResult,
          marketData: marketDataResult
        }),
        accountInfo
      };

      // Armazenar resultado
      this.diagnosticResults.set(diagnosticId, fullResult);

      // Log resultado
      this.logDiagnosticResult(fullResult);

      return fullResult;

    } catch (error) {
      const errorResult = {
        diagnosticId,
        apiKey: apiKey.substring(0, 8) + '...',
        timestamp: new Date().toISOString(),
        error: error.message,
        overall: { status: 'CRITICAL_ERROR', successRate: 0 }
      };

      this.diagnosticResults.set(diagnosticId, errorResult);
      console.error(`❌ ERRO CRÍTICO NO DIAGNÓSTICO:`, error.message);
      
      return errorResult;
    }
  }

  /**
   * Testa conectividade básica
   */
  async testConnectivity(account) {
    try {
      const response = await axios.get(`${account.baseUrl}/v5/market/time`);
      return {
        success: true,
        status: 'CONNECTED',
        responseTime: response.headers['x-response-time'] || 'N/A',
        serverTime: response.data?.result?.timeSecond || 'N/A'
      };
    } catch (error) {
      return {
        success: false,
        status: 'CONNECTION_FAILED',
        error: error.message
      };
    }
  }

  /**
   * Testa autenticação com endpoint privado
   */
  async testAuthentication(account) {
    try {
      const { headers } = this.generateSignature(account, '');
      const response = await axios.get(`${account.baseUrl}/v5/account/info`, { headers });
      
      if (response.data.retCode === 0) {
        return {
          success: true,
          status: 'AUTHENTICATED',
          accountType: response.data.result?.marginMode || 'Unknown',
          unifiedMarginStatus: response.data.result?.unifiedMarginStatus || 'Unknown'
        };
      } else {
        return {
          success: false,
          status: 'AUTH_FAILED',
          retCode: response.data.retCode,
          retMsg: response.data.retMsg
        };
      }
    } catch (error) {
      return {
        success: false,
        status: 'AUTH_ERROR',
        error: error.response?.data?.retMsg || error.message,
        retCode: error.response?.data?.retCode || 'Network Error'
      };
    }
  }

  /**
   * Testa permissões da API key
   */
  async testPermissions(account) {
    const permissionTests = [];

    // Teste 1: Leitura de informações da conta
    try {
      const { headers } = this.generateSignature(account, '');
      const response = await axios.get(`${account.baseUrl}/v5/user/query-api`, { headers });
      permissionTests.push({
        test: 'api_info',
        success: response.data.retCode === 0,
        permissions: response.data.result?.permissions || 'Unknown'
      });
    } catch (error) {
      permissionTests.push({
        test: 'api_info',
        success: false,
        error: error.message
      });
    }

    // Teste 2: Acesso a saldos
    try {
      const { headers } = this.generateSignature(account, 'accountType=UNIFIED');
      const response = await axios.get(`${account.baseUrl}/v5/account/wallet-balance?accountType=UNIFIED`, { headers });
      permissionTests.push({
        test: 'wallet_access',
        success: response.data.retCode === 0,
        hasBalance: response.data.result?.list?.length > 0
      });
    } catch (error) {
      permissionTests.push({
        test: 'wallet_access',
        success: false,
        error: error.message
      });
    }

    // Teste 3: Acesso a posições
    try {
      const { headers } = this.generateSignature(account, 'category=linear');
      const response = await axios.get(`${account.baseUrl}/v5/position/list?category=linear`, { headers });
      permissionTests.push({
        test: 'position_access',
        success: response.data.retCode === 0,
        positionsAvailable: response.data.result?.list?.length || 0
      });
    } catch (error) {
      permissionTests.push({
        test: 'position_access',
        success: false,
        error: error.message
      });
    }

    const successfulTests = permissionTests.filter(test => test.success).length;
    const totalTests = permissionTests.length;

    return {
      success: successfulTests > 0,
      status: successfulTests === totalTests ? 'FULL_PERMISSIONS' : 
              successfulTests > 0 ? 'PARTIAL_PERMISSIONS' : 'NO_PERMISSIONS',
      successRate: (successfulTests / totalTests * 100).toFixed(1),
      tests: permissionTests
    };
  }

  /**
   * Testa acesso a saldos e retorna informações financeiras
   */
  async testBalanceAccess(account) {
    try {
      const { headers } = this.generateSignature(account, 'accountType=UNIFIED');
      const response = await axios.get(`${account.baseUrl}/v5/account/wallet-balance?accountType=UNIFIED`, { headers });
      
      if (response.data.retCode === 0 && response.data.result.list.length > 0) {
        const accountData = response.data.result.list[0];
        const totalEquity = parseFloat(accountData.totalEquity || 0);
        const totalBalance = parseFloat(accountData.totalWalletBalance || 0);
        const availableBalance = parseFloat(accountData.totalAvailableBalance || 0);
        
        // Contar moedas com saldo
        const coinsWithBalance = accountData.coin.filter(coin => 
          parseFloat(coin.walletBalance || 0) > 0
        );

        return {
          success: true,
          status: totalEquity > 0 ? 'HAS_BALANCE' : 'ZERO_BALANCE',
          totalEquity,
          totalBalance,
          availableBalance,
          currencyCount: coinsWithBalance.length,
          mainCurrencies: coinsWithBalance.slice(0, 3).map(coin => ({
            coin: coin.coin,
            balance: coin.walletBalance,
            usdValue: coin.usdValue
          }))
        };
      } else {
        return {
          success: false,
          status: 'BALANCE_ACCESS_DENIED',
          retCode: response.data.retCode,
          retMsg: response.data.retMsg
        };
      }
    } catch (error) {
      return {
        success: false,
        status: 'BALANCE_ERROR',
        error: error.response?.data?.retMsg || error.message
      };
    }
  }

  /**
   * Testa endpoints de trading
   */
  async testTradingEndpoints(account) {
    const endpointTests = [
      { endpoint: '/v5/position/list', query: 'category=linear', name: 'positions' },
      { endpoint: '/v5/order/realtime', query: 'category=linear', name: 'orders' },
      { endpoint: '/v5/order/history', query: 'category=linear&limit=1', name: 'order_history' },
      { endpoint: '/v5/execution/list', query: 'category=linear&limit=1', name: 'executions' }
    ];

    const results = [];

    for (const test of endpointTests) {
      try {
        const { headers } = this.generateSignature(account, test.query);
        const fullUrl = `${account.baseUrl}${test.endpoint}?${test.query}`;
        const response = await axios.get(fullUrl, { headers });
        
        results.push({
          name: test.name,
          endpoint: test.endpoint,
          success: response.data.retCode === 0,
          retCode: response.data.retCode,
          dataCount: response.data.result?.list?.length || 0
        });
      } catch (error) {
        results.push({
          name: test.name,
          endpoint: test.endpoint,
          success: false,
          error: error.message
        });
      }
    }

    const successfulTests = results.filter(test => test.success).length;
    const totalTests = results.length;

    return {
      success: successfulTests > 0,
      status: successfulTests === totalTests ? 'ALL_TRADING_OK' : 
              successfulTests > 0 ? 'PARTIAL_TRADING' : 'NO_TRADING_ACCESS',
      successRate: (successfulTests / totalTests * 100).toFixed(1),
      tests: results
    };
  }

  /**
   * Testa acesso a dados de mercado
   */
  async testMarketData(account) {
    const marketTests = [
      { endpoint: '/v5/market/tickers', query: 'category=linear&symbol=BTCUSDT', name: 'tickers' },
      { endpoint: '/v5/market/orderbook', query: 'category=linear&symbol=BTCUSDT', name: 'orderbook' },
      { endpoint: '/v5/market/kline', query: 'category=linear&symbol=BTCUSDT&interval=1&limit=1', name: 'kline' }
    ];

    const results = [];

    for (const test of marketTests) {
      try {
        const response = await axios.get(`${account.baseUrl}${test.endpoint}?${test.query}`);
        
        results.push({
          name: test.name,
          endpoint: test.endpoint,
          success: response.data.retCode === 0,
          hasData: response.data.result && Object.keys(response.data.result).length > 0
        });
      } catch (error) {
        results.push({
          name: test.name,
          endpoint: test.endpoint,
          success: false,
          error: error.message
        });
      }
    }

    const successfulTests = results.filter(test => test.success).length;
    const totalTests = results.length;

    return {
      success: successfulTests > 0,
      status: successfulTests === totalTests ? 'MARKET_DATA_OK' : 'MARKET_DATA_ISSUES',
      successRate: (successfulTests / totalTests * 100).toFixed(1),
      tests: results
    };
  }

  /**
   * Calcula status geral baseado em todos os testes
   */
  calculateOverallStatus(results) {
    const categories = Object.keys(results);
    const successfulCategories = categories.filter(cat => results[cat].success).length;
    const totalCategories = categories.length;
    const successRate = (successfulCategories / totalCategories * 100);

    let status;
    if (successRate >= 95) status = 'EXCELLENT';
    else if (successRate >= 80) status = 'GOOD';
    else if (successRate >= 50) status = 'PARTIAL';
    else if (successRate > 0) status = 'LIMITED';
    else status = 'FAILED';

    return {
      status,
      successRate: successRate.toFixed(1),
      criticalIssues: this.identifyCriticalIssues(results),
      recommendations: this.generateRecommendations(results)
    };
  }

  /**
   * Identifica problemas críticos
   */
  identifyCriticalIssues(results) {
    const issues = [];

    if (!results.connectivity.success) {
      issues.push('CONNECTIVITY_FAILURE');
    }
    if (!results.authentication.success) {
      issues.push('AUTHENTICATION_FAILURE');
    }
    if (!results.permissions.success) {
      issues.push('PERMISSION_DENIED');
    }
    if (results.authentication.success && results.authentication.retCode === 10010) {
      issues.push('IP_WHITELIST_REQUIRED');
    }
    if (results.authentication.success && results.authentication.retCode === 10003) {
      issues.push('INVALID_API_KEYYOUR_API_KEY_HEREVerificar conectividade de rede e URL do endpoint');
    }
    if (!results.authentication.success) {
      if (results.authentication.retCode === 10010) {
        recommendations.push('Configurar whitelist de IP no painel Bybit');
      } else if (results.authentication.retCode === 10003) {
        recommendations.push('Verificar validade da API key e secret');
      } else {
        recommendations.push('Verificar credenciais da API');
      }
    }
    if (results.permissions.success && parseFloat(results.permissions.successRate) < 100) {
      recommendations.push('Habilitar todas as permissões necessárias no painel Bybit');
    }
    if (results.balance.success && results.balance.totalEquity === 0) {
      recommendations.push('Depositar saldo para ativar funcionalidades de trading');
    }

    return recommendations;
  }

  /**
   * Gera assinatura HMAC
   */
  generateSignature(account, query = '') {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    const signPayload = timestamp + account.apiKey + recvWindow + query;
    
    const signature = crypto
      .createHmac('sha256', account.apiSecret)
      .update(signPayload)
      .digest('hex');

    return {
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': account.apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'X-BAPI-SIGN-TYPE': '2'
      },
      timestamp
    };
  }

  /**
   * Gera ID único para o diagnóstico
   */
  generateDiagnosticId(apiKey) {
    const hash = crypto.createHash('md5').update(apiKey + Date.now()).digest('hex');
    return `diag_${hash.substring(0, 12)}`;
  }

  /**
   * Log do resultado do diagnóstico
   */
  logDiagnosticResult(result) {
    console.log(`\n📊 RESULTADO DO DIAGNÓSTICO AUTOMÁTICO`);
    console.log(`🆔 ID: ${result.diagnosticId}`);
    console.log(`⏱️  Tempo: ${result.executionTimeMs}ms`);
    console.log(`📈 Status: ${result.overall.status} (${result.overall.successRate}%)`);
    
    if (result.overall.criticalIssues.length > 0) {
      console.log(`🚨 Problemas críticos: ${result.overall.criticalIssues.join(', ')}`);
    }
    
    if (result.overall.recommendations.length > 0) {
      console.log(`💡 Recomendações:`);
      result.overall.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }

    // Log detalhado por categoria
    Object.entries(result.results).forEach(([category, categoryResult]) => {
      const icon = categoryResult.success ? '✅' : '❌';
      console.log(`${icon} ${category.toUpperCase()}: ${categoryResult.status}`);
    });

    console.log('='.repeat(60));
  }

  /**
   * Inicia monitoramento contínuo
   */
  startContinuousMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ Monitoramento já está ativo');
      return;
    }

    console.log('🚀 INICIANDO MONITORAMENTO CONTÍNUO');
    console.log(`⏱️  Intervalo: ${this.config.monitoringIntervalMs / 1000 / 60} minutos`);
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.runHealthCheckAllKeys();
    }, this.config.monitoringIntervalMs);

    console.log('✅ Monitoramento iniciado com sucesso');
  }

  /**
   * Para monitoramento contínuo
   */
  stopContinuousMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Monitoramento contínuo parado');
  }

  /**
   * Executa health check em todas as chaves armazenadas
   */
  async runHealthCheckAllKeys() {
    console.log('\n🔍 EXECUTANDO HEALTH CHECK AUTOMÁTICO');
    console.log(`⏰ ${new Date().toLocaleString()}`);
    
    // Aqui você integraria com seu banco de dados para buscar todas as chaves
    // Por agora, usamos as chaves conhecidas
    const knownKeys = [
      {
        apiKey: '2iNeNZQepHJS0lWBkf',
        apiSecret: 'process.env.API_KEY_HERE',
        name: 'Erica dos Santos Andrade',
        email: 'erica.andrade.santos@hotmail.com'
      }
    ];

    for (const keyInfo of knownKeys) {
      try {
        console.log(`\n🔍 Health check: ${keyInfo.name}`);
        const quickCheck = await this.runQuickHealthCheck(keyInfo);
        
        if (!quickCheck.success) {
          console.log(`🚨 ALERTA: Problema detectado em ${keyInfo.name}`);
          // Aqui você pode enviar notificação, email, webhook, etc.
          await this.sendAlert(keyInfo, quickCheck);
        } else {
          console.log(`✅ ${keyInfo.name}: OK`);
        }
      } catch (error) {
        console.error(`❌ Erro no health check de ${keyInfo.name}:`, error.message);
      }
    }
  }

  /**
   * Health check rápido (apenas endpoints críticos)
   */
  async runQuickHealthCheck(account) {
    const criticalTests = [];

    // Teste 1: Conectividade
    try {
      await axios.get(`${account.baseUrl || 'https://api.bybit.com'}/v5/market/time`);
      criticalTests.push({ test: 'connectivity', success: true });
    } catch (error) {
      criticalTests.push({ test: 'connectivity', success: false, error: error.message });
    }

    // Teste 2: Autenticação
    try {
      const { headers } = this.generateSignature(account, '');
      const response = await axios.get(`${account.baseUrl || 'https://api.bybit.com'}/v5/account/info`, { headers });
      criticalTests.push({ 
        test: 'authentication', 
        success: response.data.retCode === 0,
        retCode: response.data.retCode 
      });
    } catch (error) {
      criticalTests.push({ test: 'authentication', success: false, error: error.message });
    }

    const successfulTests = criticalTests.filter(test => test.success).length;
    const allSuccess = successfulTests === criticalTests.length;

    return {
      success: allSuccess,
      timestamp: new Date().toISOString(),
      tests: criticalTests,
      successRate: (successfulTests / criticalTests.length * 100).toFixed(1)
    };
  }

  /**
   * Envia alerta quando detecta problema
   */
  async sendAlert(keyInfo, healthCheck) {
    const alertData = {
      type: 'API_KEY_HEALTH_ALERT',
      severity: 'HIGH',
      timestamp: new Date().toISOString(),
      account: {
        name: keyInfo.name,
        email: keyInfo.email,
        apiKey: keyInfo.apiKey.substring(0, 8) + '...'
      },
      issues: healthCheck.tests.filter(test => !test.success),
      successRate: healthCheck.successRate
    };

    console.log('🚨 ENVIANDO ALERTA:', JSON.stringify(alertData, null, 2));
    
    // Aqui você implementaria:
    // - Envio de email
    // - Webhook para Discord/Slack
    // - Notificação push
    // - Log em arquivo
    // - Salvar no banco de dados
  }

  /**
   * Obtém estatísticas do sistema
   */
  getSystemStats() {
    const totalDiagnostics = this.diagnosticResults.size;
    const successfulDiagnostics = Array.from(this.diagnosticResults.values())
      .filter(result => result.overall && parseFloat(result.overall.successRate) >= 80).length;

    return {
      totalDiagnostics,
      successfulDiagnostics,
      overallSuccessRate: totalDiagnostics > 0 ? 
        (successfulDiagnostics / totalDiagnostics * 100).toFixed(1) : '0.0',
      isMonitoring: this.isMonitoring,
      lastUpdate: new Date().toISOString()
    };
  }
}

module.exports = BybitDiagnosticSystem;
