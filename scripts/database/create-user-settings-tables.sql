-- =====================================================
-- USER SETTINGS DATABASE TABLES - COINBITCLUB ENTERPRISE
-- =====================================================

-- 1. User Trading Settings Table
CREATE TABLE IF NOT EXISTS user_trading_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_leverage INTEGER DEFAULT 5,
    take_profit_percentage NUMERIC(5,2) DEFAULT 15.00,
    stop_loss_percentage NUMERIC(5,2) DEFAULT 10.00,
    position_size_percentage INTEGER DEFAULT 30,
    risk_level VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high'
    auto_trade_enabled BOOLEAN DEFAULT true,
    daily_loss_limit_percentage INTEGER DEFAULT 10,
    max_open_positions INTEGER DEFAULT 2,
    default_leverage INTEGER DEFAULT 5,
    stop_loss_multiplier NUMERIC(3,2) DEFAULT 2.00,
    take_profit_multiplier NUMERIC(3,2) DEFAULT 3.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 2. User Notification Settings Table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    trade_alerts BOOLEAN DEFAULT true,
    report_frequency VARCHAR(10) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
    profit_threshold_percentage NUMERIC(5,2) DEFAULT 5.00,
    loss_threshold_percentage NUMERIC(5,2) DEFAULT 10.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 3. User Personal Settings Table
CREATE TABLE IF NOT EXISTS user_personal_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(5) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    currency_preference VARCHAR(3) DEFAULT 'BRL',
    theme VARCHAR(10) DEFAULT 'dark', -- 'light', 'dark', 'auto'
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 4. User Banking Settings Table
CREATE TABLE IF NOT EXISTS user_banking_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pix_key VARCHAR(255),
    pix_type VARCHAR(20) DEFAULT 'email', -- 'email', 'phone', 'cpf', 'random'
    bank_name VARCHAR(100),
    bank_code VARCHAR(10),
    agency VARCHAR(20),
    account VARCHAR(20),
    account_type VARCHAR(20) DEFAULT 'corrente', -- 'corrente', 'poupanca'
    account_holder_name VARCHAR(255),
    cpf VARCHAR(14),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 5. User Security Settings Table
CREATE TABLE IF NOT EXISTS user_security_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(32),
    login_notifications BOOLEAN DEFAULT true,
    device_management BOOLEAN DEFAULT true,
    session_timeout_minutes INTEGER DEFAULT 1440, -- 24 hours
    password_change_required BOOLEAN DEFAULT false,
    last_password_change TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 6. User API Keys Table (Enhanced)
CREATE TABLE IF NOT EXISTS user_api_keys_enhanced (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL, -- 'binance', 'bybit', 'okx', etc.
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    passphrase VARCHAR(255), -- For exchanges that require it
    environment VARCHAR(10) NOT NULL DEFAULT 'testnet', -- 'testnet' or 'mainnet'
    is_active BOOLEAN DEFAULT true,
    last_connection TIMESTAMP,
    connection_status VARCHAR(20) DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
    permissions JSONB, -- API key permissions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exchange, environment)
);

