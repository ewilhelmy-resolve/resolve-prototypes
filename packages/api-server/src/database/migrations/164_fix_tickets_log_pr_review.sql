-- Migration: 164_fix_tickets_log_pr_review.sql
-- PR review fixes for tickets_log: CHECK constraint, RLS, index cleanup, NOT NULL, metadata default

-- ============================================================================
-- 1. ADD CHECK constraint on event_type
-- ============================================================================

ALTER TABLE tickets_log
    ADD CONSTRAINT tickets_log_event_type_check
    CHECK (event_type IN ('ingested', 'clustered', 'agent_start', 'agent_end', 'agent_fail', 'user_recluster'));

-- ============================================================================
-- 2. ADD organization_id + RLS (denormalized for org isolation)
-- ============================================================================

ALTER TABLE tickets_log
    ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill from tickets table
UPDATE tickets_log tl
    SET organization_id = t.organization_id
    FROM tickets t
    WHERE tl.ticket_id = t.id;

-- Now enforce NOT NULL
ALTER TABLE tickets_log
    ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX idx_tickets_log_organization_id ON tickets_log(organization_id);

ALTER TABLE tickets_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_tickets_log" ON tickets_log
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

COMMENT ON COLUMN tickets_log.organization_id IS 'Denormalized from tickets for RLS org isolation';

-- ============================================================================
-- 3. DROP low-selectivity event_type index (6 values, queries use ticket_id first)
-- ============================================================================

DROP INDEX IF EXISTS idx_tickets_log_event_type;

-- ============================================================================
-- 4. ADD NOT NULL to timestamps
-- ============================================================================

ALTER TABLE tickets_log
    ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE tickets_log
    ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE agents
    ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE agents
    ALTER COLUMN updated_at SET NOT NULL;

-- ============================================================================
-- 5. ADD default on metadata JSONB
-- ============================================================================

ALTER TABLE tickets_log
    ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

-- Backfill existing NULLs
UPDATE tickets_log SET metadata = '{}'::jsonb WHERE metadata IS NULL;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- UPDATE tickets_log SET metadata = NULL WHERE metadata = '{}'::jsonb;
-- ALTER TABLE tickets_log ALTER COLUMN metadata DROP DEFAULT;
-- ALTER TABLE agents ALTER COLUMN updated_at DROP NOT NULL;
-- ALTER TABLE agents ALTER COLUMN created_at DROP NOT NULL;
-- ALTER TABLE tickets_log ALTER COLUMN updated_at DROP NOT NULL;
-- ALTER TABLE tickets_log ALTER COLUMN created_at DROP NOT NULL;
-- CREATE INDEX idx_tickets_log_event_type ON tickets_log(event_type);
-- DROP POLICY IF EXISTS "users_access_own_organization_tickets_log" ON tickets_log;
-- ALTER TABLE tickets_log DISABLE ROW LEVEL SECURITY;
-- DROP INDEX IF EXISTS idx_tickets_log_organization_id;
-- ALTER TABLE tickets_log DROP COLUMN organization_id;
-- ALTER TABLE tickets_log DROP CONSTRAINT tickets_log_event_type_check;
