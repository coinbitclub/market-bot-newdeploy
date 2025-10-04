/**
 * 📊 REAL OPERATIONS SERVICE - COINBITCLUB ENTERPRISE
 * Service for real operations data from database and external APIs
 */

const { Pool } = require('pg');
const BinanceService = require('../exchange/binance-service');

class RealOperationsService {
    constructor() {
        // FIXED: Use proper database configuration with fallback to mock mode
        const dbConfig = this.getDatabaseConfig();

        if (dbConfig) {
            this.pool = new Pool(dbConfig);
            console.log('✅ RealOperationsService: Database connection configured');
        } else {
            this.pool = null;
            console.log('⚠️ RealOperationsService: No database config, using mock mode');
        }

        // Initialize exchange service for real-time prices
        this.binanceService = new BinanceService();
        console.log('✅ RealOperationsService: Binance service initialized for real-time data');
    }

    /**
     * Get database configuration with proper fallbacks
     */
    getDatabaseConfig() {
        // Try different environment variable patterns
        const connectionString = process.env.DATABASE_URL || 
                                process.env.POSTGRES_URL || 
                                process.env.DB_URL;
        
        if (connectionString) {
            // Auto-detect if SSL is needed based on connection string or environment
            const needsSSL = process.env.NODE_ENV === 'production' || 
                           connectionString.includes('sslmode=require') ||
                           connectionString.includes('railway.app') ||
                           connectionString.includes('render.com') ||
                           connectionString.includes('supabase.co') ||
                           connectionString.includes('heroku.com');
            
            return {
                connectionString,
                ssl: needsSSL ? { rejectUnauthorized: false } : false,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000
            };
        }

        // Try individual environment variables
        const host = process.env.DB_HOST || process.env.POSTGRES_HOST;
        const port = process.env.DB_PORT || process.env.POSTGRES_PORT;
        const database = process.env.DB_NAME || process.env.POSTGRES_DB;
        const user = process.env.DB_USER || process.env.POSTGRES_USER;
        const password = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;

        if (host && port && database && user && password) {
            // Auto-detect if SSL is needed based on host or environment
            const needsSSL = process.env.NODE_ENV === 'production' || 
                           host.includes('railway.app') ||
                           host.includes('render.com') ||
                           host.includes('supabase.co') ||
                           host.includes('heroku.com') ||
                           process.env.DB_SSL === 'true';
            
            return {
                host,
                port: parseInt(port),
                database,
                user,
                password,
                ssl: needsSSL ? { rejectUnauthorized: false } : false,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000
            };
        }

        // No valid database configuration found
        return null;
    }

    /**
     * Get real market indicators from external APIs
     */
    async getMarketIndicators() {
        try {
            const axios = require('axios');
            let fearAndGreed = 50;
            let fearAndGreedStatus = 'NEUTRAL';

            // Try to get real Fear & Greed Index from Alternative.me API
            try {
                const fgResponse = await axios.get('https://api.alternative.me/fng/?limit=1', {
                    timeout: 5000
                });

                if (fgResponse.data && fgResponse.data.data && fgResponse.data.data[0]) {
                    const fgData = fgResponse.data.data[0];
                    fearAndGreed = parseInt(fgData.value);

                    // Map classification
                    if (fearAndGreed <= 25) fearAndGreedStatus = 'EXTREME_FEAR';
                    else if (fearAndGreed <= 45) fearAndGreedStatus = 'FEAR';
                    else if (fearAndGreed <= 55) fearAndGreedStatus = 'NEUTRAL';
                    else if (fearAndGreed <= 75) fearAndGreedStatus = 'GREED';
                    else fearAndGreedStatus = 'EXTREME_GREED';

                    console.log(`✅ Real Fear & Greed Index: ${fearAndGreed} (${fearAndGreedStatus})`);
                }
            } catch (fgError) {
                console.warn('⚠️ Could not fetch Fear & Greed Index, using default:', fgError.message);
            }

            // Try to get BTC Dominance from CoinGecko API (free, no key required)
            let btcDominance = 48.5;
            try {
                const dominanceResponse = await axios.get('https://api.coingecko.com/api/v3/global', {
                    timeout: 5000
                });

                if (dominanceResponse.data && dominanceResponse.data.data) {
                    btcDominance = dominanceResponse.data.data.market_cap_percentage.btc || 48.5;
                    console.log(`✅ Real BTC Dominance: ${btcDominance}%`);
                }
            } catch (domError) {
                console.warn('⚠️ Could not fetch BTC Dominance, using default:', domError.message);
            }

            // Long/Short ratio - use default as this requires paid API
            const baseLong = 52;
            const baseShort = 48;

            return {
                fearAndGreed: Math.round(fearAndGreed * 10) / 10,
                fearAndGreedStatus,
                btcDominance: Math.round(btcDominance * 10) / 10,
                top100LongShort: {
                    long: baseLong,
                    short: baseShort
                },
                lastUpdate: new Date()
            };

        } catch (error) {
            console.error('❌ Error getting market indicators:', error);
            // Return safe defaults if everything fails
            return {
                fearAndGreed: 50,
                fearAndGreedStatus: 'NEUTRAL',
                btcDominance: 48.5,
                top100LongShort: {
                    long: 52,
                    short: 48
                },
                lastUpdate: new Date()
            };
        }
    }

