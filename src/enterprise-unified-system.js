
// 🏗️ COINBITCLUB ENTERPRISE UNIFIED SYSTEM
// Sistema principal que unifica todos os componentes

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const TradingSystemsIntegrator = require('./integrators/trading-systems-integrator-simple');
const EnterpriseRouter = require('./routes/enterprise-unified');
const MonitoringDashboard = require('./monitoring/enterprise-dashboard');

class CoinBitClubEnterpriseSystem {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3333;
        
        this.tradingIntegrator = new TradingSystemsIntegrator();
        this.monitoringDashboard = new MonitoringDashboard();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        
        console.log('🏗️ CoinBitClub Enterprise System iniciado');
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                system: 'CoinBitClub Enterprise v6.0.0',
                timestamp: new Date().toISOString()
            });
        });

        // Dashboard principal
        this.app.get('/dashboard', async (req, res) => {
            try {
                const dashboardData = await this.monitoringDashboard.getDashboardData();
                res.json(dashboardData);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // APIs enterprise
        this.app.use('/api/enterprise', EnterpriseRouter);

        // Trading direto (compatibilidade)
        this.app.post('/api/signal', async (req, res) => {
            try {
                const result = await this.tradingIntegrator.processCompleteSignal(req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
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

    async start() {
        try {
            await this.tradingIntegrator.initialize();
            
            this.server = this.app.listen(this.port, () => {
                console.log(`🚀 CoinBitClub Enterprise rodando na porta ${this.port}`);
                console.log(`📊 Dashboard: http://localhost:${this.port}/dashboard`);
                console.log(`⚡ API: http://localhost:${this.port}/api/enterprise`);
                console.log(`🔄 Health: http://localhost:${this.port}/health`);
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
