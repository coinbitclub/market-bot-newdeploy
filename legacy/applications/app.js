/**
 * 🚀 COINBITCLUB MARKETBOT - ENTERPRISE APPLICATION
 * 
 * Aplicação principal com padrões enterprise
 */

const express = require('express');
const { 
    logger, 
    config, 
    metrics, 
    ErrorHandler 
} = require('./src/core');

class EnterpriseApp {
    constructor() {
        this.app = express();
        this.server = null;
    }

    async initialize() {
        try {
            // 1. Carregar configuração
            await config.loadConfig();
            logger.info('🚀 Iniciando CoinBitClub MarketBot Enterprise');
            
            // 2. Configurar middleware básico
            this.setupMiddleware();
            
            // 3. Configurar rotas
            this.setupRoutes();
            
            // 4. Configurar tratamento de erro
            this.setupErrorHandling();
            
            // 5. Iniciar métricas
            metrics.startCollection();
            
            logger.info('✅ Aplicação enterprise inicializada com sucesso');
            
        } catch (error) {
            logger.error('❌ Erro na inicialização da aplicação', { error: error.message });
            throw error;
        }
    }

    setupMiddleware() {
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Métricas
        this.app.use(metrics.expressMiddleware());
        
        // CORS básico
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            next();
        });
        
        logger.debug('Middleware configurado');
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            const health = {
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: config.get('app.version', '3.0.0')
            };
            
            res.json(health);
        });

        // Metrics endpoint
        this.app.get('/metrics', (req, res) => {
            const metricsReport = metrics.generateReport();
            res.json(metricsReport);
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: '🚀 CoinBitClub MarketBot Enterprise',
                version: config.get('app.version', '3.0.0'),
                environment: config.get('app.environment', 'development'),
                status: 'running'
            });
        });
        
        logger.debug('Rotas básicas configuradas');
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: {
                    message: 'Endpoint não encontrado',
                    code: 'NOT_FOUND',
                    statusCode: 404
                }
            });
        });
        
        // Error handler
        this.app.use(ErrorHandler.expressErrorHandler);
        
        logger.debug('Tratamento de erro configurado');
    }

    async start() {
        await this.initialize();
        
        const port = config.get('app.port', 3005);
        
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(port, (error) => {
                if (error) {
                    logger.error('❌ Erro ao iniciar servidor', { error: error.message, port });
                    reject(error);
                    return;
                }
                
                logger.info(`🚀 Servidor enterprise rodando na porta ${port}`, {
                    port,
                    environment: config.get('app.environment'),
                    version: config.get('app.version')
                });
                
                resolve(this.server);
            });
        });
    }

    async stop() {
        if (this.server) {
            logger.info('🛑 Parando servidor enterprise...');
            
            metrics.stopCollection();
            
            return new Promise((resolve) => {
                this.server.close(() => {
                    logger.info('✅ Servidor enterprise parado');
                    resolve();
                });
            });
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const app = new EnterpriseApp();
    
    app.start().catch((error) => {
        console.error('❌ Erro fatal na inicialização:', error);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        await app.stop();
        process.exit(0);
    });
    
    process.on('SIGINT', async () => {
        await app.stop();
        process.exit(0);
    });
}

module.exports = { EnterpriseApp };
