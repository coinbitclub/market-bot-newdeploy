#!/usr/bin/env node
/**
 * 🤖 SISTEMA IA COMPLETO - ANÁLISE A CADA 15 MINUTOS
 * Fluxo: CoinStats → Binance → OpenAI → Decisão Final
 */

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

class SistemaIACompleto {
    constructor() {
        this.updateInterval = 15 * 60 * 1000; // 15 minutos
        this.isRunning = false;
        this.ultimaAnalise = null;
        
        console.log('🚀 SISTEMA IA COMPLETO INICIADO');
        console.log('⏰ Análise a cada 15 minutos');
        console.log('🔄 Fluxo: CoinStats → Binance → OpenAI → Decisão\n');
    }

    async executarCicloCompleto() {
        if (this.isRunning) {
            console.log('⏳ Análise anterior ainda em andamento...');
            return;
        }

        this.isRunning = true;
        const timestamp = new Date().toISOString();
        
        try {
            console.log('\n🚀 === NOVO CICLO DE ANÁLISE ===');
            console.log('📅 Timestamp:', timestamp);
            
            // ETAPA 1: COINSTATS (Fear & Greed)
            console.log('\n1️⃣ COLETANDO FEAR & GREED...');
            const fearGreedData = await this.coletarFearGreed();
            console.log(`📊 FGI: ${fearGreedData.value} (${fearGreedData.classification})`);
            
            // ETAPA 2: BINANCE (Top Cryptocurrencies)
            console.log('\n2️⃣ COLETANDO DADOS BINANCE...');
            const binanceData = await this.coletarBinance();
            console.log(`💰 Top 5 moedas por volume coletadas`);
            
            // ETAPA 3: OPENAI (Análise Inteligente)
            console.log('\n3️⃣ CONSULTANDO IA PARA ANÁLISE...');
            const iaAnalise = await this.consultarIA(fearGreedData, binanceData);
            console.log(`🤖 IA Decidiu: ${iaAnalise.direcao}`);
            
            // ETAPA 4: SALVAR NO BANCO
            console.log('\n4️⃣ SALVANDO RESULTADOS...');
            await this.salvarAnaliseCompleta({
                fear_greed: fearGreedData,
                binance_data: binanceData,
                ia_analysis: iaAnalise,
                timestamp: timestamp
            });
            
            // ETAPA 5: RESULTADO FINAL
            const resultado = {
                timestamp: timestamp,
                fear_greed_index: fearGreedData.value,
                fear_greed_class: fearGreedData.classification,
                binance_sentiment: binanceData.market_sentiment,
                ia_direction: iaAnalise.direcao,
                ia_confidence: iaAnalise.confidence,
                final_decision: iaAnalise.direcao,
                reasoning: iaAnalise.reasoning
            };

            this.ultimaAnalise = resultado;
            
            console.log('\n✅ === ANÁLISE CONCLUÍDA ===');
            console.log(`🎯 DIREÇÃO FINAL: ${resultado.final_decision}`);
            console.log(`📊 Confiança: ${Math.round(resultado.ia_confidence * 100)}%`);
            console.log(`💡 Razão: ${resultado.reasoning}`);
            
            return resultado;

        } catch (error) {
            console.error('❌ Erro no ciclo de análise:', error.message);
            
            // Fallback: usar apenas Fear & Greed
            if (error.fearGreedData) {
                const fallback = this.decisaoFallback(error.fearGreedData);
                console.log(`🔄 Usando decisão fallback: ${fallback.direcao}`);
                return fallback;
            }
            
            throw error;
            
        } finally {
            this.isRunning = false;
        }
    }

