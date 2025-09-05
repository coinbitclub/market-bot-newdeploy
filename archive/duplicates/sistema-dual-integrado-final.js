/**
 * ===============================================
 * 🔄 INTEGRAÇÃO COMPLETA - SISTEMA DUAL
 * ===============================================
 * Arquivo: sistema-dual-integrado-final.js
 * Versão: 1.0.0
 * Data: 2025-08-22
 * 
 * 🎯 OBJETIVO:
 * Integração completa entre sistema atual (Fear & Greed) e Market Pulse
 * Sistema inteligente que escolhe automaticamente a melhor estratégia
 * 
 * 🧠 FUNCIONALIDADES:
 * • Detecção automática da melhor estratégia
 * • Fear & Greed com Market Pulse para zona neutra
 * • IA especializada para decisões complexas
 * • Sistema de backup e redundância
 * • Log completo para auditoria
 * • Performance otimizada
 */

const { CalculadorMarketPulse } = require('./market-pulse-top100-completo');
const { IntegradorIAMarketPulse } = require('./ia-market-pulse-treinada');
const axios = require('axios');
const fs = require('fs').promises;

// ===============================================
// 🎨 CONFIGURAÇÕES SISTEMA DUAL
// ===============================================

const DUAL_CONFIG = {
    // Estratégias disponíveis
    ESTRATEGIAS: {
        FEAR_GREED_PURO: 'fear_greed_puro',
        MARKET_PULSE_PURO: 'market_pulse_puro',
        DUAL_INTELIGENTE: 'dual_inteligente'
    },
    
    // Configuração atual (pode ser alterada dinamicamente)
    ESTRATEGIA_ATIVA: 'dual_inteligente',
    
    // Thresholds Fear & Greed
    FEAR_GREED: {
        LONG_THRESHOLD: 30,
        SHORT_THRESHOLD: 80,
        ZONA_NEUTRA_MIN: 30,
        ZONA_NEUTRA_MAX: 80
    },
    
    // Configuração de performance
    PERFORMANCE: {
        TIMEOUT_BINANCE: 10000,
        TIMEOUT_FEAR_GREED: 8000,
        CACHE_DURATION: 300000, // 5 minutos
        MAX_RETRIES: 3
    },
    
    // Sistema de logs
    LOGS: {
        ATIVO: true,
        DETALHADO: true,
        ARQUIVO: 'sistema-dual-decisoes.log',
        MAX_SIZE_MB: 10
    },
    
    // Backup e redundância
    BACKUP: {
        ATIVO: true,
        ESTRATEGIA_FALLBACK: 'fear_greed_puro',
        AUTO_SWITCH_ON_ERROR: true
    }
};

// ===============================================
// 🎯 CLASSE PRINCIPAL - SISTEMA DUAL
// ===============================================

class SistemaDualIntegrado {
    constructor() {
        this.marketPulse = new CalculadorMarketPulse();
        this.iaMarketPulse = new IntegradorIAMarketPulse();
        this.cache = new Map();
        this.estatisticas = {
            total_analises: 0,
            estrategia_fear_greed: 0,
            estrategia_market_pulse: 0,
            estrategia_dual: 0,
            ia_acionada: 0,
            decisoes_long: 0,
            decisoes_short: 0,
            decisoes_aguardar: 0,
            erros: 0,
            ultima_decisao: null
        };
        this.configuracao = { ...DUAL_CONFIG };
    }

    // ===============================================
    // 🔍 DETECÇÃO AUTOMÁTICA DE ESTRATÉGIA
    // ===============================================
    
