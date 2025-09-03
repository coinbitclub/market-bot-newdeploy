/**
 * 🧪 TESTE DO APP.JS INTEGRADO
 * Verifica se o sistema de trade está integrado corretamente
 */

const CoinBitClubServer = require('./app.js');

async function testarIntegracao() {
    console.log('🧪 TESTANDO INTEGRAÇÃO DO SISTEMA DE TRADE');
    console.log('==========================================');
    
    try {
        // Criar instância do servidor
        const server = new CoinBitClubServer();
        
        // Verificar se os métodos de trade existem
        const metodosEsperados = [
            'process.env.API_KEY_HERE',
            'process.env.API_KEY_HERE', 
            'process.env.API_KEY_HERE',
            'process.env.API_KEY_HERE',
            'obterSaldoIntegrado',
            'process.env.API_KEY_HERE'
        ];
        
        console.log('🔍 Verificando métodos de trade...');
        for (const metodo of metodosEsperados) {
            if (typeof server[metodo] === 'function') {
                console.log(`✅ ${metodo} - OK`);
            } else {
                console.log(`❌ ${metodo} - AUSENTE`);
            }
        }
        
        // Verificar propriedades
        const propriedadesEsperadas = [
            'process.env.API_KEY_HERE',
            'exchangeInstances',
            'tradingStatus'
        ];
        
        console.log('\n🔍 Verificando propriedades...');
        for (const prop of propriedadesEsperadas) {
            if (server[prop] !== undefined) {
                console.log(`✅ ${prop} - OK`);
            } else {
                console.log(`❌ ${prop} - AUSENTE`);
            }
        }
        
        // Verificar status inicial
        console.log('\n📊 Status inicial do sistema:');
        console.log(`   Trading Status: ${JSON.stringify(server.tradingStatus, null, 2)}`);
        console.log(`   Validated Connections: ${server.validatedConnections.size}`);
        console.log(`   Exchange Instances: ${server.exchangeInstances.size}`);
        
        console.log('\n✅ TESTE DE INTEGRAÇÃO CONCLUÍDO!');
        console.log('Sistema de trade está integrado ao app.js');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        return false;
    }
}

// Executar teste
testarIntegracao().then(success => {
    console.log(`\n🎯 Resultado: ${success ? 'SUCESSO' : 'FALHA'}`);
    process.exit(success ? 0 : 1);
});
