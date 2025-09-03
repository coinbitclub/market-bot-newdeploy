// 🤖 ORQUESTRADOR IA - SISTEMA INTEGRADO ETAPAS 3 & 5
// ====================================================
//
// FUNÇÃO: Coordenação e supervisão (SEM autonomia de execução)
// RESPONSABILIDADES:
// ✅ Coleta métricas Fear & Greed + TOP 100 moedas
// ✅ Valida sinais TradingView contra condições de mercado
// ✅ Monitora posições em tempo real
// ✅ Sugere fechamentos antecipados (com aprovação humana)
// ✅ Orquestra processo de comissionamento
// ❌ NÃO executa ordens automaticamente

const { Pool } = require('pg');
const axios = require('axios');
const WebSocket = require('ws');

class OrquestradorIA {
    constructor() {
        console.log('🤖 INICIANDO ORQUESTRADOR IA - SISTEMA INTEGRADO');
        console.log('================================================');
        
        this.pool = new Pool({
            connectionString: 'process.env.DATABASE_URL',
            ssl: { rejectUnauthorized: false }
        });

        this.marketData = {
            fearGreed: 50,          // Índice Fear & Greed (0-100)
            top100Metrics: {},      // Métricas TOP 100 moedas
            marketMovement: 50,     // Índice Movimento Mercado (0-100)
            allowedDirection: 'LONG_E_SHORT',
            lastUpdate: null
        };

        this.activeSignals = new Map();     // Sinais ativos
        this.activePositions = new Map();   // Posições em monitoramento
        this.blockedTickers = new Map();    // Tickers bloqueados (2h)
        
        this.config = {
            signals: {
                validityWindow: 30000,      // 30s para validação
                executionWindow: 120000,    // 2min para execução
                cleanupInterval: 10800000   // 3h para limpeza
            },
            
            risk: {
                maxPositionsPerUser: 2,
                blockTickerHours: 2,
                defaultLeverage: 5,
                maxLeverage: 10,
                defaultPositionSize: 0.30,  // 30%
                maxPositionSize: 0.50       // 50%
            },
            
            market: {
                updateInterval: 300000,     // 5min
                top100Url: 'https://api.coingecko.com/api/v3/coins/markets',
                fearGreedUrl: 'https://api.alternative.me/fng/'
            }
        };
    }

    // =======================================
    // 📊 COLETA DE MÉTRICAS DE MERCADO
    // =======================================
    
    async coletarMetricasMercado() {
        console.log('📊 Coletando métricas de mercado...');
        
        try {
            // 1. Fear & Greed Index
            await this.coletarFearGreed();
            
            // 2. TOP 100 moedas
            await this.coletarTop100Moedas();
            
            // 3. Calcular Índice de Movimento do Mercado
            this.calcularIndiceMercado();
            
            // 4. Determinar direção permitida
            this.determinarDirecaoPermitida();
            
            console.log(`✅ Métricas atualizadas: F&G=${this.marketData.fearGreed}, IMM=${this.marketData.marketMovement}, Direção=${this.marketData.allowedDirection}`);
            
        } catch (error) {
            console.error('❌ Erro ao coletar métricas:', error.message);
            // Fallback para valores neutros
            this.marketData.fearGreed = 50;
            this.marketData.marketMovement = 50;
            this.marketData.allowedDirection = 'LONG_E_SHORT';
        }
    }

    async coletarFearGreed() {
        try {
            const response = await axios.get(this.config.market.fearGreedUrl, {
                timeout: 5000
            });
            
            if (response.data && response.data.data && response.data.data[0]) {
                this.marketData.fearGreed = parseInt(response.data.data[0].value);
            } else {
                throw new Error('Formato de resposta inválido');
            }
            
        } catch (error) {
            console.warn('⚠️ Erro Fear & Greed, usando fallback: 50');
            this.marketData.fearGreed = 50;
        }
    }

