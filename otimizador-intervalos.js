#!/usr/bin/env node
/**
 * ===============================================
 * ⏰ OTIMIZADOR DE INTERVALOS - COINBITCLUB
 * ===============================================
 * Sistema para otimizar intervalos de leitura do mercado
 * baseado em volatilidade e conditions do mercado
 * 
 * 🎯 OBJETIVO: Reduzir de 96 para ~30-40 análises/dia
 * 💰 ECONOMIA: ~60% das requisições de IA
 */

const fs = require('fs').promises;

// ===============================================
// 🎨 CONFIGURAÇÕES DE INTERVALOS DINÂMICOS
// ===============================================

const INTERVALOS_CONFIG = {
    // Intervalos base (em minutos)
    INTERVALS: {
        ULTRA_RAPIDO: 5,      // Mercado muito volátil
        RAPIDO: 10,           // Mercado volátil
        NORMAL: 15,           // Mercado normal (atual)
        LENTO: 30,            // Mercado calmo
        MUITO_LENTO: 60       // Mercado muito calmo
    },
    
    // Thresholds para mudar intervalos
    THRESHOLDS: {
        VOLATILIDADE_ALTA: 2.5,        // > 2.5% = intervalo rápido
        VOLATILIDADE_BAIXA: 0.5,       // < 0.5% = intervalo lento
        FEAR_GREED_NEUTRO_MIN: 35,     // Zona neutra Fear & Greed
        FEAR_GREED_NEUTRO_MAX: 65,
        VOLUME_BAIXO_THRESHOLD: 0.7,    // < 70% volume médio = lento
        HORARIO_NOTURNO_INICIO: 2,      // 2h - 6h = intervalo lento
        HORARIO_NOTURNO_FIM: 6
    },
    
    // Forçar intervalos em situações especiais
    FORCAS_ESPECIAIS: {
        WEEKEND_MULTIPLIER: 2,          // Fim de semana = 2x mais lento
        FERIADO_MULTIPLIER: 2,          // Feriados = 2x mais lento
        MANUTENCAO_INTERVAL: 60,        // Durante manutenção = 60min
        EMERGENCIA_INTERVAL: 2          // Emergência = 2min
    }
};

// ===============================================
// 🧠 CLASSE PRINCIPAL - OTIMIZADOR DE INTERVALOS
// ===============================================

class OtimizadorIntervalos {
    constructor() {
        this.intervalAtual = INTERVALOS_CONFIG.INTERVALS.NORMAL;
        this.ultimaAlteracao = Date.now();
        this.historicoIntervalos = [];
        this.estatisticas = {
            total_ajustes: 0,
            economia_requisicoes: 0,
            tempo_economia: 0
        };
        
        console.log('⏰ Otimizador de Intervalos inicializado');
    }

    // ===============================================
    // 📊 ANÁLISE DE CONTEXTO DO MERCADO
    // ===============================================
    
    async analisarContextoMercado() {
        console.log('📊 Analisando contexto do mercado...');
        
        const agora = new Date();
        const contexto = {
            horario: {
                hora: agora.getHours(),
                diaSemana: agora.getDay(),
                isWeekend: agora.getDay() === 0 || agora.getDay() === 6,
                isHorarioNoturno: agora.getHours() >= INTERVALOS_CONFIG.THRESHOLDS.HORARIO_NOTURNO_INICIO && 
                                 agora.getHours() <= INTERVALOS_CONFIG.THRESHOLDS.HORARIO_NOTURNO_FIM
            },
            mercado: await this.obterDadosMercado(),
            especiais: await this.verificarSituacoesEspeciais()
        };
        
        return contexto;
    }
    
    async obterDadosMercado() {
        // Simular obtenção de dados reais do mercado
        // Em produção, integraria com APIs reais
        
        return {
            volatilidade24h: Math.random() * 5, // 0-5%
            volume24h: 0.5 + Math.random() * 1, // 0.5x - 1.5x média
            fearGreed: 20 + Math.random() * 60,  // 20-80
            tendencia: ['alta', 'baixa', 'lateral'][Math.floor(Math.random() * 3)],
            liquidez: 0.7 + Math.random() * 0.6  // 0.7x - 1.3x normal
        };
    }
    
