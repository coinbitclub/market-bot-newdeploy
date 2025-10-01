# 🔑 Personal API Keys Implementation Guide

## Overview

This guide covers the complete implementation of **per-user API key** support for Bybit and Binance exchanges. The system operates in **PERSONAL mode ONLY**:

- **PERSONAL mode**: Users MUST use their own Bybit/Binance API keys
- No pooled/admin trading available
- Users maintain full control of their funds
- Platform provides trading signals and automation

---

## 🏗️ Architecture

### Trading Mode: PERSONAL ONLY

**PERSONAL Trading** (Only Option)
- Users provide their own API keys via user/settings
- Trades executed directly on user's exchange account
- User maintains full control of funds
- Platform never holds user funds
- Platform provides signals and automation
- Users see trades on their own Bybit/Binance accounts

**Key Difference from Pooled Trading**:
- No admin/platform API keys used
- No custody of user funds
- Each user trades independently on their own exchange account
- Simpler regulatory compliance

---

## 📋 Implementation Steps

### Step 1: Database Migration (5 minutes)

Run the migration to add API key columns:

```bash
cd market-bot-newdeploy
psql $DATABASE_URL -f migrations/add-user-api-keys.sql
```

**What it adds:**
- `bybit_api_key`, `bybit_api_secret_encrypted` (encrypted)
- `binance_api_key`, `binance_api_secret_encrypted` (encrypted)
- `trading_mode` (POOLED/PERSONAL/HYBRID)
- Audit tables for security logging
- Permissions tracking table

---

### Step 2: Configure Encryption Key

**CRITICAL**: Set a strong encryption key in `.env`:

```bash
# Generate secure encryption key (run this once)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
ENCRYPTION_KEY=<your_generated_64_char_key>
```

**Security Notes**:
- Keep this key SECRET and SECURE
- NEVER commit to git
- Losing this key = losing ability to decrypt user API secrets
- Use a different key for dev/staging/production

---

### Step 3: Add Routes to Main Router

Edit `src/routes/index.js`:

```javascript
// Add at the top
const UserAPIKeysRoutes = require('./user-api-keys');

// Inside router class
const userAPIKeysRoutes = new UserAPIKeysRoutes();

// In setDbPoolManager function
const setDbPoolManager = (dbPoolManager) => {
    // ... existing routes ...
    userAPIKeysRoutes.setDbPoolManager(dbPoolManager);
};

// Add the route
router.use('/user-api-keys', userAPIKeysRoutes.getRouter());
```

---

### Step 4: Update TradingView Webhook Handler

Edit `src/routes/tradingview-webhook.js`:

```javascript
const BalanceTradingEngine = require('../trading/balance-based/balance-trading-engine');
const PersonalTradingEngine = require('../trading/personal-api/personal-trading-engine');

class TradingViewWebhookRoutes {
    constructor() {
        this.router = express.Router();
        this.balanceTradingEngine = null;
        this.personalTradingEngine = null; // NEW
        this.setupRoutes();
    }

    setDbPoolManager(dbPoolManager) {
        this.balanceTradingEngine = new BalanceTradingEngine(dbPoolManager);
        this.personalTradingEngine = new PersonalTradingEngine(dbPoolManager); // NEW
    }

    async handleTradingViewSignal(req, res) {
        // ... validation ...

        // NEW: Execute based on users' trading modes
        const [pooledResult, personalResult] = await Promise.all([
            this.balanceTradingEngine.processSignalForAllUsers(signal),
            this.personalTradingEngine.processSignalForAllUsers(signal)
        ]);

        // Combine results
        const finalResult = {
            success: true,
            pooledTrades: pooledResult.executedTrades || [],
            personalTrades: personalResult.executedTrades || [],
            totalTrades: (pooledResult.executedTrades?.length || 0) + (personalResult.executedTrades?.length || 0)
        };

        res.json(finalResult);
    }
}
```

---

## 🔐 Security Best Practices

### 1. **Encryption**
- ✅ API secrets encrypted with AES-256-GCM
- ✅ Unique IV per encryption
- ✅ Authentication tags prevent tampering
- ✅ Keys never stored in plaintext

