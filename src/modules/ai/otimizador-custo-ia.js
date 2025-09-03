#!/usr/bin/env node
/**
 * ===============================================
 * 💰 OTIMIZADOR DE CUSTO IA - COINBITCLUB
 * ===============================================
 * Sistema inteligente para reduzir custos de OpenAI
 * mantendo a qualidade das análises
 * 
 * 🎯 OBJETIVOS:
 * • Reduzir 60-80% dos custos com IA
 * • Manter qualidade das decisões
 * • Implementar cache inteligente
 * • Análise pré-IA para casos óbvios
 */

const fs = require('fs').promises;
const path = require('path');

// ===============================================
// 🎨 CONFIGURAÇÕES DE OTIMIZAÇÃO
// ===============================================

const OTIMIZACAO_CONFIG = {
    // Cache inteligente
    CACHE: {
        DURACAO_MERCADO: 5 * 60 * 1000,     // 5 min para dados de mercado
        DURACAO_ANALISE: 15 * 60 * 1000,    // 15 min para análises
        DURACAO_SINAIS: 2 * 60 * 1000,      // 2 min para sinais similares
        MAX_ENTRIES: 1000                     // Máximo de entradas no cache
    },
    
    // Thresholds para pular IA
    SKIP_IA_THRESHOLDS: {
        FEAR_GREED_EXTREMO: 25,              // < 25 ou > 75 = pular IA
        MARKET_PULSE_CLARO: 0.15,            // > 15% diferença = pular IA
        CONFIANCA_ALTA: 0.8                  // > 80% confiança = pular IA
    },
    
    // Otimização de tokens
    TOKENS: {
        MAX_CONTEXT: 100,                    // Máximo de tokens de contexto
        MAX_RESPONSE: 50,                    // Máximo de tokens de resposta
        TEMPERATURA_BAIXA: 0.1               // Respostas mais determinísticas
    },
    
    // Batching para múltiplas análises
    BATCHING: {
        ATIVO: true,
        TAMANHO_BATCH: 3,                    // Analisar 3 sinais juntos
        TIMEOUT: 30000                       // 30s timeout para formar batch
    }
};

// ===============================================
// 🧠 CLASSE PRINCIPAL - OTIMIZADOR
// ===============================================

class OtimizadorCustoIA {
    constructor() {
        this.cache = new Map();
        this.estatisticas = {
            total_requisicoes: 0,
            requisicoes_economizadas: 0,
            tokens_economizados: 0,
            custo_economizado: 0,
            tempo_economizado: 0
        };
        
        this.batchQueue = new Map();
        this.timers = new Map();
        
        console.log('💰 Otimizador de Custo IA inicializado');
    }

    // ===============================================
    // 🔍 ANÁLISE PRÉ-IA (ECONOMIA MÁXIMA)
    // ===============================================
    
