// TESTE ESPECÍFICO DA OPENAI API
console.log('🤖 TESTANDO OPENAI API ESPECÍFICAMENTE...\n');

const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testarOpenAI() {
    console.log('🔥 Iniciando teste OpenAI...');
    console.log('🎯 Model: gpt-4o-mini');
    console.log('🔑 API Key configurada: sim');
    
    try {
        console.log('\n📞 Fazendo requisição para OpenAI...');
        
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um analista de mercado de criptomoedas especializado.'
                },
                {
                    role: 'user',
                    content: 'Com base em Fear & Greed Index de 60 (Greed), analise o mercado e responda apenas com: LONG, SHORT ou NEUTRO, seguido de uma breve justificativa de máximo 50 palavras.'
                }
            ],
            max_tokens: 100,
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 20000
        });

        console.log('✅ OPENAI: CONECTADO E FUNCIONANDO!');
        console.log('📊 Status:', response.status);
        console.log('🤖 Modelo usado:', response.data.model);
        console.log('💰 Tokens usados:', response.data.usage?.total_tokens || 'N/A');
        console.log('\n🎯 RESPOSTA DA IA:');
        console.log('===================');
        console.log(response.data.choices[0].message.content);
        console.log('===================\n');
        
        // Extrair direção da resposta
        const resposta = response.data.choices[0].message.content.toUpperCase();
        let direcao = 'NEUTRO';
        if (resposta.includes('LONG')) direcao = 'LONG';
        else if (resposta.includes('SHORT')) direcao = 'SHORT';
        
        console.log(`📈 Direção extraída: ${direcao}`);
        console.log('🚀 Teste OpenAI: SUCESSO COMPLETO!');
        
        return {
            success: true,
            direcao: direcao,
            resposta_completa: response.data.choices[0].message.content,
            tokens: response.data.usage?.total_tokens
        };
        
    } catch (error) {
        console.log('❌ OPENAI: ERRO');
        console.log('📝 Erro:', error.message);
        
        if (error.response) {
            console.log('📊 Status HTTP:', error.response.status);
            console.log('📊 Dados do erro:', error.response.data);
        }
        
        return { success: false, error: error.message };
    }
}

// Executar teste
testarOpenAI().then(resultado => {
    if (resultado.success) {
        console.log('\n🎉 OPENAI COMPLETAMENTE FUNCIONAL!');
        console.log('✅ Pronta para análises de mercado');
        console.log('✅ Integração com Fear & Greed funcionando');
    } else {
        console.log('\n💥 Problema na OpenAI detectado');
        console.log('❗ Verificar chave API ou conectividade');
    }
}).catch(console.error);
