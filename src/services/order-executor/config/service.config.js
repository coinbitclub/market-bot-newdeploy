/**
 * Configuração do order-executor
 */

module.exports = {
    service: {
        name: 'order-executor',
        description: 'Execução de ordens nas exchanges',
        dependencies: [
        "orchestrator",
        "order-manager"
],
        priority: 4
    },
    
    // TODO: Adicionar configurações específicas
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        service: 'order-executor'
    }
};