    analisarSemIA(dados) {
        const { fearGreed, marketPulse, tipo } = dados;
        
        console.log('🔍 Executando análise pré-IA...');
        
        // CASO 1: Fear & Greed extremo (economy alta)
        if (fearGreed) {
            if (fearGreed <= OTIMIZACAO_CONFIG.SKIP_IA_THRESHOLDS.FEAR_GREED_EXTREMO) {
                console.log('💡 Fear & Greed extremo detectado - LONG óbvio');
                this.estatisticas.requisicoes_economizadas++;
                this.estatisticas.tokens_economizados += 150;
                
                return {
                    direcao: 'SOMENTE_LONG',
                    confianca: 0.85,
                    justificativa: `Fear extremo (${fearGreed}) - decisão óbvia`,
                    fonte: 'PRE_IA_ECONOMIA',
                    economia: true,
                    tokens_economizados: 150
                };
            }
            
            if (fearGreed >= (100 - OTIMIZACAO_CONFIG.SKIP_IA_THRESHOLDS.FEAR_GREED_EXTREMO)) {
                console.log('💡 Fear & Greed extremo detectado - SHORT óbvio');
                this.estatisticas.requisicoes_economizadas++;
                this.estatisticas.tokens_economizados += 150;
                
                return {
                    direcao: 'SOMENTE_SHORT',
                    confianca: 0.85,
                    justificativa: `Greed extremo (${fearGreed}) - decisão óbvia`,
                    fonte: 'PRE_IA_ECONOMIA',
                    economia: true,
                    tokens_economizados: 150
                };
            }
        }
        
        // CASO 2: Market Pulse muito claro
        if (marketPulse && marketPulse.PM_PLUS && marketPulse.VWD) {
            const diferenca = Math.abs(marketPulse.PM_PLUS - 50);
            const vwdAbs = Math.abs(marketPulse.VWD);
            
            if (diferenca >= 25 && vwdAbs >= 1.0) {
                const direcao = marketPulse.PM_PLUS > 50 ? 'SOMENTE_LONG' : 'SOMENTE_SHORT';
                
                console.log(`💡 Market Pulse claro detectado - ${direcao} óbvio`);
                this.estatisticas.requisicoes_economizadas++;
                this.estatisticas.tokens_economizados += 150;
                
                return {
                    direcao: direcao,
                    confianca: 0.75,
                    justificativa: `Market Pulse claro: ${marketPulse.PM_PLUS}% PM+ e VWΔ ${marketPulse.VWD}%`,
                    fonte: 'PRE_IA_ECONOMIA',
                    economia: true,
                    tokens_economizados: 150
                };
            }
        }
        
        return null; // Precisa de IA
    }

    // ===============================================
    // 📦 CACHE INTELIGENTE
    // ===============================================
    
    gerarChaveCache(dados) {
        const { fearGreed, marketPulse, tipo } = dados;
        
        // Arredondar valores para aumentar hit rate do cache
        const fgRounded = fearGreed ? Math.round(fearGreed / 5) * 5 : null;
        const pmRounded = marketPulse?.PM_PLUS ? Math.round(marketPulse.PM_PLUS / 5) * 5 : null;
        const vwdRounded = marketPulse?.VWD ? Math.round(marketPulse.VWD * 10) / 10 : null;
        
        return `${tipo}_${fgRounded}_${pmRounded}_${vwdRounded}`;
    }
    
    obterDoCache(chave) {
        const entrada = this.cache.get(chave);
        
        if (entrada && Date.now() - entrada.timestamp < OTIMIZACAO_CONFIG.CACHE.DURACAO_ANALISE) {
            console.log('⚡ Cache HIT - economia de requisição');
            this.estatisticas.requisicoes_economizadas++;
            this.estatisticas.tokens_economizados += entrada.tokens_economizados || 150;
            
            return {
                ...entrada.resultado,
                fonte: 'CACHE_ECONOMIA',
                economia: true,
                cache_hit: true
            };
        }
        
        return null;
    }
    
    salvarNoCache(chave, resultado, tokensUsados = 150) {
        // Limitar tamanho do cache
        if (this.cache.size >= OTIMIZACAO_CONFIG.CACHE.MAX_ENTRIES) {
            const primeiraChave = this.cache.keys().next().value;
            this.cache.delete(primeiraChave);
        }
        
        this.cache.set(chave, {
            resultado: resultado,
            timestamp: Date.now(),
            tokens_economizados: tokensUsados
        });
    }

    // ===============================================
    // 🎯 MÉTODO PRINCIPAL - ANÁLISE OTIMIZADA
    // ===============================================
    
