#!/usr/bin/env node

/**
 * 🔍 TESTADOR DE ENDPOINTS - COINBITCLUB ENTERPRISE
 * =================================================
 * 
 * Testa todos os 87+ endpoints e garante que retornem 200
 */

const axios = require('axios').default;
const fs = require('fs');
const path = require('path');

console.log('🔍 TESTADOR DE ENDPOINTS - COINBITCLUB ENTERPRISE');
console.log('=================================================');
console.log('');

// Configuração
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 segundos

// Contador de resultados
let stats = {
    total: 0,
    success: 0,
    errors: 0,
    skipped: 0
};

// Função para fazer requisição segura
async function safeRequest(method, endpoint, data = null) {
    try {
        const config = {
            method: method.toLowerCase(),
            url: `${BASE_URL}${endpoint}`,
            timeout: TIMEOUT,
            validateStatus: () => true // Aceita qualquer status
        };
        
        if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
            config.data = data;
            config.headers = { 'Content-Type': 'application/json' };
        }
        
        const response = await axios(config);
        return {
            success: true,
            status: response.status,
            data: response.data,
            endpoint: endpoint,
            method: method
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            endpoint: endpoint,
            method: method,
            status: error.response ? error.response.status : 'TIMEOUT'
        };
    }
}

// Lista completa dos 87+ endpoints
const ENDPOINTS = [
    // Endpoints básicos
    { method: 'GET', path: '/', description: 'Home' },
    { method: 'GET', path: '/health', description: 'Health Check' },
    { method: 'GET', path: '/status', description: 'Status' },
    
    // Dashboard
    { method: 'GET', path: '/dashboard', description: 'Dashboard Principal' },
    { method: 'GET', path: '/dashboard/stats', description: 'Estatísticas Dashboard' },
    { method: 'GET', path: '/dashboard/recent-signals', description: 'Sinais Recentes' },
    { method: 'GET', path: '/dashboard/performance', description: 'Performance Dashboard' },
    { method: 'GET', path: '/dashboard/alerts', description: 'Alertas Dashboard' },
    
    // APIs de Sinais
    { method: 'POST', path: '/api/signal', description: 'Receber Sinal', data: { symbol: 'BTCUSDT', action: 'BUY' } },
    { method: 'GET', path: '/api/signals', description: 'Listar Sinais' },
    { method: 'GET', path: '/api/signals/recent', description: 'Sinais Recentes' },
    { method: 'GET', path: '/api/signals/history', description: 'Histórico de Sinais' },
    { method: 'GET', path: '/api/signals/statistics', description: 'Estatísticas de Sinais' },
    
    // APIs de Trading
    { method: 'GET', path: '/api/trading/status', description: 'Status Trading' },
    { method: 'GET', path: '/api/trading/positions', description: 'Posições Ativas' },
    { method: 'GET', path: '/api/trading/orders', description: 'Ordens' },
    { method: 'GET', path: '/api/trading/balance', description: 'Saldo' },
    { method: 'GET', path: '/api/trading/performance', description: 'Performance Trading' },
    { method: 'POST', path: '/api/trading/start', description: 'Iniciar Trading' },
    { method: 'POST', path: '/api/trading/stop', description: 'Parar Trading' },
    { method: 'POST', path: '/api/trading/emergency-stop', description: 'Parada de Emergência' },
    
    // APIs de Configuração
    { method: 'GET', path: '/api/config', description: 'Configurações' },
    { method: 'POST', path: '/api/config', description: 'Salvar Configurações', data: { symbol: 'BTCUSDT' } },
    { method: 'GET', path: '/api/config/trading', description: 'Config Trading' },
    { method: 'GET', path: '/api/config/exchanges', description: 'Config Exchanges' },
    { method: 'GET', path: '/api/config/users', description: 'Config Usuários' },
    
    // APIs de Usuários
    { method: 'GET', path: '/api/users', description: 'Listar Usuários' },
    { method: 'POST', path: '/api/users', description: 'Criar Usuário', data: { name: 'Test User' } },
    { method: 'GET', path: '/api/users/active', description: 'Usuários Ativos' },
    { method: 'GET', path: '/api/users/statistics', description: 'Estatísticas Usuários' },
    
    // APIs de Monitoramento
    { method: 'GET', path: '/api/monitoring/system', description: 'Monitor Sistema' },
    { method: 'GET', path: '/api/monitoring/connections', description: 'Monitor Conexões' },
    { method: 'GET', path: '/api/monitoring/alerts', description: 'Monitor Alertas' },
    { method: 'GET', path: '/api/monitoring/logs', description: 'Monitor Logs' },
    { method: 'GET', path: '/api/monitoring/metrics', description: 'Métricas Sistema' },
    
    // APIs de Exchanges
    { method: 'GET', path: '/api/exchanges/binance/status', description: 'Status Binance' },
    { method: 'GET', path: '/api/exchanges/bybit/status', description: 'Status Bybit' },
    { method: 'GET', path: '/api/exchanges/binance/balance', description: 'Saldo Binance' },
    { method: 'GET', path: '/api/exchanges/bybit/balance', description: 'Saldo Bybit' },
    { method: 'GET', path: '/api/exchanges/binance/positions', description: 'Posições Binance' },
    { method: 'GET', path: '/api/exchanges/bybit/positions', description: 'Posições Bybit' },
    
    // APIs de Relatórios
    { method: 'GET', path: '/api/reports/daily', description: 'Relatório Diário' },
    { method: 'GET', path: '/api/reports/weekly', description: 'Relatório Semanal' },
    { method: 'GET', path: '/api/reports/monthly', description: 'Relatório Mensal' },
    { method: 'GET', path: '/api/reports/performance', description: 'Relatório Performance' },
    { method: 'GET', path: '/api/reports/profit-loss', description: 'Relatório P&L' },
    
    // APIs de Backup
    { method: 'GET', path: '/api/backup/create', description: 'Criar Backup' },
    { method: 'GET', path: '/api/backup/list', description: 'Listar Backups' },
    { method: 'POST', path: '/api/backup/restore', description: 'Restaurar Backup' },
    
    // APIs de Segurança
    { method: 'GET', path: '/api/security/audit', description: 'Auditoria Segurança' },
    { method: 'GET', path: '/api/security/logs', description: 'Logs Segurança' },
    { method: 'POST', path: '/api/security/lock', description: 'Bloquear Sistema' },
    { method: 'POST', path: '/api/security/unlock', description: 'Desbloquear Sistema' },
    
    // Webhooks
    { method: 'POST', path: '/webhook/tradingview', description: 'Webhook TradingView', data: { symbol: 'BTCUSDT', action: 'BUY' } },
    { method: 'POST', path: '/webhook/binance', description: 'Webhook Binance' },
    { method: 'POST', path: '/webhook/bybit', description: 'Webhook Bybit' },
    
    // APIs Avançadas
    { method: 'GET', path: '/api/advanced/arbitrage', description: 'Arbitragem' },
    { method: 'GET', path: '/api/advanced/grid-trading', description: 'Grid Trading' },
    { method: 'GET', path: '/api/advanced/dca', description: 'DCA (Dollar Cost Average)' },
    { method: 'GET', path: '/api/advanced/scalping', description: 'Scalping' },
    
    // APIs de Análise
    { method: 'GET', path: '/api/analysis/technical', description: 'Análise Técnica' },
    { method: 'GET', path: '/api/analysis/fundamental', description: 'Análise Fundamental' },
    { method: 'GET', path: '/api/analysis/sentiment', description: 'Análise Sentimento' },
    { method: 'GET', path: '/api/analysis/market', description: 'Análise Mercado' },
    
    // APIs de Portfolio
    { method: 'GET', path: '/api/portfolio/overview', description: 'Visão Geral Portfolio' },
    { method: 'GET', path: '/api/portfolio/allocation', description: 'Alocação Portfolio' },
    { method: 'GET', path: '/api/portfolio/rebalance', description: 'Rebalanceamento' },
    { method: 'GET', path: '/api/portfolio/risk', description: 'Análise Risco' },
    
    // APIs de Notificações
    { method: 'GET', path: '/api/notifications', description: 'Listar Notificações' },
    { method: 'POST', path: '/api/notifications/send', description: 'Enviar Notificação', data: { message: 'Test' } },
    { method: 'GET', path: '/api/notifications/settings', description: 'Config Notificações' },
    
    // APIs de Logs
    { method: 'GET', path: '/api/logs/trading', description: 'Logs Trading' },
    { method: 'GET', path: '/api/logs/system', description: 'Logs Sistema' },
    { method: 'GET', path: '/api/logs/errors', description: 'Logs Erros' },
    { method: 'GET', path: '/api/logs/access', description: 'Logs Acesso' },
    
    // APIs de Manutenção
    { method: 'POST', path: '/api/maintenance/start', description: 'Iniciar Manutenção' },
    { method: 'POST', path: '/api/maintenance/stop', description: 'Parar Manutenção' },
    { method: 'GET', path: '/api/maintenance/status', description: 'Status Manutenção' },
    
    // APIs de Cache
    { method: 'POST', path: '/api/cache/clear', description: 'Limpar Cache' },
    { method: 'GET', path: '/api/cache/stats', description: 'Estatísticas Cache' },
    
    // APIs de Database
    { method: 'GET', path: '/api/database/health', description: 'Saúde Database' },
    { method: 'GET', path: '/api/database/stats', description: 'Estatísticas Database' },
    
    // APIs de Desenvolvimento
    { method: 'GET', path: '/api/dev/test', description: 'Endpoint Teste' },
    { method: 'GET', path: '/api/dev/debug', description: 'Debug Info' },
    { method: 'GET', path: '/api/dev/version', description: 'Versão Sistema' },
    
    // APIs Especiais
    { method: 'GET', path: '/api/special/emergency', description: 'Modo Emergência' },
    { method: 'GET', path: '/api/special/diagnostic', description: 'Diagnóstico Sistema' },
    { method: 'POST', path: '/api/special/reset', description: 'Reset Sistema' }
];

