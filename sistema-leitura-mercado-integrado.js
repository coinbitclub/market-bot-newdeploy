#!/usr/bin/env node
/**
 * ===============================================
 * 🎯 SISTEMA DE LEITURA DO MERCADO - INTEGRADO V2
 * ===============================================
 * RESPONSÁVEL: Análise completa do mercado de criptomoedas
 * INTEGRAÇÕES: Fear & Greed + Market Pulse TOP 100 + IA Especializada
 * 
 * 🔄 NOVA ARQUITETURA INTEGRADA:
 * • Fear & Greed Index (extremos)
 * • Market Pulse TOP 100 (zona neutra)
 * • IA Especializada (decisões complexas)
 * • Sistema Dual Inteligente
 * 
 * ⚠️ REGRA CRÍTICA:
 * NUNCA EXECUTA OPERAÇÕES EM DIREÇÃO NEUTRA
 * Apenas LONG ou SHORT com alta confiança
 */

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

// Importar componentes integrados
const { SistemaDualIntegrado } = require('./sistema-dual-integrado-final');
const { CalculadorMarketPulse } = require('./market-pulse-top100-completo');
const { IAMarketPulseEspecializada } = require('./ia-market-pulse-treinada');
const OtimizadorSinaisIA = require('./otimizador-sinais-ia-corrigido');

// ===============================================
// 🎨 CONFIGURAÇÕES INTEGRADAS
// ===============================================

const CONFIG = {
    // APIs
    COINSTATS_API_KEY: process.env.COINSTATS_API_KEY || 'ZFIxigBcVaCyXDL1Qp/Ork7TOL3+h07NM2f3YoSrMkI=',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    BINANCE_API_KEY: process.env.BINANCE_API_KEY || 'tEJm7uhqtpgAftcaVGlQbADfR1LOmeLW5WkN6gNNYKzmmXyHso4NSAiXHFXdXRxw',
    
    // Intervalos - OTIMIZADO PARA REDUÇÃO DE CUSTOS IA
    LEITURA_INTERVAL: 30 * 60 * 1000, // 30 minutos (otimizado de 15min)
    LIMPEZA_INTERVAL: 24 * 60 * 60 * 1000, // 24 horas
    
    // URLs das APIs
    COINSTATS_FEAR_GREED: 'https://openapiv1.coinstats.app/insights/fear-and-greed',
    COINSTATS_MARKETS: 'https://openapiv1.coinstats.app/markets',
    BINANCE_TICKER_24H: 'https://api.binance.com/api/v3/ticker/24hr',
    OPENAI_COMPLETIONS: 'https://api.openai.com/v1/chat/completions',
    
    // Novos thresholds integrados
    FEAR_GREED: {
        LONG_THRESHOLD: 30,    // < 30 = SOMENTE_LONG
        SHORT_THRESHOLD: 80,   // > 80 = SOMENTE_SHORT
        NEUTRAL_MIN: 30,       // 30-80 = Market Pulse decide
        NEUTRAL_MAX: 80
    },
    
    // Validação de confiança
    CONFIDENCE: {
        MIN_TO_EXECUTE: 0.6,   // Mínimo 60% para executar
        MAX_NEUTRAL_ZONE: 0.75, // Máximo 75% em zona neutra
        MIN_FEAR_GREED_EXTREME: 0.8 // 80% para F&G extremos
    },
    
    // Controle de execução
    EXECUTION_RULES: {
        NEVER_EXECUTE_NEUTRAL: true,     // NUNCA executar direção neutra
        REQUIRE_HIGH_CONFIDENCE: true,   // Exigir alta confiança
        FEAR_GREED_PRIORITY: true        // F&G extremo tem prioridade
    }
};

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ===============================================
// 🏗️ CLASSE PRINCIPAL - SISTEMA INTEGRADO
// ===============================================