    async verificarSituacoesEspeciais() {
        return {
            manutencaoExchange: false,
            eventoMacroeconomico: false,
            alertaSeguranca: false,
            testesAutomaticos: false
        };
    }

    // ===============================================
    // 🎯 LÓGICA DE OTIMIZAÇÃO DE INTERVALOS
    // ===============================================
    
    calcularIntervaloOtimo(contexto) {
        console.log('🎯 Calculando intervalo ótimo...');
        
        let intervaloBase = INTERVALOS_CONFIG.INTERVALS.NORMAL;
        let razao = 'Análise padrão';
        
        // FATOR 1: Volatilidade do mercado
        if (contexto.mercado.volatilidade24h > INTERVALOS_CONFIG.THRESHOLDS.VOLATILIDADE_ALTA) {
            intervaloBase = INTERVALOS_CONFIG.INTERVALS.RAPIDO;
            razao = `Alta volatilidade (${contexto.mercado.volatilidade24h.toFixed(2)}%)`;
            
        } else if (contexto.mercado.volatilidade24h < INTERVALOS_CONFIG.THRESHOLDS.VOLATILIDADE_BAIXA) {
            intervaloBase = INTERVALOS_CONFIG.INTERVALS.LENTO;
            razao = `Baixa volatilidade (${contexto.mercado.volatilidade24h.toFixed(2)}%)`;
        }
        
        // FATOR 2: Fear & Greed neutro = menos urgência
        const { fearGreed } = contexto.mercado;
        if (fearGreed >= INTERVALOS_CONFIG.THRESHOLDS.FEAR_GREED_NEUTRO_MIN && 
            fearGreed <= INTERVALOS_CONFIG.THRESHOLDS.FEAR_GREED_NEUTRO_MAX) {
            
            intervaloBase = Math.max(intervaloBase, INTERVALOS_CONFIG.INTERVALS.LENTO);
            razao += ` + Fear&Greed neutro (${fearGreed})`;
        }
        
        // FATOR 3: Volume baixo = menos ação
        if (contexto.mercado.volume24h < INTERVALOS_CONFIG.THRESHOLDS.VOLUME_BAIXO_THRESHOLD) {
            intervaloBase = Math.max(intervaloBase, INTERVALOS_CONFIG.INTERVALS.LENTO);
            razao += ` + Volume baixo (${(contexto.mercado.volume24h * 100).toFixed(0)}%)`;
        }
        
        // FATOR 4: Horário noturno
        if (contexto.horario.isHorarioNoturno) {
            intervaloBase *= 2;
            razao += ' + Horário noturno';
        }
        
        // FATOR 5: Final de semana
        if (contexto.horario.isWeekend) {
            intervaloBase *= INTERVALOS_CONFIG.FORCAS_ESPECIAIS.WEEKEND_MULTIPLIER;
            razao += ' + Final de semana';
        }
        
        // FATOR 6: Situações especiais
        if (contexto.especiais.manutencaoExchange) {
            intervaloBase = INTERVALOS_CONFIG.FORCAS_ESPECIAIS.MANUTENCAO_INTERVAL;
            razao = 'Manutenção de exchange';
        }
        
        if (contexto.especiais.alertaSeguranca) {
            intervaloBase = INTERVALOS_CONFIG.FORCAS_ESPECIAIS.EMERGENCIA_INTERVAL;
            razao = 'Alerta de segurança - monitoramento urgente';
        }
        
        // Garantir que não seja menor que 5 min ou maior que 60 min
        intervaloBase = Math.max(5, Math.min(60, intervaloBase));
        
        return {
            intervalo: intervaloBase,
            razao: razao,
            contexto: contexto
        };
    }

    // ===============================================
    // 🔄 AJUSTE DINÂMICO DE INTERVALOS
    // ===============================================
    