### 2. **API Key Storage**
- ✅ API **key** stored as-is (not sensitive, just identifier)
- ✅ API **secret** encrypted before storage
- ✅ Decryption only happens during trade execution
- ✅ Never logged or exposed in API responses

### 3. **Audit Trail**
- ✅ All API key actions logged
- ✅ IP addresses tracked
- ✅ Timestamps recorded
- ✅ Failed verification attempts logged

### 4. **Permissions Checking**
- ✅ API keys verified before first use
- ✅ Permissions checked (read/trade/withdraw)
- ✅ Regular re-verification (recommended: daily)
- ✅ Disabled automatically on verification failure

---

## 📡 API Endpoints

### User API Key Management

**Base URL**: `/api/user-api-keys`

All endpoints require authentication (JWT token).

#### 1. Save API Key

```bash
POST /api/user-api-keys/{exchange}

# Request
{
  "apiKey": "your_api_key_here",
  "apiSecret": "your_api_secret_here"
}

# Response
{
  "success": true,
  "message": "API key saved successfully",
  "masked_key": "9dUV...VKMh"
}
```

#### 2. Verify API Key

```bash
POST /api/user-api-keys/{exchange}/verify

# Response
{
  "success": true,
  "message": "API key verified successfully",
  "permissions": {
    "can_read": true,
    "can_trade": true,
    "can_withdraw": false
  }
}
```

#### 3. Get API Key Status

```bash
GET /api/user-api-keys/{exchange}/status

# Response
{
  "success": true,
  "has_key": true,
  "masked_key": "9dUV...VKMh",
  "enabled": true,
  "verified": true,
  "verified_at": "2025-10-01T10:00:00Z"
}
```

#### 4. Delete API Key

```bash
DELETE /api/user-api-keys/{exchange}

# Response
{
  "success": true,
  "message": "API key deleted successfully"
}
```

#### 5. Get All Keys Status

```bash
GET /api/user-api-keys/all/status

# Response
{
  "success": true,
  "tradingMode": "PERSONAL",
  "exchanges": {
    "bybit": {
      "has_key": true,
      "masked_key": "9dUV...VKMh",
      "enabled": true,
      "verified": true
    },
    "binance": {
      "has_key": false
    }
  }
}
```

#### 6. Set Trading Mode

```bash
POST /api/user-api-keys/trading-mode

# Request
{
  "mode": "PERSONAL"  # POOLED, PERSONAL, or HYBRID
}

# Response
{
  "success": true,
  "message": "Trading mode set to PERSONAL"
}
```

---

## 👤 User Guide: How to Get API Keys

### For Bybit

