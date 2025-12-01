-- Migration: 139_autopilot_schema_updates.sql
-- Schema updates for autopilot tables (post migration 138)
-- 1. Make tickets.cluster_id nullable (NULL = unclassified)
-- 2. Add subcluster support to clusters
-- 3. Add cluster_text to tickets for classification
-- 4. Drop analytics_cluster_daily (deferred - calculation logic TBD)

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
