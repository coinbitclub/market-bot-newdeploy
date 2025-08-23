/**
 * Configuração do order-manager
 */

module.exports = {
    service: {
        name: 'order-manager',
        description: 'Gestão de ordens de trading',
        dependencies: [
        "orchestrator",
        "fg-index-manager"
],
        priority: 3
    },
    
    // TODO: Adicionar configurações específicas
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        service: 'order-manager'
    }
};