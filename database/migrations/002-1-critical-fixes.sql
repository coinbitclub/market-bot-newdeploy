-- ================================================
-- Phase 2.1: CRITICAL FIXES - Emergency Migration
-- CoinBitClub Enterprise v6.0.0
-- Date: October 6, 2025
-- ================================================
--
-- This migration fixes critical schema incompatibilities
-- identified in PRODUCTION-VALIDATION-PHASE-2.md
--
-- RUN THIS BEFORE deploying Phase 2 to production!
-- ================================================

\echo '🚨 Starting Critical Fixes Migration...'

-- ================================================
-- FIX 1: Add Missing Columns to affiliate_withdrawals
-- ================================================

\echo '📝 Adding missing columns to affiliate_withdrawals...'

-- Add risk scoring column
ALTER TABLE affiliate_withdrawals
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- Add constraint after column creation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'affiliate_withdrawals' AND constraint_name = 'affiliate_withdrawals_risk_score_check'
    ) THEN
        ALTER TABLE affiliate_withdrawals
        ADD CONSTRAINT affiliate_withdrawals_risk_score_check
        CHECK (risk_score >= 0 AND risk_score <= 100);
    END IF;
END $$;

-- Add rejection tracking
ALTER TABLE affiliate_withdrawals
ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add completion tracking
ALTER TABLE affiliate_withdrawals
ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add admin notes
ALTER TABLE affiliate_withdrawals
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add payment proof
ALTER TABLE affiliate_withdrawals
ADD COLUMN IF NOT EXISTS payment_proof TEXT;

\echo '✅ Missing columns added'

-- ================================================
-- FIX 2: Remove Incorrect 'processed_by' Column
-- ================================================

\echo '🗑️  Removing incorrect processed_by column if exists...'

ALTER TABLE affiliate_withdrawals
DROP COLUMN IF EXISTS processed_by;

\echo '✅ Incorrect column removed'

-- ================================================
-- FIX 3: Fix Status Workflow (Remove 'processing' status)
-- ================================================

\echo '🔧 Fixing status workflow...'

-- Update any existing 'processing' records to 'approved'
UPDATE affiliate_withdrawals
SET status = 'approved'
WHERE status = 'processing';

-- Drop old constraint if exists
ALTER TABLE affiliate_withdrawals
DROP CONSTRAINT IF EXISTS affiliate_withdrawals_status_check;

-- Add new constraint with correct statuses
ALTER TABLE affiliate_withdrawals
ADD CONSTRAINT affiliate_withdrawals_status_check
CHECK (status IN ('pending', 'approved', 'completed', 'rejected'));

\echo '✅ Status workflow fixed'

-- ================================================
-- FIX 4: Create Audit Log Table
-- ================================================

\echo '📊 Creating audit log table...'