-- 7. User Preferences Table (General)
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_layout JSONB DEFAULT '{}',
    widget_preferences JSONB DEFAULT '{}',
    chart_preferences JSONB DEFAULT '{}',
    alert_sounds BOOLEAN DEFAULT true,
    auto_refresh BOOLEAN DEFAULT true,
    refresh_interval_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_trading_settings_user_id ON user_trading_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personal_settings_user_id ON user_personal_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_banking_settings_user_id ON user_banking_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id ON user_security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_enhanced_user_id ON user_api_keys_enhanced(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_enhanced_exchange ON user_api_keys_enhanced(exchange);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Insert default settings for existing users
INSERT INTO user_trading_settings (user_id, max_leverage, take_profit_percentage, stop_loss_percentage, position_size_percentage, risk_level, auto_trade_enabled, daily_loss_limit_percentage)
SELECT 
    id,
    5, -- max_leverage
    15.00, -- take_profit_percentage
    10.00, -- stop_loss_percentage
    30, -- position_size_percentage
    'medium', -- risk_level
    CASE WHEN user_type IN ('ADMIN', 'GESTOR', 'OPERADOR') THEN true ELSE false END, -- auto_trade_enabled
    10 -- daily_loss_limit_percentage
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_trading_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_notification_settings (user_id, email_notifications, sms_notifications, push_notifications, trade_alerts)
SELECT 
    id,
    true, -- email_notifications
    false, -- sms_notifications
    true, -- push_notifications
    CASE WHEN user_type IN ('ADMIN', 'GESTOR', 'OPERADOR') THEN true ELSE false END -- trade_alerts
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_notification_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_personal_settings (user_id, language, timezone, currency_preference, theme)
SELECT 
    id,
    COALESCE(language, 'pt-BR'), -- language
    'America/Sao_Paulo', -- timezone
    'BRL', -- currency_preference
    'dark' -- theme
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_personal_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_security_settings (user_id, two_factor_enabled, two_factor_secret, login_notifications, device_management)
SELECT 
    id,
    two_factor_enabled, -- two_factor_enabled
    two_factor_secret, -- two_factor_secret
    true, -- login_notifications
    CASE WHEN user_type IN ('ADMIN', 'GESTOR') THEN true ELSE false END -- device_management
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_security_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_preferences (user_id, dashboard_layout, widget_preferences, chart_preferences)
SELECT 
    id,
    '{"layout": "default", "widgets": ["balance", "positions", "performance"]}', -- dashboard_layout
    '{"balance": true, "positions": true, "performance": true, "news": false}', -- widget_preferences
    '{"theme": "dark", "timeframe": "1h", "indicators": ["sma", "ema"]}' -- chart_preferences
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE user_trading_settings IS 'User trading configuration and risk management settings';
COMMENT ON TABLE user_notification_settings IS 'User notification preferences and alert settings';
COMMENT ON TABLE user_personal_settings IS 'User personal preferences like language, theme, timezone';
COMMENT ON TABLE user_banking_settings IS 'User banking and payment method settings';
COMMENT ON TABLE user_security_settings IS 'User security preferences and 2FA settings';
COMMENT ON TABLE user_api_keys_enhanced IS 'User API keys for external exchange connections';
COMMENT ON TABLE user_preferences IS 'General user preferences and UI customization';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- USER SETTINGS DATABASE TABLES - COINBITCLUB ENTERPRISE
-- =====================================================

-- 1. User Trading Settings Table
CREATE TABLE IF NOT EXISTS user_trading_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_leverage INTEGER DEFAULT 5,
    take_profit_percentage NUMERIC(5,2) DEFAULT 15.00,
    stop_loss_percentage NUMERIC(5,2) DEFAULT 10.00,
    position_size_percentage INTEGER DEFAULT 30,
    risk_level VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high'
    auto_trade_enabled BOOLEAN DEFAULT true,
    daily_loss_limit_percentage INTEGER DEFAULT 10,
    max_open_positions INTEGER DEFAULT 2,
    default_leverage INTEGER DEFAULT 5,
    stop_loss_multiplier NUMERIC(3,2) DEFAULT 2.00,
    take_profit_multiplier NUMERIC(3,2) DEFAULT 3.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 2. User Notification Settings Table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    trade_alerts BOOLEAN DEFAULT true,
    report_frequency VARCHAR(10) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
    profit_threshold_percentage NUMERIC(5,2) DEFAULT 5.00,
    loss_threshold_percentage NUMERIC(5,2) DEFAULT 10.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 3. User Personal Settings Table
CREATE TABLE IF NOT EXISTS user_personal_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(5) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    currency_preference VARCHAR(3) DEFAULT 'BRL',
    theme VARCHAR(10) DEFAULT 'dark', -- 'light', 'dark', 'auto'
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 4. User Banking Settings Table
CREATE TABLE IF NOT EXISTS user_banking_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pix_key VARCHAR(255),
    pix_type VARCHAR(20) DEFAULT 'email', -- 'email', 'phone', 'cpf', 'random'
    bank_name VARCHAR(100),
    bank_code VARCHAR(10),
    agency VARCHAR(20),
    account VARCHAR(20),
    account_type VARCHAR(20) DEFAULT 'corrente', -- 'corrente', 'poupanca'
    account_holder_name VARCHAR(255),
    cpf VARCHAR(14),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 5. User Security Settings Table
CREATE TABLE IF NOT EXISTS user_security_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(32),
    login_notifications BOOLEAN DEFAULT true,
    device_management BOOLEAN DEFAULT true,
    session_timeout_minutes INTEGER DEFAULT 1440, -- 24 hours
    password_change_required BOOLEAN DEFAULT false,
    last_password_change TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 6. User API Keys Table (Enhanced)
CREATE TABLE IF NOT EXISTS user_api_keys_enhanced (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL, -- 'binance', 'bybit', 'okx', etc.
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    passphrase VARCHAR(255), -- For exchanges that require it
    environment VARCHAR(10) NOT NULL DEFAULT 'testnet', -- 'testnet' or 'mainnet'
    is_active BOOLEAN DEFAULT true,
    last_connection TIMESTAMP,
    connection_status VARCHAR(20) DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
    permissions JSONB, -- API key permissions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exchange, environment)
);