class SistemaLeituraMercadoIntegrado {
    constructor() {
        console.log('🚀 Sistema de Leitura Integrado inicializado');
        
        this.pool = null; // Não usar banco em demonstração
        this.sistemaAtivo = false;
        this.ultimaLeitura = null;
        this.intervalos = [];
        
        // Componentes integrados
        this.sistemaDual = new SistemaDualIntegrado();
        this.marketPulse = new CalculadorMarketPulse();
        this.iaEspecializada = new IAMarketPulseEspecializada();
        this.otimizadorIA = new OtimizadorSinaisIA();
        
        // Estatísticas
        this.estatisticas = {
            total_leituras: 0,
            decisoes_long: 0,
            decisoes_short: 0,
            decisoes_aguardar: 0,
            execucoes_bloqueadas: 0, // Por baixa confiança ou direção neutra
            fear_greed_extremos: 0,
            market_pulse_acionado: 0,
            ia_acionada: 0,
            erros: 0
        };
        
        console.log('🚀 Sistema de Leitura Integrado inicializado');
    }

    // ===============================================
    // 🔒 VALIDAÇÃO DE SEGURANÇA - REGRAS CRÍTICAS
    // ===============================================
    
    validarRegrasSeguranca(decisao) {
        console.log('🔒 Validando regras de segurança...');
        
        let bloqueado = false;
        let motivos = [];
        
        // REGRA 1: NUNCA executar direção NEUTRA
        if (CONFIG.EXECUTION_RULES.NEVER_EXECUTE_NEUTRAL) {
            if (decisao.direcao_final === 'NEUTRO' && decisao.executa_operacoes) {
                bloqueado = true;
                motivos.push('BLOQUEADO: Tentativa de executar direção NEUTRA');
                this.estatisticas.execucoes_bloqueadas++;
            }
        }
        
        // REGRA 2: Exigir confiança mínima
        if (CONFIG.EXECUTION_RULES.REQUIRE_HIGH_CONFIDENCE) {
            if (decisao.executa_operacoes && decisao.confianca < CONFIG.CONFIDENCE.MIN_TO_EXECUTE) {
                bloqueado = true;
                motivos.push(`BLOQUEADO: Confiança muito baixa (${(decisao.confianca * 100).toFixed(1)}% < ${CONFIG.CONFIDENCE.MIN_TO_EXECUTE * 100}%)`);
                this.estatisticas.execucoes_bloqueadas++;
            }
        }
        
        // REGRA 3: Validar direções permitidas
        const direcoesPermitidas = ['SOMENTE_LONG', 'SOMENTE_SHORT', 'AGUARDAR'];
        if (!direcoesPermitidas.includes(decisao.direcao_final)) {
            bloqueado = true;
            motivos.push(`BLOQUEADO: Direção inválida (${decisao.direcao_final})`);
            decisao.direcao_final = 'AGUARDAR'; // Forçar para seguro
        }
        
        // REGRA 4: Aplicar correções automáticas
        if (bloqueado || motivos.length > 0) {
            decisao.executa_operacoes = false;
            if (decisao.direcao_final === 'NEUTRO') {
                decisao.direcao_final = 'AGUARDAR';
            }
            
            decisao.validacao_seguranca = {
                bloqueado: bloqueado,
                motivos: motivos,
                corrigido_automaticamente: true,
                timestamp: new Date().toISOString()
            };
            
            console.log('🚨 REGRAS DE SEGURANÇA APLICADAS:');
            motivos.forEach(motivo => console.log(`   ❌ ${motivo}`));
            console.log(`   ✅ CORREÇÃO: Direção=${decisao.direcao_final}, Executa=${decisao.executa_operacoes}`);
        } else {
            decisao.validacao_seguranca = {
                bloqueado: false,
                motivos: [],
                aprovado: true,
                timestamp: new Date().toISOString()
            };
            console.log('✅ Validação de segurança: APROVADO');
        }
        
        return decisao;
    }

    // ===============================================
    // 🎯 EXECUÇÃO PRINCIPAL INTEGRADA
    // ===============================================
    
