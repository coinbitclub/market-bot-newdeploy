/**
 * Configuração do fg-index-manager
 */

module.exports = {
    service: {
        name: 'fg-index-manager',
        description: 'Gestão do Fear & Greed Index',
        dependencies: [
        "orchestrator"
],
        priority: 2
    },
    
    // TODO: Adicionar configurações específicas
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        service: 'fg-index-manager'
    }
};