-- Migration: Create user_api_keys table
-- Purpose: Store user exchange API credentials separately from users table
-- This table is referenced by the backend API key management system

-- Create user_api_keys table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL, -- binance, bybit, okx, etc
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    passphrase TEXT, -- For exchanges that require it (like OKX)
    environment VARCHAR(10) DEFAULT 'testnet', -- testnet, mainnet
    is_active BOOLEAN DEFAULT true,
    connection_status VARCHAR(20) DEFAULT 'pending', -- pending, connected, failed
    validation_status VARCHAR(20) DEFAULT 'pending', -- pending, valid, invalid
    last_connection TIMESTAMP,
    last_validated TIMESTAMP,
    last_validated_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_exchange CHECK (exchange IN ('binance', 'bybit', 'okx', 'mexc')),
    CONSTRAINT chk_environment CHECK (environment IN ('testnet', 'mainnet')),
    CONSTRAINT chk_validation_status CHECK (validation_status IN ('pending', 'valid', 'invalid')),
    CONSTRAINT chk_connection_status CHECK (connection_status IN ('pending', 'connected', 'failed')),

    -- Ensure only one active key per user per exchange per environment
    UNIQUE(user_id, exchange, environment)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_exchange ON user_api_keys(exchange);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_exchange ON user_api_keys(user_id, exchange);

-- Migration: Copy existing API keys from users table to user_api_keys table
-- This preserves existing data while moving to the new table structure
INSERT INTO user_api_keys (user_id, exchange, api_key, api_secret, environment, is_active, created_at)
SELECT
    id,
    'binance',
    binance_api_key,
    binance_secret_key,
    CASE WHEN binance_testnet = true THEN 'testnet' ELSE 'mainnet' END,
    true,
    NOW()
FROM users
WHERE binance_api_key IS NOT NULL
  AND binance_secret_key IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM user_api_keys
      WHERE user_id = users.id AND exchange = 'binance'
  );

INSERT INTO user_api_keys (user_id, exchange, api_key, api_secret, environment, is_active, created_at)
SELECT
    id,
    'bybit',
    bybit_api_key,
    bybit_secret_key,
    CASE WHEN bybit_testnet = true THEN 'testnet' ELSE 'mainnet' END,
    true,
    NOW()
FROM users
WHERE bybit_api_key IS NOT NULL
  AND bybit_secret_key IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM user_api_keys
      WHERE user_id = users.id AND exchange = 'bybit'
  );

-- Note: We keep the original fields in users table for backward compatibility
-- Future updates can gradually phase out the users table API key fields