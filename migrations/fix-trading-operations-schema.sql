-- =====================================================
-- FIX TRADING_OPERATIONS TABLE SCHEMA
-- =====================================================
-- Date: 2025-10-20
-- Purpose: Fix schema mismatches causing trading bot failures
--
-- Issues Fixed:
-- 1. operation_id must be VARCHAR(100), not INTEGER
-- 2. Add missing columns: personal_key, success, plan_type
-- 3. Ensure all column types match code expectations
-- =====================================================

BEGIN;

-- Check if table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trading_operations') THEN
        RAISE NOTICE 'Table trading_operations does not exist - will be created from schema';
    ELSE
        RAISE NOTICE 'Table trading_operations exists - applying schema fixes';
    END IF;
END $$;

-- Fix operation_id column type if it's INTEGER (should be VARCHAR)
DO $$
BEGIN
    -- Check current type
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'operation_id'
        AND data_type IN ('integer', 'bigint', 'smallint')
    ) THEN
        RAISE NOTICE 'Converting operation_id from INTEGER to VARCHAR(100)';
        ALTER TABLE trading_operations ALTER COLUMN operation_id TYPE VARCHAR(100);
    END IF;
END $$;

-- Add missing column: personal_key (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'personal_key'
    ) THEN
        RAISE NOTICE 'Adding column: personal_key';
        ALTER TABLE trading_operations
        ADD COLUMN personal_key BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Add missing column: success (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'success'
    ) THEN
        RAISE NOTICE 'Adding column: success';
        ALTER TABLE trading_operations
        ADD COLUMN success BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Add missing column: plan_type (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'plan_type'
    ) THEN
        RAISE NOTICE 'Adding column: plan_type';
        ALTER TABLE trading_operations
        ADD COLUMN plan_type VARCHAR(20);
    END IF;
END $$;

-- Add missing column: amount (position_size alias)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'amount'
    ) THEN
        RAISE NOTICE 'Adding column: amount (position_size in USD)';
        ALTER TABLE trading_operations
        ADD COLUMN amount DECIMAL(15,2);
    END IF;
END $$;

-- Add missing column: symbol (trading_pair alias for queries)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'symbol'
    ) THEN
        RAISE NOTICE 'Adding column: symbol (alias for trading_pair)';
        ALTER TABLE trading_operations
        ADD COLUMN symbol VARCHAR(20);

        -- Copy existing data from trading_pair to symbol
        UPDATE trading_operations SET symbol = trading_pair WHERE symbol IS NULL;
    END IF;
END $$;

-- Add missing column: side (operation_type alias)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'side'
    ) THEN
        RAISE NOTICE 'Adding column: side (alias for operation_type)';
        ALTER TABLE trading_operations
        ADD COLUMN side VARCHAR(10);

        -- Copy existing data from operation_type to side
        UPDATE trading_operations
        SET side = CASE
            WHEN operation_type = 'LONG' THEN 'Buy'
            WHEN operation_type = 'SHORT' THEN 'Sell'
            ELSE operation_type
        END
        WHERE side IS NULL;
    END IF;
END $$;

-- Add missing column: position_id (alternate identifier)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'position_id'
    ) THEN
        RAISE NOTICE 'Adding column: position_id';
        ALTER TABLE trading_operations
        ADD COLUMN position_id VARCHAR(100);

        -- Use operation_id as position_id for existing records
        UPDATE trading_operations SET position_id = operation_id WHERE position_id IS NULL;
    END IF;
END $$;

-- Add missing column: net_pnl (profit after commission)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'net_pnl'
    ) THEN
        RAISE NOTICE 'Adding column: net_pnl';
        ALTER TABLE trading_operations
        ADD COLUMN net_pnl DECIMAL(15,2) DEFAULT 0.00;
    END IF;
END $$;

-- Add missing column: commission_charged
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'commission_charged'
    ) THEN
        RAISE NOTICE 'Adding column: commission_charged';
        ALTER TABLE trading_operations
        ADD COLUMN commission_charged DECIMAL(15,2) DEFAULT 0.00;
    END IF;
END $$;

-- Add missing column: close_reason
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'close_reason'
    ) THEN
        RAISE NOTICE 'Adding column: close_reason';
        ALTER TABLE trading_operations
        ADD COLUMN close_reason VARCHAR(50);
    END IF;
END $$;

-- Ensure exchange column allows lowercase values (Bybit API compatibility)
DO $$
BEGIN
    -- Drop the constraint if it exists
    ALTER TABLE trading_operations DROP CONSTRAINT IF EXISTS chk_exchange;

    -- Add updated constraint that allows lowercase
    ALTER TABLE trading_operations
    ADD CONSTRAINT chk_exchange CHECK (
        UPPER(exchange) IN ('BINANCE', 'BYBIT', 'OKX', 'BITGET')
    );

    RAISE NOTICE 'Updated exchange check constraint to allow lowercase';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update exchange constraint: %', SQLERRM;
END $$;

-- Create indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_trading_operations_personal_key ON trading_operations(personal_key);
CREATE INDEX IF NOT EXISTS idx_trading_operations_success ON trading_operations(success);
CREATE INDEX IF NOT EXISTS idx_trading_operations_plan_type ON trading_operations(plan_type);
CREATE INDEX IF NOT EXISTS idx_trading_operations_position_id ON trading_operations(position_id);
CREATE INDEX IF NOT EXISTS idx_trading_operations_symbol ON trading_operations(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_operations_user_status ON trading_operations(user_id, status);

-- Verify schema
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'trading_operations';

    RAISE NOTICE 'trading_operations table now has % columns', col_count;
END $$;

COMMIT;

-- Display final schema
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trading_operations'
ORDER BY ordinal_position;
