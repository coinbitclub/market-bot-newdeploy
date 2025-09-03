/**
 * EXEMPLO DE INTEGRAÇÃO NO APP.JS PRINCIPAL
 * Mostra como adicionar o sistema de monitoramento automático
 * ao seu app.js existente do CoinBitClub
 */

const express = require('express');
const MonitoringIntegration = require('./monitoring-integration');

// Exemplo de como integrar no seu app.js existente
async function setupMonitoringInExistingApp() {
  
  // 1. INICIALIZAR EXPRESS (seu código existente)
  const app = express();
  
  // Middlewares existentes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // 2. ADICIONAR SISTEMA DE MONITORAMENTO
  console.log('🔧 Configurando sistema de monitoramento automático...');
  
  const monitoring = new MonitoringIntegration(app);
  
  // Inicializar com URL do seu banco Railway
  const databaseUrl = process.env.DATABASE_URL || 'sua-url-do-railway-aqui';
  const monitoringInitialized = await monitoring.initialize(databaseUrl);
  
  if (monitoringInitialized) {
    console.log('✅ Sistema de monitoramento inicializado');
    
    // Configurar todas as rotas de monitoramento
    monitoring.setupRoutes();
    
    // Adicionar middleware para interceptar adições de chaves em rotas existentes
    app.use('/api/users/*/update-keys', monitoring.createApiKeyMiddleware());
    
  } else {
    console.error('❌ Falha ao inicializar monitoramento - continuando sem ele');
  }
  
  // 3. SUAS ROTAS EXISTENTES (exemplo)
  
  // Rota existente para adicionar/atualizar chaves
  app.post('/api/users/:userId/update-keys', async (req, res) => {
    try {
      const { userId } = req.params;
      const { binance_api_key, binance_api_secret } = req.body;
      
      // Seu código existente para salvar no banco
      console.log(`Atualizando chaves para usuário ${userId}`);
      
      // O middleware de monitoramento automaticamente detectará isso
      // e executará o diagnóstico em background
      
      res.json({
        success: true,
        message: 'Chaves atualizadas com sucesso',
        // O diagnóstico será executado automaticamente
        note: 'Diagnóstico automático será executado em background'
      });
      
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao atualizar chaves',
        message: error.message
      });
    }
  });
  
  // 4. INICIAR SERVIDOR
  const PORT = process.env.PORT || 3000;
  
  const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log('✅ Sistema de monitoramento automático ativo');
    console.log('\n📋 NOVAS ROTAS DISPONÍVEIS:');
    console.log('   POST /api/users/:userId/api-keys - Adicionar chave com diagnóstico automático');
    console.log('   GET  /api/monitoring/stats - Estatísticas do sistema');
    console.log('   GET  /api/users/:userId/diagnostics - Histórico de diagnósticos');
    console.log('   POST /api/users/:userId/diagnostics/run - Executar diagnóstico manual');
    console.log('   GET  /api/users/:userId/alerts - Alertas do usuário');
    console.log('   GET  /api/monitoring/dashboard - Dashboard de monitoramento');
  });
  
  // 5. GRACEFUL SHUTDOWN
  process.on('SIGTERM', async () => {
    console.log('🛑 Recebido SIGTERM, encerrando gracefully...');
    
    server.close(() => {
      console.log('✅ Servidor HTTP fechado');
    });
    
    if (monitoring) {
      await monitoring.shutdown();
    }
    
    process.exit(0);
  });
  
  return app;
}

// Para uso em desenvolvimento/teste
if (require.main === module) {
  setupMonitoringInExistingApp().catch(error => {
    console.error('❌ Erro ao inicializar aplicação:', error.message);
    process.exit(1);
  });
}

module.exports = { setupMonitoringInExistingApp };

/*
================================================================================
INSTRUÇÕES DE INTEGRAÇÃO NO SEU APP.JS EXISTENTE:
================================================================================

1. INSTALAR DEPENDÊNCIAS (se ainda não tiver):
   npm install crypto axios

2. ADICIONAR NO SEU APP.JS:

   const MonitoringIntegration = require('./monitoring-integration');
   
   // Após criar o app express
   const monitoring = new MonitoringIntegration(app);
   await monitoring.initialize(process.env.DATABASE_URL);
   monitoring.setupRoutes();

3. VARIÁVEIS DE AMBIENTE:
   Adicione no seu .env:
   DATABASE_URL=sua-url-do-railway

4. USANDO O SISTEMA:

   A) AUTOMÁTICO - sempre que uma nova chave for adicionada:
      - O sistema detecta automaticamente
      - Executa diagnóstico completo
      - Salva resultados no banco
      - Envia alertas se necessário

   B) MANUAL - através das novas rotas:
      POST /api/users/123/api-keys
      {
        "apiKey": "sua-chave",
        "apiSecret": "seu-secret",
        "exchange": "bybit",
        "environment": "production"
      }

   C) MONITORAMENTO - consultar status:
      GET /api/monitoring/stats
      GET /api/users/123/diagnostics
      GET /api/users/123/alerts

5. BENEFÍCIOS IMEDIATOS:
   ✅ Diagnóstico automático de todas as novas chaves
   ✅ Monitoramento contínuo 24/7
   ✅ Sistema de alertas integrado
   ✅ Dashboard de estatísticas
   ✅ Histórico completo de diagnósticos
   ✅ Detecção proativa de problemas

================================================================================
*/
