-- ============================================================================
-- CONSOLIDATE ALL TRADING SETTINGS TO user_trading_config
-- ============================================================================
-- This migration adds missing fields to user_trading_config so it can
-- completely replace the old user_trading_settings table
-- ============================================================================

BEGIN;

-- Add missing columns to user_trading_config
ALTER TABLE user_trading_config 
ADD COLUMN IF NOT EXISTS max_leverage INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS take_profit_percentage NUMERIC(5,2) DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS stop_loss_percentage NUMERIC(5,2) DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS margin_mode VARCHAR(20) DEFAULT 'ISOLATED';

-- Update existing rows to have default values if NULL
UPDATE user_trading_config 
SET 
    max_leverage = COALESCE(max_leverage, 10),
    take_profit_percentage = COALESCE(take_profit_percentage, 2.0),
    stop_loss_percentage = COALESCE(stop_loss_percentage, 1.5),
    margin_mode = COALESCE(margin_mode, 'ISOLATED')
WHERE max_leverage IS NULL 
   OR take_profit_percentage IS NULL 
   OR stop_loss_percentage IS NULL 
   OR margin_mode IS NULL;

-- Create a view called user_trading_settings that maps to user_trading_config
-- This provides backward compatibility for code that references the old table name
DROP VIEW IF EXISTS user_trading_settings CASCADE;

CREATE VIEW user_trading_settings AS
SELECT 
    id,
    user_id,
    risk_level,
    max_open_positions,
    default_leverage,
    max_leverage,
    position_size_percentage,
    take_profit_percentage,
    stop_loss_percentage,
    stop_loss_multiplier,
    take_profit_multiplier,
    daily_loss_limit_percentage,
    auto_trade_enabled,
    auto_stop_loss,
    auto_take_profit,
    margin_mode,
    created_at,
    updated_at
FROM user_trading_config;

-- Add comment
COMMENT ON VIEW user_trading_settings IS 'Compatibility view - maps directly to user_trading_config table';

-- Verify the structure
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'user_trading_config';
    
    RAISE NOTICE '✅ user_trading_config now has % columns', col_count;
    RAISE NOTICE '✅ View user_trading_settings created for backward compatibility';
END $$;

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- ✅ Added missing columns to user_trading_config:
--    - max_leverage
--    - take_profit_percentage
--    - stop_loss_percentage
--    - margin_mode
--
-- ✅ Created view user_trading_settings → user_trading_config
--    Old code will continue to work without changes
-- ============================================================================

