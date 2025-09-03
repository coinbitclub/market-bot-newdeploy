/**
 * Configuração do metrics-collector
 */

module.exports = {
    service: {
        name: 'metrics-collector',
        description: 'Coleta de métricas e KPIs',
        dependencies: [
        "orchestrator"
],
        priority: 3
    },
    
    // TODO: Adicionar configurações específicas
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        service: 'metrics-collector'
    }
};