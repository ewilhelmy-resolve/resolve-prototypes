-- Migration: Add description column to tickets table
-- Purpose: Human-readable ticket description for UI display (separate from cluster_text used for ML)

-- =============================================================================
-- 1. Add description column
-- =============================================================================

ALTER TABLE tickets ADD COLUMN description TEXT;

COMMENT ON COLUMN tickets.description IS 'Human-readable ticket description for display (set by ingestion)';

-- =============================================================================
-- 2. Backfill from source_metadata (ServiceNow format)
-- =============================================================================

UPDATE tickets
SET description = source_metadata->'description'->>'display_value'
WHERE description IS NULL
  AND source_metadata->'description'->>'display_value' IS NOT NULL
  AND source_metadata->'description'->>'display_value' != '';

-- =============================================================================
-- DOWN (rollback)
-- =============================================================================
-- ALTER TABLE tickets DROP COLUMN IF EXISTS description;
