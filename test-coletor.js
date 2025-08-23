console.log('🧪 TESTE DO COLETOR DE SALDOS');

// Importar e testar o coletor
try {
    const RobustBalanceCollector = require('./coletor-saldos-robusto.js');
    console.log('✅ Módulo carregado com sucesso');
    
    const collector = new RobustBalanceCollector();
    console.log('✅ Instância criada com sucesso');
    
    // Executar uma coleta de teste
    console.log('🔄 Iniciando coleta de teste...');
    collector.collectAllBalances()
        .then(() => {
            console.log('✅ Coleta de teste completada');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro na coleta:', error);
            process.exit(1);
        });
        
} catch (error) {
    console.error('❌ Erro ao carregar módulo:', error);
    process.exit(1);
}
