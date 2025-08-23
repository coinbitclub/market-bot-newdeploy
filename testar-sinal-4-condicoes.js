#!/usr/bin/env node

console.log('🧪 TESTE DE SINAL COM 4 CONDIÇÕES');
console.log('=================================');

const axios = require('axios');

async function testarSinal() {
    try {
        console.log('\n📡 ENVIANDO SINAL DE TESTE:');
        console.log('===========================');
        
        const sinalTeste = {
            signal: "COMPRA LONGA BTCUSDT FORTE",
            ticker: "BTCUSDT",
            source: "TESTE_4_CONDICOES",
            timestamp: new Date().toISOString(),
            confidence: 0.75
        };
        
        console.log('Enviando sinal:', sinalTeste);
        
        const response = await axios.post('http://localhost:3000/webhook', sinalTeste, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        console.log('\n✅ RESPOSTA DO SERVIDOR:');
        console.log('========================');
        console.log('Status:', response.status);
        console.log('Dados:', JSON.stringify(response.data, null, 2));
        
        // Aguardar processamento
        console.log('\n⏳ Aguardando processamento (5 segundos)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verificar dados detalhados
        console.log('\n📊 VERIFICANDO ANÁLISE DETALHADA:');
        console.log('=================================');
        
        const detalhesResponse = await axios.get('http://localhost:3000/api/signals/detailed');
        
        if (detalhesResponse.data.success && detalhesResponse.data.signals.length > 0) {
            const ultimoSinal = detalhesResponse.data.signals[0];
            
            console.log('🔍 ANÁLISE DAS 4 CONDIÇÕES:');
            console.log(`   Sinal: ${ultimoSinal.signal_type} (${ultimoSinal.ticker})`);
            console.log(`   1️⃣ Market Direction: ${ultimoSinal.condition_1_market_direction ? '✅' : '❌'}`);
            console.log(`      ${ultimoSinal.condition_1_details}`);
            console.log(`   2️⃣ TOP 100 Alinhado: ${ultimoSinal.condition_2_top100_aligned ? '✅' : '❌'}`);
            console.log(`      ${ultimoSinal.condition_2_details}`);
            console.log(`   3️⃣ Confiança: ${ultimoSinal.condition_3_confidence_adequate ? '✅' : '❌'}`);
            console.log(`      ${ultimoSinal.condition_3_details}`);
            console.log(`   4️⃣ Histórico: ${ultimoSinal.condition_4_history_favorable ? '✅' : '❌'}`);
            console.log(`      ${ultimoSinal.condition_4_details}`);
            console.log(`   📊 Total: ${ultimoSinal.total_favorable_conditions}/4 condições`);
            console.log(`   🤖 Decisão IA: ${ultimoSinal.ai_decision ? '✅ APROVADO' : '❌ REJEITADO'}`);
            console.log(`   💬 Motivo: ${ultimoSinal.ai_reason}`);
            console.log(`   📈 Market Direction: ${ultimoSinal.market_direction}`);
            console.log(`   📊 TOP 100: ${ultimoSinal.top100_percentage}%`);
            console.log(`   🎯 Confiança: ${ultimoSinal.confidence_score}`);
        } else {
            console.log('❌ Nenhum sinal encontrado na análise detalhada');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        if (error.response) {
            console.error('Resposta do servidor:', error.response.data);
        }
    }
}

testarSinal().catch(console.error);
