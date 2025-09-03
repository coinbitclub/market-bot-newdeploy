/**
 * 🧪 TESTE DO COINBITCLUB ENTERPRISE v6.0.0
 * Validar inicialização e funcionamento
 */

const CoinBitClubEnterprise = require('./coinbitclub-enterprise-complete');

async function testarEnterprise() {
    console.log('🧪 TESTANDO COINBITCLUB ENTERPRISE v6.0.0...\n');
    
    try {
        // 1. Criar instância
        const enterprise = new CoinBitClubEnterprise();
        console.log('✅ Instância criada');
        
        // 2. Verificar status inicial
        const statusInicial = enterprise.getStatus();
        console.log('📊 Status inicial:', statusInicial);
        
        // 3. Inicializar sistema
        console.log('\n🚀 Inicializando sistema...');
        const resultado = await enterprise.inicializar();
        
        if (resultado.success) {
            console.log('\n✅ ENTERPRISE v6.0.0 INICIALIZADO COM SUCESSO!');
            console.log('📊 Detalhes:', resultado);
            
            // 4. Testar obtenção de dados
            console.log('\n📊 Testando obtenção de dados...');
            const dados = await enterprise.obterUltimosDados();
            console.log('📊 Dados obtidos:', dados.success ? '✅ Sucesso' : '❌ Falha');
            
            if (dados.success) {
                console.log('💾 Dados do banco:', {
                    btc_price: dados.data.btc_price,
                    fear_greed: dados.data.fear_greed_value,
                    market_direction: dados.data.market_direction
                });
            }
            
            // 5. Parar sistema após teste
            setTimeout(async () => {
                console.log('\n🛑 Parando sistema de teste...');
                await enterprise.parar();
                console.log('✅ Teste concluído com sucesso!');
                process.exit(0);
            }, 10000); // 10 segundos
            
        } else {
            console.log('❌ FALHA NA INICIALIZAÇÃO:', resultado.error);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ ERRO NO TESTE:', error.message);
        process.exit(1);
    }
}

testarEnterprise();