    async coletarTop100Moedas() {
        try {
            const response = await axios.get(this.config.market.top100Url, {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 100,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '24h,7d'
                },
                timeout: 10000
            });
            
            if (response.data && Array.isArray(response.data)) {
                this.analisarTop100(response.data);
            } else {
                throw new Error('Dados TOP 100 inválidos');
            }
            
        } catch (error) {
            console.warn('⚠️ Erro TOP 100, usando dados padrão');
            this.marketData.top100Metrics = {
                rising24h: 50,
                rising7d: 50,
                avgVolumeChange: 0,
                marketCapChange: 0
            };
        }
    }

    analisarTop100(coins) {
        const metrics = {
            rising24h: 0,
            rising7d: 0,
            totalVolume: 0,
            totalMarketCap: 0,
            volumeChanges: [],
            priceChanges24h: [],
            priceChanges7d: []
        };

        coins.forEach(coin => {
            // Contadores de subida
            if (coin.price_change_percentage_24h > 0) metrics.rising24h++;
            if (coin.price_change_percentage_7d > 0) metrics.rising7d++;
            
            // Acumuladores
            metrics.totalVolume += coin.total_volume || 0;
            metrics.totalMarketCap += coin.market_cap || 0;
            
            // Arrays para médias
            if (coin.price_change_percentage_24h !== null) {
                metrics.priceChanges24h.push(coin.price_change_percentage_24h);
            }
            if (coin.price_change_percentage_7d !== null) {
                metrics.priceChanges7d.push(coin.price_change_percentage_7d);
            }
        });

        // Calcular médias
        const avgChange24h = metrics.priceChanges24h.reduce((a, b) => a + b, 0) / metrics.priceChanges24h.length;
        const avgChange7d = metrics.priceChanges7d.reduce((a, b) => a + b, 0) / metrics.priceChanges7d.length;

        this.marketData.top100Metrics = {
            rising24h: metrics.rising24h,
            rising7d: metrics.rising7d,
            avgChange24h: avgChange24h,
            avgChange7d: avgChange7d,
            totalCoins: coins.length
        };
    }

    calcularIndiceMercado() {
        const metrics = this.marketData.top100Metrics;
        
        // Índice de Movimento do Mercado (IMM)
        const risign24hScore = (metrics.rising24h / metrics.totalCoins) * 100;
        const risign7dScore = (metrics.rising7d / metrics.totalCoins) * 100;
        const avgChangeScore = Math.max(0, Math.min(100, (metrics.avgChange24h + 10) * 5)); // Normalizar -10% a +10% para 0-100
        
        this.marketData.marketMovement = Math.round(
            (risign24hScore * 0.5 + risign7dScore * 0.3 + avgChangeScore * 0.2)
        );
    }

    determinarDirecaoPermitida() {
        const fg = this.marketData.fearGreed;
        const imm = this.marketData.marketMovement;
        
        if (fg < 30) {
            this.marketData.allowedDirection = 'SOMENTE_LONG';
        } else if (fg > 80) {
            this.marketData.allowedDirection = 'SOMENTE_SHORT';
        } else { // 30-80
            if (imm < 30) {
                this.marketData.allowedDirection = 'SOMENTE_LONG';
            } else if (imm > 70) {
                this.marketData.allowedDirection = 'SOMENTE_SHORT';
            } else {
                this.marketData.allowedDirection = 'LONG_E_SHORT';
            }
        }
    }

    // =======================================
    // 📡 PROCESSAMENTO DE SINAIS TRADINGVIEW
    // =======================================
    
    async processarSinalTradingView(signalData) {
        console.log('📡 Processando sinal TradingView...');
        
        try {
            // Estrutura esperada do sinal
            const signal = {
                id: this.gerarIdSinal(),
                type: signalData.signal, // SINAL_LONG, SINAL_SHORT, FECHE_LONG, FECHE_SHORT
                ticker: signalData.ticker,
                timestamp: Date.now(),
                source: signalData.source || 'TradingView',
                data: signalData
            };

            // Validação inicial
            if (!this.validarSinalBasico(signal)) {
                return { success: false, error: 'Sinal inválido' };
            }

            // Janela de validade
            setTimeout(() => {
                this.activeSignals.delete(signal.id);
            }, this.config.signals.validityWindow);

            // Processar por tipo
            if (signal.type.startsWith('FECHE_')) {
                return await this.processarSinalFechamento(signal);
            } else {
                return await this.processarSinalAbertura(signal);
            }

        } catch (error) {
            console.error('❌ Erro ao processar sinal:', error);
            return { success: false, error: error.message };
        }
    }

    validarSinalBasico(signal) {
        const tiposValidos = [
            'SINAL_LONG', 'SINAL_LONG_FORTE',
            'SINAL_SHORT', 'SINAL_SHORT_FORTE',
            'FECHE_LONG', 'FECHE_SHORT'
        ];
        
        return tiposValidos.includes(signal.type) && 
               signal.ticker && 
               signal.ticker.length > 0;
    }

    async processarSinalAbertura(signal) {
        console.log(`🎯 Validando sinal de abertura: ${signal.type} - ${signal.ticker}`);
        
        // Verificar direção permitida
        const direcaoSinal = signal.type.includes('LONG') ? 'LONG' : 'SHORT';
        
        if (!this.validarDirecaoPermitida(direcaoSinal)) {
            console.log(`❌ Sinal bloqueado: ${direcaoSinal} não permitido (${this.marketData.allowedDirection})`);
            return { 
                success: false, 
                error: `Direção ${direcaoSinal} não permitida pelo mercado atual`,
                marketCondition: this.marketData.allowedDirection
            };
        }

        // Verificar bloqueio de ticker
        if (this.isTickerBloqueado(signal.ticker)) {
            console.log(`❌ Ticker ${signal.ticker} bloqueado por 2h`);
            return { 
                success: false, 
                error: 'Ticker bloqueado por 2 horas após fechamento anterior'
            };
        }

        // Adicionar à lista de sinais ativos
        this.activeSignals.set(signal.id, signal);
        
        console.log(`✅ Sinal validado: ${signal.type} - ${signal.ticker} (ID: ${signal.id})`);
        
        return {
            success: true,
            signal_id: signal.id,
            message: 'Sinal validado e disponível para execução',
            execution_window: this.config.signals.executionWindow / 1000, // segundos
            market_condition: {
                fear_greed: this.marketData.fearGreed,
                market_movement: this.marketData.marketMovement,
                allowed_direction: this.marketData.allowedDirection
            }
        };
    }

    async processarSinalFechamento(signal) {
        console.log(`🔄 Processando sinal de fechamento: ${signal.type}`);
        
        // Sinais de fechamento são sempre executados imediatamente
        return {
            success: true,
            signal_id: signal.id,
            action: 'CLOSE_IMMEDIATE',
            message: 'Sinal de fechamento - execução imediata requerida',
            positions_to_close: await this.buscarPosicoesParaFechar(signal)
        };
    }

    validarDirecaoPermitida(direcaoSinal) {
        const allowed = this.marketData.allowedDirection;
        
        if (allowed === 'LONG_E_SHORT') return true;
        if (allowed === 'SOMENTE_LONG' && direcaoSinal === 'LONG') return true;
        if (allowed === 'SOMENTE_SHORT' && direcaoSinal === 'SHORT') return true;
        
        return false;
    }

    // =======================================
    // 📊 MONITORAMENTO DE POSIÇÕES
    // =======================================
    
    async monitorarPosicoes() {
        console.log('📊 Monitorando posições ativas...');
        
        try {
            const posicoesAtivas = await this.buscarPosicoesAtivas();
            
            for (const posicao of posicoesAtivas) {
                await this.analisarPosicao(posicao);
            }
            
        } catch (error) {
            console.error('❌ Erro no monitoramento:', error);
        }
    }

    async analisarPosicao(posicao) {
        const analise = {
            user_id: posicao.user_id,
            position_id: posicao.id,
            ticker: posicao.ticker,
            type: posicao.type,
            entry_time: posicao.created_at,
            time_in_position: Date.now() - new Date(posicao.created_at).getTime(),
            current_pnl: await this.calcularPnLAtual(posicao),
            market_correlation: await this.calcularCorrelacaoMercado(posicao),
            risk_score: 0
        };

        // Calcular score de risco
        analise.risk_score = this.calcularRiscoPosicao(analise);

        // Verificar condições de alerta
        const alertas = this.verificarCondicoesAlerta(analise);
        
        if (alertas.length > 0) {
            await this.emitirAlertas(analise, alertas);
        }

        // Atualizar dados da posição
        this.activePositions.set(posicao.id, analise);
    }

    calcularRiscoPosicao(analise) {
        let risco = 0;
        
        // Tempo em posição (máx 60min = 50 pontos)
        risco += Math.min(50, (analise.time_in_position / 60000) * 0.83);
        
        // P&L negativo (máx -5% = 30 pontos)
        if (analise.current_pnl < 0) {
            risco += Math.min(30, Math.abs(analise.current_pnl) * 600);
        }
        
        // Correlação alta com mercado em queda (máx 20 pontos)
        if (analise.market_correlation > 0.8 && this.marketData.marketMovement < 40) {
            risco += 20;
        }
        
        return Math.round(risco);
    }

    verificarCondicoesAlerta(analise) {
        const alertas = [];
        
        // Tempo estagnado
        if (analise.time_in_position > 45 * 60000 && Math.abs(analise.current_pnl) < 0.005) {
            alertas.push({
                type: 'TIME_STAGNATION',
                severity: 'MEDIUM',
                message: `Posição ${analise.ticker} estagnada há ${Math.round(analise.time_in_position/60000)}min`
            });
        }
        
        // Risco alto
        if (analise.risk_score > 70) {
            alertas.push({
                type: 'HIGH_RISK',
                severity: 'HIGH',
                message: `Posição ${analise.ticker} com risco elevado (${analise.risk_score}/100)`
            });
        }
        
        // Correlação perigosa
        if (analise.market_correlation > 0.85 && analise.current_pnl < -0.02) {
            alertas.push({
                type: 'MARKET_CORRELATION',
                severity: 'HIGH',
                message: `Alta correlação com mercado em queda: ${analise.ticker}`
            });
        }
        
        return alertas;
    }

    async emitirAlertas(analise, alertas) {
        console.log(`🚨 ALERTAS para posição ${analise.ticker}:`);
        
        alertas.forEach(alerta => {
            console.log(`   ${alerta.severity === 'HIGH' ? '🔴' : '🟡'} ${alerta.message}`);
        });
        
        // Salvar alertas no banco para dashboard
        await this.salvarAlertas(analise, alertas);
    }

    // =======================================
    // 💰 SISTEMA DE COMISSIONAMENTO
    // =======================================
    
    async processarComissionamento(operacao) {
        console.log('💰 Processando comissionamento...');
        
        if (operacao.profit <= 0) {
            console.log('📊 Operação sem lucro - sem comissionamento');
            return { success: true, commission: 0 };
        }

        try {
            const user = await this.buscarUsuario(operacao.user_id);
            const affiliate = user.affiliate_id ? await this.buscarAfiliado(user.affiliate_id) : null;
            
            // Calcular comissões
            const comissoes = this.calcularComissoes(operacao, user, affiliate);
            
            // Processar pagamentos
            await this.processarPagamentosComissao(comissoes);
            
            console.log(`✅ Comissionamento processado: ${(comissoes.total/100).toFixed(2)} ${operacao.currency}`);
            
            return { success: true, commission_data: comissoes };
            
        } catch (error) {
            console.error('❌ Erro no comissionamento:', error);
            throw error;
        }
    }

    calcularComissoes(operacao, user, affiliate) {
        const profit = operacao.profit;
        const isSubscribed = user.subscription_status === 'active';
        
        // Comissão base
        const baseRate = isSubscribed ? 0.10 : 0.20; // 10% ou 20%
        const baseCommission = profit * baseRate;
        
        // Comissão do afiliado
        let affiliateCommission = 0;
        let affiliateRate = 0;
        
        if (affiliate) {
            affiliateRate = affiliate.type === 'VIP' ? 0.05 : 0.015; // 5% ou 1.5%
            affiliateCommission = baseCommission * affiliateRate;
        }
        
        // Comissão da empresa
        const companyCommission = baseCommission - affiliateCommission;
        
        return {
            profit: profit,
            base_rate: baseRate,
            total: baseCommission,
            company: companyCommission,
            affiliate: affiliateCommission,
            affiliate_rate: affiliateRate,
            affiliate_id: affiliate?.id || null,
            user_subscription: isSubscribed ? 'MONTHLY' : 'PREPAID'
        };
    }

    // =======================================
    // 🎛️ UTILITÁRIOS E HELPERS
    // =======================================
    
    gerarIdSinal() {
        return `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    isTickerBloqueado(ticker) {
        const bloqueio = this.blockedTickers.get(ticker);
        if (!bloqueio) return false;
        
        const agora = Date.now();
        if (agora - bloqueio.timestamp > (this.config.risk.blockTickerHours * 60 * 60 * 1000)) {
            this.blockedTickers.delete(ticker);
            return false;
        }
        
        return true;
    }

    bloquearTicker(ticker) {
        this.blockedTickers.set(ticker, {
            timestamp: Date.now(),
            reason: 'POSITION_CLOSED'
        });
        
        console.log(`🔒 Ticker ${ticker} bloqueado por ${this.config.risk.blockTickerHours}h`);
    }

    // Buscar métodos do banco de dados (placeholders)
    async buscarPosicoesAtivas() { /* Implementar query */ return []; }
    async buscarUsuario(userId) { /* Implementar query */ return {}; }
    async buscarAfiliado(affiliateId) { /* Implementar query */ return {}; }
    async calcularPnLAtual(posicao) { /* Implementar cálculo */ return 0; }
    async calcularCorrelacaoMercado(posicao) { /* Implementar análise */ return 0; }
    async salvarAlertas(analise, alertas) { /* Implementar save */ }
    async processarPagamentosComissao(comissoes) { /* Implementar pagamentos */ }
    async buscarPosicoesParaFechar(signal) { /* Implementar query */ return []; }

    // =======================================
    // 🚀 INICIALIZAÇÃO DO SISTEMA
    // =======================================
    
    async iniciar() {
        console.log('🚀 Iniciando Orquestrador IA...');
        
        try {
            // Coleta inicial de métricas
            await this.coletarMetricasMercado();
            
            // Configurar intervalos
            setInterval(() => {
                this.coletarMetricasMercado();
            }, this.config.market.updateInterval);
            
            setInterval(() => {
                this.monitorarPosicoes();
            }, 30000); // Monitoramento a cada 30s
            
            // Limpeza periódica
            setInterval(() => {
                this.limparDadosAntigos();
            }, this.config.signals.cleanupInterval);
            
            console.log('✅ Orquestrador IA iniciado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            throw error;
        }
    }

    limparDadosAntigos() {
        console.log('🧹 Limpando dados antigos...');
        
        const agora = Date.now();
        const limite6h = 6 * 60 * 60 * 1000;
        
        // Limpar sinais antigos
        for (const [id, signal] of this.activeSignals) {
            if (agora - signal.timestamp > limite6h) {
                this.activeSignals.delete(id);
            }
        }
        
        console.log(`✅ Limpeza concluída: ${this.activeSignals.size} sinais ativos`);
    }
}

// Teste de inicialização
if (require.main === module) {
    const orquestrador = new OrquestradorIA();
    orquestrador.iniciar().catch(console.error);
}

module.exports = { OrquestradorIA };
