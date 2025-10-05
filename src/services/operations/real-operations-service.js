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
     * Get trading signals from TradingView webhook (real-time only)
     * NO DATABASE - signals come directly from TradingView webhook via WebSocket
     */
    async getTradingSignals(userId, limit = 20) {
        try {
            console.log(`📡 Getting real-time TradingView signals (webhook-only, no database)...`);

            // Real-time signals come ONLY from TradingView webhook via WebSocket
            // This endpoint returns empty array - signals are broadcasted directly to frontend
            // Frontend should listen to WebSocket events: 'trading_signal' and 'signal_update'
            
            console.log(`📡 NOTE: Real-time signals come via WebSocket from TradingView webhook`);
            console.log(`📡 Frontend should listen to: 'trading_signal' and 'signal_update' events`);
            console.log(`📡 No database polling - signals are broadcasted instantly when received`);
            
            // Return empty array - all signals come via WebSocket
            return [];

        } catch (error) {
            console.error('❌ Error in getTradingSignals:', error);
            return [];
        }
    }

    /**
     * REMOVED: broadcastSignalUpdate method
     * Real-time signals now come directly from TradingView webhook
     * No need for database-based broadcasting
     */

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
     * Get today's statistics only from database
     * Focused on daily performance metrics
     */
    async getDailyStats(userId) {
        try {
            console.log(`📡 Fetching TODAY'S stats for user ${userId} from database...`);

            if (!this.pool) {
                console.log('⚠️ No database connection, returning default stats');
                return {
                    operationsToday: 0,
                    successRate: 0,
                    todayReturnUSD: 0,
                    todayReturnPercent: 0,
                    totalInvested: 10000
                };
            }

            // Set today's date range
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            console.log(`📅 Today's range: ${today.toISOString()} to ${tomorrow.toISOString()}`);

            // Calculate today's stats from trading_operations
            const todayResult = await this.pool.query(`
                SELECT
                    COUNT(*) as operations_count,
                    COUNT(CASE WHEN profit_loss_usd > 0 THEN 1 END) as winning_ops,
                    COUNT(CASE WHEN profit_loss_usd < 0 THEN 1 END) as losing_ops,
                    COUNT(CASE WHEN profit_loss_usd = 0 THEN 1 END) as neutral_ops,
                    COALESCE(SUM(profit_loss_usd), 0) as total_pnl,
                    COALESCE(AVG(profit_loss_usd), 0) as avg_pnl,
                    COALESCE(MAX(profit_loss_usd), 0) as best_trade,
                    COALESCE(MIN(profit_loss_usd), 0) as worst_trade,
                    COALESCE(SUM(ABS(profit_loss_usd)), 0) as total_volume
                FROM trading_operations
                WHERE user_id = $1
                AND entry_time >= $2
                AND entry_time < $3
                AND status = 'CLOSED'
            `, [userId, today, tomorrow]);

            // Get today's open positions for additional context
            const openPositionsResult = await this.pool.query(`
                SELECT
                    COUNT(*) as open_positions,
                    COALESCE(SUM(quantity * entry_price), 0) as open_value
                FROM trading_operations
                WHERE user_id = $1
                AND entry_time >= $2
                AND entry_time < $3
                AND status = 'OPEN'
            `, [userId, today, tomorrow]);

            const todayData = todayResult.rows[0] || {};
            const openPositionsData = openPositionsResult.rows[0] || {};

            // Calculate today's metrics
            const operationsToday = parseInt(todayData.operations_count || 0);
            const winningToday = parseInt(todayData.winning_ops || 0);
            const losingToday = parseInt(todayData.losing_ops || 0);
            const neutralToday = parseInt(todayData.neutral_ops || 0);
            const todayPnL = parseFloat(todayData.total_pnl || 0);
            const avgPnL = parseFloat(todayData.avg_pnl || 0);
            const bestTrade = parseFloat(todayData.best_trade || 0);
            const worstTrade = parseFloat(todayData.worst_trade || 0);
            const totalVolume = parseFloat(todayData.total_volume || 0);
            const openPositions = parseInt(openPositionsData.open_positions || 0);
            const openValue = parseFloat(openPositionsData.open_value || 0);

            // Calculate success rate
            const totalClosed = winningToday + losingToday + neutralToday;
            const todaySuccessRate = totalClosed > 0 ? (winningToday / totalClosed) * 100 : 0;

            // Calculate return percentage (based on total invested)
            const totalInvested = 10000; // Default investment
            const todayReturnPercent = totalInvested > 0 ? (todayPnL / totalInvested) * 100 : 0;

            // Calculate additional metrics
            const winRate = totalClosed > 0 ? (winningToday / totalClosed) * 100 : 0;
            const lossRate = totalClosed > 0 ? (losingToday / totalClosed) * 100 : 0;
            const avgWin = winningToday > 0 ? todayPnL / winningToday : 0;
            const avgLoss = losingToday > 0 ? Math.abs(todayPnL) / losingToday : 0;

            const todayStats = {
                operationsToday,
                closedOperations: totalClosed,
                openPositions,
                successRate: Math.round(todaySuccessRate * 10) / 10,
                winRate: Math.round(winRate * 10) / 10,
                lossRate: Math.round(lossRate * 10) / 10,
                todayReturnUSD: Math.round(todayPnL * 100) / 100,
                todayReturnPercent: Math.round(todayReturnPercent * 100) / 100,
                totalInvested,
                
                // Detailed metrics
                winningTrades: winningToday,
                losingTrades: losingToday,
                neutralTrades: neutralToday,
                bestTrade: Math.round(bestTrade * 100) / 100,
                worstTrade: Math.round(worstTrade * 100) / 100,
                avgPnL: Math.round(avgPnL * 100) / 100,
                totalVolume: Math.round(totalVolume * 100) / 100,
                openValue: Math.round(openValue * 100) / 100,
                
                // Calculated ratios
                avgWin: Math.round(avgWin * 100) / 100,
                avgLoss: Math.round(avgLoss * 100) / 100,
                profitFactor: avgLoss > 0 ? Math.round((avgWin / avgLoss) * 100) / 100 : 0,
                
                // Timestamps
                date: today.toISOString().split('T')[0], // YYYY-MM-DD format
                lastUpdated: new Date().toISOString()
            };

            console.log(`✅ Calculated TODAY'S stats for user ${userId}:`);
            console.log(`   Operations: ${operationsToday} (${totalClosed} closed, ${openPositions} open)`);
            console.log(`   Success Rate: ${todaySuccessRate.toFixed(1)}%`);
            console.log(`   P&L: $${todayPnL.toFixed(2)} (${todayReturnPercent.toFixed(2)}%)`);
            console.log(`   Best Trade: $${bestTrade.toFixed(2)}, Worst: $${worstTrade.toFixed(2)}`);

            return todayStats;

        } catch (error) {
            console.error('❌ Error fetching today\'s stats from database:', error);
            return {
                operationsToday: 0,
                closedOperations: 0,
                openPositions: 0,
                successRate: 0,
                winRate: 0,
                lossRate: 0,
                todayReturnUSD: 0,
                todayReturnPercent: 0,
                totalInvested: 10000,
                winningTrades: 0,
                losingTrades: 0,
                neutralTrades: 0,
                bestTrade: 0,
                worstTrade: 0,
                avgPnL: 0,
                totalVolume: 0,
                openValue: 0,
                avgWin: 0,
                avgLoss: 0,
                profitFactor: 0,
                date: new Date().toISOString().split('T')[0],
                lastUpdated: new Date().toISOString()
            };
        }
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
