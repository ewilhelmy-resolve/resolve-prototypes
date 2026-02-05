-- Migration: Update itsm_system_type CHECK constraint for ServiceNow split
-- Changes 'servicenow' to 'servicenow_itsm' to support separate KB and ITSM connections

-- Step 1: Drop existing CHECK constraint FIRST (so UPDATE can use new value)
ALTER TABLE credential_delegation_tokens
  DROP CONSTRAINT IF EXISTS credential_delegation_tokens_itsm_system_type_check;

-- Step 2: Migrate existing 'servicenow' delegation tokens to 'servicenow_itsm'
UPDATE credential_delegation_tokens 
SET itsm_system_type = 'servicenow_itsm' 
WHERE itsm_system_type = 'servicenow';

-- Step 3: Add updated CHECK constraint (servicenow_itsm instead of servicenow)
ALTER TABLE credential_delegation_tokens
  ADD CONSTRAINT credential_delegation_tokens_itsm_system_type_check
  CHECK (itsm_system_type IN ('servicenow_itsm', 'jira'));

-- Add comment for documentation
COMMENT ON COLUMN credential_delegation_tokens.itsm_system_type IS 'ITSM connection type: servicenow_itsm, jira';
