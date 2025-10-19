#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config({ path: '../.env' });

async function debugBinance() {
    console.log('===================================================');
    console.log(' BINANCE API DEBUG');
    console.log('===================================================\n');

    try {
        // Step 1: Check time sync
        console.log('Step 1: Checking time synchronization...');
        const timeResponse = await axios.get('https://api.binance.com/api/v3/time');
        const serverTime = timeResponse.data.serverTime;
        const localTime = Date.now();
        const timeDiff = Math.abs(serverTime - localTime);
        
        console.log('   Binance Server: ' + new Date(serverTime).toISOString());
        console.log('   Local System:   ' + new Date(localTime).toISOString());
        console.log('   Difference: ' + timeDiff + 'ms (' + (timeDiff/1000).toFixed(2) + 's)');
        
        if (timeDiff > 5000) {
            console.log('   ERROR: Time difference > 5 seconds!');
            console.log('   This WILL cause Binance API signature errors.\n');
            console.log('   FIX: Sync your system time:');
            console.log('   Windows: Settings > Time & Language > Sync now');
            console.log('   Or: w32tm /resync\n');
        } else {
            console.log('   OK: Time sync good\n');
        }

        // Step 2: Test public endpoint
        console.log('Step 2: Testing Binance public API...');
        await axios.get('https://api.binance.com/api/v3/ping');
        console.log('   OK: Binance API is reachable\n');

        // Step 3: Test with BinanceService
        console.log('Step 3: Testing BinanceService with database keys...\n');

        const dbPoolManager = require('../src/database/db-pool-manager');
        await dbPoolManager.initialize();

        const result = await dbPoolManager.executeRead(`
            SELECT 
                uak.api_key,
                uak.api_secret,
                uak.environment,
                u.email
            FROM user_api_keys uak
            INNER JOIN users u ON u.id = uak.user_id
            WHERE u.email = 'admin@coinbitclub.com'
            AND uak.exchange = 'binance'
            AND uak.is_active = TRUE
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            console.log('   ERROR: No Binance API keys found in database\n');
            return;
        }

        const keyData = result.rows[0];
        console.log('   Found keys for: ' + keyData.email);
        console.log('   API Key: ' + keyData.api_key.substring(0, 15) + '...');
        console.log('   Environment: ' + keyData.environment);
        console.log('   Secret encrypted: ' + (keyData.api_secret.length > 100 ? 'Yes' : 'No') + '\n');

        // Decrypt secret
        const apiKeyEncryption = require('../src/services/security/api-key-encryption');
        const decryptedSecret = apiKeyEncryption.decrypt(keyData.api_secret);
        
        if (!decryptedSecret) {
            console.log('   ERROR: Failed to decrypt API secret\n');
            return;
        }
        console.log('   OK: Secret decrypted (' + decryptedSecret.length + ' chars)\n');

        // Test BinanceService
        console.log('Step 4: Calling Binance API...');
        const BinanceService = require('../src/services/exchange/binance-service');
        const service = new BinanceService({
            apiKey: keyData.api_key,
            apiSecret: decryptedSecret,
            isTestnet: keyData.environment === 'testnet'
        });

        const balance = await service.getAccountBalance();
        
        if (balance && balance.success) {
            console.log('   SUCCESS! Binance API call worked!\n');
            
            const balances = balance.result.balances || [];
            const nonZero = balances.filter(b => 
                parseFloat(b.free || 0) > 0 || parseFloat(b.locked || 0) > 0
            );
            
            console.log('   Total assets: ' + balances.length);
            console.log('   Non-zero balances: ' + nonZero.length + '\n');
            
            if (nonZero.length > 0) {
                console.log('   Your balances:');
                nonZero.forEach(b => {
                    const total = parseFloat(b.free || 0) + parseFloat(b.locked || 0);
                    console.log('     ' + b.asset + ': ' + total.toFixed(8));
                });
            }
        } else {
            console.log('   WARNING: API returned unexpected format');
            console.log(JSON.stringify(balance, null, 2));
        }

        await dbPoolManager.close();

    } catch (error) {
        console.log('\nERROR:\n');
        console.log('   Type: ' + error.constructor.name);
        console.log('   Message: ' + error.message);
        
        if (error.response) {
            console.log('   HTTP Status: ' + error.response.status);
            console.log('   Response: ' + JSON.stringify(error.response.data, null, 2));
        }
        
        console.log('\n===================================================');
        console.log(' LIKELY CAUSE');
        console.log('===================================================\n');
        
        const msg = error.message.toLowerCase();
        if (msg.includes('400') || msg.includes('bad request')) {
            console.log('ERROR 400 - Bad Request\n');
            console.log('Most common cause: TIME SYNCHRONIZATION');
            console.log('  Your system time is not in sync with Binance servers.\n');
            console.log('Fix:');
            console.log('  1. Windows: Settings > Time & Language');
            console.log('  2. Click "Sync now"');
            console.log('  3. Or run: w32tm /resync\n');
            console.log('Other causes:');
            console.log('  - Testnet keys used on mainnet endpoint');
            console.log('  - Invalid API signature');
        } else if (msg.includes('401') || msg.includes('unauthorized')) {
            console.log('ERROR 401 - Unauthorized\n');
            console.log('Causes:');
            console.log('  - Invalid API key or secret');
            console.log('  - API key disabled on Binance');
            console.log('  - IP restrictions on API key\n');
        }
    }

    console.log('\n===================================================\n');
}

debugBinance();