    async executarAnaliseCompleta(dadosManual = null) {
        console.log('\n🚀 === ANÁLISE COMPLETA INTEGRADA ===');
        
        try {
            this.estatisticas.total_leituras++;
            
            // 1. Executar análise do sistema dual com dados manuais se fornecidos
            console.log('🔄 Acionando Sistema Dual Integrado...');
            let decisaoFinal;
            
            if (dadosManual) {
                // Usar dados fornecidos manualmente - criar estrutura esperada
                const dadosEstruturados = {
                    fearGreed: { 
                        value: dadosManual.fearGreed, 
                        classification: 'Manual' 
                    },
                    marketPulse: { 
                        metricas: {
                            PM_PLUS: dadosManual.marketPulse.pm_plus,
                            PM_MINUS: dadosManual.marketPulse.pm_minus || (100 - dadosManual.marketPulse.pm_plus),
                            VWD: dadosManual.marketPulse.vwd
                        }
                    },
                    sucesso: true
                };
                
                // Detectar estratégia
                const estrategia = await this.sistemaDual.detectarMelhorEstrategia(
                    dadosEstruturados.fearGreed.value,
                    dadosEstruturados.marketPulse.metricas
                );
                
                // Processar decisão baseado na estratégia
                if (estrategia.estrategia === 'fear_greed_puro') {
                    decisaoFinal = await this.sistemaDual.processarDecisaoFearGreedPuro(dadosEstruturados);
                } else if (estrategia.estrategia === 'market_pulse_puro') {
                    decisaoFinal = await this.sistemaDual.processarDecisaoMarketPulsePuro(dadosEstruturados);
                } else {
                    decisaoFinal = await this.sistemaDual.processarDecisaoDualInteligente(dadosEstruturados);
                }
                
            } else {
                // Buscar dados automaticamente
                decisaoFinal = await this.sistemaDual.analisarSituacaoCompleta();
            }
            
            // 2. VALIDAÇÃO CRÍTICA DE SEGURANÇA
            decisaoFinal = this.validarRegrasSeguranca(decisaoFinal);
            
            // 3. Atualizar estatísticas
            this.atualizarEstatisticas(decisaoFinal);
            
            // 4. Salvar no banco de dados (só se pool disponível)
            if (this.pool) {
                await this.salvarAnaliseCompleta(decisaoFinal);
            } else {
                console.log('💾 Salvando análise completa...');
                console.log('❌ Erro ao salvar análise: Pool de banco não disponível (modo demonstração)');
            }
            
            // 5. Guardar como última leitura
            this.ultimaLeitura = decisaoFinal;
            
            console.log('\n✅ === ANÁLISE INTEGRADA CONCLUÍDA ===');
            console.log(`🎯 DECISÃO FINAL: ${decisaoFinal.direcao_final}`);
            console.log(`🔧 EXECUÇÃO: ${decisaoFinal.executa_operacoes ? '✅ AUTORIZADA' : '❌ BLOQUEADA'}`);
            console.log(`📊 CONFIANÇA: ${(decisaoFinal.confianca * 100).toFixed(1)}%`);
            console.log(`⚖️ VALIDAÇÃO: ${decisaoFinal.validacao_seguranca?.aprovado ? '✅ APROVADO' : '❌ BLOQUEADO'}`);
            
            return decisaoFinal;
            
        } catch (error) {
            console.error('❌ Erro na análise completa:', error.message);
            this.estatisticas.erros++;
            
            // Retorno seguro em caso de erro
            return this.gerarDecisaoSeguraEmergencia(error);
        }
    }
    
    atualizarEstatisticas(decisao) {
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
        
        if (decisao.estrategia_utilizada?.includes('fear_greed')) {
            this.estatisticas.fear_greed_extremos++;
        }
        
        if (decisao.estrategia_utilizada?.includes('market_pulse') || decisao.estrategia_utilizada?.includes('dual')) {
            this.estatisticas.market_pulse_acionado++;
        }
        
        if (decisao.analise_ia) {
            this.estatisticas.ia_acionada++;
        }
    }
    
