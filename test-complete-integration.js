/**
 * 🚀 COMPLETE BACKEND-FRONTEND INTEGRATION TEST
 * Comprehensive test of all systems working together
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3333';
const FRONTEND_URL = 'http://localhost:3003';

class CompleteIntegrationTester {
  constructor() {
    this.authToken = null;
    this.results = {
      infrastructure: {},
      authentication: {},
      tradingSystem: {},
      userManagement: {},
      frontendIntegration: {},
      overall: {}
    };
    this.testStartTime = new Date();
  }

  async runCompleteIntegrationTest() {
    console.log('🚀 COMPLETE BACKEND-FRONTEND INTEGRATION TEST');
    console.log('=' .repeat(70));
    console.log(`⏰ Started at: ${this.testStartTime.toISOString()}`);
    console.log('');

    try {
      // 1. Infrastructure Health Check
      await this.testInfrastructureHealth();
      
      // 2. Authentication System
      await this.testAuthenticationSystem();
      
      if (this.authToken) {
        // 3. Trading System Integration
        await this.testTradingSystemIntegration();
        
        // 4. User Management System
        await this.testUserManagementSystem();
        
        // 5. Frontend Integration
        await this.testFrontendIntegration();
      }
      
      // 6. Generate Comprehensive Report
      await this.generateComprehensiveReport();
      
    } catch (error) {
      console.error('❌ Complete integration test failed:', error.message);
      this.results.overall.status = 'FAILED';
      this.results.overall.error = error.message;
    }
  }

  async testInfrastructureHealth() {
    console.log('🏗️ INFRASTRUCTURE HEALTH CHECK');
    console.log('-' .repeat(50));

    // Backend Health
    try {
      const backendHealth = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      this.results.infrastructure.backend = {
        status: 'SUCCESS',
        responseTime: Date.now() - this.testStartTime,
        data: backendHealth.data
      };
      console.log('✅ Backend Health: OPERATIONAL');
      console.log(`   System: ${backendHealth.data.system}`);
      console.log(`   Services: ${Object.keys(backendHealth.data.services).join(', ')}`);
    } catch (error) {
      this.results.infrastructure.backend = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Backend Health: FAILED');
    }

    // Frontend Accessibility
    try {
      const frontendHealth = await axios.get(`${FRONTEND_URL}/`, { timeout: 5000 });
      this.results.infrastructure.frontend = {
        status: 'SUCCESS',
        statusCode: frontendHealth.status,
        contentType: frontendHealth.headers['content-type']
      };
      console.log('✅ Frontend: ACCESSIBLE');
      console.log(`   Status Code: ${frontendHealth.status}`);
    } catch (error) {
      this.results.infrastructure.frontend = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Frontend: FAILED');
    }

    // API Connectivity
    try {
      const apiStatus = await axios.get(`${BACKEND_URL}/api/status`, { timeout: 5000 });
      this.results.infrastructure.api = {
        status: 'SUCCESS',
        data: apiStatus.data
      };
      console.log('✅ API Status: OPERATIONAL');
      console.log(`   Version: ${apiStatus.data.api_version}`);
      console.log(`   Services: ${Object.keys(apiStatus.data.services).join(', ')}`);
    } catch (error) {
      this.results.infrastructure.api = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ API Status: FAILED');
    }

    console.log('');
  }

  async testAuthenticationSystem() {
    console.log('🔐 AUTHENTICATION SYSTEM TEST');
    console.log('-' .repeat(50));

    try {
      // Test Login
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: 'admin@coinbitclub.com',
        password: 'admin123'
      }, { timeout: 5000 });

      if (loginResponse.data.success && loginResponse.data.accessToken) {
        this.authToken = loginResponse.data.accessToken;
        this.results.authentication.login = {
          status: 'SUCCESS',
          user: loginResponse.data.user,
          tokenReceived: true
        };
        console.log('✅ Login: SUCCESS');
        console.log(`   User: ${loginResponse.data.user.email}`);
        console.log(`   Role: ${loginResponse.data.user.user_type}`);
        console.log(`   Token: ${this.authToken.substring(0, 30)}...`);
      } else {
        this.results.authentication.login = {
          status: 'FAILED',
          error: 'No access token received'
        };
        console.log('❌ Login: FAILED - No access token');
      }

      // Test Token Validation
      if (this.authToken) {
        const validateResponse = await axios.get(`${BACKEND_URL}/api/auth/validate`, {
          headers: { Authorization: `Bearer ${this.authToken}` },
          timeout: 5000
        });

        this.results.authentication.tokenValidation = {
          status: 'SUCCESS',
          data: validateResponse.data
        };
        console.log('✅ Token Validation: SUCCESS');
      }

    } catch (error) {
      this.results.authentication.login = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Authentication: FAILED');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }

    console.log('');
  }

  async testTradingSystemIntegration() {
    console.log('📈 TRADING SYSTEM INTEGRATION TEST');
    console.log('-' .repeat(50));

    if (!this.authToken) {
      console.log('⚠️ Skipping trading tests - no auth token');
      return;
    }

    const headers = { Authorization: `Bearer ${this.authToken}` };

    try {
      // Test Trading Status
      const statusResponse = await axios.get(`${BACKEND_URL}/api/trading/status`, { headers, timeout: 5000 });
      this.results.tradingSystem.status = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Trading Status: SUCCESS');
      console.log(`   Status: ${statusResponse.data.status}`);
      console.log(`   Active Positions: ${statusResponse.data.activePositions}`);

      // Test Market Analysis
      const analysisResponse = await axios.get(`${BACKEND_URL}/api/trading/analysis`, { headers, timeout: 5000 });
      this.results.tradingSystem.analysis = {
        status: 'SUCCESS',
        data: analysisResponse.data
      };
      console.log('✅ Market Analysis: SUCCESS');
      console.log(`   Sentiment: ${analysisResponse.data.analysis.sentiment}`);
      console.log(`   Confidence: ${analysisResponse.data.analysis.confidence}%`);

      // Test Position Management
      const positionsResponse = await axios.get(`${BACKEND_URL}/api/trading/positions`, { headers, timeout: 5000 });
      this.results.tradingSystem.positions = {
        status: 'SUCCESS',
        data: positionsResponse.data
      };
      console.log('✅ Position Management: SUCCESS');

      // Test Open Position
      const openResponse = await axios.post(`${BACKEND_URL}/api/trading/positions`, {
        symbol: 'BTCUSDT',
        side: 'LONG',
        size: 0.001,
        leverage: 5,
        stopLoss: 65000,
        takeProfit: 70000
      }, { headers, timeout: 5000 });

      this.results.tradingSystem.openPosition = {
        status: 'SUCCESS',
        data: openResponse.data
      };
      console.log('✅ Open Position: SUCCESS');
      console.log(`   Position ID: ${openResponse.data.positionId}`);

      // Test Close Position
      const closeResponse = await axios.delete(`${BACKEND_URL}/api/trading/positions/pos_123`, { headers, timeout: 5000 });
      this.results.tradingSystem.closePosition = {
        status: 'SUCCESS',
        data: closeResponse.data
      };
      console.log('✅ Close Position: SUCCESS');

    } catch (error) {
      this.results.tradingSystem.status = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Trading System: FAILED');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }

    console.log('');
  }

  async testUserManagementSystem() {
    console.log('👥 USER MANAGEMENT SYSTEM TEST');
    console.log('-' .repeat(50));

    if (!this.authToken) {
      console.log('⚠️ Skipping user management tests - no auth token');
      return;
    }

    const headers = { Authorization: `Bearer ${this.authToken}` };

    try {
      // Test User Profile
      const profileResponse = await axios.get(`${BACKEND_URL}/api/user/profile`, { headers, timeout: 5000 });
      this.results.userManagement.profile = {
        status: 'SUCCESS',
        data: profileResponse.data
      };
      console.log('✅ User Profile: SUCCESS');
      console.log(`   User ID: ${profileResponse.data.user.id}`);
      console.log(`   Email: ${profileResponse.data.user.email}`);

      // Test User Settings
      const settingsResponse = await axios.get(`${BACKEND_URL}/api/user/settings`, { headers, timeout: 5000 });
      this.results.userManagement.settings = {
        status: 'SUCCESS',
        data: settingsResponse.data
      };
      console.log('✅ User Settings: SUCCESS');

      // Test Update Settings
      const updateResponse = await axios.put(`${BACKEND_URL}/api/user/settings`, {
        trading: { enabled: true, maxPositions: 2 },
        notifications: { email: true, push: true },
        language: 'pt-BR'
      }, { headers, timeout: 5000 });

      this.results.userManagement.updateSettings = {
        status: 'SUCCESS',
        data: updateResponse.data
      };
      console.log('✅ Update Settings: SUCCESS');

      // Test Financial Data
      const balancesResponse = await axios.get(`${BACKEND_URL}/api/financial/balances`, { headers, timeout: 5000 });
      this.results.userManagement.balances = {
        status: 'SUCCESS',
        data: balancesResponse.data
      };
      console.log('✅ Financial Balances: SUCCESS');

    } catch (error) {
      this.results.userManagement.profile = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ User Management: FAILED');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }

    console.log('');
  }

  async testFrontendIntegration() {
    console.log('🌐 FRONTEND INTEGRATION TEST');
    console.log('-' .repeat(50));

    try {
      // Test Main Frontend Pages
      const pages = [
        { name: 'Main Page', url: '/' },
        { name: 'Login Page', url: '/auth/login' },
        { name: 'Integration Test', url: '/test-integration' },
        { name: 'User Operations', url: '/user/operations' }
      ];

      for (const page of pages) {
        try {
          const response = await axios.get(`${FRONTEND_URL}${page.url}`, { timeout: 5000 });
          this.results.frontendIntegration[page.name.toLowerCase().replace(' ', '_')] = {
            status: 'SUCCESS',
            statusCode: response.status,
            title: this.extractTitle(response.data)
          };
          console.log(`✅ ${page.name}: SUCCESS (${response.status})`);
        } catch (error) {
          this.results.frontendIntegration[page.name.toLowerCase().replace(' ', '_')] = {
            status: 'FAILED',
            error: error.message
          };
          console.log(`❌ ${page.name}: FAILED`);
        }
      }

    } catch (error) {
      this.results.frontendIntegration.overall = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Frontend Integration: FAILED');
    }

    console.log('');
  }

  extractTitle(html) {
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1] : 'No title found';
  }

  async generateComprehensiveReport() {
    const testEndTime = new Date();
    const testDuration = testEndTime - this.testStartTime;

    console.log('📋 COMPREHENSIVE INTEGRATION TEST REPORT');
    console.log('=' .repeat(70));
    console.log(`⏰ Test Duration: ${testDuration}ms`);
    console.log(`📅 Completed: ${testEndTime.toISOString()}`);
    console.log('');

    // Calculate overall metrics
    const allTests = [];
    Object.values(this.results).forEach(category => {
      if (typeof category === 'object' && category !== null) {
        Object.values(category).forEach(test => {
          if (test && typeof test === 'object' && 'status' in test) {
            allTests.push(test);
          }
        });
      }
    });

    const passedTests = allTests.filter(test => test.status === 'SUCCESS').length;
    const totalTests = allTests.length;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

    this.results.overall = {
      status: successRate >= 90 ? 'EXCELLENT' : successRate >= 80 ? 'GOOD' : successRate >= 60 ? 'FAIR' : 'POOR',
      successRate: `${successRate}%`,
      passedTests,
      totalTests,
      testDuration: `${testDuration}ms`
    };

    console.log(`🎯 OVERALL STATUS: ${this.results.overall.status}`);
    console.log(`📊 SUCCESS RATE: ${this.results.overall.successRate} (${passedTests}/${totalTests})`);
    console.log(`⏱️ TEST DURATION: ${testDuration}ms`);
    console.log('');

    // Detailed Results by Category
    console.log('📝 DETAILED RESULTS BY CATEGORY');
    console.log('-' .repeat(50));

    Object.entries(this.results).forEach(([category, tests]) => {
      if (category === 'overall') return;
      
      console.log(`\n🏷️ ${category.toUpperCase().replace('_', ' ')}:`);
      if (typeof tests === 'object' && tests !== null) {
        Object.entries(tests).forEach(([testName, result]) => {
          if (result && typeof result === 'object' && 'status' in result) {
            const status = result.status === 'SUCCESS' ? '✅' : '❌';
            console.log(`  ${status} ${testName}: ${result.status}`);
          }
        });
      }
    });

    console.log('\n🎉 COMPLETE INTEGRATION TEST FINISHED!');
    console.log('');

    // Final Assessment
    if (successRate >= 90) {
      console.log('🚀 EXCELLENT! The system is PRODUCTION READY!');
      console.log('💡 All major components are working perfectly together.');
      console.log('🎯 Ready for deployment and user onboarding.');
    } else if (successRate >= 80) {
      console.log('✅ GOOD! The system is mostly ready for production.');
      console.log('⚠️ Some minor issues detected but core functionality works.');
      console.log('🔧 Review failed tests and fix before full deployment.');
    } else if (successRate >= 60) {
      console.log('⚠️ FAIR! The system needs some fixes before production.');
      console.log('🔧 Several issues detected that need attention.');
      console.log('📋 Review all failed tests and resolve critical issues.');
    } else {
      console.log('❌ POOR! The system is not ready for production.');
      console.log('🚨 Critical issues detected that must be resolved.');
      console.log('🔧 Major fixes required before deployment.');
    }

    console.log('\n📋 NEXT STEPS:');
    if (successRate >= 80) {
      console.log('1. ✅ Deploy to production environment');
      console.log('2. ✅ Set up monitoring and logging');
      console.log('3. ✅ Configure domain and SSL certificates');
      console.log('4. ✅ Set up backup and recovery procedures');
      console.log('5. ✅ Begin user onboarding process');
    } else {
      console.log('1. 🔧 Fix all failed tests identified above');
      console.log('2. 🔧 Re-run this integration test');
      console.log('3. 🔧 Ensure 90%+ success rate before deployment');
      console.log('4. 🔧 Set up staging environment for testing');
      console.log('5. 🔧 Plan deployment strategy');
    }
  }
}

// Run the complete integration test
async function main() {
  const tester = new CompleteIntegrationTester();
  await tester.runCompleteIntegrationTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CompleteIntegrationTester;
 * 🚀 COMPLETE BACKEND-FRONTEND INTEGRATION TEST
 * Comprehensive test of all systems working together
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3333';
const FRONTEND_URL = 'http://localhost:3003';

class CompleteIntegrationTester {
  constructor() {
    this.authToken = null;
    this.results = {
      infrastructure: {},
      authentication: {},
      tradingSystem: {},
      userManagement: {},
      frontendIntegration: {},
      overall: {}
    };
    this.testStartTime = new Date();
  }

  async runCompleteIntegrationTest() {
    console.log('🚀 COMPLETE BACKEND-FRONTEND INTEGRATION TEST');
    console.log('=' .repeat(70));
    console.log(`⏰ Started at: ${this.testStartTime.toISOString()}`);
    console.log('');

    try {
      // 1. Infrastructure Health Check
      await this.testInfrastructureHealth();
      
      // 2. Authentication System
      await this.testAuthenticationSystem();
      
      if (this.authToken) {
        // 3. Trading System Integration
        await this.testTradingSystemIntegration();
        
        // 4. User Management System
        await this.testUserManagementSystem();
        
        // 5. Frontend Integration
        await this.testFrontendIntegration();
      }
      
      // 6. Generate Comprehensive Report
      await this.generateComprehensiveReport();
      
    } catch (error) {
      console.error('❌ Complete integration test failed:', error.message);
      this.results.overall.status = 'FAILED';
      this.results.overall.error = error.message;
    }
  }

  async testInfrastructureHealth() {
    console.log('🏗️ INFRASTRUCTURE HEALTH CHECK');
    console.log('-' .repeat(50));

    // Backend Health
    try {
      const backendHealth = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      this.results.infrastructure.backend = {
        status: 'SUCCESS',
        responseTime: Date.now() - this.testStartTime,
        data: backendHealth.data
      };
      console.log('✅ Backend Health: OPERATIONAL');
      console.log(`   System: ${backendHealth.data.system}`);
      console.log(`   Services: ${Object.keys(backendHealth.data.services).join(', ')}`);
    } catch (error) {
      this.results.infrastructure.backend = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Backend Health: FAILED');
    }

    // Frontend Accessibility
    try {
      const frontendHealth = await axios.get(`${FRONTEND_URL}/`, { timeout: 5000 });
      this.results.infrastructure.frontend = {
        status: 'SUCCESS',
        statusCode: frontendHealth.status,
        contentType: frontendHealth.headers['content-type']
      };
      console.log('✅ Frontend: ACCESSIBLE');
      console.log(`   Status Code: ${frontendHealth.status}`);
    } catch (error) {
      this.results.infrastructure.frontend = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Frontend: FAILED');
    }

    // API Connectivity
    try {
      const apiStatus = await axios.get(`${BACKEND_URL}/api/status`, { timeout: 5000 });
      this.results.infrastructure.api = {
        status: 'SUCCESS',
        data: apiStatus.data
      };
      console.log('✅ API Status: OPERATIONAL');
      console.log(`   Version: ${apiStatus.data.api_version}`);
      console.log(`   Services: ${Object.keys(apiStatus.data.services).join(', ')}`);
    } catch (error) {
      this.results.infrastructure.api = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ API Status: FAILED');
    }

    console.log('');
  }

  async testAuthenticationSystem() {
    console.log('🔐 AUTHENTICATION SYSTEM TEST');
    console.log('-' .repeat(50));

    try {
      // Test Login
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: 'admin@coinbitclub.com',
        password: 'admin123'
      }, { timeout: 5000 });

      if (loginResponse.data.success && loginResponse.data.accessToken) {
        this.authToken = loginResponse.data.accessToken;
        this.results.authentication.login = {
          status: 'SUCCESS',
          user: loginResponse.data.user,
          tokenReceived: true
        };
        console.log('✅ Login: SUCCESS');
        console.log(`   User: ${loginResponse.data.user.email}`);
        console.log(`   Role: ${loginResponse.data.user.user_type}`);
        console.log(`   Token: ${this.authToken.substring(0, 30)}...`);
      } else {
        this.results.authentication.login = {
          status: 'FAILED',
          error: 'No access token received'
        };
        console.log('❌ Login: FAILED - No access token');
      }

      // Test Token Validation
      if (this.authToken) {
        const validateResponse = await axios.get(`${BACKEND_URL}/api/auth/validate`, {
          headers: { Authorization: `Bearer ${this.authToken}` },
          timeout: 5000
        });

        this.results.authentication.tokenValidation = {
          status: 'SUCCESS',
          data: validateResponse.data
        };
        console.log('✅ Token Validation: SUCCESS');
      }

    } catch (error) {
      this.results.authentication.login = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Authentication: FAILED');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }

    console.log('');
  }

  async testTradingSystemIntegration() {
    console.log('📈 TRADING SYSTEM INTEGRATION TEST');
    console.log('-' .repeat(50));

    if (!this.authToken) {
      console.log('⚠️ Skipping trading tests - no auth token');
      return;
    }

    const headers = { Authorization: `Bearer ${this.authToken}` };

    try {
      // Test Trading Status
      const statusResponse = await axios.get(`${BACKEND_URL}/api/trading/status`, { headers, timeout: 5000 });
      this.results.tradingSystem.status = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Trading Status: SUCCESS');
      console.log(`   Status: ${statusResponse.data.status}`);
      console.log(`   Active Positions: ${statusResponse.data.activePositions}`);

      // Test Market Analysis
      const analysisResponse = await axios.get(`${BACKEND_URL}/api/trading/analysis`, { headers, timeout: 5000 });
      this.results.tradingSystem.analysis = {
        status: 'SUCCESS',
        data: analysisResponse.data
      };
      console.log('✅ Market Analysis: SUCCESS');
      console.log(`   Sentiment: ${analysisResponse.data.analysis.sentiment}`);
      console.log(`   Confidence: ${analysisResponse.data.analysis.confidence}%`);

      // Test Position Management
      const positionsResponse = await axios.get(`${BACKEND_URL}/api/trading/positions`, { headers, timeout: 5000 });
      this.results.tradingSystem.positions = {
        status: 'SUCCESS',
        data: positionsResponse.data
      };
      console.log('✅ Position Management: SUCCESS');

      // Test Open Position
      const openResponse = await axios.post(`${BACKEND_URL}/api/trading/positions`, {
        symbol: 'BTCUSDT',
        side: 'LONG',
        size: 0.001,
        leverage: 5,
        stopLoss: 65000,
        takeProfit: 70000
      }, { headers, timeout: 5000 });

      this.results.tradingSystem.openPosition = {
        status: 'SUCCESS',
        data: openResponse.data
      };
      console.log('✅ Open Position: SUCCESS');
      console.log(`   Position ID: ${openResponse.data.positionId}`);

      // Test Close Position
      const closeResponse = await axios.delete(`${BACKEND_URL}/api/trading/positions/pos_123`, { headers, timeout: 5000 });
      this.results.tradingSystem.closePosition = {
        status: 'SUCCESS',
        data: closeResponse.data
      };
      console.log('✅ Close Position: SUCCESS');

    } catch (error) {
      this.results.tradingSystem.status = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Trading System: FAILED');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }

    console.log('');
  }

  async testUserManagementSystem() {
    console.log('👥 USER MANAGEMENT SYSTEM TEST');
    console.log('-' .repeat(50));

    if (!this.authToken) {
      console.log('⚠️ Skipping user management tests - no auth token');
      return;
    }

    const headers = { Authorization: `Bearer ${this.authToken}` };

    try {
      // Test User Profile
      const profileResponse = await axios.get(`${BACKEND_URL}/api/user/profile`, { headers, timeout: 5000 });
      this.results.userManagement.profile = {
        status: 'SUCCESS',
        data: profileResponse.data
      };
      console.log('✅ User Profile: SUCCESS');
      console.log(`   User ID: ${profileResponse.data.user.id}`);
      console.log(`   Email: ${profileResponse.data.user.email}`);

      // Test User Settings
      const settingsResponse = await axios.get(`${BACKEND_URL}/api/user/settings`, { headers, timeout: 5000 });
      this.results.userManagement.settings = {
        status: 'SUCCESS',
        data: settingsResponse.data
      };
      console.log('✅ User Settings: SUCCESS');

      // Test Update Settings
      const updateResponse = await axios.put(`${BACKEND_URL}/api/user/settings`, {
        trading: { enabled: true, maxPositions: 2 },
        notifications: { email: true, push: true },
        language: 'pt-BR'
      }, { headers, timeout: 5000 });

      this.results.userManagement.updateSettings = {
        status: 'SUCCESS',
        data: updateResponse.data
      };
      console.log('✅ Update Settings: SUCCESS');

      // Test Financial Data
      const balancesResponse = await axios.get(`${BACKEND_URL}/api/financial/balances`, { headers, timeout: 5000 });
      this.results.userManagement.balances = {
        status: 'SUCCESS',
        data: balancesResponse.data
      };
      console.log('✅ Financial Balances: SUCCESS');

    } catch (error) {
      this.results.userManagement.profile = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ User Management: FAILED');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }

    console.log('');
  }

  async testFrontendIntegration() {
    console.log('🌐 FRONTEND INTEGRATION TEST');
    console.log('-' .repeat(50));

    try {
      // Test Main Frontend Pages
      const pages = [
        { name: 'Main Page', url: '/' },
        { name: 'Login Page', url: '/auth/login' },
        { name: 'Integration Test', url: '/test-integration' },
        { name: 'User Operations', url: '/user/operations' }
      ];

      for (const page of pages) {
        try {
          const response = await axios.get(`${FRONTEND_URL}${page.url}`, { timeout: 5000 });
          this.results.frontendIntegration[page.name.toLowerCase().replace(' ', '_')] = {
            status: 'SUCCESS',
            statusCode: response.status,
            title: this.extractTitle(response.data)
          };
          console.log(`✅ ${page.name}: SUCCESS (${response.status})`);
        } catch (error) {
          this.results.frontendIntegration[page.name.toLowerCase().replace(' ', '_')] = {
            status: 'FAILED',
            error: error.message
          };
          console.log(`❌ ${page.name}: FAILED`);
        }
      }

    } catch (error) {
      this.results.frontendIntegration.overall = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Frontend Integration: FAILED');
    }

    console.log('');
  }

  extractTitle(html) {
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1] : 'No title found';
  }

  async generateComprehensiveReport() {
    const testEndTime = new Date();
    const testDuration = testEndTime - this.testStartTime;

    console.log('📋 COMPREHENSIVE INTEGRATION TEST REPORT');
    console.log('=' .repeat(70));
    console.log(`⏰ Test Duration: ${testDuration}ms`);
    console.log(`📅 Completed: ${testEndTime.toISOString()}`);
    console.log('');

    // Calculate overall metrics
    const allTests = [];
    Object.values(this.results).forEach(category => {
      if (typeof category === 'object' && category !== null) {
        Object.values(category).forEach(test => {
          if (test && typeof test === 'object' && 'status' in test) {
            allTests.push(test);
          }
        });
      }
    });

    const passedTests = allTests.filter(test => test.status === 'SUCCESS').length;
    const totalTests = allTests.length;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

    this.results.overall = {
      status: successRate >= 90 ? 'EXCELLENT' : successRate >= 80 ? 'GOOD' : successRate >= 60 ? 'FAIR' : 'POOR',
      successRate: `${successRate}%`,
      passedTests,
      totalTests,
      testDuration: `${testDuration}ms`
    };

    console.log(`🎯 OVERALL STATUS: ${this.results.overall.status}`);
    console.log(`📊 SUCCESS RATE: ${this.results.overall.successRate} (${passedTests}/${totalTests})`);
    console.log(`⏱️ TEST DURATION: ${testDuration}ms`);
    console.log('');

    // Detailed Results by Category
    console.log('📝 DETAILED RESULTS BY CATEGORY');
    console.log('-' .repeat(50));

    Object.entries(this.results).forEach(([category, tests]) => {
      if (category === 'overall') return;
      
      console.log(`\n🏷️ ${category.toUpperCase().replace('_', ' ')}:`);
      if (typeof tests === 'object' && tests !== null) {
        Object.entries(tests).forEach(([testName, result]) => {
          if (result && typeof result === 'object' && 'status' in result) {
            const status = result.status === 'SUCCESS' ? '✅' : '❌';
            console.log(`  ${status} ${testName}: ${result.status}`);
          }
        });
      }
    });

    console.log('\n🎉 COMPLETE INTEGRATION TEST FINISHED!');
    console.log('');

    // Final Assessment
    if (successRate >= 90) {
      console.log('🚀 EXCELLENT! The system is PRODUCTION READY!');
      console.log('💡 All major components are working perfectly together.');
      console.log('🎯 Ready for deployment and user onboarding.');
    } else if (successRate >= 80) {
      console.log('✅ GOOD! The system is mostly ready for production.');
      console.log('⚠️ Some minor issues detected but core functionality works.');
      console.log('🔧 Review failed tests and fix before full deployment.');
    } else if (successRate >= 60) {
      console.log('⚠️ FAIR! The system needs some fixes before production.');
      console.log('🔧 Several issues detected that need attention.');
      console.log('📋 Review all failed tests and resolve critical issues.');
    } else {
      console.log('❌ POOR! The system is not ready for production.');
      console.log('🚨 Critical issues detected that must be resolved.');
      console.log('🔧 Major fixes required before deployment.');
    }

    console.log('\n📋 NEXT STEPS:');
    if (successRate >= 80) {
      console.log('1. ✅ Deploy to production environment');
      console.log('2. ✅ Set up monitoring and logging');
      console.log('3. ✅ Configure domain and SSL certificates');
      console.log('4. ✅ Set up backup and recovery procedures');
      console.log('5. ✅ Begin user onboarding process');
    } else {
      console.log('1. 🔧 Fix all failed tests identified above');
      console.log('2. 🔧 Re-run this integration test');
      console.log('3. 🔧 Ensure 90%+ success rate before deployment');
      console.log('4. 🔧 Set up staging environment for testing');
      console.log('5. 🔧 Plan deployment strategy');
    }
  }
}

// Run the complete integration test
async function main() {
  const tester = new CompleteIntegrationTester();
  await tester.runCompleteIntegrationTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CompleteIntegrationTester;
 * 🚀 COMPLETE BACKEND-FRONTEND INTEGRATION TEST
 * Comprehensive test of all systems working together
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3333';
const FRONTEND_URL = 'http://localhost:3003';

class CompleteIntegrationTester {
  constructor() {
    this.authToken = null;
    this.results = {
      infrastructure: {},
      authentication: {},
      tradingSystem: {},
      userManagement: {},
      frontendIntegration: {},
      overall: {}
    };
    this.testStartTime = new Date();
  }

  async runCompleteIntegrationTest() {
    console.log('🚀 COMPLETE BACKEND-FRONTEND INTEGRATION TEST');
    console.log('=' .repeat(70));
    console.log(`⏰ Started at: ${this.testStartTime.toISOString()}`);
    console.log('');

    try {
      // 1. Infrastructure Health Check
      await this.testInfrastructureHealth();
      
      // 2. Authentication System
      await this.testAuthenticationSystem();
      
      if (this.authToken) {
        // 3. Trading System Integration
        await this.testTradingSystemIntegration();
        
        // 4. User Management System
        await this.testUserManagementSystem();
        
        // 5. Frontend Integration
        await this.testFrontendIntegration();
      }
      
      // 6. Generate Comprehensive Report
      await this.generateComprehensiveReport();
      
    } catch (error) {
      console.error('❌ Complete integration test failed:', error.message);
      this.results.overall.status = 'FAILED';
      this.results.overall.error = error.message;
    }
  }

  async testInfrastructureHealth() {
    console.log('🏗️ INFRASTRUCTURE HEALTH CHECK');
    console.log('-' .repeat(50));

    // Backend Health
    try {
      const backendHealth = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      this.results.infrastructure.backend = {
        status: 'SUCCESS',
        responseTime: Date.now() - this.testStartTime,
        data: backendHealth.data
      };
      console.log('✅ Backend Health: OPERATIONAL');
      console.log(`   System: ${backendHealth.data.system}`);
      console.log(`   Services: ${Object.keys(backendHealth.data.services).join(', ')}`);
    } catch (error) {
      this.results.infrastructure.backend = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Backend Health: FAILED');
    }

    // Frontend Accessibility
    try {
      const frontendHealth = await axios.get(`${FRONTEND_URL}/`, { timeout: 5000 });
      this.results.infrastructure.frontend = {
        status: 'SUCCESS',
        statusCode: frontendHealth.status,
        contentType: frontendHealth.headers['content-type']
      };
      console.log('✅ Frontend: ACCESSIBLE');
      console.log(`   Status Code: ${frontendHealth.status}`);
    } catch (error) {
      this.results.infrastructure.frontend = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Frontend: FAILED');
    }

    // API Connectivity
    try {
      const apiStatus = await axios.get(`${BACKEND_URL}/api/status`, { timeout: 5000 });
      this.results.infrastructure.api = {
        status: 'SUCCESS',
        data: apiStatus.data
      };
      console.log('✅ API Status: OPERATIONAL');
      console.log(`   Version: ${apiStatus.data.api_version}`);
      console.log(`   Services: ${Object.keys(apiStatus.data.services).join(', ')}`);
    } catch (error) {
      this.results.infrastructure.api = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ API Status: FAILED');
    }

    console.log('');
  }

  async testAuthenticationSystem() {
    console.log('🔐 AUTHENTICATION SYSTEM TEST');
    console.log('-' .repeat(50));

    try {
      // Test Login
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: 'admin@coinbitclub.com',
        password: 'admin123'
      }, { timeout: 5000 });

      if (loginResponse.data.success && loginResponse.data.accessToken) {
        this.authToken = loginResponse.data.accessToken;
        this.results.authentication.login = {
          status: 'SUCCESS',
          user: loginResponse.data.user,
          tokenReceived: true
        };
        console.log('✅ Login: SUCCESS');
        console.log(`   User: ${loginResponse.data.user.email}`);
        console.log(`   Role: ${loginResponse.data.user.user_type}`);
        console.log(`   Token: ${this.authToken.substring(0, 30)}...`);
      } else {
        this.results.authentication.login = {
          status: 'FAILED',
          error: 'No access token received'
        };
        console.log('❌ Login: FAILED - No access token');
      }

      // Test Token Validation
      if (this.authToken) {
        const validateResponse = await axios.get(`${BACKEND_URL}/api/auth/validate`, {
          headers: { Authorization: `Bearer ${this.authToken}` },
          timeout: 5000
        });

        this.results.authentication.tokenValidation = {
          status: 'SUCCESS',
          data: validateResponse.data
        };
        console.log('✅ Token Validation: SUCCESS');
      }

    } catch (error) {
      this.results.authentication.login = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Authentication: FAILED');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }

    console.log('');
  }

  async testTradingSystemIntegration() {
    console.log('📈 TRADING SYSTEM INTEGRATION TEST');
    console.log('-' .repeat(50));

    if (!this.authToken) {
      console.log('⚠️ Skipping trading tests - no auth token');
      return;
    }

    const headers = { Authorization: `Bearer ${this.authToken}` };

    try {
      // Test Trading Status
      const statusResponse = await axios.get(`${BACKEND_URL}/api/trading/status`, { headers, timeout: 5000 });
      this.results.tradingSystem.status = {
        status: 'SUCCESS',
        data: statusResponse.data
      };
      console.log('✅ Trading Status: SUCCESS');
      console.log(`   Status: ${statusResponse.data.status}`);
      console.log(`   Active Positions: ${statusResponse.data.activePositions}`);

      // Test Market Analysis
      const analysisResponse = await axios.get(`${BACKEND_URL}/api/trading/analysis`, { headers, timeout: 5000 });
      this.results.tradingSystem.analysis = {
        status: 'SUCCESS',
        data: analysisResponse.data
      };
      console.log('✅ Market Analysis: SUCCESS');
      console.log(`   Sentiment: ${analysisResponse.data.analysis.sentiment}`);
      console.log(`   Confidence: ${analysisResponse.data.analysis.confidence}%`);

      // Test Position Management
      const positionsResponse = await axios.get(`${BACKEND_URL}/api/trading/positions`, { headers, timeout: 5000 });
      this.results.tradingSystem.positions = {
        status: 'SUCCESS',
        data: positionsResponse.data
      };
      console.log('✅ Position Management: SUCCESS');

      // Test Open Position
      const openResponse = await axios.post(`${BACKEND_URL}/api/trading/positions`, {
        symbol: 'BTCUSDT',
        side: 'LONG',
        size: 0.001,
        leverage: 5,
        stopLoss: 65000,
        takeProfit: 70000
      }, { headers, timeout: 5000 });

      this.results.tradingSystem.openPosition = {
        status: 'SUCCESS',
        data: openResponse.data
      };
      console.log('✅ Open Position: SUCCESS');
      console.log(`   Position ID: ${openResponse.data.positionId}`);

      // Test Close Position
      const closeResponse = await axios.delete(`${BACKEND_URL}/api/trading/positions/pos_123`, { headers, timeout: 5000 });
      this.results.tradingSystem.closePosition = {
        status: 'SUCCESS',
        data: closeResponse.data
      };
      console.log('✅ Close Position: SUCCESS');

    } catch (error) {
      this.results.tradingSystem.status = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ Trading System: FAILED');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }

    console.log('');
  }

  async testUserManagementSystem() {
    console.log('👥 USER MANAGEMENT SYSTEM TEST');
    console.log('-' .repeat(50));

    if (!this.authToken) {
      console.log('⚠️ Skipping user management tests - no auth token');
      return;
    }

    const headers = { Authorization: `Bearer ${this.authToken}` };

    try {
      // Test User Profile
      const profileResponse = await axios.get(`${BACKEND_URL}/api/user/profile`, { headers, timeout: 5000 });
      this.results.userManagement.profile = {
        status: 'SUCCESS',
        data: profileResponse.data
      };
      console.log('✅ User Profile: SUCCESS');
      console.log(`   User ID: ${profileResponse.data.user.id}`);
      console.log(`   Email: ${profileResponse.data.user.email}`);

      // Test User Settings
      const settingsResponse = await axios.get(`${BACKEND_URL}/api/user/settings`, { headers, timeout: 5000 });
      this.results.userManagement.settings = {
        status: 'SUCCESS',
        data: settingsResponse.data
      };
      console.log('✅ User Settings: SUCCESS');

      // Test Update Settings
      const updateResponse = await axios.put(`${BACKEND_URL}/api/user/settings`, {
        trading: { enabled: true, maxPositions: 2 },
        notifications: { email: true, push: true },
        language: 'pt-BR'
      }, { headers, timeout: 5000 });

      this.results.userManagement.updateSettings = {
        status: 'SUCCESS',
        data: updateResponse.data
      };
      console.log('✅ Update Settings: SUCCESS');

      // Test Financial Data
      const balancesResponse = await axios.get(`${BACKEND_URL}/api/financial/balances`, { headers, timeout: 5000 });
      this.results.userManagement.balances = {
        status: 'SUCCESS',
        data: balancesResponse.data
      };
      console.log('✅ Financial Balances: SUCCESS');

    } catch (error) {
      this.results.userManagement.profile = {
        status: 'FAILED',
        error: error.response?.data?.error || error.message
      };
      console.log('❌ User Management: FAILED');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }

    console.log('');
  }

  async testFrontendIntegration() {
    console.log('🌐 FRONTEND INTEGRATION TEST');
    console.log('-' .repeat(50));

    try {
      // Test Main Frontend Pages
      const pages = [
        { name: 'Main Page', url: '/' },
        { name: 'Login Page', url: '/auth/login' },
        { name: 'Integration Test', url: '/test-integration' },
        { name: 'User Operations', url: '/user/operations' }
      ];

      for (const page of pages) {
        try {
          const response = await axios.get(`${FRONTEND_URL}${page.url}`, { timeout: 5000 });
          this.results.frontendIntegration[page.name.toLowerCase().replace(' ', '_')] = {
            status: 'SUCCESS',
            statusCode: response.status,
            title: this.extractTitle(response.data)
          };
          console.log(`✅ ${page.name}: SUCCESS (${response.status})`);
        } catch (error) {
          this.results.frontendIntegration[page.name.toLowerCase().replace(' ', '_')] = {
            status: 'FAILED',
            error: error.message
          };
          console.log(`❌ ${page.name}: FAILED`);
        }
      }

    } catch (error) {
      this.results.frontendIntegration.overall = {
        status: 'FAILED',
        error: error.message
      };
      console.log('❌ Frontend Integration: FAILED');
    }

    console.log('');
  }

  extractTitle(html) {
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1] : 'No title found';
  }

  async generateComprehensiveReport() {
    const testEndTime = new Date();
    const testDuration = testEndTime - this.testStartTime;

    console.log('📋 COMPREHENSIVE INTEGRATION TEST REPORT');
    console.log('=' .repeat(70));
    console.log(`⏰ Test Duration: ${testDuration}ms`);
    console.log(`📅 Completed: ${testEndTime.toISOString()}`);
    console.log('');

    // Calculate overall metrics
    const allTests = [];
    Object.values(this.results).forEach(category => {
      if (typeof category === 'object' && category !== null) {
        Object.values(category).forEach(test => {
          if (test && typeof test === 'object' && 'status' in test) {
            allTests.push(test);
          }
        });
      }
    });

    const passedTests = allTests.filter(test => test.status === 'SUCCESS').length;
    const totalTests = allTests.length;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

    this.results.overall = {
      status: successRate >= 90 ? 'EXCELLENT' : successRate >= 80 ? 'GOOD' : successRate >= 60 ? 'FAIR' : 'POOR',
      successRate: `${successRate}%`,
      passedTests,
      totalTests,
      testDuration: `${testDuration}ms`
    };

    console.log(`🎯 OVERALL STATUS: ${this.results.overall.status}`);
    console.log(`📊 SUCCESS RATE: ${this.results.overall.successRate} (${passedTests}/${totalTests})`);
    console.log(`⏱️ TEST DURATION: ${testDuration}ms`);
    console.log('');

    // Detailed Results by Category
    console.log('📝 DETAILED RESULTS BY CATEGORY');
    console.log('-' .repeat(50));

    Object.entries(this.results).forEach(([category, tests]) => {
      if (category === 'overall') return;
      
      console.log(`\n🏷️ ${category.toUpperCase().replace('_', ' ')}:`);
      if (typeof tests === 'object' && tests !== null) {
        Object.entries(tests).forEach(([testName, result]) => {
          if (result && typeof result === 'object' && 'status' in result) {
            const status = result.status === 'SUCCESS' ? '✅' : '❌';
            console.log(`  ${status} ${testName}: ${result.status}`);
          }
        });
      }
    });

    console.log('\n🎉 COMPLETE INTEGRATION TEST FINISHED!');
    console.log('');

    // Final Assessment
    if (successRate >= 90) {
      console.log('🚀 EXCELLENT! The system is PRODUCTION READY!');
      console.log('💡 All major components are working perfectly together.');
      console.log('🎯 Ready for deployment and user onboarding.');
    } else if (successRate >= 80) {
      console.log('✅ GOOD! The system is mostly ready for production.');
      console.log('⚠️ Some minor issues detected but core functionality works.');
      console.log('🔧 Review failed tests and fix before full deployment.');
    } else if (successRate >= 60) {
      console.log('⚠️ FAIR! The system needs some fixes before production.');
      console.log('🔧 Several issues detected that need attention.');
      console.log('📋 Review all failed tests and resolve critical issues.');
    } else {
      console.log('❌ POOR! The system is not ready for production.');
      console.log('🚨 Critical issues detected that must be resolved.');
      console.log('🔧 Major fixes required before deployment.');
    }

    console.log('\n📋 NEXT STEPS:');
    if (successRate >= 80) {
      console.log('1. ✅ Deploy to production environment');
      console.log('2. ✅ Set up monitoring and logging');
      console.log('3. ✅ Configure domain and SSL certificates');
      console.log('4. ✅ Set up backup and recovery procedures');
      console.log('5. ✅ Begin user onboarding process');
    } else {
      console.log('1. 🔧 Fix all failed tests identified above');
      console.log('2. 🔧 Re-run this integration test');
      console.log('3. 🔧 Ensure 90%+ success rate before deployment');
      console.log('4. 🔧 Set up staging environment for testing');
      console.log('5. 🔧 Plan deployment strategy');
    }
  }
}

// Run the complete integration test
async function main() {
  const tester = new CompleteIntegrationTester();
  await tester.runCompleteIntegrationTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CompleteIntegrationTester;
