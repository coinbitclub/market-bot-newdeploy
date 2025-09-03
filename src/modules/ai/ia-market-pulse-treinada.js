/**
 * ===============================================
 * 🤖 SISTEMA IA TREINADO - MARKET PULSE
 * ===============================================
 * Arquivo: ia-market-pulse-treinada.js
 * Versão: 1.0.0
 * Data: 2025-08-22
 * 
 * 🎯 OBJETIVO:
 * Sistema de IA especializada para análise Market Pulse em zona neutra do Fear & Greed
 * 
 * 🧠 CARACTERÍSTICAS:
 * • Treinamento específico para zona neutra (F&G 30-80)
 * • Análise avançada de PM+, PM-, VWΔ
 * • Decisão conservadora - só autoriza direção clara
 * • NÃO executa em situações neutras/indefinidas
 * • Otimização de chamadas OpenAI para reduzir custos
 */

const axios = require('axios');

// ===============================================
// 🎨 CONFIGURAÇÕES IA
// ===============================================

const IA_CONFIG = {
    // OpenAI
    API_KEY: process.env.OPENAI_API_KEY,
    API_URL: 'https://api.openai.com/v1/chat/completions',
    MODEL: 'gpt-4o-mini', // Modelo mais eficiente
    
    // Limites para economia
    MAX_TOKENS: 150,
    TEMPERATURE: 0.1, // Muito conservador
    TIMEOUT: 10000,
    
    // Cache para evitar chamadas desnecessárias
    CACHE_DURATION: 300000, // 5 minutos
    
    // Thresholds de confiança
    MIN_CONFIDENCE_TO_EXECUTE: 0.6, // Mínimo 60% para autorizar
    MAX_CONFIDENCE_NEUTRAL_ZONE: 0.7, // Máximo 70% em zona neutra
    
    // Otimização de uso
    SKIP_IA_IF_OBVIOUS: true, // Pular IA se condições muito claras
    USE_CACHE: true,
    BATCH_ANALYSIS: false // Futuro: análise em lote
};

// ===============================================
// 🧠 CLASSE IA ESPECIALIZADA
// ===============================================

class IAMarketPulseEspecializada {
    constructor() {
        this.cache = new Map();
        this.totalChamadas = 0;
        this.chamadasEconomizadas = 0;
        this.ultimaLimpezaCache = Date.now();
    }

    // ===============================================
    // 🔧 SISTEMA DE CACHE INTELIGENTE
    // ===============================================
    
    gerarChaveCache(metricas, fearGreed) {
        // Criar chave baseada em métricas arredondadas
        const pm_plus = Math.round(metricas.PM_PLUS);
        const vwd = Math.round(metricas.VWD * 10) / 10; // 1 casa decimal
        const fg = Math.round(fearGreed / 5) * 5; // Grupos de 5
        
        return `${pm_plus}_${vwd}_${fg}`;
    }
    
    obterDoCache(chave) {
        const cached = this.cache.get(chave);
        if (cached && (Date.now() - cached.timestamp) < IA_CONFIG.CACHE_DURATION) {
            this.chamadasEconomizadas++;
            console.log(`💾 Cache hit - economizada chamada IA (${this.chamadasEconomizadas} total)`);
            return cached.resultado;
        }
        return null;
    }
    
    salvarNoCache(chave, resultado) {
        this.cache.set(chave, {
            resultado: resultado,
            timestamp: Date.now()
        });
        
        // Limpeza periódica do cache
        if (Date.now() - this.ultimaLimpezaCache > IA_CONFIG.CACHE_DURATION) {
            this.limparCache();
        }
    }
    
    limparCache() {
        const agora = Date.now();
        for (const [chave, valor] of this.cache.entries()) {
            if (agora - valor.timestamp > IA_CONFIG.CACHE_DURATION) {
                this.cache.delete(chave);
            }
        }
        this.ultimaLimpezaCache = agora;
        console.log(`🧹 Cache limpo - ${this.cache.size} entradas mantidas`);
    }

    // ===============================================
    // 🔍 ANÁLISE PRÉ-IA (ECONOMIA)
    // ===============================================
    
