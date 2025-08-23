/**
 * 🔧 PATCH PARA ENDPOINT DE IA DASHBOARD
 * Corrigir endpoint /api/dashboard/ai-analysis para usar Enterprise v6.0.0
 */

const express = require('express');
const router = express.Router();

// Endpoint corrigido para usar Enterprise v6.0.0
async function getAnaliseIAReal(req, res, enterpriseSystem, pool) {
    try {
        console.log('📊 API /api/dashboard/ai-analysis chamada');
        
        // 1. Tentar obter dados do Enterprise v6.0.0
        if (enterpriseSystem && enterpriseSystem.isRunning) {
            console.log('✅ Obtendo dados do CoinBitClub Enterprise v6.0.0');
            
            const dadosEnterprise = await enterpriseSystem.obterUltimosDados();
            
            if (dadosEnterprise.success) {
                const data = dadosEnterprise.data;
                
                const response = {
                    success: true,
                    source: 'CoinBitClub Enterprise v6.0.0',
                    real_data: true,
                    mock_data: false,
                    timestamp: new Date(),
                    market_analysis: {
                        direction: data.final_recommendation || data.market_direction,
                        direction_display: formatarDirecao(data.final_recommendation || data.market_direction),
                        confidence_level: parseFloat(data.confidence_level || 50),
                        reasoning: data.reasoning || 'Análise em processamento',
                        key_points: [
                            `Bitcoin: $${parseFloat(data.btc_price || 0).toLocaleString()}`,
                            `Fear & Greed: ${data.fear_greed_value} (${data.fear_greed_classification})`,
                            `Dominância BTC: ${parseFloat(data.btc_dominance || 0).toFixed(2)}%`
                        ]
                    },
                    fear_greed: {
                        index: parseInt(data.fear_greed_value || 50),
                        classification: data.fear_greed_classification || 'Neutral',
                        direction: determineFearGreedDirection(data.fear_greed_value),
                        updated_at: data.created_at || new Date()
                    },
                    market_data: {
                        btc_price: parseFloat(data.btc_price || 0),
                        btc_change_24h: 0, // Pode ser calculado se necessário
                        btc_dominance: parseFloat(data.btc_dominance || 56),
                        market_cap: parseInt(data.total_volume_24h || 0),
                        volume_24h: parseInt(data.total_volume_24h || 0)
                    },
                    system_status: {
                        analyses_generated: 1,
                        last_24h: 1,
                        system_active: true,
                        auto_trading: false,
                        enterprise_version: '6.0.0',
                        last_update: data.created_at
                    }
                };
                
                return res.json(response);
            }
        }
        
        // 2. Fallback: buscar diretamente no banco
        console.log('🔄 Fallback: Buscando dados no banco...');
        
        const query = `
            SELECT 
                s.btc_price,
                s.fear_greed_value,
                s.fear_greed_classification,
                s.btc_dominance,
                s.total_volume_24h,
                s.market_direction,
                s.confidence_level,
                s.reasoning,
                s.final_recommendation,
                s.created_at
            FROM sistema_leitura_mercado s
            ORDER BY s.created_at DESC
            LIMIT 1
        `;
        
        const client = await pool.connect();
        const result = await client.query(query);
        client.release();
        
        if (result.rows.length > 0) {
            const data = result.rows[0];
            
            const response = {
                success: true,
                source: 'PostgreSQL Database',
                real_data: true,
                mock_data: false,
                timestamp: new Date(),
                market_analysis: {
                    direction: data.final_recommendation || data.market_direction,
                    direction_display: formatarDirecao(data.final_recommendation || data.market_direction),
                    confidence_level: parseFloat(data.confidence_level || 50),
                    reasoning: data.reasoning || 'Análise baseada em dados históricos',
                    key_points: [
                        `Bitcoin: $${parseFloat(data.btc_price || 0).toLocaleString()}`,
                        `Fear & Greed: ${data.fear_greed_value} (${data.fear_greed_classification})`,
                        `Dominância BTC: ${parseFloat(data.btc_dominance || 0).toFixed(2)}%`
                    ]
                },
                fear_greed: {
                    index: parseInt(data.fear_greed_value || 50),
                    classification: data.fear_greed_classification || 'Neutral',
                    direction: determineFearGreedDirection(data.fear_greed_value),
                    updated_at: data.created_at || new Date()
                },
                market_data: {
                    btc_price: parseFloat(data.btc_price || 0),
                    btc_change_24h: 0,
                    btc_dominance: parseFloat(data.btc_dominance || 56),
                    market_cap: parseInt(data.total_volume_24h || 0),
                    volume_24h: parseInt(data.total_volume_24h || 0)
                },
                system_status: {
                    analyses_generated: 1,
                    last_24h: 1,
                    system_active: true,
                    auto_trading: false,
                    data_source: 'database_fallback'
                }
            };
            
            return res.json(response);
        }
        
        // 3. Último fallback: dados básicos
        console.log('⚠️ Usando dados básicos como fallback');
        
        const response = {
            success: true,
            source: 'System Fallback',
            real_data: false,
            mock_data: true,
            timestamp: new Date(),
            market_analysis: {
                direction: 'NEUTRO',
                direction_display: 'Neutro',
                confidence_level: 50,
                reasoning: 'Sistema em inicialização. Aguarde coleta de dados.',
                key_points: [
                    'Sistema inicializando',
                    'Coletando dados do mercado',
                    'Análise em preparação'
                ]
            },
            fear_greed: {
                index: 50,
                classification: 'Neutral',
                direction: 'NEUTRAL',
                updated_at: new Date()
            },
            market_data: {
                btc_price: 0,
                btc_change_24h: 0,
                btc_dominance: 56,
                market_cap: 0,
                volume_24h: 0
            },
            system_status: {
                analyses_generated: 0,
                last_24h: 0,
                system_active: false,
                auto_trading: false,
                status: 'initializing'
            }
        };
        
        return res.json(response);
        
    } catch (error) {
        console.error('❌ Erro no endpoint IA:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message,
            timestamp: new Date()
        });
    }
}

// Funções auxiliares
function formatarDirecao(direcao) {
    const mapeamento = {
        'SOMENTE_LONG': 'Somente Long',
        'SOMENTE_SHORT': 'Somente Short', 
        'LONG_E_SHORT': 'Long e Short',
        'NEUTRO': 'Neutro',
        'LONG': 'Long',
        'SHORT': 'Short'
    };
    
    return mapeamento[direcao] || direcao || 'Neutro';
}

function determineFearGreedDirection(value) {
    const val = parseInt(value || 50);
    if (val <= 25) return 'EXTREME_FEAR';
    if (val <= 45) return 'FEAR';
    if (val <= 55) return 'NEUTRAL';
    if (val <= 75) return 'GREED';
    return 'EXTREME_GREED';
}

module.exports = { getAnaliseIAReal, formatarDirecao, determineFearGreedDirection };
