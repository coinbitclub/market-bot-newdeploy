/**
 * 🚀 COINBITCLUB MARKETBOT - ENTERPRISE APP WITH PHASE 4 FEATURES
 * 
 * Aplicação enterprise completa com todas as funcionalidades da Fase 4
 */

const express = require('express');
const { 
    logger, 
    config, 
    metrics, 
    featureFlags,
    secretsManager,
    securityConfig,
    advancedMonitoring,
    ErrorHandler 
} = require('./src/core');

class EnterpriseAppPhase4 {
    constructor() {
        this.app = express();
        this.server = null;
    }

    async initialize() {
        try {
            // 1. Carregar configuração
            await config.loadConfig();
            
            // 2. Validar secrets obrigatórios
            secretsManager.validateRequiredSecrets();
            
            logger.info('🚀 Iniciando CoinBitClub MarketBot Enterprise Phase 4');
            
            // 3. Configurar middleware de segurança
            this.setupSecurityMiddleware();
            
            // 4. Configurar middleware básico
            this.setupBasicMiddleware();
            
            // 5. Configurar rotas
            this.setupRoutes();
            
            // 6. Configurar tratamento de erro
            this.setupErrorHandling();
            
            // 7. Iniciar sistemas de monitoramento
            this.startMonitoringSystems();
            
            logger.info('✅ Aplicação enterprise Phase 4 inicializada com sucesso');
            
        } catch (error) {
            logger.error('❌ Erro na inicialização da aplicação Phase 4', { error: error.message });
            throw error;
        }
    }

    setupSecurityMiddleware() {
        // Helmet para segurança
        this.app.use(securityConfig.getHelmetConfig());
        
        // CORS
        this.app.use(securityConfig.getCorsConfig());
        
        // Rate limiting geral
        this.app.use(securityConfig.getRateLimiter('general'));
        
        // Validação de IP
        this.app.use(securityConfig.ipValidationMiddleware());
        
        logger.debug('Security middleware configurado');
    }

    setupBasicMiddleware() {
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Métricas
        this.app.use(metrics.expressMiddleware());
        
        // Feature flags
        this.app.use(featureFlags.middleware());
        
        logger.debug('Basic middleware configurado');
    }

    setupRoutes() {
        // Health check avançado
        this.app.get('/health', (req, res) => {
            const healthStatus = advancedMonitoring.getHealthStatus();
            const systemMetrics = metrics.getMetricsSummary();
            
            const health = {
                status: healthStatus.status,
                timestamp: new Date().toISOString(),
                uptime: systemMetrics.uptime,
                memory: process.memoryUsage(),
                version: config.get('app.version', '4.0.0'),
                monitoring: healthStatus,
                features: req.featureFlags.getAll()
            };
            
            const statusCode = healthStatus.status === 'critical' ? 503 : 200;
            res.status(statusCode).json(health);
        });

        // Metrics endpoint
        this.app.get('/metrics', (req, res) => {
            const metricsReport = metrics.generateReport();
            res.json(metricsReport);
        });

        // Feature flags endpoint
        this.app.get('/features', (req, res) => {
            res.json(req.featureFlags.getAll());
        });

        // Security status endpoint
        this.app.get('/security-status', securityConfig.jwtAuthMiddleware(), (req, res) => {
            const securityStatus = {
                timestamp: new Date().toISOString(),
                rateLimits: {
                    general: 'Active',
                    auth: 'Active',
                    trading: 'Active',
                    data: 'Active'
                },
                corsEnabled: true,
                helmetEnabled: true,
                ipValidation: true,
                secretsValidated: true
            };
            
            res.json(securityStatus);
        });

        // Alerts endpoint
        this.app.get('/alerts', (req, res) => {
            const alerts = {
                active: advancedMonitoring.getActiveAlerts(),
                all: advancedMonitoring.getAllAlerts()
            };
            res.json(alerts);
        });

        // Config endpoint (apenas desenvolvimento)
        if (config.get('app.environment') === 'development') {
            this.app.get('/config', (req, res) => {
                const safeConfig = { ...config.getAll() };
                // Remover informações sensíveis
                delete safeConfig.database;
                delete safeConfig.security;
                
                res.json(safeConfig);
            });
        }

        // Trading endpoints com feature flags
        this.app.post('/api/trading/order', 
            securityConfig.getRateLimiter('trading'),
            (req, res, next) => {
                if (!req.featureFlags.isEnabled('enable-real-trading')) {
                    return res.status(403).json({
                        error: 'Trading real não habilitado',
                        code: 'FEATURE_DISABLED'
                    });
                }
                next();
            },
            (req, res) => {
                res.json({ message: 'Trading endpoint - feature flag ativo!' });
            }
        );

        // Login endpoint com rate limiting específico
        this.app.post('/api/auth/login',
            securityConfig.getRateLimiter('auth'),
            (req, res) => {
                res.json({ message: 'Login endpoint com rate limiting!' });
            }
        );

        // Data endpoints
        this.app.get('/api/data/:symbol',
            securityConfig.getRateLimiter('data'),
            (req, res) => {
                res.json({ 
                    symbol: req.params.symbol,
                    data: 'Sample market data',
                    timestamp: new Date().toISOString()
                });
            }
        );

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: '🚀 CoinBitClub MarketBot Enterprise Phase 4',
                version: config.get('app.version', '4.0.0'),
                environment: config.get('app.environment', 'development'),
                status: 'running',
                features: {
                    security: 'Enabled',
                    monitoring: 'Active',
                    featureFlags: 'Active',
                    secrets: 'Protected'
                }
            });
        });
        
        logger.debug('Rotas Phase 4 configuradas');
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

    startMonitoringSystems() {
        // Iniciar métricas
        metrics.startCollection();
        
        // Iniciar monitoramento avançado
        advancedMonitoring.startAdvancedMonitoring();
        
        logger.info('Sistemas de monitoramento iniciados');
    }

    async start() {
        await this.initialize();
        
        const port = config.get('app.port', 3005);
        
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(port, (error) => {
                if (error) {
                    logger.error('❌ Erro ao iniciar servidor Phase 4', { error: error.message, port });
                    reject(error);
                    return;
                }
                
                logger.info(`🚀 Servidor enterprise Phase 4 rodando na porta ${port}`, {
                    port,
                    environment: config.get('app.environment'),
                    version: config.get('app.version'),
                    features: featureFlags.getAll()
                });
                
                resolve(this.server);
            });
        });
    }

    async stop() {
        if (this.server) {
            logger.info('🛑 Parando servidor enterprise Phase 4...');
            
            metrics.stopCollection();
            advancedMonitoring.stopAdvancedMonitoring();
            
            return new Promise((resolve) => {
                this.server.close(() => {
                    logger.info('✅ Servidor enterprise Phase 4 parado');
                    resolve();
                });
            });
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const app = new EnterpriseAppPhase4();
    
    app.start().catch((error) => {
        console.error('❌ Erro fatal na inicialização Phase 4:', error);
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

module.exports = { EnterpriseAppPhase4 };