    analisarSemIA(metricas, fearGreed) {
        // Casos óbvios que não precisam de IA
        const { PM_PLUS, PM_MINUS, VWD } = metricas;
        
        // 1. Condições MUITO claras para LONG
        if (PM_PLUS >= 70 && VWD > 1.0) {
            return {
                precisaIA: false,
                resultado: {
                    direcao_ia: 'SOMENTE_LONG',
                    confianca: 0.8,
                    justificativa: `Condições muito claras: ${PM_PLUS.toFixed(1)}% positivas + VWΔ forte`,
                    autoriza_execucao: true
                }
            };
        }
        
        // 2. Condições MUITO claras para SHORT  
        if (PM_MINUS >= 70 && VWD < -1.0) {
            return {
                precisaIA: false,
                resultado: {
                    direcao_ia: 'SOMENTE_SHORT',
                    confianca: 0.8,
                    justificativa: `Condições muito claras: ${PM_MINUS.toFixed(1)}% negativas + VWΔ forte`,
                    autoriza_execucao: true
                }
            };
        }
        
        // 3. Condições MUITO indefinidas
        if (PM_PLUS >= 45 && PM_PLUS <= 55 && Math.abs(VWD) < 0.2) {
            return {
                precisaIA: false,
                resultado: {
                    direcao_ia: 'AGUARDAR',
                    confianca: 0.3,
                    justificativa: 'Mercado muito equilibrado - aguardar movimento mais claro',
                    autoriza_execucao: false
                }
            };
        }
        
        return { precisaIA: true };
    }

    // ===============================================
    // 🧠 PROMPT ESPECIALIZADO E OTIMIZADO
    // ===============================================
    
    gerarPromptEspecializado(metricas, fearGreed) {
        const { PM_PLUS, PM_MINUS, VWD } = metricas;
        
        return `ANÁLISE MARKET PULSE - ESPECIALISTA EM ZONA NEUTRA

CONTEXTO:
Fear & Greed: ${fearGreed} (ZONA NEUTRA 30-80)
PM+ (Moedas Positivas): ${PM_PLUS.toFixed(2)}%
PM- (Moedas Negativas): ${PM_MINUS.toFixed(2)}%
VWΔ (Variação Ponderada): ${VWD.toFixed(3)}%

TREINAMENTO ESPECIALIZADO:
Você é um especialista em Market Pulse para zona neutra do Fear & Greed.
Sua missão: SÓ autorizar execução se direção for MUITO CLARA.

CRITÉRIOS RIGOROSOS:
✅ SOMENTE_LONG se:
   - PM+ > 58% + VWΔ > 0.3% + momentum visível
   - Sinais de força compradora dominante
   
✅ SOMENTE_SHORT se:
   - PM- > 58% + VWΔ < -0.3% + pressão vendedora
   - Sinais de distribuição/medo

❌ AGUARDAR se:
   - Condições mistas ou indefinidas
   - PM+ entre 42-58% sem VWΔ forte
   - Qualquer dúvida = NÃO EXECUTAR

REGRA CRÍTICA: Em dúvida, SEMPRE escolha AGUARDAR.
Sistema NÃO pode executar em direção neutra.

RESPONDA JSON APENAS:
{"direcao_ia":"SOMENTE_LONG|SOMENTE_SHORT|AGUARDAR","confianca":0.0-0.7,"justificativa":"1 linha","autoriza_execucao":true/false}`;
    }

    // ===============================================
    // 🎯 ANÁLISE PRINCIPAL DA IA
    // ===============================================
    
