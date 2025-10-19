/**
 * QUICK BINANCE API TEST
 * Run this after updating your .env file to verify it works
 */

require('dotenv').config();
const BinanceService = require('../../src/services/exchange/binance-service');

async function quickTest() {
    console.log('========================================');
    console.log('QUICK BINANCE API TEST');
    console.log('========================================\n');
    
    // Check environment variables
    console.log('Configuration:');
    console.log('- API Key:', process.env.BINANCE_API_KEY ? 
        process.env.BINANCE_API_KEY.substring(0, 10) + '...' : 'NOT SET');
    console.log('- API Secret:', process.env.BINANCE_API_SECRET ? 
        '***' + process.env.BINANCE_API_SECRET.substring(process.env.BINANCE_API_SECRET.length - 5) : 'NOT SET');
    console.log('- Testnet:', process.env.BINANCE_TESTNET);
    console.log('');
    
    if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
        console.log('❌ ERROR: API credentials not found in .env file');
        console.log('\nPlease create/update market-bot-newdeploy/.env with:');
        console.log('BINANCE_API_KEY=your_key_here');
        console.log('BINANCE_API_SECRET=your_secret_here');
        console.log('BINANCE_TESTNET=true');
        process.exit(1);
    }
    
    try {
        // Create service
        const binance = new BinanceService();
        
        // Test 1: Public endpoint
        console.log('Test 1: Fetching BTC price (public endpoint)...');
        const priceData = await binance.getSymbolPrice('BTCUSDT');
        if (priceData.success) {
            console.log('✓ Success! BTC Price:', priceData.price.toFixed(2), 'USDT\n');
        } else {
            console.log('❌ Failed to fetch price\n');
        }
        
        // Test 2: Authenticated endpoint
        console.log('Test 2: Fetching account info (authenticated endpoint)...');
        const accountInfo = await binance.getAccountBalance();
        console.log('✓ Success! API Key authenticated correctly!');
        console.log('\nAccount Details:');
        console.log('- Can Trade:', accountInfo.canTrade);
        console.log('- Can Withdraw:', accountInfo.canWithdraw);
        console.log('- Can Deposit:', accountInfo.canDeposit);
        console.log('- Account Type:', accountInfo.accountType);
        console.log('- Permissions:', accountInfo.permissions.join(', '));
        console.log('- Balances with funds:', accountInfo.balances.length);
        
        if (accountInfo.balances.length > 0) {
            console.log('\nTop Balances:');
            accountInfo.balances.slice(0, 5).forEach(balance => {
                console.log(`  ${balance.asset}: ${balance.total.toFixed(8)}`);
            });
        }
        
        console.log('\n========================================');
        console.log('✓ ALL TESTS PASSED!');
        console.log('Your Binance API is configured correctly.');
        console.log('========================================\n');
        
    } catch (error) {
        console.log('\n========================================');
        console.log('❌ TEST FAILED');
        console.log('========================================');
        
        if (error.response?.data?.code === -2015) {
            console.log('\nERROR: Invalid API Key');
            console.log('\nThis means your API keys are incorrect or not valid for testnet.');
            console.log('\nFOLLOW THESE STEPS:');
            console.log('1. Visit: https://testnet.binance.vision/');
            console.log('2. Click "Generate HMAC_SHA256 Key"');
            console.log('3. Copy the API Key and Secret');
            console.log('4. Update your .env file with the new keys');
            console.log('5. Run this test again\n');
        } else {
            console.log('\nError:', error.message);
            console.log('\nRun full diagnostics for more details:');
            console.log('node scripts/testing/binance-api-diagnostic.js\n');
        }
        
        process.exit(1);
    }
}

quickTest();


