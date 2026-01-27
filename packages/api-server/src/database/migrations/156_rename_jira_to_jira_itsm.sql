-- Migration: Rename jira to jira_itsm
-- This consolidates Jira connections to use jira_itsm type

-- 1. Update data_source_connections: jira -> jira_itsm
UPDATE data_source_connections
SET type = 'jira_itsm',
    updated_at = NOW()
WHERE type = 'jira';

-- Delete duplicate jira_itsm records if both jira and jira_itsm existed for same org
DELETE FROM data_source_connections d1
USING data_source_connections d2
WHERE d1.organization_id = d2.organization_id
  AND d1.type = 'jira_itsm'
  AND d2.type = 'jira_itsm'
  AND d1.id != d2.id
  AND d1.updated_at < d2.updated_at;

-- 2. Update credential_delegation_tokens: jira -> jira_itsm
UPDATE credential_delegation_tokens
SET itsm_system_type = 'jira_itsm'
WHERE itsm_system_type = 'jira';

-- 3. Update constraint on credential_delegation_tokens
ALTER TABLE credential_delegation_tokens
  DROP CONSTRAINT IF EXISTS credential_delegation_tokens_itsm_system_type_check;

ALTER TABLE credential_delegation_tokens
  ADD CONSTRAINT credential_delegation_tokens_itsm_system_type_check
  CHECK (itsm_system_type IN ('servicenow_itsm', 'jira_itsm'));

-- Update comment
COMMENT ON COLUMN credential_delegation_tokens.itsm_system_type IS 'ITSM connection type: servicenow_itsm, jira_itsm';
