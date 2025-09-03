/**
 * 🔍 INVESTIGAÇÃO ESPECÍFICA DOS PROBLEMAS
 * ========================================
 * 
 * Foca nos problemas identificados:
 * 1. Estrutura da tabela trading_signals
 * 2. Webhook TradingView
 * 3. Dashboard sem dados
 * 
 * @author Sistema Automatizado
 * @version 1.0
 * @date 07/08/2025 21:37
 */

const { Pool } = require('pg');

class InvestigacaoEspecifica {
    constructor() {
        this.pool = new Pool({
            host: 'trolley.proxy.rlwy.net',
            port: 44790,
            database: 'railway',
            user: 'postgres',
            password: 'process.env.API_KEY_HERE',
            ssl: {
                rejectUnauthorized: false
            }
        });
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const prefix = {
            'INFO': '[🔍]',
            'WARNING': '[⚠️ ]',
            'SUCCESS': '[✅]',
            'ERROR': '[❌]',
            'DEBUG': '[🐛]'
        }[level] || '[🔍]';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    /**
     * 🔍 INVESTIGAR TABELA DE SINAIS
     */
    async investigarTabelaSinais() {
        this.log('🔍 Investigando estrutura da tabela de sinais...');
        
        try {
            // 1. Verificar se a tabela existe
            const tabelaExiste = await this.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%signal%'
                ORDER BY table_name
            `);

            this.log('📋 Tabelas relacionadas a sinais encontradas:');
            if (tabelaExiste.rows.length > 0) {
                tabelaExiste.rows.forEach(row => {
                    this.log(`   • ${row.table_name}`);
                });
            } else {
                this.log('❌ NENHUMA TABELA DE SINAIS ENCONTRADA!', 'ERROR');
                return { tabelaExiste: false };
            }

            // 2. Para cada tabela encontrada, verificar estrutura
            const estruturas = {};
            for (const row of tabelaExiste.rows) {
                const tableName = row.table_name;
                try {
                    const colunas = await this.pool.query(`
                        SELECT column_name, data_type, is_nullable 
                        FROM information_schema.columns 
                        WHERE table_name = $1 
                        AND table_schema = 'public'
                        ORDER BY ordinal_position
                    `, [tableName]);

                    estruturas[tableName] = colunas.rows;
                    this.log(`📊 Estrutura da tabela ${tableName}:`);
                    colunas.rows.forEach(col => {
                        this.log(`   • ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
                    });
                    
                    // Verificar dados na tabela
                    const dados = await this.pool.query(`SELECT COUNT(*) as total FROM ${tableName}`);
                    this.log(`📊 Total de registros em ${tableName}: ${dados.rows[0].total}`);
                    
                } catch (error) {
                    this.log(`❌ Erro ao verificar ${tableName}: ${error.message}`, 'ERROR');
                }
                console.log('');
            }

            return { tabelaExiste: true, estruturas };
        } catch (error) {
            this.log(`❌ Erro geral: ${error.message}`, 'ERROR');
            return { tabelaExiste: false, erro: error.message };
        }
    }

    /**
     * 🌐 VERIFICAR WEBHOOK TRADINGVIEW
     */
    async verificarWebhookTradingView() {
        this.log('🌐 Verificando configuração do webhook TradingView...');
        
        try {
            // Verificar logs de webhook
            const webhookLogs = await this.pool.query(`
                SELECT COUNT(*) as total 
                FROM system_logs 
                WHERE message LIKE '%webhook%' 
                OR message LIKE '%tradingview%'
                OR message LIKE '%signal%'
                ORDER BY timestamp DESC 
                LIMIT 10
            `);

            this.log(`📝 Logs relacionados a webhook: ${webhookLogs.rows[0].total}`);

            // Verificar se há registros de requests HTTP
            const httpLogs = await this.pool.query(`
                SELECT COUNT(*) as total 
                FROM system_logs 
                WHERE message LIKE '%POST%' 
                OR message LIKE '%GET%'
                OR message LIKE '%HTTP%'
            `);

            this.log(`🌐 Logs HTTP: ${httpLogs.rows[0].total}`);

            // Verificar últimos logs gerais
            const ultimosLogs = await this.pool.query(`
                SELECT message, level, timestamp 
                FROM system_logs 
                ORDER BY timestamp DESC 
                LIMIT 5
            `);

            if (ultimosLogs.rows.length > 0) {
                this.log('📝 Últimos logs do sistema:');
                ultimosLogs.rows.forEach((log, index) => {
                    this.log(`   ${index + 1}. [${log.level}] ${log.timestamp}: ${log.message}`);
                });
            } else {
                this.log('❌ NENHUM LOG ENCONTRADO - Sistema pode não estar logando!', 'WARNING');
            }

            return {
                webhookLogs: webhookLogs.rows[0].total,
                httpLogs: httpLogs.rows[0].total,
                ultimosLogs: ultimosLogs.rows
            };
        } catch (error) {
            this.log(`❌ Erro ao verificar webhook: ${error.message}`, 'ERROR');
            return null;
        }
    }

    /**
     * 📊 INVESTIGAR DADOS DO DASHBOARD
     */
    async investigarDashboard() {
        this.log('📊 Investigando dados específicos do dashboard...');
        
        try {
            // Verificar todas as tabelas que o dashboard pode usar
            const tabelasDashboard = [
                'users', 'trading_orders', 'positions', 'trades', 
                'trading_signals', 'user_notifications', 'balances',
                'user_trading_executions', 'trading_positions'
            ];

            const resumo = {};
            
            for (const tabela of tabelasDashboard) {
                try {
                    const count = await this.pool.query(`SELECT COUNT(*) as total FROM ${tabela}`);
                    const recent = await this.pool.query(`
                        SELECT COUNT(*) as recentes 
                        FROM ${tabela} 
                        WHERE created_at > NOW() - INTERVAL '24 hours'
                    `);
                    
                    resumo[tabela] = {
                        total: count.rows[0].total,
                        recentes: recent.rows[0].recentes
                    };
                    
                    this.log(`📊 ${tabela}: ${count.rows[0].total} total, ${recent.rows[0].recentes} nas últimas 24h`);
                } catch (error) {
                    if (error.message.includes('does not exist')) {
                        this.log(`❌ Tabela ${tabela} não existe`, 'WARNING');
                        resumo[tabela] = { existe: false };
                    } else if (error.message.includes('column "created_at" does not exist')) {
                        // Tentar com outros campos de data
                        try {
                            const count = await this.pool.query(`SELECT COUNT(*) as total FROM ${tabela}`);
                            resumo[tabela] = { total: count.rows[0].total, recentes: 'N/A (sem created_at)' };
                            this.log(`📊 ${tabela}: ${count.rows[0].total} total, sem campo created_at`);
                        } catch (e) {
                            this.log(`❌ Erro em ${tabela}: ${e.message}`, 'ERROR');
                            resumo[tabela] = { erro: e.message };
                        }
                    } else {
                        this.log(`❌ Erro em ${tabela}: ${error.message}`, 'ERROR');
                        resumo[tabela] = { erro: error.message };
                    }
                }
            }

            return resumo;
        } catch (error) {
            this.log(`❌ Erro geral na investigação do dashboard: ${error.message}`, 'ERROR');
            return null;
        }
    }

    /**
     * 🔍 VERIFICAR SISTEMA DE LOGGING
     */
    async verificarSistemaLogging() {
        this.log('🔍 Verificando sistema de logging...');
        
        try {
            // Verificar estrutura da tabela de logs
            const estruturaLogs = await this.pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'system_logs' 
                AND table_schema = 'public'
                ORDER BY ordinal_position
            `);

            if (estruturaLogs.rows.length > 0) {
                this.log('📋 Estrutura da tabela system_logs:');
                estruturaLogs.rows.forEach(col => {
                    this.log(`   • ${col.column_name} (${col.data_type})`);
                });
            } else {
                this.log('❌ Tabela system_logs não encontrada!', 'ERROR');
                return { tabelaExiste: false };
            }

            return { tabelaExiste: true, estrutura: estruturaLogs.rows };
        } catch (error) {
            this.log(`❌ Erro ao verificar logging: ${error.message}`, 'ERROR');
            return { tabelaExiste: false, erro: error.message };
        }
    }

    /**
     * 📊 EXECUTAR INVESTIGAÇÃO COMPLETA
     */
    async executar() {
        this.log('📊 INICIANDO INVESTIGAÇÃO ESPECÍFICA DOS PROBLEMAS', 'SUCCESS');
        console.log('='.repeat(70));
        
        try {
            // 1. Investigar tabela de sinais
            this.log('🔍 PARTE 1: TABELA DE SINAIS', 'SUCCESS');
            const sinais = await this.investigarTabelaSinais();
            console.log('');

            // 2. Verificar webhook
            this.log('🔍 PARTE 2: WEBHOOK TRADINGVIEW', 'SUCCESS');
            const webhook = await this.verificarWebhookTradingView();
            console.log('');

            // 3. Investigar dashboard
            this.log('🔍 PARTE 3: DADOS DO DASHBOARD', 'SUCCESS');
            const dashboard = await this.investigarDashboard();
            console.log('');

            // 4. Verificar logging
            this.log('🔍 PARTE 4: SISTEMA DE LOGGING', 'SUCCESS');
            const logging = await this.verificarSistemaLogging();
            console.log('');

            // CONCLUSÕES
            console.log('='.repeat(70));
            this.log('🎯 CONCLUSÕES DA INVESTIGAÇÃO:', 'SUCCESS');
            
            const problemas = [];
            const solucoes = [];

            if (!sinais.tabelaExiste) {
                problemas.push('❌ Tabela de sinais não existe ou está mal configurada');
                solucoes.push('🔧 Criar/corrigir tabela trading_signals com estrutura adequada');
            }

            if (!webhook || webhook.webhookLogs === 0) {
                problemas.push('❌ Nenhum log de webhook encontrado');
                solucoes.push('🔧 Verificar se endpoint /webhook/tradingview está ativo');
            }

            if (!dashboard || Object.values(dashboard).every(t => t.total === '0' || t.recentes === '0')) {
                problemas.push('❌ Dashboard sem dados para exibir');
                solucoes.push('🔧 Aguardar dados reais ou criar dados de exemplo');
            }

            if (!logging.tabelaExiste) {
                problemas.push('❌ Sistema de logging não configurado');
                solucoes.push('🔧 Implementar logging adequado');
            }

            this.log('🚨 PROBLEMAS ENCONTRADOS:');
            problemas.forEach(p => this.log(`   ${p}`, 'ERROR'));
            
            console.log('');
            this.log('💡 SOLUÇÕES SUGERIDAS:');
            solucoes.forEach(s => this.log(`   ${s}`, 'SUCCESS'));

            return { sinais, webhook, dashboard, logging, problemas, solucoes };

        } catch (error) {
            this.log(`❌ ERRO CRÍTICO: ${error.message}`, 'ERROR');
            throw error;
        } finally {
            await this.pool.end();
        }
    }
}

// 🚀 EXECUÇÃO
if (require.main === module) {
    const investigacao = new InvestigacaoEspecifica();
    investigacao.executar().then(resultado => {
        console.log('\n🎯 Investigação finalizada!');
        console.log(`📊 ${resultado.problemas.length} problemas identificados`);
        console.log(`💡 ${resultado.solucoes.length} soluções propostas`);
        process.exit(0);
    }).catch(error => {
        console.error('❌ ERRO:', error.message);
        process.exit(1);
    });
}

module.exports = InvestigacaoEspecifica;
