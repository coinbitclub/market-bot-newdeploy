// TESTE DIRETO DE CARREGAMENTO DO SERVIDOR
console.log('🔍 TESTE PROFISSIONAL - CARREGAMENTO DIRETO');

try {
    console.log('1. Testando require do app.js...');
    const Server = require('./app.js');
    console.log('✅ app.js carregado com sucesso');
    
    console.log('2. Verificando se é uma classe...');
    console.log('   Tipo:', typeof Server);
    console.log('   É função:', typeof Server === 'function');
    
    if (typeof Server === 'function') {
        console.log('3. Tentando criar instância...');
        const server = new Server();
        console.log('✅ Instância criada com sucesso');
        
        console.log('4. Verificando propriedades importantes...');
        console.log('   • app:', typeof server.app);
        console.log('   • port:', server.port);
        console.log('   • balanceCollector:', typeof server.balanceCollector);
        console.log('   • fearGreedCollector:', typeof server.fearGreedCollector);
        console.log('   • start:', typeof server.start);
        
        if (typeof server.start === 'function') {
            console.log('5. ✅ Método start disponível');
            console.log('🎯 PRONTO PARA EXECUÇÃO PROFISSIONAL!');
        } else {
            console.log('5. ❌ Método start não disponível');
        }
    }
    
} catch (error) {
    console.error('❌ ERRO NO CARREGAMENTO:', error.message);
    console.error('📋 Stack completo:', error.stack);
}
