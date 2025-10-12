#!/usr/bin/env node

/**
 * 🧪 TEST EXCHANGE BALANCE API
 * 
 * This script tests the backend /api/user/settings/all-balances endpoint
 * to ensure it correctly fetches and returns Binance and Bybit balances.
 */

const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const ADMIN_EMAIL = 'admin@coinbitclub.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function testBalanceAPI() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(' 🧪 TESTING EXCHANGE BALANCE API');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    try {
        // Step 1: Login to get access token
        console.log('🔐 Step 1: Logging in...');
        const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
        
        if (!loginResponse.data.success) {
            console.error('❌ Login failed:', loginResponse.data.error);
            return;
        }

        // Get token from response (check multiple possible locations)
        const accessToken = loginResponse.data.access_token || 
                           loginResponse.data.accessToken || 
                           loginResponse.data.token;
        
        if (!accessToken) {
            console.error('❌ No access token in login response');
            console.error('Response data:', loginResponse.data);
            return;
        }
        
        console.log('✅ Login successful');
        console.log(`   Token: ${accessToken.substring(0, 30)}...\n`);

        // Step 2: Fetch all exchange balances
        console.log('📊 Step 2: Fetching exchange balances...');
        console.log(`   URL: ${API_BASE_URL}/api/user-settings/all-balances`);
        console.log(`   Auth: Bearer ${accessToken.substring(0, 30)}...`);
        
        const balanceResponse = await axios.get(
            `${API_BASE_URL}/api/user-settings/all-balances`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        console.log('✅ Balance API responded successfully\n');

        // Step 3: Display results
        console.log('═══════════════════════════════════════════════════════════');
        console.log(' 📈 BALANCE RESULTS');
        console.log('═══════════════════════════════════════════════════════════\n');

        const data = balanceResponse.data.data;

        if (!data.has_keys) {
            console.log('⚠️  No API keys configured');
            return;
        }

        // Binance Balance
        console.log('💰 BINANCE:');
        if (data.binance) {
            if (data.binance.error) {
                console.log(`   ❌ Error: ${data.binance.error}`);
            } else {
                console.log(`   ✅ Total Equity: $${data.binance.total_equity.toFixed(2)}`);
                console.log(`   ✅ Available: $${data.binance.available_balance.toFixed(2)}`);
                console.log(`   ✅ In Orders: $${data.binance.in_orders.toFixed(2)}`);
                console.log(`   ✅ Environment: ${data.binance.environment}`);
                console.log(`   ✅ Coins: ${data.binance.coins.length}`);
                if (data.binance.coins.length > 0) {
                    console.log('   Top coins:');
                    data.binance.coins.slice(0, 5).forEach(coin => {
                        console.log(`     • ${coin.coin}: ${coin.wallet_balance.toFixed(8)}`);
                    });
                }
            }
        } else {
            console.log('   ⚠️  No Binance API key configured');
        }

        console.log();

        // Bybit Balance
        console.log('💰 BYBIT:');
        if (data.bybit) {
            if (data.bybit.error) {
                console.log(`   ❌ Error: ${data.bybit.error}`);
            } else {
                console.log(`   ✅ Total Equity: $${data.bybit.total_equity.toFixed(2)}`);
                console.log(`   ✅ Available: $${data.bybit.available_balance.toFixed(2)}`);
                console.log(`   ✅ Wallet Balance: $${data.bybit.wallet_balance.toFixed(2)}`);
                console.log(`   ✅ In Orders: $${data.bybit.in_orders.toFixed(2)}`);
                console.log(`   ✅ Environment: ${data.bybit.environment}`);
                console.log(`   ✅ Coins: ${data.bybit.coins.length}`);
                if (data.bybit.coins.length > 0) {
                    console.log('   Top coins:');
                    data.bybit.coins.slice(0, 5).forEach(coin => {
                        console.log(`     • ${coin.coin}: ${coin.wallet_balance.toFixed(8)}`);
                    });
                }
            }
        } else {
            console.log('   ⚠️  No Bybit API key configured');
        }

        console.log();
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`🎯 TOTAL BALANCE: $${data.total_usd.toFixed(2)}`);
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log('✅ TEST COMPLETED SUCCESSFULLY!\n');

    } catch (error) {
        console.error('\n❌ TEST FAILED\n');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Error:`, error.response.data);
        } else {
            console.error(`Error: ${error.message}`);
        }
        process.exit(1);
    }
}

// Run the test
testBalanceAPI();