1. Login to [Bybit](https://www.bybit.com/)
2. Go to **API** section
3. Click **Create New Key**
4. Configure permissions:
   - ✅ **Read**: Enable
   - ✅ **Trade**: Enable
   - ❌ **Withdraw**: Disable (for security)
5. Copy **API Key** and **Secret Key**
6. Paste into CoinBitClub dashboard

**Important Bybit Settings**:
- IP Whitelist: Add your server IP (or leave unrestricted for now)
- Testnet vs Mainnet: Make sure to use **mainnet keys** for production

### For Binance

1. Login to [Binance](https://www.binance.com/)
2. Go to **API Management**
3. Click **Create API**
4. Complete security verification (2FA)
5. Set API restrictions:
   - ✅ **Enable Reading**: Yes
   - ✅ **Enable Spot & Margin Trading**: Yes
   - ❌ **Enable Withdrawals**: No
6. IP Access Restriction: Add your server IP
7. Copy **API Key** (64 chars) and **Secret Key**
8. Paste into CoinBitClub dashboard

**Important Binance Settings**:
- API keys are **exactly 64 characters** (validate before saving)
- IP whitelisting is **required** for security

---

## 🧪 Testing

### Test Encryption Service

```bash
cd market-bot-newdeploy
node -e "
const encryption = require('./src/services/security/api-key-encryption');

// Test encryption/decryption
const secret = 'my_api_secret_12345';
const encrypted = encryption.encrypt(secret);
console.log('Encrypted:', encrypted);

const decrypted = encryption.decrypt(encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', secret === decrypted);

// Test validation
const bybitValidation = encryption.validateAPIKeyFormat('9dUVCpuUQJnx6sVKMh', 'bybit');
console.log('Bybit validation:', bybitValidation);

const binanceKey = 'a'.repeat(64);
const binanceValidation = encryption.validateAPIKeyFormat(binanceKey, 'binance');
console.log('Binance validation:', binanceValidation);
"
```

### Test API Key Manager

```bash
# Requires database connection
node -e "
const ConnectionPoolManager = require('./src/database/connection-pool-manager');
const UserAPIKeyManager = require('./src/services/user-api-keys/user-api-key-manager');

(async () => {
    const db = new ConnectionPoolManager();
    const manager = new UserAPIKeyManager(db);

    // Test saving key
    const result = await manager.saveAPIKey(8, 'bybit', '9dUVCpuUQJnx6sVKMh', 'L64UuvW1OWr587tmAoHK3cRzK7BMsLDqPG5k');
    console.log('Save result:', result);

    // Test retrieving key
    const credentials = await manager.getAPICredentials(8, 'bybit');
    console.log('Credentials:', credentials);

    await db.closeAll();
})();
"
```

---

## 🚀 Deployment Checklist

### Before Production

- [ ] Run database migration
- [ ] Set strong `ENCRYPTION_KEY` in production `.env`
- [ ] Test encryption/decryption with production key
- [ ] Update main router to include API key routes
- [ ] Update webhook handler to use both engines
- [ ] Test with real Bybit testnet keys
- [ ] Test with real Binance testnet keys
- [ ] Set up monitoring for API key verification failures

### Security Checklist

- [ ] `.env` file not committed to git
- [ ] Encryption key backed up securely (offline)
- [ ] API secrets never logged
- [ ] HTTPS enforced for all API calls
- [ ] Rate limiting enabled on API key endpoints
- [ ] JWT authentication required for all key management
- [ ] Audit logs being written
- [ ] Failed verification attempts monitored

---

## ⚖️ PERSONAL Mode Benefits

| Feature | Details |
|---------|---------|
| **Setup Complexity** | ⚠️ Requires API key configuration (one-time setup) |
| **User Control** | ✅ User holds funds on their own exchange account |
| **Security** | ✅ User control, no platform custody risk |
| **Execution** | Individual orders per user on their account |
| **Fees** | Standard exchange rates (user's own account) |
| **Regulatory** | ✅ Simpler (no custody, no money transmission) |
| **Transparency** | ✅ Users see trades directly on their exchange |

---

## 📊 System Configuration

**PERSONAL Mode Only**:
- All users must connect Bybit/Binance API keys
- Users need to create their own exchange accounts
- Users maintain sufficient balance on their exchange account
- Platform provides signals and automation
- No platform custody of funds
- Simpler regulatory compliance

---

## 🔧 Troubleshooting

### "Encryption failed"
- Check `ENCRYPTION_KEY` is set in `.env`
- Ensure key is 64 characters (32 bytes hex)

### "API key verification failed"
- Check IP whitelist on exchange
- Verify API key format (Binance = 64 chars)
- Ensure permissions enabled (Read + Trade)

### "Cannot decrypt API secret"
- Encryption key may have changed
- Database value may be corrupted
- Ask user to re-enter API key

### "Timestamp error"
- Server clock not synchronized
- User's exchange may be in different timezone
- Enable NTP on server

---

## 📚 Additional Resources

- [Bybit API Documentation](https://bybit-exchange.github.io/docs/v5/intro)
- [Binance API Documentation](https://binance-docs.github.io/apidocs/spot/en/)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)

---

## 🎯 Summary

**You now have a complete, production-ready system** for per-user API keys with:

✅ Secure AES-256-GCM encryption
✅ PERSONAL mode ONLY (no pooled/admin trading)
✅ Complete API management endpoints
✅ Audit logging and security tracking
✅ Exchange verification and permissions
✅ Personal trading engine using user's own API keys

**Next Steps**:
1. Run database migration
2. Set encryption key
3. Add routes to main router
4. Test with testnet keys
5. Deploy to production
6. Create user onboarding guide

The system requires users to connect their own Bybit/Binance accounts, ensuring they maintain full control while the platform provides trading signals and automation!
