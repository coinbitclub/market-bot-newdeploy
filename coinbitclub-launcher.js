#!/usr/bin/env node

/**
 * 🚀 INICIALIZAÇÃO PRINCIPAL - COINBITCLUB MARKET BOT
 * ===================================================
 * 
 * Sistema de inicialização automática completo que:
 * - Valida todas as conexões automaticamente
 * - Inicializa o sistema de trading
 * - Mantém monitoramento contínuo
 * - Garante reconexão automática
 * 
 * ESPECIALISTA: SEM FUROS, TUDO AUTOMÁTICO
 */

const SistemaValidacaoAutomatica = require('./sistema-validacao-automatica');
const IntegradorExecutores = require('./integrador-executores');
const { Pool } = require('pg');
const express = require('express');
const cron = require('node-cron');

class CoinbitClubSystemLauncher {
    constructor() {
        this.sistemaValidacao = new SistemaValidacaoAutomatica();
        this.integradorExecutores = new IntegradorExecutores();
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.isSystemRunning = false;
        this.startTime = Date.now();
        
        console.log('🚀 COINBITCLUB MARKET BOT - INICIANDO...');
    }

    /**
     * 🔧 CONFIGURAR SERVIDOR EXPRESS
     */
    setupExpressServer() {
        this.app.use(express.json());

        // Endpoint de saúde do sistema
        this.app.get('/health', (req, res) => {
            const stats = this.sistemaValidacao.getSystemStats();
            res.json({
                status: this.isSystemRunning ? 'RUNNING' : 'STOPPED',
                uptime: Date.now() - this.startTime,
                system_stats: stats,
                timestamp: new Date().toISOString()
            });
        });

        // Endpoint para forçar revalidação
        this.app.post('/revalidate', async (req, res) => {
            try {
                console.log('🔄 Revalidação forçada solicitada via API');
                const success = await this.sistemaValidacao.executarValidacaoCompleta();
                res.json({
                    success,
                    message: success ? 'Revalidação concluída' : 'Falha na revalidação',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Endpoint para obter conexões validadas
        this.app.get('/connections', (req, res) => {
            const validatedConnections = Array.from(this.sistemaValidacao.validatedConnections.entries()).map(([key, connection]) => ({
                key,
                username: connection.username,
                exchange: connection.exchange,
                environment: connection.environment,
                balance: connection.balance,
                last_validated: connection.lastValidated
            }));

            res.json({
                total: validatedConnections.length,
                connections: validatedConnections,
                timestamp: new Date().toISOString()
            });
        });

        // Endpoint para status dos executores
        this.app.get('/executors', (req, res) => {
            const status = this.integradorExecutores.getSystemStatus();
            res.json({
                ...status,
                timestamp: new Date().toISOString()
            });
        });

        // Endpoint para executar trade automático
        this.app.post('/execute-trade', async (req, res) => {
            try {
                const { userId, exchange, environment, symbol, side, amount, orderType = 'market' } = req.body;
                
                if (!this.integradorExecutores.tradingEnabled) {
                    return res.status(503).json({
                        success: false,
                        error: 'Trading não está habilitado'
                    });
                }

                const executor = this.integradorExecutores.getExecutorForTrading(userId, exchange, environment);
                if (!executor) {
                    return res.status(404).json({
                        success: false,
                        error: 'Executor não encontrado ou não ativo'
                    });
                }

                const result = await executor.executeTrade(symbol, side, amount, orderType);
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
     * ⏰ CONFIGURAR TAREFAS AGENDADAS
     */
    setupScheduledTasks() {
        // Revalidação a cada 5 minutos
        cron.schedule('*/5 * * * *', async () => {
            console.log('⏰ Revalidação agendada iniciando...');
            try {
                await this.sistemaValidacao.executarValidacaoCompleta();
                console.log('✅ Revalidação agendada concluída');
            } catch (error) {
                console.error('❌ Erro na revalidação agendada:', error.message);
            }
        });

        // Health check das conexões a cada minuto
        cron.schedule('* * * * *', async () => {
            try {
                await this.sistemaValidacao.verificarSaudeConexoes();
            } catch (error) {
                console.error('❌ Erro no health check:', error.message);
            }
        });

        // Relatório detalhado a cada hora
        cron.schedule('0 * * * *', () => {
            console.log('\n📊 RELATÓRIO HORÁRIO DO SISTEMA');
            console.log('==============================');
            this.sistemaValidacao.gerarRelatorioValidacao();
        });

        console.log('⏰ Tarefas agendadas configuradas');
    }

    /**
     * 🔧 VERIFICAR DEPENDÊNCIAS
     */
    async verificarDependencias() {
        console.log('🔧 Verificando dependências...');
        
        const dependencias = [
            { nome: 'PostgreSQL', teste: () => this.testarBanco() },
            { nome: 'Conectividade Internet', teste: () => this.testarInternet() },
            { nome: 'Estrutura do Banco', teste: () => this.verificarEstruturaBanco() }
        ];

        for (const dep of dependencias) {
            try {
                await dep.teste();
                console.log(`✅ ${dep.nome}: OK`);
            } catch (error) {
                console.error(`❌ ${dep.nome}: FALHA - ${error.message}`);
                throw new Error(`Dependência ${dep.nome} não atendida`);
            }
        }

        console.log('✅ Todas as dependências verificadas');
    }

    async testarBanco() {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });

        const result = await pool.query('SELECT NOW()');
        await pool.end();
        
        if (!result.rows[0]) {
            throw new Error('Sem resposta do banco');
        }
    }

    async testarInternet() {
        const axios = require('axios');
        await axios.get('https://api.ipify.org', { timeout: 5000 });
    }

    async verificarEstruturaBanco() {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
            ssl: { rejectUnauthorized: false }
        });

        // Verificar tabelas essenciais
        const tabelas = ['users', 'user_api_keys', 'trading_executions'];
        
        for (const tabela of tabelas) {
            const result = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [tabela]);

            if (!result.rows[0].exists) {
                await pool.end();
                throw new Error(`Tabela ${tabela} não existe`);
            }
        }

        await pool.end();
    }

    /**
     * 🚀 INICIALIZAÇÃO PRINCIPAL
     */
    async iniciar() {
        try {
            console.log('\n🚀 INICIALIZANDO COINBITCLUB MARKET BOT');
            console.log('======================================');

            // 1. Verificar dependências
            await this.verificarDependencias();

            // 2. Configurar servidor
            this.setupExpressServer();

            // 3. Configurar tarefas agendadas
            this.setupScheduledTasks();

            // 4. Inicializar integrador de executores
            await this.integradorExecutores.inicializarIntegracao();

            // 5. Iniciar servidor
            this.app.listen(this.port, () => {
                console.log(`🌐 Servidor rodando na porta ${this.port}`);
            });

            // 6. Marcar sistema como rodando
            this.isSystemRunning = true;

            console.log('\n🎉 COINBITCLUB MARKET BOT TOTALMENTE OPERACIONAL');
            console.log('===============================================');
            console.log(`📡 API: http://localhost:${this.port}`);
            console.log('📋 Endpoints disponíveis:');
            console.log('   GET  /health - Status do sistema');
            console.log('   GET  /connections - Conexões validadas');
            console.log('   GET  /executors - Status dos executores');
            console.log('   POST /revalidate - Forçar revalidação');
            console.log('   POST /execute-trade - Executar trade automático');
            console.log('\n🔄 Sistema rodando em modo automático...');

            return true;

        } catch (error) {
            console.error('❌ FALHA NA INICIALIZAÇÃO:', error.message);
            console.error('🛑 O sistema será encerrado.');
            process.exit(1);
        }
    }

    /**
     * 🛑 PARADA SEGURA
     */
    async pararSistema() {
        console.log('\n🛑 INICIANDO PARADA SEGURA DO SISTEMA');
        
        try {
            this.isSystemRunning = false;
            
            // Parar sistema de validação
            await this.sistemaValidacao.pararSistema();
            
            console.log('✅ Sistema parado com segurança');
            process.exit(0);
            
        } catch (error) {
            console.error('❌ Erro na parada do sistema:', error.message);
            process.exit(1);
        }
    }
}

// Handlers de sinais do sistema
process.on('SIGINT', async () => {
    if (global.coinbitClubLauncher) {
        await global.coinbitClubLauncher.pararSistema();
    } else {
        process.exit(0);
    }
});

process.on('SIGTERM', async () => {
    if (global.coinbitClubLauncher) {
        await global.coinbitClubLauncher.pararSistema();
    } else {
        process.exit(0);
    }
});

// Executar se chamado diretamente
if (require.main === module) {
    const launcher = new CoinbitClubSystemLauncher();
    global.coinbitClubLauncher = launcher;
    launcher.iniciar();
}

module.exports = CoinbitClubSystemLauncher;
