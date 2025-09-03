/**
 * Configuração para ambiente de staging
 */

module.exports = {
    app: {
        debug: true,
        logLevel: 'DEBUG',
        enableMetrics: true,
        enableSwagger: true
    },
    
    database: {
        ssl: true,
        logging: true,
        poolSize: 20,
        connectionTimeout: 15000
    },
    
    exchanges: {
        binance: {
            testnet: true,
            timeout: 10000
        }
    },
    
    security: {
        bcryptRounds: 10,
        sessionTimeout: 7200, // 2 horas
        maxLoginAttempts: 5
    },
    
    cache: {
        enabled: true,
        ttl: 60, // 1 minuto
        provider: 'memory'
    },
    
    monitoring: {
        interval: 30000, // 30 segundos
        enableAlerts: true
    },
    
    performance: {
        compression: false,
        enableCaching: true,
        maxMemoryMB: 1024
    }
};