    async ajustarIntervalo() {
        try {
            const contexto = await this.analisarContextoMercado();
            const { intervalo: novoIntervalo, razao } = this.calcularIntervaloOtimo(contexto);
            
            // Só alterar se diferença for significativa (> 20%)
            const diferencaPercentual = Math.abs(novoIntervalo - this.intervalAtual) / this.intervalAtual;
            
            if (diferencaPercentual > 0.2) {
                const intervaloAnterior = this.intervalAtual;
                this.intervalAtual = novoIntervalo;
                this.ultimaAlteracao = Date.now();
                this.estatisticas.total_ajustes++;
                
                // Calcular economia de requisições
                const reqAnteriorDia = (24 * 60) / intervaloAnterior;
                const reqNovaDia = (24 * 60) / novoIntervalo;
                const economia = reqAnteriorDia - reqNovaDia;
                
                if (economia > 0) {
                    this.estatisticas.economia_requisicoes += economia;
                }
                
                // Registrar no histórico
                this.historicoIntervalos.push({
                    timestamp: Date.now(),
                    intervaloAnterior: intervaloAnterior,
                    novoIntervalo: novoIntervalo,
                    razao: razao,
                    economia: economia,
                    contexto: contexto
                });
                
                console.log(`⏰ INTERVALO AJUSTADO: ${intervaloAnterior}min → ${novoIntervalo}min`);
                console.log(`📋 Razão: ${razao}`);
                console.log(`💰 Economia: ${economia > 0 ? '+' : ''}${economia.toFixed(1)} req/dia`);
                
                return {
                    alterado: true,
                    intervaloAnterior,
                    novoIntervalo,
                    razao,
                    economia
                };
            }
            
            console.log(`⏰ Intervalo mantido: ${this.intervalAtual}min (${razao})`);
            return {
                alterado: false,
                intervaloAtual: this.intervalAtual,
                razao
            };
            
        } catch (error) {
            console.error('❌ Erro ao ajustar intervalo:', error.message);
            return {
                alterado: false,
                erro: error.message
            };
        }
    }
    
    obterIntervaloAtual() {
        return this.intervalAtual;
    }
    
    obterIntervaloEmMs() {
        return this.intervalAtual * 60 * 1000;
    }

    // ===============================================
    // 📊 RELATÓRIOS E ESTATÍSTICAS
    // ===============================================
    
    obterEstatisticas() {
        const economiaDiaria = this.estatisticas.economia_requisicoes;
        const economiaPercentual = economiaDiaria > 0 ? ((economiaDiaria / 96) * 100) : 0;
        const economiaTokens = economiaDiaria * 150; // 150 tokens por análise
        const economiaCusto = economiaTokens * 0.00015 / 1000; // Custo gpt-4o-mini
        
        return {
            ...this.estatisticas,
            intervalo_atual: `${this.intervalAtual} minutos`,
            economia_requisicoes_dia: economiaDiaria.toFixed(1),
            economia_percentual: `${economiaPercentual.toFixed(1)}%`,
            economia_tokens_dia: economiaTokens.toFixed(0),
            economia_custo_dia: `$${economiaCusto.toFixed(4)}`,
            economia_custo_mensal: `$${(economiaCusto * 30).toFixed(2)}`,
            total_ajustes: this.estatisticas.total_ajustes,
            ultima_alteracao: new Date(this.ultimaAlteracao).toLocaleString()
        };
    }
    
    async gerarRelatorioIntervalos() {
        const stats = this.obterEstatisticas();
        
        const relatorio = {
            timestamp: new Date().toISOString(),
            configuracao_atual: {
                intervalo_minutos: this.intervalAtual,
                proxima_analise: new Date(Date.now() + this.obterIntervaloEmMs()).toISOString(),
                req_por_dia_atual: (24 * 60) / this.intervalAtual,
                req_por_dia_original: 96
            },
            estatisticas: stats,
            historico_recente: this.historicoIntervalos.slice(-10),
            projecoes: this.calcularProjecoes()
        };
        
        const nomeArquivo = `relatorio-intervalos-${Date.now()}.json`;
        await fs.writeFile(nomeArquivo, JSON.stringify(relatorio, null, 2));
        
        console.log('\n⏰ === RELATÓRIO DE INTERVALOS ===');
        console.log(`🕐 Intervalo atual: ${stats.intervalo_atual}`);
        console.log(`📊 Economia diária: ${stats.economia_requisicoes_dia} requisições (${stats.economia_percentual})`);
        console.log(`💰 Economia mensal: ${stats.economia_custo_mensal}`);
        console.log(`📈 Total de ajustes: ${stats.total_ajustes}`);
        console.log(`📄 Relatório salvo: ${nomeArquivo}`);
        
        return relatorio;
    }
    
