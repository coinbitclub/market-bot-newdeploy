const { Pool } = require('pg');

class DiagnosticoSistemaReal {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async diagnosticoCompleto() {
        console.log('🔍 DIAGNÓSTICO REAL DO SISTEMA TRADING');
        console.log('=====================================\n');

        try {
            // 1. VERIFICAR SINAIS TRADINGVIEW
            await this.verificarSinaisTradingView();
            
            // 2. ANALISAR FEAR & GREED ATUAL
            await this.analisarFearGreed();
            
            // 3. VERIFICAR ANÁLISES IA RECENTES
            await this.verificarAnaliseIA();
            
            // 4. CHECAR POSIÇÕES ATIVAS REAIS
            await this.checarPosicoesAtivas();
            
            // 5. VALIDAR CHAVES API
            await this.validarChavesAPI();
            
            // 6. VERIFICAR EXECUÇÕES DE TRADING
            await this.verificarExecucoes();
            
            // 7. ANALISAR LOGS DO SISTEMA
            await this.analisarLogs();

            console.log('\n🎯 DIAGNÓSTICO CONCLUÍDO!');
            console.log('💡 Próximo passo: Implementar dashboard com estes dados REAIS');

        } catch (error) {
            console.error('❌ Erro no diagnóstico:', error.message);
        }
    }

