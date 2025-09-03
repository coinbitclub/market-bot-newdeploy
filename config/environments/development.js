/**
 * Configuração para ambiente de desenvolvimento
 */

module.exports = {
    app: {
        debug: true,
        logLevel: 'DEBUG'
    },
    
    database: {
        logging: true,
        ssl: false
    },
    
    exchanges: {
        binance: {
            testnet: true
        }
    },
    
    monitoring: {
        interval: 10000 // 10 segundos em dev
    }
};
