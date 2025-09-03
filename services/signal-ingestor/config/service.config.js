/**
 * Configuração do signal-ingestor
 */

module.exports = {
    service: {
        name: 'signal-ingestor',
        description: 'Recebimento e validação de sinais via webhook',
        dependencies: [
        "orchestrator"
],
        priority: 2
    },
    
    // TODO: Adicionar configurações específicas
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        service: 'signal-ingestor'
    }
};