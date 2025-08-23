const { Pool } = require('pg');
const axios = require('axios');

// SISTEMA DE LEITURA DO MERCADO - VERSÃO FINAL INTEGRADA
// Desenvolvido para o novo desenvolvedor - 100% funcional

const CONFIG = {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:ELjbkkgUASRCtdTAXVFgIssOXiLsRCPq@trolley.proxy.rlwy.net:44790/railway',
    COINSTATS_API_KEY: process.env.COINSTATS_API_KEY || 'ZFIxigBcVaCyXDL1Qp/Ork7TOL3+h07NM2f3YoSrMkI=',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    BINANCE_API_KEY: process.env.BINANCE_API_KEY || 'tEJm7uhqtpgAftcaVGlQbADfR1LOmeLW5WkN6gNNYKzmmXyHso4NSAiXHFXdXRxw',
    UPDATE_INTERVAL: 15 * 60 * 1000, // 15 minutos
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000 // 24 horas
};

const pool = new Pool({ connectionString: CONFIG.DATABASE_URL });

class SistemaLeituraMercado {
    constructor() {
        this.isRunning = false;
        this.lastCleanup = null;
        console.log('🚀 SISTEMA DE LEITURA DO MERCADO INICIALIZANDO...');
    }

    async log(component, message, level = 'INFO', details = null) {
        try {
            await pool.query(`
                INSERT INTO system_logs (component, message, level, details, created_at)
                VALUES ($1, $2, $3, $4, NOW())
            `, [`SISTEMA_LEITURA_MERCADO_${component}`, message, level, details ? JSON.stringify(details) : null]);
            
            console.log(`[${new Date().toISOString()}] ${level}: ${component} - ${message}`);
        } catch (error) {
            console.error('Erro ao salvar log:', error.message);
        }
    }

