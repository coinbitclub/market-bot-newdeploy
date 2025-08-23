/**
 * ===============================================
 * 📊 MARKET PULSE TOP 100 - IMPLEMENTAÇÃO COMPLETA
 * ===============================================
 * Arquivo: market-pulse-top100-completo.js
 * Versão: 1.0.0
 * Data: 2025-08-22
 * 
 * 🎯 OBJETIVO:
 * Implementação completa das métricas Market Pulse conforme especificação:
 * 
 * 📋 MÉTRICAS IMPLEMENTADAS:
 * • PM+ = (Moedas com Δ24h > 0 / 100) × 100
 * • PM- = 100 - PM+  
 * • VWΔ = Σ(Δ24h × Volume) / ΣVolume
 * 
 * 🎯 REGRAS DE DECISÃO:
 * • Somente LONG: PM+ ≥ 60% e VWΔ > 0,5%
 * • Somente SHORT: PM- ≥ 60% e VWΔ < -0,5%
 * • LONG E SHORT: PM+ entre 40% e 60% ou VWΔ entre -0,5% e +0,5%
 * 
 * ⚠️ REGRA CRÍTICA:
 * SISTEMA NÃO EXECUTA ORDENS EM DIREÇÃO NEUTRA
 * Apenas operações em LONG ou SHORT conforme premissas
 */

const axios = require('axios');
const { Pool } = require('pg');

// ===============================================
// 🎨 CONFIGURAÇÕES
// ===============================================

const CONFIG = {
    // APIs
    BINANCE_TICKER_24H: 'https://api.binance.com/api/v3/ticker/24hr',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_COMPLETIONS: 'https://api.openai.com/v1/chat/completions',
    
    // Database
    DATABASE_URL: process.env.DATABASE_URL,
    
    // Thresholds para Market Pulse
    THRESHOLDS: {
        PM_LONG_MIN: 60,        // PM+ ≥ 60% para SOMENTE_LONG
        PM_SHORT_MIN: 60,       // PM- ≥ 60% para SOMENTE_SHORT
        VWD_LONG_MIN: 0.5,      // VWΔ > 0,5% para SOMENTE_LONG
        VWD_SHORT_MAX: -0.5,    // VWΔ < -0,5% para SOMENTE_SHORT
        PM_NEUTRAL_MIN: 40,     // PM+ entre 40-60% para LONG_E_SHORT
        PM_NEUTRAL_MAX: 60,
        VWD_NEUTRAL_MIN: -0.5,  // VWΔ entre -0,5% e +0,5% para LONG_E_SHORT
        VWD_NEUTRAL_MAX: 0.5
    }
};

// ===============================================
// 🏗️ CLASSE PRINCIPAL - MARKET PULSE
// ===============================================

