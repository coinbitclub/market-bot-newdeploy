/**
 * ===============================================
 * 🔄 OTIMIZADOR DE SINAIS IA - RE    /**
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
    }* ===============================================
 * 
 * Sistema inteligente que filtra sinais para IA baseado em:
 * • Tipo do sinal (FORTE e FECHE prioritários)
 * • Existência de posições relacionadas
 * • Impacto real no trading
 * 
 * 🎯 OBJETIVO: Reduzir 50-70% das chamadas de IA
 */

class OtimizadorSinaisIA {
    constructor() {
        this.cache = new Map();
        this.estatisticas = {
            sinais_totais: 0,
            sinais_ia_acionada: 0,
            sinais_processados_algoritmo: 0,
            economia_tokens: 0
        };
    }

    /**
     * 🎯 DETERMINAR SE SINAL PRECISA DE IA
     */
    precisaIA(signalData, posicoesAtivas = new Map()) {
        this.estatisticas.sinais_totais++;
        
        const tipoSinal = signalData.signal || signalData.type;
        const ticker = signalData.ticker;
        
        // REGRA 1: Sinais FORTE sempre precisam de IA
        if (tipoSinal.includes('FORTE')) {
            console.log(`🤖 IA REQUERIDA: Sinal FORTE (${tipoSinal})`);
            this.estatisticas.sinais_ia_acionada++;
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
                this.estatisticas.sinais_ia_acionada++;
                return {
                    precisaIA: true,
                    motivo: 'FECHE_COM_POSICAO',
                    prioridade: 'MÉDIA'
                };
            } else {
                console.log(`⚡ ALGORITMO: Feche sem posição (${tipoSinal})`);
                this.estatisticas.sinais_processados_algoritmo++;
                this.estatisticas.economia_tokens += 200; // Economia estimada por sinal
                return {
                    precisaIA: false,
                    motivo: 'FECHE_SEM_POSICAO',
                    prioridade: 'BAIXA'
                };
            }
        }
        
        // REGRA 3: Sinais normais (LONG/SHORT) não precisam IA
        if (tipoSinal === 'SINAL_LONG' || tipoSinal === 'SINAL_SHORT') {
            console.log(`⚡ ALGORITMO: Sinal normal (${tipoSinal})`);
            this.estatisticas.sinais_processados_algoritmo++;
            this.estatisticas.economia_tokens += 200;
            return {
                precisaIA: false,
                motivo: 'SINAL_NORMAL',
                prioridade: 'BAIXA'
            };
        }
        
        // FALLBACK: Casos não mapeados usam IA por segurança
        console.log(`🤖 IA REQUERIDA: Caso não mapeado (${tipoSinal})`);
        this.estatisticas.sinais_ia_acionada++;
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
        const posicoesDoTicker = posicoesAtivas.get(ticker);
        if (!posicoesDoTicker || posicoesDoTicker.size === 0) {
            return false;
        }
        
        // Verificar se há posição na direção específica
        for (const [userId, positionData] of posicoesDoTicker) {
            if (positionData.side === direcao) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 📊 OBTER ESTATÍSTICAS DE ECONOMIA
     */
    obterEstatisticas() {
        const taxaEconomia = this.estatisticas.sinais_totais > 0 
            ? (this.estatisticas.sinais_processados_algoritmo / this.estatisticas.sinais_totais * 100).toFixed(1)
            : 0;
            
        const custoEvitado = (this.estatisticas.economia_tokens * 0.00015).toFixed(2); // $0.15/1k tokens
        
        return {
            ...this.estatisticas,
            taxa_economia_percentual: `${taxaEconomia}%`,
            custo_evitado_usd: `$${custoEvitado}`,
            eficiencia: this.estatisticas.sinais_totais > 0 
                ? `${this.estatisticas.sinais_ia_acionada}/${this.estatisticas.sinais_totais} usaram IA`
                : 'Sem dados'
        };
    }
}

module.exports = OtimizadorSinaisIA;
