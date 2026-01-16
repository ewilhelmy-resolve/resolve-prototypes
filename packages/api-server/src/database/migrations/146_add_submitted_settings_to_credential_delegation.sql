-- Migration: Add submitted_settings column to credential_delegation_tokens
-- Purpose: Store non-sensitive settings (URL, username/email) when IT admin submits credentials
--          so we can create data_source_connections record when verification succeeds

ALTER TABLE credential_delegation_tokens
ADD COLUMN submitted_settings JSONB;

COMMENT ON COLUMN credential_delegation_tokens.submitted_settings IS 'Non-sensitive settings submitted by IT admin (instance_url, username/email). Does not contain passwords/tokens.';

-- =============================================================================
-- ROLLBACK SCRIPT
-- =============================================================================
--
-- To rollback this migration, run:
--
-- ALTER TABLE credential_delegation_tokens DROP COLUMN submitted_settings;
