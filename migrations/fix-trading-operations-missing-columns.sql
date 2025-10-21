-- =====================================================
-- ADD MISSING COLUMNS TO TRADING_OPERATIONS
-- =====================================================
-- Date: 2025-10-20
-- Purpose: Add columns that code expects but are missing from production schema
--
-- Production schema is different from create-performance-tables.sql
-- This migration adds the missing columns the code needs
-- =====================================================

BEGIN;

-- Add operation_id column (code generates "OP_timestamp_userid")
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'operation_id'
    ) THEN
        RAISE NOTICE 'Adding column: operation_id VARCHAR(100)';
        ALTER TABLE trading_operations
        ADD COLUMN operation_id VARCHAR(100);

        -- Generate operation_id for existing records
        UPDATE trading_operations
        SET operation_id = 'OP_' || EXTRACT(EPOCH FROM created_at)::BIGINT || '_' || user_id
        WHERE operation_id IS NULL;

        -- Make it unique after populating
        ALTER TABLE trading_operations
        ADD CONSTRAINT uq_operation_id UNIQUE (operation_id);

        CREATE INDEX idx_trading_operations_operation_id ON trading_operations(operation_id);
    END IF;
END $$;

-- Add trading_pair column (duplicate of symbol for compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'trading_pair'
    ) THEN
        RAISE NOTICE 'Adding column: trading_pair VARCHAR(20)';
        ALTER TABLE trading_operations
        ADD COLUMN trading_pair VARCHAR(20);

        -- Copy existing symbol values to trading_pair
        UPDATE trading_operations
        SET trading_pair = symbol
        WHERE trading_pair IS NULL;

        CREATE INDEX idx_trading_operations_trading_pair ON trading_operations(trading_pair);
    END IF;
END $$;

-- Add position_size column (percentage of balance)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'position_size'
    ) THEN
        RAISE NOTICE 'Adding column: position_size DECIMAL(8,4)';
        ALTER TABLE trading_operations
        ADD COLUMN position_size DECIMAL(8,4) DEFAULT 0.0000;
    END IF;
END $$;

-- Fix position_id column type (code may use VARCHAR)
-- Note: Skipping position_id conversion as it has foreign key constraint
-- The code should use operation_id instead
DO $$
BEGIN
    RAISE NOTICE 'Skipping position_id conversion - has foreign key constraint';
    RAISE NOTICE 'Code should use operation_id field instead';
END $$;

-- Add stop_loss column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'stop_loss'
    ) THEN
        RAISE NOTICE 'Adding column: stop_loss DECIMAL(20,8)';
        ALTER TABLE trading_operations
        ADD COLUMN stop_loss DECIMAL(20,8);
    END IF;
END $$;

-- Add take_profit column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'take_profit'
    ) THEN
        RAISE NOTICE 'Adding column: take_profit DECIMAL(20,8)';
        ALTER TABLE trading_operations
        ADD COLUMN take_profit DECIMAL(20,8);
    END IF;
END $$;

-- Add metadata column for additional info
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'metadata'
    ) THEN
        RAISE NOTICE 'Adding column: metadata JSONB';
        ALTER TABLE trading_operations
        ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Add profit_loss column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'profit_loss'
    ) THEN
        RAISE NOTICE 'Adding column: profit_loss DECIMAL(15,2)';
        ALTER TABLE trading_operations
        ADD COLUMN profit_loss DECIMAL(15,2) DEFAULT 0.00;
    END IF;
END $$;

-- Add profit_loss_percentage column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'profit_loss_percentage'
    ) THEN
        RAISE NOTICE 'Adding column: profit_loss_percentage DECIMAL(8,4)';
        ALTER TABLE trading_operations
        ADD COLUMN profit_loss_percentage DECIMAL(8,4) DEFAULT 0.0000;
    END IF;
END $$;

-- Add duration_minutes column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'duration_minutes'
    ) THEN
        RAISE NOTICE 'Adding column: duration_minutes INTEGER';
        ALTER TABLE trading_operations
        ADD COLUMN duration_minutes INTEGER;
    END IF;
END $$;

-- Add signal_source column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'signal_source'
    ) THEN
        RAISE NOTICE 'Adding column: signal_source VARCHAR(50)';
        ALTER TABLE trading_operations
        ADD COLUMN signal_source VARCHAR(50) DEFAULT 'TRADINGVIEW';
    END IF;
END $$;

-- Add confidence_score column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'confidence_score'
    ) THEN
        RAISE NOTICE 'Adding column: confidence_score DECIMAL(5,2)';
        ALTER TABLE trading_operations
        ADD COLUMN confidence_score DECIMAL(5,2);
    END IF;
END $$;

-- Add reasoning column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'reasoning'
    ) THEN
        RAISE NOTICE 'Adding column: reasoning TEXT';
        ALTER TABLE trading_operations
        ADD COLUMN reasoning TEXT;
    END IF;
END $$;

-- Add updated_at column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trading_operations'
        AND column_name = 'updated_at'
    ) THEN
        RAISE NOTICE 'Adding column: updated_at TIMESTAMP';
        ALTER TABLE trading_operations
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_trading_operations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_trading_operations_timestamp ON trading_operations;

CREATE TRIGGER trg_update_trading_operations_timestamp
    BEFORE UPDATE ON trading_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_trading_operations_timestamp();

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