class MarketPulseTop100 {
    constructor() {
        this.pool = new Pool({
            connectionString: CONFIG.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.lastReading = null;
        this.isRunning = false;
    }

    // ===============================================
    // 📊 COLETA DE DADOS TOP 100 BINANCE
    // ===============================================
    
    async coletarDadosTop100() {
        console.log('📊 Coletando dados TOP 100 Binance...');
        
        try {
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
                    count: parseInt(ticker.count)
                }))
                .sort((a, b) => b.quoteVolume - a.quoteVolume)
                .slice(0, 100);

            console.log(`✅ Coletados ${top100.length} pares TOP 100`);
            return top100;

        } catch (error) {
            console.error('❌ Erro na coleta Binance:', error.message);
            throw error;
        }
    }

    // ===============================================
    // 🧮 CÁLCULO DAS MÉTRICAS MARKET PULSE
    // ===============================================
    
    calcularMetricasMarketPulse(top100Data) {
        console.log('🧮 Calculando métricas Market Pulse...');
        
        // 1. PM+ = (Moedas com Δ24h > 0 / 100) × 100
        const moedasPositivas = top100Data.filter(coin => coin.priceChangePercent > 0).length;
        const PM_PLUS = (moedasPositivas / 100) * 100;
        
        // 2. PM- = 100 - PM+
        const PM_MINUS = 100 - PM_PLUS;
        
        // 3. VWΔ = Σ(Δ24h × Volume) / ΣVolume (Variação Ponderada por Volume)
        const totalVolume = top100Data.reduce((sum, coin) => sum + coin.quoteVolume, 0);
        const VWD = top100Data.reduce((sum, coin) => {
            return sum + (coin.priceChangePercent * (coin.quoteVolume / totalVolume));
        }, 0);
        
        // Estatísticas adicionais
        const moedasNegativas = top100Data.filter(coin => coin.priceChangePercent < 0).length;
        const moedasNeutras = top100Data.filter(coin => coin.priceChangePercent === 0).length;
        const variacaoMedia = top100Data.reduce((sum, coin) => sum + coin.priceChangePercent, 0) / 100;
        
        const metricas = {
            PM_PLUS: PM_PLUS,
            PM_MINUS: PM_MINUS,
            VWD: VWD,
            moedas_positivas: moedasPositivas,
            moedas_negativas: moedasNegativas,
            moedas_neutras: moedasNeutras,
            variacao_media: variacaoMedia,
            total_volume: totalVolume,
            timestamp: new Date().toISOString()
        };
        
        console.log('📈 Métricas calculadas:');
        console.log(`   PM+: ${PM_PLUS.toFixed(2)}%`);
        console.log(`   PM-: ${PM_MINUS.toFixed(2)}%`);
        console.log(`   VWΔ: ${VWD.toFixed(3)}%`);
        console.log(`   Moedas positivas: ${moedasPositivas}/100`);
        console.log(`   Volume total: $${(totalVolume / 1e9).toFixed(2)}B`);
        
        return metricas;
    }

    // ===============================================
    // 🎯 APLICAÇÃO DAS REGRAS DE DECISÃO
    // ===============================================
    
    aplicarRegrasDecisao(metricas, fearGreedData) {
        console.log('🎯 Aplicando regras de decisão Market Pulse...');
        
        const { PM_PLUS, PM_MINUS, VWD } = metricas;
        const fearGreedValue = fearGreedData.valor || fearGreedData.value || 50;
        
        let direcaoFinal = 'NEUTRO';
        let fonte = 'FEAR_GREED';
        let confianca = 0.5;
        let justificativa = '';
        let executaOperacoes = false; // REGRA CRÍTICA: não executa em NEUTRO
        
        // 1️⃣ PRIORIDADE: Fear & Greed determina se análise é necessária
        if (fearGreedValue < 30) {
            // Fear extremo - SOMENTE LONG (prevalece sempre)
            direcaoFinal = 'SOMENTE_LONG';
            fonte = 'FEAR_GREED_EXTREMO';
            confianca = 0.9;
            justificativa = `Fear extremo (${fearGreedValue}) - SOMENTE LONG independente do Market Pulse`;
            executaOperacoes = true;
            
        } else if (fearGreedValue > 80) {
            // Greed extremo - SOMENTE SHORT (prevalece sempre)
            direcaoFinal = 'SOMENTE_SHORT';
            fonte = 'FEAR_GREED_EXTREMO';
            confianca = 0.9;
            justificativa = `Greed extremo (${fearGreedValue}) - SOMENTE SHORT independente do Market Pulse`;
            executaOperacoes = true;
            
        } else {
            // 2️⃣ ZONA NEUTRA (30-80): Market Pulse decide a direção
            fonte = 'MARKET_PULSE';
            
            // Aplicar regras específicas do Market Pulse
            if (PM_PLUS >= CONFIG.THRESHOLDS.PM_LONG_MIN && VWD > CONFIG.THRESHOLDS.VWD_LONG_MIN) {
                // Somente operações LONG
                direcaoFinal = 'SOMENTE_LONG';
                confianca = 0.85;
                justificativa = `Market Pulse BULLISH: ${PM_PLUS.toFixed(1)}% positivas + VWΔ ${VWD.toFixed(2)}%`;
                executaOperacoes = true;
                
            } else if (PM_MINUS >= CONFIG.THRESHOLDS.PM_SHORT_MIN && VWD < CONFIG.THRESHOLDS.VWD_SHORT_MAX) {
                // Somente operações SHORT
                direcaoFinal = 'SOMENTE_SHORT';
                confianca = 0.85;
                justificativa = `Market Pulse BEARISH: ${PM_MINUS.toFixed(1)}% negativas + VWΔ ${VWD.toFixed(2)}%`;
                executaOperacoes = true;
                
            } else if (
                (PM_PLUS >= CONFIG.THRESHOLDS.PM_NEUTRAL_MIN && PM_PLUS <= CONFIG.THRESHOLDS.PM_NEUTRAL_MAX) ||
                (VWD >= CONFIG.THRESHOLDS.VWD_NEUTRAL_MIN && VWD <= CONFIG.THRESHOLDS.VWD_NEUTRAL_MAX)
            ) {
                // Zona neutra - IA decide se vale abrir operações
                direcaoFinal = 'AGUARDAR_IA';
                confianca = 0.4;
                justificativa = `Market Pulse neutro: ${PM_PLUS.toFixed(1)}% positivas, VWΔ ${VWD.toFixed(2)}% - IA decidirá`;
                executaOperacoes = false; // ⚠️ NÃO EXECUTA automaticamente
                
            } else {
                // Condições não claras - sistema aguarda
                direcaoFinal = 'NEUTRO';
                confianca = 0.3;
                justificativa = `Condições mistas: PM+ ${PM_PLUS.toFixed(1)}%, VWΔ ${VWD.toFixed(2)}% - aguardando clareza`;
                executaOperacoes = false; // ⚠️ NÃO EXECUTA
            }
        }
        
        const decisao = {
            direcao_final: direcaoFinal,
            fonte_decisao: fonte,
            confianca: confianca,
            justificativa: justificativa,
            executa_operacoes: executaOperacoes, // REGRA CRÍTICA
            
            // Dados de apoio
            fear_greed_value: fearGreedValue,
            market_pulse: {
                PM_PLUS: PM_PLUS,
                PM_MINUS: PM_MINUS,
                VWD: VWD
            },
            
            // Regras aplicadas
            regras_aplicadas: {
                fear_greed_extremo: fearGreedValue < 30 || fearGreedValue > 80,
                market_pulse_long: PM_PLUS >= CONFIG.THRESHOLDS.PM_LONG_MIN && VWD > CONFIG.THRESHOLDS.VWD_LONG_MIN,
                market_pulse_short: PM_MINUS >= CONFIG.THRESHOLDS.PM_SHORT_MIN && VWD < CONFIG.THRESHOLDS.VWD_SHORT_MAX,
                zona_neutra: fonte === 'MARKET_PULSE' && !executaOperacoes
            },
            
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 Decisão final:');
        console.log(`   Direção: ${direcaoFinal}`);
        console.log(`   Fonte: ${fonte}`);
        console.log(`   Confiança: ${(confianca * 100).toFixed(1)}%`);
        console.log(`   Executa operações: ${executaOperacoes ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`   Justificativa: ${justificativa}`);
        
        return decisao;
    }

    // ===============================================
    // 🤖 ANÁLISE IA PARA ZONA NEUTRA
    // ===============================================
    
    async analisarComIA(metricas, decisaoInicial) {
        // Só chama IA se estiver em zona neutra e for necessário
        if (decisaoInicial.direcao_final !== 'AGUARDAR_IA') {
            return decisaoInicial;
        }
        
        console.log('🤖 Consultando IA para zona neutra...');
        
        try {
            const prompt = `
ANÁLISE MARKET PULSE - ZONA NEUTRA DE TRADING

SITUAÇÃO ATUAL:
- Fear & Greed: ${decisaoInicial.fear_greed_value} (zona neutra 30-80)
- PM+ (% Moedas Positivas): ${metricas.PM_PLUS.toFixed(2)}%
- PM- (% Moedas Negativas): ${metricas.PM_MINUS.toFixed(2)}%
- VWΔ (Variação Ponderada): ${metricas.VWD.toFixed(3)}%
- Volume Total: $${(metricas.total_volume / 1e9).toFixed(2)}B

REGRAS DO SISTEMA:
⚠️ CRÍTICO: Sistema NÃO executa operações em direção NEUTRA
✅ Só autorizar se houver direção clara: SOMENTE_LONG ou SOMENTE_SHORT

CRITÉRIOS DE DECISÃO:
1. Se tendência LONG clara (momentum, volume, dominância) → SOMENTE_LONG
2. Se tendência SHORT clara (correção, medo, distribuição) → SOMENTE_SHORT  
3. Se indefinido/misto → AGUARDAR (NÃO EXECUTAR)

Analise os dados e decida:

RESPONDA EM JSON:
{
  "direcao_ia": "SOMENTE_LONG|SOMENTE_SHORT|AGUARDAR",
  "confianca": 0.0-1.0,
  "justificativa": "explicação em 1 linha",
  "autoriza_execucao": true/false
}
`;

            const response = await axios.post(CONFIG.OPENAI_COMPLETIONS, {
                model: 'gpt-4o-mini',
                messages: [
                    { 
                        role: 'system', 
                        content: 'Você é um especialista em análise de mercado cripto. Seja conservador - só autorize execução se direção for muito clara. NUNCA autorize operações em zona neutra indefinida.'
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 200,
                temperature: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            const aiAnalysis = JSON.parse(response.data.choices[0].message.content);
            
            // Aplicar decisão da IA
            if (aiAnalysis.autoriza_execucao && ['SOMENTE_LONG', 'SOMENTE_SHORT'].includes(aiAnalysis.direcao_ia)) {
                decisaoInicial.direcao_final = aiAnalysis.direcao_ia;
                decisaoInicial.fonte_decisao = 'IA_ZONA_NEUTRA';
                decisaoInicial.confianca = Math.min(aiAnalysis.confianca, 0.7); // Max 70% em zona neutra
                decisaoInicial.justificativa = `IA: ${aiAnalysis.justificativa}`;
                decisaoInicial.executa_operacoes = true;
            } else {
                // IA decidiu aguardar
                decisaoInicial.direcao_final = 'AGUARDAR';
                decisaoInicial.fonte_decisao = 'IA_AGUARDAR';
                decisaoInicial.executa_operacoes = false;
                decisaoInicial.justificativa = `IA: ${aiAnalysis.justificativa} - Aguardando clareza`;
            }
            
            decisaoInicial.analise_ia = aiAnalysis;
            
            console.log(`🤖 IA decidiu: ${aiAnalysis.direcao_ia} (${aiAnalysis.autoriza_execucao ? 'EXECUTA' : 'AGUARDA'})`);
            
        } catch (error) {
            console.warn('⚠️ Erro na análise IA, mantendo AGUARDAR:', error.message);
            decisaoInicial.direcao_final = 'AGUARDAR';
            decisaoInicial.executa_operacoes = false;
            decisaoInicial.fonte_decisao = 'IA_ERROR_AGUARDAR';
        }
        
        return decisaoInicial;
    }

    // ===============================================
    // 💾 SALVAR NO BANCO DE DADOS
    // ===============================================
    
    async salvarMarketPulse(metricas, decisao, top100Data) {
        console.log('💾 Salvando Market Pulse no banco...');
        
        try {
            // 1. Salvar dados básicos na tabela market_pulse
            await this.pool.query(`
                INSERT INTO market_pulse (
                    pm_plus, pm_minus, vwd, 
                    moedas_positivas, moedas_negativas, moedas_neutras,
                    variacao_media, total_volume,
                    direcao_final, fonte_decisao, confianca, justificativa,
                    executa_operacoes, fear_greed_value,
                    raw_data, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
            `, [
                metricas.PM_PLUS, metricas.PM_MINUS, metricas.VWD,
                metricas.moedas_positivas, metricas.moedas_negativas, metricas.moedas_neutras,
                metricas.variacao_media, metricas.total_volume,
                decisao.direcao_final, decisao.fonte_decisao, decisao.confianca, decisao.justificativa,
                decisao.executa_operacoes, decisao.fear_greed_value,
                JSON.stringify({ metricas, decisao, sample_coins: top100Data.slice(0, 10) })
            ]);
            
            // 2. Atualizar tabela system_status com última leitura
            await this.pool.query(`
                INSERT INTO system_status (
                    component, status, last_update, details
                ) VALUES ($1, $2, NOW(), $3)
                ON CONFLICT (component) 
                DO UPDATE SET 
                    status = $2, 
                    last_update = NOW(), 
                    details = $3
            `, [
                'market_pulse_top100',
                decisao.executa_operacoes ? 'ACTIVE' : 'STANDBY',
                JSON.stringify({
                    direction: decisao.direcao_final,
                    confidence: decisao.confianca,
                    pm_plus: metricas.PM_PLUS,
                    vwd: metricas.VWD,
                    executes: decisao.executa_operacoes
                })
            ]);
            
            console.log('✅ Market Pulse salvo no banco');
            
        } catch (error) {
            console.error('❌ Erro ao salvar no banco:', error.message);
            throw error;
        }
    }

    // ===============================================
    // 🔄 EXECUÇÃO COMPLETA DO CICLO
    // ===============================================
    
    async executarCicloCompleto(fearGreedData = null) {
        if (this.isRunning) {
            console.log('⚠️ Ciclo já em execução, aguardando...');
            return this.lastReading;
        }
        
        this.isRunning = true;
        console.log('🚀 Iniciando ciclo completo Market Pulse TOP 100...');
        
        try {
            // 1. Coletar dados Fear & Greed se não fornecido
            if (!fearGreedData) {
                fearGreedData = await this.obterFearGreedAtual();
            }
            
            // 2. Coletar dados TOP 100 Binance
            const top100Data = await this.coletarDadosTop100();
            
            // 3. Calcular métricas Market Pulse
            const metricas = this.calcularMetricasMarketPulse(top100Data);
            
            // 4. Aplicar regras de decisão
            let decisao = this.aplicarRegrasDecisao(metricas, fearGreedData);
            
            // 5. Análise IA se necessário (zona neutra)
            decisao = await this.analisarComIA(metricas, decisao);
            
            // 6. Salvar no banco
            await this.salvarMarketPulse(metricas, decisao, top100Data);
            
            // 7. Preparar resultado final
            const resultado = {
                success: true,
                timestamp: new Date().toISOString(),
                metricas: metricas,
                decisao: decisao,
                
                // Resumo executivo
                resumo: {
                    direcao: decisao.direcao_final,
                    executa_operacoes: decisao.executa_operacoes,
                    confianca: `${(decisao.confianca * 100).toFixed(1)}%`,
                    fonte: decisao.fonte_decisao,
                    pm_plus: `${metricas.PM_PLUS.toFixed(1)}%`,
                    vwd: `${metricas.VWD.toFixed(2)}%`
                }
            };
            
            this.lastReading = resultado;
            
            console.log('🎉 Ciclo Market Pulse concluído com sucesso!');
            console.log(`📊 Resultado: ${decisao.direcao_final} (${decisao.executa_operacoes ? 'EXECUTA' : 'AGUARDA'})`);
            
            return resultado;
            
        } catch (error) {
            console.error('❌ Erro no ciclo Market Pulse:', error.message);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    // ===============================================
    // 🔧 MÉTODOS AUXILIARES
    // ===============================================
    
    async obterFearGreedAtual() {
        // Buscar último Fear & Greed do banco ou API
        try {
            const result = await this.pool.query(`
                SELECT fear_greed_index as valor, classification as classificacao
                FROM fear_greed_index 
                ORDER BY created_at DESC 
                LIMIT 1
            `);
            
            if (result.rows.length > 0) {
                return result.rows[0];
            }
            
            // Fallback
            return { valor: 50, classificacao: 'Neutral' };
            
        } catch (error) {
            console.warn('⚠️ Erro ao obter Fear & Greed, usando fallback');
            return { valor: 50, classificacao: 'Neutral' };
        }
    }

    async obterUltimaLeitura() {
        return this.lastReading;
    }

    async obterStatus() {
        return {
            is_running: this.isRunning,
            last_reading: this.lastReading?.timestamp || null,
            database_connected: !!this.pool
        };
    }

    // ===============================================
    // 🏗️ INICIALIZAÇÃO DO BANCO
    // ===============================================
    
    async inicializarBanco() {
        console.log('🏗️ Inicializando estrutura Market Pulse...');
        
        try {
            // Criar tabela market_pulse se não existir
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS market_pulse (
                    id SERIAL PRIMARY KEY,
                    pm_plus DECIMAL(5,2) NOT NULL,
                    pm_minus DECIMAL(5,2) NOT NULL,
                    vwd DECIMAL(6,3) NOT NULL,
                    moedas_positivas INTEGER NOT NULL,
                    moedas_negativas INTEGER NOT NULL,
                    moedas_neutras INTEGER NOT NULL,
                    variacao_media DECIMAL(6,3),
                    total_volume BIGINT,
                    direcao_final VARCHAR(20) NOT NULL,
                    fonte_decisao VARCHAR(30) NOT NULL,
                    confianca DECIMAL(3,2) NOT NULL,
                    justificativa TEXT,
                    executa_operacoes BOOLEAN NOT NULL DEFAULT false,
                    fear_greed_value INTEGER,
                    raw_data JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);
            
            // Índices para performance
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_market_pulse_created_at ON market_pulse(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_market_pulse_direcao ON market_pulse(direcao_final);
                CREATE INDEX IF NOT EXISTS idx_market_pulse_executa ON market_pulse(executa_operacoes);
            `);
            
            console.log('✅ Estrutura Market Pulse inicializada');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error.message);
            throw error;
        }
    }

    // ===============================================
    // 🧠 ANÁLISE DE DIREÇÃO DO MERCADO
    // ===============================================
    
    async analisarDirecaoMercado(metricas) {
        console.log('🧠 Analisando direção do mercado com Market Pulse...');
        
        const { PM_PLUS, PM_MINUS, VWD } = metricas;
        
        let direcao_sugerida = 'AGUARDAR';
        let confianca = 0.5;
        let justificativa = '';
        let executa_operacoes = false;
        
        // Aplicar lógica de decisão Market Pulse
        if (PM_PLUS > 58 && VWD > 0.3) {
            direcao_sugerida = 'SOMENTE_LONG';
            confianca = Math.min(0.75, 0.5 + (PM_PLUS - 50) / 100 + Math.abs(VWD) / 10);
            justificativa = `Market Pulse BULLISH: ${PM_PLUS.toFixed(1)}% positivas + VWΔ ${VWD.toFixed(2)}%`;
            executa_operacoes = true;
        } else if (PM_MINUS > 58 && VWD < -0.3) {
            direcao_sugerida = 'SOMENTE_SHORT';
            confianca = Math.min(0.75, 0.5 + (PM_MINUS - 50) / 100 + Math.abs(VWD) / 10);
            justificativa = `Market Pulse BEARISH: ${PM_MINUS.toFixed(1)}% negativas + VWΔ ${VWD.toFixed(2)}%`;
            executa_operacoes = true;
        } else if (PM_PLUS > 52 && VWD > 0.1) {
            direcao_sugerida = 'SOMENTE_LONG';
            confianca = 0.55;
            justificativa = `Market Pulse BULLISH fraco: ${PM_PLUS.toFixed(1)}% positivas`;
            executa_operacoes = true;
        } else if (PM_MINUS > 52 && VWD < -0.1) {
            direcao_sugerida = 'SOMENTE_SHORT';
            confianca = 0.55;
            justificativa = `Market Pulse BEARISH fraco: ${PM_MINUS.toFixed(1)}% negativas`;
            executa_operacoes = true;
        } else {
            direcao_sugerida = 'AGUARDAR';
            confianca = 0.3;
            justificativa = `Market Pulse neutro: ${PM_PLUS.toFixed(1)}% positivas, VWΔ ${VWD.toFixed(2)}% - aguardando`;
            executa_operacoes = false;
        }
        
        return {
            direcao_sugerida,
            confianca,
            justificativa,
            executa_operacoes,
            metricas_utilizadas: { PM_PLUS, PM_MINUS, VWD },
            timestamp: new Date().toISOString()
        };
    }
}

// ===============================================
// 🎯 EXECUÇÃO E EXPORTAÇÃO
// ===============================================

async function executarMarketPulseCompleto(fearGreedData = null) {
    const marketPulse = new MarketPulseTop100();
    
    try {
        await marketPulse.inicializarBanco();
        const resultado = await marketPulse.executarCicloCompleto(fearGreedData);
        return resultado;
    } catch (error) {
        console.error('❌ Erro na execução:', error.message);
        throw error;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    executarMarketPulseCompleto()
        .then(resultado => {
            console.log('\n🎯 RESULTADO FINAL:');
            console.log('===================');
            console.log(`Direção: ${resultado.resumo.direcao}`);
            console.log(`Executa: ${resultado.resumo.executa_operacoes ? '✅ SIM' : '❌ NÃO'}`);
            console.log(`PM+: ${resultado.resumo.pm_plus}`);
            console.log(`VWΔ: ${resultado.resumo.vwd}`);
            console.log(`Fonte: ${resultado.resumo.fonte}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Falha na execução:', error.message);
            process.exit(1);
        });
}

module.exports = {
    MarketPulseTop100,
    CalculadorMarketPulse: MarketPulseTop100,
    executarMarketPulseCompleto
};
