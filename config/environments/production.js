/**
 * Configuração para ambiente de produção
 */

module.exports = {
    app: {
        debug: false,
        logLevel: 'INFO',
        enableMetrics: true,
        enableSwagger: false
    },
    
    database: {
        ssl: true,
        logging: false,
        poolSize: 50,
        connectionTimeout: 30000,
        acquireTimeout: 60000,
        timeout: 60000,
        retryAttempts: 3
    },
    
    exchanges: {
        binance: {
            testnet: false,
            timeout: 15000,
            recvWindow: 5000
        }
    },
    
    security: {
        bcryptRounds: 14,
        sessionTimeout: 3600, // 1 hora
        maxLoginAttempts: 3,
        lockoutTime: 900000, // 15 minutos
        enableCors: true,
        enableHelmet: true
    },
    
    cache: {
        enabled: true,
        ttl: 300, // 5 minutos
        provider: 'redis'
    },
    
    monitoring: {
        interval: 60000, // 1 minuto
        enableAlerts: true,
        alertThreshold: 0.90
    },
    
    performance: {
        compression: true,
        enableCaching: true,
        maxMemoryMB: 2048
    }
};
