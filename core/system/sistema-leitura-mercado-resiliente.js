/**
 * 🔥 SISTEMA DE LEITURA DE MERCADO ENTERPRISE RESILIENTE
 * 
 * Versão otimizada com:
 * - Múltiplas APIs com failover inteligente
 * - Rate limiting e circuit breaker
 * - Pool de conexões otimizado
 * - Recuperação automática de falhas
 */

const axios = require('axios');
const { createRobustPool, safeQuery } = require('./fixed-database-config');

class SistemaLeituraMercadoResilient {
    constructor() {
        this.pool = createRobustPool();
        this.cicloAtual = 0;
        this.falhasConsecutivas = 0;
        this.ultimoSucesso = null;
        this.circuitBreakerAberto = false;
        this.proximaVerificacao = Date.now();
        
        // APIs REAIS do arquivo .env - PRODUÇÃO
        this.apis = [
            {
                nome: 'CoinStats_FearGreed',
                url: process.env.FEAR_GREED_URL || 'https://openapiv1.coinstats.app/insights/fear-and-greed',
                headers: {
                    'X-API-KEY': process.env.COINSTATS_API_KEY || 'YOUR_API_KEY_HERE',
                    'Accept': 'application/json'
                },
                prioridade: 1,
                tentativas: 0,
                ultimaFalha: 0
            },
            {
                nome: 'CoinStats_Bitcoin',
                url: 'https://api.coinstats.app/public/v1/coins/bitcoin',
                headers: {
                    'X-API-KEY': process.env.COINSTATS_API_KEY || 'YOUR_API_KEY_HERE',
                    'Accept': 'application/json'
                },
                prioridade: 2,
                tentativas: 0,
                ultimaFalha: 0
            },
            {
                nome: 'Binance_24hrTicker',
                url: 'https://api.binance.com/api/v3/ticker/24hr',
                params: { symbol: 'BTCUSDT' },
                prioridade: 3,
                tentativas: 0,
                ultimaFalha: 0
            },
            {
                nome: 'Binance_DominanceBTC',
                url: 'https://api.binance.com/api/v3/ticker/24hr',
                params: { symbols: '["BTCUSDT","ETHUSDT","ADAUSDT","DOTUSDT","LINKUSDT"]' },
                prioridade: 4,
                tentativas: 0,
                ultimaFalha: 0
            }
        ];

        // Configurações de resiliência
        this.config = {
            maxFalhasConsecutivas: 5,
            intervaloPadrao: 15000, // 15 segundos
            intervaloRecuperacao: 60000, // 1 minuto em caso de falhas
            timeoutApi: 10000, // 10 segundos
            circuitBreakerTimeout: 300000 // 5 minutos
        };

        console.log('🚀 Sistema de Leitura Enterprise Resiliente Iniciado');
        this.inicializarTabelasEstruturais();
    }

