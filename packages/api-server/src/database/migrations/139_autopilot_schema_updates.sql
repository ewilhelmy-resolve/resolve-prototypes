-- Migration: 139_autopilot_schema_updates.sql
-- Schema updates for autopilot tables (post migration 138)
-- 1. Make tickets.cluster_id nullable (NULL = unclassified)
-- 2. Add subcluster support to clusters
-- 3. Add cluster_text to tickets for classification
-- 4. Drop analytics_cluster_daily (deferred - calculation logic TBD)
-- 5. Replace knowledge_articles with cluster_kb_links junction table
-- 6. Remove undefined validation/automation fields (defer until product spec)

-- =============================================================================
-- 1. MAKE TICKETS.CLUSTER_ID NULLABLE (unclassified tickets)
-- =============================================================================

-- Drop existing FK constraint
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_cluster_id_fkey;

-- Make column nullable
ALTER TABLE tickets ALTER COLUMN cluster_id DROP NOT NULL;

-- Re-add FK with ON DELETE SET NULL (unclassified if cluster deleted)
ALTER TABLE tickets
ADD CONSTRAINT tickets_cluster_id_fkey
FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE SET NULL;

-- Update comments
COMMENT ON TABLE tickets IS 'ITSM tickets from Workflow Platform (NULL cluster_id = unclassified)';
COMMENT ON COLUMN tickets.cluster_id IS 'NULL until classification workflow assigns cluster';

-- =============================================================================
-- 2. SUBCLUSTER SUPPORT
-- =============================================================================

-- Add parent_cluster_id column (NULL = top-level cluster)
ALTER TABLE clusters
ADD COLUMN parent_cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE;

-- Index for querying subclusters
CREATE INDEX idx_clusters_parent_cluster_id ON clusters(parent_cluster_id);

-- Comment
COMMENT ON COLUMN clusters.parent_cluster_id IS 'Self-ref FK for subclusters (NULL=top-level, 2 levels max enforced in app)';

-- =============================================================================
-- 3. CLASSIFICATION TEXT FIELD
-- =============================================================================

-- Add cluster_text column (set by ingestion workflow, used by classification workflow)
ALTER TABLE tickets
ADD COLUMN cluster_text TEXT;

-- Comment
COMMENT ON COLUMN tickets.cluster_text IS 'Text used for classification (set by ingestion, used by classification workflow)';

-- =============================================================================
-- 4. DROP ANALYTICS TABLE (DEFERRED)
-- =============================================================================

DROP TABLE IF EXISTS analytics_cluster_daily CASCADE;

-- =============================================================================
-- 5. REPLACE KNOWLEDGE_ARTICLES WITH JUNCTION TABLE
-- =============================================================================

-- Drop knowledge_articles (use blob_metadata instead)
DROP TABLE IF EXISTS knowledge_articles CASCADE;

-- Create junction table linking blob_metadata to clusters
CREATE TABLE cluster_kb_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    blob_metadata_id UUID NOT NULL REFERENCES blob_metadata(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (cluster_id, blob_metadata_id)
);

CREATE INDEX idx_cluster_kb_links_cluster_id ON cluster_kb_links(cluster_id);
CREATE INDEX idx_cluster_kb_links_blob_metadata_id ON cluster_kb_links(blob_metadata_id);
CREATE INDEX idx_cluster_kb_links_organization_id ON cluster_kb_links(organization_id);

ALTER TABLE cluster_kb_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_kb_links" ON cluster_kb_links
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

COMMENT ON TABLE cluster_kb_links IS 'Links clusters to KB articles in blob_metadata';

-- =============================================================================
-- 6. REMOVE UNDEFINED VALIDATION/AUTOMATION FIELDS (defer until product spec)
-- =============================================================================

-- Tickets: remove validation sample fields
ALTER TABLE tickets DROP COLUMN IF EXISTS is_validation_sample;
ALTER TABLE tickets DROP COLUMN IF EXISTS validation_result;
ALTER TABLE tickets DROP COLUMN IF EXISTS validated_by;
ALTER TABLE tickets DROP COLUMN IF EXISTS validated_at;

-- Clusters: remove validation/automation fields
ALTER TABLE clusters DROP COLUMN IF EXISTS validation_target;
ALTER TABLE clusters DROP COLUMN IF EXISTS validation_current;
ALTER TABLE clusters DROP COLUMN IF EXISTS automation_enabled_by;
ALTER TABLE clusters DROP COLUMN IF EXISTS automation_enabled_at;

-- =============================================================================
-- ROLLBACK SCRIPT
-- =============================================================================
--
-- Revert cluster_id to NOT NULL with ON DELETE CASCADE:
-- ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_cluster_id_fkey;
-- DELETE FROM tickets WHERE cluster_id IS NULL;
-- ALTER TABLE tickets ALTER COLUMN cluster_id SET NOT NULL;
-- ALTER TABLE tickets ADD CONSTRAINT tickets_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE;
--
-- DROP INDEX IF EXISTS idx_clusters_parent_cluster_id;
-- ALTER TABLE clusters DROP COLUMN IF EXISTS parent_cluster_id;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS cluster_text;
-- Re-run migration 138 section for analytics_cluster_daily if needed
-- DROP TABLE IF EXISTS cluster_kb_links CASCADE;
-- Re-run migration 138 section for knowledge_articles if needed
-- Re-run migration 138 section for tickets validation fields if needed
-- Re-run migration 138 section for clusters validation/automation fields if needed
