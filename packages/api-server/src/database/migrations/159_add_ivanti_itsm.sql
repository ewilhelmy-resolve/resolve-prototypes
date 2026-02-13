-- Migration: Add Ivanti ITSM support
-- Adds 'ivanti_itsm' to credential_delegation_tokens CHECK constraint

-- Update CHECK constraint to include ivanti_itsm
ALTER TABLE credential_delegation_tokens
  DROP CONSTRAINT IF EXISTS credential_delegation_tokens_itsm_system_type_check;

ALTER TABLE credential_delegation_tokens
  ADD CONSTRAINT credential_delegation_tokens_itsm_system_type_check
  CHECK (itsm_system_type IN ('servicenow_itsm', 'jira_itsm', 'ivanti_itsm'));

COMMENT ON COLUMN credential_delegation_tokens.itsm_system_type IS 'ITSM connection type: servicenow_itsm, jira_itsm, ivanti_itsm';
