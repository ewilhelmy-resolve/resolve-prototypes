-- Migration: Credential delegation updates
-- 1. Update status constraint: remove 'used', add 'failed' for verification failures
-- 2. Add submitted_settings column for storing non-sensitive settings

-- =============================================================================
-- Part 1: Update status constraint
-- =============================================================================

-- Drop the old constraint first
ALTER TABLE credential_delegation_tokens
DROP CONSTRAINT IF EXISTS credential_delegation_tokens_status_check;

-- Update any existing 'used' records to 'pending' BEFORE adding new constraint
UPDATE credential_delegation_tokens SET status = 'pending' WHERE status = 'used';

-- Add new constraint with 'failed' status (allows retry)
ALTER TABLE credential_delegation_tokens
ADD CONSTRAINT credential_delegation_tokens_status_check
CHECK (status IN ('pending', 'verified', 'failed', 'expired', 'cancelled'));

-- =============================================================================
-- Part 2: Add submitted_settings column
-- =============================================================================

ALTER TABLE credential_delegation_tokens
ADD COLUMN IF NOT EXISTS submitted_settings JSONB;

COMMENT ON COLUMN credential_delegation_tokens.submitted_settings IS 'Non-sensitive settings submitted by IT admin (instance_url, username/email). Does not contain passwords/tokens.';

-- =============================================================================
-- ROLLBACK SCRIPT
-- =============================================================================
--
-- To rollback this migration, run:
--
-- ALTER TABLE credential_delegation_tokens DROP COLUMN submitted_settings;
--
-- ALTER TABLE credential_delegation_tokens DROP CONSTRAINT credential_delegation_tokens_status_check;
-- ALTER TABLE credential_delegation_tokens ADD CONSTRAINT credential_delegation_tokens_status_check
-- CHECK (status IN ('pending', 'used', 'verified', 'expired', 'cancelled'));
