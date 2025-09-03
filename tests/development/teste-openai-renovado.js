// TESTE RENOVADO DA OPENAI - TENTATIVA DE RECONEXÃO
console.log('🤖 TENTANDO CONEXÃO OPENAI NOVAMENTE...\n');

const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testarOpenAIRenovado() {
    console.log('🔄 Tentativa 1: Testando conectividade básica...');
    
    try {
        // Primeiro teste: verificar se a API responde
        const testeBasico = await axios.get('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            timeout: 10000
        });
        
        console.log('✅ API OpenAI: Acessível');
        console.log('📊 Modelos disponíveis:', testeBasico.data.data.length);
        
        // Segundo teste: tentativa com modelo mais barato
        console.log('\n🔄 Tentativa 2: Testando com modelo econômico...');
        
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: 'Responda apenas: FUNCIONANDO'
                }
            ],
            max_tokens: 5,
            temperature: 0
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        console.log('✅ OPENAI: FUNCIONANDO PERFEITAMENTE!');
        console.log('🤖 Resposta:', response.data.choices[0].message.content);
        console.log('💰 Tokens usados:', response.data.usage.total_tokens);
        console.log('💵 Custo aproximado: $', (response.data.usage.total_tokens * 0.00015 / 1000).toFixed(6));
        
        return { success: true, resposta: response.data.choices[0].message.content };
        
    } catch (error) {
        console.log('❌ Erro na OpenAI:');
        console.log('📝 Mensagem:', error.message);
        
        if (error.response) {
            console.log('📊 Status HTTP:', error.response.status);
            console.log('📊 Tipo de erro:', error.response.data?.error?.type);
            console.log('📊 Código:', error.response.data?.error?.code);
            
            if (error.response.status === 429) {
                console.log('\n💡 POSSÍVEIS SOLUÇÕES:');
                console.log('   1. Aguardar reset de quota (início do mês)');
                console.log('   2. Adicionar billing à conta OpenAI');
                console.log('   3. Usar sistema sem IA temporariamente');
                console.log('   4. Trocar para outro modelo/API');
            }
        }
        
        return { success: false, error: error.message };
    }
}

// Executar teste
testarOpenAIRenovado().then(resultado => {
    if (resultado.success) {
        console.log('\n🚀 OPENAI RECONECTADA COM SUCESSO!');
        console.log('✅ Pronta para análises de mercado em tempo real');
        console.log('🔄 Sistema pode prosseguir com IA + CoinStats + Binance');
    } else {
        console.log('\n⚠️ OpenAI ainda com problemas');
        console.log('💡 Sistema funcionará apenas com CoinStats + Binance');
        console.log('📊 Direções baseadas apenas em Fear & Greed Index');
    }
}).catch(console.error);
