/**
 * 🔍 API PERMISSIONS DIAGNOSTIC TOOL
 * Comprehensive diagnostic to identify API key permission issues
 * 
 * This tool will:
 * 1. Test system clock synchronization
 * 2. Test API key validity
 * 3. Test different account types
 * 4. Provide actionable recommendations
 */

require('dotenv').config();
const BinanceService = require('../../src/services/exchange/binance-service');
const BybitService = require('../../src/services/exchange/bybit-service');

class APIPermissionsDiagnostic {
    constructor() {
        this.results = {
            systemCheck: {},
            binance: {},
            bybit: {}
        };
    }

    // ============================================
    // SYSTEM DIAGNOSTICS
    // ============================================

    async checkSystemClock() {
        console.log('\n🕐 SYSTEM CLOCK CHECK');
        console.log('==========================================');
        
        const localTime = Date.now();
        console.log(`Local Time: ${new Date(localTime).toISOString()}`);
        
        try {
            // Check against Binance server time
            const binance = new BinanceService({ 
                apiKey: 'dummy', 
                apiSecret: 'dummy' 
            });
            const serverTime = await binance.getServerTime();
            const diff = Math.abs(localTime - serverTime.serverTime);
            
            console.log(`Binance Server Time: ${new Date(serverTime.serverTime).toISOString()}`);
            console.log(`Time Difference: ${diff}ms`);
            
            if (diff > 5000) {
                console.log('⚠️  WARNING: Time difference > 5 seconds');
                console.log('   This may cause recvWindow errors');
                console.log('   Recommended: Sync your system clock\n');
                console.log('   Windows: w32tm /resync');
                console.log('   Linux/Mac: sudo ntpdate -s time.nist.gov\n');
                this.results.systemCheck.clockSync = 'WARNING';
            } else {
                console.log('✅ System clock is synchronized\n');
                this.results.systemCheck.clockSync = 'OK';
            }
        } catch (error) {
            console.log(`⚠️  Could not check server time: ${error.message}\n`);
            this.results.systemCheck.clockSync = 'UNKNOWN';
        }
    }

    // ============================================
    // BINANCE DIAGNOSTICS
    // ============================================

    async diagnoseBinance() {
        console.log('\n🔥 BINANCE API DIAGNOSTICS');
        console.log('==========================================');
        
        const apiKey = process.env.BINANCE_API_KEY;
        const apiSecret = process.env.BINANCE_API_SECRET;
        
        if (!apiKey || !apiSecret) {
            console.log('❌ SKIPPED: API credentials not configured\n');
            return;
        }

        console.log(`API Key: ${apiKey.substring(0, 8)}...`);
        console.log(`Environment: ${process.env.BINANCE_TESTNET === 'true' ? 'TESTNET' : 'MAINNET'}\n`);

        const binance = new BinanceService({ apiKey, apiSecret });
        
        // Test 1: Public Endpoint (no auth required)
        console.log('1️⃣ Testing public endpoint (no auth)...');
        try {
            const price = await binance.getSymbolPrice('BTCUSDT');
            if (price.success) {
                console.log(`✅ Public API works - BTC: $${price.price.toLocaleString()}`);
                this.results.binance.publicAPI = 'OK';
            }
        } catch (error) {
            console.log(`❌ Public API failed: ${error.message}`);
            this.results.binance.publicAPI = 'FAILED';
        }

        // Test 2: Connectivity with Auth
        console.log('\n2️⃣ Testing authenticated connectivity...');
        try {
            const connectivity = await binance.testConnectivity();
            if (connectivity.success) {
                console.log('✅ Authenticated connectivity works');
                this.results.binance.connectivity = 'OK';
            }
        } catch (error) {
            console.log(`❌ Connectivity failed: ${error.message}`);
            this.results.binance.connectivity = 'FAILED';
        }

        // Test 3: Futures Account
        console.log('\n3️⃣ Testing Futures account access...');
        try {
            const account = await binance.binance.futuresAccountInfo();
            console.log('✅ Futures account accessible');
            console.log(`   Assets: ${account.assets?.length || 0}`);
            this.results.binance.futuresAccess = 'OK';
        } catch (error) {
            console.log(`❌ Futures account not accessible`);
            console.log(`   Error: ${error.message}`);
            this.results.binance.futuresAccess = 'DENIED';
            
            if (error.message.includes('Invalid API-key')) {
                console.log('\n   📋 Possible reasons:');
                console.log('      • Futures trading not enabled on account');
                console.log('      • API key missing "Enable Futures" permission');
                console.log('      • IP restriction (current IP not whitelisted)');
            }
        }

        // Test 4: Spot Account
        console.log('\n4️⃣ Testing Spot account access...');
        try {
            const account = await binance.binance.accountInfo();
            console.log('✅ Spot account accessible');
            console.log(`   Balances: ${account.balances?.length || 0}`);
            this.results.binance.spotAccess = 'OK';
        } catch (error) {
            console.log(`❌ Spot account not accessible`);
            console.log(`   Error: ${error.message}`);
            this.results.binance.spotAccess = 'DENIED';
            
            if (error.message.includes('recvWindow')) {
                console.log('\n   📋 Timestamp issue detected:');
                console.log('      • Run clock sync command (see above)');
                console.log('      • Ensure system timezone is correct');
            } else if (error.message.includes('Invalid API-key')) {
                console.log('\n   📋 Possible reasons:');
                console.log('      • API key missing "Enable Reading" permission');
                console.log('      • IP restriction (current IP not whitelisted)');
                console.log('      • API key expired or revoked');
            }
        }

        // Test 5: Trading Permissions
        console.log('\n5️⃣ Testing trading permissions...');
        try {
            // Try to get open orders (requires trading permission)
            await binance.getOpenOrders('BTCUSDT');
            console.log('✅ Trading permissions enabled');
            this.results.binance.trading = 'OK';
        } catch (error) {
            console.log(`❌ Trading permissions issue: ${error.message}`);
            this.results.binance.trading = 'LIMITED';
        }
    }

