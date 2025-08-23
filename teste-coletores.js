// TESTE DIRETO DOS COLETORES
console.log('🔍 TESTE PROFISSIONAL - COLETORES ISOLADOS');

try {
    console.log('1. Testando RobustBalanceCollector...');
    const RobustBalanceCollector = require('./coletor-saldos-robusto.js');
    console.log('✅ Módulo carregado');
    
    console.log('2. Criando instância...');
    const collector = new RobustBalanceCollector();
    console.log('✅ Instância criada');
    
    console.log('3. Verificando métodos...');
    console.log('   • start:', typeof collector.start);
    console.log('   • stop:', typeof collector.stop);
    console.log('   • collectAllBalances:', typeof collector.collectAllBalances);
    
    if (typeof collector.start === 'function') {
        console.log('4. ✅ SUCESSO - RobustBalanceCollector tem método start()');
    } else {
        console.log('4. ❌ ERRO - Método start() não encontrado');
        console.log('Protótipo:', Object.getOwnPropertyNames(Object.getPrototypeOf(collector)));
    }
    
} catch (error) {
    console.error('❌ ERRO no RobustBalanceCollector:', error.message);
    console.error('Stack:', error.stack);
}

try {
    console.log('\n5. Testando FearGreedCollector...');
    const FearGreedCollector = require('./coletor-fear-greed-coinstats.js');
    console.log('✅ Módulo carregado');
    
    console.log('6. Criando instância...');
    const collector = new FearGreedCollector();
    console.log('✅ Instância criada');
    
    console.log('7. Verificando métodos...');
    console.log('   • collectFearGreedData:', typeof collector.collectFearGreedData);
    
    if (typeof collector.collectFearGreedData === 'function') {
        console.log('8. ✅ SUCESSO - FearGreedCollector tem método collectFearGreedData()');
    } else {
        console.log('8. ❌ ERRO - Método collectFearGreedData() não encontrado');
        console.log('Protótipo:', Object.getOwnPropertyNames(Object.getPrototypeOf(collector)));
    }
    
} catch (error) {
    console.error('❌ ERRO no FearGreedCollector:', error.message);
    console.error('Stack:', error.stack);
}

console.log('\n🎯 TESTE CONCLUÍDO');
