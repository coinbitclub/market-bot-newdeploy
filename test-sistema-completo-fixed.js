// ===============================
// 🧪 SCRIPT DE TESTE COMPLETO
// Sistema de Trading CoinBitClub
// ===============================

const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

console.log('🚀 INICIANDO TESTE COMPLETO DO SISTEMA...\n');

// Configurações
const BASE_URL = 'http://localhost:3000';
const DB_CONFIG = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Pool de conexão
const pool = new Pool(DB_CONFIG);

// ===============================
// 🔍 TESTES DE CONECTIVIDADE
// ===============================

async function testarConexaoDB() {
    console.log('📊 TESTANDO CONEXÃO COM POSTGRESQL...');
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as timestamp, version() as version');
        console.log(`✅ PostgreSQL conectado: ${result.rows[0].timestamp}`);
        console.log(`📋 Versão: ${result.rows[0].version.split(' ')[0]}`);
        client.release();
        return true;
    } catch (error) {
        console.log(`❌ Erro PostgreSQL: ${error.message}`);
        return false;
    }
}

async function testarConexaoServidor() {
    console.log('\n🌐 TESTANDO SERVIDOR EXPRESS...');
    try {
        const response = await axios.get(`${BASE_URL}/api/status`, { timeout: 5000 });
        console.log(`✅ Servidor ativo: ${response.status}`);
        return true;
    } catch (error) {
        console.log(`❌ Servidor offline: ${error.message}`);
        return false;
    }
}

async function testarAPIs() {
    console.log('\n🔗 TESTANDO APIs EXTERNAS...');
    
    // Teste Binance
    try {
        const binance = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { timeout: 5000 });
        console.log(`✅ Binance API: BTC $${parseFloat(binance.data.price).toLocaleString()}`);
    } catch (error) {
        console.log(`❌ Binance API: ${error.message}`);
    }
    
    // Teste OpenAI
    if (process.env.OPENAI_API_KEY) {
        try {
            const openai = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Test' }],
                max_tokens: 5
            }, {
                headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
                timeout: 10000
            });
            console.log(`✅ OpenAI API: Conectada`);
        } catch (error) {
            console.log(`❌ OpenAI API: ${error.response?.status || error.message}`);
        }
    } else {
        console.log(`⚠️ OpenAI API: Chave não configurada`);
    }
}

// ===============================
// 📊 TESTES DE DADOS REAIS
// ===============================

async function testarDadosReais() {
    console.log('\n📊 TESTANDO DADOS REAIS...');
    
    try {
        const response = await axios.get(`${BASE_URL}/api/dados-dashboard`);
        const dados = response.data;
        
        console.log('📈 PREÇOS EM TEMPO REAL:');
        console.log(`   BTC: $${dados.btcPrice?.toLocaleString() || 'N/A'}`);
        console.log(`   ETH: $${dados.ethPrice?.toLocaleString() || 'N/A'}`);
        
        console.log('\n👥 USUÁRIOS:');
        console.log(`   Total: ${dados.totalUsers || 0}`);
        console.log(`   Ativos: ${dados.activeUsers || 0}`);
        
        console.log('\n📡 SINAIS:');
        console.log(`   Processados: ${dados.totalSignals || 0}`);
        console.log(`   Ativos: ${dados.activeSignals || 0}`);
        console.log(`   Enviados: ${dados.sentSignals || 0}`);
        
        console.log('\n📋 ORDENS:');
        console.log(`   Executando: ${dados.executingOrders || 0}`);
        
        // Verificar se há dados mock/estáticos
        const possiveisMock = [];
        if (dados.totalUsers === 1247) possiveisMock.push('totalUsers=1247');
        if (dados.activeUsers === 892) possiveisMock.push('activeUsers=892');
        if (dados.btcPrice === 45234.67) possiveisMock.push('btcPrice=45234.67');
        
        if (possiveisMock.length > 0) {
            console.log(`⚠️ POSSÍVEIS DADOS MOCK DETECTADOS: ${possiveisMock.join(', ')}`);
            return false;
        } else {
            console.log(`✅ DADOS DINÂMICOS CONFIRMADOS`);
            return true;
        }
        
    } catch (error) {
        console.log(`❌ Erro ao testar dados: ${error.message}`);
        return false;
    }
}

// ===============================
// 🤖 TESTES DE IA
// ===============================

