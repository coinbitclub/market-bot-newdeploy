/**
 * 🔗 BACKEND-FRONTEND INTEGRATION TEST
 * Tests complete integration between backend (port 3333) and frontend (port 3003)
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3333';
const FRONTEND_URL = 'http://localhost:3003';

// Test credentials
const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@coinbitclub.com',
    password: 'admin123'
  },
  user: {
    email: 'user@coinbitclub.com',
    password: 'user123'
  }
};

class IntegrationTester {
  constructor() {
    this.results = {
      backend: {},
      frontend: {},
      authentication: {},
      trading: {},
      userSettings: {},
      overall: {}
    };
    this.authTokens = {};
  }

  async runAllTests() {
    console.log('🚀 STARTING BACKEND-FRONTEND INTEGRATION TESTS');
    console.log('=' .repeat(60));
    
    try {
      // 1. Test Backend Health
      await this.testBackendHealth();
      
      // 2. Test Frontend Accessibility
      await this.testFrontendAccessibility();
      
      // 3. Test Authentication Flow
      await this.testAuthenticationFlow();
      
      // 4. Test Trading System Integration
      await this.testTradingSystemIntegration();
      
      // 5. Test User Settings Integration
      await this.testUserSettingsIntegration();
      
      // 6. Generate Report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Integration test failed:', error.message);
      this.results.overall.status = 'FAILED';
      this.results.overall.error = error.message;
    }
  }

  async testBackendHealth() {
    console.log('\n📊 Testing Backend Health...');
    
    try {
      // Test main health endpoint
      const healthResponse = await axios.get(`${BACKEND_URL}/health`);
      this.results.backend.health = {
        status: 'SUCCESS',
        data: healthResponse.data
      };
      console.log('✅ Backend health check passed');

      // Test main API endpoint
      const apiResponse = await axios.get(`${BACKEND_URL}/`);
      this.results.backend.main = {
        status: 'SUCCESS',
        data: apiResponse.data
      };
      console.log('✅ Backend main endpoint accessible');

      // Test API status endpoint
      const statusResponse = await axios.get(`${BACKEND_URL}/api/status`);
      this.results.backend.apiStatus = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Backend API status endpoint working');

    } catch (error) {
      this.results.backend.health = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Backend health check failed:', error.message);
    }
  }

  async testFrontendAccessibility() {
    console.log('\n🌐 Testing Frontend Accessibility...');
    
    try {
      // Test main frontend page
      const frontendResponse = await axios.get(`${FRONTEND_URL}/`);
      this.results.frontend.main = {
        status: 'SUCCESS',
        statusCode: frontendResponse.status,
        contentType: frontendResponse.headers['content-type']
      };
      console.log('✅ Frontend main page accessible');

      // Test auth page
      const authResponse = await axios.get(`${FRONTEND_URL}/auth/login`);
      this.results.frontend.auth = {
        status: 'SUCCESS',
        statusCode: authResponse.status,
        contentType: authResponse.headers['content-type']
      };
      console.log('✅ Frontend auth page accessible');

    } catch (error) {
      this.results.frontend.main = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Frontend accessibility test failed:', error.message);
    }
  }

  async testAuthenticationFlow() {
    console.log('\n🔐 Testing Authentication Flow...');
    
    try {
      // Test admin login
      const adminLoginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: TEST_CREDENTIALS.admin.email,
        password: TEST_CREDENTIALS.admin.password
      });

      if (adminLoginResponse.data.success && adminLoginResponse.data.accessToken) {
        this.authTokens.admin = adminLoginResponse.data.accessToken;
        this.results.authentication.adminLogin = {
          status: 'SUCCESS',
          user: adminLoginResponse.data.user,
          hasToken: true
        };
        console.log('✅ Admin login successful');

        // Test token validation
        const validateResponse = await axios.get(`${BACKEND_URL}/api/auth/validate`, {
          headers: { Authorization: `Bearer ${this.authTokens.admin}` }
        });

        this.results.authentication.tokenValidation = {
          status: 'SUCCESS',
          data: validateResponse.data
        };
        console.log('✅ Token validation successful');

        // Test user profile
        const profileResponse = await axios.get(`${BACKEND_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${this.authTokens.admin}` }
        });

        this.results.authentication.profileAccess = {
          status: 'SUCCESS',
          data: profileResponse.data
        };
        console.log('✅ User profile access successful');

      } else {
        this.results.authentication.adminLogin = {
          status: 'FAILED',
          error: 'No access token received'
        };
        console.log('❌ Admin login failed - no access token');
      }

    } catch (error) {
      this.results.authentication.adminLogin = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Authentication test failed:', error.response?.data?.error || error.message);
    }
  }

  async testTradingSystemIntegration() {
    console.log('\n📈 Testing Trading System Integration...');
    
    if (!this.authTokens.admin) {
      console.log('⚠️ Skipping trading tests - no auth token');
      this.results.trading.status = 'SKIPPED';
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authTokens.admin}` };

      // Test trading status
      const statusResponse = await axios.get(`${BACKEND_URL}/api/trading/status`, { headers });
      this.results.trading.status = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Trading status endpoint working');

      // Test positions
      const positionsResponse = await axios.get(`${BACKEND_URL}/api/trading/positions`, { headers });
      this.results.trading.positions = {
        status: 'SUCCESS',
        data: positionsResponse.data
      };
      console.log('✅ Trading positions endpoint working');

      // Test market analysis
      const analysisResponse = await axios.get(`${BACKEND_URL}/api/trading/analysis`, { headers });
      this.results.trading.analysis = {
        status: 'SUCCESS',
        data: analysisResponse.data
      };
      console.log('✅ Trading analysis endpoint working');

      // Test open position (POST)
      const openPositionResponse = await axios.post(`${BACKEND_URL}/api/trading/positions`, {
        symbol: 'BTCUSDT',
        side: 'LONG',
        size: 0.001,
        leverage: 5
      }, { headers });

      this.results.trading.openPosition = {
        status: 'SUCCESS',
        data: openPositionResponse.data
      };
      console.log('✅ Open position endpoint working');

      // Test close position (DELETE)
      const closePositionResponse = await axios.delete(`${BACKEND_URL}/api/trading/positions/pos_123`, { headers });
      this.results.trading.closePosition = {
        status: 'SUCCESS',
        data: closePositionResponse.data
      };
      console.log('✅ Close position endpoint working');

    } catch (error) {
      this.results.trading.status = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Trading system test failed:', error.response?.data?.error || error.message);
    }
  }

  async testUserSettingsIntegration() {
    console.log('\n⚙️ Testing User Settings Integration...');
    
    if (!this.authTokens.admin) {
      console.log('⚠️ Skipping user settings tests - no auth token');
      this.results.userSettings.status = 'SKIPPED';
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authTokens.admin}` };

      // Test get all user settings
      const getAllSettingsResponse = await axios.get(`${BACKEND_URL}/api/user-settings`, { headers });
      this.results.userSettings.getAll = {
        status: 'SUCCESS',
        data: getAllSettingsResponse.data
      };
      console.log('✅ Get all user settings working');

      // Test get trading settings
      const tradingSettingsResponse = await axios.get(`${BACKEND_URL}/api/user-settings/trading`, { headers });
      this.results.userSettings.trading = {
        status: 'SUCCESS',
        data: tradingSettingsResponse.data
      };
      console.log('✅ Get trading settings working');

      // Test update trading settings
      const updateTradingResponse = await axios.put(`${BACKEND_URL}/api/user-settings/trading`, {
        max_leverage: 10,
        take_profit_percentage: 20.00,
        stop_loss_percentage: 15.00,
        position_size_percentage: 40.00,
        risk_level: 'high'
      }, { headers });

      this.results.userSettings.updateTrading = {
        status: 'SUCCESS',
        data: updateTradingResponse.data
      };
      console.log('✅ Update trading settings working');

      // Test get notification settings
      const notificationSettingsResponse = await axios.get(`${BACKEND_URL}/api/user-settings/notifications`, { headers });
      this.results.userSettings.notifications = {
        status: 'SUCCESS',
        data: notificationSettingsResponse.data
      };
      console.log('✅ Get notification settings working');

    } catch (error) {
      this.results.userSettings.getAll = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ User settings test failed:', error.response?.data?.error || error.message);
    }
  }

  generateReport() {
    console.log('\n📋 INTEGRATION TEST REPORT');
    console.log('=' .repeat(60));

    // Calculate overall status
    const allTests = [
      this.results.backend.health,
      this.results.frontend.main,
      this.results.authentication.adminLogin,
      this.results.trading.status,
      this.results.userSettings.getAll
    ];

    const passedTests = allTests.filter(test => test && test.status === 'SUCCESS').length;
    const totalTests = allTests.filter(test => test && test.status !== 'SKIPPED').length;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

    this.results.overall = {
      status: successRate >= 80 ? 'SUCCESS' : 'PARTIAL',
      successRate: `${successRate}%`,
      passedTests,
      totalTests
    };

    console.log(`🎯 Overall Status: ${this.results.overall.status}`);
    console.log(`📊 Success Rate: ${this.results.overall.successRate} (${passedTests}/${totalTests})`);
    console.log('\n📝 Detailed Results:');

    // Backend Results
    console.log('\n🔧 Backend:');
    Object.entries(this.results.backend).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Frontend Results
    console.log('\n🌐 Frontend:');
    Object.entries(this.results.frontend).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Authentication Results
    console.log('\n🔐 Authentication:');
    Object.entries(this.results.authentication).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Trading Results
    console.log('\n📈 Trading System:');
    Object.entries(this.results.trading).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // User Settings Results
    console.log('\n⚙️ User Settings:');
    Object.entries(this.results.userSettings).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    console.log('\n🎉 Integration Test Complete!');
    
    if (this.results.overall.status === 'SUCCESS') {
      console.log('🚀 Backend-Frontend integration is READY FOR PRODUCTION!');
    } else {
      console.log('⚠️ Some integration issues detected. Review results above.');
    }
  }
}

// Run the integration test
async function main() {
  const tester = new IntegrationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = IntegrationTester;
 * 🔗 BACKEND-FRONTEND INTEGRATION TEST
 * Tests complete integration between backend (port 3333) and frontend (port 3003)
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3333';
const FRONTEND_URL = 'http://localhost:3003';

// Test credentials
const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@coinbitclub.com',
    password: 'admin123'
  },
  user: {
    email: 'user@coinbitclub.com',
    password: 'user123'
  }
};

class IntegrationTester {
  constructor() {
    this.results = {
      backend: {},
      frontend: {},
      authentication: {},
      trading: {},
      userSettings: {},
      overall: {}
    };
    this.authTokens = {};
  }

  async runAllTests() {
    console.log('🚀 STARTING BACKEND-FRONTEND INTEGRATION TESTS');
    console.log('=' .repeat(60));
    
    try {
      // 1. Test Backend Health
      await this.testBackendHealth();
      
      // 2. Test Frontend Accessibility
      await this.testFrontendAccessibility();
      
      // 3. Test Authentication Flow
      await this.testAuthenticationFlow();
      
      // 4. Test Trading System Integration
      await this.testTradingSystemIntegration();
      
      // 5. Test User Settings Integration
      await this.testUserSettingsIntegration();
      
      // 6. Generate Report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Integration test failed:', error.message);
      this.results.overall.status = 'FAILED';
      this.results.overall.error = error.message;
    }
  }

  async testBackendHealth() {
    console.log('\n📊 Testing Backend Health...');
    
    try {
      // Test main health endpoint
      const healthResponse = await axios.get(`${BACKEND_URL}/health`);
      this.results.backend.health = {
        status: 'SUCCESS',
        data: healthResponse.data
      };
      console.log('✅ Backend health check passed');

      // Test main API endpoint
      const apiResponse = await axios.get(`${BACKEND_URL}/`);
      this.results.backend.main = {
        status: 'SUCCESS',
        data: apiResponse.data
      };
      console.log('✅ Backend main endpoint accessible');

      // Test API status endpoint
      const statusResponse = await axios.get(`${BACKEND_URL}/api/status`);
      this.results.backend.apiStatus = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Backend API status endpoint working');

    } catch (error) {
      this.results.backend.health = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Backend health check failed:', error.message);
    }
  }

  async testFrontendAccessibility() {
    console.log('\n🌐 Testing Frontend Accessibility...');
    
    try {
      // Test main frontend page
      const frontendResponse = await axios.get(`${FRONTEND_URL}/`);
      this.results.frontend.main = {
        status: 'SUCCESS',
        statusCode: frontendResponse.status,
        contentType: frontendResponse.headers['content-type']
      };
      console.log('✅ Frontend main page accessible');

      // Test auth page
      const authResponse = await axios.get(`${FRONTEND_URL}/auth/login`);
      this.results.frontend.auth = {
        status: 'SUCCESS',
        statusCode: authResponse.status,
        contentType: authResponse.headers['content-type']
      };
      console.log('✅ Frontend auth page accessible');

    } catch (error) {
      this.results.frontend.main = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Frontend accessibility test failed:', error.message);
    }
  }

  async testAuthenticationFlow() {
    console.log('\n🔐 Testing Authentication Flow...');
    
    try {
      // Test admin login
      const adminLoginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: TEST_CREDENTIALS.admin.email,
        password: TEST_CREDENTIALS.admin.password
      });

      if (adminLoginResponse.data.success && adminLoginResponse.data.accessToken) {
        this.authTokens.admin = adminLoginResponse.data.accessToken;
        this.results.authentication.adminLogin = {
          status: 'SUCCESS',
          user: adminLoginResponse.data.user,
          hasToken: true
        };
        console.log('✅ Admin login successful');

        // Test token validation
        const validateResponse = await axios.get(`${BACKEND_URL}/api/auth/validate`, {
          headers: { Authorization: `Bearer ${this.authTokens.admin}` }
        });

        this.results.authentication.tokenValidation = {
          status: 'SUCCESS',
          data: validateResponse.data
        };
        console.log('✅ Token validation successful');

        // Test user profile
        const profileResponse = await axios.get(`${BACKEND_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${this.authTokens.admin}` }
        });

        this.results.authentication.profileAccess = {
          status: 'SUCCESS',
          data: profileResponse.data
        };
        console.log('✅ User profile access successful');

      } else {
        this.results.authentication.adminLogin = {
          status: 'FAILED',
          error: 'No access token received'
        };
        console.log('❌ Admin login failed - no access token');
      }

    } catch (error) {
      this.results.authentication.adminLogin = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Authentication test failed:', error.response?.data?.error || error.message);
    }
  }

  async testTradingSystemIntegration() {
    console.log('\n📈 Testing Trading System Integration...');
    
    if (!this.authTokens.admin) {
      console.log('⚠️ Skipping trading tests - no auth token');
      this.results.trading.status = 'SKIPPED';
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authTokens.admin}` };

      // Test trading status
      const statusResponse = await axios.get(`${BACKEND_URL}/api/trading/status`, { headers });
      this.results.trading.status = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Trading status endpoint working');

      // Test positions
      const positionsResponse = await axios.get(`${BACKEND_URL}/api/trading/positions`, { headers });
      this.results.trading.positions = {
        status: 'SUCCESS',
        data: positionsResponse.data
      };
      console.log('✅ Trading positions endpoint working');

      // Test market analysis
      const analysisResponse = await axios.get(`${BACKEND_URL}/api/trading/analysis`, { headers });
      this.results.trading.analysis = {
        status: 'SUCCESS',
        data: analysisResponse.data
      };
      console.log('✅ Trading analysis endpoint working');

      // Test open position (POST)
      const openPositionResponse = await axios.post(`${BACKEND_URL}/api/trading/positions`, {
        symbol: 'BTCUSDT',
        side: 'LONG',
        size: 0.001,
        leverage: 5
      }, { headers });

      this.results.trading.openPosition = {
        status: 'SUCCESS',
        data: openPositionResponse.data
      };
      console.log('✅ Open position endpoint working');

      // Test close position (DELETE)
      const closePositionResponse = await axios.delete(`${BACKEND_URL}/api/trading/positions/pos_123`, { headers });
      this.results.trading.closePosition = {
        status: 'SUCCESS',
        data: closePositionResponse.data
      };
      console.log('✅ Close position endpoint working');

    } catch (error) {
      this.results.trading.status = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Trading system test failed:', error.response?.data?.error || error.message);
    }
  }

  async testUserSettingsIntegration() {
    console.log('\n⚙️ Testing User Settings Integration...');
    
    if (!this.authTokens.admin) {
      console.log('⚠️ Skipping user settings tests - no auth token');
      this.results.userSettings.status = 'SKIPPED';
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authTokens.admin}` };

      // Test get all user settings
      const getAllSettingsResponse = await axios.get(`${BACKEND_URL}/api/user-settings`, { headers });
      this.results.userSettings.getAll = {
        status: 'SUCCESS',
        data: getAllSettingsResponse.data
      };
      console.log('✅ Get all user settings working');

      // Test get trading settings
      const tradingSettingsResponse = await axios.get(`${BACKEND_URL}/api/user-settings/trading`, { headers });
      this.results.userSettings.trading = {
        status: 'SUCCESS',
        data: tradingSettingsResponse.data
      };
      console.log('✅ Get trading settings working');

      // Test update trading settings
      const updateTradingResponse = await axios.put(`${BACKEND_URL}/api/user-settings/trading`, {
        max_leverage: 10,
        take_profit_percentage: 20.00,
        stop_loss_percentage: 15.00,
        position_size_percentage: 40.00,
        risk_level: 'high'
      }, { headers });

      this.results.userSettings.updateTrading = {
        status: 'SUCCESS',
        data: updateTradingResponse.data
      };
      console.log('✅ Update trading settings working');

      // Test get notification settings
      const notificationSettingsResponse = await axios.get(`${BACKEND_URL}/api/user-settings/notifications`, { headers });
      this.results.userSettings.notifications = {
        status: 'SUCCESS',
        data: notificationSettingsResponse.data
      };
      console.log('✅ Get notification settings working');

    } catch (error) {
      this.results.userSettings.getAll = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ User settings test failed:', error.response?.data?.error || error.message);
    }
  }

  generateReport() {
    console.log('\n📋 INTEGRATION TEST REPORT');
    console.log('=' .repeat(60));

    // Calculate overall status
    const allTests = [
      this.results.backend.health,
      this.results.frontend.main,
      this.results.authentication.adminLogin,
      this.results.trading.status,
      this.results.userSettings.getAll
    ];

    const passedTests = allTests.filter(test => test && test.status === 'SUCCESS').length;
    const totalTests = allTests.filter(test => test && test.status !== 'SKIPPED').length;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

    this.results.overall = {
      status: successRate >= 80 ? 'SUCCESS' : 'PARTIAL',
      successRate: `${successRate}%`,
      passedTests,
      totalTests
    };

    console.log(`🎯 Overall Status: ${this.results.overall.status}`);
    console.log(`📊 Success Rate: ${this.results.overall.successRate} (${passedTests}/${totalTests})`);
    console.log('\n📝 Detailed Results:');

    // Backend Results
    console.log('\n🔧 Backend:');
    Object.entries(this.results.backend).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Frontend Results
    console.log('\n🌐 Frontend:');
    Object.entries(this.results.frontend).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Authentication Results
    console.log('\n🔐 Authentication:');
    Object.entries(this.results.authentication).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Trading Results
    console.log('\n📈 Trading System:');
    Object.entries(this.results.trading).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // User Settings Results
    console.log('\n⚙️ User Settings:');
    Object.entries(this.results.userSettings).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    console.log('\n🎉 Integration Test Complete!');
    
    if (this.results.overall.status === 'SUCCESS') {
      console.log('🚀 Backend-Frontend integration is READY FOR PRODUCTION!');
    } else {
      console.log('⚠️ Some integration issues detected. Review results above.');
    }
  }
}

// Run the integration test
async function main() {
  const tester = new IntegrationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = IntegrationTester;
 * 🔗 BACKEND-FRONTEND INTEGRATION TEST
 * Tests complete integration between backend (port 3333) and frontend (port 3003)
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3333';
const FRONTEND_URL = 'http://localhost:3003';

// Test credentials
const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@coinbitclub.com',
    password: 'admin123'
  },
  user: {
    email: 'user@coinbitclub.com',
    password: 'user123'
  }
};

class IntegrationTester {
  constructor() {
    this.results = {
      backend: {},
      frontend: {},
      authentication: {},
      trading: {},
      userSettings: {},
      overall: {}
    };
    this.authTokens = {};
  }

  async runAllTests() {
    console.log('🚀 STARTING BACKEND-FRONTEND INTEGRATION TESTS');
    console.log('=' .repeat(60));
    
    try {
      // 1. Test Backend Health
      await this.testBackendHealth();
      
      // 2. Test Frontend Accessibility
      await this.testFrontendAccessibility();
      
      // 3. Test Authentication Flow
      await this.testAuthenticationFlow();
      
      // 4. Test Trading System Integration
      await this.testTradingSystemIntegration();
      
      // 5. Test User Settings Integration
      await this.testUserSettingsIntegration();
      
      // 6. Generate Report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Integration test failed:', error.message);
      this.results.overall.status = 'FAILED';
      this.results.overall.error = error.message;
    }
  }

  async testBackendHealth() {
    console.log('\n📊 Testing Backend Health...');
    
    try {
      // Test main health endpoint
      const healthResponse = await axios.get(`${BACKEND_URL}/health`);
      this.results.backend.health = {
        status: 'SUCCESS',
        data: healthResponse.data
      };
      console.log('✅ Backend health check passed');

      // Test main API endpoint
      const apiResponse = await axios.get(`${BACKEND_URL}/`);
      this.results.backend.main = {
        status: 'SUCCESS',
        data: apiResponse.data
      };
      console.log('✅ Backend main endpoint accessible');

      // Test API status endpoint
      const statusResponse = await axios.get(`${BACKEND_URL}/api/status`);
      this.results.backend.apiStatus = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Backend API status endpoint working');

    } catch (error) {
      this.results.backend.health = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Backend health check failed:', error.message);
    }
  }

  async testFrontendAccessibility() {
    console.log('\n🌐 Testing Frontend Accessibility...');
    
    try {
      // Test main frontend page
      const frontendResponse = await axios.get(`${FRONTEND_URL}/`);
      this.results.frontend.main = {
        status: 'SUCCESS',
        statusCode: frontendResponse.status,
        contentType: frontendResponse.headers['content-type']
      };
      console.log('✅ Frontend main page accessible');

      // Test auth page
      const authResponse = await axios.get(`${FRONTEND_URL}/auth/login`);
      this.results.frontend.auth = {
        status: 'SUCCESS',
        statusCode: authResponse.status,
        contentType: authResponse.headers['content-type']
      };
      console.log('✅ Frontend auth page accessible');

    } catch (error) {
      this.results.frontend.main = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Frontend accessibility test failed:', error.message);
    }
  }

  async testAuthenticationFlow() {
    console.log('\n🔐 Testing Authentication Flow...');
    
    try {
      // Test admin login
      const adminLoginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: TEST_CREDENTIALS.admin.email,
        password: TEST_CREDENTIALS.admin.password
      });

      if (adminLoginResponse.data.success && adminLoginResponse.data.accessToken) {
        this.authTokens.admin = adminLoginResponse.data.accessToken;
        this.results.authentication.adminLogin = {
          status: 'SUCCESS',
          user: adminLoginResponse.data.user,
          hasToken: true
        };
        console.log('✅ Admin login successful');

        // Test token validation
        const validateResponse = await axios.get(`${BACKEND_URL}/api/auth/validate`, {
          headers: { Authorization: `Bearer ${this.authTokens.admin}` }
        });

        this.results.authentication.tokenValidation = {
          status: 'SUCCESS',
          data: validateResponse.data
        };
        console.log('✅ Token validation successful');

        // Test user profile
        const profileResponse = await axios.get(`${BACKEND_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${this.authTokens.admin}` }
        });

        this.results.authentication.profileAccess = {
          status: 'SUCCESS',
          data: profileResponse.data
        };
        console.log('✅ User profile access successful');

      } else {
        this.results.authentication.adminLogin = {
          status: 'FAILED',
          error: 'No access token received'
        };
        console.log('❌ Admin login failed - no access token');
      }

    } catch (error) {
      this.results.authentication.adminLogin = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Authentication test failed:', error.response?.data?.error || error.message);
    }
  }

  async testTradingSystemIntegration() {
    console.log('\n📈 Testing Trading System Integration...');
    
    if (!this.authTokens.admin) {
      console.log('⚠️ Skipping trading tests - no auth token');
      this.results.trading.status = 'SKIPPED';
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authTokens.admin}` };

      // Test trading status
      const statusResponse = await axios.get(`${BACKEND_URL}/api/trading/status`, { headers });
      this.results.trading.status = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Trading status endpoint working');

      // Test positions
      const positionsResponse = await axios.get(`${BACKEND_URL}/api/trading/positions`, { headers });
      this.results.trading.positions = {
        status: 'SUCCESS',
        data: positionsResponse.data
      };
      console.log('✅ Trading positions endpoint working');

      // Test market analysis
      const analysisResponse = await axios.get(`${BACKEND_URL}/api/trading/analysis`, { headers });
      this.results.trading.analysis = {
        status: 'SUCCESS',
        data: analysisResponse.data
      };
      console.log('✅ Trading analysis endpoint working');

      // Test open position (POST)
      const openPositionResponse = await axios.post(`${BACKEND_URL}/api/trading/positions`, {
        symbol: 'BTCUSDT',
        side: 'LONG',
        size: 0.001,
        leverage: 5
      }, { headers });

      this.results.trading.openPosition = {
        status: 'SUCCESS',
        data: openPositionResponse.data
      };
      console.log('✅ Open position endpoint working');

      // Test close position (DELETE)
      const closePositionResponse = await axios.delete(`${BACKEND_URL}/api/trading/positions/pos_123`, { headers });
      this.results.trading.closePosition = {
        status: 'SUCCESS',
        data: closePositionResponse.data
      };
      console.log('✅ Close position endpoint working');

    } catch (error) {
      this.results.trading.status = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Trading system test failed:', error.response?.data?.error || error.message);
    }
  }

  async testUserSettingsIntegration() {
    console.log('\n⚙️ Testing User Settings Integration...');
    
    if (!this.authTokens.admin) {
      console.log('⚠️ Skipping user settings tests - no auth token');
      this.results.userSettings.status = 'SKIPPED';
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authTokens.admin}` };

      // Test get all user settings
      const getAllSettingsResponse = await axios.get(`${BACKEND_URL}/api/user-settings`, { headers });
      this.results.userSettings.getAll = {
        status: 'SUCCESS',
        data: getAllSettingsResponse.data
      };
      console.log('✅ Get all user settings working');

      // Test get trading settings
      const tradingSettingsResponse = await axios.get(`${BACKEND_URL}/api/user-settings/trading`, { headers });
      this.results.userSettings.trading = {
        status: 'SUCCESS',
        data: tradingSettingsResponse.data
      };
      console.log('✅ Get trading settings working');

      // Test update trading settings
      const updateTradingResponse = await axios.put(`${BACKEND_URL}/api/user-settings/trading`, {
        max_leverage: 10,
        take_profit_percentage: 20.00,
        stop_loss_percentage: 15.00,
        position_size_percentage: 40.00,
        risk_level: 'high'
      }, { headers });

      this.results.userSettings.updateTrading = {
        status: 'SUCCESS',
        data: updateTradingResponse.data
      };
      console.log('✅ Update trading settings working');

      // Test get notification settings
      const notificationSettingsResponse = await axios.get(`${BACKEND_URL}/api/user-settings/notifications`, { headers });
      this.results.userSettings.notifications = {
        status: 'SUCCESS',
        data: notificationSettingsResponse.data
      };
      console.log('✅ Get notification settings working');

    } catch (error) {
      this.results.userSettings.getAll = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ User settings test failed:', error.response?.data?.error || error.message);
    }
  }

  generateReport() {
    console.log('\n📋 INTEGRATION TEST REPORT');
    console.log('=' .repeat(60));

    // Calculate overall status
    const allTests = [
      this.results.backend.health,
      this.results.frontend.main,
      this.results.authentication.adminLogin,
      this.results.trading.status,
      this.results.userSettings.getAll
    ];

    const passedTests = allTests.filter(test => test && test.status === 'SUCCESS').length;
    const totalTests = allTests.filter(test => test && test.status !== 'SKIPPED').length;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

    this.results.overall = {
      status: successRate >= 80 ? 'SUCCESS' : 'PARTIAL',
      successRate: `${successRate}%`,
      passedTests,
      totalTests
    };

    console.log(`🎯 Overall Status: ${this.results.overall.status}`);
    console.log(`📊 Success Rate: ${this.results.overall.successRate} (${passedTests}/${totalTests})`);
    console.log('\n📝 Detailed Results:');

    // Backend Results
    console.log('\n🔧 Backend:');
    Object.entries(this.results.backend).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Frontend Results
    console.log('\n🌐 Frontend:');
    Object.entries(this.results.frontend).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Authentication Results
    console.log('\n🔐 Authentication:');
    Object.entries(this.results.authentication).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // Trading Results
    console.log('\n📈 Trading System:');
    Object.entries(this.results.trading).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    // User Settings Results
    console.log('\n⚙️ User Settings:');
    Object.entries(this.results.userSettings).forEach(([key, result]) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.status}`);
    });

    console.log('\n🎉 Integration Test Complete!');
    
    if (this.results.overall.status === 'SUCCESS') {
      console.log('🚀 Backend-Frontend integration is READY FOR PRODUCTION!');
    } else {
      console.log('⚠️ Some integration issues detected. Review results above.');
    }
  }
}

// Run the integration test
async function main() {
  const tester = new IntegrationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = IntegrationTester;
