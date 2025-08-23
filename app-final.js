/**
 * 🚀 COINBITCLUB MARKET BOT - APP.JS FINAL
 * Sistema integrado com validação automática funcionando
 * Resolução: Problema das 4 chaves reais encontradas e validadas
 * Última atualização: 2025-01-23 19:50:00
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const SistemaValidacaoFuncionando = require('./sistema-validacao-funcionando');

class CoinbitClubApp {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        
        // Configurar banco
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        // Inicializar sistema de validação
        this.sistemaValidacao = new SistemaValidacaoFuncionando();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * 🔧 CONFIGURAR MIDDLEWARE
     */
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        
        // Log de requisições
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    /**
     * 🔧 CONFIGURAR ROTAS
     */
    setupRoutes() {
        // Rota de saúde
        this.app.get('/health', (req, res) => {
            const status = this.sistemaValidacao.getStatus();
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                database: 'Connected',
                validationSystem: status.isRunning ? 'Running' : 'Stopped',
                validatedConnections: status.validatedConnections,
                connections: status.connections
            });
        });

        // Status do sistema
        this.app.get('/status', (req, res) => {
            const status = this.sistemaValidacao.getStatus();
            res.json(status);
        });

        // Forçar validação
        this.app.post('/validate', async (req, res) => {
            try {
                console.log('🔄 Validação forçada solicitada via API');
                const resultado = await this.sistemaValidacao.executarValidacaoCompleta();
                
                res.json({
                    success: true,
                    message: 'Validação executada',
                    resultado: resultado,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Listar conexões validadas
        this.app.get('/connections', (req, res) => {
            const status = this.sistemaValidacao.getStatus();
            res.json({
                total: status.validatedConnections,
                connections: status.connections
            });
        });

        // Obter conexão específica
        this.app.get('/connection/:userId/:exchange/:environment', (req, res) => {
            const { userId, exchange, environment } = req.params;
            const connection = this.sistemaValidacao.getValidatedConnection(userId, exchange, environment);
            
            if (connection) {
                res.json({
                    found: true,
                    connection: {
                        username: connection.username,
                        exchange: connection.exchange,
                        environment: connection.environment,
                        balance: connection.balance,
                        lastValidated: connection.lastValidated
                    }
                });
            } else {
                res.json({
                    found: false,
                    message: 'Conexão não encontrada ou não validada'
                });
            }
        });

        // Executar trade (exemplo)
        this.app.post('/trade', async (req, res) => {
            try {
                const { userId, exchange, environment, symbol, side, amount } = req.body;
                
                // Obter conexão validada
                const connection = this.sistemaValidacao.getValidatedConnection(userId, exchange, environment);
                
                if (!connection) {
                    return res.status(400).json({
                        success: false,
                        error: 'Conexão não validada para este usuário/exchange'
                    });
                }
                
                res.json({
                    success: true,
                    message: 'Trade enviado para execução',
                    tradeData: {
                        userId,
                        username: connection.username,
                        exchange,
                        environment,
                        symbol,
                        side,
                        amount,
                        timestamp: new Date().toISOString()
                    }
                });
                
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Rota raiz
        this.app.get('/', (req, res) => {
            res.json({
                name: 'CoinbitClub Market Bot',
                version: '2.0.0',
                status: 'Running',
                description: 'Sistema integrado com validação automática',
                endpoints: {
                    health: '/health',
                    status: '/status',
                    validate: 'POST /validate',
                    connections: '/connections',
                    connection: '/connection/:userId/:exchange/:environment',
                    trade: 'POST /trade'
                }
            });
        });
    }

    /**
     * 🚀 INICIAR SERVIDOR
     */
    async iniciar() {
        try {
            console.log('\n🚀 INICIANDO COINBITCLUB MARKET BOT');
            console.log('===================================');
            
            // Testar conexão do banco
            await this.pool.query('SELECT NOW()');
            console.log('✅ Conexão com banco de dados estabelecida');
            
            // Iniciar sistema de validação
            await this.sistemaValidacao.iniciar();
            console.log('✅ Sistema de validação automática iniciado');
            
            // Iniciar servidor Express
            this.server = this.app.listen(this.port, () => {
                console.log(`✅ Servidor rodando na porta ${this.port}`);
                console.log(`🌐 API disponível em: http://localhost:${this.port}`);
                console.log('\n📊 ENDPOINTS DISPONÍVEIS:');
                console.log('   GET  /health           - Status do sistema');
                console.log('   GET  /status           - Status da validação');
                console.log('   POST /validate         - Forçar validação');
                console.log('   GET  /connections      - Listar conexões');
                console.log('   POST /trade            - Executar trade');
                console.log('\n🔄 Sistema em execução! Pressione Ctrl+C para parar');
            });
            
        } catch (error) {
            console.error('❌ Erro ao iniciar:', error.message);
            process.exit(1);
        }
    }

    /**
     * 🛑 PARAR SERVIDOR
     */
    async parar() {
        console.log('\n🛑 Parando servidor...');
        
        if (this.server) {
            this.server.close();
        }
        
        this.sistemaValidacao.parar();
        await this.pool.end();
        
        console.log('✅ Servidor parado com sucesso');
    }
}

// Inicializar se executado diretamente
if (require.main === module) {
    const app = new CoinbitClubApp();
    
    app.iniciar().catch(error => {
        console.error('❌ Erro fatal:', error.message);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        await app.parar();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        await app.parar();
        process.exit(0);
    });
}

module.exports = CoinbitClubApp;