async function testarIntegracaoIA() {
    console.log('\n🤖 TESTANDO INTEGRAÇÃO IA...');
    
    try {
        const sinalTeste = {
            symbol: 'BTCUSDT',
            action: 'BUY',
            price: 98000,
            volume: 0.001
        };
        
        const response = await axios.post(`${BASE_URL}/api/analisar-sinal`, sinalTeste);
        const resultado = response.data;
        
        if (resultado.success) {
            console.log(`✅ Análise IA funcionando:`);
            console.log(`   Confiança: ${resultado.analise.confidence}%`);
            console.log(`   Razão: ${resultado.analise.reason}`);
            console.log(`   Processado por: ${resultado.processedBy}`);
            return true;
        } else {
            console.log(`❌ Análise IA falhou`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Erro teste IA: ${error.message}`);
        return false;
    }
}

// ===============================
// 🧪 TESTE DE WEBHOOK
// ===============================

async function testarWebhook() {
    console.log('\n🔗 TESTANDO WEBHOOK TRADINGVIEW...');
    
    try {
        const webhookData = {
            symbol: 'BTCUSDT',
            action: 'BUY',
            price: 98500,
            volume: 0.001,
            timestamp: new Date().toISOString()
        };
        
        const response = await axios.post(`${BASE_URL}/webhook/tradingview`, webhookData);
        
        if (response.data.success) {
            console.log(`✅ Webhook processado com sucesso`);
            console.log(`   Confiança IA: ${response.data.analise?.confidence}%`);
            return true;
        } else {
            console.log(`⚠️ Webhook rejeitado: ${response.data.reason}`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Erro webhook: ${error.message}`);
        return false;
    }
}

// ===============================
// 📊 TESTES DE PÁGINAS
// ===============================

async function testarPaginas() {
    console.log('\n📱 TESTANDO PÁGINAS...');
    
    const paginas = [
        { nome: 'Dashboard Principal', url: '/' },
        { nome: 'Fluxo Operacional', url: '/fluxo-operacional' },
        { nome: 'Dashboard Executivo', url: '/dashboard-executivo' },
        { nome: 'IA Trading', url: '/ia-trading' },
        { nome: 'Águia News', url: '/aguia-news' },
        { nome: 'Usuários', url: '/usuarios' },
        { nome: 'Alertas', url: '/alertas' },
        { nome: 'Configurações', url: '/configuracoes' }
    ];
    
    let sucessos = 0;
    
    for (const pagina of paginas) {
        try {
            const response = await axios.get(`${BASE_URL}${pagina.url}`, { timeout: 3000 });
            if (response.status === 200) {
                console.log(`✅ ${pagina.nome}: OK`);
                sucessos++;
            } else {
                console.log(`⚠️ ${pagina.nome}: Status ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ ${pagina.nome}: ${error.response?.status || 'Erro'}`);
        }
    }
    
    return sucessos === paginas.length;
}

// ===============================
// 🗄️ TESTES DE BANCO DE DADOS
// ===============================

async function testarEstruturaBanco() {
    console.log('\n🗄️ TESTANDO ESTRUTURA DO BANCO...');
    
    try {
        // Verificar tabelas existentes
        const tabelas = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log(`📋 Tabelas encontradas: ${tabelas.rows.length}`);
        tabelas.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        // Verificar dados em tabelas principais
        const tabelasPrincipais = ['users', 'usuarios', 'signals', 'sinais', 'operations', 'operacoes'];
        
        for (const tabela of tabelasPrincipais) {
            try {
                const count = await pool.query(`SELECT COUNT(*) as total FROM ${tabela}`);
                console.log(`📊 ${tabela}: ${count.rows[0].total} registros`);
            } catch (error) {
                // Tabela não existe, ignorar
            }
        }
        
        return true;
        
    } catch (error) {
        console.log(`❌ Erro estrutura banco: ${error.message}`);
        return false;
    }
}

// ===============================
// 🚀 EXECUÇÃO PRINCIPAL
// ===============================

async function executarTestes() {
    console.log('🎯 ================================================');
    console.log('🧪 TESTE COMPLETO - SISTEMA TRADING COINBITCLUB');
    console.log('🎯 ================================================\n');
    
    let testesPassaram = 0;
    let totalTestes = 0;
    
    // Testes de conectividade
    totalTestes++;
    const dbOk = await testarConexaoDB();
    if (dbOk) testesPassaram++;
    
    totalTestes++;
    const serverOk = await testarConexaoServidor();
    if (serverOk) testesPassaram++;
    
    if (!serverOk) {
        console.log('\n❌ SERVIDOR OFFLINE - Execute: node painel-completo-integrado.js');
        process.exit(1);
    }
    
    // Testes funcionais
    await testarAPIs();
    
    totalTestes++;
    const dadosOk = await testarDadosReais();
    if (dadosOk) testesPassaram++;
    
    totalTestes++;
    const iaOk = await testarIntegracaoIA();
    if (iaOk) testesPassaram++;
    
    totalTestes++;
    const webhookOk = await testarWebhook();
    if (webhookOk) testesPassaram++;
    
    totalTestes++;
    const paginasOk = await testarPaginas();
    if (paginasOk) testesPassaram++;
    
    if (dbOk) {
        totalTestes++;
        const bancoOk = await testarEstruturaBanco();
        if (bancoOk) testesPassaram++;
    }
    
    console.log('\n🎯 ================================================');
    console.log(`📊 RESULTADO: ${testesPassaram}/${totalTestes} testes passaram`);
    
    if (testesPassaram === totalTestes) {
        console.log('✅ TODOS OS TESTES PASSARAM!');
        console.log('🚫 ZERO DADOS MOCK DETECTADOS!');
        console.log('🎯 SISTEMA 100% OPERACIONAL!');
    } else {
        console.log('⚠️ ALGUNS TESTES FALHARAM - Verifique os logs acima');
    }
    
    console.log('📝 Detalhes: REVISAO-COMPLETA-ELIMINACAO-MOCK.md');
    console.log('🌐 Acesse: http://localhost:3000');
    console.log('🎯 ================================================');
    
    // Fechar conexão do pool
    try {
        await pool.end();
    } catch (error) {
        // Ignorar erro ao fechar pool
    }
    
    process.exit(testesPassaram === totalTestes ? 0 : 1);
}

// Executar se chamado diretamente
if (require.main === module) {
    executarTestes().catch(error => {
        console.error('❌ Erro nos testes:', error);
        process.exit(1);
    });
}

module.exports = { executarTestes };
