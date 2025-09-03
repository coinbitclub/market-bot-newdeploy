/**
 * 🔥 BATERIA COMPLETA DE TESTES - RAILWAY ENDPOINTS
 * Verificar se force redeploy resolveu os 404s
 */

const axios = require('axios');

console.log('🔥 BATERIA COMPLETA DE TESTES - RAILWAY ENDPOINTS');
console.log('================================================');
console.log(`🕐 Iniciado em: ${new Date().toLocaleString()}`);
console.log('');

const baseUrl = 'https://coinbitclub-market-bot-production.up.railway.app';

// Lista completa dos 85+ endpoints para testar
const endpointsParaTestar = [
    // Endpoints básicos essenciais
    { path: '/', name: 'Root Dashboard', critical: true },
    { path: '/health', name: 'Health Check', critical: true },
    { path: '/api/system/status', name: 'System Status', critical: true },
    { path: '/api/current-mode', name: 'Current Mode', critical: true },
    { path: '/api/production-mode', name: 'Production Mode', critical: true },
    
    // Endpoints de ativação
    { path: '/ativar-chaves-reais', name: 'Ativar Chaves Reais', critical: true },
    
    // Endpoints de dados em tempo real
    { path: '/api/dados-tempo-real', name: 'Dados Tempo Real', critical: false },
    { path: '/api/saldos-usuarios', name: 'Saldos Usuários', critical: false },
    { path: '/api/dominancia-btc', name: 'Dominância BTC', critical: false },
    { path: '/api/fear-greed', name: 'Fear & Greed Index', critical: false },
    
    // Endpoints de trading
    { path: '/api/trading/status', name: 'Trading Status', critical: false },
    { path: '/api/trading/positions', name: 'Trading Positions', critical: false },
    { path: '/api/trading/signals', name: 'Trading Signals', critical: false },
    
    // Endpoints de usuários
    { path: '/api/users', name: 'Users List', critical: false },
    { path: '/api/users/keys', name: 'User Keys', critical: false },
    { path: '/api/users/balances', name: 'User Balances', critical: false },
    
    // Endpoints de dashboard
    { path: '/dashboard', name: 'Dashboard Principal', critical: false },
    { path: '/painel', name: 'Painel Controle', critical: false },
    { path: '/painel/executivo', name: 'Dashboard Executivo', critical: false },
    
    // Endpoints de monitoramento
    { path: '/api/monitor/status', name: 'Monitor Status', critical: false },
    { path: '/api/monitor/logs', name: 'Monitor Logs', critical: false },
    
    // Endpoints de configuração
    { path: '/api/config', name: 'Configuration', critical: false },
    { path: '/api/config/exchanges', name: 'Exchange Config', critical: false },
    
    // Webhooks
    { path: '/webhook/tradingview', name: 'TradingView Webhook', critical: false },
    { path: '/webhook/signals', name: 'Signals Webhook', critical: false }
];

let resultados = {
    total: 0,
    sucesso: 0,
    falha: 0,
    criticos_ok: 0,
    criticos_total: 0,
    detalhes: []
};

async function testarEndpoint(endpoint) {
    const url = `${baseUrl}${endpoint.path}`;
    
    try {
        console.log(`🔍 Testando: ${endpoint.name} (${endpoint.path})`);
        
        const response = await axios.get(url, {
            timeout: 10000,
            validateStatus: () => true, // Aceitar qualquer status
            headers: {
                'User-Agent': 'CoinBitClub-Test-Suite/1.0'
            }
        });
        
        const isFallback = response.headers['x-railway-fallback'] === 'true';
        const isSuccess = response.status >= 200 && response.status < 400;
        const isNotFound = response.status === 404;
        
        let status = '❌';
        let observacao = '';
        
        if (isFallback) {
            status = '🚨';
            observacao = 'FALLBACK - Deploy ainda não processado';
        } else if (isSuccess) {
            status = '✅';
            observacao = 'OK';
            resultados.sucesso++;
            if (endpoint.critical) resultados.criticos_ok++;
        } else if (isNotFound) {
            status = '❌';
            observacao = '404 - Endpoint não encontrado';
            resultados.falha++;
        } else {
            status = '⚠️';
            observacao = `Status ${response.status}`;
            resultados.falha++;
        }
        
        console.log(`   ${status} Status: ${response.status} | ${observacao}`);
        
        // Log dados interessantes para endpoints críticos que funcionam
        if (isSuccess && endpoint.critical && response.data) {
            if (typeof response.data === 'object') {
                console.log(`   📊 Dados:`, JSON.stringify(response.data).substring(0, 200) + '...');
            }
        }
        
        resultados.detalhes.push({
            endpoint: endpoint.name,
            path: endpoint.path,
            status: response.status,
            success: isSuccess,
            fallback: isFallback,
            critical: endpoint.critical,
            observacao
        });
        
        resultados.total++;
        if (endpoint.critical) resultados.criticos_total++;
        
        return { success: isSuccess, fallback: isFallback };
        
    } catch (error) {
        console.log(`   ❌ ERRO: ${error.message}`);
        
        resultados.detalhes.push({
            endpoint: endpoint.name,
            path: endpoint.path,
            status: 'ERROR',
            success: false,
            fallback: false,
            critical: endpoint.critical,
            observacao: error.message
        });
        
        resultados.total++;
        resultados.falha++;
        if (endpoint.critical) resultados.criticos_total++;
        
        return { success: false, fallback: false };
    }
}