CREATE TABLE IF NOT EXISTS affiliate_withdrawal_audit_log (
    id SERIAL PRIMARY KEY,
    withdrawal_id INTEGER NOT NULL REFERENCES affiliate_withdrawals(id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('requested', 'approved', 'rejected', 'completed', 'cancelled')),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_withdrawal_id
ON affiliate_withdrawal_audit_log(withdrawal_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_admin_id
ON affiliate_withdrawal_audit_log(admin_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_created_at
ON affiliate_withdrawal_audit_log(created_at DESC);

\echo '✅ Audit log table created'

-- ================================================
-- FIX 5: Create Audit Logging Trigger
-- ================================================

\echo '⚙️  Creating audit logging trigger...'

-- Create trigger function
CREATE OR REPLACE FUNCTION log_withdrawal_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO affiliate_withdrawal_audit_log (
            withdrawal_id, action, new_status, metadata
        ) VALUES (
            NEW.id, 'requested', NEW.status,
            jsonb_build_object(
                'amount', NEW.amount,
                'method', NEW.method,
                'risk_score', COALESCE(NEW.risk_score, 0)
            )
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        DECLARE
            action_type VARCHAR(50);
            admin_user_id INTEGER;
        BEGIN
            CASE NEW.status
                WHEN 'approved' THEN
                    action_type := 'approved';
                    admin_user_id := NEW.approved_by;
                WHEN 'rejected' THEN
                    action_type := 'rejected';
                    admin_user_id := NEW.rejected_by;
                WHEN 'completed' THEN
                    action_type := 'completed';
                    admin_user_id := NEW.completed_by;
                ELSE
                    action_type := 'status_changed';
                    admin_user_id := NULL;
            END CASE;

            INSERT INTO affiliate_withdrawal_audit_log (
                withdrawal_id, admin_id, action, previous_status, new_status, notes, metadata
            ) VALUES (
                NEW.id, admin_user_id, action_type, OLD.status, NEW.status,
                NEW.admin_notes,
                jsonb_build_object(
                    'amount', NEW.amount,
                    'method', NEW.method,
                    'risk_score', COALESCE(NEW.risk_score, 0),
                    'transaction_id', NEW.transaction_id,
                    'rejection_reason', NEW.rejection_reason
                )
            );
        END;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_withdrawal_status_change ON affiliate_withdrawals;

-- Create trigger
CREATE TRIGGER trg_withdrawal_status_change
    AFTER INSERT OR UPDATE OF status ON affiliate_withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION log_withdrawal_status_change();

\echo '✅ Audit logging trigger created'

-- ================================================
-- FIX 6: Add Performance Indexes
-- ================================================

\echo '🚀 Adding performance indexes...'

CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_risk_score
ON affiliate_withdrawals(risk_score DESC)
WHERE risk_score > 0;

CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_approved_by
ON affiliate_withdrawals(approved_by)
WHERE approved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_status_created
ON affiliate_withdrawals(status, created_at DESC);

\echo '✅ Performance indexes added'

-- ================================================
-- FIX 7: Verify Required Tables Exist
-- ================================================

\echo '🔍 Verifying required tables exist...'

DO $$
DECLARE
    missing_tables TEXT[];
    table_name TEXT;
BEGIN
    -- Check for required tables
    SELECT ARRAY_AGG(t) INTO missing_tables
    FROM unnest(ARRAY['affiliates', 'referrals', 'commissions', 'affiliate_links', 'affiliate_clicks']) AS t
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = t
    );

    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING '⚠️  Missing tables detected: %', array_to_string(missing_tables, ', ');
        RAISE WARNING '⚠️  Risk scoring may fail. Please create these tables before deploying Phase 2.';
    ELSE
        RAISE NOTICE '✅ All required tables exist';
    END IF;
END $$;

-- ================================================
-- FIX 8: Validate Affiliate Table Structure
-- ================================================

\echo '🔍 Validating affiliate tables structure...'

DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    -- Check if affiliates table has created_at column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliates') THEN
        SELECT ARRAY_AGG(col) INTO missing_columns
        FROM unnest(ARRAY['id', 'user_id', 'created_at', 'current_balance']) AS col
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'affiliates' AND column_name = col
        );

        IF array_length(missing_columns, 1) > 0 THEN
            RAISE WARNING '⚠️  affiliates table missing columns: %', array_to_string(missing_columns, ', ');
        ELSE
            RAISE NOTICE '✅ affiliates table structure looks good';
        END IF;
    END IF;

    -- Check if referrals table has required columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referrals') THEN
        SELECT ARRAY_AGG(col) INTO missing_columns
        FROM unnest(ARRAY['id', 'affiliate_id', 'status', 'conversion_value']) AS col
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'referrals' AND column_name = col
        );

        IF array_length(missing_columns, 1) > 0 THEN
            RAISE WARNING '⚠️  referrals table missing columns: %', array_to_string(missing_columns, ', ');
        ELSE
            RAISE NOTICE '✅ referrals table structure looks good';
        END IF;
    END IF;
END $$;

-- ================================================
-- FIX 9: Create Summary View for Admin Dashboard
-- ================================================

\echo '📊 Creating admin dashboard view...'

CREATE OR REPLACE VIEW vw_pending_withdrawals_summary AS
SELECT
    aw.id,
    aw.affiliate_id,
    aw.amount,
    aw.method,
    aw.status,
    aw.risk_score,
    aw.created_at,
    EXTRACT(HOUR FROM (NOW() - aw.created_at)) as hours_pending,
    CASE
        WHEN aw.risk_score >= 80 THEN 'CRITICAL'
        WHEN aw.risk_score >= 60 THEN 'HIGH'
        WHEN aw.risk_score >= 40 THEN 'MEDIUM'
        WHEN aw.risk_score >= 20 THEN 'LOW'
        ELSE 'MINIMAL'
    END as risk_level
FROM affiliate_withdrawals aw
WHERE aw.status = 'pending'
ORDER BY aw.risk_score DESC, aw.created_at ASC;

\echo '✅ Admin dashboard view created'

-- ================================================
-- FIX 10: Add Helpful Comments
-- ================================================

COMMENT ON COLUMN affiliate_withdrawals.risk_score IS
'Fraud detection risk score (0-100): 0-19=MINIMAL, 20-39=LOW, 40-59=MEDIUM, 60-79=HIGH, 80-100=CRITICAL';

COMMENT ON COLUMN affiliate_withdrawals.approved_by IS
'Admin user ID who approved the withdrawal';

COMMENT ON COLUMN affiliate_withdrawals.rejected_by IS
'Admin user ID who rejected the withdrawal';

COMMENT ON COLUMN affiliate_withdrawals.completed_by IS
'Admin user ID who marked withdrawal as completed';

COMMENT ON COLUMN affiliate_withdrawals.admin_notes IS
'Internal notes from admin during approval/rejection/completion';

COMMENT ON COLUMN affiliate_withdrawals.payment_proof IS
'URL or reference to payment proof document (bank receipt, PIX confirmation, etc.)';

COMMENT ON TABLE affiliate_withdrawal_audit_log IS
'Complete audit trail for all withdrawal status changes - automatically populated by trigger';

COMMENT ON VIEW vw_pending_withdrawals_summary IS
'Quick summary view of pending withdrawals with risk levels for admin dashboard';

-- ================================================
-- VALIDATION & SUMMARY
-- ================================================

\echo ''
\echo '================================================'
\echo '✅ CRITICAL FIXES MIGRATION COMPLETE'
\echo '================================================'

-- Display summary
SELECT
    'affiliate_withdrawals' as table_name,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'affiliate_withdrawals'
UNION ALL
SELECT
    'affiliate_withdrawal_audit_log',
    COUNT(*)
FROM information_schema.columns
WHERE table_name = 'affiliate_withdrawal_audit_log';

-- Display new columns
\echo ''
\echo '📋 New columns in affiliate_withdrawals:'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'affiliate_withdrawals'
AND column_name IN ('risk_score', 'rejected_by', 'completed_by', 'admin_notes', 'payment_proof')
ORDER BY ordinal_position;

-- Display indexes
\echo ''
\echo '🚀 Performance indexes created:'
SELECT indexname
FROM pg_indexes
WHERE tablename = 'affiliate_withdrawals'
AND indexname LIKE 'idx_%'
ORDER BY indexname;

\echo ''
\echo '================================================'
\echo '✅ Database is now ready for Phase 2 deployment'
\echo '================================================'
\echo ''
\echo '⚠️  NEXT STEPS:'
\echo '1. Run full schema validation query'
\echo '2. Test risk scoring with sample data'
\echo '3. Verify all required tables exist'
\echo '4. Deploy application code'
\echo '================================================'