// Função principal de teste
async function testAllEndpoints() {
    console.log(`🎯 Testando ${ENDPOINTS.length} endpoints...`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`⏱️ Timeout: ${TIMEOUT}ms`);
    console.log('');
    
    const results = [];
    
    // Primeiro, testar se o servidor está rodando
    console.log('🔍 Verificando se o servidor está rodando...');
    const healthCheck = await safeRequest('GET', '/health');
    
    if (!healthCheck.success) {
        console.log('❌ SERVIDOR NÃO ESTÁ RODANDO!');
        console.log(`💡 Erro: ${healthCheck.error}`);
        console.log('');
        console.log('🚀 Para iniciar o servidor:');
        console.log('   1. Em um terminal: node main.js');
        console.log('   2. Ou: node startup-robusto.js');
        console.log('   3. Aguarde alguns segundos e execute este teste novamente');
        return;
    }
    
    console.log('✅ Servidor está rodando!');
    console.log(`📊 Status: ${healthCheck.status}`);
    console.log('');
    
    // Testar todos os endpoints
    console.log('🧪 Iniciando testes dos endpoints...');
    console.log('');
    
    for (let i = 0; i < ENDPOINTS.length; i++) {
        const endpoint = ENDPOINTS[i];
        stats.total++;
        
        console.log(`[${i + 1}/${ENDPOINTS.length}] ${endpoint.method} ${endpoint.path}`);
        
        const result = await safeRequest(endpoint.method, endpoint.path, endpoint.data);
        
        if (result.success) {
            const statusIcon = result.status === 200 ? '✅' : result.status < 400 ? '⚠️' : '❌';
            console.log(`   ${statusIcon} Status: ${result.status} - ${endpoint.description}`);
            
            if (result.status === 200) {
                stats.success++;
            } else {
                stats.errors++;
            }
        } else {
            console.log(`   ❌ ERRO: ${result.error} - ${endpoint.description}`);
            stats.errors++;
        }
        
        results.push(result);
        
        // Pequena pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Relatório final
    console.log('');
    console.log('📊 RELATÓRIO FINAL DOS TESTES');
    console.log('=============================');
    console.log(`📈 Total de endpoints testados: ${stats.total}`);
    console.log(`✅ Sucessos (200): ${stats.success}`);
    console.log(`❌ Erros: ${stats.errors}`);
    console.log(`📊 Taxa de sucesso: ${((stats.success / stats.total) * 100).toFixed(1)}%`);
    console.log('');
    
    // Endpoints com problema
    const problemEndpoints = results.filter(r => !r.success || r.status !== 200);
    if (problemEndpoints.length > 0) {
        console.log('🚨 ENDPOINTS COM PROBLEMAS:');
        console.log('===========================');
        problemEndpoints.forEach(ep => {
            console.log(`❌ ${ep.method} ${ep.endpoint} - ${ep.error || `Status: ${ep.status}`}`);
        });
        console.log('');
    }
    
    // Salvar relatório
    const report = {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        statistics: stats,
        results: results
    };
    
    fs.writeFileSync('./test-results.json', JSON.stringify(report, null, 2));
    console.log('💾 Relatório salvo em: test-results.json');
    
    // Status final
    if (stats.success === stats.total) {
        console.log('');
        console.log('🎉 TODOS OS ENDPOINTS RETORNARAM 200! ');
        console.log('✅ SISTEMA 100% OPERACIONAL!');
    } else {
        console.log('');
        console.log('⚠️ ALGUNS ENDPOINTS PRECISAM DE CORREÇÃO');
        console.log('💡 Verifique os problemas listados acima');
    }
}

// Verificar se axios está disponível
try {
    require.resolve('axios');
    console.log('✅ Axios disponível');
} catch (error) {
    console.log('❌ Axios não encontrado');
    console.log('💡 Execute: npm install axios');
    process.exit(1);
}

// Executar testes
testAllEndpoints().catch(error => {
    console.error('❌ Erro fatal no teste:', error);
    process.exit(1);
});
