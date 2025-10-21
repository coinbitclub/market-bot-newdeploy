-- Migration: Add position_size_percentage column to users table
-- Date: 2025-01-20
-- Description: Adds the missing position_size_percentage column to the users table

-- Check if column exists before adding it
DO $$
BEGIN
    -- Add position_size_percentage column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'position_size_percentage'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN position_size_percentage DECIMAL(5,2) DEFAULT 10.00;
        
        -- Add comment to the column
        COMMENT ON COLUMN users.position_size_percentage IS 'Percentage of balance to use for position sizing (default 10%)';
        
        RAISE NOTICE 'Column position_size_percentage added to users table';
    ELSE
        RAISE NOTICE 'Column position_size_percentage already exists in users table';
    END IF;
END $$;

-- Update existing users to have a default value if they don't have one
UPDATE users 
SET position_size_percentage = 10.00 
WHERE position_size_percentage IS NULL;

-- Add index for better performance on queries that filter by position_size_percentage
CREATE INDEX IF NOT EXISTS idx_users_position_size_percentage 
ON users(position_size_percentage);

-- Verify the column was added successfully
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'position_size_percentage';
