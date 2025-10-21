// 🏗️ COINBITCLUB ENTERPRISE UNIFIED SYSTEM
// Sistema principal que unifica todos os componentes

require('dotenv').config();

const express = require('express');
const http = require('http');
const morgan = require('morgan');

const { router: ApiRoutes, setDbPoolManager, setHybridServices } = require('./routes/index');
const ConnectionPoolManager = require('./database/connection-pool-manager');
const tradingWebSocket = require('./services/websocket/trading-websocket');
const { SecurityConfig } = require('./core/security');
const { ErrorHandler } = require('./middleware/error-handler');

// Hybrid Position Management Services
const PositionManagementService = require('./services/position/position-management-service');
const PositionReconciliationService = require('./services/position/position-reconciliation-service');
const RealOperationsService = require('./services/operations/real-operations-service');
const UserApiKeyManager = require('./services/user-api-keys/user-api-key-manager');

class CoinBitClubEnterpriseSystem {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3333;

        // Create HTTP server for WebSocket support
        this.httpServer = http.createServer(this.app);

        // Initialize security configuration
        this.security = new SecurityConfig();

        // Initialize database pool manager
        this.dbPoolManager = new ConnectionPoolManager();

        // Set database pool manager for auth routes
        setDbPoolManager(this.dbPoolManager);

