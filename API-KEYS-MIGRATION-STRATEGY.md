# 🔄 API Keys Migration Strategy

## ⚠️ CRITICAL ISSUE DISCOVERED

There are **TWO SYSTEMS** managing API keys:

### 1. OLD System (Insecure - PLAINTEXT)
```
Endpoint: /api/user-settings/api-keys
File: src/routes/users.js (getApiKeys, addApiKey, updateApiKey, deleteApiKey)
Storage: user_api_keys table
Security: ❌ PLAINTEXT api_secret (line 677)
```

### 2. NEW System (Secure - ENCRYPTED)
```
Endpoint: /api/user-api-keys
File: src/routes/user-api-keys.js
Storage: user_api_keys table (SAME TABLE)
Security: ✅ AES-256-GCM encrypted api_secret
Features: Audit logging, permissions tracking, verification
```

## 🚨 **PROBLEM:**

Both systems use the **SAME TABLE** (`user_api_keys`) but handle encryption differently:
- **Old System:** Stores plaintext → reads plaintext
- **New System:** Stores encrypted → reads encrypted

**This BREAKS backward compatibility!**

---

## 💡 Solution Options

### Option 1: Replace Old System (RECOMMENDED)
**Update** `/api/user-settings/api-keys` to use the new encrypted manager.

**Pros:**
- ✅ Single source of truth
- ✅ All API keys encrypted
- ✅ Consistent security
- ✅ Audit logging everywhere

**Cons:**
- ⚠️ Need to update existing frontend code
- ⚠️ Need to migrate any existing plaintext keys

**Implementation:**
```javascript
// In src/routes/users.js

// Replace methods with encrypted version
async getApiKeys(req, res) {
    // Use UserAPIKeyManager instead of direct DB query
    const status = await this.apiKeyManager.getAPIKeyStatus(req.user.id, 'all');
    return res.json({ success: true, apiKeys: status });
}

async addApiKey(req, res) {
    // Use UserAPIKeyManager.saveAPIKey (with encryption)
    const result = await this.apiKeyManager.saveAPIKey(
        req.user.id,
        req.body.exchange,
        req.body.api_key,
        req.body.api_secret
    );
    return res.json(result);
}
```

---

### Option 2: Keep Both Systems (NOT RECOMMENDED)
Keep old system for backward compat, but deprecate it.

**Pros:**
- ✅ No immediate frontend changes

**Cons:**
- ❌ Two systems doing the same thing
- ❌ Security confusion (which is encrypted?)
- ❌ Maintenance nightmare
- ❌ Inconsistent data

---

### Option 3: Hybrid Migration (RECOMMENDED FOR PRODUCTION)

**Phase 1:** Migrate data
1. Detect plaintext API secrets in `user_api_keys`
2. Encrypt them using the encryption service
3. Update in place

**Phase 2:** Update old endpoints
1. Keep old endpoint paths (`/api/user-settings/api-keys`)
2. Replace implementation to use `UserAPIKeyManager`
3. Frontend continues working without changes

**Phase 3:** Deprecate
1. Add deprecation warnings to old endpoints
2. Migrate frontend to new endpoints
3. Remove old code after transition

---

## 🛠️ RECOMMENDED IMPLEMENTATION

### Step 1: Encrypt Existing Data

```sql
-- Check if there are any existing plaintext keys
SELECT id, user_id, exchange,
       api_key,
       LENGTH(api_secret) as secret_length,
       api_secret LIKE '%:%:%' as is_encrypted
FROM user_api_keys;

-- If any exist and are plaintext (is_encrypted = false), they need migration
```

Create migration script:
```javascript
// migrate-api-keys-encryption.js
const apiKeyEncryption = require('./src/services/security/api-key-encryption');
const { Pool } = require('pg');

async function migrateAPIKeys() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Get all API keys
    const result = await pool.query(`
        SELECT id, api_secret
        FROM user_api_keys
        WHERE api_secret NOT LIKE '%:%:%'
    `);

    console.log(`Found ${result.rows.length} plaintext API secrets to encrypt`);

    for (const row of result.rows) {
        try {
            // Encrypt
            const encrypted = apiKeyEncryption.encrypt(row.api_secret);

            // Update
            await pool.query(
                'UPDATE user_api_keys SET api_secret = $1 WHERE id = $2',
                [encrypted, row.id]
            );

            console.log(`✅ Encrypted API key ID ${row.id}`);
        } catch (error) {
            console.error(`❌ Failed to encrypt key ID ${row.id}:`, error.message);
        }
    }

    await pool.end();
    console.log('✅ Migration complete');
}

migrateAPIKeys();
```

