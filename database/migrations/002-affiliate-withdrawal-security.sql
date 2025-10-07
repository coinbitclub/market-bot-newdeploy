-- ================================================
-- Phase 2: Affiliate Withdrawal Security Migration
-- CoinBitClub Enterprise v6.0.0
-- Date: October 6, 2025
-- ================================================

-- Add new columns to affiliate_withdrawals table for enhanced security and tracking

-- Risk scoring and fraud detection
ALTER TABLE affiliate_withdrawals
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100);

COMMENT ON COLUMN affiliate_withdrawals.risk_score IS 'Fraud detection risk score (0-100): 0-19=MINIMAL, 20-39=LOW, 40-59=MEDIUM, 60-79=HIGH, 80-100=CRITICAL';

-- Admin approval tracking
ALTER TABLE affiliate_withdrawals
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE affiliate_withdrawals
ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE affiliate_withdrawals
ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN affiliate_withdrawals.approved_by IS 'Admin user ID who approved the withdrawal';
COMMENT ON COLUMN affiliate_withdrawals.rejected_by IS 'Admin user ID who rejected the withdrawal';
COMMENT ON COLUMN affiliate_withdrawals.completed_by IS 'Admin user ID who marked withdrawal as completed';

-- Admin notes and payment proof
ALTER TABLE affiliate_withdrawals
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE affiliate_withdrawals
ADD COLUMN IF NOT EXISTS payment_proof TEXT;

COMMENT ON COLUMN affiliate_withdrawals.admin_notes IS 'Internal notes from admin during approval/rejection';
COMMENT ON COLUMN affiliate_withdrawals.payment_proof IS 'URL or reference to payment proof document';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_status
ON affiliate_withdrawals(status);

CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_affiliate_id
ON affiliate_withdrawals(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_created_at
ON affiliate_withdrawals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_risk_score
ON affiliate_withdrawals(risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_approved_by
ON affiliate_withdrawals(approved_by) WHERE approved_by IS NOT NULL;

-- Composite index for pending withdrawals query
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_status_created
ON affiliate_withdrawals(status, created_at DESC);

-- Add check constraint to ensure valid workflow
ALTER TABLE affiliate_withdrawals
ADD CONSTRAINT chk_withdrawal_workflow
CHECK (
    (status = 'pending' AND approved_at IS NULL AND completed_at IS NULL) OR
    (status = 'approved' AND approved_at IS NOT NULL AND completed_at IS NULL) OR
    (status = 'completed' AND approved_at IS NOT NULL AND completed_at IS NOT NULL) OR
    (status = 'rejected' AND rejected_at IS NOT NULL)
);

-- Create audit log table for withdrawal actions
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

CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_withdrawal_id
ON affiliate_withdrawal_audit_log(withdrawal_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_admin_id
ON affiliate_withdrawal_audit_log(admin_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_audit_created_at
ON affiliate_withdrawal_audit_log(created_at DESC);

COMMENT ON TABLE affiliate_withdrawal_audit_log IS 'Complete audit trail for all withdrawal status changes';

-- Create function to automatically log withdrawal status changes
CREATE OR REPLACE FUNCTION log_withdrawal_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO affiliate_withdrawal_audit_log (
            withdrawal_id, action, new_status, metadata
        ) VALUES (
            NEW.id, 'requested', NEW.status,
            jsonb_build_object('amount', NEW.amount, 'method', NEW.method, 'risk_score', NEW.risk_score)
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Determine action based on status change
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
                    'risk_score', NEW.risk_score,
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

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS trg_withdrawal_status_change ON affiliate_withdrawals;
CREATE TRIGGER trg_withdrawal_status_change
    AFTER INSERT OR UPDATE OF status ON affiliate_withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION log_withdrawal_status_change();

-- Create view for admin dashboard
CREATE OR REPLACE VIEW vw_pending_withdrawals_with_risk AS
SELECT
    aw.id,
    aw.affiliate_id,
    aw.amount,
    aw.method,
    aw.fees,
    aw.net_amount,
    aw.status,
    aw.risk_score,
    aw.created_at,
    a.affiliate_code,
    a.current_balance as affiliate_balance,
    a.total_commissions as affiliate_total_commissions,
    u.full_name as affiliate_name,
    u.email as affiliate_email,
    u.phone as affiliate_phone,
    u.created_at as affiliate_joined_at,
    EXTRACT(DAY FROM (NOW() - u.created_at)) as account_age_days,
    (SELECT COUNT(*) FROM referrals r WHERE r.affiliate_id = a.id) as total_referrals,
    (SELECT COUNT(*) FROM referrals r WHERE r.affiliate_id = a.id AND r.status = 'active') as active_referrals,
    (SELECT COUNT(*) FROM affiliate_withdrawals w WHERE w.affiliate_id = a.id AND w.status = 'completed') as completed_withdrawals,
    (SELECT COUNT(*) FROM affiliate_withdrawals w WHERE w.affiliate_id = a.id AND w.status = 'rejected') as rejected_withdrawals,
    CASE
        WHEN aw.risk_score >= 80 THEN 'CRITICAL'
        WHEN aw.risk_score >= 60 THEN 'HIGH'
        WHEN aw.risk_score >= 40 THEN 'MEDIUM'
        WHEN aw.risk_score >= 20 THEN 'LOW'
        ELSE 'MINIMAL'
    END as risk_level
FROM affiliate_withdrawals aw
JOIN affiliates a ON aw.affiliate_id = a.id
JOIN users u ON a.user_id = u.id
WHERE aw.status = 'pending'
ORDER BY aw.risk_score DESC, aw.created_at ASC;

COMMENT ON VIEW vw_pending_withdrawals_with_risk IS 'Admin dashboard view for pending withdrawals with complete risk assessment data';

-- Create statistics view for monitoring
CREATE OR REPLACE VIEW vw_withdrawal_statistics AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    AVG(risk_score) as avg_risk_score,
    SUM(amount) as total_amount_requested,
    SUM(CASE WHEN status = 'completed' THEN net_amount ELSE 0 END) as total_amount_paid,
    AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) FILTER (WHERE approved_at IS NOT NULL) as avg_approval_time_hours,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FILTER (WHERE completed_at IS NOT NULL) as avg_completion_time_hours
FROM affiliate_withdrawals
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

COMMENT ON VIEW vw_withdrawal_statistics IS 'Daily withdrawal statistics for monitoring and reporting';

-- Grant permissions
GRANT SELECT ON vw_pending_withdrawals_with_risk TO PUBLIC;
GRANT SELECT ON vw_withdrawal_statistics TO PUBLIC;
GRANT SELECT, INSERT ON affiliate_withdrawal_audit_log TO PUBLIC;

-- Add helpful comments
COMMENT ON TABLE affiliate_withdrawals IS 'Affiliate commission withdrawal requests with fraud detection and approval workflow';
COMMENT ON TRIGGER trg_withdrawal_status_change ON affiliate_withdrawals IS 'Automatically logs all status changes to audit log table';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Phase 2 Migration Complete: Affiliate Withdrawal Security';
    RAISE NOTICE '   - Added risk scoring columns';
    RAISE NOTICE '   - Added admin tracking fields';
    RAISE NOTICE '   - Created 6 performance indexes';
    RAISE NOTICE '   - Created audit log table with trigger';
    RAISE NOTICE '   - Created 2 admin views';
    RAISE NOTICE '   - Added workflow constraints';
END $$;