-- 7. User Preferences Table (General)
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_layout JSONB DEFAULT '{}',
    widget_preferences JSONB DEFAULT '{}',
    chart_preferences JSONB DEFAULT '{}',
    alert_sounds BOOLEAN DEFAULT true,
    auto_refresh BOOLEAN DEFAULT true,
    refresh_interval_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_trading_settings_user_id ON user_trading_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personal_settings_user_id ON user_personal_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_banking_settings_user_id ON user_banking_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id ON user_security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_enhanced_user_id ON user_api_keys_enhanced(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_enhanced_exchange ON user_api_keys_enhanced(exchange);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Insert default settings for existing users
INSERT INTO user_trading_settings (user_id, max_leverage, take_profit_percentage, stop_loss_percentage, position_size_percentage, risk_level, auto_trade_enabled, daily_loss_limit_percentage)
SELECT 
    id,
    5, -- max_leverage
    15.00, -- take_profit_percentage
    10.00, -- stop_loss_percentage
    30, -- position_size_percentage
    'medium', -- risk_level
    CASE WHEN user_type IN ('ADMIN', 'GESTOR', 'OPERADOR') THEN true ELSE false END, -- auto_trade_enabled
    10 -- daily_loss_limit_percentage
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_trading_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_notification_settings (user_id, email_notifications, sms_notifications, push_notifications, trade_alerts)
SELECT 
    id,
    true, -- email_notifications
    false, -- sms_notifications
    true, -- push_notifications
    CASE WHEN user_type IN ('ADMIN', 'GESTOR', 'OPERADOR') THEN true ELSE false END -- trade_alerts
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_notification_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_personal_settings (user_id, language, timezone, currency_preference, theme)
SELECT 
    id,
    COALESCE(language, 'pt-BR'), -- language
    'America/Sao_Paulo', -- timezone
    'BRL', -- currency_preference
    'dark' -- theme
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_personal_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_security_settings (user_id, two_factor_enabled, two_factor_secret, login_notifications, device_management)
SELECT 
    id,
    two_factor_enabled, -- two_factor_enabled
    two_factor_secret, -- two_factor_secret
    true, -- login_notifications
    CASE WHEN user_type IN ('ADMIN', 'GESTOR') THEN true ELSE false END -- device_management
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_security_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_preferences (user_id, dashboard_layout, widget_preferences, chart_preferences)
SELECT 
    id,
    '{"layout": "default", "widgets": ["balance", "positions", "performance"]}', -- dashboard_layout
    '{"balance": true, "positions": true, "performance": true, "news": false}', -- widget_preferences
    '{"theme": "dark", "timeframe": "1h", "indicators": ["sma", "ema"]}' -- chart_preferences
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE user_trading_settings IS 'User trading configuration and risk management settings';
COMMENT ON TABLE user_notification_settings IS 'User notification preferences and alert settings';
COMMENT ON TABLE user_personal_settings IS 'User personal preferences like language, theme, timezone';
COMMENT ON TABLE user_banking_settings IS 'User banking and payment method settings';
COMMENT ON TABLE user_security_settings IS 'User security preferences and 2FA settings';
COMMENT ON TABLE user_api_keys_enhanced IS 'User API keys for external exchange connections';
COMMENT ON TABLE user_preferences IS 'General user preferences and UI customization';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- USER SETTINGS DATABASE TABLES - COINBITCLUB ENTERPRISE
-- =====================================================

-- 1. User Trading Settings Table
CREATE TABLE IF NOT EXISTS user_trading_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_leverage INTEGER DEFAULT 5,
    take_profit_percentage NUMERIC(5,2) DEFAULT 15.00,
    stop_loss_percentage NUMERIC(5,2) DEFAULT 10.00,
    position_size_percentage INTEGER DEFAULT 30,
    risk_level VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high'
    auto_trade_enabled BOOLEAN DEFAULT true,
    daily_loss_limit_percentage INTEGER DEFAULT 10,
    max_open_positions INTEGER DEFAULT 2,
    default_leverage INTEGER DEFAULT 5,
    stop_loss_multiplier NUMERIC(3,2) DEFAULT 2.00,
    take_profit_multiplier NUMERIC(3,2) DEFAULT 3.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 2. User Notification Settings Table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    trade_alerts BOOLEAN DEFAULT true,
    report_frequency VARCHAR(10) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
    profit_threshold_percentage NUMERIC(5,2) DEFAULT 5.00,
    loss_threshold_percentage NUMERIC(5,2) DEFAULT 10.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 3. User Personal Settings Table
CREATE TABLE IF NOT EXISTS user_personal_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(5) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    currency_preference VARCHAR(3) DEFAULT 'BRL',
    theme VARCHAR(10) DEFAULT 'dark', -- 'light', 'dark', 'auto'
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 4. User Banking Settings Table
CREATE TABLE IF NOT EXISTS user_banking_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pix_key VARCHAR(255),
    pix_type VARCHAR(20) DEFAULT 'email', -- 'email', 'phone', 'cpf', 'random'
    bank_name VARCHAR(100),
    bank_code VARCHAR(10),
    agency VARCHAR(20),
    account VARCHAR(20),
    account_type VARCHAR(20) DEFAULT 'corrente', -- 'corrente', 'poupanca'
    account_holder_name VARCHAR(255),
    cpf VARCHAR(14),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 5. User Security Settings Table
CREATE TABLE IF NOT EXISTS user_security_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(32),
    login_notifications BOOLEAN DEFAULT true,
    device_management BOOLEAN DEFAULT true,
    session_timeout_minutes INTEGER DEFAULT 1440, -- 24 hours
    password_change_required BOOLEAN DEFAULT false,
    last_password_change TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 6. User API Keys Table (Enhanced)
CREATE TABLE IF NOT EXISTS user_api_keys_enhanced (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL, -- 'binance', 'bybit', 'okx', etc.
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    passphrase VARCHAR(255), -- For exchanges that require it
    environment VARCHAR(10) NOT NULL DEFAULT 'testnet', -- 'testnet' or 'mainnet'
    is_active BOOLEAN DEFAULT true,
    last_connection TIMESTAMP,
    connection_status VARCHAR(20) DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
    permissions JSONB, -- API key permissions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exchange, environment)
);

