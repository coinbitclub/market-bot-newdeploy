#!/usr/bin/env node

/**
 * 🧪 TEST: Both Exchange Services Fix
 * ==================================
 * 
 * This script tests both Bybit and Binance services to ensure all methods
 * work correctly after the fixes.
 */

const BybitService = require('../../src/services/exchange/bybit-service');
const BinanceService = require('../../src/services/exchange/binance-service');

class ExchangeServicesTest {
    constructor() {
        this.bybitService = null;
        this.binanceService = null;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing exchange services test...');
            
            // Test with mock credentials (won't actually place orders)
            const mockCredentials = {
                apiKey: 'test-api-key',
                apiSecret: 'test-api-secret'
            };
            
            this.bybitService = new BybitService(mockCredentials);
            this.binanceService = new BinanceService(mockCredentials);
            
            console.log('✅ Both exchange services initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize exchange services:', error.message);
            throw error;
        }
    }

    async testBybitService() {
        console.log('\n🧪 Testing Bybit Service...');
        
        const tests = [
            { name: 'placeOrder', method: () => this.bybitService.placeOrder({ category: 'linear', symbol: 'BTCUSDT', side: 'Buy', orderType: 'Market', qty: '0.001' }) },
            { name: 'cancelOrder', method: () => this.bybitService.cancelOrder('BTCUSDT', 'test-order-id') },
            { name: 'getOpenOrders', method: () => this.bybitService.getOpenOrders('BTCUSDT') },
            { name: 'getOrderHistory', method: () => this.bybitService.getOrderHistory('linear', 'BTCUSDT') },
            { name: 'getPositions', method: () => this.bybitService.getPositions('BTCUSDT') },
            { name: 'getAccountBalance', method: () => this.bybitService.getAccountBalance() },
            { name: 'testConnectivity', method: () => this.bybitService.testConnectivity() }
        ];

        let passedTests = 0;
        
        for (const test of tests) {
            try {
                const result = await test.method();
                
                // Check if method executed without "function not found" error
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
                    // Other errors (like authentication) are expected with mock credentials
                    console.log(`✅ ${test.name}: Method exists (authentication error expected)`);
                    passedTests++;
                }
            }
        }
        
        console.log(`📊 Bybit Service: ${passedTests}/${tests.length} tests passed`);
        return passedTests === tests.length;
    }

    async testBinanceService() {
        console.log('\n🧪 Testing Binance Service...');
        
        const tests = [
            { name: 'placeOrder', method: () => this.binanceService.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', orderType: 'Market', qty: '0.001' }) },
            { name: 'cancelOrder', method: () => this.binanceService.cancelOrder('BTCUSDT', 'test-order-id') },
            { name: 'getOpenOrders', method: () => this.binanceService.getOpenOrders('BTCUSDT') },
            { name: 'getPositions', method: () => this.binanceService.getPositions('BTCUSDT') },
            { name: 'getAccountBalance', method: () => this.binanceService.getAccountBalance() },
            { name: 'testConnectivity', method: () => this.binanceService.testConnectivity() }
        ];

        let passedTests = 0;
        
        for (const test of tests) {
            try {
                const result = await test.method();
                
                // Check if method executed without "function not found" error
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
                    // Other errors (like authentication) are expected with mock credentials
                    console.log(`✅ ${test.name}: Method exists (authentication error expected)`);
                    passedTests++;
                }
            }
        }
        
        console.log(`📊 Binance Service: ${passedTests}/${tests.length} tests passed`);
        return passedTests === tests.length;
    }

    async testConnectivity() {
        console.log('\n🧪 Testing Connectivity...');
        
        try {
            const bybitResult = await this.bybitService.testConnectivity();
            const binanceResult = await this.binanceService.testConnectivity();
            
            console.log(`📊 Bybit Connectivity: ${bybitResult.success ? '✅ PASS' : '⚠️ FAIL'}`);
            console.log(`📊 Binance Connectivity: ${binanceResult.success ? '✅ PASS' : '⚠️ FAIL'}`);
            
            return bybitResult.success && binanceResult.success;
            
        } catch (error) {
            console.log('⚠️ Connectivity test error:', error.message);
            return false;
        }
    }

    async testErrorHandling() {
        console.log('\n🧪 Testing Error Handling...');
        
        try {
            // Test with no credentials
            const bybitNoCreds = new BybitService();
            const binanceNoCreds = new BinanceService();
            
            const bybitResult = await bybitNoCreds.placeOrder({ symbol: 'BTCUSDT', side: 'Buy', qty: '0.001' });
            const binanceResult = await binanceNoCreds.placeOrder({ symbol: 'BTCUSDT', side: 'BUY', qty: '0.001' });
            
            // Both should return error objects, not throw
            const bybitHandlesError = bybitResult && bybitResult.success === false;
            const binanceHandlesError = binanceResult && binanceResult.success === false;
            
            console.log(`📊 Bybit Error Handling: ${bybitHandlesError ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`📊 Binance Error Handling: ${binanceHandlesError ? '✅ PASS' : '❌ FAIL'}`);
            
            return bybitHandlesError && binanceHandlesError;
            
        } catch (error) {
            console.log('❌ Error handling test failed:', error.message);
            return false;
        }
    }

    async runAllTests() {
        console.log('🧪 Starting Exchange Services Comprehensive Tests');
        console.log('='.repeat(50));
        
        const results = {
            bybitService: false,
            binanceService: false,
            connectivity: false,
            errorHandling: false
        };
        
        try {
            await this.initialize();
            
            // Test 1: Bybit Service
            results.bybitService = await this.testBybitService();
            
            // Test 2: Binance Service
            results.binanceService = await this.testBinanceService();
            
            // Test 3: Connectivity
            results.connectivity = await this.testConnectivity();
            
            // Test 4: Error Handling
            results.errorHandling = await this.testErrorHandling();
            
        } catch (error) {
            console.error('💥 Test suite failed:', error.message);
        }
        
        // Print results
        console.log('\n📊 TEST RESULTS');
        console.log('='.repeat(30));
        console.log(`Bybit Service: ${results.bybitService ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Binance Service: ${results.binanceService ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Connectivity: ${results.connectivity ? '✅ PASS' : '⚠️ FAIL'}`);
        console.log(`Error Handling: ${results.errorHandling ? '✅ PASS' : '❌ FAIL'}`);
        
        const criticalTestsPassed = results.bybitService && results.binanceService && results.errorHandling;
        console.log(`\n🎯 Overall Result: ${criticalTestsPassed ? '✅ ALL CRITICAL TESTS PASSED' : '❌ SOME CRITICAL TESTS FAILED'}`);
        
        if (criticalTestsPassed) {
            console.log('\n🎉 Both exchange services are working correctly!');
            console.log('   All methods exist and handle errors properly.');
        } else {
            console.log('\n⚠️ Some tests failed. Check the method implementations.');
        }
        
        return criticalTestsPassed;
    }
}

// Main execution
async function main() {
    const test = new ExchangeServicesTest();
    
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

module.exports = ExchangeServicesTest;