    /**
     * Get AI decision based on market conditions
     */
    async getAIDecision(language = 'pt') {
        try {
            const marketIndicators = await this.getMarketIndicators();
            
            // AI decision logic based on market indicators
            let direction = 'LONG';
            let confidence = 50;
            let reasoning = '';
            let marketSentiment = '';
            
            // Fear & Greed based decision
            if (marketIndicators.fearAndGreed <= 25) {
                direction = 'LONG';
                confidence = 85;
                reasoning = language === 'pt' 
                    ? 'Fear extremo + dominância BTC estável + posições short excessivas = oportunidade de compra'
                    : 'Extreme fear + stable BTC dominance + excessive short positions = buying opportunity';
                marketSentiment = language === 'pt' ? 'RECUPERAÇÃO IMINENTE' : 'IMMINENT RECOVERY';
            } else if (marketIndicators.fearAndGreed >= 75) {
                direction = 'SHORT';
                confidence = 80;
                reasoning = language === 'pt'
                    ? 'Extreme greed + alta dominância BTC + posições long excessivas = oportunidade de venda'
                    : 'Extreme greed + high BTC dominance + excessive long positions = selling opportunity';
                marketSentiment = language === 'pt' ? 'CORREÇÃO IMINENTE' : 'IMMINENT CORRECTION';
            } else if (marketIndicators.fearAndGreed <= 45) {
                direction = 'LONG';
                confidence = 70;
                reasoning = language === 'pt'
                    ? 'Medo moderado + mercado em oversold = oportunidade de compra'
                    : 'Moderate fear + oversold market = buying opportunity';
                marketSentiment = language === 'pt' ? 'TENDÊNCIA ALTA' : 'UPTREND';
            } else if (marketIndicators.fearAndGreed >= 55) {
                direction = 'SHORT';
                confidence = 65;
                reasoning = language === 'pt'
                    ? 'Greed moderado + mercado em overbought = oportunidade de venda'
                    : 'Moderate greed + overbought market = selling opportunity';
                marketSentiment = language === 'pt' ? 'TENDÊNCIA BAIXA' : 'DOWNTREND';
            } else {
                direction = 'LONG';
                confidence = 60;
                reasoning = language === 'pt'
                    ? 'Mercado neutro + análise técnica favorável = posição long'
                    : 'Neutral market + favorable technical analysis = long position';
                marketSentiment = language === 'pt' ? 'LATERAL' : 'SIDEWAYS';
            }
            
            // Adjust confidence based on BTC dominance
            if (marketIndicators.btcDominance > 60) {
                confidence += 5; // Higher confidence when BTC dominance is high
            }
            
            return {
                direction,
                confidence: Math.min(95, confidence),
                reasoning,
                timestamp: new Date(),
                marketSentiment
            };
            
        } catch (error) {
            console.error('❌ Error getting AI decision:', error);
            throw error;
        }
    }

