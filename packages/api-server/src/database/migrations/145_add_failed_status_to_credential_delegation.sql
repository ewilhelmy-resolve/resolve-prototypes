-- Update credential_delegation_tokens status constraint
-- Remove 'used' (redundant - use credentials_received_at instead)
-- Add 'failed' for verification failures (allows retry)

-- 1. Drop the old constraint first
ALTER TABLE credential_delegation_tokens
DROP CONSTRAINT IF EXISTS credential_delegation_tokens_status_check;

-- 2. Update any existing 'used' records to 'pending' BEFORE adding new constraint
UPDATE credential_delegation_tokens SET status = 'pending' WHERE status = 'used';

-- 3. Add new constraint without 'used'
ALTER TABLE credential_delegation_tokens
ADD CONSTRAINT credential_delegation_tokens_status_check
CHECK (status IN ('pending', 'verified', 'failed', 'expired', 'cancelled'));
