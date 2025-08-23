// Implementação do painel de controle detalhado com dados reais

// 1. ANÁLISE DE MERCADO E DIREÇÃO IA
function adicionarPainelAnaliseIA() {
    return `
    <!-- PAINEL DE ANÁLISE IA E MERCADO -->
    <div class="step-container">
        <div class="step-title">🤖 DECISÕES DA IA - Análise de Mercado em Tempo Real</div>
        <div class="step-content" id="ia-analysis-content">
            <div class="loading">🔍 Analisando dados da IA...</div>
        </div>
    </div>
    `;
}

// 2. FLUXO DETALHADO DE SINAIS
function adicionarPainelSinaisDetalhado() {
    return `
    <!-- PAINEL DE SINAIS DETALHADO -->
    <div class="step-container">
        <div class="step-title">📡 FLUXO DE SINAIS - TradingView → Sistema</div>
        <div class="step-content" id="sinais-detalhados-content">
            <div class="loading">📊 Carregando análise de sinais...</div>
        </div>
    </div>
    `;
}

// 3. MONITOR DE POSIÇÕES ATIVAS
function adicionarPainelPosicoesAtivas() {
    return `
    <!-- PAINEL DE POSIÇÕES ATIVAS -->
    <div class="step-container">
        <div class="step-title">💼 POSIÇÕES ATIVAS - Monitoramento 120min</div>
        <div class="step-content" id="posicoes-ativas-content">
            <div class="loading">📈 Carregando posições ativas...</div>
        </div>
    </div>
    `;
}

// 4. PERFORMANCE E RESULTADOS
function adicionarPainelPerformance() {
    return `
    <!-- PAINEL DE PERFORMANCE -->
    <div class="step-container">
        <div class="step-title">📊 PERFORMANCE OPERACIONAL - Win Rate & P&L</div>
        <div class="step-content" id="performance-content">
            <div class="loading">💰 Analisando performance...</div>
        </div>
    </div>
    `;
}

// FUNÇÕES PARA CARREGAR DADOS REAIS

// Carregar análise da IA
async function carregarAnaliseIA() {
    try {
        const response = await fetch('/api/dashboard/ai-analysis');
        const data = await response.json();
        
        const iaData = data.data;
        
        document.getElementById('ia-analysis-content').innerHTML = `
            <div class="real-data-grid">
                <div class="metric-card direction-${iaData.latest_analysis.market_direction.toLowerCase()}">
                    <div class="metric-title">🧭 Direção do Mercado</div>
                    <div class="metric-value">${iaData.latest_analysis.market_direction}</div>
                    <div class="metric-detail">Confiança: ${iaData.latest_analysis.confidence_score}%</div>
                </div>
                
                <div class="metric-card fear-greed">
                    <div class="metric-title">😱 Fear & Greed Index</div>
                    <div class="metric-value">${iaData.fear_greed.index}</div>
                    <div class="metric-detail">${iaData.fear_greed.classification}</div>
                </div>
                
                <div class="metric-card btc-price">
                    <div class="metric-title">₿ Bitcoin Price</div>
                    <div class="metric-value">$${iaData.latest_analysis.btc_price.toLocaleString()}</div>
                    <div class="metric-detail">Dom: ${iaData.latest_analysis.btc_dominance}%</div>
                </div>
                
                <div class="metric-card ai-performance">
                    <div class="metric-title">🎯 Acurácia IA</div>
                    <div class="metric-value">${iaData.performance.accuracy_rate}%</div>
                    <div class="metric-detail">${iaData.performance.predictions_made} predições</div>
                </div>
            </div>
            
            <div class="detailed-analysis">
                <h4>📊 Análises Recentes (24h)</h4>
                <div class="analysis-breakdown">
                    <span class="bullish">📈 BULLISH: ${iaData.statistics.bullish_signals}</span>
                    <span class="bearish">📉 BEARISH: ${iaData.statistics.bearish_signals}</span>
                    <span class="neutral">⚖️ NEUTRAL: ${iaData.statistics.neutral_signals}</span>
                </div>
                
                <div class="direction-logic">
                    <h5>🧠 Lógica de Direção Permitida:</h5>
                    ${getDirectionLogic(iaData.fear_greed.index)}
                </div>
            </div>
        `;
        
    } catch (error) {
        document.getElementById('ia-analysis-content').innerHTML = 
            '<span class="status-error">❌ Erro ao carregar análise IA</span>';
    }
}

// Lógica de direção baseada no Fear & Greed
function getDirectionLogic(fearGreedIndex) {
    if (fearGreedIndex < 30) {
        return `
            <div class="logic-explanation long-only">
                <strong>🟢 SOMENTE LONG PERMITIDO</strong><br>
                Fear & Greed < 30 (Pânico) → Mercado oversold → Só compra (LONG)
            </div>`;
    } else if (fearGreedIndex > 80) {
        return `
            <div class="logic-explanation short-only">
                <strong>🔴 SOMENTE SHORT PERMITIDO</strong><br>
                Fear & Greed > 80 (Ganância) → Mercado overbought → Só venda (SHORT)
            </div>`;
    } else {
        return `
            <div class="logic-explanation both-allowed">
                <strong>🟡 LONG E SHORT PERMITIDOS</strong><br>
                Fear & Greed 30-80 (Neutro) → Mercado balanceado → Ambas direções OK
            </div>`;
    }
}

