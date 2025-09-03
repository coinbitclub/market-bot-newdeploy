const https = require('https');
const http = require('http');

async function testarSinalCompleto() {
    try {
        console.log('🚀 TESTE DE SINAL COMPLETO...\n');

        const sinalTeste = {
            signal: 'BUY_FORTE',
            ticker: 'BTCUSDT',
            source: 'TESTE_FORTE',
            timestamp: new Date().toISOString()
        };

        console.log('📤 Enviando sinal:', sinalTeste);

        const postData = JSON.stringify(sinalTeste);
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/webhook',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('\n📥 RESPOSTA DO SISTEMA:');
                console.log('Status:', res.statusCode);
                console.log('Resposta:', data);
                
                if (res.statusCode === 200) {
                    console.log('\n✅ SINAL PROCESSADO COM SUCESSO!');
                } else {
                    console.log('\n❌ ERRO NO PROCESSAMENTO');
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Erro na requisição:', error.message);
        });

        req.write(postData);
        req.end();

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

setTimeout(testarSinalCompleto, 3000); // Espera 3 segundos para o sistema inicializar
