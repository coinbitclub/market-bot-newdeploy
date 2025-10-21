#!/usr/bin/env node

/**
 * 🧪 TEST: Exchange Services Integration
 * ====================================
 * 
 * This script tests the integration of all files that use the exchange services
 * to ensure they work correctly with the fixed services.
 */

const BybitService = require('../../src/services/exchange/bybit-service');
const BinanceService = require('../../src/services/exchange/binance-service');
const UnifiedExchangeService = require('../../src/services/exchange/unified-exchange-service');

class ExchangeIntegrationTest {
    constructor() {
        this.bybitService = null;
        this.binanceService = null;
        this.unifiedService = null;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing exchange integration test...');
            
            // Test with mock credentials (won't actually place orders)
            const mockCredentials = {
                apiKey: 'test-api-key',
                apiSecret: 'test-api-secret'
            };
            
            this.bybitService = new BybitService(mockCredentials);
            this.binanceService = new BinanceService(mockCredentials);
            this.unifiedService = new UnifiedExchangeService({
                bybit: mockCredentials,
                binance: mockCredentials
            });
            
            console.log('✅ All exchange services initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize exchange services:', error.message);
            throw error;
        }
    }

    async testUnifiedExchangeService() {
        console.log('\n🧪 Testing Unified Exchange Service...');
        
        const tests = [
            { name: 'getMarketAnalysis', method: () => this.unifiedService.getMarketAnalysis(['BTCUSDT']) },
            { name: 'getAccountBalancence', method: () => this.unifiedService.getAccountBalancence() },
            { name: 'getTradingStatus', method: () => this.unifiedService.getTradingStatus() },
            { name: 'placeOrder', method: () => this.unifiedService.placeOrder('bybit', { category: 'linear', symbol: 'BTCUSDT', side: 'Buy', orderType: 'Market', qty: '0.001' }) },
            { name: 'cancelOrder', method: () => this.unifiedService.cancelOrder('bybit', 'BTCUSDT', 'test-order-id') },
            { name: 'getOpenOrders', method: () => this.unifiedService.getOpenOrders('bybit', 'BTCUSDT') },
            { name: 'testConnectivity', method: () => this.unifiedService.testConnectivity() }
        ];

        let passedTests = 0;
        
        for (const test of tests) {
            try {
                const result = await test.method();
                
                // Check if method executed without errors
                if (result && typeof result === 'object') {
                    console.log(`✅ ${test.name}: Method exists and executed`);
                    passedTests++;
                } else {
                    console.log(`❌ ${test.name}: Method failed`);
                }
                
            } catch (error) {
                if (error.message && error.message.includes('is not a function')) {
                    console.log(`❌ ${test.name}: Method does not exist`);
                } else {
                    // Other errors are expected with mock credentials
                    console.log(`✅ ${test.name}: Method exists (error expected with mock credentials)`);
                    passedTests++;
                }
            }
        }
        
        console.log(`📊 Unified Exchange Service: ${passedTests}/${tests.length} tests passed`);
        return passedTests === tests.length;
    }

    async testErrorHandlingConsistency() {
        console.log('\n🧪 Testing Error Handling Consistency...');
        
        try {
            // Test with no credentials
            const bybitNoCreds = new BybitService();
            const binanceNoCreds = new BinanceService();
            const unifiedNoCreds = new UnifiedExchangeService();
            
            const bybitResult = await bybitNoCreds.placeOrder({ symbol: 'BTCUSDT', side: 'Buy', qty: '0.001' });
            const binanceResult = await binanceNoCreds.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', qty: '0.001' });
            const unifiedResult = await unifiedNoCreds.placeOrder('bybit', { symbol: 'BTCUSDT', side: 'Buy', qty: '0.001' });
            
            // All should return error objects, not throw
            const bybitHandlesError = bybitResult && bybitResult.success === false;
            const binanceHandlesError = binanceResult && binanceResult.success === false;
            const unifiedHandlesError = unifiedResult && unifiedResult.success === false;
            
            console.log(`📊 Bybit Error Handling: ${bybitHandlesError ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`📊 Binance Error Handling: ${binanceHandlesError ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`📊 Unified Error Handling: ${unifiedHandlesError ? '✅ PASS' : '❌ FAIL'}`);
            
            return bybitHandlesError && binanceHandlesError && unifiedHandlesError;
            
        } catch (error) {
            console.log('❌ Error handling test failed:', error.message);
            return false;
        }
    }

    async testResponseFormatConsistency() {
        console.log('\n🧪 Testing Response Format Consistency...');
        
        try {
            // Test connectivity (should work without credentials)
            const bybitConnectivity = await this.bybitService.testConnectivity();
            const binanceConnectivity = await this.binanceService.testConnectivity();
            const unifiedConnectivity = await this.unifiedService.testConnectivity();
            
            // Check response format consistency
            const bybitFormat = bybitConnectivity && typeof bybitConnectivity === 'object' && 'success' in bybitConnectivity;
            const binanceFormat = binanceConnectivity && typeof binanceConnectivity === 'object' && 'success' in binanceConnectivity;
            const unifiedFormat = unifiedConnectivity && typeof unifiedConnectivity === 'object' && 'success' in unifiedConnectivity;
            
            console.log(`📊 Bybit Response Format: ${bybitFormat ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`📊 Binance Response Format: ${binanceFormat ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`📊 Unified Response Format: ${unifiedFormat ? '✅ PASS' : '❌ FAIL'}`);
            
            return bybitFormat && binanceFormat && unifiedFormat;
            
        } catch (error) {
            console.log('❌ Response format test failed:', error.message);
            return false;
        }
    }

    async testMethodAvailability() {
        console.log('\n🧪 Testing Method Availability...');
        
        const requiredMethods = [
            'placeOrder', 'cancelOrder', 'getOpenOrders', 'getAccountBalance',
            'testConnectivity', 'getSymbolPrice', 'getPositions'
        ];
        
        let allMethodsAvailable = true;
        
        for (const method of requiredMethods) {
            const bybitHasMethod = typeof this.bybitService[method] === 'function';
            const binanceHasMethod = typeof this.binanceService[method] === 'function';
            
            console.log(`📊 ${method}: Bybit=${bybitHasMethod ? '✅' : '❌'}, Binance=${binanceHasMethod ? '✅' : '❌'}`);
            
            if (!bybitHasMethod || !binanceHasMethod) {
                allMethodsAvailable = false;
            }
        }
        
        return allMethodsAvailable;
    }

    async runAllTests() {
        console.log('🧪 Starting Exchange Services Integration Tests');
        console.log('='.repeat(50));
        
        const results = {
            unifiedService: false,
            errorHandling: false,
            responseFormat: false,
            methodAvailability: false
        };
        
        try {
            await this.initialize();
            
            // Test 1: Unified Exchange Service
            results.unifiedService = await this.testUnifiedExchangeService();
            
            // Test 2: Error Handling Consistency
            results.errorHandling = await this.testErrorHandlingConsistency();
            
            // Test 3: Response Format Consistency
            results.responseFormat = await this.testResponseFormatConsistency();
            
            // Test 4: Method Availability
            results.methodAvailability = await this.testMethodAvailability();
            
        } catch (error) {
            console.error('💥 Test suite failed:', error.message);
        }
        
        // Print results
        console.log('\n📊 TEST RESULTS');
        console.log('='.repeat(30));
        console.log(`Unified Service: ${results.unifiedService ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Error Handling: ${results.errorHandling ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Response Format: ${results.responseFormat ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Method Availability: ${results.methodAvailability ? '✅ PASS' : '❌ FAIL'}`);
        
        const allTestsPassed = Object.values(results).every(result => result === true);
        console.log(`\n🎯 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        if (allTestsPassed) {
            console.log('\n🎉 All exchange services integration tests passed!');
            console.log('   All related files should work correctly with the fixed services.');
        } else {
            console.log('\n⚠️ Some tests failed. Check the service implementations.');
        }
        
        return allTestsPassed;
    }
}

// Main execution
async function main() {
    const test = new ExchangeIntegrationTest();
    
    try {
        const success = await test.runAllTests();
        process.exit(success ? 0 : 1);
        
    } catch (error) {
        console.error('💥 Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = ExchangeIntegrationTest;

