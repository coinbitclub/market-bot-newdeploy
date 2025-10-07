// 🏗️ COINBITCLUB ENTERPRISE UNIFIED SYSTEM
// Sistema principal que unifica todos os componentes

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const morgan = require('morgan');

const { router: ApiRoutes, setDbPoolManager } = require('./routes/index');
const ConnectionPoolManager = require('./database/connection-pool-manager');
const tradingWebSocket = require('./services/websocket/trading-websocket');
const { SecurityConfig } = require('./core/security');
const { ErrorHandler } = require('./middleware/error-handler');

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

        console.log('🔧 Configurando middleware...');
        this.setupMiddleware();
        console.log('🔧 Configurando rotas...');
        this.setupRoutes();
        console.log('🔧 Configurando error handling...');
        this.setupErrorHandling();
        console.log('🔧 Configurando WebSocket...');
        this.setupWebSocket();
        console.log('🔧 Configurando process error handlers...');
        this.setupProcessErrorHandlers();

        console.log('🏗️ CoinBitClub Enterprise System iniciado');
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

        // Skip JSON parsing for Stripe webhook to preserve raw body for signature verification
        this.app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
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
        console.log('⚡ Setting up API routes...');
        this.app.use('/api', ApiRoutes);
        console.log('✅ API routes configured');
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
        console.log('🛑 Graceful shutdown initiated...');

        try {
            // Stop accepting new connections
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(resolve);
                    console.log('✅ HTTP server closed');
                });
            }

            // Close database connections
            if (this.dbPoolManager) {
                await this.dbPoolManager.closeAll();
                console.log('✅ Database connections closed');
            }

            // Close WebSocket connections
            if (tradingWebSocket && tradingWebSocket.io) {
                tradingWebSocket.io.close();
                console.log('✅ WebSocket server closed');
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

            console.log('📡 WebSocket server configured');
        } catch (error) {
            console.error('❌ Erro configurando WebSocket:', error.message);
        }
    }

    async start() {
        try {
            this.server = this.httpServer.listen(this.port, () => {
                console.log(`🚀 CoinBitClub Enterprise rodando na porta ${this.port}`);
                console.log(`📊 Dashboard: http://localhost:${this.port}/dashboard`);
                console.log(`⚡ API: http://localhost:${this.port}/api`);
                console.log(`🔄 Health: http://localhost:${this.port}/health`);
                console.log(`📡 WebSocket: ws://localhost:${this.port}`);

                this.dbPoolManager.startHealthChecks();
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
            console.log('🛑 Sistema enterprise parado');
        }
    }
}

module.exports = CoinBitClubEnterpriseSystem;

// Auto-start se executado diretamente
if (require.main === module) {
    const system = new CoinBitClubEnterpriseSystem();
    system.start().catch(console.error);
}