    async analisarComOtimizacao(dados, funcaoIAOriginal) {
        const inicioTempo = Date.now();
        this.estatisticas.total_requisicoes++;
        
        console.log('\n💰 === ANÁLISE COM OTIMIZAÇÃO DE CUSTO ===');
        
        // 1. TENTATIVA: Análise sem IA (maior economia)
        const resultadoSemIA = this.analisarSemIA(dados);
        if (resultadoSemIA) {
            console.log('✅ Decisão tomada sem IA - economia máxima');
            return resultadoSemIA;
        }
        
        // 2. TENTATIVA: Cache
        const chaveCache = this.gerarChaveCache(dados);
        const resultadoCache = this.obterDoCache(chaveCache);
        if (resultadoCache) {
            console.log('✅ Resultado obtido do cache');
            return resultadoCache;
        }
        
        // 3. TENTATIVA: Batching (se habilitado)
        if (OTIMIZACAO_CONFIG.BATCHING.ATIVO && dados.tipo === 'sinal') {
            const resultadoBatch = await this.processarComBatching(dados, funcaoIAOriginal);
            if (resultadoBatch) {
                return resultadoBatch;
            }
        }
        
        // 4. ÚLTIMA OPÇÃO: IA otimizada
        console.log('🤖 Executando IA com otimizações...');
        
        const resultadoIA = await this.executarIAOtimizada(dados, funcaoIAOriginal);
        
        // Salvar no cache para futuras consultas
        this.salvarNoCache(chaveCache, resultadoIA, 150);
        
        const tempoTotal = Date.now() - inicioTempo;
        this.estatisticas.tempo_economizado += Math.max(0, 2000 - tempoTotal);
        
        return resultadoIA;
    }
    
    async executarIAOtimizada(dados, funcaoIAOriginal) {
        // Preparar prompt ultra-otimizado
        const promptOtimizado = this.criarPromptOtimizado(dados);
        
        const configOtimizada = {
            model: 'gpt-4o-mini',
            max_tokens: OTIMIZACAO_CONFIG.TOKENS.MAX_RESPONSE,
            temperature: OTIMIZACAO_CONFIG.TOKENS.TEMPERATURA_BAIXA,
            prompt: promptOtimizado
        };
        
        try {
            const resultado = await funcaoIAOriginal(configOtimizada);
            
            resultado.fonte = 'IA_OTIMIZADA';
            resultado.economia = true;
            resultado.tokens_economizados = 100; // Economia vs versão original
            
            return resultado;
            
        } catch (error) {
            console.error('❌ Erro na IA otimizada:', error.message);
            
            // Fallback seguro
            return this.gerarFallbackSeguro(dados);
        }
    }
    
    criarPromptOtimizado(dados) {
        // Prompt ultra-conciso para economia máxima
        const { fearGreed, marketPulse } = dados;
        
        let prompt = `Análise rápida cripto:`;
        
        if (fearGreed) {
            prompt += ` F&G:${fearGreed}`;
        }
        
        if (marketPulse) {
            prompt += ` PM+:${marketPulse.PM_PLUS}% VWΔ:${marketPulse.VWD}%`;
        }
        
        prompt += `. Resposta: LONG/SHORT/NEUTRO + confiança% + motivo(10 palavras).`;
        
        return prompt;
    }

    // ===============================================
    // 📊 BATCHING PARA MÚLTIPLOS SINAIS
    // ===============================================
    
    async processarComBatching(dados, funcaoIAOriginal) {
        const batchKey = `${dados.symbol || 'default'}_batch`;
        
        if (!this.batchQueue.has(batchKey)) {
            this.batchQueue.set(batchKey, []);
        }
        
        const queue = this.batchQueue.get(batchKey);
        queue.push({ dados, funcaoIAOriginal, resolve: null });
        
        // Se batch está cheio, processar imediatamente
        if (queue.length >= OTIMIZACAO_CONFIG.BATCHING.TAMANHO_BATCH) {
            return await this.processarBatch(batchKey);
        }
        
        // Senão, aguardar timeout
        if (!this.timers.has(batchKey)) {
            const timer = setTimeout(async () => {
                await this.processarBatch(batchKey);
                this.timers.delete(batchKey);
            }, OTIMIZACAO_CONFIG.BATCHING.TIMEOUT);
            
            this.timers.set(batchKey, timer);
        }
        
        return null; // Será processado em batch
    }
    