    async inicializarTabelasEstruturais() {
        try {
            // Tabela principal para dados de mercado
            await safeQuery(this.pool, `
                CREATE TABLE IF NOT EXISTS sistema_leitura_mercado (
                    id SERIAL PRIMARY KEY,
                    ciclo_id VARCHAR(50) UNIQUE,
                    btc_price DECIMAL(20,8),
                    btc_change_24h DECIMAL(10,4),
                    fear_greed_index INTEGER,
                    fear_greed_classification VARCHAR(20),
                    volume_24h DECIMAL(20,2),
                    market_cap DECIMAL(20,2),
                    btc_dominance DECIMAL(10,4),
                    api_source VARCHAR(50),
                    data_quality VARCHAR(20) DEFAULT 'high',
                    recomendacao_trading VARCHAR(50),
                    confidence_level INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Tabela de monitoramento de APIs
            await safeQuery(this.pool, `
                CREATE TABLE IF NOT EXISTS api_monitoring (
                    id SERIAL PRIMARY KEY,
                    api_name VARCHAR(50),
                    status VARCHAR(20),
                    response_time INTEGER,
                    error_message TEXT,
                    success_rate DECIMAL(5,2),
                    last_check TIMESTAMP DEFAULT NOW()
                )
            `);

            // Índices para performance
            await safeQuery(this.pool, `
                CREATE INDEX IF NOT EXISTS idx_sistema_leitura_created_at 
                ON sistema_leitura_mercado(created_at DESC)
            `);

            console.log('✅ Tabelas estruturais inicializadas com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar tabelas:', error.message);
        }
    }

    async obterDadosBitcoin() {
        const agora = Date.now();
        
        // Circuit Breaker - pausa sistema se muitas falhas
        if (this.circuitBreakerAberto) {
            if (agora < this.proximaVerificacao) {
                console.log('⚡ Circuit Breaker ativo. Aguardando recuperação...');
                return null;
            } else {
                console.log('🔄 Tentando reativar sistema após Circuit Breaker...');
                this.circuitBreakerAberto = false;
                this.falhasConsecutivas = 0;
            }
        }

        // Ordenar APIs por prioridade e últimas falhas
        const apisOrdenadas = this.apis.sort((a, b) => {
            const penalizacaoA = a.tentativas * 1000 + (agora - a.ultimaFalha);
            const penalizacaoB = b.tentativas * 1000 + (agora - b.ultimaFalha);
            return (a.prioridade + penalizacaoA) - (b.prioridade + penalizacaoB);
        });

        for (const api of apisOrdenadas) {
            try {
                console.log(`🔍 Tentando obter dados via ${api.nome}...`);
                const inicioRequisicao = Date.now();
                
                const response = await axios.get(api.url, {
                    params: api.params,
                    headers: api.headers || {
                        'User-Agent': 'CoinBitClub-Enterprise/2.0',
                        'Accept': 'application/json'
                    },
                    timeout: this.config.timeoutApi
                });

                const tempoResposta = Date.now() - inicioRequisicao;
                const dados = this.processarRespostaAPI(api.nome, response.data);
                
                if (dados) {
                    api.tentativas = 0; // Reset tentativas em caso de sucesso
                    this.falhasConsecutivas = 0;
                    this.ultimoSucesso = agora;
                    
                    // Atualizar monitoramento da API
                    await this.atualizarMonitoramentoAPI(api.nome, 'success', tempoResposta);
                    
                    console.log(`✅ Dados obtidos com sucesso via ${api.nome}`);
                    console.log(`   BTC: $${dados.btc_price} (${dados.btc_change_24h}%)`);
                    
                    return dados;
                }
            } catch (error) {
                api.tentativas++;
                api.ultimaFalha = agora;
                
                console.error(`❌ Falha na API ${api.nome}:`, error.message);
                await this.atualizarMonitoramentoAPI(api.nome, 'error', 0, error.message);
            }
        }

        // Se chegou aqui, todas as APIs falharam
        this.falhasConsecutivas++;
        console.error(`💥 Todas as APIs falharam! Falhas consecutivas: ${this.falhasConsecutivas}`);

        // Ativar Circuit Breaker se muitas falhas
        if (this.falhasConsecutivas >= this.config.maxFalhasConsecutivas) {
            this.circuitBreakerAberto = true;
            this.proximaVerificacao = agora + this.config.circuitBreakerTimeout;
            console.log('⚡ Circuit Breaker ATIVADO! Sistema pausado por 5 minutos.');
        }

        return null;
    }

    processarRespostaAPI(nomeApi, data) {
        try {
            let resultado = {
                btc_price: null,
                btc_change_24h: null,
                fear_greed_index: null,
                fear_greed_classification: null,
                volume_24h: null,
                market_cap: null,
                btc_dominance: null,
                api_source: nomeApi,
                data_quality: 'high'
            };

            switch (nomeApi) {
                case 'CoinStats_FearGreed':
                    // Estrutura correta da CoinStats API
                    if (data.now && data.now.value !== undefined) {
                        resultado.fear_greed_index = parseInt(data.now.value);
                        resultado.fear_greed_classification = data.now.value_classification;
                    } else if (data.value !== undefined) {
                        resultado.fear_greed_index = parseInt(data.value);
                        resultado.fear_greed_classification = this.classificarFearGreed(resultado.fear_greed_index);
                    } else if (data.fearGreedIndex && data.fearGreedIndex.value) {
                        resultado.fear_greed_index = parseInt(data.fearGreedIndex.value);
                        resultado.fear_greed_classification = this.classificarFearGreed(resultado.fear_greed_index);
                    }
                    break;

                case 'CoinStats_Bitcoin':
                    if (data.coin) {
                        resultado.btc_price = parseFloat(data.coin.price);
                        resultado.btc_change_24h = parseFloat(data.coin.priceChange1d);
                        resultado.volume_24h = parseFloat(data.coin.volume);
                        resultado.market_cap = parseFloat(data.coin.marketCap);
                    } else if (data.price) {
                        // Formato alternativo da CoinStats
                        resultado.btc_price = parseFloat(data.price);
                        resultado.btc_change_24h = parseFloat(data.priceChange1d || data.change || 0);
                        resultado.volume_24h = parseFloat(data.volume || 0);
                        resultado.market_cap = parseFloat(data.marketCap || 0);
                    }
                    break;

                case 'Binance_24hrTicker':
                    if (data.symbol === 'BTCUSDT') {
                        resultado.btc_price = parseFloat(data.lastPrice);
                        resultado.btc_change_24h = parseFloat(data.priceChangePercent);
                        resultado.volume_24h = parseFloat(data.volume);
                    }
                    break;

                case 'Binance_DominanceBTC':
                    if (Array.isArray(data)) {
                        const btcData = data.find(item => item.symbol === 'BTCUSDT');
                        if (btcData) {
                            resultado.btc_price = parseFloat(btcData.lastPrice);
                            resultado.btc_change_24h = parseFloat(btcData.priceChangePercent);
                            resultado.volume_24h = parseFloat(btcData.volume);
                            
                            // Calcular dominância aproximada baseada em volume
                            const totalVolume = data.reduce((sum, item) => sum + parseFloat(item.volume), 0);
                            resultado.btc_dominance = ((parseFloat(btcData.volume) / totalVolume) * 100).toFixed(2);
                        }
                    }
                    break;
            }

            // Validar se temos dados mínimos
            if (resultado.btc_price && resultado.btc_price > 0) {
                return resultado;
            }
            
            if (resultado.fear_greed_index && resultado.fear_greed_index >= 0 && resultado.fear_greed_index <= 100) {
                return resultado;
            }

            return null;
        } catch (error) {
            console.error(`❌ Erro ao processar resposta da API ${nomeApi}:`, error.message);
            return null;
        }
    }

    classificarFearGreed(valor) {
        if (valor <= 20) return 'Extreme Fear';
        if (valor <= 40) return 'Fear';
        if (valor <= 60) return 'Neutral';
        if (valor <= 80) return 'Greed';
        return 'Extreme Greed';
    }

    async analisarComIA(dados) {
        if (!process.env.OPENAI_API_KEY) {
            console.log('⚠️ OpenAI API Key não encontrada, usando análise baseada em regras');
            return this.analisarComRegras(dados);
        }

        try {
            console.log('🤖 Executando análise IA com OpenAI...');
            
            const prompt = `
            Análise de Mercado Bitcoin - Dados Reais:
            - Preço BTC: $${dados.btc_price}
            - Variação 24h: ${dados.btc_change_24h}%
            - Fear & Greed Index: ${dados.fear_greed_index} (${dados.fear_greed_classification})
            - Volume 24h: $${dados.volume_24h ? dados.volume_24h.toLocaleString() : 'N/A'}
            - Dominância BTC: ${dados.btc_dominance || 'N/A'}%
            
            Baseado APENAS nestes dados reais, forneça:
            1. Recomendação: SOMENTE_LONG, SOMENTE_SHORT ou LONG_E_SHORT
            2. Nível de confiança: 0-100
            3. Justificativa em 1 linha
            
            Formato: {"recomendacao":"X","confidence":Y,"justificativa":"Z"}
            `;

            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 150,
                temperature: 0.1
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            const content = response.data.choices[0]?.message?.content;
            const analise = JSON.parse(content);
            
            console.log(`🎯 IA Recomenda: ${analise.recomendacao} (${analise.confidence}%)`);
            return analise;

        } catch (error) {
            console.log('⚠️ Falha na análise IA, usando regras baseadas em dados:', error.message);
            return this.analisarComRegras(dados);
        }
    }

    analisarComRegras(dados) {
        let recomendacao = 'LONG_E_SHORT';
        let confidence = 50;
        let justificativa = 'Análise baseada em regras de mercado';

        const fgIndex = dados.fear_greed_index;
        const priceChange = dados.btc_change_24h;
        const dominance = parseFloat(dados.btc_dominance) || 50;

        // Regra 1: Fear & Greed extremos
        if (fgIndex <= 20) {
            recomendacao = 'SOMENTE_LONG';
            confidence = 80;
            justificativa = 'Fear extremo - oportunidade de compra';
        } else if (fgIndex >= 80) {
            recomendacao = 'SOMENTE_SHORT';
            confidence = 80;
            justificativa = 'Greed extremo - risco de correção';
        }

        // Regra 2: Momentum de preço
        if (priceChange > 5) {
            confidence += 10;
            if (fgIndex < 50) {
                recomendacao = 'SOMENTE_LONG';
                justificativa = 'Momentum positivo com fear baixo';
            }
        } else if (priceChange < -5) {
            confidence += 10;
            if (fgIndex > 50) {
                recomendacao = 'SOMENTE_SHORT';
                justificativa = 'Momentum negativo com greed alto';
            }
        }

        // Regra 3: Dominância BTC
        if (dominance > 60) {
            if (recomendacao === 'SOMENTE_LONG') confidence += 5;
            justificativa += ' + alta dominância BTC';
        }

        return {
            recomendacao,
            confidence: Math.min(confidence, 95),
            justificativa
        };
    }

    async atualizarMonitoramentoAPI(nomeApi, status, tempoResposta, errorMessage = null) {
        try {
            await safeQuery(this.pool, `
                INSERT INTO api_monitoring (api_name, status, response_time, error_message)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (api_name) 
                DO UPDATE SET 
                    status = EXCLUDED.status,
                    response_time = EXCLUDED.response_time,
                    error_message = EXCLUDED.error_message,
                    last_check = NOW()
            `, [nomeApi, status, tempoResposta, errorMessage]);
        } catch (error) {
            console.error('❌ Erro ao atualizar monitoramento:', error.message);
        }
    }

    async salvarDadosMercado(dados, cicloId, analise = null) {
        try {
            if (!dados) {
                console.log('⚠️ Nenhum dado válido para salvar');
                return false;
            }

            const query = `
                INSERT INTO sistema_leitura_mercado (
                    ciclo_id, btc_price, btc_change_24h, fear_greed_index, 
                    fear_greed_classification, volume_24h, market_cap, btc_dominance,
                    api_source, data_quality, recomendacao_trading, confidence_level
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (ciclo_id) 
                DO UPDATE SET 
                    btc_price = EXCLUDED.btc_price,
                    btc_change_24h = EXCLUDED.btc_change_24h,
                    fear_greed_index = EXCLUDED.fear_greed_index,
                    fear_greed_classification = EXCLUDED.fear_greed_classification,
                    volume_24h = EXCLUDED.volume_24h,
                    market_cap = EXCLUDED.market_cap,
                    btc_dominance = EXCLUDED.btc_dominance,
                    api_source = EXCLUDED.api_source,
                    data_quality = EXCLUDED.data_quality,
                    recomendacao_trading = EXCLUDED.recomendacao_trading,
                    confidence_level = EXCLUDED.confidence_level,
                    updated_at = NOW()
            `;

            const valores = [
                cicloId,
                dados.btc_price,
                dados.btc_change_24h,
                dados.fear_greed_index,
                dados.fear_greed_classification,
                dados.volume_24h,
                dados.market_cap,
                dados.btc_dominance,
                dados.api_source,
                dados.data_quality,
                analise?.recomendacao || 'LONG_E_SHORT',
                analise?.confidence || 50
            ];

            const result = await safeQuery(this.pool, query, valores);
            
            if (result.rowCount > 0) {
                console.log('✅ Dados salvos no banco com sucesso');
                if (analise) {
                    console.log(`🎯 Recomendação: ${analise.recomendacao} (${analise.confidence}%)`);
                    console.log(`📝 ${analise.justificativa}`);
                }
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Erro ao salvar dados:', error.message);
            return false;
        }
    }

    async executarCiclo() {
        this.cicloAtual++;
        const cicloId = `ciclo-${this.cicloAtual}-${Date.now()}`;
        
        console.log(`\n🔄 [RESILIENT] INICIANDO CICLO ${this.cicloAtual} (${cicloId})`);

        try {
            // Obter dados de mercado
            const dados = await this.obterDadosBitcoin();
            
            if (dados) {
                // Executar análise IA/regras
                console.log('🧠 Executando análise de trading...');
                const analise = await this.analisarComIA(dados);
                
                // Salvar no banco
                const salvou = await this.salvarDadosMercado(dados, cicloId, analise);
                
                if (salvou) {
                    console.log(`✅ Ciclo ${this.cicloAtual} concluído com sucesso`);
                    
                    // Determinar próximo intervalo
                    const proximoIntervalo = this.circuitBreakerAberto ? 
                        this.config.intervaloRecuperacao : 
                        this.config.intervaloPadrao;
                        
                    console.log(`⏰ Próximo ciclo em ${proximoIntervalo/1000}s`);
                    
                    setTimeout(() => this.executarCiclo(), proximoIntervalo);
                } else {
                    console.log('❌ Falha ao salvar dados. Tentando novamente em 30s...');
                    setTimeout(() => this.executarCiclo(), 30000);
                }
            } else {
                const intervaloRecuperacao = this.circuitBreakerAberto ? 
                    this.config.circuitBreakerTimeout : 
                    this.config.intervaloRecuperacao;
                    
                console.log(`⏳ Nenhum dado válido obtido. Tentando novamente em ${intervaloRecuperacao/1000}s...`);
                setTimeout(() => this.executarCiclo(), intervaloRecuperacao);
            }

        } catch (error) {
            console.error(`💥 Erro crítico no ciclo ${this.cicloAtual}:`, error.message);
            console.log('🔄 Reiniciando ciclo em 1 minuto...');
            setTimeout(() => this.executarCiclo(), 60000);
        }
    }

    async obterEstatisticas() {
        try {
            const stats = await safeQuery(this.pool, `
                SELECT 
                    COUNT(*) as total_registros,
                    COUNT(DISTINCT api_source) as apis_utilizadas,
                    AVG(btc_price) as preco_medio_btc,
                    MIN(created_at) as primeiro_registro,
                    MAX(created_at) as ultimo_registro
                FROM sistema_leitura_mercado 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            `);

            const apiStats = await safeQuery(this.pool, `
                SELECT api_name, status, COUNT(*) as tentativas
                FROM api_monitoring 
                WHERE last_check > NOW() - INTERVAL '1 hour'
                GROUP BY api_name, status
                ORDER BY api_name
            `);

            return {
                sistema: stats.rows[0],
                apis: apiStats.rows,
                ciclo_atual: this.cicloAtual,
                circuit_breaker: this.circuitBreakerAberto,
                falhas_consecutivas: this.falhasConsecutivas,
                ultimo_sucesso: this.ultimoSucesso
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error.message);
            return null;
        }
    }

    async iniciar() {
        console.log('\n🚀 SISTEMA RESILIENTE INICIADO!');
        console.log('📊 Múltiplas APIs configuradas');
        console.log('⚡ Circuit Breaker ativo');
        console.log('🔄 Iniciando primeiro ciclo...\n');
        
        // Iniciar primeiro ciclo
        this.executarCiclo();
    }

    async parar() {
        console.log('\n🛑 Parando Sistema Resiliente...');
        if (this.pool) {
            await this.pool.end();
        }
        console.log('✅ Sistema parado com segurança');
    }
}

// Inicialização automática se executado diretamente
if (require.main === module) {
    const sistema = new SistemaLeituraMercadoResilient();
    
    // Tratamento de sinais para parada limpa
    process.on('SIGINT', async () => {
        console.log('\n🔴 Recebido sinal de interrupção...');
        await sistema.parar();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n🔴 Recebido sinal de término...');
        await sistema.parar();
        process.exit(0);
    });

    // Iniciar sistema
    sistema.iniciar();
}

module.exports = SistemaLeituraMercadoResilient;
