/**
 * 🔍 TESTE COMPLETO DE INTEGRAÇÃO - DASHBOARD X BANCO
 * 
 * Verifica se o dashboard está realmente integrado com dados reais do banco
 */

const { Pool } = require('pg');
const axios = require('axios');
const { CONFIG, validateConfig } = require('./config');

// Validar configurações
validateConfig();

// Configuração do banco usando configurações centralizadas
const pool = new Pool({
    connectionString: CONFIG.DATABASE.URL,
    ssl: CONFIG.DATABASE.SSL
});

async function testeIntegracao() {
    console.log('🔍 TESTE COMPLETO DE INTEGRAÇÃO - DASHBOARD X BANCO');
    console.log('='.repeat(70));
    
    try {
        // 1. VERIFICAR DADOS NO BANCO
        console.log('\n1️⃣ VERIFICANDO DADOS REAIS NO BANCO...');
        console.log('-'.repeat(50));
        
        const dadosBanco = await pool.query(`
            SELECT 
                id, cycle_number, fear_greed_value, fear_greed_classification,
                btc_dominance, btc_price, market_direction, confidence_level,
                reasoning, final_recommendation, created_at, metadata
            FROM sistema_leitura_mercado 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        
        if (dadosBanco.rows.length === 0) {
            console.log('❌ PROBLEMA: Nenhum dado encontrado no banco!');
            console.log('💡 SOLUÇÃO: Execute primeiro: node teste-completo-sistema.js');
            return;
        }
        
        const registro = dadosBanco.rows[0];
        console.log('✅ Dados encontrados no banco:');
        console.log(`   📊 Fear & Greed: ${registro.fear_greed_value} (${registro.fear_greed_classification})`);
        console.log(`   ₿ Bitcoin: $${parseFloat(registro.btc_price).toFixed(2)}`);
        console.log(`   📈 BTC Dominance: ${parseFloat(registro.btc_dominance).toFixed(2)}%`);
        console.log(`   🎯 Direção: ${registro.market_direction}`);
        console.log(`   📅 Data: ${new Date(registro.created_at).toLocaleString()}`);
        
        // 2. TESTAR API SEM SERVIDOR (SIMULAÇÃO)
        console.log('\n2️⃣ CRIANDO API MOCK PARA TESTE...');
        console.log('-'.repeat(50));
        
        const apiResponse = {
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
            lastUpdate: registro.created_at,
            data: {
                fearGreed: {
                    value: registro.fear_greed_value,
                    classification: registro.fear_greed_classification,
                    source: 'Banco PostgreSQL'
                },
                bitcoin: {
                    price: parseFloat(registro.btc_price),
                    dominance: parseFloat(registro.btc_dominance),
                    change24h: 0
                },
                analysis: {
                    direction: registro.market_direction,
                    confidence: parseFloat(registro.confidence_level),
                    recommendation: registro.final_recommendation,
                    reasoning: registro.reasoning
                },
                meta: {
                    cycleNumber: registro.cycle_number,
                    recordId: registro.id,
                    isTest: false,
                    dataSource: 'REAL_DATABASE'
                }
            }
        };
        
        console.log('✅ API Response criada com dados reais:');
        console.log(JSON.stringify(apiResponse, null, 2));
        
        // 3. VERIFICAR SE SERVIDOR ESTÁ RODANDO
        console.log('\n3️⃣ VERIFICANDO SERVIDOR DO DASHBOARD...');
        console.log('-'.repeat(50));
        
        try {
            const response = await axios.get(`http://localhost:${CONFIG.SERVER.PORT}/api/status`, { timeout: 3000 });
            console.log('✅ Servidor rodando:', response.data);
        } catch (error) {
            console.log(`❌ Servidor não está rodando na porta ${CONFIG.SERVER.PORT}`);
            console.log('💡 SOLUÇÃO: Execute: node sistema-integrado.js');
        }
        
        // 4. VERIFICAR SE DASHBOARD CARREGA DADOS REAIS
        console.log('\n4️⃣ TESTANDO ENDPOINT DE DADOS...');
        console.log('-'.repeat(50));
        
        try {
            const response = await axios.get(`http://localhost:${CONFIG.SERVER.PORT}/api/sistema-leitura-mercado`, { timeout: 5000 });
            const dados = response.data;
            
            if (dados.status === 'SUCCESS' && dados.data) {
                console.log('✅ API retorna dados reais:');
                console.log(`   📊 Fear & Greed: ${dados.data.fearGreed.value}`);
                console.log(`   ₿ Bitcoin: $${dados.data.bitcoin.price}`);
                console.log(`   📈 BTC Dominance: ${dados.data.bitcoin.dominance}%`);
                console.log(`   🎯 Direção: ${dados.data.analysis.direction}`);
                console.log(`   📅 Última atualização: ${dados.lastUpdate}`);
                
                // Verificar se são dados mock ou reais
                if (dados.data.meta.dataSource === 'REAL_DATABASE') {
                    console.log('✅ DADOS SÃO REAIS DO BANCO!');
                } else {
                    console.log('⚠️ ATENÇÃO: Dados podem ser mock/simulados');
                }
                
            } else if (dados.status === 'NO_DATA') {
                console.log('⚠️ API funcionando mas sem dados');
                console.log('💡 Execute o sistema para gerar dados reais');
            }
            
        } catch (error) {
            console.log('❌ Erro ao acessar API:', error.message);
        }
        
        // 5. RESUMO E DIAGNÓSTICO
        console.log('\n5️⃣ DIAGNÓSTICO FINAL...');
        console.log('='.repeat(50));
        
        const hasDadosBanco = dadosBanco.rows.length > 0;
        const temIdadeRecente = hasDadosBanco && 
            (new Date() - new Date(registro.created_at)) < 24 * 60 * 60 * 1000; // 24h
        
        console.log(`📊 Dados no banco: ${hasDadosBanco ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`⏰ Dados recentes: ${temIdadeRecente ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`🌐 Servidor dashboard: Verificação manual necessária`);
        
        if (hasDadosBanco && temIdadeRecente) {
            console.log('\n🎉 SISTEMA ESTÁ PRONTO PARA INTEGRAÇÃO REAL!');
            console.log('🚀 PRÓXIMOS PASSOS:');
            console.log('   1. node sistema-integrado.js (sistema completo)');
            console.log(`   2. Abrir http://localhost:${CONFIG.SERVER.PORT}`);
            console.log('   3. Verificar se dados aparecem no dashboard');
        } else {
            console.log('\n⚠️ AÇÃO NECESSÁRIA:');
            if (!hasDadosBanco) {
                console.log('   1. node teste-completo-sistema.js (gerar dados)');
            }
            if (!temIdadeRecente) {
                console.log('   2. node sistema-leitura-mercado-enterprise.js (atualizar dados)');
            }
            console.log('   3. node sistema-integrado.js (iniciar sistema completo)');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    } finally {
        await pool.end();
    }
}

testeIntegracao();
