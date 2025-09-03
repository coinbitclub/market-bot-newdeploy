// SECURITY_VALIDATED: 2025-08-08T23:27:20.628Z
// Este arquivo foi verificado e tem credenciais protegidas

/**
 * 🔍 DIAGNÓSTICO COMPLETO DE SINAIS TRADINGVIEW
 * =============================================
 * 
 * Verifica todo o fluxo dos sinais do TradingView:
 * 1. Rotas de recepção
 * 2. Salvamento no banco
 * 3. Processamento
 * 4. Geração de operações
 * 
 * @author Sistema Automatizado
 * @version 1.0
 * @date 07/08/2025 21:32
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class DiagnosticoSinais {
    constructor() {
        this.pool = new Pool({
            host: 'trolley.proxy.rlwy.net',
            port: 44790,
            database: 'railway',
            user: 'postgres',
            password: 'PROTECTED_DB_PASSWORD',
            ssl: {
                rejectUnauthorized: false
            }
        });
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleString('pt-BR');
        const prefix = {
            'INFO': '[📊]',
            'WARNING': '[⚠️ ]',
            'SUCCESS': '[✅]',
            'ERROR': '[❌]',
            'SIGNAL': '[📡]',
            'ROUTE': '[🛣️ ]'
        }[level] || '[📊]';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    /**
     * 🛣️ VERIFICAR ROTAS DO TRADINGVIEW
     */
    async verificarRotasTradingView() {
        this.log('🛣️ Verificando rotas do TradingView...', 'ROUTE');
        
        try {
            // Procurar por arquivos que contenham rotas do TradingView
            const arquivos = [
                'app.js',
                'routes/signals.js',
                'routes/webhook.js',
                'routes/tradingview.js',
                'signal-processor.js',
                'webhook-handler.js'
            ];

            const rotasEncontradas = [];

            for (const arquivo of arquivos) {
                const caminhoArquivo = path.join(__dirname, arquivo);
                
                if (fs.existsSync(caminhoArquivo)) {
                    const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
                    
                    // Procurar por rotas relacionadas a sinais
                    const rotasSignals = [
                        '/webhook',
                        '/signal',
                        '/tradingview',
                        '/tv-signal',
                        '/api/signal',
                        '/api/webhook'
                    ];

                    rotasSignals.forEach(rota => {
                        if (conteudo.includes(rota)) {
                            rotasEncontradas.push({
                                arquivo,
                                rota,
                                metodos: this.extrairMetodosHTTP(conteudo, rota)
                            });
                        }
                    });
                }
            }

            if (rotasEncontradas.length > 0) {
                this.log(`✅ ${rotasEncontradas.length} rotas de sinais encontradas:`);
                rotasEncontradas.forEach(item => {
                    this.log(`   • ${item.arquivo}: ${item.rota} [${item.metodos.join(', ')}]`);
                });
            } else {
                this.log('❌ Nenhuma rota de sinal encontrada nos arquivos', 'ERROR');
            }

            return rotasEncontradas;
        } catch (error) {
            this.log(`❌ Erro ao verificar rotas: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * 🔍 EXTRAIR MÉTODOS HTTP
     */
    extrairMetodosHTTP(conteudo, rota) {
        const metodos = [];
        const metodosHTTP = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        
        metodosHTTP.forEach(metodo => {
            const regex = new RegExp(`${metodo.toLowerCase()}\\s*\\(\\s*['"]${rota}`, 'i');
            if (regex.test(conteudo)) {
                metodos.push(metodo);
            }
        });

        return metodos.length > 0 ? metodos : ['UNKNOWN'];
    }

    /**
     * 📡 VERIFICAR SINAIS NO BANCO
     */
    async verificarSinaisNoBanco() {
        this.log('📡 Verificando sinais salvos no banco...', 'SIGNAL');
        
        try {
            // Verificar tabela signals
            const sinaisHoje = await this.pool.query(`
                SELECT 
                    id, symbol, action, price, timestamp,
                    source, signal_type, status, created_at
                FROM signals 
                WHERE DATE(created_at) = CURRENT_DATE
                ORDER BY created_at DESC
                LIMIT 20
            `);

            this.log(`📊 Sinais de hoje: ${sinaisHoje.rows.length}`);
            
            if (sinaisHoje.rows.length > 0) {
                sinaisHoje.rows.forEach((sinal, index) => {
                    this.log(`   ${index + 1}. ID ${sinal.id} - ${sinal.symbol} ${sinal.action} @ ${sinal.price} - Status: ${sinal.status} - ${sinal.created_at}`);
                });
            }

            // Verificar últimos sinais em geral
            const ultimosSinais = await this.pool.query(`
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as ultima_hora,
                       COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as ultimas_24h,
                       MAX(created_at) as ultimo_sinal
                FROM signals
            `);

            const stats = ultimosSinais.rows[0];
            this.log(`📈 Estatísticas de sinais:`);
            this.log(`   • Total: ${stats.total}`);
            this.log(`   • Última hora: ${stats.ultima_hora}`);
            this.log(`   • Últimas 24h: ${stats.ultimas_24h}`);
            this.log(`   • Último sinal: ${stats.ultimo_sinal || 'Nenhum'}`);

            // Verificar trading signals
            const tradingSignals = await this.pool.query(`
                SELECT COUNT(*) as total,
                       MAX(created_at) as ultimo
                FROM trading_signals
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);

            this.log(`🔄 Trading Signals (24h): ${tradingSignals.rows[0].total} - Último: ${tradingSignals.rows[0].ultimo || 'Nenhum'}`);

            return {
                sinaisHoje: sinaisHoje.rows,
                stats: stats,
                tradingSignals: tradingSignals.rows[0]
            };

        } catch (error) {
            this.log(`❌ Erro ao verificar sinais no banco: ${error.message}`, 'ERROR');
            return null;
        }
    }

    /**
     * 🔄 VERIFICAR PROCESSAMENTO DE SINAIS
     */
    async verificarProcessamento() {
        this.log('🔄 Verificando processamento de sinais...');
        
        try {
            // Verificar sinais não processados
            const sinaisNaoProcessados = await this.pool.query(`
                SELECT id, symbol, action, status, created_at, error_message
                FROM signals 
                WHERE status IN ('pending', 'failed', 'error')
                ORDER BY created_at DESC
                LIMIT 10
            `);

            if (sinaisNaoProcessados.rows.length > 0) {
                this.log(`⚠️  ${sinaisNaoProcessados.rows.length} sinais não processados:`, 'WARNING');
                sinaisNaoProcessados.rows.forEach(sinal => {
                    this.log(`   • ID ${sinal.id} - ${sinal.symbol} ${sinal.action} - Status: ${sinal.status} - Erro: ${sinal.error_message || 'N/A'}`);
                });
            } else {
                this.log('✅ Todos os sinais foram processados com sucesso');
            }

            // Verificar logs de processamento
            const logsProcessamento = await this.pool.query(`
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN level = 'error' THEN 1 END) as erros,
                       COUNT(CASE WHEN message LIKE '%signal%' THEN 1 END) as relacionados_sinais
                FROM system_logs 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);

            const logs = logsProcessamento.rows[0];
            this.log(`📋 Logs de sistema (24h): ${logs.total} total, ${logs.erros} erros, ${logs.relacionados_sinais} relacionados a sinais`);

            return {
                sinaisNaoProcessados: sinaisNaoProcessados.rows,
                logsStats: logs
            };

        } catch (error) {
            this.log(`❌ Erro ao verificar processamento: ${error.message}`, 'ERROR');
            return null;
        }
    }

    /**
     * 🎯 VERIFICAR GERAÇÃO DE OPERAÇÕES
     */
    async verificarGeracaoOperacoes() {
        this.log('🎯 Verificando geração de operações a partir dos sinais...');
        
        try {
            // Verificar correlação entre sinais e executions
            const correlacao = await this.pool.query(`
                SELECT 
                    s.id as signal_id,
                    s.symbol as signal_symbol,
                    s.action as signal_action,
                    s.created_at as signal_time,
                    ute.id as execution_id,
                    ute.symbol as execution_symbol,
                    ute.side as execution_side,
                    ute.status as execution_status
                FROM signals s
                LEFT JOIN user_trading_executions ute ON s.id = ute.signal_id
                WHERE s.created_at > NOW() - INTERVAL '24 hours'
                ORDER BY s.created_at DESC
                LIMIT 20
            `);

            this.log(`🔗 Correlação sinais → executions (24h): ${correlacao.rows.length} registros`);
            
            let sinaisComExecution = 0;
            let sinaisSemExecution = 0;

            correlacao.rows.forEach(item => {
                if (item.execution_id) {
                    sinaisComExecution++;
                    this.log(`   ✅ Sinal ${item.signal_id} (${item.signal_symbol} ${item.signal_action}) → Execution ${item.execution_id} (${item.execution_status})`);
                } else {
                    sinaisSemExecution++;
                    this.log(`   ❌ Sinal ${item.signal_id} (${item.signal_symbol} ${item.signal_action}) → SEM EXECUTION`);
                }
            });

            this.log(`📊 Resumo de processamento:`);
            this.log(`   • Sinais com execution: ${sinaisComExecution}`);
            this.log(`   • Sinais sem execution: ${sinaisSemExecution}`);
            this.log(`   • Taxa de sucesso: ${correlacao.rows.length > 0 ? ((sinaisComExecution / correlacao.rows.length) * 100).toFixed(1) + '%' : '0%'}`);

            // Verificar usuários ativos para trading
            const usuariosAtivos = await this.pool.query(`
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN is_active = true THEN 1 END) as ativos
                FROM users
            `);

            this.log(`👥 Usuários: ${usuariosAtivos.rows[0].total} total, ${usuariosAtivos.rows[0].ativos} ativos`);

            return {
                correlacao: correlacao.rows,
                sinaisComExecution,
                sinaisSemExecution,
                usuariosAtivos: usuariosAtivos.rows[0]
            };

        } catch (error) {
            this.log(`❌ Erro ao verificar geração de operações: ${error.message}`, 'ERROR');
            return null;
        }
    }

    /**
     * 🕐 VERIFICAR HORÁRIOS (BRASIL)
     */
    async verificarHorarios() {
        this.log('🕐 Verificando configuração de horários...');
        
        try {
            // Verificar timezone do banco
            const timezone = await this.pool.query(`SELECT NOW() as db_time, NOW() AT TIME ZONE 'America/Sao_Paulo' as brasil_time`);
            
            const dbTime = timezone.rows[0].db_time;
            const brasilTime = timezone.rows[0].brasil_time;
            
            this.log(`⏰ Horário do banco: ${dbTime}`);
            this.log(`🇧🇷 Horário Brasil: ${brasilTime}`);
            
            // Verificar últimos registros com horários
            const ultimosRegistros = await this.pool.query(`
                SELECT 'signals' as tabela, created_at, created_at AT TIME ZONE 'America/Sao_Paulo' as brasil_time
                FROM signals 
                ORDER BY created_at DESC 
                LIMIT 3
                UNION ALL
                SELECT 'trading_executions' as tabela, executed_at as created_at, executed_at AT TIME ZONE 'America/Sao_Paulo' as brasil_time
                FROM user_trading_executions 
                WHERE executed_at IS NOT NULL
                ORDER BY executed_at DESC 
                LIMIT 3
            `);

            this.log(`📅 Últimos registros com horários:`);
            ultimosRegistros.rows.forEach(reg => {
                this.log(`   • ${reg.tabela}: ${reg.created_at} (Brasil: ${reg.brasil_time})`);
            });

            return {
                dbTime,
                brasilTime,
                ultimosRegistros: ultimosRegistros.rows
            };

        } catch (error) {
            this.log(`❌ Erro ao verificar horários: ${error.message}`, 'ERROR');
            return null;
        }
    }

    /**
     * 📊 EXECUTAR DIAGNÓSTICO COMPLETO
     */
    async executarDiagnostico() {
        this.log('🚀 INICIANDO DIAGNÓSTICO COMPLETO DE SINAIS TRADINGVIEW', 'SUCCESS');
        console.log('='.repeat(80));
        
        try {
            // 1. Verificar rotas
            const rotas = await this.verificarRotasTradingView();
            console.log('');

            // 2. Verificar sinais no banco
            const sinais = await this.verificarSinaisNoBanco();
            console.log('');

            // 3. Verificar processamento
            const processamento = await this.verificarProcessamento();
            console.log('');

            // 4. Verificar geração de operações
            const operacoes = await this.verificarGeracaoOperacoes();
            console.log('');

            // 5. Verificar horários
            const horarios = await this.verificarHorarios();
            console.log('');

            // 6. Diagnóstico final
            console.log('='.repeat(80));
            this.log('🎯 DIAGNÓSTICO FINAL:', 'SUCCESS');
            
            const problemas = [];
            
            if (rotas.length === 0) {
                problemas.push('❌ Nenhuma rota de sinal encontrada');
            }
            
            if (!sinais || sinais.stats.ultimas_24h === 0) {
                problemas.push('❌ Nenhum sinal nas últimas 24h');
            }
            
            if (processamento && processamento.sinaisNaoProcessados.length > 0) {
                problemas.push(`⚠️  ${processamento.sinaisNaoProcessados.length} sinais não processados`);
            }
            
            if (operacoes && operacoes.sinaisSemExecution > 0) {
                problemas.push(`⚠️  ${operacoes.sinaisSemExecution} sinais não geraram executions`);
            }

            if (problemas.length > 0) {
                this.log('🚨 PROBLEMAS DETECTADOS:', 'WARNING');
                problemas.forEach(problema => this.log(`   ${problema}`));
            } else {
                this.log('✅ Sistema de sinais funcionando corretamente!', 'SUCCESS');
            }

            return {
                rotas,
                sinais,
                processamento,
                operacoes,
                horarios,
                problemas
            };

        } catch (error) {
            this.log(`❌ ERRO CRÍTICO no diagnóstico: ${error.message}`, 'ERROR');
            throw error;
        } finally {
            await this.pool.end();
        }
    }
}

// 🚀 EXECUÇÃO
if (require.main === module) {
    const diagnostico = new DiagnosticoSinais();
    diagnostico.executarDiagnostico().then(resultado => {
        console.log('\n🎯 Diagnóstico concluído!');
        if (resultado.problemas.length > 0) {
            console.log(`⚠️  ${resultado.problemas.length} problema(s) detectado(s)`);
        } else {
            console.log('✅ Sistema operando normalmente');
        }
        process.exit(0);
    }).catch(error => {
        console.error('❌ ERRO:', error.message);
        process.exit(1);
    });
}

module.exports = DiagnosticoSinais;