    async analisarComIA(metricas, fearGreed) {
        console.log('🤖 Iniciando análise IA Market Pulse...');
        
        try {
            // 1. Verificar se realmente precisa de IA
            if (IA_CONFIG.SKIP_IA_IF_OBVIOUS) {
                const preAnalise = this.analisarSemIA(metricas, fearGreed);
                if (!preAnalise.precisaIA) {
                    console.log('⚡ Análise resolvida sem IA - condições óbvias');
                    return preAnalise.resultado;
                }
            }
            
            // 2. Verificar cache
            const chaveCache = this.gerarChaveCache(metricas, fearGreed);
            if (IA_CONFIG.USE_CACHE) {
                const cached = this.obterDoCache(chaveCache);
                if (cached) return cached;
            }
            
            // 3. Gerar prompt especializado
            const prompt = this.gerarPromptEspecializado(metricas, fearGreed);
            
            // 4. Chamar OpenAI
            this.totalChamadas++;
            console.log(`🔗 Chamada IA #${this.totalChamadas} (Economia: ${this.chamadasEconomizadas})`);
            
            const response = await axios.post(IA_CONFIG.API_URL, {
                model: IA_CONFIG.MODEL,
                messages: [
                    { 
                        role: 'system', 
                        content: 'Especialista em Market Pulse. Extremamente conservador. Só autoriza execução em direções MUITO claras. Em dúvida = AGUARDAR.' 
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: IA_CONFIG.MAX_TOKENS,
                temperature: IA_CONFIG.TEMPERATURE
            }, {
                headers: {
                    'Authorization': `Bearer ${IA_CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: IA_CONFIG.TIMEOUT
            });

            const aiResponse = JSON.parse(response.data.choices[0].message.content);
            
            // 5. Validar e ajustar resposta
            const resultado = this.validarRespostaIA(aiResponse, metricas);
            
            // 6. Salvar no cache
            if (IA_CONFIG.USE_CACHE) {
                this.salvarNoCache(chaveCache, resultado);
            }
            
            console.log(`🧠 IA decidiu: ${resultado.direcao_ia} (Conf: ${(resultado.confianca * 100).toFixed(0)}%)`);
            
            return resultado;

        } catch (error) {
            console.warn('⚠️ Erro na análise IA:', error.message);
            
            // Fallback seguro - sempre AGUARDAR em caso de erro
            return {
                direcao_ia: 'AGUARDAR',
                confianca: 0.2,
                justificativa: 'Erro na análise IA - aguardando por segurança',
                autoriza_execucao: false,
                erro: true
            };
        }
    }

    // ===============================================
    // ✅ VALIDAÇÃO E SEGURANÇA
    // ===============================================
    
    validarRespostaIA(aiResponse, metricas) {
        // 1. Validar campos obrigatórios
        if (!aiResponse.direcao_ia || !aiResponse.justificativa) {
            throw new Error('Resposta IA incompleta');
        }
        
        // 2. Validar direções permitidas
        const direcoesValidas = ['SOMENTE_LONG', 'SOMENTE_SHORT', 'AGUARDAR'];
        if (!direcoesValidas.includes(aiResponse.direcao_ia)) {
            aiResponse.direcao_ia = 'AGUARDAR';
            aiResponse.autoriza_execucao = false;
        }
        
        // 3. Validar confiança
        let confianca = parseFloat(aiResponse.confianca) || 0.4;
        confianca = Math.min(confianca, IA_CONFIG.MAX_CONFIDENCE_NEUTRAL_ZONE); // Máximo 70% em zona neutra
        confianca = Math.max(confianca, 0.2); // Mínimo 20%
        
        // 4. Aplicar regra de confiança mínima
        let autorizaExecucao = aiResponse.autoriza_execucao;
        if (confianca < IA_CONFIG.MIN_CONFIDENCE_TO_EXECUTE) {
            autorizaExecucao = false;
            aiResponse.direcao_ia = 'AGUARDAR';
        }
        
        // 5. Regra de segurança - nunca autorizar em zona muito neutra
        if (metricas.PM_PLUS >= 48 && metricas.PM_PLUS <= 52 && Math.abs(metricas.VWD) < 0.3) {
            autorizaExecucao = false;
            aiResponse.direcao_ia = 'AGUARDAR';
            confianca = Math.min(confianca, 0.4);
        }
        
        return {
            direcao_ia: aiResponse.direcao_ia,
            confianca: confianca,
            justificativa: aiResponse.justificativa,
            autoriza_execucao: autorizaExecucao,
            ia_version: 'ESPECIALIZADA_V1',
            validada: true
        };
    }

    // ===============================================
    // 📊 ESTATÍSTICAS E MONITORAMENTO
    // ===============================================
    
    obterEstatisticas() {
        return {
            total_chamadas_ia: this.totalChamadas,
            chamadas_economizadas: this.chamadasEconomizadas,
            taxa_economia: this.totalChamadas > 0 ? 
                ((this.chamadasEconomizadas / (this.totalChamadas + this.chamadasEconomizadas)) * 100).toFixed(1) + '%' : '0%',
            cache_size: this.cache.size,
            configuracao: {
                modelo: IA_CONFIG.MODEL,
                max_tokens: IA_CONFIG.MAX_TOKENS,
                temperatura: IA_CONFIG.TEMPERATURE,
                cache_ativo: IA_CONFIG.USE_CACHE,
                economia_ativa: IA_CONFIG.SKIP_IA_IF_OBVIOUS
            }
        };
    }
    
    resetarEstatisticas() {
        this.totalChamadas = 0;
        this.chamadasEconomizadas = 0;
        this.cache.clear();
        console.log('📊 Estatísticas IA resetadas');
    }

    // ===============================================
    // 🔧 CONFIGURAÇÃO DINÂMICA
    // ===============================================
    
    atualizarConfiguracoes(novasConfigs) {
        Object.assign(IA_CONFIG, novasConfigs);
        console.log('⚙️ Configurações IA atualizadas:', novasConfigs);
    }
    
    obterConfiguracoes() {
        return { ...IA_CONFIG };
    }
}

// ===============================================
// 🎯 INTEGRAÇÃO COM MARKET PULSE
// ===============================================

class IntegradorIAMarketPulse {
    constructor() {
        this.ia = new IAMarketPulseEspecializada();
        this.ultimaAnalise = null;
    }
    
    async processarDecisaoCompleta(metricas, decisaoInicial) {
        console.log('🎯 Processando decisão com IA especializada...');
        
        // Só usar IA se necessário
        if (decisaoInicial.direcao_final !== 'AGUARDAR_IA') {
            console.log('⚡ IA não necessária - decisão já definida');
            return decisaoInicial;
        }
        
        try {
            // Análise com IA
            const analiseIA = await this.ia.analisarComIA(metricas, decisaoInicial.fear_greed_value);
            
            // Aplicar resultado da IA
            if (analiseIA.autoriza_execucao && ['SOMENTE_LONG', 'SOMENTE_SHORT'].includes(analiseIA.direcao_ia)) {
                decisaoInicial.direcao_final = analiseIA.direcao_ia;
                decisaoInicial.fonte_decisao = 'IA_ESPECIALIZADA';
                decisaoInicial.confianca = analiseIA.confianca;
                decisaoInicial.justificativa = `IA: ${analiseIA.justificativa}`;
                decisaoInicial.executa_operacoes = true;
            } else {
                // IA decidiu aguardar
                decisaoInicial.direcao_final = 'AGUARDAR';
                decisaoInicial.fonte_decisao = 'IA_AGUARDAR';
                decisaoInicial.executa_operacoes = false;
                decisaoInicial.justificativa = `IA: ${analiseIA.justificativa} - Aguardando clareza`;
            }
            
            // Adicionar detalhes da análise IA
            decisaoInicial.analise_ia = {
                ...analiseIA,
                estatisticas: this.ia.obterEstatisticas()
            };
            
            this.ultimaAnalise = analiseIA;
            
            console.log(`🧠 Decisão IA final: ${decisaoInicial.direcao_final} (${decisaoInicial.executa_operacoes ? 'EXECUTA' : 'AGUARDA'})`);
            
            return decisaoInicial;
            
        } catch (error) {
            console.error('❌ Erro na integração IA:', error.message);
            
            // Fallback seguro
            decisaoInicial.direcao_final = 'AGUARDAR';
            decisaoInicial.executa_operacoes = false;
            decisaoInicial.fonte_decisao = 'IA_ERROR_AGUARDAR';
            decisaoInicial.justificativa = 'Erro na IA - aguardando por segurança';
            
            return decisaoInicial;
        }
    }
    
    obterEstatisticasCompletas() {
        return {
            ia_stats: this.ia.obterEstatisticas(),
            ultima_analise: this.ultimaAnalise,
            configuracao_ativa: this.ia.obterConfiguracoes()
        };
    }
}

// ===============================================
// 🎯 EXPORTAÇÃO
// ===============================================

module.exports = {
    IAMarketPulseEspecializada,
    IntegradorIAMarketPulse,
    IA_CONFIG
};