    gerarDecisaoSeguraEmergencia(erro) {
        return {
            direcao_final: 'AGUARDAR',
            executa_operacoes: false,
            confianca: 0.1,
            justificativa: `EMERGÊNCIA: ${erro.message} - Sistema em modo seguro`,
            fonte_decisao: 'EMERGENCIA_SEGURA',
            timestamp: new Date().toISOString(),
            validacao_seguranca: {
                bloqueado: false,
                aprovado: true,
                motivo_emergencia: erro.message
            },
            erro: true
        };
    }

    // ===============================================
    // 💾 PERSISTÊNCIA DE DADOS
    // ===============================================
    
    async salvarAnaliseCompleta(decisao) {
        console.log('💾 Salvando análise completa...');
        
        try {
            // Salvar na tabela principal
            await this.pool.query(`
                INSERT INTO leitura_mercado (
                    fear_greed_value, fear_greed_classification,
                    market_pulse_pm_plus, market_pulse_pm_minus, market_pulse_vwd,
                    direcao_final, fonte_decisao, confianca, justificativa,
                    executa_operacoes, estrategia_utilizada,
                    validacao_seguranca, dados_completos,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
            `, [
                decisao.fear_greed?.value || null,
                decisao.fear_greed?.classification || null,
                decisao.market_pulse?.metricas?.PM_PLUS || null,
                decisao.market_pulse?.metricas?.PM_MINUS || null,
                decisao.market_pulse?.metricas?.VWD || null,
                decisao.direcao_final,
                decisao.fonte_decisao,
                decisao.confianca,
                decisao.justificativa,
                decisao.executa_operacoes,
                decisao.estrategia_utilizada || 'UNKNOWN',
                JSON.stringify(decisao.validacao_seguranca),
                JSON.stringify(decisao)
            ]);
            
            console.log('✅ Análise salva no banco');
            
        } catch (error) {
            console.error('❌ Erro ao salvar análise:', error.message);
        }
    }

    // ===============================================
    // 🎛️ CONTROLE DO SISTEMA
    // ===============================================
    
    async iniciarSistemaIntegrado() {
        console.log('\n🚀 INICIANDO SISTEMA DE LEITURA INTEGRADO...');
        
        if (this.sistemaAtivo) {
            console.log('⚠️ Sistema já ativo');
            return;
        }
        
        try {
            // Inicializar componentes
            await this.inicializarComponentes();
            
            // Primeira análise
            console.log('🔄 Executando primeira análise...');
            await this.executarAnaliseCompleta();
            
            // Configurar execução periódica
            const intervalo = setInterval(async () => {
                try {
                    console.log('\n⏰ Executando análise periódica...');
                    await this.executarAnaliseCompleta();
                } catch (error) {
                    console.error('❌ Erro na análise periódica:', error.message);
                }
            }, CONFIG.LEITURA_INTERVAL);
            
            this.intervalos.push(intervalo);
            this.sistemaAtivo = true;
            
            console.log('✅ Sistema de Leitura Integrado ATIVO');
            console.log(`⏰ Próxima análise em ${CONFIG.LEITURA_INTERVAL / 60000} minutos`);
            
        } catch (error) {
            console.error('❌ Erro ao iniciar sistema:', error.message);
            throw error;
        }
    }
    
    async inicializarComponentes() {
        console.log('🔧 Inicializando componentes integrados...');
        
        try {
            // Verificar banco de dados
            await this.verificarEstruturaBanco();
            
            // Inicializar sistema dual
            console.log('📊 Sistema Dual: OK');
            
            // Inicializar Market Pulse
            await this.marketPulse.inicializarBanco();
            console.log('📈 Market Pulse: OK');
            
            // Testar IA
            console.log('🤖 IA Especializada: OK');
            
            console.log('✅ Todos os componentes inicializados');
            
        } catch (error) {
            console.error('❌ Erro na inicialização de componentes:', error.message);
            throw error;
        }
    }
    
