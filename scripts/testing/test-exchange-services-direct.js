/**
 * 🧪 DIRECT EXCHANGE SERVICES TEST
 * Tests Binance and Bybit services using .env API keys
 * 
 * Required .env variables:
 * - BINANCE_API_KEY
 * - BINANCE_API_SECRET
 * - BYBIT_API_KEY
 * - BYBIT_API_SECRET
 * - BINANCE_TESTNET (true/false)
 * - BYBIT_TESTNET (true/false)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const BinanceService = require('../../src/services/exchange/binance-service');
const BybitService = require('../../src/services/exchange/bybit-service');

class DirectExchangeServiceTester {
    constructor() {
        this.results = {
            binance: { passed: 0, failed: 0, tests: [] },
            bybit: { passed: 0, failed: 0, tests: [] }
        };
    }

    // ============================================
    // BINANCE DIRECT TESTS
    // ============================================

    async testBinanceDirect() {
        console.log('\n🔥 BINANCE SERVICE - DIRECT TEST');
        console.log('==========================================');
        
        const apiKey = process.env.BINANCE_API_KEY;
        const apiSecret = process.env.BINANCE_API_SECRET;
        const testnet = process.env.BINANCE_TESTNET === 'true';

        console.log(`\nEnvironment: ${testnet ? 'TESTNET' : 'MAINNET'}`);
        console.log(`API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NOT SET'}`);
        console.log(`API Secret: ${apiSecret ? '***' + apiSecret.substring(apiSecret.length - 4) : 'NOT SET'}\n`);

        if (!apiKey || !apiSecret) {
            console.log('❌ SKIPPED: BINANCE_API_KEY or BINANCE_API_SECRET not set in .env');
            console.log('   Please add to .env file:\n');
            console.log('   BINANCE_API_KEY=your-api-key');
            console.log('   BINANCE_API_SECRET=your-api-secret');
            console.log('   BINANCE_TESTNET=false\n');
            return;
        }

        try {
            const binance = new BinanceService({ apiKey, apiSecret });

            // Test 0: Server Time Sync Check
            console.log('⏰ Checking server time synchronization...');
            try {
                await binance.checkServerTimeSync();
                console.log('');
            } catch (error) {
                console.log(`⚠️  Time sync check failed: ${error.message}\n`);
            }

            // Test 1: Connectivity
            console.log('1️⃣ Testing connectivity...');
            try {
                const connectivity = await binance.testConnectivity();
                if (connectivity.success) {
                    console.log('✅ PASS: Binance API is reachable\n');
                    this.results.binance.passed++;
                    this.results.binance.tests.push({ test: 'connectivity', status: 'PASS' });
                } else {
                    throw new Error('Connectivity test failed');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.binance.failed++;
                this.results.binance.tests.push({ test: 'connectivity', status: 'FAIL', error: error.message });
            }

            // Test 2: Get Symbol Price
            console.log('2️⃣ Testing getSymbolPrice (BTCUSDT)...');
            try {
                const price = await binance.getSymbolPrice('BTCUSDT');
                if (price.success && price.price > 0) {
                    console.log(`✅ PASS: BTC price = $${price.price.toLocaleString()}\n`);
                    this.results.binance.passed++;
                    this.results.binance.tests.push({ test: 'getSymbolPrice', status: 'PASS', price: price.price });
                } else {
                    throw new Error('Invalid price data');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.binance.failed++;
                this.results.binance.tests.push({ test: 'getSymbolPrice', status: 'FAIL', error: error.message });
            }

            // Test 3: Get 24hr Ticker
            console.log('3️⃣ Testing get24hrTicker (ETHUSDT)...');
            try {
                const ticker = await binance.get24hrTicker('ETHUSDT');
                if (ticker.success) {
                    console.log(`✅ PASS: ETH price = $${ticker.data.lastPrice}`);
                    console.log(`   24h Change: ${ticker.data.priceChangePercent}%`);
                    console.log(`   Volume: ${ticker.data.volume}\n`);
                    this.results.binance.passed++;
                    this.results.binance.tests.push({ test: 'get24hrTicker', status: 'PASS' });
                } else {
                    throw new Error('Invalid ticker data');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.binance.failed++;
                this.results.binance.tests.push({ test: 'get24hrTicker', status: 'FAIL', error: error.message });
            }
        

            // Test 4: Get Account Balance (Futures)
            console.log('4️⃣ Testing getAccountBalance (Futures)...');
            try {
                const accountInfo = await binance.getAccountBalance();
                if (accountInfo.success) {
                    const balances = accountInfo.result?.balances || [];
                    const nonZeroBalances = balances.filter(b => {
                        const total = parseFloat(b.free || 0) + parseFloat(b.locked || 0);
                        return total > 0;
                    });
                    
                    console.log('✅ PASS: Account info retrieved');
                    console.log(`   Total Assets: ${balances.length}`);
                    console.log(`   Assets with balance: ${nonZeroBalances.length}\n`);
                    
                    if (nonZeroBalances.length > 0) {
                        console.log('   💰 Balances:');
                        nonZeroBalances.forEach(balance => {
                            const total = parseFloat(balance.free || 0) + parseFloat(balance.locked || 0);
                            console.log(`      ${balance.asset}: ${total.toFixed(8)} (Free: ${balance.free}, Locked: ${balance.locked})`);
                        });
                        console.log('');
                    } else {
                        console.log('   ℹ️  Account has no balances (empty)\n');
                    }
                    
                    this.results.binance.passed++;
                    this.results.binance.tests.push({ 
                        test: 'getAccountBalance', 
                        status: 'PASS',
                        assetCount: balances.length,
                        nonZeroCount: nonZeroBalances.length
                    });
                } else {
                    throw new Error(accountInfo.error || 'Failed to get account info');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.binance.failed++;
                this.results.binance.tests.push({ test: 'getAccountBalance', status: 'FAIL', error: error.message });
            }

            // Test 5: Get Open Orders
            console.log('5️⃣ Testing getOpenOrders (BTCUSDT)...');
            try {
                const orders = await binance.getOpenOrders('BTCUSDT');
                console.log(`✅ PASS: Retrieved ${orders.length} open orders\n`);
                this.results.binance.passed++;
                this.results.binance.tests.push({ test: 'getOpenOrders', status: 'PASS', orderCount: orders.length });
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.binance.failed++;
                this.results.binance.tests.push({ test: 'getOpenOrders', status: 'FAIL', error: error.message });
            }

            // Test 6: Get Klines
            console.log('6️⃣ Testing getKlines (BTCUSDT, 1h)...');
            try {
                const klines = await binance.getKlines('BTCUSDT', '1h', 5);
                if (klines && klines.length > 0) {
                    console.log(`✅ PASS: Retrieved ${klines.length} candles`);
                    console.log(`   Latest: Open=$${klines[klines.length-1].open}, Close=$${klines[klines.length-1].close}\n`);
                    this.results.binance.passed++;
                    this.results.binance.tests.push({ test: 'getKlines', status: 'PASS', candleCount: klines.length });
                } else {
                    throw new Error('No kline data');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.binance.failed++;
                this.results.binance.tests.push({ test: 'getKlines', status: 'FAIL', error: error.message });
            }

        } catch (error) {
            console.error(`\n❌ CRITICAL ERROR: ${error.message}\n`);
        }
    }

    // ============================================
    // BYBIT DIRECT TESTS
    // ============================================

    async testBybitDirect() {
        console.log('\n🔥 BYBIT SERVICE - DIRECT TEST');
        console.log('==========================================');
        
        const apiKey = process.env.BYBIT_API_KEY;
        const apiSecret = process.env.BYBIT_API_SECRET;
        const testnet = process.env.BYBIT_TESTNET === 'true';

        console.log(`\nEnvironment: ${testnet ? 'TESTNET' : 'MAINNET'}`);
        console.log(`API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NOT SET'}`);
        console.log(`API Secret: ${apiSecret ? '***' + apiSecret.substring(apiSecret.length - 4) : 'NOT SET'}\n`);

        if (!apiKey || !apiSecret) {
            console.log('❌ SKIPPED: BYBIT_API_KEY or BYBIT_API_SECRET not set in .env');
            console.log('   Please add to .env file:\n');
            console.log('   BYBIT_API_KEY=your-api-key');
            console.log('   BYBIT_API_SECRET=your-api-secret');
            console.log('   BYBIT_TESTNET=false\n');
            return;
        }

        try {
            const bybit = new BybitService({ apiKey, apiSecret });

            // Test 1: Connectivity
            console.log('1️⃣ Testing connectivity...');
            try {
                const connectivity = await bybit.testConnectivity();
                if (connectivity.success) {
                    console.log('✅ PASS: Bybit API is reachable');
                    console.log(`   Server time: ${connectivity.serverTime}\n`);
                    this.results.bybit.passed++;
                    this.results.bybit.tests.push({ test: 'connectivity', status: 'PASS' });
                } else {
                    throw new Error('Connectivity test failed');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.bybit.failed++;
                this.results.bybit.tests.push({ test: 'connectivity', status: 'FAIL', error: error.message });
            }

            // Test 2: Get Symbol Price
            console.log('2️⃣ Testing getSymbolPrice (BTCUSDT)...');
            try {
                const price = await bybit.getSymbolPrice('BTCUSDT');
                if (price.success && price.price > 0) {
                    console.log(`✅ PASS: BTC price = $${price.price.toLocaleString()}`);
                    console.log(`   Bid: $${price.bidPrice}, Ask: $${price.askPrice}\n`);
                    this.results.bybit.passed++;
                    this.results.bybit.tests.push({ test: 'getSymbolPrice', status: 'PASS', price: price.price });
                } else {
                    throw new Error('Invalid price data');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.bybit.failed++;
                this.results.bybit.tests.push({ test: 'getSymbolPrice', status: 'FAIL', error: error.message });
            }

            // Test 3: Get 24hr Ticker
            console.log('3️⃣ Testing get24hrTicker (ETHUSDT)...');
            try {
                const ticker = await bybit.get24hrTicker('ETHUSDT');
                if (ticker.success) {
                    console.log(`✅ PASS: ETH price = $${ticker.data.lastPrice}`);
                    console.log(`   24h Change: ${ticker.data.priceChangePercent.toFixed(2)}%`);
                    console.log(`   Volume: ${ticker.data.volume24h}\n`);
                    this.results.bybit.passed++;
                    this.results.bybit.tests.push({ test: 'get24hrTicker', status: 'PASS' });
                } else {
                    throw new Error('Invalid ticker data');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.bybit.failed++;
                this.results.bybit.tests.push({ test: 'get24hrTicker', status: 'FAIL', error: error.message });
            }

            // Test 4: Get Account Balance
            console.log('4️⃣ Testing getAccountBalance...');
            try {
                const accountBalance = await bybit.getAccountBalance();
                if (accountBalance.success) {
                    const balances = accountBalance.result?.balances || [];
                    const accountType = accountBalance.result?.accountType || 'N/A';
                    
                    console.log('✅ PASS: Account balance retrieved');
                    console.log(`   Account type: ${accountType}`);
                    console.log(`   Balances: ${balances.length} assets\n`);
                    
                    if (balances.length > 0) {
                        console.log('   💰 Account Balances:');
                        balances.forEach(balance => {
                            if (balance.walletBalance > 0) {
                                console.log(`      ${balance.asset}: ${balance.walletBalance.toFixed(8)} (Available: ${balance.free.toFixed(8)})`);
                            }
                        });
                        console.log('');
                    }
                    
                    this.results.bybit.passed++;
                    this.results.bybit.tests.push({ test: 'getAccountBalance', status: 'PASS', assetCount: balances.length });
                } else {
                    throw new Error(accountBalance.error || 'Failed to get account balance');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.bybit.failed++;
                this.results.bybit.tests.push({ test: 'getAccountBalance', status: 'FAIL', error: error.message });
            }

            // Test 5: Get Wallet Balance (UNIFIED)
            console.log('5️⃣ Testing getWalletBalance (UNIFIED)...');
            try {
                const walletBalance = await bybit.getWalletBalance('UNIFIED');
                if (walletBalance.success) {
                    const list = walletBalance.result?.list || [];
                    console.log('✅ PASS: Wallet balance retrieved');
                    console.log(`   Accounts: ${list.length}`);
                    
                    if (list.length > 0) {
                        const coins = list[0].coin || [];
                        console.log(`   Total Coins: ${coins.length}`);
                        
                        if (coins.length > 0) {
                            console.log('\n   💰 Balances:');
                            coins.forEach(coin => {
                                const walletBalance = parseFloat(coin.walletBalance || 0);
                                const availableBalance = parseFloat(coin.availableBalance || 0);
                                if (walletBalance > 0 || availableBalance > 0) {
                                    console.log(`      ${coin.coin}:`);
                                    console.log(`         Wallet: ${walletBalance.toFixed(8)}`);
                                    console.log(`         Available: ${availableBalance.toFixed(8)}`);
                                }
                            });
                            console.log('');
                        } else {
                            console.log('   ℹ️  No coins with balance (account empty)\n');
                        }
                    } else {
                        console.log('   ℹ️  No accounts found\n');
                    }
                    
                    this.results.bybit.passed++;
                    this.results.bybit.tests.push({ test: 'getWalletBalance', status: 'PASS', accountCount: list.length });
                } else {
                    throw new Error(walletBalance.error || 'Failed to get wallet balance');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.bybit.failed++;
                this.results.bybit.tests.push({ test: 'getWalletBalance', status: 'FAIL', error: error.message });
            }

            // Test 6: Get Positions (Linear/Futures)
            console.log('6️⃣ Testing getPositions (linear)...');
            try {
                const positions = await bybit.getPositions('linear');
                if (positions.success) {
                    console.log(`✅ PASS: Retrieved ${positions.data.length} positions\n`);
                    this.results.bybit.passed++;
                    this.results.bybit.tests.push({ test: 'getPositions', status: 'PASS', positionCount: positions.data.length });
                } else {
                    throw new Error(positions.error || 'Failed to get positions');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.bybit.failed++;
                this.results.bybit.tests.push({ test: 'getPositions', status: 'FAIL', error: error.message });
            }

            // Test 7: Get Open Orders
            console.log('7️⃣ Testing getOpenOrders (linear, BTCUSDT)...');
            try {
                const orders = await bybit.getOpenOrders('BTCUSDT', 'linear');
                console.log(`✅ PASS: Retrieved ${orders.length} open orders\n`);
                this.results.bybit.passed++;
                this.results.bybit.tests.push({ test: 'getOpenOrders', status: 'PASS', orderCount: orders.length });
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.bybit.failed++;
                this.results.bybit.tests.push({ test: 'getOpenOrders', status: 'FAIL', error: error.message });
            }

            // Test 8: Get Klines
            console.log('8️⃣ Testing getKlines (BTCUSDT, 60min)...');
            try {
                const klines = await bybit.getKlines('BTCUSDT', '60', 5, 'spot');
                if (klines && klines.length > 0) {
                    console.log(`✅ PASS: Retrieved ${klines.length} candles`);
                    console.log(`   Latest: Close=$${klines[0].closePrice}\n`);
                    this.results.bybit.passed++;
                    this.results.bybit.tests.push({ test: 'getKlines', status: 'PASS', candleCount: klines.length });
                } else {
                    throw new Error('No kline data');
                }
            } catch (error) {
                console.log(`❌ FAIL: ${error.message}\n`);
                this.results.bybit.failed++;
                this.results.bybit.tests.push({ test: 'getKlines', status: 'FAIL', error: error.message });
            }

        } catch (error) {
            console.error(`\n❌ CRITICAL ERROR: ${error.message}\n`);
        }
    }

    // ============================================
    // TEST REPORT
    // ============================================

    printReport() {
        console.log('\n');
        console.log('========================================');
        console.log('📊 DIRECT EXCHANGE SERVICE TEST REPORT');
        console.log('========================================\n');

        // Binance Report
        const binanceTotal = this.results.binance.passed + this.results.binance.failed;
        const binanceRate = binanceTotal > 0 ? ((this.results.binance.passed / binanceTotal) * 100).toFixed(1) : 0;
        
        console.log('🔥 BINANCE:');
        console.log(`   Tests Passed: ${this.results.binance.passed}`);
        console.log(`   Tests Failed: ${this.results.binance.failed}`);
        console.log(`   Success Rate: ${binanceRate}%`);
        console.log(`   Status: ${binanceRate >= 80 ? '✅ OPERATIONAL' : '⚠️  NEEDS ATTENTION'}\n`);

        // Bybit Report
        const bybitTotal = this.results.bybit.passed + this.results.bybit.failed;
        const bybitRate = bybitTotal > 0 ? ((this.results.bybit.passed / bybitTotal) * 100).toFixed(1) : 0;
        
        console.log('🔥 BYBIT:');
        console.log(`   Tests Passed: ${this.results.bybit.passed}`);
        console.log(`   Tests Failed: ${this.results.bybit.failed}`);
        console.log(`   Success Rate: ${bybitRate}%`);
        console.log(`   Status: ${bybitRate >= 80 ? '✅ OPERATIONAL' : '⚠️  NEEDS ATTENTION'}\n`);

        // Overall
        const totalPassed = this.results.binance.passed + this.results.bybit.passed;
        const totalTests = binanceTotal + bybitTotal;
        const overallRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;

        console.log('========================================');
        console.log(`📈 OVERALL: ${totalPassed}/${totalTests} tests passed`);
        console.log(`🎯 Success Rate: ${overallRate}%`);
        
        if (overallRate >= 90) {
            console.log('🟢 STATUS: FULLY OPERATIONAL');
        } else if (overallRate >= 70) {
            console.log('🟡 STATUS: PARTIALLY OPERATIONAL');
        } else {
            console.log('🔴 STATUS: NEEDS ATTENTION');
        }
        
        console.log('========================================\n');

        // Error Details
        const binanceErrors = this.results.binance.tests.filter(t => t.status === 'FAIL');
        const bybitErrors = this.results.bybit.tests.filter(t => t.status === 'FAIL');

        if (binanceErrors.length > 0) {
            console.log('⚠️  BINANCE ERRORS:');
            binanceErrors.forEach(test => {
                console.log(`   - ${test.test}: ${test.error}`);
            });
            console.log('');
        }

        if (bybitErrors.length > 0) {
            console.log('⚠️  BYBIT ERRORS:');
            bybitErrors.forEach(test => {
                console.log(`   - ${test.test}: ${test.error}`);
            });
            console.log('');
        }
    }

    async runAllTests() {
        console.log('\n');
        console.log('╔════════════════════════════════════════╗');
        console.log('║   DIRECT EXCHANGE SERVICE TEST         ║');
        console.log('║   Using .env API Keys                  ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('\n');
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log('\n');

        const startTime = Date.now();

        // Run tests
        await this.testBinanceDirect();
        await this.testBybitDirect();

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        // Print report
        this.printReport();

        console.log(`⏱️  Total test duration: ${duration}s\n`);
        console.log('========================================');
        console.log('Test completed!');
        console.log('========================================\n');
    }
}

// ============================================
// RUN TESTS
// ============================================

async function main() {
    const tester = new DirectExchangeServiceTester();
    await tester.runAllTests();
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

module.exports = DirectExchangeServiceTester;

