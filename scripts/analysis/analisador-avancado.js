/**
 * 📈 ANALISADOR AVANÇADO DE MÉTRICAS DO SISTEMA
 * =============================================
 * 
 * Sistema avançado de análise para identificar:
 * ✅ Gargalos no fluxo operacional
 * ✅ Padrões de comportamento da IA
 * ✅ Performance por período/usuário/exchange
 * ✅ Alertas e anomalias
 * ✅ Previsões baseadas em histórico
 * ✅ Relatórios executivos automáticos
 */

const { Pool } = require('pg');

class AnalisadorAvancado {
    constructor() {
        console.log('📈 INICIANDO ANALISADOR AVANÇADO DE MÉTRICAS');
        console.log('============================================');
        
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'process.env.DATABASE_URL',
            ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
        });
    }

    /**
     * 🔍 ANÁLISE COMPLETA DE GARGALOS
     */
    async analisarGargalos() {
        console.log('\n🔍 ANALISANDO GARGALOS DO SISTEMA...');
        console.log('=====================================');
        
        try {
            // 1. Tempo de processamento por etapa
            const temposProcessamento = await this.pool.query(`
                SELECT 
                    ts.ticker,
                    AVG(EXTRACT(EPOCH FROM (sm.created_at - ts.created_at))) as tempo_medio_processamento,
                    MIN(EXTRACT(EPOCH FROM (sm.created_at - ts.created_at))) as tempo_minimo,
                    MAX(EXTRACT(EPOCH FROM (sm.created_at - ts.created_at))) as tempo_maximo,
                    COUNT(*) as total_sinais,
                    STDDEV(EXTRACT(EPOCH FROM (sm.created_at - ts.created_at))) as desvio_padrao
                FROM trading_signals ts
                JOIN signal_metrics sm ON ts.id = sm.signal_id
                WHERE ts.created_at >= NOW() - INTERVAL '7 days'
                GROUP BY ts.ticker
                HAVING COUNT(*) >= 5
                ORDER BY tempo_medio_processamento DESC
            `);

            console.log('\n📊 TEMPOS DE PROCESSAMENTO POR TICKER:');
            temposProcessamento.rows.forEach(row => {
                console.log(`   ${row.ticker}: ${row.tempo_medio_processamento.toFixed(2)}s ± ${row.desvio_padrao?.toFixed(2)}s (${row.total_sinais} sinais)`);
            });

            // 2. Gargalos por exchange
            const gargalosExchange = await this.pool.query(`
                SELECT 
                    to_.exchange,
                    COUNT(*) as total_ordens,
                    COUNT(CASE WHEN status = 'FILLED' THEN 1 END) as ordens_executadas,
                    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as ordens_falharam,
                    AVG(CASE WHEN filled_at IS NOT NULL THEN EXTRACT(EPOCH FROM (filled_at - created_at)) END) as tempo_medio_execucao,
                    MAX(CASE WHEN filled_at IS NOT NULL THEN EXTRACT(EPOCH FROM (filled_at - created_at)) END) as tempo_maximo_execucao
                FROM trading_orders to_
                WHERE to_.created_at >= NOW() - INTERVAL '7 days'
                GROUP BY to_.exchange
                ORDER BY ordens_falharam DESC, tempo_medio_execucao DESC
            `);

            console.log('\n🏢 PERFORMANCE POR EXCHANGE:');
            gargalosExchange.rows.forEach(row => {
                const taxaSucesso = ((row.ordens_executadas / row.total_ordens) * 100).toFixed(1);
                console.log(`   ${row.exchange}: ${taxaSucesso}% sucesso, ${row.tempo_medio_execucao?.toFixed(2)}s médio (${row.total_ordens} ordens)`);
            });

            // 3. Identificar horários críticos
            const horariosCriticos = await this.pool.query(`
                SELECT 
                    EXTRACT(HOUR FROM created_at) as hora,
                    COUNT(*) as total_sinais,
                    COUNT(CASE WHEN sm.ai_decision->>'shouldExecute' = 'true' THEN 1 END) as sinais_aprovados,
                    AVG(EXTRACT(EPOCH FROM (sm.created_at - ts.created_at))) as tempo_medio_processamento
                FROM trading_signals ts
                LEFT JOIN signal_metrics sm ON ts.id = sm.signal_id
                WHERE ts.created_at >= NOW() - INTERVAL '7 days'
                GROUP BY EXTRACT(HOUR FROM created_at)
                ORDER BY hora
            `);

            console.log('\n⏰ ANÁLISE POR HORÁRIO:');
            horariosCriticos.rows.forEach(row => {
                const taxaAprovacao = ((row.sinais_aprovados / row.total_sinais) * 100).toFixed(1);
                console.log(`   ${row.hora}h: ${row.total_sinais} sinais, ${taxaAprovacao}% aprovação, ${row.tempo_medio_processamento?.toFixed(2)}s processamento`);
            });

            return {
                temposProcessamento: temposProcessamento.rows,
                gargalosExchange: gargalosExchange.rows,
                horariosCriticos: horariosCriticos.rows
            };

        } catch (error) {
            console.error('❌ Erro na análise de gargalos:', error);
            throw error;
        }
    }

    /**
     * 🤖 ANÁLISE DE PADRÕES DA IA
     */
    async analisarPadroesIA() {
        console.log('\n🤖 ANALISANDO PADRÕES DA IA...');
        console.log('===============================');
        
        try {
            // 1. Fatores de decisão mais comuns
            const fatoresDecisao = await this.pool.query(`
                SELECT 
                    sm.ai_decision->>'analysis' as reasoning,
                    COUNT(*) as frequency,
                    AVG(CASE WHEN sm.ai_decision->>'shouldExecute' = 'true' THEN 1 ELSE 0 END) as approval_rate,
                    AVG((sm.ai_decision->>'confidence')::numeric) as avg_confidence
                FROM signal_metrics sm
                WHERE sm.created_at >= NOW() - INTERVAL '30 days'
                  AND sm.ai_decision IS NOT NULL
                  AND sm.ai_decision->>'analysis' IS NOT NULL
                GROUP BY sm.ai_decision->>'analysis'
                HAVING COUNT(*) >= 3
                ORDER BY frequency DESC
                LIMIT 10
            `);

            console.log('\n🧠 FATORES DE DECISÃO MAIS COMUNS:');
            fatoresDecisao.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.reasoning} (${row.frequency} vezes, ${(row.approval_rate * 100).toFixed(1)}% aprovação)`);
            });

            // 2. Análise de confiança da IA
            const analiseConfianca = await this.pool.query(`
                SELECT 
                    CASE 
                        WHEN (sm.ai_decision->>'confidence')::numeric >= 0.9 THEN 'MUITO_ALTA'
                        WHEN (sm.ai_decision->>'confidence')::numeric >= 0.7 THEN 'ALTA'
                        WHEN (sm.ai_decision->>'confidence')::numeric >= 0.5 THEN 'MEDIA'
                        ELSE 'BAIXA'
                    END as confidence_level,
                    COUNT(*) as count,
                    AVG(CASE WHEN sm.ai_decision->>'shouldExecute' = 'true' THEN 1 ELSE 0 END) as approval_rate,
                    AVG((sm.ai_decision->>'confidence')::numeric) as avg_confidence
                FROM signal_metrics sm
                WHERE sm.created_at >= NOW() - INTERVAL '30 days'
                  AND sm.ai_decision IS NOT NULL
                  AND sm.ai_decision->>'confidence' IS NOT NULL
                GROUP BY 
                    CASE 
                        WHEN (sm.ai_decision->>'confidence')::numeric >= 0.9 THEN 'MUITO_ALTA'
                        WHEN (sm.ai_decision->>'confidence')::numeric >= 0.7 THEN 'ALTA'
                        WHEN (sm.ai_decision->>'confidence')::numeric >= 0.5 THEN 'MEDIA'
                        ELSE 'BAIXA'
                    END
                ORDER BY avg_confidence DESC
            `);

            console.log('\n📊 DISTRIBUIÇÃO DE CONFIANÇA DA IA:');
            analiseConfianca.rows.forEach(row => {
                console.log(`   ${row.confidence_level}: ${row.count} decisões, ${(row.approval_rate * 100).toFixed(1)}% aprovação`);
            });

            // 3. Performance da IA por tipo de sinal
            const performanceTipoSinal = await this.pool.query(`
                SELECT 
                    CASE 
                        WHEN ts.signal LIKE '%FORTE%' THEN 'SINAL_FORTE'
                        WHEN ts.signal LIKE '%COMPRA%' THEN 'COMPRA'
                        WHEN ts.signal LIKE '%VENDA%' THEN 'VENDA'
                        ELSE 'OUTROS'
                    END as signal_type,
                    COUNT(*) as total_signals,
                    COUNT(CASE WHEN sm.ai_decision->>'shouldExecute' = 'true' THEN 1 END) as approved_signals,
                    AVG((sm.ai_decision->>'confidence')::numeric) as avg_confidence,
                    COUNT(CASE WHEN sm.ai_decision->>'isStrongSignal' = 'true' THEN 1 END) as strong_signals
                FROM trading_signals ts
                JOIN signal_metrics sm ON ts.id = sm.signal_id
                WHERE ts.created_at >= NOW() - INTERVAL '30 days'
                GROUP BY 
                    CASE 
                        WHEN ts.signal LIKE '%FORTE%' THEN 'SINAL_FORTE'
                        WHEN ts.signal LIKE '%COMPRA%' THEN 'COMPRA'
                        WHEN ts.signal LIKE '%VENDA%' THEN 'VENDA'
                        ELSE 'OUTROS'
                    END
                ORDER BY total_signals DESC
            `);

            console.log('\n🎯 PERFORMANCE POR TIPO DE SINAL:');
            performanceTipoSinal.rows.forEach(row => {
                const taxaAprovacao = ((row.approved_signals / row.total_signals) * 100).toFixed(1);
                console.log(`   ${row.signal_type}: ${row.total_signals} sinais, ${taxaAprovacao}% aprovação, ${row.avg_confidence?.toFixed(3)} confiança média`);
            });

            return {
                fatoresDecisao: fatoresDecisao.rows,
                analiseConfianca: analiseConfianca.rows,
                performanceTipoSinal: performanceTipoSinal.rows
            };

        } catch (error) {
            console.error('❌ Erro na análise de padrões da IA:', error);
            throw error;
        }
    }

    /**
     * 🚨 SISTEMA DE ALERTAS E ANOMALIAS
     */
    async detectarAnomalias() {
        console.log('\n🚨 DETECTANDO ANOMALIAS...');
        console.log('==========================');
        
        try {
            const anomalias = [];

            // 1. Verificar queda na taxa de aprovação
            const taxaAprovacao = await this.pool.query(`
                SELECT 
                    DATE_TRUNC('hour', ts.created_at) as hour,
                    COUNT(*) as total_signals,
                    COUNT(CASE WHEN sm.ai_decision->>'shouldExecute' = 'true' THEN 1 END) as approved_signals,
                    (COUNT(CASE WHEN sm.ai_decision->>'shouldExecute' = 'true' THEN 1 END)::numeric / COUNT(*)::numeric) as approval_rate
                FROM trading_signals ts
                LEFT JOIN signal_metrics sm ON ts.id = sm.signal_id
                WHERE ts.created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY DATE_TRUNC('hour', ts.created_at)
                HAVING COUNT(*) >= 5
                ORDER BY hour DESC
            `);

            // Detectar quedas drásticas na aprovação
            for (let i = 0; i < taxaAprovacao.rows.length - 1; i++) {
                const atual = taxaAprovacao.rows[i];
                const anterior = taxaAprovacao.rows[i + 1];
                
                if (anterior.approval_rate - atual.approval_rate > 0.3) { // Queda de mais de 30%
                    anomalias.push({
                        tipo: 'QUEDA_APROVACAO',
                        severidade: 'ALTA',
                        descricao: `Taxa de aprovação caiu de ${(anterior.approval_rate * 100).toFixed(1)}% para ${(atual.approval_rate * 100).toFixed(1)}%`,
                        hora: atual.hour
                    });
                }
            }

            // 2. Verificar tempos de processamento anômalos
            const temposAnômalos = await this.pool.query(`
                SELECT 
                    ts.id,
                    ts.ticker,
                    ts.signal,
                    EXTRACT(EPOCH FROM (sm.created_at - ts.created_at)) as processing_time,
                    ts.created_at
                FROM trading_signals ts
                JOIN signal_metrics sm ON ts.id = sm.signal_id
                WHERE ts.created_at >= NOW() - INTERVAL '24 hours'
                  AND EXTRACT(EPOCH FROM (sm.created_at - ts.created_at)) > 60 -- Mais de 1 minuto
                ORDER BY processing_time DESC
                LIMIT 10
            `);

            temposAnômalos.rows.forEach(row => {
                anomalias.push({
                    tipo: 'TEMPO_PROCESSAMENTO_ALTO',
                    severidade: row.processing_time > 300 ? 'CRÍTICA' : 'MÉDIA',
                    descricao: `Sinal ${row.ticker} levou ${row.processing_time.toFixed(1)}s para processar`,
                    hora: row.created_at
                });
            });

            // 3. Verificar falhas em exchanges
            const falhasExchange = await this.pool.query(`
                SELECT 
                    exchange,
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_orders,
                    (COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::numeric / COUNT(*)::numeric) as failure_rate
                FROM trading_orders
                WHERE created_at >= NOW() - INTERVAL '6 hours'
                GROUP BY exchange
                HAVING COUNT(*) >= 10 AND (COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::numeric / COUNT(*)::numeric) > 0.2
            `);

            falhasExchange.rows.forEach(row => {
                anomalias.push({
                    tipo: 'ALTA_TAXA_FALHA_EXCHANGE',
                    severidade: 'ALTA',
                    descricao: `Exchange ${row.exchange} com ${(row.failure_rate * 100).toFixed(1)}% de falhas (${row.failed_orders}/${row.total_orders})`,
                    hora: new Date()
                });
            });

            console.log('\n🚨 ANOMALIAS DETECTADAS:');
            if (anomalias.length === 0) {
                console.log('   ✅ Nenhuma anomalia detectada');
            } else {
                anomalias.forEach((anomalia, index) => {
                    console.log(`   ${index + 1}. [${anomalia.severidade}] ${anomalia.descricao}`);
                });
            }

            return anomalias;

        } catch (error) {
            console.error('❌ Erro na detecção de anomalias:', error);
            throw error;
        }
    }

    /**
     * 📊 RELATÓRIO EXECUTIVO AUTOMÁTICO
     */
    async gerarRelatorioExecutivo() {
        console.log('\n📊 GERANDO RELATÓRIO EXECUTIVO...');
        console.log('==================================');
        
        try {
            const relatorio = {
                timestamp: new Date(),
                periodo: '24 horas',
                resumo: {},
                metricas: {},
                alertas: [],
                recomendacoes: []
            };

            // 1. Métricas gerais
            const metricasGerais = await this.pool.query(`
                SELECT 
                    COUNT(DISTINCT ts.id) as total_sinais,
                    COUNT(DISTINCT CASE WHEN sm.ai_decision->>'shouldExecute' = 'true' THEN ts.id END) as sinais_aprovados,
                    COUNT(DISTINCT to_.id) as total_ordens,
                    COUNT(DISTINCT CASE WHEN to_.status = 'FILLED' THEN to_.id END) as ordens_executadas,
                    COUNT(DISTINCT u.id) as usuarios_ativos,
                    SUM(CASE WHEN to_.status = 'FILLED' THEN to_.amount ELSE 0 END) as volume_total
                FROM trading_signals ts
                LEFT JOIN signal_metrics sm ON ts.id = sm.signal_id
                LEFT JOIN trading_orders to_ ON ts.id = to_.signal_id
                LEFT JOIN users u ON to_.user_id = u.id
                WHERE ts.created_at >= NOW() - INTERVAL '24 hours'
            `);

            const metricas = metricasGerais.rows[0];
            
            relatorio.resumo = {
                sinaisRecebidos: parseInt(metricas.total_sinais) || 0,
                sinaisAprovados: parseInt(metricas.sinais_aprovados) || 0,
                ordensGeradas: parseInt(metricas.total_ordens) || 0,
                ordensExecutadas: parseInt(metricas.ordens_executadas) || 0,
                usuariosAtivos: parseInt(metricas.usuarios_ativos) || 0,
                volumeNegociado: parseFloat(metricas.volume_total) || 0
            };

            // Calcular taxas
            const taxaAprovacao = relatorio.resumo.sinaisRecebidos > 0 ? 
                (relatorio.resumo.sinaisAprovados / relatorio.resumo.sinaisRecebidos * 100) : 0;
            
            const taxaExecucao = relatorio.resumo.ordensGeradas > 0 ? 
                (relatorio.resumo.ordensExecutadas / relatorio.resumo.ordensGeradas * 100) : 0;

            relatorio.metricas = {
                taxaAprovacaoSinais: Math.round(taxaAprovacao * 100) / 100,
                taxaExecucaoOrdens: Math.round(taxaExecucao * 100) / 100,
                volumeMedioOrdem: relatorio.resumo.ordensExecutadas > 0 ? 
                    relatorio.resumo.volumeNegociado / relatorio.resumo.ordensExecutadas : 0
            };

            // 2. Top performers
            const topTickers = await this.pool.query(`
                SELECT 
                    ts.ticker,
                    COUNT(*) as total_sinais,
                    COUNT(CASE WHEN sm.ai_decision->>'shouldExecute' = 'true' THEN 1 END) as aprovados,
                    SUM(CASE WHEN to_.status = 'FILLED' THEN to_.amount ELSE 0 END) as volume
                FROM trading_signals ts
                LEFT JOIN signal_metrics sm ON ts.id = sm.signal_id
                LEFT JOIN trading_orders to_ ON ts.id = to_.signal_id
                WHERE ts.created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY ts.ticker
                ORDER BY volume DESC NULLS LAST
                LIMIT 5
            `);

            relatorio.topTickers = topTickers.rows;

            // 3. Detectar alertas
            const anomalias = await this.detectarAnomalias();
            relatorio.alertas = anomalias.filter(a => a.severidade === 'CRÍTICA' || a.severidade === 'ALTA');

            // 4. Gerar recomendações
            if (taxaAprovacao < 50) {
                relatorio.recomendacoes.push('📉 Taxa de aprovação baixa - revisar critérios da IA');
            }
            
            if (taxaExecucao < 80) {
                relatorio.recomendacoes.push('⚡ Taxa de execução baixa - verificar conexões com exchanges');
            }
            
            if (relatorio.resumo.usuariosAtivos < 10) {
                relatorio.recomendacoes.push('👥 Poucos usuários ativos - implementar estratégias de engajamento');
            }

            // Imprimir relatório
            console.log('\n📋 RELATÓRIO EXECUTIVO - 24 HORAS');
            console.log('================================');
            console.log(`📊 Sinais: ${relatorio.resumo.sinaisRecebidos} recebidos, ${relatorio.resumo.sinaisAprovados} aprovados (${relatorio.metricas.taxaAprovacaoSinais}%)`);
            console.log(`💰 Ordens: ${relatorio.resumo.ordensGeradas} geradas, ${relatorio.resumo.ordensExecutadas} executadas (${relatorio.metricas.taxaExecucaoOrdens}%)`);
            console.log(`👥 Usuários ativos: ${relatorio.resumo.usuariosAtivos}`);
            console.log(`💵 Volume total: $${relatorio.resumo.volumeNegociado.toFixed(2)}`);
            
            if (relatorio.alertas.length > 0) {
                console.log('\n🚨 ALERTAS CRÍTICOS:');
                relatorio.alertas.forEach((alerta, i) => {
                    console.log(`   ${i + 1}. ${alerta.descricao}`);
                });
            }

            if (relatorio.recomendacoes.length > 0) {
                console.log('\n💡 RECOMENDAÇÕES:');
                relatorio.recomendacoes.forEach((rec, i) => {
                    console.log(`   ${i + 1}. ${rec}`);
                });
            }

            return relatorio;

        } catch (error) {
            console.error('❌ Erro ao gerar relatório executivo:', error);
            throw error;
        }
    }

    /**
     * 🔮 ANÁLISE PREDITIVA
     */
    async analisePreditiva() {
        console.log('\n🔮 ANÁLISE PREDITIVA...');
        console.log('=======================');
        
        try {
            // 1. Tendência de volume por horário
            const tendenciaVolume = await this.pool.query(`
                SELECT 
                    EXTRACT(HOUR FROM created_at) as hora,
                    DATE_TRUNC('day', created_at) as dia,
                    SUM(CASE WHEN status = 'FILLED' THEN amount ELSE 0 END) as volume_dia
                FROM trading_orders
                WHERE created_at >= NOW() - INTERVAL '7 days'
                GROUP BY DATE_TRUNC('day', created_at), EXTRACT(HOUR FROM created_at)
                ORDER BY dia DESC, hora
            `);

            console.log('📈 PREVISÕES BASEADAS EM DADOS HISTÓRICOS:');
            
            // Calcular média de volume por horário
            const volumePorHora = {};
            tendenciaVolume.rows.forEach(row => {
                if (!volumePorHora[row.hora]) volumePorHora[row.hora] = [];
                volumePorHora[row.hora].push(parseFloat(row.volume_dia));
            });

            const previsaoProximaHora = new Date().getHours() + 1;
            if (volumePorHora[previsaoProximaHora]) {
                const mediaVolume = volumePorHora[previsaoProximaHora].reduce((a, b) => a + b, 0) / volumePorHora[previsaoProximaHora].length;
                console.log(`   💰 Volume esperado para ${previsaoProximaHora}h: $${mediaVolume.toFixed(2)}`);
            }

            // 2. Padrão de sucesso por tipo de sinal
            const padraoSucesso = await this.pool.query(`
                SELECT 
                    ts.ticker,
                    CASE 
                        WHEN ts.signal LIKE '%FORTE%' THEN 'FORTE'
                        ELSE 'NORMAL'
                    END as signal_strength,
                    COUNT(*) as total,
                    COUNT(CASE WHEN to_.status = 'FILLED' THEN 1 END) as successful,
                    AVG(CASE WHEN to_.status = 'FILLED' THEN to_.amount END) as avg_amount
                FROM trading_signals ts
                JOIN trading_orders to_ ON ts.id = to_.signal_id
                WHERE ts.created_at >= NOW() - INTERVAL '30 days'
                GROUP BY ts.ticker, 
                    CASE 
                        WHEN ts.signal LIKE '%FORTE%' THEN 'FORTE'
                        ELSE 'NORMAL'
                    END
                HAVING COUNT(*) >= 10
                ORDER BY successful::numeric / total::numeric DESC
            `);

            console.log('\n🎯 TICKERS COM MELHOR PERFORMANCE:');
            padraoSucesso.rows.slice(0, 5).forEach((row, index) => {
                const taxaSucesso = (row.successful / row.total * 100).toFixed(1);
                console.log(`   ${index + 1}. ${row.ticker} (${row.signal_strength}): ${taxaSucesso}% sucesso, $${row.avg_amount?.toFixed(2)} médio`);
            });

            return {
                tendenciaVolume: volumePorHora,
                padraoSucesso: padraoSucesso.rows
            };

        } catch (error) {
            console.error('❌ Erro na análise preditiva:', error);
            throw error;
        }
    }

    /**
     * 🎯 EXECUTAR ANÁLISE COMPLETA
     */
    async executarAnaliseCompleta() {
        console.log('\n🎯 EXECUTANDO ANÁLISE COMPLETA DO SISTEMA');
        console.log('=========================================');
        
        try {
            const resultados = {};

            resultados.gargalos = await this.analisarGargalos();
            resultados.padroesIA = await this.analisarPadroesIA();
            resultados.anomalias = await this.detectarAnomalias();
            resultados.relatorioExecutivo = await this.gerarRelatorioExecutivo();
            resultados.analisePreditiva = await this.analisePreditiva();

            console.log('\n✅ ANÁLISE COMPLETA FINALIZADA');
            console.log('==============================');
            console.log(`📊 Gargalos identificados: ${resultados.gargalos.temposProcessamento.length} tickers analisados`);
            console.log(`🤖 Padrões IA: ${resultados.padroesIA.fatoresDecisao.length} fatores de decisão identificados`);
            console.log(`🚨 Anomalias: ${resultados.anomalias.length} detectadas`);
            console.log(`📋 Relatório executivo gerado com ${resultados.relatorioExecutivo.alertas.length} alertas`);

            return resultados;

        } catch (error) {
            console.error('❌ Erro na análise completa:', error);
            throw error;
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    async function executar() {
        const analisador = new AnalisadorAvancado();
        
        try {
            await analisador.executarAnaliseCompleta();
        } catch (error) {
            console.error('❌ Erro na execução:', error);
            process.exit(1);
        }
    }
    
    executar();
}

module.exports = AnalisadorAvancado;
