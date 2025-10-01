-- Migration: Enhance existing user_api_keys table for personal API keys
-- Date: 2025-10-01
-- Purpose: Add encryption, verification, and audit to existing user_api_keys structure

-- ============================================================================
-- STEP 1: Add missing columns to existing user_api_keys table
-- ============================================================================

-- Add verification and security columns
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS testnet BOOLEAN DEFAULT FALSE;

-- Update is_active to enabled for consistency (optional - can keep is_active)
-- UPDATE user_api_keys SET enabled = is_active WHERE enabled IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_exchange ON user_api_keys(user_id, exchange);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(user_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- STEP 2: Add trading_mode to users table
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS trading_mode VARCHAR(50) DEFAULT 'PERSONAL';

COMMENT ON COLUMN users.trading_mode IS 'Trading mode: PERSONAL only - users use their own exchange API keys';

CREATE INDEX IF NOT EXISTS idx_users_trading_mode ON users(trading_mode);

-- ============================================================================
-- STEP 3: Create audit table for API key operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_api_keys_audit (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_api_audit ON user_api_keys_audit(user_id, created_at);

-- ============================================================================
-- STEP 4: Create permissions tracking table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_api_key_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    can_trade BOOLEAN DEFAULT FALSE,
    can_withdraw BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT TRUE,
    ip_whitelist TEXT,
    max_position_size DECIMAL(20, 8),
    last_checked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exchange)
);

CREATE INDEX IF NOT EXISTS idx_user_api_permissions ON user_api_key_permissions(user_id, exchange);

-- ============================================================================
-- STEP 5: Set all existing users to PERSONAL mode
-- ============================================================================

UPDATE users SET trading_mode = 'PERSONAL' WHERE trading_mode IS NULL OR trading_mode = '';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN user_api_keys.api_key IS 'Exchange API key (stored as-is, not sensitive)';
COMMENT ON COLUMN user_api_keys.api_secret IS 'Exchange API secret (SHOULD BE ENCRYPTED - use encryption service)';
COMMENT ON COLUMN user_api_keys.verified IS 'Whether API key has been verified with exchange';
COMMENT ON COLUMN user_api_keys.verified_at IS 'Timestamp of last successful verification';
COMMENT ON COLUMN user_api_keys.testnet IS 'Whether this is a testnet or mainnet API key';

COMMENT ON TABLE user_api_keys_audit IS 'Audit log for all API key operations (save, delete, verify, etc.)';
COMMENT ON TABLE user_api_key_permissions IS 'Permissions and limits for user API keys';

-- ============================================================================
-- NOTES
-- ============================================================================

-- IMPORTANT: This migration enhances the EXISTING user_api_keys table
--
-- The api_secret column will continue to store secrets, but your code should:
-- 1. ENCRYPT secrets before INSERT/UPDATE using AES-256-GCM encryption service
-- 2. DECRYPT secrets when retrieving for trading
--
-- Existing structure maintained:
-- - id, user_id, exchange, api_key, api_secret, is_active, created_at, updated_at
--
-- New additions:
-- - verified, verified_at, enabled, testnet columns
-- - user_api_keys_audit table for security logging
-- - user_api_key_permissions table for permissions tracking
-- - trading_mode column in users table
--
-- Migration is safe to run multiple times (uses IF NOT EXISTS)
