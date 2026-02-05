-- Migration: Rename jira to jira_itsm
-- This consolidates Jira connections to use jira_itsm type

-- 1. Update constraint FIRST to allow jira_itsm (temporarily allow both)
ALTER TABLE credential_delegation_tokens
  DROP CONSTRAINT IF EXISTS credential_delegation_tokens_itsm_system_type_check;

ALTER TABLE credential_delegation_tokens
  ADD CONSTRAINT credential_delegation_tokens_itsm_system_type_check
  CHECK (itsm_system_type IN ('servicenow_itsm', 'jira', 'jira_itsm'));

-- 2. data_source_connections: Update jira -> jira_itsm only if jira_itsm doesn't exist for that org
UPDATE data_source_connections d1
SET type = 'jira_itsm',
    updated_at = NOW()
WHERE d1.type = 'jira'
  AND NOT EXISTS (
    SELECT 1 FROM data_source_connections d2
    WHERE d2.organization_id = d1.organization_id AND d2.type = 'jira_itsm'
  );

-- 3. data_source_connections: Delete remaining jira records
DELETE FROM data_source_connections
WHERE type = 'jira';

-- 4. credential_delegation_tokens: Update jira -> jira_itsm only if jira_itsm doesn't exist
UPDATE credential_delegation_tokens t1
SET itsm_system_type = 'jira_itsm'
WHERE t1.itsm_system_type = 'jira'
  AND NOT EXISTS (
    SELECT 1 FROM credential_delegation_tokens t2
    WHERE t2.organization_id = t1.organization_id
      AND t2.admin_email = t1.admin_email
      AND t2.itsm_system_type = 'jira_itsm'
  );

-- 5. credential_delegation_tokens: Delete remaining jira records
DELETE FROM credential_delegation_tokens
WHERE itsm_system_type = 'jira';

-- 6. Update constraint to final state (remove jira)
ALTER TABLE credential_delegation_tokens
  DROP CONSTRAINT IF EXISTS credential_delegation_tokens_itsm_system_type_check;

ALTER TABLE credential_delegation_tokens
  ADD CONSTRAINT credential_delegation_tokens_itsm_system_type_check
  CHECK (itsm_system_type IN ('servicenow_itsm', 'jira_itsm'));

-- Update comment
COMMENT ON COLUMN credential_delegation_tokens.itsm_system_type IS 'ITSM connection type: servicenow_itsm, jira_itsm';