        // Initialize hybrid position management services
        this.initializeHybridServices();

        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.setupWebSocket();
        this.setupProcessErrorHandlers();
        console.log('🏗️ CoinBitClub Enterprise System started');
    }

    initializeHybridServices() {
        try {
            console.log('🔄 Initializing hybrid position management services...');

            // Initialize User API Key Manager
            this.apiKeyManager = new UserApiKeyManager(this.dbPoolManager);
            console.log('✅ User API Key Manager initialized');

            // Initialize Position Management Service (hybrid: exchange + database)
            this.positionManagementService = new PositionManagementService(
                this.dbPoolManager,
                this.apiKeyManager
            );
            console.log('✅ Position Management Service initialized (hybrid mode)');

            // Initialize Real Operations Service with hybrid support
            this.realOperationsService = new RealOperationsService(
                this.positionManagementService,
                this.dbPoolManager
            );
            console.log('✅ Real Operations Service initialized with real-time data');

            // Initialize Position Reconciliation Service (auto-sync every 5 min)
            this.reconciliationService = new PositionReconciliationService(
                this.dbPoolManager,
                this.positionManagementService,
                tradingWebSocket
            );
            console.log('✅ Position Reconciliation Service initialized');

            // Make services available globally to routes
            this.app.set('positionManagementService', this.positionManagementService);
            this.app.set('realOperationsService', this.realOperationsService);
            this.app.set('reconciliationService', this.reconciliationService);
            this.app.set('apiKeyManager', this.apiKeyManager);

            // Inject hybrid services into routes
            setHybridServices(this.positionManagementService, this.reconciliationService);

            console.log('🎯 Hybrid position management ready - real-time data enabled');
        } catch (error) {
            console.error('❌ Error initializing hybrid services:', error.message);
            console.warn('⚠️  System will run without hybrid position management');
        }
    }

    setupMiddleware() {
        // Security headers
        this.app.use(this.security.getHelmetConfig());

        // CORS configuration
        this.app.use(this.security.getCorsConfig());

        // Request logging (Morgan)
        const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
        this.app.use(morgan(logFormat));

        // IP validation middleware
        this.app.use(this.security.ipValidationMiddleware());

        // Global rate limiting (general API)
        this.app.use(this.security.getRateLimiter('general'));
        
        // TradingView webhook - Custom middleware to handle multiple content types
        this.app.use('/api/tradingview', (req, res, next) => {
            const contentType = req.headers['content-type'] || '';
            
            if (contentType.includes('application/json')) {
                express.json()(req, res, next);
            } else if (contentType.includes('text/plain')) {
                express.text({ type: 'text/plain' })(req, res, next);
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
                express.urlencoded({ extended: true })(req, res, next);
            } else {
                // Default to JSON
                express.json()(req, res, next);
            }
        });

        // Skip JSON parsing for Stripe webhook to preserve raw body for signature verification
        this.app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
        
        // Global body parsers (for all other routes)
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Trust proxy (for rate limiting with correct IPs)
        this.app.set('trust proxy', 1);
    }

    setupRoutes() {
        // 🏠 Main page - Sistema principal
        this.app.get('/', (req, res) => {
            res.json({
                system: 'CoinBitClub Enterprise v6.0.0',
                status: 'operational',
                description: 'Sistema de trading automatizado empresarial',
                endpoints: {
                    health: '/health',
                    api: '/api',
                    auth: '/api/auth'
                },
                features: [
                    'Autenticação multi-usuário (6 tipos)',
                    'JWT + 2FA + Sessões ativas',
                    'Sistema de afiliados',
                    'Trading automatizado com IA'
                ],
                timestamp: new Date().toISOString()
            });
        });

        // 🔍 Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                system: 'CoinBitClub Enterprise v6.0.0',
                timestamp: new Date().toISOString(),
                services: {
                    trading: 'operational',
                    financial: 'operational',
                    authentication: 'operational',
                    affiliate: 'operational'
                }
            });
        });

        // ⚡ API Routes
        this.app.use('/api', ApiRoutes);
    }

    setupErrorHandling() {
        // 404 handler (must be after all routes)
        this.app.use(ErrorHandler.notFound());

        // Centralized error handler (must be last)
        this.app.use(ErrorHandler.handle());
    }

    setupProcessErrorHandlers() {
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            // Log to error tracking service (Sentry, etc.)
            // In production, might want to gracefully shutdown
            if (process.env.NODE_ENV === 'production') {
                console.error('🚨 Critical: Unhandled rejection in production');
                // Optional: this.gracefulShutdown();
            }
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            // Log to error tracking service
            // In production, should gracefully shutdown
            if (process.env.NODE_ENV === 'production') {
                console.error('🚨 Critical: Uncaught exception in production - shutting down');
                this.gracefulShutdown(1);
            }
        });

        // Handle SIGTERM (production graceful shutdown)
        process.on('SIGTERM', () => {
            console.log('📡 SIGTERM received - starting graceful shutdown');
            this.gracefulShutdown(0);
        });

        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            console.log('📡 SIGINT received - starting graceful shutdown');
            this.gracefulShutdown(0);
        });
    }

    async gracefulShutdown(exitCode = 0) {
        console.log('🛑 Starting graceful shutdown...');

        try {
            // Stop reconciliation service
            if (this.reconciliationService) {
                this.reconciliationService.stop();
                console.log('✅ Reconciliation service stopped');
            }

            // Stop accepting new connections
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(resolve);
                });
                console.log('✅ HTTP server closed');
            }

            // Close database connections
            if (this.dbPoolManager) {
                await this.dbPoolManager.closeAll();
                console.log('✅ Database connections closed');
            }

            // Close WebSocket connections
            if (tradingWebSocket && tradingWebSocket.io) {
                tradingWebSocket.io.close();
                console.log('✅ WebSocket connections closed');
            }

            console.log('✅ Graceful shutdown complete');
            process.exit(exitCode);

        } catch (error) {
            console.error('❌ Error during graceful shutdown:', error);
            process.exit(1);
        }
    }

    setupWebSocket() {
        try {
            // Initialize WebSocket server
            const io = tradingWebSocket.initialize(this.httpServer);

            // Store reference for access from routes
            this.app.set('websocket', tradingWebSocket);

        } catch (error) {
            console.error('❌ Erro configurando WebSocket:', error.message);
        }
    }

    async start() {
        try {
            this.server = this.httpServer.listen(this.port, () => {
                this.dbPoolManager.startHealthChecks();

                // Start position reconciliation service (auto-sync every 5 min)
                if (this.reconciliationService) {
                    this.reconciliationService.start();
                    console.log('🔄 Position reconciliation service started (auto-sync enabled)');
                }
            });

            return this.server;
        } catch (error) {
            console.error('❌ Erro ao iniciar sistema:', error.message);
            throw error;
        }
    }

    async stop() {
        if (this.server) {
            this.server.close();
        }
    }
}

module.exports = CoinBitClubEnterpriseSystem;

// Auto-start se executado diretamente
if (require.main === module) {
    const system = new CoinBitClubEnterpriseSystem();
    system.start().catch(console.error);
}