    async detectarMelhorEstrategia(fearGreedIndex, marketConditions) {
        console.log('🔍 Detectando melhor estratégia...');
        
        try {
            // 1. Avaliar condições do Fear & Greed
            const fearGreedClareza = this.avaliarClarezaFearGreed(fearGreedIndex);
            
            // 2. Avaliar condições do mercado
            const mercadoVolatilidade = await this.avaliarVolatilidadeMercado(marketConditions);
            
            // 3. Decisão inteligente da estratégia
            let estrategiaRecomendada = DUAL_CONFIG.ESTRATEGIA_ATIVA;
            let justificativa = '';
            
            if (fearGreedClareza.muito_claro) {
                // Fear & Greed muito claro - usar direto
                estrategiaRecomendada = DUAL_CONFIG.ESTRATEGIAS.FEAR_GREED_PURO;
                justificativa = `F&G muito claro (${fearGreedIndex}) - sem necessidade de Market Pulse`;
                
            } else if (fearGreedClareza.zona_neutra && mercadoVolatilidade.alta) {
                // Zona neutra + alta volatilidade = Market Pulse puro
                estrategiaRecomendada = DUAL_CONFIG.ESTRATEGIAS.MARKET_PULSE_PURO;
                justificativa = `Zona neutra + alta volatilidade - Market Pulse mais eficaz`;
                
            } else if (fearGreedClareza.zona_neutra) {
                // Zona neutra normal = sistema dual
                estrategiaRecomendada = DUAL_CONFIG.ESTRATEGIAS.DUAL_INTELIGENTE;
                justificativa = `Zona neutra F&G - ativar sistema dual com IA`;
                
            } else {
                // Situação intermediária = dual
                estrategiaRecomendada = DUAL_CONFIG.ESTRATEGIAS.DUAL_INTELIGENTE;
                justificativa = `Condições mistas - sistema dual para máxima precisão`;
            }
            
            console.log(`🎯 Estratégia selecionada: ${estrategiaRecomendada} - ${justificativa}`);
            
            return {
                estrategia: estrategiaRecomendada,
                justificativa: justificativa,
                fear_greed_clareza: fearGreedClareza,
                mercado_volatilidade: mercadoVolatilidade
            };
            
        } catch (error) {
            console.warn('⚠️ Erro na detecção de estratégia - usando fallback:', error.message);
            return {
                estrategia: DUAL_CONFIG.BACKUP.ESTRATEGIA_FALLBACK,
                justificativa: 'Erro na detecção - usando estratégia backup',
                erro: true
            };
        }
    }
    
    avaliarClarezaFearGreed(fearGreedIndex) {
        const muito_claro = fearGreedIndex <= 25 || fearGreedIndex >= 85;
        const zona_neutra = fearGreedIndex >= DUAL_CONFIG.FEAR_GREED.ZONA_NEUTRA_MIN && 
                           fearGreedIndex <= DUAL_CONFIG.FEAR_GREED.ZONA_NEUTRA_MAX;
        
        return {
            valor: fearGreedIndex,
            muito_claro: muito_claro,
            zona_neutra: zona_neutra,
            proximidade_threshold: Math.min(
                Math.abs(fearGreedIndex - DUAL_CONFIG.FEAR_GREED.LONG_THRESHOLD),
                Math.abs(fearGreedIndex - DUAL_CONFIG.FEAR_GREED.SHORT_THRESHOLD)
            )
        };
    }
    
    async avaliarVolatilidadeMercado(marketConditions) {
        try {
            // Calcular volatilidade baseada no VWΔ e dispersão
            const vwd = marketConditions?.VWD || 0;
            const pm_plus = marketConditions?.PM_PLUS || 50;
            
            // Critérios de volatilidade
            const alta_volatilidade = Math.abs(vwd) > 1.5 || 
                                     pm_plus < 20 || pm_plus > 80;
            
            const media_volatilidade = Math.abs(vwd) > 0.5 && 
                                      Math.abs(vwd) <= 1.5;
            
            return {
                alta: alta_volatilidade,
                media: media_volatilidade,
                baixa: !alta_volatilidade && !media_volatilidade,
                vwd_absoluto: Math.abs(vwd),
                dispersao_pm: Math.abs(50 - pm_plus)
            };
            
        } catch (error) {
            return {
                alta: false,
                media: false,
                baixa: true,
                erro: true
            };
        }
    }

