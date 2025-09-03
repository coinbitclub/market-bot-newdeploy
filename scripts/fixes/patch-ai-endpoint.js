/**
 * 🔧 PATCH PARA ENDPOINT AI-ANALYSIS - CoinBitClub Enterprise v6.0.0
 * Corrige o endpoint /api/dashboard/ai-analysis para usar dados reais
 */

const fs = require('fs');
const path = require('path');

async function corrigirEndpointIA() {
    console.log('🔧 APLICANDO PATCH PARA ENDPOINT AI-ANALYSIS...');
    
    try {
        // Ler o arquivo app.js
        const appPath = path.join(__dirname, 'app.js');
        let conteudo = fs.readFileSync(appPath, 'utf8');
        
        // Encontrar o método getAnaliseIAReal e substituir por uma versão limpa
        const metodoCorreto = `
    async getAnaliseIAReal(req, res) {
        try {
            console.log('📊 API /api/dashboard/ai-analysis chamada');
            
            // Obter dados atuais do Enterprise v6.0.0
            const dadosEnterprise = coinBitClubEnterprise.obterDadosAtuais();
            
            // Se há dados do Enterprise, usar eles (dados reais)
            if (dadosEnterprise && dadosEnterprise.ia && dadosEnterprise.mercado) {
                console.log('✅ Usando dados do CoinBitClub Enterprise v6.0.0');
                
                const response = {
                    success: true,
                    source: 'CoinBitClub Enterprise v6.0.0',
                    real_data: true,
                    mock_data: false,
                    timestamp: dadosEnterprise.timestamp,
                    market_analysis: {
                        direction: dadosEnterprise.ia.recomendacao,
                        direction_display: this.formatarDirecao(dadosEnterprise.ia.recomendacao),
                        confidence_level: dadosEnterprise.ia.confianca,
                        reasoning: dadosEnterprise.ia.justificativa,
                        key_points: dadosEnterprise.ia.pontos_chave || []
                    },
                    fear_greed: {
                        index: dadosEnterprise.mercado.fear_greed_value,
                        classification: dadosEnterprise.mercado.fear_greed_classification,
                        direction: dadosEnterprise.mercado.fear_greed_direction
                    },
                    market_data: {
                        btc_price: dadosEnterprise.mercado.btc_price,
                        btc_change_24h: dadosEnterprise.mercado.btc_change_24h,
                        btc_dominance: dadosEnterprise.mercado.btc_dominance,
                        market_cap: dadosEnterprise.mercado.total_market_cap,
                        volume_24h: dadosEnterprise.mercado.total_volume_24h
                    },
                    system_status: {
                        analyses_generated: 1,
                        last_24h: 1,
                        system_active: true,
                        auto_trading: false
                    }
                };
                
                return res.json(response);
            }
            
            // Fallback: buscar no banco de dados
            console.log('🔄 Buscando dados no banco de dados...');
            
            // Query para última análise IA
            const aiAnalysisQuery = await this.pool.query(\`
                SELECT 
                    ai_recommendation,
                    confidence_score,
                    reasoning,
                    market_direction,
                    created_at,
                    cycle_id
                FROM ai_analysis 
                ORDER BY created_at DESC
                LIMIT 1
            \`);
            
            // Query para dados de mercado
            const marketQuery = await this.pool.query(\`
                SELECT 
                    btc_price,
                    btc_dominance,
                    fear_greed_value,
                    fear_greed_classification,
                    fear_greed_direction,
                    total_market_cap,
                    total_volume_24h,
                    created_at
                FROM sistema_leitura_mercado 
                ORDER BY created_at DESC
                LIMIT 1
            \`);
            
            // Query para Fear & Greed Index
            const fearGreedQuery = await this.pool.query(\`
                SELECT 
                    value,
                    classification,
                    created_at
                FROM fear_greed_index 
                ORDER BY created_at DESC
                LIMIT 1
            \`);
            
            const aiAnalysis = aiAnalysisQuery.rows[0];
            const marketData = marketQuery.rows[0];
            const fearGreed = fearGreedQuery.rows[0] || {};
            
            // Construir resposta com dados do banco
            const response = {
                success: true,
                source: 'Database',
                real_data: true,
                mock_data: false,
                timestamp: new Date(),
                market_analysis: {
                    direction: aiAnalysis?.ai_recommendation || 'NEUTRO',
                    direction_display: this.formatarDirecao(aiAnalysis?.ai_recommendation || 'NEUTRO'),
                    confidence_level: aiAnalysis?.confidence_score || 50,
                    reasoning: aiAnalysis?.reasoning || 'Análise em processamento',
                    key_points: ['Dados do banco de dados', 'Sistema operacional', 'Análise automática']
                },
                fear_greed: {
                    index: marketData?.fear_greed_value || fearGreed?.value || 50,
                    classification: marketData?.fear_greed_classification || fearGreed?.classification || 'Neutral',
                    direction: marketData?.fear_greed_direction || 'NEUTRAL'
                },
                market_data: {
                    btc_price: marketData?.btc_price || 0,
                    btc_change_24h: 0,
                    btc_dominance: marketData?.btc_dominance || 0,
                    market_cap: marketData?.total_market_cap || 0,
                    volume_24h: marketData?.total_volume_24h || 0
                },
                system_status: {
                    analyses_generated: aiAnalysisQuery.rows.length,
                    last_24h: marketQuery.rows.length,
                    system_active: true,
                    auto_trading: false
                }
            };
            
            res.json(response);
            
        } catch (error) {
            console.error('❌ Erro no endpoint AI Analysis:', error.message);
            
            // Resposta de emergência
            res.json({
                success: false,
                source: 'Emergency Fallback',
                real_data: false,
                mock_data: false,
                error: 'Sistema temporariamente indisponível',
                timestamp: new Date(),
                market_analysis: {
                    direction: 'NEUTRO',
                    direction_display: 'NEUTRO',
                    confidence_level: 0,
                    reasoning: 'Sistema em manutenção',
                    key_points: ['Sistema indisponível', 'Verificar logs', 'Contatar suporte']
                },
                fear_greed: {
                    index: 50,
                    classification: 'Neutral',
                    direction: 'NEUTRAL'
                },
                system_status: {
                    analyses_generated: 0,
                    last_24h: 0,
                    system_active: false,
                    auto_trading: false
                }
            });
        }
    }
    
    formatarDirecao(direcao) {
        switch (direcao) {
            case 'SOMENTE_LONG': return 'LONG';
            case 'SOMENTE_SHORT': return 'SHORT';
            case 'LONG_E_SHORT': return 'BOTH';
            case 'NEUTRO': return 'NEUTRO';
            default: return 'NEUTRO';
        }
    }`;
        
        // Buscar e substituir o método problemático
        const regexMetodo = /async getAnaliseIAReal\(req, res\) \{[\s\S]*?^\s{4}\}/m;
        
        if (regexMetodo.test(conteudo)) {
            conteudo = conteudo.replace(regexMetodo, metodoCorreto.trim());
            
            // Salvar arquivo corrigido
            fs.writeFileSync(appPath, conteudo, 'utf8');
            console.log('✅ Endpoint AI-Analysis corrigido com sucesso!');
        } else {
            console.log('⚠️ Padrão do método não encontrado, aplicando patch alternativo...');
            
            // Aplicar patch no final da classe
            const pontoInsercao = 'module.exports = CoinBitClubServer;';
            const novoConteudo = conteudo.replace(pontoInsercao, metodoCorreto + '\n\n' + pontoInsercao);
            
            fs.writeFileSync(appPath, novoConteudo, 'utf8');
            console.log('✅ Patch alternativo aplicado!');
        }
        
    } catch (error) {
        console.error('❌ Erro ao aplicar patch:', error.message);
    }
}

corrigirEndpointIA();