    /**
     * Get trading signals from database (TradingView webhook signals)
     */
    async getTradingSignals(userId, limit = 20) {
        try {
            console.log(`📡 Fetching TradingView signals from database...`);

            if (!this.pool) {
                console.log('⚠️ No database connection, returning empty signals');
                return [];
            }

            // Query TradingView signals from trading_signals table
            const result = await this.pool.query(`
                SELECT
                    signal_id as id,
                    symbol as pair,
                    action as direction,
                    COALESCE(metadata->>'confidence', '85')::int as confidence,
                    price as "entryPrice",
                    price as "currentPrice",
                    COALESCE(quantity, 0) as quantity,
                    0 as pnl,
                    0 as "pnlPercent",
                    received_at as timestamp,
                    'PROCESSANDO' as status,
                    COALESCE(strategy, 'TradingView Signal') as reasoning,
                    source
                FROM trading_signals
                WHERE source = 'TRADINGVIEW'
                ORDER BY received_at DESC
                LIMIT $1
            `, [limit]);

            const signals = result.rows.map(row => ({
                id: row.id,
                pair: row.pair,
                direction: row.direction,
                strength: parseInt(row.confidence) || 85,
                confidence: parseInt(row.confidence) || 85,
                entryPrice: parseFloat(row.entryPrice) || 0,
                currentPrice: parseFloat(row.currentPrice) || 0,
                quantity: parseFloat(row.quantity) || 0,
                pnl: 0,
                pnlPercent: 0,
                timestamp: row.timestamp,
                status: 'PROCESSANDO',
                reasoning: row.reasoning || 'TradingView Signal',
                source: row.source || 'TRADINGVIEW'
            }));

            console.log(`✅ Fetched ${signals.length} TradingView signals from database`);
            return signals;

        } catch (error) {
            console.error('❌ Error fetching TradingView signals from database:', error);
            return [];
        }
    }

    /**
     * Get real-time positions with live market prices from database
     */
    async getPositions(userId) {
        try {
            console.log(`📡 Fetching OPEN positions for user ${userId} from database...`);

            if (!this.pool) {
                console.log('⚠️ No database connection, returning empty positions');
                return [];
            }

            // Query OPEN positions from trading_operations table
            const result = await this.pool.query(`
                SELECT
                    id,
                    operation_id as id,
                    trading_pair as pair,
                    operation_type as type,
                    entry_price as "entryPrice",
                    quantity,
                    status,
                    entry_time as timestamp,
                    COALESCE(stop_loss, entry_price * 0.95) as "stopLoss",
                    COALESCE(take_profit, entry_price * 1.05) as "takeProfit"
                FROM trading_operations
                WHERE user_id = $1
                AND status = 'OPEN'
                ORDER BY entry_time DESC
                LIMIT 50
            `, [userId]);

            const positions = [];

            // Enrich each position with current price and calculate real-time P&L
            for (const row of result.rows) {
                try {
                    // Get real-time current price
                    const priceData = await this.binanceService.getSymbolPrice(row.pair);

                    if (priceData.success) {
                        const currentPrice = priceData.price;

                        // Calculate real-time P&L
                        const priceDiff = currentPrice - row.entryPrice;
                        const pnlPercent = (priceDiff / row.entryPrice) * 100;
                        const pnl = priceDiff * row.quantity;

                        positions.push({
                            id: row.id,
                            pair: row.pair,
                            type: row.type,
                            entryPrice: parseFloat(row.entryPrice),
                            currentPrice: currentPrice,
                            quantity: parseFloat(row.quantity),
                            pnl: pnl,
                            pnlPercent: pnlPercent,
                            status: row.status,
                            timestamp: row.timestamp,
                            stopLoss: parseFloat(row.stopLoss),
                            takeProfit: parseFloat(row.takeProfit)
                        });
                    } else {
                        // If can't get current price, use entry price
                        positions.push({
                            id: row.id,
                            pair: row.pair,
                            type: row.type,
                            entryPrice: parseFloat(row.entryPrice),
                            currentPrice: parseFloat(row.entryPrice),
                            quantity: parseFloat(row.quantity),
                            pnl: 0,
                            pnlPercent: 0,
                            status: row.status,
                            timestamp: row.timestamp,
                            stopLoss: parseFloat(row.stopLoss),
                            takeProfit: parseFloat(row.takeProfit)
                        });
                    }
                } catch (priceError) {
                    console.error(`Error fetching price for ${row.pair}:`, priceError.message);
                }
            }

            console.log(`✅ Fetched ${positions.length} OPEN positions from database`);
            return positions;

        } catch (error) {
            console.error('❌ Error fetching positions from database:', error);
            return [];
        }
    }