    calcularProjecoes() {
        const reqDiaAtual = (24 * 60) / this.intervalAtual;
        const economiaSemanal = (96 - reqDiaAtual) * 7;
        const economiaMensal = (96 - reqDiaAtual) * 30;
        const economiaAnual = (96 - reqDiaAtual) * 365;
        
        return {
            requisicoes_economia: {
                semanal: economiaSemanal.toFixed(1),
                mensal: economiaMensal.toFixed(1),
                anual: economiaAnual.toFixed(1)
            },
            custo_economia: {
                semanal: `$${(economiaSemanal * 150 * 0.00015 / 1000).toFixed(2)}`,
                mensal: `$${(economiaMensal * 150 * 0.00015 / 1000).toFixed(2)}`,
                anual: `$${(economiaAnual * 150 * 0.00015 / 1000).toFixed(2)}`
            }
        };
    }

    // ===============================================
    // 🛠️ INTEGRAÇÃO COM SISTEMA EXISTENTE
    // ===============================================
    
    criarTarefaOtimizada() {
        const self = this;
        
        return {
            executar: async function() {
                // Ajustar intervalo antes de cada execução
                await self.ajustarIntervalo();
                
                // Retornar próximo timeout
                return self.obterIntervaloEmMs();
            },
            
            obterProximaExecucao: function() {
                return new Date(Date.now() + self.obterIntervaloEmMs());
            },
            
            obterEstatisticas: function() {
                return self.obterEstatisticas();
            }
        };
    }
}

// ===============================================
// 🎯 INTEGRAÇÃO COM SISTEMA DE LEITURA DO MERCADO
// ===============================================

async function integrarIntervalosOtimizados(sistemaLeitura) {
    const otimizador = new OtimizadorIntervalos();
    
    console.log('\n🔧 Integrando intervalos otimizados...');
    
    // Substituir setInterval fixo por dinâmico
    if (sistemaLeitura.intervalTimer) {
        clearInterval(sistemaLeitura.intervalTimer);
    }
    
    // Função recursiva com intervalo dinâmico
    async function executarComIntervaloDinamico() {
        try {
            // Executar análise de mercado
            await sistemaLeitura.executarLeitura();
            
            // Ajustar próximo intervalo
            const ajuste = await otimizador.ajustarIntervalo();
            const proximoIntervalo = otimizador.obterIntervaloEmMs();
            
            console.log(`⏰ Próxima análise em ${otimizador.obterIntervaloAtual()} minutos`);
            
            // Agendar próxima execução
            setTimeout(executarComIntervaloDinamico, proximoIntervalo);
            
        } catch (error) {
            console.error('❌ Erro na execução com intervalo dinâmico:', error.message);
            
            // Fallback: tentar novamente em 15 minutos
            setTimeout(executarComIntervaloDinamico, 15 * 60 * 1000);
        }
    }
    
    // Iniciar ciclo otimizado
    executarComIntervaloDinamico();
    
    // Adicionar métodos ao sistema
    sistemaLeitura.obterEstatisticasIntervalos = () => otimizador.obterEstatisticas();
    sistemaLeitura.gerarRelatorioIntervalos = () => otimizador.gerarRelatorioIntervalos();
    sistemaLeitura.forcarAjusteIntervalo = () => otimizador.ajustarIntervalo();
    
    console.log('✅ Intervalos otimizados integrados com sucesso');
    
    return otimizador;
}

// ===============================================
// 🚀 EXECUÇÃO E EXPORTAÇÃO
// ===============================================

if (require.main === module) {
    console.log('⏰ Otimizador de Intervalos - Demonstração');
    
    async function demonstracao() {
        const otimizador = new OtimizadorIntervalos();
        
        // Simular alguns ajustes
        for (let i = 0; i < 5; i++) {
            console.log(`\n--- Simulação ${i + 1} ---`);
            await otimizador.ajustarIntervalo();
            
            // Simular passagem de tempo
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Gerar relatório
        await otimizador.gerarRelatorioIntervalos();
    }
    
    demonstracao().catch(console.error);
}

module.exports = {
    OtimizadorIntervalos,
    integrarIntervalosOtimizados,
    INTERVALOS_CONFIG
};