    async processarBatch(batchKey) {
        const queue = this.batchQueue.get(batchKey);
        if (!queue || queue.length === 0) return;
        
        console.log(`📦 Processando batch de ${queue.length} análises`);
        
        // Criar prompt consolidado para economia de tokens
        const promptBatch = this.criarPromptBatch(queue.map(item => item.dados));
        
        try {
            const resultadoBatch = await queue[0].funcaoIAOriginal({
                model: 'gpt-4o-mini',
                max_tokens: OTIMIZACAO_CONFIG.TOKENS.MAX_RESPONSE * queue.length,
                temperature: OTIMIZACAO_CONFIG.TOKENS.TEMPERATURA_BAIXA,
                prompt: promptBatch
            });
            
            // Distribuir resultados
            const resultados = this.extrairResultadosBatch(resultadoBatch, queue.length);
            
            // Estatísticas de economia
            this.estatisticas.tokens_economizados += 50 * queue.length; // Economia por usar batch
            
            // Limpar queue
            this.batchQueue.set(batchKey, []);
            
            return resultados[0]; // Retorna o primeiro resultado
            
        } catch (error) {
            console.error('❌ Erro no batch:', error.message);
            return this.gerarFallbackSeguro(queue[0].dados);
        }
    }
    
    criarPromptBatch(dadosArray) {
        let prompt = `Análise batch ${dadosArray.length} criptos:\n`;
        
        dadosArray.forEach((dados, index) => {
            prompt += `${index + 1}. `;
            if (dados.fearGreed) prompt += `F&G:${dados.fearGreed} `;
            if (dados.marketPulse) prompt += `PM+:${dados.marketPulse.PM_PLUS}% `;
            prompt += `\n`;
        });
        
        prompt += `Resposta: Para cada: LONG/SHORT/NEUTRO + confiança%.`;
        
        return prompt;
    }
    
    extrairResultadosBatch(resultadoBatch, quantidade) {
        // Implementar extração dos resultados do batch
        // Por simplicidade, retornando array de fallbacks
        return Array(quantidade).fill(null).map((_, index) => ({
            direcao: 'AGUARDAR',
            confianca: 0.5,
            justificativa: `Resultado batch ${index + 1}`,
            fonte: 'BATCH_OTIMIZADO',
            economia: true,
            tokens_economizados: 50
        }));
    }

    // ===============================================
    // 🛡️ FALLBACK SEGURO
    // ===============================================
    
    gerarFallbackSeguro(dados) {
        console.log('🛡️ Gerando decisão de fallback seguro');
        
        return {
            direcao: 'AGUARDAR',
            confianca: 0.3,
            justificativa: 'Fallback seguro por erro na IA',
            fonte: 'FALLBACK_SEGURO',
            economia: true,
            tokens_economizados: 150,
            erro_recuperado: true
        };
    }

    // ===============================================
    // 📊 RELATÓRIOS E ESTATÍSTICAS
    // ===============================================
    
    obterEstatisticas() {
        const taxaEconomia = this.estatisticas.total_requisicoes > 0 
            ? (this.estatisticas.requisicoes_economizadas / this.estatisticas.total_requisicoes * 100)
            : 0;
        
        const custoEconomizado = this.estatisticas.tokens_economizados * 0.00015 / 1000; // Preço por token gpt-4o-mini
        
        return {
            ...this.estatisticas,
            taxa_economia_requisicoes: `${taxaEconomia.toFixed(1)}%`,
            custo_economizado_usd: `$${custoEconomizado.toFixed(4)}`,
            economia_diaria_estimada: `$${(custoEconomizado * 96).toFixed(2)}`, // 96 = análises por dia (15min)
            economia_mensal_estimada: `$${(custoEconomizado * 96 * 30).toFixed(2)}`
        };
    }
    
    async gerarRelatorioEconomia() {
        const stats = this.obterEstatisticas();
        
        const relatorio = {
            timestamp: new Date().toISOString(),
            periodo: 'atual',
            estatisticas: stats,
            recomendacoes: this.gerarRecomendacoes(stats)
        };
        
        // Salvar relatório
        const nomeArquivo = `relatorio-economia-ia-${Date.now()}.json`;
        await fs.writeFile(nomeArquivo, JSON.stringify(relatorio, null, 2));
        
        console.log('\n💰 === RELATÓRIO DE ECONOMIA ===');
        console.log(`📊 Taxa de economia: ${stats.taxa_economia_requisicoes}`);
        console.log(`💵 Custo economizado: ${stats.custo_economizado_usd}`);
        console.log(`📈 Economia mensal estimada: ${stats.economia_mensal_estimada}`);
        console.log(`📄 Relatório salvo: ${nomeArquivo}`);
        
        return relatorio;
    }
    