    // ===============================================
    // 📊 COLETA DE DADOS UNIFICADA
    // ===============================================
    
    async coletarDadosCompletos() {
        console.log('📊 Coletando dados completos do mercado...');
        
        const startTime = Date.now();
        const resultados = {};
        
        try {
            // Coletar dados em paralelo para otimizar performance
            const [fearGreedData, marketPulseData] = await Promise.allSettled([
                this.obterFearGreedIndex(),
                this.marketPulse.analisarMercadoCompleto()
            ]);
            
            // Processar Fear & Greed
            if (fearGreedData.status === 'fulfilled') {
                resultados.fearGreed = fearGreedData.value;
            } else {
                console.warn('⚠️ Falha no Fear & Greed - usando backup');
                resultados.fearGreed = { value: 50, classification: 'Neutral', backup: true };
            }
            
            // Processar Market Pulse
            if (marketPulseData.status === 'fulfilled') {
                resultados.marketPulse = marketPulseData.value;
            } else {
                console.warn('⚠️ Falha no Market Pulse - usando dados básicos');
                resultados.marketPulse = { 
                    metricas: { PM_PLUS: 50, PM_MINUS: 50, VWD: 0 },
                    backup: true 
                };
            }
            
            // Tempo de coleta
            resultados.tempo_coleta = Date.now() - startTime;
            resultados.timestamp = new Date().toISOString();
            resultados.sucesso = true;
            
            console.log(`✅ Dados coletados em ${resultados.tempo_coleta}ms`);
            
            return resultados;
            
        } catch (error) {
            console.error('❌ Erro crítico na coleta de dados:', error.message);
            
            // Retornar dados mínimos para evitar parada total
            return {
                fearGreed: { value: 50, classification: 'Neutral', erro: true },
                marketPulse: { 
                    metricas: { PM_PLUS: 50, PM_MINUS: 50, VWD: 0 },
                    erro: true 
                },
                tempo_coleta: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                sucesso: false,
                erro: error.message
            };
        }
    }
    
    async obterFearGreedIndex() {
        try {
            const response = await axios.get(
                'https://api.alternative.me/fng/?limit=1&format=json',
                { timeout: DUAL_CONFIG.PERFORMANCE.TIMEOUT_FEAR_GREED }
            );
            
            const data = response.data.data[0];
            return {
                value: parseInt(data.value),
                classification: data.value_classification,
                timestamp: data.timestamp,
                fonte: 'alternative.me'
            };
            
        } catch (error) {
            console.warn('⚠️ Erro ao obter Fear & Greed Index:', error.message);
            throw error;
        }
    }

    // ===============================================
    // 🎯 PROCESSAMENTO POR ESTRATÉGIA
    // ===============================================
    
    async processarDecisaoFearGreedPuro(dadosCompletos) {
        console.log('🎯 Processando com estratégia Fear & Greed Puro...');
        
        const fearGreed = dadosCompletos.fearGreed.value;
        let decisao;
        
        if (fearGreed < DUAL_CONFIG.FEAR_GREED.LONG_THRESHOLD) {
            decisao = {
                direcao_final: 'SOMENTE_LONG',
                fonte_decisao: 'FEAR_GREED_PURO',
                executa_operacoes: true,
                confianca: 0.8,
                justificativa: `Fear & Greed ${fearGreed} < ${DUAL_CONFIG.FEAR_GREED.LONG_THRESHOLD} - Extremo Fear favorece LONG`
            };
        } else if (fearGreed > DUAL_CONFIG.FEAR_GREED.SHORT_THRESHOLD) {
            decisao = {
                direcao_final: 'SOMENTE_SHORT',
                fonte_decisao: 'FEAR_GREED_PURO',
                executa_operacoes: true,
                confianca: 0.8,
                justificativa: `Fear & Greed ${fearGreed} > ${DUAL_CONFIG.FEAR_GREED.SHORT_THRESHOLD} - Extremo Greed favorece SHORT`
            };
        } else {
            decisao = {
                direcao_final: 'AGUARDAR',
                fonte_decisao: 'FEAR_GREED_NEUTRO',
                executa_operacoes: false,
                confianca: 0.3,
                justificativa: `Fear & Greed ${fearGreed} em zona neutra - sem direção clara`
            };
        }
        
        this.estatisticas.estrategia_fear_greed++;
        return decisao;
    }
    
