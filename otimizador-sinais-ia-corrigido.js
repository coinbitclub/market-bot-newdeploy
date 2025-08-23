#!/usr/bin/env node

/**
 * ===============================================
 * 🤖 OTIMIZADOR DE SINAIS IA - VERSÃO CORRIGIDA
 * ===============================================
 * 
 * Sistema inteligente que filtra sinais para IA baseado em:
 * - Tipo de sinal (FORTE vs NORMAL)
 * - Existência de posições ativas
 * - Complexidade da decisão requerida
 * 
 * 🎯 OBJETIVO: Reduzir custos de IA em 52% usando apenas onde necessário
 */

class OtimizadorSinaisIA {
    constructor() {
        this.estatisticas = {
            total_processados: 0,
            usaram_ia: 0,
            usaram_algoritmo: 0,
            economia_tokens: 0
        };
    }

    /**
     * 🧠 DECISOR PRINCIPAL: Determina se precisa IA ou não
     */
    precisaIA(signalData, posicoesAtivas = new Map()) {
        this.estatisticas.total_processados++;
        
        const tipoSinal = signalData.signal || signalData.type;
        const ticker = signalData.ticker;
        
        console.log(`🔍 Analisando necessidade de IA para: ${tipoSinal} - ${ticker}`);
        
        // REGRA 1: Sinais FORTE sempre precisam IA
        if (tipoSinal.includes('_FORTE')) {
            console.log(`🤖 IA REQUERIDA: Sinal FORTE (${tipoSinal})`);
            this.estatisticas.usaram_ia++;
            return {
                precisaIA: true,
                motivo: 'SINAL_FORTE',
                prioridade: 'ALTA'
            };
        }
        
        // REGRA 2: Sinais de FECHE só precisam IA se há posição relacionada
        if (tipoSinal.startsWith('FECHE_')) {
            const direcaoFeche = tipoSinal.includes('LONG') ? 'LONG' : 'SHORT';
            const temPosicao = this.verificarPosicaoExistente(ticker, direcaoFeche, posicoesAtivas);
            
            if (temPosicao) {
                console.log(`🤖 IA REQUERIDA: Feche com posição ativa (${tipoSinal})`);
                this.estatisticas.usaram_ia++;
                return {
                    precisaIA: true,
                    motivo: 'FECHE_COM_POSICAO',
                    prioridade: 'MÉDIA'
                };
            } else {
                console.log(`⚡ ALGORITMO: Feche sem posição (${tipoSinal})`);
                this.estatisticas.usaram_algoritmo++;
                return {
                    precisaIA: false,
                    motivo: 'FECHE_SEM_POSICAO',
                    prioridade: 'BAIXA'
                };
            }
        }
        
        // REGRA 3: Sinais normais (LONG, SHORT) usam algoritmo
        if (['SINAL_LONG', 'SINAL_SHORT', 'LONG', 'SHORT'].includes(tipoSinal)) {
            console.log(`⚡ ALGORITMO: Sinal normal (${tipoSinal})`);
            this.estatisticas.usaram_algoritmo++;
            return {
                precisaIA: false,
                motivo: 'SINAL_NORMAL',
                prioridade: 'BAIXA'
            };
        }
        
        // FALLBACK: Casos não mapeados usam IA por segurança
        console.log(`🤖 IA REQUERIDA: Caso não mapeado (${tipoSinal})`);
        this.estatisticas.usaram_ia++;
        return {
            precisaIA: true,
            motivo: 'FALLBACK_SEGURANCA',
            prioridade: 'MÉDIA'
        };
    }
    
    /**
     * 🔍 VERIFICAR SE EXISTE POSIÇÃO ATIVA
     */
    verificarPosicaoExistente(ticker, direcao, posicoesAtivas) {
        if (!posicoesAtivas || posicoesAtivas.size === 0) {
            return false;
        }
        
        // Verificar se há posição para o ticker
        const posicao = posicoesAtivas.get(ticker);
        if (!posicao) {
            return false;
        }
        
        // Verificar se a direção da posição corresponde
        return posicao.tipo === direcao;
    }

    /**
     * 📊 OBTER ESTATÍSTICAS
     */
    obterEstatisticas() {
        const percentualIA = this.estatisticas.total_processados > 0 
            ? (this.estatisticas.usaram_ia / this.estatisticas.total_processados * 100).toFixed(1)
            : 0;

        const economia = this.estatisticas.usaram_algoritmo * 200; // 200 tokens por sinal algoritmo

        return {
            total_processados: this.estatisticas.total_processados,
            usaram_ia: this.estatisticas.usaram_ia,
            usaram_algoritmo: this.estatisticas.usaram_algoritmo,
            percentual_ia: parseFloat(percentualIA),
            economia_tokens: economia,
            custo_evitado_usd: (economia * 0.002).toFixed(4)
        };
    }

    /**
     * 🔄 RESETAR ESTATÍSTICAS
     */
    resetarEstatisticas() {
        this.estatisticas = {
            total_processados: 0,
            usaram_ia: 0,
            usaram_algoritmo: 0,
            economia_tokens: 0
        };
    }

    /**
     * 📋 RELATÓRIO DETALHADO
     */
    gerarRelatorio() {
        const stats = this.obterEstatisticas();
        
        console.log('\n📊 RELATÓRIO DE OTIMIZAÇÃO DE IA');
        console.log('='.repeat(40));
        console.log(`📈 Total processados: ${stats.total_processados}`);
        console.log(`🤖 Usaram IA: ${stats.usaram_ia} (${stats.percentual_ia}%)`);
        console.log(`⚡ Usaram Algoritmo: ${stats.usaram_algoritmo} (${(100-stats.percentual_ia).toFixed(1)}%)`);
        console.log(`💰 Tokens economizados: ${stats.economia_tokens}`);
        console.log(`💵 Custo evitado: $${stats.custo_evitado_usd}`);
        
        return stats;
    }
}

module.exports = OtimizadorSinaisIA;
