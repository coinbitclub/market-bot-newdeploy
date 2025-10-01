-- Migration: Add per-user API key support
-- Date: 2025-10-01
-- Purpose: Enable users to use their own Bybit/Binance API keys

-- Add API key columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bybit_api_key VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bybit_api_secret_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bybit_api_key_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bybit_api_key_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bybit_api_key_verified_at TIMESTAMP;

ALTER TABLE users ADD COLUMN IF NOT EXISTS binance_api_key VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS binance_api_secret_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS binance_api_key_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS binance_api_key_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS binance_api_key_verified_at TIMESTAMP;

-- Trading mode preference
ALTER TABLE users ADD COLUMN IF NOT EXISTS trading_mode VARCHAR(50) DEFAULT 'PERSONAL';
-- System uses ONLY personal API keys - users must connect their own Bybit/Binance accounts

-- Create API keys audit table
CREATE TABLE IF NOT EXISTS user_api_keys_audit (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    exchange VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_api_audit (user_id, created_at)
);

-- Create API key permissions table
CREATE TABLE IF NOT EXISTS user_api_key_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
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

-- Add comments
COMMENT ON COLUMN users.bybit_api_key IS 'Bybit API key (stored as-is, not sensitive)';
COMMENT ON COLUMN users.bybit_api_secret_encrypted IS 'Bybit API secret (AES-256 encrypted)';
COMMENT ON COLUMN users.trading_mode IS 'Trading mode: PERSONAL only - users use their own exchange API keys';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_bybit_enabled ON users(bybit_api_key_enabled) WHERE bybit_api_key_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_binance_enabled ON users(binance_api_key_enabled) WHERE binance_api_key_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_trading_mode ON users(trading_mode);

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON user_api_keys_audit TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON user_api_key_permissions TO your_app_user;
