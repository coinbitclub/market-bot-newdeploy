// TESTE RÁPIDO OPENAI - RESPOSTA SIMPLES
const axios = require('axios');

console.log('⚡ TESTE RÁPIDO OPENAI...');

axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Responda apenas: OK' }],
    max_tokens: 5
}, {
    headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 15000
}).then(r => {
    console.log('✅ OpenAI: FUNCIONANDO!');
    console.log('🤖 Resposta:', r.data.choices[0].message.content);
    console.log('💰 Tokens:', r.data.usage.total_tokens);
}).catch(e => {
    console.log('❌ OpenAI: ERRO');
    console.log('📝', e.message);
    if (e.response) {
        console.log('📊 Status:', e.response.status);
        console.log('📊 Erro:', e.response.data);
    }
});
