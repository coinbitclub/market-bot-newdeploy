// 🧪 TESTE COMPLETO DAS APIs DO DASHBOARD
const http = require('http');

async function testarAPIs() {
    console.log('🧪 TESTE COMPLETO DAS APIs DO DASHBOARD');
    console.log('======================================');
    
    const testes = [
        { nome: 'Tempo Real', url: 'http://localhost:4000/api/dashboard/realtime' },
        { nome: 'Sinais', url: 'http://localhost:4000/api/dashboard/signals' },
        { nome: 'Ordens', url: 'http://localhost:4000/api/dashboard/orders' },
        { nome: 'IA Decisões', url: 'http://localhost:4000/api/dashboard/ai-decisions' },
        { nome: 'Performance Usuários', url: 'http://localhost:4000/api/dashboard/users' },
        { nome: 'Status Sistema', url: 'http://localhost:4000/api/dashboard/system' }
    ];
    
    for (const teste of testes) {
        await new Promise(resolve => {
            console.log(`\n🔍 Testando ${teste.nome}...`);
            
            const timeout = setTimeout(() => {
                console.log(`❌ ${teste.nome}: Timeout (5s)`);
                resolve();
            }, 5000);
            
            http.get(teste.url, (res) => {
                clearTimeout(timeout);
                let data = '';
                
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.success) {
                            console.log(`✅ ${teste.nome}: OK`);
                            
                            // Mostrar alguns dados específicos
                            if (teste.nome === 'IA Decisões' && json.data && json.data.decisions) {
                                console.log(`   📊 ${json.data.decisions.length} decisões encontradas`);
                            } else if (teste.nome === 'Sinais' && json.data && json.data.signals) {
                                console.log(`   📊 ${json.data.signals.length} sinais encontrados`);
                            } else if (teste.nome === 'Performance Usuários' && json.data && json.data.userPerformance) {
                                console.log(`   📊 ${json.data.userPerformance.length} usuários encontrados`);
                            }
                        } else {
                            console.log(`❌ ${teste.nome}: ${json.error || 'Success=false'}`);
                        }
                    } catch (e) {
                        console.log(`❌ ${teste.nome}: Parse Error - ${data.substring(0,100)}...`);
                    }
                    resolve();
                });
            }).on('error', (err) => {
                clearTimeout(timeout);
                console.log(`❌ ${teste.nome}: ${err.message}`);
                resolve();
            });
        });
    }
    
    console.log('\n✅ TESTE COMPLETO FINALIZADO!');
}

testarAPIs();
