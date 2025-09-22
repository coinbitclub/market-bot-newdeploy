/**
 * 🌐 FRONTEND API INTEGRATION TEST
 * Simulates frontend API calls to test complete integration
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3333';
const FRONTEND_URL = 'http://localhost:3003';

class FrontendAPITester {
  constructor() {
    this.authToken = null;
    this.results = {
      login: {},
      profile: {},
      trading: {},
      settings: {},
      dashboard: {}
    };
  }

  async runFrontendTests() {
    console.log('🌐 STARTING FRONTEND API INTEGRATION TESTS');
    console.log('=' .repeat(60));

    try {
      // 1. Test Login Flow (Frontend -> Backend)
      await this.testLoginFlow();
      
      if (this.authToken) {
        // 2. Test Profile Management
        await this.testProfileManagement();
        
        // 3. Test Trading Operations
        await this.testTradingOperations();
        
        // 4. Test User Settings
        await this.testUserSettings();
        
        // 5. Test Dashboard Data
        await this.testDashboardData();
      }
      
      // 6. Generate Report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Frontend integration test failed:', error.message);
    }
  }

  async testLoginFlow() {
    console.log('\n🔐 Testing Frontend Login Flow...');
    
    try {
      // Simulate frontend login API call
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: 'admin@coinbitclub.com',
        password: 'admin123'
      });

      if (loginResponse.data.success && loginResponse.data.accessToken) {
        this.authToken = loginResponse.data.accessToken;
        this.results.login = {
          status: 'SUCCESS',
          user: loginResponse.data.user,
          hasToken: true,
          tokenLength: this.authToken.length
        };
        console.log('✅ Frontend login successful');
        console.log(`   User: ${loginResponse.data.user.email}`);
        console.log(`   Role: ${loginResponse.data.user.user_type}`);
        console.log(`   Token: ${this.authToken.substring(0, 20)}...`);
      } else {
        this.results.login = {
          status: 'FAILED',
          error: 'No access token received'
        };
        console.log('❌ Frontend login failed - no access token');
      }

    } catch (error) {
      this.results.login = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Frontend login test failed:', error.response?.data?.error || error.message);
    }
  }

  async testProfileManagement() {
    console.log('\n👤 Testing Profile Management...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping profile tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get user profile (as frontend would call)
      const profileResponse = await axios.get(`${BACKEND_URL}/api/user/profile`, { headers });
      
      this.results.profile.getProfile = {
        status: 'SUCCESS',
        data: profileResponse.data
      };
      console.log('✅ Get user profile successful');
      console.log(`   User ID: ${profileResponse.data.user.id}`);
      console.log(`   User Type: ${profileResponse.data.user.user_type}`);

    } catch (error) {
      this.results.profile.getProfile = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Profile management test failed:', error.response?.data?.error || error.message);
    }
  }

  async testTradingOperations() {
    console.log('\n📈 Testing Trading Operations...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping trading tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get trading status (as frontend dashboard would call)
      const statusResponse = await axios.get(`${BACKEND_URL}/api/trading/status`, { headers });
      this.results.trading.status = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Get trading status successful');
      console.log(`   Status: ${statusResponse.data.status}`);
      console.log(`   Active Positions: ${statusResponse.data.activePositions}`);

      // Test get positions (as frontend operations page would call)
      const positionsResponse = await axios.get(`${BACKEND_URL}/api/trading/positions`, { headers });
      this.results.trading.positions = {
        status: 'SUCCESS',
        data: positionsResponse.data
      };
      console.log('✅ Get positions successful');

      // Test get market analysis (as frontend dashboard would call)
      const analysisResponse = await axios.get(`${BACKEND_URL}/api/trading/analysis`, { headers });
      this.results.trading.analysis = {
        status: 'SUCCESS',
        data: analysisResponse.data
      };
      console.log('✅ Get market analysis successful');
      console.log(`   Sentiment: ${analysisResponse.data.analysis.sentiment}`);
      console.log(`   Confidence: ${analysisResponse.data.analysis.confidence}%`);

      // Test open position (as frontend would call when user clicks trade)
      const openPositionResponse = await axios.post(`${BACKEND_URL}/api/trading/positions`, {
        symbol: 'BTCUSDT',
        side: 'LONG',
        size: 0.001,
        leverage: 5,
        stopLoss: 65000,
        takeProfit: 70000
      }, { headers });

      this.results.trading.openPosition = {
        status: 'SUCCESS',
        data: openPositionResponse.data
      };
      console.log('✅ Open position successful');
      console.log(`   Position ID: ${openPositionResponse.data.positionId}`);

    } catch (error) {
      this.results.trading.status = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Trading operations test failed:', error.response?.data?.error || error.message);
    }
  }

  async testUserSettings() {
    console.log('\n⚙️ Testing User Settings...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping settings tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get user settings (as frontend settings page would call)
      const settingsResponse = await axios.get(`${BACKEND_URL}/api/user/settings`, { headers });
      this.results.settings.getSettings = {
        status: 'SUCCESS',
        data: settingsResponse.data
      };
      console.log('✅ Get user settings successful');

      // Test update settings (as frontend would call when user saves)
      const updateSettingsResponse = await axios.put(`${BACKEND_URL}/api/user/settings`, {
        trading: { 
          enabled: true, 
          maxPositions: 2 
        },
        notifications: { 
          email: true, 
          push: true 
        },
        language: 'pt-BR'
      }, { headers });

      this.results.settings.updateSettings = {
        status: 'SUCCESS',
        data: updateSettingsResponse.data
      };
      console.log('✅ Update user settings successful');

    } catch (error) {
      this.results.settings.getSettings = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ User settings test failed:', error.response?.data?.error || error.message);
    }
  }

  async testDashboardData() {
    console.log('\n📊 Testing Dashboard Data...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping dashboard tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get balances (as frontend dashboard would call)
      const balancesResponse = await axios.get(`${BACKEND_URL}/api/financial/balances`, { headers });
      this.results.dashboard.balances = {
        status: 'SUCCESS',
        data: balancesResponse.data
      };
      console.log('✅ Get balances successful');

      // Test get transactions (as frontend dashboard would call)
      const transactionsResponse = await axios.get(`${BACKEND_URL}/api/financial/transactions`, { headers });
      this.results.dashboard.transactions = {
        status: 'SUCCESS',
        data: transactionsResponse.data
      };
      console.log('✅ Get transactions successful');

    } catch (error) {
      this.results.dashboard.balances = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Dashboard data test failed:', error.response?.data?.error || error.message);
    }
  }

  generateReport() {
    console.log('\n📋 FRONTEND INTEGRATION TEST REPORT');
    console.log('=' .repeat(60));

    // Calculate overall status
    const allTests = [
      this.results.login,
      this.results.profile.getProfile,
      this.results.trading.status,
      this.results.settings.getSettings,
      this.results.dashboard.balances
    ];

    const passedTests = allTests.filter(test => test && test.status === 'SUCCESS').length;
    const totalTests = allTests.filter(test => test && test.status !== 'SKIPPED').length;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

    console.log(`🎯 Overall Status: ${successRate >= 80 ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`📊 Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
    console.log('\n📝 Frontend Integration Results:');

    // Login Results
    console.log('\n🔐 Login Flow:');
    const loginStatus = this.results.login.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`  ${loginStatus} Login: ${this.results.login.status}`);
    if (this.results.login.hasToken) {
      console.log(`  ✅ Token received: ${this.authToken ? 'Yes' : 'No'}`);
    }

    // Profile Results
    console.log('\n👤 Profile Management:');
    Object.entries(this.results.profile).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Trading Results
    console.log('\n📈 Trading Operations:');
    Object.entries(this.results.trading).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Settings Results
    console.log('\n⚙️ User Settings:');
    Object.entries(this.results.settings).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Dashboard Results
    console.log('\n📊 Dashboard Data:');
    Object.entries(this.results.dashboard).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    console.log('\n🎉 Frontend Integration Test Complete!');
    
    if (successRate >= 80) {
      console.log('🚀 Frontend-Backend integration is READY FOR PRODUCTION!');
      console.log('💡 The frontend can successfully communicate with the backend API');
    } else {
      console.log('⚠️ Some frontend integration issues detected. Review results above.');
    }
  }
}

// Run the frontend integration test
async function main() {
  const tester = new FrontendAPITester();
  await tester.runFrontendTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = FrontendAPITester;
 * 🌐 FRONTEND API INTEGRATION TEST
 * Simulates frontend API calls to test complete integration
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3333';
const FRONTEND_URL = 'http://localhost:3003';

class FrontendAPITester {
  constructor() {
    this.authToken = null;
    this.results = {
      login: {},
      profile: {},
      trading: {},
      settings: {},
      dashboard: {}
    };
  }

  async runFrontendTests() {
    console.log('🌐 STARTING FRONTEND API INTEGRATION TESTS');
    console.log('=' .repeat(60));

    try {
      // 1. Test Login Flow (Frontend -> Backend)
      await this.testLoginFlow();
      
      if (this.authToken) {
        // 2. Test Profile Management
        await this.testProfileManagement();
        
        // 3. Test Trading Operations
        await this.testTradingOperations();
        
        // 4. Test User Settings
        await this.testUserSettings();
        
        // 5. Test Dashboard Data
        await this.testDashboardData();
      }
      
      // 6. Generate Report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Frontend integration test failed:', error.message);
    }
  }

  async testLoginFlow() {
    console.log('\n🔐 Testing Frontend Login Flow...');
    
    try {
      // Simulate frontend login API call
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: 'admin@coinbitclub.com',
        password: 'admin123'
      });

      if (loginResponse.data.success && loginResponse.data.accessToken) {
        this.authToken = loginResponse.data.accessToken;
        this.results.login = {
          status: 'SUCCESS',
          user: loginResponse.data.user,
          hasToken: true,
          tokenLength: this.authToken.length
        };
        console.log('✅ Frontend login successful');
        console.log(`   User: ${loginResponse.data.user.email}`);
        console.log(`   Role: ${loginResponse.data.user.user_type}`);
        console.log(`   Token: ${this.authToken.substring(0, 20)}...`);
      } else {
        this.results.login = {
          status: 'FAILED',
          error: 'No access token received'
        };
        console.log('❌ Frontend login failed - no access token');
      }

    } catch (error) {
      this.results.login = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Frontend login test failed:', error.response?.data?.error || error.message);
    }
  }

  async testProfileManagement() {
    console.log('\n👤 Testing Profile Management...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping profile tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get user profile (as frontend would call)
      const profileResponse = await axios.get(`${BACKEND_URL}/api/user/profile`, { headers });
      
      this.results.profile.getProfile = {
        status: 'SUCCESS',
        data: profileResponse.data
      };
      console.log('✅ Get user profile successful');
      console.log(`   User ID: ${profileResponse.data.user.id}`);
      console.log(`   User Type: ${profileResponse.data.user.user_type}`);

    } catch (error) {
      this.results.profile.getProfile = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Profile management test failed:', error.response?.data?.error || error.message);
    }
  }

  async testTradingOperations() {
    console.log('\n📈 Testing Trading Operations...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping trading tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get trading status (as frontend dashboard would call)
      const statusResponse = await axios.get(`${BACKEND_URL}/api/trading/status`, { headers });
      this.results.trading.status = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Get trading status successful');
      console.log(`   Status: ${statusResponse.data.status}`);
      console.log(`   Active Positions: ${statusResponse.data.activePositions}`);

      // Test get positions (as frontend operations page would call)
      const positionsResponse = await axios.get(`${BACKEND_URL}/api/trading/positions`, { headers });
      this.results.trading.positions = {
        status: 'SUCCESS',
        data: positionsResponse.data
      };
      console.log('✅ Get positions successful');

      // Test get market analysis (as frontend dashboard would call)
      const analysisResponse = await axios.get(`${BACKEND_URL}/api/trading/analysis`, { headers });
      this.results.trading.analysis = {
        status: 'SUCCESS',
        data: analysisResponse.data
      };
      console.log('✅ Get market analysis successful');
      console.log(`   Sentiment: ${analysisResponse.data.analysis.sentiment}`);
      console.log(`   Confidence: ${analysisResponse.data.analysis.confidence}%`);

      // Test open position (as frontend would call when user clicks trade)
      const openPositionResponse = await axios.post(`${BACKEND_URL}/api/trading/positions`, {
        symbol: 'BTCUSDT',
        side: 'LONG',
        size: 0.001,
        leverage: 5,
        stopLoss: 65000,
        takeProfit: 70000
      }, { headers });

      this.results.trading.openPosition = {
        status: 'SUCCESS',
        data: openPositionResponse.data
      };
      console.log('✅ Open position successful');
      console.log(`   Position ID: ${openPositionResponse.data.positionId}`);

    } catch (error) {
      this.results.trading.status = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Trading operations test failed:', error.response?.data?.error || error.message);
    }
  }

  async testUserSettings() {
    console.log('\n⚙️ Testing User Settings...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping settings tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get user settings (as frontend settings page would call)
      const settingsResponse = await axios.get(`${BACKEND_URL}/api/user/settings`, { headers });
      this.results.settings.getSettings = {
        status: 'SUCCESS',
        data: settingsResponse.data
      };
      console.log('✅ Get user settings successful');

      // Test update settings (as frontend would call when user saves)
      const updateSettingsResponse = await axios.put(`${BACKEND_URL}/api/user/settings`, {
        trading: { 
          enabled: true, 
          maxPositions: 2 
        },
        notifications: { 
          email: true, 
          push: true 
        },
        language: 'pt-BR'
      }, { headers });

      this.results.settings.updateSettings = {
        status: 'SUCCESS',
        data: updateSettingsResponse.data
      };
      console.log('✅ Update user settings successful');

    } catch (error) {
      this.results.settings.getSettings = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ User settings test failed:', error.response?.data?.error || error.message);
    }
  }

  async testDashboardData() {
    console.log('\n📊 Testing Dashboard Data...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping dashboard tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get balances (as frontend dashboard would call)
      const balancesResponse = await axios.get(`${BACKEND_URL}/api/financial/balances`, { headers });
      this.results.dashboard.balances = {
        status: 'SUCCESS',
        data: balancesResponse.data
      };
      console.log('✅ Get balances successful');

      // Test get transactions (as frontend dashboard would call)
      const transactionsResponse = await axios.get(`${BACKEND_URL}/api/financial/transactions`, { headers });
      this.results.dashboard.transactions = {
        status: 'SUCCESS',
        data: transactionsResponse.data
      };
      console.log('✅ Get transactions successful');

    } catch (error) {
      this.results.dashboard.balances = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Dashboard data test failed:', error.response?.data?.error || error.message);
    }
  }

  generateReport() {
    console.log('\n📋 FRONTEND INTEGRATION TEST REPORT');
    console.log('=' .repeat(60));

    // Calculate overall status
    const allTests = [
      this.results.login,
      this.results.profile.getProfile,
      this.results.trading.status,
      this.results.settings.getSettings,
      this.results.dashboard.balances
    ];

    const passedTests = allTests.filter(test => test && test.status === 'SUCCESS').length;
    const totalTests = allTests.filter(test => test && test.status !== 'SKIPPED').length;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

    console.log(`🎯 Overall Status: ${successRate >= 80 ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`📊 Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
    console.log('\n📝 Frontend Integration Results:');

    // Login Results
    console.log('\n🔐 Login Flow:');
    const loginStatus = this.results.login.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`  ${loginStatus} Login: ${this.results.login.status}`);
    if (this.results.login.hasToken) {
      console.log(`  ✅ Token received: ${this.authToken ? 'Yes' : 'No'}`);
    }

    // Profile Results
    console.log('\n👤 Profile Management:');
    Object.entries(this.results.profile).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Trading Results
    console.log('\n📈 Trading Operations:');
    Object.entries(this.results.trading).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Settings Results
    console.log('\n⚙️ User Settings:');
    Object.entries(this.results.settings).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Dashboard Results
    console.log('\n📊 Dashboard Data:');
    Object.entries(this.results.dashboard).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    console.log('\n🎉 Frontend Integration Test Complete!');
    
    if (successRate >= 80) {
      console.log('🚀 Frontend-Backend integration is READY FOR PRODUCTION!');
      console.log('💡 The frontend can successfully communicate with the backend API');
    } else {
      console.log('⚠️ Some frontend integration issues detected. Review results above.');
    }
  }
}

// Run the frontend integration test
async function main() {
  const tester = new FrontendAPITester();
  await tester.runFrontendTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = FrontendAPITester;
 * 🌐 FRONTEND API INTEGRATION TEST
 * Simulates frontend API calls to test complete integration
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3333';
const FRONTEND_URL = 'http://localhost:3003';

class FrontendAPITester {
  constructor() {
    this.authToken = null;
    this.results = {
      login: {},
      profile: {},
      trading: {},
      settings: {},
      dashboard: {}
    };
  }

  async runFrontendTests() {
    console.log('🌐 STARTING FRONTEND API INTEGRATION TESTS');
    console.log('=' .repeat(60));

    try {
      // 1. Test Login Flow (Frontend -> Backend)
      await this.testLoginFlow();
      
      if (this.authToken) {
        // 2. Test Profile Management
        await this.testProfileManagement();
        
        // 3. Test Trading Operations
        await this.testTradingOperations();
        
        // 4. Test User Settings
        await this.testUserSettings();
        
        // 5. Test Dashboard Data
        await this.testDashboardData();
      }
      
      // 6. Generate Report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Frontend integration test failed:', error.message);
    }
  }

  async testLoginFlow() {
    console.log('\n🔐 Testing Frontend Login Flow...');
    
    try {
      // Simulate frontend login API call
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: 'admin@coinbitclub.com',
        password: 'admin123'
      });

      if (loginResponse.data.success && loginResponse.data.accessToken) {
        this.authToken = loginResponse.data.accessToken;
        this.results.login = {
          status: 'SUCCESS',
          user: loginResponse.data.user,
          hasToken: true,
          tokenLength: this.authToken.length
        };
        console.log('✅ Frontend login successful');
        console.log(`   User: ${loginResponse.data.user.email}`);
        console.log(`   Role: ${loginResponse.data.user.user_type}`);
        console.log(`   Token: ${this.authToken.substring(0, 20)}...`);
      } else {
        this.results.login = {
          status: 'FAILED',
          error: 'No access token received'
        };
        console.log('❌ Frontend login failed - no access token');
      }

    } catch (error) {
      this.results.login = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Frontend login test failed:', error.response?.data?.error || error.message);
    }
  }

  async testProfileManagement() {
    console.log('\n👤 Testing Profile Management...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping profile tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get user profile (as frontend would call)
      const profileResponse = await axios.get(`${BACKEND_URL}/api/user/profile`, { headers });
      
      this.results.profile.getProfile = {
        status: 'SUCCESS',
        data: profileResponse.data
      };
      console.log('✅ Get user profile successful');
      console.log(`   User ID: ${profileResponse.data.user.id}`);
      console.log(`   User Type: ${profileResponse.data.user.user_type}`);

    } catch (error) {
      this.results.profile.getProfile = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Profile management test failed:', error.response?.data?.error || error.message);
    }
  }

  async testTradingOperations() {
    console.log('\n📈 Testing Trading Operations...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping trading tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get trading status (as frontend dashboard would call)
      const statusResponse = await axios.get(`${BACKEND_URL}/api/trading/status`, { headers });
      this.results.trading.status = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Get trading status successful');
      console.log(`   Status: ${statusResponse.data.status}`);
      console.log(`   Active Positions: ${statusResponse.data.activePositions}`);

      // Test get positions (as frontend operations page would call)
      const positionsResponse = await axios.get(`${BACKEND_URL}/api/trading/positions`, { headers });
      this.results.trading.positions = {
        status: 'SUCCESS',
        data: positionsResponse.data
      };
      console.log('✅ Get positions successful');

      // Test get market analysis (as frontend dashboard would call)
      const analysisResponse = await axios.get(`${BACKEND_URL}/api/trading/analysis`, { headers });
      this.results.trading.analysis = {
        status: 'SUCCESS',
        data: analysisResponse.data
      };
      console.log('✅ Get market analysis successful');
      console.log(`   Sentiment: ${analysisResponse.data.analysis.sentiment}`);
      console.log(`   Confidence: ${analysisResponse.data.analysis.confidence}%`);

      // Test open position (as frontend would call when user clicks trade)
      const openPositionResponse = await axios.post(`${BACKEND_URL}/api/trading/positions`, {
        symbol: 'BTCUSDT',
        side: 'LONG',
        size: 0.001,
        leverage: 5,
        stopLoss: 65000,
        takeProfit: 70000
      }, { headers });

      this.results.trading.openPosition = {
        status: 'SUCCESS',
        data: openPositionResponse.data
      };
      console.log('✅ Open position successful');
      console.log(`   Position ID: ${openPositionResponse.data.positionId}`);

    } catch (error) {
      this.results.trading.status = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Trading operations test failed:', error.response?.data?.error || error.message);
    }
  }

  async testUserSettings() {
    console.log('\n⚙️ Testing User Settings...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping settings tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get user settings (as frontend settings page would call)
      const settingsResponse = await axios.get(`${BACKEND_URL}/api/user/settings`, { headers });
      this.results.settings.getSettings = {
        status: 'SUCCESS',
        data: settingsResponse.data
      };
      console.log('✅ Get user settings successful');

      // Test update settings (as frontend would call when user saves)
      const updateSettingsResponse = await axios.put(`${BACKEND_URL}/api/user/settings`, {
        trading: { 
          enabled: true, 
          maxPositions: 2 
        },
        notifications: { 
          email: true, 
          push: true 
        },
        language: 'pt-BR'
      }, { headers });

      this.results.settings.updateSettings = {
        status: 'SUCCESS',
        data: updateSettingsResponse.data
      };
      console.log('✅ Update user settings successful');

    } catch (error) {
      this.results.settings.getSettings = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ User settings test failed:', error.response?.data?.error || error.message);
    }
  }

  async testDashboardData() {
    console.log('\n📊 Testing Dashboard Data...');
    
    if (!this.authToken) {
      console.log('⚠️ Skipping dashboard tests - no auth token');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };

      // Test get balances (as frontend dashboard would call)
      const balancesResponse = await axios.get(`${BACKEND_URL}/api/financial/balances`, { headers });
      this.results.dashboard.balances = {
        status: 'SUCCESS',
        data: balancesResponse.data
      };
      console.log('✅ Get balances successful');

      // Test get transactions (as frontend dashboard would call)
      const transactionsResponse = await axios.get(`${BACKEND_URL}/api/financial/transactions`, { headers });
      this.results.dashboard.transactions = {
        status: 'SUCCESS',
        data: transactionsResponse.data
      };
      console.log('✅ Get transactions successful');

    } catch (error) {
      this.results.dashboard.balances = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Dashboard data test failed:', error.response?.data?.error || error.message);
    }
  }

  generateReport() {
    console.log('\n📋 FRONTEND INTEGRATION TEST REPORT');
    console.log('=' .repeat(60));

    // Calculate overall status
    const allTests = [
      this.results.login,
      this.results.profile.getProfile,
      this.results.trading.status,
      this.results.settings.getSettings,
      this.results.dashboard.balances
    ];

    const passedTests = allTests.filter(test => test && test.status === 'SUCCESS').length;
    const totalTests = allTests.filter(test => test && test.status !== 'SKIPPED').length;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

    console.log(`🎯 Overall Status: ${successRate >= 80 ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`📊 Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
    console.log('\n📝 Frontend Integration Results:');

    // Login Results
    console.log('\n🔐 Login Flow:');
    const loginStatus = this.results.login.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`  ${loginStatus} Login: ${this.results.login.status}`);
    if (this.results.login.hasToken) {
      console.log(`  ✅ Token received: ${this.authToken ? 'Yes' : 'No'}`);
    }

    // Profile Results
    console.log('\n👤 Profile Management:');
    Object.entries(this.results.profile).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Trading Results
    console.log('\n📈 Trading Operations:');
    Object.entries(this.results.trading).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Settings Results
    console.log('\n⚙️ User Settings:');
    Object.entries(this.results.settings).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Dashboard Results
    console.log('\n📊 Dashboard Data:');
    Object.entries(this.results.dashboard).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    console.log('\n🎉 Frontend Integration Test Complete!');
    
    if (successRate >= 80) {
      console.log('🚀 Frontend-Backend integration is READY FOR PRODUCTION!');
      console.log('💡 The frontend can successfully communicate with the backend API');
    } else {
      console.log('⚠️ Some frontend integration issues detected. Review results above.');
    }
  }
}

// Run the frontend integration test
async function main() {
  const tester = new FrontendAPITester();
  await tester.runFrontendTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = FrontendAPITester;
