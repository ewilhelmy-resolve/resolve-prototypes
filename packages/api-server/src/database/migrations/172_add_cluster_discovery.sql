-- Migration: 172_add_cluster_discovery.sql
-- Adds cluster_discovery table for tracking discovered cluster candidates
-- before promotion to the clusters table. Also adds cluster_score to tickets.

-- ============================================================================
-- 1. CLUSTER_DISCOVERY TABLE
-- ============================================================================

CREATE TABLE cluster_discovery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    cluster_name TEXT NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT false,
    committed BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT cluster_discovery_approved_committed_check CHECK (approved OR NOT committed)
);

CREATE INDEX idx_cluster_discovery_organization_id ON cluster_discovery(organization_id);
CREATE INDEX idx_cluster_discovery_ticket_id ON cluster_discovery(ticket_id);

ALTER TABLE cluster_discovery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_cluster_discovery" ON cluster_discovery
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE TRIGGER set_cluster_discovery_updated_at
    BEFORE UPDATE ON cluster_discovery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cluster_discovery IS 'Discovered cluster candidates pending approval before promotion to clusters';
COMMENT ON COLUMN cluster_discovery.cluster_name IS 'Proposed cluster name (no FK — discovery precedes cluster creation)';
COMMENT ON COLUMN cluster_discovery.approved IS 'Whether discovery has been reviewed and approved';
COMMENT ON COLUMN cluster_discovery.committed IS 'Whether approved discovery has been committed to clusters table';
COMMENT ON COLUMN cluster_discovery.metadata IS 'Freeform JSONB for discovery context and scoring data';

-- ============================================================================
-- 2. ADD cluster_score TO TICKETS
-- ============================================================================

ALTER TABLE tickets ADD COLUMN cluster_score REAL CHECK (cluster_score >= 0.0 AND cluster_score <= 1.0);

COMMENT ON COLUMN tickets.cluster_score IS 'Clustering similarity/relevance score (0.0–1.0)';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- ALTER TABLE tickets DROP COLUMN IF EXISTS cluster_score;
-- DROP TABLE IF EXISTS cluster_discovery CASCADE;