async function executarTestes() {
    console.log('🚀 Iniciando bateria de testes...\n');
    
    // Testar endpoints críticos primeiro
    console.log('🎯 FASE 1: Testando endpoints críticos...');
    const criticos = endpointsParaTestar.filter(e => e.critical);
    
    for (const endpoint of criticos) {
        await testarEndpoint(endpoint);
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms entre requests
    }
    
    console.log('\n📊 FASE 2: Testando endpoints opcionais...');
    const opcionais = endpointsParaTestar.filter(e => !e.critical);
    
    for (const endpoint of opcionais) {
        await testarEndpoint(endpoint);
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms entre requests
    }
    
    // Relatório final
    console.log('\n🎯 RELATÓRIO FINAL DOS TESTES');
    console.log('============================');
    console.log(`📊 Total testado: ${resultados.total}`);
    console.log(`✅ Sucessos: ${resultados.sucesso}`);
    console.log(`❌ Falhas: ${resultados.falha}`);
    console.log(`🎯 Críticos OK: ${resultados.criticos_ok}/${resultados.criticos_total}`);
    
    const percentualSucesso = ((resultados.sucesso / resultados.total) * 100).toFixed(1);
    const percentualCriticos = ((resultados.criticos_ok / resultados.criticos_total) * 100).toFixed(1);
    
    console.log(`📈 Taxa de sucesso geral: ${percentualSucesso}%`);
    console.log(`🎯 Taxa de sucesso críticos: ${percentualCriticos}%`);
    
    // Verificar se ainda está em fallback
    const emFallback = resultados.detalhes.some(d => d.fallback);
    
    if (emFallback) {
        console.log('\n🚨 ATENÇÃO: Sistema ainda em modo fallback!');
        console.log('⏳ Deploy ainda sendo processado pelo Railway');
        console.log('🔄 Aguarde mais alguns minutos e teste novamente');
    } else if (resultados.criticos_ok === resultados.criticos_total) {
        console.log('\n🎉 SUCESSO TOTAL! Todos os endpoints críticos funcionando!');
        console.log('✅ Sistema pronto para ativação de chaves reais');
        console.log('🔗 Acesse: https://coinbitclub-market-bot-production.up.railway.app/ativar-chaves-reais');
    } else {
        console.log('\n⚠️ PARCIALMENTE FUNCIONANDO');
        console.log('🔧 Alguns endpoints críticos ainda com problemas');
        console.log('📋 Verificar logs e configurações');
    }
    
    // Endpoints que falharam
    const falhas = resultados.detalhes.filter(d => !d.success);
    if (falhas.length > 0) {
        console.log('\n❌ ENDPOINTS COM FALHA:');
        falhas.forEach(f => {
            console.log(`   • ${f.endpoint} (${f.path}): ${f.observacao}`);
        });
    }
    
    // Endpoints que funcionaram
    const sucessos = resultados.detalhes.filter(d => d.success);
    if (sucessos.length > 0) {
        console.log('\n✅ ENDPOINTS FUNCIONANDO:');
        sucessos.forEach(s => {
            console.log(`   • ${s.endpoint} (${s.path})`);
        });
    }
}

// Executar testes
executarTestes().catch(error => {
    console.error('❌ Erro fatal nos testes:', error.message);
});
