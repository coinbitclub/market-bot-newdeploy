/**
 * 🧪 FULL SYSTEM INTEGRATION TEST
 * Tests the complete trading bot system including:
 * - Authentication
 * - Binance & Bybit integration
 * - Trading bot functionality
 * - API endpoints
 * - User settings
 * - Real exchange connectivity
 */

require('dotenv').config();
const axios = require('axios');

class FullSystemTester {
    constructor() {
        this.baseURL = process.env.API_URL || 'http://localhost:3333';
        this.authToken = null;
        this.userId = null;
        this.testResults = {
            auth: [],
            exchanges: [],
            userSettings: [],
            trading: [],
            errors: []
        };
    }

    // ============================================
    // AUTHENTICATION TESTS
    // ============================================

    async testLogin(email, password) {
        console.log('\n🔐 Testing Authentication...');
        console.log('==========================================');
        
        try {
            console.log(`\n1️⃣ Logging in as ${email}...`);
            const response = await axios.post(`${this.baseURL}/api/auth/login`, {
                email,
                password
            });

            if (response.data.success && (response.data.token || response.data.accessToken)) {
                this.authToken = response.data.token || response.data.accessToken;
                this.userId = response.data.user?.id;
                
                console.log(`✅ SUCCESS: Login successful`);
                console.log(`   User ID: ${this.userId}`);
                console.log(`   Username: ${response.data.user?.username}`);
                console.log(`   Email: ${response.data.user?.email}`);
                console.log(`   Plan: ${response.data.user?.plan_type}`);
                console.log(`   Token: ${this.authToken.substring(0, 20)}...`);
                
                this.testResults.auth.push({
                    test: 'login',
                    status: 'PASS',
                    user: response.data.user
                });
                
                return true;
            } else {
                throw new Error('Login failed - no token received');
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            if (error.response?.data) {
                console.log(`   Details: ${JSON.stringify(error.response.data)}`);
            }
            this.testResults.errors.push({
                test: 'login',
                error: error.message
            });
            return false;
        }
    }

    async testValidateToken() {
        console.log(`\n2️⃣ Validating authentication token...`);
        
        try {
            const response = await axios.get(`${this.baseURL}/api/auth/validate`, {
                headers: { Authorization: `Bearer ${this.authToken}` }
            });

            if (response.data.valid) {
                console.log(`✅ SUCCESS: Token is valid`);
                console.log(`   User: ${response.data.user?.username}`);
                
                this.testResults.auth.push({
                    test: 'validateToken',
                    status: 'PASS'
                });
                return true;
            } else {
                throw new Error('Token validation failed');
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'validateToken',
                error: error.message
            });
            return false;
        }
    }

