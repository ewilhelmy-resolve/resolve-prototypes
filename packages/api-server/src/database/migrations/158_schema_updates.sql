-- Migration: 158_schema_updates.sql
-- 1. Change ml_models training dates from DATE to TIMESTAMP WITH TIME ZONE
-- 2. Add custom_fields JSONB column to tickets table

-- =============================================================================
-- 1. ML_MODELS: DATE → TIMESTAMP WITH TIME ZONE
-- =============================================================================

ALTER TABLE ml_models 
  ALTER COLUMN training_start_date TYPE TIMESTAMP WITH TIME ZONE 
    USING training_start_date::date::timestamp with time zone,
  ALTER COLUMN training_end_date TYPE TIMESTAMP WITH TIME ZONE 
    USING training_end_date::date::timestamp with time zone;

COMMENT ON COLUMN ml_models.training_start_date IS 'When model training started';
COMMENT ON COLUMN ml_models.training_end_date IS 'When model training completed';

-- =============================================================================
-- 2. TICKETS: Add custom_fields JSONB
-- =============================================================================

ALTER TABLE tickets ADD COLUMN custom_fields JSONB;

COMMENT ON COLUMN tickets.custom_fields IS 'Flexible field for ingestion data (e.g., is_usable for cluster assignment eligibility)';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- 
-- ALTER TABLE tickets DROP COLUMN IF EXISTS custom_fields;
-- 
-- ALTER TABLE ml_models 
--   ALTER COLUMN training_start_date TYPE DATE USING training_start_date::date,
--   ALTER COLUMN training_end_date TYPE DATE USING training_end_date::date;