// Carregar sinais detalhados
async function carregarSinaisDetalhados() {
    try {
        const response = await fetch('/api/dashboard/signals');
        const data = await response.json();
        
        const sinaisData = data.data;
        
        document.getElementById('sinais-detalhados-content').innerHTML = `
            <div class="real-data-grid">
                <div class="metric-card signals-today">
                    <div class="metric-title">📅 Sinais Hoje</div>
                    <div class="metric-value">${sinaisData.total}</div>
                    <div class="metric-detail">Processados: ${sinaisData.processed}</div>
                </div>
                
                <div class="metric-card approval-rate">
                    <div class="metric-title">✅ Taxa Aprovação</div>
                    <div class="metric-value">${sinaisData.approval_rate}%</div>
                    <div class="metric-detail">Rejeitados: ${sinaisData.rejected}</div>
                </div>
                
                <div class="metric-card symbols-traded">
                    <div class="metric-title">🎯 Símbolos</div>
                    <div class="metric-value">${sinaisData.symbols_diferentes}</div>
                    <div class="metric-detail">Diversificação</div>
                </div>
                
                <div class="metric-card last-signal">
                    <div class="metric-title">⏰ Último Sinal</div>
                    <div class="metric-value">${sinaisData.ultimo_sinal ? 
                        new Date(sinaisData.ultimo_sinal).toLocaleTimeString() : 'Nenhum'}</div>
                    <div class="metric-detail">TradingView</div>
                </div>
            </div>
            
            <div class="signals-breakdown">
                <h4>📊 Breakdown por Tipo</h4>
                <div class="signal-types">
                    <span class="signal-buy">📈 BUY/LONG: ${sinaisData.sinais_buy}</span>
                    <span class="signal-sell">📉 SELL/SHORT: ${sinaisData.sinais_sell}</span>
                </div>
                
                <div class="environment-breakdown">
                    <span class="mainnet">🌐 Mainnet: ${sinaisData.mainnet_execucoes}</span>
                    <span class="testnet">🧪 Testnet: ${sinaisData.testnet_execucoes}</span>
                </div>
            </div>
            
            ${sinaisData.ultimos_sinais.length > 0 ? `
                <div class="recent-signals">
                    <h4>📋 Últimos Sinais Recebidos</h4>
                    <div class="signals-list">
                        ${sinaisData.ultimos_sinais.map(signal => `
                            <div class="signal-item">
                                <span class="signal-symbol">${signal.symbol}</span>
                                <span class="signal-action action-${signal.action.toLowerCase()}">${signal.action}</span>
                                <span class="signal-type">${signal.type}</span>
                                <span class="signal-price">$${signal.price.toLocaleString()}</span>
                                <span class="signal-time">${new Date(signal.time).toLocaleTimeString()}</span>
                                <span class="signal-status status-${signal.status.toLowerCase()}">${signal.status}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        
    } catch (error) {
        document.getElementById('sinais-detalhados-content').innerHTML = 
            '<span class="status-error">❌ Erro ao carregar sinais detalhados</span>';
    }
}

// CSS para o painel detalhado
const cssDetalhado = `
<style>
.real-data-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.metric-card {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    border-radius: 10px;
    padding: 15px;
    text-align: center;
    border: 1px solid #3a5998;
}

.metric-card.direction-bullish { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); }
.metric-card.direction-bearish { background: linear-gradient(135deg, #f44336 0%, #da190b 100%); }
.metric-card.direction-neutral { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); }

.metric-title {
    font-size: 12px;
    color: #b0c4de;
    margin-bottom: 5px;
}

.metric-value {
    font-size: 24px;
    font-weight: bold;
    color: white;
    margin-bottom: 5px;
}

.metric-detail {
    font-size: 11px;
    color: #d0d0d0;
}

.detailed-analysis {
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 15px;
    margin-top: 15px;
}

.analysis-breakdown {
    display: flex;
    gap: 15px;
    margin: 10px 0;
    flex-wrap: wrap;
}

.analysis-breakdown span {
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: bold;
}

.bullish { background: #4CAF50; color: white; }
.bearish { background: #f44336; color: white; }
.neutral { background: #ff9800; color: white; }

.logic-explanation {
    padding: 10px;
    border-radius: 5px;
    margin-top: 10px;
}

.long-only { background: rgba(76, 175, 80, 0.2); border-left: 4px solid #4CAF50; }
.short-only { background: rgba(244, 67, 54, 0.2); border-left: 4px solid #f44336; }
.both-allowed { background: rgba(255, 152, 0, 0.2); border-left: 4px solid #ff9800; }

.signals-breakdown {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin: 15px 0;
}

.signal-types, .environment-breakdown {
    display: flex;
    gap: 10px;
}

.signal-buy { background: #4CAF50; color: white; padding: 5px 10px; border-radius: 5px; }
.signal-sell { background: #f44336; color: white; padding: 5px 10px; border-radius: 5px; }
.mainnet { background: #2196F3; color: white; padding: 5px 10px; border-radius: 5px; }
.testnet { background: #ff9800; color: white; padding: 5px 10px; border-radius: 5px; }

.recent-signals {
    margin-top: 20px;
}

.signals-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #444;
    border-radius: 5px;
}

.signal-item {
    display: grid;
    grid-template-columns: 1fr 80px 100px 100px 80px 80px;
    gap: 10px;
    padding: 8px;
    border-bottom: 1px solid #333;
    font-size: 12px;
    align-items: center;
}

.signal-symbol { font-weight: bold; color: #4CAF50; }
.action-buy { background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; text-align: center; }
.action-sell { background: #f44336; color: white; padding: 2px 6px; border-radius: 3px; text-align: center; }
.status-processed { background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; text-align: center; }
.status-pending { background: #ff9800; color: white; padding: 2px 6px; border-radius: 3px; text-align: center; }
</style>
`;

// Função principal para atualizar o dashboard
function atualizarDashboardDetalhado() {
    carregarAnaliseIA();
    carregarSinaisDetalhados();
    // carregarPosicoesAtivas();
    // carregarPerformance();
}

// Auto-refresh a cada 30 segundos
setInterval(atualizarDashboardDetalhado, 30000);
