-- Migration: Remove external_cluster_id, add natural key constraint, add active model flag
-- Reason: external_cluster_id has no equivalent in ML model (topics from CSV)

-- =============================================================================
-- 1. CLUSTERS: Remove external_cluster_id
-- =============================================================================

DROP INDEX IF EXISTS idx_clusters_external_cluster_id;
ALTER TABLE clusters DROP CONSTRAINT IF EXISTS uq_clusters_external_id_org;
ALTER TABLE clusters DROP COLUMN IF EXISTS external_cluster_id;

-- =============================================================================
-- 2. CLUSTERS: Make model_id required
-- =============================================================================

ALTER TABLE clusters ALTER COLUMN model_id SET NOT NULL;

-- Change FK to CASCADE (delete clusters when model deleted)
ALTER TABLE clusters DROP CONSTRAINT clusters_model_id_fkey;
ALTER TABLE clusters ADD CONSTRAINT clusters_model_id_fkey 
  FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE CASCADE;

-- =============================================================================
-- 3. CLUSTERS: Add natural key constraint for idempotent upserts
-- =============================================================================

-- COALESCE handles NULL subcluster_name (treats as empty string for uniqueness)
CREATE UNIQUE INDEX uq_clusters_org_model_name_subcluster
  ON clusters (organization_id, model_id, name, COALESCE(subcluster_name, ''));

COMMENT ON COLUMN clusters.model_id IS 'ML model that generated this cluster (required)';
COMMENT ON INDEX uq_clusters_org_model_name_subcluster IS 'Natural key for idempotent upsert by WF';

-- =============================================================================
-- 4. ML_MODELS: Add active flag
-- =============================================================================

ALTER TABLE ml_models ADD COLUMN active BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_ml_models_active ON ml_models(organization_id, active) WHERE active = true;

COMMENT ON COLUMN ml_models.active IS 'Whether this is the active model for the org (one per org, enforced by WF)';