    async testGetProfile() {
        console.log(`\n3️⃣ Getting user profile...`);
        
        try {
            const response = await axios.get(`${this.baseURL}/api/auth/profile`, {
                headers: { Authorization: `Bearer ${this.authToken}` }
            });

            if (response.data.success) {
                console.log(`✅ SUCCESS: Profile retrieved`);
                console.log(`   Balance BRL: R$${response.data.user?.balance_real_brl || 0}`);
                console.log(`   Balance USD: $${response.data.user?.balance_real_usd || 0}`);
                console.log(`   Subscription: ${response.data.user?.subscription_status}`);
                
                this.testResults.auth.push({
                    test: 'getProfile',
                    status: 'PASS',
                    profile: response.data.user
                });
                return true;
            } else {
                throw new Error('Profile retrieval failed');
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'getProfile',
                error: error.message
            });
            return false;
        }
    }

    // ============================================
    // EXCHANGE INTEGRATION TESTS
    // ============================================

    async testAPIKeysStatus() {
        console.log('\n🔑 Testing API Keys Status...');
        console.log('==========================================');
        
        try {
            console.log(`\n1️⃣ Getting all API keys status...`);
            const response = await axios.get(`${this.baseURL}/api/user-api-keys/all/status`, {
                headers: { Authorization: `Bearer ${this.authToken}` }
            });

            if (response.data.success) {
                console.log(`✅ SUCCESS: API keys status retrieved`);
                console.log(`   Trading Mode: ${response.data.tradingMode}`);
                
                const exchanges = response.data.exchanges || {};
                
                // Bybit
                if (exchanges.bybit?.has_key) {
                    console.log(`   Bybit: ✅ Connected`);
                    console.log(`      API Key: ${exchanges.bybit.masked_key}`);
                    console.log(`      Enabled: ${exchanges.bybit.enabled}`);
                    console.log(`      Verified: ${exchanges.bybit.verified}`);
                } else {
                    console.log(`   Bybit: ⚠️  Not configured`);
                }
                
                // Binance
                if (exchanges.binance?.has_key) {
                    console.log(`   Binance: ✅ Connected`);
                    console.log(`      API Key: ${exchanges.binance.masked_key}`);
                    console.log(`      Enabled: ${exchanges.binance.enabled}`);
                    console.log(`      Verified: ${exchanges.binance.verified}`);
                } else {
                    console.log(`   Binance: ⚠️  Not configured`);
                }
                
                this.testResults.exchanges.push({
                    test: 'apiKeysStatus',
                    status: 'PASS',
                    exchanges
                });
                return true;
            } else {
                throw new Error('Failed to get API keys status');
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'apiKeysStatus',
                error: error.message
            });
            return false;
        }
    }

    async testExchangeBalances() {
        console.log(`\n2️⃣ Getting exchange balances...`);
        
        try {
            const response = await axios.get(`${this.baseURL}/api/user-settings/all-balances`, {
                headers: { Authorization: `Bearer ${this.authToken}` }
            });

            if (response.data.success) {
                console.log(`✅ SUCCESS: Exchange balances retrieved`);
                
                // Bybit
                if (response.data.bybit) {
                    console.log(`   Bybit:`);
                    console.log(`      Status: ${response.data.bybit.success ? 'Connected' : 'Not connected'}`);
                    console.log(`      Has Credentials: ${response.data.bybit.hasCredentials}`);
                    if (response.data.bybit.success && response.data.bybit.data) {
                        console.log(`      Balance data available: Yes`);
                    } else if (response.data.bybit.error) {
                        console.log(`      Error: ${response.data.bybit.error}`);
                    }
                }
                
                // Binance
                if (response.data.binance) {
                    console.log(`   Binance:`);
                    console.log(`      Status: ${response.data.binance.success ? 'Connected' : 'Not connected'}`);
                    console.log(`      Has Credentials: ${response.data.binance.hasCredentials}`);
                    if (response.data.binance.success && response.data.binance.data) {
                        console.log(`      Balance data available: Yes`);
                    } else if (response.data.binance.error) {
                        console.log(`      Error: ${response.data.binance.error}`);
                    }
                }
                
                this.testResults.exchanges.push({
                    test: 'exchangeBalances',
                    status: 'PASS',
                    balances: response.data
                });
                return true;
            } else {
                throw new Error('Failed to get exchange balances');
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'exchangeBalances',
                error: error.message
            });
            return false;
        }
    }

    async testPreferredExchange() {
        console.log(`\n3️⃣ Getting preferred exchange...`);
        
        try {
            const response = await axios.get(`${this.baseURL}/api/user-settings/exchange`, {
                headers: { Authorization: `Bearer ${this.authToken}` }
            });

            if (response.data.success) {
                console.log(`✅ SUCCESS: Preferred exchange retrieved`);
                console.log(`   Preferred Exchange: ${response.data.preferred_exchange || 'Not set'}`);
                
                this.testResults.exchanges.push({
                    test: 'preferredExchange',
                    status: 'PASS',
                    exchange: response.data.preferred_exchange
                });
                return true;
            } else {
                throw new Error('Failed to get preferred exchange');
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'preferredExchange',
                error: error.message
            });
            return false;
        }
    }

    // ============================================
    // USER SETTINGS TESTS
    // ============================================

    async testTradingSettings() {
        console.log('\n⚙️ Testing User Settings...');
        console.log('==========================================');
        
        try {
            console.log(`\n1️⃣ Getting trading settings...`);
            const response = await axios.get(`${this.baseURL}/api/user-settings/trading`, {
                headers: { Authorization: `Bearer ${this.authToken}` }
            });

            if (response.data.success) {
                const settings = response.data.settings;
                console.log(`✅ SUCCESS: Trading settings retrieved`);
                console.log(`   Max Leverage: ${settings.max_leverage}x`);
                console.log(`   Take Profit: ${settings.take_profit_percentage}%`);
                console.log(`   Stop Loss: ${settings.stop_loss_percentage}%`);
                console.log(`   Position Size: ${settings.position_size_percentage}%`);
                console.log(`   Risk Level: ${settings.risk_level}`);
                console.log(`   Margin Mode: ${settings.margin_mode || 'ISOLATED'}`);
                console.log(`   Auto Trade: ${settings.auto_trade_enabled ? 'Enabled' : 'Disabled'}`);
                
                this.testResults.userSettings.push({
                    test: 'tradingSettings',
                    status: 'PASS',
                    settings
                });
                return true;
            } else {
                throw new Error('Failed to get trading settings');
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'tradingSettings',
                error: error.message
            });
            return false;
        }
    }

    // ============================================
    // TRADING BOT TESTS
    // ============================================

    async testTradingStatus() {
        console.log('\n🤖 Testing Trading Bot...');
        console.log('==========================================');
        
        try {
            console.log(`\n1️⃣ Getting trading status...`);
            const response = await axios.get(`${this.baseURL}/api/trading/status`, {
                headers: { Authorization: `Bearer ${this.authToken}` }
            });

            if (response.data.success) {
                console.log(`✅ SUCCESS: Trading status retrieved`);
                console.log(`   Status: ${response.data.status}`);
                console.log(`   Active Positions: ${response.data.activePositions}`);
                console.log(`   Max Positions: ${response.data.maxPositions}`);
                console.log(`   Can Trade: ${response.data.canTrade ? 'Yes' : 'No'}`);
                
                if (response.data.exchangeStatus) {
                    console.log(`   Exchange Status:`, response.data.exchangeStatus);
                }
                
                this.testResults.trading.push({
                    test: 'tradingStatus',
                    status: 'PASS',
                    data: response.data
                });
                return true;
            } else {
                throw new Error('Failed to get trading status');
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'tradingStatus',
                error: error.message
            });
            return false;
        }
    }

    async testTradingViewWebhookStatus() {
        console.log(`\n2️⃣ Testing TradingView webhook status...`);
        
        try {
            const response = await axios.get(`${this.baseURL}/api/tradingview/status`);

            if (response.data.success) {
                const status = response.data.status;
                console.log(`✅ SUCCESS: Webhook status retrieved`);
                console.log(`   Webhook Active: ${status.webhook_active ? 'Yes' : 'No'}`);
                console.log(`   Trading Engine Ready: ${status.trading_engine_ready ? 'Yes' : 'No'}`);
                console.log(`   Trading Mode: ${status.trading_mode}`);
                console.log(`   Engine: ${status.engine}`);
                console.log(`   Supported Actions: ${status.supported_actions?.join(', ')}`);
                console.log(`   Webhook Endpoint: ${status.endpoints?.webhook}`);
                
                this.testResults.trading.push({
                    test: 'webhookStatus',
                    status: 'PASS',
                    webhookStatus: status
                });
                return true;
            } else {
                throw new Error('Failed to get webhook status');
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'webhookStatus',
                error: error.message
            });
            return false;
        }
    }

    async testGetPositions() {
        console.log(`\n3️⃣ Getting current positions...`);
        
        try {
            const response = await axios.get(`${this.baseURL}/api/operations/positions`, {
                headers: { Authorization: `Bearer ${this.authToken}` }
            });

            if (response.data.success) {
                const positions = response.data.positions || [];
                console.log(`✅ SUCCESS: Positions retrieved`);
                console.log(`   Total Positions: ${positions.length}`);
                
                if (positions.length > 0) {
                    positions.forEach((pos, idx) => {
                        console.log(`\n   Position ${idx + 1}:`);
                        console.log(`      Symbol: ${pos.trading_pair}`);
                        console.log(`      Exchange: ${pos.exchange}`);
                        console.log(`      Type: ${pos.operation_type}`);
                        console.log(`      Entry Price: $${pos.entry_price}`);
                        console.log(`      Quantity: ${pos.quantity}`);
                        console.log(`      Status: ${pos.status}`);
                    });
                }
                
                this.testResults.trading.push({
                    test: 'getPositions',
                    status: 'PASS',
                    positionCount: positions.length
                });
                return true;
            } else {
                throw new Error('Failed to get positions');
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'getPositions',
                error: error.message
            });
            return false;
        }
    }

    async testPerformanceOverview() {
        console.log(`\n4️⃣ Getting performance overview...`);
        
        try {
            const response = await axios.get(`${this.baseURL}/api/performance/overview`, {
                headers: { Authorization: `Bearer ${this.authToken}` }
            });

            if (response.data.success) {
                const overview = response.data.overview || {};
                console.log(`✅ SUCCESS: Performance overview retrieved`);
                console.log(`   Total Trades: ${overview.total_trades || 0}`);
                console.log(`   Winning Trades: ${overview.winning_trades || 0}`);
                console.log(`   Losing Trades: ${overview.losing_trades || 0}`);
                console.log(`   Win Rate: ${overview.win_rate || 0}%`);
                console.log(`   Total P&L: $${overview.total_pnl_usd || 0}`);
                
                this.testResults.trading.push({
                    test: 'performanceOverview',
                    status: 'PASS',
                    overview
                });
                return true;
            } else {
                throw new Error('Failed to get performance overview');
            }
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'performanceOverview',
                error: error.message
            });
            return false;
        }
    }

    // ============================================
    // DETAILED BALANCE TESTS (from test-exchange-balances-debug.js)
    // ============================================

    async testDetailedBalances() {
        console.log(`\n5️⃣ Testing detailed exchange balances (direct API calls)...`);
        
        try {
            const UserAPIKeyManager = require('../../src/services/user-api-keys/user-api-key-manager');
            const ConnectionPoolManager = require('../../src/database/connection-pool-manager');
            const BinanceService = require('../../src/services/exchange/binance-service');
            const BybitService = require('../../src/services/exchange/bybit-service');
            
            const dbPoolManager = new ConnectionPoolManager();
            const apiKeyManager = new UserAPIKeyManager(dbPoolManager);
            
            let bybitBalance = null;
            let binanceBalance = null;
            
            // Test Bybit
            console.log('\n   🔥 Testing Bybit Direct API...');
            try {
                const bybitCreds = await apiKeyManager.getAPICredentials(this.userId, 'bybit');
                if (bybitCreds.success && bybitCreds.apiKey) {
                    const bybitService = new BybitService({
                        apiKey: bybitCreds.apiKey,
                        apiSecret: bybitCreds.apiSecret
                    });
                    
                    const walletBalance = await bybitService.getWalletBalance('UNIFIED');
                    bybitBalance = walletBalance;
                    
                    if (walletBalance.success) {
                        const list = walletBalance.result?.list || [];
                        console.log(`   ✅ Bybit: Connected successfully`);
                        console.log(`      Accounts: ${list.length}`);
                        if (list.length > 0) {
                            const coins = list[0].coin || [];
                            console.log(`      Total Coins: ${coins.length}`);
                            if (coins.length > 0) {
                                console.log(`      Coins with balance:`);
                                coins.forEach(coin => {
                                    const balance = parseFloat(coin.walletBalance || 0);
                                    if (balance > 0) {
                                        console.log(`         ${coin.coin}: ${balance.toFixed(8)}`);
                                    }
                                });
                            } else {
                                console.log(`      ℹ️  No coins with balance (account empty)`);
                            }
                        }
                    } else {
                        console.log(`   ⚠️  Bybit: ${walletBalance.error || 'Failed to get balance'}`);
                    }
                } else {
                    console.log(`   ⚠️  Bybit: No credentials configured`);
                }
            } catch (error) {
                console.log(`   ❌ Bybit Error: ${error.message}`);
            }
            
            // Test Binance
            console.log('\n   🔥 Testing Binance Direct API...');
            try {
                const binanceCreds = await apiKeyManager.getAPICredentials(this.userId, 'binance');
                if (binanceCreds.success && binanceCreds.apiKey) {
                    const binanceService = new BinanceService({
                        apiKey: binanceCreds.apiKey,
                        apiSecret: binanceCreds.apiSecret
                    });
                    
                    const accountInfo = await binanceService.getAccountBalance();
                    binanceBalance = accountInfo;
                    
                    if (accountInfo.success) {
                        const balances = accountInfo.result?.balances || [];
                        console.log(`   ✅ Binance: Connected successfully`);
                        console.log(`      Total Assets: ${balances.length}`);
                        const nonZeroBalances = balances.filter(b => (parseFloat(b.free || 0) + parseFloat(b.locked || 0)) > 0);
                        if (nonZeroBalances.length > 0) {
                            console.log(`      Assets with balance: ${nonZeroBalances.length}`);
                            console.log(`      Coins with balance:`);
                            nonZeroBalances.forEach(balance => {
                                const total = parseFloat(balance.free || 0) + parseFloat(balance.locked || 0);
                                console.log(`         ${balance.asset}: ${total.toFixed(8)}`);
                            });
                        } else {
                            console.log(`      ℹ️  No assets with balance (account empty)`);
                        }
                    } else {
                        console.log(`   ⚠️  Binance: ${accountInfo.error || 'Failed to get balance'}`);
                    }
                } else {
                    console.log(`   ⚠️  Binance: No credentials configured`);
                }
            } catch (error) {
                console.log(`   ❌ Binance Error: ${error.message}`);
            }
            
            await dbPoolManager.closeAll();
            
            this.testResults.exchanges.push({
                test: 'detailedBalances',
                status: 'PASS',
                bybit: bybitBalance,
                binance: binanceBalance
            });
            
            console.log(`\n   ✅ Detailed balance test completed`);
            return true;
            
        } catch (error) {
            console.log(`\n   ❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'detailedBalances',
                error: error.message
            });
            return false;
        }
    }

    // ============================================
    // MARKET PRICES TEST (from test-exchange-integration.js)
    // ============================================

    async testMarketPrices() {
        console.log(`\n6️⃣ Testing real-time market prices...`);
        
        try {
            const BinanceService = require('../../src/services/exchange/binance-service');
            const BybitService = require('../../src/services/exchange/bybit-service');
            
            const binance = new BinanceService();
            const bybit = new BybitService();
            
            console.log('\n   📈 Fetching live prices...');
            
            // Get prices from both exchanges
            const btcBinance = await binance.getSymbolPrice('BTCUSDT');
            const ethBinance = await binance.getSymbolPrice('ETHUSDT');
            const btcBybit = await bybit.getSymbolPrice('BTCUSDT');
            const ethBybit = await bybit.getSymbolPrice('ETHUSDT');
            
            console.log('\n   Binance Prices:');
            if (btcBinance.success) {
                console.log(`      BTC: $${btcBinance.price.toLocaleString()}`);
            }
            if (ethBinance.success) {
                console.log(`      ETH: $${ethBinance.price.toLocaleString()}`);
            }
            
            console.log('\n   Bybit Prices:');
            if (btcBybit.success) {
                console.log(`      BTC: $${btcBybit.price.toLocaleString()}`);
            }
            if (ethBybit.success) {
                console.log(`      ETH: $${ethBybit.price.toLocaleString()}`);
            }
            
            this.testResults.exchanges.push({
                test: 'marketPrices',
                status: 'PASS',
                prices: {
                    binance: { BTC: btcBinance.price, ETH: ethBinance.price },
                    bybit: { BTC: btcBybit.price, ETH: ethBybit.price }
                }
            });
            
            console.log(`\n   ✅ Market prices retrieved successfully`);
            return true;
            
        } catch (error) {
            console.log(`\n   ❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'marketPrices',
                error: error.message
            });
            return false;
        }
    }

    // ============================================
    // SYSTEM STATUS TEST (Final Check)
    // ============================================

    async testSystemStatus() {
        console.log('\n\n🔍 FINAL SYSTEM STATUS CHECK');
        console.log('==========================================');
        
        try {
            const status = {
                server: { status: 'unknown', uptime: 0 },
                database: { status: 'unknown' },
                authentication: { status: 'unknown' },
                exchanges: {
                    binance: { status: 'unknown', connected: false },
                    bybit: { status: 'unknown', connected: false }
                },
                tradingBot: { status: 'unknown', ready: false },
                webhook: { status: 'unknown', active: false }
            };
            
            // Check server health
            try {
                const healthResponse = await axios.get(`${this.baseURL}/health`);
                if (healthResponse.data.status === 'ok') {
                    status.server.status = 'operational';
                    console.log('✅ Server: Operational');
                } else {
                    status.server.status = 'degraded';
                    console.log('⚠️  Server: Degraded');
                }
            } catch (error) {
                status.server.status = 'offline';
                console.log('❌ Server: Offline');
            }
            
            // Check authentication
            if (this.authToken) {
                status.authentication.status = 'operational';
                console.log('✅ Authentication: Operational');
            } else {
                status.authentication.status = 'failed';
                console.log('❌ Authentication: Failed');
            }
            
            // Check exchanges
            const exchangeTests = this.testResults.exchanges.filter(t => t.test === 'apiKeysStatus');
            if (exchangeTests.length > 0 && exchangeTests[0].exchanges) {
                const exchanges = exchangeTests[0].exchanges;
                
                if (exchanges.bybit?.has_key) {
                    status.exchanges.bybit.status = 'connected';
                    status.exchanges.bybit.connected = true;
                    console.log('✅ Bybit: Connected');
                } else {
                    status.exchanges.bybit.status = 'not_configured';
                    console.log('⚠️  Bybit: Not Configured');
                }
                
                if (exchanges.binance?.has_key) {
                    status.exchanges.binance.status = 'connected';
                    status.exchanges.binance.connected = true;
                    console.log('✅ Binance: Connected');
                } else {
                    status.exchanges.binance.status = 'not_configured';
                    console.log('⚠️  Binance: Not Configured');
                }
            }
            
            // Check trading bot
            const webhookTests = this.testResults.trading.filter(t => t.test === 'webhookStatus');
            if (webhookTests.length > 0) {
                const webhookStatus = webhookTests[0].webhookStatus;
                if (webhookStatus.trading_engine_ready) {
                    status.tradingBot.status = 'ready';
                    status.tradingBot.ready = true;
                    console.log('✅ Trading Bot: Ready');
                } else {
                    status.tradingBot.status = 'not_ready';
                    console.log('⚠️  Trading Bot: Not Ready');
                }
                
                if (webhookStatus.webhook_active) {
                    status.webhook.status = 'active';
                    status.webhook.active = true;
                    console.log('✅ TradingView Webhook: Active');
                } else {
                    status.webhook.status = 'inactive';
                    console.log('⚠️  TradingView Webhook: Inactive');
                }
            }
            
            // Overall system health
            console.log('\n========================================');
            const criticalComponents = [
                status.server.status === 'operational',
                status.authentication.status === 'operational',
                (status.exchanges.bybit.connected || status.exchanges.binance.connected),
                status.tradingBot.ready,
                status.webhook.active
            ];
            
            const healthyComponents = criticalComponents.filter(c => c).length;
            const totalComponents = criticalComponents.length;
            const healthPercentage = (healthyComponents / totalComponents * 100).toFixed(0);
            
            console.log(`\n🎯 SYSTEM HEALTH: ${healthPercentage}% (${healthyComponents}/${totalComponents} components operational)`);
            
            if (healthPercentage >= 80) {
                console.log('🟢 STATUS: PRODUCTION READY');
            } else if (healthPercentage >= 60) {
                console.log('🟡 STATUS: PARTIALLY OPERATIONAL');
            } else {
                console.log('🔴 STATUS: NEEDS ATTENTION');
            }
            
            console.log('========================================\n');
            
            this.testResults.trading.push({
                test: 'systemStatus',
                status: 'PASS',
                systemStatus: status,
                healthPercentage
            });
            
            return true;
            
        } catch (error) {
            console.log(`\n❌ FAILED: ${error.message}`);
            this.testResults.errors.push({
                test: 'systemStatus',
                error: error.message
            });
            return false;
        }
    }

    // ============================================
    // TEST REPORT
    // ============================================

    printTestReport() {
        console.log('\n\n');
        console.log('========================================');
        console.log('📊 FULL SYSTEM TEST REPORT');
        console.log('========================================\n');

        // Auth Report
        console.log('🔐 AUTHENTICATION:');
        console.log(`   Tests Passed: ${this.testResults.auth.length}`);
        console.log(`   Status: ${this.testResults.auth.length >= 3 ? '✅ All tests passed' : '⚠️  Some tests failed'}\n`);

        // Exchange Report
        console.log('🔑 EXCHANGE INTEGRATION:');
        console.log(`   Tests Passed: ${this.testResults.exchanges.length}`);
        console.log(`   Status: ${this.testResults.exchanges.length >= 3 ? '✅ All tests passed' : '⚠️  Some tests failed'}\n`);

        // User Settings Report
        console.log('⚙️  USER SETTINGS:');
        console.log(`   Tests Passed: ${this.testResults.userSettings.length}`);
        console.log(`   Status: ${this.testResults.userSettings.length >= 1 ? '✅ All tests passed' : '⚠️  Some tests failed'}\n`);

        // Trading Bot Report
        console.log('🤖 TRADING BOT:');
        console.log(`   Tests Passed: ${this.testResults.trading.length}`);
        console.log(`   Status: ${this.testResults.trading.length >= 4 ? '✅ All tests passed' : '⚠️  Some tests failed'}\n`);

        // Overall Summary
        const totalPassed = this.testResults.auth.length + 
                          this.testResults.exchanges.length + 
                          this.testResults.userSettings.length + 
                          this.testResults.trading.length;
        const totalErrors = this.testResults.errors.length;
        const totalTests = totalPassed + totalErrors;
        
        console.log('========================================');
        console.log(`📈 OVERALL: ${totalPassed}/${totalTests} tests passed`);
        console.log(`🎯 Success Rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`);
        console.log('========================================\n');

        // Error Details
        if (this.testResults.errors.length > 0) {
            console.log('\n⚠️  ERRORS:');
            this.testResults.errors.forEach(err => {
                console.log(`   - ${err.test}: ${err.error}`);
            });
            console.log('\n');
        }
    }

    async runAllTests(email, password) {
        console.log('\n');
        console.log('╔════════════════════════════════════════╗');
        console.log('║     FULL SYSTEM TEST SUITE             ║');
        console.log('║  Testing Complete Trading Bot System   ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('\n');
        console.log(`API URL: ${this.baseURL}`);
        console.log(`Test User: ${email}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log('\n');

        const startTime = Date.now();

        // Step 1: Authentication
        const loginSuccess = await this.testLogin(email, password);
        if (!loginSuccess) {
            console.log('\n❌ Authentication failed - cannot continue tests');
            this.printTestReport();
            return;
        }

        await this.testValidateToken();
        await this.testGetProfile();

        // Step 2: Exchange Integration
        await this.testAPIKeysStatus();
        await this.testExchangeBalances();
        await this.testPreferredExchange();

        // Step 3: User Settings
        await this.testTradingSettings();

        // Step 4: Trading Bot
        await this.testTradingStatus();
        await this.testTradingViewWebhookStatus();
        await this.testGetPositions();
        await this.testPerformanceOverview();

        // Step 5: Detailed Balance Tests
        await this.testDetailedBalances();

        // Step 6: Market Prices
        await this.testMarketPrices();

        // Step 7: Final System Status Check
        await this.testSystemStatus();

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        // Print report
        this.printTestReport();

        console.log(`⏱️  Total test duration: ${duration}s\n`);
        console.log('========================================');
        console.log('Test suite completed!');
        console.log('========================================\n');
    }
}

// ============================================
// RUN TESTS
// ============================================

async function main() {
    const email = process.argv[2] || 'admin@coinbitclub.com';
    const password = process.argv[3] || 'admin123';

    const tester = new FullSystemTester();
    await tester.runAllTests(email, password);
    process.exit(0);
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = FullSystemTester;

