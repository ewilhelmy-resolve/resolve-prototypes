-- Migration: 143_flatten_subcluster_model.sql
-- 1. Flatten subcluster model (replace parent_cluster_id with subcluster_name)
-- 2. Add ml_models table for ML team integration
-- 3. Add model_id FK to clusters

-- =============================================================================
-- 1. FLATTEN SUBCLUSTER MODEL
-- =============================================================================

DROP INDEX IF EXISTS idx_clusters_parent_cluster_id;
ALTER TABLE clusters DROP COLUMN IF EXISTS parent_cluster_id;

ALTER TABLE clusters ADD COLUMN subcluster_name TEXT;

COMMENT ON COLUMN clusters.subcluster_name IS 'Subcluster name (NULL = top-level cluster only)';

-- =============================================================================
-- 2. ML_MODELS TABLE
-- =============================================================================

CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    external_model_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    training_start_date DATE,
    training_end_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (organization_id, external_model_id)
);

CREATE INDEX idx_ml_models_organization_id ON ml_models(organization_id);
CREATE INDEX idx_ml_models_external_model_id ON ml_models(external_model_id);

ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_access_own_organization_ml_models" ON ml_models
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE TRIGGER set_ml_models_updated_at
    BEFORE UPDATE ON ml_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ml_models IS 'ML classification models (populated by WF from ML team endpoints)';
COMMENT ON COLUMN ml_models.external_model_id IS 'Model ID from ML team system (used in API calls)';

-- =============================================================================
-- 3. ADD MODEL_ID FK TO CLUSTERS
-- =============================================================================

ALTER TABLE clusters ADD COLUMN model_id UUID REFERENCES ml_models(id) ON DELETE SET NULL;
CREATE INDEX idx_clusters_model_id ON clusters(model_id);
COMMENT ON COLUMN clusters.model_id IS 'ML model that generated this cluster';

-- =============================================================================
-- ROLLBACK SCRIPT
-- =============================================================================
--
-- ALTER TABLE clusters DROP COLUMN IF EXISTS model_id;
-- DROP INDEX IF EXISTS idx_clusters_model_id;
-- DROP TABLE IF EXISTS ml_models CASCADE;
-- ALTER TABLE clusters DROP COLUMN IF EXISTS subcluster_name;
-- ALTER TABLE clusters ADD COLUMN parent_cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE;
-- CREATE INDEX idx_clusters_parent_cluster_id ON clusters(parent_cluster_id);
