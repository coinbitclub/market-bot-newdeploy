#!/usr/bin/env node
/**
 * ===============================================
 * 🎯 SISTEMA DE LEITURA DO MERCADO - INTEGRADO
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

// ===============================================
// 🎨 CONFIGURAÇÕES INTEGRADAS
// ===============================================

const CONFIG = {
    // APIs
    COINSTATS_API_KEY: process.env.COINSTATS_API_KEY || 'ZFIxigBcVaCyXDL1Qp/Ork7TOL3+h07NM2f3YoSrMkI=',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    BINANCE_API_KEY: process.env.BINANCE_API_KEY || 'process.env.API_KEY_HERE',
    
    // Intervalos
    LEITURA_INTERVAL: 15 * 60 * 1000, // 15 minutos
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
        this.pool = pool;
        this.sistemaAtivo = false;
        this.ultimaLeitura = null;
        this.intervalos = [];
        
        // Componentes integrados
        this.sistemaDual = new SistemaDualIntegrado();
        this.marketPulse = new CalculadorMarketPulse();
        this.iaEspecializada = new IAMarketPulseEspecializada();
        
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
    
    async executarAnaliseCompleta() {
        console.log('\n🚀 === ANÁLISE COMPLETA INTEGRADA ===');
        
        try {
            this.estatisticas.total_leituras++;
            
            // 1. Executar análise do sistema dual
            console.log('🔄 Acionando Sistema Dual Integrado...');
            let decisaoFinal = await this.sistemaDual.analisarSituacaoCompleta();
            
            // 2. VALIDAÇÃO CRÍTICA DE SEGURANÇA
            decisaoFinal = this.validarRegrasSeguranca(decisaoFinal);
            
            // 3. Atualizar estatísticas
            this.atualizarEstatisticas(decisaoFinal);
            
            // 4. Salvar no banco de dados
            await this.salvarAnaliseCompleta(decisaoFinal);
            
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
        console.log('� Salvando análise completa...');
        
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
}
        console.log('1️⃣ Lendo Fear & Greed Index...');
        
        try {
            const response = await axios.get(CONFIG.COINSTATS_FEAR_GREED, {
                headers: {
                    'X-API-KEY': CONFIG.COINSTATS_API_KEY,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            const valor = response.data.now?.value || 50; // Fallback: 50
            const classificacao = response.data.now?.value_classification || 'Neutral';

            // REGRAS DE DIREÇÃO FEAR & GREED
            let direcaoPermitida;
            if (valor < 30) {
                direcaoPermitida = 'SOMENTE_LONG'; // <30 → Somente Long
            } else if (valor > 80) {
                direcaoPermitida = 'SOMENTE_SHORT'; // >80 → Somente Short
            } else {
                direcaoPermitida = 'LONG_E_SHORT'; // 30-80 → Long e Short
            }

            const fearGreedData = {
                valor: valor,
                classificacao: classificacao,
                direcao_permitida: direcaoPermitida,
                timestamp: response.data.now?.update_time || new Date().toISOString(),
                fonte: 'coinstats_api'
            };

            console.log(`   ✅ F&G: ${valor} (${classificacao}) → ${direcaoPermitida}`);
            return fearGreedData;

        } catch (error) {
            console.log('   ⚠️ Erro CoinStats, usando fallback F&G = 50');
            return {
                valor: 50,
                classificacao: 'Neutral',
                direcao_permitida: 'LONG_E_SHORT',
                timestamp: new Date().toISOString(),
                fonte: 'fallback'
            };
        }
    }

    // ================================================
    // 2️⃣ LEITURA DA BINANCE (TOP 100)
    // ================================================
    async lerBinanceTop100() {
        console.log('2️⃣ Lendo Binance TOP 100...');
        
        try {
            // Dados 24h de todas as moedas
            const response = await axios.get(CONFIG.BINANCE_TICKER_24H, {
                timeout: 15000
            });

            // Filtrar e ordenar TOP 100 USDT por volume
            const top100 = response.data
                .filter(ticker => ticker.symbol.endsWith('USDT'))
                .map(ticker => ({
                    symbol: ticker.symbol,
                    baseAsset: ticker.symbol.replace('USDT', ''),
                    lastPrice: parseFloat(ticker.lastPrice),
                    priceChangePercent: parseFloat(ticker.priceChangePercent),
                    quoteVolume: parseFloat(ticker.quoteVolume),
                    highPrice: parseFloat(ticker.highPrice),
                    lowPrice: parseFloat(ticker.lowPrice)
                }))
                .sort((a, b) => b.quoteVolume - a.quoteVolume)
                .slice(0, 100);

            // ANÁLISE DOS DADOS
            const positivas = top100.filter(coin => coin.priceChangePercent > 0).length;
            const negativas = top100.filter(coin => coin.priceChangePercent < 0).length;
            const percentualPositivas = (positivas / 100) * 100;

            // Variação ponderada por volume
            const totalVolume = top100.reduce((sum, coin) => sum + coin.quoteVolume, 0);
            const variacaoPonderada = top100.reduce((sum, coin) => {
                return sum + (coin.priceChangePercent * (coin.quoteVolume / totalVolume));
            }, 0);

            // Dominância BTC
            const btcData = top100.find(coin => coin.baseAsset === 'BTC');
            const btcDominance = btcData ? (btcData.quoteVolume / totalVolume) * 100 : 0;

            // Volatilidade média
            const volatilidade = top100.reduce((sum, coin) => {
                return sum + ((coin.highPrice - coin.lowPrice) / coin.lowPrice) * 100;
            }, 0) / 100;

            const binanceData = {
                total_analisadas: 100,
                moedas_positivas: positivas,
                moedas_negativas: negativas,
                percentual_positivas: percentualPositivas,
                variacao_ponderada: variacaoPonderada,
                btc_dominance: btcDominance,
                volatilidade_media: volatilidade,
                volume_total_24h: totalVolume,
                top_10: top100.slice(0, 10),
                timestamp: new Date().toISOString()
            };

            console.log(`   ✅ TOP 100: ${percentualPositivas.toFixed(1)}% positivas`);
            console.log(`   📊 Dominância BTC: ${btcDominance.toFixed(1)}%`);
            console.log(`   🔄 Variação ponderada: ${variacaoPonderada.toFixed(2)}%`);

            return binanceData;

        } catch (error) {
            console.log('   ❌ Erro Binance:', error.message);
            throw error;
        }
    }

    // ================================================
    // 3️⃣ LEITURA DA DOMINÂNCIA BTC (CoinStats Markets)
    // ================================================
    async lerDominanciaBTC() {
        console.log('3️⃣ Lendo dominância BTC (CoinStats Markets)...');
        
        try {
            const response = await axios.get(CONFIG.COINSTATS_MARKETS, {
                headers: {
                    'X-API-KEY': CONFIG.COINSTATS_API_KEY,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            // Buscar BTC nos dados
            const btcData = response.data.result?.find(coin => coin.symbol === 'BTC');
            const dominancia = btcData?.marketCap ? 
                (btcData.marketCap / response.data.totalMarketCap) * 100 : 50;

            console.log(`   ✅ Dominância BTC: ${dominancia.toFixed(2)}%`);
            
            return {
                dominancia_btc: dominancia,
                market_cap_total: response.data.totalMarketCap || 0,
                fonte: 'coinstats_markets'
            };

        } catch (error) {
            console.log('   ⚠️ Erro CoinStats Markets, usando dados Binance');
            return {
                dominancia_btc: 50,
                market_cap_total: 0,
                fonte: 'fallback'
            };
        }
    }

    // ================================================
    // 4️⃣ ANÁLISE DA IA (OpenAI)
    // ================================================
    async consultarIA(fearGreedData, binanceData, dominanciaData) {
        console.log('4️⃣ Consultando IA para análise...');
        
        try {
            const prompt = `
ANÁLISE DE MERCADO CRIPTO - SISTEMA DE LEITURA DO MERCADO

DADOS ATUAIS:
- Fear & Greed Index: ${fearGreedData.valor} (${fearGreedData.classificacao})
- Direção F&G: ${fearGreedData.direcao_permitida}
- Moedas positivas TOP 100: ${binanceData.percentual_positivas.toFixed(1)}%
- Dominância BTC: ${dominanciaData.dominancia_btc.toFixed(1)}%
- Variação ponderada: ${binanceData.variacao_ponderada.toFixed(2)}%
- Volatilidade média: ${binanceData.volatilidade_media.toFixed(2)}%

REGRAS DE ANÁLISE:
1. Fear & Greed PREVALECE sempre:
   - <30: SOMENTE LONG
   - 30-80: LONG e SHORT
   - >80: SOMENTE SHORT

2. Dominância BTC:
   - ≥50% e subindo: SHORT Altcoins
   - ≤45% e caindo: LONG Altcoins
   - Estável: NEUTRO

3. Se divergência entre indicadores:
   - Fear & Greed prevalece
   - Reduzir 50% dos parâmetros de abertura

RESPONDA EM JSON:
{
  "direcao_final": "LONG/SHORT/NEUTRO",
  "confianca": 0.0-1.0,
  "divergencia_detectada": true/false,
  "reducao_parametros": true/false,
  "justificativa": "explicação em 1 linha"
}
`;

            const response = await axios.post(CONFIG.OPENAI_COMPLETIONS, {
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Você é o sistema de análise do SISTEMA DE LEITURA DO MERCADO. Sempre responda em JSON válido.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 200,
                temperature: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 20000
            });

            const iaResponse = response.data.choices[0].message.content;
            console.log('   🤖 Resposta IA:', iaResponse);

            try {
                const analiseIA = JSON.parse(iaResponse);
                console.log(`   ✅ IA decidiu: ${analiseIA.direcao_final} (${Math.round(analiseIA.confianca * 100)}%)`);
                
                return {
                    direcao_final: analiseIA.direcao_final || 'NEUTRO',
                    confianca: analiseIA.confianca || 0.5,
                    divergencia_detectada: analiseIA.divergencia_detectada || false,
                    reducao_parametros: analiseIA.reducao_parametros || false,
                    justificativa: analiseIA.justificativa || 'Análise padrão',
                    tokens_usados: response.data.usage?.total_tokens || 0,
                    fonte: 'openai'
                };

            } catch (parseError) {
                // Fallback se não conseguir parsear JSON
                return this.analiseFallback(fearGreedData, binanceData);
            }

        } catch (error) {
            console.log('   ⚠️ OpenAI indisponível, usando análise fallback');
            return this.analiseFallback(fearGreedData, binanceData);
        }
    }

    // ================================================
    // ANÁLISE FALLBACK (sem IA)
    // ================================================
    analiseFallback(fearGreedData, binanceData) {
        let direcao = 'NEUTRO';
        let confianca = 0.6;
        let justificativa = 'Análise baseada em Fear & Greed';

        // Seguir regras Fear & Greed
        if (fearGreedData.valor < 30) {
            direcao = 'LONG';
            confianca = 0.8;
            justificativa = 'F&G baixo indica medo extremo - oportunidade LONG';
        } else if (fearGreedData.valor > 80) {
            direcao = 'SHORT';
            confianca = 0.8;
            justificativa = 'F&G alto indica ganância extrema - sinal SHORT';
        } else if (binanceData.percentual_positivas > 70) {
            direcao = 'LONG';
            confianca = 0.7;
            justificativa = 'Maioria das moedas positivas - tendência LONG';
        } else if (binanceData.percentual_positivas < 30) {
            direcao = 'SHORT';
            confianca = 0.7;
            justificativa = 'Maioria das moedas negativas - tendência SHORT';
        }

        return {
            direcao_final: direcao,
            confianca: confianca,
            divergencia_detectada: false,
            reducao_parametros: false,
            justificativa: justificativa,
            tokens_usados: 0,
            fonte: 'fallback'
        };
    }

    // ================================================
    // 💾 SALVAR DADOS NO BANCO
    // ================================================
    async salvarLeituraMercado(dados) {
        try {
            console.log('💾 Salvando leitura do mercado...');
            
            await pool.query(`
                INSERT INTO sistema_leitura_mercado (
                    fear_greed_index, fear_greed_classificacao, fear_greed_direcao,
                    binance_positivas, binance_percentual_positivas, binance_variacao_ponderada,
                    btc_dominance, volatilidade_media, volume_total_24h,
                    ia_direcao_final, ia_confianca, ia_divergencia, ia_reducao_parametros,
                    ia_justificativa, dados_completos, timestamp
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
            `, [
                dados.fearGreed.valor,
                dados.fearGreed.classificacao,
                dados.fearGreed.direcao_permitida,
                dados.binance.moedas_positivas,
                dados.binance.percentual_positivas,
                dados.binance.variacao_ponderada,
                dados.dominancia.dominancia_btc,
                dados.binance.volatilidade_media,
                dados.binance.volume_total_24h,
                dados.ia.direcao_final,
                dados.ia.confianca,
                dados.ia.divergencia_detectada,
                dados.ia.reducao_parametros,
                dados.ia.justificativa,
                JSON.stringify(dados)
            ]);

            console.log('   ✅ Dados salvos no banco');

        } catch (error) {
            console.error('   ❌ Erro ao salvar:', error.message);
        }
    }

    // ================================================
    // 🧹 LIMPEZA AUTOMÁTICA (24 HORAS)
    // ================================================
    async executarLimpezaAutomatica() {
        try {
            console.log('\n🧹 EXECUTANDO LIMPEZA AUTOMÁTICA DO SISTEMA DE LEITURA DO MERCADO...');
            
            const resultado = await pool.query(`
                WITH dados_removidos AS (
                    DELETE FROM sistema_leitura_mercado 
                    WHERE timestamp < NOW() - INTERVAL '24 hours'
                    RETURNING id
                ),
                logs_removidos AS (
                    DELETE FROM system_logs 
                    WHERE created_at < NOW() - INTERVAL '24 hours'
                    AND message LIKE '%SISTEMA DE LEITURA%'
                    RETURNING id
                ),
                sinais_removidos AS (
                    DELETE FROM ia_analysis_results 
                    WHERE created_at < NOW() - INTERVAL '24 hours'
                    RETURNING id
                )
                SELECT 
                    (SELECT COUNT(*) FROM dados_removidos) as leituras_removidas,
                    (SELECT COUNT(*) FROM logs_removidos) as logs_removidos,
                    (SELECT COUNT(*) FROM sinais_removidos) as sinais_removidos
            `);

            const stats = resultado.rows[0];
            
            console.log(`   ✅ Limpeza concluída:`);
            console.log(`      📊 ${stats.leituras_removidas} leituras de mercado removidas`);
            console.log(`      📝 ${stats.logs_removidos} logs removidos`);
            console.log(`      🎯 ${stats.sinais_removidos} sinais removidos`);
            
            // Log da limpeza
            await pool.query(`
                INSERT INTO system_logs (level, message, created_at) 
                VALUES ('INFO', 'SISTEMA DE LEITURA DO MERCADO: Limpeza automática executada - ${stats.leituras_removidas} registros removidos', NOW())
            `);

        } catch (error) {
            console.error('❌ Erro na limpeza automática:', error.message);
        }
    }

    // ================================================
    // 🔄 CICLO PRINCIPAL DE LEITURA
    // ================================================
    async executarLeituraMercado() {
        if (this.isRunning) {
            console.log('⏳ Leitura anterior ainda em andamento...');
            return;
        }

        this.isRunning = true;
        const timestamp = new Date().toISOString();

        try {
            console.log('\n🎯 === NOVA LEITURA DO MERCADO ===');
            console.log('📅 Timestamp:', timestamp);

            // 1. Fear & Greed
            const fearGreedData = await this.lerFearGreed();
            
            // 2. Binance TOP 100
            const binanceData = await this.lerBinanceTop100();
            
            // 3. Dominância BTC
            const dominanciaData = await this.lerDominanciaBTC();
            
            // 4. Análise IA
            const iaData = await this.consultarIA(fearGreedData, binanceData, dominanciaData);

            // 5. Consolidar dados
            const leituraCompleta = {
                timestamp: timestamp,
                fearGreed: fearGreedData,
                binance: binanceData,
                dominancia: dominanciaData,
                ia: iaData
            };

            // 6. Salvar no banco
            await this.salvarLeituraMercado(leituraCompleta);

            // 7. Resultado final
            this.ultimaLeitura = leituraCompleta;

            console.log('\n✅ === LEITURA CONCLUÍDA ===');
            console.log(`🎯 DIREÇÃO FINAL: ${iaData.direcao_final}`);
            console.log(`📊 Confiança: ${Math.round(iaData.confianca * 100)}%`);
            console.log(`⚠️ Redução parâmetros: ${iaData.reducao_parametros ? 'SIM' : 'NÃO'}`);
            console.log(`💡 Justificativa: ${iaData.justificativa}`);

            return leituraCompleta;

        } catch (error) {
            console.error('❌ Erro na leitura do mercado:', error.message);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    // ================================================
    // 🚀 INICIALIZAÇÃO DO SISTEMA
    // ================================================
    iniciarSistema() {
        console.log('🔄 Iniciando SISTEMA DE LEITURA DO MERCADO...');
        
        // Primeira leitura imediata
        this.executarLeituraMercado();
        
        // Leituras regulares (15 minutos)
        setInterval(() => {
            this.executarLeituraMercado();
        }, CONFIG.LEITURA_INTERVAL);
        
        // Limpeza automática (24 horas)
        setInterval(() => {
            this.executarLimpezaAutomatica();
        }, CONFIG.LIMPEZA_INTERVAL);
        
        console.log('✅ Sistema ativo! Pressione Ctrl+C para parar');
    }

    // Obter última leitura
    obterUltimaLeitura() {
        return this.ultimaLeitura;
    }
}

// ================================================
// INICIALIZAÇÃO E EXPORTAÇÃO
// ================================================

const sistemaLeitura = new SistemaLeituraMercado();

// Verificar argumentos de linha de comando
if (process.argv.includes('--once')) {
    console.log('🔄 Executando leitura única...');
    sistemaLeitura.executarLeituraMercado()
        .then(resultado => {
            console.log('\n✅ RESULTADO DA LEITURA:');
            console.log(`📊 F&G: ${resultado.fearGreed.valor} → ${resultado.fearGreed.direcao_permitida}`);
            console.log(`💰 Binance: ${resultado.binance.percentual_positivas.toFixed(1)}% positivas`);
            console.log(`🎯 IA: ${resultado.ia.direcao_final} (${Math.round(resultado.ia.confianca * 100)}%)`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro:', error.message);
            process.exit(1);
        });
} else if (process.argv.includes('--cleanup')) {
    console.log('🧹 Executando limpeza manual...');
    sistemaLeitura.executarLimpezaAutomatica()
        .then(() => {
            console.log('✅ Limpeza concluída');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro na limpeza:', error.message);
            process.exit(1);
        });
} else {
    // Modo contínuo
    sistemaLeitura.iniciarSistema();
}

// Exportar para uso em outros módulos
module.exports = sistemaLeitura;
