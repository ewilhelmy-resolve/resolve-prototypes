-- Migration 136: Add status field to pending_users table
-- Purpose: Track lifecycle of pending users (pending → verified)
-- Ticket: RG-271
-- Date: 2025-11-03
--
-- This migration adds a status column to pending_users to prevent premature
-- deletion of the company field, which is needed during organization creation
-- on first login.

-- Add status column with default value
ALTER TABLE pending_users
ADD COLUMN status TEXT DEFAULT 'pending';

-- Add CHECK constraint for valid status values
ALTER TABLE pending_users
ADD CONSTRAINT pending_users_status_check
CHECK (status IN ('pending', 'verified'));

-- Add index for performance (WHERE status = 'verified' queries)
CREATE INDEX idx_pending_users_status ON pending_users(status);

-- Update comment
COMMENT ON COLUMN pending_users.status IS 'Tracks user verification state: pending (not verified), verified (email verified, awaiting first login)';

-- Backfill existing records (all existing records are pending)
UPDATE pending_users SET status = 'pending' WHERE status IS NULL;

-- Make column NOT NULL after backfill
ALTER TABLE pending_users ALTER COLUMN status SET NOT NULL;

-- =============================================================================
-- ROLLBACK SCRIPT (If migration needs to be reverted)
-- =============================================================================
--
-- To rollback this migration, run:
--
-- DROP INDEX IF EXISTS idx_pending_users_status;
-- ALTER TABLE pending_users DROP CONSTRAINT IF EXISTS pending_users_status_check;
-- ALTER TABLE pending_users DROP COLUMN IF EXISTS status;
