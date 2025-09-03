// TESTE COMPLETO DE CONEXÕES EXTERNAS
console.log('🔍 TESTANDO TODAS AS CONEXÕES EXTERNAS...\n');

const axios = require('axios');
const { Pool } = require('pg');

// Configurações das APIs
const COINSTATS_API_KEY = 'ZFIxigBcVaCyXDL1Qp/Ork7TOL3+h07NM2f3YoSrMkI=';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BINANCE_API_KEY = 'process.env.API_KEY_HERE';
const BINANCE_SECRET = 'process.env.API_KEY_HERE';

// PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testarConexoes() {
    const resultados = {};

    // 1. TESTE POSTGRESQL
    console.log('1️⃣ Testando PostgreSQL...');
    try {
        const result = await pool.query('SELECT NOW() as timestamp');
        console.log('✅ PostgreSQL: CONECTADO');
        console.log(`   Timestamp: ${result.rows[0].timestamp}`);
        resultados.postgresql = '✅ CONECTADO';
    } catch (error) {
        console.log('❌ PostgreSQL: ERRO');
        console.log(`   Erro: ${error.message}`);
        resultados.postgresql = '❌ ERRO';
    }

    // 2. TESTE COINSTATS
    console.log('\n2️⃣ Testando CoinStats (Fear & Greed)...');
    try {
        const response = await axios.get('https://openapiv1.coinstats.app/insights/fear-and-greed', {
            headers: {
                'X-API-KEY': COINSTATS_API_KEY,
                'accept': 'application/json'
            },
            timeout: 10000
        });
        
        const fearGreed = response.data;
        console.log('✅ CoinStats: CONECTADO');
        
        // Extrair valor correto da estrutura: data.now.value
        const valorFGI = fearGreed.now?.value || fearGreed.value || 'N/A';
        const classificacao = fearGreed.now?.value_classification || fearGreed.classification || 'N/A';
        
        console.log(`   Fear & Greed: ${valorFGI} (${classificacao})`);
        console.log(`   Timestamp: ${fearGreed.now?.update_time || 'N/A'}`);
        console.log(`   Estrutura completa:`, JSON.stringify(fearGreed, null, 2));
        resultados.coinstats = '✅ CONECTADO';
    } catch (error) {
        console.log('❌ CoinStats: ERRO');
        console.log(`   Erro: ${error.message}`);
        console.log(`   Status: ${error.response?.status}`);
        resultados.coinstats = '❌ ERRO';
    }

    // 3. TESTE OPENAI
    console.log('\n3️⃣ Testando OpenAI...');
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: 'Responda apenas "TESTE OK" se você está funcionando.'
                }
            ],
            max_tokens: 10
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        console.log('✅ OpenAI: CONECTADO');
        console.log(`   Resposta: ${response.data.choices[0].message.content}`);
        resultados.openai = '✅ CONECTADO';
    } catch (error) {
        console.log('❌ OpenAI: ERRO');
        console.log(`   Erro: ${error.message}`);
        console.log(`   Status: ${error.response?.status}`);
        resultados.openai = '❌ ERRO';
    }

    // 4. TESTE BINANCE
    console.log('\n4️⃣ Testando Binance...');
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
            timeout: 10000
        });
        
        const top10 = response.data
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, 10)
            .map(coin => `${coin.symbol}: $${parseFloat(coin.lastPrice).toFixed(4)}`);

        console.log('✅ Binance: CONECTADO');
        console.log(`   Top 10 por volume:`);
        top10.forEach(coin => console.log(`     ${coin}`));
        resultados.binance = '✅ CONECTADO';
    } catch (error) {
        console.log('❌ Binance: ERRO');
        console.log(`   Erro: ${error.message}`);
        resultados.binance = '❌ ERRO';
    }

    // RESUMO FINAL
    console.log('\n📊 RESUMO DAS CONEXÕES:');
    console.log('========================');
    console.log(`🗄️  PostgreSQL: ${resultados.postgresql}`);
    console.log(`😱 CoinStats:   ${resultados.coinstats}`);
    console.log(`🤖 OpenAI:      ${resultados.openai}`);
    console.log(`💰 Binance:     ${resultados.binance}`);
    
    const totalConectado = Object.values(resultados).filter(r => r.includes('✅')).length;
    console.log(`\n🎯 Total: ${totalConectado}/4 conexões funcionando`);
    
    if (totalConectado === 4) {
        console.log('🚀 TODAS AS CONEXÕES EXTERNAS FUNCIONANDO!');
    } else {
        console.log('⚠️ Algumas conexões com problemas');
    }

    await pool.end();
}

testarConexoes().catch(console.error);
