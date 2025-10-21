#!/usr/bin/env node

/**
 * 🧪 TEST: Position Size Percentage Fix
 * ====================================
 * 
 * This script tests the getUserPositionSizePercentage method to ensure
 * it handles the missing column gracefully.
 */

const ConnectionPoolManager = require('../../src/database/connection-pool-manager');
const PersonalTradingEngine = require('../../src/trading/personal-api/personal-trading-engine');

class PositionSizePercentageTest {
    constructor() {
        this.dbPoolManager = null;
        this.tradingEngine = null;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing test environment...');
            
            // Initialize database connection
            this.dbPoolManager = new ConnectionPoolManager();
            await this.dbPoolManager.initialize();
            
            // Initialize trading engine
            this.tradingEngine = new PersonalTradingEngine(this.dbPoolManager);
            
            console.log('✅ Test environment initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize test environment:', error.message);
            throw error;
        }
    }

    async testGetUserPositionSizePercentage() {
        console.log('\n🧪 Testing getUserPositionSizePercentage method...');
        
        const testUserId = 1; // Test with user ID 1
        
        try {
            const result = await this.tradingEngine.getUserPositionSizePercentage(testUserId);
            
            console.log(`📊 Result for user ${testUserId}: ${result}%`);
            
            // Validate result
            if (typeof result === 'number' && result > 0 && result <= 100) {
                console.log('✅ Test PASSED: Method returned valid percentage');
                return true;
            } else {
                console.log('❌ Test FAILED: Method returned invalid percentage');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Test FAILED with error:', error.message);
            return false;
        }
    }

    async testWithMultipleUsers() {
        console.log('\n🧪 Testing with multiple user IDs...');
        
        const testUserIds = [1, 2, 999]; // Test with existing and non-existing users
        let passedTests = 0;
        
        for (const userId of testUserIds) {
            try {
                const result = await this.tradingEngine.getUserPositionSizePercentage(userId);
                console.log(`📊 User ${userId}: ${result}%`);
                
                if (typeof result === 'number' && result > 0 && result <= 100) {
                    passedTests++;
                }
                
            } catch (error) {
                console.error(`❌ Error testing user ${userId}:`, error.message);
            }
        }
        
        console.log(`📈 Passed ${passedTests}/${testUserIds.length} tests`);
        return passedTests === testUserIds.length;
    }

    async testDatabaseConnection() {
        console.log('\n🧪 Testing database connection...');
        
        try {
            const result = await this.dbPoolManager.executeRead('SELECT 1 as test');
            
            if (result && result.rows && result.rows.length > 0) {
                console.log('✅ Database connection test PASSED');
                return true;
            } else {
                console.log('❌ Database connection test FAILED: No data returned');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Database connection test FAILED:', error.message);
            return false;
        }
    }

    async checkUsersTableStructure() {
        console.log('\n🧪 Checking users table structure...');
        
        try {
            const result = await this.dbPoolManager.executeRead(`
                SELECT column_name, data_type, column_default
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = 'position_size_percentage'
            `);
            
            if (result.rows.length > 0) {
                console.log('✅ Column position_size_percentage EXISTS in users table');
                console.log('   Details:', result.rows[0]);
                return true;
            } else {
                console.log('⚠️ Column position_size_percentage NOT FOUND in users table');
                console.log('💡 Run migration: node scripts/database/add-position-size-percentage-column.js');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error checking table structure:', error.message);
            return false;
        }
    }

    async runAllTests() {
        console.log('🧪 Starting Position Size Percentage Fix Tests');
        console.log('='.repeat(50));
        
        const results = {
            databaseConnection: false,
            tableStructure: false,
            positionSizeMethod: false,
            multipleUsers: false
        };
        
        try {
            await this.initialize();
            
            // Test 1: Database connection
            results.databaseConnection = await this.testDatabaseConnection();
            
            // Test 2: Table structure
            results.tableStructure = await this.checkUsersTableStructure();
            
            // Test 3: Position size method
            results.positionSizeMethod = await this.testGetUserPositionSizePercentage();
            
            // Test 4: Multiple users
            results.multipleUsers = await this.testWithMultipleUsers();
            
        } catch (error) {
            console.error('💥 Test suite failed:', error.message);
        } finally {
            await this.cleanup();
        }
        
        // Print results
        console.log('\n📊 TEST RESULTS');
        console.log('='.repeat(30));
        console.log(`Database Connection: ${results.databaseConnection ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Table Structure: ${results.tableStructure ? '✅ PASS' : '⚠️ MISSING COLUMN'}`);
        console.log(`Position Size Method: ${results.positionSizeMethod ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Multiple Users: ${results.multipleUsers ? '✅ PASS' : '❌ FAIL'}`);
        
        const allPassed = Object.values(results).every(result => result === true);
        console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`);
        
        if (!results.tableStructure) {
            console.log('\n💡 RECOMMENDATION:');
            console.log('   Run the migration to add the missing column:');
            console.log('   node scripts/database/add-position-size-percentage-column.js');
        }
        
        return allPassed;
    }

    async cleanup() {
        if (this.dbPoolManager) {
            await this.dbPoolManager.close();
            console.log('🔌 Database connections closed');
        }
    }
}

// Main execution
async function main() {
    const test = new PositionSizePercentageTest();
    
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

module.exports = PositionSizePercentageTest;