    async processarDecisaoMarketPulsePuro(dadosCompletos) {
        console.log('🎯 Processando com estratégia Market Pulse Puro...');
        
        const analiseMarketPulse = await this.marketPulse.analisarDirecaoMercado(
            dadosCompletos.marketPulse.metricas
        );
        
        let decisao = {
            direcao_final: analiseMarketPulse.direcao_sugerida,
            fonte_decisao: 'MARKET_PULSE_PURO',
            executa_operacoes: analiseMarketPulse.executa_operacoes,
            confianca: analiseMarketPulse.confianca,
            justificativa: `Market Pulse: ${analiseMarketPulse.justificativa}`
        };
        
        this.estatisticas.estrategia_market_pulse++;
        return decisao;
    }
    
    async processarDecisaoDualInteligente(dadosCompletos) {
        console.log('🎯 Processando com estratégia Dual Inteligente...');
        
        const fearGreed = dadosCompletos.fearGreed.value;
        
        // Primeiro avaliar Fear & Greed
        if (fearGreed < DUAL_CONFIG.FEAR_GREED.LONG_THRESHOLD) {
            // Fear extremo - LONG direto
            this.estatisticas.estrategia_dual++;
            return {
                direcao_final: 'SOMENTE_LONG',
                fonte_decisao: 'DUAL_FEAR_EXTREMO',
                executa_operacoes: true,
                confianca: 0.85,
                justificativa: `Fear extremo (${fearGreed}) sobrepõe Market Pulse - LONG garantido`
            };
        }
        
        if (fearGreed > DUAL_CONFIG.FEAR_GREED.SHORT_THRESHOLD) {
            // Greed extremo - SHORT direto
            this.estatisticas.estrategia_dual++;
            return {
                direcao_final: 'SOMENTE_SHORT',
                fonte_decisao: 'DUAL_GREED_EXTREMO',
                executa_operacoes: true,
                confianca: 0.85,
                justificativa: `Greed extremo (${fearGreed}) sobrepõe Market Pulse - SHORT garantido`
            };
        }
        
        // Zona neutra - usar Market Pulse + IA
        console.log('🧠 Zona neutra detectada - ativando Market Pulse + IA...');
        
        const analiseMarketPulse = await this.marketPulse.analisarDirecaoMercado(
            dadosCompletos.marketPulse.metricas
        );
        
        // Se Market Pulse deu direção clara, usar
        if (analiseMarketPulse.executa_operacoes && 
            ['SOMENTE_LONG', 'SOMENTE_SHORT'].includes(analiseMarketPulse.direcao_sugerida)) {
            
            this.estatisticas.estrategia_dual++;
            return {
                direcao_final: analiseMarketPulse.direcao_sugerida,
                fonte_decisao: 'DUAL_MARKET_PULSE',
                executa_operacoes: true,
                confianca: analiseMarketPulse.confianca,
                justificativa: `F&G neutro + Market Pulse claro: ${analiseMarketPulse.justificativa}`,
                fear_greed_value: fearGreed
            };
        }
        
        // Situação indefinida - acionar IA
        console.log('🤖 Situação indefinida - acionando IA especializada...');
        
        let decisaoComIA = {
            direcao_final: 'AGUARDAR_IA',
            fonte_decisao: 'DUAL_IA_REQUIRED',
            executa_operacoes: false,
            fear_greed_value: fearGreed,
            market_pulse_analise: analiseMarketPulse
        };
        
        // Processar com IA
        decisaoComIA = await this.iaMarketPulse.processarDecisaoCompleta(
            dadosCompletos.marketPulse.metricas,
            decisaoComIA
        );
        
        this.estatisticas.estrategia_dual++;
        this.estatisticas.ia_acionada++;
        
        return decisaoComIA;
    }

