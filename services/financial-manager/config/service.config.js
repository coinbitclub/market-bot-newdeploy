/**
 * Configuração do financial-manager
 */

module.exports = {
    service: {
        name: 'financial-manager',
        description: 'Sistema financeiro e Stripe',
        dependencies: [
        "orchestrator"
],
        priority: 3
    },
    
    // TODO: Adicionar configurações específicas
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        service: 'financial-manager'
    }
};