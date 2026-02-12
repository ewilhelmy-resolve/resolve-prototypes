-- Migration: Add auto_sync column to data_source_connections
-- Used by external workflow platform to schedule automatic ticket syncs

ALTER TABLE data_source_connections
  ADD COLUMN IF NOT EXISTS auto_sync BOOLEAN DEFAULT true;

-- Update existing rows to true (explicit, though DEFAULT handles new rows)
UPDATE data_source_connections SET auto_sync = true WHERE auto_sync IS NULL;

-- Add NOT NULL constraint after backfill
ALTER TABLE data_source_connections
  ALTER COLUMN auto_sync SET NOT NULL;

COMMENT ON COLUMN data_source_connections.auto_sync IS 'Whether to automatically sync tickets on schedule (ITSM only)';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- ALTER TABLE data_source_connections DROP COLUMN IF EXISTS auto_sync;
