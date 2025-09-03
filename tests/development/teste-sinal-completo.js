const fetch = require('node-fetch');

async function testarSinalCompleto() {
    try {
        console.log('🚀 TESTE DE SINAL COMPLETO...\n');

        const sinalTeste = {
            signal: 'BUY',
            ticker: 'BTCUSDT',
            source: 'TESTE_FINAL',
            timestamp: new Date().toISOString()
        };

        console.log('📤 Enviando sinal:', sinalTeste);

        const response = await fetch('http://localhost:3000/webhook/signal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sinalTeste)
        });

        const resultado = await response.text();
        
        console.log('\n📥 RESPOSTA DO SISTEMA:');
        console.log('Status:', response.status);
        console.log('Resposta:', resultado);

        if (response.status === 200) {
            console.log('\n✅ SINAL PROCESSADO COM SUCESSO!');
        } else {
            console.log('\n❌ ERRO NO PROCESSAMENTO');
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

setTimeout(testarSinalCompleto, 2000); // Espera 2 segundos para o sistema inicializar
