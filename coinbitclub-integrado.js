#!/usr/bin/env node

/**
 * 🚀 INICIALIZAÇÃO INTEGRADA TOTAL - COINBITCLUB
 * ==============================================
 * 
 * Sistema de inicialização completo que integra:
 * - Sistema de validação automática
 * - Executores automáticos
 * - Servidor Express com APIs
 * - Monitoramento contínuo
 * - Trading automático
 * 
 * TUDO INTEGRADO E AUTOMÁTICO
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

// Importar sistemas
const SistemaValidacaoAutomatica = require('./sistema-validacao-automatica');

class CoinbitClubIntegrado {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        
        // Sistemas integrados
        this.sistemaValidacao = new SistemaValidacaoAutomatica();
        this.executoresAtivos = new Map();
        
        // Estado do sistema
        this.isSystemRunning = false;
        this.startTime = Date.now();
        
        console.log('🚀 COINBITCLUB INTEGRADO - INICIALIZANDO...');
    }

    /**
     * 🌐 CONFIGURAR SERVIDOR EXPRESS
     */
    setupServer() {
        // Middleware
        this.app.use(cors());
        this.app.use(express.json());

        // Health check completo
        this.app.get('/health', (req, res) => {
            const validationStats = this.sistemaValidacao.getSystemStats();
            
            res.json({
                status: this.isSystemRunning ? 'RUNNING' : 'STARTING',
                uptime: Date.now() - this.startTime,
                validation_system: {
                    total_keys: validationStats.totalKeys,
                    validated_keys: validationStats.validatedKeys,
                    active_connections: validationStats.activeConnections,
                    last_validation: validationStats.lastValidation,
                    current_ip: validationStats.currentIP
                },
                executor_system: {
                    total_executors: this.executoresAtivos.size,
                    active_executors: this.executoresAtivos.size,
                    trading_enabled: this.executoresAtivos.size > 0
                },
                timestamp: new Date().toISOString()
            });
        });

        // Status detalhado
        this.app.get('/status', async (req, res) => {
            try {
                const pool = new Pool({
                    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
                    ssl: { rejectUnauthorized: false }
                });

                // Verificar banco
                const dbTest = await pool.query('SELECT NOW()');
                await pool.end();

                // Estatísticas dos sistemas
                const validationStats = this.sistemaValidacao.getSystemStats();

                res.json({
                    system: 'COINBITCLUB_INTEGRATED',
                    status: 'OPERATIONAL',
                    database: 'CONNECTED',
                    validation: {
                        keys_found: validationStats.totalKeys,
                        keys_validated: validationStats.validatedKeys,
                        success_rate: validationStats.totalKeys > 0 
                            ? ((validationStats.validatedKeys / validationStats.totalKeys) * 100).toFixed(1) + '%'
                            : '0%'
                    },
                    executors: {
                        total: this.executoresAtivos.size,
                        active: this.executoresAtivos.size,
                        trading_enabled: this.executoresAtivos.size > 0
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                res.status(500).json({
                    system: 'COINBITCLUB_INTEGRATED',
                    status: 'ERROR',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Forçar revalidação
        this.app.post('/revalidate', async (req, res) => {
            try {
                console.log('🔄 Revalidação forçada via API');
                
                // Executar validação
                const success = await this.sistemaValidacao.executarValidacaoCompleta();
                
                if (success) {
                    // Sincronizar executores
                    await this.sincronizarExecutores();
                }
                
                res.json({
                    success,
                    message: success ? 'Revalidação e sincronização concluídas' : 'Falha na revalidação',
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
            const connections = Array.from(this.sistemaValidacao.validatedConnections.entries()).map(([key, conn]) => ({
                key,
                username: conn.username,
                exchange: conn.exchange,
                environment: conn.environment,
                balance: conn.balance,
                last_validated: conn.lastValidated
            }));

            res.json({
                total: connections.length,
                connections,
                timestamp: new Date().toISOString()
            });
        });

        // Status dos executores
        this.app.get('/executors', (req, res) => {
            const executores = Array.from(this.executoresAtivos.entries()).map(([key, executor]) => ({
                key,
                userId: executor.userId,
                exchange: executor.exchange,
                environment: executor.environment,
                active: true,
                last_activity: executor.lastActivity || new Date()
            }));

            res.json({
                total: this.executoresAtivos.size,
                active: this.executoresAtivos.size,
                executors: executores,
                trading_enabled: this.executoresAtivos.size > 0,
                timestamp: new Date().toISOString()
            });
        });

        // Executar trade
        this.app.post('/trade', async (req, res) => {
            try {
                const { userId, exchange, environment, symbol, side, amount, orderType = 'market' } = req.body;
                
                const executorKey = `${userId}_${exchange}_${environment}`;
                const executor = this.executoresAtivos.get(executorKey);
                
                if (!executor) {
                    return res.status(404).json({
                        success: false,
                        error: 'Executor não encontrado'
                    });
                }

                // Usar a instância CCXT diretamente
                const connection = this.sistemaValidacao.getValidatedConnection(userId, exchange, environment);
                if (!connection) {
                    return res.status(404).json({
                        success: false,
                        error: 'Conexão não validada'
                    });
                }

                // Executar trade via CCXT
                const result = await this.executeTrade(connection, symbol, side, amount, orderType);
                res.json(result);

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        console.log('🌐 Servidor Express configurado');
    }

    /**
     * � EXECUTAR TRADE VIA CCXT
     */
    async executeTrade(connection, symbol, side, amount, orderType) {
        try {
            let result;
            
            if (orderType === 'market') {
                if (side === 'buy') {
                    result = await connection.createMarketBuyOrder(symbol, amount);
                } else {
                    result = await connection.createMarketSellOrder(symbol, amount);
                }
            } else {
                return {
                    success: false,
                    error: 'Apenas ordens market são suportadas no momento'
                };
            }

            return {
                success: true,
                order: result,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * �🔄 SINCRONIZAR EXECUTORES COM CONEXÕES VALIDADAS
     */
    async sincronizarExecutores() {
        console.log('🔄 Sincronizando executores com conexões validadas...');
        
        try {
            this.executoresAtivos.clear();
            
            for (const [keyId, connection] of this.sistemaValidacao.validatedConnections) {
                this.executoresAtivos.set(keyId, {
                    userId: connection.user_id,
                    exchange: connection.exchange,
                    environment: connection.environment,
                    username: connection.username,
                    lastActivity: new Date()
                });
            }
            
            console.log(`✅ ${this.executoresAtivos.size} executores sincronizados`);
            
        } catch (error) {
            console.error('❌ Erro na sincronização dos executores:', error.message);
        }
    }

    /**
     * 🚀 INICIALIZAÇÃO COMPLETA
     */
    async iniciar() {
        try {
            console.log('\n🚀 INICIALIZANDO COINBITCLUB INTEGRADO');
            console.log('=====================================');

            // 1. Configurar servidor
            this.setupServer();
            console.log('✅ Servidor configurado');

            // 2. Inicializar sistema de validação
            console.log('🔄 Executando validação inicial...');
            const validationSuccess = await this.sistemaValidacao.executarValidacaoCompleta();
            
            if (validationSuccess) {
                console.log('✅ Validação inicial bem-sucedida');
                
                // 3. Sincronizar executores com conexões validadas
                await this.sincronizarExecutores();
                
                // 4. Iniciar monitoramento contínuo
                this.sistemaValidacao.iniciarMonitoramentoContinuo();
                console.log('✅ Monitoramento contínuo ativado');
                
            } else {
                console.log('⚠️ Nenhuma conexão validada - sistema em modo limitado');
            }

            // 5. Iniciar servidor
            this.app.listen(this.port, () => {
                console.log(`🌐 Servidor rodando na porta ${this.port}`);
                this.isSystemRunning = true;
            });

            console.log('\n🎉 COINBITCLUB INTEGRADO TOTALMENTE OPERACIONAL');
            console.log('===============================================');
            console.log(`📡 API: http://localhost:${this.port}`);
            console.log('📋 Endpoints:');
            console.log('   GET  /health - Status completo');
            console.log('   GET  /status - Status detalhado');
            console.log('   GET  /connections - Conexões validadas');
            console.log('   GET  /executors - Status dos executores');
            console.log('   POST /revalidate - Forçar revalidação');
            console.log('   POST /trade - Executar trade');
            console.log('\n🔄 Sistema totalmente automatizado rodando...');

            return true;

        } catch (error) {
            console.error('❌ ERRO NA INICIALIZAÇÃO:', error.message);
            console.error('🛑 Sistema será encerrado');
            process.exit(1);
        }
    }

    /**
     * 🛑 PARADA SEGURA
     */
    async parar() {
        console.log('\n🛑 INICIANDO PARADA SEGURA');
        
        try {
            this.isSystemRunning = false;
            
            if (this.sistemaValidacao) {
                await this.sistemaValidacao.pararSistema();
            }
            
            console.log('✅ Sistema parado com segurança');
            process.exit(0);
            
        } catch (error) {
            console.error('❌ Erro na parada:', error.message);
            process.exit(1);
        }
    }
}

// Handlers de sinais
let sistemaIntegrado = null;

process.on('SIGINT', async () => {
    if (sistemaIntegrado) {
        await sistemaIntegrado.parar();
    } else {
        process.exit(0);
    }
});

process.on('SIGTERM', async () => {
    if (sistemaIntegrado) {
        await sistemaIntegrado.parar();
    } else {
        process.exit(0);
    }
});

// Executar se chamado diretamente
if (require.main === module) {
    sistemaIntegrado = new CoinbitClubIntegrado();
    sistemaIntegrado.iniciar();
}

module.exports = CoinbitClubIntegrado;
