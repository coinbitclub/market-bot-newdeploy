#!/usr/bin/env node

/**
 * Test Bybit API directly to see what response we get
 */

require('dotenv').config({ path: '../.env' });

async function testBybit() {
    console.log('===================================================');
    console.log(' BYBIT API DIRECT TEST');
    console.log('===================================================\n');

    try {
        const dbPoolManager = require('../src/database/db-pool-manager');
        await dbPoolManager.initialize();

        // Get Bybit keys from database
        const result = await dbPoolManager.executeRead(`
            SELECT 
                uak.api_key,
                uak.api_secret,
                uak.environment,
                u.email
            FROM user_api_keys uak
            INNER JOIN users u ON u.id = uak.user_id
            WHERE u.email = 'admin@coinbitclub.com'
            AND uak.exchange = 'bybit'
            AND uak.is_active = TRUE
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            console.log('ERROR: No Bybit API keys found\n');
            return;
        }

        const keyData = result.rows[0];
        console.log('Found Bybit keys for:', keyData.email);
        console.log('API Key:', keyData.api_key.substring(0, 15) + '...');
        console.log('Environment:', keyData.environment);
        console.log('Secret encrypted:', keyData.api_secret.length > 100 ? 'Yes' : 'No');
        console.log();

        // Decrypt secret
        const apiKeyEncryption = require('../src/services/security/api-key-encryption');
        const decryptedSecret = apiKeyEncryption.decrypt(keyData.api_secret);
        
        if (!decryptedSecret) {
            console.log('ERROR: Failed to decrypt API secret\n');
            return;
        }
        console.log('Secret decrypted:', decryptedSecret.length, 'chars\n');

        // Test Bybit API
        console.log('Calling Bybit getWalletBalance(UNIFIED)...\n');
        const BybitService = require('../src/services/exchange/bybit-service');
        const service = new BybitService({
            apiKey: keyData.api_key,
            apiSecret: decryptedSecret,
            isTestnet: keyData.environment === 'testnet'
        });

        const balance = await service.getWalletBalance('UNIFIED');
        
        console.log('===================================================');
        console.log(' RAW BYBIT API RESPONSE');
        console.log('===================================================\n');
        console.log(JSON.stringify(balance, null, 2));
        console.log('\n===================================================');
        
        if (balance && balance.success) {
            console.log(' PARSED DATA');
            console.log('===================================================\n');
            
            const walletData = balance.result?.list?.[0] || {};
            console.log('Wallet Data:');
            console.log('  totalEquity:', walletData.totalEquity);
            console.log('  totalWalletBalance:', walletData.totalWalletBalance);
            console.log('  totalAvailableBalance:', walletData.totalAvailableBalance);
            console.log('  totalMarginBalance:', walletData.totalMarginBalance);
            console.log('  coin array length:', (walletData.coin || []).length);
            
            if (walletData.coin && walletData.coin.length > 0) {
                console.log('\n  Coins:');
                walletData.coin.forEach(c => {
                    if (parseFloat(c.walletBalance || 0) > 0) {
                        console.log('    ' + c.coin + ':', c.walletBalance);
                    }
                });
            }
        } else {
            console.log('WARNING: Unexpected response format');
        }

        await dbPoolManager.close();

    } catch (error) {
        console.log('\nERROR:');
        console.log('  Type:', error.constructor.name);
        console.log('  Message:', error.message);
        
        if (error.response) {
            console.log('  HTTP Status:', error.response.status);
            console.log('  Response:', JSON.stringify(error.response.data, null, 2));
        }
    }

    console.log('\n===================================================\n');
}

testBybit();


