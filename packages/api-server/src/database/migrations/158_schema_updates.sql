-- Migration: 158_schema_updates.sql
-- 1. Change ml_models training dates from DATE to TIMESTAMP WITH TIME ZONE
-- 2. Add custom_fields JSONB column to tickets table

-- =============================================================================
-- 1. ML_MODELS: DATE → TIMESTAMP WITH TIME ZONE
-- =============================================================================

ALTER TABLE ml_models 
  ALTER COLUMN training_start_date TYPE TIMESTAMP WITH TIME ZONE 
    USING training_start_date::timestamp with time zone,
  ALTER COLUMN training_end_date TYPE TIMESTAMP WITH TIME ZONE 
    USING training_end_date::timestamp with time zone;

COMMENT ON COLUMN ml_models.training_start_date IS 'When model training started';
COMMENT ON COLUMN ml_models.training_end_date IS 'When model training completed';

-- =============================================================================
-- 2. TICKETS: Add custom_fields JSONB
-- =============================================================================

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS custom_fields JSONB;

COMMENT ON COLUMN tickets.custom_fields IS 'Flexible field for ingestion data (e.g., is_usable for cluster assignment eligibility)';

-- Index for querying tickets by is_usable flag
CREATE INDEX IF NOT EXISTS idx_tickets_is_usable ON tickets ((custom_fields->>'is_usable'));

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- 
-- DROP INDEX IF EXISTS idx_tickets_is_usable;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS custom_fields;
-- 
-- ALTER TABLE ml_models 
--   ALTER COLUMN training_start_date TYPE DATE USING training_start_date::date,
--   ALTER COLUMN training_end_date TYPE DATE USING training_end_date::date;
