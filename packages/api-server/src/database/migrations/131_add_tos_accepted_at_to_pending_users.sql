-- Add tos_accepted_at column to pending_users table
-- Stores timestamp when user accepted Terms of Service during signup

ALTER TABLE pending_users
ADD COLUMN tos_accepted_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN pending_users.tos_accepted_at IS 'Timestamp when user accepted Terms of Service during signup';