    // ===============================================
    // 🎯 MÉTODO PRINCIPAL - ANÁLISE COMPLETA
    // ===============================================
    
    async analisarSituacaoCompleta() {
        console.log('\n🚀 === ANÁLISE COMPLETA SISTEMA DUAL ===');
        const inicioAnalise = Date.now();
        
        try {
            this.estatisticas.total_analises++;
            
            // 1. Coletar todos os dados
            const dadosCompletos = await this.coletarDadosCompletos();
            
            if (!dadosCompletos.sucesso) {
                console.warn('⚠️ Dados incompletos - usando estratégia backup');
                return this.gerarDecisaoBackup('Dados incompletos');
            }
            
            // 2. Detectar melhor estratégia
            const estrategiaDetectada = await this.detectarMelhorEstrategia(
                dadosCompletos.fearGreed.value,
                dadosCompletos.marketPulse.metricas
            );
            
            // 3. Processar conforme estratégia detectada
            let decisaoFinal;
            
            switch (estrategiaDetectada.estrategia) {
                case DUAL_CONFIG.ESTRATEGIAS.FEAR_GREED_PURO:
                    decisaoFinal = await this.processarDecisaoFearGreedPuro(dadosCompletos);
                    break;
                    
                case DUAL_CONFIG.ESTRATEGIAS.MARKET_PULSE_PURO:
                    decisaoFinal = await this.processarDecisaoMarketPulsePuro(dadosCompletos);
                    break;
                    
                default: // DUAL_INTELIGENTE
                    decisaoFinal = await this.processarDecisaoDualInteligente(dadosCompletos);
                    break;
            }
            
            // 4. Finalizar análise
            const tempoTotal = Date.now() - inicioAnalise;
            
            // 5. Atualizar estatísticas
            this.atualizarEstatisticasDecisao(decisaoFinal);
            
            // 6. Consolidar resultado final
            const resultadoCompleto = {
                // Decisão principal
                ...decisaoFinal,
                
                // Dados da análise
                timestamp: new Date().toISOString(),
                tempo_analise_ms: tempoTotal,
                estrategia_utilizada: estrategiaDetectada.estrategia,
                estrategia_justificativa: estrategiaDetectada.justificativa,
                
                // Dados coletados
                fear_greed: dadosCompletos.fearGreed,
                market_pulse: dadosCompletos.marketPulse,
                
                // Metadados
                sistema_versao: 'DUAL_INTEGRADO_V1',
                configuracao_ativa: this.configuracao.ESTRATEGIA_ATIVA,
                dados_completos: dadosCompletos.sucesso
            };
            
            // 7. Log da decisão
            await this.logarDecisao(resultadoCompleto);
            
            // 8. Salvar como última decisão
            this.estatisticas.ultima_decisao = resultadoCompleto;
            
            console.log(`\n✅ === ANÁLISE CONCLUÍDA EM ${tempoTotal}ms ===`);
            console.log(`🎯 DECISÃO: ${decisaoFinal.direcao_final} (${decisaoFinal.executa_operacoes ? 'EXECUTA' : 'AGUARDA'})`);
            console.log(`📊 CONFIANÇA: ${(decisaoFinal.confianca * 100).toFixed(0)}%`);
            console.log(`⚙️ ESTRATÉGIA: ${estrategiaDetectada.estrategia}`);
            console.log(`💡 JUSTIFICATIVA: ${decisaoFinal.justificativa}\n`);
            
            return resultadoCompleto;
            
        } catch (error) {
            console.error('❌ Erro crítico na análise completa:', error.message);
            this.estatisticas.erros++;
            
            return this.gerarDecisaoBackup(`Erro crítico: ${error.message}`);
        }
    }
    
