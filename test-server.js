/**
 * TESTE PROFISSIONAL DO SERVIDOR COMPLETO
 * Execução direta para debug em tempo real
 */

console.log('🚀 TESTE PROFISSIONAL - SERVIDOR COMPLETO');
console.log('==========================================');

try {
    // Carregar o servidor principal
    const CoinBitClubServer = require('./app.js');
    
    console.log('✅ Servidor carregado com sucesso');
    
    // Criar instância
    const server = new CoinBitClubServer();
    console.log('✅ Instância criada');
    
    // Verificar se coletores foram criados
    console.log('🔍 Verificando coletores:');
    console.log('   • balanceCollector:', typeof server.balanceCollector);
    console.log('   • fearGreedCollector:', typeof server.fearGreedCollector);
    
    // Iniciar servidor
    console.log('🚀 Iniciando servidor...');
    server.start();
    
} catch (error) {
    console.error('💥 ERRO CRÍTICO:', error);
    console.error('Stack:', error.stack);
}
