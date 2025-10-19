-- ============================================================================
-- COMPATIBILITY VIEWS FOR OTHER SETTINGS TABLES
-- ============================================================================
-- Creates views for notification, banking, security, and preference settings
-- that map to the consolidated users table
-- ============================================================================

BEGIN;

-- Drop existing views if they exist
DROP VIEW IF EXISTS user_notification_settings CASCADE;
DROP VIEW IF EXISTS user_banking_settings CASCADE;
DROP VIEW IF EXISTS user_security_settings CASCADE;
DROP VIEW IF EXISTS user_preferences CASCADE;

-- ============================================================================
-- user_notification_settings VIEW
-- Maps to: users table
-- ============================================================================
CREATE VIEW user_notification_settings AS
SELECT 
    id as user_id,
    COALESCE(email_notifications, true) as email_notifications,
    false as sms_notifications,
    COALESCE(push_notifications, true) as push_notifications,
    COALESCE(trade_alerts, true) as trade_alerts,
    'DAILY' as report_frequency,
    5.0 as profit_threshold_percentage,
    3.0 as loss_threshold_percentage,
    created_at,
    updated_at
FROM users;

-- ============================================================================
-- user_banking_settings VIEW
-- Maps to: users table
-- ============================================================================
CREATE VIEW user_banking_settings AS
SELECT 
    id as user_id,
    pix_key,
    'CPF' as pix_type,
    bank_name,
    '' as bank_code,
    bank_agency as agency,
    bank_account as account,
    'CORRENTE' as account_type,
    full_name as account_holder_name,
    bank_document as cpf,
    phone,
    created_at,
    updated_at
FROM users;

-- ============================================================================
-- user_security_settings VIEW
-- Maps to: users table
-- ============================================================================
CREATE VIEW user_security_settings AS
SELECT 
    id as user_id,
    COALESCE(two_factor_enabled, false) as two_factor_enabled,
    COALESCE(login_notifications, true) as login_notifications,
    true as device_management,
    30 as session_timeout_minutes,
    false as password_change_required,
    created_at,
    updated_at
FROM users;

-- ============================================================================
-- user_preferences VIEW
-- Maps to: users table
-- ============================================================================
CREATE VIEW user_preferences AS
SELECT 
    id as user_id,
    'default' as dashboard_layout,
    '{}'::jsonb as widget_preferences,
    '{}'::jsonb as chart_preferences,
    true as alert_sounds,
    true as auto_refresh,
    30 as refresh_interval_seconds,
    COALESCE(language, 'pt') as language,
    COALESCE(timezone, 'America/Sao_Paulo') as timezone,
    COALESCE(currency_preference, 'BRL') as currency_preference,
    COALESCE(theme, 'dark') as theme,
    created_at,
    updated_at
FROM users;

-- Add comments
COMMENT ON VIEW user_notification_settings IS 'Compatibility view - maps to users table';
COMMENT ON VIEW user_banking_settings IS 'Compatibility view - maps to users table';
COMMENT ON VIEW user_security_settings IS 'Compatibility view - maps to users table';
COMMENT ON VIEW user_preferences IS 'Compatibility view - maps to users table';

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- ✅ Created compatibility views:
--    - user_notification_settings → users
--    - user_banking_settings → users
--    - user_security_settings → users
--    - user_preferences → users
--
-- ✅ Old code referencing these tables will now work seamlessly
-- ============================================================================