    /**
     * Get real-time daily statistics from database
     */
    async getDailyStats(userId) {
        try {
            console.log(`📡 Fetching daily stats for user ${userId} from database...`);

            if (!this.pool) {
                console.log('⚠️ No database connection, returning default stats');
                return {
                    operationsToday: 0,
                    successRate: 0,
                    historicalSuccessRate: 0,
                    todayReturnUSD: 0,
                    todayReturnPercent: 0,
                    totalInvested: 10000
                };
            }

            // First, try to get from user_performance_cache table
            const cacheResult = await this.pool.query(`
                SELECT
                    today_operations,
                    today_profit_loss,
                    today_win_rate,
                    total_operations,
                    total_profit_loss_usd,
                    overall_win_rate,
                    last_updated
                FROM user_performance_cache
                WHERE user_id = $1
            `, [userId]);

            if (cacheResult.rows.length > 0) {
                const cache = cacheResult.rows[0];

                // Calculate today's return percentage
                const totalInvested = 10000; // Default investment
                const todayReturnPercent = totalInvested > 0
                    ? (parseFloat(cache.today_profit_loss || 0) / totalInvested) * 100
                    : 0;

                console.log(`✅ Fetched daily stats from cache for user ${userId}`);
                return {
                    operationsToday: parseInt(cache.today_operations || 0),
                    successRate: parseFloat(cache.today_win_rate || 0),
                    historicalSuccessRate: parseFloat(cache.overall_win_rate || 0),
                    todayReturnUSD: parseFloat(cache.today_profit_loss || 0),
                    todayReturnPercent: todayReturnPercent,
                    totalInvested: totalInvested
                };
            }

            // If no cache, calculate from trading_operations directly
            console.log('⚠️ No cache found, calculating from trading_operations...');

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todayResult = await this.pool.query(`
                SELECT
                    COUNT(*) as operations_count,
                    COUNT(CASE WHEN profit_loss_usd > 0 THEN 1 END) as winning_ops,
                    COALESCE(SUM(profit_loss_usd), 0) as total_pnl
                FROM trading_operations
                WHERE user_id = $1
                AND entry_time >= $2
                AND status = 'CLOSED'
            `, [userId, today]);

            const allTimeResult = await this.pool.query(`
                SELECT
                    COUNT(*) as total_operations,
                    COUNT(CASE WHEN profit_loss_usd > 0 THEN 1 END) as total_winning,
                    COALESCE(SUM(profit_loss_usd), 0) as total_pnl
                FROM trading_operations
                WHERE user_id = $1
                AND status = 'CLOSED'
            `, [userId]);

            const todayData = todayResult.rows[0];
            const allTimeData = allTimeResult.rows[0];

            const operationsToday = parseInt(todayData.operations_count || 0);
            const winningToday = parseInt(todayData.winning_ops || 0);
            const todayPnL = parseFloat(todayData.total_pnl || 0);

            const totalOperations = parseInt(allTimeData.total_operations || 0);
            const totalWinning = parseInt(allTimeData.total_winning || 0);

            const todaySuccessRate = operationsToday > 0 ? (winningToday / operationsToday) * 100 : 0;
            const overallSuccessRate = totalOperations > 0 ? (totalWinning / totalOperations) * 100 : 0;

            const totalInvested = 10000;
            const todayReturnPercent = totalInvested > 0 ? (todayPnL / totalInvested) * 100 : 0;

            console.log(`✅ Calculated daily stats from operations for user ${userId}`);
            return {
                operationsToday,
                successRate: Math.round(todaySuccessRate * 10) / 10,
                historicalSuccessRate: Math.round(overallSuccessRate * 10) / 10,
                todayReturnUSD: Math.round(todayPnL * 100) / 100,
                todayReturnPercent: Math.round(todayReturnPercent * 100) / 100,
                totalInvested: totalInvested
            };

        } catch (error) {
            console.error('❌ Error fetching daily stats from database:', error);
            return {
                operationsToday: 0,
                successRate: 0,
                historicalSuccessRate: 0,
                todayReturnUSD: 0,
                todayReturnPercent: 0,
                totalInvested: 10000
            };
        }
    }

