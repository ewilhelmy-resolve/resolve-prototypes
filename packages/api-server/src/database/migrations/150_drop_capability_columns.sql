-- Migration: Drop kb_enabled and itsm_enabled columns
-- These columns are obsolete after splitting ServiceNow into separate connection types:
--   - servicenow (KB only)
--   - servicenow_itsm (ITSM only)
-- The connection type itself now determines the capability.

ALTER TABLE data_source_connections
  DROP COLUMN IF EXISTS kb_enabled,
  DROP COLUMN IF EXISTS itsm_enabled;
