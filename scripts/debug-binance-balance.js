#!/usr/bin/env node

/**
 * 🔍 DEBUG BINANCE BALANCE FETCH
 * Detailed diagnostics for Binance API errors
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

async function debugBinanceBalance() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(' 🔍 BINANCE API DEBUG');
    console.log('═══════════════════════════════════════════════════════════\n');

    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'marketbot',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
    });

    try {
        // Step 1: Get admin user's Binance API keys
        console.log('Step 1: Fetching Binance API keys from database...');
        const result = await pool.query(`
            SELECT 
                uak.exchange,
                uak.api_key,
                uak.api_secret,
                uak.environment,
                uak.is_active,
                uak.enabled,
                uak.verified,
                u.email
            FROM user_api_keys uak
            INNER JOIN users u ON u.id = uak.user_id
            WHERE u.email = 'admin@coinbitclub.com'
            AND uak.exchange = 'binance'
            AND uak.is_active = TRUE
        `);

        if (result.rows.length === 0) {
            console.log('❌ No Binance API keys found for admin user\n');
            return;
        }

        const keyData = result.rows[0];
        console.log('✅ Found Binance API key:');
        console.log(`   Email: ${keyData.email}`);
        console.log(`   API Key: ${keyData.api_key.substring(0, 10)}...`);
        console.log(`   Secret Length: ${keyData.api_secret.length} chars (encrypted: ${keyData.api_secret.length > 100})`);
        console.log(`   Environment: ${keyData.environment}`);
        console.log(`   Active: ${keyData.is_active}`);
        console.log(`   Enabled: ${keyData.enabled}`);
        console.log(`   Verified: ${keyData.verified}\n`);

        // Step 2: Decrypt the API secret
        console.log('Step 2: Decrypting API secret...');
        const apiKeyEncryption = require('../src/services/security/api-key-encryption');
        const decryptedSecret = apiKeyEncryption.decrypt(keyData.api_secret);
        
        if (!decryptedSecret) {
            console.log('❌ Failed to decrypt API secret\n');
            return;
        }
        console.log(`✅ Secret decrypted: ${decryptedSecret.length} chars\n`);

        // Step 3: Check time synchronization
        console.log('Step 3: Checking time synchronization...');
        const axios = require('axios');
        
        try {
            const timeResponse = await axios.get('https://api.binance.com/api/v3/time');
            const serverTime = timeResponse.data.serverTime;
            const localTime = Date.now();
            const timeDiff = Math.abs(serverTime - localTime);
            
            console.log(`   Binance Server Time: ${serverTime}`);
            console.log(`   Local System Time: ${localTime}`);
            console.log(`   Time Difference: ${timeDiff}ms`);
            
            if (timeDiff > 5000) {
                console.log(`   ⚠️  WARNING: Time difference > 5 seconds! This will cause signature errors.\n`);
            } else {
                console.log(`   ✅ Time sync OK (< 5 seconds)\n`);
            }
        } catch (error) {
            console.log(`   ❌ Failed to check Binance time: ${error.message}\n`);
        }

        // Step 4: Test Binance API directly
        console.log('Step 4: Testing Binance API connection...');
        const BinanceService = require('../src/services/exchange/binance-service');
        
        const isTestnet = keyData.environment === 'testnet';
        console.log(`   Using ${isTestnet ? 'TESTNET' : 'MAINNET'} endpoint\n`);
        
        const service = new BinanceService({
            apiKey: keyData.api_key,
            apiSecret: decryptedSecret,
            isTestnet: isTestnet
        });

        console.log('Step 5: Fetching account info...');
        try {
            const balance = await service.getAccountInfo();
            
            if (balance && balance.success) {
                console.log('✅ SUCCESS! Binance API responded\n');
                console.log('Account Info:');
                console.log(`   Maker Commission: ${balance.result.makerCommission}`);
                console.log(`   Taker Commission: ${balance.result.takerCommission}`);
                console.log(`   Can Trade: ${balance.result.canTrade}`);
                console.log(`   Can Withdraw: ${balance.result.canWithdraw}`);
                console.log(`   Can Deposit: ${balance.result.canDeposit}`);
                
                const balances = balance.result.balances || [];
                const nonZeroBalances = balances.filter(b => 
                    parseFloat(b.free || 0) > 0 || parseFloat(b.locked || 0) > 0
                );
                
                console.log(`\n   Total Assets: ${balances.length}`);
                console.log(`   Non-Zero Balances: ${nonZeroBalances.length}\n`);
                
                if (nonZeroBalances.length > 0) {
                    console.log('   Balances:');
                    nonZeroBalances.forEach(b => {
                        const total = parseFloat(b.free || 0) + parseFloat(b.locked || 0);
                        console.log(`     ${b.asset}: ${total.toFixed(8)} (free: ${b.free}, locked: ${b.locked})`);
                    });
                } else {
                    console.log('   ⚠️  No balances found (account is empty)');
                }
            } else {
                console.log('❌ API call succeeded but returned unexpected format');
                console.log('Response:', JSON.stringify(balance, null, 2));
            }
        } catch (error) {
            console.log('\n❌ BINANCE API ERROR:\n');
            console.log(`Error Type: ${error.constructor.name}`);
            console.log(`Message: ${error.message}`);
            
            if (error.response) {
                console.log(`Status: ${error.response.status}`);
                console.log(`Response:`, JSON.stringify(error.response.data, null, 2));
            }
            
            console.log('\n═══════════════════════════════════════════════════════════');
            console.log(' 💡 DIAGNOSIS');
            console.log('═══════════════════════════════════════════════════════════\n');
            
            if (error.message.includes('400')) {
                console.log('Error 400 - Bad Request. Common causes:');
                console.log('  1. Time synchronization issue (check time diff above)');
                console.log('  2. Invalid API signature');
                console.log('  3. Testnet keys used on mainnet (or vice versa)');
                console.log('  4. API key format incorrect');
                console.log('\nRecommended fix:');
                console.log('  • Sync system time: Settings > Time & Language > Sync now');
                console.log('  • Verify environment matches your keys (testnet/mainnet)');
                console.log('  • Regenerate API keys if needed');
            } else if (error.message.includes('401')) {
                console.log('Error 401 - Unauthorized. Issues:');
                console.log('  1. Invalid API key or secret');
                console.log('  2. API key disabled on Binance');
                console.log('  3. IP restrictions on API key');
            } else if (error.message.includes('403')) {
                console.log('Error 403 - Forbidden. Issues:');
                console.log('  1. API key lacks necessary permissions');
                console.log('  2. Account restricted');
            }
        }

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
}

debugBinanceBalance();

