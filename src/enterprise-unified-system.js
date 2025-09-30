// 🏗️ COINBITCLUB ENTERPRISE UNIFIED SYSTEM
// Sistema principal que unifica todos os componentes

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');

const { router: ApiRoutes, setDbPoolManager } = require('./routes/index');
const ConnectionPoolManager = require('./database/connection-pool-manager');
const tradingWebSocket = require('./services/websocket/trading-websocket');

class CoinBitClubEnterpriseSystem {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3333;

        // Create HTTP server for WebSocket support
        this.httpServer = http.createServer(this.app);

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

        console.log('🏗️ CoinBitClub Enterprise System iniciado');
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        
        // Skip JSON parsing for Stripe webhook to preserve raw body for signature verification
        this.app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
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
        this.app.use((err, req, res, next) => {
            console.error('❌ Erro no sistema:', err.message);
            res.status(500).json({
                error: 'Erro interno do servidor',
                timestamp: new Date().toISOString()
            });
        });
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