    // ============================================
    // BYBIT DIAGNOSTICS
    // ============================================

    async diagnoseBybit() {
        console.log('\n\n🔥 BYBIT API DIAGNOSTICS');
        console.log('==========================================');
        
        const apiKey = process.env.BYBIT_API_KEY;
        const apiSecret = process.env.BYBIT_API_SECRET;
        
        if (!apiKey || !apiSecret) {
            console.log('❌ SKIPPED: API credentials not configured\n');
            return;
        }

        console.log(`API Key: ${apiKey.substring(0, 8)}...`);
        console.log(`Environment: ${process.env.BYBIT_TESTNET === 'true' ? 'TESTNET' : 'MAINNET'}\n`);

        const bybit = new BybitService({ apiKey, apiSecret });
        
        // Test 1: Public Endpoint
        console.log('1️⃣ Testing public endpoint (no auth)...');
        try {
            const price = await bybit.getSymbolPrice('BTCUSDT');
            if (price.success) {
                console.log(`✅ Public API works - BTC: $${price.price.toLocaleString()}`);
                this.results.bybit.publicAPI = 'OK';
            }
        } catch (error) {
            console.log(`❌ Public API failed: ${error.message}`);
            this.results.bybit.publicAPI = 'FAILED';
        }

        // Test 2: Connectivity
        console.log('\n2️⃣ Testing authenticated connectivity...');
        try {
            const connectivity = await bybit.testConnectivity();
            if (connectivity.success) {
                console.log('✅ Authenticated connectivity works');
                this.results.bybit.connectivity = 'OK';
            }
        } catch (error) {
            console.log(`❌ Connectivity failed: ${error.message}`);
            this.results.bybit.connectivity = 'FAILED';
        }

        // Test 3: Account Type Detection
        console.log('\n3️⃣ Detecting account type...');
        const accountTypes = ['UNIFIED', 'CONTRACT', 'SPOT'];
        
        for (const accountType of accountTypes) {
            try {
                const data = await bybit.client.getWalletBalance({ accountType });
                const list = data.result?.list || [];
                
                if (data.retCode === 0 || data.ret_code === 0) {
                    console.log(`   ✅ ${accountType}: Accessible`);
                    if (list.length > 0) {
                        console.log(`      - Has wallet data: ${list[0].coin?.length || 0} coins`);
                        this.results.bybit[`${accountType.toLowerCase()}Account`] = 'OK';
                    } else {
                        console.log(`      - Empty account (no balances)`);
                        this.results.bybit[`${accountType.toLowerCase()}Account`] = 'EMPTY';
                    }
                } else {
                    console.log(`   ❌ ${accountType}: Not accessible (retCode: ${data.retCode})`);
                    this.results.bybit[`${accountType.toLowerCase()}Account`] = 'DENIED';
                }
            } catch (error) {
                console.log(`   ❌ ${accountType}: Error - ${error.message}`);
                this.results.bybit[`${accountType.toLowerCase()}Account`] = 'ERROR';
            }
        }

        // Test 4: Trading Permissions
        console.log('\n4️⃣ Testing trading permissions...');
        try {
            await bybit.getOpenOrders('BTCUSDT', 'spot');
            console.log('✅ Trading permissions enabled');
            this.results.bybit.trading = 'OK';
        } catch (error) {
            console.log(`❌ Trading permissions issue: ${error.message}`);
            this.results.bybit.trading = 'LIMITED';
        }
    }

