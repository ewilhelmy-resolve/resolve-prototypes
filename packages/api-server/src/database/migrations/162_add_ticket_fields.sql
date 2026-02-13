-- Migration: 162_add_ticket_fields.sql
-- Add requester, assigned_to, and priority columns to tickets table

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS requester TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS priority TEXT;

-- Backfill from ServiceNow source_metadata
UPDATE tickets
SET requester = source_metadata->'caller_id'->>'display_value'
WHERE requester IS NULL
  AND source_metadata->'caller_id'->>'display_value' IS NOT NULL
  AND source_metadata->'caller_id'->>'display_value' != '';

UPDATE tickets
SET assigned_to = source_metadata->'assigned_to'->>'display_value'
WHERE assigned_to IS NULL
  AND source_metadata->'assigned_to'->>'display_value' IS NOT NULL
  AND source_metadata->'assigned_to'->>'display_value' != '';

UPDATE tickets
SET priority = source_metadata->'priority'->>'display_value'
WHERE priority IS NULL
  AND source_metadata->'priority'->>'display_value' IS NOT NULL
  AND source_metadata->'priority'->>'display_value' != '';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- ALTER TABLE tickets DROP COLUMN IF EXISTS requester;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS assigned_to;
-- ALTER TABLE tickets DROP COLUMN IF EXISTS priority;
