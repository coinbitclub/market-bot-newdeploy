/**
 * BINANCE API DIAGNOSTIC TOOL
 * Helps identify and fix Binance API authentication issues
 */

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

class BinanceDiagnostic {
    constructor() {
        this.testnetURL = 'https://testnet.binance.vision';
        this.mainnetURL = 'https://api.binance.com';
        
        // Check environment variables
        this.apiKey = process.env.BINANCE_API_KEY;
        this.apiSecret = process.env.BINANCE_API_SECRET;
        this.isTestnet = process.env.BINANCE_TESTNET === 'true';
        this.baseURL = this.isTestnet ? this.testnetURL : this.mainnetURL;
    }

    log(icon, message, data = null) {
        console.log(`${icon} ${message}`);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    async test1_CheckEnvironmentVariables() {
        console.log('\n========================================');
        console.log('TEST 1: Environment Variables');
        console.log('========================================');
        
        if (!this.apiKey || !this.apiSecret) {
            this.log('❌', 'PROBLEM: API credentials not found in environment variables');
            console.log('\nSOLUTION:');
            console.log('1. Create a .env file in the market-bot-newdeploy directory');
            console.log('2. Add the following variables:');
            console.log('   BINANCE_API_KEY=your_key_here');
            console.log('   BINANCE_API_SECRET=your_secret_here');
            console.log('   BINANCE_TESTNET=true  (or false for production)');
            return false;
        }

        this.log('✓', 'API Key found:', this.apiKey.substring(0, 10) + '...');
        this.log('✓', 'API Secret found:', '***' + this.apiSecret.substring(this.apiSecret.length - 5));
        this.log('✓', 'Using:', this.isTestnet ? 'TESTNET' : 'PRODUCTION');
        this.log('✓', 'Base URL:', this.baseURL);
        return true;
    }

    async test2_CheckServerConnectivity() {
        console.log('\n========================================');
        console.log('TEST 2: Server Connectivity');
        console.log('========================================');
        
        try {
            const response = await axios.get(`${this.baseURL}/api/v3/ping`, { timeout: 5000 });
            this.log('✓', 'Successfully connected to Binance API');
            return true;
        } catch (error) {
            this.log('❌', 'PROBLEM: Cannot connect to Binance server');
            console.log('\nError:', error.message);
            console.log('\nSOLUTION:');
            console.log('1. Check your internet connection');
            console.log('2. Check if Binance is accessible in your region');
            console.log('3. Try using a VPN if Binance is blocked');
            return false;
        }
    }

    async test3_CheckServerTime() {
        console.log('\n========================================');
        console.log('TEST 3: Time Synchronization');
        console.log('========================================');
        
        try {
            const response = await axios.get(`${this.baseURL}/api/v3/time`, { timeout: 5000 });
            const serverTime = response.data.serverTime;
            const localTime = Date.now();
            const timeDiff = Math.abs(serverTime - localTime);
            
            console.log('Server time:', new Date(serverTime).toISOString());
            console.log('Local time: ', new Date(localTime).toISOString());
            console.log('Time difference:', timeDiff + 'ms');
            
            if (timeDiff > 5000) {
                this.log('⚠️', 'WARNING: Time difference is more than 5 seconds');
                console.log('\nSOLUTION:');
                console.log('1. Synchronize your system clock');
                console.log('2. On Windows: Settings > Time & Language > Sync now');
                console.log('3. Or increase recvWindow in the API request');
                return false;
            }
            
            this.log('✓', 'Time synchronization is good');
            return true;
        } catch (error) {
            this.log('❌', 'PROBLEM: Cannot fetch server time');
            console.log('Error:', error.message);
            return false;
        }
    }

    generateSignature(queryString) {
        return crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex');
    }

    async test4_CheckAPIKeyAuthentication() {
        console.log('\n========================================');
        console.log('TEST 4: API Key Authentication');
        console.log('========================================');
        
        try {
            const timestamp = Date.now();
            const queryString = `timestamp=${timestamp}&recvWindow=60000`;
            const signature = this.generateSignature(queryString);
            const url = `${this.baseURL}/api/v3/account?${queryString}&signature=${signature}`;
            
            const response = await axios({
                method: 'GET',
                url,
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            this.log('✓', 'API Key authentication successful!');
            console.log('\nAccount Info:');
            console.log('- Can Trade:', response.data.canTrade);
            console.log('- Can Withdraw:', response.data.canWithdraw);
            console.log('- Can Deposit:', response.data.canDeposit);
            console.log('- Account Type:', response.data.accountType);
            console.log('- Permissions:', response.data.permissions.join(', '));
            
            const balancesWithFunds = response.data.balances.filter(b => 
                parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
            );
            console.log('\nBalances with funds:', balancesWithFunds.length);
            balancesWithFunds.slice(0, 5).forEach(balance => {
                console.log(`- ${balance.asset}: ${balance.free} (free) + ${balance.locked} (locked)`);
            });
            
            return true;
        } catch (error) {
            this.log('❌', 'PROBLEM: API Key authentication failed');
            
            if (error.response) {
                const errorData = error.response.data;
                console.log('\nError Code:', errorData.code);
                console.log('Error Message:', errorData.msg);
                
                if (errorData.code === -2015) {
                    console.log('\n=== DIAGNOSIS: Invalid API Key ===');
                    console.log('\nMost Common Causes:');
                    console.log('1. Using PRODUCTION keys on TESTNET (or vice versa)');
                    console.log('   - Testnet keys: https://testnet.binance.vision/');
                    console.log('   - Production keys: https://www.binance.com/');
                    console.log('\n2. IP Restrictions on your API key');
                    console.log('   - Check your API key settings');
                    console.log('   - Ensure "Unrestricted" or your IP is whitelisted');
                    console.log('\n3. Missing Permissions');
                    console.log('   - Enable "Enable Reading" permission');
                    console.log('   - Enable "Enable Spot & Margin Trading" if needed');
                    console.log('\n4. API Key Disabled or Deleted');
                    console.log('   - Verify the key exists in your account');
                    console.log('\n5. Wrong API Key/Secret Combination');
                    console.log('   - Double-check you copied both correctly');
                    
                    console.log('\n=== RECOMMENDED SOLUTION ===');
                    if (this.isTestnet) {
                        console.log('You are using TESTNET mode.');
                        console.log('1. Visit: https://testnet.binance.vision/');
                        console.log('2. Click "Generate HMAC_SHA256 Key"');
                        console.log('3. Copy the API Key and Secret Key');
                        console.log('4. Update your .env file with these keys');
                        console.log('5. Ensure BINANCE_TESTNET=true in .env');
                    } else {
                        console.log('You are using PRODUCTION mode.');
                        console.log('1. Visit: https://www.binance.com/en/my/settings/api-management');
                        console.log('2. Create a new API key or check existing one');
                        console.log('3. Enable required permissions');
                        console.log('4. Set IP restrictions (or Unrestricted for testing)');
                        console.log('5. Update your .env file with these keys');
                        console.log('6. Ensure BINANCE_TESTNET=false in .env');
                    }
                } else if (errorData.code === -1021) {
                    console.log('\n=== DIAGNOSIS: Timestamp Error ===');
                    console.log('Your system clock is out of sync with Binance servers');
                    console.log('\nSOLUTION:');
                    console.log('1. Sync your system clock');
                    console.log('2. On Windows: Settings > Time & Language > Sync now');
                }
            } else {
                console.log('\nError:', error.message);
            }
            
            return false;
        }
    }

    async test5_GetMyIP() {
        console.log('\n========================================');
        console.log('TEST 5: Your Current IP Address');
        console.log('========================================');
        
        try {
            const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
            this.log('✓', 'Your public IP address:', response.data.ip);
            console.log('\nIf your Binance API key has IP restrictions,');
            console.log('make sure this IP is whitelisted.');
            return true;
        } catch (error) {
            this.log('⚠️', 'Could not detect your IP address');
            return false;
        }
    }

    async runAllTests() {
        console.log('╔═══════════════════════════════════════════════════════╗');
        console.log('║     BINANCE API DIAGNOSTIC TOOL                       ║');
        console.log('╚═══════════════════════════════════════════════════════╝');
        
        const results = {
            test1: await this.test1_CheckEnvironmentVariables(),
            test2: await this.test2_CheckServerConnectivity(),
            test3: await this.test3_CheckServerTime(),
            test5: await this.test5_GetMyIP(),
            test4: await this.test4_CheckAPIKeyAuthentication()
        };
        
        console.log('\n========================================');
        console.log('SUMMARY');
        console.log('========================================');
        console.log('Environment Variables:', results.test1 ? '✓ PASS' : '❌ FAIL');
        console.log('Server Connectivity:  ', results.test2 ? '✓ PASS' : '❌ FAIL');
        console.log('Time Synchronization: ', results.test3 ? '✓ PASS' : '⚠️ WARNING');
        console.log('Your IP Detection:    ', results.test5 ? '✓ PASS' : '⚠️ SKIPPED');
        console.log('API Authentication:   ', results.test4 ? '✓ PASS' : '❌ FAIL');
        
        if (results.test4) {
            console.log('\n✓ All tests passed! Your Binance API is configured correctly.');
        } else {
            console.log('\n❌ Some tests failed. Please follow the solutions above.');
        }
        
        console.log('\n========================================\n');
    }
}

// Run diagnostics
const diagnostic = new BinanceDiagnostic();
diagnostic.runAllTests().catch(console.error);

