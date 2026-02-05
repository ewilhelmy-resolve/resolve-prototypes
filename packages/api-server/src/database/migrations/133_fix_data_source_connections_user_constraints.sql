-- Migration 131: Remove data_source_connections User Foreign Key Constraints
-- Purpose: Allow user deletion when user created/updated data source connections
-- Issue: created_by/updated_by FKs block user deletion (not needed - org CASCADE handles cleanup)
-- Solution: Drop FKs entirely - these are historical audit fields, not active relationships
-- Phase: Phase 2 - Hard Delete Implementation
-- Risk: LOW - Only removes constraints, preserves all data
-- Date: 2025-10-24
--
-- Rationale:
-- - data_source_connections already has organization_id FK with ON DELETE CASCADE
-- - When org is deleted (e.g., last owner deletes account), all data sources are deleted
-- - created_by/updated_by are audit fields for historical tracking, not active relationships
-- - No need for FK constraints on audit-only fields

-- =============================================================================
-- Drop User Foreign Key Constraints
-- =============================================================================

ALTER TABLE data_source_connections
  DROP CONSTRAINT IF EXISTS data_source_connections_created_by_fkey;

ALTER TABLE data_source_connections
  DROP CONSTRAINT IF EXISTS data_source_connections_updated_by_fkey;

-- =============================================================================
-- ROLLBACK SCRIPT (If migration needs to be reverted)
-- =============================================================================

-- To rollback this migration, run:
--
-- ALTER TABLE data_source_connections
--   ADD CONSTRAINT data_source_connections_created_by_fkey
--     FOREIGN KEY (created_by) REFERENCES user_profiles(user_id);
--
-- ALTER TABLE data_source_connections
--   ADD CONSTRAINT data_source_connections_updated_by_fkey
--     FOREIGN KEY (updated_by) REFERENCES user_profiles(user_id);