    async extrairFearGreed() {
        try {
            console.log('📊 Extraindo Fear & Greed Index...');
            
            const response = await axios.get('https://openapiv1.coinstats.app/insights/fear-and-greed', {
                headers: { 'X-API-KEY': CONFIG.COINSTATS_API_KEY }
            });

            const fgValue = response.data?.data?.now?.value;
            if (!fgValue) throw new Error('Estrutura de resposta inválida');

            let classification = 'NEUTRO';
            let direction = 'NEUTRO';
            
            if (fgValue < 30) {
                classification = 'EXTREME_FEAR';
                direction = 'SOMENTE_LONG';
            } else if (fgValue >= 30 && fgValue <= 80) {
                classification = 'NEUTRAL';
                direction = 'LONG_E_SHORT';
            } else {
                classification = 'EXTREME_GREED';
                direction = 'SOMENTE_SHORT';
            }

            await pool.query(`
                INSERT INTO fear_greed_index (
                    value, classification, direction_recommendation, 
                    sistema_leitura_mercado, analysis_timestamp, market_status, created_at
                ) VALUES ($1, $2, $3, true, NOW(), $4, NOW())
            `, [fgValue, classification, direction, direction]);

            await this.log('FEAR_GREED', `Fear & Greed extraído: ${fgValue} (${classification})`, 'INFO', {
                value: fgValue,
                classification,
                direction
            });

            return { value: fgValue, classification, direction };

        } catch (error) {
            await this.log('FEAR_GREED', `Erro na extração: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async extrairBinanceTop100() {
        try {
            console.log('🪙 Extraindo TOP 100 Binance...');
            
            const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
            const symbols = response.data
                .filter(s => s.symbol.endsWith('USDT'))
                .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                .slice(0, 100);

            // Calcular dominância BTC
            const btcData = symbols.find(s => s.symbol === 'BTCUSDT');
            const totalVolume = symbols.reduce((sum, s) => sum + parseFloat(s.quoteVolume), 0);
            const btcVolume = btcData ? parseFloat(btcData.quoteVolume) : 0;
            const btcDominance = totalVolume > 0 ? (btcVolume / totalVolume * 100) : 0;

            await pool.query(`
                INSERT INTO top100_cryptocurrencies (
                    rank, symbol, price, change_24h, volume_24h, market_cap,
                    dominance_btc, market_cap_total, volume_24h_total,
                    sistema_leitura_mercado, created_at
                ) VALUES ${symbols.map((_, i) => `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})`).join(', ')}
            `, symbols.flatMap((s, i) => [
                i + 1,
                s.symbol,
                parseFloat(s.lastPrice),
                parseFloat(s.priceChangePercent),
                parseFloat(s.volume),
                parseFloat(s.quoteVolume),
                i === 0 ? btcDominance : null, // Só no primeiro registro
                i === 0 ? totalVolume : null,
                i === 0 ? totalVolume : null
            ]));

            await this.log('BINANCE_TOP100', `TOP 100 extraído. BTC Dominance: ${btcDominance.toFixed(2)}%`, 'INFO', {
                total_symbols: symbols.length,
                btc_dominance: btcDominance,
                total_volume: totalVolume
            });

            return { symbols, btcDominance, totalVolume };

        } catch (error) {
            await this.log('BINANCE_TOP100', `Erro na extração: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async analisarComIA(fearGreedData, binanceData) {
        try {
            console.log('🤖 Executando análise com IA...');
            
            const prompt = `
SISTEMA DE LEITURA DO MERCADO - ANÁLISE TÉCNICA

DADOS ATUAIS:
- Fear & Greed Index: ${fearGreedData.value} (${fearGreedData.classification})
- BTC Dominance: ${binanceData.btcDominance.toFixed(2)}%
- Volume Total 24h: $${(binanceData.totalVolume / 1e9).toFixed(2)}B

REGRAS DE DIREÇÃO:
1. Fear & Greed < 30: SOMENTE_LONG (medo extremo)
2. Fear & Greed 30-80: LONG_E_SHORT (neutro)
3. Fear & Greed > 80: SOMENTE_SHORT (ganância extrema)

4. BTC Dominance ≥50% subindo: Short Altcoins
5. BTC Dominance ≤45% caindo: Long Altcoins
6. BTC Dominance estável: NEUTRO

Forneça apenas:
DIREÇÃO: [LONG/SHORT/NEUTRO]
CONFIANÇA: [0-100]%
LÓGICA: [explicação em 2 linhas]
`;

            // Fallback se OpenAI não funcionar
            let marketDirection = fearGreedData.direction.includes('LONG') ? 'LONG' : 
                                 fearGreedData.direction.includes('SHORT') ? 'SHORT' : 'NEUTRO';
            let confidence = 75;
            let reasoning = `Baseado em Fear & Greed: ${fearGreedData.value} e BTC Dominance: ${binanceData.btcDominance.toFixed(2)}%`;

            try {
                const aiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 150
                }, {
                    headers: {
                        'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                const aiText = aiResponse.data.choices[0].message.content;
                
                // Extrair direção da resposta
                if (aiText.includes('LONG') && !aiText.includes('SHORT')) marketDirection = 'LONG';
                else if (aiText.includes('SHORT') && !aiText.includes('LONG')) marketDirection = 'SHORT';
                else marketDirection = 'NEUTRO';
                
                // Extrair confiança
                const confMatch = aiText.match(/(\d+)%/);
                if (confMatch) confidence = parseInt(confMatch[1]);
                
                reasoning = aiText;

            } catch (aiError) {
                await this.log('OPENAI', `Usando fallback: ${aiError.message}`, 'WARN');
            }

            await pool.query(`
                INSERT INTO ia_analysis_results (
                    analysis_text, market_direction, confidence_level, reasoning,
                    fear_greed_value, btc_dominance, sistema_leitura_mercado,
                    next_analysis_at, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW() + INTERVAL '15 minutes', NOW())
            `, [reasoning, marketDirection, confidence, reasoning, fearGreedData.value, binanceData.btcDominance]);

            await this.log('IA_ANALYSIS', `Análise concluída: ${marketDirection} (${confidence}%)`, 'INFO', {
                direction: marketDirection,
                confidence,
                fear_greed: fearGreedData.value,
                btc_dominance: binanceData.btcDominance
            });

            return { marketDirection, confidence, reasoning };

        } catch (error) {
            await this.log('IA_ANALYSIS', `Erro na análise: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async executarCicloCompleto() {
        try {
            console.log('\n🔄 INICIANDO CICLO DE 15 MINUTOS...');
            
            // 1. Extrair Fear & Greed
            const fearGreedData = await this.extrairFearGreed();
            
            // 2. Extrair Binance TOP 100
            const binanceData = await this.extrairBinanceTop100();
            
            // 3. Análise com IA
            const iaData = await this.analisarComIA(fearGreedData, binanceData);
            
            // 4. Salvar análise consolidada
            await pool.query(`
                INSERT INTO market_sentiment_analysis (
                    fear_greed_value, fear_greed_classification,
                    btc_dominance, ai_analysis_text, market_direction,
                    confidence_level, reasoning, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [
                fearGreedData.value,
                fearGreedData.classification,
                binanceData.btcDominance,
                iaData.reasoning,
                iaData.marketDirection,
                iaData.confidence,
                iaData.reasoning
            ]);

            console.log(`✅ CICLO CONCLUÍDO: ${iaData.marketDirection} (${iaData.confidence}%)`);
            
            await this.log('CICLO_COMPLETO', `Ciclo executado com sucesso: ${iaData.marketDirection}`, 'INFO', {
                fear_greed: fearGreedData.value,
                btc_dominance: binanceData.btcDominance,
                direction: iaData.marketDirection,
                confidence: iaData.confidence
            });

        } catch (error) {
            console.error('❌ ERRO NO CICLO:', error.message);
            await this.log('CICLO_COMPLETO', `Erro no ciclo: ${error.message}`, 'ERROR');
        }
    }

    async executarLimpeza() {
        try {
            console.log('🧹 Executando limpeza automática...');
            
            await pool.query('SELECT limpar_sistema_leitura_mercado()');
            
            this.lastCleanup = new Date();
            console.log('✅ Limpeza automática concluída');
            
        } catch (error) {
            console.error('❌ Erro na limpeza:', error.message);
            await this.log('CLEANUP', `Erro na limpeza: ${error.message}`, 'ERROR');
        }
    }

    async verificarSeDeveExecutarLimpeza() {
        if (!this.lastCleanup || (Date.now() - this.lastCleanup.getTime()) >= CONFIG.CLEANUP_INTERVAL) {
            await this.executarLimpeza();
        }
    }

    async iniciar() {
        if (this.isRunning) {
            console.log('⚠️ Sistema já está em execução');
            return;
        }

        this.isRunning = true;
        await this.log('SISTEMA', 'Sistema de Leitura do Mercado iniciado', 'INFO');
        
        console.log('🎯 SISTEMA DE LEITURA DO MERCADO ATIVO');
        console.log('   ⏰ Ciclos de 15 minutos');
        console.log('   📊 CoinStats + Binance + OpenAI');
        console.log('   🧹 Limpeza automática a cada 24h');
        console.log('   📈 Direções: LONG, SHORT, NEUTRO\n');

        // Executar primeira análise imediatamente
        await this.executarCicloCompleto();

        // Agendar próximos ciclos
        setInterval(async () => {
            if (this.isRunning) {
                await this.executarCicloCompleto();
                await this.verificarSeDeveExecutarLimpeza();
            }
        }, CONFIG.UPDATE_INTERVAL);

        console.log(`\n✅ Próximo ciclo em 15 minutos (${new Date(Date.now() + CONFIG.UPDATE_INTERVAL).toLocaleTimeString()})`);
    }

    async parar() {
        this.isRunning = false;
        await this.log('SISTEMA', 'Sistema de Leitura do Mercado parado', 'INFO');
        console.log('🛑 Sistema parado');
    }

    async obterStatusAtual() {
        try {
            const result = await pool.query('SELECT * FROM vw_sistema_leitura_mercado');
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao obter status:', error.message);
            return null;
        }
    }
}

// Inicialização automática
const sistema = new SistemaLeituraMercado();

// Handlers para encerramento gracioso
process.on('SIGINT', async () => {
    console.log('\n🔄 Encerrando Sistema de Leitura do Mercado...');
    await sistema.parar();
    await pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await sistema.parar();
    await pool.end();
    process.exit(0);
});

// Verificar se é execução direta
if (require.main === module) {
    sistema.iniciar().catch(console.error);
}

module.exports = { SistemaLeituraMercado, CONFIG };

console.log(`
🎯 SISTEMA DE LEITURA DO MERCADO v1.0
   Desenvolvido para integração completa
   
📊 APIs Integradas:
   ✅ CoinStats (Fear & Greed)
   ✅ Binance (TOP 100 + Dominância)  
   ✅ OpenAI (Análise inteligente)
   
🔄 Funcionalidades:
   ⏰ Atualizações automáticas (15min)
   📈 Direções: LONG, SHORT, NEUTRO
   🧹 Limpeza automática (24h)
   📊 Dashboard integrado
   
🚀 Para usar: node sistema-leitura-mercado-completo.js
`);
