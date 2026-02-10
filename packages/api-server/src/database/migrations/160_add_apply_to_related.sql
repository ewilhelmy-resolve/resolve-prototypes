-- Migration: 160_add_apply_to_related.sql
-- Add apply_to_related column to credential_delegation_tokens table
-- This flag indicates whether credentials should also be applied to related connections
-- (e.g., Confluence for Jira ITSM, Knowledge Base for ServiceNow ITSM)

ALTER TABLE credential_delegation_tokens
  ADD COLUMN IF NOT EXISTS apply_to_related BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN credential_delegation_tokens.apply_to_related IS
  'Whether to apply credentials to related connection (e.g., KB for ITSM)';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- ALTER TABLE credential_delegation_tokens DROP COLUMN IF EXISTS apply_to_related;