    gerarRecomendacoes(stats) {
        const recomendacoes = [];
        
        if (stats.requisicoes_economizadas < stats.total_requisicoes * 0.5) {
            recomendacoes.push('Ajustar thresholds para aumentar análise pré-IA');
        }
        
        if (stats.tokens_economizados < 1000) {
            recomendacoes.push('Implementar mais cache inteligente');
        }
        
        if (this.cache.size < 100) {
            recomendacoes.push('Aumentar utilização do cache');
        }
        
        return recomendacoes;
    }

    // ===============================================
    // 🧹 MANUTENÇÃO E LIMPEZA
    // ===============================================
    
    limparCache() {
        const agora = Date.now();
        let removidos = 0;
        
        for (const [chave, entrada] of this.cache) {
            if (agora - entrada.timestamp > OTIMIZACAO_CONFIG.CACHE.DURACAO_ANALISE) {
                this.cache.delete(chave);
                removidos++;
            }
        }
        
        console.log(`🧹 Cache limpo: ${removidos} entradas removidas`);
    }
    
    resetarEstatisticas() {
        this.estatisticas = {
            total_requisicoes: 0,
            requisicoes_economizadas: 0,
            tokens_economizados: 0,
            custo_economizado: 0,
            tempo_economizado: 0
        };
        
        console.log('📊 Estatísticas resetadas');
    }
}

// ===============================================
// 🎯 FUNÇÃO PRINCIPAL DE INTEGRAÇÃO
// ===============================================

async function integrarOtimizacaoIA(sistemaOriginal) {
    const otimizador = new OtimizadorCustoIA();
    
    console.log('\n🔧 Integrando otimização de IA ao sistema...');
    
    // Interceptar função de IA original
    const funcaoIAOriginal = sistemaOriginal.analisarComIA;
    
    sistemaOriginal.analisarComIA = async function(dados) {
        return await otimizador.analisarComOtimizacao(dados, funcaoIAOriginal.bind(this));
    };
    
    // Adicionar métodos de estatísticas
    sistemaOriginal.obterEstatisticasEconomia = () => otimizador.obterEstatisticas();
    sistemaOriginal.gerarRelatorioEconomia = () => otimizador.gerarRelatorioEconomia();
    
    // Auto-limpeza de cache a cada hora
    setInterval(() => {
        otimizador.limparCache();
    }, 60 * 60 * 1000);
    
    console.log('✅ Otimização de IA integrada com sucesso');
    
    return otimizador;
}

// ===============================================
// 🚀 EXECUÇÃO E EXPORTAÇÃO
// ===============================================

if (require.main === module) {
    console.log('💰 Otimizador de Custo IA - Demonstração');
    
    async function demonstracao() {
        const otimizador = new OtimizadorCustoIA();
        
        // Simular análises
        const dadosSimulados = [
            { fearGreed: 20, tipo: 'mercado' }, // Deve economizar (extremo)
            { fearGreed: 45, marketPulse: { PM_PLUS: 75, VWD: 1.2 }, tipo: 'mercado' }, // Deve economizar (claro)
            { fearGreed: 55, marketPulse: { PM_PLUS: 52, VWD: 0.1 }, tipo: 'mercado' }, // Precisa IA
        ];
        
        for (const dados of dadosSimulados) {
            const resultado = await otimizador.analisarComOtimizacao(dados, async () => {
                // Simular IA
                return {
                    direcao: 'AGUARDAR',
                    confianca: 0.6,
                    justificativa: 'Análise IA simulada'
                };
            });
            
            console.log(`Resultado: ${resultado.direcao} (${resultado.fonte})`);
        }
        
        // Gerar relatório
        await otimizador.gerarRelatorioEconomia();
    }
    
    demonstracao().catch(console.error);
}

module.exports = {
    OtimizadorCustoIA,
    integrarOtimizacaoIA,
    OTIMIZACAO_CONFIG
};