    atualizarEstatisticasDecisao(decisao) {
        switch (decisao.direcao_final) {
            case 'SOMENTE_LONG':
                this.estatisticas.decisoes_long++;
                break;
            case 'SOMENTE_SHORT':
                this.estatisticas.decisoes_short++;
                break;
            default:
                this.estatisticas.decisoes_aguardar++;
                break;
        }
    }
    
    gerarDecisaoBackup(motivo) {
        return {
            direcao_final: 'AGUARDAR',
            fonte_decisao: 'BACKUP_SEGURANCA',
            executa_operacoes: false,
            confianca: 0.2,
            justificativa: `Backup ativado: ${motivo}`,
            timestamp: new Date().toISOString(),
            erro: true,
            sistema_versao: 'DUAL_INTEGRADO_V1'
        };
    }

    // ===============================================
    // 📝 SISTEMA DE LOGS
    // ===============================================
    
    async logarDecisao(decisao) {
        if (!DUAL_CONFIG.LOGS.ATIVO) return;
        
        try {
            const logEntry = {
                timestamp: decisao.timestamp,
                decisao: decisao.direcao_final,
                executa: decisao.executa_operacoes,
                confianca: decisao.confianca,
                estrategia: decisao.estrategia_utilizada,
                fear_greed: decisao.fear_greed?.value,
                pm_plus: decisao.market_pulse?.metricas?.PM_PLUS,
                vwd: decisao.market_pulse?.metricas?.VWD,
                justificativa: decisao.justificativa,
                tempo_ms: decisao.tempo_analise_ms
            };
            
            const logLine = JSON.stringify(logEntry) + '\n';
            
            await fs.appendFile(DUAL_CONFIG.LOGS.ARQUIVO, logLine);
            
        } catch (error) {
            console.warn('⚠️ Erro ao salvar log:', error.message);
        }
    }

    // ===============================================
    // 📊 ESTATÍSTICAS E MONITORAMENTO
    // ===============================================
    
    obterEstatisticasCompletas() {
        return {
            ...this.estatisticas,
            configuracao: this.configuracao,
            performance: {
                cache_size: this.cache.size,
                memory_usage: process.memoryUsage(),
                uptime: process.uptime()
            },
            market_pulse_stats: this.marketPulse.obterEstatisticas(),
            ia_stats: this.iaMarketPulse.obterEstatisticasCompletas()
        };
    }
    
    resetarEstatisticas() {
        this.estatisticas = {
            total_analises: 0,
            estrategia_fear_greed: 0,
            estrategia_market_pulse: 0,
            estrategia_dual: 0,
            ia_acionada: 0,
            decisoes_long: 0,
            decisoes_short: 0,
            decisoes_aguardar: 0,
            erros: 0,
            ultima_decisao: null
        };
        
        console.log('📊 Estatísticas resetadas');
    }

    // ===============================================
    // ⚙️ CONFIGURAÇÃO DINÂMICA
    // ===============================================
    
    atualizarConfiguracao(novaConfig) {
        Object.assign(this.configuracao, novaConfig);
        console.log('⚙️ Configuração atualizada:', novaConfig);
    }
    
    alterarEstrategia(novaEstrategia) {
        if (Object.values(DUAL_CONFIG.ESTRATEGIAS).includes(novaEstrategia)) {
            this.configuracao.ESTRATEGIA_ATIVA = novaEstrategia;
            console.log(`🔄 Estratégia alterada para: ${novaEstrategia}`);
        } else {
            console.warn('⚠️ Estratégia inválida:', novaEstrategia);
        }
    }
}

// ===============================================
// 🎯 FUNÇÃO PRINCIPAL PARA INTEGRAÇÃO
// ===============================================

async function executarAnaliseCompleta() {
    const sistema = new SistemaDualIntegrado();
    return await sistema.analisarSituacaoCompleta();
}

// ===============================================
// 🎯 EXPORTAÇÃO
// ===============================================

module.exports = {
    SistemaDualIntegrado,
    executarAnaliseCompleta,
    DUAL_CONFIG
};