    /**
     * Get top 10 TradingView signals from database
     * These are raw signals from TradingView webhooks (not executed trades)
     */
    async getTopProcessSignals() {
        try {
            console.log('📡 Fetching top 10 TradingView signals from database...');

            if (!this.pool) {
                console.log('⚠️ No database connection, returning empty top signals');
                return [];
            }

            // Query trading_signals table (TradingView webhook alerts)
            const result = await this.pool.query(`
                SELECT
                    signal_id as id,
                    symbol as pair,
                    action as direction,
                    85 as confidence,
                    price as "entryPrice",
                    price as "currentPrice",
                    COALESCE(quantity, 0) as quantity,
                    0 as pnl,
                    0 as "pnlPercent",
                    received_at as timestamp,
                    'PROCESSANDO' as status,
                    COALESCE(strategy, 'TradingView Signal') as reasoning,
                    source
                FROM trading_signals
                WHERE received_at >= NOW() - INTERVAL '24 hours'
                ORDER BY received_at DESC
                LIMIT 10
            `);

            // Enrich signals with real-time prices and P&L
            const enrichedSignals = [];
            for (const [index, row] of result.rows.entries()) {
                const entryPrice = parseFloat(row.entryPrice) || 0;
                let currentPrice = entryPrice;
                let pnl = 0;
                let pnlPercent = 0;
                let quantity = parseFloat(row.quantity) || 0.01; // Default quantity for display

                // Fetch real-time price from Binance
                try {
                    const priceData = await this.binanceService.getSymbolPrice(row.pair);
                    if (priceData.success && priceData.price) {
                        currentPrice = parseFloat(priceData.price);

                        // Calculate P&L based on direction
                        if (row.direction === 'BUY' || row.direction === 'LONG') {
                            pnl = (currentPrice - entryPrice) * quantity;
                            pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
                        } else { // SELL or SHORT
                            pnl = (entryPrice - currentPrice) * quantity;
                            pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
                        }
                    }
                } catch (priceError) {
                    console.warn(`Could not fetch price for ${row.pair}:`, priceError.message);
                }

                // Determine performance based on P&L
                let performance = 'MEDIUM';
                if (pnlPercent > 2) performance = 'HIGH';
                else if (pnlPercent < -1) performance = 'LOW';

                enrichedSignals.push({
                    rank: index + 1,
                    id: row.id,
                    pair: row.pair,
                    direction: row.direction,
                    confidence: parseInt(row.confidence) || 85,
                    entryPrice: entryPrice,
                    currentPrice: currentPrice,
                    quantity: quantity,
                    pnl: Math.round(pnl * 100) / 100,
                    pnlPercent: Math.round(pnlPercent * 100) / 100,
                    status: 'PROCESSANDO',
                    timestamp: row.timestamp,
                    reasoning: row.reasoning || 'TradingView Signal',
                    source: row.source || 'TRADINGVIEW',
                    stopLoss: null,
                    takeProfit: null,
                    userId: 'global',
                    performance: performance,
                    activity: 'ACTIVE'
                });
            }

            const topSignals = enrichedSignals;

            console.log(`✅ Fetched ${topSignals.length} TradingView signals from database`);
            return topSignals;

        } catch (error) {
            console.error('❌ Error fetching TradingView signals from database:', error);
            // Return empty array instead of failing
            return [];
        }
    }

