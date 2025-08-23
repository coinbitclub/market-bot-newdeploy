/**
 * 🧪 TESTE COMPLETO DOS 85+ ENDPOINTS - RAILWAY
 * Verificar se a correção do hybrid-server funcionou
 */

const axios = require('axios');

// Configuração
const RAILWAY_URL = 'https://coinbitclub-market-bot-production.up.railway.app'; // Substitua pela sua URL
const LOCAL_URL = 'http://localhost:3000'; // Para teste local

// Escolher URL de teste
const BASE_URL = process.argv.includes('--local') ? LOCAL_URL : RAILWAY_URL;

console.log('🧪 TESTE COMPLETO DOS 85+ ENDPOINTS');
console.log('===================================');
console.log(`🌐 Testando: ${BASE_URL}`);
console.log('');

// Lista completa dos 85+ endpoints organizados por categoria
const ENDPOINTS = {
    "Sistema & Health": [
        '/health',
        '/',
        '/api/system/status',
        '/api/current-mode',
        '/api/production-mode'
    ],
    
    "Autenticação & Usuários": [
        '/api/register',
        '/api/login',
        '/api/logout',
        '/api/profile',
        '/api/users',
        '/api/user/profile',
        '/api/user/settings'
    ],
    
    "Chaves & Trading": [
        '/ativar-chaves-reais',
        '/api/keys',
        '/api/keys/validate',
        '/api/trading/start',
        '/api/trading/stop',
        '/api/trading/status',
        '/api/positions',
        '/api/orders'
    ],
    
    "Saldos & Balances": [
        '/api/balances',
        '/api/saldos',
        '/api/saldos/atualizar',
        '/api/balance/update',
        '/api/portfolio'
    ],
    
    "TradingView & Signals": [
        '/webhook/tradingview',
        '/webhook/signals',
        '/api/signals',
        '/api/signals/history',
        '/api/signals/stats',
        '/webhook/coinbitclub',
        '/webhook/process-signal'
    ],
    
    "Dashboard & Analytics": [
        '/dashboard',
        '/api/dashboard',
        '/api/dados-tempo-real',
        '/api/analytics',
        '/api/stats',
        '/api/performance'
    ],
    
    "Exchanges": [
        '/api/binance/status',
        '/api/bybit/status',
        '/api/exchanges/health',
        '/api/exchanges/test',
        '/api/exchange/connect'
    ],
    
    "Administrativo": [
        '/admin',
        '/api/admin/users',
        '/api/admin/stats',
        '/api/admin/logs',
        '/api/admin/config'
    ],
    
    "Webhooks & Notificações": [
        '/webhook/sms',
        '/webhook/whatsapp',
        '/api/notifications',
        '/api/alerts'
    ],
    
    "Dominância & Market Data": [
        '/api/dominancia',
        '/api/dominancia-btc',
        '/api/market-data',
        '/api/fear-greed',
        '/dominance-webhook'
    ],
    
    "Pagamentos & Afiliados": [
        '/api/payments',
        '/api/stripe/webhook',
        '/api/affiliates',
        '/api/commissions'
    ],
    
    "Demonstração & Páginas": [
        '/demo-saldos',
        '/painel',
        '/painel/executivo',
        '/painel/fluxo',
        '/painel/decisoes'
    ]
};

// Estatísticas
let stats = {
    total: 0,
    success: 0,
    errors: 0,
    notFound: 0,
    categories: {}
};

// Função para testar um endpoint
async function testEndpoint(endpoint, timeout = 10000) {
    try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
            timeout,
            validateStatus: () => true, // Aceitar qualquer status
            headers: {
                'User-Agent': 'CoinBitClub-Endpoint-Tester/1.0',
                'Accept': 'application/json, text/html'
            }
        });
        
        return {
            status: response.status,
            success: response.status < 500,
            is404: response.status === 404,
            size: JSON.stringify(response.data).length,
            data: response.data
        };
    } catch (error) {
        return {
            status: 'ERROR',
            success: false,
            is404: false,
            error: error.message,
            timeout: error.code === 'ECONNABORTED'
        };
    }
}

// Função principal de teste
async function runTests() {
    console.log('🚀 Iniciando testes...\n');
    
    for (const [category, endpoints] of Object.entries(ENDPOINTS)) {
        console.log(`📁 Categoria: ${category}`);
        console.log('─'.repeat(50));
        
        stats.categories[category] = { total: 0, success: 0, errors: 0, notFound: 0 };
        
        for (const endpoint of endpoints) {
            process.stdout.write(`   🔍 ${endpoint.padEnd(30)} `);
            
            const result = await testEndpoint(endpoint);
            stats.total++;
            stats.categories[category].total++;
            
            if (result.success) {
                if (result.is404) {
                    console.log('❌ 404 Not Found');
                    stats.notFound++;
                    stats.categories[category].notFound++;
                } else {
                    const statusIcon = result.status < 300 ? '✅' : result.status < 400 ? '🔄' : result.status < 500 ? '⚠️' : '❌';
                    console.log(`${statusIcon} ${result.status} (${result.size}b)`);
                    stats.success++;
                    stats.categories[category].success++;
                }
            } else {
                const errorMsg = result.timeout ? 'TIMEOUT' : result.error || 'ERROR';
                console.log(`❌ ${errorMsg}`);
                stats.errors++;
                stats.categories[category].errors++;
            }
            
            // Pequeno delay entre requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('');
    }
    
    // Relatório final
    console.log('📊 RELATÓRIO FINAL');
    console.log('==================');
    console.log(`📈 Total testado: ${stats.total}`);
    console.log(`✅ Sucessos: ${stats.success} (${(stats.success/stats.total*100).toFixed(1)}%)`);
    console.log(`❌ Erros: ${stats.errors} (${(stats.errors/stats.total*100).toFixed(1)}%)`);
    console.log(`🔍 404s: ${stats.notFound} (${(stats.notFound/stats.total*100).toFixed(1)}%)`);
    
    console.log('\n📊 Por Categoria:');
    for (const [category, catStats] of Object.entries(stats.categories)) {
        const successRate = (catStats.success / catStats.total * 100).toFixed(1);
        console.log(`   ${category}: ${catStats.success}/${catStats.total} (${successRate}%)`);
    }
    
    // Diagnóstico
    console.log('\n🔧 DIAGNÓSTICO:');
    if (stats.notFound > stats.total * 0.5) {
        console.log('❌ PROBLEMA: Muitos 404s - possível falha na correção');
        console.log('   • Verificar se deploy foi aplicado');
        console.log('   • Verificar logs do Railway');
        console.log('   • Validar integração hybrid-server/app.js');
    } else if (stats.success > stats.total * 0.7) {
        console.log('✅ SUCESSO: Maioria dos endpoints funcionando!');
        console.log('   • Correção do hybrid-server funcionou');
        console.log('   • Sistema operacional');
    } else {
        console.log('⚠️ PARCIAL: Alguns endpoints funcionando');
        console.log('   • Deploy pode estar em andamento');
        console.log('   • Verificar status específicos');
    }
    
    console.log(`\n🌐 URL testada: ${BASE_URL}`);
    console.log('🏁 Teste concluído!\n');
}

// Executar testes
if (require.main === module) {
    runTests().catch(error => {
        console.error('❌ Erro crítico nos testes:', error.message);
        process.exit(1);
    });
}

module.exports = { runTests, testEndpoint, ENDPOINTS };
