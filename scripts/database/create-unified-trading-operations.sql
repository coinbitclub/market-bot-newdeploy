-- 📊 UNIFIED TRADING OPERATIONS TABLE
-- Single source of truth for trade execution and performance tracking
-- =====================================================

-- Drop existing constraints if they exist
DO $$
BEGIN
    -- Add any constraint cleanup here if needed
END $$;

-- Ensure the table has all necessary columns
-- Using ALTER TABLE to add missing columns to existing table
DO $$
BEGIN
    -- Add personal_key column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trading_operations' AND column_name='personal_key') THEN
        ALTER TABLE trading_operations ADD COLUMN personal_key BOOLEAN DEFAULT false;
    END IF;

    -- Add commission_percent column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trading_operations' AND column_name='commission_percent') THEN
        ALTER TABLE trading_operations ADD COLUMN commission_percent DECIMAL(5,2) DEFAULT 0.00;
    END IF;

    -- Add plan_type column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trading_operations' AND column_name='plan_type') THEN
        ALTER TABLE trading_operations ADD COLUMN plan_type VARCHAR(20);
    END IF;

    -- Add error_message column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trading_operations' AND column_name='error_message') THEN
        ALTER TABLE trading_operations ADD COLUMN error_message TEXT;
    END IF;

    -- Add success column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trading_operations' AND column_name='success') THEN
        ALTER TABLE trading_operations ADD COLUMN success BOOLEAN DEFAULT true;
    END IF;

    -- Add simulated column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trading_operations' AND column_name='simulated') THEN
        ALTER TABLE trading_operations ADD COLUMN simulated BOOLEAN DEFAULT false;
    END IF;

    -- Ensure position_size exists and has correct type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='trading_operations' AND column_name='position_size') THEN
        ALTER TABLE trading_operations ADD COLUMN position_size DECIMAL(15,2) DEFAULT 0.00;
    END IF;

END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_trading_operations_user_status ON trading_operations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trading_operations_entry_time ON trading_operations(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trading_operations_personal_key ON trading_operations(personal_key);
CREATE INDEX IF NOT EXISTS idx_trading_operations_plan_type ON trading_operations(plan_type);
CREATE INDEX IF NOT EXISTS idx_trading_operations_success ON trading_operations(success);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_trading_operations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_trading_operations_updated_at ON trading_operations;
CREATE TRIGGER update_trading_operations_updated_at
    BEFORE UPDATE ON trading_operations
    FOR EACH ROW EXECUTE FUNCTION update_trading_operations_timestamp();

-- Verify table structure
SELECT
    'Trading Operations Table Ready!' as status,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'trading_operations';

COMMIT;
