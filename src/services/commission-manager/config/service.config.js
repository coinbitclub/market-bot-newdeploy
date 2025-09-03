/**
 * Configuração do commission-manager
 */

module.exports = {
    service: {
        name: 'commission-manager',
        description: 'Cálculo e gestão de comissões',
        dependencies: [
        "orchestrator",
        "financial-manager"
],
        priority: 4
    },
    
    // TODO: Adicionar configurações específicas
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        service: 'commission-manager'
    }
};