    /**
     * Generate demo top signals when no real data is available
     */
    generateDemoTopSignals() {
        const cryptoPairs = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'MATICUSDT', 'DOTUSDT', 'LINKUSDT', 'UNIUSDT', 'AVAXUSDT', 'ATOMUSDT'];
        const directions = ['LONG', 'SHORT'];
        const statuses = ['PROCESSANDO', 'APROVADO', 'EXECUTADO'];
        const reasonings = [
            'AI detectou padrão de alta com 94% confiança',
            'Breakout confirmado + volume excepcional',
            'Reversão bullish identificada pelo algoritmo',
            'Momentum forte + indicadores alinhados',
            'Padrão harmônico completado',
            'Suporte forte testado com sucesso',
            'Divergência positiva confirmada',
            'Canal ascendente rompido para cima',
            'RSI oversold + sinais de reversão',
            'Fibonacci + volume crescente'
        ];

        return Array.from({ length: 10 }, (_, index) => {
            const pair = cryptoPairs[index] || cryptoPairs[Math.floor(Math.random() * cryptoPairs.length)];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const confidence = Math.floor(Math.random() * 25) + 70; // 70-95
            const pnlPercent = (Math.random() - 0.3) * 10; // -3% to +7%
            const pnl = pnlPercent * (Math.random() * 1000 + 500); // Random position size
            const entryPrice = 50000 + Math.random() * 20000; // Random BTC-like price
            const currentPrice = entryPrice * (1 + pnlPercent / 100);

            return {
                rank: index + 1,
                id: `DEMO_${index + 1}`,
                pair,
                direction,
                confidence,
                entryPrice: Math.round(entryPrice * 100) / 100,
                currentPrice: Math.round(currentPrice * 100) / 100,
                quantity: +(Math.random() * 0.5 + 0.1).toFixed(3),
                pnl: Math.round(pnl * 100) / 100,
                pnlPercent: Math.round(pnlPercent * 100) / 100,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time in last 24h
                reasoning: reasonings[index] || reasonings[Math.floor(Math.random() * reasonings.length)],
                source: 'AI',
                stopLoss: null,
                takeProfit: null,
                userId: 'demo',
                performance: pnl > 0 ? 'HIGH' : pnl > -100 ? 'MEDIUM' : 'LOW',
                activity: Math.random() > 0.5 ? 'ACTIVE' : 'MONITORING'
            };
        }).sort((a, b) => b.pnlPercent - a.pnlPercent); // Sort by performance
    }

    /**
     * Calculate signal performance rating
     */
    calculateSignalPerformance(pnl, pnlPercent) {
        if (pnl > 100 || pnlPercent > 5) return 'HIGH';
        if (pnl > 0 || pnlPercent > 0) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Calculate signal activity status
     */
    calculateSignalActivity(timestamp) {
        const now = new Date();
        const signalTime = new Date(timestamp);
        const hoursDiff = (now - signalTime) / (1000 * 60 * 60);

        if (hoursDiff < 1) return 'ACTIVE';
        if (hoursDiff < 6) return 'MONITORING';
        return 'COMPLETED';
    }

    /**
     * Generate a new trading signal
     * ⚠️ DEPRECATED: Use TradingView webhook for real signals
     * This endpoint is kept for testing/demo purposes only
     */
    async generateNewSignal(userId) {
        console.warn('⚠️ generateNewSignal() called - This is a DEMO endpoint');
        console.warn('⚠️ Real signals should come from TradingView webhook: POST /api/tradingview/signal');

        // Return instruction instead of generating mock data
        return {
            deprecated: true,
            message: 'This endpoint is deprecated. Use TradingView webhook for real signals.',
            instructions: {
                webhook_url: '/api/tradingview/signal',
                method: 'POST',
                example_payload: {
                    action: 'BUY',
                    symbol: 'BTCUSDT',
                    price: 50000,
                    strategy: 'My Strategy'
                }
            },
            note: 'Signals now come via WebSocket real-time from TradingView alerts'
        };

        /* DISABLED: Mock signal generation - commented out
        try {
            const cryptoPairs = [
                'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'MATICUSDT', 'DOTUSDT',
                'LINKUSDT', 'UNIUSDT', 'AVAXUSDT', 'ATOMUSDT', 'FTMUSDT', 'ALGOUSDT',
                'XRPUSDT', 'DOGEUSDT', 'LTCUSDT', 'BCHUSDT', 'TRXUSDT', 'EOSUSDT',
                'XLMUSDT', 'VETUSDT', 'FILUSDT', 'ICPUSDT', 'THETAUSDT', 'AAVEUSDT'
            ];

            const reasonings = [
                'Breakout confirmado + volume alto',
                'Suporte testado com sucesso',
                'Resistência quebrada + momentum',
                'Padrão de reversão detectado',
                'Divergência bullish confirmada',
                'Volume crescente + breakout',
                'Média móvel cruzou para cima',
                'RSI em oversold + reversão',
                'Fibonacci retracement + bounce',
                'Canal ascendente + breakout'
            ];

            const pair = cryptoPairs[Math.floor(Math.random() * cryptoPairs.length)];
            const direction = Math.random() > 0.5 ? 'LONG' : 'SHORT';
            const strength = Math.floor(Math.random() * 40) + 40; // 40-80
            const confidence = Math.floor(Math.random() * 30) + 50; // 50-80
            const reasoning = reasonings[Math.floor(Math.random() * reasonings.length)];
            const status = Math.random() > 0.3 ? 'PROCESSANDO' : 'APROVADO';

            // FIXED: Check if database connection is available
            if (!this.pool) {
                console.log('⚠️ No database connection, returning mock signal');
                return {
                    id: `MOCK_${Date.now()}`,
                    pair,
                    direction,
                    confidence,
                    reasoning,
                    status: 'MOCK_SIGNAL',
                    timestamp: new Date().toISOString()
                };
            }

            // Create new signal in database
            const result = await this.pool.query(`
                INSERT INTO trading_operations (
                    user_id, operation_id, trading_pair, operation_type, 
                    entry_price, quantity, status, entry_time, 
                    signal_source, confidence_score, reasoning
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                ) RETURNING id
            `, [
                userId,
                `SIGNAL_${Date.now()}`,
                pair,
                direction,
                0, // entry_price (will be filled when executed)
                0, // quantity (will be filled when executed)
                'SIGNAL_GENERATED',
                new Date(),
                'AI',
                confidence,
                reasoning
            ]);

            return {
                id: result.rows[0].id.toString(),
                pair,
                direction,
                strength,
                confidence,
                timestamp: new Date(),
                status,
                reasoning
            };

        } catch (error) {
            // Handle specific database errors
            if (error.code === '42P01') {
                console.log('⚠️ Table "trading_operations" does not exist, returning mock signal');
            } else {
                console.error('❌ Error generating new signal:', error);
            }
            // Fallback to mock signal if database fails
            return {
                id: `MOCK_${Date.now()}`,
                pair,
                direction,
                strength,
                confidence,
                timestamp: new Date(),
                status: 'SIGNAL_GENERATED',
                reasoning: 'Mock signal - database table not available'
            };
        }
        END OF COMMENTED CODE */
    }

    /**
     * Map database status to frontend status
     */
    mapOperationStatus(dbStatus) {
        const statusMap = {
            'SIGNAL_GENERATED': 'PROCESSANDO',
            'OPEN': 'APROVADO',
            'CLOSED': 'EXECUTADO',
            'CANCELLED': 'DESCARTADO'
        };
        return statusMap[dbStatus] || 'PROCESSANDO';
    }

    /**
     * Update real-time data (market indicators, prices, etc.)
     */
    async updateRealTimeData() {
        try {
            // This would typically update market data from external APIs
            // For now, we'll just return updated market indicators
            return await this.getMarketIndicators();
        } catch (error) {
            console.error('❌ Error updating real-time data:', error);
            throw error;
        }
    }

    /**
     * Close database connection
     */
    async close() {
        await this.pool.end();
    }
}

module.exports = RealOperationsService;