### Step 2: Update Old Endpoints

**File:** `src/routes/users.js`

```javascript
// At the top, import the encrypted manager
const UserAPIKeyManager = require('../services/user-api-keys/user-api-key-manager');

class UserSettingsRoutes {
    constructor(authMiddleware) {
        this.authMiddleware = authMiddleware;
        this.router = express.Router();

        // Initialize API key manager (will be set when DB pool manager is available)
        this.apiKeyManager = null;

        this.setupRoutes();
    }

    setDbPoolManager(dbPoolManager) {
        this.dbPoolManager = dbPoolManager;
        // Initialize encrypted API key manager
        this.apiKeyManager = new UserAPIKeyManager(dbPoolManager);
    }

    /**
     * GET /api-keys - Get user API keys (UPDATED TO USE ENCRYPTION)
     */
    async getApiKeys(req, res) {
        try {
            // Get status for both exchanges
            const bybitStatus = await this.apiKeyManager.getAPIKeyStatus(req.user.id, 'bybit');
            const binanceStatus = await this.apiKeyManager.getAPIKeyStatus(req.user.id, 'binance');

            const apiKeys = [];

            if (bybitStatus.has_key) {
                apiKeys.push({
                    id: 'bybit',
                    exchange: 'BYBIT',
                    api_key: bybitStatus.masked_key,
                    environment: 'mainnet', // or testnet based on your logic
                    is_active: bybitStatus.enabled,
                    is_valid: bybitStatus.verified,
                    last_validated_at: bybitStatus.verified_at
                });
            }

            if (binanceStatus.has_key) {
                apiKeys.push({
                    id: 'binance',
                    exchange: 'BINANCE',
                    api_key: binanceStatus.masked_key,
                    environment: 'mainnet',
                    is_active: binanceStatus.enabled,
                    is_valid: binanceStatus.verified,
                    last_validated_at: binanceStatus.verified_at
                });
            }

            res.json({
                success: true,
                apiKeys: apiKeys
            });
        } catch (error) {
            console.error('❌ Get API keys error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get API keys'
            });
        }
    }

    /**
     * POST /api-keys - Add new API key (UPDATED TO USE ENCRYPTION)
     */
    async addApiKey(req, res) {
        try {
            const { exchange, api_key, api_secret } = req.body;

            if (!exchange || !api_key || !api_secret) {
                return res.status(400).json({
                    success: false,
                    error: 'Exchange, API key, and secret are required'
                });
            }

            // Use encrypted API key manager
            const result = await this.apiKeyManager.saveAPIKey(
                req.user.id,
                exchange.toLowerCase(),
                api_key,
                api_secret
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Verify immediately
            await this.apiKeyManager.verifyAPIKey(req.user.id, exchange.toLowerCase());

            res.json({
                success: true,
                message: 'API key added and verified successfully',
                apiKey: {
                    exchange: exchange.toUpperCase(),
                    api_key: result.masked_key
                }
            });
        } catch (error) {
            console.error('❌ Add API key error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to add API key'
            });
        }
    }

    /**
     * DELETE /api-keys/:id - Delete API key (UPDATED)
     */
    async deleteApiKey(req, res) {
        try {
            const exchange = req.params.id.toLowerCase(); // id is actually exchange name

            const result = await this.apiKeyManager.deleteAPIKey(req.user.id, exchange);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json({
                success: true,
                message: 'API key deleted successfully'
            });
        } catch (error) {
            console.error('❌ Delete API key error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete API key'
            });
        }
    }
}
```

### Step 3: Test Migration

```bash
# 1. Encrypt any existing plaintext keys
node migrate-api-keys-encryption.js

# 2. Restart server
npm start

# 3. Test old endpoints with encryption
curl http://localhost:3333/api/user-settings/api-keys \
  -H "Authorization: Bearer JWT_TOKEN"

# Should return encrypted keys (masked)
```

---

## 📋 Migration Checklist

### Phase 1: Data Migration
- [ ] Create migration script (`migrate-api-keys-encryption.js`)
- [ ] Run on staging first
- [ ] Verify all keys encrypted (`SELECT api_secret LIKE '%:%:%' as encrypted`)
- [ ] Backup database before production
- [ ] Run on production
- [ ] Verify production data