    // ============================================
    // RECOMMENDATIONS
    // ============================================

    printRecommendations() {
        console.log('\n\n');
        console.log('========================================');
        console.log('📋 RECOMMENDATIONS');
        console.log('========================================\n');

        // System recommendations
        if (this.results.systemCheck.clockSync === 'WARNING') {
            console.log('⚠️  CRITICAL: System clock not synchronized');
            console.log('   Action: Run clock sync command before using APIs\n');
        }

        // Binance recommendations
        if (this.results.binance.spotAccess === 'DENIED' && this.results.binance.futuresAccess === 'DENIED') {
            console.log('⚠️  CRITICAL: Cannot access any Binance account type');
            console.log('   Actions:');
            console.log('   1. Check API key permissions at binance.com/my/settings/api-management');
            console.log('   2. Ensure "Enable Reading" is checked');
            console.log('   3. If IP restriction enabled, add your current IP');
            console.log('   4. Verify API key is not expired\n');
        } else if (this.results.binance.futuresAccess === 'DENIED') {
            console.log('ℹ️  INFO: Futures access denied (Spot works)');
            console.log('   This is normal if you only use Spot trading');
            console.log('   To enable: Activate Futures trading on Binance + enable in API settings\n');
        }

        // Bybit recommendations
        const bybitAccounts = [
            this.results.bybit.unifiedAccount,
            this.results.bybit.contractAccount,
            this.results.bybit.spotAccount
        ];
        
        if (bybitAccounts.every(status => status === 'DENIED' || status === 'ERROR')) {
            console.log('⚠️  CRITICAL: Cannot access any Bybit account type');
            console.log('   Actions:');
            console.log('   1. Check API key permissions at bybit.com/app/user/api-management');
            console.log('   2. Ensure "Read-Write" permissions are enabled');
            console.log('   3. Check if IP restriction is enabled');
            console.log('   4. Verify API key type matches your account type\n');
        }

        // Success cases
        if (this.results.binance.spotAccess === 'OK' || this.results.binance.futuresAccess === 'OK') {
            console.log('✅ Binance API is working correctly');
        }

        if (bybitAccounts.some(status => status === 'OK' || status === 'EMPTY')) {
            console.log('✅ Bybit API is working correctly');
        }

        console.log('\n========================================\n');
    }

    // ============================================
    // MAIN
    // ============================================

    async run() {
        console.log('\n');
        console.log('╔════════════════════════════════════════╗');
        console.log('║  API PERMISSIONS DIAGNOSTIC TOOL      ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('\n');

        await this.checkSystemClock();
        await this.diagnoseBinance();
        await this.diagnoseBybit();
        this.printRecommendations();

        console.log('Diagnostic complete!\n');
    }
}

// ============================================
// RUN
// ============================================

async function main() {
    const diagnostic = new APIPermissionsDiagnostic();
    await diagnostic.run();
    process.exit(0);
}

if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = APIPermissionsDiagnostic;

