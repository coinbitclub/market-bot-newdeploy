-- ========================================
-- 🌱 SEED USER SETTINGS DEFAULTS
-- CoinBitClub Enterprise v6.0.0
-- Default user settings and configurations
-- ========================================

-- Insert default user settings if table exists
DO $$
BEGIN
    -- Check if user_settings table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_settings') THEN
        
        -- Insert default settings if none exist
        INSERT INTO user_settings (user_id, setting_key, setting_value, created_at, updated_at)
        SELECT 
            1, -- Default user ID
            'theme',
            'dark',
            NOW(),
            NOW()
        WHERE NOT EXISTS (SELECT 1 FROM user_settings WHERE user_id = 1 AND setting_key = 'theme');
        
        INSERT INTO user_settings (user_id, setting_key, setting_value, created_at, updated_at)
        SELECT 
            1,
            'language',
            'pt',
            NOW(),
            NOW()
        WHERE NOT EXISTS (SELECT 1 FROM user_settings WHERE user_id = 1 AND setting_key = 'language');
        
        INSERT INTO user_settings (user_id, setting_key, setting_value, created_at, updated_at)
        SELECT 
            1,
            'notifications',
            'true',
            NOW(),
            NOW()
        WHERE NOT EXISTS (SELECT 1 FROM user_settings WHERE user_id = 1 AND setting_key = 'notifications');
        
        INSERT INTO user_settings (user_id, setting_key, setting_value, created_at, updated_at)
        SELECT 
            1,
            'auto_trading',
            'false',
            NOW(),
            NOW()
        WHERE NOT EXISTS (SELECT 1 FROM user_settings WHERE user_id = 1 AND setting_key = 'auto_trading');
        
        RAISE NOTICE 'User settings seeded successfully';
    ELSE
        RAISE NOTICE 'User settings table does not exist, skipping seed';
    END IF;
END $$;
