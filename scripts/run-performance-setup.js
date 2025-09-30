#!/usr/bin/env node

/**
 * 🚀 PERFORMANCE DATABASE SETUP RUNNER
 * Run this script to set up the performance database tables and test the integration
 */

const PerformanceDatabaseSetup = require('./setup-performance-database');

async function runSetup() {
    console.log('🚀 Starting performance database setup...');
    console.log('=====================================');
    
    try {
        const setup = new PerformanceDatabaseSetup();
        
        // Step 1: Setup database tables
        console.log('\n📊 Step 1: Setting up performance tables...');
        await setup.setupPerformanceTables();
        
        // Step 2: Verify setup
        console.log('\n🔍 Step 2: Verifying setup...');
        await setup.verifySetup();
        
        // Step 3: Close connections
        await setup.close();
        
        console.log('\n🎉 Performance database setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Start your backend server');
        console.log('2. Test the performance endpoints');
        console.log('3. Update your frontend to use real data');
        
    } catch (error) {
        console.error('\n💥 Setup failed:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('1. Check your database connection settings');
        console.error('2. Ensure PostgreSQL is running');
        console.error('3. Verify database credentials');
        console.error('4. Check if the database exists');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runSetup();
}

module.exports = runSetup;
