/**
 * 🦅 AGUIA NEWS RADAR - SISTEMA COMPLETO
 * =====================================
 * 
 * Sistema de geração de relatórios de IA pagos
 * • Geração a cada 24h às 20h (Horário de Brasília)
 * • Acesso apenas para PREMIUM, VIP e AFFILIATE_VIP
 * • Notificações diretas no perfil do usuário
 * • Sem envio por email
 * • Dados reais de mercado e análise de IA
 */

const { Pool } = require('pg');
const axios = require('axios');
const cron = require('node-cron');

// Importação condicional do OpenAI
let OpenAI = null;
try {
    OpenAI = require('openai');
} catch (error) {
    console.log('⚠️ OpenAI não instalado - usando modo simulado');
}

class AguiaNewsRadar {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coinbitclub',
            ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
        });

        this.openai = null;
        if (OpenAI && process.env.OPENAI_API_KEY) {
            try {
                this.openai = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY
                });
            } catch (error) {
                console.log('⚠️ Erro ao configurar OpenAI - usando modo simulado');
            }
        }

        this.isGenerating = false;
        this.lastRadarId = null;
        this.setupCronJob();
        
        console.log('🦅 Aguia News Radar iniciado - Relatórios pagos a cada 24h');
    }

    /**
     * � CONFIGURAR CRON JOB PARA 20H BRASÍLIA
     */
    setupCronJob() {
        // Executar todos os dias às 20:00 horário de Brasília
        cron.schedule('0 20 * * *', async () => {
            console.log('\n🦅 [CRON] Iniciando geração do Radar Águia News - 20:00 Brasília');
            try {
                await this.generateDailyRadar();
            } catch (error) {
                console.error('❌ Erro no cron job do Aguia News:', error);
            }
        }, {
            timezone: 'America/Sao_Paulo'
        });

        console.log('⏰ Cron job configurado: Todos os dias às 20:00 (Brasília)');
    }

    /**
     * 📊 COLETAR DADOS DE MERCADO
     */
    async collectMarketData() {
        console.log('📊 Coletando dados de mercado...');
        
        const marketData = {
            timestamp: new Date().toISOString(),
            brasilia_time: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        };

        try {
            // 1. Fear & Greed Index
            const fearGreedResponse = await axios.get('https://api.alternative.me/fng/');
            marketData.fearGreed = {
                value: parseInt(fearGreedResponse.data.data[0].value),
                classification: fearGreedResponse.data.data[0].value_classification,
                timestamp: fearGreedResponse.data.data[0].timestamp
            };

            // 2. Dados do Bitcoin (CoinGecko)
            const btcResponse = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin', {
                params: {
                    localization: false,
                    tickers: false,
                    market_data: true,
                    community_data: false,
                    developer_data: false,
                    sparkline: false
                }
            });

            marketData.bitcoin = {
                price_usd: btcResponse.data.market_data.current_price.usd,
                price_brl: btcResponse.data.market_data.current_price.brl,
                market_cap_rank: btcResponse.data.market_cap_rank,
                price_change_24h: btcResponse.data.market_data.price_change_percentage_24h,
                market_cap_dominance: btcResponse.data.market_data.market_cap_percentage?.btc || 0
            };

            // 3. Mercado Global de Crypto
            const globalResponse = await axios.get('https://api.coingecko.com/api/v3/global');
            marketData.global = {
                total_market_cap_usd: globalResponse.data.data.total_market_cap.usd,
                total_volume_24h: globalResponse.data.data.total_volume.usd,
                market_cap_change_24h: globalResponse.data.data.market_cap_change_percentage_24h_usd,
                btc_dominance: globalResponse.data.data.market_cap_percentage.btc
            };

            // 4. Top 10 Cryptos
            const top10Response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 10,
                    page: 1,
                    sparkline: false
                }
            });

            marketData.top10 = top10Response.data.map(coin => ({
                symbol: coin.symbol.toUpperCase(),
                price_change_24h: coin.price_change_percentage_24h,
                market_cap: coin.market_cap
            }));

            // Salvar no cache
            await this.saveMarketDataCache('COMPLETE_MARKET_DATA', marketData);
            
            console.log('✅ Dados de mercado coletados com sucesso');
            return marketData;

        } catch (error) {
            console.error('❌ Erro ao coletar dados de mercado:', error.message);
            
            // Tentar buscar dados do cache se API falhar
            const cachedData = await this.getMarketDataFromCache('COMPLETE_MARKET_DATA');
            if (cachedData) {
                console.log('🔄 Usando dados do cache como fallback');
                return cachedData;
            }
            
            throw error;
        }
    }

    /**
     * 🤖 ANALISAR COM IA
     */
    async analyzeWithAI(marketData) {
        console.log('🤖 Analisando dados com IA...');
        
        const startTime = Date.now();
        
        const prompt = `
Você é um analista de mercado especializado em criptomoedas. Analise os dados fornecidos e gere um RADAR DA ÁGUIA NEWS seguindo EXATAMENTE este formato:

RADAR DA ÁGUIA NEWS – ${new Date().toLocaleDateString('pt-BR')} – ${this.getMarketSummary(marketData)}

📊 Breve contexto Macroeconômico:
• Análise das principais bolsas globais baseada no sentimento atual
• Eventos econômicos relevantes e impacto nas criptomoedas

📉 Breve contexto do mercado de cripto:
• Capitalização total: $${(marketData.global?.total_market_cap_usd / 1e12).toFixed(2)}T (${marketData.global?.market_cap_change_24h > 0 ? '+' : ''}${marketData.global?.market_cap_change_24h?.toFixed(2)}% em 24h)
• Fear & Greed Index: ${marketData.fearGreed?.value}/100 (${marketData.fearGreed?.classification})
• Bitcoin: $${marketData.bitcoin?.price_usd?.toLocaleString()} (${marketData.bitcoin?.price_change_24h > 0 ? '+' : ''}${marketData.bitcoin?.price_change_24h?.toFixed(2)}% em 24h)
• Dominância BTC: ${marketData.global?.btc_dominance?.toFixed(1)}%

📈 Tendência:
${this.analyzeTrend(marketData)}

✅ Recomendações:
• Análise de risco e oportunidades baseada nos dados atuais
• Estratégias sugeridas para o cenário atual

🎯 Interpretação Estratégica do Mercado:
Análise aprofundada combinando todos os indicadores para uma visão estratégica completa.

Dados para análise:
${JSON.stringify(marketData, null, 2)}

Gere um relatório profissional, informativo e estratégico. Use linguagem técnica mas acessível.
`;

        try {
            if (!this.openai) {
                console.log('🔄 OpenAI não disponível - usando fallback');
                return this.generateFallbackRadar(marketData);
            }

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Você é um analista sênior de mercado financeiro especializado em criptomoedas, com vasta experiência em análise técnica e fundamental.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1200,
                temperature: 0.3
            });

            const analysis = response.choices[0].message.content;
            const processingTime = Date.now() - startTime;

            // Salvar análise no banco
            await this.saveAIAnalysis('RADAR_ANALYSIS', marketData, analysis, processingTime);

            console.log(`✅ Análise da IA concluída em ${processingTime}ms`);
            return analysis;

        } catch (error) {
            console.error('❌ Erro na análise da IA:', error.message);
            
            // Fallback: gerar relatório básico
            return this.generateFallbackRadar(marketData);
        }
    }

    /**
     * 📄 GERAR RADAR DIÁRIO
     */
    async generateDailyRadar() {
        if (this.isGenerating) {
            console.log('⚠️ Geração já em andamento, ignorando...');
            return;
        }

        this.isGenerating = true;
        
        try {
            console.log('\n🦅 === INICIANDO GERAÇÃO DO RADAR ÁGUIA NEWS ===');
            console.log(`🕒 Horário: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília)`);
            
            // 1. Coletar dados de mercado
            const marketData = await this.collectMarketData();
            
            // 2. Analisar com IA
            const radarContent = await this.analyzeWithAI(marketData);
            
            // 3. Salvar radar no banco
            const radarId = await this.saveRadar(radarContent, marketData);
            
            // 4. Criar notificações para usuários premium
            await this.notifyPremiumUsers(radarId);
            
            // 5. Atualizar estatísticas
            await this.updateRadarStats(radarId);
            
            this.lastRadarId = radarId;
            
            console.log('✅ === RADAR ÁGUIA NEWS GERADO COM SUCESSO ===');
            console.log(`📊 Radar ID: ${radarId}`);
            console.log(`🎯 Usuários notificados: PREMIUM, VIP, AFFILIATE_VIP`);
            
        } catch (error) {
            console.error('❌ === ERRO NA GERAÇÃO DO RADAR ===');
            console.error(error);
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * 💾 SALVAR RADAR NO BANCO
     */
    async saveRadar(content, dataSource) {
        const result = await this.pool.query(`
            INSERT INTO aguia_news_radars (content, data_source, is_premium, plan_required)
            VALUES ($1, $2, true, 'PREMIUM')
            RETURNING id
        `, [content, JSON.stringify(dataSource)]);
        
        return result.rows[0].id;
    }

    /**
     * 🔔 NOTIFICAR USUÁRIOS PREMIUM
     */
    async notifyPremiumUsers(radarId) {
        try {
            await this.pool.query('SELECT notify_premium_users_new_radar($1)', [radarId]);
            
            // Contar usuários notificados
            const countResult = await this.pool.query(`
                SELECT COUNT(*) as total 
                FROM user_notifications 
                WHERE radar_id = $1
            `, [radarId]);
            
            const totalNotified = countResult.rows[0].total;
            console.log(`🔔 ${totalNotified} usuários premium notificados`);
            
        } catch (error) {
            console.error('❌ Erro ao notificar usuários:', error);
        }
    }

    /**
     * 📊 ATUALIZAR ESTATÍSTICAS
     */
    async updateRadarStats(radarId) {
        try {
            // Dar acesso aos usuários premium
            await this.pool.query(`
                INSERT INTO user_radar_access (user_id, radar_id)
                SELECT u.id, $1
                FROM users u
                WHERE u.plan_type IN ('PREMIUM', 'VIP', 'AFFILIATE_VIP')
                AND u.is_active = true
            `, [radarId]);
            
        } catch (error) {
            console.error('❌ Erro ao atualizar estatísticas:', error);
        }
    }

    /**
     * 🗂️ MÉTODOS AUXILIARES
     */
    getMarketSummary(marketData) {
        const fearGreed = marketData.fearGreed?.value || 50;
        const btcChange = marketData.bitcoin?.price_change_24h || 0;
        
        if (fearGreed > 70 && btcChange > 3) return 'MERCADO OTIMISTA';
        if (fearGreed < 30 && btcChange < -3) return 'MERCADO PESSIMISTA';
        if (Math.abs(btcChange) < 2) return 'LATERALIZAÇÃO';
        return btcChange > 0 ? 'TENDÊNCIA ALTA' : 'TENDÊNCIA BAIXA';
    }

    analyzeTrend(marketData) {
        const fearGreed = marketData.fearGreed?.value || 50;
        const btcChange = marketData.bitcoin?.price_change_24h || 0;
        const marketCapChange = marketData.global?.market_cap_change_24h || 0;
        
        let trend = '';
        let strength = '';
        
        if (btcChange > 0 && marketCapChange > 0) {
            trend = 'tendência de alta';
            strength = btcChange > 5 ? 'forte' : 'moderada';
        } else if (btcChange < 0 && marketCapChange < 0) {
            trend = 'tendência de baixa';
            strength = btcChange < -5 ? 'forte' : 'moderada';
        } else {
            trend = 'lateralização';
            strength = 'indefinida';
        }
        
        return `Mercado apresenta ${trend} com força ${strength} (Fear & Greed: ${fearGreed}/100)`;
    }

    generateFallbackRadar(marketData) {
        const date = new Date().toLocaleDateString('pt-BR');
        const summary = this.getMarketSummary(marketData);
        
        return `
RADAR DA ÁGUIA NEWS – ${date} – ${summary}

📊 Breve contexto Macroeconômico:
• Mercado global em análise com base nos dados disponíveis
• Aguardando estabilização dos indicadores principais

📉 Breve contexto do mercado de cripto:
• Bitcoin: $${marketData.bitcoin?.price_usd?.toLocaleString()} (${marketData.bitcoin?.price_change_24h?.toFixed(2)}% em 24h)
• Fear & Greed: ${marketData.fearGreed?.value}/100 (${marketData.fearGreed?.classification})
• Dominância BTC: ${marketData.global?.btc_dominance?.toFixed(1)}%

📈 Tendência:
${this.analyzeTrend(marketData)}

✅ Recomendações:
• Manter posições defensivas até confirmação de tendência
• Aguardar sinais técnicos mais claros para operações

🎯 Interpretação Estratégica do Mercado:
Mercado em consolidação - aguardar confirmações técnicas para posicionamento.

⚠️ Nota: Relatório gerado com dados limitados devido a indisponibilidade temporária da IA.
        `;
    }

    async saveMarketDataCache(dataType, data) {
        await this.pool.query(`
            INSERT INTO market_data_cache (data_type, data_content, source)
            VALUES ($1, $2, 'AGUIA_NEWS_SYSTEM')
        `, [dataType, JSON.stringify(data)]);
    }

    async getMarketDataFromCache(dataType) {
        const result = await this.pool.query(`
            SELECT data_content 
            FROM market_data_cache 
            WHERE data_type = $1 
            ORDER BY collected_at DESC 
            LIMIT 1
        `, [dataType]);
        
        return result.rows[0]?.data_content || null;
    }

    async saveAIAnalysis(analysisType, inputData, response, processingTime) {
        await this.pool.query(`
            INSERT INTO ai_market_analysis (analysis_type, input_data, ai_response, processing_time_ms)
            VALUES ($1, $2, $3, $4)
        `, [analysisType, JSON.stringify(inputData), response, processingTime]);
    }

    /**
     * 📋 MÉTODOS PÚBLICOS PARA API
     */
    async getLatestRadar() {
        const result = await this.pool.query(`
            SELECT * FROM aguia_news_radars 
            ORDER BY generated_at DESC 
            LIMIT 1
        `);
        
        return result.rows[0] || null;
    }

    async getUserRadars(userId, limit = 10) {
        const result = await this.pool.query(`
            SELECT r.*, ura.accessed_at, ura.is_read
            FROM aguia_news_radars r
            JOIN user_radar_access ura ON r.id = ura.radar_id
            WHERE ura.user_id = $1
            ORDER BY r.generated_at DESC
            LIMIT $2
        `, [userId, limit]);
        
        return result.rows;
    }

    async getUserNotifications(userId, limit = 20) {
        const result = await this.pool.query(`
            SELECT * FROM user_notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [userId, limit]);
        
        return result.rows;
    }

    async markNotificationAsRead(notificationId, userId) {
        await this.pool.query(`
            UPDATE user_notifications 
            SET is_read = true, read_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
            WHERE id = $1 AND user_id = $2
        `, [notificationId, userId]);
    }

    /**
     * 🚀 INICIAR SISTEMA
     */
    async iniciar() {
        try {
            // Verificar conexão com banco
            await this.pool.query('SELECT NOW() AT TIME ZONE \'America/Sao_Paulo\' as brasilia_time');
            console.log('✅ Conectado ao banco de dados');
            
            // Verificar configurações
            const config = await this.pool.query('SELECT * FROM aguia_news_config');
            console.log(`📊 ${config.rows.length} configurações carregadas`);
            
            console.log('\n🦅 === AGUIA NEWS RADAR OPERACIONAL ===');
            console.log('💰 Modo: RELATÓRIOS PAGOS (24h)');
            console.log('🕒 Horário: 20:00 Brasília');
            console.log('👥 Acesso: PREMIUM, VIP, AFFILIATE_VIP');
            console.log('📱 Notificações: Perfil do usuário');
            console.log('✅ Sistema ativo e aguardando...\n');
            
        } catch (error) {
            console.error('❌ Erro ao iniciar Aguia News:', error);
            throw error;
        }
    }

    /**
     * 🔧 GERAR RADAR MANUAL (PARA TESTES)
     */
    async generateManualRadar() {
        console.log('🔧 Geração manual do radar solicitada...');
        await this.generateDailyRadar();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const aguiaNews = new AguiaNewsRadar();
    aguiaNews.iniciar().catch(console.error);
}

module.exports = AguiaNewsRadar;
