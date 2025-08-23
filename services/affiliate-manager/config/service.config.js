/**
 * Configuração do affiliate-manager
 */

module.exports = {
    service: {
        name: 'affiliate-manager',
        description: 'Sistema de afiliados',
        dependencies: [
        "orchestrator",
        "commission-manager"
],
        priority: 4
    },
    
    // TODO: Adicionar configurações específicas
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        service: 'affiliate-manager'
    }
};