### Phase 2: Code Update
- [ ] Update `src/routes/users.js` methods
- [ ] Add `UserAPIKeyManager` to constructor
- [ ] Replace `getApiKeys` with encrypted version
- [ ] Replace `addApiKey` with encrypted version
- [ ] Replace `deleteApiKey` with encrypted version
- [ ] Remove `syncApiKeyToUsersTable` (use `user_api_keys` table only)
- [ ] Test all endpoints

### Phase 3: Testing
- [ ] Test GET /api/user-settings/api-keys
- [ ] Test POST /api/user-settings/api-keys
- [ ] Test DELETE /api/user-settings/api-keys/:id
- [ ] Test decryption works for trading
- [ ] Test audit logging
- [ ] Test verification

### Phase 4: Frontend
- [ ] Update frontend to use encrypted endpoints
- [ ] Test add/edit/delete flows
- [ ] Test verification status display
- [ ] Deploy frontend changes

### Phase 5: Cleanup
- [ ] Add deprecation warnings to old direct DB queries
- [ ] Monitor for any issues
- [ ] Remove duplicate code after stable

---

## ⚠️ CRITICAL DECISIONS NEEDED

### Decision 1: Migrate Existing Keys?
**Question:** Are there any existing API keys in `user_api_keys` table?

**Check:**
```sql
SELECT COUNT(*) as total_keys,
       SUM(CASE WHEN api_secret LIKE '%:%:%' THEN 1 ELSE 0 END) as encrypted_keys,
       SUM(CASE WHEN api_secret NOT LIKE '%:%:%' THEN 1 ELSE 0 END) as plaintext_keys
FROM user_api_keys;
```

**Current Status:** 0 keys (table is empty) ✅

**Action:** No migration needed! Just update endpoints to use encryption going forward.

### Decision 2: Which Endpoints to Keep?
**Options:**

A. **Keep both** (transition period)
   - Old: `/api/user-settings/api-keys` (update to use encryption)
   - New: `/api/user-api-keys` (already encrypted)

B. **Consolidate** (cleaner)
   - Keep only `/api/user-api-keys`
   - Redirect old endpoints to new

**Recommendation:** Option A during transition, then deprecate old after frontend migrates.

### Decision 3: Remove users table sync?
The old system syncs API keys to both:
- `user_api_keys` table (proper storage)
- `users` table columns (bybit_api_key, binance_api_key, etc.)

**Question:** Still needed?

**Check:**
```sql
SELECT
    COUNT(*) as users_with_keys_in_users_table,
    SUM(CASE WHEN bybit_api_key IS NOT NULL THEN 1 ELSE 0 END) as bybit_in_users,
    SUM(CASE WHEN binance_api_key IS NOT NULL THEN 1 ELSE 0 END) as binance_in_users
FROM users;
```

**Recommendation:** Stop syncing. Use `user_api_keys` table only (better normalization).

---

## 🎯 RECOMMENDED IMMEDIATE ACTION

Since `user_api_keys` table is **empty** (0 records), we can proceed cleanly:

### ✅ DO THIS NOW:

1. **Update old endpoints** in `src/routes/users.js` to use `UserAPIKeyManager`
2. **No data migration needed** (table is empty)
3. **Keep both endpoint paths** for transition
4. **Frontend can use either** endpoint

### 📝 Implementation Steps:

```bash
# 1. Create updated users.js with encryption
# (I'll create this file next)

# 2. Restart server
npm start

# 3. Test both endpoints work
curl http://localhost:3333/api/user-settings/api-keys # Old path, new encryption
curl http://localhost:3333/api/user-api-keys/all/status # New path

# 4. Frontend can use either (both encrypted now)
```

---

## 📄 Summary

**Current State:**
- ❌ OLD system stores PLAINTEXT
- ✅ NEW system stores ENCRYPTED
- ✅ Table is EMPTY (no migration needed)
- ⚠️ Two code paths for same functionality

**Recommended Action:**
1. Update old endpoints to use `UserAPIKeyManager` (encryption)
2. Keep both endpoint paths during transition
3. Frontend works with either
4. Deprecate old path after frontend migrates

**Result:**
- ✅ All API secrets encrypted
- ✅ Backward compatible
- ✅ Clean migration path
- ✅ No data loss

**Next Step:** Shall I create the updated `users.js` file with encrypted API key management?
