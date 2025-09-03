/**
 * Configuração do user-config-manager
 */

module.exports = {
    service: {
        name: 'user-config-manager',
        description: 'Gestão de configurações de usuários',
        dependencies: [
        "orchestrator"
],
        priority: 2
    },
    
    // TODO: Adicionar configurações específicas
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        service: 'user-config-manager'
    }
};