    async coletarFearGreed() {
        try {
            const response = await axios.get('https://openapiv1.coinstats.app/insights/fear-and-greed', {
                headers: {
                    'X-API-KEY': 'ZFIxigBcVaCyXDL1Qp/Ork7TOL3+h07NM2f3YoSrMkI=',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            const data = response.data;
            const valor = data.now?.value || 50;
            const classificacao = data.now?.value_classification || 'Neutral';

            return {
                value: valor,
                classification: classificacao,
                timestamp: data.now?.update_time || new Date().toISOString(),
                source: 'coinstats_real'
            };

        } catch (error) {
            console.log('⚠️ Erro CoinStats, usando fallback');
            return {
                value: 50,
                classification: 'Neutral',
                timestamp: new Date().toISOString(),
                source: 'fallback'
            };
        }
    }

    async coletarBinance() {
        try {
            const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
                timeout: 10000
            });

            const top5 = response.data
                .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                .slice(0, 5)
                .map(coin => ({
                    symbol: coin.symbol,
                    price: parseFloat(coin.lastPrice),
                    change_24h: parseFloat(coin.priceChangePercent),
                    volume: parseFloat(coin.quoteVolume)
                }));

            // Calcular sentimento baseado em mudanças de preço
            const mudancas = top5.map(c => c.change_24h);
            const mediaVariacao = mudancas.reduce((a, b) => a + b, 0) / mudancas.length;
            
            let sentiment;
            if (mediaVariacao > 2) sentiment = 'BULLISH';
            else if (mediaVariacao < -2) sentiment = 'BEARISH';
            else sentiment = 'NEUTRAL';

            return {
                top5_coins: top5,
                market_sentiment: sentiment,
                average_change: mediaVariacao,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.log('⚠️ Erro Binance, usando fallback');
            return {
                top5_coins: [],
                market_sentiment: 'NEUTRAL',
                average_change: 0,
                timestamp: new Date().toISOString()
            };
        }
    }

    async consultarIA(fearGreedData, binanceData) {
        try {
            const prompt = `
ANÁLISE DE MERCADO CRIPTO - DECISÃO DE TRADING

DADOS ATUAIS:
- Fear & Greed Index: ${fearGreedData.value} (${fearGreedData.classification})
- Sentimento Binance: ${binanceData.market_sentiment}
- Variação média TOP 5: ${binanceData.average_change.toFixed(2)}%

REGRAS:
- FGI < 30: Forte indicação LONG (medo extremo = oportunidade compra)
- FGI > 80: Forte indicação SHORT (ganância extrema = provável correção)
- FGI 30-80: NEUTRO (permite ambas direções)

RESPONDA EM JSON:
{
  "direcao": "LONG/SHORT/NEUTRO",
  "confidence": 0.0-1.0,
  "reasoning": "explicação em 1 linha"
}
`;

            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Você é um analista de trading de criptomoedas. Sempre responda em JSON válido.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 150,
                temperature: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 20000
            });

            const iaResponse = response.data.choices[0].message.content;
            console.log('🤖 Resposta IA:', iaResponse);

            try {
                const parsed = JSON.parse(iaResponse);
                return {
                    direcao: parsed.direcao || 'NEUTRO',
                    confidence: parsed.confidence || 0.5,
                    reasoning: parsed.reasoning || 'Análise padrão',
                    source: 'openai_real',
                    tokens_used: response.data.usage?.total_tokens || 0
                };
            } catch (parseError) {
                // Se não conseguir parsear JSON, extrair direção do texto
                const texto = iaResponse.toUpperCase();
                let direcao = 'NEUTRO';
                if (texto.includes('LONG')) direcao = 'LONG';
                else if (texto.includes('SHORT')) direcao = 'SHORT';

                return {
                    direcao: direcao,
                    confidence: 0.6,
                    reasoning: 'Análise baseada em Fear & Greed',
                    source: 'openai_fallback'
                };
            }

        } catch (error) {
            console.log('⚠️ OpenAI indisponível, usando lógica Fear & Greed');
            return this.decisaoFallback(fearGreedData);
        }
    }

    decisaoFallback(fearGreedData) {
        const fgi = fearGreedData.value;
        let direcao, confidence, reasoning;

        if (fgi < 30) {
            direcao = 'LONG';
            confidence = 0.8;
            reasoning = 'FGI baixo indica medo extremo - oportunidade de compra';
        } else if (fgi > 80) {
            direcao = 'SHORT';
            confidence = 0.8;
            reasoning = 'FGI alto indica ganância extrema - risco de correção';
        } else {
            direcao = 'NEUTRO';
            confidence = 0.6;
            reasoning = 'FGI neutro - permite posições em ambas direções';
        }

        return {
            direcao: direcao,
            confidence: confidence,
            reasoning: reasoning,
            source: 'fear_greed_logic'
        };
    }

    async salvarAnaliseCompleta(dados) {
        try {
            await pool.query(`
                INSERT INTO ia_analysis_results (
                    fear_greed_index, market_sentiment, confidence_score, 
                    reasoning, raw_data, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                dados.fear_greed.value,
                dados.ia_analysis.direcao,
                dados.ia_analysis.confidence,
                dados.ia_analysis.reasoning,
                JSON.stringify(dados),
                new Date()
            ]);
            
            console.log('💾 Dados salvos no PostgreSQL');
        } catch (error) {
            console.log('⚠️ Erro ao salvar:', error.message);
        }
    }

    iniciarMonitoramento() {
        console.log('🔄 Iniciando monitoramento contínuo...');
        
        // Primeira execução imediata
        this.executarCicloCompleto();
        
        // Agendar execuções a cada 15 minutos
        setInterval(() => {
            this.executarCicloCompleto();
        }, this.updateInterval);
        
        console.log('✅ Sistema rodando! Pressione Ctrl+C para parar');
    }

    obterUltimaAnalise() {
        return this.ultimaAnalise;
    }
}

// Inicialização
const sistema = new SistemaIACompleto();

// Verificar argumentos de linha de comando
const args = process.argv.slice(2);

if (args.includes('--once')) {
    console.log('🔄 Executando análise única...');
    sistema.executarCicloCompleto()
        .then(resultado => {
            console.log('\n✅ RESULTADO:');
            console.log(`FGI: ${resultado.fear_greed_index}`);
            console.log(`Direção: ${resultado.final_decision}`);
            console.log(`Fonte: ${resultado.reasoning}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro:', error.message);
            process.exit(1);
        });
} else {
    // Modo contínuo
    sistema.iniciarMonitoramento();
}

// Exportar para uso em outros módulos
module.exports = sistema;