    async verificarSinaisTradingView() {
        console.log('📡 VERIFICANDO SINAIS TRADINGVIEW');
        console.log('─'.repeat(40));

        try {
            // Verificar sinais recentes
            const sinaisQuery = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_sinais,
                    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as sinais_hoje,
                    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as sinais_semana,
                    MAX(created_at) as ultimo_sinal,
                    COUNT(DISTINCT signal_type) as tipos_diferentes
                FROM trading_signals
            `);

            const sinais = sinaisQuery.rows[0];
            
            console.log(`📊 Total de sinais registrados: ${sinais.total_sinais}`);
            console.log(`📅 Sinais hoje: ${sinais.sinais_hoje}`);
            console.log(`📆 Sinais esta semana: ${sinais.sinais_semana}`);
            console.log(`⏰ Último sinal: ${sinais.ultimo_sinal || 'NUNCA!'}`);
            console.log(`🎯 Tipos diferentes: ${sinais.tipos_diferentes}`);

            if (parseInt(sinais.total_sinais) === 0) {
                console.log('🚨 PROBLEMA CRÍTICO: Nenhum sinal recebido!');
                console.log('   → Webhook TradingView pode estar inativo');
                console.log('   → Verificar configuração do webhook');
                console.log('   → URL: POST /webhook/trading-signal');
            }

            // Verificar últimos sinais específicos
            if (parseInt(sinais.total_sinais) > 0) {
                const ultimosQuery = await this.pool.query(`
                    SELECT signal_type, ticker, source, created_at, data
                    FROM trading_signals 
                    ORDER BY created_at DESC 
                    LIMIT 5
                `);

                console.log('\n📋 Últimos sinais recebidos:');
                ultimosQuery.rows.forEach((sinal, index) => {
                    console.log(`${index + 1}. ${sinal.signal_type} - ${sinal.ticker} (${sinal.created_at})`);
                });
            }

        } catch (error) {
            console.log('❌ Erro ao verificar sinais:', error.message);
        }
        console.log('');
    }

    async analisarFearGreed() {
        console.log('🧭 ANALISANDO FEAR & GREED INDEX');
        console.log('─'.repeat(40));

        try {
            const fearGreedQuery = await this.pool.query(`
                SELECT 
                    fear_greed_index,
                    classification,
                    created_at,
                    CASE 
                        WHEN fear_greed_index < 30 THEN 'SOMENTE_LONG'
                        WHEN fear_greed_index > 80 THEN 'SOMENTE_SHORT'
                        ELSE 'LONG_E_SHORT'
                    END as direcao_permitida
                FROM fear_greed_index 
                ORDER BY created_at DESC 
                LIMIT 1
            `);

            if (fearGreedQuery.rows.length > 0) {
                const fg = fearGreedQuery.rows[0];
                console.log(`📊 Fear & Greed Index: ${fg.fear_greed_index}`);
                console.log(`🏷️  Classificação: ${fg.classification}`);
                console.log(`🧭 Direção permitida: ${fg.direcao_permitida}`);
                console.log(`⏰ Atualizado em: ${fg.created_at}`);

                // Explicar a lógica de direção
                if (fg.fear_greed_index < 30) {
                    console.log('💡 MERCADO EM PÂNICO → Só permite posições LONG (compra)');
                } else if (fg.fear_greed_index > 80) {
                    console.log('💡 MERCADO EM GANÂNCIA → Só permite posições SHORT (venda)');
                } else {
                    console.log('💡 MERCADO NEUTRO → Permite LONG e SHORT');
                }
            } else {
                console.log('🚨 PROBLEMA: Nenhum dado de Fear & Greed encontrado!');
                console.log('   → Sistema pode estar operando sem referência de mercado');
            }

        } catch (error) {
            console.log('❌ Erro ao analisar Fear & Greed:', error.message);
        }
        console.log('');
    }

    async verificarAnaliseIA() {
        console.log('🤖 VERIFICANDO ANÁLISES DA IA');
        console.log('─'.repeat(40));

        try {
            const iaQuery = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_analises,
                    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as analises_hoje,
                    MAX(created_at) as ultima_analise,
                    AVG(confidence_score) as confianca_media,
                    COUNT(CASE WHEN market_direction = 'BULLISH' THEN 1 END) as bullish_count,
                    COUNT(CASE WHEN market_direction = 'BEARISH' THEN 1 END) as bearish_count
                FROM ai_market_analysis 
                WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            `);

            const ia = iaQuery.rows[0];
            
            console.log(`📊 Análises IA (7 dias): ${ia.total_analises}`);
            console.log(`📅 Análises hoje: ${ia.analises_hoje}`);
            console.log(`⏰ Última análise: ${ia.ultima_analise || 'NUNCA!'}`);
            console.log(`🎯 Confiança média: ${parseFloat(ia.confianca_media || 0).toFixed(2)}%`);
            console.log(`📈 Análises BULLISH: ${ia.bullish_count}`);
            console.log(`📉 Análises BEARISH: ${ia.bearish_count}`);

            // Verificar última análise específica
            if (parseInt(ia.total_analises) > 0) {
                const ultimaQuery = await this.pool.query(`
                    SELECT market_direction, confidence_score, btc_price, btc_dominance, created_at
                    FROM ai_market_analysis 
                    ORDER BY created_at DESC 
                    LIMIT 1
                `);

                const ultima = ultimaQuery.rows[0];
                console.log('\n🎯 Última decisão da IA:');
                console.log(`   Direção: ${ultima.market_direction}`);
                console.log(`   Confiança: ${ultima.confidence_score}%`);
                console.log(`   BTC: $${parseFloat(ultima.btc_price || 0).toLocaleString()}`);
                console.log(`   Dominância BTC: ${ultima.btc_dominance}%`);
            }

        } catch (error) {
            console.log('❌ Erro ao verificar análises IA:', error.message);
        }
        console.log('');
    }

    async checarPosicoesAtivas() {
        console.log('💼 VERIFICANDO POSIÇÕES ATIVAS');
        console.log('─'.repeat(40));

        try {
            const posicoesQuery = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_posicoes,
                    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as posicoes_ativas,
                    COUNT(CASE WHEN position_type = 'LONG' THEN 1 END) as long_positions,
                    COUNT(CASE WHEN position_type = 'SHORT' THEN 1 END) as short_positions,
                    COUNT(DISTINCT symbol) as tickers_diferentes,
                    COUNT(DISTINCT user_id) as usuarios_com_posicoes
                FROM active_positions
            `);

            const posicoes = posicoesQuery.rows[0];
            
            console.log(`📊 Total de posições: ${posicoes.total_posicoes}`);
            console.log(`✅ Posições ativas: ${posicoes.posicoes_ativas}`);
            console.log(`📈 Posições LONG: ${posicoes.long_positions}`);
            console.log(`📉 Posições SHORT: ${posicoes.short_positions}`);
            console.log(`🎯 Tickers diferentes: ${posicoes.tickers_diferentes}`);
            console.log(`👥 Usuários com posições: ${posicoes.usuarios_com_posicoes}`);

            // Verificar posições específicas se existirem
            if (parseInt(posicoes.posicoes_ativas) > 0) {
                const ativasQuery = await this.pool.query(`
                    SELECT symbol, position_type, entry_price, quantity, status, created_at
                    FROM active_positions 
                    WHERE status = 'ACTIVE'
                    ORDER BY created_at DESC 
                    LIMIT 10
                `);

                console.log('\n📋 Posições ativas atuais:');
                ativasQuery.rows.forEach((pos, index) => {
                    console.log(`${index + 1}. ${pos.symbol} ${pos.position_type} - $${pos.entry_price} (${pos.created_at})`);
                });
            }

        } catch (error) {
            console.log('❌ Erro ao verificar posições:', error.message);
        }
        console.log('');
    }

    async validarChavesAPI() {
        console.log('🔑 VALIDANDO CHAVES API');
        console.log('─'.repeat(40));

        try {
            const chavesQuery = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_chaves,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as chaves_ativas,
                    COUNT(CASE WHEN exchange = 'binance' THEN 1 END) as chaves_binance,
                    COUNT(CASE WHEN exchange = 'bybit' THEN 1 END) as chaves_bybit,
                    COUNT(CASE WHEN validation_status = 'valid' THEN 1 END) as chaves_validas,
                    COUNT(CASE WHEN is_testnet = true THEN 1 END) as chaves_testnet
                FROM user_api_keys
            `);

            const chaves = chavesQuery.rows[0];
            
            console.log(`📊 Total de chaves: ${chaves.total_chaves}`);
            console.log(`✅ Chaves ativas: ${chaves.chaves_ativas}`);
            console.log(`🔸 Binance: ${chaves.chaves_binance}`);
            console.log(`🔹 Bybit: ${chaves.chaves_bybit}`);
            console.log(`✅ Válidas: ${chaves.chaves_validas}`);
            console.log(`🧪 Testnet: ${chaves.chaves_testnet}`);

            // Verificar status específico das chaves
            const statusQuery = await this.pool.query(`
                SELECT exchange, validation_status, last_validated, user_id
                FROM user_api_keys 
                WHERE is_active = true
                ORDER BY last_validated DESC NULLS LAST
                LIMIT 10
            `);

            console.log('\n📋 Status das chaves ativas:');
            statusQuery.rows.forEach((chave, index) => {
                console.log(`${index + 1}. User ${chave.user_id} - ${chave.exchange}: ${chave.validation_status} (${chave.last_validated || 'nunca validada'})`);
            });

        } catch (error) {
            console.log('❌ Erro ao validar chaves:', error.message);
        }
        console.log('');
    }

    async verificarExecucoes() {
        console.log('⚡ VERIFICANDO EXECUÇÕES DE TRADING');
        console.log('─'.repeat(40));

        try {
            const execucoesQuery = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_execucoes,
                    COUNT(CASE WHEN executed_at >= CURRENT_DATE THEN 1 END) as execucoes_hoje,
                    COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as execucoes_sucesso,
                    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as execucoes_falha,
                    COUNT(DISTINCT symbol) as tickers_tradados,
                    SUM(CASE WHEN profit_loss > 0 THEN profit_loss ELSE 0 END) as total_lucro,
                    SUM(CASE WHEN profit_loss < 0 THEN profit_loss ELSE 0 END) as total_prejuizo
                FROM user_trading_executions
            `);

            const exec = execucoesQuery.rows[0];
            
            console.log(`📊 Total de execuções: ${exec.total_execucoes}`);
            console.log(`📅 Execuções hoje: ${exec.execucoes_hoje}`);
            console.log(`✅ Sucessos: ${exec.execucoes_sucesso}`);
            console.log(`❌ Falhas: ${exec.execucoes_falha}`);
            console.log(`🎯 Tickers tradados: ${exec.tickers_tradados}`);
            console.log(`💰 Lucro total: $${parseFloat(exec.total_lucro || 0).toFixed(2)}`);
            console.log(`💸 Prejuízo total: $${parseFloat(exec.total_prejuizo || 0).toFixed(2)}`);

        } catch (error) {
            console.log('❌ Erro ao verificar execuções:', error.message);
        }
        console.log('');
    }

    async analisarLogs() {
        console.log('📝 ANALISANDO LOGS DO SISTEMA');
        console.log('─'.repeat(40));

        try {
            const logsQuery = await this.pool.query(`
                SELECT 
                    COUNT(*) as total_logs,
                    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as logs_hoje,
                    COUNT(CASE WHEN action LIKE '%error%' OR action LIKE '%ERROR%' THEN 1 END) as logs_erro,
                    COUNT(CASE WHEN action LIKE '%signal%' OR action LIKE '%SIGNAL%' THEN 1 END) as logs_sinal,
                    COUNT(CASE WHEN action LIKE '%trade%' OR action LIKE '%TRADE%' THEN 1 END) as logs_trade,
                    MAX(created_at) as ultimo_log
                FROM admin_logs
                WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            `);

            const logs = logsQuery.rows[0];
            
            console.log(`📊 Logs (7 dias): ${logs.total_logs}`);
            console.log(`📅 Logs hoje: ${logs.logs_hoje}`);
            console.log(`🚨 Logs de erro: ${logs.logs_erro}`);
            console.log(`📡 Logs de sinal: ${logs.logs_sinal}`);
            console.log(`💰 Logs de trade: ${logs.logs_trade}`);
            console.log(`⏰ Último log: ${logs.ultimo_log || 'NUNCA!'}`);

            // Verificar últimos logs importantes
            const ultimosLogsQuery = await this.pool.query(`
                SELECT action, details, created_at
                FROM admin_logs 
                ORDER BY created_at DESC 
                LIMIT 5
            `);

            console.log('\n📋 Últimos logs do sistema:');
            ultimosLogsQuery.rows.forEach((log, index) => {
                console.log(`${index + 1}. ${log.action} - ${log.created_at}`);
                if (log.details) {
                    console.log(`   ${log.details.substring(0, 100)}...`);
                }
            });

        } catch (error) {
            console.log('❌ Erro ao analisar logs:', error.message);
        }
        console.log('');
    }

    async executar() {
        await this.diagnosticoCompleto();
        await this.pool.end();
    }
}

// Executar diagnóstico
const diagnostico = new DiagnosticoSistemaReal();
diagnostico.executar().catch(console.error);