-- 7. User Preferences Table (General)
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_layout JSONB DEFAULT '{}',
    widget_preferences JSONB DEFAULT '{}',
    chart_preferences JSONB DEFAULT '{}',
    alert_sounds BOOLEAN DEFAULT true,
    auto_refresh BOOLEAN DEFAULT true,
    refresh_interval_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_trading_settings_user_id ON user_trading_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personal_settings_user_id ON user_personal_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_banking_settings_user_id ON user_banking_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id ON user_security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_enhanced_user_id ON user_api_keys_enhanced(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_enhanced_exchange ON user_api_keys_enhanced(exchange);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Insert default settings for existing users
INSERT INTO user_trading_settings (user_id, max_leverage, take_profit_percentage, stop_loss_percentage, position_size_percentage, risk_level, auto_trade_enabled, daily_loss_limit_percentage)
SELECT 
    id,
    5, -- max_leverage
    15.00, -- take_profit_percentage
    10.00, -- stop_loss_percentage
    30, -- position_size_percentage
    'medium', -- risk_level
    CASE WHEN user_type IN ('ADMIN', 'GESTOR', 'OPERADOR') THEN true ELSE false END, -- auto_trade_enabled
    10 -- daily_loss_limit_percentage
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_trading_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_notification_settings (user_id, email_notifications, sms_notifications, push_notifications, trade_alerts)
SELECT 
    id,
    true, -- email_notifications
    false, -- sms_notifications
    true, -- push_notifications
    CASE WHEN user_type IN ('ADMIN', 'GESTOR', 'OPERADOR') THEN true ELSE false END -- trade_alerts
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_notification_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_personal_settings (user_id, language, timezone, currency_preference, theme)
SELECT 
    id,
    COALESCE(language, 'pt-BR'), -- language
    'America/Sao_Paulo', -- timezone
    'BRL', -- currency_preference
    'dark' -- theme
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_personal_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_security_settings (user_id, two_factor_enabled, two_factor_secret, login_notifications, device_management)
SELECT 
    id,
    two_factor_enabled, -- two_factor_enabled
    two_factor_secret, -- two_factor_secret
    true, -- login_notifications
    CASE WHEN user_type IN ('ADMIN', 'GESTOR') THEN true ELSE false END -- device_management
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_security_settings)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_preferences (user_id, dashboard_layout, widget_preferences, chart_preferences)
SELECT 
    id,
    '{"layout": "default", "widgets": ["balance", "positions", "performance"]}', -- dashboard_layout
    '{"balance": true, "positions": true, "performance": true, "news": false}', -- widget_preferences
    '{"theme": "dark", "timeframe": "1h", "indicators": ["sma", "ema"]}' -- chart_preferences
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE user_trading_settings IS 'User trading configuration and risk management settings';
COMMENT ON TABLE user_notification_settings IS 'User notification preferences and alert settings';
COMMENT ON TABLE user_personal_settings IS 'User personal preferences like language, theme, timezone';
COMMENT ON TABLE user_banking_settings IS 'User banking and payment method settings';
COMMENT ON TABLE user_security_settings IS 'User security preferences and 2FA settings';
COMMENT ON TABLE user_api_keys_enhanced IS 'User API keys for external exchange connections';
COMMENT ON TABLE user_preferences IS 'General user preferences and UI customization';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