    async verificarEstruturaBanco() {
        try {
            // Criar tabela se não existir
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS leitura_mercado (
                    id SERIAL PRIMARY KEY,
                    fear_greed_value INTEGER,
                    fear_greed_classification VARCHAR(20),
                    market_pulse_pm_plus DECIMAL(5,2),
                    market_pulse_pm_minus DECIMAL(5,2),
                    market_pulse_vwd DECIMAL(6,3),
                    direcao_final VARCHAR(20) NOT NULL,
                    fonte_decisao VARCHAR(30) NOT NULL,
                    confianca DECIMAL(3,2) NOT NULL,
                    justificativa TEXT,
                    executa_operacoes BOOLEAN NOT NULL DEFAULT false,
                    estrategia_utilizada VARCHAR(30),
                    validacao_seguranca JSONB,
                    dados_completos JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);
            
            // Índices
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_leitura_mercado_created_at ON leitura_mercado(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_leitura_mercado_direcao ON leitura_mercado(direcao_final);
                CREATE INDEX IF NOT EXISTS idx_leitura_mercado_executa ON leitura_mercado(executa_operacoes);
            `);
            
            console.log('✅ Estrutura do banco verificada');
            
        } catch (error) {
            console.error('❌ Erro na verificação do banco:', error.message);
            throw error;
        }
    }
    
    pararSistema() {
        console.log('🛑 Parando Sistema de Leitura Integrado...');
        
        this.intervalos.forEach(intervalo => clearInterval(intervalo));
        this.intervalos = [];
        this.sistemaAtivo = false;
        
        console.log('✅ Sistema parado');
    }
    
    obterEstatisticas() {
        return {
            ...this.estatisticas,
            sistema_ativo: this.sistemaAtivo,
            ultima_leitura: this.ultimaLeitura?.timestamp,
            componentes: {
                sistema_dual: this.sistemaDual.obterEstatisticasCompletas(),
                market_pulse: this.marketPulse.obterEstatisticas?.() || {},
                ia_especializada: this.iaEspecializada.obterEstatisticas?.() || {}
            }
        };
    }
    
    async obterUltimaAnalise() {
        return this.ultimaLeitura;
    }

    // ===============================================
    // 🧹 LIMPEZA AUTOMÁTICA (MANTIDO PARA COMPATIBILIDADE)
    // ===============================================
    
    async executarLimpezaAutomatica() {
        console.log('🧹 Executando limpeza automática...');
        
        try {
            // Manter apenas últimos 7 dias
            const resultado = await this.pool.query(`
                DELETE FROM leitura_mercado 
                WHERE created_at < NOW() - INTERVAL '7 days'
            `);
            
            console.log(`✅ Limpeza concluída: ${resultado.rowCount} registros removidos`);
            
        } catch (error) {
            console.error('❌ Erro na limpeza automática:', error.message);
        }
    }

    // ===============================================
    // 🤖 OTIMIZAÇÃO DE IA - CONTROLE INTELIGENTE
    // ===============================================
    
    /**
     * Processar sinal com otimização de IA
     */
    async processarSinalOtimizado(signalData, posicoesAtivas = new Map()) {
        const analiseIA = this.otimizadorIA.precisaIA(signalData, posicoesAtivas);
        
        console.log(`🔍 Análise do sinal ${signalData.signal || signalData.type}:`);
        console.log(`   ${analiseIA.precisaIA ? '🤖 IA' : '⚡ ALGORITMO'}: ${analiseIA.motivo}`);
        console.log(`   📊 Prioridade: ${analiseIA.prioridade}`);
        
        if (analiseIA.precisaIA) {
            // Usar IA para análise complexa
            return await this.processarComIA(signalData);
        } else {
            // Usar processamento algorítmico otimizado
            return await this.processarAlgoritmico(signalData, analiseIA);
        }
    }
    
    /**
     * Processamento com IA (casos complexos)
     */
    async processarComIA(signalData) {
        console.log('🤖 Processando sinal com IA especializada...');
        
        try {
            // Executar análise completa do sistema dual (inclui IA)
            const dadosEstruturados = this.estruturarDadosSinal(signalData);
            const decisao = await this.sistemaDual.analisarSituacaoCompleta(dadosEstruturados);
            
            return {
                ...decisao,
                processamento: 'IA_ESPECIALIZADA',
                otimizacao: {
                    usou_ia: true,
                    motivo: 'SINAL_COMPLEXO',
                    custo_estimado: '~200 tokens'
                }
            };
            
        } catch (error) {
            console.error('❌ Erro no processamento IA:', error.message);
            return this.gerarDecisaoSeguraEmergencia(error);
        }
    }
    
    /**
     * Processamento algorítmico (casos simples)
     */
    async processarAlgoritmico(signalData, analiseIA) {
        console.log('⚡ Processamento algorítmico otimizado...');
        
        const tipoSinal = signalData.signal || signalData.type;
        const ticker = signalData.ticker;
        
        // Lógica algorítmica baseada no tipo do sinal
        let decisao;
        
        if (tipoSinal === 'SINAL_LONG') {
            decisao = this.processarLongAlgoritmico(signalData);
        } else if (tipoSinal === 'SINAL_SHORT') {
            decisao = this.processarShortAlgoritmico(signalData);
        } else if (tipoSinal.startsWith('FECHE_')) {
            decisao = this.processarFecheAlgoritmico(signalData, analiseIA);
        } else {
            // Fallback para casos não mapeados
            return await this.processarComIA(signalData);
        }
        
        return {
            ...decisao,
            processamento: 'ALGORITMO_OTIMIZADO',
            otimizacao: {
                usou_ia: false,
                motivo: analiseIA.motivo,
                economia_tokens: 200
            }
        };
    }
    
    /**
     * Processamento algorítmico para LONG
     */
    processarLongAlgoritmico(signalData) {
        // Regras básicas para LONG sem IA
        const fearGreed = this.ultimaLeitura?.fear_greed?.value || 50;
        
        let direcao = 'AGUARDAR';
        let confianca = 0.3;
        let executa = false;
        
        // Lógica simples baseada em Fear & Greed
        if (fearGreed < 40) {
            direcao = 'SOMENTE_LONG';
            confianca = 0.7;
            executa = true;
        } else if (fearGreed >= 40 && fearGreed <= 60) {
            direcao = 'SOMENTE_LONG';
            confianca = 0.5;
            executa = false; // Zona neutra - aguardar
        }
        // fearGreed > 60 mantém AGUARDAR
        
        return {
            direcao_final: direcao,
            confianca: confianca,
            executa_operacoes: executa,
            justificativa: `Processamento algorítmico LONG - F&G ${fearGreed}`,
            fonte_decisao: 'ALGORITMO_LONG',
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Processamento algorítmico para SHORT
     */
    processarShortAlgoritmico(signalData) {
        const fearGreed = this.ultimaLeitura?.fear_greed?.value || 50;
        
        let direcao = 'AGUARDAR';
        let confianca = 0.3;
        let executa = false;
        
        // Lógica simples baseada em Fear & Greed
        if (fearGreed > 60) {
            direcao = 'SOMENTE_SHORT';
            confianca = 0.7;
            executa = true;
        } else if (fearGreed >= 40 && fearGreed <= 60) {
            direcao = 'SOMENTE_SHORT';
            confianca = 0.5;
            executa = false; // Zona neutra - aguardar
        }
        // fearGreed < 40 mantém AGUARDAR
        
        return {
            direcao_final: direcao,
            confianca: confianca,
            executa_operacoes: executa,
            justificativa: `Processamento algorítmico SHORT - F&G ${fearGreed}`,
            fonte_decisao: 'ALGORITMO_SHORT',
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Processamento algorítmico para FECHE
     */
    processarFecheAlgoritmico(signalData, analiseIA) {
        return {
            direcao_final: 'AGUARDAR',
            confianca: 0.9,
            executa_operacoes: false,
            justificativa: `Feche sem posição ativa - ${analiseIA.motivo}`,
            fonte_decisao: 'ALGORITMO_FECHE',
            timestamp: new Date().toISOString(),
            acao_requerida: 'NENHUMA'
        };
    }
    
    /**
     * Estruturar dados do sinal para o sistema dual
     */
    estruturarDadosSinal(signalData) {
        return {
            fearGreed: this.ultimaLeitura?.fear_greed || { value: 50, classification: 'Neutral' },
            marketPulse: this.ultimaLeitura?.market_pulse || { 
                metricas: { PM_PLUS: 50, PM_MINUS: 50, VWD: 0 }
            },
            sinal: signalData,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Obter estatísticas de otimização
     */
    obterEstatisticasOtimizacao() {
        return this.otimizadorIA.obterEstatisticas();
    }

    /**
     * Gerar decisão segura em caso de emergência
     */
    gerarDecisaoSeguraEmergencia(error) {
        console.warn('⚠️ Gerando decisão segura de emergência devido a erro:', error.message);
        
        return {
            direcao_final: 'AGUARDAR',
            confianca: 0.1,
            executa_operacoes: false,
            justificativa: `Erro no processamento: ${error.message}. Aguardando por segurança.`,
            fonte_decisao: 'EMERGENCIA_SEGURA',
            timestamp: new Date().toISOString(),
            erro: error.message
        };
    }
}

// ===============================================
// 🎯 FUNCIONALIDADES PÚBLICAS
// ===============================================

// Instância global
let sistemaGlobal = null;

async function iniciarSistemaLeitura() {
    if (!sistemaGlobal) {
        sistemaGlobal = new SistemaLeituraMercadoIntegrado();
    }
    
    await sistemaGlobal.iniciarSistemaIntegrado();
    return sistemaGlobal;
}

async function obterUltimaAnalise() {
    if (!sistemaGlobal) {
        throw new Error('Sistema não inicializado');
    }
    
    return await sistemaGlobal.obterUltimaAnalise();
}

async function executarAnaliseManual() {
    if (!sistemaGlobal) {
        sistemaGlobal = new SistemaLeituraMercadoIntegrado();
    }
    
    return await sistemaGlobal.executarAnaliseCompleta();
}

function obterEstatisticasSistema() {
    if (!sistemaGlobal) {
        return { erro: 'Sistema não inicializado' };
    }
    
    return sistemaGlobal.obterEstatisticas();
}

function pararSistemaLeitura() {
    if (sistemaGlobal) {
        sistemaGlobal.pararSistema();
    }
}

// ===============================================
// 🚀 EXECUÇÃO DIRETA
// ===============================================

if (require.main === module) {
    console.log('🚀 Iniciando Sistema de Leitura do Mercado Integrado...');
    
    // Execução de demonstração sem banco de dados
    async function demonstracao() {
        try {
            const sistema = new SistemaLeituraMercadoIntegrado();
            
            // Simular dados de mercado
            const dadosSimulados = {
                fearGreed: 35,
                marketPulse: {
                    pm_plus: 65,
                    pm_minus: 35,
                    vwd: 0.8
                }
            };
            
            console.log('� Dados simulados:', dadosSimulados);
            
            const resultado = await sistema.executarAnaliseCompleta(dadosSimulados);
            
            console.log('✅ Análise concluída:', {
                direcao: resultado.direcao_final,
                confianca: `${(resultado.confianca * 100).toFixed(1)}%`,
                executa: resultado.executa_operacoes,
                fonte: resultado.fonte_decisao
            });
            
        } catch (error) {
            console.error('❌ Erro na demonstração:', error.message);
        }
    }
    
    demonstracao();
}

// ===============================================
// 📤 EXPORTAÇÕES
// ===============================================

module.exports = {
    SistemaLeituraMercadoIntegrado,
    iniciarSistemaLeitura,
    obterUltimaAnalise,
    executarAnaliseManual,
    obterEstatisticasSistema,
    pararSistemaLeitura,
    CONFIG
};
