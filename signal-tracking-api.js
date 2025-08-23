/**
 * 📊 API PARA ACOMPANHAMENTO DETALHADO DOS SINAIS
 * Endpoints para visualizar as 4 condições analisadas pela IA
 */

const DetailedSignalTracker = require('./detailed-signal-tracker');

class SignalTrackingAPI {
    constructor(app, pool) {
        this.app = app;
        this.pool = pool;
        this.tracker = new DetailedSignalTracker();
        
        this.setupRoutes();
        console.log('📊 Signal Tracking API inicializada');
    }

    setupRoutes() {
        // API para obter análise detalhada dos últimos sinais
        this.app.get('/api/signals/detailed', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 10;
                const history = await this.tracker.getDetailedHistory(limit);
                
                res.json({
                    success: true,
                    signals: history,
                    total: history.length
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // API para estatísticas das 4 condições
        this.app.get('/api/signals/conditions-stats', async (req, res) => {
            try {
                const stats = await this.tracker.getDetailedStats();
                
                res.json({
                    success: true,
                    stats: {
                        total_signals: parseInt(stats.total_signals),
                        approved_signals: parseInt(stats.approved_signals),
                        approval_rate: stats.total_signals > 0 ? 
                            ((stats.approved_signals / stats.total_signals) * 100).toFixed(1) : 0,
                        avg_favorable_conditions: parseFloat(stats.avg_conditions).toFixed(1),
                        condition_success_rates: {
                            market_direction: ((stats.condition1_success / stats.total_signals) * 100).toFixed(1),
                            top100_aligned: ((stats.condition2_success / stats.total_signals) * 100).toFixed(1),
                            confidence_adequate: ((stats.condition3_success / stats.total_signals) * 100).toFixed(1),
                            history_favorable: ((stats.condition4_success / stats.total_signals) * 100).toFixed(1)
                        },
                        strong_signals: parseInt(stats.strong_signals)
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // API para análise de um sinal específico
        this.app.get('/api/signals/tracking/:id', async (req, res) => {
            try {
                const trackingId = req.params.id;
                
                const result = await this.pool.query(`
                    SELECT * FROM signal_conditions_tracking 
                    WHERE id = $1
                `, [trackingId]);

                if (result.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Sinal não encontrado'
                    });
                }

                const signal = result.rows[0];
                
                res.json({
                    success: true,
                    signal: {
                        id: signal.id,
                        signal_info: {
                            type: signal.signal_type,
                            ticker: signal.ticker,
                            source: signal.source,
                            received_at: signal.received_at
                        },
                        conditions: {
                            condition_1: {
                                name: 'Direção do Mercado',
                                result: signal.condition_1_market_direction,
                                details: signal.condition_1_details
                            },
                            condition_2: {
                                name: 'TOP 100 Alinhado',
                                result: signal.condition_2_top100_aligned,
                                details: signal.condition_2_details
                            },
                            condition_3: {
                                name: 'Confiança Adequada',
                                result: signal.condition_3_confidence_adequate,
                                details: signal.condition_3_details
                            },
                            condition_4: {
                                name: 'Histórico Favorável',
                                result: signal.condition_4_history_favorable,
                                details: signal.condition_4_details
                            }
                        },
                        summary: {
                            total_favorable: signal.total_favorable_conditions,
                            is_strong_signal: signal.is_strong_signal,
                            ai_decision: signal.ai_decision,
                            ai_reason: signal.ai_reason
                        },
                        market_data: {
                            market_direction: signal.market_direction,
                            fear_greed_value: signal.fear_greed_value,
                            top100_percentage: signal.top100_percentage,
                            confidence_score: signal.confidence_score
                        }
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Dashboard específico para tracking de condições
        this.app.get('/dashboard/conditions', async (req, res) => {
            try {
                const history = await this.tracker.getDetailedHistory(20);
                const stats = await this.tracker.getDetailedStats();

                const html = this.generateConditionsDashboard(history, stats);
                res.send(html);
            } catch (error) {
                res.status(500).send(`<h1>Erro: ${error.message}</h1>`);
            }
        });
    }

    generateConditionsDashboard(history, stats) {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análise Detalhada das 4 Condições - CoinBitClub</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
            color: #ffffff;
            min-height: 100vh;
            padding: 20px;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding: 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
        }
        .header h1 { 
            font-size: 2.2em; 
            background: linear-gradient(45deg, #00d4ff, #ff6b6b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
            margin-bottom: 30px;
        }
        .stat-card { 
            background: linear-gradient(145deg, rgba(26,35,50,0.9), rgba(15,20,25,0.9));
            border-radius: 12px; 
            padding: 15px;
            border: 1px solid rgba(0,212,255,0.2);
            text-align: center;
        }
        .stat-card h3 { color: #00d4ff; margin-bottom: 10px; }
        .stat-value { font-size: 1.8em; font-weight: bold; color: #4ade80; }
        .conditions-legend {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
        }
        .condition-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
            padding: 8px;
            background: rgba(255,255,255,0.05);
            border-radius: 6px;
        }
        .condition-number {
            background: #00d4ff;
            color: #000;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 15px;
        }
        .signals-list { margin-top: 20px; }
        .signal-item { 
            background: rgba(255,255,255,0.05); 
            margin: 12px 0; 
            padding: 15px; 
            border-radius: 10px;
            border-left: 4px solid #00d4ff;
        }
        .signal-approved { border-left-color: #4ade80; }
        .signal-rejected { border-left-color: #ef4444; }
        .signal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .conditions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        .condition-status {
            display: flex;
            align-items: center;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 0.9em;
        }
        .condition-success { background: rgba(74, 222, 128, 0.2); }
        .condition-failed { background: rgba(239, 68, 68, 0.2); }
        .refresh-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(45deg, #00d4ff, #0099cc);
            border: none;
            color: white;
            padding: 15px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Análise Detalhada das 4 Condições</h1>
        <p>Acompanhamento completo do processo de decisão da IA</p>
        <p><small>Atualizado: ${new Date().toLocaleString('pt-BR')}</small></p>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <h3>Total de Sinais</h3>
            <div class="stat-value">${stats?.total_signals || 0}</div>
        </div>
        <div class="stat-card">
            <h3>Taxa de Aprovação</h3>
            <div class="stat-value">${stats?.total_signals > 0 ? ((stats.approved_signals / stats.total_signals) * 100).toFixed(1) : 0}%</div>
        </div>
        <div class="stat-card">
            <h3>Condições Médias</h3>
            <div class="stat-value">${stats?.avg_conditions ? parseFloat(stats.avg_conditions).toFixed(1) : 0}/4</div>
        </div>
        <div class="stat-card">
            <h3>Sinais Fortes</h3>
            <div class="stat-value">${stats?.strong_signals || 0}</div>
        </div>
    </div>

    <div class="conditions-legend">
        <h3 style="color: #00d4ff; margin-bottom: 15px;">📋 As 4 Condições Analisadas:</h3>
        <div class="condition-item">
            <div class="condition-number">1</div>
            <div>
                <strong>Direção do Mercado Favorável</strong>
                <div style="font-size: 0.9em; color: #ccc;">Mercado permite ou prefere a direção do sinal</div>
            </div>
        </div>
        <div class="condition-item">
            <div class="condition-number">2</div>
            <div>
                <strong>TOP 100 Alinhado</strong>
                <div style="font-size: 0.9em; color: #ccc;">Tendência do TOP 100 cryptos alinhada com o sinal</div>
            </div>
        </div>
        <div class="condition-item">
            <div class="condition-number">3</div>
            <div>
                <strong>Confiança Adequada</strong>
                <div style="font-size: 0.9em; color: #ccc;">Nível de confiança > 40% (30% para sinais FORTE)</div>
            </div>
        </div>
        <div class="condition-item">
            <div class="condition-number">4</div>
            <div>
                <strong>Histórico Favorável</strong>
                <div style="font-size: 0.9em; color: #ccc;">Histórico recente de sinais não é contrário</div>
            </div>
        </div>
    </div>

    <div class="signals-list">
        <h3 style="color: #00d4ff; margin-bottom: 15px;">📡 Últimos Sinais Analisados:</h3>
        ${history.map(signal => `
            <div class="signal-item ${signal.ai_decision ? 'signal-approved' : 'signal-rejected'}">
                <div class="signal-header">
                    <div>
                        <strong>${signal.signal_type} ${signal.ticker}</strong>
                        <span style="margin-left: 10px; color: #888;">${signal.source}</span>
                        ${signal.is_strong_signal ? '<span style="color: #fbbf24; margin-left: 10px;">⭐ FORTE</span>' : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: bold; color: ${signal.ai_decision ? '#4ade80' : '#ef4444'}">
                            ${signal.total_favorable_conditions}/4 condições
                        </div>
                        <div style="font-size: 0.8em; color: #888;">
                            ${new Date(signal.received_at).toLocaleString('pt-BR')}
                        </div>
                    </div>
                </div>
                
                <div class="conditions-grid">
                    <div class="condition-status ${signal.condition_1_market_direction ? 'condition-success' : 'condition-failed'}">
                        ${signal.condition_1_market_direction ? '✅' : '❌'} Direção Mercado
                    </div>
                    <div class="condition-status ${signal.condition_2_top100_aligned ? 'condition-success' : 'condition-failed'}">
                        ${signal.condition_2_top100_aligned ? '✅' : '❌'} TOP 100
                    </div>
                    <div class="condition-status ${signal.condition_3_confidence_adequate ? 'condition-success' : 'condition-failed'}">
                        ${signal.condition_3_confidence_adequate ? '✅' : '❌'} Confiança
                    </div>
                    <div class="condition-status ${signal.condition_4_history_favorable ? 'condition-success' : 'condition-failed'}">
                        ${signal.condition_4_history_favorable ? '✅' : '❌'} Histórico
                    </div>
                </div>
                
                <div style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                    <strong>IA:</strong> ${signal.ai_reason}
                </div>
            </div>
        `).join('')}
    </div>

    <button class="refresh-btn" onclick="location.reload()">🔄</button>

    <script>
        // Auto-refresh a cada 30 segundos
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
    }
}

module.exports = SignalTrackingAPI;
